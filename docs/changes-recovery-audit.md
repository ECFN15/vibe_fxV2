# Audit reprise changes interrompus

## Resume executif

Le worktree contient un chantier coherent autour de quatre axes : rail IA studio, onglet Soundtrack local-first, stabilisation Vibe_CUT, et enrichissement Publications/dashboard. Les blockers fonctionnels detectes pendant l'audit ont ete corriges : import manquant Soundtrack, perte des `localObjectUrl`/`File` en memoire lors des commits Soundtrack, disparition de l'onglet Credits, et liens `/account`/billing retires des pages publiques.

Le scraper Midjourney a produit un volume important d'assets locaux non suivis : 241 `.webp` pour environ 230 MB. Deux `.webp` versionnes sont supprimes alors que `catalog.json` reference encore leur `jobId` via l'URL Midjourney distante. `.firebase/logs/vsce-debug.log` est un log Firebase/VSCode modifie avec espaces finaux et informations locales ; il doit rester classe comme fichier genere a confirmer, pas comme code produit.

## Inventaire Git

- Commandes executees pendant l'audit initial : `git status --short`, `git diff --stat`, `git diff --name-status`, `git ls-files --others --exclude-standard`, `git diff --check`.
- Stat global : 36 fichiers suivis modifies/supprimes, environ 3479 insertions et 323 suppressions dans `git diff --stat`, plus nouveaux dossiers/fichiers non suivis.
- `git diff --check` echoue toujours uniquement sur `.firebase/logs/vsce-debug.log` avec trailing whitespace vers les lignes 7666+ ; ce fichier reste classe genere/volatile et n'a pas ete nettoye sans confirmation.
- Untracked principaux : `docs/changes-recovery-audit-megaprompt.md`, `docs/soundtrack-local-playlist-megaprompt.md`, `.agents/skills/design.md/skill.md`, `scripts/smoke-studio-ai-rail.spec.cjs`, `scripts/smoke-soundtrack-ui.spec.cjs`, `scripts/smoke-video-store.mjs`, `src/features/vibefx-studio/ai/`, `src/features/vibefx-studio/components/ai/`, `src/features/vibefx-studio/soundtrack/`, nombreux `.webp` scraper.

## Lots de changements

