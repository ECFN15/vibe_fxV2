"use strict";

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");
const { shouldEnforceAppCheck } = require("./appCheck");

const REGION = "europe-west9";
const ENFORCE_EXPORT_APP_CHECK = shouldEnforceAppCheck("ENFORCE_EXPORT_APP_CHECK");
const EXPORT_SIGNING_SECRET = defineSecret("EXPORT_SIGNING_SECRET");
const EXPORT_JOBS_COLLECTION = "videoExportJobs";
const TERMINAL_STATUSES = new Set(["ready", "failed", "cancelled"]);
const RETRYABLE_STATUSES = new Set(["failed", "cancelled"]);
const MAX_MANIFEST_BYTES = 750 * 1024;

function assertAuthenticated(request) {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Connexion utilisateur requise.");
  }
  return uid;
}

function requireJobId(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new HttpsError("invalid-argument", "jobId invalide.");
  }
  return value;
}

function jsonByteSize(value) {
  return Buffer.byteLength(JSON.stringify(value || {}), "utf8");
}

function validatePositiveNumber(value, field, errors) {
  if (!Number.isFinite(value) || value <= 0) {
    errors.push(`${field} invalide`);
  }
}

function validateExportManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return ["manifest requis"];
  }
  if (jsonByteSize(manifest) > MAX_MANIFEST_BYTES) {
    errors.push("manifest trop volumineux");
  }
  if (manifest.version !== 1) {
    errors.push("version manifeste non supportee");
  }

  const render = manifest.render || {};
  if (render.format !== "mp4") errors.push("format mp4 requis");
  if (render.videoCodec !== "h264") errors.push("codec video h264 requis");
  if (render.audioCodec !== "aac") errors.push("codec audio aac requis");
  validatePositiveNumber(render.width, "render.width", errors);
  validatePositiveNumber(render.height, "render.height", errors);
  validatePositiveNumber(render.fps, "render.fps", errors);

  const project = manifest.project || {};
  validatePositiveNumber(project.duration, "project.duration", errors);

  if (!Array.isArray(manifest.clips) || !manifest.clips.length) {
    errors.push("au moins un clip est requis");
  } else {
    manifest.clips.forEach((clip, index) => {
      if (!clip || typeof clip !== "object") {
        errors.push(`clips[${index}] invalide`);
        return;
      }
      if (!clip.sourceStoragePath || typeof clip.sourceStoragePath !== "string") {
        errors.push(`clips[${index}].sourceStoragePath requis pour le rendu serveur`);
      }
      validatePositiveNumber(clip.duration, `clips[${index}].duration`, errors);
    });
  }

  return errors;
}

function exportJobsRef() {
  return admin.firestore().collection(EXPORT_JOBS_COLLECTION);
}

function getExportRendererUrl() {
  return String(process.env.EXPORT_RENDERER_URL || "").trim();
}

function getExportSigningSecret() {
  return String(EXPORT_SIGNING_SECRET.value() || "").trim();
}

function buildRendererSignature(body, secret) {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function buildOutputStoragePath(uid, jobId) {
  return `users/${uid}/exports/${jobId}/outputs/export.mp4`;
}

async function createOutputDownloadUrl(storagePath) {
  try {
    const [url] = await admin.storage().bucket().file(storagePath).getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000,
    });
    return url;
  } catch {
    return null;
  }
}

function publicLog(message, level = "info") {
  return {
    level,
    message,
    createdAt: admin.firestore.Timestamp.now(),
  };
}

async function callRenderService({ jobId, uid, manifest, outputStoragePath }) {
  const rendererUrl = getExportRendererUrl();
  const signingSecret = getExportSigningSecret();
  if (!rendererUrl) {
    throw new HttpsError("failed-precondition", "EXPORT_RENDERER_URL manquant.");
  }
  if (!signingSecret) {
    throw new HttpsError("failed-precondition", "Secret EXPORT_SIGNING_SECRET manquant.");
  }

  const bucketName = admin.app().options.storageBucket || process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    throw new HttpsError("failed-precondition", "Bucket Storage Firebase manquant.");
  }

  const body = JSON.stringify({
    jobId,
    uid,
    bucket: bucketName,
    outputStoragePath,
    manifest,
  });
  const response = await fetch(`${rendererUrl.replace(/\/+$/, "")}/render`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-vibecut-signature": buildRendererSignature(body, signingSecret),
    },
    body,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.status === "failed") {
    throw new HttpsError("failed-precondition", "Renderer Cloud Run a refuse le job Export Pro.", {
      status: response.status,
      renderer: data,
    });
  }
  return data;
}

async function getOwnedJob(uid, jobId) {
  const ref = exportJobsRef().doc(jobId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Job export introuvable.");
  }
  const data = snapshot.data() || {};
  if (data.ownerUid !== uid) {
    throw new HttpsError("permission-denied", "Ce job export n'appartient pas a l'utilisateur connecte.");
  }
  return { ref, data };
}

