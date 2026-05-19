import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

function run(command, args) {
  if (process.platform === "win32" && command === "firebase") {
    return run("powershell", ["-NoProfile", "-Command", `firebase ${args.join(" ")}`]);
  }
  const executable = command;
  const result = spawnSync(executable, args, { encoding: "utf8" });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.error || result.status !== 0) {
    failures.push(`${command} ${args.join(" ")} failed${output.trim() ? `: ${output.trim()}` : ""}`);
  }
  return output;
}

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

const firebaseVersion = run("firebase", ["--version"]).trim();
if (firebaseVersion) console.log(`firebase-tools: ${firebaseVersion}`);

const javaOutput = run("java", ["-version"]);
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

console.log("Firebase emulator readiness OK");
