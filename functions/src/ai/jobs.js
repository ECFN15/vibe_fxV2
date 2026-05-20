"use strict";

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { loadPricingPolicy, publicAiPolicyCatalog } = require("./policies");
const { routeModel, publicProviderRegistry } = require("./router");
const { runMockProvider } = require("./mockProvider");
const { shouldEnforceAppCheck } = require("../appCheck");
const {
  requireClientRequestId,
  requireFeature,
  cleanPrompt,
  sha256,
  aiJobId,
  normalizeIpHash,
  rateLimitDocId,
} = require("./jobUtils");

const REGION = "europe-west9";
const ENFORCE_AI_APP_CHECK = shouldEnforceAppCheck("ENFORCE_AI_APP_CHECK");
const DEFAULT_RATE_LIMIT_PER_MINUTE = 6;

function assertAuthenticated(request) {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Connexion utilisateur requise.");
  }
  return uid;
}

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" && process.env.FUNCTIONS_EMULATOR !== "true";
}

function toHttpsError(error) {
  const message = error?.message || String(error);
  if (message === "policy_missing") return new HttpsError("failed-precondition", "Pricing policy IA absente.");
  if (message === "policy_disabled") return new HttpsError("failed-precondition", "Feature IA desactivee.");
  if (message === "margin_below_threshold") {
    return new HttpsError("failed-precondition", "Pricing policy IA sous le seuil de marge.");
  }
  if (message === "prompt_too_long") return new HttpsError("invalid-argument", "Prompt trop long pour cette feature IA.");
  if (message === "prompt_empty") return new HttpsError("invalid-argument", "Prompt requis.");
  if (message.endsWith("_invalid")) return new HttpsError("invalid-argument", "Parametre IA invalide.");
  if (message === "provider_not_allowed_in_production") {
    return new HttpsError("failed-precondition", "Provider IA non autorise en production.");
  }
  return new HttpsError("failed-precondition", "Gateway IA indisponible.");
}

function classifyAiSecurityEvent(error) {
  const code = error?.code || "";
  const message = error?.message || "";
  if (code === "unauthenticated") return "ai_job_unauthenticated";
  if (code === "invalid-argument") return "ai_job_invalid_request";
  if (code === "resource-exhausted" && /Credits IA insuffisants/i.test(message)) {
    return "ai_job_insufficient_credits";
  }
  if (code === "resource-exhausted" && /Trop de jobs IA/i.test(message)) {
    return "ai_job_rate_limited";
  }
  if (code === "failed-precondition" && /(Pricing policy|Feature IA|Provider IA)/i.test(message)) {
    return "ai_job_policy_rejected";
  }
  return null;
}

function requestIpHash(request) {
  const headers = request.rawRequest?.headers || {};
  const forwardedFor = String(headers["x-forwarded-for"] || headers["X-Forwarded-For"] || "")
    .split(",")[0]
    .trim();
  const rawIp = request.rawRequest?.ip ||
    forwardedFor ||
    request.rawRequest?.socket?.remoteAddress ||
    "unknown";
  return normalizeIpHash(rawIp);
}

