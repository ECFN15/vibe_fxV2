import { access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const REQUIRED_CONFIRMATION = "OK pour smoke live Cloud Run K1";
const defaultK1Dir = "C:\\Users\\pcpor\\OneDrive\\Bureau\\K1";
const k1Dir = process.env.VIBECUT_K1_DIR || defaultK1Dir;

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function runCheck(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: "pipe",
  });
  return {
    ok: result.status === 0,
    status: result.status,
    output: `${result.stdout || ""}${result.stderr || ""}`.trim(),
  };
}

const blockers = [];
const warnings = [];
const hasConfirmation = process.env.VIBECUT_LIVE_CONFIRM === REQUIRED_CONFIRMATION;

if (!hasConfirmation) {
  blockers.push(`VIBECUT_LIVE_CONFIRM doit valoir exactement "${REQUIRED_CONFIRMATION}".`);
}

if (process.env.VIBECUT_EXECUTE_LIVE === "1") {
  blockers.push("Ce garde-fou ne lance pas le smoke live. VIBECUT_EXECUTE_LIVE=1 est refuse ici.");
}

const k1Files = ["MVI_0126.MP4", "MVI_0117.MP4"].map((name) => path.join(k1Dir, name));
for (const filePath of k1Files) {
  if (!(await exists(filePath))) {
    blockers.push(`Source K1 manquante: ${filePath}`);
  }
}

const requiredEnv = [
  "FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION",
  "NEXT_PUBLIC_VIBECUT_EXPORT_MODE",
  "EXPORT_RENDERER_URL",
];

for (const envName of requiredEnv) {
  if (!process.env[envName]) {
    blockers.push(`Variable live manquante: ${envName}`);
  }
}

if (process.env.NEXT_PUBLIC_VIBECUT_EXPORT_MODE && process.env.NEXT_PUBLIC_VIBECUT_EXPORT_MODE !== "firebase") {
  blockers.push("NEXT_PUBLIC_VIBECUT_EXPORT_MODE doit valoir firebase pour le smoke live.");
}

const shouldRunHeavyChecks = hasConfirmation && blockers.length === 0;

const localGate = shouldRunHeavyChecks
  ? runCheck("npm", ["run", "test:vibecut-export-local-mp4"])
  : { ok: false, status: null, output: "skipped until guard preconditions are clear" };
if (shouldRunHeavyChecks && !localGate.ok) {
  blockers.push("Le gate MP4 local lourd doit passer avant tout smoke live: npm run test:vibecut-export-local-mp4.");
}

const emulatorGate = shouldRunHeavyChecks
  ? runCheck("npm", ["run", "test:emulators"])
  : { ok: false, status: null, output: "skipped until guard preconditions are clear" };
if (shouldRunHeavyChecks && !emulatorGate.ok) {
  blockers.push("Le gate emulateurs doit passer avant Go release beta: npm run test:emulators.");
  warnings.push("Si seul Java 21+ manque, configurer VIBECUT_JAVA_HOME, JAVA_HOME ou PATH avant de relancer.");
}

const report = {
  liveSmokeGuard: "vibecut-k1",
  mutatesCloud: false,
  confirmationRequired: REQUIRED_CONFIRMATION,
  k1Dir,
  sources: k1Files,
  checks: {
    confirmation: hasConfirmation,
    localMp4Gate: localGate.ok,
    emulators: emulatorGate.ok,
    liveEnv: requiredEnv.every((envName) => Boolean(process.env[envName])),
    heavyChecksRan: shouldRunHeavyChecks,
  },
  warnings,
  blockers,
  nextStepWhenClear:
    "Demander/obtenir une confirmation humaine, puis lancer un unique smoke live via le runbook. Ne pas automatiser plusieurs jobs.",
};

console.log(JSON.stringify(report, null, 2));

if (blockers.length > 0) {
  console.error("guard-vibecut-k1-live-smoke: BLOCKED");
  process.exit(1);
}

console.log("guard-vibecut-k1-live-smoke: ready-for-human-live-step");
