# Megaprompt - Audit UI/UX complet Vibe_CUT

## Mission

Tu travailles dans le projet Vibe_fx V2. Ta mission est d'auditer Vibe_CUT de bout en bout pour detecter toutes les anomalies, incoherences, regressions et frictions UI/UX, sans te limiter aux bugs bloquants.

Objectif : produire un rapport clair qui liste ce qui n'est pas encore au niveau produit, avec preuves, severite, reproduction, captures si utile, et recommandations concretes.

Tu ne dois pas corriger le code pendant cette passe, sauf si l'utilisateur te demande explicitement de passer en mode correction. Cette mission est d'abord une mission d'observation, test et diagnostic.

## Lecture obligatoire avant test

Lis dans cet ordre :

1. `AGENTS.md`
2. `map.md`
3. `seo.md`
4. `MEGAPROMPT.md`
5. `.agents/skills/dark-ui/SKILL.md`
6. `.agents/skills/technical-ui/SKILL.md`
7. `.agents/skills/motion/SKILL.md`
8. Le module Vibe_CUT :
   - `src/features/vibefx-studio/VideoApp.jsx`
   - `src/features/vibefx-studio/video/VideoEditor.jsx`
   - `src/features/vibefx-studio/video/preview/`
   - `src/features/vibefx-studio/video/timeline/`
   - `src/features/vibefx-studio/video/panels/`
   - `src/features/vibefx-studio/video/store/videoStore.js`
   - `src/features/vibefx-studio/video/engine/VideoEngine.js`
   - `src/features/vibefx-studio/video/model/timelineModel.js`
9. Les tests Vibe_CUT existants :
   - `scripts/smoke-video-ui.spec.cjs`
   - `scripts/smoke-vibecut-quick-tools.spec.cjs`
   - `scripts/smoke-vibecut-desktop-video-orientation.spec.cjs`
   - `scripts/smoke-vibecut-slowmo-samples.spec.cjs`
   - `scripts/smoke-video-store.mjs`
   - `scripts/smoke-video-timeline-model.mjs`
   - `scripts/run-video-ui-test.mjs`

## Perimetre fonctionnel a auditer

Audite toutes les surfaces Vibe_CUT :

- ouverture de l'onglet VibeCut depuis `/studio` ;
- import video vide / une video / plusieurs videos ;
- formats de sequence : horizontal, vertical, carre, formats sociaux disponibles ;
- preview normale ;
- preview grand format ;
- plein ecran navigateur ;
- lecture, pause, scrubbing, skip avant/arriere, vitesse preview ;
- lecture a la chaine de plusieurs clips ;
- rotation clip gauche/droite ;
- detection badges FPS/rotation ;
- trim in/out ;
- split clip ;
- reorder clips ;
- timecodes ;
- transitions de coupe ;
- transitions libres ;
- intros/outros/volets ;
- outils rapides ;
- textes : ajout, edition, animations, drag sur canvas ;
- filtres ;
- avant/apres filtres ;
- vitesse/ralenti ;
- audio clip integre ;
- musique externe ;
- imports musique ;
- droits/manifest audio ;
- pistes timeline : visible, mute, lock, pistes supplementaires ;
- suppression clip/texte/transition/audio ;
- undo/redo ;
- export panel ;
- preflight export ;
- export WebM/MP4 fallback ;
- export avec rotation, textes, transitions, musique ;
- responsive desktop, laptop, tablette, mobile petite hauteur ;
- clavier : espace, fleches, delete/backspace, Ctrl+Z/Ctrl+Shift+Z ;
- accessibilite de base : labels, focus visible, roles, controles non pieges ;
- etats d'erreur : media illisible, absence de clip, piste verrouillee, export bloque.

## Axes UI/UX a juger

Ne cherche pas seulement "est-ce que ca marche". Cherche aussi ce qui n'est pas ouf :

- controles trop petits, caches, peu decouvrables ;
- labels ambigus ou incoherents ;
- boutons actifs/desactives sans explication ;
- elements qui se chevauchent ;
- texte coupe ou illisible ;
- contrastes insuffisants ;
- feedback absent apres action ;
- etats selectionnes pas assez visibles ;
- differences incoherentes entre header, timeline, preview et panels ;
- ordre d'actions peu logique ;
- informations importantes loin du contexte ;
- scrolls imbriques confus ;
- panel mobile trop couvrant ou trop petit ;
- changement de format qui surprend ou perd l'utilisateur ;
- rotation visible mais pas assez signalee ;
- lecture qui donne l'impression d'accelerer, de bloquer, ou de sauter ;
- preview/export qui ne semblent pas alignes ;
- transitions qui ont un rendu different entre preview et export ;
- timeline trop dense ou pas assez lisible ;
- actions destructives trop faciles ;
- jargon ou texte technique peu clair pour un createur.

## Preparation environnement

1. Verifie l'etat du repo :

```powershell
git status --short
```

Ne revert aucune modification existante. Si le worktree est sale, considere ces changements comme appartenant a l'utilisateur ou a une passe precedente.

2. Verifie les fixtures video :

```powershell
Get-ChildItem -Path videotest -Filter *.mp4
Get-ChildItem -Path vibecut-video-samples -ErrorAction SilentlyContinue
```

3. Lance ou detecte un serveur local :

```powershell
try { (Invoke-WebRequest -UseBasicParsing http://localhost:3000/studio -TimeoutSec 3).StatusCode } catch { 'closed' }
```

Si aucun serveur ne repond, lance `npm run dev` sur un port disponible.

## Tests automatiques a lancer

Lance les tests existants et note precisement les resultats :

