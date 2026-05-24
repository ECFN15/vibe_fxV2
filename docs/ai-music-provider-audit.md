# AI music provider audit - Soundtrack Vibe_fx

Verification date: 2026-05-22.

Decision rules used here:

- `active`: official API, clear license posture, importable audio, provider-controlled prompts/categories, technically testable.
- `experimental`: promising official/partner API, but public docs, pricing, quota, endpoint details, or contract terms are incomplete.
- `manual-only`: quality/rights may be useful, but automatic integration is not clean enough.
- `rejected`: scraping, unofficial API, unclear rights, poor fit, or impossible import.

## ElevenLabs Music API

- Official docs consulted:
  - https://elevenlabs.io/docs/api-reference/music/compose-detailed
  - https://elevenlabs.io/docs/eleven-creative/products/music
- Type: AI music generation.
- Usable endpoint(s): `POST https://api.elevenlabs.io/v1/music/detailed`.
- Authentication: `xi-api-key` server header.
- Audio formats: API `output_format` enum; product docs state MP3 44.1 kHz, 128-192 kbps, with higher quality by plan. API docs also expose PCM tiers.
- Duration min/max: `music_length_ms` 3000-600000 in API docs; product FAQ states 3 seconds to 5 minutes.
- Official generation/search parameters: `prompt`, `composition_plan`, `music_length_ms`, `model_id=music_v1`, `seed`, `force_instrumental`, `respect_sections_durations`, `store_for_inpainting`, `with_timestamps`, `sign_with_c2pa`, `output_format`.
- Official categories/filters exposed: no finite public genre list. The provider exposes prompt styles, composition sections, include/exclude style controls, instrumental flag, duration, metadata/genres in response.
- Vibe_CUT labels:
  - All labels are `prompt-preset` for the current UI, because ElevenLabs does not publish a finite native category taxonomy for API selection.
  - `instrumental` and `duration` are `native`.
- Rights conditions: product docs say commercial use is cleared under certain subscriptions/conditions and refer to Music Terms per tier. Must store song id, subscription/tier evidence, C2PA request when used, prompt, license snapshot.
- Cost/plan: Music API available for paid subscribers; credit cost varies by plan and generated seconds.
- Risks: tier-dependent commercial terms, C2PA applies only to MP3, latency for longer generations, multipart parsing, plan restrictions for output formats.
- Decision: `active`.
- Reason: official endpoint, binary audio response, server key model, controllable duration/instrumental/prompt, and import can be tested once `ELEVENLABS_API_KEY` exists.

## MiniMax Music API

- Official docs consulted:
  - https://platform.minimax.io/docs/guides/music-generation
  - https://platform.minimax.io/docs/api-reference/music-generation
- Type: AI song/instrumental generation and cover generation.
- Usable endpoint(s): `POST https://api.minimax.io/v1/music_generation`; companion endpoints include lyrics generation and music cover preprocess.
- Authentication: `Authorization: Bearer <MINIMAX_API_KEY>` server header.
- Audio formats: `audio_setting.format=mp3` is documented; response can be `hex` or `url`, and URL outputs expire after 24 hours. Vibe_fx uses `hex` in the first adapter so the server can convert the result to an importable `data:audio/*` payload immediately.
- Duration controls: the public music generation schema does not expose a direct duration parameter for standard generation; Vibe_fx passes target duration in the prompt for now and stores the returned `extra_info.music_duration`.
- Official generation parameters: `model` (`music-2.6`, `music-cover`, free-tier variants), `prompt`, `lyrics`, `lyrics_optimizer`, `is_instrumental`, `output_format`, `audio_setting`, and cover-specific reference audio fields.
- Vibe_CUT labels:
  - All labels are `prompt-preset`.
  - `instrumental`, `lyrics`, `output_format`, and `audio_setting` are native dimensions.
- Rights conditions: account/plan terms must be stored with proof of generation; public docs do not mean outputs are automatically public domain.
- Decision: `active` for prototype connector.
- Reason: official API, implementable request/response, server-only key model, and immediate import path without needing a third-party wrapper.

## Mureka API

- Official docs consulted:
  - https://platform.mureka.ai/docs/
  - https://platform.mureka.ai/docs/api/operations/post-v1-song-generate.html
  - https://platform.mureka.ai/docs/api/operations/post-v1-instrumental-generate.html
  - https://platform.mureka.ai/docs/api/operations/get-v1-song-query-%7Btask_id%7D.html
- Type: AI song generation, instrumental generation, lyrics generation/extension, song extension, recognition/description, stems, remix and upload workflows.
- Usable endpoint(s): docs expose `POST /v1/song/generate`, `POST /v1/instrumental/generate`, task query endpoints, and upload endpoints under `https://api.mureka.ai`.
- Authentication: Bearer token (`MUREKA_API_KEY`) server header.
- Audio formats and exact response fields: not detailed enough in the static operation pages captured here; generation is asynchronous and requires task polling.
- Vibe_CUT labels:
  - All labels are `prompt-preset` until live account response schemas are validated.
  - `song`, `instrumental`, `lyrics`, and `task query` are native workflow dimensions.