| Lot | Fichiers | Intention probable | Risques | Tests | Statut |
| --- | --- | --- | --- | --- | --- |
| Documentation et prompts | `map.md`, `docs/studio-ai-agents-megaprompt.md`, `docs/changes-recovery-audit-megaprompt.md`, `docs/soundtrack-local-playlist-megaprompt.md`, `docs/soundtrack-v2-library-pixabay-megaprompt.md`, `.agents/skills/design.md/skill.md` | Documenter audit, rail IA, Soundtrack et design cockpit | Encodage visible corrompu dans le skill design ; prompt Soundtrack V2 change l'hypothese local-first et doit etre traite comme nouvelle roadmap, pas comme implementation faite | lecture manuelle, `test:scope` | a garder/a confirmer |
| Config/scripts/tests | `package.json`, `scripts/smoke-studio-ai-rail.spec.cjs`, `scripts/smoke-soundtrack-ui.spec.cjs`, `scripts/smoke-video-store.mjs`, `scripts/smoke-video-timeline-model.mjs`, `scripts/smoke-video-ui.spec.cjs` | Ajouter smokes IA/Soundtrack/store et renforcer Vibe_CUT | Tests Playwright plus longs ; dependance a serveur Next ; smoke Soundtrack expose bug runtime actuel | `npm run test:*` restants | a garder |
| Studio shell/header/routing | `src/app/studio/page.js`, `StudioClient.jsx`, `layout.js`, `VibeFxStudio.jsx`, `Header.jsx`, `VideoApp.jsx` | Deep-link `/studio?workspace=layout`, rail IA, Soundtrack full page, header mobile sur 2 lignes | Credits a ete restaure ; prop IA passee a `VideoApp` reste geree localement ; URLs object audio non revoquees apres envoi Soundtrack->Video | `test:studio-ui`, `test:soundtrack-ui`, `test:video-ui` | a garder/a finir object URLs |
| Publications | `PublicationsManager.jsx`, `PublicationComposer.jsx`, `PublicationDashboard.jsx`, `publicationHelpers.js`, `publications.css` | Dashboard compte/credits/payments/aiJobs et caption IA vers publication | CTA publiques `/account` restaurees ; verifier en E2E reel Firebase/Meta avant prod | `test:publication-flow`, tests billing/ai | a garder |
| Agents IA studio | `src/features/vibefx-studio/ai/*`, `src/features/vibefx-studio/components/ai/*`, `studio-ai.css` | Rail IA contextuel qui appelle uniquement `createAiJob` | `useStudioAiState` fige runtime auth par `useMemo([])` ; actions image/video production bloquees ; boutons avec `disabledReason` non disabled mais validation bloque | `test:studio-ui`, `test:ai-gateway`, `test:ai-ledger` | a finir |
| Soundtrack local-first | `src/features/vibefx-studio/soundtrack/*`, `soundtrack.css` | Recherche musique, favoris/playlists IndexedDB, dossier local, manifest JSON, envoi Blob/File vers Vibe_CUT | Import manquant et perte `localObjectUrl`/`file` corriges ; verifier cycle de vie complet des object URLs ; droits incomplets doivent bloquer export | `test:soundtrack-ui`, `test:video-ui` | a garder/a finir object URLs |
| Vibe_CUT video/timeline/export | `VideoEditor.jsx`, `VideoEngine.js`, `timelineModel.js`, `videoStore.js`, `Timeline.jsx`, `TrackItem.jsx`, `ExportVideoPanel.jsx`, `FilterVideoPanel.jsx`, `VideoToolbar.jsx`, `VideoPreview.jsx`, `Playhead.jsx` | Modele canonique `tracks[]/items[]`, transitions de coupe, pistes Filtres/Audio, locks, preflight export, guard frames noires | Large surface ; verifier lint/build ; indentation suspecte mais syntaxe probablement valide ; export bloque si codecs/audio contexts absents | `test:video-ui`, `smoke-video-store`, `smoke-video-timeline-model` | a garder/verifier |
| Scraper/catalogue/assets | `scripts/midjourney-scraper/catalog.json`, `data/catalog.db`, `data/catalog.db-wal`, suppressions `.webp`, untracked `.webp` | Session scraper/catalogue locale | 230 MB d'assets ; WAL volatile ; droits/licences Midjourney a confirmer ; `.gitignore` ne couvre pas ces sorties | classification manuelle | a confirmer |
| Logs/generes | `.firebase/logs/vsce-debug.log`, `data/catalog.db-shm` local | Logs/emulator/plugin et WAL/SHM SQLite | `diff --check` echoue ; log peut contenir email/token refresh metadata | aucun | a ignorer/supprimer seulement apres confirmation |

## Fichiers a garder

- Rail IA : `src/features/vibefx-studio/ai/`, `src/features/vibefx-studio/components/ai/`, `src/app/studio/layout.js` pour `studio-ai.css`, `scripts/smoke-studio-ai-rail.spec.cjs`.
- Soundtrack : `src/features/vibefx-studio/soundtrack/`, `docs/soundtrack-local-playlist-megaprompt.md`, `scripts/smoke-soundtrack-ui.spec.cjs`, apres correction des blockers.
- Vibe_CUT : modifications du modele/store/engine/timeline/export et tests purs/Playwright, sous reserve des gates.
- Publications : enrichissement dashboard/caption IA et `initialMode`.
- Documentation : `docs/changes-recovery-audit-megaprompt.md`, `docs/soundtrack-v2-library-pixabay-megaprompt.md` et ce rapport, ajoutes/classes dans `map.md`.

## Fichiers a corriger

- `src/features/vibefx-studio/soundtrack/hooks/useLocalSoundtrackLibrary.js` : corrige.
- `src/features/vibefx-studio/components/Header.jsx` et `VibeFxStudio.jsx` : Credits restaure tout en gardant Soundtrack.
- `src/features/vibefx-studio/components/panels/CreditsPanel.jsx`, `src/app/page.js`, `src/app/pricing/page.js` : liens `/account`, `/account/billing`, `/account/usage` restaures.
- `map.md` : rapport, prompt Soundtrack V2 et skill local classes.
- `.firebase/logs/vsce-debug.log` : ne pas corriger comme code ; classer comme genere/volatile avant decision.

## Fichiers a finir

