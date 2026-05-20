const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const demoImage = path.join(process.cwd(), "public", "assets", "vibefx", "demo-astronaut.png");
const metricsPath = path.join(process.cwd(), "src", "features", "vibefx-studio", "utils", "visionMetrics.js");
const syntheticVisionSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640">
  <defs>
    <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#78b8f2"/>
      <stop offset="1" stop-color="#eaf4ff"/>
    </linearGradient>
    <linearGradient id="neutral" x1="0" x2="1">
      <stop offset="0" stop-color="#101010"/>
      <stop offset=".18" stop-color="#343434"/>
      <stop offset=".5" stop-color="#888888"/>
      <stop offset=".82" stop-color="#d5d5d5"/>
      <stop offset="1" stop-color="#fbfbfb"/>
    </linearGradient>
    <linearGradient id="warmRoom" x1="0" x2="1">
      <stop offset="0" stop-color="#5c3b2d"/>
      <stop offset="1" stop-color="#e1b06f"/>
    </linearGradient>
  </defs>
  <rect width="960" height="640" fill="#151515"/>
  <rect x="0" y="0" width="960" height="170" fill="url(#sky)"/>
  <rect x="0" y="170" width="960" height="82" fill="url(#neutral)"/>
  <rect x="0" y="252" width="320" height="388" fill="#2d6f3a"/>
  <rect x="320" y="252" width="320" height="388" fill="url(#warmRoom)"/>
  <rect x="640" y="252" width="320" height="388" fill="#111623"/>
  <circle cx="418" cy="368" r="74" fill="#e8b18e"/>
  <circle cx="515" cy="368" r="74" fill="#9b5f47"/>
  <circle cx="611" cy="368" r="74" fill="#5a352b"/>
  <rect x="44" y="302" width="72" height="104" fill="#4aa34d"/>
  <rect x="132" y="302" width="72" height="104" fill="#74bb42"/>
  <rect x="220" y="302" width="72" height="104" fill="#205f2d"/>
  <rect x="688" y="306" width="72" height="108" fill="#ff2b78"/>
  <rect x="776" y="306" width="72" height="108" fill="#25d8ff"/>
  <rect x="864" y="306" width="72" height="108" fill="#ffe75a"/>
  <rect x="42" y="470" width="252" height="80" fill="#d64532"/>
  <rect x="354" y="470" width="252" height="80" fill="#eee7d8"/>
  <rect x="680" y="470" width="248" height="80" fill="#050505"/>
  <circle cx="804" cy="510" r="32" fill="#ffffff"/>