- Decision: `experimental` for automatic generation, `manual import` supported.
- Reason: strong official fit, but adapter should not fabricate a response parser before an account-backed task schema is tested.

## Replicate Music Models

- Official docs consulted:
  - https://replicate.com/minimax/music-2.6
  - https://replicate.com/meta/musicgen
- Type: model hub for MiniMax Music, MusicGen, Riffusion, ACE-Step and other audio models via Replicate predictions.
- Authentication: `REPLICATE_API_TOKEN` server token.
- Audio formats and controls: model-specific. MiniMax Music 2.6 is documented as text-to-song/instrumental with optional lyrics; MusicGen has its own input contract.
- Vibe_CUT labels:
  - All labels are `prompt-preset`.
  - Provider model selection is a native hub dimension, but each model needs its own adapter mapping.
- Decision: `experimental` for automatic generation, `manual import` supported.
- Reason: fastest route to try multiple models, but production-grade integration must pin model versions, response URLs, license terms and input schemas per model.

## Stability AI / Stable Audio

- Official docs consulted:
  - https://platform.stability.ai/
  - https://platform.stability.ai/docs/release-notes
  - https://platform.stability.ai/pricing
  - https://stability.ai/news-updates/meet-stable-audio-3-the-model-family-built-for-artistic-experimentation-with-open-weight-models
- Type: AI music/SFX generation, audio-to-audio, open-weight model family.
- Usable endpoint(s): release notes announce a Stable Audio 3.0 API on 2026-05-20, but the static API reference did not expose a stable endpoint shape during this audit.
- Authentication: Stability API key expected.
- Audio formats: official release notes say 44.1 kHz stereo; pricing page lists Stable Audio 2.5 under 3D & Audio API. Exact response MIME/export fields need API reference confirmation.
- Duration min/max: release notes say Stable Audio 3.0 generates tracks up to six minutes; older Stable Audio 2.0 news says up to three minutes.
- Official parameters: text-to-audio and audio-to-audio are publicly described; exact public request schema not captured from static docs.
- Official categories/filters exposed: no finite taxonomy captured. Use prompt controls only until endpoint docs are verified.
- Vibe_CUT labels:
  - All labels are `prompt-preset`.
  - SFX labels (`impact / whoosh`, `riser / transition`) are compatible as prompt presets, not native filters.
- Rights conditions: Stability says Stable Audio 3.0 was trained on licensed AudioSparx data and honors opt-outs/fair compensation. Commercial/API terms still need per-account terms confirmation.
- Cost/plan: pricing page lists audio models with credit costs; exact Stable Audio 3.0 pricing/limits need account docs.
- Risks: endpoint opacity in public docs, model/version churn, terms by plan, audio-to-audio upload copyright policy.
- Decision: `experimental`.
- Reason: strong provider and official API announcement, but no public endpoint schema was available enough to implement a safe automatic adapter today.

## Loudly Music API

- Official docs consulted:
  - https://www.loudly.com/music-api
  - https://www.loudly.com/developers
- Type: hybrid AI generation, catalog, playlists, radio/streaming, stems, sample packs.
- Usable endpoint(s): developer portal/documentation is referenced, but endpoint paths were not visible in the public page.
- Authentication: API key via developer portal.
- Audio formats: public page advertises studio-quality audio and lossless `.WAV`.
- Duration min/max: public page says generator accepts duration, but no min/max in public page.
- Official parameters: text-to-music prompt; parametric generator with genre, tempo, energy, duration; catalog, playlists, stems, sample packs.
- Official categories/filters exposed: genre, tempo, energy, duration are public native dimensions; no exhaustive values in the public page.
- Vibe_CUT labels:
  - All labels are currently `prompt-preset`, because the public page exposes native dimensions (`genre`, `tempo`, `energy`, `duration`) but not the exact provider value lists needed for a defensible mapping.
  - `genre`, `tempo`, `energy`, `duration` remain visible as native-public dimensions, not as invented selectable values.
  - `impact / whoosh`, `riser / transition`: `unsupported` for automatic generation until stems/sample/SFX endpoints and license scope are confirmed in the developer portal.
- Rights conditions: public page claims royalty-free, worldwide, perpetual, digital-platform use, monetization, and legal guarantee.
- Cost/plan: custom/volume pricing, by business size, track volume, license type Basic/Premium; PAYG mentioned via portal.
- Risks: endpoint docs behind portal, license tier differences, no public exhaustive taxonomy.
- Decision: `experimental`.
- Reason: commercially promising and rights-forward, but automatic integration must wait for developer portal endpoint confirmation.

## Mubert API

- Official docs consulted:
  - https://mubert.com/api
  - https://mubert.com/api/docs
