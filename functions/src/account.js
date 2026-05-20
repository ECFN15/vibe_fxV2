"use strict";

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { shouldEnforceAppCheck } = require("./appCheck");

const REGION = "europe-west9";
const ENFORCE_ACCOUNT_APP_CHECK = shouldEnforceAppCheck("ENFORCE_ACCOUNT_APP_CHECK");
const DELETE_BATCH_LIMIT = 100;
const RECENT_AUTH_MAX_AGE_MS = 10 * 60 * 1000;

function assertAuthenticated(request) {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Connexion utilisateur requise.");
  }
  assertRecentAuthentication(request.auth?.token);
  return {
    uid,
    email: String(request.auth?.token?.email || "").trim().toLowerCase(),
  };
}

function authTimeMillis(token) {
  const seconds = Number(token?.auth_time || 0);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null;
}

function assertRecentAuthentication(token, nowMs = Date.now()) {
  const authMs = authTimeMillis(token);
  if (!authMs || nowMs - authMs > RECENT_AUTH_MAX_AGE_MS || authMs - nowMs > 60 * 1000) {
    throw new HttpsError("failed-precondition", "Reconnecte-toi avant de supprimer le compte.");
  }
  return true;
}

function deletedUserPatch(now) {
  return {
    email: null,
    displayName: "Deleted account",
    photoURL: "",
    providers: [],
    isAnonymous: false,
    deletionStatus: "completed",
    deletionRequestedAt: now,
    deletedAt: now,
    updatedAt: now,
  };
}

async function deleteQueryBatch(db, query, limit = DELETE_BATCH_LIMIT) {
  let deleted = 0;
  for (;;) {
    const snapshot = await query.limit(limit).get();
    if (snapshot.empty) break;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += snapshot.size;
    if (snapshot.size < limit) break;
  }
  return deleted;
}

async function scrubQueryBatch(db, query, data, limit = DELETE_BATCH_LIMIT) {
  let scrubbed = 0;
  for (;;) {
    const snapshot = await query.limit(limit).get();
    if (snapshot.empty) break;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.set(doc.ref, data, { merge: true }));
    await batch.commit();
    scrubbed += snapshot.size;
    if (snapshot.size < limit) break;
  }
  return scrubbed;
}

async function purgeUserStorage(uid, bucket = admin.storage().bucket()) {
  const prefix = `users/${uid}/`;
  const [files = []] = await bucket.getFiles({ prefix });
  await bucket.deleteFiles({ prefix, force: true });
  return {
    prefix,
    deletedFiles: Array.isArray(files) ? files.length : 0,
  };
}

async function deleteAccountData({ uid, email, db = admin.firestore(), bucket, auth = admin.auth() }) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const deletionRef = db.collection("accountDeletionRequests").doc(uid);
  const userRef = db.collection("users").doc(uid);
  const storageResult = await purgeUserStorage(uid, bucket);

  const [deletedPublications, scrubbedAiJobs, scrubbedCheckouts] = await Promise.all([
    deleteQueryBatch(db, db.collection("publications").where("ownerUid", "==", uid)),
    scrubQueryBatch(db, db.collection("aiJobs").where("uid", "==", uid), {
      promptOriginal: null,
      promptCleaned: null,
      output: null,
      deletionScrubbedAt: now,
      updatedAt: now,
    }),
    scrubQueryBatch(db, db.collection("checkoutSessions").where("uid", "==", uid), {
      email: null,
      deletionScrubbedAt: now,
      updatedAt: now,
    }),
  ]);

  await db.runTransaction(async (tx) => {
    tx.set(userRef, deletedUserPatch(now), { merge: true });
    tx.set(deletionRef, {
      uid,
      requestHadEmail: Boolean(email),
      status: "completed",
      storagePrefix: storageResult.prefix,
      storageDeletedFiles: storageResult.deletedFiles,
      deletedPublications,
      scrubbedAiJobs,
      scrubbedCheckouts,
      requestedAt: now,
      completedAt: now,
      actor: "user",
    }, { merge: true });
  });

  await auth.deleteUser(uid);

  return {
    status: "deleted",
    deletedPublications,
    scrubbedAiJobs,
    scrubbedCheckouts,
    storageDeletedFiles: storageResult.deletedFiles,
  };
}

const requestAccountDeletion = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_ACCOUNT_APP_CHECK,
  },
  async (request) => {
    const { uid, email } = assertAuthenticated(request);
    try {
      return await deleteAccountData({ uid, email });
    } catch (error) {
      logger.error("Account deletion failed", {
        uid,
        code: error.code || null,
        message: error.message || null,
      });
      throw new HttpsError("internal", "Suppression du compte impossible pour le moment.");
    }
  }
);

module.exports = {
  requestAccountDeletion,
  deleteAccountData,
  assertRecentAuthentication,
  authTimeMillis,
  deletedUserPatch,
  deleteQueryBatch,
  scrubQueryBatch,
  purgeUserStorage,
  RECENT_AUTH_MAX_AGE_MS,
};