- `src/features/vibefx-studio/ai/studioAiState.js` : rendre le runtime auth/functions reactif si un test de connexion reelle confirme un probleme apres sign-in.
- `src/features/vibefx-studio/components/ai/AiActionCard.jsx` : rendre les actions vraiment disabled quand `disabledReason` existe, ou conserver la validation actuelle mais clarifier l'UX.
- `src/features/vibefx-studio/VibeFxStudio.jsx` : revoir le cycle de vie des object URLs creees par Soundtrack->Video.
- `src/features/vibefx-studio/video/panels/ExportVideoPanel.jsx` : lint/build et smoke video OK ; garder un E2E navigateur reel avant prod.

## Fichiers generes / a ignorer / a confirmer

- `.firebase/logs/vsce-debug.log` : log Firebase VSCode/Data Connect, genere, cause `git diff --check`; a ignorer ou supprimer seulement apres confirmation.
- `scripts/midjourney-scraper/data/catalog.db-wal` et `catalog.db-shm` : fichiers SQLite de session ; ne devraient probablement pas etre versionnes. `catalog.db` est reference par les scripts mais sa politique de versionnement doit etre confirmee.
- `scripts/midjourney-scraper/downloads/**/*.webp` : 241 fichiers, environ 230 MB ; probablement assets scraper locaux, a classer avant commit.
- Deux `.webp` suivis supprimes avec `jobId ca2517b2-f8e8-4343-95af-e66fa33b6ffc`; `catalog.json` reference encore ce job par URL distante mais pas par chemin local explicite.

## Risques critiques

- Build/lint ne bloque plus : `normalizeSoundtrackManifest` importe.
- Soundtrack conserve maintenant les champs runtime `localObjectUrl`, `file`, `fileAvailable`, `waveform` en memoire.
- Navigation SaaS : Credits/account/billing restaures.
- Les gros assets scraper et WAL/logs peuvent polluer le commit et exposer des donnees locales.
- Les smokes Playwright exigent un serveur Next stable et peuvent echouer si le header/rail double `data-testid=studio-ai-toggle` en mode video cree de l'ambiguite.

## Plan de reprise par ordre

1. Corriger les blockers Soundtrack detectes par lecture. Fait.
2. Reintroduire proprement Credits/account/billing dans la navigation sans retirer Soundtrack. Fait.
3. Mettre `map.md` a jour pour le rapport, le skill design et l'architecture finale. Fait.
4. Lancer lint/tests ciblés, puis gates complets demandes. Fait, sauf `git diff --check` volontairement laisse en echec sur log genere.
5. Classer les fichiers scraper/logs avec decision explicite ; ne rien supprimer sans confirmation. Fait dans ce rapport, decision utilisateur requise pour suppression/ignore.

## Tests executes

- `git status --short`
- `git diff --stat`
- `git diff --name-status`
- `git ls-files --others --exclude-standard`
- `git diff --check` : echec attendu sur `.firebase/logs/vsce-debug.log` trailing whitespace.
- Lectures/diffs manuels des fichiers et docs listes par le prompt.
- Recherches `rg` sur TODO/logs/secrets/references et inventaire tailles scraper.
- `npm run lint` : OK, 17 warnings existants, 0 erreur.
- `npm run test:scope` : OK apres neutralisation des marqueurs source interdits dans `docs/changes-recovery-audit-megaprompt.md`.
- `npm run audit:secrets` : OK.
- `npm run test:publication-flow` : OK.
- `npm run test:video-ui` : OK, 8 Playwright + model/store purs.
- `npm run test:soundtrack-ui` : OK, 6 Playwright.
- `npm run test:studio-ui` : OK, 8 Playwright.
- `npm run build` : OK. Note : le build logge `Database already has 150 images, skipping migration.` pendant la collecte de pages, preuve du couplage routes API scraper/base SQLite.
- `npm --prefix functions run lint` : OK.
- `npm run test:account-deletion` : OK.
- `npm run test:billing-products` : OK.
- `npm run test:billing-ledger` : OK.
- `npm run test:ai-gateway` : OK.
- `npm run test:ai-ledger` : OK.
- `npm run test:app-check` : OK.
- `npm run test:routes` : OK.

## Tests restants

- Aucun gate demande ne reste non execute.
- `git diff --check` reste en echec sur `.firebase/logs/vsce-debug.log`; ne pas corriger/committer ce log sans decision explicite.
- Restent hors scope local : E2E reel Firebase/Meta/Stripe/providers IA avec secrets de production/staging.
