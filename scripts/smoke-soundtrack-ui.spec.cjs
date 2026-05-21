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
    const url = route.request().url();
    requestUrls.push(url);
    const params = new URL(url).searchParams;
    const provider = params.get("provider") || "openverse";
    if (provider === "pixabay") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          provider: "pixabay",
          configured: true,
          status: "provider-unavailable",
          providers: [
            { id: "pixabay", label: "Pixabay Music", mediaType: "music", status: "provider-unavailable", configured: true, count: 0, importable: 0, error: "Pixabay page scan blocked (403)." },
          ],
          scan: { pages: 1, limit: 20, urls: [`https://pixabay.com/music/search/${params.get("q") || "music"}/`] },
          sourceUrl: "https://pixabay.com/music/",
          stats: {
            found: 0,
            importable: 0,
            ignored: 1,
            ignoredReasons: [{ reason: "provider-unavailable", count: 1 }],
          },
          cache: { status: "live", ttlSeconds: 86400 },
          warnings: ["No fake results."],
          tracks: [],
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        provider: "openverse",
        configured: true,
        providers: [
          { id: "openverse", label: "Openverse Audio", mediaType: "audio", status: "active", configured: true, count: 2, importable: 1, error: "" },
        ],
        scan: { pages: 1, limit: 20 },
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

