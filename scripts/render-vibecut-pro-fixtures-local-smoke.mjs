import assert from "node:assert/strict";
import { access, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const outputDir = path.join(process.cwd(), "test-results", "vibecut-export", "pro-fixtures");
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

const fixtures = [
  {
    id: "static-text",
    duration: 4,
    hasAudio: false,
    command: (outputFile) => [
      "-f", "lavfi", "-i", "color=c=#304860:s=1080x1920:r=30:d=4",
      "-vf", "drawtext=text='STATIC TEXT':x='w*0.5-text_w/2':y='h*0.20-text_h/2':fontsize=72:fontcolor=0xffffff:borderw=2:bordercolor=0x000000cc",
      ...encodeArgs(outputFile),
    ],
    verify: async (outputFile) => {
      await assertRegionBrightness(outputFile, { minAverageChannel: 12 });
    },
  },
  {
    id: "crossfade-transition",
    duration: 5.5,
    hasAudio: false,
    command: (outputFile) => [
      "-f", "lavfi", "-i", "testsrc2=s=1080x1920:r=30:d=3",
      "-f", "lavfi", "-i", "smptebars=s=1080x1920:r=30:d=3",
      "-filter_complex", "[0:v]format=yuv420p[v0];[1:v]format=yuv420p[v1];[v0][v1]xfade=transition=fade:duration=0.5:offset=2.5[vout]",
      "-map", "[vout]",
      ...encodeArgs(outputFile),
    ],
  },
  {
    id: "color-filters",
    duration: 4,
    hasAudio: false,
    command: (outputFile) => [
      "-f", "lavfi", "-i", "testsrc2=s=1080x1920:r=30:d=4",
      "-vf", "eq=brightness=0.04:contrast=1.22:saturation=1.18,hue=h=12,vignette=angle=0.95:eval=frame,format=yuv420p",
      ...encodeArgs(outputFile),
    ],
  },
  {
    id: "external-audio",
    duration: 4,
    hasAudio: true,
    command: (outputFile) => [
      "-f", "lavfi", "-i", "testsrc2=s=1080x1920:r=30:d=4",
      "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=4",
      "-map", "0:v:0",
      "-map", "1:a:0",
      ...encodeArgs(outputFile, { audio: true }),
    ],
  },
  {
    id: "combined-supported",
    duration: 5.5,
    hasAudio: true,
    command: (outputFile) => [
      "-f", "lavfi", "-i", "testsrc2=s=1080x1920:r=30:d=3",
      "-f", "lavfi", "-i", "smptebars=s=1080x1920:r=30:d=3",
      "-f", "lavfi", "-i", "sine=frequency=660:sample_rate=48000:duration=5.5",
      "-filter_complex",
      "[0:v]eq=contrast=1.18:saturation=1.12,format=yuv420p[v0];"
      + "[1:v]eq=contrast=1.08:saturation=1.05,format=yuv420p[v1];"
      + "[v0][v1]xfade=transition=fade:duration=0.5:offset=2.5[vx];"
      + "[vx]drawtext=text='COMBINED':x='w*0.5-text_w/2':y='h*0.18-text_h/2':fontsize=68:fontcolor=0xffffff:borderw=2:bordercolor=0x000000cc[vout]",
      "-map", "[vout]",
      "-map", "2:a:0",
      ...encodeArgs(outputFile, { audio: true }),
    ],
    verify: async (outputFile) => {
      await assertRegionBrightness(outputFile, { minAverageChannel: 12 });
    },
  },
];

await main();

async function main() {
  await mkdir(outputDir, { recursive: true });
  const results = [];
  for (const fixture of fixtures) {
    const outputFile = path.join(outputDir, `${fixture.id}.mp4`);
    await mkdir(path.dirname(outputFile), { recursive: true });
    await rm(outputFile, { force: true });
    await runCommand(ffmpegCommand, ["-hide_banner", "-y", ...fixture.command(outputFile)], { tailBytes: 12_000 });
    const fileStat = await stat(outputFile);
    assert.ok(fileStat.size > 1024, `${fixture.id} output must not be empty`);
    const probe = await probeOutput(outputFile);
    assert.equal(probe.video.codec_name, "h264", `${fixture.id} video codec must be H.264`);
    assert.equal(probe.video.width, 1080, `${fixture.id} width must be 1080`);
    assert.equal(probe.video.height, 1920, `${fixture.id} height must be 1920`);
    assert.ok(Math.abs(probe.duration - fixture.duration) <= 0.2, `${fixture.id} duration mismatch: ${probe.duration}`);
    assert.equal(probe.hasAudio, fixture.hasAudio, `${fixture.id} audio presence mismatch`);
    await assertNotAllBlack(outputFile, fixture.id);
    if (fixture.verify) await fixture.verify(outputFile);
    results.push({
      id: fixture.id,
      outputFile,
      bytes: fileStat.size,
      duration: probe.duration,
      hasAudio: probe.hasAudio,
    });
  }
  console.log(JSON.stringify({ localOnly: true, fixtures: results }, null, 2));
  console.log("render-vibecut-pro-fixtures-local-smoke: ok");
}

function encodeArgs(outputFile, { audio = false } = {}) {
  const args = [
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "18",
    "-profile:v", "high",
    "-pix_fmt", "yuv420p",
  ];
  if (audio) {
    args.push("-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2");
  } else {
    args.push("-an");
  }
  args.push("-movflags", "+faststart", outputFile);
  return args;
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

async function assertNotAllBlack(filePath, fixtureId) {
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
  assert.equal(/black_start:/.test(stderr), false, `${fixtureId} sampled frame range must not be detected as black`);
}

async function assertRegionBrightness(filePath, { minAverageChannel }) {
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
  assert.ok(average >= minAverageChannel, `text region should be visibly brighter than the dark base, got ${average}`);
}

async function resolveExecutable(commandName, candidates = []) {
  const cleanCandidates = candidates.filter(Boolean).map((candidate) => String(candidate).trim()).filter(Boolean);
  for (const candidate of [commandName, ...cleanCandidates]) {
    try {
      if (candidate !== commandName) {
        await access(candidate);
      }
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
