# Vibe_CUT Export Pro - Hardening Status 2026-06-06

Ce statut consolide l'etat reel du chantier `docs/vibecut-export-production-hardening-megaprompt.md`. Il ne declare pas un `Go release beta` : le smoke direct Cloud Run K1 est prouve, mais le chemin callable Firebase complet, le mode taskQueue live et les MP4 finaux des fixtures pro restent a executer apres confirmation explicite.

## Verdict court

- Statut global : `pre-release hardening`, pas `Go release beta`.
- Front export : stable pour le cockpit Firebase/localMock, progression, compatibilite, metadata de sortie et destination PC/download.
- Metadata codecs front : le modal derive container/codec/MIME depuis `render`/`output` via `exportMediaMetadata.js`, normalise les libelles (`H.264`, `H.265/HEVC`, `VP9`, `AV1`, etc.), evite les MIME fallback trompeurs hors MP4 et affiche les exports image sans faux codec audio.
- Panneau Export Settings pro : `src/features/export/` ajoute les presets sociaux rapides, les formats/codecs pro avec statuts `ready` / `server_required` / `future`, les onglets Video/Audio/File/Advanced, l'estimation de taille, le filename sanitise, une queue locale et l'export image canvas PNG/JPEG/WebP. Ces reglages alimentent le manifest par overrides, mais le renderer final serveur reste volontairement limite au chemin MP4 H.264/AAC tant que les formats avances ne sont pas implementes cote renderer.
- Pipeline serveur : solide pour le socle FFmpeg MP4 H.264/AAC, trims, concat, rotations, crossfade/fade adjacent, texte fade/none, colorimetrie FFmpeg et audio source/externe.
- Parite coverage : `scripts/smoke-vibecut-export-coverage-parity.mjs` execute les validateurs client, Functions et renderer sur les memes fixtures afin qu'une feature visible ne puisse pas passer cote front puis etre ignoree/refusee plus tard.
- Orchestration serveur : `EXPORT_RENDER_ORCHESTRATION=taskQueue` ajoute le mode async Cloud Tasks via `processVideoExportJob`; le mode `sync` reste le defaut tant que le deploy controle n'est pas execute.
- Securite renderer : HMAC reste le defaut; `hmac+oidc` permet Cloud Run prive avec defense-in-depth; `platform-iam` cote renderer exige `EXPORT_RENDERER_PRIVATE_IAM_CONFIRMED=true` et ne doit etre utilise qu'apres `--no-allow-unauthenticated`.
- Blocage principal : renderer frame-by-frame absent pour les animations texte avancees et les effets/transitions complexes. `advanced text animation` / `neon-scan` doit rester bloque avant export pro.
- Validation locale K1 : OK en MP4 local non Cloud, sortie 1080x1920 H.264, 30 fps, 5.5s, audio present.
- Validation fixtures locales : OK pour les 5 fixtures pro supportees en MP4 local non Cloud (`static-text`, `crossfade-transition`, `color-filters`, `external-audio`, `combined-supported`).
- Validation renderer canonique locale : OK via `render-service/src/server.js buildFfmpegArgs` pour K1 reel et une fixture combinee texte + transition + filtres + audio.
- Validation live directe : OK le 2026-06-07 via `npm run smoke:vibecut-k1-cloud-run-direct` sur Cloud Run revision `vibecut-render-service-00004-mz5`. Sources `MVI_0126.MP4` + `MVI_0117.MP4`, rotation gauche `270`, crossfade adjacent, output `C:\Users\pcpor\OneDrive\Bureau\K1\vibecut-k1-cloudrun-direct-20260607T105813.mp4`, 26 123 803 bytes.
- Toute nouvelle execution live Cloud Run/Functions reste conditionnee a la confirmation exacte `OK pour smoke live Cloud Run K1`.
- Blocage validation produit complet : le smoke callable Firebase `npm run smoke:vibecut-k1-cloud-run-live` reste bloque localement sans `VIBECUT_FIREBASE_ID_TOKEN` valide; la tentative custom token via ADC ne peut pas signer hors environnement service account, et l'anonymous sign-in est refuse par Firebase Auth.
- Verification post-smoke live : outillee par `npm run verify:vibecut-k1-cloud-output`, qui verifie le MP4 telecharge sans appel Cloud (container MP4-compatible, H.264, AAC, 1080x1920, 30 fps, duree ~5.5s, audio et frames non noires).
- Blocage local restant : `npm run test:emulators` reste requis pour release beta, mais il est bloque localement si Java n'est pas disponible dans le PATH.

## Matrice par phase

