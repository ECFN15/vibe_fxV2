const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const videoDir = path.join(process.cwd(), "videotest");

function getVideoFixtures(limit = 2) {
  if (!fs.existsSync(videoDir)) return [];
  const preferred = ["2026-05-06_18-24-41.mp4", "2026-05-06_18-24-49.mp4"];
  const existing = new Set(fs.readdirSync(videoDir).filter((file) => file.toLowerCase().endsWith(".mp4")));
  const fallback = [...existing].filter((file) => !preferred.includes(file)).sort();
  return [...preferred.filter((file) => existing.has(file)), ...fallback].slice(0, limit).map((file) => path.join(videoDir, file));
}

async function openVibeCut(page) {
  await page.goto(`${baseUrl}/studio`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

  const openPreferred = page.getByRole("button", { name: /ouvrir.*mise en page/i }).first();
  const openFallback = page.getByRole("button", { name: /creer.*mise en page/i }).first();
  if (await openPreferred.count()) await openPreferred.click();
  else if (await openFallback.count()) await openFallback.click();

  const vibeCutTab = page.getByRole("button", { name: /^vibecut$/i });
  await expect(vibeCutTab).toBeVisible({ timeout: 15000 });
  await vibeCutTab.click();
}

test("VibeCut quick panel can create timeline items and the top delete action removes the selected clip", async ({ page }) => {
  const fixtures = getVideoFixtures(2);
  test.skip(fixtures.length < 2, "videotest/*.mp4 fixtures are not available locally");

  await page.setViewportSize({ width: 1440, height: 900 });

  const consoleIssues = [];
  page.on("console", (message) => {
    if (
      ["error", "warning"].includes(message.type())
      && !message.text().includes("Download the React DevTools")
      && !message.text().includes("willReadFrequently")
      && !message.text().includes("Multiple readback operations")
    ) {
      consoleIssues.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleIssues.push(`pageerror: ${error.message}`));

  await openVibeCut(page);
  await page.locator('input[type=file][accept="video/*"]').setInputFiles(fixtures);
  await page.waitForFunction(() => document.body.innerText.includes("2 CLIPS"), null, { timeout: 120000 });

  await expect(page.getByTestId("vibecut-quick-panel")).toBeVisible();
  await expect(page.getByTestId("timeline-delete-selected")).toBeDisabled();

  await page.getByTestId("quick-tool-group-text").click();
  await page.getByTestId("quick-tool-text-title").click();
  await expect(page.locator('[data-track-item-type="text"]').first()).toBeVisible();
  await expect(page.locator("body")).toContainText(/1 texte/i);

  await page.getByTestId("quick-tool-group-animations").click();
  await page.getByTestId("quick-tool-animation-flash").dragTo(page.locator('[data-track-area="transitions"]').first());
  await expect(page.locator('[data-track-item-type="transition"]').first()).toBeVisible();
  await expect(page.locator("body")).toContainText(/1 transition/i);

  await page.getByTestId("quick-tool-group-effects").click();
  await page.getByTestId("quick-tool-effect-cyberpunk").click();
  await expect(page.locator('[data-track-item-type="effect"]').first()).toBeVisible();

  await page.getByRole("button", { name: /Clip 1:/ }).first().click();
  const deleteButton = page.getByTestId("timeline-delete-selected");
  await expect(deleteButton).toBeEnabled();
  await deleteButton.click();
  await expect(page.locator("body")).toContainText(/1 clip/i);

  expect(consoleIssues).toEqual([]);
});

test("VibeCut volet tools keep intro and outro as singletons and shift the video lane", async ({ page }) => {
  const fixtures = getVideoFixtures(1);
  test.skip(fixtures.length < 1, "videotest/*.mp4 fixtures are not available locally");

  await page.setViewportSize({ width: 1440, height: 900 });
  await openVibeCut(page);
  await page.locator('input[type=file][accept="video/*"]').setInputFiles(fixtures);
  await page.waitForFunction(() => document.body.innerText.includes("1 CLIP"), null, { timeout: 120000 });

  const voletItems = page.locator('[data-track-area="volets"] [data-track-item-type="transition"]');
  const transitionItems = page.locator('[data-track-area="transitions"] [data-track-item-type="transition"]');
  const firstVideoClip = page.locator('[data-track-area="video"] [role="button"][aria-label^="Clip 1:"]').first();

  await page.getByTestId("quick-tool-group-volets").click();
  await page.getByTestId("quick-tool-sequence-intro-neon-doors").click();
  await expect(voletItems).toHaveCount(1);
  await expect(transitionItems).toHaveCount(0);
  await expect(page.getByTestId("volet-config-intro")).toBeVisible();
  await expect(page.getByTestId("quick-tool-sequence-intro-neon-doors")).toContainText(/place/i);

  const introDoorsOffset = await firstVideoClip.evaluate((node) => parseFloat(node.style.left || "0"));
  expect(introDoorsOffset).toBeGreaterThan(0);

  await page.getByTestId("quick-tool-sequence-intro-title-scan").click();
  await expect(voletItems).toHaveCount(1);
  await expect(transitionItems).toHaveCount(0);
  await expect(page.getByTestId("quick-tool-sequence-intro-title-scan")).toContainText(/place/i);
  await expect(page.getByTestId("quick-tool-sequence-intro-neon-doors")).toContainText(/remplace/i);
  await expect(page.getByText(/timeline effets entre la video et le texte/i)).not.toBeVisible();

  const introScanOffset = await firstVideoClip.evaluate((node) => parseFloat(node.style.left || "0"));
  expect(introScanOffset).toBeGreaterThan(introDoorsOffset);

  await page.getByTestId("volet-text-intro").fill("INTRO TEST");
  await expect(page.getByTestId("volet-text-intro")).toHaveValue("INTRO TEST");
  await page.getByTestId("volet-duration-intro").fill("1.6");
  await expect(page.getByTestId("volet-duration-intro")).toHaveValue("1.6");
  const editedIntroOffset = await firstVideoClip.evaluate((node) => parseFloat(node.style.left || "0"));
  expect(editedIntroOffset).toBeGreaterThan(introScanOffset);

  await page.getByTestId("quick-tool-sequence-outro-neon-close").click();
  await expect(voletItems).toHaveCount(2);
  await expect(transitionItems).toHaveCount(0);
  await expect(page.getByTestId("volet-config-outro")).toBeVisible();
  await page.getByTestId("quick-tool-sequence-outro-signal-collapse").click();
  await expect(voletItems).toHaveCount(2);
  await expect(transitionItems).toHaveCount(0);
  await expect(page.getByTestId("quick-tool-sequence-outro-signal-collapse")).toContainText(/place/i);
  await expect(page.getByTestId("quick-tool-sequence-outro-neon-close")).toContainText(/remplace/i);
});
