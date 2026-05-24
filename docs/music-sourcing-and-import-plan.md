# Vibe_CUT music sourcing and import plan

## Decision

The music product should not depend on random "no copyright" downloads. Vibe_fx needs a rights-first music layer with three lanes:

1. Premium licensed catalog for production quality and social publishing safety.
2. Verified free/low-cost sources for starter templates and tests.
3. AI music generation through server-side connectors only.

## Recommended providers

| Priority | Provider | Role | Integration | Notes |
| --- | --- | --- | --- | --- |
| P0 | Epidemic Sound | Best professional social catalog | Partner API | Broad catalog, SFX, commercial/social clearance. Requires developer portal/contract. |
| P0 | Soundstripe | Strong licensing/API partner | Partnership API | Good fit for in-app licensing, possible indemnification/commercial coverage. Requires partnership. |
| P1 | Artlist | Premium creator catalog | Enterprise API | Browse/stream/search/download exists for enterprise users. Watch resale/library restrictions. |
| P1 | Mubert | AI generation API | Server connector | Text-to-music, moods, BPM, streaming, sublicensing claims. Keep keys server-side. |
| P1 | MiniMax Music | AI song/instrumental API | Server connector | First prototype connector: official `/v1/music_generation`, server key, hex audio imported immediately. |
| P1 | Mureka | AI song/instrumental API | Manual import first, async connector later | Official API, async task model; use for existing generation import until account-backed task schema is validated. |
| P1 | Replicate | AI model hub | Manual import first, model-specific connectors later | Useful to test MiniMax/MusicGen/Riffusion quickly; pin model/schema/license before automatic generation. |
| P1 | Beatoven.ai | AI music for video/podcast | Server/manual first | Good creative fit; confirm API/commercial plan before automation. |
| P1 | Stable Audio | High-quality AI generation | Server/manual first | Creator license supports individual commercial projects; enterprise for app-scale use. |
| P2 | Openverse Audio | Free Creative Commons/public-domain discovery | Server API, no key required | Best default aggregator. Returns source/provider, license URL, attribution and media URL, but license accuracy must still be verified upstream. |
| P2 | Jamendo Music API | Free Creative Commons discovery | Server API with `JAMENDO_CLIENT_ID` | Official tracks endpoint exposes stream/download fields and `audiodownload_allowed`; license is track-level CC, so commercial use must be inferred/reviewed per track. |
| P2 | Freesound | SFX, ambiences and loops | Server API with `FREESOUND_API_KEY` | Useful for effects and loops; original downloads require OAuth, previews are easier. Free API use is non-commercial unless agreed. |
| P2 | Internet Archive | Public-domain/CC archive audio | Server API, no key required | Large catalog, inconsistent metadata; use as review-heavy fallback. |
| P2 | Wikimedia Commons Audio | Public-domain/CC file search | Server API, no key required | Traceable source pages but highly variable audio/music relevance and machine-readable metadata. |
| P2 | Pixabay Music | Free starter/backup source | Manual verified import | Official Pixabay API covers images/videos, not a public music search/download API. Quality/provenance varies. |
| P2 | Jamendo Licensing | Track/project licensing | Manual or commercial agreement | Royalty-free means licensed, not free. Good for explicit project licenses. |
| P3 | Suno / Udio | Experimental AI songs | Manual only | Strong creative output, but higher copyright/training/legal uncertainty. Do not auto-publish without legal review. |

## Current local catalog

`public/music/` contains Karl Casey / White Bat Audio tracks. They are usable as a starter pack only if attribution and license terms are surfaced at export/publish time.

Required attribution:

```text
Music by Karl Casey @ White Bat Audio
```

The UI now stores `sourceName`, `sourceUrl`, `license`, `licenseUrl`, `attribution`, and `rightsStatus` on imported tracks.

## Import architecture

### Client

- Preview track.
- Display source, license, and attribution before import.
- Validate user audio imports by MIME type, file size, and duration.
- Attach user-declared rights metadata to every imported audio item.
- Never scrape an external music website from the browser.

### Server

- Store provider API keys in Secret Manager.
- Call provider APIs from Firebase Functions or Cloud Run.
- Download or stream only through official APIs and contracts.
- Persist user-uploaded audio through Firebase Storage.
- Persist a rights manifest per project/export:
  - `trackId`
  - `provider`
  - `sourceUrl`
  - `licenseUrl`
  - `licenseSnapshotVersion`
  - `attribution`
  - `acquiredAt`
  - `userId`
  - `exportId`

### Export/publish gate

Before export or publication, the app should show:

- tracks used;
- required attribution text;
- whether the license allows commercial/social use;
- provider warning if Content ID / copyright claim restrictions exist;
- missing metadata blockers.

## AI generation flow

1. User enters prompt, mood, genre, BPM, duration.
2. Client sends request to a Firebase callable.
3. Callable validates auth, quota, and prompt policy.
4. Callable calls the provider API.
5. Generated audio and license metadata are stored in Firebase Storage/Firestore.
6. Timeline imports the stored asset.

## Do not implement

- Client-side scraping YouTube, Pixabay, Artlist, Epidemic, Soundstripe, or any catalog page. Pixabay Music may only be scanned through the bounded server adapter documented below, with cache, small page limits and graceful metadata-only/unavailable states.
- Client-side provider secrets.
- "Import by URL" without explicit license capture and CORS-safe download path.
- Presenting "free" as "safe for all commercial/social uses".

