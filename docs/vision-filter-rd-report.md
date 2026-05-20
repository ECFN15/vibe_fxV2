# Rapport R&D Vision Filters

Date : 2026-05-20

## 1. Resume executif

Vision est **plus stable qu'au depart, mais pas encore validee comme stable finale**. Le moteur applique maintenant un mode `safeSmartphone` par defaut, une saturation adaptative en haute qualite, une vibrance protegee, une saturation selective peau/rouges-oranges/ciel/verts, une protection des neutres/peaux/hautes lumieres, une halation masquee sur les speculaires blancs neutres, un tint global legacy remplace par un tint pixel masque, un clamp de profils destructeurs, un garde-fou final anti-crush des ombres couleur, un blend d'intensite pixel en linear-light, des metriques image dediees aux neutres/peaux avec detection peau ponderee, et un diagnostic visible dans l'onglet Vision avec signal performance/image, mitigation rapide vers le dosage conseille et recettes correctives ciblees par risque. Il manque encore un corpus photo smartphone reel et une validation visuelle systematique.

## 2. Pipeline actuel

- Stockage profils : `CAMERA_BRANDS` dans `src/features/vibefx-studio/data/constants.jsx`.
- UI Vision : `src/features/vibefx-studio/components/panels/VisionPanel.jsx`.
- Defaults : `src/features/vibefx-studio/hooks/useStudioFilters.js`.
- Rendu : `useCanvasRenderer` appelle `renderStudio`, puis `applyFiltersPro`.
- Preview et export : meme `renderPipeline`; l'export passe en qualite `high`.
- Couleur : lecture canvas sRGB navigateur, operations via `ctx.filter` + pixels `getImageData`, retour canvas sRGB.

Ordre actuel haute qualite :

1. `ctx.filter` pour brightness/contrast/sepia/blur/hue, saturation neutralisee a 100.
2. Pixel pass : courbes, highlights/shadows, temperature, dehaze, faded blacks, split toning protege, vibrance, saturation adaptative.
3. Tint legacy overlay avec intensite normalisee.
4. Clarity, sharpness, halation.
5. Vignette, grain.
6. Blend source/final selon `filterIntensity`.

## 3. Parametres supportes vs ignores

Supportes : `brightness`, `contrast`, `saturation`, `sepia`, `blur`, `grain`, `vignette`, `tintColor`, `tintIntensity`, `filterIntensity`, `highlights`, `shadows`, `vibrance`, `skinSaturation`, `warmSaturation`, `skySaturation`, `foliageSaturation`, `temperature`, `clarity`, `sharpness`, `dehaze`, `toneCurveMaster`, `toneCurveR/G/B`, `shadowTint`, `shadowTintIntensity`, `highlightTint`, `highlightTintIntensity`, `halation`, `halationColor`, `fadedBlacks`, `hueRotate`, `safeSmartphone`, `profileStrength`.

L'audit `npm run test:vision-ui` echoue si un preset declare une cle non supportee.

## 4. Bugs colorimetriques trouves

- Saturation globale CSS appliquee avant les courbes : risque de clipping et verts/ciels trop forts.
- Split toning sur neutres : risque de blancs sales et gris teintes.
- Tints dans ombres tres basses : bruit couleur et noirs pollues.
- Profils raw avec `saturation > 120` ou `contrast > 125` sur couleur : trop agressifs pour smartphone HDR.
- `filterIntensity` faisait un alpha blend canvas simple ; corrige en blend pixel linear-light.

## 5. Profils corriges

Correction principale : les profils sont normalises a l'application via `normalizeVisionFilters`.

Impact :

- Les saturations couleur au-dessus de 120 sont plafonnees et l'exces est converti en vibrance moderee.
- Les contrastes couleur sont plafonnes a 125 en mode safe.
- Les tints shadow/highlight, halation, vignette, grain, faded blacks et details sont limites par defaut.
- Les profils forts restent visibles mais plus destructeurs.

## 6. Profils a supprimer ou declasser

Declassement explicite ajoute pour les profils camera-inspired detectes a risque : `strong` pour les looks volontairement marques, `experimental` pour Classic Neg., Ektar 100 et Leica Sepia. Les familles, cas d'usage et cas a eviter sont maintenant declares dans les donnees pour ces profils, pas seulement inferees par l'UI.

## 7. Nouveau modele de profils

Le helper `buildVisionProfileModel` genere maintenant pour chaque profil :

