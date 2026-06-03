# MEGAPROMPT - Vibe_CUT Export Pro Cloud

## Mission

Construire un export video final de qualite professionnelle pour Vibe_CUT, comparable dans l'intention a un rendu Premiere Pro, DaVinci Resolve, CapCut Web ou Canva, sans se contenter de capturer la preview navigateur.

Objectif produit :

- conserver la fluidite et la qualite percue des sources originales ;
- appliquer les modifications Vibe_CUT : rotation, crop/fit, colorimetrie, filtres, textes, transitions, audio, format social ;
- produire un vrai fichier MP4 final, stable, fluide, compatible reseaux sociaux ;
- accepter que l'export prenne du temps si la qualite le demande ;
- afficher une UI d'export claire, precise, rassurante, avec etapes, progression, logs lisibles, erreurs et reprise ;
- preparer toute l'architecture local-first, puis permettre a l'utilisateur de configurer Firebase/Google Cloud a la fin.

Ne pas presenter `MediaRecorder + canvas.captureStream()` comme export final pro. Cet export doit rester un fallback "rapide navigateur / brouillon" uniquement.

## Contexte Technique Actuel

Le projet tourne actuellement en local sur `localhost`. Aucun projet Firebase definitif n'est encore configure.

Le code video existant est principalement dans :

- `src/features/vibefx-studio/video/panels/ExportVideoPanel.jsx`
- `src/features/vibefx-studio/video/engine/VideoEngine.js`
- `src/features/vibefx-studio/video/model/timelineModel.js`
- `src/features/vibefx-studio/video/preview/VideoPreview.jsx`
- `src/features/vibefx-studio/video/store/videoStore.js`

Lire avant toute implementation :

1. `AGENTS.md`
2. `map.md`
3. `seo.md`
4. `MEGAPROMPT.md`
5. `docs/vibecut-export-architecture-audit-2026-06-03.md`

Respecter les regles du projet :

- ne pas modifier le projet source externe ;
- ne pas toucher a `node_modules/`, `.next/`, `.git/`, `dist/` ;
- mettre a jour `map.md` pour tout fichier cree ou modification structurelle ;
- ne jamais hardcoder de secrets Firebase/Google Cloud ;
- garder les surfaces studio/app en `noindex`.

## Diagnostic A Respecter

L'export navigateur actuel est fragile car il capture une preview canvas en temps reel.

Problemes connus :

- FPS non garanti ;
- frames sautees ou dupliquees ;
- bitrate navigateur non strict ;
- MP4/H.264 `MediaRecorder` non fiable selon navigateur ;
- audio sync fragile ;
- distorsions/crops mal explicites ;
- fichiers trop petits par rapport a un rendu pro ;
- impossible de garantir un rendu 1080p60 propre comme un logiciel desktop.

Conclusion : le rendu final doit etre reconstruit a partir des sources originales et d'un manifeste de montage, puis encode par FFmpeg.

## Architecture Cible

Construire une architecture a deux niveaux.

### Niveau 1 - Export Rapide Navigateur

Usage :

- brouillon ;
- preview client ;
- export court et non garanti ;
- fallback si aucun backend n'est configure.

Label UI obligatoire :

`Export rapide navigateur (brouillon)`

Interdictions UX :

- ne pas promettre 60 FPS garanti ;
- ne pas le presenter comme rendu final pro ;
- afficher clairement les limites.

Evolution future :

- remplacer progressivement `MediaRecorder` par `WebCodecs + muxer MP4/WebM` si disponible.

### Niveau 2 - Export Pro Serveur

Usage :

- export final principal ;
- MP4 propre ;
- qualite et fluidite prioritaires ;
- progression fiable ;
- resultat telechargeable depuis Storage.

Stack recommandee :

- Next.js App Router / app locale pour UI ;
- Firebase Storage pour les sources et rendus ;
- Firestore pour les jobs et statuts ;
- Firebase Functions pour orchestration/auth/validation ;
- Cloud Run Job ou Cloud Run service pour le rendu FFmpeg ;
- FFmpeg CPU `libx264` pour le mode qualite pro ;
- option GPU NVENC plus tard pour export rapide serveur.

Important : Firebase Functions ne doivent pas faire l'encodage lourd. Elles creent et surveillent le job. Cloud Run execute FFmpeg.

## Modes Export A Implementer

### Export Pro

Mode principal.

Priorite :

- qualite ;
- fluidite ;
- compatibilite MP4 ;
- taille coherente ;
- temps d'export accepte.

Preset FFmpeg cible :

