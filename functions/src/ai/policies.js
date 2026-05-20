"use strict";

const DEFAULT_AI_PRICING_POLICIES = Object.freeze({
  "text.caption.draft": Object.freeze({
    feature: "text.caption.draft",
    enabled: true,
    provider: "mock",
    model: "mock-caption-v1",
    modality: "text",
    quality: "draft",
    creditsCharged: 1,
    maxInputChars: 1200,
    maxOutputChars: 420,
    targetGrossMargin: 0.7,
    creditUnitValueUsd: 0.01,
    estimatedProviderCostUsd: 0,
    platformCostBufferUsd: 0,
    stripeAllocationUsd: 0,
    riskBufferUsd: 0,
    productionAllowed: false,
  }),
  "text.prompt_rewrite.draft": Object.freeze({
    feature: "text.prompt_rewrite.draft",
    enabled: true,
    provider: "mock",
    model: "mock-rewrite-v1",
    modality: "text",
    quality: "draft",
    creditsCharged: 1,
    maxInputChars: 1600,
    maxOutputChars: 520,
    targetGrossMargin: 0.7,
    creditUnitValueUsd: 0.01,
    estimatedProviderCostUsd: 0,
    platformCostBufferUsd: 0,
    stripeAllocationUsd: 0,
    riskBufferUsd: 0,
    productionAllowed: false,
  }),
});

function allowBootstrapMockPolicies(env = process.env) {
  return env.VIBEFX_ENABLE_MOCK_AI_GATEWAY === "true" || env.FUNCTIONS_EMULATOR === "true";
}

function nonNegativeNumber(value, fallback = 0) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error("cost_invalid");
  }
  return number;
}

function ratioNumber(value, fallback = 0) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number) || number < 0 || number >= 1) {
    throw new Error("margin_invalid");
  }
  return number;
}

function scoreNumber(value, fallback) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number) || number < 0 || number > 1) {
    throw new Error("score_invalid");
  }
  return number;
}

function defaultQualityScore(quality) {
  if (quality === "premium") return 0.9;
  if (quality === "standard") return 0.7;
  return 0.45;
}

function normalizeRouteCandidates(data = {}) {
  const rawCandidates = Array.isArray(data.routeCandidates) && data.routeCandidates.length
    ? data.routeCandidates
    : [{
      id: "primary",
      provider: data.provider,
      model: data.model,
      modality: data.modality,
      quality: data.quality,
      productionAllowed: data.productionAllowed,
    }];

  return rawCandidates.map((candidate, index) => {
    const provider = String(candidate.provider || "").trim();
    const model = String(candidate.model || "").trim();
    if (!provider || !model) {
      throw new Error("provider_model_missing");
    }
    const quality = String(candidate.quality || data.quality || "draft");
    return {
      id: String(candidate.id || `${provider}_${model}_${index}`).slice(0, 96),
      provider,
      model,
      modality: String(candidate.modality || data.modality || "text"),
      quality,
      productionAllowed: candidate.productionAllowed === true,
      qualityScore: scoreNumber(candidate.qualityScore, defaultQualityScore(quality)),
      latencyScore: scoreNumber(candidate.latencyScore, 0.5),
      reliabilityScore: scoreNumber(candidate.reliabilityScore, 0.5),
      legalSafetyScore: candidate.legalSafetyScore == null
        ? null
        : scoreNumber(candidate.legalSafetyScore, 0.5),
      notes: candidate.notes ? String(candidate.notes).slice(0, 500) : "",
    };
  });
}

