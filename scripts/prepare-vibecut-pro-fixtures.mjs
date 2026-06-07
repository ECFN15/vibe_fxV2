import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const exportManifestPath = path.join(
  process.cwd(),
  "src",
  "features",
  "vibefx-studio",
  "video",
  "export",
  "exportManifest.js",
);
const tempDir = await mkdtemp(path.join(os.tmpdir(), "vibecut-pro-fixtures-"));

function baseClip(overrides = {}) {
  return {
    id: "clip-main",
    name: "Fixture source",
    sourceStoragePath: "users/user-export-smoke/exports/pro-fixture/sources/video/fixture-main.mp4",
    start: 0,
    duration: 4,
    trimStart: 0,
    trimEnd: 4,
    speed: 1,
    volume: 80,
    orientationRotation: 0,
    size: 24 * 1024 * 1024,
    metadata: { sourceSizeBytes: 24 * 1024 * 1024 },
    ...overrides,
  };
}

function makeManifest(buildExportManifest, fixture) {
  return buildExportManifest({
    projectId: `fixture-${fixture.id}`,
    projectName: fixture.name,
    userId: "user-export-smoke",
    sequencePreset: "instagram-reel",
    exportFps: 30,
    qualityMode: "pro",
    fitMode: "cover",
    generatedAt: "2026-06-06T12:30:00.000Z",
    preset: { width: 1080, height: 1920, fps: 30 },
    renderPlan: fixture.renderPlan,
    rightsManifest: fixture.rightsManifest || [],
  });
}

