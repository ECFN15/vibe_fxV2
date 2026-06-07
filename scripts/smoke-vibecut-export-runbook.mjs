import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const runbookPath = path.join(process.cwd(), "docs", "vibecut-export-production-runbook-2026-06-06.md");
const source = await readFile(runbookPath, "utf8");

assert.match(source, /NEXT_PUBLIC_VIBECUT_EXPORT_MODE=firebase/, "runbook must document firebase export mode");
assert.match(source, /EXPORT_RENDERER_URL/, "runbook must document the renderer URL");
assert.match(source, /EXPORT_RENDER_ORCHESTRATION=sync/, "runbook must document the default sync orchestration mode");
assert.match(source, /EXPORT_RENDER_ORCHESTRATION=taskQueue/, "runbook must document the task queue orchestration mode");
assert.match(source, /processVideoExportJob/, "runbook must document the task queue worker function");
assert.match(source, /firebase functions:secrets:set EXPORT_SIGNING_SECRET/, "runbook must keep signing secret in Secret Manager");
assert.match(source, /EXPORT_RENDERER_AUTH_MODE=oidc/, "runbook must document OIDC renderer auth mode");
assert.match(source, /roles\/run\.invoker/, "runbook must document Cloud Run invoker IAM");
assert.match(source, /gcloud run deploy vibecut-render-service/, "runbook must document Cloud Run deploy command");
assert.match(source, /npm run test:vibecut-export/, "runbook must document export smoke gate");
assert.match(source, /npm run prepare:vibecut-k1-smoke/, "runbook must document the dry-run K1 smoke");
assert.match(source, /npm run guard:vibecut-k1-live/, "runbook must document the guarded live K1 preflight");
assert.match(source, /VIBECUT_LIVE_CONFIRM=OK pour smoke live Cloud Run K1/, "runbook must document the exact live guard confirmation env");
assert.match(source, /VIBECUT_EXECUTE_LIVE=1[\s\S]*refuse/, "runbook must document that the live guard refuses direct execution");
assert.match(source, /npm run prepare:vibecut-pro-fixtures/, "runbook must document pro fixture dry-runs");
assert.match(source, /npm run verify:vibecut-k1-cloud-output/, "runbook must document the post-smoke Cloud output verifier");
assert.match(source, /VIBECUT_CLOUD_OUTPUT_FILE/, "runbook must document the downloaded Cloud output file env");
assert.match(source, /H\.264[\s\S]*AAC[\s\S]*1080x1920[\s\S]*30 FPS[\s\S]*5\.5s/, "runbook must document the expected K1 Cloud output media contract");
assert.match(source, /advanced-text-animation/, "runbook must document the advanced text animation fixture");
assert.match(source, /neon-scan.*pas encore rendu serveur/, "runbook must document the current advanced animation blocker");
assert.match(source, /OK pour smoke live Cloud Run K1/, "runbook must require explicit confirmation before live smoke");
assert.match(source, /Ne pas executer ces commandes sans confirmation explicite/, "runbook must guard cloud-mutating commands");
assert.match(source, /Tourner `EXPORT_SIGNING_SECRET`/, "runbook must document signing secret rotation");

console.log("smoke-vibecut-export-runbook: ok");
