import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const exportDir = path.join(process.cwd(), "src", "features", "vibefx-studio", "video", "export");
const tempDir = await mkdtemp(path.join(os.tmpdir(), "vibecut-export-jobs-"));

try {
  const files = [
    ["exportManifest.js", "exportManifest.mjs"],
    ["exportStorageService.js", "exportStorageService.mjs"],
    ["exportRenderService.js", "exportRenderService.mjs"],
    ["exportJobService.js", "exportJobService.mjs"],
  ];

  for (const [sourceName, targetName] of files) {
    let source = await readFile(path.join(exportDir, sourceName), "utf8");
    source = source
      .replaceAll("./exportStorageService", "./exportStorageService.mjs")
      .replaceAll("./exportRenderService", "./exportRenderService.mjs");
    await writeFile(path.join(tempDir, targetName), source, "utf8");
  }

  const { buildExportManifest } = await import(pathToFileURL(path.join(tempDir, "exportManifest.mjs")).href);
  const { startVideoExportJob } = await import(pathToFileURL(path.join(tempDir, "exportJobService.mjs")).href);

  const manifest = buildExportManifest({
    projectName: "Job Smoke",
    generatedAt: "2026-06-03T10:00:00.000Z",
    preset: { width: 1080, height: 1920, fps: 30 },
    exportFps: 30,
    qualityMode: "preview",
    renderPlan: {
      totalDuration: 2,
      clips: [
        { id: "clip-a", name: "Clip A", url: "blob:clip-a", start: 0, duration: 2, trimStart: 0, trimEnd: 2, speed: 1, volume: 100 },
      ],
      allTransitions: [],
      textOverlays: [],
      audioTracks: [],
    },
  });

  const updates = [];
  const finalJob = await startVideoExportJob({
    manifest,
    mode: "localMock",
    onUpdate: (job) => updates.push({ status: job.status, phase: job.phase, progress: job.progress }),
  });

  assert.equal(finalJob.status, "ready");
  assert.equal(finalJob.output.mockOnly, true);
  assert.equal(finalJob.progress, 100);
  assert.ok(updates.some((update) => update.phase === "preparing_sources"));
  assert.ok(updates.some((update) => update.phase === "queueing"));
  assert.ok(updates.some((update) => update.phase === "rendering"));
  assert.ok(updates.some((update) => update.phase === "encoding"));
  assert.ok(updates.some((update) => update.phase === "finalizing"));
  assert.ok(finalJob.logs.some((log) => log.message.includes("Aucun MP4 reel")));

  const abortController = new AbortController();
  const cancelPromise = startVideoExportJob({
    manifest,
    mode: "localMock",
    signal: abortController.signal,
  });
  abortController.abort();
  const cancelledJob = await cancelPromise;
  assert.equal(cancelledJob.status, "cancelled");
  assert.equal(cancelledJob.error.code, "job-cancelled");

  console.log("smoke-vibecut-export-jobs: ok");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
