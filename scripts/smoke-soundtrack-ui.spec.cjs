const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";

async function openSoundtrack(page) {
  await page.goto(`${baseUrl}/studio?workspace=soundtrack`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await expect(page.getByRole("button", { name: /^soundtrack$/i })).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("soundtrack-page")).toBeVisible({ timeout: 15000 });
}

async function mockMusicSearch(page) {
  const requestUrls = [];
  await page.route("**/api/music/free-search?**", async (route) => {
    requestUrls.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        provider: "openverse",
        configured: true,
        providers: [
          { id: "openverse", label: "Openverse Audio", mediaType: "audio", status: "active", configured: true, count: 2, importable: 1, error: "" },
        ],
        scan: { pages: 1, limit: 8 },
        sourceUrl: "https://docs.openverse.org/api/",
        stats: {
          found: 2,
          importable: 1,
          ignored: 1,
          ignoredReasons: [{ reason: "metadata-only", count: 1 }],
        },
        cache: { status: "live", ttlSeconds: 86400 },
        tracks: [
          {
            id: "openverse-smoke-track",
            provider: "openverse",
            providerTrackId: "openverse-1001",
            title: "Smoke Openverse Track",
            artist: "Openverse Artist",
            duration: 132,
            genre: "ambient",
            tags: ["ambient", "calm"],
            previewUrl: "https://cdn.freesound.org/previews/186/186942_2594536-hq.mp3",
            downloadUrl: "https://cdn.freesound.org/previews/186/186942_2594536-hq.mp3",
            audioUrl: "https://cdn.freesound.org/previews/186/186942_2594536-hq.mp3",
            downloadAllowed: true,
            sourceName: "Openverse / Freesound",
            sourceUrl: "https://freesound.org/people/test/sounds/1001/",
            sourcePageUrl: "https://freesound.org/people/test/sounds/1001/",
            license: "Creative Commons BY",
            licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
            attribution: "Smoke Openverse Track by Openverse Artist",
            rightsStatus: "needs-review",
            commercialUse: true,
            socialUse: true,
            contentIdWarning: "Openverse metadata must be verified upstream.",
            licenseSnapshotVersion: "openverse-smoke",
            importStatus: "importable",
          },
          {
            id: "openverse-metadata-only-track",
            provider: "openverse",
            providerTrackId: "openverse-1002",
            title: "Metadata Only Openverse",
            artist: "Openverse Artist",
            duration: 42,
            tags: ["vlog"],
            sourceName: "Openverse / Freesound",
            sourceUrl: "https://freesound.org/people/test/sounds/1002/",
            sourcePageUrl: "https://freesound.org/people/test/sounds/1002/",
            license: "Creative Commons BY",
            licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
            attribution: "Metadata Only Openverse by Openverse Artist",
            rightsStatus: "needs-review",
            commercialUse: true,
            socialUse: true,
            contentIdWarning: "Openverse metadata must be verified upstream.",
            licenseSnapshotVersion: "openverse-smoke",
            importStatus: "metadata-only",
            blockedReason: "URL audio directe non extraite depuis la page publique; ouverture source requise.",
          },
        ],
      }),
    });
  });
  return requestUrls;
}

async function expectNoGenericPixabayFilters(page) {
  const panel = page.locator(".soundtrack-pixabay-panel");
  await expect(panel.getByText(/^Licence$/i)).toHaveCount(0);
  await expect(panel.getByText(/^BPM$/i)).toHaveCount(0);
  await expect(panel.getByText(/^Recherche morceaux$/i)).toHaveCount(0);
  await expect(panel.getByText(/^Content type$/i)).toHaveCount(0);
  await expect(panel.getByText(/^Genre$/i)).toHaveCount(0);
  await expect(panel.getByText(/^Mood$/i)).toHaveCount(0);
  await expect(panel.getByText(/^Movement$/i)).toHaveCount(0);
  await expect(panel.getByText(/^Theme$/i)).toHaveCount(0);
  await expect(panel.getByText(/^Durée$/i)).toHaveCount(0);
  await expect(panel.getByText(/^Duree$/i)).toHaveCount(0);
  await expect(panel.getByText(/^Pages$/i)).toHaveCount(0);
}

