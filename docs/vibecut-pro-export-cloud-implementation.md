# Vibe_CUT Export Pro Cloud - Implementation Notes

Date : 2026-06-03

## Etat implemente

- `ExportManifest` canonique version 1 dans `src/features/vibefx-studio/video/export/exportManifest.js`.
- Preflight Export Pro separe du preflight navigateur : timeline, frames, audio, droits, sources, MP4/H.264/AAC.
- Services local-first :
  - `exportStorageService.js` verifie les sources locales en `localMock` et uploade les sources vers Firebase Storage en mode `firebase`.
  - `exportRenderService.js` simule les phases Cloud Run/FFmpeg en `localMock` et appelle `createVideoExportJob` en mode `firebase`.
  - `exportJobService.js` orchestre job, progression, annulation, retry et historique.
- UI Export Pro MP4 dans `ExportVideoPanel.jsx` avec modes Preview/Pro/Master, fit cover/contain/custom/fill, estimation taille/temps, modale de rendu et logs.
- L'ancien pipeline `MediaRecorder + canvas.captureStream()` reste disponible uniquement comme `Export rapide navigateur (brouillon)`.
- `functions/src/videoExport.js` expose `createVideoExportJob`, `cancelVideoExportJob` et `retryVideoExportJob`, avec auth, App Check, validation manifeste, statut Firestore et appel Cloud Run signe.
- `render-service/` contient un MVP Cloud Run FFmpeg : validation signature, download Storage, concat video simple, encode MP4 H.264/AAC, upload output Storage.

## Limites localMock

Le mode `localMock` ne genere pas de fichier MP4 reel. Il valide le workflow produit et l'UI de progression sans presenter un faux rendu comme export final.

En mode `firebase`, le renderer produit un `output.storagePath`. La Function tente aussi de generer un `output.downloadUrl` signe pendant 1 heure ; si l'environnement IAM ne permet pas la signature, l'export reste valide avec le chemin Storage owner-scoped.

## Limites MVP Firebase/FFmpeg

Le chemin Firebase est raccorde mais volontairement minimal :

- les sources video/audio sont uploadees dans `users/{uid}/exports/{exportId}/sources/...` ;
- `createVideoExportJob` appelle Cloud Run via `EXPORT_RENDERER_URL` avec signature HMAC `EXPORT_SIGNING_SECRET` ;
- Cloud Run genere un MP4 reel depuis les clips source et l'upload dans `users/{uid}/exports/{jobId}/outputs/export.mp4` ;
- les transitions, textes, vitesses, rotations, filtres avances et mix audio complet sont encore declares en warnings et doivent etre traduits en `filter_complex` FFmpeg avant promesse de rendu final identique a la preview ;
- la progression Firestore est coarse (`queued/rendering/ready/failed`) tant qu'il n'y a pas de callback de progression ou worker queue.

## Approximation colorimetrie FFmpeg cible

Les controles Vibe_CUT doivent etre traduits en filtres FFmpeg par le renderer reel :

- exposure : `eq=brightness` ou compensation via `lut` selon plage ;
- brightness/contrast/saturation : `eq=brightness:contrast:saturation` ;
- temperature/tint : `colorbalance` ou `curves` approximatives ;
- hue : `hue=h=...` ;
- shadows/midtones/highlights : `curves` ou LUT 3D future ;
- fade/vignette/grain : `colorchannelmixer`, `vignette`, `noise`.

Les approximations doivent etre testees avec frames de reference avant activation production.

## Roadmap Firebase / Cloud Run

1. Creer le projet Firebase et activer Auth, Firestore, Storage.
2. Ajouter `NEXT_PUBLIC_FIREBASE_*` et garder `NEXT_PUBLIC_VIBECUT_EXPORT_MODE=localMock` jusqu'au smoke local.
3. Deployer les rules Firestore/Storage owner-scoped pour `videoExportJobs`, sources et outputs export.
4. Builder et deployer `render-service/` sur Cloud Run.
5. Renseigner `EXPORT_RENDERER_URL` cote Functions et `EXPORT_SIGNING_SECRET` cote Functions + Cloud Run.
6. Donner au service account Cloud Run le droit minimal Storage Object Viewer/Creator sur le bucket export.
7. Basculer `NEXT_PUBLIC_VIBECUT_EXPORT_MODE=firebase`.
8. Tester 720p court, 1080p30, 1080p60, source manquante, Storage write failed, timeout renderer et App Check.
9. Ajouter un helper de refresh URL signee ou de download authenticated pour les exports anciens.
10. Completer le mapping FFmpeg pour transitions, textes, vitesses, rotations, filtres et mix audio.
