# Megaprompt - Release Export Video Pro Vibe_CUT

Tu travailles dans `C:\Users\pcpor\OneDrive\Bureau\mes projet\vibe_fxV2`.

Objectif : finaliser l'export video Vibe_CUT pour une premiere release production controlee avec une philosophie renderer-first. Le navigateur doit etre un portail de pilotage, pas le moteur de verite du rendu final. Le renderer Cloud Run n'est plus theorique : un smoke live officiel a deja reussi le 2026-06-05 avec `K1/MVI_0126.MP4`, trim 3s, rotation gauche `orientationRotation: 270`, output MP4 `1080x1920`, statut `ready`, et refus 401 sans signature.

La mission n'est donc plus de prouver que Cloud Run peut rendre une video simple. La mission est de cabler un flux produit ou le navigateur pilote un manifest canonique, puis de vraies machines serveur rendent toutes les features exportables : videos, trims, rotations, textes, animations, transitions, colorimetrie, audio, puis encodent le MP4 final. Si une feature est visible dans l'editeur mais pas encore rendue serveur, elle doit etre marquee non exportable ou bloquee avant l'export, jamais silently ignored.

## Usage Recommande Avec Codex CLI `/goal`

Commande/contenu a utiliser comme objectif de depart :

```text
Finalise le pipeline Export Video Pro Vibe_CUT selon docs/vibecut-export-production-hardening-megaprompt.md. Commence par lire les documents obligatoires, fais un diagnostic court de l'etat actuel, puis implemente les phases dans l'ordre. Le navigateur est seulement un cockpit de pilotage : le rendu final pro doit etre produit par un renderer serveur comme source de verite. Le smoke Cloud Run 1 video + rotation est deja valide; ne le refais pas sauf besoin precis. Avant tout nouveau deploy ou export live, demande confirmation. Priorite : manifest canonique, renderer serveur pro frame-exact, UI/UX export, destination desktop/PC, progression Firestore, cout estime, securite, puis smoke final 2 videos K1.
```

Mode de travail attendu :

- traiter ce fichier comme la source de verite du chantier export video;
- avancer phase par phase, sans ajouter de refactor hors scope;
- produire un bilan apres chaque phase : fichiers modifies, tests lances, risques restants, prochaine phase;
- demander confirmation avant toute action qui peut couter de l'argent ou modifier l'infra live;
- ne jamais enchainer plusieurs exports live sans bilan du precedent;
- mettre a jour `map.md` pour toute creation, suppression, deplacement ou changement structurel.

## Doctrine Renderer-First

Decision produit : Vibe_CUT ne doit pas vendre un export "rapide navigateur". L'export pro doit etre rendu par l'infrastructure serveur.

Principes :

- le navigateur est un cockpit : import, timeline, controle, preview interactive, choix export, suivi de job;
- la source de verite est le manifest export versionne, pas l'etat React ni le canvas live;
- le renderer serveur est l'autorite du rendu final;
- FFmpeg est obligatoire pour l'encodage MP4/H.264/AAC, les trims, concat, audio et operations media fiables;
- pour les animations visuelles riches, textes, overlays, transitions complexes et colorimetrie, privilegier un rendu serveur frame-by-frame deterministe, puis encoder les frames avec FFmpeg;
- le renderer serveur peut reutiliser une partie du moteur canvas/animation si elle est rendue deterministe et executable en environnement serveur/headless;
- aucune feature visible dans l'UI ne doit etre presentee comme exportable tant qu'elle n'a pas une implementation serveur et un test;
- l'export navigateur reste uniquement un brouillon local, cache ou secondaire, jamais le chemin pro.

Architecture cible renderer :

```text
Browser cockpit
  -> manifest canonique versionne
  -> upload sources Storage
  -> createVideoExportJob
  -> Cloud Run Job / worker
  -> renderer frame pipeline
       -> decode sources video/audio
       -> rendre frames finales avec textes, transitions, animations, colorimetrie
       -> encoder MP4 avec FFmpeg
  -> Storage output
  -> Firestore progress/ready/failed
  -> download desktop/PC
```