async function installMockAudio(page) {
  await page.addInitScript(() => {
    window.__vibefxAudioEvents = [];
    window.__vibefxAudioInstances = [];
    class MockAudio {
      constructor(src) {
        this.src = src;
        this.currentSrc = src;
        this.volume = 1;
        this.paused = true;
        this.duration = 269;
        this.playCalls = 0;
        this.pauseCalls = 0;
        this._currentTime = 0;
        window.__vibefxAudioInstances.push(this);
        setTimeout(() => {
          this.onloadedmetadata?.();
          this.oncanplay?.();
        }, 0);
      }

      get currentTime() {
        return this._currentTime;
      }

      set currentTime(value) {
        this._currentTime = Math.max(0, Number(value) || 0);
        window.__vibefxAudioEvents.push({ type: "seek", currentTime: this._currentTime });
        this.ontimeupdate?.();
        this.oncanplay?.();
      }

      play() {
        this.paused = false;
        this.playCalls += 1;
        window.__vibefxAudioEvents.push({ type: "play", currentTime: this._currentTime, playCalls: this.playCalls });
        this.onplaying?.();
        return Promise.resolve();
      }

      pause() {
        this.paused = true;
        this.pauseCalls += 1;
        window.__vibefxAudioEvents.push({ type: "pause", currentTime: this._currentTime, pauseCalls: this.pauseCalls });
        this.onpause?.();
      }
    }
    window.Audio = MockAudio;
  });
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

test("library scrubber seek keeps preview playback alive", async ({ page }) => {
  await installMockAudio(page);
  await mockMusicSearch(page);
  await openSoundtrack(page);
  await page.getByRole("button", { name: "Bibliotheque projet", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Bibliotheque projet Vibe_fx" })).toBeVisible();
  const akiraRow = page.getByTestId("project-starter-track-starter-akira");
  await expect(akiraRow).toBeVisible();
  await akiraRow.getByRole("button", { name: "Ecouter" }).click();
  const akiraSlider = page.getByRole("slider", { name: /Avancer la piste Akira/i });
  await expect(akiraSlider).toBeVisible();
  await akiraSlider.fill("95");
  const playback = await page.evaluate(() => {
    const audio = window.__vibefxAudioInstances.at(-1);
    return {
      paused: audio?.paused,
      currentTime: audio?.currentTime,
      playCalls: audio?.playCalls,
      events: window.__vibefxAudioEvents,
    };
  });
  expect(playback.paused).toBe(false);
  expect(playback.currentTime).toBeGreaterThanOrEqual(95);
  expect(playback.playCalls).toBeGreaterThanOrEqual(1);
  expect(playback.events.some((event) => event.type === "seek" && event.currentTime >= 95)).toBe(true);
});

test("local imports remain playable after reload", async ({ page }) => {
  await installMockAudio(page);
  await mockMusicSearch(page);
  const audioPath = path.join(process.cwd(), "public", "music", "Karl Casey - Akira.mp3");

  await openSoundtrack(page);
  await page.getByRole("button", { name: "Bibliotheque projet", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Bibliotheque projet Vibe_fx" })).toBeVisible();
  await page.locator('.soundtrack-library-modal input[type="file"][accept="audio/*"]').setInputFiles(audioPath);
  await expect(page.locator('[data-testid^="local-track-"]', { hasText: "Karl Casey - Akira" }).first()).toBeVisible({ timeout: 20000 });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await expect(page.getByTestId("soundtrack-page")).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Bibliotheque projet", exact: true }).click();
  const restoredRow = page.locator('[data-testid^="local-track-"]', { hasText: "Karl Casey - Akira" }).first();
  await expect(restoredRow).toBeVisible({ timeout: 20000 });
  await restoredRow.getByRole("button", { name: "Ecouter" }).click();
  await expect(page.getByRole("button", { name: /Pause preview Karl Casey - Akira/i })).toBeVisible();
  const playback = await page.evaluate(() => {
    const audio = window.__vibefxAudioInstances.at(-1);
    return {
      src: audio?.src || "",
      paused: audio?.paused,
      playCalls: audio?.playCalls,
    };
  });
  expect(playback.src.startsWith("blob:")).toBe(true);
  expect(playback.paused).toBe(false);
  expect(playback.playCalls).toBeGreaterThanOrEqual(1);
});

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
  await expect(page.getByRole("button", { name: "Agregateur" })).toHaveAttribute("data-active", "true");
  await expect(page.getByRole("button", { name: "Imports recents" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "A verifier" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Openverse audio actif" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pixabay Music music scan controle" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pixabay Music music scan controle" })).toBeEnabled();
  await expect(page.getByRole("button", { name: /Scanner le filtre Openverse piano/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Scanner le filtre Openverse spring/i })).toHaveCount(0);
  await expect(page.getByText(/Categorie active/i)).toHaveCount(0);
  await expectNoGenericPixabayFilters(page);
  await page.getByRole("button", { name: /Scanner le filtre Openverse piano/i }).click();
  await expect(page.getByTestId("soundtrack-track-openverse-smoke-track")).toBeVisible();
  expect(requestUrls.some((url) => url.includes("provider=openverse") && url.includes("q=piano+music") && url.includes("category=piano"))).toBe(true);
  await expect(page.getByTestId("soundtrack-track-openverse-metadata-only-track")).toBeVisible();
  await expect(page.getByText(/importables 1/i)).toBeVisible();
  await expect(page.getByText(/Fallback local/i)).toHaveCount(0);
  await expect(page.getByText(/Pistes Vibe_CUT pour/i)).toHaveCount(0);
  const importProjectButton = page.locator('[data-testid="soundtrack-track-openverse-smoke-track"]').getByRole("button", { name: /bibliotheque projet/i });
  await expect(importProjectButton).toBeVisible();
  if (await importProjectButton.isDisabled()) {
    await expect(importProjectButton).toContainText(/Projet indispo/i);
  }
  await expect(page.locator('[data-testid="soundtrack-track-openverse-smoke-track"]').getByRole("button", { name: /bibliotheque Vibe_fx locale/i })).toBeVisible();
  await expect(page.locator('[data-testid="soundtrack-track-openverse-metadata-only-track"]').getByRole("button", { name: /Importer Metadata Only Openverse/i })).toHaveCount(0);
  await expect(page.locator('[data-testid="soundtrack-track-openverse-metadata-only-track"]').getByText(/Source seule/i)).toBeVisible();

  const audioPath = path.join(process.cwd(), "public", "music", "Karl Casey - Akira.mp3");
  await page.getByRole("button", { name: "Pixabay Music music scan controle" }).click();
  await expect(page.getByText(/Filtres Pixabay Music/i)).toBeVisible();
  await expect(page.getByTestId("pixabay-import-assistant")).toBeVisible();
  await expect(page.getByTestId("pixabay-import-assistant").getByRole("link", { name: /Ouvrir Pixabay/i })).toHaveAttribute("href", /pixabay\.com\/music\/search\/free\+music\//);
  await expect(page.getByRole("button", { name: /Scanner le filtre Pixabay Music spring/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Scanner le filtre Pixabay Music podcast/i })).toHaveCount(0);
  await page.getByRole("button", { name: /Scanner le filtre Pixabay Music piano/i }).click();
  expect(requestUrls.some((url) => url.includes("provider=pixabay") && url.includes("q=piano") && url.includes("category=piano"))).toBe(true);
  await expect(page.getByText(/Pixabay bloque le scan serveur/i)).toBeVisible();
  await expect(page.getByTestId("pixabay-import-assistant").getByRole("link", { name: /Ouvrir Pixabay/i })).toHaveAttribute("href", /pixabay\.com\/music\//);
  const assistedPath = path.join(os.tmpdir(), `pixabay-assisted-${Date.now()}.mp3`);
  fs.copyFileSync(audioPath, assistedPath);
  await page.getByLabel("Page source Pixabay").fill("https://pixabay.com/music/smoke-pixabay-assisted-12345/");
  await page.getByTestId("pixabay-assisted-file-input").setInputFiles(assistedPath);
  await expect(page.getByRole("dialog", { name: "Bibliotheque projet Vibe_fx" })).toBeVisible({ timeout: 20000 });
  const assistedLocalRow = page.locator('[data-testid^="local-track-"]', { hasText: "pixabay-assisted" }).first();
  await expect(assistedLocalRow).toBeVisible({ timeout: 20000 });
  await expect(assistedLocalRow).toContainText("piano");
  await expect(page.locator('[data-testid^="project-scrub-"]', { hasText: "Preview piste" }).first()).toBeVisible();
  await expect(page.getByRole("slider", { name: /Avancer la piste pixabay-assisted/i })).toBeVisible();
  await expect(page.getByRole("dialog").getByText(/Import Pixabay termine: piano/i)).toBeVisible();
  await page.getByRole("button", { name: "Fermer la bibliotheque" }).click();
  await page.getByRole("button", { name: "Openverse audio actif" }).click();
  await page.getByRole("button", { name: /Scanner le filtre Openverse piano/i }).click();

  await page.getByRole("button", { name: /Ajouter Smoke Openverse Track aux favoris/i }).click();
  await page.getByRole("button", { name: /^favoris locaux$/i }).click();
  await expect(page.getByTestId("soundtrack-track-openverse-smoke-track")).toBeVisible();

  await page.getByRole("button", { name: "Bibliotheque projet", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Bibliotheque projet Vibe_fx" })).toBeVisible();
  await expect(page.getByText("Playlists bibliotheque")).toBeVisible();
  await expect(page.getByPlaceholder("Nouvelle playlist bibliotheque")).toBeVisible();

  await page.locator('.soundtrack-library-modal input[type="file"][accept="audio/*"]').setInputFiles(audioPath);
  const importedLocalRow = page.locator('[data-testid^="local-track-"]', { hasText: "Karl Casey - Akira" }).first();
  await expect(importedLocalRow).toBeVisible({ timeout: 20000 });

  await page.getByPlaceholder("Nouvelle playlist bibliotheque").fill("Launch picks");
  await page.getByRole("button", { name: "Creer playlist bibliotheque" }).click();
  await importedLocalRow.getByRole("button", { name: /Ajouter Karl Casey - Akira a la playlist bibliotheque/i }).click();
  await expect(page.getByRole("button", { name: /Launch picks\s+1/i })).toBeVisible();

  await importedLocalRow.getByRole("button", { name: /Supprimer Karl Casey - Akira/i }).click();
  await expect(page.locator('[data-testid^="local-track-"]', { hasText: "Karl Casey - Akira" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Launch picks\s+0/i })).toBeVisible();

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
    await page.getByRole("button", { name: /Scanner le filtre Openverse ambient/i }).click();
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
  await page.getByRole("button", { name: /Scanner le filtre Openverse piano/i }).click();
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
  await page.getByRole("button", { name: /Scanner le filtre Openverse piano/i }).click();
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
  expect(providersPayload.providers.some((provider) => provider.id === "pixabay" && provider.status === "page-scan-controlled")).toBe(true);
});
