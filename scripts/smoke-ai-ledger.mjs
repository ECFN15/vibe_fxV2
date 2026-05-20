import assert from "node:assert/strict";
import { createRequire } from "node:module";
import Module from "node:module";

class HttpsError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

function firestoreStub() {
  throw new Error("firestore_stub_runtime_not_available");
}

firestoreStub.FieldValue = {
  serverTimestamp: () => ({ __type: "serverTimestamp" }),
};

firestoreStub.Timestamp = {
  fromMillis: (millis) => ({
    millis,
    toMillis: () => millis,
  }),
};

const originalLoad = Module._load;
Module._load = function loadWithFirebaseStubs(request, parent, isMain) {
  if (request === "firebase-functions/v2/https") {
    return {
      HttpsError,
      onCall: (options, handler) => ({ __callable: true, options, handler }),
    };
  }
  if (request === "firebase-functions/v2/scheduler") {
    return {
      onSchedule: (options, handler) => ({ __scheduled: true, options, handler }),
    };
  }
  if (request === "firebase-functions/logger") {
    return {
      warn: () => undefined,
      error: () => undefined,
      info: () => undefined,
    };
  }
  if (request === "firebase-admin") {
    return { firestore: firestoreStub };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const require = createRequire(import.meta.url);
const {
  reserveCreditsForJob,
  finalizeJobSuccess,
  finalizeJobFailure,
  buildAiSecurityEventData,
  buildAiRouteAudit,
  classifyAiSecurityEvent,
  recordAiSecurityEvent,
} = require("../functions/src/ai/jobs.js");
const { normalizeIpHash } = require("../functions/src/ai/jobUtils.js");
const {
  STALE_AI_RESERVATION_MS,
  isStaleAiReservation,
  releaseStaleAiReservation,
} = require("../functions/src/ai/reconciliation.js");

class FakeSnapshot {
  constructor(ref, data) {
    this.ref = ref;
    this.id = ref.id;
    this.exists = data !== undefined;
    this._data = data;
  }

  data() {
    return this._data;
  }
}

class FakeDocRef {
  constructor(db, path) {
    this.db = db;
    this.path = path;
    this.id = path.split("/").at(-1);
  }

  collection(name) {
    return new FakeCollectionRef(this.db, `${this.path}/${name}`);
  }

  async get() {
    return this.db.snapshot(this);
  }

  async set(data, options) {
    this.db.set(this.path, data, options);
  }
}

class FakeCollectionRef {
  constructor(db, path) {
    this.db = db;
    this.path = path;
  }

  doc(id = null) {
    return new FakeDocRef(this.db, `${this.path}/${id || this.db.autoId(this.path)}`);
  }
}

class FakeTransaction {
  constructor(db) {
    this.db = db;
  }

  async get(ref) {
    return this.db.snapshot(ref);
  }

  set(ref, data, options) {
    this.db.set(ref.path, data, options);
  }

  update(ref, data) {
    this.db.set(ref.path, data, { merge: true });
  }
}

class FakeFirestore {
  constructor() {
    this.store = new Map();
    this.autoCounters = new Map();
  }

  collection(path) {
    return new FakeCollectionRef(this, path);
  }

  async runTransaction(callback) {
    return callback(new FakeTransaction(this));
  }

  snapshot(ref) {
    return new FakeSnapshot(ref, this.store.get(ref.path));
  }

  set(path, data, options = {}) {
    const current = this.store.get(path) || {};
    this.store.set(path, options.merge ? { ...current, ...data } : { ...data });
  }

  get(path) {
    return this.store.get(path);
  }

  autoId(path) {
    const next = (this.autoCounters.get(path) || 0) + 1;
    this.autoCounters.set(path, next);
    return `auto_${next}`;
  }

  collectionEntries(collectionPath) {
    return [...this.store.entries()].filter(([path]) => path.startsWith(`${collectionPath}/`));
  }
}

const policy = {
  feature: "text.caption.draft",
  enabled: true,
  provider: "mock",
  model: "mock-caption-v1",
  modality: "text",
  quality: "draft",
  creditsCharged: 1,
  maxInputChars: 1200,
  maxOutputChars: 420,
  creditUnitValueUsd: 0.01,
  estimatedProviderCostUsd: 0,
  estimatedInternalCostUsd: 0,
  estimatedClientPriceUsd: 0.01,
  estimatedGrossMargin: 1,
  targetGrossMargin: 0.7,
  minCreditsForTargetMargin: 1,
};

const route = {
  provider: "mock",
  model: "mock-caption-v1",
  modality: "text",
  quality: "draft",
  status: "candidate",
  access: "internal-test",
  region: "local",
  legalRisk: "low",
  productionAllowed: false,
  routeCandidateId: "mock-primary",
  routeScore: 0.92,
  routeScores: {
    quality: 0.45,
    margin: 1,
    latency: 0.8,
    reliability: 0.8,
    legalSafety: 0.95,
  },
  rejectedCandidates: [{
    candidateId: "blocked-reference",
    provider: "midjourney",
    reason: "provider_blocked",
  }],
};

async function testReserveCaptureAndRelease() {
  const db = new FakeFirestore();
  db.set("users/u1", { creditBalance: 2, reservedCreditBalance: 0 }, { merge: true });

  const first = await reserveCreditsForJob({
    db,
    uid: "u1",
    jobId: "job_success",
    feature: policy.feature,
    clientRequestId: "request_success_1",
    prompt: "hello world",
    policy,
    route,
    ipHash: "203.0.113.10",
  });
  assert.equal(first.duplicate, false);
  assert.equal(db.get("users/u1").creditBalance, 1);
  assert.equal(db.get("users/u1").reservedCreditBalance, 1);
  assert.equal(db.get("aiJobs/job_success").status, "reserved");
  assert.equal(db.get("aiJobs/job_success").requestIpHash, normalizeIpHash("203.0.113.10"));
  assert.equal(db.get("aiJobs/job_success").routeAudit.candidateId, "mock-primary");
  assert.equal(db.get("aiJobs/job_success").routeAudit.routeScores.margin, 1);
  assert.equal(db.get("aiJobs/job_success").routeAudit.rejectedCandidates[0].reason, "provider_blocked");
  assert.equal(db.get("aiJobs/job_success").routeAudit.pricing.estimatedGrossMargin, 1);
  assert.equal(db.get("users/u1/creditLedger/reserve_job_success").amount, -1);

  const duplicate = await reserveCreditsForJob({
    db,
    uid: "u1",
    jobId: "job_success",
    feature: policy.feature,
    clientRequestId: "request_success_1",
    prompt: "hello world",
    policy,
    route,
    ipHash: "203.0.113.10",
  });
  assert.equal(duplicate.duplicate, true);
  assert.equal(db.get("users/u1").creditBalance, 1);
  assert.equal(db.get("users/u1").reservedCreditBalance, 1);

  await finalizeJobSuccess({
    db,
    uid: "u1",
    jobId: "job_success",
    providerResult: { providerRequestId: "mock_1", text: "done" },
    policy,
  });
  assert.equal(db.get("users/u1").creditBalance, 1);
  assert.equal(db.get("users/u1").reservedCreditBalance, 0);
  assert.equal(db.get("users/u1/creditLedger/capture_job_success").amount, 0);
  assert.equal(db.get("aiJobs/job_success").status, "succeeded");
  assert.equal(db.get("aiJobs/job_success").capturedCredits, 1);

  await reserveCreditsForJob({
    db,
    uid: "u1",
    jobId: "job_failure",
    feature: policy.feature,
    clientRequestId: "request_failure_1",
    prompt: "needs refund",
    policy,
    route,
    ipHash: "203.0.113.10",
  });
  assert.equal(db.get("users/u1").creditBalance, 0);
  assert.equal(db.get("users/u1").reservedCreditBalance, 1);

  await finalizeJobFailure({
    db,
    uid: "u1",
    jobId: "job_failure",
    code: "provider_timeout",
    policy,
  });
  assert.equal(db.get("users/u1").creditBalance, 1);
  assert.equal(db.get("users/u1").reservedCreditBalance, 0);
  assert.equal(db.get("users/u1/creditLedger/release_job_failure").amount, 1);
  assert.equal(db.get("aiJobs/job_failure").status, "failed");
}

async function testCreditAndRateLimitRejections() {
  const noCreditDb = new FakeFirestore();
  noCreditDb.set("users/u2", { creditBalance: 0, reservedCreditBalance: 0 }, { merge: true });
  await assert.rejects(
    () => reserveCreditsForJob({
      db: noCreditDb,
      uid: "u2",
      jobId: "job_no_credit",
      feature: policy.feature,
      clientRequestId: "request_nocredit",
      prompt: "blocked",
      policy,
      route,
    }),
    (error) => error.code === "resource-exhausted" && /Credits IA insuffisants/.test(error.message)
  );
  assert.equal(noCreditDb.get("aiJobs/job_no_credit"), undefined);

  const rateDb = new FakeFirestore();
  rateDb.set("users/u3", { creditBalance: 10, reservedCreditBalance: 0 }, { merge: true });
  for (let index = 0; index < 6; index += 1) {
    await reserveCreditsForJob({
      db: rateDb,
      uid: "u3",
      jobId: `job_rate_${index}`,
      feature: policy.feature,
      clientRequestId: `request_rate_${index}`,
      prompt: `rate ${index}`,
      policy,
      route,
      ipHash: "198.51.100.20",
    });
  }
  await assert.rejects(
    () => reserveCreditsForJob({
      db: rateDb,
      uid: "u3",
      jobId: "job_rate_6",
      feature: policy.feature,
      clientRequestId: "request_rate_6",
      prompt: "rate blocked",
      policy,
      route,
      ipHash: "198.51.100.20",
    }),
    (error) => error.code === "resource-exhausted" && /Trop de jobs IA/.test(error.message)
  );
  assert.equal(rateDb.collectionEntries("aiRateLimits").length, 1);
  assert.equal(rateDb.collectionEntries("aiRateLimits")[0][1].count, 6);
  assert.equal(rateDb.collectionEntries("aiRateLimits")[0][1].ipHash, normalizeIpHash("198.51.100.20"));

  await reserveCreditsForJob({
    db: rateDb,
    uid: "u3",
    jobId: "job_rate_other_ip",
    feature: policy.feature,
    clientRequestId: "request_rate_other_ip",
    prompt: "rate allowed from another source bucket",
    policy,
    route,
    ipHash: "198.51.100.21",
  });
  assert.equal(rateDb.collectionEntries("aiRateLimits").length, 2);
}

async function testSecurityEventRedaction() {
  const invalid = new HttpsError("invalid-argument", "Prompt requis.");
  assert.equal(classifyAiSecurityEvent(invalid), "ai_job_invalid_request");

  const eventData = buildAiSecurityEventData({
    uid: "u4",
    feature: policy.feature,
    jobId: "job_invalid",
    clientRequestId: "request_invalid_1",
    ipHash: "192.0.2.1",
    error: invalid,
    hasAppCheck: false,
  });
  assert.equal(eventData.type, "ai_job_invalid_request");
  assert.equal(eventData.uid, "u4");
  assert.equal(eventData.prompt, undefined);
  assert.notEqual(eventData.clientRequestHash, "request_invalid_1");
  assert.equal(eventData.ipHash, normalizeIpHash("192.0.2.1"));
  assert.notEqual(eventData.ipHash, "192.0.2.1");

  const db = new FakeFirestore();
  const eventId = await recordAiSecurityEvent(db, {
    uid: "u4",
    feature: policy.feature,
    jobId: "job_invalid",
    clientRequestId: "request_invalid_1",
    ipHash: "192.0.2.1",
    error: invalid,
    hasAppCheck: false,
  });
  assert.equal(eventId, "auto_1");
  const stored = db.get("securityEvents/auto_1");
  assert.equal(stored.type, "ai_job_invalid_request");
  assert.equal(stored.clientRequestHash, eventData.clientRequestHash);
  assert.equal(stored.hasAppCheck, false);
}

async function testStaleReservationRelease() {
  const db = new FakeFirestore();
  const nowMs = Date.parse("2026-05-20T12:00:00.000Z");
  db.set("users/u5", { creditBalance: 2, reservedCreditBalance: 0 }, { merge: true });

  await reserveCreditsForJob({
    db,
    uid: "u5",
    jobId: "job_stale",
    feature: policy.feature,
    clientRequestId: "request_stale_1",
    prompt: "stale reservation",
    policy,
    route,
    ipHash: "203.0.113.50",
  });
  assert.equal(db.get("users/u5").creditBalance, 1);
  assert.equal(db.get("users/u5").reservedCreditBalance, 1);

  db.set("aiJobs/job_stale", {
    updatedAt: { toMillis: () => nowMs - STALE_AI_RESERVATION_MS - 1000 },
  }, { merge: true });
  assert.equal(isStaleAiReservation(db.get("aiJobs/job_stale"), nowMs), true);

  const result = await releaseStaleAiReservation({
    db,
    jobId: "job_stale",
    nowMs,
  });
  assert.equal(result.status, "released");
  assert.equal(db.get("users/u5").creditBalance, 2);
  assert.equal(db.get("users/u5").reservedCreditBalance, 0);
  assert.equal(db.get("users/u5/creditLedger/release_job_stale").amount, 1);
  assert.equal(db.get("users/u5/creditLedger/release_job_stale").errorCode, "ai_reservation_stale_released");
  assert.equal(db.get("aiJobs/job_stale").status, "failed");

  const second = await releaseStaleAiReservation({
    db,
    jobId: "job_stale",
    nowMs,
  });
  assert.equal(second.status, "fresh");
  assert.equal(db.get("users/u5").creditBalance, 2);
}

function testRouteAuditRedaction() {
  const routeAudit = buildAiRouteAudit(policy, {
    ...route,
    rejectedCandidates: [{
      candidateId: "candidate_with_long_reason",
      provider: "unsafe-provider",
      reason: "x".repeat(500),
      apiKey: "secret_should_not_copy",
    }],
  });
  assert.equal(routeAudit.provider, "mock");
  assert.equal(routeAudit.apiKey, undefined);
  assert.equal(routeAudit.pricing.creditsCharged, 1);
  assert.equal(routeAudit.rejectedCandidates.length, 1);
  assert.ok(routeAudit.rejectedCandidates[0].reason.length <= 120);
  assert.equal(routeAudit.rejectedCandidates[0].apiKey, undefined);
}

await testReserveCaptureAndRelease();
await testCreditAndRateLimitRejections();
await testSecurityEventRedaction();
await testStaleReservationRelease();
testRouteAuditRedaction();

console.log("ai ledger smoke test OK");
