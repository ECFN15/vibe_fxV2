import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

function run(command, args, options = {}) {
  const executable = command;
  const result = spawnSync(executable, args, { encoding: "utf8", env: options.env || process.env });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (!options.allowFailure && (result.error || result.status !== 0)) {
    failures.push(`${command} ${args.join(" ")} failed${output.trim() ? `: ${output.trim()}` : ""}`);
  }
  return output;
}

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

const firebaseBin = join(root, "node_modules", "firebase-tools", "lib", "bin", "firebase.js");
const firebaseVersion = run(process.execPath, [firebaseBin, "--version"]).trim();
if (firebaseVersion) console.log(`firebase-tools: ${firebaseVersion}`);

const javaPath = resolveJava();
const javaEnv = javaPath && javaPath !== "java"
  ? { ...process.env, PATH: `${join(javaPath, "..")}${process.platform === "win32" ? ";" : ":"}${process.env.PATH || ""}` }
  : process.env;
const javaOutput = javaPath ? run(javaPath, ["-version"], { env: javaEnv }) : "";
const javaVersionMatch = javaOutput.match(/version "(\d+)/);
const javaMajor = javaVersionMatch ? Number(javaVersionMatch[1]) : null;
if (javaMajor) console.log(`java major: ${javaMajor}`);
if (!javaMajor || javaMajor < 21) {
  failures.push("Firebase emulators require Java 21 or newer with firebase-tools 15+.");
}

if (!existsSync(join(root, "firebase.json"))) {
  failures.push("firebase.json is missing.");
} else {
  const config = readJson("firebase.json");
  for (const emulator of ["auth", "firestore", "functions", "storage"]) {
    if (!config.emulators?.[emulator]?.port) {
      failures.push(`firebase.json missing emulators.${emulator}.port`);
    }
  }
}

if (failures.length) {
  console.log("\nFirebase emulator readiness failed:");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

function resolveJava() {
  const javaExecutableName = process.platform === "win32" ? "java.exe" : "java";
  const candidates = [
    process.env.VIBECUT_JAVA_HOME ? join(process.env.VIBECUT_JAVA_HOME, "bin", javaExecutableName) : null,
    process.env.JAVA_HOME ? join(process.env.JAVA_HOME, "bin", javaExecutableName) : null,
    "java",
    ...commonWindowsJavaPaths(javaExecutableName),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate !== "java" && !existsSync(candidate)) continue;
    const output = run(candidate, ["-version"], { allowFailure: true });
    const match = output.match(/version "(\d+)/);
    const major = match ? Number(match[1]) : null;
    if (major && major >= 21) return candidate;
  }
  return null;
}

function commonWindowsJavaPaths(javaExecutableName) {
  if (process.platform !== "win32") return [];
  const roots = [
    process.env.ProgramFiles ? join(process.env.ProgramFiles, "Eclipse Adoptium") : null,
    process.env.ProgramFiles ? join(process.env.ProgramFiles, "Java") : null,
    process.env["ProgramFiles(x86)"] ? join(process.env["ProgramFiles(x86)"], "Java") : null,
  ].filter(Boolean);
  const candidates = [];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (entry.isDirectory()) candidates.push(join(root, entry.name, "bin", javaExecutableName));
    }
  }
  return candidates;
}

console.log("Firebase emulator readiness OK");