`id`, `name`, `family`, `intent`, `bestFor`, `avoidFor`, `strength`, `parameters`, `recommendedIntensity`, `intensityRange`, `safetyRules`, `previewTags`, `technicalNotes`, `inspirationLabel`.

Les donnees historiques `name`, `desc` et `filters` restent compatibles. Le modele canonique ajoute une intention lisible, les parametres normalises par `safeSmartphone`, un dosage conseille, une plage de dosage utile, les garde-fous appliques, un libelle `inspirationLabel` qui clarifie "inspire par" sans promettre de reproduction constructeur, et des notes techniques qui signalent par exemple une saturation ramenee de `145` a `120`, une courbe a risque, un split toning masque ou une halation en passe finale. Les miniatures et l'application d'un profil consomment maintenant `vision.parameters`, afin que le rendu applique corresponde au contrat affiche.

Familles recommandees : Natural Clean, Film Soft, Chrome Street, Cinema Night, Portrait Skin, Landscape Vivid Safe, Monochrome Rich, Editorial Matte.

## 8. Garde-fous implementes

- `safeSmartphone` actif par defaut.
- Normalisation des presets destructeurs.
- Clamp de `sepia`, `blur`, `hueRotate`, couleurs hex et courbes 5 points monotones.
- Temperature blackbody masquee en mode safe par luminance/chroma pour limiter les derives sur gris, blancs speculaires et ombres faibles.
- Halation masquee en mode safe par luminance/chroma : les sources colorees fortes gardent le halo, les blancs neutres/speculaires n'emettent presque plus de glow rouge sale.
- Tint global legacy applique en pixels par masque luminance/chroma en mode safe : il reste utilisable pour les anciens profils, mais pollue beaucoup moins les gris, blancs et ombres faibles.
- Saturation adaptative avec ceiling selon saturation source.
- Saturation selective safe pour peau, rouges/oranges, ciel bleu et vegetation, avec masques hue/luminance, reduction sur teintes proches peau et rolloff sur pixels deja satures.
- Chroma/gamut rolloff avant clamp final.
- Protection tons peau approximative par hue/channels/luminance.
- Protection neutres dans split toning.
- Shadow purity et highlight purity.
- Output guard anti-crush sur les ombres couleur en mode safe, ajoute apres vignette/grain pour eviter les aplats canal a 0.
- Blend d'intensite perceptuel en linear-light.
- Audit statique des cles supportees.
- Helper `visionMetrics.js` pour mesurer histogramme luma, clipping canal, noirs ecrases, saturation moyenne/max, pixels tres satures, neutres, neutres proteges, hue/saturation/luma peau via score pondere hue + RGB normalise + YCbCr, zones hue ciel/vegetation/rouges-oranges, range tonal P95-P05, lift des ombres/midtones, compression des hautes lumieres et score de risque de voile gris.

## 9. UX Vision

Ajoute :

