# map.md - Carte vivante Vibe_fx V2

Derniere mise a jour : 2026-05-19

## Regle

Mettre a jour ce fichier a chaque creation, suppression, renommage, deplacement ou modification structurelle.

## Arbre actuel

```text
.
|-- .github/
|   `-- workflows/
|       `-- verify.yml                  # CI GitHub Actions : verify local + emulateurs + smoke routes/UI + sauvegarde studio emulateurs
|-- .agents/
|   `-- skills/                         # 23 skills design importes depuis refero-design-skills
|       |-- clean-saas/
|       |-- cyber-neon/                 # Direction visuelle marque / pages publiques
|       |-- dark-ui/                    # Direction visuelle surfaces produit
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
|   `-- completion-audit.md             # Audit prompt -> artefacts + blocages externes
|-- functions/
|   |-- index.js                        # Perimetre Meta/OAuth/publication Vibe_fx V2
|   |-- package.json                    # Firebase Functions Node 20
|   `-- package-lock.json
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
|   |   |   |   `-- server.js           # Adaptateur serveur Next pour bibliotheque/scraper Midjourney
|   |   |   |-- catalog/
|   |   |   |   |-- [jobId]/
|   |   |   |   |   `-- route.js         # Suppression d'un item catalogue
|   |   |   |   `-- route.js            # Catalogue pagine et filtres
|   |   |   |-- image/
|   |   |   |   `-- [...path]/
|   |   |   |       `-- route.js        # Lecture image locale issue du scraper
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
|   |   |   `-- PublicationRoutePipeline.jsx # Pipeline SVG animé partagé
|   |   |-- studio/
|   |   |   |-- layout.js               # CSS lourds du studio scopes a /studio
|   |   |   |-- page.js                 # Page studio noindex
|   |   |   `-- StudioClient.jsx        # Client wrapper du studio
|   |   |-- favicon.ico
|   |   |-- globals.css                 # Base CSS + direction cyber/dark + page d'accueil
|   |   |-- layout.js                   # Metadata racine + imports CSS globaux
|   |   |-- page.js                     # Unique page d'accueil SSR optimisée (FAQ + Pipeline + Launch)
|   |   |-- robots.js                   # Robots Next.js
|   |   `-- sitemap.js                  # Sitemap Next.js pour page d'accueil uniquement
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
|   |   |-- components/                 # Header, tabs Studio/Fusion/Layout/Library/Vision/Video et panneaux source Vibe_fx
|   |   |-- data/                       # Constantes, presets et donnees UI importees
|   |   |-- engine/                     # Rendu canvas/physics importes depuis Vibe_fx
|   |   |-- hooks/                      # Hooks interaction, renderer, bibliotheque et assets
|   |   |-- utils/                      # Utilitaires canvas/image
|   |   |-- video/                      # Module Vibe_CUT importe
|   |   |-- index.js
|   |   |-- VibeFxStudio.jsx            # Shell studio Vibe_fx + import publication V2
|   |   `-- VideoApp.jsx               # Surface video sans react-router
|   `-- lib/
|       `-- firebase.js                 # Client Firebase NEXT_PUBLIC_*
|-- .env.example                        # Variables publiques + secrets a creer
|-- .env.emulators.example              # Variables demo pour brancher le client aux emulateurs
|-- .gitignore
|-- AGENTS.md                           # Regles agents du projet
|-- apphosting.yaml                     # Base Firebase App Hosting
|-- CLAUDE.md                           # Fichier genere, non encore enrichi
|-- eslint.config.mjs
|-- firebase.json                       # Config Firebase backend + emulateurs, sans Hosting classique
|-- firestore.indexes.json
|-- firestore.rules                     # Rules ownerUid + index publications
|-- jsconfig.json
|-- MEGAPROMPT.md                       # Prompt maitre de conception/deploiement
|-- next.config.mjs
|-- package.json                        # Next.js + Firebase + lucide + three
|-- package-lock.json
|-- README.md
|-- seo.md                              # Agent SEO Google
|-- skills-lock.json                    # Lock des 23 skills importes
|-- scripts/
|   |-- audit-secrets.mjs               # Audit anti-secrets hardcodes dans les fichiers versionnables
|   |-- audit-scope.mjs                 # Audit automatique scope Functions, SEO, modules et termes source
|   |-- check-deploy-target.mjs         # Refuse un deploiement sans projet Firebase dedie
|   |-- check-e2e-readiness.mjs         # Liste les prerequis Firebase/Meta manquants avant E2E reel
|   |-- check-emulator-readiness.mjs    # Verifie firebase-tools, Java 21+ et config emulators
|   |-- firebase-deploy.mjs             # Wrapper cross-platform deploy backend/functions avec cible controlee
|   |-- smoke-firebase-emulators.mjs    # Smoke test Auth/Firestore/Storage rules sous emulateurs
|   |-- smoke-publication-flow.mjs      # Smoke test rejouable du parcours publication sans Firebase reel
|   |-- smoke-routes.mjs                # Smoke test HTTP des routes SEO/studio
|   |-- smoke-studio-emulator-ui.mjs    # Smoke test navigateur studio + sauvegarde Firestore/Storage emulateurs
|   |-- smoke-studio-ui.spec.cjs        # Smoke test Playwright du flux studio -> import publication
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
`-- storage.rules                       # Rules Storage user-scoped
```

## Pages actuelles

- `/` : page d'accueil SSR unique avec hero cyber-neon/dark-ui, CTA `Launch app`, cartes de caractéristiques descriptives, FAQ complète, et pipeline de routage SVG animé (PublicationRoutePipeline).
- `/studio` : entree noindex vers le studio Vibe_fx importe.
- `/api/themes`, `/api/catalog`, `/api/status`, `/api/scrape`, `/api/image/*`, `/api/proxy-image`, `/api/reclassify/*`, `/api/reset` : API internes pour la bibliotheque Midjourney et son scraping local.
- `/robots.txt` : genere par `src/app/robots.js`.
- `/sitemap.xml` : genere par `src/app/sitemap.js`.

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
- Le smoke Playwright du studio a ete rejoue manuellement contre un serveur Next deja lance : `/studio` ouvre la mise en page et les onglets Studio/Fusion/Layout/Library/Vision/Video repondent.
- `npm run test:studio-ui` reste a reviser pour le nouveau shell `vibefx-studio`, car l'ancien scenario visait la demo `vibefx-layout`.
- `npm run test:scope` verifie automatiquement le perimetre Functions, l'absence de termes source, les pages SEO, les modules extraits et les rules multi-utilisateur.
- `npm run audit:secrets` bloque les signatures courantes de cles Firebase, tokens Meta, private keys et valeurs sensibles Meta hardcodees.
- `npm run check:e2e-readiness` formalise les variables/secrets manquants avant le test E2E Firebase/Meta reel.
- `npm run verify:local` rejoue les controles locaux principaux : lint, scope, audit secrets, parcours publication, build, lint Functions et audit dependances.
- `npm run emulators` lance les emulateurs Firebase locaux ; `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` connecte le client aux ports locaux.
- `npm run check:emulator-readiness` verifie les prerequis CLI/Java/config avant de lancer les emulateurs.
- `npm run test:emulators` a ete valide avec Java 21 et verifie Auth/Firestore/Storage rules sous emulateurs.
- `npm run test:studio-emulators` a ete valide avec Java 21 et verifie en navigateur `/studio` -> demo -> import -> sauvegarde brouillon contre Auth/Firestore/Storage/Functions emulateurs.
- `.github/workflows/verify.yml` rejoue les controles principaux sur push/PR, teste les routes, le smoke UI studio contre `next start`, puis la sauvegarde brouillon studio contre les emulateurs Firebase.
- `functions/index.js` a ete reduit au perimetre Meta/OAuth/publication : les anciennes fonctions hors produit Vibe_fx V2 et donnees d'identite source ont ete supprimees.
- Les references d'identite source ont ete neutralisees dans les surfaces Vibe_fx auditees.
- `PublicationsManager.jsx` est reduit a l'orchestration layout/publication : `PublicationComposer`, `PublicationDashboard`, `PublicationPreview`, `MetaOAuthPanel`, `PublicationList` et les helpers publication sont extraits. L'ancien manager legacy, son editeur interne et le moteur canvas mort ont ete supprimes.
- Les publications studio sont chargees par `ownerUid`, les nouveaux uploads passent par `users/{uid}/publications/...`, et `firestore.rules`/`storage.rules` protegent l'ownership et bloquent l'ancien chemin Storage `/publications` en ecriture.
- Le studio initialise une session Firebase Auth anonyme quand Auth est disponible afin que les brouillons aient toujours un `ownerUid`.
- Apres sauvegarde, le manager publications met a jour la liste locale sans attendre un rechargement manuel Firestore.
- `VibeFxLayout` exporte vers publication un payload structure avec `blob`, `socialImages`, `format`, `template` et `settings`.
- `VibeFxStudio` remplace l'entree de mise en page dans `PublicationsManager.jsx` et porte les onglets Studio/Fusion/Layout/Library/Vision/Video importes depuis `C:\Users\matth\Travail\Vibe_fx`, avec export publication V2 conserve.
- La bibliotheque est cablee via routes API Next et scripts `scripts/midjourney-scraper/` ; aucune image source n'a ete importee, le catalogue local demarre vide et se remplit par scraping.
- Le module video Vibe_CUT, ses pistes `public/music/` et ses dependances audio/state ont ete portes ; la navigation React Router source a ete remplacee par l'etat d'onglet interne du studio, et les composants studio/video sont declares en client components pour eviter les bailouts SSR.
- Le module video Vibe_CUT accepte les imports lourds en ajoutant les clips immediatement puis en extrayant les thumbnails en arriere-plan ; les filtres colorimetriques sont appliques au rendu canvas, les textes restent visibles en lecture/export, les pistes musique locales `public/music/` sont importables/lisibles, les clips video se reordonnent par drag/drop pointer dans la timeline, une timeline `Effets` separee entre video et texte permet de placer/deplacer/redimensionner des transitions librement sans les melanger aux clips video, et l'export navigateur utilise un canvas dedie a la resolution du preset avec mix audio vers WebM/MP4 si supporte via `MediaRecorder`.
- `npm run test:video-ui` lance `scripts/smoke-video-ui.spec.cjs` contre `/studio` et saute proprement si les fixtures locales `videotest/*.mp4` ne sont pas presentes ; le smoke couvre import de deux videos courtes, reorder, trim par poignee, split/coupe, vitesse 2x, filtre Cyberpunk, transition Flash sur timeline `Effets` avec verification de luminance canvas, deplacement de l'item transition, texte intro, musique locale, volumes clip/musique, export WebM telecharge et viewport mobile sans overflow.
- La landing page unique `/` est optimisée pour le Server-Side Rendering (SSR) et regroupe le hero produit, 4 cartes de fonctionnalités descriptives, une section FAQ complète, et l'animation SVG de routage `PublicationRoutePipeline`.
- Les CSS lourds de `vibefx-layout` et `publications` sont importes par `src/app/studio/layout.js`, pas par le layout racine, afin d'eviter de charger le studio sur les pages publiques.
- Les actions Meta/OAuth cote client sont neutralisees quand Firebase Functions n'est pas initialise.
- La publication Meta manuelle cote Functions exige un admin via `ADMIN_EMAILS`, custom claim `admin`, ou document `admins/{email}` actif ; aucun email admin n'est hardcode.
- Le callback OAuth Meta reserve le state en transaction (`processing`) avant les appels Graph API pour eviter le rejeu concurrent, puis le marque `failed` en cas d'erreur.
- La publication OAuth connectee refuse un token Meta expire, marque la connexion `expired` et demande une reconnexion.
- Les Functions Meta refusent une synchronisation sans plateforme selectionnee.
- Le prompt maitre demande explicitement de reprendre comme base la logique publication/Firebase deja travaillee dans le projet source : moteur layout, `PublicationsManager.jsx`, Functions Meta/OAuth, verrous, statuts et rules Firestore/Storage.
- Reste a poursuivre avec configuration externe : test E2E navigateur complet du parcours studio, ecriture Firestore/Storage reelle et OAuth Meta.