test("Soundtrack opens full screen and keeps favorites/playlists local", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "showDirectoryPicker", {
      value: undefined,
      configurable: true,
    });
  });
  const requestUrls = await mockMusicSearch(page);
  let storageCalls = 0;
  await page.route("**firebasestorage.googleapis.com/**", (route) => {
    storageCalls += 1;
    route.abort();
  });

  await openSoundtrack(page);
  await expect(page.getByText("Playlists projet")).toBeVisible();
  await expect(page.getByPlaceholder("Nouvelle playlist projet")).toBeVisible();
  await expect(page.getByRole("button", { name: "Openverse audio actif" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pixabay Music music scan bloque" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pixabay Music music scan bloque" })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Scanner la categorie Openverse piano/i })).toBeVisible();
  await expect(page.getByText(/Categorie active/i)).toHaveCount(0);
  await expectNoGenericPixabayFilters(page);
  await page.getByRole("button", { name: /Scanner la categorie Openverse piano/i }).click();
  await expect(page.getByTestId("soundtrack-track-openverse-smoke-track")).toBeVisible();
  expect(requestUrls.some((url) => url.includes("provider=openverse") && url.includes("q=piano") && url.includes("category=piano"))).toBe(true);
  await expect(page.getByTestId("soundtrack-track-openverse-metadata-only-track")).toBeVisible();
  await expect(page.getByText(/importables 1/i)).toBeVisible();
  await expect(page.getByText(/Fallback local/i)).toHaveCount(0);
  await expect(page.getByText(/Pistes Vibe_CUT pour/i)).toHaveCount(0);
  const importProjectButton = page.locator('[data-testid="soundtrack-track-openverse-smoke-track"]').getByRole("button", { name: /Importer Smoke Openverse Track/i });
  await expect(importProjectButton).toBeVisible();
  if (await importProjectButton.isDisabled()) {
    await expect(importProjectButton).toContainText(/Projet indispo/i);
  }
  await expect(page.locator('[data-testid="soundtrack-track-openverse-metadata-only-track"]').getByRole("button", { name: /Importer Metadata Only Openverse/i })).toHaveCount(0);
  await expect(page.locator('[data-testid="soundtrack-track-openverse-metadata-only-track"]').getByText(/Source seule/i)).toBeVisible();

  await page.getByRole("button", { name: /Ajouter Smoke Openverse Track aux favoris/i }).click();
  await page.getByRole("button", { name: /^favoris locaux$/i }).click();
  await expect(page.getByTestId("soundtrack-track-openverse-smoke-track")).toBeVisible();

  await page.getByPlaceholder("Nouvelle playlist", { exact: true }).fill("Launch picks");
  await page.getByRole("button", { name: "Creer playlist", exact: true }).click();
  await page.getByRole("button", { name: /Ajouter Smoke Openverse Track a la playlist active/i }).click();
  await expect(page.locator(".soundtrack-playlist-track", { hasText: "Smoke Openverse Track" })).toBeVisible();
  await page.getByRole("button", { name: "Retirer piste" }).click();
  await expect(page.locator(".soundtrack-playlist-track", { hasText: "Smoke Openverse Track" })).toHaveCount(0);

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
    await page.getByRole("button", { name: /Scanner la categorie Openverse chill/i }).click();
    await expect(page.getByTestId("soundtrack-track-openverse-smoke-track")).toBeVisible();
    await expect(page.getByText(/Categorie active/i)).toHaveCount(0);
    await expectNoGenericPixabayFilters(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    expect(overflow).toBe(false);
  });
}

