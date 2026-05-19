import { spawnSync } from "node:child_process";

const mode = process.argv[2];
const projectId = String(process.env.FIREBASE_PROJECT_ID || "").trim();
const onlyByMode = {
  backend: "firestore,storage,functions",
  functions: "functions",
};

if (!onlyByMode[mode]) {
  console.error("Usage: node scripts/firebase-deploy.mjs <backend|functions>");
  process.exit(1);
}

const readiness = spawnSync(process.execPath, ["scripts/check-deploy-target.mjs"], {
  stdio: "inherit",
  shell: false,
});
if (readiness.status !== 0) {
  process.exit(readiness.status || 1);
}

const firebaseBin = process.platform === "win32" ? "firebase.cmd" : "firebase";
const result = spawnSync(firebaseBin, [
  "deploy",
  "--project",
  projectId,
  "--only",
  onlyByMode[mode],
], {
  stdio: "inherit",
  shell: false,
});

process.exit(result.status || 0);