| Phase | Statut | Evidence | Reste a faire |
| --- | --- | --- | --- |
| Phase 1 - UI Firebase sans ambiguite | Done | `ExportVideoPanel.jsx` utilise `resolveExportRenderMode()` au preflight, launch et retry; `apphosting.yaml` fixe `NEXT_PUBLIC_VIBECUT_EXPORT_MODE=firebase`; `scripts/smoke-vibecut-export-jobs.mjs` bloque un retour au `localMock` force. | Verifier en prod apres prochain deploy controle. |
| Phase 2 - UX chargement/export | Done MVP | Panneau avec etapes preparation/upload/queued/rendering/finalizing/ready/failed/cancelled/retrying, compatibilite `Exportable pro` ou `Bloque`, logs, taille/cout/duree, output Storage et metadata container/codec/MIME. | Validation visuelle finale apres deploy et job reel. |
| Phase 3 - destination desktop/PC | Done MVP | Download standard, File System Access API sous geste utilisateur, fallback navigateur et nom `vibecut-{projectName}-{yyyyMMdd-HHmm}.mp4`. | Tester manuellement Chrome/Edge + navigateur sans API sur output reel. |
| Phase 4 - Functions quotas/paths | Done MVP | Owner-scoped paths `users/{uid}/exports/.../sources/video|audio`, quotas duree/clips/audio/resolution/fps/bitrate/manifest/source size, manifest JSON Storage, summary Firestore leger, `getVideoExportDownloadUrl`. | Brancher credits/plan reel si billing export devient payant. |
| Phase 5 - renderer serveur source de verite | Partial | Renderer FFmpeg couvre MP4 H.264/AAC, trims, concat, rotations 90/180/270, fade/crossfade adjacent, drawtext fade/none, filtres FFmpeg connus, audio source/externe. `validateExportRenderCoverage()` bloque les features non rendues. | Implementer renderer frame-by-frame/headless pour animation texte avancee, transitions complexes, overlays/effects riches et verification MP4 finale des fixtures. |
| Phase 6 - securite renderer/secrets | Done MVP code / Partial live | HMAC timestamp anti-replay; `EXPORT_RENDERER_AUTH_MODE=hmac`, `hmac+oidc` ou `oidc`; `EXPORT_RENDERER_VERIFY_MODE=hmac` par defaut ou `platform-iam` seulement avec `EXPORT_RENDERER_PRIVATE_IAM_CONFIRMED=true`; runbook documente Secret Manager, `roles/run.invoker` et `--no-allow-unauthenticated`. | Faire le passage infra Cloud Run prive/IAM/rotation secret apres confirmation et verifier un POST non authentifie refuse. |
| Phase 7 - orchestration async/progress | Done MVP | UI suit Firestore; retry relance un rendu; cancel est protege contre ecrasement `ready`/`failed`; transactions `queued -> rendering` et failure respectent cancel; `EXPORT_RENDER_ORCHESTRATION=taskQueue` permet a la callable de creer le job puis d'enqueue `processVideoExportJob`, qui relit le manifest Storage owner-scoped et lance le renderer. | Valider le mode taskQueue en deploy controle/live avant `Go release beta`. |
| Phase 8 - backoffice couts/exports | Done MVP | `getVideoExportAdminTelemetry` admin globale sanitisee, fallback owner-scoped, cout/taille/temps moyen, Billing Export BigQuery optionnel pour facture Cloud Run reelle, smoke `test:backoffice-export-telemetry`. | Configurer/deployer les variables Billing Export BigQuery en live et rapprocher plus finement les jobs par labels/jobId. |
| Phase 9 - smoke live deux videos K1 | Partial live | Dry-run `prepare-vibecut-k1-live-smoke.mjs` verifie `MVI_0126.MP4` + `MVI_0117.MP4`; smoke direct Cloud Run 2026-06-07 OK avec rotation gauche `270`, crossfade adjacent, texte fade, output K1 telecharge et `verify:vibecut-k1-cloud-output` OK. | Lancer le smoke callable Firebase complet avec `VIBECUT_FIREBASE_ID_TOKEN`, valider taskQueue live et produire ensuite les MP4 Cloud Run des fixtures pro supportees. |
| Phase 10 - source de verite deploy | Done MVP | `docs/vibecut-export-production-runbook-2026-06-06.md` documente variables, secrets, deploy controle, Cloud Run public/HMAC puis prive/OIDC, gates et no-go. | Executer deploys seulement avec confirmation. |

## Couverture renderer actuelle

Supporte cote serveur :

- video MP4 H.264/AAC en sortie;
- trims video;
- concat multi-clips;
- fit `cover`/`contain` selon le contrat supporte;
- rotation/orientation `90`, `180`, `270`;
- fps cible et bitrate cible;
- transitions adjacentes `fade` et `crossfade`;
- textes basiques `none` et `fade` via FFmpeg `drawtext`;
- colorimetrie FFmpeg connue : exposition, brightness, contraste, saturation, vibrance, temperature, tint, hue, shadows, midtones, highlights, fade, vignette, grain;
- audio source clip et audio externe avec volume/mix.

