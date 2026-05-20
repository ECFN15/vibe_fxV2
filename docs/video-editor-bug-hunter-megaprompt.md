# MEGAPROMPT - Audit humain et chasseur de bugs Vibe_CUT

Tu travailles dans `C:\Users\matth\Travail\vibe_fxv2`.

Mission : tester, corriger et stabiliser l'onglet `Video` du studio Vibe_fx V2 comme si tu etais un createur qui fabrique son propre edit social de A a Z. Tu ne fais pas un simple smoke test. Tu dois utiliser l'editeur avec l'exigence d'un vrai monteur video : tout doit etre fluide, precis, comprehensible, rapide et sans friction.

## 0. Regles projet obligatoires

Avant toute modification, lis dans cet ordre :

1. `AGENTS.md`
2. `map.md`
3. `seo.md`
4. `MEGAPROMPT.md`
5. `.agents/skills/cyber-neon/SKILL.md`
6. `.agents/skills/dark-ui/SKILL.md`
7. `.agents/skills/technical-ui/SKILL.md`
8. `.agents/skills/motion/SKILL.md`
9. `src/features/vibefx-studio/video/`
10. `scripts/smoke-video-ui.spec.cjs`

Contraintes non negociables :

- Ne jamais modifier `C:\Users\matth\Desktop\jardin de chawi`.
- Ne pas toucher a `node_modules/`, `.next/`, `.git/`, `dist/`.
- Mettre a jour `map.md` si tu crees, supprimes, renommes, deplaces ou restructures un fichier.
- Ne jamais hardcoder de secret.
- Les uploads utilisateurs doivent passer par Firebase Storage si une feature d'import persistant est ajoutee.
- Les surfaces studio/app privees restent `noindex`.
- Respecter la direction produit : `dark-ui` pour les longues surfaces de travail, `technical-ui` pour timeline/panneaux/controles, `cyber-neon` pour l'identite, `motion` uniquement si la fluidite est utile et performante.

## 1. Role attendu

Tu es un agent QA + UX engineer + video editor engineer.

Ta posture :

- Tu testes comme un humain impatient qui veut publier un reel propre.
- Tu traques les micro-frictions : delai de clic, drag qui accroche, feedback manquant, label confus, controle trop petit, valeur imprecise, export qui ne dit pas ce qui se passe.
- Tu prouves chaque bug par reproduction, fichier, cause probable et correction.
- Tu corriges les problemes jusqu'a obtenir une version stable, puis tu verifies.
- Tu ne t'arretes pas a "ca marche". Tu cherches si ca marche vite, precisement, sur desktop et mobile.

## 2. Parcours humain a simuler

Scenario principal : creer un edit vertical 9:16 de 10 a 20 secondes.

1. Ouvrir `/studio`, aller dans l'onglet `Video`.
2. Importer 2 a 4 videos locales depuis `videotest/*.mp4`.
3. Choisir un preset `Instagram Reel 9:16`.
4. Reordonner les clips.
5. Couper un clip en deux.
6. Reduire le debut et la fin de plusieurs clips.
7. Lire la video et deplacer le curseur violet de timeline pendant la lecture.
8. Ajouter une transition entre deux clips.
9. Ajouter un texte intro, le deplacer, changer taille, couleur, position, duree, effet.
10. Ajouter une musique existante, l'ecouter avant import, l'importer dans la timeline.
11. Importer une nouvelle musique libre de droit depuis la source/site utilise pour les musiques actuelles, ou proposer une integration propre si la source n'est pas cablee.
12. Ajuster volumes video et musique.
13. Changer vitesse d'un clip.
14. Appliquer plusieurs filtres et verifier leur pertinence colorimetrique.
15. Superposer plusieurs elements sur plusieurs pistes : video, transitions, texte 1, texte 2, musique, effets.
16. Exporter en WebM/MP4 selon support navigateur.
17. Relire le fichier exporte et verifier image, audio, texte, timing, ratio, duree et poids.

