/**
 * provision-admin-firestore-rest.mjs
 * Writes admins/{email} to Firestore using the Firebase REST API.
 * Reads the access token from firebase-tools cached credentials.
 * Usage: node scripts/provision-admin-firestore-rest.mjs <email>
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import os from "os";

const email = process.argv[2]?.trim()?.toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Usage: node scripts/provision-admin-firestore-rest.mjs <email>");
  process.exit(1);
}

const PROJECT_ID = "vibefx-v2";

// Try to get an access token via firebase-tools CLI internals
function getFirebaseAccessToken() {
  // firebase-tools stores tokens in platform-specific config dirs
  const candidates = [
    join(os.homedir(), ".config", "configstore", "firebase-tools.json"),
    join(os.homedir(), "AppData", "Roaming", "configstore", "firebase-tools.json"),
    join(os.homedir(), ".config", "firebase-tools.json"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        const cfg = JSON.parse(readFileSync(p, "utf8"));
        // tokens object: { [email]: { access_token, refresh_token, ... } }
        const tokens = cfg.tokens || cfg.token || {};
        // Also check top-level token
        const flat = cfg.tokens || {};
        for (const key of Object.keys(flat)) {
          const entry = flat[key];
          if (entry?.access_token) return entry.access_token;
        }
        if (cfg.token?.access_token) return cfg.token.access_token;
      } catch { /* ignore */ }
    }
  }
  return null;
}

// Fallback: use gcloud token
function getGcloudToken() {
  try {
    return execSync("gcloud auth print-access-token", { timeout: 8000 }).toString().trim();
  } catch {
    return null;
  }
}

const token = getFirebaseAccessToken() || getGcloudToken();
if (!token) {
  console.error("No access token found. Run: gcloud auth login  OR ensure firebase-tools is logged in.");
  process.exit(1);
}

const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/admins/${encodeURIComponent(email)}`;
const body = JSON.stringify({
  fields: {
    status:    { stringValue: "active" },
    email:     { stringValue: email },
    grantedAt: { stringValue: new Date().toISOString() },
    grantedBy: { stringValue: "provision-admin-firestore-rest.mjs" },
    note:      { stringValue: "Dev admin access for VibeCut telemetry backoffice" },
  },
});

const response = await fetch(url, {
  method: "PATCH",
  headers: {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body,
});

if (!response.ok) {
  const text = await response.text();
  console.error(`Firestore write failed ${response.status}: ${text}`);
  process.exit(1);
}

const result = await response.json();
console.log("Written:", result.name);
console.log("Fields:", Object.fromEntries(Object.entries(result.fields || {}).map(([k, v]) => [k, Object.values(v)[0]])));
console.log(`\nadmins/${email} created/updated as status=active.`);
