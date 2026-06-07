# Vibe_CUT Export Pro - Checkpoint 2026-06-06

Ce checkpoint est le point de reprise pour continuer le chantier Export Pro demain sans repartir de zero. Il resume les changements actuellement dans le worktree, les preuves locales executees, les limites restantes et les tests Cloud Run a faire avant de parler de release beta.

## Verdict court

- Statut global : `pre-release hardening`.
- Export final Cloud Run live : pas reteste dans cette conversation.
- Export final local FFmpeg : teste et valide sur K1 + fixtures pro + contrat renderer local.
- UI Export Pro : fortement amelioree, avec panneau pro, queue locale, destination PC/download, progression, preflight et metadata output.
- Renderer serveur actuel : solide pour MP4 H.264/AAC, mais pas encore un renderer frame-by-frame complet.
- Formats avances : modelises et visibles dans l'UI avec statuts, mais bloques proprement s'ils ne sont pas rendus par le pipeline final.
- Backoffice couts : dashboard UI en place avec estimation interne Cloud Run/Storage; il ne lit pas encore la facture officielle Google Cloud.
- Gate release : bloque volontairement par Java 21+ absent, smoke live K1 non execute, MP4 Cloud Run finaux non verifies, deploys non executes.

## Reponse claire a la question "export final teste ?"

Non, l'export final Cloud Run deploye n'a pas ete lance ici.

Ce qui a ete teste :

- MP4 local K1 avec FFmpeg : 1080x1920, H.264, 30 FPS, 5.5s, audio present, frames non noires.
- MP4 locaux des fixtures pro supportees : texte statique, crossfade, colorimetrie, audio externe, pile combinee.
- Contrat renderer local en important `buildFfmpegArgs` depuis `render-service/src/server.js`.
- Gate de parite client / Functions / renderer sur 12 cas de couverture.
- Panneau et smoke Playwright Vibe_CUT existants.

Ce qui reste a prouver :

- Upload Storage reel des sources depuis UI production.
- Callable Functions live qui cree/enqueue le job.
- Cloud Run live qui rend le MP4 final a partir du manifest stocke.
- Output Storage reel.
- Download final desktop/PC depuis le job `ready`.
- Verification locale du MP4 Cloud telecharge avec `npm run verify:vibecut-k1-cloud-output`.
- Backoffice lisant les jobs live et affichant couts/temps/output issus des jobs reels.

## Documents source a garder en racine `docs/`

Ces fichiers sont actifs et/ou lus par les scripts :

- `docs/vibecut-export-production-hardening-megaprompt.md` : source de verite du chantier Export Pro renderer-first.
- `docs/vibecut-export-hardening-status-2026-06-06.md` : statut phase par phase et gates restants.
- `docs/vibecut-export-production-runbook-2026-06-06.md` : runbook deploy, secrets, Cloud Run, smoke K1 et verification.
- `docs/vibecut-export-pro-checkpoint-2026-06-06.md` : ce checkpoint de reprise.

Les anciennes docs Export Pro historiques ont ete deplacees dans `docs/archive/export-pro-legacy/` pour reduire le bruit sans les perdre.

## Changements principaux par zone

### App Hosting

Fichier modifie :

- `apphosting.yaml`

Changement important :

- Ajout de `NEXT_PUBLIC_VIBECUT_EXPORT_MODE=firebase` pour que l'UI Export Pro cible Firebase/App Hosting au lieu de rester implicitement en mock local.

Impact :

- En production App Hosting, le panneau Export Pro utilise le mode Firebase comme mode attendu.
- En local/dev, `resolveExportRenderMode()` garde un fallback `localMock` si l'env n'est pas configuree.

### Front Vibe_CUT Export

Fichiers modifies :

- `src/features/vibefx-studio/video/panels/ExportVideoPanel.jsx`
- `src/features/vibefx-studio/video/export/exportManifest.js`
- `src/features/vibefx-studio/video/export/exportJobService.js`
- `src/features/vibefx-studio/video/export/exportRenderService.js`
- `src/features/vibefx-studio/video/export/exportStorageService.js`
- `src/features/vibefx-studio/video/export/exportMediaMetadata.js`