```bash
-c:v libx264
-preset slow
-crf 17
-profile:v high
-pix_fmt yuv420p
-r 60
-c:a aac
-b:a 256k
-movflags +faststart
```

Variantes :

- 1080p30 : CRF 17-18 ;
- 1080p60 : CRF 16-18 ;
- 720p preview : CRF 20-22 ;
- Master : CRF 14-16, fichier plus lourd.

### Export Master

Usage :

- qualite maximale ;
- fichier lourd ;
- reutilisation dans un autre logiciel.

Options :

- H.264 CRF 14-16 ;
- plus tard : ProRes 422 HQ si besoin, mais attention aux fichiers enormes.

### Export Rapide Serveur

Usage :

- rendu rapide ;
- qualite correcte ;
- moins prioritaire que Export Pro.

Preset possible :

```bash
-c:v h264_nvenc
-preset p5
-cq 18
-b:v 0
-c:a aac
-b:a 192k
-movflags +faststart
```

Ne pas le choisir par defaut si l'utilisateur privilegie la qualite.

## Manifeste Export Canonique

Creer un manifeste versionne, serialisable en JSON.

Nom suggere :

`ExportManifest`

Emplacement suggere :

`src/features/vibefx-studio/video/export/exportManifest.js`

Champs minimum :

```js
{
  version: 1,
  project: {
    id,
    name,
    userId,
    duration,
    createdAt
  },
  render: {
    width,
    height,
    fps,
    format: "mp4",
    videoCodec: "h264",
    audioCodec: "aac",
    qualityMode: "pro",
    crf,
    preset,
    targetBitrate,
    fitMode
  },
  clips: [
    {
      id,
      sourceStoragePath,
      localPreviewUrl,
      name,
      startTime,
      duration,
      trimStart,
      trimEnd,
      speed,
      volume,
      orientationRotation,
      crop,
      fitMode,
      filters
    }
  ],
  transitions: [],
  textOverlays: [],
  audioTracks: [],
  rightsManifest: [],
  audit: {
    sourceHashes,
    engineVersion,
    generatedAt
  }
}
```

Ce manifeste doit devenir la source de verite pour :

- export pro serveur ;
- export local futur ;
- reprise de job ;
- debug ;
- tests.

## Local-First Avant Firebase

Comme le projet Firebase n'est pas encore cree, implementer d'abord une couche d'abstraction.

Creer des services qui fonctionnent avec un adaptateur local mock :

- `exportJobService`
- `exportStorageService`
- `exportRenderService`

Modes :

- `localMock` : pas de Firebase, simule creation job, progression et resultat ;
- `firebase` : active plus tard via variables d'environnement ;
- `server` : Cloud Run reel.

Variables d'environnement a prevoir sans les remplir :

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_APP_ID=
GOOGLE_CLOUD_PROJECT=
EXPORT_RENDERER_URL=
EXPORT_SIGNING_SECRET=
```

Ne jamais hardcoder ces valeurs.

En local, l'UI doit fonctionner avec `localMock` pour tester le workflow complet sans vraie infra.

## Workflow Utilisateur

### 1. Preflight

Avant de lancer :

- verifier qu'il y a des clips ;
- verifier resolution cible ;
- verifier FPS cible ;
- verifier duree ;
- verifier sources originales disponibles ;
- verifier droits audio ;
- estimer taille finale ;
- estimer temps ;
- afficher le mode : `Export Pro`, `Export Master`, `Export Rapide`.

UI :

- statut `Pret`, `Avertissement` ou `Bloque` ;
- messages courts ;
- bouton principal clair.

### 2. Preparation

Phase visible :

`Preparation des sources`

Actions :

- generation du manifeste ;
- verification des fichiers ;
- upload sources manquantes vers Storage ;
- calcul metadata ;
- creation job Firestore.

Progression indicative :

- 0-15%.

### 3. File D'attente

Phase visible :

`Mise en file de rendu`

Actions :

- creation du job Cloud Run ;
- attente worker disponible ;
- verrou anti-doublon.

Progression indicative :

- 15-25%.

### 4. Rendu Video

Phase visible :

`Rendu video`

Actions :

- lecture sources originales ;
- application trims, speed, rotation, scale/crop/pad ;
- application colorimetrie ;
- transitions ;
- textes ;
- composition frame par frame.

Progression idealement issue de FFmpeg :

- parser `time=00:00:04.20` dans stderr ;
- convertir en pourcentage selon duree totale.

Progression indicative :

- 25-80%.

### 5. Encodage Final

Phase visible :

`Encodage MP4`

Actions :

- H.264/AAC ;
- CRF/preset ;
- faststart ;
- controle taille.

Progression indicative :

- 80-95%.

### 6. Finalisation

Phase visible :

`Finalisation`

Actions :

- upload MP4 final dans Storage ;
- generation lien de telechargement ;
- sauvegarde manifest ;
- cleanup fichiers temporaires ;
- statut `ready`.

Progression :

- 95-100%.

### 7. Telechargement

UI :

- bouton `Telecharger MP4` ;
- taille fichier ;
- duree ;
- resolution ;
- FPS ;
- mode qualite ;
- date expiration lien ;
- bouton `Relancer l'export`.

