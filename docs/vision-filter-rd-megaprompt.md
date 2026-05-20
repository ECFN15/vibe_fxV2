# MEGAPROMPT - R&D Vision Filters pour images smartphone non RAW

Tu travailles dans `C:\Users\matth\Travail\vibe_fxv2`.

Mission : auditer, concevoir et stabiliser l'onglet `Vision` du studio Vibe_fx V2 pour creer des profils d'image puissants, intelligents et exploitables sur des images non RAW, majoritairement prises au smartphone. L'objectif initial est de proposer des pates graphiques inspirees d'appareils photo, de films et de looks cinema, mais sans detruire la colorimetrie, sans voile gris, sans saturation abusive et sans rendre l'image inutilisable.

Tu ne dois pas produire une simple liste de presets. Tu dois mener une vraie demarche R&D : comprendre le pipeline actuel, identifier pourquoi certains profils cassent l'image, definir un moteur de filtres plus robuste, le tester sur des images smartphone variees, puis proposer une architecture de profils intelligent.

## 0. Regles projet obligatoires

Avant toute modification, lis dans cet ordre :

1. `AGENTS.md`
2. `map.md`
3. `seo.md`
4. `MEGAPROMPT.md`
5. `.agents/skills/cyber-neon/SKILL.md`
6. `.agents/skills/dark-ui/SKILL.md`
7. `.agents/skills/technical-ui/SKILL.md`
8. `src/features/vibefx-studio/components/panels/VisionPanel.jsx`
9. `src/features/vibefx-studio/hooks/useStudioFilters.js`
10. `src/features/vibefx-studio/data/constants.jsx`
11. Le moteur de rendu canvas utilise par le studio (`engine/`, hooks renderer, canvas workspace).

Contraintes non negociables :

- Ne jamais modifier le projet source historique situe sur le Desktop.
- Ne pas toucher a `node_modules/`, `.next/`, `.git/`, `dist/`.
- Mettre a jour `map.md` si tu crees, supprimes, renommes, deplaces ou restructures un fichier.
- Ne jamais hardcoder de secret.
- Les images importees par l'utilisateur restent dans le flux upload attendu du projet si elles deviennent persistantes.
- L'onglet Vision est une surface studio privee : elle reste `noindex`.
- Ne pas copier l'identite visuelle d'un constructeur. Les noms peuvent etre des inspirations de rendu, pas une promesse de reproduction exacte proprietaire.

## 1. Role attendu

Tu es un agent R&D image pipeline + color scientist + frontend engineer + UX tester.

Ta posture :

- Tu testes comme un createur qui veut rendre une photo smartphone publiable.
- Tu raisonnes comme un ingenieur colorimetrie : espace couleur, gamma, gamut, clipping, tonal range, peau, ciel, vegetation, ombres, hautes lumieres.
- Tu ne fais jamais confiance a un preset parce qu'il "a l'air cool" sur une seule image.
- Tu refuses les filtres qui ajoutent un voile gris, ecrasent les noirs, brulent les blancs ou saturent les couleurs deja proches du clipping.
- Tu corriges le moteur avant d'empiler de nouveaux profils.
- Tu documentes les compromis : look fort vs fidelite, portrait vs paysage, low light vs daylight, reseaux sociaux vs export haute qualite.

## 2. Probleme a resoudre

Le systeme actuel contient deja des profils camera/film dans `CAMERA_BRANDS` et des parametres comme :

- `brightness`
- `contrast`
- `saturation`
- `vibrance`
- `temperature`
- `highlights`
- `shadows`
- `clarity`
- `sharpness`
- `dehaze`
- `grain`
- `vignette`
- `tintColor`
- `tintIntensity`
- `filterIntensity`
- `toneCurveMaster`
- `toneCurveR/G/B`
- `shadowTint`
- `highlightTint`
- `halation`
- `fadedBlacks`

Le probleme observe : certains profils poussent trop la saturation, les teintes ou les courbes, ce qui cree un voile gris, une image plate, des couleurs sales ou un rendu inexploitable sur des photos deja traitees par smartphone.

Cause probable a investiguer :

