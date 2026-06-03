# Audit export Vibe_CUT - 2026-06-03

## Verdict

L'export actuel de Vibe_CUT n'est pas comparable a CapCut ou Canva. Il capture un canvas dans le navigateur avec `MediaRecorder`, donc il depend du rendu temps reel, du scheduler du navigateur, du codec disponible et du debit que le navigateur accepte vraiment. Ce pipeline peut depanner pour un export brouillon, mais il ne peut pas garantir un master MP4 1080p/60 fluide, stable, avec rotations, filtres, textes, transitions et audio synchronise.

La solution produit doit etre a deux niveaux :

- export rapide local : WebCodecs + canvas/OffscreenCanvas + muxer MP4/WebM quand le navigateur le supporte ;
- export final fiable : job serveur FFmpeg sur Cloud Run, orchestre par Firebase Functions/Firestore/Storage.

## Indices marche

CapCut Web expose une UI d'export proche de celle observee dans les captures : resolution, qualite, frequence d'images, format, progression longue. Sa documentation indique que l'export web hautes resolutions depend du support d'encodage materiel et d'une connexion stable pour le rendu cloud.

Source : https://www.capcut.com/help/export-videos-in-capcut

Canva confirme encore plus clairement ce modele dans son API officielle : l'export est cree comme un job asynchrone, avec statut `in_progress`, `success` ou `failed`, puis une URL de telechargement temporaire. Pour le MP4, Canva demande une qualite video explicite : horizontal/vertical en 480p, 720p, 1080p ou 4K.

Source : https://www.canva.dev/docs/connect/api-reference/exports/create-design-export-job/

Conclusion : les leaders ne se contentent pas d'enregistrer la preview du navigateur. Ils utilisent un pipeline de rendu/encodage controle, souvent cloud, avec progression et fichier final genere.

## Diagnostic code Vibe_CUT

Fichiers principaux :

- `src/features/vibefx-studio/video/panels/ExportVideoPanel.jsx`
- `src/features/vibefx-studio/video/engine/VideoEngine.js`
- `src/features/vibefx-studio/video/model/timelineModel.js`
- `src/features/vibefx-studio/video/preview/VideoPreview.jsx`

Fonctionnement actuel :

1. `useVideoExportController()` construit un plan de timeline via `resolveTimelineRenderPlan()`.
2. Le FPS export vient de `resolveExportFps()`, plafonne a 60.
3. Le preflight verifie codec, timeline, transitions, audio, droits et couverture frame.
4. L'export cree un canvas cache a la resolution cible.
5. Le canvas est capture avec `canvas.captureStream()` puis enregistre avec `MediaRecorder`.
6. Le moteur dessine les frames, les textes, les filtres et les rotations dans ce canvas.
7. Les chunks du recorder sont assembles en Blob puis telecharges.

Problemes :

- `MediaRecorder` est un outil d'enregistrement temps reel, pas un moteur de rendu offline.
- `captureStream()` ne garantit pas une frame encodee par frame logique de timeline.
- Les bitrates demandes a `MediaRecorder` sont des intentions ; le navigateur peut les ignorer, les plafonner ou produire un fichier tres compresse.
- En 60 FPS, chaque frame a seulement 16,7 ms pour decoder, chercher, dessiner, filtrer, mixer et encoder. Si une etape depasse ce budget, le resultat devient saccade.
- `renderFrame()` peut changer `video.currentTime` sans attendre que la frame cible soit reellement decodee, ce qui cause frames dupliquees ou anciennes frames.
- Le cadrage actuel est un rendu `cover` : il remplit le format cible, donc il peut cropper. Il faut exposer clairement `cover`, `contain`, `stretch interdit`, et `position`.

## Pourquoi les fichiers sont trop petits

Ordre de grandeur : taille fichier ~= `(bitrate video + audio) * duree / 8`.

Pour un fichier de 42 Mo :

- 8 s : environ 42 Mbps ;
- 12 s : environ 28 Mbps ;
- 20 s : environ 17 Mbps.

Un export Vibe_CUT a 5 ou 13 Mo pour une duree similaire indique un bitrate effectif plus bas que celui attendu pour un rendu social propre. Pour 1080p60, viser 16 a 40 Mbps selon duree et contenu est coherent. YouTube recommande par exemple 12 Mbps pour upload SDR 1080p60, mais un master local premium peut monter plus haut avant compression par les reseaux.

Source : https://support.google.com/youtube/answer/1722171

## Comparatif technique

### MediaRecorder + canvas.captureStream

Avantages :

- simple ;
- fonctionne sans serveur ;
- bon pour exports rapides ou brouillons.

Limites :

- temps reel obligatoire ;
- FPS non garanti ;
- bitrate non strict ;
- MP4/H.264 souvent indisponible selon navigateur ;
- audio sync fragile ;
- mauvais choix pour master final.

MDN indique que `requestFrame()` permet de demander une frame canvas, et que `captureStream(0)` empeche la capture automatique pour ne capturer que les frames demandees. Cela reste une capture de stream, pas un encodeur offline deterministe.

Source : https://developer.mozilla.org/en-US/docs/Web/API/CanvasCaptureMediaStreamTrack/requestFrame

### WebCodecs + muxer

Avantages :