try {
  const source = await readFile(exportManifestPath, "utf8");
  const tempModulePath = path.join(tempDir, "exportManifest.mjs");
  await writeFile(tempModulePath, source, "utf8");
  const {
    buildExportManifest,
    validateExportManifest,
    validateExportRenderCoverage,
  } = await import(pathToFileURL(tempModulePath).href);

  const fixtures = [
    {
      id: "static-text",
      name: "Fixture static text",
      expectedSupported: true,
      renderPlan: {
        totalDuration: 4,
        clips: [baseClip()],
        allTransitions: [],
        textOverlays: [{
          id: "text-static",
          content: "STATIC TEXT",
          startTime: 0.5,
          endTime: 3.2,
          x: 0.5,
          y: 0.22,
          fontSize: 72,
          color: "#ffffff",
          animation: "fade",
          animationOut: "fade",
        }],
        audioTracks: [],
      },
    },
    {
      id: "advanced-text-animation",
      name: "Fixture advanced text animation",
      expectedSupported: false,
      expectedBlocker: "Animation texte non rendue serveur",
      renderPlan: {
        totalDuration: 4,
        clips: [baseClip()],
        allTransitions: [],
        textOverlays: [{
          id: "text-advanced",
          content: "ADVANCED TEXT",
          startTime: 0.5,
          endTime: 3.2,
          x: 0.5,
          y: 0.22,
          fontSize: 72,
          color: "#ffffff",
          animation: "neon-scan",
          animationOut: "fade",
        }],
        audioTracks: [],
      },
    },
    {
      id: "crossfade-transition",
      name: "Fixture crossfade transition",
      expectedSupported: true,
      renderPlan: {
        totalDuration: 5.5,
        clips: [
          baseClip({ id: "clip-a", name: "Clip A", duration: 3, trimEnd: 3 }),
          baseClip({
            id: "clip-b",
            name: "Clip B",
            sourceStoragePath: "users/user-export-smoke/exports/pro-fixture/sources/video/fixture-b.mp4",
            start: 2.5,
            duration: 3,
            trimEnd: 3,
            orientationRotation: 270,
          }),
        ],
        allTransitions: [{
          id: "transition-crossfade",
          type: "crossfade",
          start: 2.5,
          duration: 0.5,
          fromItemId: "clip-a",
          toItemId: "clip-b",
          params: { placement: "cut" },
        }],
        textOverlays: [],
        audioTracks: [],
      },
    },
    {
      id: "color-filters",
      name: "Fixture color filters",
      expectedSupported: true,
      renderPlan: {
        totalDuration: 4,
        clips: [baseClip({
          filters: {
            exposure: 12,
            brightness: 96,
            contrast: 124,
            saturation: 118,
            vibrance: 20,
            temperature: -12,
            tint: 5,
            hue: 18,
            shadows: -8,
            midtones: 4,
            highlights: 10,
            fade: 6,
            vignette: 12,
            grain: 8,
          },
        })],
        allTransitions: [],
        textOverlays: [],
        audioTracks: [],
      },
    },
    {
      id: "external-audio",
      name: "Fixture external audio",
      expectedSupported: true,
      renderPlan: {
        totalDuration: 4,
        clips: [baseClip({ volume: 50 })],
        allTransitions: [],
        textOverlays: [],
        audioTracks: [{
          id: "music-fixture",
          name: "Fixture Music",
          sourceStoragePath: "users/user-export-smoke/exports/pro-fixture/sources/audio/music.mp3",
          startTime: 0.25,
          duration: 3.5,
          trimStart: 0,
          trimEnd: 3.5,
          volume: 65,
          sourceSizeBytes: 3 * 1024 * 1024,
        }],
      },
      rightsManifest: [{
        id: "music-fixture",
        title: "Fixture Music",
        license: "fixture-license",
        socialUse: true,
        commercialUse: true,
      }],
    },
    {
      id: "combined-supported",
      name: "Fixture combined supported stack",
      expectedSupported: true,
      renderPlan: {
        totalDuration: 5.5,
        clips: [
          baseClip({
            id: "clip-a",
            name: "Clip A",
            duration: 3,
            trimEnd: 3,
            volume: 70,
            filters: { contrast: 118, saturation: 112, vignette: 8 },
          }),
          baseClip({
            id: "clip-b",
            name: "Clip B",
            sourceStoragePath: "users/user-export-smoke/exports/pro-fixture/sources/video/fixture-b.mp4",
            start: 2.5,
            duration: 3,
            trimEnd: 3,
            volume: 70,
            orientationRotation: 270,
            filters: { contrast: 108, saturation: 105, grain: 4 },
          }),
        ],
        allTransitions: [{
          id: "transition-combined",
          type: "fade",
          start: 2.5,
          duration: 0.5,
          fromItemId: "clip-a",
          toItemId: "clip-b",
          params: { placement: "cut" },
        }],
        textOverlays: [{
          id: "text-combined",
          content: "COMBINED",
          startTime: 0.4,
          endTime: 2.8,
          x: 0.5,
          y: 0.18,
          fontSize: 68,
          color: "#ffffff",
          animation: "fade",
          animationOut: "fade",
        }],
        audioTracks: [{
          id: "music-combined",
          name: "Fixture Music",
          sourceStoragePath: "users/user-export-smoke/exports/pro-fixture/sources/audio/music.mp3",
          startTime: 0,
          duration: 5.5,
          trimStart: 0,
          trimEnd: 5.5,
          volume: 60,
          sourceSizeBytes: 4 * 1024 * 1024,
        }],
      },
      rightsManifest: [{
        id: "music-combined",
        title: "Fixture Music",
        license: "fixture-license",
        socialUse: true,
        commercialUse: true,
      }],
    },
  ];

  const results = fixtures.map((fixture) => {
    const manifest = makeManifest(buildExportManifest, fixture);
    const manifestAudit = validateExportManifest(manifest, { mode: "firebase", allowClientUpload: false });
    const coverage = validateExportRenderCoverage(manifest);
    assert.equal(manifest.render.format, "mp4", `${fixture.id} must target MP4`);
    assert.equal(manifest.render.videoCodec, "h264", `${fixture.id} must target H.264`);
    assert.equal(manifest.render.audioCodec, "aac", `${fixture.id} must target AAC`);
    assert.equal(manifestAudit.status, "ready", `${fixture.id} manifest structure should remain valid`);
    assert.equal(coverage.supported, fixture.expectedSupported, `${fixture.id} renderer coverage mismatch`);
    if (fixture.expectedBlocker) {
      assert.ok(
        coverage.blockingErrors.some((error) => error.includes(fixture.expectedBlocker)),
        `${fixture.id} must expose blocker: ${fixture.expectedBlocker}`,
      );
    }
    return {
      id: fixture.id,
      supported: coverage.supported,
      blockers: coverage.blockingErrors,
      outputSize: manifest.estimates.outputSize.label,
      sourceSize: manifest.estimates.sourceSize.label,
    };
  });

  assert.equal(results.filter((fixture) => fixture.supported).length, 5);
  assert.equal(results.filter((fixture) => !fixture.supported).length, 1);
  console.log(JSON.stringify({ dryRunOnly: true, fixtures: results }, null, 2));
  console.log("prepare-vibecut-pro-fixtures: ok");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