- Les photos smartphone sont deja fortement traitees : HDR local, sharpening, denoise, saturation, tone mapping, skin smoothing.
- Les operations sont peut-etre appliquees dans un espace non lineaire ou trop simplifie.
- La saturation globale agit sur toutes les couleurs, meme celles deja saturees.
- Les tints shadow/highlight polluent les neutres et la peau.
- Les courbes peuvent ecraser la dynamique restante.
- `filterIntensity` ne melange peut-etre pas correctement l'image source et l'image filtree.
- Les profils ne sont pas adaptes au contenu : portrait, nuit, ciel, vegetation, interieur, basse lumiere.

## 3. Objectif produit

Creer une generation de filtres Vision qui donne :

- des profils puissants mais maitrisables ;
- un rendu exploitable sur JPEG/HEIC smartphone deja compresses ;
- des profils camera-inspired : Fujifilm, Kodak, CineStill, Hasselblad, Sony, Leica comme directions esthetiques ;
- une intensite globale qui reduit vraiment les effets sans casser les couleurs ;
- des reglages fins utiles et comprehensibles ;
- des garde-fous automatiques contre saturation excessive, clipping, voile gris et skin tones detruits ;
- une preview avant/apres immediate ;
- une validation objective et visuelle.

Definition de reussite : une photo smartphone moyenne doit ressortir plus belle, plus caracterisee et toujours utilisable. Un filtre fort doit rester volontaire, pas accidentel.

## 4. Demarche R&D obligatoire

### Phase A - Audit du pipeline actuel

Identifier precisement :

- Ou les filtres sont stockes.
- Ou ils sont appliques au canvas.
- Dans quel ordre les operations sont appliquees.
- Quels parametres declares dans `constants.jsx` sont reellement supportes par le renderer.
- Quels parametres sont ignores.
- Comment `filterIntensity` est applique.
- Si le rendu preview et export utilisent exactement le meme pipeline.
- Si l'image source est lue en sRGB, transformee, puis reecrite en sRGB.
- Si les operations couleur utilisent `ctx.filter`, manipulation pixel, CSS filter ou combinaison.

Livrable : un schema court du pipeline actuel avec les points faibles.

### Phase B - Corpus de test smartphone

Constituer ou demander un corpus de test minimal :

- portrait peau claire ;
- portrait peau medium/foncee ;
- selfie interieur ;
- paysage avec ciel bleu ;
- vegetation verte ;
- photo de nuit avec neons ;
- golden hour ;
- interieur tungsten ;
- image deja tres saturee ;
- image terne/voile atmospherique ;
- image basse lumiere avec bruit ;
- screenshot ou image compressee reseau social.

Si le corpus n'existe pas, creer une checklist et ne pas pretendre que les profils sont valides.

### Phase C - Mesures image avant/apres

Pour chaque image et chaque profil critique, mesurer :

- histogramme luminance ;
- clipping hautes lumieres par canal ;
- noirs ecrases ;
- saturation moyenne et saturation max ;
- derivee de teinte moyenne ;
- variation des neutres ;
- variation des tons peau si detection possible ;
- contraste local ;
- bruit/grain ajoute ;
- taille/performance de rendu.

Ajouter des helpers si necessaire pour calculer ces metriques sur canvas. Les chiffres ne remplacent pas l'oeil, mais ils detectent les filtres destructeurs.

### Phase D - Tests perceptuels

Chaque profil doit passer les checks visuels :

- Les blancs restent propres, pas teintes sales sauf intention forte.
- Les noirs gardent du detail si le profil n'est pas explicitement high contrast.
- Les tons peau restent plausibles.
- Les ciels ne deviennent pas cyan radioactif.
- Les verts ne virent pas neon sauf profil volontaire.
- Les rouges/oranges ne clipent pas.
- Le contraste ne cree pas d'aplats.
- Le grain ne ressemble pas a du bruit numerique sale.
- Le vignettage ne cache pas le sujet.
- Le filtre reste utilisable a 100%, et excellent entre 40% et 80%.

## 5. Architecture color science recommandee

Tu dois evaluer puis proposer le meilleur pipeline faisable dans le repo.

Pipeline cible minimal :

