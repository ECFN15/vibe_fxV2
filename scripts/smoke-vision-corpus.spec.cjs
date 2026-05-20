const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const corpusDir = path.join(process.cwd(), "test-fixtures", "vision-corpus");
const metricsPath = path.join(process.cwd(), "src", "features", "vibefx-studio", "utils", "visionMetrics.js");
const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".avif"];
const requiredCaseIds = [
  "portrait-light",
  "portrait-medium-dark",
  "selfie-interior",
  "landscape-blue-sky",
  "vegetation-green",
  "night-neon",
  "golden-hour",
  "tungsten-interior",
  "saturated-image",
  "hazy-flat",
  "low-light-noise",
  "social-compressed",
];

let measureVisionImageData;
let compareVisionMetrics;

test.beforeAll(() => {
  const metricsSource = fs.readFileSync(metricsPath, "utf8")
    .replace(/export function measureVisionImageData/, "function measureVisionImageData")
    .replace(/export function compareVisionMetrics/, "function compareVisionMetrics");
  const metrics = new Function(`${metricsSource}; return { measureVisionImageData, compareVisionMetrics };`)();
  measureVisionImageData = metrics.measureVisionImageData;
  compareVisionMetrics = metrics.compareVisionMetrics;
});

function findCaseFile(caseId) {
  for (const extension of allowedExtensions) {
    const candidate = path.join(corpusDir, `${caseId}${extension}`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function getPresentCases() {
  return requiredCaseIds
    .map((id) => ({ id, file: findCaseFile(id) }))
    .filter((item) => item.file);
}

async function openStudio(page) {
  await page.goto(`${baseUrl}/studio`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

  const openPreferred = page.getByRole("button", { name: /ouvrir.*mise en page/i }).first();
  const openFallback = page.getByRole("button", { name: /creer.*mise en page/i }).first();
  if (await openPreferred.count()) await openPreferred.click();
  else if (await openFallback.count()) await openFallback.click();

  await expect(page.getByRole("button", { name: /^vision$/i })).toBeVisible({ timeout: 15000 });
}

async function uploadImage(page, file) {
  await page.locator('input[type=file][accept*="image"]').first().setInputFiles(file);
  await page.waitForFunction(() => {
    const canvas = document.querySelector("canvas");
    return canvas && canvas.width > 100 && canvas.height > 100;
  }, null, { timeout: 20000 });
  await page.waitForTimeout(250);
}

async function canvasMetrics(page) {
  const sampled = await page.locator("canvas").evaluate((canvas) => {
    const sampleWidth = Math.max(1, Math.round(canvas.width * 0.25));
    const sampleHeight = Math.max(1, Math.round(canvas.height * 0.25));
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = sampleWidth;
    sampleCanvas.height = sampleHeight;
    const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
    sampleCtx.drawImage(canvas, 0, 0, sampleWidth, sampleHeight);
    const imageData = sampleCtx.getImageData(0, 0, sampleWidth, sampleHeight);
    return {
      width: sampleWidth,
      height: sampleHeight,
      data: Array.from(imageData.data),
    };
  });
  return measureVisionImageData(sampled, { step: 1 });
}

async function openVision(page) {
  await page.getByRole("button", { name: /^vision$/i }).click();
  await expect(page.getByText("Inspirations optiques")).toBeVisible();
}

async function selectVisionBrand(page, brandName) {
  const backButton = page.getByRole("button", { name: /Retour/i }).first();
  if (await backButton.count()) await backButton.click();
  await page.getByRole("button", { name: new RegExp(brandName, "i") }).click();
  await expect(page.getByText("Safe smartphone", { exact: true })).toBeVisible();
}

async function applyVisionProfile(page, profileName) {
  const escaped = profileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await page.getByRole("button", { name: new RegExp(`^${escaped}\\b`, "i") }).click();
  await expect(page.getByText("Actif")).toBeVisible();
  await page.waitForTimeout(300);
}

const profileChecks = [
  { brand: "Fujifilm", profile: "Velvia", maxHighlightClip: 0.075, maxBlackClip: 0.11, maxHighSat: 0.2, maxSkinHueShift: 26, maxNeutralBias: 30 },
  { brand: "Kodak", profile: "Ektar 100", maxHighlightClip: 0.08, maxBlackClip: 0.12, maxHighSat: 0.22, maxSkinHueShift: 28, maxNeutralBias: 32 },
  { brand: "Leica", profile: "Sepia", maxHighlightClip: 0.09, maxBlackClip: 0.14, maxHighSat: 0.16, maxSkinHueShift: 30, maxNeutralBias: 34 },
];

test("Vision local smartphone corpus passes metric guardrails when fixtures are present", async ({ page }) => {
  const presentCases = getPresentCases();
  test.skip(presentCases.length === 0, "No local Vision smartphone corpus files present in test-fixtures/vision-corpus.");

  const consoleIssues = [];
  page.on("console", (message) => {
    if (
      ["error", "warning"].includes(message.type())
      && !message.text().includes("Download the React DevTools")
      && !message.text().includes("willReadFrequently")
    ) {
      consoleIssues.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    consoleIssues.push(`pageerror: ${error.message}`);
  });

  for (const corpusCase of presentCases) {
    await openStudio(page);
    await uploadImage(page, corpusCase.file);
    const sourceMetrics = await canvasMetrics(page);
    await openVision(page);

    for (const check of profileChecks) {
      await selectVisionBrand(page, check.brand);
      await applyVisionProfile(page, check.profile);
      const metrics = await canvasMetrics(page);
      const delta = compareVisionMetrics(sourceMetrics, metrics);
      const label = `${corpusCase.id} / ${check.brand} ${check.profile}`;

      expect(delta.greyVeilRisk, `${label} grey veil`).toBe(false);
      expect(delta.channelClipHighDelta, `${label} highlight clipping`).toBeLessThan(check.maxHighlightClip);
      expect(delta.channelClipLowDelta, `${label} black clipping`).toBeLessThan(check.maxBlackClip);
      expect(delta.highSaturationDelta, `${label} high saturation growth`).toBeLessThan(check.maxHighSat);
      expect(Math.abs(delta.neutralChromaDelta), `${label} neutral pollution`).toBeLessThan(28);
      expect(delta.protectedNeutralBiasDelta, `${label} protected neutral bias`).toBeLessThan(check.maxNeutralBias);
      expect(delta.skinHueShiftDeg, `${label} skin hue shift`).toBeLessThan(check.maxSkinHueShift);
      expect(Math.abs(delta.skinSaturationDelta), `${label} skin saturation shift`).toBeLessThan(0.22);
    }
  }

  expect(consoleIssues).toEqual([]);
});
