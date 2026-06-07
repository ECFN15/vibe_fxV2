import { access, stat } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const defaultK1Dir = "C:\\Users\\pcpor\\OneDrive\\Bureau\\K1";
const k1Dir = process.env.VIBECUT_K1_DIR || defaultK1Dir;

const checks = [
  {
    id: "ffmpeg",
    label: "FFmpeg",
    resolver: () => resolveExecutable("ffmpeg", [
      process.env.VIBECUT_FFMPEG_PATH,
      process.env.FFMPEG_PATH,
      resolveOptionalPackagePath("ffmpeg-static"),
      ...commonWindowsExecutablePaths("ffmpeg.exe"),
    ]),
  },
  {
    id: "ffprobe",
    label: "FFprobe",
    resolver: () => resolveExecutable("ffprobe", [
      process.env.VIBECUT_FFPROBE_PATH,
      process.env.FFPROBE_PATH,
      resolveOptionalPackagePath("ffprobe-static"),
      ...commonWindowsExecutablePaths("ffprobe.exe"),
    ]),
  },
  {
    id: "java",
    label: "Java 21+ for Firebase emulators",
    resolver: () => resolveJava21([
      process.env.VIBECUT_JAVA_HOME ? path.join(process.env.VIBECUT_JAVA_HOME, "bin", process.platform === "win32" ? "java.exe" : "java") : null,
      process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, "bin", process.platform === "win32" ? "java.exe" : "java") : null,
    ]),
  },
  {
    id: "k1-a",
    label: "K1/MVI_0126.MP4",
    resolver: () => assertK1Source(path.join(k1Dir, "MVI_0126.MP4")),
  },
  {
    id: "k1-b",
    label: "K1/MVI_0117.MP4",
    resolver: () => assertK1Source(path.join(k1Dir, "MVI_0117.MP4")),
  },
];

const results = [];
for (const check of checks) {
  try {
    const value = await check.resolver();
    results.push({ ...check, ok: true, value });
  } catch (error) {
    results.push({ ...check, ok: false, error: error.message });
  }
}

const summary = results.map(({ id, label, ok, value, error }) => ({
  id,
  label,
  ok,
  value: ok ? value : undefined,
  error: ok ? undefined : error,
}));

console.log(JSON.stringify({ k1Dir, checks: summary }, null, 2));

if (results.some((result) => !result.ok)) {
  console.error("check-vibecut-export-local-prereqs: missing prerequisites");
  process.exit(1);
}

console.log("check-vibecut-export-local-prereqs: ok");

async function assertK1Source(filePath) {
  await access(filePath);
  const fileStat = await stat(filePath);
  if (fileStat.size <= 5 * 1024 * 1024) {
    throw new Error(`${filePath} is too small for a real K1 smoke source`);
  }
  return `${filePath} (${fileStat.size} bytes)`;
}

async function resolveExecutable(commandName, candidates = []) {
  const cleanCandidates = candidates.filter(Boolean).map((candidate) => String(candidate).trim()).filter(Boolean);
  for (const candidate of [commandName, ...cleanCandidates]) {
    try {
      if (candidate !== commandName) {
        await access(candidate);
      }
      await runCommand(candidate, ["-version"]);
      return candidate;
    } catch {
      // Try the next explicit/common path.
    }
  }
  throw new Error(`Missing ${commandName}. Add it to PATH or configure an explicit env path.`);
}

async function resolveJava21(candidates = []) {
  const cleanCandidates = candidates.filter(Boolean).map((candidate) => String(candidate).trim()).filter(Boolean);
  for (const candidate of ["java", ...cleanCandidates]) {
    try {
      if (candidate !== "java") {
        await access(candidate);
      }
      const output = await runCommandCapture(candidate, ["-version"]);
      const major = parseJavaMajor(output);
      if (major && major >= 21) return `${candidate} (${major})`;
    } catch {
      // Try next candidate.
    }
  }
  throw new Error("Missing Java 21+. Add it to PATH or configure VIBECUT_JAVA_HOME/JAVA_HOME.");
}

function parseJavaMajor(output = "") {
  const match = String(output).match(/version "(\d+)(?:\.(\d+))?/);
  if (!match) return null;
  const first = Number(match[1]);
  const second = Number(match[2] || 0);
  return first === 1 ? second : first;
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

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${chunk.toString("utf8")}`.slice(-2000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with ${code}: ${stderr}`));
    });
  });
}

function runCommandCapture(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout = `${stdout}${chunk.toString("utf8")}`.slice(-4000);
    });
    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${chunk.toString("utf8")}`.slice(-4000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(`${stdout}\n${stderr}`);
        return;
      }
      reject(new Error(`${command} exited with ${code}: ${stderr || stdout}`));
    });
  });
}
