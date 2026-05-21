const { test, expect } = require("@playwright/test");
const { spawnSync } = require("node:child_process");
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

function probeExportMetadata(filePath) {
  const result = spawnSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration,size,format_name,bit_rate",
    "-show_streams",
    "-of", "json",
    filePath,
  ], { encoding: "utf8" });

  if (result.error?.code === "ENOENT") return null;
  expect(result.status, result.stderr || result.stdout).toBe(0);
  return JSON.parse(result.stdout);
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

async function dragPlayheadFast(page, ratio) {
  const viewport = page.locator("[data-timeline-viewport]").first();
  const playhead = page.getByRole("slider", { name: /deplacer le curseur de timeline/i });
  const viewportBox = await viewport.boundingBox();
  const playheadBox = await playhead.boundingBox();
  expect(viewportBox).toBeTruthy();
  expect(playheadBox).toBeTruthy();

  const targetX = viewportBox.x + viewportBox.width * ratio;
  const y = playheadBox.y + Math.min(28, playheadBox.height / 2);
  await page.mouse.move(playheadBox.x + playheadBox.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(targetX, y, { steps: 3 });
  await page.waitForTimeout(40);

  const liveBox = await playhead.boundingBox();
  expect(liveBox).toBeTruthy();
  expect(Math.abs((liveBox.x + liveBox.width / 2) - targetX)).toBeLessThan(36);
  await page.mouse.move(viewportBox.x + viewportBox.width * Math.max(0.1, ratio - 0.18), y, { steps: 2 });
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
  await expect(page.locator('[data-testid^="clip-audio-waveform-"]').first()).toHaveAttribute("data-waveform-status", /^(pending|ready|unavailable)$/);
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
  await expect(page.getByTestId("video-safe-area-overlay")).toBeVisible();
  const visualTrackOrder = await page.locator("[data-track-area]").evaluateAll((nodes) => nodes
    .map((node) => ({
      area: node.getAttribute("data-track-area"),
      order: Number(node.getAttribute("data-track-order")),
      top: node.getBoundingClientRect().top,
    }))
    .sort((a, b) => a.top - b.top)
  );
  expect(visualTrackOrder.map((track) => track.area)).toEqual(["video", "transitions", "effects", "text", "audio", "music"]);
  expect(visualTrackOrder.map((track) => track.order)).toEqual([10, 20, 30, 40, 50, 60]);
  const textVisibilityToggle = page.getByTestId("track-text-main-visible");
  await expect(textVisibilityToggle).toBeVisible();
  await textVisibilityToggle.click();
  await expect(textVisibilityToggle).toHaveAttribute("aria-label", /Afficher piste Texte/i);
  await textVisibilityToggle.click();
  await expect(textVisibilityToggle).toHaveAttribute("aria-label", /Masquer piste Texte/i);
  const musicMuteToggle = page.getByTestId("track-music-main-mute");
  await musicMuteToggle.click();
  await expect(musicMuteToggle).toHaveAttribute("aria-label", /Activer le son piste Musique/i);
  await musicMuteToggle.click();
  const videoLockToggle = page.getByTestId("track-video-main-lock");
  await videoLockToggle.click();
  await expect(videoLockToggle).toHaveAttribute("aria-label", /Deverrouiller piste Video/i);
  await videoLockToggle.click();

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
  await expect(page.getByTestId("timeline-drop-indicator")).toBeVisible();
  await page.mouse.up();
  await expect(page.getByRole("button", { name: /Clip 1:/ }).first()).toContainText(secondClipName);
  clip1 = page.getByRole("button", { name: /Clip 1:/ }).first();

  const beforeTrim = await page.getByTestId("video-clip-0").innerText();
  const beforeTrimDuration = beforeTrim.match(/\d+:\d+(?:\.\d+)?/)?.[0];
  expect(beforeTrimDuration).toBeTruthy();
  const trimHandle = page.getByTestId("video-clip-0-trim-end");
  const trimBox = await trimHandle.boundingBox();
  expect(trimBox).toBeTruthy();
  await page.mouse.move(trimBox.x + trimBox.width / 2, trimBox.y + trimBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(trimBox.x - 120, trimBox.y + trimBox.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId("video-clip-0")).not.toContainText(beforeTrimDuration);
  await page.locator('button[title="Annuler (Ctrl+Z)"]').click();
  await expect(page.getByTestId("video-clip-0")).toContainText(beforeTrimDuration);
  await page.locator('button[title="Refaire (Ctrl+Shift+Z)"]').click();
  await expect(page.getByTestId("video-clip-0")).not.toContainText(beforeTrimDuration);
  const trimStartInput = page.getByLabel("Timecode trim debut");
  await expect(trimStartInput).toBeVisible();
  await expect(page.getByLabel("Timecode trim fin")).toBeVisible();
  await trimStartInput.fill("0:00.10");
  await page.keyboard.press("Enter");
  await expect(trimStartInput).toHaveValue("0:00.10");

  await clip1.click();
  const progressBar = page.locator(".h-1.bg-neutral-800.cursor-pointer").first();
  const progressBox = await progressBar.boundingBox();
  expect(progressBox).toBeTruthy();
  await page.mouse.click(progressBox.x + Math.max(80, progressBox.width * 0.08), progressBox.y + progressBox.height / 2);
  await page.getByRole("button", { name: "Couper", exact: true }).click();
  await expect(page.locator("body")).toContainText(/3 clips/i);

  const playheadSlider = page.getByRole("slider", { name: /deplacer le curseur de timeline/i });
  await expect(playheadSlider).toBeVisible();
  await page.getByRole("button", { name: "Lire", exact: true }).click();
  await page.waitForTimeout(220);
  await dragPlayheadFast(page, 0.68);
  await expect(playheadSlider).toHaveAttribute("aria-valuenow", /[1-9]/);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const timeAfterDrag = Number(await playheadSlider.getAttribute("aria-valuenow"));
  await playheadSlider.focus();
  await page.keyboard.press("ArrowLeft");
  const timeAfterKeyboardNudge = Number(await playheadSlider.getAttribute("aria-valuenow"));
  expect(timeAfterKeyboardNudge).toBeLessThan(timeAfterDrag);

  await page.getByRole("button", { name: "Vitesse", exact: true }).click();
  await page.getByRole("button", { name: /2x/i }).click();
  await expect(page.locator("body")).toContainText("2x");

  await page.getByRole("button", { name: "Filtres", exact: true }).click();
  await page.getByRole("button", { name: "Cyberpunk", exact: true }).click();
  await expect(page.getByTestId("filter-preview-mode").first()).toHaveText("Apres");
  await page.getByTestId("filter-preview-before").first().click();
  await expect(page.getByTestId("filter-preview-mode").first()).toHaveText("Avant");
  await page.getByRole("button", { name: "Audio", exact: true }).click();
  await page.getByRole("button", { name: "Filtres", exact: true }).click();
  await expect(page.getByTestId("filter-preview-mode").first()).toHaveText("Apres");
  await page.getByTestId("filter-preview-before").first().click();
  await expect(page.getByTestId("filter-preview-mode").first()).toHaveText("Avant");
  await page.getByTestId("filter-preview-after").first().click();
  await expect(page.getByTestId("filter-preview-mode").first()).toHaveText("Apres");
  const effectTrackItem = page.locator('[data-track-item-type="effect"]').first();
  await expect(effectTrackItem).toBeVisible();
  await expect(effectTrackItem).toHaveAttribute("data-track-item-duration", /^\d+\.\d{3}$/);
  const effectLockToggle = page.getByTestId("track-effect-main-lock");
  await effectLockToggle.click();
  await expect(page.getByLabel("Contraste").first()).toBeDisabled();
  await expect(page.getByRole("button", { name: "Soft Dream", exact: true })).toBeDisabled();
  await effectLockToggle.click();
  await expect(page.getByLabel("Contraste").first()).toBeEnabled();

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
  const transitionStartBefore = Number(await transitionItem.getAttribute("data-track-item-start"));
  expect(transitionBefore).toBeTruthy();
  await page.mouse.move(transitionBefore.x + transitionBefore.width / 2, transitionBefore.y + transitionBefore.height / 2);
  await page.mouse.down();
  await page.mouse.move(transitionBefore.x + transitionBefore.width / 2 + 72, transitionBefore.y + transitionBefore.height / 2, { steps: 8 });
  await page.mouse.up();
  const transitionAfter = await transitionItem.boundingBox();
  const transitionStartAfter = Number(await transitionItem.getAttribute("data-track-item-start"));
  expect(transitionAfter).toBeTruthy();
  expect(transitionStartAfter).toBeGreaterThan(transitionStartBefore);
  const itemStartInput = page.getByLabel("Timecode item start");
  const itemDurationInput = page.getByLabel("Timecode item duration");
  await expect(itemStartInput).toBeVisible();
  await expect(itemDurationInput).toBeVisible();
  await itemDurationInput.fill("0:00.70");
  await page.keyboard.press("Enter");
  await expect(itemDurationInput).toHaveValue("0:00.70");
  await expect(transitionItem).toHaveAttribute("data-track-item-duration", /^0\.700$/);
  const transitionPickerItem = page.getByTestId("transition-picker-item").first();
  await expect(transitionPickerItem).toHaveAttribute("data-transition-duration", "0.700");

  const snapToggle = page.getByTestId("timeline-snap-toggle");
  await expect(snapToggle).toBeVisible();
  await expect(snapToggle).toHaveAttribute("aria-pressed", "false");
  await snapToggle.click();
  await expect(snapToggle).toHaveAttribute("aria-pressed", "true");
  const transitionForSnap = await transitionItem.boundingBox();
  expect(transitionForSnap).toBeTruthy();
  await page.mouse.move(transitionForSnap.x + transitionForSnap.width / 2, transitionForSnap.y + transitionForSnap.height / 2);
  await page.mouse.down();
  await page.mouse.move(transitionForSnap.x - transitionForSnap.width, transitionForSnap.y + transitionForSnap.height / 2, { steps: 12 });
  await expect(page.getByTestId("timeline-snap-indicator")).toBeVisible();
  await page.mouse.up();
  const transitionStartSnapped = Number(await transitionItem.getAttribute("data-track-item-start"));
  expect(transitionStartSnapped).toBeLessThanOrEqual(transitionStartAfter);
  await expect(transitionPickerItem).toHaveAttribute("data-transition-start", transitionStartSnapped.toFixed(3));
  await page.getByTestId("track-transition-main-lock").click();
  await expect(itemDurationInput).toBeDisabled();
  await expect(page.getByLabel("Duree de transition").first()).toBeDisabled();
  const lockedTransitionBox = await transitionItem.boundingBox();
  expect(lockedTransitionBox).toBeTruthy();
  await page.mouse.move(lockedTransitionBox.x + lockedTransitionBox.width / 2, lockedTransitionBox.y + lockedTransitionBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(lockedTransitionBox.x + lockedTransitionBox.width / 2 + 90, lockedTransitionBox.y + lockedTransitionBox.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(transitionItem).toHaveAttribute("data-track-item-start", transitionStartSnapped.toFixed(3));
  await expect(page.getByTestId("timeline-edit-notice")).toHaveAttribute("data-timeline-notice-code", "track-locked");
  await page.getByTestId("timeline-edit-notice").click();
  await expect(page.getByTestId("timeline-edit-notice")).toHaveCount(0);

  await page.getByRole("button", { name: "Texte", exact: true }).click();
  await page.getByRole("button", { name: /Ajouter un texte/i }).first().click();
  await page.getByPlaceholder("Votre texte...").first().fill("INTRO VIBE CUT");
  await expect(page.getByPlaceholder("Votre texte...").first()).toHaveValue("INTRO VIBE CUT");

  await page.getByRole("button", { name: "Musique", exact: true }).click();
  await page.getByRole("button", { name: "Starter", exact: true }).click();
  await page.getByRole("button", { name: /Importer .* dans la timeline/i }).first().click({ force: true });
  await expect(page.locator("body")).toContainText(/1 piste/i);
  await expect(page.locator('[data-track-item-type="audio"][data-waveform-status="ready"]').first()).toBeVisible({ timeout: 15000 });

  const clipForAudioBox = await page.getByRole("button", { name: /Clip 1:/ }).first().boundingBox();
  expect(clipForAudioBox).toBeTruthy();
  await page.mouse.click(
    clipForAudioBox.x + Math.min(clipForAudioBox.width - 18, Math.max(20, clipForAudioBox.width * 0.8)),
    clipForAudioBox.y + clipForAudioBox.height / 2
  );
  await page.getByRole("button", { name: "Audio", exact: true }).click();
  const clipVolume = page.locator('input[aria-label^="Volume du clip"]:visible').first();
  const trackVolume = page.locator('input[aria-label^="Volume de la piste"]:visible').first();
  await dragRange(page, clipVolume, 0.75);
  await dragRange(page, trackVolume, 0.625);
  const clipVolumeValue = Number(await clipVolume.inputValue());
  const trackVolumeValue = Number(await trackVolume.inputValue());
  expect(clipVolumeValue).toBeGreaterThanOrEqual(70);
  expect(clipVolumeValue).toBeLessThanOrEqual(100);
  expect(trackVolumeValue).toBeGreaterThanOrEqual(55);
  expect(trackVolumeValue).toBeLessThanOrEqual(100);
  await page.getByTestId("track-music-main-lock").click();
  await expect(trackVolume).toBeDisabled();

  await page.getByRole("button", { name: "Exporter", exact: true }).click();
  await expect(page.locator("body")).toContainText("1080 x 1920");
  await expect(page.locator("body")).toContainText("Reel 9:16");
  await expect(page.getByTestId("export-audio-mix").first()).toHaveText("clips + musique");
  await expect(page.getByTestId("export-frame-guard").first()).toHaveText("actif");
  await expect(page.getByTestId("export-preflight").first()).toHaveAttribute("data-preflight-status", /^(ready|warning)$/);
  await page.getByRole("button", { name: "webm", exact: true }).click();
  const downloadPromise = page.waitForEvent("download", { timeout: 120000 });
  await page.getByRole("button", { name: /^Exporter$/ }).first().click();
  const download = await downloadPromise;
  const exportPath = path.join(os.tmpdir(), `vibecut-smoke-${Date.now()}.webm`);
  await download.saveAs(exportPath);
  expect(fs.statSync(exportPath).size).toBeGreaterThan(100_000);
  const exportMetadata = probeExportMetadata(exportPath);
  if (exportMetadata) {
    const videoStream = exportMetadata.streams.find((stream) => stream.codec_type === "video");
    const audioStream = exportMetadata.streams.find((stream) => stream.codec_type === "audio");
    const duration = Number(exportMetadata.format.duration);
    expect(videoStream?.width).toBe(1080);
    expect(videoStream?.height).toBe(1920);
    expect(audioStream?.codec_type).toBe("audio");
    expect(duration).toBeGreaterThan(8);
    expect(duration).toBeLessThan(25);
  }

  expect(consoleIssues).toEqual([]);
});

test("Vibe_CUT stops failed exports without downloading partial recorder output", async ({ page }) => {
  const fixtures = getVideoFixtures(1);
  test.skip(fixtures.length < 1, "videotest/*.mp4 fixtures are not available locally");

  await page.addInitScript(() => {
    class FailingMediaRecorder {
      static isTypeSupported(type) {
        return typeof type === "string" && type.startsWith("video/webm");
      }

      constructor(stream, options = {}) {
        this.stream = stream;
        this.options = options;
        this.state = "inactive";
        this.ondataavailable = null;
        this.onerror = null;
        this.onstop = null;
      }

      start() {
        this.state = "recording";
        window.setTimeout(() => {
          this.ondataavailable?.({
            data: new Blob(["partial-export"], { type: this.options.mimeType || "video/webm" }),
          });
          this.onerror?.({ error: new Error("simulated recorder failure") });
        }, 30);
      }

      stop() {
        if (this.state === "inactive") return;
        this.state = "inactive";
        window.setTimeout(() => this.onstop?.(), 0);
      }
    }

    window.MediaRecorder = FailingMediaRecorder;
  });

  let downloadFired = false;
  page.on("download", () => {
    downloadFired = true;
  });

  await openVideoEditor(page);
  await page.locator('input[type=file][accept="video/*"]').setInputFiles(fixtures);
  await page.waitForFunction(() => document.body.innerText.includes("1 CLIP"), null, { timeout: 120000 });

  await page.getByRole("button", { name: "Exporter", exact: true }).click();
  await expect(page.getByTestId("export-preflight").first()).toHaveAttribute("data-preflight-status", /^(ready|warning)$/);
  await page.getByRole("button", { name: "webm", exact: true }).click();
  await page.getByRole("button", { name: /^Exporter$/ }).first().click();
  await expect(page.locator("body")).toContainText("Export interrompu: simulated recorder failure", { timeout: 120000 });
  await page.waitForTimeout(750);
  expect(downloadFired).toBe(false);
});

test("Vibe_CUT shows WebM as the real export format when MP4 is unsupported", async ({ page }) => {
  const fixtures = getVideoFixtures(1);
  test.skip(fixtures.length < 1, "videotest/*.mp4 fixtures are not available locally");

  await page.addInitScript(() => {
    class WebmOnlyMediaRecorder {
      static isTypeSupported(type) {
        return typeof type === "string" && type.startsWith("video/webm");
      }

      constructor() {
        this.state = "inactive";
      }

      start() {
        this.state = "recording";
      }

      stop() {
        this.state = "inactive";
      }
    }

    window.MediaRecorder = WebmOnlyMediaRecorder;
  });

  await openVideoEditor(page);
  await page.locator('input[type=file][accept="video/*"]').setInputFiles(fixtures);
  await page.waitForFunction(() => document.body.innerText.includes("1 CLIP"), null, { timeout: 120000 });

  await page.getByRole("button", { name: "Exporter", exact: true }).click();
  await expect(page.getByRole("button", { name: /mp4 indispo/i })).toBeDisabled();
  await expect(page.getByText(/MP4 MediaRecorder n'est pas supporte ici/i).first()).toBeVisible();
  await expect(page.getByTestId("export-effective-format").first()).toHaveText("WEBM");
  await expect(page.getByTestId("export-audio-mix").first()).toHaveText("clips");
  await expect(page.getByTestId("export-frame-guard").first()).toHaveText("actif");
  await expect(page.getByTestId("export-preflight").first()).toHaveAttribute("data-preflight-status", /^(ready|warning)$/);
});

test("Vibe_CUT blocks export preflight when audio mix is unsupported", async ({ page }) => {
  const fixtures = getVideoFixtures(1);
  test.skip(fixtures.length < 1, "videotest/*.mp4 fixtures are not available locally");

  await page.addInitScript(() => {
    Object.defineProperty(window, "AudioContext", { value: undefined, configurable: true });
    Object.defineProperty(window, "webkitAudioContext", { value: undefined, configurable: true });
  });

  await openVideoEditor(page);
  await page.locator('input[type=file][accept="video/*"]').setInputFiles(fixtures);
  await page.waitForFunction(() => document.body.innerText.includes("1 CLIP"), null, { timeout: 120000 });

  await page.getByRole("button", { name: "Exporter", exact: true }).click();
  await expect(page.getByTestId("export-audio-mix").first()).toHaveText("clips");
  await expect(page.getByTestId("export-preflight").first()).toHaveAttribute("data-preflight-status", "blocked");
  await expect(page.getByTestId("export-preflight").first()).toContainText("AudioContext non supporte");
  await expect(page.getByRole("button", { name: "Export bloque" })).toBeDisabled();
});

test("Vibe_CUT mobile viewport keeps essential tools reachable without overflow", async ({ page }) => {
  const fixtures = getVideoFixtures(2);
  test.skip(fixtures.length < 2, "videotest/*.mp4 fixtures are not available locally");

  await page.setViewportSize({ width: 390, height: 640 });
  await openVideoEditor(page);
  await page.locator('input[type=file][accept="video/*"]').setInputFiles(fixtures);
  await page.waitForFunction(() => document.body.innerText.includes("2 CLIPS"), null, { timeout: 120000 });

  const playButton = page.getByRole("button", { name: "Lire" }).first();
  await expect(playButton).toBeVisible();

  const exportTool = page.getByTestId("video-tool-export");
  await expect(exportTool).toBeVisible();
  const exportBox = await exportTool.boundingBox();
  expect(exportBox).toBeTruthy();
  expect(exportBox.x + exportBox.width).toBeLessThanOrEqual(390);
  expect(exportBox.x).toBeGreaterThanOrEqual(0);

  await page.getByRole("button", { name: "Texte", exact: true }).click();
  const mobilePanel = page.getByTestId("video-mobile-panel");
  await expect(mobilePanel).toBeVisible();
  await expect(mobilePanel).toHaveAttribute("data-fullscreen", "false");
  await expect(page.getByRole("button", { name: /Ajouter un texte/i }).first()).toBeVisible();

  const compactPanelBox = await mobilePanel.boundingBox();
  expect(compactPanelBox).toBeTruthy();
  expect(compactPanelBox.height).toBeLessThanOrEqual(640 * 0.52);
  await expect(exportTool).toBeVisible();

  await page.getByTestId("video-mobile-panel-size").click();
  await expect(mobilePanel).toHaveAttribute("data-fullscreen", "true");
  const fullPanelBox = await mobilePanel.boundingBox();
  expect(fullPanelBox).toBeTruthy();
  expect(fullPanelBox.height).toBeGreaterThan(compactPanelBox.height);
  expect(fullPanelBox.y).toBeGreaterThanOrEqual(40);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  expect(overflow).toBe(false);
});

test("Vibe_CUT guides verified free source imports from the music source list", async ({ page }) => {
  await openVideoEditor(page);

  await page.getByRole("button", { name: "Musique", exact: true }).click();
  await expect(page.locator("body")).toContainText("Importer une nouvelle musique gratuite");
  await expect(page.locator("body")).toContainText("Catalogue gratuit agrege");

  await page.getByRole("button", { name: "Sources", exact: true }).click();
  await page.getByRole("button", { name: /Importer cette source/i }).first().click();

  await expect(page.locator("body")).toContainText("Importer une nouvelle musique gratuite");
  await expect(page.locator('input[value="Pixabay Music"]').first()).toBeVisible();
  await expect(page.locator('input[value="Pixabay Content License - import manuel verifie"]').first()).toBeVisible();
  await expect(page.locator("body")).toContainText("Catalogue gratuit agrege");
  await expect(page.getByPlaceholder("https://cdn.pixabay.com/.../track.mp3").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Precharger et ecouter/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Ouvrir/i })).toHaveAttribute("href", "https://pixabay.com/music/");

  const liveSearch = await page.request.get(`${baseUrl}/api/music/free-search?provider=openverse&q=ambient`);
  expect(liveSearch.status()).toBe(200);
  const livePayload = await liveSearch.json();
  expect(Array.isArray(livePayload.providers)).toBe(true);
  expect(livePayload.providers.some((provider) => provider.id === "openverse" && provider.configured)).toBe(true);
  expect(livePayload.tracks.length).toBeGreaterThan(0);
  expect(livePayload.tracks.every((track) => track.downloadAllowed && track.downloadUrl && track.licenseUrl && track.sourceUrl)).toBe(true);

  const liveImport = await page.request.post(`${baseUrl}/api/music/import`, {
    data: { audioUrl: livePayload.tracks[0].downloadUrl },
  });
  expect(liveImport.status()).toBe(200);
  expect(liveImport.headers()["content-type"]).toMatch(/^audio\//);

  const rejectedImport = await page.request.post(`${baseUrl}/api/music/import`, {
    data: { audioUrl: "https://example.com/not-allowed.mp3" },
  });
  expect(rejectedImport.status()).toBe(400);
});

test("Vibe_CUT imports a mocked aggregator result through the preload pipeline", async ({ page }) => {
  const audioFixture = path.join(process.cwd(), "public", "music", "Karl Casey - Virtual Reality.mp3");
  test.skip(!fs.existsSync(audioFixture), "local music fixture is not available");

  const audioBytes = fs.readFileSync(audioFixture);
  await page.route("**/api/music/free-search?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        provider: "all",
        configured: true,
        providers: [
          { id: "openverse", label: "Openverse Audio", configured: true, count: 1, error: "" },
          { id: "jamendo", label: "Jamendo Music", configured: false, count: 0, error: "JAMENDO_CLIENT_ID manquant." },
        ],
        tracks: [
          {
            id: "openverse-smoke-track",
            provider: "openverse",
            title: "Smoke CC Track",
            artist: "Vibe Test Artist",
            duration: 37,
            image: "",
            genre: "ambient",
            previewUrl: "https://prod-1.storage.jamendo.com/?trackid=23557&format=mp32",
            downloadUrl: "https://prod-1.storage.jamendo.com/?trackid=23557&format=mp32",
            downloadAllowed: true,
            sourceName: "Openverse / Jamendo",
            sourceUrl: "https://www.jamendo.com/track/23557",
            license: "Creative Commons BY",
            licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
            attribution: "Smoke CC Track by Vibe Test Artist",
            rightsStatus: "credit-required",
            commercialUse: true,
            socialUse: true,
            contentIdWarning: "Smoke warning: verify source page before publishing.",
            licenseSnapshotVersion: "openverse-smoke",
          },
        ],
      }),
    });
  });
  await page.route("**/api/music/import", async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "audio/mpeg",
        "content-length": String(audioBytes.byteLength),
        "x-vibefx-audio-source-url": "https://prod-1.storage.jamendo.com/?trackid=23557&format=mp32",
      },
      body: audioBytes,
    });
  });

  await openVideoEditor(page);
  await page.getByRole("button", { name: "Musique", exact: true }).click();
  await expect(page.locator("body")).toContainText("Catalogue gratuit agrege");
  const freeCatalogSearch = page.locator("form").filter({
    has: page.getByRole("button", { name: "Chercher", exact: true }),
  }).first();
  await freeCatalogSearch.locator('input[placeholder="mood, genre, artiste..."]').fill("ambient");
  await freeCatalogSearch.getByRole("button", { name: "Chercher", exact: true }).click();
  await expect(page.locator("body")).toContainText("Smoke CC Track");
  await page.getByRole("button", { name: "Precharger", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Importer la piste prechargee" }).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByPlaceholder("Ex: Pixabay Music, Jamendo, client...").first()).toHaveValue("Openverse / Jamendo");
  await expect(page.getByPlaceholder("Nom de la licence ou numero de licence").first()).toHaveValue("Creative Commons BY");
  await page.getByRole("button", { name: "Importer la piste prechargee" }).first().click();
  await expect(page.locator("body")).toContainText(/1 piste/i);
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
