import assert from "node:assert/strict";
import { access, stat } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

if (process.env.VIBECUT_K1_LIVE === "1" || process.env.VIBECUT_RUN_CLOUD === "1") {
  throw new Error("This verifier is post-smoke only. It must not launch Cloud Run exports.");
}

const outputFile = process.env.VIBECUT_CLOUD_OUTPUT_FILE || process.argv[2];
assert.ok(outputFile, "Provide the downloaded MP4 path via VIBECUT_CLOUD_OUTPUT_FILE or as the first argument.");

const expected = {
  width: Number(process.env.VIBECUT_EXPECT_WIDTH || 1080),
  height: Number(process.env.VIBECUT_EXPECT_HEIGHT || 1920),
  fps: Number(process.env.VIBECUT_EXPECT_FPS || 30),
  duration: Number(process.env.VIBECUT_EXPECT_DURATION || 5.5),
  durationTolerance: Number(process.env.VIBECUT_DURATION_TOLERANCE || 0.35),
  videoCodec: process.env.VIBECUT_EXPECT_VIDEO_CODEC || "h264",
  audioCodec: process.env.VIBECUT_EXPECT_AUDIO_CODEC || "aac",
  hasAudio: process.env.VIBECUT_EXPECT_AUDIO !== "0",
};

const ffmpegCommand = await resolveExecutable("ffmpeg", [
  process.env.VIBECUT_FFMPEG_PATH,
  process.env.FFMPEG_PATH,
  resolveOptionalPackagePath("ffmpeg-static"),
  ...commonWindowsExecutablePaths("ffmpeg.exe"),
]);
const ffprobeCommand = await resolveExecutable("ffprobe", [
  process.env.VIBECUT_FFPROBE_PATH,
  process.env.FFPROBE_PATH,
  resolveOptionalPackagePath("ffprobe-static"),
  ...commonWindowsExecutablePaths("ffprobe.exe"),
]);

await access(outputFile);
const fileStat = await stat(outputFile);
assert.ok(fileStat.size > 512 * 1024, "downloaded Cloud Run output must not be empty");
assert.equal(path.extname(outputFile).toLowerCase(), ".mp4", "downloaded Cloud Run output must use an .mp4 extension");

const probe = await probeOutput(outputFile);
assert.ok(probe.formatNames.some((name) => ["mov", "mp4", "m4a", "3gp", "3g2", "mj2"].includes(name)), `container must be MP4-compatible, got ${probe.formatNames.join(",")}`);
assert.equal(probe.video.codec_name, expected.videoCodec, `video codec must be ${expected.videoCodec}`);
assert.equal(probe.video.width, expected.width, `output width must be ${expected.width}`);
assert.equal(probe.video.height, expected.height, `output height must be ${expected.height}`);
assertApproxFps(probe.video.avg_frame_rate, expected.fps);
assert.ok(
  Math.abs(probe.duration - expected.duration) <= expected.durationTolerance,
  `duration must be approx ${expected.duration}s, got ${probe.duration}s`,
);

if (expected.hasAudio) {
  assert.ok(probe.audio, "Cloud Run K1 output must contain an audio stream");
  assert.equal(probe.audio.codec_name, expected.audioCodec, `audio codec must be ${expected.audioCodec}`);
} else {
  assert.equal(probe.audio, null, "Cloud Run output must not contain audio when VIBECUT_EXPECT_AUDIO=0");
}

await assertNotAllBlack(outputFile);

console.log(JSON.stringify({
  postSmokeOnly: true,
  outputFile,
  bytes: fileStat.size,
  container: probe.formatNames,
  video: {
    codec: probe.video.codec_name,
    width: probe.video.width,
    height: probe.video.height,
    fps: probe.video.avg_frame_rate,
  },
  audio: probe.audio ? {
    codec: probe.audio.codec_name,
    channels: probe.audio.channels,
    sampleRate: probe.audio.sample_rate,
  } : null,
  duration: probe.duration,
}, null, 2));
console.log("verify-vibecut-k1-cloud-output: ok");

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
  const audio = streams.find((stream) => stream.codec_type === "audio") || null;
  return {
    formatNames: String(data.format?.format_name || "").split(",").filter(Boolean),
    video,
    audio,
    duration: Number(data.format?.duration || video.duration || 0),
  };
}

async function assertNotAllBlack(filePath) {
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
  assert.equal(/black_start:/.test(stderr), false, "sampled Cloud Run output frame range must not be detected as black");
}

function assertApproxFps(rate, expectedFps) {
  const [num, den] = String(rate || "0/1").split("/").map(Number);
  const fps = den ? num / den : num;
  assert.ok(Math.abs(fps - expectedFps) <= 0.2, `fps must be approx ${expectedFps}, got ${rate}`);
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

function commonWindowsExecutablePaths(executable) {
  if (process.platform !== "win32") return [];
  const roots = [
    process.env.ProgramFiles,
    process.env["ProgramFiles(x86)"],
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Microsoft", "WinGet", "Packages") : null,
    "C:\\ffmpeg",
    "C:\\ProgramData\\chocolatey\\bin",
    process.env.USERPROFILE ? path.join(process.env.USERPROFILE, "scoop", "shims") : null,
  ].filter(Boolean);
  return [
    ...roots.map((root) => path.join(root, "ffmpeg", "bin", executable)),
    ...roots.map((root) => path.join(root, executable)),
  ];
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