- Badges `Safe smartphone` et `Dosage linear-light`.
- Miniatures calculees sur l'image courante pour comparer les profils avant application.
- Rail `Recommandes image` classe les profils selon les metriques de l'image courante : peau, ciel/verts, basse lumiere, saturation deja haute, image plate et neutres a preserver. Il affiche aussi les signaux source detectes sous forme de badges, avec fallback `polyvalent`. L'application depuis ce rail force le dosage conseille du profil, contrairement aux cartes classiques qui conservent l'intensite courante.
- Alerte `Profil actif vs image` signale les incompatibilites probables entre contenu source et profil actif : image deja saturee, peau detectee, risque voile gris, basse lumiere ou neutres sensibles aux teintes. Si une recommandation plus sure existe, le bouton `Essayer` applique cette alternative au dosage conseille.
- Reset Vision.
- Bouton maintenu `Avant` pour comparer temporairement la source a l'image filtree sans perdre l'intensite courante.
- Separateur avant/apres reglable au-dessus du canvas principal, rendu comme overlay de preview non destructif et sans impact export.
- Undo/redo local limite a 30 etats pour profils, intensite, reset et reglages simple/expert.
- Mode simple createur : Chaleur, Contraste, Peau et Grain, avec plages safe.
- Mode expert : Lumiere, Hautes lumieres, Ombres, courbe master 5 points safe, Saturation, Vibrance, saturation selective Peau/Rouge-orange/Ciel bleu/Verts, Clarte, Nettete, Anti-brume, Vignette, Grain, Noirs leves, Halation, teintes ombres/hautes lumieres et couleurs associees.
- Recherche plein texte par nom, description, famille, tags et usages.
- Filtre par famille de profil.
- Favoris utilisateur persistants en `localStorage`, avec filtre favoris.
- Rail `Comparer favoris` affichant jusqu'a 6 profils favoris avec miniatures calculees sur l'image courante, famille et dosage conseille, pour appliquer/comparer rapidement les looks retenus sans passer par le filtre favoris.
- Profils personnels nommables et sauvegardes localement en `localStorage`, affiches dans une section `Perso`, limites a 24 profils, ajoutes aux favoris a la creation et supprimables avec nettoyage des favoris associes.
- Tags profil : strength, famille, usages, cas a eviter.
- Intention, garde-fous et notes techniques exposes dans chaque carte profil pour rendre le look explicable avant application.
- Libelle "Inspire par ..." expose dans chaque carte pour separer clairement direction esthetique et reproduction exacte d'une marque.
- Dosage conseille et plage de dosage exposes pour chaque profil actif, avec un bouton `Appliquer` qui ajuste l'intensite sans cacher le controle manuel.
- Avertissement `hors plage conseillee` quand l'intensite active sort de la plage du profil, avec bouton de retour au bord recommande le plus proche.
- Avertissement visuel des profils `strong` ou `experimental`.
- Console `Diagnostic image` dans l'onglet Vision : clipping hautes lumieres, saturation forte, zones hue ciel/verts/rouges-oranges, noirs, range tonal P95-P05, score de voile gris, derive peau, neutres proteges, taille image, temps de diagnostic et taille d'echantillon, avec badge `OK safe` ou `A verifier`.
- Action `Revenir a X%` dans le diagnostic quand le profil actif sort de sa plage sure ou qu'un warning metrique apparait, afin de ramener rapidement le rendu vers le dosage conseille sans changer de profil.
- Bloc `Recettes correctives` dans le diagnostic : boutons cibles par risque (`Dose sure`, `Calmer chroma`, `Retirer voile`, `Sauver HL`, `Ouvrir ombres`, `Proteger peau`, `Nettoyer neutres`) avec patches limites sur intensite, saturation selective, highlights, ombres, tints et peau.

Reste a faire : sauvegarde cloud des favoris si le modele utilisateur le justifie, edition HSL selective complete par teinte/luminance en expert avance.

## 10. Performance

Le pipeline garde une seule passe pixel principale pour les operations couleur. Le mode drag/low conserve la passe couleur pixel et neutralise la saturation CSS globale a `100%`. Le blend linear-light ajoute une passe seulement quand `filterIntensity < 100`.

La preview interactive `studio`/`vision-pro` est plafonnee a 3 MP via `getPreviewCanvasDimensions`. Ce cap ne s'applique pas aux vues `layout`/`fusion`, ni aux chemins `renderFinalCanvas`, export et import publication, qui gardent `getCanvasDimensions` en pleine resolution et `quality='high'`. Le comparateur modal rend aussi l'apres en pleine resolution au lieu de recopier une preview reduite.

Le diagnostic Vision mesure maintenant :

- le temps de rendu source utilise pour comparer l'image avant/apres ;
- le temps total de diagnostic en ms ;
- la taille source en megapixels ;
- la taille preview en megapixels, avec indicateur de cap si la source est lourde ;
- la taille de l'echantillon borne a 420 px de grand cote et le pas de lecture.

Ces chiffres ne mesurent pas encore chaque rendu interactif du canvas principal, mais ils exposent un signal utile pour identifier les images lourdes et calibrer la future preview Worker/LUT. Un avertissement `diagnostic lent` apparait au-dela de 650 ms et `image lourde` au-dela de 20 MP.

Le mode `low` pendant drag garde maintenant la passe couleur pixel (`applyFusedPixelOps`) et les garde-fous de sortie, avec `saturate(100%)` cote CSS pour eviter une saturation globale differente du rendu final. Il continue de couper les effets spatiaux plus lourds (blur, clarte, nettete, halation, grain) afin de conserver une interaction fluide. La correspondance parfaite pendant interaction reste un objectif Worker/LUT, mais la preview low respecte desormais les courbes, temperature, vibrance, saturation selective et protections peau/neutres.

