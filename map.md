# map.md - Carte vivante Vibe_fx V2

Derniere mise a jour : 2026-05-22

## Regle

Mettre a jour ce fichier a chaque creation, suppression, renommage, deplacement ou modification structurelle.

## Arbre actuel

```text
.
|-- .github/
|   `-- workflows/
|       `-- verify.yml                  # CI GitHub Actions : verify local + emulateurs + smoke routes/UI + sauvegarde studio emulateurs
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
|   |-- business-flow-test.md           # Trace de tests locaux et checklist Firebase/Meta
|   |-- changes-recovery-audit.md       # Rapport local de reprise : inventaire Git, lots, risques, corrections et tests restants
|   |-- changes-recovery-audit-megaprompt.md # Prompt d'audit/reprise des changes interrompus et classification fichier par fichier
|   |-- completion-audit.md             # Audit prompt -> artefacts + blocages externes
|   |-- music-sourcing-and-import-plan.md # Audit sources musique, IA, licences et architecture d'import Vibe_CUT
|   |-- production-saas-audit.md        # Audit Lot 0 SaaS IA/Stripe/credits/securite avant implementation Lot 1
|   |-- production-ai-monetization-security-megaprompt.md # Prompt roadmap SaaS : IA, credits, Stripe, dashboard, securite, export production
|   |-- publications-vibeos-design-megaprompt.md # Prompt refonte design page Publications en cockpit Vibe_OS coherent avec mise en page
|   |-- soundtrack-local-playlist-megaprompt.md # Prompt onglet Soundtrack full page, agregateur musique et playlists locales device-first
|   |-- soundtrack-v2-library-pixabay-megaprompt.md # Prompt refonte Soundtrack : bibliotheque projet serveur + agregateur premium Pixabay/sources gratuites
|   |-- studio-ai-agents-megaprompt.md  # Prompt d'integration de la colonne d'agents IA contextualisee par onglet studio
|   |-- video-editor-bug-hunter-megaprompt.md # Prompt QA/UX avance pour stabiliser l'onglet video Vibe_CUT
|   |-- vision-filter-rd-report.md      # Rapport R&D Vision : pipeline, garde-fous, limites corpus et roadmap
|   |-- vision-smartphone-corpus.md     # Contrat corpus smartphone Vision : 12 cas, noms fichiers, gates perceptuels/metriques
|   `-- vision-filter-rd-megaprompt.md # Prompt R&D colorimetrie/filtres pour l'onglet Vision
|-- functions/
|   |-- index.js                        # Exports Functions Meta/OAuth/publication + billing Stripe + AI gateway
|   |-- package.json                    # Firebase Functions Node 20 + stripe server SDK + checks modules src
|   |-- package-lock.json
|   `-- src/
|       |-- account.js                  # Callable suppression compte avec auth recente : purge Storage, publications, scrub jobs/checkouts, delete Auth
|       |-- ai/
|       |   |-- jobs.js                  # Callable createAiJob, reserve/capture/release credits, rate limit uid/feature/ipHash
|       |   |-- jobUtils.js              # Validation feature/requestId, hashes idempotence, IP et rate limit
|       |   |-- mockProvider.js          # Provider IA mock sans appel externe pour tests credits
|       |   |-- policies.js              # Policies IA bootstrap mock + lecture aiPricingPolicies + calcul cout/marge
|       |   |-- providerRegistry.js      # Registry providers IA global, tous productionAllowed=false par defaut
|       |   |-- reconciliation.js        # Scheduled reconciliation des reservations IA perimees
|       |   `-- router.js                # Router provider/model v1 avec scoring multi-candidats et blocage production mock
|       |-- billing.js                  # Checkout Session, webhook Stripe signe, fulfillment idempotent
|       |-- billingEvents.js            # Classification events Checkout Stripe fulfill/failed/ignored
|       |-- billingProducts.js          # Mapping serveur produits Stripe -> entitlements/credits
|       |-- billingSession.js           # Validation pure priceId/metadata des sessions Checkout
|       `-- appCheck.js                 # Politique App Check : enforce par defaut hors emulateurs
|-- public/
|   |-- assets/
|   |   `-- vibefx/
|   |       `-- demo-astronaut.png      # Asset demo pour pages publiques et studio
|   |-- music/                         # Pistes audio importees pour le module video Vibe_CUT
|   |-- file.svg
|   |-- globe.svg
|   |-- next.svg
|   |-- vercel.svg
|   `-- window.svg
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
|   |   |   |   |   `-- pixabayAudioAdapter.js # Adapter provider-first pixabay-audio : q/category explicites, anciens filtres generiques ignores, URL Pixabay Music, parsing HTML borne, cache 24h, metadata-only ou provider-unavailable si URL audio non fiable/403
|   |   |   |   |-- _shared/
|   |   |   |   |   `-- audioImport.js # Validation/proxy audio URL allowlistee reutilisee par import local et import projet authentifie
|   |   |   |   |-- free-search/
|   |   |   |   |   `-- route.js        # Agregateur serveur provider-first : Openverse Audio actif pour scan par categorie, Pixabay conserve en adapter page-scan borne mais non actif UI par defaut
|   |   |   |   |-- import/
|   |   |   |   |   `-- route.js        # Proxy serveur controle pour URL audio directe allowlistee, validation host final, sans scraping de catalogue
|   |   |   |   |-- project/
|   |   |   |   |   `-- import-url/
|   |   |   |   |       `-- route.js    # Import projet authentifie d'une URL audio directe avec metadata droits obligatoires
|   |   |   |   `-- providers/
|   |   |   |       `-- route.js        # Metadata providers musique : Openverse actif, Pixabay signale page-scan bloque, autres a venir/cle manquante
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
|   |   |   |-- AccountClient.jsx        # Dashboard prive Auth/profil/credits/usage en client component
|   |   |   |-- billing/
|   |   |   |   `-- page.js               # Vue privee facturation noindex
|   |   |   |-- usage/
|   |   |   |   `-- page.js               # Vue privee usage/jobs IA noindex
|   |   |   `-- page.js                 # Dashboard compte noindex
|   |   |-- editeur-image-instagram/
|   |   |   `-- page.js                 # Page SEO editeur image Instagram
|   |   |-- outil-publication-reseaux-sociaux/
|   |   |   `-- page.js                 # Page SEO outil publication reseaux sociaux
|   |   |-- pricing/
|   |   |   `-- page.js                 # Page SEO pricing premium + credits IA
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
|   |   |-- globals.css                 # Base CSS + direction cyber/dark + page d'accueil
|   |   |-- layout.js                   # Metadata racine + imports CSS globaux
|   |   |-- page.js                     # Unique page d'accueil SSR optimisée (FAQ + Pipeline + Launch)
|   |   |-- robots.js                   # Robots Next.js
|   |   |-- seo-pages.js                # Donnees metadata/contenu JSON-LD des pages SEO publiques
|   |   `-- sitemap.js                  # Sitemap Next.js pour les pages publiques
|   |-- features/
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
|   |   |-- components/                 # Header, tabs Studio/Fusion/Layout/Library/Soundtrack/Vision/Video et panneaux source Vibe_fx
|   |   |   `-- ai/                     # Rail IA contextuel : actions, prompt, credits, trace job, outputs
|   |   |-- data/                       # Constantes, presets et donnees UI importees
|   |   |-- engine/                     # Rendu canvas/physics importes depuis Vibe_fx
|   |   |-- hooks/                      # Hooks interaction, renderer, bibliotheque et assets
|   |   |-- soundtrack/                 # Onglet Soundtrack full page V2 : agregateur sources gratuites par defaut avec filtres provider-specifiques + bibliotheque Vibe_fx en popup desktop/fullscreen mobile, Firebase projet ou local-first
|   |   |   |-- components/               # ProjectLibraryPanel popup avec import/suppression/playlists/classement local/projet, AggregatorPanel, Search provider-specifique, assistant import manuel Pixabay, results/rows/player, dossier local et droits/licences
|   |   |   |-- data/                     # Providers/filtres/defaults Soundtrack reutilisant musicCatalog
|   |   |   |-- hooks/                    # Recherche API, player preview, bibliotheque projet Firebase et bibliotheque locale IndexedDB/dossier
|   |   |   |-- services/                 # Modele/client Firestore/Storage projet (tracks + playlists), cache/search provider, IndexedDB, manifest, File System Access, downloads locaux et audit droits
|   |   |   |-- SoundtrackPage.jsx        # Experience full page Soundtrack dans le studio, sans canvas/sidebar
|   |   |   `-- soundtrack.css          # CSS dark-ui/technical-ui scope Soundtrack charge par /studio/layout
|   |   |-- utils/                      # Utilitaires canvas/image + color science Vision (`visionColorScience.js`, `visionMetrics.js`)
|   |   |-- video/                      # Module Vibe_CUT importe, dont `data/musicCatalog.js` pour catalogue/sources/licences, `data/musicRights.js` pour audit/manifeste droits musique, `services/exportRightsManifestClient.js` pour persistance Firestore owner-scoped, `model/timelineModel.js` pour le modele canonique tracks/items, et `utils/audioWaveform.js` pour l'extraction waveform client
|   |   |-- index.js
|   |   |-- VibeFxStudio.jsx            # Shell studio Vibe_fx + import publication V2 + vue Soundtrack full page
|   |   `-- VideoApp.jsx               # Surface video sans react-router
|   `-- lib/
|       `-- firebase.js                 # Client Firebase NEXT_PUBLIC_*
|-- .env.example                        # Variables publiques + secrets a creer, dont JAMENDO_CLIENT_ID/FREESOUND_API_KEY serveur optionnels
|-- .env.emulators.example              # Variables demo pour brancher le client aux emulateurs + connecteurs musique optionnels
|-- .gitignore
|-- AGENTS.md                           # Regles agents du projet
|-- apphosting.yaml                     # Base Firebase App Hosting
|-- CLAUDE.md                           # Fichier genere, non encore enrichi
|-- eslint.config.mjs
|-- firebase.json                       # Config Firebase backend + emulateurs, sans Hosting classique
|-- firestore.indexes.json
|-- firestore.rules                     # Rules ownerUid + users/ledger/jobs/payments sensibles
|-- jsconfig.json
|-- MEGAPROMPT.md                       # Prompt maitre de conception/deploiement
|-- next.config.mjs
|-- package.json                        # Next.js + Firebase + lucide + three
|-- package-lock.json
|-- README.md
|-- seo.md                              # Agent SEO Google
|-- skills-lock.json                    # Lock des 23 skills importes
|-- test-fixtures/
|   `-- vision-corpus/
|       `-- README.md                   # Instructions de depot local des 12 images smartphone ignorees par Git
|-- scripts/
|   |-- audit-secrets.mjs               # Audit anti-secrets hardcodes dans les fichiers versionnables
|   |-- audit-scope.mjs                 # Audit automatique scope Functions, SEO, modules et termes source
|   |-- check-deploy-target.mjs         # Refuse un deploiement sans projet Firebase dedie
|   |-- check-e2e-readiness.mjs         # Liste les prerequis Firebase/Meta manquants avant E2E reel
|   |-- check-emulator-readiness.mjs    # Verifie firebase-tools, Java 21+ et config emulators
|   |-- check-pixabay-provider.mjs      # Probe reseau Pixabay Music depuis Node : detecte 403/challenge et confirme si des URL audio CDN sont exposees
|   |-- check-vision-corpus.mjs         # Verifie les 12 fixtures smartphone locales ignorees par Git
|   |-- audit-vision-filters.mjs        # Audit statique des profils Vision et du branchement safe smartphone, incluant temperature/halation/tint global masques
|   |-- firebase-deploy.mjs             # Wrapper cross-platform deploy backend/functions avec cible controlee
|   |-- run-vision-corpus-test.mjs      # Lance Next local puis Playwright sur le corpus smartphone Vision local
|   |-- run-vision-ui-test.mjs          # Lance un serveur Next local dedie puis Playwright Vision avec SMOKE_BASE_URL controle
|   |-- run-video-ui-test.mjs           # Lance un serveur Next local dedie puis Playwright Vibe_CUT avec SMOKE_BASE_URL controle
|   |-- smoke-firebase-emulators.mjs    # Smoke test Auth/Firestore/Storage rules sous emulateurs, incluant credits/jobs/payments
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
|   |-- smoke-soundtrack-core.mjs       # Smoke pur Soundtrack V2 : mapping ProviderTrack -> ProjectSoundTrack, droits, cache key provider, parsing Pixabay, manifest sans Blob/File
|   |-- smoke-soundtrack-ui.spec.cjs    # Smoke Playwright onglet Soundtrack V2 : provider-first Openverse mocke, aucun fallback Vibe_CUT dans le scan, popup bibliotheque, import fichier local, playlists/suppression locaux, manifest, providers/API, responsive
|   |-- smoke-studio-ui.spec.cjs        # Smoke test Playwright du flux studio -> import publication
|   |-- smoke-video-timeline-model.mjs  # Smoke test pur du modele timeline/export Vibe_CUT : tracks/items, render plan, trous/overlaps video+transitions, fps/codec, plan de frames
|   |-- smoke-video-store.mjs           # Smoke test pur du store Vibe_CUT : mutations timeline et refus des overlaps selon `tracks[].allowOverlap`
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
`-- storage.rules                       # Rules Storage user-scoped uploads/publications/AI/exports
```

