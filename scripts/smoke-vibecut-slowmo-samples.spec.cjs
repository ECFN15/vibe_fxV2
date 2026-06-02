const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const sampleDir = path.join(process.cwd(), "vibecut-video-samples");
const sampleFiles = ["HDRSample.mkv", "SDRSample.mkv"].map((file) => path.join(sampleDir, file));

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

test("VibeCut imports HDR/SDR MKV samples and creates a timeline slow motion clip", async ({ page }) => {
  test.skip(sampleFiles.some((file) => !fs.existsSync(file)), "vibecut-video-samples HDR/SDR fixtures are missing");

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
  await page.locator('input[type=file][accept="video/*"]').setInputFiles(sampleFiles);
  await page.waitForFunction(() => document.body.innerText.includes("2 CLIPS"), null, { timeout: 120000 });

  await expect(page.getByRole("button", { name: /Clip 1: HDRSample/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Clip 2: SDRSample/i }).first()).toBeVisible();
  await expect(page.locator("body")).toContainText("00:23");

  await page.getByRole("button", { name: /Clip 1: HDRSample/i }).first().click();
  await expect(page.getByTestId("timeline-speed-0-5")).toBeEnabled();
  await page.getByTestId("timeline-speed-0-5").click();
  await expect(page.getByTestId("timeline-speed-0-5")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("video-clip-0")).toContainText("0.5x");
  await expect(page.locator("body")).toContainText("00:35");

  await page.getByTestId("timeline-speed-1").click();
  await expect(page.getByTestId("timeline-speed-1")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("video-clip-0")).not.toContainText("0.5x");
  await expect(page.locator("body")).toContainText("00:23");

  expect(consoleIssues).toEqual([]);
});
