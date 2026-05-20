import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const envFiles = [".env.local", ".env"].filter((file) => existsSync(join(root, file)));

const requiredClientEnv = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION",
];

const requiredMetaSecrets = [
  "META_APP_ID",
  "META_APP_SECRET",
  "META_OAUTH_REDIRECT_URI",
  "META_TOKEN_ENCRYPTION_KEY",
];

function parseEnvFiles(files) {
  const values = {};
  for (const file of files) {
    const content = readFileSync(join(root, file), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...rest] = trimmed.split("=");
      values[key] = rest.join("=").trim();
    }
  }
  return values;
}

const values = parseEnvFiles(envFiles);
const missingClientEnv = requiredClientEnv.filter((key) => !values[key] && !process.env[key]);
const missingMetaSecrets = requiredMetaSecrets.filter((key) => !process.env[key]);
function appCheckFlagValue(key) {
  return process.env[key] || values[key] || "";
}

const useEmulators = values.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true" ||
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true" ||
  process.env.FUNCTIONS_EMULATOR === "true";
const appCheckFlags = [
  "ENFORCE_META_APP_CHECK",
  "ENFORCE_BILLING_APP_CHECK",
  "ENFORCE_AI_APP_CHECK",
  "ENFORCE_ACCOUNT_APP_CHECK",
];
const disabledAppCheckFlags = appCheckFlags.filter((key) => appCheckFlagValue(key).toLowerCase() === "false");
const appCheckEnforced = !useEmulators && disabledAppCheckFlags.length === 0;
const missingAppCheckSiteKey = appCheckEnforced &&
  !values.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY &&
  !process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;
const hasManualAdminPath =
  Boolean(values.ADMIN_EMAILS || process.env.ADMIN_EMAILS) ||
  process.env.MANUAL_ADMIN_CLAIM_READY === "true" ||
  process.env.MANUAL_ADMIN_DOC_READY === "true";

console.log("E2E Firebase/Meta readiness");
console.log(`env files: ${envFiles.length ? envFiles.join(", ") : "none"}`);

if (!missingClientEnv.length && !missingMetaSecrets.length && !missingAppCheckSiteKey && (useEmulators || !disabledAppCheckFlags.length)) {
  console.log("ready: public Firebase env and Meta secret env markers are present");
  console.log("\nManual checks still required:");
  console.log("- Firebase Auth has Anonymous Auth enabled, or another provider is wired before using the studio.");
  console.log("- Firestore, Storage and Functions are deployed for the same Firebase project.");
  console.log("- Meta app redirect URI and permissions match META_OAUTH_REDIRECT_URI.");
  console.log("- Firebase App Check is enabled for the web app and enforced on Meta, Billing, Account and AI callables.");
  console.log("- Manual Meta fallback has ADMIN_EMAILS, a custom admin claim, or an active admins/{email} document if it will be used.");
  process.exit(0);
}

if (missingClientEnv.length) {
  console.log("\nMissing public Firebase env:");
  for (const key of missingClientEnv) console.log(`- ${key}`);
}

if (missingMetaSecrets.length) {
  console.log("\nMissing Meta secret env markers:");
  for (const key of missingMetaSecrets) console.log(`- ${key}`);
  console.log("\nFor deployed Firebase Functions, verify these with Firebase Secret Manager rather than committing values locally.");
}

if (missingAppCheckSiteKey) {
  console.log("\nMissing App Check client env while callable App Check enforcement is active:");
  console.log("- NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY");
}

if (!useEmulators && disabledAppCheckFlags.length) {
  console.log("\nApp Check enforcement disabled outside emulators:");
  for (const key of disabledAppCheckFlags) console.log(`- ${key}=false`);
}

console.log("\nManual Firebase/Auth checks:");
console.log("- Enable Anonymous Auth in Firebase Auth, or wire another provider before using the studio.");
console.log("- Deploy Firestore rules, Storage rules and Functions for the configured project.");
console.log("- Enable Firebase App Check for the web app before payment, AI or OAuth publication.");
if (!hasManualAdminPath) {
  console.log("- Optional manual Meta fallback needs ADMIN_EMAILS, a custom admin claim, or an active admins/{email} document.");
}

console.log("\nE2E is not ready. Configure Firebase/Auth/Storage/Functions and Meta OAuth before running the real publication flow.");
process.exit(1);
