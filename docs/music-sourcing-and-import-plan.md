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
| P2 | Pixabay Music | Free starter/backup source | Manual verified import | Free, attribution not required, but no public music API found. Quality/provenance varies. |
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