## Lecture Obligatoire

Lis dans cet ordre avant toute modification :

1. `AGENTS.md`
2. `map.md`
3. `seo.md`
4. `MEGAPROMPT.md`
5. `docs/archive/export-pro-legacy/vibecut-export-production-readiness-audit-2026-06-04.md`
6. `docs/archive/export-pro-legacy/vibecut-pro-export-cloud-implementation.md`
7. `src/features/vibefx-studio/video/panels/ExportVideoPanel.jsx`
8. `src/features/vibefx-studio/video/export/exportManifest.js`
9. `src/features/vibefx-studio/video/export/exportStorageService.js`
10. `src/features/vibefx-studio/video/export/exportRenderService.js`
11. `src/features/vibefx-studio/video/export/exportJobService.js`
12. `src/features/vibefx-studio/video/store/videoStore.js`
13. `functions/src/videoExport.js`
14. `render-service/src/server.js`
15. `firestore.rules`
16. `storage.rules`
17. `apphosting.yaml`

## Etat De Reference Au 2026-06-05

Deja valide :

- Firebase project `vibefx-v2` en Blaze.
- App Hosting live.
- Firestore, Storage, Auth, App Check configures.
- Functions Export Pro deployees : `createVideoExportJob`, `cancelVideoExportJob`, `retryVideoExportJob`.
- Cloud Run `vibecut-render-service` deploye en `europe-west9`, CPU 2, RAM 2Gi, max instances 2.
- Renderer FFmpeg MVP : download Storage, trim, scale/crop, concat simple, MP4 H.264/AAC, upload output.
- Renderer Cloud Run applique `clips[].orientationRotation` pour `90`, `180`, `270`.
- Smoke live officiel : `K1/MVI_0126.MP4`, 3s, rotation gauche, output MP4 vertical `1080x1920`, status `ready`.
- POST Cloud Run sans signature refuse en `401`.
- Backoffice export telemetry MVP : agregats jour/semaine/mois owner-scoped et cout estime.

Encore a finaliser avant release :

- UI `Export Pro` doit utiliser le mode Firebase sans patch manuel.
- L'utilisateur doit voir un vrai etat de progression et comprendre ce qui charge.
- L'utilisateur doit pouvoir recuperer simplement le MP4 final sur desktop/PC.
- La Function doit mieux borner quotas, chemins Storage, credits/plan et retry/cancel.
- Le renderer doit devenir le moteur pro de reference, pas un MVP FFmpeg qui ignore des couches visuelles.
- Textes, transitions, animations, colorimetrie, audio et overlays doivent avoir une implementation serveur ou etre bloques avant export.
- Le smoke final doit utiliser deux videos K1 pour valider concat + rotations + output, puis des fixtures dediees pour texte, transition, animation et colorimetrie.

## Regles Non Negociables

- Ne lance aucun export live payant sans confirmation explicite.
- Ne lance aucun `firebase deploy`, `gcloud run deploy`, `gcloud builds submit`, Cloud Tasks, Cloud Run Job ou commande cloud mutante sans confirmation explicite.
- Ne cree pas de ressource cloud nouvelle sans confirmation explicite.
- Ne hardcode aucun secret.
- Ne modifie pas `node_modules/`, `.next/`, `.git/`, `dist/`.
- Garde l'ancien export navigateur comme brouillon uniquement.
- Ne promets pas une fidelite preview si le renderer serveur ne couvre pas la feature.
- Ne laisse pas une feature non rendue serveur partir en export pro : bloquer, masquer, ou marquer `non exportable`.
- Ne considere pas une preview navigateur fluide comme preuve de rendu pro.
- Tout chemin Storage doit rester owner-scoped.
- Toute modification Functions doit passer `npm --prefix functions run lint`.
- Toute modification export doit passer `npm run test:vibecut-export`.
- Toute modification renderer doit passer `node --check render-service/src/server.js`.

