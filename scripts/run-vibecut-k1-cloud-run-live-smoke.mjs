import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { access, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const REQUIRED_CONFIRMATION = "OK pour smoke live Cloud Run K1";
const defaultK1Dir = "C:\\Users\\pcpor\\OneDrive\\Bureau\\K1";
const k1Dir = process.env.VIBECUT_K1_DIR || defaultK1Dir;
const region = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION || "europe-west9";
const requestedLiveUid = process.env.VIBECUT_LIVE_UID || "vibecut-k1-live-smoke";
const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "");
const exportId = `k1-cloud-run-${timestamp}`;
const outputFile = process.env.VIBECUT_CLOUD_OUTPUT_FILE ||
  path.join(k1Dir, `vibecut-k1-cloudrun-${timestamp}.mp4`);

if (process.env.VIBECUT_LIVE_CONFIRM !== REQUIRED_CONFIRMATION) {
  throw new Error(`VIBECUT_LIVE_CONFIRM doit valoir exactement "${REQUIRED_CONFIRMATION}".`);
}

if (process.env.VIBECUT_EXECUTE_LIVE !== "1") {
  throw new Error("VIBECUT_EXECUTE_LIVE=1 est requis pour lancer ce smoke Cloud Run live.");
}

loadDotEnvLocal();

const require = createRequire(import.meta.url);
const admin = require("../functions/node_modules/firebase-admin");

const projectId = requiredEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "FIREBASE_PROJECT_ID", "GCLOUD_PROJECT", "GOOGLE_CLOUD_PROJECT");
const apiKey = requiredEnv("NEXT_PUBLIC_FIREBASE_API_KEY");
const storageBucket = requiredEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "FIREBASE_STORAGE_BUCKET");

await main();

async function main() {
  const app = admin.apps.length
    ? admin.app()
    : admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
      storageBucket,
    });
  const bucket = admin.storage(app).bucket();

  const sourceA = path.join(k1Dir, "MVI_0126.MP4");
  const sourceB = path.join(k1Dir, "MVI_0117.MP4");
  await assertSource(sourceA);
  await assertSource(sourceB);

  const authSession = await createLiveAuthSession(apiKey, admin);
  const liveUid = authSession.uid;
  const uploads = [
    await uploadSource(bucket, sourceA, "k1-a", liveUid),
    await uploadSource(bucket, sourceB, "k1-b", liveUid),
  ];
  const manifest = await buildLiveManifest(uploads, liveUid);
  const idToken = authSession.idToken;
  const createResult = await callCallable({
    projectId,
    region,
    functionName: "createVideoExportJob",
    idToken,
    data: { manifest },
  });
  const jobId = createResult.jobId;
  assert.ok(jobId, "createVideoExportJob doit retourner un jobId");

  const readyJob = createResult.status === "ready"
    ? createResult
    : await waitForReadyJob(jobId);
  const downloadResult = readyJob.output?.downloadUrl
    ? { downloadUrl: readyJob.output.downloadUrl, sizeBytes: readyJob.output.sizeBytes || null }
    : await callCallable({
      projectId,
      region,
      functionName: "getVideoExportDownloadUrl",
      idToken,
      data: { jobId },
    });

  assert.ok(downloadResult.downloadUrl, "URL de telechargement absente");
  await downloadFile(downloadResult.downloadUrl, outputFile);
  const outputStat = await stat(outputFile);
  assert.ok(outputStat.size > 512 * 1024, "Output Cloud Run trop petit");

  console.log(JSON.stringify({
    live: true,
    projectId,
    region,
    jobId,
    uid: liveUid,
    sources: uploads.map((item) => ({
      name: item.name,
      storagePath: item.storagePath,
      bytes: item.size,
      rotation: 270,
    })),
    outputFile,
    outputBytes: outputStat.size,
    nextVerification: `set "VIBECUT_CLOUD_OUTPUT_FILE=${outputFile}" && npm run verify:vibecut-k1-cloud-output`,
  }, null, 2));
  console.log("run-vibecut-k1-cloud-run-live-smoke: ok");
}

