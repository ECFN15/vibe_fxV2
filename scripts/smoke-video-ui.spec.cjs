const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const videoDir = path.join(process.cwd(), "videotest");

const preferredFixtures = [
  "2026-05-06_18-24-41.mp4",
  "2026-05-06_18-24-49.mp4",
  "2026-05-06_18-39-57.mp4",
];
const longFixture = "2026-05-06_18-44-19.mp4";

function getVideoFixtures(limit = 2) {
  if (!fs.existsSync(videoDir)) return [];

  const existing = new Set(fs.readdirSync(videoDir).filter((file) => file.toLowerCase().endsWith(".mp4")));
  const preferred = preferredFixtures.filter((file) => existing.has(file));
  const fallback = [...existing].filter((file) => !preferred.includes(file)).sort();

  return [...preferred, ...fallback].slice(0, limit).map((file) => path.join(videoDir, file));
}

function getNamedFixture(fileName) {
  const fullPath = path.join(videoDir, fileName);
  return fs.existsSync(fullPath) ? fullPath : null;
}

async function openVideoEditor(page) {
  await page.goto(`${baseUrl}/studio`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

  const openPreferred = page.getByRole("button", { name: /ouvrir.*mise en page/i }).first();
  const openFallback = page.getByRole("button", { name: /creer.*mise en page/i }).first();
  if (await openPreferred.count()) await openPreferred.click();
  else if (await openFallback.count()) await openFallback.click();

  const videoTab = page.getByRole("button", { name: /^video$/i });
  await expect(videoTab).toBeVisible({ timeout: 15000 });
  await videoTab.click();
}

async function dragRange(page, locator, ratio) {
  const box = await locator.boundingBox();
  expect(box).toBeTruthy();
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.5, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * ratio, y, { steps: 8 });
  await page.mouse.up();
}

async function canvasMeanLuma(page) {
  return page.locator("canvas").evaluate((canvas) => {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const points = [
      [0.5, 0.5], [0.35, 0.5], [0.65, 0.5],
      [0.5, 0.35], [0.5, 0.65], [0.25, 0.25],
      [0.75, 0.25], [0.25, 0.75], [0.75, 0.75],
    ];
    const values = points.map(([rx, ry]) => {
      const x = Math.max(0, Math.min(canvas.width - 1, Math.floor(canvas.width * rx)));
      const y = Math.max(0, Math.min(canvas.height - 1, Math.floor(canvas.height * ry)));
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      return (pixel[0] + pixel[1] + pixel[2]) / 3;
    });
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  });
}

