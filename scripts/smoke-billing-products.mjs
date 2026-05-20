import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  PRODUCT_DEFINITIONS,
  getProductByKey,
  getProductByPriceId,
  publicBillingProducts,
} = require("../functions/src/billingProducts.js");
const {
  checkoutEventAction,
  eventObjectId,
} = require("../functions/src/billingEvents.js");
const {
  readLineItemPriceId,
  resolveSessionProduct,
} = require("../functions/src/billingSession.js");

const env = {
  STRIPE_PRICE_PREMIUM_LIFETIME: "price_premium",
  STRIPE_PRICE_CREDITS_500: "price_500",
  STRIPE_PRICE_CREDITS_1200: "price_1200",
  STRIPE_PRICE_CREDITS_3200: "price_3200",
  STRIPE_PRICE_CREDITS_7000: "price_7000",
};

assert.equal(Object.keys(PRODUCT_DEFINITIONS).length, 5);
assert.equal(getProductByKey("premium_lifetime", env).priceId, "price_premium");
assert.equal(getProductByKey("credits_1200", env).creditAmount, 1200);
assert.equal(getProductByPriceId("price_3200", env).key, "credits_3200");
assert.equal(getProductByPriceId("price_missing", env), null);

const publicProducts = publicBillingProducts(env);
assert.equal(publicProducts.length, 5);
assert.ok(publicProducts.every((product) => product.configured));
assert.ok(publicProducts.every((product) => !("priceId" in product)));
assert.deepEqual(
  publicProducts.map((product) => product.key),
  ["premium_lifetime", "credits_500", "credits_1200", "credits_3200", "credits_7000"]
);

assert.equal(checkoutEventAction("checkout.session.completed"), "fulfill");
assert.equal(checkoutEventAction("checkout.session.async_payment_succeeded"), "fulfill");
assert.equal(checkoutEventAction("checkout.session.async_payment_failed"), "mark_failed");
assert.equal(checkoutEventAction("checkout.session.expired"), "mark_failed");
assert.equal(checkoutEventAction("payment_intent.succeeded"), "ignore");
assert.equal(eventObjectId({ data: { object: { id: "cs_test_123" } } }), "cs_test_123");

const validSession = {
  line_items: { data: [{ price: { id: "price_1200" } }] },
  metadata: {
    productKey: "credits_1200",
    productType: "credits",
    creditAmount: "1200",
  },
};
assert.equal(readLineItemPriceId(validSession), "price_1200");
assert.equal(resolveSessionProduct(validSession, env).key, "credits_1200");

assert.throws(
  () => resolveSessionProduct({
    line_items: { data: [{ price: { id: "price_1200" } }] },
    metadata: { productKey: "credits_500", productType: "credits", creditAmount: "500" },
  }, env),
  /productKey incoherente/
);

assert.throws(
  () => resolveSessionProduct({
    metadata: { priceId: "price_1200", productKey: "credits_1200", productType: "credits", creditAmount: "9999" },
  }, env),
  /creditAmount incoherente/
);

assert.throws(
  () => resolveSessionProduct({
    line_items: { data: [{ price: { id: "price_unknown" } }] },
    metadata: { productKey: "credits_1200", productType: "credits", creditAmount: "1200" },
  }, env),
  /Price ID Stripe non autorise/
);

console.log("billing products smoke test OK");