Une sonde dev/test `__vibefxVisionQualityProbe` rend le meme etat Vision en `low` et `high` hors ecran aux dimensions preview, expose aussi `fullWidth/fullHeight`, `previewWidth/previewHeight`, `previewScale` et `isPreviewCapped`, puis compare les metriques colorimetriques. Elle est desactivee en production et sert uniquement a verrouiller la parite couleur dans le smoke Playwright.

## 11. Tests

Ajoute : `npm run test:vision-ui`.

Ce test lance l'audit statique puis un smoke Playwright Vision. Il verifie :

- aucun parametre de preset non supporte ;
- `safeSmartphone` present dans les defaults ;
- le renderer branche `normalizeVisionFilters` ;
- le blend perceptuel est branche ;
- le garde-fou final `applySmartphoneOutputGuards` est branche ;
- le mode preview `low` garde la passe couleur pixel et neutralise la saturation CSS globale, tout en separant les effets spatiaux lourds ;
- une sonde runtime compare `low` vs `high` sur l'image courante et verifie que le mode `low` ne cree pas de voile gris, de derive de saturation ou de biais neutre significatif ;
- les cles, defaults, masques pixel et controles UI de saturation selective peau/rouges-oranges/ciel/verts sont branches ;
- le masque de halation safe protege une zone blanche neutre tout en gardant plus de glow rouge sur une zone neon coloree ;
- le tint global safe protege la bande neutre et deplace davantage une zone coloree qu'un gris/blanc protege ;
- les metriques par zones hue ciel/vegetation/rouges-oranges alimentent le diagnostic et les gates de saturation/clipping ;
- les metriques source alimentent un rail de recommandations par image, avec badges de signaux source, raisons courtes, application directe et dosage conseille applique automatiquement ;
- le profil actif est compare aux metriques source pour afficher des alertes contenu/profil, proposer une alternative recommandee et exposer des recettes correctives ciblees avant de valider visuellement le rendu ;
- le modele canonique genere `id`, `name`, `family`, `intent`, `bestFor`, `avoidFor`, `strength`, `parameters`, `recommendedIntensity`, `intensityRange`, `safetyRules`, `previewTags`, `technicalNotes` et `inspirationLabel` pour les 50 profils camera-inspired ;
- l'UI consomme les `parameters` canoniques normalises, pas seulement les anciens `filters` bruts ;
- les profils bruts a risque sont listes ;
- les profils bruts a risque echouent l'audit s'ils n'ont pas `strength`, `bestFor` et `avoidFor`.
- miniatures de profils calculees sur l'image courante, avec difference verifiee entre Velvia et Astia.
- mode simple par defaut et bascule expert avec reglages utilisables, dont chaleur/temperature avec protection neutres, courbe master safe, saturation selective peau/rouges-oranges/ciel/verts, halation, noirs leves, teintes shadow/highlight et couleurs tonales.
- recherche profil, filtre famille, recommandations image, favoris locaux, rail de comparaison rapide des favoris et persistance `localStorage`.
- l'onglet Vision importe l'asset demo, applique un profil, affiche l'etat actif, expose intent/inspiration/garde-fous/notes techniques/dosage conseille du profil, verifie que Velvia applique la saturation normalisee `120` en mode expert, verifie le bouton de dosage conseille `70%`, verifie l'avertissement hors plage a `100%`, la mitigation depuis `Diagnostic image` vers `80%`, la recette corrective `Dose sure` vers `80%` et le retour manuel a `80%`, expose le diagnostic image avec signal performance, score de voile et zones hue, mesure clipping/saturation/voile/peau/neutres proteges via `visionMetrics.js`, verifie undo/redo sur un profil applique, sauvegarde un profil personnel local avec nom utilisateur, verifie sa persistance/recherche/favori, supprime ce profil et nettoie les favoris associes, verifie le split avant/apres reglable, verifie le bouton maintenu `Avant`, verifie qu'une intensite 50 produit bien un rendu intermediaire, revient proche de la source a intensite 0 et reset l'etat actif.
- une fixture metrique synthetique volontairement delavee verifie que `greyVeilScore`, `tonalRangeRatio`, `shadowLiftDelta` et `saturationRatio` declenchent bien `greyVeilRisk`.
- une fixture metrique synthetique peau claire/medium/foncee verifie que `skinToneRatio` reste mesure sur plusieurs tons et qu'une derive de hue peau est detectee.
- une fixture synthetique smartphone-like en memoire teste Velvia, Ektar 100 et Leica Sepia contre clipping hautes lumieres, noirs ecrases, saturation excessive, zones hue ciel/verts/rouges-oranges, neutres pollues, bias des neutres proteges, derive hue/saturation peau et voile gris, et verifie qu'un profil incompatible expose une recette corrective contextuelle.
- une verification par regions sur fixture synthetique mesure que `Peau`, `Ciel bleu` et `Verts` modifient leur zone cible tout en gardant une bande neutre stable, et que la chaleur maximale deplace moins les neutres que la zone chaude coloree.
- un viewport mobile 390px verifie que l'onglet Vision reste utilisable sans overflow horizontal apres import et application de profil.
- une fixture synthetique 4200x3200 verifie que la preview interactive Vision reste sous 3,05 MP, que la sonde expose les dimensions pleine resolution, que `isPreviewCapped=true` et que le detail de performance affiche la preview cappee.

