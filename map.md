# map.md - Carte vivante Vibe_fx V2

Derniere mise a jour : 2026-06-07

## Regle

Mettre a jour ce fichier a chaque creation, suppression, renommage, deplacement ou modification structurelle.

## Arbre actuel

```text
.
|-- .github/
|   `-- workflows/
|       `-- verify.yml                  # CI GitHub Actions : verify local + emulateurs + smoke routes/UI + sauvegarde studio emulateurs
|-- .firebaserc                         # Projet Firebase par defaut : vibefx-v2
|-- .agents/
|   `-- skills/                         # Skills design importes + note locale Vibe_OS
|       |-- clean-saas/
|       |-- cyber-neon/                 # Direction visuelle marque / pages publiques
|       |-- dark-ui/                    # Direction visuelle surfaces produit
|       |-- design.md/
|       |   `-- skill.md                # Note de design system Vibe_OS Cockpit Mode ajoutee localement, a confirmer avant integration finale
|       |-- editorial-minimal/
|       |-- editorial-type/
|       |-- experimental-type/
|       |-- expressive-brand/
|       |-- geometric-modern/
|       |-- glossy-modern/
|       |-- high-contrast/
|       |-- high-end-design/
|       |-- light-ui/
|       |-- minimal-design/
|       |-- monochrome-ui/
|       |-- motion/
|       |-- pastel/
|       |-- playful-design/
|       |-- serif-display/
|       |-- soft-gradients/
|       |-- technical-sans/
|       |-- technical-ui/               # Direction controles/workflow
|       |-- utilitarian/
|       `-- vibrant-accents/
|-- docs/
|   |-- studio-ai-agents-megaprompt.md  # Prompt d'integration de la colonne d'agents IA contextualisee par onglet studio
|   |-- vibecut-export-hardening-status-2026-06-06.md # Statut par phase Export Pro : done/partial/not done, blocages live K1, emulators Java, renderer frame-by-frame et fixtures MP4
|   |-- vibecut-export-pro-checkpoint-2026-06-06.md # Checkpoint de reprise : changements, tests executes, limites Cloud Run, backoffice couts et sequence demain
|   |-- vibecut-export-production-hardening-megaprompt.md # Megaprompt release Export Pro renderer-first : navigateur cockpit, machines serveur source de verite, textes/animations/transitions/colorimetrie/audio, destination PC et smoke final K1
|   `-- vibecut-export-production-runbook-2026-06-06.md # Runbook source de verite Export Pro : variables, secrets, deploy controle, Cloud Run prive/OIDC, gates, smoke K1 et rotation
|-- functions/
|   |-- index.js                        # Exports Functions Meta/OAuth/publication + billing Stripe + AI gateway + Export Pro video
|   |-- package.json                    # Firebase Functions Node 20 + stripe server SDK + BigQuery client Billing Export + checks modules src
|   |-- package-lock.json
|   `-- src/
|       |-- account.js                  # Callable suppression compte avec auth recente : purge Storage, publications, scrub jobs/checkouts, delete Auth
|       |-- ai/
|       |   |-- jobs.js                  # Callable createAiJob, reserve/capture/release credits, rate limit uid/feature/ipHash
|       |   |-- jobUtils.js              # Validation feature/requestId, hashes idempotence, IP et rate limit
|       |   |-- mockProvider.js          # Provider IA mock sans appel externe pour tests credits
|       |   |-- policies.js              # Policies IA bootstrap mock + lecture aiPricingPolicies + calcul cout/marge
|       |   |-- providerRegistry.js      # Registry providers IA global, tous productionAllowed=false par defaut
|       |   |-- reconciliation.js        # Scheduled reconciliation des reservations IA perimees en europe-west1, region compatible Cloud Scheduler
|       |   `-- router.js                # Router provider/model v1 avec scoring multi-candidats et blocage production mock
|       |-- billing.js                  # Checkout Session, webhook Stripe signe, fulfillment idempotent
|       |-- billingEvents.js            # Classification events Checkout Stripe fulfill/failed/ignored
|       |-- billingProducts.js          # Mapping serveur produits Stripe -> entitlements/credits
|       |-- billingSession.js           # Validation pure priceId/metadata des sessions Checkout
|       |-- videoExport.js              # Callables/worker Export Pro : create/cancel/retry/download/admin telemetry avec Billing Export BigQuery optionnel, taskQueue processVideoExportJob en europe-west1, validation manifeste/quotas/paths owner-scoped, manifest JSON Storage et App Check
|       `-- appCheck.js                 # Politique App Check : enforce par defaut hors emulateurs
|-- public/
|   |-- assets/
|   |   `-- vibefx/
|   |       `-- demo-astronaut.png      # Asset demo pour pages publiques et studio
|   |-- music/                         # Pistes audio importees pour le module video Vibe_CUT
|   |   |-- local-imports/              # Copies audio locales dev Soundtrack (ignorees Git hors .gitkeep) + manifest genere par /api/music/local-file-import
|   |   `-- pixabay-ai/                # Import local genere par `npm run import:pixabay-ai` : MP3 + manifest droits Pixabay AI Generated
|   |-- file.svg
|   |-- globe.svg
|   |-- next.svg
|   |-- vercel.svg
|   `-- window.svg
|-- render-service/                    # Cloud Run FFmpeg Export Pro Vibe_CUT : verification HMAC timestamp ou platform-iam confirme, download Storage, trims/concat/xfade adjacent/rotation, textes fade/none, colorimetrie FFmpeg, mix audio source/externe, encode MP4 et upload output
|   |-- Dockerfile                     # Image Node 20 slim + ffmpeg + npm install deps renderer
|   |-- package.json                   # Service Node ESM + @google-cloud/storage
|   |-- README.md                      # Contrat renderer signe, perimetre FFmpeg reel, limites codecs/transitions/animations et prochaines etapes production
|   `-- src/
|       `-- server.js                  # Endpoints /health et /render, validation signature/manifeste, FFmpeg concat + fade/crossfade adjacent et upload Storage
|-- src/
|   |-- app/
|   |   |-- api/
|   |   |   |-- _midjourney/
|   |   |   |   `-- server.js           # Adaptateur serveur Next pour bibliotheque/scraper Midjourney, bloque en production par defaut
|   |   |   |-- catalog/
|   |   |   |   |-- [jobId]/
|   |   |   |   |   `-- route.js         # Suppression d'un item catalogue
|   |   |   |   `-- route.js            # Catalogue pagine et filtres
|   |   |   |-- image/
|   |   |   |   `-- [...path]/
|   |   |   |       `-- route.js        # Lecture image locale issue du scraper
|   |   |   |-- music/
|   |   |   |   |-- _providers/
|   |   |   |   |   |-- aiProviderRegistry.js # Registry serveur des providers IA musique : statuts par env, filtres natifs/prompt-presets, docs/licences et controles UI
|   |   |   |   |   |-- elevenLabsMusicAdapter.js # Adapter ElevenLabs Music API : generation serveur /v1/music/detailed, duration/instrumental/C2PA, audio normalise
|   |   |   |   |   |-- minimaxMusicAdapter.js # Adapter MiniMax Music API : /v1/music_generation, sortie hex/data URL, prompt + instrumental
|   |   |   |   |   |-- mubertAdapter.js # Adapter Mubert API v3 public/tracks : playlist_index, duree, intensity, mode, format, BPM et normalisation piste
|   |   |   |   |   |-- placeholderAiAdapter.js # Garde-fou providers experimentaux : key missing ou contrat requis, sans appel externe non documente
|   |   |   |   |   `-- pixabayAudioAdapter.js # Adapter provider-first pixabay-audio : q/category explicites, anciens filtres generiques ignores, URL Pixabay Music, parsing HTML borne, cache 24h, metadata-only ou provider-unavailable si URL audio non fiable/403
|   |   |   |   |-- _shared/
|   |   |   |   |   |-- audioImport.js # Validation/proxy audio URL allowlistee reutilisee par import local et import projet authentifie
|   |   |   |   |   `-- providerTrack.js # Normalisation commune des pistes et statuts des providers IA musique
|   |   |   |   |-- ai-generate/
|   |   |   |   |   `-- route.js        # Generation IA musique cote serveur via adapters isoles, validation prompt/duree/provider et refus sans secret
|   |   |   |   |-- ai-import/
|   |   |   |   |   `-- route.js        # Import audio IA via data URL serveur ou URL audio allowlistee, MIME/poids verifies
|   |   |   |   |-- ai-providers/
|   |   |   |   |   `-- route.js        # Metadata providers IA : API/EXPERIMENTAL/KEY MISSING, filtres natifs et presets Vibe_CUT
|   |   |   |   |-- free-search/
|   |   |   |   |   `-- route.js        # Agregateur serveur provider-first : Pixabay exception manuelle + Openverse social-first ; Archive/Wikimedia unsupported ; Jamendo/Freesound uniquement si cle serveur
|   |   |   |   |-- import/
|   |   |   |   |   `-- route.js        # Proxy serveur controle pour URL audio directe allowlistee, validation host final, sans scraping de catalogue
|   |   |   |   |-- local-file-import/
|   |   |   |   |   `-- route.js        # Import audio local dev vers public/music/local-imports avec manifest, purge demo et suppression fichier ; prod bascule Firebase Storage
|   |   |   |   |-- pixabay-local-import/
|   |   |   |   |   `-- route.js        # Lance localement le scraper Playwright Pixabay Music par theme depuis Soundtrack, bloque en production sauf flag explicite
|   |   |   |   |-- project/
|   |   |   |   |   `-- import-url/
|   |   |   |   |       `-- route.js    # Import projet authentifie d'une URL audio directe avec metadata droits obligatoires
|   |   |   |   `-- providers/
|   |   |   |       `-- route.js        # Metadata providers musique : Pixabay manuel, providers API searchEnabled, Jamendo/Freesound caches tant que leurs cles serveur manquent
|   |   |   |-- proxy-image/
|   |   |   |   `-- route.js            # Proxy image distant pour la bibliotheque
|   |   |   |-- reclassify/
|   |   |   |   |-- reset/
|   |   |   |   |   `-- route.js         # Reset job reclassification
|   |   |   |   |-- status/
|   |   |   |   |   `-- route.js         # Statut job reclassification
|   |   |   |   `-- route.js            # Lancement reclassification catalogue
|   |   |   |-- reset/
|   |   |   |   `-- route.js            # Reset catalogue scraper
|   |   |   |-- scrape/
|   |   |   |   `-- route.js            # Lancement scraping Midjourney
|   |   |   |-- status/
|   |   |   |   `-- route.js            # Statut scraping Midjourney
|   |   |   `-- themes/
|   |   |       `-- route.js            # Categories/themes bibliotheque
|   |   |-- components/
|   |   |   |-- PublicationRoutePipeline.jsx # Pipeline SVG animé partagé
|   |   |   `-- SeoLandingPage.jsx       # Gabarit SSR des pages SEO publiques
|   |   |-- account/
|   |   |   |-- AccountClient.jsx        # Dashboard prive Auth/profil/acces lifetime/achats en client component, texte utilisateur nettoye hors jargon serveur
|   |   |   |-- billing/
|   |   |   |   `-- page.js               # Vue privee facturation noindex
|   |   |   |-- usage/
|   |   |   |   `-- page.js               # Vue privee usage/jobs IA noindex
|   |   |   `-- page.js                 # Dashboard compte noindex
|   |   |-- backoffice/
|   |   |   |-- BackofficeClient.jsx      # Backoffice noindex : switch IA + dashboard exports video via callable admin globale puis fallback compte connecte
|   |   |   |-- exportTelemetry.js        # Helpers purs dashboard exports video : cout Cloud Run/Storage estime + facture Cloud Run Billing Export BigQuery et agregats jour/semaine/mois
|   |   |   `-- page.js                  # Metadata noindex du backoffice provisoire avant Firebase/admin claims
|   |   |-- editeur-image-instagram/
|   |   |   `-- page.js                 # Page SEO editeur image Instagram
|   |   |-- outil-publication-reseaux-sociaux/
|   |   |   `-- page.js                 # Page SEO outil publication reseaux sociaux
|   |   |-- pricing/
|   |   |   `-- page.js                 # Page SEO pricing lifetime 9,99 EUR pour l'interface visible du lancement
|   |   |-- publier-instagram-facebook/
|   |   |   `-- page.js                 # Page SEO publication Instagram/Facebook
|   |   |-- ressources/
|   |   |   |-- formats-instagram/
|   |   |   |   `-- page.js               # Guide SEO formats Instagram
|   |   |   `-- meta-oauth-publication-instagram-facebook/
|   |   |       `-- page.js             # Guide SEO Meta OAuth publication
|   |   |-- studio/
|   |   |   |-- layout.js               # CSS lourds du studio scopes a /studio, incluant le rail IA
|   |   |   |-- page.js                 # Page studio noindex + deep-link `?workspace=layout`
|   |   |   `-- StudioClient.jsx        # Client wrapper du studio
|   |   |-- favicon.ico
|   |   |-- globals.css                 # Base CSS + direction cyber/dark + page d'accueil + backoffice lancement IA/export telemetry
|   |   |-- layout.js                   # Metadata racine + imports CSS globaux
|   |   |-- page.js                     # Unique page d'accueil SSR optimisée (FAQ + Pipeline + Launch)
|   |   |-- robots.js                   # Robots Next.js
|   |   |-- seo-pages.js                # Donnees metadata/contenu JSON-LD des pages SEO publiques
|   |   `-- sitemap.js                  # Sitemap Next.js pour les pages publiques
|   |-- features/
|   |   |-- export/                    # Module partage Export Pro : presets sociaux/pro, validation support renderer, image canvas PNG/JPEG/WebP, queue locale et panneau Export Settings
|   |   |   |-- components/
|   |   |   |   `-- ExportSettingsPanel.jsx # Panneau dense type DaVinci adapte Vibe_fx : presets, tabs Video/Audio/File/Advanced, estimation, Add to Render Queue
|   |   |   |-- lib/
|   |   |   |   |-- exportSettings.js       # Settings pro, sanitization filename, validation supporte/bloque/futur, estimations et overrides manifest
|   |   |   |   `-- imageExport.js         # Export canvas PNG/JPEG/WebP + comparaison visuelle simple de canvas
|   |   |   |-- presets/
|   |   |   |   `-- exportPresets.js       # Presets sociaux rapides, formats/containers/codecs/audio/rate control/qualite
|   |   |   |-- renderQueue/
|   |   |   |   `-- renderQueue.js         # Modele local queue : queued/rendering/completed/failed/cancelled + logs
|   |   |   `-- index.js                 # Exports publics du module export
|   |   |-- publications/
|   |   |   |-- components/
|   |   |   |   |-- InstagramPhonePreview.jsx
|   |   |   |   |-- MetaOAuthPanel.jsx
|   |   |   |   |-- PublicationComposer.jsx
|   |   |   |   |-- PublicationDashboard.jsx
|   |   |   |   |-- PublicationList.jsx
|   |   |   |   `-- PublicationPreview.jsx
|   |   |   |-- helpers/
|   |   |   |   `-- publicationHelpers.js # slug, caption/checker, upload et payload publication
|   |   |   |-- PublicationsManager.jsx # Orchestrateur studio/publications + layout studio
|   |   |   `-- publications.css
|   |   |-- vibefx-layout/
|   |   |   |-- components/
|   |   |   |   |-- canvas/
|   |   |   |   |   `-- CanvasWorkspace.jsx
|   |   |   |   |-- panels/
|   |   |   |   |   |-- BackgroundPanel.jsx
|   |   |   |   |   |-- GeometryPanel.jsx
|   |   |   |   |   |-- SmoothBlurPopup.jsx
|   |   |   |   |   `-- TextAssetsPanel.jsx
|   |   |   |   |-- sidebar/
|   |   |   |   |   `-- LayoutSidebar.jsx
|   |   |   |   |-- tutorial/
|   |   |   |   |   |-- LayoutDemoOverlay.jsx
|   |   |   |   |   `-- LayoutTutorialOverlay.jsx
|   |   |   |   `-- ui/
|   |   |   |       |-- ControlGroup.jsx
|   |   |   |       `-- Select.jsx
|   |   |   |-- data/
|   |   |   |   `-- constants.jsx
|   |   |   |-- engine/
|   |   |   |   |-- assetRenderer.js
|   |   |   |   |-- layoutRenderer.js
|   |   |   |   `-- textRenderer.js
|   |   |   |-- hooks/
|   |   |   |   |-- useCanvasEvents.js
|   |   |   |   |-- useCanvasRenderer.js
|   |   |   |   |-- useImageUpload.js
|   |   |   |   `-- useLayoutHelpers.js
|   |   |   |-- utils/
|   |   |   |   `-- canvasUtils.js
|   |   |   |-- index.js
|   |   |   |-- VibeFxLayout.jsx
|   |   |   |-- vibefx-layout.css
|   |   |   `-- vibefx-tailwind.css
|   |-- vibefx-studio/                 # Dossier reel : src/features/vibefx-studio/
|   |   |-- ai/                         # Catalogue/actions/payload/client/hook du rail IA studio, gateway Functions uniquement
|   |   |-- components/                 # Header, tabs Studio/Layout/Library/Soundtrack/Vision/Video et panneaux source Vibe_fx ; le header embarque le mini-player Soundtrack global
|   |   |   `-- ai/                     # Rail IA contextuel : actions, prompt, credits, trace job, outputs
|   |   |-- data/                       # Constantes, presets et donnees UI importees
|   |   |-- engine/                     # Rendu canvas/physics importes depuis Vibe_fx
|   |   |-- hooks/                      # Hooks interaction, renderer, bibliotheque et assets
|   |   |-- soundtrack/                 # Onglet Soundtrack full page V2 : page Import IA gratuit par defaut + bibliotheque Vibe_fx en popup desktop/fullscreen mobile, Firebase projet ou local-first
|   |   |   |-- components/               # ProjectLibraryPanel popup avec import fichier, suppression/playlists/classement local/projet, AiMusicImportAssistant en pleine page Soundtrack, Search provider-specifique conserve pour composants legacy, results/rows/player et SoundtrackHeaderMiniPlayer global
|   |   |   |-- data/                     # Providers/filtres/defaults Soundtrack reutilisant musicCatalog
|   |   |   |-- hooks/                    # Recherche API, player preview, controller global Soundtrack, bibliotheque projet Firebase et bibliotheque locale IndexedDB/dossier
|   |   |   |-- services/                 # Modele/client Firestore/Storage projet (tracks + playlists), cache/search provider, IndexedDB, manifest, File System Access, import dev public/music/local-imports, downloads locaux et audit droits
|   |   |   |-- SoundtrackPage.jsx        # Experience full page Soundtrack dans le studio, sans canvas/sidebar, import IA gratuit par defaut sans pistes starter injectees, consomme le controller audio global
|   |   |   `-- soundtrack.css          # CSS dark-ui/technical-ui scope Soundtrack charge par /studio/layout, incluant le player bas et le mini-player header
|   |   |-- utils/                      # Utilitaires canvas/image + color science Vision (`visionColorScience.js`, `visionMetrics.js`)
|   |   |-- video/                      # Module Vibe_CUT importe, dont `export/` pour ExportManifest + services localMock/Firebase future, `data/musicCatalog.js` pour catalogue/sources/licences, `data/musicRights.js` pour audit/manifeste droits musique, `services/exportRightsManifestClient.js` pour persistance Firestore owner-scoped, `model/timelineModel.js` pour le modele canonique tracks/items, `utils/audioWaveform.js` pour l'extraction waveform client, `utils/quickTools.js` pour la palette rapide drag/drop, et `panels/VibeCutQuickPanel.jsx` pour le panneau droit VibeCut
|   |   |-- index.js
|   |   |-- VibeFxStudio.jsx            # Shell studio Vibe_fx + import publication V2 + vue Soundtrack full page + controller audio global persistant entre onglets studio
|   |   `-- VideoApp.jsx               # Surface video sans react-router
|   |-- config/
|   |   `-- aiLaunch.js                 # Flag de lancement IA, registre surfaces IA, localStorage/cookie override backoffice
|   |-- hooks/
|   |   `-- useAiLaunchSettings.js      # Hook client useSyncExternalStore pour activer/masquer localement les surfaces IA
|   `-- lib/
|       `-- firebase.js                 # Client Firebase NEXT_PUBLIC_*
|-- .env.example                        # Variables publiques + secrets a creer, dont connecteurs musique serveur, IA, et Export Pro Vibe_CUT localMock/Cloud Run
|-- .env.emulators.example              # Variables demo pour brancher le client aux emulateurs + connecteurs musique optionnels
|-- .gitignore
|-- AGENTS.md                           # Regles agents du projet
|-- apphosting.yaml                     # Base Firebase App Hosting + variables publiques App Hosting, dont NEXT_PUBLIC_VIBECUT_EXPORT_MODE=firebase
|-- CLAUDE.md                           # Fichier genere, non encore enrichi
|-- eslint.config.mjs
|-- firebase.json                       # Config Firebase backend + emulateurs, sans Hosting classique
|-- firestore.indexes.json
|-- firestore.rules                     # Rules ownerUid + users/ledger/jobs/payments/videoExportJobs sensibles
|-- jsconfig.json
|-- MEGAPROMPT.md                       # Prompt maitre de conception/deploiement
|-- next.config.mjs
|-- package.json                        # Next.js + Firebase + lucide + three + commandes import:pixabay-ai, tests Vibe_CUT export et dry-run K1
|-- package-lock.json
|-- README.md
|-- seo.md                              # Agent SEO Google
|-- skills-lock.json                    # Lock des 23 skills importes
|-- test-fixtures/
|   `-- vision-corpus/
|       `-- README.md                   # Instructions de depot local des 12 images smartphone ignorees par Git
|-- vibecut-video-samples/
|   |-- HDRSample.mkv                   # Fixture video HDR Windows pour tests Vibe_CUT
|   `-- SDRSample.mkv                   # Fixture video SDR Windows pour tests Vibe_CUT
|-- scripts/
|   |-- audit-secrets.mjs               # Audit anti-secrets hardcodes dans les fichiers versionnables
|   |-- audit-scope.mjs                 # Audit automatique scope Functions, SEO, modules et termes source
|   |-- audit-vibecut-export-hardening-requirements.mjs # Audit structure par exigences du megaprompt Export Pro : phase done/partial/blocked, preuves code/docs et no-go release
|   |-- check-deploy-target.mjs         # Refuse un deploiement sans projet Firebase dedie
|   |-- check-vibecut-export-local-prereqs.mjs # Check prerequis locaux Export Pro : K1, ffmpeg/ffprobe via PATH/env/chemins Windows, Java emulateurs
|   |-- check-vibecut-export-release-gate.mjs # Gate non mutant release Export Pro : echoue tant que K1 live, fixtures MP4, emulateurs Java et phases partial ne sont pas prouves
|   |-- guard-vibecut-k1-live-smoke.mjs # Sas non mutant avant smoke live K1 : exige confirmation exacte, refuse execution live directe et verifie gates/env/prerequis
|   |-- prepare-vibecut-k1-live-smoke.mjs # Dry-run non cloud du smoke final K1 : verifie deux sources locales, construit le manifest attendu MP4/H.264/AAC et rappelle la confirmation requise
|   |-- run-vibecut-k1-cloud-run-live-smoke.mjs # Smoke live callable Firebase K1 : upload Storage, createVideoExportJob, attente ready, URL de download et sauvegarde K1, bloque sans confirmation + VIBECUT_EXECUTE_LIVE=1
|   |-- run-vibecut-k1-cloud-run-direct-smoke.mjs # Smoke live direct renderer Cloud Run K1 : upload Storage, POST HMAC /render, rotation gauche 270, crossfade, texte fade et telechargement MP4 dans K1
|   |-- render-vibecut-k1-local-mp4-smoke.mjs # Smoke local non Cloud FFmpeg : produit un MP4 K1 1080x1920 H.264/AAC avec rotation, crossfade, texte et verifie codec/duree/frames non noires
|   |-- render-vibecut-pro-fixtures-local-smoke.mjs # Smoke local non Cloud FFmpeg : genere les MP4 fixtures pro supportees, verifie H.264/resolution/duree/audio/frames et region texte
|   |-- render-vibecut-renderer-local-contract-smoke.mjs # Smoke local non Cloud du renderer canonique : importe buildFfmpegArgs du service Cloud Run, rend K1 + fixture combinee et verifie MP4
|   |-- prepare-vibecut-pro-fixtures.mjs # Dry-run non cloud des fixtures pro : texte statique, animation bloquee, crossfade, colorimetrie, audio externe et pile combinee
|   |-- smoke-backoffice-export-telemetry.mjs # Smoke test helpers dashboard exports video : estimations internes + couts Google Billing Export BigQuery sans Firebase live
|   |-- check-e2e-readiness.mjs         # Liste les prerequis Firebase/Meta manquants avant E2E reel
|   |-- check-emulator-readiness.mjs    # Verifie firebase-tools, Java 21+ et config emulators
|   |-- check-pixabay-provider.mjs      # Probe reseau Pixabay Music depuis Node : detecte 403/challenge et confirme si des URL audio CDN sont exposees
|   |-- import-pixabay-ai-music.mjs     # Scraper/import local Playwright pour https://pixabay.com/music/search/ai-generated/, limite, sans contournement challenge, avec manifest droits
|   |-- check-vision-corpus.mjs         # Verifie les 12 fixtures smartphone locales ignorees par Git
|   |-- audit-vision-filters.mjs        # Audit statique des profils Vision et du branchement safe smartphone, incluant temperature/halation/tint global masques
|   |-- firebase-deploy.mjs             # Wrapper cross-platform deploy backend/functions avec cible controlee, firebase-tools local et timeout discovery 60s
|   |-- run-vision-corpus-test.mjs      # Lance Next local puis Playwright sur le corpus smartphone Vision local
|   |-- run-vision-ui-test.mjs          # Lance un serveur Next local dedie puis Playwright Vision avec SMOKE_BASE_URL controle
|   |-- run-video-ui-test.mjs           # Lance un serveur Next local dedie puis Playwright Vibe_CUT avec SMOKE_BASE_URL controle
|   |-- run-firebase-emulators-test.mjs # Wrapper test:emulators : exige Java 21+ via VIBECUT_JAVA_HOME/JAVA_HOME/PATH/chemins Windows puis lance firebase emulators:exec
|   |-- smoke-firebase-emulators.mjs    # Smoke test Auth/Firestore/Storage rules sous emulateurs, incluant credits/jobs/payments
|   |-- smoke-export-professional-settings.mjs # Smoke pur du module Export Pro : presets sociaux/custom, PNG/JPEG/WebP, filename, estimation, queue, echec et comparaison canvas
|   |-- smoke-account-deletion.mjs      # Smoke test suppression compte serveur sans droits client sensibles
|   |-- smoke-billing-products.mjs      # Smoke test mapping produits Stripe sans exposer les price IDs cote public
|   |-- smoke-billing-ledger.mjs        # Smoke test fulfillment Stripe idempotent et ledger credits sans emulateur
|   |-- smoke-ai-gateway.mjs            # Smoke test policies/router/idempotence pure de la gateway IA mock
|   |-- smoke-ai-ledger.mjs             # Smoke test transactionnel reserve/capture/release IA + securityEvents sans emulateur
|   |-- smoke-app-check.mjs             # Smoke test de la politique App Check enforce par defaut hors emulateurs
|   |-- smoke-publication-flow.mjs      # Smoke test rejouable du parcours publication sans Firebase reel
|   |-- smoke-routes.mjs                # Smoke test HTTP des routes SEO/studio + noindex compte
|   |-- smoke-studio-emulator-ui.mjs    # Smoke test navigateur studio + sauvegarde Firestore/Storage emulateurs
|   |-- smoke-studio-ai-rail.spec.cjs   # Smoke Playwright du rail IA studio : ouverture, actions par onglet, prompt, cout, gateway/error, mobile
|   |-- fixtures/
|   |   `-- pixabay-music-search.html   # Fixture HTML locale pour parsing provider Pixabay Music importable + metadata-only
|   |-- smoke-soundtrack-core.mjs       # Smoke pur Soundtrack V2 : mapping ProviderTrack -> ProjectSoundTrack, droits, cache key provider, parsing historique Pixabay, manifest sans Blob/File
|   |-- smoke-soundtrack-ui.spec.cjs    # Smoke Playwright onglet Soundtrack V2 : provider-first Pixabay manuel + Openverse social-first, Archive/Wikimedia retires, aucun fallback Vibe_CUT dans le scan, popup bibliotheque, import fichier local, playlists/suppression locaux, manifest, providers/API, responsive
|   |-- smoke-studio-ui.spec.cjs        # Smoke test Playwright du flux studio -> import publication
|   |-- smoke-video-timeline-model.mjs  # Smoke test pur du modele timeline/export Vibe_CUT : tracks/items, render plan, trous/overlaps video+transitions, fps/codec, plan de frames
|   |-- smoke-video-store.mjs           # Smoke test pur du store Vibe_CUT : mutations timeline et refus des overlaps selon `tracks[].allowOverlap`
|   |-- smoke-vibecut-export-manifest.mjs # Smoke test pur ExportManifest : MP4/H.264/AAC, modes qualite, sources locales vs Firebase, estimations cout/source et couverture renderer
|   |-- smoke-vibecut-export-media-metadata.mjs # Smoke test pur metadata output front : mapping container/codec/MIME MP4/WebM/MOV/images et codecs H.264/H.265/VP9/AV1/ProRes/DNxHR
|   |-- smoke-vibecut-export-jobs.mjs   # Smoke test services Export Pro localMock + garde-fous UI contre localMock force, choix destination PC et fallback URL Storage
|   |-- smoke-vibecut-export-functions.mjs # Smoke test pur Functions Export Pro : quotas MVP, chemins sources owner-scoped, resume manifest et callable URL MP4
|   |-- smoke-vibecut-render-service-contract.mjs # Smoke statique renderer Cloud Run : signature timestamp, README coherent, drawtext fade/none, colorimetrie FFmpeg, mix audio et refus des features visibles non rendues
|   |-- smoke-vibecut-export-coverage-parity.mjs # Smoke parite coverage : compare client, Functions et renderer sur features supportees/bloquees pour eviter les derives silencieuses
|   |-- smoke-vibecut-export-runbook.mjs # Smoke statique du runbook Export Pro : variables, secrets, OIDC, deploy Cloud Run, gates et confirmation smoke live
|   |-- smoke-vibecut-export-status-audit.mjs # Smoke statique du statut Export Pro : empeche de masquer les phases partial/not done, Java/emulators, live K1 et renderer frame-by-frame
|   |-- verify-vibecut-k1-cloud-output.mjs # Verificateur post-smoke non Cloud du MP4 K1 telecharge : container/codec/resolution/fps/duree/audio/frames non noires
|   |-- smoke-vibecut-quick-tools.spec.cjs # Smoke Playwright du panneau droit VibeCut : palette Effets/Texte/Animations, drag/drop timeline et suppression haute
|   |-- smoke-vibecut-slowmo-samples.spec.cjs # Smoke Playwright HDR/SDR MKV : import des samples Windows, presets ralentis timeline 50%/Normal et duree projet
|   |-- smoke-vibecut-desktop-video-orientation.spec.cjs # Smoke Playwright MVI_0016 Bureau : preset 9:16, detection 60 FPS metadata, rotation header, forçage export 30 FPS et ralenti 50%
|   |-- smoke-vision-corpus.spec.cjs    # Smoke test Playwright optionnel sur les fixtures smartphone Vision locales, avec gates metriques par profil
|   |-- smoke-vision-ui.spec.cjs        # Smoke test Playwright Vision : miniatures image courante, mode simple/expert, recherche/familles/favoris, recettes correctives diagnostic, import demo + fixture synthetique, profils a risque, halation/tint global safe sur blancs/neons/neutres, avant/apres maintenu, intensity 0/100, metriques clipping/saturation/voile, mobile, reset
|   |-- smoke-video-ui.spec.cjs         # Smoke test Playwright Vibe_CUT : import, trim, split, vitesse, filtres, piste transitions libre + verification canvas, texte, musique, volumes, reorder, export, mobile
|   `-- midjourney-scraper/
|       |-- data/                       # Dossier de travail vide au depart, rempli par scraping local
|       |-- config.mjs                  # Configuration scraper importee depuis Vibe_fx
|       |-- database.mjs                # Catalogue SQLite/local du scraper
|       |-- enhance.mjs
|       |-- fast-scraper.mjs
|       |-- NOTICE.md
|       |-- README.md
|       |-- recover.mjs
|       |-- scraper.mjs                 # Runner scraping appele par les routes API Next
|       |-- server.mjs                  # Serveur source conserve comme reference
|       `-- test_classifier.mjs
`-- storage.rules                       # Rules Storage user-scoped uploads/publications/AI/exports, sources export owner-write et outputs owner-read
```

## Pages actuelles

- `/` : page d'accueil SSR unique avec hero cyber-neon/dark-ui, CTA `Launch app`, cartes de caractéristiques descriptives, FAQ complète, et pipeline de routage SVG animé (PublicationRoutePipeline).
- `/studio` : entree noindex vers le studio Vibe_fx importe.
- `/pricing` : page publique indexable pour l'offre lifetime 9,99 EUR, sans abonnement ni credits IA visibles au lancement.
- `/account`, `/account/billing`, `/account/usage` : surfaces privees noindex pour profil, facturation et usage ; les controles credits/jobs IA sont masques quand le lancement IA est desactive.
- `/backoffice` : surface temporaire noindex non securisee Firebase, expose la cartographie des surfaces IA, un switch localStorage/cookie pour remettre ou masquer les interfaces IA en un clic pendant les tests, et un dashboard exports video/couts estimes limite aux jobs lisibles par le compte connecte.
- `/outil-publication-reseaux-sociaux`, `/editeur-image-instagram`, `/publier-instagram-facebook`, `/templates`, `/ressources/meta-oauth-publication-instagram-facebook`, `/ressources/formats-instagram` : pages SEO SSR indexables avec metadata, canonical, JSON-LD et liens internes.
- `/api/themes`, `/api/catalog`, `/api/status`, `/api/scrape`, `/api/image/*`, `/api/proxy-image`, `/api/reclassify/*`, `/api/reset` : API internes pour la bibliotheque Midjourney et son scraping local.
- `/api/music/free-search` : API interne d'agregation provider-first. `provider=pixabay` est conserve comme exception manuelle avec scan borne/assistant import, `provider=openverse` reste actif sans cle et est resserre sur des recherches musicales Jamendo via Openverse par styles sociaux ; `provider=archive` et `provider=wikimedia` sont retires/unsupported car trop aleatoires pour la video reseaux sociaux. `provider=jamendo` et `provider=freesound` ne sont exposes que si `JAMENDO_CLIENT_ID` ou `FREESOUND_API_KEY` existent cote serveur.
- `/api/music/import` : API interne de telechargement serveur pour URL audio directe allowlistee, sans scraping de catalogue, utilisee par l'import musique verifie.
- `/api/music/local-file-import` : API locale dev pour copier les imports Soundtrack dans `public/music/local-imports`, relire un manifest serveur, purger les anciennes pistes demo demandees et supprimer le fichier local quand une piste est retiree ; en production le chemin vise Firebase/Google Storage.
- `/api/music/project/import-url` : API projet authentifiee pour proxy audio direct allowliste avec metadata droits/source/licence obligatoires avant upload Firebase Storage cote client.
- `/api/music/providers` : API interne de metadata providers musique ; expose Pixabay comme `manual-exception`, les fournisseurs API searchEnabled exploitables dans l'UI, cache Jamendo/Freesound tant que leurs cles manquent, et n'ajoute les providers IA que si le flag/cookie backoffice IA est actif.
- `/api/music/ai-providers` : API interne de metadata providers IA musique, filtres natifs/prompt-presets, controles supportes et besoins de cles serveur ; retourne 404 quand le lancement IA est desactive.
- `/api/music/ai-generate` : API interne de generation IA musique cote serveur ; branche MiniMax Music et ElevenLabs via adapters, conserve Mubert/Replicate et autres providers en experimental/placeholder quand le contrat de reponse n'est pas confirme, et ne fait aucun appel externe sans cle.
- `/api/music/ai-import` : API interne d'import audio IA pour data URL audio serveur ou URL audio allowlistee, avec verification MIME/poids.
- `/robots.txt` : genere par `src/app/robots.js`, disallow `/studio`, `/account`, `/api`, `/admin`, `/backoffice`.
- `/sitemap.xml` : genere par `src/app/sitemap.js` avec home + pages SEO publiques.

## Pages cible a creer plus tard

- `/legal/confidentialite`
- `/legal/conditions`

## Statut

- Projet cree dans `C:\Users\matth\Travail\vibe_fxV2`.
- Les 23 skills ont ete importes avec `npx skills add C:/Users/matth/Desktop/design-skills-db/publish/refero-design-skills`.
- Des dependances ont ete ajoutees : Next.js, React, Firebase, lucide-react, three, howler, zustand, better-sqlite3.
- `firebase-tools`, `@playwright/test`, `ffmpeg-static` et `ffprobe-static` sont des devDependencies pour rendre les commandes Firebase, les smokes UI et le smoke MP4 local K1 reproductibles sans installation FFmpeg globale.
- `firebase.json` ne declare pas de cible Firebase Hosting classique : l'application Next.js passe par Firebase App Hosting via `apphosting.yaml`; `firebase:deploy:backend` et `firebase:deploy:functions` passent par `scripts/firebase-deploy.mjs`, exigent `FIREBASE_PROJECT_ID`, refusent les cibles `demo-*` et limitent les ressources deployees.
- `postcss` est force via `overrides` en `8.5.10` pour corriger l'audit npm sans downgrader Next.
- `.env.example` et `.env.emulators.example` sont explicitement exclus de l'ignore global `.env*` afin de rester versionnables.
- Les fichiers de cadrage racine sont presents et la home relie les premieres pages SEO.
- `npm run lint` passe sans erreur ; des avertissements herites restent dans le module importe `vibefx-studio`.
- `npm run build` passe et prerender les routes publiques SEO, le studio, `robots.txt` et `sitemap.xml`.
- `npm --prefix functions run lint` passe avec `node --check index.js`.
- Un smoke test Node des helpers du parcours publication passe : normalisation draft, checker, payload, slug et `ownerUid`.
- `npm run test:publication-flow` rejoue le smoke test publication sans Firebase reel et verifie aussi le chemin Storage `users/{uid}/publications/...`.
- `npm run test:routes` verifie les routes publiques/studio, JSON-LD, canonical, sitemap et noindex studio contre le serveur local.
- Le smoke Playwright du studio est aligne sur le shell actuel : il ouvre `/studio`, passe par `Creer une mise en page`, importe `public/assets/vibefx/demo-astronaut.png`, puis clique `Publication` pour verifier le passage studio/layout vers publication.
- `npm run test:studio-ui` passe contre un serveur Next dedie via `SMOKE_BASE_URL` et s'execute en un worker pour eviter les courses d'hydratation/compilation des smokes Playwright.
- `npm run test:scope` verifie automatiquement le perimetre Functions, l'absence de termes source, les pages SEO, les modules extraits et les rules multi-utilisateur.
- `npm run audit:secrets` bloque les signatures courantes de cles Firebase, tokens Meta, private keys et valeurs sensibles Meta hardcodees.
- `npm run check:e2e-readiness` formalise les variables/secrets manquants avant le test E2E Firebase/Meta reel.
- `npm run verify:local` rejoue les controles locaux principaux : lint, scope, audit secrets, parcours publication, build, lint Functions et audit dependances.
- `npm run emulators` lance les emulateurs Firebase locaux ; `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` connecte le client aux ports locaux.
- `npm run check:emulator-readiness` verifie les prerequis CLI/Java/config avant de lancer les emulateurs.
- `npm run test:emulators` a ete valide avec Java 21 et verifie Auth/Firestore/Storage rules sous emulateurs.
- `npm run test:studio-emulators` a ete valide avec Java 21 et verifie en navigateur `/studio` -> demo -> import -> sauvegarde brouillon contre Auth/Firestore/Storage/Functions emulateurs.
- `.github/workflows/verify.yml` rejoue les controles principaux sur push/PR, teste les routes, le smoke UI studio contre `next start`, puis la sauvegarde brouillon studio contre les emulateurs Firebase.
- `functions/index.js` expose le perimetre Meta/OAuth/publication et le debut Lot 2 Stripe : `createCheckoutSession` cree une Checkout Session `mode=payment`, `stripeWebhook` verifie la signature et fulfil premium/credits via transaction Firestore idempotente.
- Les routes API `_midjourney` sont bloquees en production par defaut via `VIBEFX_ENABLE_MIDJOURNEY_LIBRARY=false`; elles ne restent utilisables qu'en dev/local ou avec double opt-in explicite pour une session admin non SaaS.
- Les references d'identite source ont ete neutralisees dans les surfaces Vibe_fx auditees.
- `PublicationsManager.jsx` est reduit a l'orchestration layout/publication : `PublicationComposer`, `PublicationDashboard`, `PublicationPreview`, `MetaOAuthPanel`, `PublicationList` et les helpers publication sont extraits. L'ancien manager legacy, son editeur interne et le moteur canvas mort ont ete supprimes.
- Les publications studio sont chargees par `ownerUid`, les nouveaux uploads passent par `users/{uid}/publications/...`, et `firestore.rules`/`storage.rules` protegent l'ownership et bloquent l'ancien chemin Storage `/publications` en ecriture.
- Le studio initialise une session Firebase Auth anonyme quand Auth est disponible afin que les brouillons aient toujours un `ownerUid`.
- Apres sauvegarde, le manager publications met a jour la liste locale sans attendre un rechargement manuel Firestore.
- `VibeFxLayout` exporte vers publication un payload structure avec `blob`, `socialImages`, `format`, `template` et `settings`.
- `VibeFxStudio` remplace l'entree de mise en page dans `PublicationsManager.jsx` et porte les onglets Studio/Layout/Library/Soundtrack/Vision/Video importes depuis `C:\Users\matth\Travail\Vibe_fx`, avec export publication V2 conserve; l'ancienne page studio Credits/SaaS et la page Fusion ont ete supprimees du header, du deep-link workspace et du rendu studio. Les reliquats `FusionPanel.jsx` et `CanvasArea.jsx` ont aussi ete retires, tandis que les fonds Pro de Layout (`Mesh` et `Flou Pro`) restent portes par les etats Layout.
- La bibliotheque est cablee via routes API Next et scripts `scripts/midjourney-scraper/` ; aucune image source n'a ete importee, le catalogue local demarre vide et se remplit par scraping.
- Le module video Vibe_CUT, ses pistes `public/music/` et ses dependances audio/state ont ete portes ; la navigation React Router source a ete remplacee par l'etat d'onglet interne du studio, et les composants studio/video sont declares en client components pour eviter les bailouts SSR.
- Le module video Vibe_CUT accepte les imports lourds en ajoutant les clips immediatement puis en extrayant les thumbnails en arriere-plan ; les filtres colorimetriques sont appliques au rendu canvas, les textes restent visibles en lecture/export, les pistes musique locales `public/music/` sont importables/lisibles, les clips video se reordonnent par drag/drop pointer dans la timeline, une timeline `Effets` separee entre video et texte permet de placer/deplacer/redimensionner des transitions librement sans les melanger aux clips video, et l'export navigateur utilise un canvas dedie a la resolution du preset avec mix audio vers WebM/MP4 si supporte via `MediaRecorder`.
- `npm run test:video-ui` lance `scripts/run-video-ui-test.mjs`, qui demarre un serveur Next local sur port libre ou reutilise le serveur dev Next deja actif, puis execute `scripts/smoke-video-ui.spec.cjs` contre `/studio` avec `SMOKE_BASE_URL` controle ; le smoke couvre import de deux videos courtes, reorder, trim par poignee, split/coupe, drag rapide du playhead violet pendant lecture, vitesse 2x, filtre Cyberpunk, transition Flash sur timeline `Effets` avec verification de luminance canvas, deplacement de l'item transition, synchronisation du panneau Transitions sur start/duration canonique, verrou de piste Effets bloquant input timecode, range du panneau Transitions et drag, verrou de piste Filtres bloquant presets/ranges du panneau Filtres, verrou de piste Musique bloquant le volume, modele pur avec transitions de coupe/libres presentes dans `items[]`, audio integre des clips expose comme items `audio-main`, filtres clips exposes comme items `effect-main`, overlap de transitions detecte, volumes bornes, couverture des frames export pour timestamps de transitions et rejet des transitions trop courtes pour le FPS, texte intro, bibliotheque musique locale avec source/licence White Bat Audio, volumes clip/musique, export WebM telecharge, echec MediaRecorder sans telechargement partiel, fallback MP4 indisponible vers format reel WebM visible, onglet musique ouvrant directement sur `Importer une nouvelle musique gratuite`, wizard `Sources -> Importer cette source` pre-rempli Pixabay, champ URL audio directe avec prechargement/ecoute, catalogue gratuit agrege visible/configurable, endpoint `/api/music/free-search` exposant Openverse/Pixabay et retire Archive/Wikimedia, rejet serveur d'un domaine non allowliste, et viewport mobile petite hauteur sans overflow avec lecture/export accessibles et panneau mobile compact basculable plein ecran.
- `npm run test:vision-ui` lance `scripts/audit-vision-filters.mjs`, demarre un serveur Next local via `scripts/run-vision-ui-test.mjs`, puis execute `scripts/smoke-vision-ui.spec.cjs` ; l'audit verifie les cles de profils Vision, le branchement `safeSmartphone`, la normalisation du renderer, le garde-fou final `applySmartphoneOutputGuards`, le blend d'intensite perceptuel, le mode preview `low` fidele sur la passe couleur pixel avec saturation CSS neutralisee, le cap preview interactif 3 MP dans `useCanvasRenderer.js`, la sonde dev/test `__vibefxVisionQualityProbe`, les cles/defaults/masques pixel/controles UI de saturation selective peau/rouges-oranges/ciel/verts, le masque temperature safe pour neutres/hautes lumieres, le masque halation safe pour limiter les glows rouges sur blancs neutres, le tint global safe qui remplace l'overlay legacy en mode smartphone, le rail `Recommandes image`, les alertes `Profil actif vs image`, les recettes correctives diagnostic, le rail `Comparer favoris`, le signal UI performance du diagnostic, le score anti-voile gris, la detection peau ponderee, les metriques hue-zone ciel/vegetation/rouges-oranges, la mitigation de dosage depuis le diagnostic et le modele canonique `id/name/family/intent/bestFor/avoidFor/strength/parameters/recommendedIntensity/intensityRange/safetyRules/previewTags/technicalNotes/inspirationLabel` genere pour chaque profil, puis confirme que l'UI consomme ces `parameters` normalises et affiche le libelle d'inspiration sans promettre de reproduction constructeur. Il echoue si un profil brut a risque n'a pas de metadonnees explicites `strength`, `bestFor` et `avoidFor`. Le smoke navigateur importe l'asset demo, verifie les miniatures calculees sur l'image courante, le rail de recommandations image avec application/undo, mode simple/expert avec courbe master safe, saturation selective peau/rouges-oranges/ciel/verts, halation/noirs leves/teintes tonales, recherche, filtre famille, favoris persistants localStorage, rail de comparaison rapide Velvia/Astia, applique Velvia, verifie le profil actif, expose l'intention/l'inspiration/garde-fous/notes techniques/dosage conseille du profil, verifie que Velvia applique la saturation normalisee `120` dans les controles experts, verifie le bouton dosage conseille `70%`, verifie l'avertissement hors plage a `100%`, la mitigation diagnostic vers `80%`, la recette `Dose sure` vers `80%` et le retour manuel a `80%`, expose le diagnostic image avec temps/taille source, taille preview cappee, score de voile et zones hue, compare un rendu `low` et `high` hors ecran via la sonde runtime, mesure clipping/saturation/voile/peau/neutres proteges/ciel/verts/rouges-oranges via `visionMetrics.js`, verifie undo/redo sur le profil applique, sauvegarde un profil personnel local nomme, le retrouve par recherche, le supprime et nettoie ses favoris, verifie le split avant/apres reglable, verifie le bouton maintenu avant/apres, verifie une intensite 50 intermediaire, le retour source a intensite 0, teste une fixture synthetique smartphone-like sur Velvia/Ektar/Sepia avec alerte contenu/profil et recette corrective contextuelle, teste une fixture 4200x3200 pour verifier que la preview Vision reste sous 3,05 MP tout en gardant `fullWidth/fullHeight` dans la sonde, teste une fixture metrique delavee pour declencher `greyVeilRisk`, teste une fixture metrique peau claire/medium/foncee, mesure par regions que les saturations selectives ciblent peau/rouges-oranges/ciel/verts sans polluer les neutres ni la peau pour le controle chaud, verifie que la chaleur maximale affecte moins la bande neutre que la zone chaude coloree, verifie que la halation safe affecte moins un blanc speculaire neutre qu'une zone neon coloree, verifie par test moteur extrait que le tint global safe affecte moins un pixel neutre qu'un pixel colore, verifie le mobile sans overflow horizontal et le reset.
- `npm run check:vision-corpus` verifie la presence des 12 fixtures smartphone locales ignorees par Git dans `test-fixtures/vision-corpus`; il reste non bloquant par defaut, devient strict avec `VISION_CORPUS_REQUIRED=1`, et rappelle que Vision ne peut pas etre declaree stable finale tant que le corpus reel est absent/incomplet. `npm run test:vision-corpus` ajoute un smoke Playwright metrique sur les fixtures presentes et passe en skip si le corpus local est vide.
- L'onglet Vision applique les profils via `normalizeVisionFilters` et `buildVisionProfileModel`, et les miniatures comme l'application profil consomment les `vision.parameters` normalises plutot que les anciens `filters` bruts. Il expose des miniatures de profils calculees sur l'image courante, un rail `Recommandes image` classe par metriques source (peau, ciel/verts, basse lumiere, saturation deja haute, image plate, neutres) avec badges de signaux detectes et application directe au dosage conseille, des alertes `Profil actif vs image` quand le profil actif est probablement risqué pour le contenu source, avec bouton `Essayer` vers la meilleure alternative recommandee au dosage conseille, un diagnostic image visible (clipping, saturation forte, zones hue ciel/verts/rouges-oranges, noirs, range tonal P95-P05, score de voile gris, peau via score pondere hue/RGB/YCbCr, neutres proteges, temps de diagnostic, taille source, taille preview cappee et echantillon) avec action de mitigation vers le dosage conseille ou le bord sur de la plage active et bloc `Recettes correctives` qui applique des patches limites pour intensite, chroma, voile gris, hautes lumieres, ombres, peau ou neutres, les badges d'usage/risque/famille, l'intention, le libelle d'inspiration, les garde-fous, les notes techniques, le dosage conseille et la plage de dosage de chaque profil, un bouton d'application du dosage conseille pour le profil actif, un avertissement si l'intensite active sort de la plage conseillee avec bouton de retour au bord sur, un mode simple/createur (chaleur, contraste, peau, grain), un mode expert (lumiere, hautes lumieres, ombres, courbe master 5 points safe, saturation, vibrance, saturation selective peau/rouges-oranges/ciel/verts, clarte, nettete, anti-brume, vignette, grain, noirs leves, halation, teintes et couleurs tonales), recherche de profils, filtre par famille, favoris locaux persistants, rail de comparaison rapide des favoris avec miniatures et dosage conseille, profils personnels locaux nommables/persistants et supprimables en section `Perso`, undo/redo local des reglages Vision, un reset Vision, le profil actif, une intensite globale visible, un split avant/apres reglable sur le canvas et un bouton maintenu `Avant` qui restaure temporairement l'image source sans perdre le dosage courant. Les profils camera-inspired bruts a risque declarent maintenant leur `strength` et leurs cas d'usage/evitement. Le moteur Vision protege les saturations smartphone avec ceiling adaptatif, temperature masquee sur neutres/blancs/ombres, halation masquee sur blancs neutres/speculaires, tint global legacy masque en pixels, saturation selective hue/luma, vibrance protegee, protection tons peau/neutres/hautes lumieres, split toning limite, clamp des courbes/teintes/sepia/blur/hueRotate, garde-fou final anti-crush des ombres couleur et blend linear-light ; la preview interactive studio/Vision est plafonnee a 3 MP sans toucher l'export/import publication pleine resolution, et la preview `low` pendant drag conserve ces protections colorimetriques et ne coupe plus que les effets spatiaux lourds.
- Le playhead Vibe_CUT est saisissable sur toute sa ligne via pointer capture et met a jour immediatement le canvas/audio pendant le scrub, y compris pendant la lecture ; la preview texte utilise aussi pointer capture pour ne pas perdre le drag.
- Le header studio passe les onglets sur une deuxieme rangee pleine largeur en mobile afin que l'onglet Video reste cliquable sans etre recouvert par les actions de droite ou le player musique.
- La bibliotheque musique Vibe_CUT affiche les metadonnees de licence/source White Bat Audio, extrait son catalogue et ses fournisseurs cibles dans `src/features/vibefx-studio/video/data/musicCatalog.js`, documente la strategie premium/free/IA dans `docs/music-sourcing-and-import-plan.md`, garde l'import de nouvelles pistes en import fichier local verifie avec declaration de droits sans scraping externe, et son panneau a ete compacte pour que les boutons d'import restent cliquables sur les hauteurs studio courtes.
- L'onglet `Soundtrack` est ajoute au header studio apres `Library` et ouvre une page full screen sans canvas/sidebar. La feature `src/features/vibefx-studio/soundtrack/` reutilise `/api/music/free-search`, `/api/music/import`, `/api/music/ai-import`, `/api/music/project/import-url`, `/api/music/local-file-import`, `/api/music/providers`, `musicCatalog.js`, `musicRights.js` et `audioWaveform.js`; elle separe maintenant une bibliotheque projet Vibe_fx owner-scoped (`users/{uid}/soundtrackTracks/{trackId}` + Storage `users/{uid}/soundtrack/{trackId}/{fileName}`) de l'agregateur provider-first. L'agregateur est l'ecran par defaut sous le libelle `Sources gratuites`, affiche Pixabay comme seule exception manuelle conservee avec assistant import fichier/URL et texte explicatif distinguant Pixabay de la musique IA, puis Openverse resserre pour la musique video sociale. Internet Archive et Wikimedia Commons sont retires des providers actifs, de l'allowlist d'import direct et retournent `unsupported` dans `/api/music/free-search` car leurs corpus sont trop heterogenes/patrimoniaux pour garantir une qualite moderne de reseaux sociaux. Les providers IA sont ajoutes sous les providers existants via `/api/music/ai-providers` et `/api/music/ai-generate` : MiniMax Music est le premier connecteur API prototype avec `MINIMAX_API_KEY`, ElevenLabs reste branchable avec `ELEVENLABS_API_KEY`, Mureka/Replicate restent experimentaux en generation automatique, Mubert reste experimental avec credentials `MUBERT_CUSTOMER_ID`/`MUBERT_ACCESS_TOKEN`, et Stable Audio/Loudly/SOUNDRAW/Beatoven restent visibles comme experimentaux ou `KEY MISSING` sans appel externe tant que leurs endpoints/contrats ne sont pas confirmes. Le bouton principal `Musique IA par theme` ouvre une modale simple en 3 etapes : choisir un provider, cliquer un theme/filtre, puis `Generer et importer`; le flux appelle `/api/music/ai-generate`, importe automatiquement la piste retournee en bibliotheque projet ou locale, puis ouvre la bibliotheque. L'ancien import fichier/URL IA reste seulement en option avancee repliee. La bibliotheque projet expose aussi le raccourci `Musique IA` avec le meme assistant par theme. Les filtres Openverse sont maintenant orientes styles reels et stables via `source=jamendo` + `category=music` : cinematic, trailer/epic, action trailer, corporate/brand, electronic, house, jazz, ambient/lounge, lofi, hip hop, funk, rock et short commercial ; Freesound reste uniquement comme source Openverse pour impact/whoosh courts. Les filtres generiques Licence/BPM/genre/mood/duree/pages restent masques et les pistes locales Vibe_CUT ne sont plus fallback de scan. Les boutons compacts `generer plus` et `+ resultats` sont descendus sous les compteurs ; `generer plus` explore maintenant une page aleatoire du filtre actif au lieu de changer de categorie pour les scans et relance une variante pour l'IA. Les resultats de l'agregateur ouvrent aussi un panneau preview sous la piste selectionnee, avec waveform, play/pause, stop, temps courant/duree et curseur de seek branche sur le meme player Soundtrack que la bibliotheque. Le bouton `Bibliotheque` ouvre une vue bibliotheque en popup large desktop et fullscreen mobile, sans modes `Imports recents`/`A verifier`, avec import fichier local, musique IA par theme, suppression de pistes, classement par categorie/tags et playlists locales quand Firebase projet n'est pas disponible. L'import Pixabay envoie les IDs/URLs deja presents et les pistes supprimees localement au scraper local, augmente le nombre de candidats scannes et evite de reimporter la meme piste quand on relance le meme theme. Les filtres Pixabay sont structures en familles creatives (Usage video, Cinematique, Humeurs, Genres, Mouvement, Themes, Formats, Duree, Selection) avec des sous-themes mappes vers des recherches Pixabay Music compatibles scraper. La bibliotheque Soundtrack n'injecte plus automatiquement les pistes starter White Bat Audio ni le manifest Pixabay public dans `Toutes`, affiche le nombre de pistes par categorie dans le filtre, afin que l'utilisateur ne voie que ses imports locaux/projet reels ; un bouton `Vider locale` efface les pistes locales, leurs playlists, les blobs audio IndexedDB et les copies dev `public/music/local-imports`. La piste selectionnee dans la bibliotheque deploie un panneau waveform pleine largeur avec play/pause, stop, temps courant/duree et curseur de seek branche sur le player Soundtrack. Les imports locaux persistent maintenant leur blob audio dans IndexedDB et, en dev, une copie disque servie depuis `public/music/local-imports` avec manifest relu au chargement ; les anciennes pistes demo visibles (`Blooming Chill`, `Epic Action Hero`, `Journey in Space`, `Slim Shady`, `Old Movie Ragtime Piano`, `krasnoshchok...`) sont purgees au chargement local. Les favoris/playlists/manifest locaux restent disponibles via IndexedDB + `vibefx-soundtrack.json`, File System Access/fallback download et copie dev locale. L'action `Vibe_CUT` transmet un `Blob/File` local, une URL locale servie par Next ou un blob recupere depuis la piste projet avec manifeste droits.
- Mise a jour 2026-05-25 : le bouton et le panneau `Musique IA` ont ete retires de la popup bibliotheque ; l'assistant IA reste disponible sur la page principale Soundtrack pour eviter la duplication d'interface.
- Mise a jour 2026-05-25 : le bouton `Archives`, l'action d'archivage des pistes et le filtrage `archived` ont ete retires de la popup bibliotheque pour garder un flux importer/supprimer/vider locale explicite.
- Mise a jour 2026-05-25 : l'action playlist sur les lignes de la popup bibliotheque Soundtrack a ete remplacee par un bouton `Telecharger` qui recupere le blob local/URL audio et garde les playlists uniquement dans la colonne de gauche.
- Mise a jour 2026-05-25 : le player bas Soundtrack est remonte via tokens CSS `--soundtrack-player-bottom` / `--soundtrack-player-reserve` pour ne plus chevaucher la barre Next/devtools tout en restant proche du container d'import.
- Mise a jour 2026-05-25 : le player Soundtrack est pilote par un controller global au niveau `VibeFxStudio`, ce qui permet a la musique de continuer pendant les changements d'onglets studio. Le header remplace l'ancien petit MusicPlayer par `SoundtrackHeaderMiniPlayer`, une miniature compacte synchronisee avec le player bas (play/pause, precedent/suivant, auto next/aleatoire et progression segmentee).
- Mise a jour 2026-05-25 : le player Soundtrack gagne une barre de progression seekable, un bouton piste suivante, un mode `Auto next`/`Aleatoire` et l'autoplay de fin de piste. `/api/music/local-file-import` synchronise aussi les MP3 existants de `public/music` et `public/music/pixabay-ai` vers `public/music/local-imports` pour que toute la musique locale remonte dans la bibliotheque.
- Mise a jour 2026-05-25 : le player Soundtrack retire le bouton stop droit, ajoute `Piste precedente` a gauche et remplace le range natif par un scrubber cyber segmente cliquable/drag avec tete lumineuse et progression animee.
- Mise a jour 2026-05-25 : le scrubber Soundtrack est recentre avec FrontSymmetry via une grille player en trois zones symetriques gauche/centre/droite et un micro-ajustement vertical `translateY(-8px)`.
- Le module Vibe_CUT centralise maintenant l'audit et les manifests de droits musique dans `src/features/vibefx-studio/video/data/musicRights.js`; la bibliotheque musique ouvre par defaut sur l'onglet `Gratuit`, l'import audio passe par des presets de sources verifiees/licenciees/IA manuelle, les cartes sources gratuites/licenciees ouvrent le wizard d'import avec preset et lien officiel deja prets, le wizard peut rechercher Openverse, Jamendo et Freesound via `/api/music/free-search`, accepte soit un fichier local soit une URL audio directe via `/api/music/import` allowlistee/cote serveur, precharge l'URL distante pour ecoute avant import timeline, exige source/preuve/licence/usage social avant ajout timeline, supprime le bypass d'upload brut depuis `AudioPanel`, bloque l'export navigateur si le manifeste droits est incomplet, et sauvegarde apres export audio un manifeste droits owner-scoped dans `users/{uid}/rightsManifests/{exportId}` quand Firebase est configure.
- L'ecran vide Vibe_CUT presente la zone d'import video en pleine largeur responsive, alignee avec les marges studio et descendue sous le header pour garder le drop MP4/WebM/MOV lisible sur desktop sans changer le fonctionnement timeline.
- L'export Vibe_CUT borne les volumes media a la plage navigateur valide, desactive le choix MP4 si `MediaRecorder` ne le supporte pas, bascule explicitement vers WebM et affiche les metadonnees de droits/attribution des pistes audio avant export.
- Mise a jour 2026-06-02 : les samples Windows `HDRSample.mkv` et `SDRSample.mkv` ont ete copies dans `vibecut-video-samples/` a la racine pour servir de fixtures locales aux tests Vibe_CUT HDR/SDR.
- Mise a jour 2026-06-02 : l'onglet studio `Video` devient `VibeCut`; l'editeur video ajoute un panneau droit `Outils rapides` avec categories Effets/Texte/Animations cliquables et drag/drop vers la timeline, une action `Supprimer` en haut de timeline pour la selection courante, des presets timeline `Ralenti` 25%/50%/Normal pour le clip selectionne, `npm run test:vibecut-tools` lance `scripts/smoke-vibecut-quick-tools.spec.cjs`, et `npm run test:vibecut-slowmo` lance le smoke HDR/SDR MKV `scripts/smoke-vibecut-slowmo-samples.spec.cjs`.
- Mise a jour 2026-06-02 : Vibe_CUT enrichit le moteur canvas `VideoEngine.js` avec de nouvelles transitions wipe/zoom/glitch/blur/lumiere, des categories `Intro` et `Outro`, des volets de debut/fin exportables, des presets rapides `Volets` qui posent transition + texte synchronise, et de nouvelles animations texte d'entree/sortie (`neon-scan`, `tracking-in`, `wipe-mask`, `glitch-out`, etc.).
- Mise a jour 2026-06-02 : l'import Vibe_CUT detecte best-effort la cadence source via les tables MP4 `mdhd/stts` puis fallback `requestVideoFrameCallback` a timestamps uniques, preserve les sources haute cadence jusqu'a 60 FPS au lieu de les normaliser en 30 FPS, lit best-effort la matrice d'orientation MP4, ajoute une rotation 90 deg gauche/droite par clip dans le header et dans la timeline pour corriger les fichiers encodes couches, expose les badges FPS/rotation sur les clips timeline, et le panneau export comme le header permettent de forcer `Auto/24/25/30/50/60 FPS`.
- Mise a jour 2026-06-02 : la preview Vibe_CUT retire les rings/bordures externes du canvas, garde les safe areas sans contour perimetrique blanc, rend le canvas a la resolution du preset export (`1080x1920`, `1920x1080`, etc.) plutot qu'a la petite taille CSS affichee, active le smoothing haute qualite, et en lecture suit le `currentTime` du media actif quand possible pour se rapprocher d'un lecteur video natif Windows.
- Mise a jour 2026-06-02 : la lecture Vibe_CUT reduit la pression React pendant playback : le moteur conserve un temps interne par frame pour le canvas/audio, tandis que `currentTime` du store et la timeline sont rafraichis a cadence reduite, ce qui libere plus de budget pour la preview video fluide.
- Mise a jour 2026-06-02 : le select FPS du header/panneau export pilote aussi la cadence preview. `Auto` garde la cadence native disponible, `30 FPS` cadence proprement la preview en drop/pacing regulier sans changer la vitesse, et le moteur bloque l'avance interne tant que le media actif n'a pas vraiment demarre pour eviter les petites accelerations.
- Mise a jour 2026-06-02 : la boucle live preview Vibe_CUT utilise `HTMLVideoElement.requestVideoFrameCallback` quand disponible pour dessiner au rythme des vraies frames decodees, avec fallback `requestAnimationFrame`; le bouton plein ecran cible maintenant le shell preview complet afin de garder la video et les controles dans le mode full view.
- Mise a jour 2026-06-02 : Vibe_CUT ajoute un mode `Preview grand format` depuis le canvas, avec lecteur preview agrandi, action `Lire tout`, select de format preview/export, rotation gauche/droite du clip selectionne, rail desktop de depot video + playlist sequencee, navigation par clip vers son timecode et tiroir mobile compact de depot/liste; la lecture reste celle de la timeline canonique pour enchainer tous les clips.
- Mise a jour 2026-06-03 : Vibe_CUT retire l'overlay `Safe areas` des previews normale et grand format, ajoute des primitives FrontSymmetry pour centrer les icones dans les boutons carres/frames (`vibecut-square-button`, `vibecut-icon-frame`, `vibecut-action-button`, `vibecut-upload-glyph`), recentre les actions import/export/PNG/publication, et met a jour le smoke test pour verrouiller l'absence de safe area.
- Mise a jour 2026-06-03 : Vibe_CUT expose le meme export navigateur depuis la preview grand format via `useVideoExportController`, avec telechargement du rendu final applique aux rotations, transitions, textes, audio et filtres; le panneau Filtres devient une colorimetrie avancee SDR social avec presets cinema, exposition, pivot, vibrance, temperature/teinte, hue, ombres/mediums/hautes lumieres, fade, vignette et grain, appliques dans `VideoEngine.js` a la preview comme a l'export. La preview grand format affiche maintenant aussi un bouton `Colorimetrie` qui ouvre ce panneau dans le rail droit desktop ou sous la preview mobile. L'export navigateur utilise une capture sequentielle du moteur a FPS cible, un bitrate adapte a la resolution/FPS et une barre de progression visible dans la preview grand format afin de limiter les exports saccades et la perte de qualite percue.
- La roadmap timeline/export Vibe_CUT introduit `src/features/vibefx-studio/video/model/timelineModel.js` comme adaptateur canonique `tracks[]`/`items[]`, avec resolver pur `resolveTimelineTransitions` unifiant transitions libres et transitions de coupe en objets `id/type/start/duration/fromItemId/toItemId/trackId/params`, plan de rendu commun `resolveTimelineRenderPlan` consomme par preview/export/scrub playhead/split toolbar, rendu moteur alimente par `allTransitions` unifiees, validation pure `validateTimelineRenderPlan` pour trous/overlaps video, overlap transitions libres, transitions hors bornes et audio hors timeline, moteur `PlaybackEngine` capable de selectionner les clips via `start/duration` resolus avec fallback legacy et de remonter les echecs decode/chargement media, rendu des lanes video/transitions/filtres/textes/audio integre/musique depuis `items[]` avec volumes canonises via `clampVolumePercent`, filtres clips exposes comme items `effect-main` de type `effect` et lane Filtres compacte verrouillable sans changer le rendu existant, transitions de coupe et transitions libres presentes dans `items[]` avec `params.placement` et `params.editable`, lane Effets limitee aux transitions libres editables et sans chevauchement via `findTransitionItemOverlap`, panneaux Transitions/Audio/Texte/Filtres/Vitesse relus sur l'etat `tracks` pour desactiver les controles des pistes verrouillees, routeur store `updateTimelineItem`, `updateClip`, `add/remove/updateAudioTrack`, `add/remove/updateTextOverlay`, `setTransition`, `add/update/removeTransitionItem` avec refus si la piste cible est verrouillee, validation export fps/duree/audio/codec, helper pur `buildExportFrameSchedule` pour figer `duration/fps -> totalFrames/frameDuration`, helper pur `validateExportFrameCoverage` pour verifier qu'une transition a au moins une frame planifiee au FPS export, helpers purs de snap magnetique, extraction waveform audio client dans `utils/audioWaveform.js`, transactions undo/redo pour edits timeline, selection audio timeline, rendu export par `seekAndDraw` async avec arret sur nombre de frames planifie, erreur lisible si une frame video attendue ne rend aucun clip et conservation de l'erreur sans telechargement partiel sur echec MediaRecorder/rendu, resume export affichant format demande et format reel apres fallback MP4/WebM, grain/glitch/pixel-scatter deterministes par timestamp, overlay safe areas verticales dans la preview, inputs timecode trim in/out pour le clip selectionne et start/duree pour transitions/textes/audio, controles lock/mute/visible sur les pistes, application des pistes mute/visible a la preview/export, indicateur de drop reorder, waveform timeline deterministe/reelle sur pistes musique importees, toolbar mobile avec export sticky, panneau mobile compact moins couvrant et mode plein ecran explicite, et smoke video renforce sur safe areas/timecode/timestamp de transition/timecode item/verrou pistes Effets/Filtres/etats de pistes/snap/drop/waveform/undo trim/echec export sans blob partiel/plan de frames/fallback MP4 vers WebM/mobile petite hauteur.
- Les dernieres passes Vibe_CUT renforcent encore l'export et la preview : mix audio export cree desormais un flux audio si les clips video sont audibles meme sans piste musique externe, resume export affiche `Audio export` et `Controle frames`, garde-fou de frames noires consecutives bloque les exports qui rendraient une video active en noir, `PlaybackEngine` consomme les transitions de coupe canoniques `allTransitions` pour preview/export/audio avec fallback legacy, les waveforms des clips video sont extraites best-effort a l'import avec fallback explicite, et le panneau Filtres propose un mode preview Avant/Apres qui neutralise les filtres uniquement dans la preview et se reinitialise a la fermeture/changement de panneau.
- Mise a jour 2026-06-03 : Vibe_CUT ajoute l'architecture Export Pro Cloud local-first. `src/features/vibefx-studio/video/export/exportManifest.js` cree un manifeste MP4/H.264/AAC versionne avec clips/transitions/textes/audio/droits/estimations, `exportStorageService.js`, `exportRenderService.js` et `exportJobService.js` simulent en localMock les phases Preparation/Mise en file/Rendu/Encodage/Finalisation avec annulation, retry, logs et historique, et basculent en mode `firebase` vers upload Storage + callable `createVideoExportJob`. `ExportVideoPanel.jsx` expose `Export Pro MP4` comme chemin principal et relabelise l'ancien MediaRecorder en `Export rapide navigateur (brouillon)`, `render-service/` contient un MVP Cloud Run FFmpeg signe qui telecharge les sources Storage, encode un MP4 simple et uploade l'output, `functions/src/videoExport.js` expose les callables create/cancel/retry avec validation manifeste serveur, App Check, statut Firestore et appel renderer, `.env.example` ajoute les variables Export Pro, `MusicLibrary.jsx` ajoute les pistes starter immediatement puis extrait la waveform en best-effort, et `npm run test:vibecut-export` couvre le manifeste/jobs mock tandis que `npm run test:video-ui` cible explicitement le fallback navigateur.
- Mise a jour 2026-05-25 : la timeline Vibe_CUT generalise les pistes empilables au-dela du texte. `timelineModel.js` distingue maintenant les roles `transition`, `effect`, `text`, `clip-audio` et `music`, et `resolveTimelineRenderPlan` rend toutes les timelines visibles de transitions, filtres, textes et musiques. `videoStore.js` ajoute `addTimelineTrack` / `removeTimelineTrack`, conserve `addTextTrack` comme alias, place automatiquement les imports musique qui chevauchent sur une timeline libre/nouvelle, bloque la suppression des pistes systeme et des pistes non vides, puis expose des notices lisibles. `Timeline.jsx` aligne les headers et lanes avec des ordres symetriques, ajoute les boutons +/suppression par piste, affiche les timelines supplementaires et remplace les anciennes lignes blanches par des separateurs sombres inline. `AudioPanel.jsx` permet de deplacer une piste musique entre timelines. Les smoke tests video couvrent les timelines supplementaires, le rendu multi-pistes et les suppressions protegees.
- `docs/production-ai-monetization-security-megaprompt.md` cadre la suite production : scouting fournisseurs IA globaux (US/EU/Chine/Asie/open-weight/aggregateurs/marketplaces), modele credits, Stripe Checkout/webhooks, dashboard utilisateur, securite anti-abus, Cloud Run/FFmpeg, model router et roadmap par lots.
- `docs/production-saas-audit.md` formalise la passe 0 du megaprompt production : etat Auth/Firestore/Storage/Functions, surfaces privees/noindex, schemas Firestore/Storage proposes, rules cible, mapping Stripe, `aiPricingPolicies`, router IA v1, registry providers avec statuts prudents, risque Midjourney/scraper et plan de tests emulateurs/Stripe CLI.
- Les pages SEO publiques prioritaires sont creees en Server Components via `src/app/components/SeoLandingPage.jsx` et `src/app/seo-pages.js`, avec canonical/metadata/JSON-LD et presence dans `sitemap.xml` sans importer le bundle studio.
- Lot 1 est amorce avec `/account` : Auth anonyme de test, liaison Google/email, profil `users/{uid}` minimal, lecture dashboard de `creditBalance`, `payments` et `aiJobs`, suppression compte via reauth client Google/email puis callable serveur `requestAccountDeletion` avec authentification recente obligatoire (purge Storage `users/{uid}/`, suppression publications owner, scrub jobs/checkouts, tombstone user, delete Auth), sans ecriture client sur credits, ledger, payments ou jobs.
- Lot 2 est amorce cote serveur avec `functions/src/billingProducts.js` pour le mapping `priceId -> entitlement`, `functions/src/billingSession.js` pour valider priceId/metadonnees Checkout, `functions/src/billingEvents.js` pour gerer `checkout.session.completed`, `async_payment_succeeded`, `async_payment_failed` et `expired`, `functions/src/billing.js` pour Checkout/webhook, et `/account/billing` pour lancer l'achat lifetime 9,99 EUR depuis un compte permanent puis afficher un historique d'achats simplifie. Le webhook marque aussi `checkoutSessions/{id}` en `fulfilled` ou `expired/failed` pour garder le suivi serveur coherent. `npm run test:billing-ledger` verifie le fulfillment premium/credits, le replay `event.id`, le replay d'une deuxieme event sur la meme session, le statut `checkoutSessions` succes/echec, et le marquage expired sans emulateur.
- Lot 3 est amorce cote serveur avec `createAiJob` : Auth obligatoire, App Check enforce par defaut hors emulateurs, policy serveur `aiPricingPolicies` ou bootstrap mock local, calcul cout/marge par policy (`estimatedProviderCostUsd`, buffers, `targetGrossMargin`, `minCreditsForTargetMargin`) avec blocage automatique sous seuil, registry providers IA global (`OpenAI`, `Anthropic`, `Gemini`, `Groq`, Chine/Asie, aggregateurs, marketplaces) tous `productionAllowed=false` tant que non verifies, router provider/model avec `routeCandidates` et score pondere `quality 0.35 + margin 0.25 + latency 0.15 + reliability 0.15 + legalSafety 0.10`, audit de selection persiste dans `aiJobs.routeAudit` (`routeScores`, `rejectedCandidates`, pricing/marge), reserve credits en transaction, ledger `reserve/capture/release`, rate limit par uid/feature/ipHash/minute, stockage de `requestIpHash` sans IP brute, provider mock sans appel externe, blocage production du mock, reconciliation planifiee `reconcileStaleAiReservations` toutes les 15 minutes pour liberer les reservations IA perimees, et journalisation serveur `securityEvents` des refus IA sensibles sans prompt brut. `/account/usage` expose un formulaire de lancement qui appelle le callable serveur et relit l'historique `aiJobs`; `npm run test:ai-gateway` couvre aussi l'economie des policies, le scoring/fallback multi-candidats, le rejet Midjourney et la normalisation IP, et `npm run test:ai-ledger` couvre reserve/capture/release, double appel, audit route, credit insuffisant, rate limit uid/feature/ipHash, liberation de reservation perimee et redaction des security events sans emulateur.
- Les callables Meta, Stripe Checkout, IA et Export Pro partagent `functions/src/appCheck.js` : App Check est actif par defaut en production, desactivable seulement par `ENFORCE_*_APP_CHECK=false` pour une session locale controlee; `npm run test:app-check` et `npm run test:scope` verrouillent ce comportement.
- `firestore.rules` interdit les ecritures client sur `users/{uid}/creditLedger`, `aiJobs`, `videoExportJobs`, `aiRateLimits`, `payments`, `checkoutSessions`, `accountDeletionRequests`, `stripeEvents`, `aiPricingPolicies`, `aiProviderPriceSnapshots`, `providerRegistry` et `securityEvents`; il autorise aussi les metadata owner-scoped `users/{uid}/soundtrackTracks/{trackId}` avec champs allowlistes. `storage.rules` ajoute uploads prives images/audio/video, fichiers projet Soundtrack `users/{uid}/soundtrack/...` limites aux MIME audio, autorise les sources d'export owner-scoped et bloque les outputs IA/export en ecriture client.
- La landing page unique `/` est optimisée pour le Server-Side Rendering (SSR) et regroupe le hero produit, 4 cartes de fonctionnalités descriptives, une section FAQ complète, et l'animation SVG de routage `PublicationRoutePipeline`.
- Le premier lancement prod sans IA est pilote par `src/config/aiLaunch.js` : `NEXT_PUBLIC_VIBEFX_AI_INTERFACES_ENABLED` vaut off par defaut, `/backoffice` ajoute un override localStorage/cookie, le header public pointe temporairement vers le backoffice, la page pricing expose seulement l'offre lifetime 9,99 EUR et l'espace compte masque les credits/jobs IA avec un wording utilisateur simplifie, le studio ne monte plus le rail agents IA ni les boutons AI clip, l'onglet Library/Midjourney et ses selectors sont masques, Soundtrack filtre les providers de generation IA, et `/api/music/ai-*` retourne 404 sauf flag/cookie actif.
- Mise a jour 2026-06-05 : le backoffice ajoute un bloc Export telemetry lisant `videoExportJobs` owner-scoped via Firebase client, avec agregats jour/semaine/mois, cout Cloud Run/Storage estime, table des jobs recents et smoke `npm run test:backoffice-export-telemetry`; une vraie vue admin globale reste a faire via callable serveur/admin claims.
- Mise a jour 2026-06-05 : le renderer Cloud Run Vibe_CUT applique maintenant `clips[].orientationRotation` via FFmpeg (`90`, `180`, `270`). Smoke live controle execute sur `K1/MVI_0126.MP4` avec rotation gauche `270`, trim 3s et sortie Storage `manual-k1-rotate-left-20260605-200305` : status renderer `ready`, output MP4 1080x1920, duree 3s, POST non signe refuse en 401.
- Mise a jour 2026-06-05 : `docs/vibecut-export-production-hardening-megaprompt.md` est recadre pour la release Export Pro : il retire les etapes obsoletes de preuve Cloud Run simple, conserve les gates deploy/live avec confirmation, ajoute le choix de destination desktop/PC via download ou File System Access API, impose une UX de progression export, et finit par un smoke live officiel avec deux videos K1 avant `Go release beta`.
- Mise a jour 2026-06-05 : le megaprompt Export Pro adopte une doctrine renderer-first : le navigateur devient cockpit de pilotage, le manifest canonique devient source contractuelle, le renderer serveur doit produire les textes, animations, transitions, colorimetrie, audio et video avant encodage FFmpeg, et toute feature visible non rendue serveur doit etre bloquee ou masquee avant export pro.
- Mise a jour 2026-06-05 : Phase 1 hardening Export Pro amorcee. `ExportVideoPanel.jsx` utilise maintenant `resolveExportRenderMode()` au preflight, launch et retry au lieu de forcer `localMock`, affiche le mode actif `Rendu Cloud Firebase` / `Simulation locale`, et accepte le preflight Firebase avec upload client avant callable; `exportRenderService.js` et `exportStorageService.js` centralisent l'alias `server -> firebase`, `apphosting.yaml` declare `NEXT_PUBLIC_VIBECUT_EXPORT_MODE=firebase`, et `npm run test:vibecut-export` echoue si le panneau force de nouveau `localMock`.
- Mise a jour 2026-06-05 : Phase 2 hardening Export Pro avancee. `exportManifest.js` ajoute estimations `sourceSize`/`cost` et `validateExportRenderCoverage()` pour bloquer les features visibles non rendues serveur (textes, transitions, vitesse, colorimetrie, audio clip/musique, fit non supporte) au lieu de les ignorer; `ExportVideoPanel.jsx` affiche compatibilite `Exportable pro`/`Bloque`, cout/taille source, etapes Preparation/Upload/Queue/Rendu/Encodage/Finalisation/Output, et details output Storage/MP4 une fois `ready`; `exportJobService.js` expose `subscribeLatestVideoExportJob()` pour restaurer le dernier job Firestore owner-scoped apres refresh en mode Firebase et l'UI expose aussi l'etat `retrying`.
- Mise a jour 2026-06-05 : Phase 3 hardening Export Pro ajoute la destination desktop/PC. `ExportVideoPanel.jsx` propose `Telechargements` ou `Dossier PC` quand un vrai MP4 Storage est pret, genere un nom `vibecut-{projet}-{yyyyMMdd-HHmm}.mp4`, recupere une URL via `getDownloadURL()` quand le job n'a que `output.storagePath`, et utilise File System Access API seulement apres clic utilisateur; `scripts/smoke-vibecut-export-jobs.mjs` verifie ces garde-fous statiques.
- Mise a jour 2026-06-05 : Phase 4 hardening Export Pro amorcee cote Functions. `functions/src/videoExport.js` valide les chemins `users/{uid}/exports/{job}/sources/video|audio`, applique des quotas MVP (duree, clips, audio tracks, resolution, FPS, bitrates, manifest et taille sources), stocke le manifest complet en JSON Storage avec un resume leger dans `videoExportJobs`, ajoute un stub explicite plan/credits, logge les rejets sans donnees sensibles et expose `getVideoExportDownloadUrl`; `npm run test:vibecut-export` inclut maintenant `scripts/smoke-vibecut-export-functions.mjs`.
- Mise a jour 2026-06-05 : Phase 5 renderer-first avancee. `render-service/src/server.js` mixe maintenant les pistes audio externes via FFmpeg avec `atrim`, `adelay`, volume et `amix`, tandis que `functions/src/videoExport.js`, `exportManifest.js` et le renderer refusent encore les features visibles non rendues serveur (animations texte complexes, transitions non supportees, vitesse, fit unsupported) au lieu de les passer en warnings; `scripts/smoke-vibecut-render-service-contract.mjs` verrouille ce comportement. Le renderer frame-by-frame pour les animations/transitions complexes reste a implementer avant release complete.
- Mise a jour 2026-06-05 : Phase 5 renderer-first ajoute le rendu serveur des textes basiques. `render-service/src/server.js` applique les overlays `textOverlays` avec FFmpeg `drawtext` (contenu, start/end, position normalisee, taille, couleur, fade in/out ou none), `functions/src/videoExport.js` et `exportManifest.js` autorisent ces textes fade/none et continuent de bloquer les animations texte complexes (`scale`, `slide`, `neon-scan`, etc.) jusqu'au renderer frame-by-frame; les smokes Export Pro couvrent texte supporte et animation texte refusee.
- Mise a jour 2026-06-05 : Phase 5 renderer-first ajoute une colorimetrie serveur explicite. `render-service/src/server.js` mappe les filtres Vibe_CUT connus vers FFmpeg (`eq` pour exposition/luminosite/contraste/saturation/vibrance, `hue`, `colorbalance` pour temperature/teinte/ranges, `colorlevels` pour fade, `vignette`, `noise` pour grain); `functions/src/videoExport.js` et `exportManifest.js` autorisent ces cles et refusent les filtres inconnus non nuls. Le rendu colorimetrie serveur reste une implementation FFmpeg controlee, pas une promesse pixel-perfect du canvas.
- Mise a jour 2026-06-05 : Phase 5 renderer-first ajoute les transitions serveur adjacentes `fade`/`crossfade`. `render-service/src/server.js` construit une chaine FFmpeg `xfade=transition=fade` entre clips adjacents en placement `cut`, conserve le concat pour les coupes franches et bloque les transitions non adjacentes/free ou les familles slide/wipe/zoom; `functions/src/videoExport.js`, `exportManifest.js` et les smokes valident la meme matrice.
- Mise a jour 2026-06-06 : hardening Export Pro post-audit. La validation Functions n'interdit plus l'audio source des clips puisque le renderer FFmpeg le mixe, `retryVideoExportJob` relance maintenant un vrai rendu Cloud Run au lieu de recreer seulement un job `queued`, le client passe le `jobId` au retry serveur pour reutiliser le manifest stocke apres refresh, les signatures renderer sont liees a `x-vibecut-timestamp` avec fenetre anti-replay, et `scripts/run-video-ui-test.mjs` neutralise Firebase/App Check/Meta live pour garder le smoke Vibe_CUT local et fiable.
- Mise a jour 2026-06-06 : `render-service/README.md` decrit maintenant le contrat reel du renderer Cloud Run (signature timestamp anti-replay, textes drawtext, transitions fade/crossfade adjacentes, colorimetrie FFmpeg, rotations et mix audio source/externe) et `scripts/smoke-vibecut-render-service-contract.mjs` verifie que la documentation ne retombe pas sur les anciennes limites concat-only.
- Mise a jour 2026-06-06 : le modal Export Pro derive maintenant le container, le codec et le MIME depuis `render`/`output` au lieu de hardcoder MP4/H.264, `exportRenderService.js` et `exportJobService.js` preservent les metadata `projectName`/`render`/`estimates` apres callable Firebase, retry et refresh Firestore, et les smokes `test:vibecut-export` + `test:video-ui` verrouillent ces informations de sortie visibles.
- Mise a jour 2026-06-06 : `scripts/prepare-vibecut-k1-live-smoke.mjs` prepare le smoke final K1 sans appel Cloud : verification de `MVI_0126.MP4` + `MVI_0117.MP4`, manifest 1080x1920 30fps MP4 H.264/AAC avec trim court, rotation, crossfade adjacent, texte fade et estimations source/output/cout; `npm run test:vibecut-export` l'execute en dry-run et rappelle que le live requiert `OK pour smoke live Cloud Run K1`.
- Mise a jour 2026-06-06 : `functions/src/videoExport.js` prepare le passage Cloud Run prive avec `EXPORT_RENDERER_AUTH_MODE=oidc` ou `hmac+oidc` : la Function peut recuperer un ID token via metadata server pour l'audience renderer et l'ajouter en `Authorization: Bearer`, tout en conservant les signatures HMAC timestamp; les smokes Functions verrouillent ce chemin sans deploy ni appel cloud.
- Mise a jour 2026-06-06 : `executeRendererForJob` relit maintenant le job Firestore apres le retour Cloud Run et conserve `cancelled` si l'utilisateur a annule pendant FFmpeg; l'output termine est trace dans `cancelledOutput` avec `ignoredAfterCancel` au lieu d'ecraser le job en `ready`, et le smoke Functions verrouille ce comportement.
- Mise a jour 2026-06-06 : les transitions Firestore `queued -> rendering` et `renderer error -> failed` sont maintenant protegees par transaction via `markJobRenderingUnlessCancelled` et `markJobFailedUnlessCancelled`, afin qu'un cancel concurrent ne puisse plus etre ecrase par `rendering` ou `failed`; le smoke Functions interdit les catchs renderer qui ecrivent `failed` directement.
- Mise a jour 2026-06-06 : `getVideoExportAdminTelemetry` ajoute une callable admin globale pour les jobs export video recents, protegee par custom claim `admin`, `ADMIN_EMAILS` ou `admins/{email}` actif; elle retourne des jobs sanitises, agregats statut/cout/taille/temps moyen sans fuite de paths Storage ni URLs signees. Le backoffice tente cette vue globale puis retombe sur la lecture owner-scoped, et `npm run test:backoffice-export-telemetry` verifie les deux chemins.
- Mise a jour 2026-06-06 : `docs/vibecut-export-production-runbook-2026-06-06.md` documente la source de verite deploy Export Pro (App Hosting, Functions, Secret Manager, Cloud Run public/HMAC puis prive/OIDC, gates locaux, dry-run/live K1, rotation du secret et limites no-go); `scripts/smoke-vibecut-export-runbook.mjs` est ajoute a `npm run test:vibecut-export`.
- Mise a jour 2026-06-06 : `scripts/prepare-vibecut-pro-fixtures.mjs` formalise les fixtures pro hors Cloud : texte statique, transition crossfade, colorimetrie FFmpeg, audio externe et pile combinee sont verifies exportables par manifest/coverage, tandis que l'animation texte avancee `neon-scan` reste explicitement bloquee jusqu'au renderer frame-by-frame; le runbook et `npm run test:vibecut-export` incluent ce constat.
- Mise a jour 2026-06-06 : `docs/vibecut-export-hardening-status-2026-06-06.md` consolide l'audit Export Pro par phase et garde le verdict en `pre-release hardening` sans `Go release beta` tant que le smoke live K1, les MP4 finaux des fixtures pro et `npm run test:emulators` ne sont pas valides; `scripts/smoke-vibecut-export-status-audit.mjs` est ajoute a `npm run test:vibecut-export` pour verrouiller ces blocages.
- Mise a jour 2026-06-06 : `scripts/check-vibecut-export-release-gate.mjs` ajoute un gate non mutant `npm run check:vibecut-export-release` qui echoue explicitement tant que les preuves release manquent (Phase 5/6/7 partielles, K1 live absent, Java emulateurs absent, fixtures MP4 non generees, deploy non execute).
- Mise a jour 2026-06-06 : `scripts/render-vibecut-k1-local-mp4-smoke.mjs` ajoute `npm run test:vibecut-k1-local-mp4`, un smoke local sans Cloud qui doit produire un MP4 K1 1080x1920 H.264/AAC avec rotation, crossfade, texte et verification ffprobe/blackdetect; il est separe des tests verts tant que `ffmpeg`/`ffprobe` ne sont pas disponibles dans le PATH local.
- Mise a jour 2026-06-06 : `scripts/check-vibecut-export-local-prereqs.mjs` ajoute `npm run check:vibecut-export-prereqs` pour verifier sans Cloud les sources K1, `ffmpeg`, `ffprobe` et Java; le smoke MP4 local accepte maintenant aussi `VIBECUT_FFMPEG_PATH`, `FFMPEG_PATH`, `VIBECUT_FFPROBE_PATH`, `FFPROBE_PATH` et des chemins Windows courants.
- Mise a jour 2026-06-06 : `ffmpeg-static` et `ffprobe-static` sont ajoutes en devDependencies pour lever le blocage FFmpeg local; `npm run test:vibecut-k1-local-mp4` produit maintenant un MP4 K1 local verifie 1080x1920 H.264, 30 fps, 5.5s, audio present et frames non noires. Java reste absent pour `npm run test:emulators`.
- Mise a jour 2026-06-06 : `scripts/render-vibecut-pro-fixtures-local-smoke.mjs` ajoute `npm run test:vibecut-pro-fixtures-local-mp4`, qui genere localement les MP4 des fixtures supportees `static-text`, `crossfade-transition`, `color-filters`, `external-audio` et `combined-supported`, puis verifie codec H.264, 1080x1920, duree, audio attendu, frames non noires et region texte lumineuse.
- Mise a jour 2026-06-06 : `docs/vibecut-export-hardening-status-2026-06-06.md` distingue maintenant les fixtures pro MP4 locales validees du blocage restant des fixtures finales via renderer canonique/Cloud Run, afin de ne pas confondre preuve FFmpeg locale et release beta serveur.
- Mise a jour 2026-06-06 : `npm run test:vibecut-export-local-mp4` regroupe les preuves MP4 locales lourdes (`test:vibecut-k1-local-mp4` + `test:vibecut-pro-fixtures-local-mp4` + `test:vibecut-renderer-local-contract`) a relancer juste avant tout smoke Cloud Run live.
- Mise a jour 2026-06-06 : `npm run test:emulators` passe maintenant par `scripts/run-firebase-emulators-test.mjs`, qui exige Java 21+ via `VIBECUT_JAVA_HOME`, `JAVA_HOME`, PATH ou chemins Windows courants avant de lancer `firebase emulators:exec`; la machine a montre un Java trop ancien pour `firebase-tools`, donc Java 21+ reste le blocage emulateurs.
- Mise a jour 2026-06-06 : le modal Export Pro normalise maintenant les codecs de sortie (`H.264`, `H.265/HEVC`, `VP9`, `AV1`, `AAC`, etc.) et mappe les formats futurs vers leur MIME (`video/webm`, `video/quicktime`, images) au lieu de presenter tout fallback comme MP4; `scripts/smoke-vibecut-export-jobs.mjs` verrouille ce comportement et `npm run test:video-ui` reste vert.
- Mise a jour 2026-06-06 : `render-service/src/server.js` exporte `validateManifest`, `validateRendererCoverage` et `buildFfmpegArgs`, ne demarre plus le serveur HTTP quand il est importe par un smoke local, et lazy-load `@google-cloud/storage`; `scripts/render-vibecut-renderer-local-contract-smoke.mjs` utilise ce contrat canonique pour rendre localement K1 + une fixture combinee avec le meme graphe FFmpeg que le service Cloud Run.
- Mise a jour 2026-06-06 : `scripts/audit-vibecut-export-hardening-requirements.mjs` ajoute une matrice locale non mutante des exigences `docs/vibecut-export-production-hardening-megaprompt.md` avec statuts `done`, `done_mvp`, `partial` et `blocked`; `npm run test:vibecut-export` l'execute pour verifier que les preuves code/docs restent coherentes et que le statut ne devient pas `Go release beta` tant que Java 21+, le smoke live K1 et les preuves Cloud Run finales manquent.
- Mise a jour 2026-06-06 : `scripts/guard-vibecut-k1-live-smoke.mjs` ajoute `npm run guard:vibecut-k1-live`, un sas non mutant avant smoke Cloud Run K1 qui refuse de s'armer sans `VIBECUT_LIVE_CONFIRM="OK pour smoke live Cloud Run K1"`, refuse `VIBECUT_EXECUTE_LIVE=1`, verifie les sources K1, les gates MP4 locaux, les emulateurs et les variables live, puis laisse l'action Cloud unique au runbook humain.
- Mise a jour 2026-06-06 : `scripts/verify-vibecut-k1-cloud-output.mjs` ajoute `npm run verify:vibecut-k1-cloud-output`, un gate post-smoke local qui prend `VIBECUT_CLOUD_OUTPUT_FILE` ou un chemin MP4 en argument et verifie le fichier telecharge Cloud Run : container MP4-compatible, H.264, AAC, 1080x1920, ~30 FPS, ~5.5s, audio present et frames non noires.
- Mise a jour 2026-06-06 : `src/features/vibefx-studio/video/export/exportMediaMetadata.js` centralise la resolution front des metadata output Export Pro (container, codec, MIME) pour eviter les hardcodes dans `ExportVideoPanel.jsx`; `scripts/smoke-vibecut-export-media-metadata.mjs` execute la matrice MP4/WebM/MOV/PNG/JPEG/WebP et codecs H.264/H.265/VP9/AV1/ProRes/DNxHR/AAC/Opus, y compris les exports image sans faux codec audio.
- Mise a jour 2026-06-06 : `functions/src/videoExport.js` ajoute l'orchestration async optionnelle `EXPORT_RENDER_ORCHESTRATION=taskQueue` avec `processVideoExportJob` en Task Queue Function; `createVideoExportJob` et `retryVideoExportJob` peuvent desormais creer le job Firestore, enqueue Cloud Tasks puis retourner `queued` rapidement, tandis que le worker relit le manifest Storage owner-scoped, respecte les jobs terminaux/cancel et lance le renderer.
- Mise a jour 2026-06-06 : la securite renderer distingue maintenant l'auth d'appel Functions (`EXPORT_RENDERER_AUTH_MODE=hmac`, `hmac+oidc`, `oidc`) et la verification applicative Cloud Run (`EXPORT_RENDERER_VERIFY_MODE=hmac` par defaut ou `platform-iam` seulement avec `EXPORT_RENDERER_PRIVATE_IAM_CONFIRMED=true`), pour eviter un endpoint public sans HMAC tout en preparant le passage prive IAM.
- Mise a jour 2026-06-07 : le backoffice Export telemetry separe maintenant l'estimation interne des jobs et le cout Google reel lu via Cloud Billing Export BigQuery (`CLOUD_BILLING_EXPORT_TABLE` ou variables projet/dataset/table), expose `cloudBilling` depuis `getVideoExportAdminTelemetry`, ajoute les cartes facture Cloud Run et garde un fallback explicite quand BigQuery n'est pas configure.
- Mise a jour 2026-06-07 : Vibe_CUT unifie les outils rapides et les panneaux detailles dans le panneau droit unique pour liberer la preview; les transitions visibles sont recentrees sur les passages entre clips (Film/Cross Dissolve, Smooth Cut, Blur Dissolve, Whip Pan, Cross Zoom, Light Leak), les transitions `placement=cut` reapparaissent sur la piste Transitions et dans la preview, les effets sont renommes en looks clip, et le backoffice ajoute une connexion dev + totaux couts exports/facture Google.
- Mise a jour 2026-06-07 : deux smokes live K1 sont ajoutes. `run-vibecut-k1-cloud-run-live-smoke.mjs` teste le chemin callable Firebase complet quand un token Auth valide est fourni, et `run-vibecut-k1-cloud-run-direct-smoke.mjs` teste directement le renderer Cloud Run signe HMAC. Le smoke direct a rendu `K1/MVI_0126.MP4` + `K1/MVI_0117.MP4` avec rotation gauche 270 et crossfade sur la revision Cloud Run `vibecut-render-service-00004-mz5`; le MP4 telecharge `C:\Users\pcpor\OneDrive\Bureau\K1\vibecut-k1-cloudrun-direct-20260607T105813.mp4` passe `npm run verify:vibecut-k1-cloud-output`.
- Mise a jour 2026-06-07 : deploy backend Firebase revalide. `scripts/firebase-deploy.mjs` utilise le binaire local `firebase-tools` via Node et augmente `FUNCTIONS_DISCOVERY_TIMEOUT`; `scripts/check-emulator-readiness.mjs` accepte `VIBECUT_JAVA_HOME`. Java 21 portable debloque `npm run test:emulators`. Les callables restent en `europe-west9`, tandis que `processVideoExportJob` et `reconcileStaleAiReservations` passent en `europe-west1` car Cloud Tasks/Scheduler ne supportent pas `europe-west9`; une cleanup policy Artifact Registry 7 jours est configuree en `europe-west1`.
- Mise a jour 2026-06-06 : `scripts/smoke-vibecut-export-coverage-parity.mjs` verrouille la parite client/Functions/renderer sur 12 cas de couverture Export Pro : textes fade, crossfade adjacent, filtres connus, audio externe acceptes; animation texte avancee, transition non supportee/non adjacente, slow motion, fit unsupported, filtre inconnu et texte vide bloques aux trois etages.
- Mise a jour 2026-06-06 : `scripts/render-vibecut-pro-fixtures-local-smoke.mjs` recree le dossier parent avant chaque sortie FFmpeg pour rendre le gate `npm run test:vibecut-export-local-mp4` robuste si `test-results` est nettoye pendant une passe de controles; le gate local MP4 repasse OK apres correction.
- Mise a jour 2026-06-06 : ajout d'un module `src/features/export/` pour structurer l'Export Pro facon panneau DaVinci/Premiere adapte web : presets sociaux, formats/codecs avec statuts ready/server_required/future, reglages Video/Audio/File/Advanced, estimation taille, sanitization filename, queue locale et export image canvas PNG/JPEG/WebP; `ExportVideoPanel.jsx` branche ce panneau et alimente le manifest par overrides sans masquer que le renderer final supporte seulement MP4 H.264/AAC aujourd'hui.
- Mise a jour 2026-06-07 : menage documentaire dans `docs/`. Les anciens prompts/audits et l'archive Export Pro legacy sont supprimes; les sources conservees sont `studio-ai-agents-megaprompt.md`, `vibecut-export-production-hardening-megaprompt.md`, `vibecut-export-hardening-status-2026-06-06.md`, `vibecut-export-production-runbook-2026-06-06.md` et `vibecut-export-pro-checkpoint-2026-06-06.md`.
- Les CSS lourds de `vibefx-layout` et `publications` sont importes par `src/app/studio/layout.js`, pas par le layout racine, afin d'eviter de charger le studio sur les pages publiques.
- La page Layout ajoute une section `Modele personnalise` sous les modeles standards dans `src/features/vibefx-studio/components/sidebar/LayoutSidebar.jsx` et son equivalent `src/features/vibefx-layout/components/sidebar/LayoutSidebar.jsx`; les presets JSON normalises `CUSTOM_LAYOUT_PRESETS` / `DEFAULT_CUSTOM_TEMPLATE` et la palette `CUSTOM_SHAPE_LIBRARY` vivent dans les deux `data/constants.jsx`, le moteur Canvas 2D dessine les zones custom vides ou remplies par slot dans les deux `engine/layoutRenderer.js`, le canvas reste visible sans image source quand un modele custom est actif, et l'import par zone stocke l'image localement dans `slotConfigs` tout en serialisant le payload publication sans objet `Image`. Le mode edit personnalise ajoute les utilitaires `utils/customLayout.js` des deux modules pour creer, borner, redimensionner, pousser/scanner une position libre, reduire un voisin si necessaire et masquer automatiquement les zones sans placement propre; les zones masquees restent dans le JSON et redeviennent visibles quand la place revient. Les deplacements automatiques preservent une geometrie d'origine `homeX/homeY/homeW/homeH` pour eviter qu'un bloc revienne sous forme de lamelle apres reduction temporaire. Les voisins de meme rangee ne sont plus envoyes dans les rangees basses pour ne pas casser les vignettes existantes. La palette de formes drag/drop reste exposee dans `CanvasWorkspace`.
- Mise a jour 2026-06-02 : le dock images de la page Layout dans `src/features/vibefx-studio/components/canvas/CanvasWorkspace.jsx` expose un gros bouton `Ajouter image`, une action `Changer` par vignette, et `src/features/vibefx-studio/hooks/useImageUpload.js` gere maintenant l'ajout multi-image et le remplacement cible avec fallback FileReader. Le style Vibe_OS du dock est centralise dans `src/features/vibefx-layout/vibefx-layout.css`.
- Les actions Meta/OAuth cote client sont neutralisees quand Firebase Functions n'est pas initialise.
- La publication Meta manuelle cote Functions exige un admin via `ADMIN_EMAILS`, custom claim `admin`, ou document `admins/{email}` actif ; aucun email admin n'est hardcode.
- Le callback OAuth Meta reserve le state en transaction (`processing`) avant les appels Graph API pour eviter le rejeu concurrent, puis le marque `failed` en cas d'erreur.
- La publication OAuth connectee refuse un token Meta expire, marque la connexion `expired` et demande une reconnexion.
- Les Functions Meta refusent une synchronisation sans plateforme selectionnee.
- Le prompt maitre demande explicitement de reprendre comme base la logique publication/Firebase deja travaillee dans le projet source : moteur layout, `PublicationsManager.jsx`, Functions Meta/OAuth, verrous, statuts et rules Firestore/Storage.
- Reste a poursuivre avec configuration externe : test E2E navigateur complet du parcours studio, ecriture Firestore/Storage reelle et OAuth Meta.