Fichiers ajoutes :

- `src/features/export/index.js`
- `src/features/export/components/ExportSettingsPanel.jsx`
- `src/features/export/lib/exportSettings.js`
- `src/features/export/lib/imageExport.js`
- `src/features/export/presets/exportPresets.js`
- `src/features/export/renderQueue/renderQueue.js`

Ameliorations :

- Mode export centralise : Firebase, localMock, alias server -> firebase.
- Export Pro ne force plus `localMock`.
- Le panneau affiche le mode actif : `Rendu Cloud Firebase` ou `Simulation locale`.
- Preflight pro avec `validateExportRenderCoverage()`.
- Blocage clair des features visibles non rendues serveur.
- Estimations visibles : duree, taille output, taille sources, temps, cout estime.
- Progression UI : preparation, upload, queued, rendering, retrying, encoding, finalizing, ready.
- Restauration du dernier job via Firestore owner-scoped en mode Firebase.
- Retry client qui transmet le `jobId` serveur pour reutiliser le manifest stocke.
- Destination de sortie : telechargements, dossier PC via File System Access API quand disponible, fallback navigateur.
- Nommage fichier `vibecut-{projectName}-{yyyyMMdd-HHmm}.mp4`.
- Metadata output derivees de `render`/`output` au lieu de hardcoder MP4/H.264.
- Nouveau panneau `Export Settings` inspire DaVinci/Premiere :
  - presets sociaux rapides;
  - onglets `Video`, `Audio`, `File`, `Advanced`;
  - export video on/off;
  - format/container;
  - codec;
  - encoder;
  - network optimization;
  - resolution;
  - frame rate;
  - pixel aspect ratio;
  - encoding profile;
  - keyframes;
  - frame reordering;
  - quality preset;
  - rate control;
  - bitrate;
  - sample rate audio;
  - audio bitrate;
  - file name;
  - destination;
  - render mode;
  - estimated file size;
  - Add to Render Queue.
- Queue locale avec statuts `queued`, `rendering`, `completed`, `failed`, `cancelled`.
- Export image browser reel depuis le canvas preview : PNG, JPEG, WebP.
- Comparaison visuelle canvas outillee dans `imageExport.js`.

Limites :

- Le panneau sait presenter des formats avances, mais le renderer final serveur ne les rend pas encore.
- `MOV`, `WebM serveur`, `H.265/HEVC`, `VP9`, `AV1`, `ProRes`, `DNxHR`, `PNG sequence`, `individual clips` sont modelises, mais bloques comme `server_required` ou `future` tant que le renderer ne les supporte pas.
- L'export image PNG/JPEG/WebP est browser/canvas, pas Cloud Run.

### Manifest et couverture renderer

Fichier cle :

- `src/features/vibefx-studio/video/export/exportManifest.js`

Ameliorations :

- Estimations de taille source, taille output, temps de rendu et cout.
- Qualite : `preview`, `pro`, `master`, `quickServer`.
- Support des `renderSettings` pour injecter les reglages pro du panneau dans le manifest.
- Validation des features visibles :
  - transitions adjacentes `fade` / `crossfade`;
  - textes `fade` / `none`;
  - fit `cover` / `contain`;
  - filtres colorimetrie connus;
  - audio source et audio externe.
- Blocage des features non rendues serveur :
  - animation texte avancee `neon-scan`, `scale`, `slide`, etc.;
  - transitions non supportees ou non adjacentes;
  - slow motion / speed != 1;
  - fit deformant ou custom non supporte;
  - filtres inconnus non nuls;
  - texte vide.

### Functions Export Pro

Fichiers modifies :

- `functions/index.js`
- `functions/src/videoExport.js`

Exports Functions :

- `createVideoExportJob`
- `cancelVideoExportJob`
- `retryVideoExportJob`
- `getVideoExportDownloadUrl`
- `getVideoExportAdminTelemetry`
- `processVideoExportJob`