</svg>`;

let measureVisionImageData;
let compareVisionMetrics;

test.setTimeout(60000);

test.beforeAll(() => {
  const metricsSource = fs.readFileSync(metricsPath, "utf8")
    .replace(/export function measureVisionImageData/, "function measureVisionImageData")
    .replace(/export function compareVisionMetrics/, "function compareVisionMetrics");
  const metrics = new Function(`${metricsSource}; return { measureVisionImageData, compareVisionMetrics };`)();
  measureVisionImageData = metrics.measureVisionImageData;
  compareVisionMetrics = metrics.compareVisionMetrics;
});

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
  await page.waitForTimeout(200);
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
  await page.waitForTimeout(250);
}

async function canvasFingerprint(page) {
  return page.locator("canvas").evaluate((canvas) => {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const points = [
      [0.18, 0.18], [0.5, 0.18], [0.82, 0.18],
      [0.18, 0.5], [0.5, 0.5], [0.82, 0.5],
      [0.18, 0.82], [0.5, 0.82], [0.82, 0.82],
    ];
    return points.flatMap(([rx, ry]) => {
      const x = Math.max(0, Math.min(canvas.width - 1, Math.floor(canvas.width * rx)));
      const y = Math.max(0, Math.min(canvas.height - 1, Math.floor(canvas.height * ry)));
      return Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3));
    });
  });
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

async function regionSaturation(page, region) {
  return page.locator("canvas").evaluate((canvas, regionArg) => {
    function rgbToHsl(r, g, b) {
      const rn = r / 255;
      const gn = g / 255;
      const bn = b / 255;
      const max = Math.max(rn, gn, bn);
      const min = Math.min(rn, gn, bn);
      const delta = max - min;
      const lightness = (max + min) / 2;
      const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
      return Math.max(0, Math.min(1, saturation || 0));
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const x = Math.round(canvas.width * regionArg.x);
    const y = Math.round(canvas.height * regionArg.y);
    const width = Math.max(1, Math.round(canvas.width * regionArg.width));
    const height = Math.max(1, Math.round(canvas.height * regionArg.height));
    const imageData = ctx.getImageData(x, y, width, height);
    let total = 0;
    let pixels = 0;
    for (let index = 0; index < imageData.data.length; index += 16) {
      const r = imageData.data[index];
      const g = imageData.data[index + 1];
      const b = imageData.data[index + 2];
      const alpha = imageData.data[index + 3];
      if (alpha === 0) continue;
      total += rgbToHsl(r, g, b);
      pixels += 1;
    }
    return pixels ? total / pixels : 0;
  }, region);
}

function l1Distance(a, b) {
  return a.reduce((sum, value, index) => sum + Math.abs(value - b[index]), 0);
}

test("Vision applies a safe smartphone profile with active state and intensity reset", async ({ page }) => {
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

  await openStudio(page);
  await uploadImage(page, demoImage);

  const sourceFingerprint = await canvasFingerprint(page);
  const sourceMetrics = await canvasMetrics(page);

  await openVision(page);
  await selectVisionBrand(page, "Fujifilm");

  const velviaPreview = page.getByTestId("vision-preview-fujifilm:Velvia");
  const astiaPreview = page.getByTestId("vision-preview-fujifilm:Astia");
  await expect(velviaPreview).toBeVisible({ timeout: 10000 });
  await expect(astiaPreview).toBeVisible({ timeout: 10000 });
  const velviaPreviewSrc = await velviaPreview.getAttribute("src");
  const astiaPreviewSrc = await astiaPreview.getAttribute("src");
  expect(velviaPreviewSrc).toMatch(/^data:image\/jpeg/);
  expect(astiaPreviewSrc).toMatch(/^data:image\/jpeg/);
  expect(velviaPreviewSrc).not.toEqual(astiaPreviewSrc);

  await expect(page.getByTestId("vision-profile-search")).toBeVisible();
  await page.getByTestId("vision-profile-search").fill("velvia");
  await expect(page.getByRole("button", { name: /^Velvia\b/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Astia\b/i })).toHaveCount(0);
  await page.getByTestId("vision-profile-search").fill("");

  await page.getByTestId("vision-family-landscape-vivid-safe").click();
  await expect(page.getByRole("button", { name: /^Velvia\b/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Astia\b/i })).toHaveCount(0);
  await page.getByTestId("vision-family-all").click();

  await page.getByTestId("vision-favorite-fujifilm:Velvia").click();
  await expect(page.getByTestId("vision-favorite-fujifilm:Velvia")).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("vibefx.vision.favoriteProfiles") || "[]"))).toContain("fujifilm:Velvia");
  await page.getByTestId("vision-favorite-filter").click();
  await expect(page.getByRole("button", { name: /^Velvia\b/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Astia\b/i })).toHaveCount(0);
  await page.getByTestId("vision-favorite-filter").click();

  await expect(page.getByTestId("vision-simple-controls")).toBeVisible();
  await page.getByTestId("vision-simple-warmth-number").fill("12");
  await expect(page.getByTestId("vision-simple-warmth-number")).toHaveValue("12");
  await page.getByTestId("vision-mode-expert").click();
  await expect(page.getByTestId("vision-expert-controls")).toBeVisible();
  await page.getByTestId("vision-expert-clarity-number").fill("18");
  await expect(page.getByTestId("vision-expert-clarity-number")).toHaveValue("18");
  await page.getByTestId("vision-expert-halation-number").fill("16");
  await expect(page.getByTestId("vision-expert-halation-number")).toHaveValue("16");
  await page.getByTestId("vision-expert-faded-blacks-number").fill("6");
  await expect(page.getByTestId("vision-expert-faded-blacks-number")).toHaveValue("6");
  await page.getByTestId("vision-expert-shadow-tint-number").fill("9");
  await expect(page.getByTestId("vision-expert-shadow-tint-number")).toHaveValue("9");
  await page.getByTestId("vision-expert-highlight-tint-number").fill("7");
  await expect(page.getByTestId("vision-expert-highlight-tint-number")).toHaveValue("7");
  await expect(page.getByTestId("vision-expert-tone-curve")).toBeVisible();
  await page.getByTestId("vision-expert-curve-mids-number").fill("12");
  await expect(page.getByTestId("vision-expert-curve-mids-number")).toHaveValue("12");
  await page.getByTestId("vision-expert-curve-whites-number").fill("-10");
  await expect(page.getByTestId("vision-expert-curve-whites-number")).toHaveValue("-10");
  await expect(page.getByTestId("vision-expert-curve-reset")).toBeEnabled();
  await page.getByTestId("vision-expert-curve-reset").click();
  await expect(page.getByTestId("vision-expert-curve-mids-number")).toHaveValue("0");
  await expect(page.getByTestId("vision-expert-curve-whites-number")).toHaveValue("0");
  await page.getByTestId("vision-expert-skin-saturation-number").fill("8");
  await expect(page.getByTestId("vision-expert-skin-saturation-number")).toHaveValue("8");
  await page.getByTestId("vision-expert-sky-saturation-number").fill("-12");
  await expect(page.getByTestId("vision-expert-sky-saturation-number")).toHaveValue("-12");
  await page.getByTestId("vision-expert-foliage-saturation-number").fill("-10");
  await expect(page.getByTestId("vision-expert-foliage-saturation-number")).toHaveValue("-10");
  await page.getByTestId("vision-expert-shadow-color").fill("#123456");
  await expect(page.getByTestId("vision-expert-shadow-color")).toHaveValue("#123456");
  await page.getByTestId("vision-mode-simple").click();
  await expect(page.getByTestId("vision-simple-controls")).toBeVisible();

  await applyVisionProfile(page, "Velvia");
  await expect(page.getByRole("button", { name: /^Velvia\b/i })).toContainText("Landscape Vivid Safe");
  await expect(page.getByTestId("vision-profile-intent-fujifilm:Velvia")).toContainText(/couleur paysage/i);
  await expect(page.getByTestId("vision-profile-safety-fujifilm:Velvia")).toContainText(/safeSmartphone/i);
  await expect(page.getByTestId("vision-profile-technical-fujifilm:Velvia")).toContainText(/saturation 145->120/i);
  await expect(page.getByTestId("vision-profile-intensity-fujifilm:Velvia")).toContainText(/70%/i);
  await expect(page.getByTestId("vision-recommended-intensity")).toContainText(/70%/i);
  await page.getByTestId("vision-mode-expert").click();
  await expect(page.getByTestId("vision-expert-saturation-number")).toHaveValue("120");
  await page.getByTestId("vision-mode-simple").click();
  await expect(page.getByTestId("vision-diagnostics")).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId("vision-diagnostics-status")).toContainText(/OK safe/i);
  await expect(page.getByTestId("vision-diagnostics-performance")).toContainText(/Perf/i);
  await expect(page.getByTestId("vision-diagnostics-performance")).toContainText(/\d+ms/i);
  await expect(page.getByTestId("vision-diagnostics-performance-detail")).toContainText(/Render src/i);
  const fullFingerprint = await canvasFingerprint(page);
  const fullMetrics = await canvasMetrics(page);
  const fullDelta = compareVisionMetrics(sourceMetrics, fullMetrics);
  expect(l1Distance(sourceFingerprint, fullFingerprint)).toBeGreaterThan(20);
  expect(fullDelta.greyVeilRisk).toBe(false);
  expect(fullDelta.channelClipHighDelta).toBeLessThan(0.035);
  expect(fullDelta.crushedBlackDelta).toBeLessThan(0.06);
  expect(fullDelta.highSaturationDelta).toBeLessThan(0.12);
  expect(fullDelta.skinHueShiftDeg).toBeLessThan(24);
  expect(Math.abs(fullDelta.skinSaturationDelta)).toBeLessThan(0.18);
  expect(fullDelta.protectedNeutralBiasDelta).toBeLessThan(26);

  await page.getByTestId("vision-undo").click();
  await expect(page.getByText("Actif")).toHaveCount(0);
  await page.waitForTimeout(250);
  const undoneFingerprint = await canvasFingerprint(page);
  expect(l1Distance(fullFingerprint, undoneFingerprint)).toBeGreaterThan(8);
  await expect(page.getByTestId("vision-redo")).toBeEnabled();
  await page.getByTestId("vision-redo").click();
  await expect(page.getByRole("button", { name: /^Velvia\b/i })).toContainText("Actif");
  await page.waitForTimeout(250);
  const redoneFingerprint = await canvasFingerprint(page);
  expect(l1Distance(fullFingerprint, redoneFingerprint)).toBeLessThan(8);

  await page.getByTestId("vision-apply-recommended-intensity").click();
  await expect(page.getByTestId("vision-intensity-number")).toHaveValue("70");
  await page.getByTestId("vision-intensity-number").fill("100");
  await page.waitForTimeout(250);

  await page.getByTestId("vision-custom-profile-name").fill("Golden Night Safe");
  await page.getByTestId("vision-save-profile").click();
  await expect.poll(async () => page.evaluate(() => {
    const profiles = JSON.parse(localStorage.getItem("vibefx.vision.customProfiles") || "[]");
    const favorites = JSON.parse(localStorage.getItem("vibefx.vision.favoriteProfiles") || "[]");
    return {
      name: profiles[0]?.name,
      family: profiles[0]?.family,
      isFavorite: profiles[0]?.id ? favorites.includes(profiles[0].id) : false,
    };
  })).toMatchObject({
    name: "Golden Night Safe",
    family: "Custom Safe",
    isFavorite: true,
  });
  await expect(page.getByTestId("vision-custom-profile-name")).toHaveValue("");
  await page.getByTestId("vision-profile-search").fill("golden night safe");
  await expect(page.getByRole("button", { name: /^Golden Night Safe\b/i })).toBeVisible();
  await page.locator('[data-testid^="vision-delete-custom:"]').first().click();
  await expect.poll(async () => page.evaluate(() => {
    const profiles = JSON.parse(localStorage.getItem("vibefx.vision.customProfiles") || "[]");
    const favorites = JSON.parse(localStorage.getItem("vibefx.vision.favoriteProfiles") || "[]");
    return {
      profilesCount: profiles.length,
      customFavorites: favorites.filter((item) => item.startsWith("custom:")).length,
    };
  })).toEqual({
    profilesCount: 0,
    customFavorites: 0,
  });
  await expect(page.getByRole("button", { name: /^Golden Night Safe\b/i })).toHaveCount(0);
  await page.getByTestId("vision-profile-search").fill("");

  await page.getByTestId("vision-split-toggle").click();
  await expect(page.getByTestId("vision-split-controls")).toBeVisible();
  await expect(page.getByTestId("vision-split-overlay")).toBeVisible({ timeout: 10000 });
  await page.getByTestId("vision-split-range").fill("65");
  await expect(page.getByTestId("vision-split-range")).toHaveValue("65");

  const beforeButton = page.getByTestId("vision-before-hold");
  await beforeButton.hover();
  await page.mouse.down();
  await expect(beforeButton).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(250);
  const heldBeforeFingerprint = await canvasFingerprint(page);
  expect(l1Distance(sourceFingerprint, heldBeforeFingerprint)).toBeLessThan(8);

  await page.mouse.up();
  await expect(beforeButton).toHaveAttribute("aria-pressed", "false");
  await page.waitForTimeout(250);
  const restoredFingerprint = await canvasFingerprint(page);
  expect(l1Distance(fullFingerprint, restoredFingerprint)).toBeLessThan(8);

  await page.getByTestId("vision-intensity-number").fill("50");
  await page.waitForTimeout(250);
  const midFingerprint = await canvasFingerprint(page);
  expect(l1Distance(sourceFingerprint, midFingerprint)).toBeGreaterThan(10);
  expect(l1Distance(sourceFingerprint, midFingerprint)).toBeLessThan(l1Distance(sourceFingerprint, fullFingerprint));
  expect(l1Distance(fullFingerprint, midFingerprint)).toBeGreaterThan(6);

  await page.getByTestId("vision-intensity-number").fill("0");
  await page.waitForTimeout(250);
  const zeroFingerprint = await canvasFingerprint(page);
  const zeroMetrics = await canvasMetrics(page);
  const zeroDelta = compareVisionMetrics(sourceMetrics, zeroMetrics);
  expect(l1Distance(sourceFingerprint, zeroFingerprint)).toBeLessThan(8);
  expect(Math.abs(zeroDelta.meanLumaDelta)).toBeLessThan(1.2);
  expect(Math.abs(zeroDelta.saturationDelta)).toBeLessThan(0.015);
  expect(Math.abs(zeroDelta.channelClipHighDelta)).toBeLessThan(0.006);

  await page.getByRole("button", { name: /Reset Vision/i }).click();
  await expect(page.getByText("Actif")).toHaveCount(0);
  await expect(page.getByTestId("vision-split-overlay")).toHaveCount(0);

  expect(consoleIssues).toEqual([]);
});

test("Vision guardrails keep synthetic smartphone-like colors usable across risky profiles", async ({ page }) => {
  await openStudio(page);
  await uploadImage(page, {
    name: "vision-synthetic-smartphone.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(syntheticVisionSvg),
  });

  const sourceMetrics = await canvasMetrics(page);
  await openVision(page);

  const profileChecks = [
    { brand: "Fujifilm", profile: "Velvia" },
    { brand: "Kodak", profile: "Ektar 100" },
    { brand: "Leica", profile: "Sepia" },
  ];

  for (const check of profileChecks) {
    await selectVisionBrand(page, check.brand);
    await applyVisionProfile(page, check.profile);
    const metrics = await canvasMetrics(page);
    const delta = compareVisionMetrics(sourceMetrics, metrics);
    expect(delta.greyVeilRisk, `${check.brand} ${check.profile} should not create grey veil`).toBe(false);
    expect(delta.channelClipHighDelta, `${check.brand} ${check.profile} highlight clipping`).toBeLessThan(0.08);
    expect(delta.channelClipLowDelta, `${check.brand} ${check.profile} black clipping`).toBeLessThan(0.12);
    expect(delta.highSaturationDelta, `${check.brand} ${check.profile} high saturation growth`).toBeLessThan(0.2);
    expect(Math.abs(delta.neutralChromaDelta), `${check.brand} ${check.profile} neutral pollution`).toBeLessThan(24);
    expect(delta.protectedNeutralBiasDelta, `${check.brand} ${check.profile} protected neutral bias`).toBeLessThan(28);
    expect(delta.skinHueShiftDeg, `${check.brand} ${check.profile} skin hue shift`).toBeLessThan(26);
    expect(Math.abs(delta.skinSaturationDelta), `${check.brand} ${check.profile} skin saturation shift`).toBeLessThan(0.2);
  }
});

test("Vision selective saturation targets skin, sky and foliage regions", async ({ page }) => {
  await openStudio(page);
  await uploadImage(page, {
    name: "vision-selective-saturation.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(syntheticVisionSvg),
  });

  await openVision(page);
  await selectVisionBrand(page, "Fujifilm");
  await page.getByTestId("vision-mode-expert").click();

  const regions = {
    sky: { x: 0.08, y: 0.05, width: 0.82, height: 0.14 },
    neutral: { x: 0.08, y: 0.29, width: 0.82, height: 0.06 },
    foliage: { x: 0.04, y: 0.46, width: 0.26, height: 0.16 },
    skin: { x: 0.37, y: 0.46, width: 0.28, height: 0.18 },
  };

  const base = {
    sky: await regionSaturation(page, regions.sky),
    neutral: await regionSaturation(page, regions.neutral),
    foliage: await regionSaturation(page, regions.foliage),
    skin: await regionSaturation(page, regions.skin),
  };

  await page.getByTestId("vision-expert-skin-saturation-number").fill("15");
  await page.waitForTimeout(200);
  const skinBoost = {
    skin: await regionSaturation(page, regions.skin),
    neutral: await regionSaturation(page, regions.neutral),
  };
  expect(skinBoost.skin).toBeGreaterThan(base.skin + 0.008);
  expect(Math.abs(skinBoost.neutral - base.neutral)).toBeLessThan(0.012);

  await page.getByRole("button", { name: /Reset Vision/i }).click();
  await page.getByTestId("vision-mode-expert").click();
  await page.getByTestId("vision-expert-sky-saturation-number").fill("-30");
  await page.waitForTimeout(200);
  const skyPull = {
    sky: await regionSaturation(page, regions.sky),
    neutral: await regionSaturation(page, regions.neutral),
  };
  expect(skyPull.sky).toBeLessThan(base.sky - 0.015);
  expect(Math.abs(skyPull.neutral - base.neutral)).toBeLessThan(0.012);

  await page.getByRole("button", { name: /Reset Vision/i }).click();
  await page.getByTestId("vision-mode-expert").click();
  await page.getByTestId("vision-expert-foliage-saturation-number").fill("-30");
  await page.waitForTimeout(200);
  const foliagePull = {
    foliage: await regionSaturation(page, regions.foliage),
    neutral: await regionSaturation(page, regions.neutral),
  };
  expect(foliagePull.foliage).toBeLessThan(base.foliage - 0.015);
  expect(Math.abs(foliagePull.neutral - base.neutral)).toBeLessThan(0.012);
});

test("Vision remains usable on mobile without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openStudio(page);
  await uploadImage(page, demoImage);
  await openVision(page);
  await selectVisionBrand(page, "Fujifilm");
  await applyVisionProfile(page, "Velvia");

  await expect(page.getByTestId("vision-before-hold")).toBeVisible();
  await expect(page.getByTestId("vision-intensity-range")).toBeVisible();

  const overflow = await page.evaluate(() => {
    const documentWidth = document.documentElement.scrollWidth;
    const viewportWidth = document.documentElement.clientWidth;
    const overflowingElements = Array.from(document.querySelectorAll("body *"))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && (rect.left < -2 || rect.right > viewportWidth + 2);
      })
      .slice(0, 5)
      .map((element) => ({
        tag: element.tagName,
        className: element.className,
        text: element.textContent?.trim().slice(0, 80),
        left: element.getBoundingClientRect().left,
        right: element.getBoundingClientRect().right,
      }));

    return {
      documentWidth,
      viewportWidth,
      overflowingElements,
    };
  });

  expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth + 2);
  expect(overflow.overflowingElements).toEqual([]);
});