```powershell
npm run lint
npm run build
npm --prefix functions run lint
npm run test:video-ui
npm run test:vibecut-tools
npm run test:vibecut-orientation
npm run test:vibecut-slowmo
```

Si un test echoue :

- note le nom exact du test ;
- copie le message d'erreur utile ;
- distingue bug produit, test obsolete, fixture manquante, dependance externe ou flakiness ;
- ne masque pas un echec en disant seulement "flaky".

## Mega test Playwright manuel guide

Ecris ou lance un script Playwright temporaire sans le commit, sauf si l'utilisateur demande un test permanent. Le script doit couvrir au minimum :

1. Ouvrir `/studio`.
2. Aller sur VibeCut.
3. Importer au moins deux videos.
4. Verifier que le canvas rend une image non noire.
5. Lire 2 secondes et verifier que le temps avance.
6. Passer en preview grand format.
7. Tester le rail lateral : selection clip 1, selection clip 2.
8. Tester lecture a la chaine en demarrant avant la frontiere du clip 2.
9. Changer le format vers 9:16, verifier canvas `height > width`.
10. Changer le format vers 16:9, verifier canvas `width > height`.
11. Appliquer rotation 90 deg au clip selectionne, verifier badge/UI.
12. Retirer rotation, verifier retour.
13. Ajouter un texte, verifier apparition preview/timeline.
14. Ajouter une transition, verifier qu'elle apparait et qu'elle rend.
15. Ouvrir le panneau export et verifier preflight.
16. Faire une capture desktop.
17. Repeter les controles critiques en viewport mobile `390x844`.

Pour le canvas, echantillonne plusieurs pixels afin de detecter les frames noires :

- centre ;
- quatre coins internes ;
- optionnel : checksum simple sur une petite grille.

## Audit manuel visuel

Apres les tests automatiques, fais une vraie passe humaine :

- Desktop large : `1440x920`
- Laptop : `1280x720`
- Mobile : `390x844`
- Mobile petite hauteur : `390x680`

Pour chaque viewport, inspecte :

- hierarchie visuelle ;
- lisibilite ;
- controles disponibles ;
- scrolls ;
- boutons sticky ;
- chevauchements ;
- zones mortes ;
- focus clavier ;
- preview et timeline visibles ensemble ;
- comportement des panels ouverts.

Prends des captures pour les problemes visuels importants. Mets-les dans `.codex-remote-attachments/` avec des noms explicites, par exemple :

- `vibecut-audit-desktop-theater-overlap.png`
- `vibecut-audit-mobile-panel-crowded.png`
- `vibecut-audit-export-preflight.png`

## Classification des anomalies

Classe chaque finding avec :

- `P0` : bloque l'utilisation ou casse export/import/lecture.
- `P1` : grosse incoherence produit, forte confusion, risque de mauvais export.
- `P2` : friction claire, UI pas assez lisible, action peu decouvrable.
- `P3` : polish, microcopy, alignement, densite, finition.

Pour chaque finding, fournis :

- titre court ;
- severite ;
- zone ;
- fichier probable si identifiable ;
- reproduction ;
- resultat observe ;
- resultat attendu ;
- preuve : capture, test, citation de log ou description precise ;
- recommandation concrete.

## Questions a trancher pendant l'audit

Reponds explicitement a ces questions :

1. Est-ce que Vibe_CUT donne l'impression d'un vrai editeur video ou d'un prototype ?
2. Est-ce que l'utilisateur comprend ou importer, lire, changer format et exporter ?
3. Est-ce que la preview normale et la preview grand format sont coherentes ?
4. Est-ce que les rotations sont decouvrables et fiables ?
5. Est-ce que tous les formats sociaux semblent bien geres ?
6. Est-ce que la timeline reste lisible apres plusieurs clips, textes, transitions et musiques ?
7. Est-ce que l'export inspire confiance avant de cliquer ?
8. Est-ce que le mobile est utilisable, pas seulement "responsive" ?
9. Quelles sont les trois corrections UI qui donneraient le plus de valeur immediatement ?

## Format du rapport final

Produis un rapport en francais avec cette structure :

```markdown
# Audit UI/UX Vibe_CUT - YYYY-MM-DD

## Resume executif

- Verdict global :
- Niveau de confiance :
- Nombre de findings : P0 / P1 / P2 / P3
- Les 3 priorites :

## Tests lances

| Test | Resultat | Notes |
| --- | --- | --- |

## Parcours verifies

| Parcours | Desktop | Mobile | Notes |
| --- | --- | --- | --- |

## Findings

### P1 - Titre

- Zone :
- Reproduction :
- Observe :
- Attendu :
- Preuve :
- Recommandation :

## Incoherences UI

## Opportunites de polish

## Captures

## Reponses aux questions produit

## Plan de correction recommande

1. Lot urgent
2. Lot ergonomie
3. Lot polish
```

## Contraintes

- Ne modifie jamais le projet source Jardin de Chawi.
- Ne touche pas a `node_modules/`, `.next/`, `.git/`, `dist/`.
- N'invente pas un probleme si tu ne peux pas le reproduire ou l'observer.
- Ne confonds pas warning existant et regression Vibe_CUT.
- Si tu crees un test permanent, mets a jour `map.md`.
- Si tu ne peux pas verifier une fonctionnalite, marque-la explicitement comme "non verifiee" avec la raison.

## Definition de fini

La mission est terminee quand :

- les tests automatiques importants ont ete lances ou leur impossibilite expliquee ;
- au moins un parcours desktop et un parcours mobile ont ete inspectes ;
- les anomalies UI/UX sont classees par severite ;
- les captures utiles sont produites ;
- le rapport final permet de lancer une passe de correction sans redecouvrir le produit.