const createVideoExportJob = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_EXPORT_APP_CHECK,
    secrets: [EXPORT_SIGNING_SECRET],
    timeoutSeconds: 3600,
    memory: "512MiB",
  },
  async (request) => {
    const uid = assertAuthenticated(request);
    const manifest = request.data?.manifest;
    const validationErrors = validateExportManifest(manifest);
    if (validationErrors.length) {
      throw new HttpsError("invalid-argument", "Manifest Export Pro invalide.", {
        errors: validationErrors,
      });
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const ref = exportJobsRef().doc();
    const outputStoragePath = buildOutputStoragePath(uid, ref.id);
    const rendererUrlConfigured = Boolean(getExportRendererUrl());
    const job = {
      uid,
      ownerUid: uid,
      status: "queued",
      phase: "queueing",
      progress: 18,
      manifest,
      render: manifest.render,
      outputStoragePath,
      renderer: {
        mode: "cloud-run-ffmpeg",
        urlConfigured: rendererUrlConfigured,
      },
      createdAt: now,
      updatedAt: now,
      logs: [publicLog("Job Export Pro cree et mis en file Cloud Run.")],
    };

    await ref.set(job);

    try {
      await ref.set({
        status: "rendering",
        phase: "rendering",
        progress: 35,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        logs: admin.firestore.FieldValue.arrayUnion(publicLog("Renderer Cloud Run appele.")),
      }, { merge: true });

      const rendererResult = await callRenderService({
        jobId: ref.id,
        uid,
        manifest,
        outputStoragePath,
      });
      const renderedStoragePath = rendererResult.output?.storagePath || outputStoragePath;
      const output = {
        storagePath: renderedStoragePath,
        downloadUrl: rendererResult.output?.downloadUrl || await createOutputDownloadUrl(renderedStoragePath),
        sizeBytes: rendererResult.output?.sizeBytes || null,
        contentType: "video/mp4",
        mockOnly: false,
      };
      const warnings = rendererResult.warnings || [];
      const logs = [
        publicLog("Renderer Cloud Run termine.", "success"),
        ...warnings.map((warning) => publicLog(String(warning), "warning")),
      ];

      await ref.set({
        status: "ready",
        phase: "ready",
        progress: 100,
        output,
        warnings,
        rendererResult: {
          mode: rendererResult.mode || "cloud-run-ffmpeg",
          elapsedMs: rendererResult.elapsedMs || null,
        },
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        logs: admin.firestore.FieldValue.arrayUnion(...logs),
      }, { merge: true });

      return {
        jobId: ref.id,
        status: "ready",
        phase: "ready",
        progress: 100,
        output,
        warnings,
        logs: logs.map((log) => ({
          level: log.level,
          message: log.message,
          at: log.createdAt.toDate().toISOString(),
        })),
        rendererConfigured: rendererUrlConfigured,
      };
    } catch (error) {
      await ref.set({
        status: "failed",
        phase: "failed",
        progress: 35,
        error: {
          code: error.code || "render-service-failed",
          message: error.message || "Erreur renderer Cloud Run.",
          details: error.details || null,
        },
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        logs: admin.firestore.FieldValue.arrayUnion(publicLog(error.message || "Erreur renderer Cloud Run.", "error")),
      }, { merge: true });
      throw error;
    }
  }
);

const cancelVideoExportJob = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_EXPORT_APP_CHECK,
  },
  async (request) => {
    const uid = assertAuthenticated(request);
    const jobId = requireJobId(request.data?.jobId);
    const { ref, data } = await getOwnedJob(uid, jobId);
    if (TERMINAL_STATUSES.has(data.status)) {
      return {
        jobId,
        status: data.status,
        phase: data.phase || data.status,
        progress: data.progress || 0,
      };
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    await ref.set({
      status: "cancelled",
      phase: "cancelled",
      progress: data.progress || 0,
      cancelledAt: now,
      updatedAt: now,
      logs: admin.firestore.FieldValue.arrayUnion({
        level: "info",
        message: "Job export annule par l'utilisateur.",
        createdAt: admin.firestore.Timestamp.now(),
      }),
    }, { merge: true });

    return {
      jobId,
      status: "cancelled",
      phase: "cancelled",
      progress: data.progress || 0,
    };
  }
);

const retryVideoExportJob = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_EXPORT_APP_CHECK,
  },
  async (request) => {
    const uid = assertAuthenticated(request);
    const jobId = requireJobId(request.data?.jobId);
    const { data } = await getOwnedJob(uid, jobId);
    if (!RETRYABLE_STATUSES.has(data.status)) {
      throw new HttpsError("failed-precondition", "Seuls les exports echoues ou annules peuvent etre relances.");
    }
    if (!data.manifest) {
      throw new HttpsError("failed-precondition", "Manifest export absent du job source.");
    }

    const validationErrors = validateExportManifest(data.manifest);
    if (validationErrors.length) {
      throw new HttpsError("invalid-argument", "Manifest Export Pro source invalide.", {
        errors: validationErrors,
      });
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const ref = exportJobsRef().doc();
    await ref.set({
      uid,
      ownerUid: uid,
      status: "queued",
      phase: "queueing",
      progress: 0,
      manifest: data.manifest,
      render: data.render || data.manifest.render,
      retryOf: jobId,
      renderer: data.renderer || {
        mode: "cloud-run-skeleton",
        urlConfigured: Boolean(String(process.env.EXPORT_RENDERER_URL || "").trim()),
      },
      createdAt: now,
      updatedAt: now,
      logs: [{
        level: "info",
        message: `Relance du job export ${jobId}.`,
        createdAt: admin.firestore.Timestamp.now(),
      }],
    });

    return {
      jobId: ref.id,
      status: "queued",
      phase: "queueing",
      progress: 0,
      retryOf: jobId,
    };
  }
);

module.exports = {
  createVideoExportJob,
  cancelVideoExportJob,
  retryVideoExportJob,
  validateExportManifest,
};