Objectif : l'edit final doit ressembler a un vrai contenu publiable, pas a une suite de controles testes artificiellement.

## 3. Zones critiques a auditer

### Timeline et curseur violet

Le curseur violet/playhead est une priorite.

Exigence UX :

- Le playhead doit etre selectionnable directement.
- Le drag doit suivre le pointeur sans delai perceptible.
- Le deplacement doit fonctionner pendant pause et lecture.
- La video doit se repositionner immediatement pendant le scrub.
- Le pointeur ne doit pas perdre la capture si on bouge vite.
- Le drag ne doit pas declencher une selection de clip par erreur.
- Les petits deplacements doivent etre precis, pas arrondis trop brutalement.

Techniques a verifier :

- Utiliser `pointerdown`, `setPointerCapture`, `pointermove`, `pointerup`.
- Mettre a jour la position visuelle avec `requestAnimationFrame` si necessaire.
- Eviter de bloquer le scrub sur des updates React lourdes.
- Mesurer la latence ressentie : viser moins de 50 ms entre mouvement pointeur et position du playhead.
- Ajouter ou adapter des tests Playwright qui draguent le playhead sur plusieurs distances.

### Coupe, trim et reduction video

Verifier :

- Trim debut/fin accessible meme sur clips longs.
- Handles assez larges et visibles.
- Valeurs temps lisibles.
- Pas de saut de layout pendant le trim.
- Precision suffisante au pixel et au temps.
- Snap optionnel aux bords, transitions, texte et frames importantes.
- Possibilite d'entrer une duree ou un timecode manuellement si l'UI actuelle manque de precision.

Comparer l'UI actuelle avec une meilleure approche :

- zoom de timeline ;
- trackpad/mouse wheel pour zoom horizontal ;
- time ruler plus precis ;
- inputs timecode debut/fin/duree ;
- handles magnetiques ;
- preview frame sous le curseur ;
- mode precision quand Alt/Shift est presse.

### Transitions

Tester :

- Ajout entre deux clips.
- Deplacement libre sur piste `Effets`.
- Redimensionnement de duree.
- Preview pendant lecture et scrub.
- Suppression et remplacement.
- Pertinence des transitions existantes : pas d'effet cheap, timing coherent, pas de flash agressif.
- Cas limites : transition plus longue que le clip, transition proche d'une coupe, transition sur clip reorder.

### Texte

Tester comme un createur :

- Ajouter plusieurs textes.
- Modifier contenu rapidement.
- Changer taille, font si disponible, couleur, opacite, alignement.
- Deplacer au doigt/souris sur le canvas.
- Redimensionner et faire pivoter si supporte.
- Changer duree sur timeline.
- Superposer deux textes au meme endroit via pistes separees.
- Ajouter effets : fade in/out, pop, slide, glow, stroke, shadow, karaoke/caption si pertinent.
- Verifier que le texte reste net et visible dans l'export.

Critere : un utilisateur doit comprendre comment modifier le texte sans chercher dans trois panneaux.

### Audio, musique et import externe

Tester :

- Ecouter une musique avant import.
- Importer une musique existante dans la timeline.
- Lire video + musique synchronisees.
- Ajuster volume clip et volume musique.
- Couper/deplacer une piste musique.
- Verifier que l'export contient bien le mix audio.
- Gerer absence d'audio, permission autoplay, formats non supportes.

Amelioration demandee :

- Retrouver comment les musiques actuelles de `public/music/` ont ete ajoutees.
- Identifier la source/site libre de droit utilisee, si elle est documentee dans le repo ou les noms de fichiers.
- Proposer ou implementer une bibliotheque musique extensible : preview, recherche, categorie, duree, BPM si dispo, licence, attribution, bouton import.
- Si l'import depuis un site externe est implemente, respecter licences, CORS, securite et ne pas scraper illegalement.
- Si l'import utilisateur est implemente, stocker via Firebase Storage et valider type/taille/duree.

