/**
 * provision-admin-doc.mjs
 * Creates or updates the admins/{email} Firestore document for a dev account
 * so assertExportAdmin() grants access via the Firestore path (2nd auth layer).
 *
 * Usage:
 *   node scripts/provision-admin-doc.mjs matthis.fradin2@gmail.com
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS or runs with Application Default Credentials.
 */

import { initializeApp, cert, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const email = process.argv[2]?.trim()?.toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Usage: node scripts/provision-admin-doc.mjs <email>");
  process.exit(1);
}

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");

// Try service account key first (local dev)
const serviceAccountPaths = [
  join(root, "service-account.json"),
  join(root, "firebase-service-account.json"),
  process.env.GOOGLE_APPLICATION_CREDENTIALS,
].filter(Boolean);

let app;
try {
  const keyPath = serviceAccountPaths.find((p) => p && existsSync(p));
  if (keyPath) {
    const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
    app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
    console.log(`Using service account: ${keyPath}`);
  } else {
    // Fall back to Application Default Credentials
    const { applicationDefault } = await import("firebase-admin/app");
    app = initializeApp({ credential: applicationDefault(), projectId: "vibefx-v2" });
    console.log("Using Application Default Credentials");
  }
} catch {
  try {
    app = getApp();
  } catch {
    console.error("Cannot initialize Firebase Admin. Provide GOOGLE_APPLICATION_CREDENTIALS or a service-account.json at project root.");
    process.exit(1);
  }
}

const db = getFirestore(app);

const docRef = db.collection("admins").doc(email);
await docRef.set({
  status: "active",
  email,
  grantedAt: new Date().toISOString(),
  grantedBy: "provision-admin-doc.mjs",
  note: "Dev admin access for VibeCut telemetry backoffice",
}, { merge: true });

const snap = await docRef.get();
console.log(`admins/${email} ->`, snap.data());
console.log("Done.");