1. Lire image source en pixels sRGB.
2. Convertir en representation de travail stable.
3. Appliquer exposition/tonalite avec garde-fous.
4. Appliquer courbes luma et RGB avec interpolation douce.
5. Appliquer temperature/tint en preservant les neutres.
6. Appliquer vibrance adaptative avant saturation globale.
7. Appliquer saturation selective par plage de teinte/luminance.
8. Appliquer tints shadow/highlight avec masques progressifs.
9. Appliquer clarity/dehaze localement sans halo excessif.
10. Appliquer grain/halation/vignette en fin de pipeline.
11. Revenir en sRGB avec clamp/gamut mapping.
12. Mixer source/final selon `filterIntensity` dans un espace coherent.

Principes :

- Preferer `vibrance` a `saturation` pour smartphone.
- Ne jamais saturer lineairement tous les pixels de la meme facon.
- Proteger les tons peau.
- Proteger les neutres.
- Appliquer les tints par masques luminance doux, pas sur toute l'image.
- Faire du gamut mapping doux plutot que clamp brutal.
- Utiliser des courbes S moderees.
- Eviter `contrast > 125` et `saturation > 120` par defaut sur profils couleur, sauf profil explicitement extreme avec intensite reduite.
- Ajouter un mode "safe smartphone" active par defaut.

## 6. Profils intelligents a concevoir

Ne cree pas 100 presets moyens. Cree moins de profils, mais meilleurs.

Chaque profil doit avoir :

- `id`
- `name`
- `family`
- `intent`
- `bestFor`
- `avoidFor`
- `strength`
- `parameters`
- `safetyRules`
- `previewTags`
- `technicalNotes`

Exemple de familles :

- Natural Clean : rendu propre, social-ready, peu destructeur.
- Film Soft : chaleur, rolloff doux, contraste modere.
- Chrome Street : couleurs retenues, micro-contraste, bleus/cyans controles.
- Cinema Night : ombres froides, halation legere, neons proteges.
- Portrait Skin : peau prioritaire, contraste doux, saturation selective.
- Landscape Vivid Safe : paysage plus vivant sans neoniser les verts.
- Monochrome Rich : noir et blanc avec separation tonale.
- Editorial Matte : noirs leves mais sans voile gris.

Regle : chaque profil doit expliquer pour quelles images il marche et pour quelles images il doit etre evite.

## 7. Anti-saturation et anti-voile gris

Priorite absolue : supprimer les rendus inexploitable.

Construire ou recommander ces garde-fous :

- Saturation ceiling : limiter l'augmentation si saturation source deja haute.
- Chroma rolloff : reduire progressivement les pixels proches du gamut edge.
- Neutral protection : ne pas teinter les gris/blancs/noirs au-dela d'un seuil.
- Skin protection : limiter hue shift et saturation sur plage peau.
- Shadow purity : ne pas injecter trop de couleur dans les ombres faibles.
- Highlight purity : preserver blancs et hautes lumieres speculaires.
- Grey veil detector : detecter perte de contraste + baisse de saturation utile + noirs leves trop haut.
- Auto normalize : ajuster courbe si le profil ecrase histogramme.
- Intensity blend perceptuel : `filterIntensity` doit mixer source et rendu sans laver l'image.

Si tu trouves un profil destructeur, tu dois le corriger ou le declasser en `experimental`.

## 8. UX de l'onglet Vision

Tester et proposer :

- Preview avant/apres par bouton maintenu ou slider separateur.
- Intensite globale toujours visible.
- Bouton reset clair.
- Indicateurs "safe portrait", "night", "landscape", "strong look".
- Avertissement si un profil est extreme.
- Comparaison rapide entre profils favoris.
- Miniatures preview calculees sur l'image courante.
- Recherche/filtre par famille.
- Favoris utilisateur.
- Mode expert pour courbes, HSL, grain, halation.
- Mode simple pour createurs : Intensite, Chaleur, Contraste, Peau, Grain.
- Undo/redo pour changements de filtre.
- Sauvegarde d'un profil personnel.

L'UX doit rester `dark-ui` + `technical-ui` : dense, lisible, precise, pas decorative.

## 9. Tests techniques a implementer ou etendre

Prevoir des tests automatises si possible :

