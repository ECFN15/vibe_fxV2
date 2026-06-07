import { access, readdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const javaExecutableName = process.platform === "win32" ? "java.exe" : "java";
const firebaseBin = path.join(process.cwd(), "node_modules", "firebase-tools", "lib", "bin", "firebase.js");

const javaPath = await resolveJava();
if (!javaPath) {
  console.error("run-firebase-emulators-test: Java 21+ missing");
  console.error("- Set VIBECUT_JAVA_HOME or JAVA_HOME to a JDK/JRE 21+ directory, or add java 21+ to PATH.");
  console.error("- firebase-tools no longer supports Java versions before 21.");
  process.exit(1);
}

const javaBinDir = path.dirname(javaPath);
const env = {
  ...process.env,
  PATH: `${javaBinDir}${path.delimiter}${process.env.PATH || ""}`,
};

await run(process.execPath, [
  firebaseBin,
  "emulators:exec",
  "--project",
  "demo-vibefx",
  "--only",
  "auth,firestore,storage",
  "node --no-warnings scripts/smoke-firebase-emulators.mjs",
], { env });

async function resolveJava() {
  const candidates = [
    process.env.VIBECUT_JAVA_HOME ? path.join(process.env.VIBECUT_JAVA_HOME, "bin", javaExecutableName) : null,
    process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, "bin", javaExecutableName) : null,
    "java",
    ...(await commonWindowsJavaPaths()),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (candidate !== "java") {
        await access(candidate);
      }
      const versionOutput = await runCapture(candidate, ["-version"]);
      const major = parseJavaMajor(versionOutput);
      if (!major || major < 21) continue;
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

function parseJavaMajor(output = "") {
  const match = String(output).match(/version "(\d+)(?:\.(\d+))?/);
  if (!match) return null;
  const first = Number(match[1]);
  const second = Number(match[2] || 0);
  if (first === 1) return second;
  return first;
}

async function commonWindowsJavaPaths() {
  if (process.platform !== "win32") return [];
  const roots = [
    process.env.ProgramFiles ? path.join(process.env.ProgramFiles, "Eclipse Adoptium") : null,
    process.env.ProgramFiles ? path.join(process.env.ProgramFiles, "Java") : null,
    process.env["ProgramFiles(x86)"] ? path.join(process.env["ProgramFiles(x86)"], "Java") : null,
  ].filter(Boolean);
  const candidates = [];
  for (const root of roots) {
    try {
      const entries = await readdir(root, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        candidates.push(path.join(root, entry.name, "bin", javaExecutableName));
      }
    } catch {
      // Root does not exist on this machine.
    }
  }
  return candidates;
}

function run(command, args, { env = process.env, quiet = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      shell: false,
      stdio: quiet ? ["ignore", "ignore", "pipe"] : "inherit",
      windowsHide: true,
    });
    let stderr = "";
    if (quiet) {
      child.stderr.on("data", (chunk) => {
        stderr = `${stderr}${chunk.toString("utf8")}`.slice(-2000);
      });
    }
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with ${code}${stderr ? `: ${stderr}` : ""}`));
    });
  });
}

function runCapture(command, args, { env = process.env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
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
