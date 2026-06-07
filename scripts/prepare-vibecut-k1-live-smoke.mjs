import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const defaultK1Dir = "C:\\Users\\pcpor\\OneDrive\\Bureau\\K1";
const k1Dir = process.env.VIBECUT_K1_DIR || defaultK1Dir;
const exportManifestPath = path.join(
  process.cwd(),
  "src",
  "features",
  "vibefx-studio",
  "video",
  "export",
  "exportManifest.js",
);

if (process.env.VIBECUT_K1_LIVE === "1" || process.env.VIBECUT_RUN_CLOUD === "1") {
  throw new Error("This script is a dry-run readiness check only. It must not launch Cloud Run exports.");
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

const k1Available = await exists(k1Dir);
if (!k1Available) {
  console.log(`prepare-vibecut-k1-live-smoke: skipped, K1 directory not found at ${k1Dir}`);
  process.exit(0);
}

const tempDir = await mkdtemp(path.join(os.tmpdir(), "vibecut-k1-smoke-"));
try {
  const source = await readFile(exportManifestPath, "utf8");
  const tempModulePath = path.join(tempDir, "exportManifest.mjs");
  await writeFile(tempModulePath, source, "utf8");

  const {
    buildExportManifest,
    validateExportManifest,
    validateExportRenderCoverage,
  } = await import(pathToFileURL(tempModulePath).href);

  const candidates = [
    {
      id: "k1-a",
      name: "MVI_0126.MP4",
      filePath: path.join(k1Dir, "MVI_0126.MP4"),
      start: 0,
      duration: 3,
      trimStart: 0,
      trimEnd: 3,
      orientationRotation: 270,
      volume: 80,
    },
    {
      id: "k1-b",
      name: "MVI_0117.MP4",
      filePath: path.join(k1Dir, "MVI_0117.MP4"),
      start: 2.5,
      duration: 3,
      trimStart: 0,
      trimEnd: 3,
      orientationRotation: 0,
      volume: 80,
    },
  ];

  const clips = [];
  for (const candidate of candidates) {
    assert.equal(await exists(candidate.filePath), true, `K1 source missing: ${candidate.filePath}`);
    const fileStat = await stat(candidate.filePath);
    assert.ok(fileStat.size > 5 * 1024 * 1024, `${candidate.name} is too small for a real K1 smoke source`);
    assert.ok(fileStat.size < 2 * 1024 * 1024 * 1024, `${candidate.name} exceeds the MVP source quota`);
    clips.push({
      id: candidate.id,
      name: candidate.name,
      sourceStoragePath: `users/user-export-smoke/exports/k1-final-smoke/sources/video/${candidate.name.toLowerCase()}`,
      localPreviewUrl: pathToFileURL(candidate.filePath).href,
      start: candidate.start,
      duration: candidate.duration,
      trimStart: candidate.trimStart,
      trimEnd: candidate.trimEnd,
      speed: 1,
      volume: candidate.volume,
      orientationRotation: candidate.orientationRotation,
      size: fileStat.size,
      metadata: {
        sourceSizeBytes: fileStat.size,
      },
    });
  }

  const manifest = buildExportManifest({
    projectId: "k1-final-smoke",
    projectName: "K1 Cloud Run final smoke dry-run",
    userId: "user-export-smoke",
    sequencePreset: "instagram-reel",
    exportFps: 30,
    qualityMode: "pro",
    fitMode: "cover",
    generatedAt: "2026-06-06T12:00:00.000Z",
    preset: { width: 1080, height: 1920, fps: 30 },
    renderPlan: {
      totalDuration: 5.5,
      clips,
      allTransitions: [
        {
          id: "k1-crossfade",
          type: "crossfade",
          start: 2.5,
          duration: 0.5,
          fromItemId: "k1-a",
          toItemId: "k1-b",
          params: { placement: "cut" },
        },
      ],
      textOverlays: [
        {
          id: "k1-title",
          content: "K1 EXPORT",
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

  assert.equal(manifest.render.format, "mp4");
  assert.equal(manifest.render.videoCodec, "h264");
  assert.equal(manifest.render.audioCodec, "aac");
  assert.equal(manifest.render.width, 1080);
  assert.equal(manifest.render.height, 1920);
  assert.equal(manifest.render.fps, 30);
  assert.equal(manifest.clips.length, 2);
  assert.equal(manifest.transitions.length, 1);
  assert.equal(manifest.textOverlays.length, 1);
  assert.ok(manifest.estimates.outputSize.bytes > 0);
  assert.ok(manifest.estimates.sourceSize.bytes > 0);
  assert.ok(manifest.estimates.cost.eur > 0);

  const coverage = validateExportRenderCoverage(manifest);
  assert.equal(coverage.supported, true, "K1 smoke plan must contain only server-renderable features");

  const serverAudit = validateExportManifest(manifest, {
    mode: "firebase",
    allowClientUpload: false,
  });
  assert.equal(serverAudit.status, "ready", `K1 smoke manifest must pass firebase validation: ${serverAudit.errors.join(" ")}`);

  const output = {
    dryRunOnly: true,
    k1Dir,
    sources: clips.map((clip) => ({
      id: clip.id,
      name: clip.name,
      bytes: clip.metadata.sourceSizeBytes,
      rotation: clip.orientationRotation,
      trim: `${clip.trimStart}s-${clip.trimEnd}s`,
    })),
    expected: {
      render: `${manifest.render.width}x${manifest.render.height} ${manifest.render.fps}fps`,
      codec: `${manifest.render.videoCodec}/${manifest.render.audioCodec}`,
      container: manifest.render.format,
      durationSeconds: manifest.project.duration,
      sourceSize: manifest.estimates.sourceSize.label,
      outputSize: manifest.estimates.outputSize.label,
      estimatedCost: manifest.estimates.cost.label,
      features: ["two clips", "adjacent crossfade", "orientation rotation", "basic fade text", "source clip audio"],
    },
    nextStepRequiresConfirmation: "OK pour smoke live Cloud Run K1",
  };

  console.log(JSON.stringify(output, null, 2));
  console.log("prepare-vibecut-k1-live-smoke: ok");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
