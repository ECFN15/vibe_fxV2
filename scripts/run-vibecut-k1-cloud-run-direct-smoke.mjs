import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { access, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const REQUIRED_CONFIRMATION = "OK pour smoke live Cloud Run K1";
const defaultK1Dir = "C:\\Users\\pcpor\\OneDrive\\Bureau\\K1";
const k1Dir = process.env.VIBECUT_K1_DIR || defaultK1Dir;
const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "");
const uid = process.env.VIBECUT_LIVE_UID || "vibecut-k1-direct-smoke";
const jobId = `k1-direct-cloud-run-${timestamp}`;
const outputFile = process.env.VIBECUT_CLOUD_OUTPUT_FILE ||
  path.join(k1Dir, `vibecut-k1-cloudrun-direct-${timestamp}.mp4`);

if (process.env.VIBECUT_LIVE_CONFIRM !== REQUIRED_CONFIRMATION) {
  throw new Error(`VIBECUT_LIVE_CONFIRM doit valoir exactement "${REQUIRED_CONFIRMATION}".`);
}

if (process.env.VIBECUT_EXECUTE_LIVE !== "1") {
  throw new Error("VIBECUT_EXECUTE_LIVE=1 est requis pour lancer ce smoke Cloud Run direct.");
}

loadDotEnvLocal();

const require = createRequire(import.meta.url);
const admin = require("../functions/node_modules/firebase-admin");

const projectId = requiredEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "FIREBASE_PROJECT_ID", "GCLOUD_PROJECT", "GOOGLE_CLOUD_PROJECT");
const storageBucket = requiredEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "FIREBASE_STORAGE_BUCKET");
const rendererUrl = requiredEnv("EXPORT_RENDERER_URL");
const signingSecret = requiredEnv("EXPORT_SIGNING_SECRET");

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

  const uploads = [
    await uploadSource(bucket, sourceA, "k1-a"),
    await uploadSource(bucket, sourceB, "k1-b"),
  ];
  const manifest = await buildManifest(uploads);
  const outputStoragePath = `users/${uid}/exports/${jobId}/outputs/export.mp4`;
  const renderResult = await callRenderer({ manifest, outputStoragePath });
  const renderedStoragePath = renderResult.output?.storagePath || outputStoragePath;
  await bucket.file(renderedStoragePath).download({ destination: outputFile });
  const outputStat = await stat(outputFile);

  console.log(JSON.stringify({
    live: true,
    mode: "direct-cloud-run-renderer",
    projectId,
    rendererHost: new URL(rendererUrl).host,
    bucket: storageBucket,
    jobId,
    uid,
    sources: uploads.map((item) => ({
      name: item.name,
      storagePath: item.storagePath,
      bytes: item.size,
      rotation: 270,
    })),
    rendererElapsedMs: renderResult.elapsedMs || null,
    outputStoragePath: renderedStoragePath,
    outputFile,
    outputBytes: outputStat.size,
    warnings: renderResult.warnings || [],
    nextVerification: `set "VIBECUT_CLOUD_OUTPUT_FILE=${outputFile}" && npm run verify:vibecut-k1-cloud-output`,
  }, null, 2));
  console.log("run-vibecut-k1-cloud-run-direct-smoke: ok");
}

async function buildManifest(uploads) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "vibecut-k1-direct-manifest-"));
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
      projectId: jobId,
      projectName: "K1 direct Cloud Run smoke",
      userId: uid,
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
            id: "k1-direct-crossfade",
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
            id: "k1-direct-title",
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
    assert.equal(coverage.supported, true, `Manifest K1 direct non exportable: ${(coverage.blockingErrors || []).join(" ")}`);
    const validation = validateExportManifest(manifest, {
      mode: "firebase",
      allowClientUpload: false,
    });
    assert.equal(validation.status, "ready", `Manifest K1 direct invalide: ${validation.errors.join(" ")}`);
    return manifest;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function uploadSource(bucket, filePath, id) {
  const fileStat = await stat(filePath);
  const name = path.basename(filePath);
  const storagePath = `users/${uid}/exports/${jobId}/sources/video/${name}`;
  await bucket.upload(filePath, {
    destination: storagePath,
    metadata: {
      contentType: "video/mp4",
      metadata: {
        source: "vibecut-k1-cloud-run-direct-smoke",
        jobId,
      },
    },
  });
  return { id, name, storagePath, size: fileStat.size };
}

async function callRenderer({ manifest, outputStoragePath }) {
  const rendererBaseUrl = rendererUrl.replace(/\/+$/, "");
  const body = JSON.stringify({
    jobId,
    uid,
    bucket: storageBucket,
    outputStoragePath,
    manifest,
  });
  const signatureModes = process.env.VIBECUT_RENDERER_SIGNATURE_MODE
    ? [process.env.VIBECUT_RENDERER_SIGNATURE_MODE]
    : ["timestamp-body", "body"];
  let lastFailure = null;
  for (const mode of signatureModes) {
    const timestampMs = Date.now();
    const signaturePayload = mode === "body" ? body : `${timestampMs}.${body}`;
    const signature = crypto.createHmac("sha256", signingSecret)
      .update(signaturePayload)
      .digest("hex");
    const response = await fetch(`${rendererBaseUrl}/render`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-vibecut-timestamp": String(timestampMs),
        "x-vibecut-signature": signature,
      },
      body,
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.status !== "failed") {
      return { ...data, signatureMode: mode };
    }
    lastFailure = { status: response.status, data, mode };
    if (response.status !== 401) break;
  }
  throw new Error(`Renderer Cloud Run failed: HTTP ${lastFailure?.status} mode=${lastFailure?.mode} ${JSON.stringify(lastFailure?.data)}`);
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
