"use strict";

const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const crypto = require("crypto");
const Stripe = require("stripe");
const {
  getProductByKey,
  publicBillingProducts,
} = require("./billingProducts");
const { resolveSessionProduct } = require("./billingSession");
const {
  checkoutEventAction,
  eventObjectId,
} = require("./billingEvents");
const { shouldEnforceAppCheck } = require("./appCheck");

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const REGION = "europe-west9";
const STRIPE_API_VERSION = "2026-02-25.clover";
const ENFORCE_BILLING_APP_CHECK = shouldEnforceAppCheck("ENFORCE_BILLING_APP_CHECK");

function getSecretValue(secret) {
  return String(secret.value() || "").trim();
}

function getStripe() {
  const secretKey = getSecretValue(STRIPE_SECRET_KEY);
  if (!secretKey) {
    throw new HttpsError("failed-precondition", "Secret STRIPE_SECRET_KEY manquant.");
  }
  return new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
}

function assertPermanentAccount(request) {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Connexion utilisateur requise.");
  }
  const signInProvider = request.auth?.token?.firebase?.sign_in_provider || "";
  const email = String(request.auth?.token?.email || "").trim();
  if (signInProvider === "anonymous" || !email) {
    throw new HttpsError("failed-precondition", "Un compte permanent avec email est requis avant achat.");
  }
  return { uid, email };
}

function requireClientRequestId(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{8,128}$/.test(value)) {
    throw new HttpsError("invalid-argument", "clientRequestId invalide.");
  }
  return value;
}

function requireConfiguredProduct(productKey) {
  if (typeof productKey !== "string") {
    throw new HttpsError("invalid-argument", "productKey invalide.");
  }
  const product = getProductByKey(productKey);
  if (!product) {
    throw new HttpsError("invalid-argument", "Produit Stripe inconnu.");
  }
  if (!product.priceId || !product.priceId.startsWith("price_")) {
    throw new HttpsError("failed-precondition", `Price ID Stripe manquant pour ${product.key}.`);
  }
  return product;
}

function getAppBaseUrl() {
  const raw = String(process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (!raw) {
    throw new HttpsError("failed-precondition", "APP_BASE_URL doit etre configure cote Functions.");
  }
  let url;
  try {
    url = new URL(raw);
  } catch (_error) {
    throw new HttpsError("failed-precondition", "APP_BASE_URL invalide.");
  }
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(isLocal && url.protocol === "http:")) {
    throw new HttpsError("failed-precondition", "APP_BASE_URL doit utiliser https hors local.");
  }
  return url.origin;
}

function checkoutDocId(uid, productKey, clientRequestId) {
  return crypto
    .createHash("sha256")
    .update(`${uid}:${productKey}:${clientRequestId}`)
    .digest("hex")
    .slice(0, 40);
}

function stringOrNull(value) {
  return value == null ? null : String(value);
}

