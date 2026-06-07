import { spawnSync } from "node:child_process";
import path from "node:path";

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

const firebaseBin = path.join(process.cwd(), "node_modules", "firebase-tools", "lib", "bin", "firebase.js");
const result = spawnSync(process.execPath, [
  firebaseBin,
  "deploy",
  "--project",
  projectId,
  "--only",
  onlyByMode[mode],
], {
  stdio: "inherit",
  env: {
    ...process.env,
    FUNCTIONS_DISCOVERY_TIMEOUT: process.env.FUNCTIONS_DISCOVERY_TIMEOUT || "60",
  },
  shell: false,
});

process.exit(result.status || 0);
