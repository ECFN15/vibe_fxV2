import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { validateManifest as validateRendererManifest } from "../render-service/src/server.js";

const require = createRequire(import.meta.url);
const functionsExport = require("../functions/src/videoExport.js");
const uid = "user-export-smoke";
const tempDir = await mkdtemp(path.join(os.tmpdir(), "vibecut-coverage-parity-"));

try {
  const exportManifestSource = await readFile(
    path.join(process.cwd(), "src", "features", "vibefx-studio", "video", "export", "exportManifest.js"),
    "utf8",
  );
  const tempManifestModule = path.join(tempDir, "exportManifest.mjs");
  await writeFile(tempManifestModule, exportManifestSource, "utf8");
  const { validateExportRenderCoverage } = await import(pathToFileURL(tempManifestModule).href);

  const cases = [
    {
      id: "baseline-two-clips",
      expectedSupported: true,
      mutate: () => ({}),
    },
    {
      id: "basic-text-fade",
      expectedSupported: true,
      mutate: () => ({
        textOverlays: [textOverlay({ animation: "fade", animationOut: "fade" })],
      }),
    },
    {
      id: "adjacent-crossfade",
      expectedSupported: true,
      mutate: () => ({
        transitions: [transition({ type: "crossfade", fromItemId: "clip-a", toItemId: "clip-b", params: { placement: "cut" } })],
      }),
    },
    {
      id: "known-color-filters",
      expectedSupported: true,
      mutate: () => ({
        clips: [
          clip("clip-a", { filters: { contrast: 118, saturation: 112, temperature: -8, tint: 4, vignette: 8, grain: 4 } }),
          clip("clip-b", { filters: { exposure: 8, brightness: 98, vibrance: 12, hue: 6, fade: 4 } }),
        ],
      }),
    },
    {
      id: "external-audio",
      expectedSupported: true,
      mutate: () => ({
        audioTracks: [audioTrack()],
      }),
    },
    {
      id: "advanced-text-animation",
      expectedSupported: false,
      expectedAnyError: /text.*animation|animation texte/i,
      mutate: () => ({
        textOverlays: [textOverlay({ animation: "neon-scan" })],
      }),
    },
    {
      id: "unsupported-transition",
      expectedSupported: false,
      expectedAnyError: /transition/i,
      mutate: () => ({
        transitions: [transition({ type: "wipe", fromItemId: "clip-a", toItemId: "clip-b", params: { placement: "cut" } })],
      }),
    },
    {
      id: "non-adjacent-transition",
      expectedSupported: false,
      expectedAnyError: /adjacent|adjacente/i,
      mutate: () => ({
        transitions: [transition({ type: "fade", fromItemId: "clip-a", toItemId: "clip-missing", params: { placement: "free" } })],
      }),
    },
    {
      id: "slow-motion",
      expectedSupported: false,
      expectedAnyError: /speed|vitesse/i,
      mutate: () => ({
        clips: [clip("clip-a", { speed: 0.5 }), clip("clip-b")],
      }),
    },
    {
      id: "unsupported-fit",
      expectedSupported: false,
      expectedAnyError: /fit/i,
      mutate: () => ({
        clips: [clip("clip-a", { fitMode: "fill" }), clip("clip-b")],
      }),
    },
    {
      id: "unknown-color-filter",
      expectedSupported: false,
      expectedAnyError: /filter|filtre/i,
      mutate: () => ({
        clips: [clip("clip-a", { filters: { unsupportedCurve: 1 } }), clip("clip-b")],
      }),
    },
    {
      id: "empty-text",
      expectedSupported: false,
      expectedAnyError: /text|texte/i,
      mutate: () => ({
        textOverlays: [textOverlay({ content: "" })],
      }),
    },
  ];

  const results = cases.map((testCase) => {
    const manifest = makeManifest(testCase.mutate());
    const clientCoverage = validateExportRenderCoverage(manifest);
    const functionErrors = functionsExport.validateExportManifest(manifest, { uid });
    const rendererValidation = validateRendererManifest(manifest);
    const functionSupported = functionErrors.length === 0;
    const rendererSupported = rendererValidation.errors.length === 0;
    const allErrors = [
      ...clientCoverage.blockingErrors,
      ...functionErrors,
      ...rendererValidation.errors,
    ].join("\n");

    assert.equal(clientCoverage.supported, testCase.expectedSupported, `${testCase.id}: client coverage mismatch`);
    assert.equal(functionSupported, testCase.expectedSupported, `${testCase.id}: Functions coverage mismatch`);
    assert.equal(rendererSupported, testCase.expectedSupported, `${testCase.id}: renderer coverage mismatch`);
    if (testCase.expectedAnyError) {
      assert.match(allErrors, testCase.expectedAnyError, `${testCase.id}: expected a meaningful blocker`);
    }
    return {
      id: testCase.id,
      supported: testCase.expectedSupported,
      clientErrors: clientCoverage.blockingErrors.length,
      functionErrors: functionErrors.length,
      rendererErrors: rendererValidation.errors.length,
    };
  });

  assert.equal(results.filter((result) => result.supported).length, 5);
  assert.equal(results.filter((result) => !result.supported).length, 7);
  console.log(JSON.stringify({ coverageParity: results }, null, 2));
  console.log("smoke-vibecut-export-coverage-parity: ok");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

function makeManifest(overrides = {}) {
  return {
    version: 1,
    project: {
      id: "coverage-parity",
      name: "Coverage parity",
      duration: 5.5,
      preset: "instagram-reel",
    },
    render: {
      width: 1080,
      height: 1920,
      fps: 30,
      format: "mp4",
      videoCodec: "h264",
      audioCodec: "aac",
      targetBitrate: 24_000_000,
      audioBitrate: 192_000,
      qualityMode: "pro",
      fitMode: "cover",
    },
    clips: [clip("clip-a"), clip("clip-b")],
    transitions: [],
    textOverlays: [],
    audioTracks: [],
    estimates: {
      cost: { eur: 0.001, label: "0.0010 EUR est." },
    },
    ...overrides,
  };
}

function clip(id, overrides = {}) {
  return {
    id,
    name: id,
    sourceStoragePath: `users/${uid}/exports/coverage-parity/sources/video/${id}.mp4`,
    duration: 3,
    trimStart: 0,
    trimEnd: 3,
    speed: 1,
    volume: 80,
    fitMode: "cover",
    filters: {},
    metadata: { sourceSizeBytes: 12 * 1024 * 1024 },
    ...overrides,
  };
}

function transition(overrides = {}) {
  return {
    id: "transition-a",
    type: "crossfade",
    duration: 0.5,
    fromItemId: "clip-a",
    toItemId: "clip-b",
    params: { placement: "cut" },
    ...overrides,
  };
}

function textOverlay(overrides = {}) {
  return {
    id: "text-a",
    content: "TEXT",
    startTime: 0.5,
    endTime: 2.8,
    x: 0.5,
    y: 0.2,
    fontSize: 72,
    color: "#ffffff",
    animation: "fade",
    animationOut: "fade",
    ...overrides,
  };
}

function audioTrack(overrides = {}) {
  return {
    id: "audio-a",
    name: "Audio A",
    sourceStoragePath: `users/${uid}/exports/coverage-parity/sources/audio/audio-a.m4a`,
    duration: 5.5,
    trimStart: 0,
    trimEnd: 5.5,
    startTime: 0,
    volume: 70,
    sourceSizeBytes: 2 * 1024 * 1024,
    ...overrides,
  };
}