## Pages actuelles

- `/` : page d'accueil SSR unique avec hero cyber-neon/dark-ui, CTA `Launch app`, cartes de caractéristiques descriptives, FAQ complète, et pipeline de routage SVG animé (PublicationRoutePipeline).
- `/studio` : entree noindex vers le studio Vibe_fx importe.
- `/pricing` : page publique indexable pour premium + credits IA, sans promesse IA illimitee.
- `/account`, `/account/billing`, `/account/usage` : surfaces privees noindex pour profil, facturation, usage et lancement controle de jobs IA mock.
- `/outil-publication-reseaux-sociaux`, `/editeur-image-instagram`, `/publier-instagram-facebook`, `/templates`, `/ressources/meta-oauth-publication-instagram-facebook`, `/ressources/formats-instagram` : pages SEO SSR indexables avec metadata, canonical, JSON-LD et liens internes.
- `/api/themes`, `/api/catalog`, `/api/status`, `/api/scrape`, `/api/image/*`, `/api/proxy-image`, `/api/reclassify/*`, `/api/reset` : API internes pour la bibliotheque Midjourney et son scraping local.
- `/api/music/free-search` : API interne d'agregation provider-first. `provider=openverse` est le scan actif UI par categories/tags et renvoie des pistes audio importables quand l'API Openverse repond. `provider=pixabay` reste disponible via l'adapter `pixabay-audio` cote serveur depuis `q/category` explicites (anciens filtres generiques ignores, pages publiques bornees 1/3/5, cache 24h, detection blocage/metadata-only) mais il n'est plus le provider actif UI tant que les pages Music renvoient un challenge 403 cote serveur.
- `/api/music/import` : API interne de telechargement serveur pour URL audio directe allowlistee, sans scraping de catalogue, utilisee par l'import musique verifie.
- `/api/music/project/import-url` : API projet authentifiee pour proxy audio direct allowliste avec metadata droits/source/licence obligatoires avant upload Firebase Storage cote client.
- `/api/music/providers` : API interne de metadata providers musique ; expose Openverse comme provider actif, Pixabay comme page-scan bloque, et les autres providers comme `coming-soon`, `configured-coming-soon` ou `provider-missing-key`.
- `/robots.txt` : genere par `src/app/robots.js`, disallow `/studio`, `/account`, `/api`, `/admin`.
- `/sitemap.xml` : genere par `src/app/sitemap.js` avec home + pages SEO publiques.