Ameliorations :

- Validation owner-scoped des paths sources :
  - `users/{uid}/exports/{job}/sources/video/...`
  - `users/{uid}/exports/{job}/sources/audio/...`
- Quotas MVP :
  - duree;
  - nombre de clips;
  - pistes audio;
  - resolution;
  - fps;
  - bitrate video/audio;
  - taille manifest;
  - taille source cumulee.
- Manifest complet stocke en JSON Storage.
- Resume Firestore leger pour `videoExportJobs`.
- Stub plan/credits explicite : non facture tant que billing export pas finalise.
- Logs publics bornes et sans secrets.
- `retryVideoExportJob` relance un vrai rendu au lieu de recreer seulement un job queued.
- `getVideoExportDownloadUrl` owner-scoped.
- Auth renderer configurable :
  - `EXPORT_RENDERER_AUTH_MODE=hmac`
  - `hmac+oidc`
  - `oidc`
- Orchestration optionnelle :
  - `EXPORT_RENDER_ORCHESTRATION=sync`
  - `EXPORT_RENDER_ORCHESTRATION=taskQueue`
- Worker `processVideoExportJob` via Cloud Tasks.
- Protection concurrence/cancel :
  - `markJobRenderingUnlessCancelled`
  - `markJobFailedUnlessCancelled`
  - conservation du statut `cancelled` si Cloud Run termine apres annulation.
- Admin telemetry globale protegee par custom claim `admin`, `ADMIN_EMAILS` ou `admins/{email}` actif.

Limites :

- Le mode taskQueue est code/outille mais pas valide en deploy live.
- Les claims/admin live restent a verifier.
- Les couts restent des estimations internes, pas la facture Google Cloud officielle.

### Renderer Cloud Run

Fichiers modifies :

- `render-service/src/server.js`
- `render-service/README.md`

Ameliorations :

- Export de `validateManifest`, `validateRendererCoverage`, `buildFfmpegArgs` pour smokes locaux.
- Le serveur ne demarre pas quand le module est importe par un smoke.
- Lazy-load de `@google-cloud/storage`.
- Verification HMAC timestamp :
  - `x-vibecut-timestamp`
  - `x-vibecut-signature`
  - fenetre anti-replay.
- Mode verifier :
  - `EXPORT_RENDERER_VERIFY_MODE=hmac`
  - `platform-iam` seulement avec `EXPORT_RENDERER_PRIVATE_IAM_CONFIRMED=true`.
- FFmpeg couvre :
  - trims;
  - concat;
  - rotations `90/180/270`;
  - scale/crop;
  - fit cover/contain;
  - transitions adjacentes fade/crossfade via `xfade`;
  - textes basiques via `drawtext`;
  - text fade/none;
  - colorimetrie FFmpeg connue;
  - audio source clip;
  - audio externe avec trim/start/volume;
  - `amix`;
  - output MP4 H.264/AAC;
  - upload Storage output.

Limites :

- Pas encore de renderer frame-by-frame/headless complet.
- Pas de ProRes/DNxHR/AV1/VP9 final serveur.
- Pas de PNG sequence serveur.
- Pas de transitions complexes type wipe/slide/zoom en rendu final.
- Les animations texte avancees restent bloquees.

### Backoffice exports et couts

Fichiers ajoutes/modifies :

- `src/app/backoffice/BackofficeClient.jsx`
- `src/app/backoffice/exportTelemetry.js`
- `src/app/globals.css`
- `functions/src/videoExport.js`
- `scripts/smoke-backoffice-export-telemetry.mjs`

Etat actuel :

- Il y a bien un dashboard backoffice Export telemetry.
- L'UI affiche :
  - exports jour / semaine / mois;
  - ready;
  - jobs;
  - actifs;
  - echecs;
  - cout estime;
  - table jobs recents;
  - statut;
  - rendu;
  - output size;
  - cout estime;
  - date.