Bloque avant export pro :

- advanced text animation comme `neon-scan`, `scale`, `slide` tant que le renderer frame-by-frame n'existe pas;
- transitions non adjacentes/free et familles complexes type wipe/zoom/slide non implementees;
- vitesse/slow motion si non couverte par le renderer;
- filtres inconnus non nuls;
- toute feature visible non rendue serveur par `validateExportRenderCoverage()`.

## Gates executes dans cette passe

- `npm run test:vibecut-export` : OK, dry-run uniquement pour K1/pro fixtures.
- `npm run test:video-ui` : OK, incluant export brouillon WebM quand MP4 MediaRecorder est indisponible et garde-fous UI codec/output.
- `npm run prepare:vibecut-pro-fixtures` : OK, 5 fixtures supportees et `advanced-text-animation` bloquee.
- `npm run test:backoffice-export-telemetry` : OK.
- `npm --prefix functions run lint` : OK.
- `node --check render-service/src/server.js` : OK.
- `npm run test:video-ui` : OK.
- `npm run lint` : OK avec warnings herites hors export.
- `npm run build` : OK avec warning Turbopack/NFT connu.
- `git diff --check` : OK hors warnings CRLF.
- `npm audit --omit=optional` : OK, 0 vulnerabilite apres ajout `ffmpeg-static`/`ffprobe-static` et `npm audit fix`.
- `npm run check:vibecut-export-prereqs` : partiel. K1 OK, FFmpeg OK via `node_modules/ffmpeg-static`, FFprobe OK via `node_modules/ffprobe-static`, Java 21+ absent. Le check detecte aussi les chemins explicites `VIBECUT_FFMPEG_PATH`, `FFMPEG_PATH`, `VIBECUT_FFPROBE_PATH`, `FFPROBE_PATH`, `VIBECUT_JAVA_HOME`, `JAVA_HOME` et les chemins Windows courants.
- `npm run test:emulators` passe maintenant par `scripts/run-firebase-emulators-test.mjs`, qui exige Java 21+ via `VIBECUT_JAVA_HOME`, `JAVA_HOME`, `java` dans le PATH ou les chemins Windows courants avant de lancer `firebase emulators:exec`.
- `npm run test:vibecut-k1-local-mp4` : OK le 2026-06-06. MP4 local non Cloud produit dans `test-results/vibecut-export/k1-local-smoke-1080x1920.mp4`, 21 787 868 bytes, 1080x1920, H.264, 30 fps, duree 5.5s, audio present, frames non noires.
- `npm run test:vibecut-pro-fixtures-local-mp4` : OK le 2026-06-06. MP4 locaux non Cloud generes pour `static-text`, `crossfade-transition`, `color-filters`, `external-audio`, `combined-supported`; chaque output est verifie H.264, 1080x1920, duree attendue, audio attendu, frames non noires, et region texte lumineuse pour les fixtures texte.
- `npm run test:vibecut-renderer-local-contract` : OK le 2026-06-06. Importe `buildFfmpegArgs` du renderer Cloud Run, rend `k1-renderer-contract.mp4` et `combined-renderer-contract.mp4`, verifie H.264, 1080x1920, duree 5.5s, audio present, frames non noires et aucun warning renderer.
- `npm run test:vibecut-export-local-mp4` : OK le 2026-06-06. Agrege le smoke K1 MP4 local, les 5 fixtures pro MP4 locales et le smoke renderer canonique local; c'est le gate local lourd a executer avant toute validation Cloud live.
- Revalidation 2026-06-06 : `scripts/render-vibecut-pro-fixtures-local-smoke.mjs` recree maintenant le dossier parent avant chaque sortie FFmpeg, ce qui evite un echec transitoire `No such file or directory` si un autre controle nettoie `test-results`; `npm run test:vibecut-export-local-mp4` repasse OK apres correction.
- `npm run verify:vibecut-k1-cloud-output` : pret pour post-smoke live. Il exige `VIBECUT_CLOUD_OUTPUT_FILE` ou un chemin en argument et verifie localement le MP4 telecharge : container MP4-compatible, codec video H.264, resolution 1080x1920, FPS ~30, duree ~5.5s, audio AAC present et frames non noires.
- `npm run smoke:vibecut-k1-cloud-run-direct` : OK le 2026-06-07 apres confirmation et deploy Cloud Run controle. La commande a uploade `K1/MVI_0126.MP4` + `K1/MVI_0117.MP4`, appele directement `/render` avec signature HMAC Secret Manager, rendu rotation gauche `270` + crossfade, puis telecharge `C:\Users\pcpor\OneDrive\Bureau\K1\vibecut-k1-cloudrun-direct-20260607T105813.mp4`.
- `npm run verify:vibecut-k1-cloud-output` sur `vibecut-k1-cloudrun-direct-20260607T105813.mp4` : OK le 2026-06-07. MP4-compatible, H.264, 1080x1920, 30 fps, AAC stereo 48 kHz, duree 5.5s, 26 123 803 bytes.
- `npm run test:backoffice-export-telemetry` : OK le 2026-06-07 avec separation facture Billing Export BigQuery et estimation interne.
- `npm --prefix functions run lint` : OK le 2026-06-07 apres ajout du client BigQuery.
- `node --check scripts/run-vibecut-k1-cloud-run-live-smoke.mjs` et `node --check scripts/run-vibecut-k1-cloud-run-direct-smoke.mjs` : OK le 2026-06-07.
- `npm run test:vibecut-export` inclut maintenant `scripts/smoke-vibecut-export-media-metadata.mjs`, qui execute la matrice front container/codec/MIME pour MP4, WebM, MOV, PNG, JPEG, WebP, H.264, H.265/HEVC, VP9, AV1, ProRes, DNxHR, AAC et Opus.
- `npm --prefix functions run lint` et `scripts/smoke-vibecut-export-functions.mjs` couvrent le mode async `EXPORT_RENDER_ORCHESTRATION=taskQueue`, l'enqueue Admin SDK vers `processVideoExportJob`, le skip des jobs terminaux, et le maintien du mode sync par defaut.
- `scripts/smoke-vibecut-render-service-contract.mjs` couvre le mode renderer `EXPORT_RENDERER_VERIFY_MODE=hmac` par defaut, la fenetre anti-replay, et le mode `platform-iam` bloque sans confirmation explicite `EXPORT_RENDERER_PRIVATE_IAM_CONFIRMED=true`.
- `scripts/smoke-vibecut-export-coverage-parity.mjs` : OK le 2026-06-06. Les trois couches client/Functions/renderer acceptent les memes cas supportes (`baseline-two-clips`, `basic-text-fade`, `adjacent-crossfade`, `known-color-filters`, `external-audio`) et bloquent les memes cas critiques (`advanced-text-animation`, `unsupported-transition`, `non-adjacent-transition`, `slow-motion`, `unsupported-fit`, `unknown-color-filter`, `empty-text`).
- `scripts/smoke-export-professional-settings.mjs` : OK le 2026-06-06. Couvre presets sociaux/custom, filename valide, estimation taille, Add to Render Queue, statut failed, export canvas PNG/JPEG/WebP et comparaison visuelle canvas mockee.