### Vitesse

Tester :

- 0.25x, 0.5x, 1x, 1.5x, 2x si disponible.
- Conservation audio ou mute intelligent si pitch impossible.
- Impact sur duree timeline.
- Export conforme a la vitesse choisie.
- UI claire sur la duree finale.

### Filtres et colorimetrie

Tester :

- Tous les filtres disponibles.
- Avant/apres visuel sur le canvas.
- Export identique a la preview.
- Pertinence colorimetrique : pas de clipping excessif, peau non detruite, contraste lisible, noirs non ecrases sauf effet volontaire.
- Un filtre `Cyberpunk` doit etre stylise mais pas rendre tout illisible.

Proposer si necessaire :

- intensite de filtre par slider ;
- comparaison avant/apres maintenue au clic ;
- presets mieux nommes ;
- ordre d'application stable ;
- LUTs ou matrice couleur propre si l'implementation actuelle est approximative.

### Multi-pistes et superposition

Verifier la possibilite de multiplier les timelines/pistes.

Exigence :

- Pouvoir ajouter plusieurs pistes texte.
- Pouvoir superposer plusieurs elements au meme timestamp.
- Pouvoir separer clairement video, effets, texte, audio, musique.
- Pouvoir verrouiller, masquer, muter, solo une piste si pertinent.
- Pouvoir renommer une piste.
- Pouvoir changer l'ordre des pistes.

Si ce n'est pas implemente, produire une recommandation technique avec modele de donnees :

- `tracks[]` avec `id`, `type`, `label`, `order`, `muted`, `locked`, `visible`.
- `items[]` rattaches a une track avec `start`, `duration`, `zIndex`, `source`, `effects`.
- rendu deterministe par ordre de piste.

### Export

Tester :

- Format WebM/MP4 selon support `MediaRecorder`.
- Preset 9:16, 1:1, 4:5, 16:9 si disponibles.
- Resolution affichee vs resolution reelle du canvas export.
- Duree exportee.
- Image non noire.
- Audio mixe.
- Texte visible.
- Transitions visibles.
- Filtres appliques.
- Message de progression.
- Annulation ou protection double clic.
- Erreurs lisibles si navigateur non supporte.

## 4. Techniques de test avancees

Utilise au minimum :

- Tests exploratoires manuels avec notes de friction.
- Playwright sur desktop et mobile.
- Captures screenshot/video avant/apres correction.
- Console errors + page errors.
- Verification canvas par pixels : non noir, ratio, luminance/changements apres filtre ou transition.
- Verification export : taille fichier, duree approximative, presence piste audio quand possible.
- Mesure de fluidite : `requestAnimationFrame`, long tasks, FPS approximatif pendant lecture/drag.
- Tests pointer : drag lent, drag rapide, drag hors du composant, relache hors timeline.
- Tests clavier : espace play/pause si supporte, fleches pour nudge si pertinent, Escape annule panneau/modal.
- Tests accessibilite : labels, focus visible, tailles tactiles 44 px minimum, pas de controle uniquement couleur.
- Tests `prefers-reduced-motion`.
- Tests responsive : 390x844, 768x1024, 1440x900, 1920x1080.

Commandes de base :

```powershell
npm run lint
npm run build
npm run test:video-ui
```

Si les fixtures `videotest/*.mp4` manquent, creer une note claire et proposer les fixtures minimales a ajouter. Ne pas masquer l'absence de test.

## 5. Definition de stable

La version est stable seulement si :

- Import video fonctionne sans bloquer l'UI.
- Lecture/pause fluide.
- Playhead violet draggable directement et sans delai perceptible.
- Trim/coupe/reorder ne cassent pas la sequence.
- Transitions visibles en preview et export.
- Textes modifiables, positionnables et exportes.
- Musique previewable, importable et mixee dans l'export.
- Vitesse appliquee en preview et export.
- Filtres coherents en preview et export.
- Multi-pistes ou plan technique clair si non implemente dans cette passe.
- Export telechargeable, non vide, au bon ratio.
- Mobile sans overflow horizontal, controles principaux utilisables.
- `npm run lint`, `npm run build`, `npm run test:video-ui` passent ou les blocages sont documentes avec cause exacte.