- Le client tente d'abord la callable admin globale `getVideoExportAdminTelemetry`.
- Si la vue admin globale est refusee, il retombe sur une lecture owner-scoped `videoExportJobs` pour le compte connecte.
- Les donnees sont sanitisees cote callable admin :
  - pas de signed URL;
  - pas de fuite Storage paths sensibles;
  - resumes de jobs et agregats.

Important :

- Les couts affiches sont des estimations internes basees sur :
  - vCPU Cloud Run suppose : 2;
  - RAM supposee : 2 GiB;
  - prix approximatifs CPU/RAM/seconde;
  - cout Storage mensuel prorate;
  - conversion USD/EUR.
- Ce n'est pas encore branche sur une source officielle Google Cloud Billing.
- Ce n'est pas encore un dashboard "source Google Cloud Run" au sens facture/metrics officielles.

Ce qu'il faut faire pour un vrai dashboard cout Google :

- Activer Cloud Billing Export vers BigQuery.
- Ajouter une source serveur admin qui lit BigQuery Billing Export.
- Optionnel : lire Cloud Monitoring / Cloud Run metrics pour request count, CPU allocation, memory, instance time.
- Rapprocher par labels/jobId si possible :
  - user;
  - jobId;
  - renderer revision;
  - elapsedMs;
  - output size.
- Afficher dans le backoffice :
  - estimation interne;
  - cout Google facture;
  - ecart estimation/facture;
  - cout par job;
  - cout par utilisateur;
  - cout par jour.

Etat UI :

- Le dashboard actuel est propre et utilisable, mais c'est un MVP d'observabilite interne.
- Il faut encore une vraie passe design/UX admin si l'objectif est une "belle UI" de suivi couts production avec graphiques, filtres, details par job et rapprochement facture.

Sources Google Cloud officielles a utiliser pour la suite :

- Cloud Run pricing : https://cloud.google.com/run/pricing
- Export Cloud Billing vers BigQuery : https://cloud.google.com/billing/docs/how-to/export-data-bigquery
- Setup Billing Export BigQuery : https://cloud.google.com/billing/docs/how-to/export-data-bigquery-setup
- Tables Cloud Billing exportees et donnees de tags/ressources : https://cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/standard-usage
- Monitoring Cloud Run : https://cloud.google.com/run/docs/monitoring
- Metrics Cloud Run dans Cloud Monitoring : https://cloud.google.com/monitoring/api/metrics_gcp_p_z

Implication produit :

- Le backoffice actuel ne doit afficher "cout Google reel" qu'apres ingestion BigQuery Billing Export.
- Avant cela, le libelle doit rester "cout estime" ou "estimation interne".
- Pour un dashboard vraiment fiable, stocker aussi les labels/tags Cloud Run et/ou un `jobId` exploitable afin de rapprocher les jobs Vibe_CUT des lignes Billing Export.

### Scripts et gates ajoutes

Scripts nouveaux principaux :

- `scripts/smoke-export-professional-settings.mjs`
- `scripts/smoke-vibecut-export-functions.mjs`
- `scripts/smoke-vibecut-render-service-contract.mjs`
- `scripts/smoke-vibecut-export-coverage-parity.mjs`
- `scripts/prepare-vibecut-k1-live-smoke.mjs`
- `scripts/prepare-vibecut-pro-fixtures.mjs`
- `scripts/smoke-vibecut-export-runbook.mjs`
- `scripts/smoke-vibecut-export-status-audit.mjs`
- `scripts/audit-vibecut-export-hardening-requirements.mjs`
- `scripts/check-vibecut-export-release-gate.mjs`
- `scripts/check-vibecut-export-local-prereqs.mjs`
- `scripts/render-vibecut-k1-local-mp4-smoke.mjs`
- `scripts/render-vibecut-pro-fixtures-local-smoke.mjs`
- `scripts/render-vibecut-renderer-local-contract-smoke.mjs`
- `scripts/run-firebase-emulators-test.mjs`
- `scripts/guard-vibecut-k1-live-smoke.mjs`
- `scripts/verify-vibecut-k1-cloud-output.mjs`
- `scripts/smoke-backoffice-export-telemetry.mjs`