- Import image de test.
- Appliquer chaque profil.
- Verifier absence de crash console.
- Verifier canvas non vide.
- Verifier que `filterIntensity = 0` donne l'image source.
- Verifier que `filterIntensity = 100` donne le rendu complet.
- Verifier que chaque parametre declare est supporte ou explicitement ignore.
- Verifier que les profils ne produisent pas plus d'un seuil de clipping.
- Verifier qu'un profil couleur ne transforme pas une image neutre en dominante excessive.
- Verifier responsive mobile de l'onglet Vision.

Commandes de base :

```powershell
npm run lint
npm run build
npm run test:studio-ui
```

Si tu ajoutes un test Vision specifique, ajouter un script dedie, par exemple :

```powershell
npm run test:vision-ui
```

## 10. Recherche technique autorisee

Tu peux proposer, comparer ou prototyper :

- HSL/HSV simple : rapide mais insuffisant pour saturation propre.
- Lab/OKLab/OKLCH : meilleur pour chroma et perception.
- Matrices couleur 3x3 : utiles pour looks camera.
- Courbes 1D : utiles pour luma/RGB.
- LUT 3D : meilleur pour looks complexes, mais integration plus lourde.
- WebGL shader : performance pour preview temps reel.
- Canvas 2D pixel pipeline : plus simple, potentiellement lent sur grosses images.
- Worker + OffscreenCanvas : utile pour eviter blocage UI.

Choisir pragmatiquement selon le projet. Ne pas introduire une dependance lourde si un pipeline local propre suffit.

## 11. Colloque d'agents R&D apres audit

Une fois l'audit et les premiers correctifs faits, organiser une revue croisee. Si l'environnement permet des sub-agents, delegue. Sinon, simule explicitement ces roles dans le rapport.

Roles :

- Color scientist : pipeline, espaces couleur, gamut, clipping.
- Photographe smartphone : cas reels, HDR, peau, low light.
- Colorist cinema : rolloff, contraste, peau, look fort mais propre.
- Frontend performance engineer : canvas, worker, WebGL, latence.
- UX product designer : onglet Vision simple vs expert.
- QA automation engineer : corpus, metriques, tests regression.
- Brand/look designer : familles de profils utiles et differenciantes.

La revue doit produire :

- top 10 problemes actuels ;
- top 10 profils a garder/corriger/supprimer ;
- top 10 garde-fous colorimetriques ;
- architecture recommandee du moteur filtre v2 ;
- roadmap implementation par risque.

## 12. Definition de stable

L'onglet Vision est stable seulement si :

- Les profils existants ne detruisent plus les images smartphone courantes.
- Les saturations extremes sont corrigees ou protegees.
- Aucun profil ne cree de voile gris involontaire.
- `filterIntensity` fonctionne comme un vrai dosage.
- Preview et export utilisent le meme rendu.
- Les parametres non supportes sont soit implementes, soit retires des presets.
- Les profils sont classes par intention et usage.
- Le rendu portrait respecte les tons peau.
- Les profils forts restent utilisables a intensite reduite.
- Desktop et mobile restent utilisables sans overflow.
- Les commandes de validation passent ou les blocages sont documentes.

## 13. Rapport final attendu

Structure obligatoire :

1. Resume executif : Vision stable ou non stable.
2. Pipeline actuel : ou sont les filtres, comment ils sont appliques.
3. Parametres supportes vs ignores.
4. Bugs colorimetriques trouves : saturation, voile gris, clipping, peau, neutres.
5. Profils corriges : avant/apres, raison, impact.
6. Profils a supprimer ou declasser.
7. Nouveau modele de profils recommande.
8. Garde-fous color science implementes ou recommandes.
9. UX Vision : frictions et ameliorations.
10. Performance : temps de rendu, blocage UI, taille image.
11. Tests : commandes, corpus, resultats.
12. Responsive mobile/desktop.
13. Colloque d'agents R&D : synthese et decisions.
14. Roadmap : quick wins, moteur v2, LUT/WebGL/worker, features avancees.

Sois exigeant. Un filtre reussi ne doit pas seulement etre spectaculaire sur une image ideale. Il doit survivre aux images smartphone reelles : compression, HDR, peau, ciel, vegetation, basse lumiere et couleurs deja poussees.