## Phase 0 - Diagnostic Court

Produis d'abord un etat court :

- mode actuel de l'UI Export Pro;
- variables Firebase/App Hosting utilisees par l'export;
- etat Functions/renderer;
- features deja rendues par FFmpeg;
- features declarees dans le manifest mais non rendues serveur;
- features visibles dans l'UI mais non exportables pro;
- ecart entre preview navigateur et rendu serveur;
- risques cout/securite restants;
- prochain test live autorise ou non.

Ne code pas tant que ce diagnostic n'est pas clair.

## Phase 1 - Brancher L'UI Sur Firebase Sans Ambiguite

Objectif : `Export Pro MP4` doit suivre le mode configure et ne plus forcer `localMock`.

Actions :

1. Centraliser le mode export :
   - `NEXT_PUBLIC_VIBECUT_EXPORT_MODE=firebase` -> upload Storage + callable Firebase;
   - fallback dev -> `localMock`;
   - `browser` ou export rapide reste etiquete brouillon.
2. Retirer les `mode: 'localMock'` forces dans `ExportVideoPanel.jsx`.
3. Afficher clairement le mode actif :
   - `Rendu Cloud Firebase`;
   - `Simulation locale`;
   - `Brouillon navigateur`.
4. Verifier preflight, launch et retry avec le meme mode.
5. Ajouter un smoke qui echoue si le panneau force encore `localMock`.

Acceptance :

```bash
npm run test:vibecut-export
```

## Phase 2 - UX Export Et Temps De Chargement

Objectif : l'utilisateur doit comprendre ce qui se passe pendant l'export.

Etats UI obligatoires :

- preparation;
- upload sources;
- queued;
- running/rendering;
- finalizing;
- ready;
- failed;
- cancelled;
- retrying.

Actions :

1. Afficher une barre de progression honnete :
   - upload sources;
   - job cree;
   - rendu Cloud lance;
   - output pret.
2. Afficher les logs courts utilisateur :
   - source upload;
   - renderer appele;
   - FFmpeg en cours;
   - fichier final pret.
3. Afficher une compatibilite export avant lancement :
   - `Exportable pro` quand le renderer serveur couvre toutes les features utilisees;
   - `Bloque` si le projet contient une feature visible mais non rendue serveur;
   - `Degrade explicite` seulement si l'utilisateur choisit volontairement d'ignorer une feature secondaire;
   - jamais de warning passif perdu dans un log secondaire.
4. Afficher une estimation avant lancement :
   - duree;
   - resolution;
   - fps;
   - nombre de clips;
   - taille source cumulee;
   - cout estime.
5. Apres export, afficher :
   - lien telechargement;
   - chemin Storage;
   - duree de rendu;
   - taille MP4;
   - statut final.

Acceptance :

- refresh navigateur ne perd pas l'etat visible du dernier job si Firestore contient le job;
- erreur Cloud Run devient un message exploitable, pas un message generique;
- aucun wording ne promet `preview exacte` si le renderer serveur n'est pas source de verite pour toutes les features du projet;
- le bouton Export Pro est desactive si une feature critique n'est pas exportable serveur.

## Phase 3 - Choix De Destination Desktop/PC

Objectif : a la fin de l'export, l'utilisateur choisit ou tombe la video sur son ordinateur.

Important navigateur :

- Une application web ne peut pas ecrire arbitrairement dans `C:\...` sans action utilisateur.
- La solution propre est :
  - bouton `Telecharger MP4` standard;
  - option `Choisir un dossier` via File System Access API quand le navigateur le supporte;
  - fallback download classique si l'API n'est pas supportee.

Actions :

1. Ajouter un bloc destination dans l'UI export :
   - `Telechargements par defaut`;
   - `Choisir un dossier sur ce PC` si `window.showDirectoryPicker` existe;
   - dernier dossier choisi garde en preference locale non sensible.
