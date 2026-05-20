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

- Scraping YouTube, Pixabay, Artlist, Epidemic, Soundstripe, or any catalog page.
- Client-side provider secrets.
- "Import by URL" without explicit license capture and CORS-safe download path.
- Presenting "free" as "safe for all commercial/social uses".

## Implementation status

- `src/features/vibefx-studio/video/data/musicCatalog.js` defines the provider lanes and marks the local White Bat Audio starter catalog with source, license, attribution, usage flags and Content ID warning metadata.
- `src/features/vibefx-studio/video/data/musicRights.js` centralizes rights presets, labels, audit blockers and export manifest generation for audio tracks.
- `src/app/api/music/free-search/route.js` is the free-source aggregator. It searches Openverse by default, adds Jamendo when `JAMENDO_CLIENT_ID` is configured, adds Freesound when `FREESOUND_API_KEY` is configured, and can also query Internet Archive/Wikimedia with conservative metadata warnings. It returns normalized track, stream/download, source, license and attribution metadata to the client without exposing provider credentials.
- `src/app/api/music/import/route.js` provides the controlled server download path for direct audio URLs from verified free/low-cost sources. It only accepts HTTPS audio URLs on an allowlist, validates the final redirected host, refuses non-audio content, and enforces the 150 MB limit.
- `src/features/vibefx-studio/video/panels/MusicLibrary.jsx` opens on the free import lane by default, then exposes starter catalog, provider/source overview and AI generation guidance. Free/low-cost provider cards can still start the verified import flow with the right preset already selected, an official source link visible, an in-app multi-source catalog search, a direct audio URL field backed by `/api/music/import`, a preload/listen step before timeline import, and a source/file/rights checklist. The guided import validates MIME type, size, duration and required rights metadata before a track can enter the timeline.
- `src/features/vibefx-studio/video/panels/AudioPanel.jsx` no longer bypasses rights capture with a raw audio upload button; new audio imports route through the music library.
- `src/features/vibefx-studio/video/panels/ExportVideoPanel.jsx` runs a rights gate before browser export. Missing source, source URL/proof, license, license URL, rights status, required attribution, or social-use confirmation blocks export and shows the exact issue per track.

Remaining production work:

- Persist uploaded audio to Firebase Storage instead of object URLs when project saving is wired for Vibe_CUT.
- Persist the generated rights manifest to Firestore/Storage per saved project/export with real `userId` and `exportId`.
- Implement AI music through Firebase callable/server connector only after a provider contract/API plan is selected.
- Add premium catalog API connectors only through server-side provider agreements.
- Decide whether Jamendo CC discovery is enough for production templates or should stay limited to tests/starter workflows behind an explicit warning.