- Type: AI music generation, streaming, curated library, image-to-music, text-to-music.
- Usable endpoint(s):
  - `POST https://music-api.mubert.com/api/v3/public/tracks`
  - `GET https://music-api.mubert.com/api/v3/public/playlists`
  - `GET https://music-api.mubert.com/api/v3/public/streaming/get-link`
  - `POST /public/tracks/{TRACK_ID}/similar`
  - `POST /public/tracks/{TRACK_ID}/edit`
- Authentication: customer headers `customer-id` and `access-token`; service/company endpoints use `company-id` and `license-token`.
- Audio formats: `mp3`, `wav`; bitrates `32, 96, 128, 192, 256, 320`.
- Duration min/max: marketing page says from 15 seconds and up to 25 minutes, more by enterprise. Docs license model exposes `max_track_duration`.
- Official generation/search parameters: `playlist_index`, `duration`, `bitrate`, `format`, `intensity`, `mode`, optional `bpm`, optional `key`, text/image workflows, similar/edit, replace/delete instruments/stems.
- Official categories/filters exposed: playlists expose `category`, `group`, `channel`, `playlist_index`, BPM ranges, keys; library filters by genre, mood, activity, BPM; intensity low/medium/high; mode track/jingle/loop/mix.
- Vibe_CUT labels:
  - `ambient / lounge`, `house`, `tech / futuristic`: `mapped` initially to playlist/channel prompt mappings until live `/public/playlists` is cached.
  - `impact / whoosh`, `riser / transition`: `mapped` to `FX`, `RISER`, `IMPACT` stem/instrument concepts for edit workflows, not initial generation.
  - Other labels: `prompt-preset` until the channel list is fetched for the account.
- Rights conditions: public page claims licensed/partner content, royalty-free, DMCA-free, cleared for monetization, sublicensing by plan/contract.
- Cost/plan: public page lists Trial $49/mo, Startup $199/mo, Startup+ $499/mo, Custom; generation/streaming quotas by tier.
- Risks: per-customer credential model, track URL expiration, async generation, license features vary by contract, playlist taxonomy should be fetched live.
- Decision: `experimental`.
- Reason: official docs and rich API are strong, but integration needs account credentials and polling/storage behavior before declaring production-active.

## SOUNDRAW API

- Official docs consulted:
  - https://soundraw.io/api
- Type: AI music generation API for embedded products.
- Usable endpoint(s): endpoint paths not visible in public page.
- Authentication: API plan/access; exact auth scheme not visible publicly.
- Audio formats: not specified on public page.
- Duration min/max: song/month quotas visible; exact duration controls not public.
- Official parameters: public page exposes Genre, Mood, Theme inputs.
- Official categories/filters exposed: `genre`, `mood`, `theme`, but no exhaustive public value list.
- Vibe_CUT labels:
  - All labels are currently `prompt-preset`, because public docs expose `genre`, `mood`, and `theme` as dimensions but do not expose an exhaustive value list or endpoint schema.
  - No label is treated as `native` until the exact values are exposed by the API.
- Rights conditions: public page says royalty-free, safe for commercial use, license to monetize, no copyright strikes.
- Cost/plan: API Starter $29.99/month up to 100 songs/month; API Pro $300/month up to 1000 songs/month with six-month commitment; custom plan.
- Risks: public endpoint absence, license docs hosted externally, no public exhaustive taxonomy, unknown export fields.
- Decision: `experimental`.
- Reason: strong rights claims and useful categories, but no implementable public endpoint today.

## Beatoven.ai API

- Official docs consulted:
  - https://www.beatoven.ai/api
  - https://sync.beatoven.ai/apiDashboard
- Type: AI music generation and SFX API.
- Usable endpoint(s): API dashboard required; public page does not show endpoint schema.
- Authentication: API key/account dashboard expected.
- Audio formats: public page emphasizes high-fidelity output; exact formats not visible.
- Duration min/max: not visible in public page.
- Official parameters: text-prompt music generation; SFX API; prompt input. Public page mentions maestro model trained on music and SFX data.
- Official categories/filters exposed: no public finite taxonomy captured; use prompt presets only.
- Vibe_CUT labels:
  - All music labels are `prompt-preset`.
  - `impact / whoosh`, `riser / transition`: `prompt-preset` for SFX API until endpoint details are available.
- Rights conditions: public page states generated background music is cleared for commercial use and model data is ethically sourced.
- Cost/plan: not captured from public page.
- Risks: dashboard-only technical docs, unknown quotas/latency/export fields, API surface may differ by account.
- Decision: `experimental`.
- Reason: product fit is good, but no automatic adapter should call an undocumented endpoint.

## Providers kept outside active AI automation

- Openverse remains the active free catalog provider, with Jamendo/Freesound scoped by stable source/category filters.
- Pixabay remains a manual exception only.
- Internet Archive and Wikimedia Commons remain rejected for active Soundtrack providers because their corpus is too heterogeneous for modern, social-video-safe automatic import.
- Suno/Udio remain rejected for automation because the task forbids unofficial APIs and scraping.