test("Vibe_CUT edits, reorders, and exports a short montage", async ({ page }) => {
  const fixtures = getVideoFixtures(2);
  test.skip(fixtures.length < 2, "videotest/*.mp4 fixtures are not available locally");

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

  await openVideoEditor(page);
  await page.locator('input[type=file][accept="video/*"]').setInputFiles(fixtures);
  await page.waitForFunction(() => document.body.innerText.includes("2 CLIPS"), null, { timeout: 120000 });
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.getByTestId("sequence-preset-menu-toggle").click();
  await expect(page.getByTestId("sequence-preset-menu")).toBeVisible();
  await page.getByTestId("sequence-preset-instagram-reel").click();
  await expect(page.getByTestId("sequence-preset-menu-toggle")).toContainText("9:16");
  await page.waitForFunction(() => {
    const canvas = document.querySelector("canvas");
    return canvas && Math.abs((canvas.width / canvas.height) - (1080 / 1920)) < 0.02;
  }, null, { timeout: 15000 });
  const sequenceRatio = await page.locator("canvas").evaluate((canvas) => canvas.width / canvas.height);
  expect(Math.abs(sequenceRatio - (1080 / 1920))).toBeLessThan(0.02);

  const firstClipName = path.basename(fixtures[0], ".mp4");
  const secondClipName = path.basename(fixtures[1], ".mp4");
  let clip1 = page.getByRole("button", { name: new RegExp(`Clip 1: ${firstClipName}`) }).first();
  const clip2 = page.getByRole("button", { name: new RegExp(`Clip 2: ${secondClipName}`) }).first();

  const b1 = await clip1.boundingBox();
  const b2 = await clip2.boundingBox();
  expect(b1).toBeTruthy();
  expect(b2).toBeTruthy();
  await page.mouse.move(b2.x + Math.min(b2.width / 2, 80), b2.y + b2.height / 2);
  await page.mouse.down();
  await page.mouse.move(b1.x + b1.width / 2, b1.y + b1.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByRole("button", { name: /Clip 1:/ }).first()).toContainText(secondClipName);
  clip1 = page.getByRole("button", { name: /Clip 1:/ }).first();

  const beforeTrim = await page.getByTestId("video-clip-0").innerText();
  const trimHandle = page.getByTestId("video-clip-0-trim-end");
  const trimBox = await trimHandle.boundingBox();
  expect(trimBox).toBeTruthy();
  await page.mouse.move(trimBox.x + trimBox.width / 2, trimBox.y + trimBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(trimBox.x - 120, trimBox.y + trimBox.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId("video-clip-0")).not.toContainText(beforeTrim);

  await clip1.click();
  const progressBar = page.locator(".h-1.bg-neutral-800.cursor-pointer").first();
  const progressBox = await progressBar.boundingBox();
  expect(progressBox).toBeTruthy();
  await page.mouse.click(progressBox.x + Math.max(80, progressBox.width * 0.08), progressBox.y + progressBox.height / 2);
  await page.getByRole("button", { name: "Couper", exact: true }).click();
  await expect(page.locator("body")).toContainText(/3 clips/i);

  await page.getByRole("button", { name: "Vitesse", exact: true }).click();
  await page.getByRole("button", { name: /2x/i }).click();
  await expect(page.locator("body")).toContainText("2x");

  await page.getByRole("button", { name: "Filtres", exact: true }).click();
  await page.getByRole("button", { name: "Cyberpunk", exact: true }).click();

  await page.mouse.click(progressBox.x + 2, progressBox.y + progressBox.height / 2);
  await page.waitForTimeout(250);
  await canvasMeanLuma(page);

  await page.getByRole("button", { name: "Transition", exact: true }).click();
  await page.getByRole("button", { name: "Light", exact: true }).click();
  await page.getByRole("button", { name: "Flash", exact: true }).click();
  await page.getByLabel("Duree de transition").first().evaluate((input) => {
    input.value = "2";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.locator('[data-track-area="transitions"]')).toContainText(/Flash/i);
  await expect(page.locator("body")).toContainText(/1 transition/i);

  await page.mouse.click(progressBox.x + Math.max(12, progressBox.width * 0.05), progressBox.y + progressBox.height / 2);
  await page.waitForTimeout(350);
  const duringTransitionLuma = await canvasMeanLuma(page);
  expect(Number.isFinite(duringTransitionLuma)).toBe(true);

  const transitionItem = page.locator('[data-track-item-type="transition"]').first();
  const transitionBefore = await transitionItem.boundingBox();
  expect(transitionBefore).toBeTruthy();
  await page.mouse.move(transitionBefore.x + transitionBefore.width / 2, transitionBefore.y + transitionBefore.height / 2);
  await page.mouse.down();
  await page.mouse.move(transitionBefore.x + transitionBefore.width / 2 + 72, transitionBefore.y + transitionBefore.height / 2, { steps: 8 });
  await page.mouse.up();
  const transitionAfter = await transitionItem.boundingBox();
  expect(transitionAfter).toBeTruthy();
  expect(transitionAfter.x).toBeGreaterThan(transitionBefore.x + 24);

  await page.getByRole("button", { name: "Texte", exact: true }).click();
  await page.getByRole("button", { name: /Ajouter un texte/i }).first().click();
  await page.getByPlaceholder("Votre texte...").first().fill("INTRO VIBE CUT");
  await expect(page.getByPlaceholder("Votre texte...").first()).toHaveValue("INTRO VIBE CUT");

  await page.getByRole("button", { name: "Musique", exact: true }).click();
  await page.getByRole("button", { name: /Importer .* dans la timeline/i }).first().click({ force: true });
  await expect(page.locator("body")).toContainText(/1 piste/i);

  await page.getByRole("button", { name: "Audio", exact: true }).click();
  const clipVolume = page.locator('input[aria-label^="Volume du clip"]:visible').first();
  const trackVolume = page.locator('input[aria-label^="Volume de la piste"]:visible').first();
  await dragRange(page, clipVolume, 0.75);
  await dragRange(page, trackVolume, 0.625);
  await expect(page.locator("body")).toContainText(/1[45]\d%/);
  await expect(page.locator("body")).toContainText(/12\d%/);

  await page.getByRole("button", { name: "Exporter", exact: true }).click();
  await expect(page.locator("body")).toContainText("1080 x 1920");
  await expect(page.locator("body")).toContainText("Reel 9:16");
  await page.getByRole("button", { name: "webm", exact: true }).click();
  const downloadPromise = page.waitForEvent("download", { timeout: 120000 });
  await page.getByRole("button", { name: /^Exporter$/ }).first().click();
  const download = await downloadPromise;
  const exportPath = path.join(os.tmpdir(), `vibecut-smoke-${Date.now()}.webm`);
  await download.saveAs(exportPath);
  expect(fs.statSync(exportPath).size).toBeGreaterThan(100_000);

  expect(consoleIssues).toEqual([]);
});

test("Vibe_CUT mobile viewport has no horizontal page overflow", async ({ page }) => {
  const fixtures = getVideoFixtures(2);
  test.skip(fixtures.length < 2, "videotest/*.mp4 fixtures are not available locally");

  await page.setViewportSize({ width: 390, height: 844 });
  await openVideoEditor(page);
  await page.locator('input[type=file][accept="video/*"]').setInputFiles(fixtures);
  await page.waitForFunction(() => document.body.innerText.includes("2 CLIPS"), null, { timeout: 120000 });

  await page.getByRole("button", { name: "Texte", exact: true }).click();
  await expect(page.getByRole("button", { name: /Ajouter un texte/i }).first()).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  expect(overflow).toBe(false);
});

test("Vibe_CUT auto-fits long clips so the trim handle stays reachable", async ({ page }) => {
  const fixture = getNamedFixture(longFixture);
  test.skip(!fixture, `videotest/${longFixture} fixture is not available locally`);

  const consoleIssues = [];
  page.on("console", (message) => {
    if (
      ["error", "warning"].includes(message.type()) &&
      !message.text().includes("Download the React DevTools") &&
      !message.text().includes("Multiple readback operations using getImageData")
    ) {
      consoleIssues.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    consoleIssues.push(`pageerror: ${error.message}`);
  });

  await openVideoEditor(page);
  await page.locator('input[type=file][accept="video/*"]').setInputFiles([fixture]);
  await page.waitForFunction(() => document.body.innerText.includes("1 CLIP"), null, { timeout: 120000 });

  const endHandle = page.getByTestId("video-clip-0-trim-end");
  const endBox = await endHandle.boundingBox();
  expect(endBox).toBeTruthy();
  expect(endBox.x + endBox.width).toBeLessThanOrEqual(page.viewportSize().width);

  const beforeTrim = await page.getByTestId("video-clip-0").innerText();
  const clipBox = await page.getByTestId("video-clip-0").boundingBox();
  expect(clipBox).toBeTruthy();
  await page.mouse.move(clipBox.x + clipBox.width - 3, clipBox.y + clipBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(clipBox.x + clipBox.width - 260, clipBox.y + clipBox.height / 2, { steps: 12 });
  await page.waitForTimeout(150);
  const duringTrimBox = await page.getByTestId("video-clip-0").boundingBox();
  expect(duringTrimBox.width).toBeLessThan(clipBox.width - 80);
  await page.mouse.up();
  const afterTrimBox = await page.getByTestId("video-clip-0").boundingBox();
  await expect(page.getByTestId("video-clip-0")).not.toContainText(beforeTrim);

  await page.mouse.move(afterTrimBox.x + afterTrimBox.width - 3, afterTrimBox.y + afterTrimBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(afterTrimBox.x + afterTrimBox.width + 180, afterTrimBox.y + afterTrimBox.height / 2, { steps: 10 });
  await page.waitForTimeout(150);
  const duringExtendBox = await page.getByTestId("video-clip-0").boundingBox();
  expect(duringExtendBox.width).toBeGreaterThan(afterTrimBox.width + 60);
  await page.mouse.up();

  expect(consoleIssues).toEqual([]);
});
