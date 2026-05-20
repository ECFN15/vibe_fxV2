"use strict";

const {
  PROVIDER_REGISTRY,
  getProvider,
  publicProviderRegistry,
  assertProviderUsable,
} = require("./providerRegistry");

const ROUTER_WEIGHTS = Object.freeze({
  quality: 0.35,
  margin: 0.25,
  latency: 0.15,
  reliability: 0.15,
  legalSafety: 0.10,
});

function clampScore(value, fallback = 0) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, number));
}

function providerLegalSafetyScore(provider) {
  if (provider.legalRisk === "low") return 0.95;
  if (provider.legalRisk === "medium") return 0.55;
  if (provider.legalRisk === "high") return 0.2;
  return 0.4;
}

function scoreRouteCandidate(policy, candidate, provider) {
  const scores = {
    quality: clampScore(candidate.qualityScore, 0.5),
    margin: clampScore(policy.estimatedGrossMargin, 0),
    latency: clampScore(candidate.latencyScore, 0.5),
    reliability: clampScore(candidate.reliabilityScore, provider.reliabilityTier === "test" ? 0.8 : 0.5),
    legalSafety: clampScore(candidate.legalSafetyScore, providerLegalSafetyScore(provider)),
  };
  const score =
    scores.quality * ROUTER_WEIGHTS.quality +
    scores.margin * ROUTER_WEIGHTS.margin +
    scores.latency * ROUTER_WEIGHTS.latency +
    scores.reliability * ROUTER_WEIGHTS.reliability +
    scores.legalSafety * ROUTER_WEIGHTS.legalSafety;
  return { score, scores };
}

function candidatePolicy(policy, candidate) {
  return {
    ...policy,
    provider: candidate.provider,
    model: candidate.model,
    modality: candidate.modality || policy.modality,
    quality: candidate.quality || policy.quality,
    productionAllowed: policy.productionAllowed === true && candidate.productionAllowed === true,
  };
}

function routeModel(policy, options = {}) {
  const candidates = Array.isArray(policy.routeCandidates) && policy.routeCandidates.length
    ? policy.routeCandidates
    : [{
      id: "primary",
      provider: policy.provider,
      model: policy.model,
      modality: policy.modality,
      quality: policy.quality,
      productionAllowed: policy.productionAllowed,
    }];
  const rejected = [];
  const usable = [];

  for (const candidate of candidates) {
    const provider = getProvider(candidate.provider);
    const scopedPolicy = candidatePolicy(policy, candidate);
    try {
      assertProviderUsable(provider, scopedPolicy, options);
      const scored = scoreRouteCandidate(policy, candidate, provider);
      usable.push({ candidate, provider, scopedPolicy, ...scored });
    } catch (error) {
      rejected.push({
        candidateId: candidate.id || candidate.provider || "unknown",
        provider: candidate.provider || null,
        reason: error.message || "provider_rejected",
      });
    }
  }

  if (!usable.length) {
    const firstReason = rejected[0]?.reason || "provider_not_registered";
    throw new Error(firstReason);
  }

  usable.sort((a, b) => b.score - a.score);
  const selected = usable[0];
  const { candidate, provider, scopedPolicy } = selected;
  return {
    provider: provider.id,
    model: candidate.model,
    modality: scopedPolicy.modality,
    quality: scopedPolicy.quality,
    access: provider.access,
    region: provider.region,
    legalRisk: provider.legalRisk,
    status: provider.status,
    productionAllowed: provider.productionAllowed && scopedPolicy.productionAllowed,
    routeCandidateId: candidate.id || null,
    routeScore: Number(selected.score.toFixed(6)),
    routeScores: selected.scores,
    rejectedCandidates: rejected,
  };
}

module.exports = {
  PROVIDER_REGISTRY,
  publicProviderRegistry,
  ROUTER_WEIGHTS,
  scoreRouteCandidate,
  routeModel,
};
