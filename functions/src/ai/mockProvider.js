"use strict";

function clampText(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!maxLength || text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

async function runMockProvider({ feature, prompt, policy }) {
  const cleanPrompt = clampText(prompt, policy.maxInputChars);
  if (feature === "text.prompt_rewrite.draft") {
    return {
      outputType: "text",
      text: clampText(`Prompt clarifie: ${cleanPrompt}`, policy.maxOutputChars),
      providerRequestId: `mock_${Date.now()}`,
      estimatedProviderCostUsd: 0,
      actualProviderCostUsd: 0,
    };
  }
  return {
    outputType: "text",
    text: clampText(`Caption draft: ${cleanPrompt}`, policy.maxOutputChars),
    providerRequestId: `mock_${Date.now()}`,
    estimatedProviderCostUsd: 0,
    actualProviderCostUsd: 0,
  };
}

module.exports = {
  clampText,
  runMockProvider,
};