async function fulfillCheckoutSession(session, event) {
  if (session.mode !== "payment") {
    return { status: "ignored", reason: "mode_not_payment" };
  }
  if (session.payment_status !== "paid") {
    return { status: "ignored", reason: "payment_not_paid" };
  }

  const product = resolveSessionProduct(session);
  const metadata = session.metadata || {};
  const uid = String(metadata.uid || "").trim();
  if (!uid) {
    throw new HttpsError("failed-precondition", "Session Stripe sans uid.");
  }

  const db = admin.firestore();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const userRef = db.collection("users").doc(uid);
  const eventRef = db.collection("stripeEvents").doc(event.id);
  const paymentRef = db.collection("payments").doc(session.id);
  const ledgerRef = userRef.collection("creditLedger").doc(`stripe_${session.id}`);
  const checkoutDocId = checkoutDocIdForMetadata(uid, metadata.productKey, metadata.clientRequestId);
  const checkoutRef = checkoutDocId ? db.collection("checkoutSessions").doc(checkoutDocId) : null;

  let transactionResult = { status: "processed" };
  await db.runTransaction(async (tx) => {
    const [eventSnapshot, paymentSnapshot, userSnapshot] = await Promise.all([
      tx.get(eventRef),
      tx.get(paymentRef),
      tx.get(userRef),
    ]);

    if (eventSnapshot.exists && eventSnapshot.data()?.status === "processed") {
      transactionResult = { status: "duplicate_event" };
      return;
    }

    if (paymentSnapshot.exists && paymentSnapshot.data()?.status === "fulfilled") {
      tx.set(eventRef, {
        type: event.type,
        objectId: session.id,
        status: "duplicate_session_ignored",
        livemode: Boolean(event.livemode),
        stripeCreated: event.created || null,
        processedAt: now,
      }, { merge: true });
      transactionResult = { status: "duplicate_session" };
      return;
    }

    const userData = userSnapshot.exists ? userSnapshot.data() : {};
    const currentBalance = Number(userData.creditBalance || 0);
    const nextBalance = currentBalance + product.creditAmount;
    const amountTotal = Number(session.amount_total || 0);
    const currency = String(session.currency || product.currency).toLowerCase();
    const customerEmail = session.customer_details?.email || session.customer_email || userData.email || "";
    const baseUserPatch = {
      email: customerEmail,
      updatedAt: now,
      lifetimePaidCents: admin.firestore.FieldValue.increment(amountTotal),
      stripeCustomerId: stringOrNull(session.customer),
    };

    if (!userSnapshot.exists) {
      Object.assign(baseUserPatch, {
        plan: "free",
        creditBalance: 0,
        bonusCreditBalance: 0,
        reservedCreditBalance: 0,
        createdAt: now,
      });
    }

    if (product.entitlementType === "premium") {
      Object.assign(baseUserPatch, {
        plan: "premium",
        premiumUntil: null,
        premiumSource: "stripe_checkout",
        premiumActivatedAt: now,
      });
    }

    if (product.entitlementType === "credits") {
      Object.assign(baseUserPatch, {
        creditBalance: nextBalance,
        lifetimePurchasedCredits: admin.firestore.FieldValue.increment(product.creditAmount),
      });
      tx.set(ledgerRef, {
        type: "purchase",
        amount: product.creditAmount,
        balanceAfter: nextBalance,
        jobId: null,
        stripeSessionId: session.id,
        stripePaymentIntentId: stringOrNull(session.payment_intent),
        idempotencyKey: `stripe:${session.id}`,
        createdAt: now,
        actor: "stripe_webhook",
        productKey: product.key,
      });
    }

    tx.set(userRef, baseUserPatch, { merge: true });
    tx.set(paymentRef, {
      uid,
      provider: "stripe",
      stripeSessionId: session.id,
      stripePaymentIntentId: stringOrNull(session.payment_intent),
      stripeCustomerId: stringOrNull(session.customer),
      productKey: product.key,
      productType: product.productType,
      creditAmount: product.creditAmount,
      amountTotal,
      currency,
      status: "fulfilled",
      paymentStatus: session.payment_status,
      livemode: Boolean(session.livemode),
      createdAt: paymentSnapshot.exists ? paymentSnapshot.data()?.createdAt || now : now,
      fulfilledAt: now,
      updatedAt: now,
    }, { merge: true });
    tx.set(eventRef, {
      type: event.type,
      objectId: session.id,
      objectType: session.object,
      status: "processed",
      livemode: Boolean(event.livemode),
      stripeCreated: event.created || null,
      processedAt: now,
    }, { merge: true });
    if (checkoutRef) {
      tx.set(checkoutRef, {
        uid,
        productKey: product.key,
        productType: product.productType,
        creditAmount: product.creditAmount,
        priceId: product.priceId,
        status: "fulfilled",
        stripeSessionId: session.id,
        stripePaymentIntentId: stringOrNull(session.payment_intent),
        paymentStatus: session.payment_status,
        fulfilledAt: now,
        updatedAt: now,
      }, { merge: true });
    }
  });

  return transactionResult;
}