async function buildLiveManifest(uploads, liveUid) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "vibecut-k1-live-manifest-"));
  try {
    const source = await readFile(path.join(
      process.cwd(),
      "src",
      "features",
      "vibefx-studio",
      "video",
      "export",
      "exportManifest.js",
    ), "utf8");
    const tempModulePath = path.join(tempDir, "exportManifest.mjs");
    await writeFile(tempModulePath, source, "utf8");
    const {
      buildExportManifest,
      validateExportManifest,
      validateExportRenderCoverage,
    } = await import(pathToFileURL(tempModulePath).href);

    const clips = uploads.map((upload, index) => ({
      id: upload.id,
      name: upload.name,
      sourceStoragePath: upload.storagePath,
      start: index === 0 ? 0 : 2.5,
      duration: 3,
      trimStart: 0,
      trimEnd: 3,
      speed: 1,
      volume: 80,
      orientationRotation: 270,
      size: upload.size,
      metadata: {
        sourceSizeBytes: upload.size,
      },
    }));

    const manifest = buildExportManifest({
      projectId: exportId,
      projectName: "K1 Cloud Run live smoke",
      userId: liveUid,
      sequencePreset: "instagram-reel",
      exportFps: 30,
      qualityMode: "pro",
      fitMode: "cover",
      generatedAt: new Date().toISOString(),
      preset: { width: 1080, height: 1920, fps: 30 },
      renderPlan: {
        totalDuration: 5.5,
        clips,
        allTransitions: [
          {
            id: "k1-live-crossfade",
            type: "crossfade",
            start: 2.5,
            duration: 0.5,
            fromItemId: clips[0].id,
            toItemId: clips[1].id,
            params: { placement: "cut" },
          },
        ],
        textOverlays: [
          {
            id: "k1-live-title",
            content: "K1 CLOUD RUN",
            startTime: 0.4,
            endTime: 2.2,
            x: 0.5,
            y: 0.18,
            fontSize: 68,
            color: "#ffffff",
            animation: "fade",
            animationOut: "fade",
          },
        ],
        audioTracks: [],
      },
    });

    const coverage = validateExportRenderCoverage(manifest);
    assert.equal(coverage.supported, true, `Manifest K1 live non exportable: ${(coverage.blockingErrors || []).join(" ")}`);
    const validation = validateExportManifest(manifest, {
      mode: "firebase",
      allowClientUpload: false,
    });
    assert.equal(validation.status, "ready", `Manifest K1 live invalide: ${validation.errors.join(" ")}`);
    return manifest;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function uploadSource(bucket, filePath, id, liveUid) {
  const fileStat = await stat(filePath);
  const name = path.basename(filePath);
  const storagePath = `users/${liveUid}/exports/${exportId}/sources/video/${name}`;
  await bucket.upload(filePath, {
    destination: storagePath,
    metadata: {
      contentType: "video/mp4",
      metadata: {
        source: "vibecut-k1-cloud-run-live-smoke",
        exportId,
      },
    },
  });
  return { id, name, storagePath, size: fileStat.size };
}

async function waitForReadyJob(jobId) {
  const startedAt = Date.now();
  const timeoutMs = Number(process.env.VIBECUT_LIVE_TIMEOUT_MS || 20 * 60 * 1000);
  const ref = admin.firestore().collection("videoExportJobs").doc(jobId);
  let lastStatus = "unknown";
  while (Date.now() - startedAt < timeoutMs) {
    const snapshot = await ref.get();
    assert.equal(snapshot.exists, true, `Job live introuvable: ${jobId}`);
    const data = snapshot.data() || {};
    lastStatus = data.status || "unknown";
    if (data.status === "ready") return { jobId, ...data };
    if (data.status === "failed") {
      throw new Error(`Job Cloud Run echoue: ${data.error?.message || "erreur inconnue"}`);
    }
    if (data.status === "cancelled") {
      throw new Error("Job Cloud Run annule pendant le smoke.");
    }
    await sleep(5000);
  }
  throw new Error(`Timeout attente job ready (${jobId}), dernier statut: ${lastStatus}`);
}

async function callCallable({ projectId, region, functionName, idToken, data }) {
  const response = await fetch(`https://${region}-${projectId}.cloudfunctions.net/${functionName}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${idToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ data }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    throw new Error(`${functionName} failed: ${JSON.stringify(payload.error || payload)}`);
  }
  return payload.result || {};
}

async function createLiveAuthSession(apiKey, admin) {
  const providedToken = String(process.env.VIBECUT_FIREBASE_ID_TOKEN || "").trim();
  if (providedToken) {
    const decoded = await admin.auth().verifyIdToken(providedToken);
    return { uid: decoded.uid, idToken: providedToken, mode: "provided-id-token" };
  }

  try {
    const customToken = await admin.auth().createCustomToken(requestedLiveUid);
    const idToken = await signInWithCustomToken(apiKey, customToken);
    return { uid: requestedLiveUid, idToken, mode: "custom-token" };
  } catch (error) {
    console.warn(`Custom token indisponible, tentative Auth anonyme: ${error.message}`);
  }

  const anonymous = await signInAnonymously(apiKey);
  return { uid: anonymous.uid, idToken: anonymous.idToken, mode: "anonymous" };
}

async function signInWithCustomToken(apiKey, token) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, returnSecureToken: true }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.idToken) {
    throw new Error(`Firebase Auth custom token sign-in failed: ${JSON.stringify(payload.error || payload)}`);
  }
  return payload.idToken;
}

async function signInAnonymously(apiKey) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.idToken || !payload.localId) {
    throw new Error(`Firebase anonymous sign-in failed: ${JSON.stringify(payload.error || payload)}`);
  }
  return { uid: payload.localId, idToken: payload.idToken };
}

async function downloadFile(url, filePath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: HTTP ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(filePath, bytes);
}

async function assertSource(filePath) {
  await access(filePath);
  const fileStat = await stat(filePath);
  assert.ok(fileStat.size > 5 * 1024 * 1024, `${filePath} est trop petit pour un smoke reel`);
  assert.ok(fileStat.size < 2 * 1024 * 1024 * 1024, `${filePath} depasse le quota source MVP`);
}

function loadDotEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // .env.local is optional when env vars are already provided by the shell.
  }
}

function requiredEnv(...names) {
  for (const name of names) {
    const value = String(process.env[name] || "").trim();
    if (value) return value;
  }
  throw new Error(`Variable env requise manquante: ${names.join(" ou ")}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