Resultats du 2026-05-20 :

- `npm run test:vision-ui` : OK, 7 tests Playwright incluant le cap preview 3 MP sur fixture 4200x3200.
- `npm run lint` : OK avec 17 warnings existants hors patch Vision.
- `npm run build` : OK.
- `npm --prefix functions run lint` : OK.
- `npm run test:studio-ui` : OK avec serveur Next dedie ; le scenario importe l'image demo locale puis verifie le passage studio/layout vers publication.

Corpus reel non present : validation perceptuelle non terminee. La fixture synthetique couvre des rampes neutres, peaux, ciel, verts, tungsten, neons et noirs speculaires, mais elle ne remplace pas des JPEG/HEIC smartphone reels.

Ajoute : `npm run check:vision-corpus` et `npm run test:vision-corpus`.

`check:vision-corpus` verifie les 12 cas smartphone attendus dans `test-fixtures/vision-corpus`, dossier local ignore par Git. Elle est non bloquante par defaut et devient bloquante avec `VISION_CORPUS_REQUIRED=1` ou `--strict`. `test:vision-corpus` demarre Next puis applique Velvia, Ektar 100 et Leica Sepia aux fixtures presentes avec des gates clipping/saturation/neutres/peau/voile. Etat actuel : `0/12` fixture presente, donc le test navigateur passe en skip et la stabilite finale reste non prouvee.

## 12. Responsive

L'onglet reste dans la sidebar existante avec cartes verticales, tags flex-wrap et boutons compacts. Le smoke Vision verifie maintenant un viewport 390x844 sans overflow horizontal apres import, selection de marque et application de Velvia.

## 13. Colloque R&D

- Color scientist : valider OKLab/OKLCH pour v2, mais le patch Canvas 2D est le bon compromis court terme.
- Photographe smartphone : priorite aux peaux, ciels, verts et HDR deja sature.
- Colorist cinema : conserver les looks forts, mais les etiqueter et les rendre excellents a 40-80%.
- Frontend performance : eviter les LUT/WebGL tant que le pipeline 2D n'est pas mesure sur corpus.
- UX product : mode simple par defaut, expert derriere details.
- QA automation : ajouter fixtures locales representant 12 cas smartphone.
- Brand/look designer : noms inspires, pas promesses de reproduction constructeur.
- Performance engineer : plafonner la preview Vision a 2-3 MP et garder le full-res pour export.

## 14. Roadmap

Quick wins :

- Ajouter les 12 fixtures smartphone locales non versionnees decrites dans `docs/vision-smartphone-corpus.md`, lancer `npm run test:vision-corpus`, puis rendre `npm run check:vision-corpus` strict dans la gate release.
- Remplacer progressivement les metadonnees inferees par des champs rediges manuellement pour les familles clefs, maintenant que le contrat complet est genere et audite.
- Rediger manuellement les libelles "inspire par" des familles prioritaires si le vocabulaire automatique devient trop generique.
- Ajouter des fixtures supplementaires au-dela de l'asset demo + fixture synthetique.

Moteur v2 :

- OKLab/OKLCH pour chroma et hue shift.
- Selective HSL complet par hue/luma, au-dela des quatre plages safe deja exposees.
- Detection peau ponderee implementee dans les metriques, a calibrer sur corpus reel pour eviter faux positifs/faux negatifs.
- Grey veil detector maintenant base sur score histogramme/range/saturation/lift, a calibrer sur corpus reel.

Avance :

- Worker + OffscreenCanvas pour rendre la preview interactive low encore plus fidele, y compris effets spatiaux lourds.
- LUT 3D optionnelle pour looks cinema.
- WebGL shader si la preview devient trop lente.