2. Quand l'output est `ready`, permettre :
   - telecharger automatiquement apres confirmation utilisateur;
   - ou cliquer `Telecharger`;
   - ou enregistrer via dossier choisi.
3. Ne jamais tenter d'ecrire sans geste utilisateur.
4. Nommer le fichier proprement :
   - `vibecut-{projectName}-{yyyyMMdd-HHmm}.mp4`;
   - fallback `vibecut-export-{jobId}.mp4`.
5. Ajouter une mention UI courte si le navigateur bloque le choix de dossier.

Acceptance :

- Chrome/Edge desktop : choix de dossier fonctionne si API disponible;
- autres navigateurs : download standard fonctionne;
- aucune erreur bloquante si l'utilisateur annule le choix de dossier;
- le MP4 telecharge est le Storage output du job `ready`.

## Phase 4 - Durcir Functions Export

Objectif : la Function ne doit pas accepter un manifest dangereux ou trop couteux.

Actions :

1. Valider les prefixes :
   - `clips[].sourceStoragePath` commence par `users/${uid}/exports/`;
   - `audioTracks[].sourceStoragePath` commence par `users/${uid}/exports/`;
   - les chemins sources finissent dans `/sources/video/` ou `/sources/audio/`.
2. Ajouter quotas serveur MVP :
   - duree max;
   - clips max;
   - audio tracks max;
   - resolution max;
   - fps max;
   - bitrate max;
   - taille manifest max;
   - taille source cumulee max si disponible.
3. Ajouter controle credits/plan en stub explicite si billing final absent.
4. Ajouter logs securite sans donnees sensibles.
5. Ajouter ou finaliser `getVideoExportDownloadUrl(jobId)` owner-scoped pour regenerer une URL signee courte.
6. Garder `videoExportJobs` leger : status, progress, uid, pointers Storage, cout estime, output, erreur courte.

Acceptance :

```bash
npm --prefix functions run lint
npm run test:vibecut-export
```

## Phase 5 - Renderer Serveur Pro Source De Verite

Objectif : transformer le renderer en vraie machine de rendu pro. Le serveur doit pouvoir rendre ce que l'editeur montre, pas seulement faire un concat FFmpeg simple.

Decision technique recommandee :

- conserver FFmpeg pour decode/encode, trims, concat, audio, codecs, metadata et MP4 final;
- ajouter une couche renderer frame-by-frame serveur pour les elements visuels riches;
- cette couche peut etre un renderer headless reutilisant le moteur canvas/animation rendu deterministe, ou une implementation serveur dediee si elle est plus fiable;
- le rendu final suit le manifest canonique, pas le DOM React courant;
- si le renderer serveur ne sait pas rendre une feature, l'UI doit la bloquer en Export Pro.

Pipeline cible :

```text
manifest
  -> load sources Storage
  -> build render plan frame-exact
  -> render frame N avec video frame + textes + transitions + animations + colorimetrie + overlays
  -> stream/pipe frames vers FFmpeg
  -> mix audio
  -> encode MP4 H.264/AAC
  -> upload output Storage
```

Couverture pro obligatoire avant release :

1. trims video;
2. concat multi-clips;
3. fit `cover`/`contain`;
4. rotation/orientation `90/180/270`;
5. fps cible constant;
6. bitrate/crf cible;
7. textes statiques et animes visibles dans l'output;
8. transitions de base : cut, fade, crossfade, wipe simple;
9. animations texte principales exposees dans l'UI;
10. colorimetrie/filtres principaux exposes dans l'UI;
11. audio source et musique externe avec volumes;
12. output MP4 H.264/AAC lisible desktop/mobile.

Actions :

1. Faire l'inventaire exact des features Vibe_CUT visibles dans l'UI :
   - textes;
   - animations texte;
   - transitions;
   - filtres/colorimetrie;
   - vitesse/slow motion;
   - audio clip/musique/volume;
   - overlays/effects.
