import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  normalizePricingPolicy,
  calculatePricingPolicyEconomics,
  normalizeRouteCandidates,
  publicAiPolicyCatalog,
  allowBootstrapMockPolicies,
} = require("../functions/src/ai/policies.js");
const { ROUTER_WEIGHTS, routeModel } = require("../functions/src/ai/router.js");
const {
  getProvider,
  publicProviderRegistry,
} = require("../functions/src/ai/providerRegistry.js");
const {
  cleanPrompt,
  aiJobId,
  normalizeIpHash,
  rateLimitDocId,
  requireClientRequestId,
  requireFeature,
} = require("../functions/src/ai/jobUtils.js");
const { clampText } = require("../functions/src/ai/mockProvider.js");

const envEnabled = { VIBEFX_ENABLE_MOCK_AI_GATEWAY: "true" };
const envDisabled = { VIBEFX_ENABLE_MOCK_AI_GATEWAY: "false" };

assert.equal(allowBootstrapMockPolicies(envEnabled), true);
assert.equal(allowBootstrapMockPolicies(envDisabled), false);

const catalog = publicAiPolicyCatalog(envEnabled);
assert.ok(catalog.some((policy) => policy.feature === "text.caption.draft" && policy.creditsCharged === 1));
assert.ok(catalog.every((policy) => policy.provider === "mock"));
assert.ok(catalog.every((policy) => policy.productionAllowed === false));
assert.ok(catalog.every((policy) => policy.targetGrossMargin >= 0.7));

const healthyEconomics = calculatePricingPolicyEconomics({
  creditsCharged: 10,
  creditUnitValueUsd: 0.01,
  estimatedProviderCostUsd: 0.02,
  platformCostBufferUsd: 0.005,
  stripeAllocationUsd: 0.005,
  riskBufferUsd: 0.01,
  targetGrossMargin: 0.55,
});
assert.equal(healthyEconomics.estimatedClientPriceUsd, 0.1);
assert.equal(healthyEconomics.estimatedInternalCostUsd, 0.04);
assert.equal(healthyEconomics.marginSatisfied, true);
assert.equal(healthyEconomics.minCreditsForTargetMargin, 9);

assert.equal(calculatePricingPolicyEconomics({
  creditsCharged: 4,
  creditUnitValueUsd: 0.01,
  estimatedProviderCostUsd: 0.035,
  platformCostBufferUsd: 0.005,
  targetGrossMargin: 0.55,
}).marginSatisfied, false);
assert.equal(ROUTER_WEIGHTS.quality, 0.35);
assert.equal(ROUTER_WEIGHTS.margin, 0.25);
assert.equal(ROUTER_WEIGHTS.latency, 0.15);
assert.equal(ROUTER_WEIGHTS.reliability, 0.15);
assert.equal(ROUTER_WEIGHTS.legalSafety, 0.10);

const policy = normalizePricingPolicy("text.caption.draft", {
  enabled: true,
  provider: "mock",
  model: "mock-caption-v1",
  modality: "text",
  quality: "draft",
  creditsCharged: 1,
  maxInputChars: 1200,
  targetGrossMargin: 0.7,
  estimatedProviderCostUsd: 0,
});
assert.equal(policy.estimatedGrossMargin, 1);
assert.equal(policy.minCreditsForTargetMargin, 1);
assert.equal(policy.routeCandidates.length, 1);
assert.equal(policy.routeCandidates[0].provider, "mock");

const normalizedCandidates = normalizeRouteCandidates({
  provider: "mock",
  model: "mock-caption-v1",
  modality: "text",
  quality: "draft",
  routeCandidates: [{
    id: "fallback-fast",
    provider: "gemini",
    model: "example-fast",
    modality: "text",
    quality: "draft",
    qualityScore: 0.7,
    latencyScore: 0.9,
    reliabilityScore: 0.65,
    legalSafetyScore: 0.8,
  }],
});
assert.equal(normalizedCandidates[0].id, "fallback-fast");
assert.equal(normalizedCandidates[0].latencyScore, 0.9);

assert.throws(
  () => normalizePricingPolicy("text.image.standard", {
    enabled: true,
    provider: "openai",
    model: "example-image-model",
    modality: "image",
    quality: "standard",
    creditsCharged: 2,
    maxInputChars: 1200,
    creditUnitValueUsd: 0.01,
    estimatedProviderCostUsd: 0.05,
    targetGrossMargin: 0.55,
  }),
  /margin_below_threshold/
);

const route = routeModel(policy, { productionRuntime: false });
assert.equal(route.provider, "mock");
assert.throws(() => routeModel(policy, { productionRuntime: true }), /provider_not_allowed_in_production/);

