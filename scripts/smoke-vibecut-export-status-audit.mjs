import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const statusPath = path.join(process.cwd(), "docs", "vibecut-export-hardening-status-2026-06-06.md");
const source = await readFile(statusPath, "utf8");

assert.match(source, /pre-release hardening/, "status audit must avoid declaring release complete");
assert.match(source, /pas `Go release beta`/, "status audit must explicitly reject Go release beta");
assert.match(source, /Phase 1[\s\S]*Done/, "status audit must cover Phase 1 as done");
assert.match(source, /Phase 5[\s\S]*Partial/, "status audit must mark renderer-first as partial");
assert.match(source, /Phase 6[\s\S]*Done MVP code \/ Partial live/, "status audit must mark renderer security code as done MVP with live IAM remaining");
assert.match(source, /Phase 7[\s\S]*Done MVP/, "status audit must mark async orchestration as done MVP once taskQueue mode exists");
assert.match(source, /Phase 9[\s\S]*Partial live/, "status audit must mark live K1 smoke as partially proven through direct Cloud Run");
assert.match(source, /OK pour smoke live Cloud Run K1/, "status audit must require explicit live smoke confirmation");
assert.match(source, /npm run test:emulators[\s\S]*Java/, "status audit must document the emulator Java blocker");
assert.match(source, /Could not spawn java -version/, "status audit must document the exact emulator Java error");
assert.match(source, /advanced text animation[\s\S]*neon-scan/, "status audit must document the advanced text animation blocker");
assert.match(source, /EXPORT_RENDER_ORCHESTRATION=taskQueue[\s\S]*processVideoExportJob/, "status audit must document the task queue orchestration mode");
assert.match(source, /renderer frame-by-frame/, "status audit must document the missing frame renderer");
assert.match(source, /HMAC timestamp anti-replay/, "status audit must document renderer HMAC hardening");
assert.match(source, /EXPORT_RENDERER_AUTH_MODE=hmac[\s\S]*hmac\+oidc[\s\S]*oidc/, "status audit must document renderer auth mode options");
assert.match(source, /EXPORT_RENDERER_VERIFY_MODE=hmac[\s\S]*platform-iam[\s\S]*EXPORT_RENDERER_PRIVATE_IAM_CONFIRMED=true/, "status audit must document renderer verification mode guard");
assert.match(source, /npm run test:vibecut-pro-fixtures-local-mp4` : OK[\s\S]*static-text[\s\S]*combined-supported[\s\S]*region texte lumineuse/, "status audit must document successful local pro fixture MP4 outputs");
assert.match(source, /npm run test:vibecut-renderer-local-contract` : OK[\s\S]*buildFfmpegArgs[\s\S]*k1-renderer-contract\.mp4[\s\S]*combined-renderer-contract\.mp4/, "status audit must document successful canonical local renderer outputs");
assert.match(source, /npm run test:vibecut-export-local-mp4` : OK[\s\S]*renderer canonique local[\s\S]*Cloud live/, "status audit must document the aggregate local MP4 gate");
assert.match(source, /npm run verify:vibecut-k1-cloud-output[\s\S]*VIBECUT_CLOUD_OUTPUT_FILE[\s\S]*H\.264[\s\S]*1080x1920[\s\S]*AAC[\s\S]*frames non noires/, "status audit must document the post-smoke Cloud output verifier");
assert.match(source, /smoke-vibecut-export-media-metadata\.mjs[\s\S]*MP4[\s\S]*WebM[\s\S]*MOV[\s\S]*PNG[\s\S]*H\.265\/HEVC[\s\S]*ProRes[\s\S]*DNxHR/, "status audit must document the front media metadata codec matrix");
assert.match(source, /smoke-vibecut-export-coverage-parity\.mjs[\s\S]*client\/Functions\/renderer[\s\S]*basic-text-fade[\s\S]*advanced-text-animation[\s\S]*slow-motion/, "status audit must document client/functions/renderer coverage parity");
assert.match(source, /smoke:vibecut-k1-cloud-run-direct[\s\S]*Cloud Run[\s\S]*verify:vibecut-k1-cloud-output[\s\S]*OK/, "status audit must document the successful direct Cloud Run K1 output");
assert.match(source, /Smoke callable Firebase K1[\s\S]*VIBECUT_FIREBASE_ID_TOKEN[\s\S]*ADMIN_ONLY_OPERATION/, "status audit must document the callable live auth blocker");
assert.match(source, /MP4 finaux des fixtures pro supportees[\s\S]*non generes/, "status audit must document that pro fixture Cloud Run outputs are not final evidence yet");
assert.match(source, /Deploy Cloud Run renderer[\s\S]*vibecut-render-service-00004-mz5[\s\S]*Deploy Functions\/App Hosting[\s\S]*non execute/, "status audit must document Cloud Run deploy and remaining Functions/App Hosting deploy gap");
assert.match(source, /npm run test:vibecut-k1-local-mp4` : OK[\s\S]*1080x1920[\s\S]*H\.264[\s\S]*5\.5s[\s\S]*audio present/, "status audit must document the successful local K1 MP4 smoke");
assert.match(source, /npm run check:vibecut-export-prereqs[\s\S]*VIBECUT_FFMPEG_PATH[\s\S]*VIBECUT_FFPROBE_PATH[\s\S]*VIBECUT_JAVA_HOME[\s\S]*JAVA_HOME/, "status audit must document explicit prereq env paths");
assert.match(source, /npm run test:emulators[\s\S]*run-firebase-emulators-test\.mjs[\s\S]*Java 21\+[\s\S]*VIBECUT_JAVA_HOME[\s\S]*JAVA_HOME/, "status audit must document the Java 21-aware emulator wrapper");

console.log("smoke-vibecut-export-status-audit: ok");
