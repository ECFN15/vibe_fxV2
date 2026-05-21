const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";

async function openSoundtrack(page) {
  await page.goto(`${baseUrl}/studio`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  const openPreferred = page.getByRole("button", { name: /creer une mise en page/i }).first();
  if (await openPreferred.count()) await openPreferred.click();
  const soundtrackTab = page.getByRole("button", { name: /^soundtrack$/i });
  await expect(soundtrackTab).toBeVisible({ timeout: 15000 });
  await soundtrackTab.click();
  await expect(page.getByTestId("soundtrack-page")).toBeVisible();
}

async function mockMusicSearch(page) {
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
}

test("Soundtrack opens full screen and keeps favorites/playlists local", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "showDirectoryPicker", {
      value: undefined,
      configurable: true,
    });
  });
  await mockMusicSearch(page);
  let storageCalls = 0;
  await page.route("**firebasestorage.googleapis.com/**", (route) => {
    storageCalls += 1;
    route.abort();
  });

  await openSoundtrack(page);
  await page.getByRole("button", { name: /^chercher$/i }).click();
  await expect(page.getByTestId("soundtrack-track-openverse-smoke-track")).toBeVisible();
  await expect(page.getByText(/Fallback manuel/i)).toBeVisible();

  await page.getByRole("button", { name: /Ajouter Smoke CC Track aux favoris/i }).click();
  await page.getByRole("button", { name: /^favoris$/i }).click();
  await expect(page.getByTestId("soundtrack-track-openverse-smoke-track")).toBeVisible();

  await page.getByPlaceholder("Nouvelle playlist").fill("Launch picks");
  await page.getByRole("button", { name: "Creer playlist" }).click();
  await page.getByRole("button", { name: /Ajouter Smoke CC Track a la playlist active/i }).click();
  await expect(page.locator(".soundtrack-playlist-track", { hasText: "Smoke CC Track" })).toBeVisible();
  await page.getByRole("button", { name: "Retirer piste" }).click();
  await expect(page.locator(".soundtrack-playlist-track", { hasText: "Smoke CC Track" })).toHaveCount(0);

  const manifestPath = path.join(os.tmpdir(), `vibefx-soundtrack-${Date.now()}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify({
    schemaVersion: 1,
    app: "vibe_fx",
    kind: "soundtrack-library",
    updatedAt: new Date().toISOString(),
    tracks: [{
      id: "manifest-missing-track",
      title: "Manifest Missing File",
      provider: "manual",
      sourceName: "Manifest import",
      sourceUrl: "https://example.test/source",
      license: "User declared",
      licenseUrl: "user-declared",
      fileName: "missing-file.mp3",
      favorite: true,
      rightsStatus: "user-declared",
      socialUse: false,
      commercialUse: false,
    }],
    playlists: [{ id: "playlist-restored", name: "Restored list", trackIds: ["manifest-missing-track"], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
    favorites: ["manifest-missing-track"],
  }));
  await page.locator('input[type="file"][accept*=".json"]').setInputFiles(manifestPath);
  await expect(page.getByTestId("soundtrack-track-manifest-missing-track")).toBeVisible();
  await expect(page.getByText("fichier manquant")).toBeVisible();

  expect(storageCalls).toBe(0);
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  test(`Soundtrack responsive viewport ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockMusicSearch(page);
    await openSoundtrack(page);
    await page.getByRole("button", { name: /^chercher$/i }).click();
    await expect(page.getByTestId("soundtrack-track-openverse-smoke-track")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    expect(overflow).toBe(false);
  });
}

test("music import API rejects unsafe audio sources", async ({ page }) => {
  const rejectedImport = await page.request.post(`${baseUrl}/api/music/import`, {
    data: { audioUrl: "https://example.com/not-allowed.mp3" },
  });
  expect(rejectedImport.status()).toBe(400);

  const search = await page.request.get(`${baseUrl}/api/music/free-search?provider=openverse&q=ambient`);
  expect(search.status()).toBe(200);
  const payload = await search.json();
  expect(Array.isArray(payload.providers)).toBe(true);
  expect(payload.providers.some((provider) => provider.id === "openverse")).toBe(true);
});
