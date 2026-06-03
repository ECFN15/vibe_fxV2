# Audit UI/UX Vibe_CUT - 2026-06-02

## Resume executif

- Verdict global : Vibe_CUT ressemble deja a un vrai editeur video sur desktop/laptop, surtout grace a la timeline, aux presets sociaux, aux smokes orientation/ralenti et au nouveau mode grand format. Le niveau produit baisse nettement sur mobile grand format et sur l'import musique catalogue.
- Niveau de confiance : eleve pour desktop/laptop, moyen-eleve pour mobile. L'export final complet avec musique n'a pas pu etre valide car le smoke officiel bloque avant l'ajout musique.
- Nombre de findings : P0 0 / P1 3 / P2 6 / P3 3.
- Les 3 priorites : reparer l'import musique catalogue, rendre le grand format mobile contraint a 390px, clarifier les controles format/rotation sur mobile.

## Tests lances

| Test | Resultat | Notes |
| --- | --- | --- |
| `git status --short` | OK, worktree sale | Modifications existantes conservees, aucun revert. |
| Fixtures `videotest/*.mp4` | OK | 11 MP4 disponibles. |
| Serveur `http://localhost:3000/studio` | OK | HTTP 200. |
| `npm run lint` | OK avec warnings | 12 warnings existants hors blocage Vibe_CUT direct. |
| `npm --prefix functions run lint` | OK | Syntax checks Functions OK. |
| `npm run build` | OK avec warning | Warning Turbopack/NFT via `src/app/api/music/local-file-import/route.js`. |
| `npm run test:video-ui` | ECHEC partiel | 7/8 passent. Echec sur `Vibe_CUT edits, reorders, and exports a short montage` : apres clic `music-catalog-import-track`, le body reste a `0 pistes`. |
| `npm run test:vibecut-tools` | OK | 2/2 passent. |
| `npm run test:vibecut-orientation` | OK | Rotation/orientation/FPS desktop passent. |
| `npm run test:vibecut-slowmo` | OK | Import MKV HDR/SDR et ralenti passent. |

## Parcours verifies

| Parcours | Desktop | Mobile | Notes |
| --- | --- | --- | --- |
| Ouvrir `/studio` puis VibeCut | OK | OK | Onglet accessible. |
| Importer 2 videos MP4 | OK | OK | Canvas non noir en preview normale. |
| Lecture normale | OK | OK partiel | Le temps avance, controls visibles. |
| Preview grand format | OK | KO mobile | Desktop/laptop propre ; mobile deborde a 593px pour un viewport 390px. |
| Rail/liste clips grand format | OK | Partiel | Rail desktop OK ; mobile tray visible mais largeur cassee. |
| Changer 9:16 / 16:9 | OK | Partiel | Canvas change bien, mais format normal mobile peu decouvrable. |
| Rotation 90 deg | OK | Partiel | Badge `90 DEG` visible apres selection ; action peu evidente avant selection. |
| Export panel/preflight | OK visuel | Non verifie mobile complet | Panneau ouvre, preflight visible. Export complet non lance pendant cette passe. |
| Musique catalogue | KO | Non verifie mobile | Smoke officiel reproduit `0 pistes` apres import. |

## Findings

### P1 - Import musique catalogue ne cree pas de piste

- Zone : panneau Musique / catalogue gratuit.
- Fichier probable : `src/features/vibefx-studio/video/panels/MusicLibrary.jsx`, autour de `music-catalog-import-track` et `addAudioTrack`.
- Reproduction : lancer `npm run test:video-ui`, scenario `Vibe_CUT edits, reorders, and exports a short montage`, cliquer sur le premier bouton `music-catalog-import-track`.
- Observe : le compteur reste `3 clips / 0 volets / 1 transition / 1 texte / 0 pistes`, puis le test time out.
- Attendu : une piste audio doit apparaitre dans la timeline et le compteur passer a `1 piste`.
- Preuve : log Playwright `Expected pattern: /1 piste/i`, recu `0 pistes`.
- Recommandation : verifier le handler d'import catalogue, la normalisation du track audio, le `trackId` musique et le feedback d'erreur si l'import est bloque par droits/source.