## 6. Colloque d'agents apres stabilisation

Une fois la version stable obtenue, organise une revue croisee. Si l'environnement permet des sub-agents, delegue des analyses distinctes. Sinon, simule explicitement ces roles dans un audit structure.

Roles a consulter :

- Expert UX video editor : frictions vs CapCut/Premiere/Rush/Canva.
- Ingenieur timeline/media : architecture pistes, timing, synchronisation, export.
- Motion designer : transitions, easing, effets texte, sensation tactile.
- Audio engineer : preview, waveform, ducking, BPM, fades, mix export.
- Colorist : filtres, LUTs, intensite, coherences peau/contraste.
- Mobile UX specialist : tactile, bottom sheets, gestures, viewport.
- QA automation engineer : tests Playwright, fixtures, regression suite.
- Product strategist : features "next level" vraiment utiles pour createurs.

La revue doit produire :

- top 10 bugs/frictions restantes ;
- top 10 ameliorations UX prioritaires ;
- top 10 features avancees a fort impact ;
- estimation complexite/risque par feature ;
- ordre d'implementation recommande.

## 7. Features avancees a considerer

Ne les implemente pas toutes d'un coup. Classe-les par impact, complexite et dependances.

Pistes pertinentes :

- Timeline multi-pistes complete avec lock/mute/solo/visibility.
- Zoom timeline + mini-map + snap magnetique.
- Waveform audio generee localement.
- Beat detection ou marqueurs BPM pour caler les coupes.
- Keyframes pour position, scale, rotation, opacite, volume, filtre.
- Courbes d'easing editables.
- Effets texte avances : stroke, glow, shadow, reveal, karaoke, captions.
- Auto-captions plus tard si pipeline speech-to-text valide.
- Presets Reel/TikTok/Shorts avec safe areas.
- Safe-area overlay pour interface Instagram/TikTok.
- Preview avant/apres filtre.
- Sliders d'intensite par filtre.
- Bibliotheque musique avec preview, tags, licence, duree, BPM.
- Import audio utilisateur avec validation Storage.
- Ducking automatique musique quand audio video/parole detecte.
- Templates d'edit : intro, cut rapide, promo produit, before/after.
- Undo/redo robuste par historique d'etats.
- Autosave local puis cloud.
- Export queue avec progression, annulation et reprise.
- Rendu serveur futur via Functions/Cloud Run si l'export navigateur devient insuffisant.
- WebCodecs/WebAudio si support utile pour performance.
- Mode performance basse puissance.

## 8. Format du rapport final attendu

Le rapport final doit etre concret et actionnable.

Structure obligatoire :

1. Resume executif : stable ou non stable.
2. Parcours teste : fichiers, navigateurs, viewports.
3. Bugs trouves et corriges : severite, reproduction, fichier, solution.
4. Bugs restants : severite, impact, prochain pas.
5. UX friction log : chaque friction ressentie comme utilisateur.
6. Resultats commandes : lint, build, test video.
7. Responsive check : desktop/tablet/mobile.
8. Audit accessibilite et performance.
9. Audit export : formats, ratio, audio, texte, filtres, transitions.
10. Audit musique : existant, preview, import, source/licence.
11. Preconisations d'implementation : priorisees.
12. Colloque d'agents : synthese des roles et decisions.
13. Roadmap next-level : quick wins, medium, advanced, risky.

Sois dur avec l'interface. Un editeur video doit donner une sensation immediate de controle. Si un controle demande plusieurs clics, accroche au drag, manque de feedback ou surprend l'utilisateur, c'est un probleme produit meme si le code ne crash pas.
