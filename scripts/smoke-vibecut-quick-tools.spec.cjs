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