## Implementation status

- `src/features/vibefx-studio/video/data/musicCatalog.js` defines the provider lanes and marks the local White Bat Audio starter catalog with source, license, attribution, usage flags and Content ID warning metadata.
- `src/features/vibefx-studio/video/data/musicRights.js` centralizes rights presets, labels, audit blockers and export manifest generation for audio tracks.
- `src/app/api/music/free-search/route.js` is now provider-first for Soundtrack. `provider=pixabay` delegates to `src/app/api/music/_providers/pixabayAudioAdapter.js`, a bounded server-side `pixabay-audio` adapter that builds Pixabay Music search URLs from explicit `q/category` commands, ignores legacy generic parameters such as genre/mood/duration/sort for this provider, scans only 1/3/5 requested pages, caches for 24h, normalizes source/license/rights metadata, deduplicates by provider ID/source URL, marks tracks `importable` only when a direct `cdn.pixabay.com` audio URL is extracted safely, and otherwise returns `metadata-only` or `provider-unavailable`.
- Pixabay was rechecked against the official API documentation on 2026-05-21: the public API documentation exposes image and video search endpoints, not a documented public audio search/download endpoint. Soundtrack therefore does not use a fake API endpoint and does not run client scraping or mass scans. In local verification, Pixabay public pages returned a 403 bot/challenge response for category URLs such as `https://pixabay.com/music/search/piano/`, which the adapter reports as `provider-unavailable` with the official source URL, ignored-count telemetry, and no fake production results.
- `src/app/api/music/providers/route.js` exposes provider capability metadata to the app: Pixabay is the only active Soundtrack aggregator provider for this pass, while Openverse/Jamendo/Freesound/Archive/Wikimedia are visible as coming soon, configured-coming-soon, or provider-missing-key and do not inject generic filters into the active UI.
- `src/features/vibefx-studio/soundtrack/components/SoundtrackSearch.jsx` keeps the provider bar visible but replaces the old generic filters with actionable Pixabay category tags only (`musique gratuite`, `instrumental`, `spring`, `piano`, `motivation`, `chill`, `epic`, `relaxation`, `sonnerie`, `corporate`, `sport`). A click sends `q` and `category` to `/api/music/free-search`; if the provider is blocked, the UI shows the official category link and the manual direct-audio import path instead of an empty unexplained table.
- `src/app/api/music/import/route.js` provides the controlled server download path for direct audio URLs from verified free/low-cost sources. It only accepts HTTPS audio URLs on an allowlist, validates the final redirected host, refuses non-audio content, and enforces the 150 MB limit.
- `src/features/vibefx-studio/soundtrack/` now separates the project library from the aggregator. Project imports store audio in Firebase Storage under `users/{uid}/soundtrack/{trackId}/{fileName}` and metadata in Firestore under `users/{uid}/soundtrackTracks/{trackId}` after Firebase auth, with source/license/rights metadata required before upload. Project playlists are persisted owner-scoped under `users/{uid}/soundtrackPlaylists/{playlistId}` with track ordering, add/remove/reorder actions, and per-track category/mood/genre/tag metadata. The previous local-first folder/manifest flow remains available for local downloads and portable playlists.
- `src/features/vibefx-studio/soundtrack/services/projectSoundLibraryModel.js` contains the pure project-track and project-playlist normalization/validation/storage-path rules used by the Firebase client, and `scripts/smoke-soundtrack-core.mjs` verifies provider-track mapping, refusal without license metadata, `blocked` refusal, `needs-review` when Content ID evidence is missing, manifest export without Blob/File objects, project playlist dedupe/add/remove/reorder/serialization, and normalized provider cache keys.
- `src/features/vibefx-studio/video/panels/MusicLibrary.jsx` opens on the free import lane by default, then exposes starter catalog, provider/source overview and AI generation guidance. Free/low-cost provider cards can still start the verified import flow with the right preset already selected, an official source link visible, an in-app multi-source catalog search, a direct audio URL field backed by `/api/music/import`, a preload/listen step before timeline import, and a source/file/rights checklist. The guided import validates MIME type, size, duration and required rights metadata before a track can enter the timeline.
- `src/features/vibefx-studio/video/panels/AudioPanel.jsx` no longer bypasses rights capture with a raw audio upload button; new audio imports route through the music library.
- `src/features/vibefx-studio/video/panels/ExportVideoPanel.jsx` runs a rights gate before browser export. Missing source, source URL/proof, license, license URL, rights status, required attribution, or social-use confirmation blocks export and shows the exact issue per track. Successful exports with audio now persist an owner-scoped rights manifest in Firestore under `users/{uid}/rightsManifests/{exportId}` when Firebase is configured, including the real Auth UID, export ID, project name, format, source/licence/attribution data, blockers and warnings.

Remaining production work:

- Move remote provider import into a fully authenticated server route or callable if direct client upload from the controlled proxy is not sufficient for the final threat model.
- Finish AI music through Firebase callable/server connector after provider contract/API plan selection. Prototype state now supports MiniMax server generation through `/api/music/ai-generate` plus manual import of existing AI generations from MiniMax, Mureka, Replicate and other configured AI providers into the local or Firebase project library.
- Add premium catalog API connectors only through server-side provider agreements.
- Decide whether Jamendo CC discovery is enough for production templates or should stay limited to tests/starter workflows behind an explicit warning.
