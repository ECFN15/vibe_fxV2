# AI music provider quality report - Soundtrack Vibe_fx

Verification date: 2026-05-22.

No real provider keys were present in the local environment during this pass, so live audio quality scores are provisional and technical generation tests are marked skipped. The implementation now supports skipped tests cleanly: providers are listable, keyless providers show `KEY MISSING`, and no external provider request is made without the server secret.

## Score rubric

- 25 audio quality
- 20 filter/category precision
- 15 regularity across generations
- 15 rights/license/import clarity
- 10 latency
- 10 diversity for social video
- 5 API ergonomics

## ElevenLabs Music

- Technical success rate: skipped, `ELEVENLABS_API_KEY` missing.
- Median latency: not measured.
- Perceived quality for social edits: expected high, based on official MP3 export and media-music workflow.
- Filter regularity: prompt-preset only; duration and instrumental are native.
- Style diversity: broad prompt-based generation.
- SFX/transitions: possible by prompt, not a dedicated native SFX taxonomy in the Music API page.
- Rights clarity: good but tier-dependent; Music Terms must be snapshotted per account.
- Import simplicity: high; API returns audio in response, normalized as a server-generated audio data URL.
- Cost/quotas: paid subscribers; cost varies by seconds and plan.
- UX issues observed: none with missing key; UI reports `KEY MISSING`.
- Score: 80/100 provisional.
- Final decision: keep active behind key.

## Stable Audio

- Technical success rate: skipped, `STABILITY_API_KEY` missing and public endpoint schema not captured.
- Median latency: not measured.
- Perceived quality: expected high for full tracks and SFX.
- Filter regularity: prompt-preset only until endpoint schema is verified.
- Style diversity: high by prompt.
- SFX/transitions: strong fit conceptually.
- Rights clarity: promising licensed-data messaging, but account/API terms must be verified.
- Import simplicity: blocked until endpoint response format is confirmed.
- Cost/quotas: pricing page lists audio model costs, but Stable Audio 3.0 details need account confirmation.
- UX issues observed: visible as experimental/key-missing, no external call.
- Score: 65/100 provisional.
- Final decision: keep experimental.

## Loudly API

- Technical success rate: skipped, `LOUDLY_API_KEY` missing and endpoint docs require portal.
- Median latency: not measured.
- Perceived quality: likely good for social/catalog use.
- Filter regularity: public native dimensions are genre, tempo, energy, duration; exact values unavailable, so UI labels stay prompt-presets rather than fake native categories.
- Style diversity: strong, including catalog, playlists, prompts, stems, samples.
- SFX/transitions: possible through stems/samples if contract exposes them.
- Rights clarity: strong public commercial/legal guarantee claims; license tier must be snapshotted.
- Import simplicity: unknown until endpoint/export docs are available.
- Cost/quotas: custom/volume pricing.
- UX issues observed: experimental/key-missing only.
- Score: 68/100 provisional.
- Final decision: keep experimental.

## Mubert API

- Technical success rate: skipped, `MUBERT_CUSTOMER_ID`/`MUBERT_ACCESS_TOKEN` missing.
- Median latency: not measured.
- Perceived quality: likely strong for background loops/streams and short-form social beds.
- Filter regularity: high once account playlists are fetched; current UI maps a small subset and marks the rest as prompt presets.
- Style diversity: strong, with channels, library, genres/moods/activity/BPM, streaming.
- SFX/transitions: stems/instruments include FX/RISER/IMPACT in edit workflows.
- Rights clarity: strong public sublicensing/monetization claims, contract dependent.
- Import simplicity: medium; generation may be async and URLs may expire, so server storage should be added after generation.
- Cost/quotas: public tiers start at $49/month.
- UX issues observed: key missing is clean; no external call.
- Score: 76/100 provisional.
- Final decision: keep experimental until credentials/polling/storage are validated, then promote.

## SOUNDRAW API

- Technical success rate: skipped, `SOUNDRAW_API_KEY` missing and endpoint schema not public.
- Median latency: not measured.
- Perceived quality: likely useful for background music.
- Filter regularity: Genre/Mood/Theme public dimensions, exact values unavailable; UI keeps Vibe_CUT labels as prompt-presets until account docs provide official values.
- Style diversity: likely broad; needs API docs.
- SFX/transitions: not confirmed from public page.
- Rights clarity: strong commercial/no-strike claims; license must be captured.
- Import simplicity: unknown.
- Cost/quotas: Starter $29.99/month, Pro $300/month, custom.
- UX issues observed: experimental/key-missing only.
- Score: 62/100 provisional.
- Final decision: keep experimental, hide from production default if provider list becomes too busy.

## Beatoven.ai API

- Technical success rate: skipped, `BEATOVEN_API_KEY` missing and endpoint schema requires dashboard.
- Median latency: not measured.
- Perceived quality: likely good for background music; SFX support promising.
- Filter regularity: prompt-preset only.
- Style diversity: likely broad, but public taxonomy unavailable.
- SFX/transitions: promising via SFX API.
- Rights clarity: public commercial-cleared and ethically sourced claims; terms must be stored.
- Import simplicity: unknown.
- Cost/quotas: not captured publicly.
- UX issues observed: experimental/key-missing only.
- Score: 60/100 provisional.
- Final decision: keep experimental.

## Improvement plan

- Add optional live smoke tests gated by provider env vars: 10-20 second generation, audio preload, local/project import, rights manifest assertion, and Vibe_CUT add simulation.
- Promote ElevenLabs after one real generation/import test passes and the Music Terms snapshot is stored.
- Promote Mubert after implementing playlist cache, generation polling, and server-side storage for expiring URLs.
- Keep Stability, Loudly, SOUNDRAW, and Beatoven experimental until endpoint schemas are confirmed from account docs.
- Add a background job queue for generations over 20 seconds and for providers with async/polling workflows.
- Add provider-cost metadata to credits before exposing these providers to paid users.
- Add moderation/safety hooks for prompts and audio-to-audio uploads before enabling user-uploaded references.
- Cache provider metadata and native category lists server-side; never cache generated audio without user/project ownership metadata.