function calculatePricingPolicyEconomics(data = {}) {
  const creditsCharged = Number(data.creditsCharged);
  const creditUnitValueUsd = nonNegativeNumber(data.creditUnitValueUsd, 0.01);
  if (!Number.isInteger(creditsCharged) || creditsCharged <= 0) {
    throw new Error("credits_invalid");
  }
  if (creditUnitValueUsd <= 0 || creditUnitValueUsd > 1000) {
    throw new Error("credit_unit_invalid");
  }
  const estimatedProviderCostUsd = nonNegativeNumber(data.estimatedProviderCostUsd, 0);
  const platformCostBufferUsd = nonNegativeNumber(data.platformCostBufferUsd, 0);
  const stripeAllocationUsd = nonNegativeNumber(data.stripeAllocationUsd, 0);
  const riskBufferUsd = nonNegativeNumber(data.riskBufferUsd, 0);
  const targetGrossMargin = ratioNumber(data.targetGrossMargin, 0);
  const clientPriceUsd = creditsCharged * creditUnitValueUsd;
  const estimatedInternalCostUsd =
    estimatedProviderCostUsd + platformCostBufferUsd + stripeAllocationUsd + riskBufferUsd;
  const estimatedGrossMargin = clientPriceUsd > 0
    ? (clientPriceUsd - estimatedInternalCostUsd) / clientPriceUsd
    : -Infinity;
  const minClientPriceUsd = targetGrossMargin < 1
    ? estimatedInternalCostUsd / (1 - targetGrossMargin)
    : Infinity;
  const minCreditsForTargetMargin = Math.max(1, Math.ceil(minClientPriceUsd / creditUnitValueUsd));

  return {
    creditUnitValueUsd,
    estimatedProviderCostUsd,
    platformCostBufferUsd,
    stripeAllocationUsd,
    riskBufferUsd,
    estimatedInternalCostUsd,
    estimatedClientPriceUsd: clientPriceUsd,
    estimatedGrossMargin,
    targetGrossMargin,
    minClientPriceUsd,
    minCreditsForTargetMargin,
    marginSatisfied: estimatedGrossMargin >= targetGrossMargin,
  };
}

function normalizePricingPolicy(feature, data = {}) {
  const creditsCharged = Number(data.creditsCharged);
  const maxInputChars = Number(data.maxInputChars);
  if (!feature || typeof feature !== "string") {
    throw new Error("feature_missing");
  }
  if (data.enabled !== true) {
    throw new Error("policy_disabled");
  }
  if (!Number.isInteger(creditsCharged) || creditsCharged <= 0 || creditsCharged > 100000) {
    throw new Error("credits_invalid");
  }
  if (!Number.isInteger(maxInputChars) || maxInputChars < 1 || maxInputChars > 50000) {
    throw new Error("max_input_invalid");
  }
  if (!data.provider || !data.model) {
    throw new Error("provider_model_missing");
  }
  const economics = calculatePricingPolicyEconomics({ ...data, creditsCharged });
  const routeCandidates = normalizeRouteCandidates(data);
  if (!economics.marginSatisfied) {
    throw new Error("margin_below_threshold");
  }
  return {
    feature,
    enabled: true,
    provider: String(data.provider),
    model: String(data.model),
    modality: String(data.modality || "text"),
    quality: String(data.quality || "draft"),
    creditsCharged,
    maxInputChars,
    maxOutputChars: Number(data.maxOutputChars || 500),
    ...economics,
    routeCandidates,
    productionAllowed: data.productionAllowed === true,
  };
}

async function loadPricingPolicy(db, feature, env = process.env) {
  const snapshot = await db.collection("aiPricingPolicies").doc(feature).get();
  if (snapshot.exists) {
    return normalizePricingPolicy(feature, snapshot.data());
  }
  const defaultPolicy = DEFAULT_AI_PRICING_POLICIES[feature];
  if (defaultPolicy && allowBootstrapMockPolicies(env)) {
    return normalizePricingPolicy(feature, defaultPolicy);
  }
  throw new Error("policy_missing");
}

function publicAiPolicyCatalog(env = process.env) {
  return Object.values(DEFAULT_AI_PRICING_POLICIES).map((policy) => ({
    feature: policy.feature,
    modality: policy.modality,
    quality: policy.quality,
    creditsCharged: policy.creditsCharged,
    enabled: allowBootstrapMockPolicies(env) && policy.enabled,
    provider: policy.provider,
    productionAllowed: policy.productionAllowed,
    targetGrossMargin: policy.targetGrossMargin,
  }));
}

module.exports = {
  DEFAULT_AI_PRICING_POLICIES,
  allowBootstrapMockPolicies,
  calculatePricingPolicyEconomics,
  normalizeRouteCandidates,
  normalizePricingPolicy,
  loadPricingPolicy,
  publicAiPolicyCatalog,
};
