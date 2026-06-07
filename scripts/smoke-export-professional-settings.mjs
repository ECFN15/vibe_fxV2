import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const tempDir = await mkdtemp(path.join(os.tmpdir(), "vibefx-export-settings-"));
await materializeEsmModules(tempDir);
const settingsModule = await import(pathToFileURL(path.join(tempDir, "exportSettings.mjs")).href);
const imageModule = await import(pathToFileURL(path.join(tempDir, "imageExport.mjs")).href);
const queueModule = await import(pathToFileURL(path.join(tempDir, "renderQueue.mjs")).href);

const {
  applyProfessionalPreset,
  createDefaultProfessionalExportSettings,
  estimateProfessionalExportSize,
  sanitizeExportFileName,
  updateProfessionalFormat,
  validateProfessionalExportSettings,
} = settingsModule;
const { compareCanvasVisualSignature, exportCanvasImage } = imageModule;
const { createRenderQueueItem, transitionRenderQueueItem } = queueModule;

const base = createDefaultProfessionalExportSettings({
  presetId: "instagram-story-reels",
  fileName: "Client final: reel été 01",
  timelineFps: 30,
});

assert.equal(base.video.width, 1080);
assert.equal(base.video.height, 1920);
assert.equal(base.video.format, "mp4");
assert.equal(base.video.codec, "h264");
assert.equal(base.audio.codec, "aac");
assert.equal(sanitizeExportFileName("Client final: reel été 01"), "Client-final-reel-ete-01");

const custom = applyProfessionalPreset(base, "custom");
assert.equal(custom.presetId, "custom");
assert.equal(custom.video.width, 1080);
assert.equal(custom.video.height, 1920);
const customSize = {
  ...custom,
  video: { ...custom.video, width: 1200, height: 1600 },
};
assert.equal(validateProfessionalExportSettings(customSize, { durationSeconds: 4 }).supportedFinal, true);

const png = updateProfessionalFormat(base, "png");
assert.equal(png.video.format, "png");
assert.equal(png.video.codec, "png");
assert.equal(png.audio.exportAudio, false);
assert.equal(validateProfessionalExportSettings(png, { durationSeconds: 0 }).supportedFinal, true);

const jpeg = updateProfessionalFormat(base, "jpeg");
const webp = updateProfessionalFormat(base, "webp");
for (const settings of [jpeg, webp]) {
  const result = validateProfessionalExportSettings(settings, { durationSeconds: 0 });
  assert.equal(result.supportedFinal, true, `${settings.video.format} image export should be locally supported`);
}

const movProRes = updateProfessionalFormat(base, "mov");
assert.equal(validateProfessionalExportSettings(movProRes, { durationSeconds: 4 }).supportedFinal, false);
assert.match(validateProfessionalExportSettings(movProRes, { durationSeconds: 4 }).blockers.join("\n"), /extension renderer|non rendu/);

const size = estimateProfessionalExportSize(base, 5.5);
assert.ok(size.bytes > 0);
assert.match(size.label, /Mo/);

const queued = createRenderQueueItem({ settings: base, now: new Date("2026-06-06T20:00:00.000Z") });
assert.equal(queued.status, "queued");
const rendering = transitionRenderQueueItem(queued, "rendering", { progress: 42, message: "Encoding started." }, new Date("2026-06-06T20:00:05.000Z"));
assert.equal(rendering.status, "rendering");
assert.equal(rendering.progress, 42);
const completed = transitionRenderQueueItem(rendering, "completed", { outputUrl: "blob:ok" }, new Date("2026-06-06T20:00:20.000Z"));
assert.equal(completed.progress, 100);
const failed = transitionRenderQueueItem(queued, "failed", { message: "Codec unsupported." }, new Date("2026-06-06T20:00:10.000Z"));
assert.equal(failed.status, "failed");
assert.equal(failed.logs.at(-1).level, "error");

const mockPngCanvas = makeBlobCanvas("image/png");
const mockJpegCanvas = makeBlobCanvas("image/jpeg");
const mockWebpCanvas = makeBlobCanvas("image/webp");
assert.equal((await exportCanvasImage(mockPngCanvas, { format: "png", fileName: "export png" })).contentType, "image/png");
assert.equal((await exportCanvasImage(mockJpegCanvas, { format: "jpeg", fileName: "export jpeg" })).fileName, "export-jpeg.jpg");
assert.equal((await exportCanvasImage(mockWebpCanvas, { format: "webp", fileName: "export webp" })).contentType, "image/webp");

const visualA = makeVisualCanvas([20, 40, 60, 255]);
const visualB = makeVisualCanvas([20, 40, 60, 255]);
const visualC = makeVisualCanvas([22, 40, 60, 255]);
assert.equal(compareCanvasVisualSignature(visualA, visualB).match, true);
assert.equal(compareCanvasVisualSignature(visualA, visualC).match, false);
assert.equal(compareCanvasVisualSignature(visualA, visualC, { tolerance: 3 }).match, true);

console.log("smoke-export-professional-settings: ok");
await rm(tempDir, { recursive: true, force: true });

async function materializeEsmModules(dir) {
  const root = process.cwd();
  const sourceFiles = [
    ["src/features/export/presets/exportPresets.js", "exportPresets.mjs", (source) => source],
    ["src/features/export/lib/exportSettings.js", "exportSettings.mjs", (source) => source.replace("../presets/exportPresets", "./exportPresets.mjs")],
    ["src/features/export/lib/imageExport.js", "imageExport.mjs", (source) => source.replace("./exportSettings", "./exportSettings.mjs")],
    ["src/features/export/renderQueue/renderQueue.js", "renderQueue.mjs", (source) => source],
  ];
  await Promise.all(sourceFiles.map(async ([relativePath, targetName, transform]) => {
    const source = await readFile(path.join(root, relativePath), "utf8");
    await writeFile(path.join(dir, targetName), transform(source), "utf8");
  }));
}

function makeBlobCanvas(expectedType) {
  return {
    toBlob(callback, contentType) {
      assert.equal(contentType, expectedType);
      callback(new Blob(["ok"], { type: contentType }));
    },
  };
}

function makeVisualCanvas(pixel) {
  return {
    width: 10,
    height: 10,
    getContext() {
      return {
        getImageData() {
          return { data: pixel };
        },
      };
    },
  };
}