const scoredPolicy = normalizePricingPolicy("text.caption.draft", {
  enabled: true,
  provider: "mock",
  model: "mock-caption-v1",
  modality: "text",
  quality: "draft",
  creditsCharged: 10,
  maxInputChars: 1200,
  targetGrossMargin: 0.55,
  estimatedProviderCostUsd: 0.02,
  platformCostBufferUsd: 0.005,
  stripeAllocationUsd: 0.005,
  riskBufferUsd: 0.01,
  routeCandidates: [
    {
      id: "blocked-reference",
      provider: "midjourney",
      model: "not-used",
      modality: "image",
      qualityScore: 1,
      latencyScore: 1,
      reliabilityScore: 1,
      legalSafetyScore: 0,
    },
    {
      id: "safe-slower",
      provider: "openai",
      model: "example-openai-text",
      modality: "text",
      qualityScore: 0.9,
      latencyScore: 0.4,
      reliabilityScore: 0.8,
      legalSafetyScore: 0.95,
    },
    {
      id: "fast-balanced",
      provider: "gemini",
      model: "example-gemini-text",
      modality: "text",
      qualityScore: 0.82,
      latencyScore: 0.95,
      reliabilityScore: 0.82,
      legalSafetyScore: 0.9,
    },
  ],
});
const scoredRoute = routeModel(scoredPolicy, { productionRuntime: false });
assert.equal(scoredRoute.provider, "gemini");
assert.equal(scoredRoute.model, "example-gemini-text");
assert.equal(scoredRoute.routeCandidateId, "fast-balanced");
assert.ok(scoredRoute.routeScore > 0.7);
assert.ok(scoredRoute.rejectedCandidates.some((candidate) => candidate.provider === "midjourney"));

assert.equal(getProvider("midjourney").status, "blocked");
assert.equal(getProvider("civitai").productionAllowed, false);
assert.ok(getProvider("openai").modalities.includes("image"));
assert.throws(
  () => routeModel({
    ...policy,
    provider: "midjourney",
    model: "not-used",
    modality: "image",
    productionAllowed: false,
    routeCandidates: [{
      id: "only-blocked",
      provider: "midjourney",
      model: "not-used",
      modality: "image",
      quality: "premium",
    }],
  }, { productionRuntime: false }),
  /provider_blocked/
);

const providerCatalog = publicProviderRegistry();
assert.ok(providerCatalog.length >= 20);
assert.ok(providerCatalog.some((provider) => provider.id === "openrouter" && provider.access === "router"));
assert.ok(providerCatalog.some((provider) => provider.id === "bytedance_seed" && provider.legalRisk === "high"));
assert.ok(providerCatalog.every((provider) => provider.productionAllowed === false));

assert.equal(requireFeature("text.caption.draft"), "text.caption.draft");
assert.equal(requireClientRequestId("request_123456"), "request_123456");
assert.throws(() => requireFeature("../bad"), /feature_invalid/);
assert.throws(() => requireClientRequestId("short"), /client_request_id_invalid/);

assert.equal(cleanPrompt("  hello   world ", 20), "hello world");
assert.throws(() => cleanPrompt("", 20), /prompt_empty/);
assert.throws(() => cleanPrompt("x".repeat(21), 20), /prompt_too_long/);

assert.equal(aiJobId("uid", "text.caption.draft", "request_123456").length, 40);
assert.equal(rateLimitDocId("uid", "text.caption.draft", new Date("2026-05-20T12:34:56Z")).length, 40);
assert.equal(normalizeIpHash("203.0.113.4").length, 32);
assert.notEqual(normalizeIpHash("203.0.113.4"), "203.0.113.4");
assert.equal(normalizeIpHash(normalizeIpHash("203.0.113.4")), normalizeIpHash("203.0.113.4"));
assert.equal(
  rateLimitDocId("uid", "text.caption.draft", new Date("2026-05-20T12:34:56Z"), "203.0.113.4"),
  rateLimitDocId("uid", "text.caption.draft", new Date("2026-05-20T12:34:56Z"), normalizeIpHash("203.0.113.4"))
);
assert.notEqual(
  rateLimitDocId("uid", "text.caption.draft", new Date("2026-05-20T12:34:56Z"), "203.0.113.4"),
  rateLimitDocId("uid", "text.caption.draft", new Date("2026-05-20T12:34:56Z"), "203.0.113.5")
);
assert.equal(clampText("a b   c", 10), "a b c");
assert.ok(clampText("x".repeat(20), 8).length <= 8);

console.log("ai gateway smoke test OK");