Non execute ou bloque :

- `npm run test:emulators` : requis pour `Go release beta`, bloque tant que Java 21+ n'est pas disponible via `VIBECUT_JAVA_HOME`, `JAVA_HOME`, PATH ou chemins Windows courants. Echecs observes : `Could not spawn java -version`, puis `firebase-tools no longer supports Java version before 21`.
- Smoke callable Firebase K1 : bloque localement sans `VIBECUT_FIREBASE_ID_TOKEN` valide; la creation de custom token via ADC echoue hors service account signable et l'auth anonymous live repond `ADMIN_ONLY_OPERATION`.
- MP4 final Cloud Run K1 direct : genere et verifie. MP4 finaux des fixtures pro supportees : non generes/verifies dans cette passe.
- Deploy Cloud Run renderer : execute le 2026-06-07 sur la revision `vibecut-render-service-00004-mz5` avec Secret Manager. Deploy Functions/App Hosting : non execute volontairement.

## Prochaine sequence utile

1. Installer/configurer Java 21+ local via `VIBECUT_JAVA_HOME`, `JAVA_HOME` ou PATH, puis relancer `npm run test:emulators`.
2. Fournir un `VIBECUT_FIREBASE_ID_TOKEN` admin/test live ou une configuration service account signable, puis lancer le smoke callable Firebase complet.
3. Relancer `npm run test:vibecut-export-local-mp4` juste avant toute nouvelle validation Cloud live.
4. Valider en live controle le mode `EXPORT_RENDER_ORCHESTRATION=taskQueue` apres deploy Functions, sans lancer plusieurs jobs.
5. Generer ensuite les MP4 des fixtures pro supportees via Cloud Run live et garder `advanced-text-animation` bloquee.
6. Configurer Billing Export BigQuery en live pour que le backoffice affiche le cout Google Cloud Run reel au lieu du fallback `not_configured`.
7. Reporter le resultat dans ce statut et seulement ensuite discuter `Go release beta`.