async function markCheckoutSessionFailed(session, event) {
  const metadata = session.metadata || {};
  const uid = String(metadata.uid || "").trim();
  const db = admin.firestore();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const eventRef = db.collection("stripeEvents").doc(event.id);
  const paymentRef = db.collection("payments").doc(session.id);
  const checkoutDocId = uid && metadata.productKey && metadata.clientRequestId
    ? checkoutDocIdForMetadata(uid, metadata.productKey, metadata.clientRequestId)
    : null;
  const checkoutRef = checkoutDocId ? db.collection("checkoutSessions").doc(checkoutDocId) : null;

  await db.runTransaction(async (tx) => {
    const eventSnapshot = await tx.get(eventRef);
    if (eventSnapshot.exists) return;

    tx.set(eventRef, {
      type: event.type,
      objectId: session.id,
      objectType: session.object,
      status: "processed_failed_checkout",
      livemode: Boolean(event.livemode),
      stripeCreated: event.created || null,
      processedAt: now,
    }, { merge: true });

    tx.set(paymentRef, {
      uid: uid || null,
      provider: "stripe",
      stripeSessionId: session.id,
      productKey: metadata.productKey || null,
      productType: metadata.productType || null,
      creditAmount: Number(metadata.creditAmount || 0),
      status: event.type === "checkout.session.expired" ? "expired" : "failed",
      paymentStatus: session.payment_status || "unpaid",
      livemode: Boolean(session.livemode),
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    if (checkoutRef) {
      tx.set(checkoutRef, {
        status: event.type === "checkout.session.expired" ? "expired" : "failed",
        stripeSessionId: session.id,
        updatedAt: now,
      }, { merge: true });
    }
  });

  return { status: "processed_failed_checkout" };
}

function checkoutDocIdForMetadata(uid, productKey, clientRequestId) {
  if (!uid || !productKey || !clientRequestId) return null;
  return checkoutDocId(uid, productKey, clientRequestId);
}

const createCheckoutSession = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_BILLING_APP_CHECK,
    secrets: [STRIPE_SECRET_KEY],
  },
  async (request) => {
    const { uid, email } = assertPermanentAccount(request);
    const product = requireConfiguredProduct(request.data?.productKey);
    const clientRequestId = requireClientRequestId(request.data?.clientRequestId);
    const checkoutId = checkoutDocId(uid, product.key, clientRequestId);
    const checkoutRef = admin.firestore().collection("checkoutSessions").doc(checkoutId);

    let existingCheckout = null;
    await admin.firestore().runTransaction(async (tx) => {
      const snapshot = await tx.get(checkoutRef);
      const data = snapshot.exists ? snapshot.data() : null;
      if (data?.status === "open" && data?.sessionUrl && data?.stripeSessionId) {
        existingCheckout = data;
        return;
      }
      if (data?.status === "creating") {
        throw new HttpsError("aborted", "Creation Checkout deja en cours pour cette demande.");
      }
      tx.set(checkoutRef, {
        uid,
        email,
        productKey: product.key,
        productType: product.productType,
        creditAmount: product.creditAmount,
        priceId: product.priceId,
        clientRequestId,
        status: "creating",
        createdAt: data?.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    if (existingCheckout) {
      return { url: existingCheckout.sessionUrl, sessionId: existingCheckout.stripeSessionId };
    }

    const stripe = getStripe();
    const appBaseUrl = getAppBaseUrl();
    const idempotencyKey = `checkout:${checkoutId}`;
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{ price: product.priceId, quantity: 1 }],
        customer_email: email,
        client_reference_id: uid,
        success_url: `${appBaseUrl}/account/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appBaseUrl}/pricing?checkout=cancel`,
        metadata: {
          uid,
          productKey: product.key,
          productType: product.productType,
          creditAmount: String(product.creditAmount),
          priceId: product.priceId,
          clientRequestId,
        },
        payment_intent_data: {
          metadata: {
            uid,
            productKey: product.key,
            productType: product.productType,
            clientRequestId,
          },
        },
      }, { idempotencyKey });

      await checkoutRef.set({
        status: "open",
        stripeSessionId: session.id,
        sessionUrl: session.url,
        idempotencyKey,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      return { url: session.url, sessionId: session.id };
    } catch (error) {
      await checkoutRef.set({
        status: "failed",
        errorCode: error.code || "stripe_checkout_error",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true }).catch((writeError) => logger.warn("Checkout failure write failed", writeError));
      logger.error("Stripe checkout creation failed", { code: error.code || null, message: error.message || null });
      throw new HttpsError("failed-precondition", "Creation Checkout Stripe impossible.");
    }
  }
);

const stripeWebhook = onRequest(
  {
    region: REGION,
    secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET],
  },
  async (request, response) => {
    if (request.method !== "POST") {
      response.set("Allow", "POST");
      response.status(405).send("Method Not Allowed");
      return;
    }

    const stripe = getStripe();
    const webhookSecret = getSecretValue(STRIPE_WEBHOOK_SECRET);
    if (!webhookSecret) {
      response.status(500).send("Stripe webhook secret missing");
      return;
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        request.rawBody,
        request.headers["stripe-signature"],
        webhookSecret
      );
    } catch (error) {
      logger.warn("Stripe webhook signature verification failed", { message: error.message });
      response.status(400).send("Invalid Stripe signature");
      return;
    }

    try {
      const action = checkoutEventAction(event.type);
      if (action === "ignore") {
        await admin.firestore().collection("stripeEvents").doc(event.id).set({
          type: event.type,
          objectId: eventObjectId(event),
          status: "ignored",
          livemode: Boolean(event.livemode),
          stripeCreated: event.created || null,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        response.json({ received: true, status: "ignored" });
        return;
      }

      const sessionObject = event.data.object;
      const session = await stripe.checkout.sessions.retrieve(sessionObject.id, {
        expand: ["line_items.data.price"],
      });
      const result = action === "fulfill"
        ? await fulfillCheckoutSession(session, event)
        : await markCheckoutSessionFailed(session, event);
      if (result.status === "ignored") {
        await admin.firestore().collection("stripeEvents").doc(event.id).set({
          type: event.type,
          objectId: session.id,
          status: "ignored",
          reason: result.reason || "not_fulfillable",
          livemode: Boolean(event.livemode),
          stripeCreated: event.created || null,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      response.json({ received: true, ...result });
    } catch (error) {
      logger.error("Stripe webhook processing failed", {
        type: event.type,
        eventId: event.id,
        code: error.code || null,
        message: error.message || null,
      });
      response.status(500).send("Stripe webhook processing failed");
    }
  }
);

module.exports = {
  createCheckoutSession,
  stripeWebhook,
  fulfillCheckoutSession,
  markCheckoutSessionFailed,
  resolveSessionProduct,
  publicBillingProducts,
};
