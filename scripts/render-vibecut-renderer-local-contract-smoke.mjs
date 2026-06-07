import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { buildFfmpegArgs, validateManifest } from "../render-service/src/server.js";

const require = createRequire(import.meta.url);
const defaultK1Dir = "C:\\Users\\pcpor\\OneDrive\\Bureau\\K1";
const k1Dir = process.env.VIBECUT_K1_DIR || defaultK1Dir;
const outputDir = path.join(process.cwd(), "test-results", "vibecut-export", "renderer-contract");
const ffmpegCommand = await resolveExecutable("ffmpeg", [
  process.env.VIBECUT_FFMPEG_PATH,
  process.env.FFMPEG_PATH,
  resolveOptionalPackagePath("ffmpeg-static"),
]);
const ffprobeCommand = await resolveExecutable("ffprobe", [
  process.env.VIBECUT_FFPROBE_PATH,
  process.env.FFPROBE_PATH,
  resolveOptionalPackagePath("ffprobe-static"),
]);

await main();

async function main() {
  await mkdir(outputDir, { recursive: true });
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "vibecut-renderer-contract-"));
  try {
    const k1Result = await renderK1Contract();
    const fixtureResult = await renderCombinedFixtureContract(tempDir);
    console.log(JSON.stringify({
      localOnly: true,
      rendererSource: "render-service/src/server.js buildFfmpegArgs",
      outputs: [k1Result, fixtureResult],
      nextCloudStepRequiresConfirmation: "OK pour smoke live Cloud Run K1",
    }, null, 2));
    console.log("render-vibecut-renderer-local-contract-smoke: ok");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function renderK1Contract() {
  const k1A = path.join(k1Dir, "MVI_0126.MP4");
  const k1B = path.join(k1Dir, "MVI_0117.MP4");
  await assertFile(k1A);
  await assertFile(k1B);
  const manifest = {
    version: 1,
    project: { id: "k1-renderer-contract", name: "K1 renderer contract", duration: 5.5 },
    render: {
      width: 1080,
      height: 1920,
      fps: 30,
      format: "mp4",
      videoCodec: "h264",
      audioCodec: "aac",
      crf: 18,
      preset: "veryfast",
      audioBitrate: 192000,
      fitMode: "cover",
    },
    clips: [
      {
        id: "k1-a",
        name: "MVI_0126.MP4",
        sourceStoragePath: "users/local/exports/renderer-contract/sources/video/MVI_0126.MP4",
        trimStart: 0,
        trimEnd: 3,
        duration: 3,
        orientationRotation: 270,
        volume: 80,
        fitMode: "cover",
        filters: {},
      },
      {
        id: "k1-b",
        name: "MVI_0117.MP4",
        sourceStoragePath: "users/local/exports/renderer-contract/sources/video/MVI_0117.MP4",
        trimStart: 0,
        trimEnd: 3,
        duration: 3,
        orientationRotation: 0,
        volume: 80,
        fitMode: "cover",
        filters: {},
      },
    ],
    transitions: [
      { id: "k1-crossfade", type: "crossfade", duration: 0.5, fromItemId: "k1-a", toItemId: "k1-b", params: { placement: "cut" } },
    ],
    textOverlays: [
      { id: "k1-title", content: "K1 EXPORT", startTime: 0.4, endTime: 2.2, x: 0.5, y: 0.18, fontSize: 68, color: "#ffffff", animation: "fade", animationOut: "fade" },
    ],
    audioTracks: [],
  };
  const outputFile = path.join(outputDir, "k1-renderer-contract.mp4");
  const result = await renderWithRendererContract({
    id: "k1-renderer-contract",
    manifest,
    videoFiles: [k1A, k1B],
    audioFiles: [],
    outputFile,
    expected: { duration: 5.5, hasAudio: true },
  });
  return result;
}

async function renderCombinedFixtureContract(tempDir) {
  const clipA = path.join(tempDir, "fixture-a.mp4");
  const clipB = path.join(tempDir, "fixture-b.mp4");
  const music = path.join(tempDir, "fixture-music.m4a");
  await runCommand(ffmpegCommand, [
    "-hide_banner", "-y",
    "-f", "lavfi", "-i", "testsrc2=s=1080x1920:r=30:d=3",
    "-f", "lavfi", "-i", "sine=frequency=330:sample_rate=48000:duration=3",
    "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k", clipA,
  ]);
  await runCommand(ffmpegCommand, [
    "-hide_banner", "-y",
    "-f", "lavfi", "-i", "smptebars=s=1080x1920:r=30:d=3",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
    "-an", clipB,
  ]);
  await runCommand(ffmpegCommand, [
    "-hide_banner", "-y",
    "-f", "lavfi", "-i", "sine=frequency=660:sample_rate=48000:duration=5.5",
    "-c:a", "aac", "-b:a", "192k", music,
  ]);

  const manifest = {
    version: 1,
    project: { id: "combined-renderer-contract", name: "Combined renderer contract", duration: 5.5 },
    render: {
      width: 1080,
      height: 1920,
      fps: 30,
      format: "mp4",
      videoCodec: "h264",
      audioCodec: "aac",
      crf: 18,
      preset: "veryfast",
      audioBitrate: 192000,
      fitMode: "cover",
    },
    clips: [
      {
        id: "clip-a",
        name: "Fixture A",
        sourceStoragePath: "users/local/exports/renderer-contract/sources/video/fixture-a.mp4",
        trimStart: 0,
        trimEnd: 3,
        duration: 3,
        orientationRotation: 0,
        volume: 70,
        fitMode: "cover",
        filters: { contrast: 118, saturation: 112, vignette: 8 },
      },
      {
        id: "clip-b",
        name: "Fixture B",
        sourceStoragePath: "users/local/exports/renderer-contract/sources/video/fixture-b.mp4",
        trimStart: 0,
        trimEnd: 3,
        duration: 3,
        orientationRotation: 0,
        volume: 0,
        fitMode: "cover",
        filters: { contrast: 108, saturation: 105, grain: 4 },
      },
    ],
    transitions: [
      { id: "combined-fade", type: "fade", duration: 0.5, fromItemId: "clip-a", toItemId: "clip-b", params: { placement: "cut" } },
    ],
    textOverlays: [
      { id: "combined-title", content: "COMBINED", startTime: 0.4, endTime: 2.8, x: 0.5, y: 0.18, fontSize: 68, color: "#ffffff", animation: "fade", animationOut: "fade" },
    ],
    audioTracks: [
      {
        id: "music-combined",
        name: "Fixture Music",
        sourceStoragePath: "users/local/exports/renderer-contract/sources/audio/music.m4a",
        trimStart: 0,
        trimEnd: 5.5,
        duration: 5.5,
        startTime: 0,
        volume: 60,
      },
    ],
  };
  const outputFile = path.join(outputDir, "combined-renderer-contract.mp4");
  const result = await renderWithRendererContract({
    id: "combined-renderer-contract",
    manifest,
    videoFiles: [clipA, clipB],
    audioFiles: [music],
    outputFile,
    expected: { duration: 5.5, hasAudio: true },
  });
  await assertRegionBrightness(outputFile);
  return result;
}

async function renderWithRendererContract({ id, manifest, videoFiles, audioFiles, outputFile, expected }) {
  const validation = validateManifest(manifest);
  assert.deepEqual(validation.errors, [], `${id} manifest must pass renderer validation`);
  const warnings = [];
  const videoInputs = [];
  for (const [index, file] of videoFiles.entries()) {
    const streams = await probeStreams(file);
    videoInputs.push({ clip: manifest.clips[index], file, hasAudioStream: streams.hasAudio });
  }
  const audioInputs = audioFiles.map((file, index) => ({ track: manifest.audioTracks[index], file }));
  await rm(outputFile, { force: true });
  const args = buildFfmpegArgs({ manifest, videoInputs, audioInputs, outputFile, warnings });
  await runCommand(ffmpegCommand, args, { tailBytes: 12_000 });
  const fileStat = await stat(outputFile);
  assert.ok(fileStat.size > 1024, `${id} output must not be empty`);
  const probe = await probeOutput(outputFile);
  assert.equal(probe.video.codec_name, "h264", `${id} video codec must be H.264`);
  assert.equal(probe.video.width, 1080, `${id} width must be 1080`);
  assert.equal(probe.video.height, 1920, `${id} height must be 1920`);
  assert.ok(Math.abs(probe.duration - expected.duration) <= 0.25, `${id} duration mismatch: ${probe.duration}`);
  assert.equal(probe.hasAudio, expected.hasAudio, `${id} audio presence mismatch`);
  await assertNotAllBlack(outputFile, id);
  return {
    id,
    outputFile,
    bytes: fileStat.size,
    duration: probe.duration,
    hasAudio: probe.hasAudio,
    warnings,
  };
}

async function assertFile(filePath) {
  await access(filePath);
  const fileStat = await stat(filePath);
  assert.ok(fileStat.size > 5 * 1024 * 1024, `${filePath} is too small for a real smoke source`);
}

async function probeStreams(filePath) {
  const stdout = await runCommandCapture(ffprobeCommand, [
    "-v", "error",
    "-print_format", "json",
    "-show_streams",
    filePath,
  ]);
  const data = JSON.parse(stdout || "{}");
  const streams = Array.isArray(data.streams) ? data.streams : [];
  return {
    hasAudio: streams.some((stream) => stream.codec_type === "audio"),
    hasVideo: streams.some((stream) => stream.codec_type === "video"),
  };
}

async function probeOutput(filePath) {
  const stdout = await runCommandCapture(ffprobeCommand, [
    "-v", "error",
    "-print_format", "json",
    "-show_format",
    "-show_streams",
    filePath,
  ]);
  const data = JSON.parse(stdout || "{}");
  const streams = Array.isArray(data.streams) ? data.streams : [];
  const video = streams.find((stream) => stream.codec_type === "video");
  assert.ok(video, "output must contain a video stream");
  return {
    video,
    hasAudio: streams.some((stream) => stream.codec_type === "audio"),
    duration: Number(data.format?.duration || video.duration || 0),
  };
}

async function assertNotAllBlack(filePath, id) {
  const stderr = await runCommandCapture(ffmpegCommand, [
    "-hide_banner",
    "-ss", "1",
    "-t", "0.5",
    "-i", filePath,
    "-vf", "blackdetect=d=0.4:pix_th=0.10",
    "-an",
    "-f", "null",
    "-",
  ], { capture: "stderr" });
  assert.equal(/black_start:/.test(stderr), false, `${id} sampled frame range must not be detected as black`);
}

async function assertRegionBrightness(filePath) {
  const sample = await runCommandBuffer(ffmpegCommand, [
    "-hide_banner",
    "-ss", "1",
    "-i", filePath,
    "-vf", "crop=800:260:140:220,scale=1:1,format=rgb24",
    "-frames:v", "1",
    "-f", "rawvideo",
    "-",
  ]);
  assert.equal(sample.length, 3, "text region RGB sample must contain one pixel");
  const average = (sample[0] + sample[1] + sample[2]) / 3;
  assert.ok(average >= 12, `text region should be visibly brighter than the base, got ${average}`);
}

async function resolveExecutable(commandName, candidates = []) {
  const cleanCandidates = candidates.filter(Boolean).map((candidate) => String(candidate).trim()).filter(Boolean);
  for (const candidate of [commandName, ...cleanCandidates]) {
    try {
      if (candidate !== commandName) await access(candidate);
      await runCommand(candidate, ["-version"], { tailBytes: 2000 });
      return candidate;
    } catch {
      // Try next candidate.
    }
  }
  throw new Error(`${commandName} is required. Add it to PATH or install the matching npm static package.`);
}

function resolveOptionalPackagePath(packageName) {
  try {
    const resolved = require(packageName);
    if (typeof resolved === "string") return resolved;
    if (typeof resolved?.path === "string") return resolved.path;
  } catch {
    return null;
  }
  return null;
}

function runCommand(command, args, options = {}) {
  return runCommandInternal(command, args, { ...options, capture: "none" });
}

function runCommandCapture(command, args, options = {}) {
  return runCommandInternal(command, args, { ...options, capture: options.capture || "stdout" });
}

function runCommandInternal(command, args, { capture = "stdout", tailBytes = 6000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout = `${stdout}${chunk.toString("utf8")}`.slice(-tailBytes);
    });
    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${chunk.toString("utf8")}`.slice(-tailBytes);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(capture === "stderr" ? stderr : stdout);
        return;
      }
      reject(new Error(`${command} failed with code ${code}: ${stderr || stdout}`));
    });
  });
}

function runCommandBuffer(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    const stdout = [];
    let stderr = "";
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${chunk.toString("utf8")}`.slice(-6000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout));
        return;
      }
      reject(new Error(`${command} failed with code ${code}: ${stderr}`));
    });
  });
}
