const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const desktopVideo = path.join("C:", "Users", "pcpor", "OneDrive", "Bureau", "video", "MVI_0016.MP4");

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

test("VibeCut preserves 60 FPS desktop footage and lets a sideways vertical clip be corrected in 9:16", async ({ page }) => {
  test.skip(!fs.existsSync(desktopVideo), "Desktop video fixture MVI_0016.MP4 is not available locally");

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
  await page.getByTestId("sequence-preset-menu-toggle").click();
  await page.getByTestId("sequence-preset-tiktok").click();
  await expect(page.getByTestId("sequence-preset-menu-toggle")).toContainText("9:16");

  await page.locator('input[type=file][accept="video/*"]').setInputFiles(desktopVideo);
  await page.waitForFunction(() => document.body.innerText.includes("1 CLIP"), null, { timeout: 120000 });

  const clip = page.getByTestId("video-clip-0");
  await expect(clip).toContainText("60 FPS", { timeout: 120000 });
  await expect(clip).not.toContainText("60->30 FPS");

  await page.getByRole("button", { name: /Clip 1: MVI_0016/i }).first().click();
  await expect(page.getByTestId("header-rotate-left")).toBeEnabled();
  await page.getByTestId("header-rotate-left").click();
  await expect(clip).toContainText("270 DEG");

  await page.getByTestId("header-export-fps-select").selectOption("30");
  await expect(page.getByTestId("header-export-fps-select")).toHaveValue("30");
  await page.getByTestId("video-tool-export").click();
  await expect(page.getByTestId("export-fps-select").first()).toHaveValue("30");
  await expect(page.locator("body")).toContainText("Source FPS");
  await expect(page.locator("body")).toContainText("60->30 FPS");

  await page.getByTestId("timeline-speed-0-5").click();
  await expect(page.getByTestId("timeline-speed-0-5")).toHaveAttribute("aria-pressed", "true");
  await expect(clip).toContainText("0.5x");

  const screenshotDir = path.join(os.tmpdir(), `vibecut-desktop-orientation-${Date.now()}`);
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({
    path: path.join(screenshotDir, "vibecut-mvi0016-rotated-60fps-slowmo.png"),
    fullPage: true,
  });

  expect(consoleIssues).toEqual([]);
});