### P1 - Grand format mobile deborde horizontalement et pousse les controles hors ecran

- Zone : preview grand format mobile.
- Fichier probable : `src/features/vibefx-studio/video/VideoEditor.jsx:241`, `:247`, `:256`, `:293`, `:323`.
- Reproduction : viewport 390x844, importer 2 videos, ouvrir `Grand format`.
- Observe : container theater mesure environ 593px de large pour un viewport 390px ; les boutons rotation, `Lire tout` et fermer commencent a x=395, x=468, x=548 donc hors ecran.
- Attendu : layout mobile contraint a `width: 100%`, controles accessibles sans scroll horizontal ni clipping.
- Preuve : `.codex-remote-attachments/vibecut-audit-mobile-theater.png`, metriques Playwright `vibecut-theater-mode w=593`, viewport `w=390`.
- Recommandation : passer la barre theater mobile en layout wrap/2 lignes, cacher le select top sur mobile et garder un seul select dans le tray, ajouter `min-w-0`/`max-w-full` sur le shell theater.

### P1 - Preview grand format mobile peut sembler noire ou mal cadree

- Zone : preview grand format mobile.
- Fichier probable : `src/features/vibefx-studio/video/VideoEditor.jsx:217` et `src/features/vibefx-studio/video/preview/VideoPreview.jsx`.
- Reproduction : viewport 390x844 ou 390x680, ouvrir grand format juste apres import.
- Observe : la capture 390x844 montre une grande zone noire, alors que le canvas contient des pixels non noirs ; le canvas est rendu a `x=0, w=592.94`, donc une partie utile est hors cadre.
- Attendu : premiere frame visible et centree dans le viewport, meme avant lecture.
- Preuve : `.codex-remote-attachments/vibecut-audit-mobile-theater.png` et metrique canvas `w=592.94` pour viewport 390.
- Recommandation : contraindre le canvas/theater shell mobile, utiliser un wrapper `overflow-hidden` centre, puis tester 16:9 et 9:16 en 390x844 et 390x680.

### P2 - Format de sequence peu decouvrable en mobile normal

- Zone : header Vibe_CUT mobile.
- Fichier probable : `src/features/vibefx-studio/VideoApp.jsx:93`.
- Reproduction : viewport mobile, rester en preview normale.
- Observe : le menu `Type de sequence` est cache par `hidden sm:block`; l'utilisateur voit surtout le select FPS, pas le format social.
- Attendu : le changement de format doit etre visible dans le workflow mobile normal, pas seulement dans grand format/export.
- Preuve : `.codex-remote-attachments/vibecut-audit-mobile-normal.png`.
- Recommandation : ajouter un controle format compact mobile ou un bouton format dans la toolbar basse.

### P2 - Rotation visible mais pas assez guidee

- Zone : header, timeline et theater.
- Fichier probable : `src/features/vibefx-studio/VideoApp.jsx:178`, `:189`, `src/features/vibefx-studio/video/timeline/Timeline.jsx:784`, `:795`, `src/features/vibefx-studio/video/VideoEditor.jsx:278`.
- Reproduction : importer une video sans selection explicite.
- Observe : les boutons rotation sont des icones desactivees ; l'explication repose sur `title`, peu utile au tactile.
- Attendu : message contextualise visible, par exemple "Selectionne un clip pour tourner", ou rotation disponible depuis la carte clip.
- Preuve : captures desktop/mobile normales.
- Recommandation : afficher une micro-indication pres des controles ou rendre la selection clip automatique apres import plus explicite.

### P2 - Le bouton volume preview semble inactif