2. Ajouter une matrice `feature -> manifest -> renderer support -> test`.
3. Mettre en place `validateExportRenderCoverage(manifest)` :
   - `supported: true` seulement si toutes les features critiques sont rendues serveur;
   - `blockingErrors[]` pour les features non rendues;
   - `degradedWarnings[]` seulement pour degradations volontaires et visibles.
4. Refuser l'export pro si `blockingErrors.length > 0`.
5. Ajouter des tests fixtures par feature :
   - texte visible;
   - animation texte visible sur plusieurs frames;
   - transition visible;
   - filtre/colorimetrie detectee;
   - audio present;
   - slow motion si expose.
6. Garantir que l'output a :
   - duration attendue;
   - resolution attendue;
   - container MP4;
   - codec H.264;
   - frames non noires;
   - audio present quand attendu.

Acceptance :

```bash
node --check render-service/src/server.js
npm run test:vibecut-export
```

Un export ne peut passer `Go release beta` que si les features visibles dans le projet test sont rendues serveur ou bloquees avant lancement.

## Phase 6 - Securite Renderer Et Secrets

Objectif : reduire le risque du renderer public.

Etat actuel : le POST sans signature est refuse en 401, mais Cloud Run reste public avec HMAC.

Actions recommandees :

1. Preferer Cloud Run prive.
2. Donner `roles/run.invoker` au service account Functions uniquement.
3. Appeler Cloud Run avec ID token/OIDC depuis Functions.
4. Migrer `EXPORT_SIGNING_SECRET` vers Secret Manager si HMAC conserve.
5. Ajouter timestamp/nonce si HMAC reste en defense-in-depth.
6. Tourner le secret HMAC qui a ete affiche/inspecte pendant les tests.

Acceptance :

- POST non authentifie vers `/render` refuse;
- Function peut appeler le renderer;
- secret absent des sorties publiques et du repo.

## Phase 7 - Orchestration Async Et Firestore Progress

Objectif : ne pas bloquer la callable pendant tout FFmpeg en production.

Architecture cible :

```text
UI
  -> createVideoExportJob callable
  -> Firestore job queued
  -> worker serveur / Cloud Tasks / Cloud Run Job
  -> renderer lit job + manifest
  -> Firestore progress/running/ready/failed
  -> UI ecoute Firestore
```

Actions :

1. `createVideoExportJob` cree le job et retourne vite `{ jobId }`.
2. Un worker serveur lance le rendu.
3. Le renderer ou worker met a jour `progress`, `stage`, `logs` bornes.
4. `cancelVideoExportJob` marque cancellation request.
5. `retryVideoExportJob` relance vraiment un rendu serveur ou reste masque cote UI tant que non implemente.

Acceptance :

- UI survit au refresh navigateur;
- job continue sans onglet ouvert;
- cancel ne laisse pas un job `ready` ecraser un job annule.

## Phase 8 - Backoffice Couts Et Exports

Objectif : suivre exports et couts avant release.

Etat actuel : backoffice owner-scoped avec estimation interne.

Actions :

1. Ajouter une vraie vue admin globale via callable serveur/admin claim.
2. Afficher :
   - exports jour/semaine/mois;
   - ready/failed/cancelled/running;
   - cout estime;
   - temps moyen;
   - taille output;
   - erreurs recentes.
3. Logger par job :
   - elapsedMs Cloud Run;
   - CPU/RAM config;
   - output size;
   - source size;
   - retries;
   - user/plan.
4. Documenter que ce n'est pas la facture Google officielle.
5. Preparer Billing Export BigQuery plus tard pour rapprocher estimation et facture reelle.

Acceptance :

```bash
npm run test:backoffice-export-telemetry
```

## Phase 9 - Smoke Live Final Avec Deux Videos K1

Objectif : valider le comportement reel avant release.

Preconditions :

- Phase 1 UI Firebase terminee;
- Phase 2 UX export lisible;
- Phase 3 destination desktop/PC terminee;
- Phase 4 quotas minimum actifs;
- Phase 5 renderer serveur pro couvre les features visibles du projet test;
- confirmation utilisateur explicite pour payer le smoke live.