Scripts `package.json` importants :

- `npm run test:vibecut-export`
- `npm run test:vibecut-export-local-mp4`
- `npm run test:vibecut-k1-local-mp4`
- `npm run test:vibecut-pro-fixtures-local-mp4`
- `npm run test:vibecut-renderer-local-contract`
- `npm run check:vibecut-export-prereqs`
- `npm run check:vibecut-export-release`
- `npm run guard:vibecut-k1-live`
- `npm run verify:vibecut-k1-cloud-output`
- `npm run test:backoffice-export-telemetry`

DevDependencies ajoutees :

- `ffmpeg-static`
- `ffprobe-static`

But :

- Lever le blocage FFmpeg local sans installation globale.
- Pouvoir produire/verifier des MP4 locaux lourds reproductibles.

## Tests executes et resultats

Derniere passe locale connue :

- `node scripts/smoke-export-professional-settings.mjs` : OK.
- `npm run test:vibecut-export` : OK.
- `npm run test:vibecut-export-local-mp4` : OK.
- `npm run test:video-ui` : OK, 8 tests Playwright passes.
- `npm --prefix functions run lint` : OK.
- `node --check render-service/src/server.js` : OK.
- `npm run lint` : OK avec 12 warnings herites hors export.
- `npm run build` : OK avec warning Turbopack/NFT connu.
- `git diff --check` : OK hors warnings CRLF.
- `npm audit --omit=optional` : OK, 0 vulnerabilite.
- `npm run test:backoffice-export-telemetry` : OK.
- `npm run check:vibecut-export-prereqs` : echec attendu car Java 21+ absent.
- `npm run check:vibecut-export-release` : echec attendu, gate non mutant.

Warnings connus :

- `npm run lint` remonte 12 warnings herites :
  - hooks dependencies dans des composants/hook studio;
  - `img` sans alt dans `InstaPreviewModal`.
- `npm run build` remonte un warning Turbopack/NFT lie a `src/app/api/music/local-file-import/route.js`.
- `git diff --check` affiche des warnings CRLF Windows, pas d'erreurs whitespace.

## Gate release bloque volontairement

`npm run check:vibecut-export-release` doit echouer tant que :

- statut global encore `pre-release hardening`;
- Phase 5 renderer-first partielle;
- Cloud Run prive/IAM/rotation secret non execute;
- smoke live deux videos K1 non execute;
- Java 21+ absent pour emulateurs;
- MP4 finaux via Cloud Run live non generes/verifies;
- confirmation utilisateur live K1 requise;
- deploy Functions/Cloud Run/App Hosting non execute.

Ce gate est sain : il empeche de transformer des preuves locales en release beta.

## Ce qui est vraiment supporte aujourd'hui

Support final serveur MP4 :

- MP4 H.264/AAC;
- 1080x1920 / resolutions dans quotas;
- FPS constant jusqu'a 60 selon validation;
- trims;
- concat;
- rotations 90/180/270;
- fit cover/contain;
- fade/crossfade adjacent;
- texte basique fade/none;
- colorimetrie FFmpeg connue;
- audio clip source et audio externe;
- output Storage;
- download URL owner-scoped.

Support navigateur image :

- PNG depuis canvas preview;
- JPEG depuis canvas preview;
- WebP depuis canvas preview;
- filename sanitise;
- verification canvas mockee en smoke.

Modelise mais pas final serveur :

- H.265/HEVC;
- MOV;
- WebM serveur;
- VP9;
- AV1;
- ProRes;
- DNxHR;
- PNG sequence;
- transparent video;
- individual clips;
- animations texte avancees;
- transitions complexes;
- slow motion;
- renderer frame-by-frame.

## Sequence de reprise recommandee demain

### 1. Installer/configurer Java 21+

Objectif :

- Debloquer `npm run test:emulators`.

Verifier :

```bash
npm run check:vibecut-export-prereqs
npm run test:emulators
```