## UI / UX Export

Construire une experience de vrai logiciel.

### Panneau Export

Sections :

- Format : TikTok/Reel/Story/YouTube/Post/Custom ;
- Resolution : 720p, 1080p, 2K plus tard, 4K plus tard ;
- FPS : Auto, 30, 60 ;
- Qualite : Preview, Pro, Master ;
- Fit : Cover, Contain, Fill interdit ou explicite, Position ;
- Format fichier : MP4 par defaut ;
- Estimation : taille, temps, cout approximatif si cloud ;
- Preflight : erreurs/warnings.

### Modale De Rendu

Obligatoire :

- titre : `Export Pro MP4` ;
- grande barre de progression ;
- pourcentage ;
- phase actuelle ;
- sous-etape ;
- temps ecoule ;
- estimation restante si disponible ;
- bouton `Annuler` ;
- message : `Tu peux laisser cet export tourner. Le rendu final est calcule sur serveur.`

Pour localMock :

- simuler les phases pour valider UX ;
- ne pas generer de faux vrai fichier.

### Historique Des Exports

Ajouter une section :

- derniers exports ;
- statut ;
- taille ;
- date ;
- bouton telecharger ;
- bouton retry ;
- bouton supprimer.

### Etats D'erreur

Prevoir :

- upload source echoue ;
- source introuvable ;
- droits audio bloquants ;
- quota Firebase/Cloud Run ;
- timeout renderer ;
- FFmpeg exit code non zero ;
- Storage write failed ;
- job annule ;
- navigateur offline.

Chaque erreur doit afficher :

- message humain ;
- code technique ;
- action conseillee ;
- bouton retry si possible.

## Cadrage Et Distorsions

Ne jamais deformer silencieusement.

Fit modes :

- `cover` : remplit, crop possible ;
- `contain` : garde tout, bandes possibles ;
- `fill` : deforme, a eviter et a marquer comme avance ;
- `customCrop` : crop controle.

UI obligatoire :

- select fit mode ;
- indicateur crop actif ;
- preview des safe bounds ;
- position X/Y pour cover/custom.

Le manifeste doit stocker `fitMode` et `crop`.

## Colorimetrie Pro

Le rendu serveur doit approximer ou reproduire les controles Vibe_CUT :

- exposure ;
- contrast ;
- pivot ;
- brightness ;
- saturation ;
- vibrance approximation ;
- temperature ;
- tint ;
- hue ;
- shadows ;
- midtones ;
- highlights ;
- fade ;
- vignette ;
- grain.

Important :

- documenter les approximations FFmpeg ;
- assurer que preview et export restent coherents ;
- ajouter des tests visuels simples avec frames de reference.

## Commande FFmpeg Cible

La commande exacte sera construite par code, mais le rendu pro doit tendre vers :

```bash
ffmpeg \
  -i input.mp4 \
  -filter_complex "[0:v]fps=60,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p[v]" \
  -map "[v]" \
  -map 0:a? \
  -c:v libx264 \
  -preset slow \
  -crf 17 \
  -profile:v high \
  -c:a aac \
  -b:a 256k \
  -movflags +faststart \
  output.mp4
```

Pour plusieurs clips, transitions, textes et audio, generer un `filter_complex` robuste ou passer par des rendus intermediaires segmentes si necessaire.

## Implementation Par Etapes

### Etape 1 - Audit Et Stabilisation

- Lire le code export actuel.
- Marquer l'export navigateur comme fallback brouillon.
- Ne pas supprimer brutalement les anciennes fonctions.
- Ajouter le rapport d'architecture au flux de travail.

### Etape 2 - Manifest Canonique

- Creer `exportManifest.js`.
- Ajouter fonctions pures :
  - `buildExportManifest`
  - `validateExportManifest`
  - `estimateExportSize`
  - `resolveExportQualityPreset`
- Tests unitaires/smoke.

