import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = path.join(
  process.cwd(),
  "src",
  "features",
  "vibefx-studio",
  "video",
  "export",
  "exportMediaMetadata.js",
);
const tempDir = await mkdtemp(path.join(os.tmpdir(), "vibecut-export-media-metadata-"));

try {
  const source = await readFile(sourcePath, "utf8");
  const tempModulePath = path.join(tempDir, "exportMediaMetadata.mjs");
  await writeFile(tempModulePath, source, "utf8");
  const {
    contentTypeToContainer,
    formatCodecLabel,
    formatToContentType,
    resolveOutputMediaMetadata,
  } = await import(pathToFileURL(tempModulePath).href);

  assert.equal(formatToContentType("mp4"), "video/mp4");
  assert.equal(formatToContentType("webm"), "video/webm");
  assert.equal(formatToContentType("mov"), "video/quicktime");
  assert.equal(formatToContentType("png"), "image/png");
  assert.equal(formatToContentType("jpg"), "image/jpeg");
  assert.equal(formatToContentType("jpeg"), "image/jpeg");
  assert.equal(formatToContentType("webp"), "image/webp");

  assert.equal(contentTypeToContainer("video/mp4; codecs=h264,aac"), "MP4");
  assert.equal(contentTypeToContainer("video/webm"), "WEBM");
  assert.equal(contentTypeToContainer("video/quicktime"), "MOV");
  assert.equal(contentTypeToContainer("image/png"), "PNG");
  assert.equal(contentTypeToContainer("image/jpeg"), "JPEG");
  assert.equal(contentTypeToContainer("image/webp"), "WEBP");

  assert.equal(formatCodecLabel("h264"), "H.264");
  assert.equal(formatCodecLabel("avc"), "H.264");
  assert.equal(formatCodecLabel("h265"), "H.265/HEVC");
  assert.equal(formatCodecLabel("hevc"), "H.265/HEVC");
  assert.equal(formatCodecLabel("vp9"), "VP9");
  assert.equal(formatCodecLabel("vp8"), "VP8");
  assert.equal(formatCodecLabel("av1"), "AV1");
  assert.equal(formatCodecLabel("aac"), "AAC");
  assert.equal(formatCodecLabel("opus"), "Opus");
  assert.equal(formatCodecLabel("prores"), "ProRes");
  assert.equal(formatCodecLabel("dnxhr"), "DNxHR");
  assert.equal(formatCodecLabel("", "video"), "video");

  assert.deepEqual(
    resolveOutputMediaMetadata({
      activeMode: "firebase",
      render: { format: "mp4", videoCodec: "h264", audioCodec: "aac" },
      output: {},
    }),
    { container: "MP4", codec: "H.264/AAC", contentType: "video/mp4" },
  );
  assert.deepEqual(
    resolveOutputMediaMetadata({
      activeMode: "firebase",
      render: { format: "webm", videoCodec: "vp9", audioCodec: "opus" },
      output: {},
    }),
    { container: "WEBM", codec: "VP9/Opus", contentType: "video/webm" },
  );
  assert.deepEqual(
    resolveOutputMediaMetadata({
      activeMode: "firebase",
      render: { format: "mov", videoCodec: "prores", audioCodec: "pcm" },
      output: {},
    }),
    { container: "MOV", codec: "ProRes/PCM", contentType: "video/quicktime" },
  );
  assert.deepEqual(
    resolveOutputMediaMetadata({
      activeMode: "firebase",
      render: { format: "mp4", videoCodec: "hevc", audioCodec: "aac" },
      output: { contentType: "video/mp4" },
    }),
    { container: "MP4", codec: "H.265/HEVC/AAC", contentType: "video/mp4" },
  );
  assert.deepEqual(
    resolveOutputMediaMetadata({
      activeMode: "firebase",
      render: { format: "png", videoCodec: "png", audioCodec: "" },
      output: {},
    }),
    { container: "PNG", codec: "PNG", contentType: "image/png" },
  );
  assert.deepEqual(
    resolveOutputMediaMetadata({
      activeMode: "firebase",
      render: {},
      output: { contentType: "image/webp" },
    }),
    { container: "WEBP", codec: "WEBP", contentType: "image/webp" },
  );
  assert.deepEqual(
    resolveOutputMediaMetadata({
      activeMode: "localMock",
      render: { format: "mp4", videoCodec: "h264", audioCodec: "aac" },
      output: { mockOnly: true },
    }),
    { container: "mock", codec: "simulation", contentType: "aucun fichier" },
  );

  console.log("smoke-vibecut-export-media-metadata: ok");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
