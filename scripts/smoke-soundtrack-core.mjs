import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const tempDir = await mkdtemp(path.join(root, ".tmp-soundtrack-core-"));

async function copyModule(sourcePath, targetName, replacements = []) {
  let source = await readFile(path.join(root, sourcePath), "utf8");
  for (const [from, to] of replacements) source = source.replaceAll(from, to);
  const targetPath = path.join(tempDir, targetName);
  await writeFile(targetPath, source, "utf8");
  return pathToFileURL(targetPath).href;
}

try {
  const manifestUrl = await copyModule(
    "src/features/vibefx-studio/soundtrack/services/soundtrackManifest.js",
    "soundtrackManifest.mjs",
    [["../data/soundtrackDefaults", "./soundtrackDefaults.mjs"]]
  );
  await writeFile(
    path.join(tempDir, "soundtrackDefaults.mjs"),
    "export const SOUNDTRACK_MANIFEST_FILE = 'vibefx-soundtrack.json';\n",
    "utf8"
  );
  const projectModelUrl = await copyModule(
    "src/features/vibefx-studio/soundtrack/services/projectSoundLibraryModel.js",
    "projectSoundLibraryModel.mjs",
    [["./soundtrackManifest", "./soundtrackManifest.mjs"]]
  );
  const providerSearchUrl = await copyModule(
    "src/features/vibefx-studio/soundtrack/services/providerSearchClient.js",
    "providerSearchClient.mjs"
  );
  const pixabayAdapterUrl = await copyModule(
    "src/app/api/music/_providers/pixabayAudioAdapter.js",
    "pixabayAudioAdapter.mjs"
  );
  const musicRightsUrl = await copyModule(
    "src/features/vibefx-studio/video/data/musicRights.js",
    "musicRights.mjs"
  );
  const soundtrackRightsUrl = await copyModule(
    "src/features/vibefx-studio/soundtrack/services/soundtrackRights.js",
    "soundtrackRights.mjs",
    [["../../video/data/musicRights", "./musicRights.mjs"]]
  );
  const aiProviderRegistryUrl = await copyModule(
    "src/app/api/music/_providers/aiProviderRegistry.js",
    "aiProviderRegistry.mjs"
  );

  const {
    normalizeSoundtrackTrack,
    buildSoundtrackManifest,
  } = await import(manifestUrl);
  const {
    addTrackToProjectPlaylist,
    buildProjectSoundStoragePath,
    moveTrackInProjectPlaylist,
    normalizeProjectSoundPlaylist,
    normalizeProjectSoundTrack,
    removeTrackFromProjectPlaylist,
    serializeProjectPlaylist,
    serializeProjectTrack,
    validateProjectTrackRights,
  } = await import(projectModelUrl);
  const {
    buildProviderScanCacheKey,
    buildProviderSearchUrl,
    normalizeProviderScanFilters,
  } = await import(providerSearchUrl);
  const {
    buildPixabayCacheKey,
    buildPixabayMusicSearchUrl,
    dedupePixabayResults,
    normalizePixabayFilters,
    parsePixabayMusicHtml,
  } = await import(pixabayAdapterUrl);
  const {
    buildExportRightsManifestDocument,
  } = await import(musicRightsUrl);
  const {
    getSoundtrackRightsAudit,
    normalizeSearchTrackRights,
  } = await import(soundtrackRightsUrl);
  const {
    getAiProviderDefinitions,
  } = await import(aiProviderRegistryUrl);

  const providerTrack = normalizeSearchTrackRights({
    id: "openverse-test-track",
    provider: "openverse",
    title: "Test Track",
    artist: "Test Artist",
    sourceName: "Openverse / Jamendo",
    sourceUrl: "https://www.jamendo.com/track/test",
    license: "Creative Commons BY",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    attribution: "Test Track by Test Artist",
    rightsStatus: "credit-required",
    socialUse: true,
    commercialUse: true,
    contentIdWarning: "Verify upstream source before publication.",
    duration: 42,
    tags: ["ambient", "loop"],
    downloadUrl: "https://prod-1.storage.jamendo.com/?trackid=test&format=mp32",
  });
  const projectTrack = normalizeProjectSoundTrack(providerTrack, "uid-test");
  assert.equal(projectTrack.ownerUid, "uid-test");
  assert.equal(projectTrack.sourceProvider, "openverse");
  assert.equal(projectTrack.sourcePageUrl, providerTrack.sourceUrl);
  assert.equal(projectTrack.license, "Creative Commons BY");
  assert.equal(projectTrack.rightsStatus, "cleared-social");
  assert.deepEqual(projectTrack.tags, ["ambient", "loop"]);
  assert.equal(validateProjectTrackRights(projectTrack).ok, true);

  const missingLicense = validateProjectTrackRights(normalizeProjectSoundTrack({
    title: "No license",
    provider: "local-upload",
    sourceUrl: "user-declared",
    licenseUrl: "user-declared",
    rightsStatus: "user-declared",
  }, "uid-test"));
  assert.equal(missingLicense.ok, false);
  assert.ok(missingLicense.missing.includes("license"), "project import must reject tracks without license metadata");

  const blocked = validateProjectTrackRights(normalizeProjectSoundTrack({
    title: "Blocked",
    provider: "archive",
    sourceUrl: "https://archive.org/details/test",
    license: "Unknown",
    licenseUrl: "https://archive.org/details/test",
    rightsStatus: "blocked",
  }, "uid-test"));
  assert.equal(blocked.ok, false);
  assert.ok(blocked.missing.includes("rightsStatusBlocked"), "blocked rights must prevent project import");

  const unknownContentId = normalizeProjectSoundTrack({
    title: "Looks Clear But Unknown",
    provider: "pixabay",
    sourceUrl: "https://pixabay.com/music/test",
    license: "Pixabay Content License",
    licenseUrl: "https://pixabay.com/service/license-summary/",
    rightsStatus: "cleared-social",
  }, "uid-test");
  assert.equal(unknownContentId.rightsStatus, "needs-review", "missing Content ID evidence must force needs-review");

  const serialized = serializeProjectTrack(projectTrack);
  assert.equal(serialized.ownerUid, "uid-test");
  assert.equal(serialized.localObjectUrl, undefined, "project metadata serialization must not persist local object URLs");
  assert.equal(serialized.file, undefined, "project metadata serialization must not persist File/Blob objects");

  const storagePath = buildProjectSoundStoragePath({
    uid: "uid-test",
    track: { ...projectTrack, id: "track-123", title: "A/B Test Audio" },
    contentType: "audio/ogg",
    fileName: "Unsafe Name ?.ogg",
  });
  assert.equal(storagePath, "users/uid-test/soundtrack/track-123/Unsafe-Name-.ogg");
  assert.throws(() => buildProjectSoundStoragePath({ uid: "", track: projectTrack }), /uid_required/);

  const localTrack = normalizeSoundtrackTrack({
    title: "Local",
    provider: "local-file",
    sourceUrl: "local-file",
    license: "User declared",
    licenseUrl: "user-declared",
    rightsStatus: "user-declared",
    socialUse: false,
  });
  const audit = getSoundtrackRightsAudit(localTrack);
  assert.equal(audit.blocked, true);
  assert.ok(audit.issues.includes("Usage social non confirme"));

  const manifest = buildSoundtrackManifest({
    tracks: [{ ...localTrack, localObjectUrl: "blob:test", file: { ignored: true } }],
    playlists: [{ id: "playlist-a", name: "A", trackIds: [localTrack.id] }],
  });
  assert.equal(manifest.tracks[0].localObjectUrl, undefined);
  assert.equal(manifest.tracks[0].file, undefined);
  assert.equal(manifest.playlists[0].trackIds[0], localTrack.id);

  const exportManifest = buildExportRightsManifestDocument([{
    id: "audio-export-a",
    name: "Export Audio A",
    provider: "openverse",
    sourceName: "Openverse",
    sourceUrl: "https://openverse.org/audio/test",
    license: "Creative Commons BY",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    attribution: "Export Audio A by Artist",
    rightsStatus: "credit-required",
    socialUse: true,
    commercialUse: true,
    contentIdWarning: "Verify source page.",
  }], {
    ownerUid: "uid-test",
    exportId: "export-test-1",
    projectName: "Smoke Project",
    exportFormat: "webm",
    sequencePreset: "youtube",
    createdAt: "2026-05-21T00:00:00.000Z",
  });
  assert.equal(exportManifest.ownerUid, "uid-test");
  assert.equal(exportManifest.userId, "uid-test");
  assert.equal(exportManifest.exportId, "export-test-1");
  assert.equal(exportManifest.trackCount, 1);
  assert.equal(exportManifest.status, "warning", "Content ID warning should keep a persisted manifest reviewable");
  assert.equal(exportManifest.tracks[0].exportId, "export-test-1");
  assert.equal(exportManifest.tracks[0].userId, "uid-test");
  assert.equal(exportManifest.tracks[0].title, "Export Audio A");

  const savedMubertCustomerId = process.env.MUBERT_CUSTOMER_ID;
  const savedMubertAccessToken = process.env.MUBERT_ACCESS_TOKEN;
  const savedMubertApiKey = process.env.MUBERT_API_KEY;
  const savedLoudlyApiKey = process.env.LOUDLY_API_KEY;
  const savedSoundrawApiKey = process.env.SOUNDRAW_API_KEY;
  const savedMinimaxApiKey = process.env.MINIMAX_API_KEY;
  const savedMurekaApiKey = process.env.MUREKA_API_KEY;
  const savedReplicateToken = process.env.REPLICATE_API_TOKEN;
  delete process.env.MINIMAX_API_KEY;
  delete process.env.MUREKA_API_KEY;
  delete process.env.REPLICATE_API_TOKEN;
  delete process.env.MUBERT_CUSTOMER_ID;
  delete process.env.MUBERT_ACCESS_TOKEN;
  delete process.env.MUBERT_API_KEY;
  delete process.env.LOUDLY_API_KEY;
  delete process.env.SOUNDRAW_API_KEY;
  assert.equal(getAiProviderDefinitions().find((provider) => provider.id === "minimax-music").configured, false);
  process.env.MINIMAX_API_KEY = "minimax";
  assert.equal(getAiProviderDefinitions().find((provider) => provider.id === "minimax-music").configured, true, "MiniMax requires MINIMAX_API_KEY only");
  assert.equal(getAiProviderDefinitions().find((provider) => provider.id === "mureka").configured, false);
  process.env.MUREKA_API_KEY = "mureka";
  assert.equal(getAiProviderDefinitions().find((provider) => provider.id === "mureka").configured, true, "Mureka requires MUREKA_API_KEY only");
  assert.equal(getAiProviderDefinitions().find((provider) => provider.id === "replicate-music").configured, false);
  process.env.REPLICATE_API_TOKEN = "replicate";
  assert.equal(getAiProviderDefinitions().find((provider) => provider.id === "replicate-music").configured, true, "Replicate requires REPLICATE_API_TOKEN only");
  assert.equal(getAiProviderDefinitions().find((provider) => provider.id === "mubert").configured, false);
  process.env.MUBERT_ACCESS_TOKEN = "token-only";
  assert.equal(getAiProviderDefinitions().find((provider) => provider.id === "mubert").configured, false, "Mubert must not appear configured with only an access token");
  process.env.MUBERT_CUSTOMER_ID = "customer-only";
  delete process.env.MUBERT_ACCESS_TOKEN;
  assert.equal(getAiProviderDefinitions().find((provider) => provider.id === "mubert").configured, false, "Mubert must not appear configured with only customer id");
  process.env.MUBERT_ACCESS_TOKEN = "token";
  assert.equal(getAiProviderDefinitions().find((provider) => provider.id === "mubert").configured, true, "Mubert requires both customer-id and access-token");
  const aiProviders = getAiProviderDefinitions();
  assert.ok(aiProviders.find((provider) => provider.id === "loudly").presets.every((preset) => preset.mapping === "prompt-preset"), "Loudly must not expose fake mapped Vibe_CUT values without portal taxonomy");
  assert.ok(aiProviders.find((provider) => provider.id === "soundraw").presets.every((preset) => preset.mapping === "prompt-preset"), "SOUNDRAW must not expose fake mapped Vibe_CUT values without API taxonomy");
  if (savedMubertCustomerId === undefined) delete process.env.MUBERT_CUSTOMER_ID;
  else process.env.MUBERT_CUSTOMER_ID = savedMubertCustomerId;
  if (savedMubertAccessToken === undefined) delete process.env.MUBERT_ACCESS_TOKEN;
  else process.env.MUBERT_ACCESS_TOKEN = savedMubertAccessToken;
  if (savedMubertApiKey === undefined) delete process.env.MUBERT_API_KEY;
  else process.env.MUBERT_API_KEY = savedMubertApiKey;
  if (savedLoudlyApiKey === undefined) delete process.env.LOUDLY_API_KEY;
  else process.env.LOUDLY_API_KEY = savedLoudlyApiKey;
  if (savedSoundrawApiKey === undefined) delete process.env.SOUNDRAW_API_KEY;
  else process.env.SOUNDRAW_API_KEY = savedSoundrawApiKey;
  if (savedMinimaxApiKey === undefined) delete process.env.MINIMAX_API_KEY;
  else process.env.MINIMAX_API_KEY = savedMinimaxApiKey;
  if (savedMurekaApiKey === undefined) delete process.env.MUREKA_API_KEY;
  else process.env.MUREKA_API_KEY = savedMurekaApiKey;
  if (savedReplicateToken === undefined) delete process.env.REPLICATE_API_TOKEN;
  else process.env.REPLICATE_API_TOKEN = savedReplicateToken;

  const filters = normalizeProviderScanFilters({
    provider: "pixabay",
    query: "  Piano  ",
    category: "piano",
    pages: 9,
    limit: 99,
    license: "cleared-social",
    bpm: "fast",
    genre: "ambient",
    mood: "calm",
    duration: "two-four",
  });
  assert.equal(filters.provider, "pixabay");
  assert.equal(filters.query, "Piano");
  assert.equal(filters.category, "piano");
  assert.equal(filters.pages, 5);
  assert.equal(filters.limit, 20);
  assert.equal(filters.license, undefined, "provider-first filters must not keep generic license");
  assert.equal(filters.bpm, undefined, "provider-first filters must not keep generic BPM");
  assert.equal(filters.genre, undefined, "provider-first filters must not keep generic genre");
  assert.equal(filters.mood, undefined, "provider-first filters must not keep generic mood");
  assert.equal(filters.duration, undefined, "provider-first filters must not keep generic duration");
  const cacheKeyA = buildProviderScanCacheKey(filters);
  const cacheKeyB = buildProviderScanCacheKey({ ...filters, query: "piano" });
  assert.equal(cacheKeyA, cacheKeyB, "provider cache key must normalize query casing and whitespace");
  assert.notEqual(cacheKeyA, buildProviderScanCacheKey({ ...filters, category: "chill" }));
  assert.match(buildProviderSearchUrl(filters), /\/api\/music\/free-search\?/);
  assert.match(buildProviderSearchUrl(filters), /q=Piano/);
  assert.match(buildProviderSearchUrl(filters), /category=piano/);
  assert.match(buildProviderSearchUrl(filters), /limit=20/);
  assert.match(buildProviderSearchUrl(filters), /pages=5/);
  assert.doesNotMatch(buildProviderSearchUrl(filters), /license=/);
  assert.doesNotMatch(buildProviderSearchUrl(filters), /bpm=/);

  const pixabayFilters = normalizePixabayFilters({
    query: " piano ",
    genre: "cinematic",
    mood: "calm",
    category: "piano",
    duration: "two-four",
    sort: "popular",
    pages: 8,
    limit: 88,
  });
  assert.equal(pixabayFilters.pages, 5);
  assert.equal(pixabayFilters.limit, 20);
  assert.equal(pixabayFilters.mediaType, "music");
  assert.equal(pixabayFilters.category, "piano");
  assert.equal(pixabayFilters.genre, undefined, "pixabay adapter must ignore legacy generic genre filters");
  assert.equal(pixabayFilters.mood, undefined, "pixabay adapter must ignore legacy generic mood filters");
  assert.equal(pixabayFilters.duration, undefined, "pixabay adapter must ignore legacy generic duration filters");
  assert.equal(pixabayFilters.sort, undefined, "pixabay adapter must ignore legacy generic sort filters");
  assert.match(buildPixabayMusicSearchUrl(pixabayFilters, 1), /https:\/\/pixabay\.com\/music\/search\/piano\//);
  assert.match(buildPixabayMusicSearchUrl(pixabayFilters, 2), /pagi=2/);
  assert.equal(buildPixabayCacheKey(pixabayFilters), buildPixabayCacheKey({ ...pixabayFilters, query: "PIANO" }));

  const fixtureHtml = await readFile(path.join(root, "scripts/fixtures/pixabay-music-search.html"), "utf8");
  const parsedPixabay = parsePixabayMusicHtml(fixtureHtml, pixabayFilters);
  assert.equal(parsedPixabay.tracks.length, 2, "pixabay parser must not apply removed duration filters");
  assert.equal(parsedPixabay.tracks[0].provider, "pixabay");
  assert.equal(parsedPixabay.tracks[0].license, "Pixabay Content License");
  assert.equal(parsedPixabay.tracks[0].licenseUrl, "https://pixabay.com/service/license-summary/");
  assert.equal(parsedPixabay.tracks[0].importStatus, "importable");
  assert.equal(parsedPixabay.tracks[0].downloadUrl.includes("cdn.pixabay.com/download/audio/"), true);

  const parsedAllPixabay = parsePixabayMusicHtml(fixtureHtml, { ...pixabayFilters, duration: "all" });
  assert.equal(parsedAllPixabay.tracks.length, 2);
  assert.equal(parsedAllPixabay.stats.importable, 1);
  assert.equal(parsedAllPixabay.stats.ignored, 1);
  assert.equal(parsedAllPixabay.tracks.find((track) => track.title === "Metadata Only Fixture").importStatus, "metadata-only");
  assert.equal(dedupePixabayResults([...parsedAllPixabay.tracks, ...parsedAllPixabay.tracks]).length, 2);

  const playlist = normalizeProjectSoundPlaylist({
    id: "playlist-project-a",
    name: "  Cut Batch  ",
    trackIds: ["track-a", "track-a", "", "track-b"],
  }, "uid-test");
  assert.equal(playlist.ownerUid, "uid-test");
  assert.equal(playlist.name, "Cut Batch");
  assert.deepEqual(playlist.trackIds, ["track-a", "track-b"], "project playlists must dedupe track ids");
  const withTrack = addTrackToProjectPlaylist(playlist, "track-c");
  assert.deepEqual(withTrack.trackIds, ["track-a", "track-b", "track-c"]);
  assert.deepEqual(addTrackToProjectPlaylist(withTrack, "track-c").trackIds, withTrack.trackIds, "playlist add must be idempotent");
  assert.deepEqual(moveTrackInProjectPlaylist(withTrack, "track-c", -1).trackIds, ["track-a", "track-c", "track-b"]);
  assert.deepEqual(removeTrackFromProjectPlaylist(withTrack, "track-a").trackIds, ["track-b", "track-c"]);
  const serializedPlaylist = serializeProjectPlaylist(withTrack);
  assert.equal(serializedPlaylist.ownerUid, "uid-test");
  assert.equal(serializedPlaylist.localObjectUrl, undefined, "project playlists must only persist allowlisted fields");

  console.log("soundtrack core smoke passed");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