### Etape 3 - Services Local-First

- Creer adaptateurs :
  - local mock ;
  - interface Firebase future.
- Creer `videoExportJobs` dans le store ou service dedie.
- Simuler les phases de progression.
- UI complete utilisable en localhost sans Firebase.

### Etape 4 - UI Export Pro

- Refaire panneau export avec modes `Rapide`, `Pro`, `Master`.
- Ajouter modale de rendu.
- Ajouter historique exports.
- Ajouter barre de chargement precise dans preview grand format et panneau export.
- Ajouter states annulation/retry.

### Etape 5 - Firebase Skeleton

Sans config reelle, poser :

- fichiers client Firebase vides/configurables ;
- services Storage/Firestore abstraits ;
- Functions callable stubs ;
- types de jobs ;
- documentation `.env.example`.

Ne pas appeler un vrai projet Firebase tant que les env ne sont pas configurees.

### Etape 6 - Cloud Run Renderer Skeleton

Creer un dossier serveur si adapte, par exemple :

`render-service/`

Contenu :

- Dockerfile avec FFmpeg ;
- endpoint/job runner ;
- lecture manifest ;
- telechargement Storage ;
- commande FFmpeg simple pour POC ;
- upload output ;
- update job progress.

Le renderer doit pouvoir tourner localement avec fichiers locaux avant cloud.

### Etape 7 - Integration Firebase Reelle

Apres configuration utilisateur :

- connecter Firebase App ;
- deploy Firestore/Storage rules ;
- deploy Functions ;
- deploy Cloud Run ;
- tester export 720p court ;
- tester export 1080p30 ;
- tester export 1080p60 ;
- tester erreurs.

## Roadmap Configuration Firebase Pour L'utilisateur

A fournir apres implementation locale :

1. Creer projet Firebase.
2. Activer Authentication si necessaire.
3. Activer Firestore.
4. Activer Storage.
5. Creer projet Google Cloud associe.
6. Activer Cloud Run.
7. Activer Artifact Registry.
8. Activer Cloud Build.
9. Creer service account renderer.
10. Donner permissions minimales :
    - lecture/ecriture Storage sur bucket export ;
    - lecture/ecriture Firestore jobs ;
    - invocation Cloud Run depuis Functions.
11. Remplir `.env.local`.
12. Lancer Firebase emulators si possible.
13. Deployer Functions.
14. Deployer Cloud Run renderer.
15. Tester un export court.
16. Ajouter alertes budget Google Cloud.

## Tests Et Gates

Avant livraison :

- `npm run lint`
- `npm run build`
- smoke model export manifest ;
- smoke localMock job progress ;
- smoke UI export modal ;
- test d'un export local renderer avec FFmpeg si disponible ;
- test preflight erreurs ;
- verifier que le rendu navigateur fallback est bien labelise brouillon.

Quand Firebase sera configure :

- test upload source ;
- test job Firestore ;
- test renderer local ;
- test renderer Cloud Run ;
- test Storage output ;
- test download URL ;
- test annulation/retry ;
- test 1080p60 sur clip reel ;
- verifier taille fichier et lecture fluide.

## Sources A Respecter

- CapCut export web : https://www.capcut.com/help/export-videos-in-capcut
- Canva export jobs : https://www.canva.dev/docs/connect/api-reference/exports/create-design-export-job/
- MDN canvas requestFrame : https://developer.mozilla.org/en-US/docs/Web/API/CanvasCaptureMediaStreamTrack/requestFrame
- MDN WebCodecs : https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API
- Chrome WebCodecs : https://developer.chrome.com/docs/web-platform/best-practices/webcodecs
- Cloud Run FFmpeg GPU jobs : https://docs.cloud.google.com/run/docs/tutorials/video-encoding
- Cloud Run pricing : https://cloud.google.com/run/pricing
- FFmpeg filters : https://ffmpeg.org/ffmpeg-filters.html
- YouTube recommended upload encoding : https://support.google.com/youtube/answer/1722171

## Definition De Fini

Le travail est considere reussi quand :

- l'utilisateur peut lancer un export pro depuis localhost en mode mock ;
- l'UI montre toutes les phases comme un vrai logiciel ;
- le code est pret a recevoir Firebase sans hardcode ;
- le manifeste export decrit toute la timeline ;
- le renderer FFmpeg est scaffold ou implemente localement selon l'etape demandee ;
- l'export navigateur n'est plus vendu comme final pro ;
- une roadmap Firebase claire est fournie pour brancher le vrai projet ;
- `map.md` est a jour.
