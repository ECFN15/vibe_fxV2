import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = path.join(process.cwd(), "src", "features", "vibefx-studio", "video", "export", "exportManifest.js");
const tempDir = await mkdtemp(path.join(os.tmpdir(), "vibecut-export-manifest-"));
const tempModulePath = path.join(tempDir, "exportManifest.mjs");

try {
  const source = await readFile(sourcePath, "utf8");
  await writeFile(tempModulePath, source, "utf8");

  const {
    buildExportManifest,
    estimateExportSize,
    resolveExportQualityPreset,
    validateExportManifest,
  } = await import(pathToFileURL(tempModulePath).href);

  const manifest = buildExportManifest({
    projectId: "project-1",
    projectName: "Smoke Export",
    userId: "user-1",
    sequencePreset: "instagram-reel",
    exportFps: 60,
    qualityMode: "pro",
    fitMode: "cover",
    generatedAt: "2026-06-03T10:00:00.000Z",
    preset: { width: 1080, height: 1920, fps: 30 },
    renderPlan: {
      totalDuration: 4,
      clips: [
        {
          id: "clip-a",
          name: "Clip A",
          url: "blob:clip-a",
          start: 0,
          duration: 4,
          trimStart: 0,
          trimEnd: 4,
          speed: 1,
          volume: 80,
          orientationRotation: 90,
          filters: { exposure: 10, contrast: 120, saturation: 130 },
        },
      ],
      allTransitions: [
        { id: "tr-1", type: "crossfade", start: 1, duration: 0.5, fromItemId: "clip-a", toItemId: "clip-b", params: { placement: "cut" } },
      ],
      textOverlays: [
        { id: "txt-1", content: "Smoke", startTime: 0, endTime: 2, x: 0.5, y: 0.5, fontSize: 72, bold: true },
      ],
      audioTracks: [
        { id: "music-1", name: "Music", url: "blob:music", startTime: 0, duration: 4, endTime: 4, volume: 70 },
      ],
    },
    rightsManifest: [
      { id: "music-1", title: "Music", license: "test-license", socialUse: true, commercialUse: true },
    ],
  });

  assert.equal(manifest.version, 1);
  assert.equal(manifest.render.format, "mp4");
  assert.equal(manifest.render.videoCodec, "h264");
  assert.equal(manifest.render.audioCodec, "aac");
  assert.equal(manifest.render.fps, 60);
  assert.equal(manifest.render.crf, 17);
  assert.equal(manifest.clips[0].orientationRotation, 90);
  assert.equal(manifest.clips[0].filters.contrast, 120);
  assert.equal(manifest.textOverlays[0].content, "Smoke");
  assert.ok(manifest.audit.sourceHashes[0].includes("clip-a"));
  assert.ok(manifest.estimates.outputSize.bytes > 0);
  assert.ok(estimateExportSize(manifest).bytes > 0);
  assert.equal(resolveExportQualityPreset({ qualityMode: "master", width: 1080, height: 1920, fps: 60 }).crf, 15);

  const localAudit = validateExportManifest(manifest, { mode: "localMock" });
  assert.equal(localAudit.status, "warning", "localMock should warn when sources are not uploaded to Storage");
  assert.ok(localAudit.warnings.some((warning) => warning.includes("non uploadee")));

  const serverAudit = validateExportManifest(manifest, { mode: "firebase" });
  assert.equal(serverAudit.status, "blocked", "firebase mode must require server source paths");
  assert.ok(serverAudit.errors.some((error) => error.includes("Source serveur manquante")));

  console.log("smoke-vibecut-export-manifest: ok");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