- Zone : controles preview.
- Fichier probable : `src/features/vibefx-studio/video/preview/PreviewControls.jsx:164`.
- Reproduction : cliquer l'icone volume dans la preview.
- Observe : bouton avec `aria-label="Volume preview"` sans handler apparent ni etat mute/volume.
- Attendu : mute/unmute ou ouverture d'un controle volume, avec etat visible.
- Preuve : inspection code et capture `.codex-remote-attachments/vibecut-audit-desktop-normal.png`.
- Recommandation : connecter au store volume/mute ou retirer le bouton tant que non fonctionnel.

### P2 - Timeline mobile tres dense, plusieurs actions critiques se serrent

- Zone : timeline mobile et toolbar basse.
- Fichier probable : `src/features/vibefx-studio/video/timeline/Timeline.jsx`, `src/features/vibefx-studio/video/panels/VideoToolbar.jsx`.
- Reproduction : viewport 390x844 apres import.
- Observe : preview, controls, header timeline, rotation, ralenti, delete, pistes et toolbar se cumulent ; certains boutons sticky/offscreen apparaissent a la limite droite.
- Attendu : prioriser 3-4 actions principales et ranger le reste en panel/context menu sur mobile.
- Preuve : `.codex-remote-attachments/vibecut-audit-mobile-normal.png`.
- Recommandation : creer un mode mobile "preview/timeline/panels" plus segmente, avec action destructive moins presente.

### P2 - Export inspire confiance mais reste coupe dans le contexte studio

- Zone : panneau Export desktop.
- Fichier probable : `src/features/vibefx-studio/video/panels/ExportVideoPanel.jsx`.
- Reproduction : ouvrir Export apres avoir passe le format a TikTok.
- Observe : le panneau est riche, mais il occupe une colonne qui coupe vite le contenu vertical ; la relation "rotation appliquee a l'export" n'est pas explicite dans ce panneau.
- Attendu : preflight plus synthetique en haut, rappel du format reel, rotation active, audio mix et fallback MP4/WebM.
- Preuve : `.codex-remote-attachments/vibecut-audit-export-panel.png`.
- Recommandation : ajouter un resume preflight compact sticky : format, FPS, rotation clips, audio, warnings.

### P2 - Les pistes timeline de fond generent de tres grandes zones cliquables hors viewport

- Zone : timeline desktop/mobile.
- Fichier probable : `src/features/vibefx-studio/video/timeline/Timeline.jsx`.
- Reproduction : importer 2 clips puis collecter les boutons.
- Observe : plusieurs boutons de fond de piste ont des largeurs superieures au viewport (`w=2149` desktop, `w=515` mobile), ce qui peut compliquer hit testing, focus et audit d'accessibilite.
- Attendu : zones de fond dimensionnees a la largeur scrollable voulue mais sans controles interactifs geants difficiles a parcourir au clavier.
- Preuve : metriques Playwright `Ajouter un effet de transition`, `Ajouter du texte`, `Ajouter de la musique` offscreen.
- Recommandation : rendre seulement une zone visible/focusable, ou transformer ces placeholders en elements non focusables avec bouton local.

### P3 - Doublon de select format en grand format mobile

- Zone : topbar theater + tray mobile.
- Fichier probable : `src/features/vibefx-studio/video/VideoEditor.jsx:256` et `:323`.
- Reproduction : viewport 390x844, grand format.
- Observe : un select format existe dans la topbar et un autre dans le tray mobile ; le premier cause en partie le debordement.
- Attendu : un seul controle format par breakpoint.
- Preuve : metriques `theaterTopSelectVisible=true` et `theaterMobileSelectVisible=true`.
- Recommandation : cacher le select top sous `md` ou `lg`.

### P3 - Microcopy technique et froide pour createur

- Zone : plusieurs panels (`Preview/export`, `preflight`, droits musique, timeline).
- Reproduction : parcourir header, export, musique.
- Observe : termes exacts mais tres techniques : `Preview/export`, `preflight`, `fallback`, `verified-free`, `manifest`.
- Attendu : garder la precision, mais ajouter un libelle createur plus direct aux endroits de decision.
- Preuve : screenshots export/music et logs body.
- Recommandation : utiliser "Qualite de sortie", "Droits OK", "Format reel", puis detail technique en second niveau.

