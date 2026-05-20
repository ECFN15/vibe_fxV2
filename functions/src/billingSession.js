"use strict";

const { getProductByPriceId } = require("./billingProducts");

class BillingSessionError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function readLineItemPriceId(session) {
  const item = session.line_items?.data?.[0];
  if (!item) return "";
  if (typeof item.price === "string") return item.price;
  return item.price?.id || "";
}

function resolveSessionProduct(session, env = process.env) {
  const metadata = session.metadata || {};
  const lineItemPriceId = readLineItemPriceId(session);
  const priceId = lineItemPriceId || metadata.priceId;
  const product = getProductByPriceId(priceId, env);
  if (!product) {
    throw new BillingSessionError("unauthorized_price_id", "Price ID Stripe non autorise.");
  }
  if (metadata.productKey && metadata.productKey !== product.key) {
    throw new BillingSessionError("metadata_product_key_mismatch", "Metadata Stripe productKey incoherente.");
  }
  if (metadata.productType && metadata.productType !== product.productType) {
    throw new BillingSessionError("metadata_product_type_mismatch", "Metadata Stripe productType incoherente.");
  }
  if (Number(metadata.creditAmount || 0) !== product.creditAmount) {
    throw new BillingSessionError("metadata_credit_amount_mismatch", "Metadata Stripe creditAmount incoherente.");
  }
  return product;
}

module.exports = {
  BillingSessionError,
  readLineItemPriceId,
  resolveSessionProduct,
};
