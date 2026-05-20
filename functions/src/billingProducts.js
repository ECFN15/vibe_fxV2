"use strict";

const PRODUCT_DEFINITIONS = Object.freeze({
  premium_lifetime: Object.freeze({
    key: "premium_lifetime",
    productType: "premium_lifetime",
    entitlementType: "premium",
    envPriceId: "STRIPE_PRICE_PREMIUM_LIFETIME",
    creditAmount: 0,
    targetAmountCents: 2900,
    currency: "eur",
  }),
  credits_500: Object.freeze({
    key: "credits_500",
    productType: "credits",
    entitlementType: "credits",
    envPriceId: "STRIPE_PRICE_CREDITS_500",
    creditAmount: 500,
    targetAmountCents: 500,
    currency: "eur",
  }),
  credits_1200: Object.freeze({
    key: "credits_1200",
    productType: "credits",
    entitlementType: "credits",
    envPriceId: "STRIPE_PRICE_CREDITS_1200",
    creditAmount: 1200,
    targetAmountCents: 1000,
    currency: "eur",
  }),
  credits_3200: Object.freeze({
    key: "credits_3200",
    productType: "credits",
    entitlementType: "credits",
    envPriceId: "STRIPE_PRICE_CREDITS_3200",
    creditAmount: 3200,
    targetAmountCents: 2500,
    currency: "eur",
  }),
  credits_7000: Object.freeze({
    key: "credits_7000",
    productType: "credits",
    entitlementType: "credits",
    envPriceId: "STRIPE_PRICE_CREDITS_7000",
    creditAmount: 7000,
    targetAmountCents: 5000,
    currency: "eur",
  }),
});

function configuredProducts(env = process.env) {
  return Object.values(PRODUCT_DEFINITIONS).map((product) => ({
    ...product,
    priceId: String(env[product.envPriceId] || "").trim(),
  }));
}

function getProductByKey(key, env = process.env) {
  const product = PRODUCT_DEFINITIONS[key];
  if (!product) return null;
  return {
    ...product,
    priceId: String(env[product.envPriceId] || "").trim(),
  };
}

function getProductByPriceId(priceId, env = process.env) {
  const normalized = String(priceId || "").trim();
  if (!normalized) return null;
  return configuredProducts(env).find((product) => product.priceId === normalized) || null;
}

function publicBillingProducts(env = process.env) {
  return configuredProducts(env).map((product) => ({
    key: product.key,
    productType: product.productType,
    creditAmount: product.creditAmount,
    targetAmountCents: product.targetAmountCents,
    currency: product.currency,
    configured: Boolean(product.priceId),
  }));
}

module.exports = {
  PRODUCT_DEFINITIONS,
  configuredProducts,
  getProductByKey,
  getProductByPriceId,
  publicBillingProducts,
};
