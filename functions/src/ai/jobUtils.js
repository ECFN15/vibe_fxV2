"use strict";

const crypto = require("crypto");

function requireClientRequestId(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{8,128}$/.test(value)) {
    throw new Error("client_request_id_invalid");
  }
  return value;
}

function requireFeature(value) {
  if (typeof value !== "string" || !/^[a-z0-9_.:-]{3,96}$/.test(value)) {
    throw new Error("feature_invalid");
  }
  return value;
}

function cleanPrompt(value, maxInputChars) {
  const prompt = String(value || "").replace(/\s+/g, " ").trim();
  if (!prompt) throw new Error("prompt_empty");
  if (prompt.length > maxInputChars) throw new Error("prompt_too_long");
  return prompt;
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function aiJobId(uid, feature, clientRequestId) {
  return sha256(`${uid}:${feature}:${clientRequestId}`).slice(0, 40);
}

function minuteBucket(date = new Date()) {
  return date.toISOString().slice(0, 16).replace(/[-:T]/g, "");
}

function normalizeIpHash(value) {
  const candidate = String(value || "").trim().toLowerCase();
  if (/^[a-f0-9]{16,64}$/.test(candidate)) return candidate.slice(0, 64);
  return sha256(candidate || "unknown").slice(0, 32);
}

function rateLimitDocId(uid, feature, date = new Date(), ipHash = "unknown") {
  return sha256(`${uid}:${feature}:${normalizeIpHash(ipHash)}:${minuteBucket(date)}`).slice(0, 40);
}

module.exports = {
  requireClientRequestId,
  requireFeature,
  cleanPrompt,
  sha256,
  aiJobId,
  minuteBucket,
  normalizeIpHash,
  rateLimitDocId,
};