- controle bas niveau des `VideoFrame`, timestamps, encodeur et bitrate ;
- peut tourner en worker ;
- mieux adapte a un export navigateur avance.

Limites :

- support variable selon navigateur/materiel ;
- il faut un muxer MP4/WebM ;
- audio AAC/MP4 reste plus complexe ;
- performance mobile incertaine.

Sources :

- https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API
- https://developer.chrome.com/docs/web-platform/best-practices/webcodecs

### FFmpeg serveur Cloud Run

Avantages :

- pipeline reproductible ;
- MP4 H.264/AAC fiable ;
- FPS, GOP, bitrate/CRF, scale, crop, pad, rotate, drawtext, overlay, amix controlables ;
- progression serveur, retry, URL signee, fichier final stable ;
- meilleure correspondance avec CapCut/Canva.

Limites :

- cout infra ;
- upload obligatoire ;
- attente export ;
- demande une vraie gestion de jobs.

Google documente un flux Cloud Run Jobs + FFmpeg, y compris avec GPU et `h264_nvenc`.

Source : https://docs.cloud.google.com/run/docs/tutorials/video-encoding

FFmpeg fournit les filtres necessaires pour `fps`, `scale`, `crop`, `pad`, `rotate`, overlays et audio.

Source : https://ffmpeg.org/ffmpeg-filters.html

Firebase Storage est adapte au stockage des fichiers utilisateurs et au traitement serveur associe.

Source : https://firebase.google.com/docs/storage/

## Architecture cible A a Z

### 1. Manifeste export canonique

Creer un objet `ExportManifest` versionne :

- projet : id, nom, utilisateur, duree, preset ;
- rendu : width, height, fps, format, codec, bitrate ou CRF ;
- clips : storagePath, trimStart, trimEnd, startTime, duration, speed, rotation, fitMode, crop, volume ;
- filtres : exposition, contraste, saturation, temperature, teinte, shadows, midtones, highlights, vignette, grain ;
- textes : contenu, police, taille, couleur, start/end, position ;
- audio : pistes, volumes, trims, start/end, droits ;
- transitions : type, start, duration, from/to ;
- audit : hash sources, version moteur, date.

Ce manifeste devient la source de verite pour preview, export local et export serveur.

### 2. Upload sources vers Firebase Storage

Au moment de l'import ou avant export final :

- uploader chaque video originale dans Storage ;
- conserver metadata : width, height, fps, duration, codec, orientation, size ;
- garder aussi l'URL locale pour preview rapide ;
- ne jamais exporter final depuis un Blob local invisible au serveur.

### 3. Job Firestore

Collection recommandee : `videoExportJobs`.

Statuts :

- `queued`
- `uploading_sources`
- `rendering`
- `finalizing`
- `ready`
- `failed`
- `cancelled`

Champs utiles :

- `progress`
- `phaseLabel`
- `estimatedOutputSize`
- `outputStoragePath`
- `downloadUrl`
- `errorCode`
- `errorMessage`
- `createdAt`, `startedAt`, `completedAt`

### 4. Orchestration Firebase Functions

Une callable Function :

- valide auth ;
- verifie droits et limites ;
- cree le job Firestore ;
- declenche Cloud Run Job ou Cloud Run service ;
- renvoie `jobId`.

Une seconde callable peut annuler/retry.

### 5. Rendu Cloud Run FFmpeg

Le renderer :

1. lit le manifeste ;
2. telecharge les sources depuis Storage ;
3. construit un graph FFmpeg ;
4. applique rotations, scale/crop/pad, filtres, textes, audio ;
5. encode en MP4 H.264/AAC ;
6. ecrit le resultat dans Storage ;
7. met a jour Firestore.

Presets :

- `Social 1080p30` : H.264, AAC, CRF 18-20 ou ABR 10-16 Mbps ;
- `Social 1080p60` : H.264, AAC, CRF 18-20 ou ABR 16-40 Mbps ;
- `Preview 720p30` : ABR 4-8 Mbps ;
- `Master haut debit` : 30-60 Mbps selon duree et contenu.

### 6. UI export

L'UI doit se rapprocher de CapCut :

- resolution : 720p, 1080p, 2K/4K plus tard ;
- qualite : recommande, haute, master ;
- FPS : 30, 60, auto source ;
- format : MP4 par defaut ;
- estimation taille ;
- choix `Export rapide navigateur` vs `Export final cloud` ;
- progression modale persistante ;
- statut telechargement quand `ready` ;
- message clair : fermer la page peut interrompre un export local, mais pas un export cloud.

### 7. Fallback local

Garder un export local seulement comme secours :

- label : `Export rapide navigateur (brouillon)` ;
- limiter a 720p/1080p court ;
- ne pas promettre 60 FPS garanti ;
- idealement migrer vers WebCodecs + muxer au lieu de MediaRecorder.

## Decision recommandee

Priorite 1 : arreter de presenter `MediaRecorder` comme export final.

Priorite 2 : implementer le job export serveur Cloud Run + FFmpeg pour les fichiers MP4 propres.

Priorite 3 : garder WebCodecs comme evolution locale, utile pour des exports rapides et pour reduire la charge serveur quand le navigateur est solide.

Cette direction explique pourquoi CapCut sort des fichiers a 42 Mo avec une vraie progression : le produit rend et encode un fichier final, il ne se contente pas de capturer une preview canvas.