test("provider-unavailable stays empty and never falls back to Vibe_CUT tracks", async ({ page }) => {
  await page.route("**/api/music/free-search?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        provider: "openverse",
        configured: true,
        status: "provider-unavailable",
        providers: [
          {
            id: "openverse",
            label: "Openverse Audio",
            mediaType: "audio",
            status: "provider-unavailable",
            configured: true,
            count: 0,
            importable: 0,
            error: "Openverse temporarily unavailable.",
          },
        ],
        scan: { pages: 1, limit: 8 },
        sourceUrl: "https://docs.openverse.org/api/",
        stats: {
          found: 0,
          importable: 0,
          ignored: 1,
          ignoredReasons: [{ reason: "provider-unavailable", count: 1 }],
        },
        warnings: ["No fake results."],
        cache: { status: "live", ttlSeconds: 86400 },
        tracks: [],
      }),
    });
  });

  await openSoundtrack(page);
  await page.getByRole("button", { name: /Scanner la categorie Openverse piano/i }).click();
  await expect(page.getByText(/Openverse indisponible/i)).toBeVisible();
  await expect(page.getByText(/Pistes Vibe_CUT pour piano/i)).toHaveCount(0);
  await expect(page.getByText(/Fallback local/i)).toHaveCount(0);
  await expect(page.getByTestId("soundtrack-track-starter-andromeda")).toHaveCount(0);
  await expect(page.getByTestId("soundtrack-track-openverse-smoke-track")).toHaveCount(0);
  await expect(page.getByText(/Categorie active/i)).toHaveCount(0);
  await expectNoGenericPixabayFilters(page);
});

test("network error stays empty and does not claim a 403 challenge", async ({ page }) => {
  await page.route("**/api/music/free-search?**", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Openverse network error." }),
    });
  });

  await openSoundtrack(page);
  await page.getByRole("button", { name: /Scanner la categorie Openverse piano/i }).click();
  await expect(page.getByText(/Openverse indisponible/i)).toBeVisible();
  await expect(page.getByText(/Pistes Vibe_CUT pour piano/i)).toHaveCount(0);
  await expect(page.getByText(/challenge 403/i)).toHaveCount(0);
});

test("music import API rejects unsafe audio sources", async ({ page }) => {
  const rejectedImport = await page.request.post(`${baseUrl}/api/music/import`, {
    data: { audioUrl: "https://example.com/not-allowed.mp3" },
  });
  expect(rejectedImport.status()).toBe(400);

  const unauthenticatedProjectImport = await page.request.post(`${baseUrl}/api/music/project/import-url`, {
    data: {
      audioUrl: "https://prod-1.storage.jamendo.com/?trackid=23557&format=mp32",
      trackMetadata: {
        sourceName: "Jamendo",
        sourceUrl: "https://www.jamendo.com/track/23557",
        license: "Creative Commons BY",
        licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
        rightsStatus: "credit-required",
      },
    },
  });
  expect(unauthenticatedProjectImport.status()).toBe(401);

  const search = await page.request.get(`${baseUrl}/api/music/free-search?provider=openverse&q=ambient`);
  expect(search.status()).toBe(200);
  const payload = await search.json();
  expect(Array.isArray(payload.providers)).toBe(true);
  expect(payload.providers.some((provider) => provider.id === "openverse")).toBe(true);

  const pixabaySearch = await page.request.get(`${baseUrl}/api/music/free-search?provider=pixabay&q=ambient&limit=50&pages=9`);
  expect(pixabaySearch.status()).toBe(200);
  const pixabayPayload = await pixabaySearch.json();
  expect(pixabayPayload.scan.pages).toBe(5);
  expect(pixabayPayload.scan.limit).toBe(20);
  expect(pixabayPayload.providers[0].id).toBe("pixabay");
  expect(Array.isArray(pixabayPayload.tracks)).toBe(true);

  const strictPixabaySearch = await page.request.get(`${baseUrl}/api/music/free-search?provider=pixabay&q=piano&category=piano&genre=cinematic&mood=calm&duration=long&sort=popular`);
  expect(strictPixabaySearch.status()).toBe(200);
  const strictPixabayPayload = await strictPixabaySearch.json();
  expect(strictPixabayPayload.scan.urls[0]).toBe("https://pixabay.com/music/search/piano/");

  const providers = await page.request.get(`${baseUrl}/api/music/providers`);
  expect(providers.status()).toBe(200);
  const providersPayload = await providers.json();
  expect(providersPayload.providers.some((provider) => provider.id === "openverse" && provider.status === "active")).toBe(true);
  expect(providersPayload.providers.some((provider) => provider.id === "pixabay" && provider.status === "page-scan-blocked")).toBe(true);
});