function buildAiSecurityEventData({ uid, feature, jobId, clientRequestId, ipHash, error, hasAppCheck }) {
  const type = classifyAiSecurityEvent(error);
  if (!type) return null;
  return {
    type,
    uid: uid || null,
    feature: feature || null,
    jobId: jobId || null,
    errorCode: error?.code || "unknown",
    errorMessage: error?.message || "unknown",
    clientRequestHash: clientRequestId ? sha256(clientRequestId) : null,
    ipHash: ipHash ? normalizeIpHash(ipHash) : null,
    hasAppCheck: hasAppCheck === true,
    actor: "ai_gateway",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

async function recordAiSecurityEvent(db, payload) {
  const eventData = buildAiSecurityEventData(payload);
  if (!eventData) return null;
  const eventRef = db.collection("securityEvents").doc();
  await eventRef.set(eventData);
  return eventRef.id;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function buildAiRouteAudit(policy, route) {
  return {
    candidateId: route.routeCandidateId || null,
    provider: route.provider,
    model: route.model,
    modality: route.modality,
    quality: route.quality,
    providerStatus: route.status,
    providerAccess: route.access,
    providerRegion: route.region,
    legalRisk: route.legalRisk,
    productionAllowed: route.productionAllowed === true,
    routeScore: numberOrNull(route.routeScore),
    routeScores: route.routeScores || null,
    rejectedCandidates: Array.isArray(route.rejectedCandidates)
      ? route.rejectedCandidates.slice(0, 10).map((candidate) => ({
        candidateId: String(candidate.candidateId || "unknown").slice(0, 96),
        provider: candidate.provider ? String(candidate.provider).slice(0, 96) : null,
        reason: String(candidate.reason || "provider_rejected").slice(0, 120),
      }))
      : [],
    pricing: {
      creditsCharged: policy.creditsCharged,
      creditUnitValueUsd: numberOrNull(policy.creditUnitValueUsd),
      estimatedProviderCostUsd: numberOrNull(policy.estimatedProviderCostUsd),
      estimatedInternalCostUsd: numberOrNull(policy.estimatedInternalCostUsd),
      estimatedClientPriceUsd: numberOrNull(policy.estimatedClientPriceUsd),
      estimatedGrossMargin: numberOrNull(policy.estimatedGrossMargin),
      targetGrossMargin: numberOrNull(policy.targetGrossMargin),
      minCreditsForTargetMargin: numberOrNull(policy.minCreditsForTargetMargin),
    },
  };
}

async function reserveCreditsForJob({ db, uid, jobId, feature, clientRequestId, prompt, policy, route, ipHash }) {
  const userRef = db.collection("users").doc(uid);
  const jobRef = db.collection("aiJobs").doc(jobId);
  const reserveLedgerRef = userRef.collection("creditLedger").doc(`reserve_${jobId}`);
  const requestHash = normalizeIpHash(ipHash);
  const rateLimitRef = db.collection("aiRateLimits").doc(rateLimitDocId(uid, feature, new Date(), requestHash));
  const credits = policy.creditsCharged;
  let result = null;

  await db.runTransaction(async (tx) => {
    const [userSnapshot, jobSnapshot, rateLimitSnapshot] = await Promise.all([
      tx.get(userRef),
      tx.get(jobRef),
      tx.get(rateLimitRef),
    ]);

    if (jobSnapshot.exists) {
      result = { duplicate: true, job: { id: jobSnapshot.id, ...jobSnapshot.data() } };
      return;
    }

    const rateData = rateLimitSnapshot.exists ? rateLimitSnapshot.data() : {};
    const currentCount = Number(rateData.count || 0);
    if (currentCount >= DEFAULT_RATE_LIMIT_PER_MINUTE) {
      throw new HttpsError("resource-exhausted", "Trop de jobs IA sur cette minute.");
    }

    const userData = userSnapshot.exists ? userSnapshot.data() : {};
    const balance = Number(userData.creditBalance || 0);
    const reserved = Number(userData.reservedCreditBalance || 0);
    if (balance < credits) {
      throw new HttpsError("resource-exhausted", "Credits IA insuffisants.");
    }

    const nextBalance = balance - credits;
    const nextReserved = reserved + credits;
    const now = admin.firestore.FieldValue.serverTimestamp();
    tx.set(rateLimitRef, {
      uid,
      feature,
      ipHash: requestHash,
      count: currentCount + 1,
      updatedAt: now,
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 2 * 60 * 1000),
    }, { merge: true });
    tx.set(jobRef, {
      uid,
      feature,
      status: "reserved",
      estimatedCredits: credits,
      capturedCredits: 0,
      provider: route.provider,
      model: route.model,
      routeAudit: buildAiRouteAudit(policy, route),
      providerRequestId: null,
      idempotencyKey: `${uid}:${feature}:${clientRequestId}`,
      inputHash: sha256(prompt),
      requestIpHash: requestHash,
      promptOriginal: prompt,
      promptCleaned: prompt,
      output: null,
      errorCode: null,
      createdAt: now,
      updatedAt: now,
    });
    tx.set(reserveLedgerRef, {
      type: "reserve",
      amount: -credits,
      balanceAfter: nextBalance,
      reservedAfter: nextReserved,
      jobId,
      stripeSessionId: null,
      idempotencyKey: `${uid}:${feature}:${clientRequestId}:reserve`,
      createdAt: now,
      actor: "ai_job",
    });
    tx.set(userRef, {
      creditBalance: nextBalance,
      reservedCreditBalance: nextReserved,
      updatedAt: now,
    }, { merge: true });
    result = { duplicate: false, job: { id: jobId, status: "reserved" } };
  });

  return result;
}

async function finalizeJobSuccess({ db, uid, jobId, providerResult, policy }) {
  const userRef = db.collection("users").doc(uid);
  const jobRef = db.collection("aiJobs").doc(jobId);
  const captureLedgerRef = userRef.collection("creditLedger").doc(`capture_${jobId}`);
  await db.runTransaction(async (tx) => {
    const [userSnapshot, jobSnapshot] = await Promise.all([tx.get(userRef), tx.get(jobRef)]);
    if (!jobSnapshot.exists) throw new HttpsError("not-found", "Job IA introuvable.");
    const job = jobSnapshot.data();
    if (job.status === "succeeded") return;
    const credits = Number(job.estimatedCredits || policy.creditsCharged);
    const userData = userSnapshot.exists ? userSnapshot.data() : {};
    const currentReserved = Number(userData.reservedCreditBalance || 0);
    const now = admin.firestore.FieldValue.serverTimestamp();
    tx.set(userRef, {
      reservedCreditBalance: Math.max(0, currentReserved - credits),
      updatedAt: now,
    }, { merge: true });
    tx.set(captureLedgerRef, {
      type: "capture",
      amount: 0,
      balanceAfter: Number(userData.creditBalance || 0),
      reservedAfter: Math.max(0, currentReserved - credits),
      jobId,
      stripeSessionId: null,
      idempotencyKey: `${job.idempotencyKey}:capture`,
      createdAt: now,
      actor: "ai_job",
    });
    tx.set(jobRef, {
      status: "succeeded",
      capturedCredits: credits,
      output: providerResult,
      providerRequestId: providerResult.providerRequestId || null,
      updatedAt: now,
    }, { merge: true });
  });
}

async function finalizeJobFailure({ db, uid, jobId, code, policy }) {
  const userRef = db.collection("users").doc(uid);
  const jobRef = db.collection("aiJobs").doc(jobId);
  const releaseLedgerRef = userRef.collection("creditLedger").doc(`release_${jobId}`);
  await db.runTransaction(async (tx) => {
    const [userSnapshot, jobSnapshot] = await Promise.all([tx.get(userRef), tx.get(jobRef)]);
    if (!jobSnapshot.exists) return;
    const job = jobSnapshot.data();
    if (["succeeded", "failed", "refunded"].includes(job.status)) return;
    const credits = Number(job.estimatedCredits || policy.creditsCharged);
    const userData = userSnapshot.exists ? userSnapshot.data() : {};
    const balance = Number(userData.creditBalance || 0);
    const reserved = Number(userData.reservedCreditBalance || 0);
    const now = admin.firestore.FieldValue.serverTimestamp();
    tx.set(userRef, {
      creditBalance: balance + credits,
      reservedCreditBalance: Math.max(0, reserved - credits),
      updatedAt: now,
    }, { merge: true });
    tx.set(releaseLedgerRef, {
      type: "release",
      amount: credits,
      balanceAfter: balance + credits,
      reservedAfter: Math.max(0, reserved - credits),
      jobId,
      stripeSessionId: null,
      idempotencyKey: `${job.idempotencyKey}:release`,
      createdAt: now,
      actor: "ai_job",
      errorCode: code,
    });
    tx.set(jobRef, {
      status: "failed",
      errorCode: code,
      updatedAt: now,
    }, { merge: true });
  });
}

const createAiJob = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_AI_APP_CHECK,
  },
  async (request) => {
    const db = admin.firestore();
    let uid;
    let feature;
    let policy;
    let jobId;
    let clientRequestId;
    let ipHash;
    try {
      uid = assertAuthenticated(request);
      ipHash = requestIpHash(request);
      feature = requireFeature(request.data?.feature);
      clientRequestId = requireClientRequestId(request.data?.clientRequestId);
      policy = await loadPricingPolicy(db, feature);
      const prompt = cleanPrompt(request.data?.prompt, policy.maxInputChars);
      const route = routeModel(policy, { productionRuntime: isProductionRuntime() });
      jobId = aiJobId(uid, feature, clientRequestId);
      const reservation = await reserveCreditsForJob({
        db,
        uid,
        jobId,
        feature,
        clientRequestId,
        prompt,
        policy,
        route,
        ipHash,
      });
      if (reservation.duplicate) {
        return { jobId, status: reservation.job.status, duplicate: true };
      }
      const providerResult = await runMockProvider({ feature, prompt, policy, route });
      await finalizeJobSuccess({ db, uid, jobId, providerResult, policy });
      return {
        jobId,
        status: "succeeded",
        creditsCharged: policy.creditsCharged,
        provider: route.provider,
        model: route.model,
        output: providerResult,
      };
    } catch (error) {
      const publicError = error instanceof HttpsError ? error : toHttpsError(error);
      if (jobId && policy && uid) {
        await finalizeJobFailure({ db, uid, jobId, code: error.message || "ai_job_failed", policy })
          .catch((finalizeError) => logger.warn("AI job failure finalize failed", finalizeError));
      }
      await recordAiSecurityEvent(db, {
        uid,
        feature,
        jobId,
        clientRequestId,
        ipHash,
        error: publicError,
        hasAppCheck: Boolean(request.app),
      }).catch((eventError) => logger.warn("AI security event write failed", eventError));
      throw publicError;
    }
  }
);

module.exports = {
  createAiJob,
  reserveCreditsForJob,
  finalizeJobSuccess,
  finalizeJobFailure,
  classifyAiSecurityEvent,
  buildAiSecurityEventData,
  buildAiRouteAudit,
  requestIpHash,
  recordAiSecurityEvent,
  publicAiPolicyCatalog,
  publicProviderRegistry,
};
