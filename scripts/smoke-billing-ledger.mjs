import assert from "node:assert/strict";
import { createRequire } from "node:module";
import Module from "node:module";
import crypto from "node:crypto";

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
  increment: (amount) => ({ __op: "increment", amount }),
  serverTimestamp: () => ({ __type: "serverTimestamp" }),
};

const adminStub = { firestore: firestoreStub };

const originalLoad = Module._load;
Module._load = function loadWithBillingStubs(request, parent, isMain) {
  if (request === "firebase-functions/v2/https") {
    return {
      HttpsError,
      onCall: (options, handler) => ({ __callable: true, options, handler }),
      onRequest: (options, handler) => ({ __request: true, options, handler }),
    };
  }
  if (request === "firebase-functions/params") {
    return {
      defineSecret: (name) => ({ name, value: () => "" }),
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
    return adminStub;
  }
  if (request === "stripe") {
    return function StripeStub() {
      return {};
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const require = createRequire(import.meta.url);
const {
  fulfillCheckoutSession,
  markCheckoutSessionFailed,
} = require("../functions/src/billing.js");

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
}

class FakeCollectionRef {
  constructor(db, path) {
    this.db = db;
    this.path = path;
  }

  doc(id) {
    return new FakeDocRef(this.db, `${this.path}/${id}`);
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
}

class FakeFirestore {
  constructor() {
    this.store = new Map();
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
    this.store.set(path, options.merge ? this.applySentinels({ ...current }, data) : this.applySentinels({}, data));
  }

  applySentinels(base, data) {
    const next = { ...base };
    for (const [key, value] of Object.entries(data)) {
      if (value && value.__op === "increment") {
        next[key] = Number(next[key] || 0) + value.amount;
      } else {
        next[key] = value;
      }
    }
    return next;
  }

  get(path) {
    return this.store.get(path);
  }
}

function setEnv() {
  process.env.STRIPE_PRICE_PREMIUM_LIFETIME = "price_premium";
  process.env.STRIPE_PRICE_CREDITS_500 = "price_500";
  process.env.STRIPE_PRICE_CREDITS_1200 = "price_1200";
  process.env.STRIPE_PRICE_CREDITS_3200 = "price_3200";
  process.env.STRIPE_PRICE_CREDITS_7000 = "price_7000";
}

function installFirestore(db) {
  const firestore = () => db;
  firestore.FieldValue = firestoreStub.FieldValue;
  adminStub.firestore = firestore;
}

function checkoutDocId(uid, productKey, clientRequestId) {
  return crypto
    .createHash("sha256")
    .update(`${uid}:${productKey}:${clientRequestId}`)
    .digest("hex")
    .slice(0, 40);
}

function checkoutSession(overrides = {}) {
  return {
    id: "cs_test_credits",
    object: "checkout.session",
    mode: "payment",
    payment_status: "paid",
    amount_total: 1000,
    currency: "eur",
    customer: "cus_test",
    payment_intent: "pi_test",
    customer_details: { email: "buyer@example.com" },
    line_items: { data: [{ price: { id: "price_1200" } }] },
    metadata: {
      uid: "u_billing",
      productKey: "credits_1200",
      productType: "credits",
      creditAmount: "1200",
      priceId: "price_1200",
      clientRequestId: "request_checkout_1",
    },
    ...overrides,
  };
}

function stripeEvent(id = "evt_1", type = "checkout.session.completed") {
  return {
    id,
    type,
    livemode: false,
    created: 1780000000,
  };
}

async function testCreditFulfillmentIdempotence() {
  setEnv();
  const db = new FakeFirestore();
  installFirestore(db);

  db.set("users/u_billing", {
    email: "buyer@example.com",
    creditBalance: 100,
    reservedCreditBalance: 0,
    lifetimePaidCents: 0,
  });

  const first = await fulfillCheckoutSession(checkoutSession(), stripeEvent("evt_1"));
  assert.equal(first.status, "processed");
  assert.equal(db.get("users/u_billing").creditBalance, 1300);
  assert.equal(db.get("users/u_billing").lifetimePaidCents, 1000);
  assert.equal(db.get("users/u_billing/creditLedger/stripe_cs_test_credits").amount, 1200);
  assert.equal(db.get("payments/cs_test_credits").status, "fulfilled");
  assert.equal(
    db.get(`checkoutSessions/${checkoutDocId("u_billing", "credits_1200", "request_checkout_1")}`).status,
    "fulfilled"
  );
  assert.equal(db.get("stripeEvents/evt_1").status, "processed");

  const replaySameEvent = await fulfillCheckoutSession(checkoutSession(), stripeEvent("evt_1"));
  assert.equal(replaySameEvent.status, "duplicate_event");
  assert.equal(db.get("users/u_billing").creditBalance, 1300);
  assert.equal(db.get("users/u_billing").lifetimePaidCents, 1000);

  const replayDifferentEvent = await fulfillCheckoutSession(checkoutSession(), stripeEvent("evt_2"));
  assert.equal(replayDifferentEvent.status, "duplicate_session");
  assert.equal(db.get("users/u_billing").creditBalance, 1300);
  assert.equal(db.get("users/u_billing").lifetimePaidCents, 1000);
  assert.equal(db.get("stripeEvents/evt_2").status, "duplicate_session_ignored");
}

async function testPremiumAndFailedCheckout() {
  setEnv();
  const db = new FakeFirestore();
  installFirestore(db);

  const premium = checkoutSession({
    id: "cs_test_premium",
    amount_total: 999,
    line_items: { data: [{ price: { id: "price_premium" } }] },
    metadata: {
      uid: "u_premium",
      productKey: "premium_lifetime",
      productType: "premium_lifetime",
      creditAmount: "0",
      priceId: "price_premium",
      clientRequestId: "request_premium_1",
    },
  });
  const premiumResult = await fulfillCheckoutSession(premium, stripeEvent("evt_premium"));
  assert.equal(premiumResult.status, "processed");
  assert.equal(db.get("users/u_premium").plan, "premium");
  assert.equal(db.get("users/u_premium").creditBalance, 0);
  assert.equal(db.get("payments/cs_test_premium").status, "fulfilled");
  assert.equal(
    db.get(`checkoutSessions/${checkoutDocId("u_premium", "premium_lifetime", "request_premium_1")}`).status,
    "fulfilled"
  );
  assert.equal(db.get("users/u_premium/creditLedger/stripe_cs_test_premium"), undefined);

  const failed = checkoutSession({
    id: "cs_test_failed",
    payment_status: "unpaid",
    metadata: {
      uid: "u_failed",
      productKey: "credits_500",
      productType: "credits",
      creditAmount: "500",
      priceId: "price_500",
      clientRequestId: "request_failed_1",
    },
  });
  await markCheckoutSessionFailed(failed, stripeEvent("evt_failed", "checkout.session.expired"));
  assert.equal(db.get("payments/cs_test_failed").status, "expired");
  assert.equal(
    db.get(`checkoutSessions/${checkoutDocId("u_failed", "credits_500", "request_failed_1")}`).status,
    "expired"
  );
}

await testCreditFulfillmentIdempotence();
await testPremiumAndFailedCheckout();

console.log("billing ledger smoke test OK");