### P3 - Warning build NFT a surveiller

- Zone : build/package server.
- Fichier probable : `src/app/api/music/local-file-import/route.js` via `next.config.mjs`.
- Reproduction : `npm run build`.
- Observe : `Encountered unexpected file in NFT list`.
- Attendu : build sans trace involontaire du projet entier.
- Preuve : sortie build.
- Recommandation : limiter les operations filesystem dynamiques a un sous-dossier statique ou ignorer explicitement les chemins non deployables.

## Incoherences UI

- Desktop a deux lieux de format fiables (`Type de sequence`, Export), mobile normal n'en expose pas clairement.
- Rotation existe dans header, timeline et theater, mais son etat depend de la selection sans feedback visible.
- Le grand format desktop est clair, tandis que le grand format mobile devient un layout plus large que l'ecran.
- Le bouton volume est present dans la preview mais ne semble pas faire d'action.
- Le panneau Export parle de format/FPS mais ne rassure pas explicitement sur rotation + export.

## Opportunites de polish

- Ajouter une selection automatique du premier clip apres import avec feedback "Clip 1 selectionne".
- Transformer `Grand format` en bouton encore plus evident sur mobile, mais avec topbar simplifiee.
- Ajouter un badge "Rotation 90 appliquee a l'export" dans Export/rail clip.
- Ajouter un empty/error state visible quand l'import musique catalogue echoue.
- Donner une variante mobile moins dense de la timeline ou un mode inspecteur.

## Captures

- `.codex-remote-attachments/vibecut-audit-desktop-normal.png`
- `.codex-remote-attachments/vibecut-audit-desktop-theater.png`
- `.codex-remote-attachments/vibecut-audit-export-panel.png`
- `.codex-remote-attachments/vibecut-audit-laptop-1280x720-normal.png`
- `.codex-remote-attachments/vibecut-audit-laptop-1280x720-theater.png`
- `.codex-remote-attachments/vibecut-audit-mobile-normal.png`
- `.codex-remote-attachments/vibecut-audit-mobile-theater.png`
- `.codex-remote-attachments/vibecut-audit-mobile-small-390x680-theater.png`

## Reponses aux questions produit

1. Vrai editeur ou prototype ? Desktop donne une impression de vrai editeur. Mobile grand format donne encore une impression prototype.
2. Importer/lire/changer format/exporter est-il comprehensible ? Oui desktop ; mobile partiel car format et grand format se marchent dessus.
3. Preview normale et grand format coherentes ? Oui desktop/laptop ; non mobile a cause du debordement.
4. Rotations decouvrables et fiables ? Fiables dans les smokes orientation et badge theater ; decouvrabilite moyenne.
5. Tous les formats sociaux semblent geres ? Le canvas change bien 9:16/16:9 ; l'acces mobile normal est a ameliorer.
6. Timeline lisible apres plusieurs objets ? Fonctionnelle, mais dense. Le smoke ajoute texte/transition, mais musique catalogue bloque.
7. Export inspire confiance ? Plutot oui, mais il manque un resume explicite rotation/audio/format reel.
8. Mobile utilisable ? Preview normale utilisable ; grand format mobile pas encore au niveau.
9. Trois corrections a plus forte valeur : import musique catalogue, layout grand format mobile, controle format/rotation mobile clarifie.

## Plan de correction recommande

1. Lot urgent : corriger import musique catalogue, ajouter feedback d'erreur import, ajouter un smoke cible si le bug vient du handler.
2. Lot ergonomie : refondre la topbar grand format mobile, supprimer le doublon select format, contraindre canvas/shell a `max-width: 100vw`, ajouter selection/rotation guidee.
3. Lot polish : connecter ou retirer le bouton volume, compact preflight Export, simplifier la microcopy createur, reduire les placeholders timeline focusables geants.