### 2. Revalider les gates locaux avant Cloud

```bash
npm run test:vibecut-export
npm run test:vibecut-export-local-mp4
npm run test:video-ui
npm --prefix functions run lint
node --check render-service/src/server.js
npm run lint
npm run build
git diff --check
```

### 3. Preparer le smoke live K1

Ne rien lancer sans confirmation.

Commande de sas :

```bash
set "VIBECUT_LIVE_CONFIRM=OK pour smoke live Cloud Run K1"
npm run guard:vibecut-k1-live
```

Ce garde-fou ne lance pas le live. Il confirme seulement que les prerequis sont prets.

### 4. Executer un seul smoke Cloud Run K1

Objectif :

- deux sources K1;
- upload Storage;
- createVideoExportJob live;
- renderer Cloud Run;
- output Storage;
- status Firestore `ready`;
- telechargement MP4;
- verification locale.

Verifier le MP4 telecharge :

```bash
set "VIBECUT_CLOUD_OUTPUT_FILE=C:\chemin\vers\vibecut-k1-final.mp4"
npm run verify:vibecut-k1-cloud-output
```

### 5. Verifier le backoffice sur jobs live

Objectif :

- se connecter avec compte admin;
- verifier que `getVideoExportAdminTelemetry` retourne une vue globale;
- verifier fallback owner-scoped avec compte non admin;
- comparer output, duree, elapsedMs, taille, cout estime.

Important :

- Ne pas appeler cela "cout Google reel" tant que Billing Export BigQuery n'est pas branche.

### 6. Valider taskQueue live

Objectif :

- passer `EXPORT_RENDER_ORCHESTRATION=taskQueue`;
- verifier que callable retourne vite;
- verifier que `processVideoExportJob` consomme la tache;
- verifier progression Firestore;
- verifier cancel/retry.

### 7. Fixtures Cloud Run finales

Apres K1, generer des MP4 Cloud Run pour :

- texte statique;
- crossfade;
- colorimetrie;
- audio externe;
- combined-supported;
- animation texte avancee doit rester bloquee tant que frame-by-frame absent.

## Actions techniques restantes

Priorite haute :

- Java 21+ et emulateurs.
- Smoke Cloud Run K1 live unique.
- Verification MP4 Cloud telecharge.
- Validation taskQueue en deploy controle.
- Backoffice admin global live.
- Cloud Run prive/IAM ou au minimum HMAC + rotation secret.

Priorite moyenne :

- Renderer frame-by-frame/headless pour animations texte avancees et transitions complexes.
- Fixtures Cloud Run par feature.
- UI backoffice couts plus riche : charts, filtres, detail job, erreurs recentes.
- Billing Export BigQuery pour cout officiel Google.
- Labels Cloud Run/jobId pour rapprochement cout reel.

Priorite basse :

- Exports serveur WebM/MOV/H.265/VP9/AV1.
- ProRes/DNxHR seulement si pipeline Cloud Run et couts justifies.
- PNG sequence serveur.
- Export transparent video.
- Individual clips.

## Hygiene docs appliquee

Objectif du menage :

- garder les sources actives en racine `docs/`;
- archiver les documents historiques pour ne pas confondre l'ancien MVP avec le chantier release actuel;
- ne pas casser les scripts qui lisent des chemins fixes.

Regle :

- ne pas supprimer l'historique utile;
- archiver dans `docs/archive/export-pro-legacy/`;
- mettre `map.md` a jour;
- garder le checkpoint comme point d'entree humain.

## Lecture de reprise demain

Lire dans cet ordre :

1. `AGENTS.md`
2. `map.md`
3. `docs/vibecut-export-pro-checkpoint-2026-06-06.md`
4. `docs/vibecut-export-hardening-status-2026-06-06.md`
5. `docs/vibecut-export-production-runbook-2026-06-06.md`
6. `docs/vibecut-export-production-hardening-megaprompt.md`

Ensuite seulement lancer les gates locaux et preparer le smoke Cloud.
