import assert from "node:assert/strict";
import { access, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const defaultK1Dir = "C:\\Users\\pcpor\\OneDrive\\Bureau\\K1";
const k1Dir = process.env.VIBECUT_K1_DIR || defaultK1Dir;
const outputDir = process.env.VIBECUT_K1_OUTPUT_DIR
  || path.join(process.cwd(), "test-results", "vibecut-export");
const outputFile = path.join(outputDir, "k1-local-smoke-1080x1920.mp4");
let ffmpegCommand = "ffmpeg";
let ffprobeCommand = "ffprobe";

if (process.env.VIBECUT_K1_LIVE === "1" || process.env.VIBECUT_RUN_CLOUD === "1") {
  throw new Error("This script is local-only. It must not launch Cloud Run exports.");
}

const sources = [
  {
    id: "k1-a",
    name: "MVI_0126.MP4",
    filePath: path.join(k1Dir, "MVI_0126.MP4"),
    trimStart: 0,
    trimEnd: 3,
    rotation: 270,
    volume: 0.8,
    start: 0,
  },
  {
    id: "k1-b",
    name: "MVI_0117.MP4",
    filePath: path.join(k1Dir, "MVI_0117.MP4"),
    trimStart: 0,
    trimEnd: 3,
    rotation: 0,
    volume: 0.8,
    start: 2.5,
  },
];

async function main() {
  ffmpegCommand = await resolveExecutable("ffmpeg", [
    process.env.VIBECUT_FFMPEG_PATH,
    process.env.FFMPEG_PATH,
    resolveOptionalPackagePath("ffmpeg-static"),
    ...commonWindowsExecutablePaths("ffmpeg.exe"),
  ]);
  ffprobeCommand = await resolveExecutable("ffprobe", [
    process.env.VIBECUT_FFPROBE_PATH,
    process.env.FFPROBE_PATH,
    resolveOptionalPackagePath("ffprobe-static"),
    ...commonWindowsExecutablePaths("ffprobe.exe"),
  ]);
  await assertK1Sources();
  await mkdir(outputDir, { recursive: true });
  await rm(outputFile, { force: true });

  const streams = [];
  for (const source of sources) {
    streams.push(await probeStreams(source.filePath));
  }

  const args = buildFfmpegArgs(streams);
  await runCommand(ffmpegCommand, args, { tailBytes: 12_000 });

  const fileStat = await stat(outputFile);
  assert.ok(fileStat.size > 512 * 1024, "local K1 output must not be empty");

  const outputProbe = await probeOutput(outputFile);
  assert.equal(outputProbe.video.codec_name, "h264", "output video codec must be H.264");
  assert.equal(outputProbe.video.width, 1080, "output width must be 1080");
  assert.equal(outputProbe.video.height, 1920, "output height must be 1920");
  assert.ok(outputProbe.duration >= 5.35 && outputProbe.duration <= 5.8, `duration must be approx 5.5s, got ${outputProbe.duration}`);
  if (streams.some((stream) => stream.hasAudio)) {
    assert.equal(outputProbe.hasAudio, true, "output must contain audio when K1 sources expose audio");
  }

  await assertNotAllBlack(outputFile);

  console.log(JSON.stringify({
    localOnly: true,
    outputFile,
    bytes: fileStat.size,
    render: `${outputProbe.video.width}x${outputProbe.video.height}`,
    codec: outputProbe.video.codec_name,
    fps: outputProbe.video.avg_frame_rate,
    duration: outputProbe.duration,
    hasAudio: outputProbe.hasAudio,
    nextCloudStepRequiresConfirmation: "OK pour smoke live Cloud Run K1",
  }, null, 2));
  console.log("render-vibecut-k1-local-mp4-smoke: ok");
}

async function assertK1Sources() {
  for (const source of sources) {
    await access(source.filePath);
    const fileStat = await stat(source.filePath);
    assert.ok(fileStat.size > 5 * 1024 * 1024, `${source.name} is too small for a real K1 smoke`);
  }
}

async function assertExecutable(command) {
  try {
    await runCommand(command, ["-version"], { tailBytes: 2000 });
  } catch (error) {
    throw new Error(`${command} is required for the local K1 MP4 smoke and was not found in PATH. ${error.message}`);
  }
}

async function resolveExecutable(commandName, candidates = []) {
  const cleanCandidates = candidates.filter(Boolean).map((candidate) => String(candidate).trim()).filter(Boolean);
  for (const candidate of [commandName, ...cleanCandidates]) {
    try {
      if (candidate !== commandName) {
        await access(candidate);
      }
      await assertExecutable(candidate);
      return candidate;
    } catch {
      // Try the next explicit/common path before failing with the full hint.
    }
  }
  throw new Error(
    `${commandName} is required for the local K1 MP4 smoke. Add it to PATH or set `
    + `${commandName === "ffmpeg" ? "VIBECUT_FFMPEG_PATH/FFMPEG_PATH" : "VIBECUT_FFPROBE_PATH/FFPROBE_PATH"}.`,
  );
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

function buildFfmpegArgs(streams) {
  const args = ["-hide_banner", "-y"];
  for (const source of sources) {
    args.push("-ss", String(source.trimStart), "-t", String(source.trimEnd - source.trimStart), "-i", source.filePath);
  }

  const filterParts = [
    `[0:v]fps=30,${rotationFilter(sources[0].rotation)}scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p,setpts=PTS-STARTPTS[v0]`,
    `[1:v]fps=30,${rotationFilter(sources[1].rotation)}scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p,setpts=PTS-STARTPTS[v1]`,
    "[v0][v1]xfade=transition=fade:duration=0.5:offset=2.5[vxfade]",
    "[vxfade]drawtext=text='K1 EXPORT':x='w*0.5-text_w/2':y='h*0.18-text_h/2':fontsize=38:fontcolor=0xffffff:alpha='if(lt(t,0.75),(t-0.4)/0.35,if(gt(t,1.85),(2.2-t)/0.35,1))':enable='between(t,0.4,2.2)':borderw=1:bordercolor=0x00000099:shadowcolor=0x00000088:shadowx=2:shadowy=2[vout]",
  ];

  const audioLabels = [];
  streams.forEach((stream, index) => {
    if (!stream.hasAudio) return;
    const source = sources[index];
    const duration = source.trimEnd - source.trimStart;
    const delayMs = Math.max(0, Math.round(source.start * 1000));
    filterParts.push(`[${index}:a]atrim=start=0:end=${duration},asetpts=PTS-STARTPTS,volume=${source.volume},adelay=${delayMs}:all=1[a${index}]`);
    audioLabels.push(`[a${index}]`);
  });
  if (audioLabels.length === 1) {
    filterParts.push(`${audioLabels[0]}anull[aout]`);
  } else if (audioLabels.length > 1) {
    filterParts.push(`${audioLabels.join("")}amix=inputs=${audioLabels.length}:duration=longest:normalize=0[aout]`);
  }

  args.push("-filter_complex", filterParts.join(";"));
  args.push("-map", "[vout]");
  if (audioLabels.length) {
    args.push("-map", "[aout]");
  } else {
    args.push("-an");
  }
  args.push(
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "18",
    "-profile:v", "high",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-movflags", "+faststart",
    "-t", "5.5",
    outputFile,
  );
  return args;
}

function rotationFilter(rotation) {
  if (rotation === 90) return "transpose=1,";
  if (rotation === 180) return "hflip,vflip,";
  if (rotation === 270) return "transpose=2,";
  return "";
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
    hasVideo: streams.some((stream) => stream.codec_type === "video"),
    hasAudio: streams.some((stream) => stream.codec_type === "audio"),
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
  assert.equal(/black_start:/.test(stderr), false, "sampled K1 output frame range must not be detected as black");
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

await main();