## Pages cible a creer plus tard

- `/legal/confidentialite`
- `/legal/conditions`

## Statut

- Projet cree dans `C:\Users\matth\Travail\vibe_fxV2`.
- Les 23 skills ont ete importes avec `npx skills add C:/Users/matth/Desktop/design-skills-db/publish/refero-design-skills`.
- Des dependances ont ete ajoutees : Next.js, React, Firebase, lucide-react, three, howler, zustand, better-sqlite3.
- `firebase-tools` et `@playwright/test` sont des devDependencies pour rendre les commandes Firebase et le smoke test UI reproductibles localement.
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
- `VibeFxStudio` remplace l'entree de mise en page dans `PublicationsManager.jsx` et porte les onglets Studio/Fusion/Layout/Library/Soundtrack/Vision/Video importes depuis `C:\Users\matth\Travail\Vibe_fx`, avec export publication V2 conserve; l'ancienne page studio Credits/SaaS a ete supprimee du header, du deep-link workspace et du rendu studio.
- La bibliotheque est cablee via routes API Next et scripts `scripts/midjourney-scraper/` ; aucune image source n'a ete importee, le catalogue local demarre vide et se remplit par scraping.
- Le module video Vibe_CUT, ses pistes `public/music/` et ses dependances audio/state ont ete portes ; la navigation React Router source a ete remplacee par l'etat d'onglet interne du studio, et les composants studio/video sont declares en client components pour eviter les bailouts SSR.
- Le module video Vibe_CUT accepte les imports lourds en ajoutant les clips immediatement puis en extrayant les thumbnails en arriere-plan ; les filtres colorimetriques sont appliques au rendu canvas, les textes restent visibles en lecture/export, les pistes musique locales `public/music/` sont importables/lisibles, les clips video se reordonnent par drag/drop pointer dans la timeline, une timeline `Effets` separee entre video et texte permet de placer/deplacer/redimensionner des transitions librement sans les melanger aux clips video, et l'export navigateur utilise un canvas dedie a la resolution du preset avec mix audio vers WebM/MP4 si supporte via `MediaRecorder`.
- `npm run test:video-ui` lance `scripts/run-video-ui-test.mjs`, qui demarre un serveur Next local sur port libre ou reutilise le serveur dev Next deja actif, puis execute `scripts/smoke-video-ui.spec.cjs` contre `/studio` avec `SMOKE_BASE_URL` controle ; le smoke couvre import de deux videos courtes, reorder, trim par poignee, split/coupe, drag rapide du playhead violet pendant lecture, vitesse 2x, filtre Cyberpunk, transition Flash sur timeline `Effets` avec verification de luminance canvas, deplacement de l'item transition, synchronisation du panneau Transitions sur start/duration canonique, verrou de piste Effets bloquant input timecode, range du panneau Transitions et drag, verrou de piste Filtres bloquant presets/ranges du panneau Filtres, verrou de piste Musique bloquant le volume, modele pur avec transitions de coupe/libres presentes dans `items[]`, audio integre des clips expose comme items `audio-main`, filtres clips exposes comme items `effect-main`, overlap de transitions detecte, volumes bornes, couverture des frames export pour timestamps de transitions et rejet des transitions trop courtes pour le FPS, texte intro, bibliotheque musique locale avec source/licence White Bat Audio, volumes clip/musique, export WebM telecharge, echec MediaRecorder sans telechargement partiel, fallback MP4 indisponible vers format reel WebM visible, onglet musique ouvrant directement sur `Importer une nouvelle musique gratuite`, wizard `Sources -> Importer cette source` pre-rempli Pixabay, champ URL audio directe avec prechargement/ecoute, catalogue gratuit agrege visible/configurable, endpoint `/api/music/free-search` exposant Openverse, rejet serveur d'un domaine non allowliste, et viewport mobile petite hauteur sans overflow avec lecture/export accessibles et panneau mobile compact basculable plein ecran.
- `npm run test:vision-ui` lance `scripts/audit-vision-filters.mjs`, demarre un serveur Next local via `scripts/run-vision-ui-test.mjs`, puis execute `scripts/smoke-vision-ui.spec.cjs` ; l'audit verifie les cles de profils Vision, le branchement `safeSmartphone`, la normalisation du renderer, le garde-fou final `applySmartphoneOutputGuards`, le blend d'intensite perceptuel, le mode preview `low` fidele sur la passe couleur pixel avec saturation CSS neutralisee, le cap preview interactif 3 MP dans `useCanvasRenderer.js`, la sonde dev/test `__vibefxVisionQualityProbe`, les cles/defaults/masques pixel/controles UI de saturation selective peau/rouges-oranges/ciel/verts, le masque temperature safe pour neutres/hautes lumieres, le masque halation safe pour limiter les glows rouges sur blancs neutres, le tint global safe qui remplace l'overlay legacy en mode smartphone, le rail `Recommandes image`, les alertes `Profil actif vs image`, les recettes correctives diagnostic, le rail `Comparer favoris`, le signal UI performance du diagnostic, le score anti-voile gris, la detection peau ponderee, les metriques hue-zone ciel/vegetation/rouges-oranges, la mitigation de dosage depuis le diagnostic et le modele canonique `id/name/family/intent/bestFor/avoidFor/strength/parameters/recommendedIntensity/intensityRange/safetyRules/previewTags/technicalNotes/inspirationLabel` genere pour chaque profil, puis confirme que l'UI consomme ces `parameters` normalises et affiche le libelle d'inspiration sans promettre de reproduction constructeur. Il echoue si un profil brut a risque n'a pas de metadonnees explicites `strength`, `bestFor` et `avoidFor`. Le smoke navigateur importe l'asset demo, verifie les miniatures calculees sur l'image courante, le rail de recommandations image avec application/undo, mode simple/expert avec courbe master safe, saturation selective peau/rouges-oranges/ciel/verts, halation/noirs leves/teintes tonales, recherche, filtre famille, favoris persistants localStorage, rail de comparaison rapide Velvia/Astia, applique Velvia, verifie le profil actif, expose l'intention/l'inspiration/garde-fous/notes techniques/dosage conseille du profil, verifie que Velvia applique la saturation normalisee `120` dans les controles experts, verifie le bouton dosage conseille `70%`, verifie l'avertissement hors plage a `100%`, la mitigation diagnostic vers `80%`, la recette `Dose sure` vers `80%` et le retour manuel a `80%`, expose le diagnostic image avec temps/taille source, taille preview cappee, score de voile et zones hue, compare un rendu `low` et `high` hors ecran via la sonde runtime, mesure clipping/saturation/voile/peau/neutres proteges/ciel/verts/rouges-oranges via `visionMetrics.js`, verifie undo/redo sur le profil applique, sauvegarde un profil personnel local nomme, le retrouve par recherche, le supprime et nettoie ses favoris, verifie le split avant/apres reglable, verifie le bouton maintenu avant/apres, verifie une intensite 50 intermediaire, le retour source a intensite 0, teste une fixture synthetique smartphone-like sur Velvia/Ektar/Sepia avec alerte contenu/profil et recette corrective contextuelle, teste une fixture 4200x3200 pour verifier que la preview Vision reste sous 3,05 MP tout en gardant `fullWidth/fullHeight` dans la sonde, teste une fixture metrique delavee pour declencher `greyVeilRisk`, teste une fixture metrique peau claire/medium/foncee, mesure par regions que les saturations selectives ciblent peau/rouges-oranges/ciel/verts sans polluer les neutres ni la peau pour le controle chaud, verifie que la chaleur maximale affecte moins la bande neutre que la zone chaude coloree, verifie que la halation safe affecte moins un blanc speculaire neutre qu'une zone neon coloree, verifie par test moteur extrait que le tint global safe affecte moins un pixel neutre qu'un pixel colore, verifie le mobile sans overflow horizontal et le reset.
- `npm run check:vision-corpus` verifie la presence des 12 fixtures smartphone locales ignorees par Git dans `test-fixtures/vision-corpus`; il reste non bloquant par defaut, devient strict avec `VISION_CORPUS_REQUIRED=1`, et rappelle que Vision ne peut pas etre declaree stable finale tant que le corpus reel est absent/incomplet. `npm run test:vision-corpus` ajoute un smoke Playwright metrique sur les fixtures presentes et passe en skip si le corpus local est vide.
- L'onglet Vision applique les profils via `normalizeVisionFilters` et `buildVisionProfileModel`, et les miniatures comme l'application profil consomment les `vision.parameters` normalises plutot que les anciens `filters` bruts. Il expose des miniatures de profils calculees sur l'image courante, un rail `Recommandes image` classe par metriques source (peau, ciel/verts, basse lumiere, saturation deja haute, image plate, neutres) avec badges de signaux detectes et application directe au dosage conseille, des alertes `Profil actif vs image` quand le profil actif est probablement risqué pour le contenu source, avec bouton `Essayer` vers la meilleure alternative recommandee au dosage conseille, un diagnostic image visible (clipping, saturation forte, zones hue ciel/verts/rouges-oranges, noirs, range tonal P95-P05, score de voile gris, peau via score pondere hue/RGB/YCbCr, neutres proteges, temps de diagnostic, taille source, taille preview cappee et echantillon) avec action de mitigation vers le dosage conseille ou le bord sur de la plage active et bloc `Recettes correctives` qui applique des patches limites pour intensite, chroma, voile gris, hautes lumieres, ombres, peau ou neutres, les badges d'usage/risque/famille, l'intention, le libelle d'inspiration, les garde-fous, les notes techniques, le dosage conseille et la plage de dosage de chaque profil, un bouton d'application du dosage conseille pour le profil actif, un avertissement si l'intensite active sort de la plage conseillee avec bouton de retour au bord sur, un mode simple/createur (chaleur, contraste, peau, grain), un mode expert (lumiere, hautes lumieres, ombres, courbe master 5 points safe, saturation, vibrance, saturation selective peau/rouges-oranges/ciel/verts, clarte, nettete, anti-brume, vignette, grain, noirs leves, halation, teintes et couleurs tonales), recherche de profils, filtre par famille, favoris locaux persistants, rail de comparaison rapide des favoris avec miniatures et dosage conseille, profils personnels locaux nommables/persistants et supprimables en section `Perso`, undo/redo local des reglages Vision, un reset Vision, le profil actif, une intensite globale visible, un split avant/apres reglable sur le canvas et un bouton maintenu `Avant` qui restaure temporairement l'image source sans perdre le dosage courant. Les profils camera-inspired bruts a risque declarent maintenant leur `strength` et leurs cas d'usage/evitement. Le moteur Vision protege les saturations smartphone avec ceiling adaptatif, temperature masquee sur neutres/blancs/ombres, halation masquee sur blancs neutres/speculaires, tint global legacy masque en pixels, saturation selective hue/luma, vibrance protegee, protection tons peau/neutres/hautes lumieres, split toning limite, clamp des courbes/teintes/sepia/blur/hueRotate, garde-fou final anti-crush des ombres couleur et blend linear-light ; la preview interactive studio/Vision est plafonnee a 3 MP sans toucher l'export/import publication pleine resolution, et la preview `low` pendant drag conserve ces protections colorimetriques et ne coupe plus que les effets spatiaux lourds.
- Le playhead Vibe_CUT est saisissable sur toute sa ligne via pointer capture et met a jour immediatement le canvas/audio pendant le scrub, y compris pendant la lecture ; la preview texte utilise aussi pointer capture pour ne pas perdre le drag.
- Le header studio passe les onglets sur une deuxieme rangee pleine largeur en mobile afin que l'onglet Video reste cliquable sans etre recouvert par les actions de droite ou le player musique.
- La bibliotheque musique Vibe_CUT affiche les metadonnees de licence/source White Bat Audio, extrait son catalogue et ses fournisseurs cibles dans `src/features/vibefx-studio/video/data/musicCatalog.js`, documente la strategie premium/free/IA dans `docs/music-sourcing-and-import-plan.md`, garde l'import de nouvelles pistes en import fichier local verifie avec declaration de droits sans scraping externe, et son panneau a ete compacte pour que les boutons d'import restent cliquables sur les hauteurs studio courtes.
- L'onglet `Soundtrack` est ajoute au header studio apres `Library` et ouvre une page full screen sans canvas/sidebar. La feature `src/features/vibefx-studio/soundtrack/` reutilise `/api/music/free-search`, `/api/music/import`, `/api/music/project/import-url`, `/api/music/providers`, `musicCatalog.js`, `musicRights.js` et `audioWaveform.js`; elle separe maintenant une bibliotheque projet Vibe_fx owner-scoped (`users/{uid}/soundtrackTracks/{trackId}` + Storage `users/{uid}/soundtrack/{trackId}/{fileName}`) de l'agregateur provider-first. L'agregateur est l'ecran par defaut, affiche une barre providers et des filtres vraiment separes par fournisseur : Openverse Audio utilise ses propres requetes rapides texte (`music`, `ambient`, `cinematic`, `podcast`, etc.) tandis que Pixabay Music est selectionnable avec les tags publics de sa page Music (`musique gratuite`, `spring`, `motivation`, `corporate`, etc.) via un scan serveur borne. Pixabay reste sans API audio officielle documentee; si la page publique renvoie un challenge/403, l'UI affiche l'indisponibilite, propose d'ouvrir Pixabay et explique les imports fiables par fichier telecharge ou URL directe `cdn.pixabay.com/download/audio/...`, sans injecter de faux resultat. `PixabayImportAssistant.jsx` ajoute un flux assiste sans iframe : ouvrir la categorie officielle, renseigner au besoin la page source, importer le fichier telecharge avec source/licence/categorie Pixabay pre-remplies vers la bibliotheque projet ou locale. `npm run check:pixabay-provider` probe maintenant les pages Pixabay Music depuis Node avec UA applicatif et Chrome pour confirmer ce diagnostic. Les filtres generiques Licence/BPM/genre/mood/duree/pages restent masques et les pistes locales Vibe_CUT ne sont plus fallback de scan. Le bouton `Bibliotheque projet` ouvre une vue bibliotheque en popup large desktop et fullscreen mobile, sans modes `Imports recents`/`A verifier`, avec import fichier local, suppression de pistes, classement par categorie/tags et playlists locales quand Firebase projet n'est pas disponible. La piste selectionnee dans la bibliotheque deploie un panneau waveform pleine largeur avec play/pause, stop, temps courant/duree et curseur de seek branche sur le player Soundtrack. Les imports locaux persistent maintenant leur blob audio dans IndexedDB en plus du manifest, restaurent une URL `blob:` jouable au rechargement, et desactivent la lecture quand un ancien import metadata-only doit etre reimporte. Les imports manuels URL audio directe restent disponibles dans le panneau local. Les favoris/playlists/manifest locaux restent disponibles via IndexedDB + `vibefx-soundtrack.json` et File System Access/fallback download. L'action `Vibe_CUT` transmet un `Blob/File` local ou un blob recupere depuis la piste projet avec manifeste droits.
- Le module Vibe_CUT centralise maintenant l'audit et les manifests de droits musique dans `src/features/vibefx-studio/video/data/musicRights.js`; la bibliotheque musique ouvre par defaut sur l'onglet `Gratuit`, l'import audio passe par des presets de sources verifiees/licenciees/IA manuelle, les cartes sources gratuites/licenciees ouvrent le wizard d'import avec preset et lien officiel deja prets, le wizard peut rechercher Openverse, Jamendo, Freesound, Internet Archive et Wikimedia via `/api/music/free-search`, accepte soit un fichier local soit une URL audio directe via `/api/music/import` allowlistee/cote serveur, precharge l'URL distante pour ecoute avant import timeline, exige source/preuve/licence/usage social avant ajout timeline, supprime le bypass d'upload brut depuis `AudioPanel`, bloque l'export navigateur si le manifeste droits est incomplet, et sauvegarde apres export audio un manifeste droits owner-scoped dans `users/{uid}/rightsManifests/{exportId}` quand Firebase est configure.
- L'export Vibe_CUT borne les volumes media a la plage navigateur valide, desactive le choix MP4 si `MediaRecorder` ne le supporte pas, bascule explicitement vers WebM et affiche les metadonnees de droits/attribution des pistes audio avant export.
- La roadmap timeline/export Vibe_CUT introduit `src/features/vibefx-studio/video/model/timelineModel.js` comme adaptateur canonique `tracks[]`/`items[]`, avec resolver pur `resolveTimelineTransitions` unifiant transitions libres et transitions de coupe en objets `id/type/start/duration/fromItemId/toItemId/trackId/params`, plan de rendu commun `resolveTimelineRenderPlan` consomme par preview/export/scrub playhead/split toolbar, rendu moteur alimente par `allTransitions` unifiees, validation pure `validateTimelineRenderPlan` pour trous/overlaps video, overlap transitions libres, transitions hors bornes et audio hors timeline, moteur `PlaybackEngine` capable de selectionner les clips via `start/duration` resolus avec fallback legacy et de remonter les echecs decode/chargement media, rendu des lanes video/transitions/filtres/textes/audio integre/musique depuis `items[]` avec volumes canonises via `clampVolumePercent`, filtres clips exposes comme items `effect-main` de type `effect` et lane Filtres compacte verrouillable sans changer le rendu existant, transitions de coupe et transitions libres presentes dans `items[]` avec `params.placement` et `params.editable`, lane Effets limitee aux transitions libres editables et sans chevauchement via `findTransitionItemOverlap`, panneaux Transitions/Audio/Texte/Filtres/Vitesse relus sur l'etat `tracks` pour desactiver les controles des pistes verrouillees, routeur store `updateTimelineItem`, `updateClip`, `add/remove/updateAudioTrack`, `add/remove/updateTextOverlay`, `setTransition`, `add/update/removeTransitionItem` avec refus si la piste cible est verrouillee, validation export fps/duree/audio/codec, helper pur `buildExportFrameSchedule` pour figer `duration/fps -> totalFrames/frameDuration`, helper pur `validateExportFrameCoverage` pour verifier qu'une transition a au moins une frame planifiee au FPS export, helpers purs de snap magnetique, extraction waveform audio client dans `utils/audioWaveform.js`, transactions undo/redo pour edits timeline, selection audio timeline, rendu export par `seekAndDraw` async avec arret sur nombre de frames planifie, erreur lisible si une frame video attendue ne rend aucun clip et conservation de l'erreur sans telechargement partiel sur echec MediaRecorder/rendu, resume export affichant format demande et format reel apres fallback MP4/WebM, grain/glitch/pixel-scatter deterministes par timestamp, overlay safe areas verticales dans la preview, inputs timecode trim in/out pour le clip selectionne et start/duree pour transitions/textes/audio, controles lock/mute/visible sur les pistes, application des pistes mute/visible a la preview/export, indicateur de drop reorder, waveform timeline deterministe/reelle sur pistes musique importees, toolbar mobile avec export sticky, panneau mobile compact moins couvrant et mode plein ecran explicite, et smoke video renforce sur safe areas/timecode/timestamp de transition/timecode item/verrou pistes Effets/Filtres/etats de pistes/snap/drop/waveform/undo trim/echec export sans blob partiel/plan de frames/fallback MP4 vers WebM/mobile petite hauteur.
- Les dernieres passes Vibe_CUT renforcent encore l'export et la preview : mix audio export cree desormais un flux audio si les clips video sont audibles meme sans piste musique externe, resume export affiche `Audio export` et `Controle frames`, garde-fou de frames noires consecutives bloque les exports qui rendraient une video active en noir, `PlaybackEngine` consomme les transitions de coupe canoniques `allTransitions` pour preview/export/audio avec fallback legacy, les waveforms des clips video sont extraites best-effort a l'import avec fallback explicite, et le panneau Filtres propose un mode preview Avant/Apres qui neutralise les filtres uniquement dans la preview et se reinitialise a la fermeture/changement de panneau.
- `docs/production-ai-monetization-security-megaprompt.md` cadre la suite production : scouting fournisseurs IA globaux (US/EU/Chine/Asie/open-weight/aggregateurs/marketplaces), modele credits, Stripe Checkout/webhooks, dashboard utilisateur, securite anti-abus, Cloud Run/FFmpeg, model router et roadmap par lots.
- `docs/production-saas-audit.md` formalise la passe 0 du megaprompt production : etat Auth/Firestore/Storage/Functions, surfaces privees/noindex, schemas Firestore/Storage proposes, rules cible, mapping Stripe, `aiPricingPolicies`, router IA v1, registry providers avec statuts prudents, risque Midjourney/scraper et plan de tests emulateurs/Stripe CLI.
- Les pages SEO publiques prioritaires sont creees en Server Components via `src/app/components/SeoLandingPage.jsx` et `src/app/seo-pages.js`, avec canonical/metadata/JSON-LD et presence dans `sitemap.xml` sans importer le bundle studio.
- Lot 1 est amorce avec `/account` : Auth anonyme de test, liaison Google/email, profil `users/{uid}` minimal, lecture dashboard de `creditBalance`, `payments` et `aiJobs`, suppression compte via reauth client Google/email puis callable serveur `requestAccountDeletion` avec authentification recente obligatoire (purge Storage `users/{uid}/`, suppression publications owner, scrub jobs/checkouts, tombstone user, delete Auth), sans ecriture client sur credits, ledger, payments ou jobs.
- Lot 2 est amorce cote serveur avec `functions/src/billingProducts.js` pour le mapping `priceId -> entitlement`, `functions/src/billingSession.js` pour valider priceId/metadonnees Checkout, `functions/src/billingEvents.js` pour gerer `checkout.session.completed`, `async_payment_succeeded`, `async_payment_failed` et `expired`, `functions/src/billing.js` pour Checkout/webhook, et `/account/billing` pour lancer un achat depuis un compte permanent puis afficher paiements et sessions Checkout. Le webhook marque aussi `checkoutSessions/{id}` en `fulfilled` ou `expired/failed` pour garder le dashboard coherent. `npm run test:billing-ledger` verifie le fulfillment premium/credits, le replay `event.id`, le replay d'une deuxieme event sur la meme session, le statut `checkoutSessions` succes/echec, et le marquage expired sans emulateur.
- Lot 3 est amorce cote serveur avec `createAiJob` : Auth obligatoire, App Check enforce par defaut hors emulateurs, policy serveur `aiPricingPolicies` ou bootstrap mock local, calcul cout/marge par policy (`estimatedProviderCostUsd`, buffers, `targetGrossMargin`, `minCreditsForTargetMargin`) avec blocage automatique sous seuil, registry providers IA global (`OpenAI`, `Anthropic`, `Gemini`, `Groq`, Chine/Asie, aggregateurs, marketplaces) tous `productionAllowed=false` tant que non verifies, router provider/model avec `routeCandidates` et score pondere `quality 0.35 + margin 0.25 + latency 0.15 + reliability 0.15 + legalSafety 0.10`, audit de selection persiste dans `aiJobs.routeAudit` (`routeScores`, `rejectedCandidates`, pricing/marge), reserve credits en transaction, ledger `reserve/capture/release`, rate limit par uid/feature/ipHash/minute, stockage de `requestIpHash` sans IP brute, provider mock sans appel externe, blocage production du mock, reconciliation planifiee `reconcileStaleAiReservations` toutes les 15 minutes pour liberer les reservations IA perimees, et journalisation serveur `securityEvents` des refus IA sensibles sans prompt brut. `/account/usage` expose un formulaire de lancement qui appelle le callable serveur et relit l'historique `aiJobs`; `npm run test:ai-gateway` couvre aussi l'economie des policies, le scoring/fallback multi-candidats, le rejet Midjourney et la normalisation IP, et `npm run test:ai-ledger` couvre reserve/capture/release, double appel, audit route, credit insuffisant, rate limit uid/feature/ipHash, liberation de reservation perimee et redaction des security events sans emulateur.
- Les callables Meta, Stripe Checkout et IA partagent `functions/src/appCheck.js` : App Check est actif par defaut en production, desactivable seulement par `ENFORCE_*_APP_CHECK=false` pour une session locale controlee; `npm run test:app-check` et `npm run test:scope` verrouillent ce comportement.
- `firestore.rules` interdit les ecritures client sur `users/{uid}/creditLedger`, `aiJobs`, `aiRateLimits`, `payments`, `checkoutSessions`, `accountDeletionRequests`, `stripeEvents`, `aiPricingPolicies`, `aiProviderPriceSnapshots`, `providerRegistry` et `securityEvents`; il autorise aussi les metadata owner-scoped `users/{uid}/soundtrackTracks/{trackId}` avec champs allowlistes. `storage.rules` ajoute uploads prives images/audio/video, fichiers projet Soundtrack `users/{uid}/soundtrack/...` limites aux MIME audio et bloque les outputs IA/export en ecriture client.
- La landing page unique `/` est optimisée pour le Server-Side Rendering (SSR) et regroupe le hero produit, 4 cartes de fonctionnalités descriptives, une section FAQ complète, et l'animation SVG de routage `PublicationRoutePipeline`.
- Les CSS lourds de `vibefx-layout` et `publications` sont importes par `src/app/studio/layout.js`, pas par le layout racine, afin d'eviter de charger le studio sur les pages publiques.
- Les actions Meta/OAuth cote client sont neutralisees quand Firebase Functions n'est pas initialise.
- La publication Meta manuelle cote Functions exige un admin via `ADMIN_EMAILS`, custom claim `admin`, ou document `admins/{email}` actif ; aucun email admin n'est hardcode.
- Le callback OAuth Meta reserve le state en transaction (`processing`) avant les appels Graph API pour eviter le rejeu concurrent, puis le marque `failed` en cas d'erreur.
- La publication OAuth connectee refuse un token Meta expire, marque la connexion `expired` et demande une reconnexion.
- Les Functions Meta refusent une synchronisation sans plateforme selectionnee.
- Le prompt maitre demande explicitement de reprendre comme base la logique publication/Firebase deja travaillee dans le projet source : moteur layout, `PublicationsManager.jsx`, Functions Meta/OAuth, verrous, statuts et rules Firestore/Storage.
- Reste a poursuivre avec configuration externe : test E2E navigateur complet du parcours studio, ecriture Firestore/Storage reelle et OAuth Meta.