Fixture officielle :

- dossier source : `C:\Users\pcpor\OneDrive\Bureau\K1`;
- video 1 recommandee : `MVI_0126.MP4` (~27 Mo, 3s observe);
- choisir la deuxieme video la plus courte disponible au moment du test;
- appliquer au moins une rotation gauche `orientationRotation: 270`;
- exporter en vertical `1080x1920`, MP4, 30 FPS, trim court;
- ne lancer qu'un seul job.

Validation attendue :

- upload Storage des deux sources;
- job Firestore cree et lisible;
- renderer Cloud Run status `ready`;
- output MP4 dans Storage;
- download desktop/PC fonctionne;
- output local lisible;
- duree approx somme des trims;
- resolution `1080x1920`;
- aucune feature critique du projet test n'est ignoree silencieusement;
- cout estime affiche dans UI/backoffice.

Ce smoke deux videos valide surtout le socle media : upload, concat, rotation, output et download. Il ne suffit pas a declarer le rendu pro complet.

Fixtures pro obligatoires apres le smoke K1 :

1. projet avec texte statique visible;
2. projet avec animation texte visible sur plusieurs frames;
3. projet avec transition fade/crossfade visible;
4. projet avec colorimetrie/filtres detectables;
5. projet avec musique ou audio externe et volume;
6. projet combinant au moins deux videos + texte + transition + filtre + audio.

Chaque fixture doit produire un MP4 final et verifier au minimum duree, resolution, codec, frames non noires, presence visuelle attendue et presence audio quand applicable.

Commandes de verification possibles :

```bash
npm run test:vibecut-export
node --check render-service/src/server.js
git diff --check
```

Ne pas repeter le smoke live si le premier job est `ready` et que les validations passent. Faire un bilan et demander confirmation avant tout test supplementaire.

## Phase 10 - Source Of Truth Deploiement

Objectif : la prod doit etre reproductible depuis le repo + secrets.

Actions :

1. Mettre les variables publiques App Hosting dans `apphosting.yaml`.
2. Garder les secrets dans Secret Manager.
3. Documenter les commandes deploy :
   - rules;
   - Functions;
   - Cloud Run;
   - App Hosting;
   - cleanup Artifact Registry.
4. Ajouter note de rotation des secrets HMAC et Meta/Firebase si exposes pendant debug.

## Validation Finale

Avant de dire `Go release beta`, executer :

```bash
npm run test:vibecut-export
npm run test:backoffice-export-telemetry
npm --prefix functions run lint
node --check render-service/src/server.js
npm run test:emulators
npm run lint
npm run build
git diff --check
```

Si `npm run test:emulators`, `npm run lint` ou `npm run build` sont impossibles localement, documenter la raison exacte et ne pas transformer le statut en `Go release beta`.

## Definition De Fini

Le chantier est fini seulement si :

- l'UI `Export Pro` utilise Firebase en production sans patch manuel;
- le navigateur est traite comme cockpit de pilotage, pas comme moteur de verite du rendu final;
- le manifest canonique represente toutes les features exportables;
- l'utilisateur voit des etats de chargement/export comprehensibles;
- l'utilisateur peut choisir ou enregistrer/telecharger le MP4 final sur desktop/PC;
- les quotas serveur limitent duree, resolution, fps, clips et cout;
- les paths Storage sont owner-scoped cote client et serveur;
- le renderer serveur couvre le palier pro annonce : textes, animations, transitions, colorimetrie, audio et video;
- les features non rendues serveur sont bloquees ou masquees avant export pro;
- le backoffice affiche exports et cout estime;
- le smoke live deux videos K1 passe;
- les fixtures pro texte/animation/transition/colorimetrie/audio passent;
- les tests locaux/emulateurs/lint/build passent ou les blocages sont documentes;
- `map.md` est a jour;
- aucun secret n'est ajoute au repo.
