"use strict";

const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { finalizeJobFailure } = require("./jobs");

const REGION = "europe-west9";
const STALE_AI_RESERVATION_MS = 20 * 60 * 1000;
const MAX_RECONCILE_JOBS = 50;

function timestampMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (typeof value.millis === "number") return value.millis;
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function isStaleAiReservation(job, nowMs = Date.now(), staleAfterMs = STALE_AI_RESERVATION_MS) {
  if (!["reserved", "running"].includes(job?.status)) return false;
  const updatedMs = timestampMillis(job.updatedAt || job.createdAt);
  if (!updatedMs) return false;
  return nowMs - updatedMs >= staleAfterMs;
}

async function releaseStaleAiReservation({
  db,
  jobId,
  nowMs = Date.now(),
  staleAfterMs = STALE_AI_RESERVATION_MS,
}) {
  const jobRef = db.collection("aiJobs").doc(jobId);
  const snapshot = await jobRef.get();
  if (!snapshot.exists) return { status: "missing" };

  const job = snapshot.data();
  if (!isStaleAiReservation(job, nowMs, staleAfterMs)) {
    return { status: "fresh" };
  }
  if (!job.uid) {
    return { status: "invalid_uid" };
  }

  await finalizeJobFailure({
    db,
    uid: job.uid,
    jobId,
    code: "ai_reservation_stale_released",
    policy: { creditsCharged: Number(job.estimatedCredits || 0) },
  });
  return { status: "released" };
}

async function releaseStaleAiReservationsBatch({
  db = admin.firestore(),
  nowMs = Date.now(),
  staleAfterMs = STALE_AI_RESERVATION_MS,
  limit = MAX_RECONCILE_JOBS,
} = {}) {
  const snapshot = await db.collection("aiJobs")
    .where("status", "in", ["reserved", "running"])
    .limit(limit)
    .get();

  const result = {
    scanned: 0,
    released: 0,
    skipped: 0,
  };

  for (const doc of snapshot.docs) {
    result.scanned += 1;
    const releaseResult = await releaseStaleAiReservation({
      db,
      jobId: doc.id,
      nowMs,
      staleAfterMs,
    });
    if (releaseResult.status === "released") {
      result.released += 1;
    } else {
      result.skipped += 1;
    }
  }

  return result;
}

const reconcileStaleAiReservations = onSchedule(
  {
    region: REGION,
    schedule: "every 15 minutes",
    timeZone: "Europe/Paris",
  },
  async () => {
    const result = await releaseStaleAiReservationsBatch();
    if (result.released > 0) {
      logger.warn("Released stale AI reservations", result);
    } else {
      logger.info("AI reservation reconciliation complete", result);
    }
  }
);

module.exports = {
  STALE_AI_RESERVATION_MS,
  timestampMillis,
  isStaleAiReservation,
  releaseStaleAiReservation,
  releaseStaleAiReservationsBatch,
  reconcileStaleAiReservations,
};
