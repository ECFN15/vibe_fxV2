# MEGAPROMPT - Colonne d'agents IA Studio Vibe_fx V2

Mission : integrer une vraie couche IA utile dans le studio Vibe_fx V2. Ne pas ajouter une page "credits" passive. Les credits doivent devenir visibles au moment ou l'utilisateur cree, retouche, polit, adapte, publie ou genere un media.

Tu travailles dans `C:\Users\matth\Travail\vibe_fxV2`.

Ne modifie jamais le projet source historique situe sur le Desktop.

Avant de coder, lis dans cet ordre :

1. `AGENTS.md`
2. `map.md`
3. `seo.md`
4. `MEGAPROMPT.md`
5. `.agents/skills/cyber-neon/SKILL.md`
6. `.agents/skills/dark-ui/SKILL.md`
7. `.agents/skills/technical-ui/SKILL.md`
8. `.agents/skills/motion/SKILL.md`
9. `docs/production-ai-monetization-security-megaprompt.md`
10. `docs/production-saas-audit.md`
11. `src/features/vibefx-studio/VibeFxStudio.jsx`
12. `src/features/vibefx-studio/components/Header.jsx`
13. Les panneaux existants : `StylePanel.jsx`, `FusionPanel.jsx`, `LayoutSidebar.jsx`, `VisionPanel.jsx`, `VideoEditor.jsx`, `MusicLibrary.jsx`, `ExportVideoPanel.jsx`
14. La gateway IA Functions : `functions/src/ai/jobs.js`, `functions/src/ai/policies.js`, `functions/src/ai/router.js`, `functions/src/ai/providerRegistry.js`

## Diagnostic produit

Le studio contient deja des onglets puissants :

- `Studio` : styles, presets et reglages image rapides.
- `Fusion` : composition visuelle, fonds, gradients, masques, formes.
- `Layout` : formats sociaux, templates, textes, assets, textures, geometrie, fond.
- `Library` : catalogue d'assets importables.
- `Credits` : economie IA, packs, usage, mais trop detachee des actions creatives.
- `Vision` : pipeline colorimetrique avance, diagnostics, profils safe smartphone, avant/apres.
- `Video` / `Vibe_CUT` : timeline, clips, transitions, textes, musique, exports.

Probleme actuel : la partie IA est surtout expliquee, pas incarnee dans les workflows. L'utilisateur doit voir ce que l'IA peut faire dans l'onglet ou il travaille, avec un prompt, des exemples contextualises, un prix credits estime, un choix de qualite/modele, un etat de job, puis une sortie directement reutilisable.

Objectif : creer une "colonne d'agents IA" transversale, plus des agents specialises par onglet.

## Direction UX

Ajouter un composant de droite ou drawer nomme `AICommandRail` ou `StudioAiRail`.

Ce rail est disponible dans les onglets `Studio`, `Fusion`, `Layout`, `Vision`, `Video` et optionnellement `Library`. Il ne remplace pas les panneaux metier existants. Il agit comme copilote contextuel :

- il lit l'onglet actif ;
- il sait si une image/video est importee ;
- il propose 3 a 6 actions utiles pour le contexte ;
- il contient une zone de prompt ;
- il affiche les fichiers/contextes attaches ;
- il affiche le cout credits estime ;
- il explique le provider/modele selectionne ;
- il lance un job via Functions, jamais en direct depuis le client ;
- il affiche les etats `draft`, `estimate`, `queued`, `running`, `succeeded`, `failed`, `refunded`;
- il propose l'action de sortie : appliquer au canvas, ajouter comme variante, ouvrir dans Layout, envoyer vers Publication, ajouter a la timeline Video.

Le rail doit etre dense, technique et utilisable longtemps. Direction `dark-ui` + `technical-ui`, avec signal `cyber-neon` uniquement pour les etats actifs et jobs IA. Motion limitee : transitions de panneau, progression job, aucun effet qui nuit au travail.

## Design plan obligatoire

Avant l'implementation UI, ecris un bloc :

```text
<design_plan>
Use case: studio de creation sociale avec agents IA par workflow.
Style direction: Dark UI AI Workspace + Technical UI AI Control Surface + Cyber Neon signal states.
Operating mode: densite moyenne-haute, panneaux lisibles, prompt rail, cout credits visible, etats complets.
First viewport: studio existant conserve, rail IA dockable a droite, bouton compact dans header si viewport etroit.
System contracts: tokens dark surface ladder, status pills semantiques, focus rings visibles, no raw provider secrets.
Component plan: AICommandRail, AiActionCard, AiPromptComposer, AiJobTrace, AiOutputPicker, AiCostBadge.
Motion plan: drawer 180-260ms, job progress discret, reduced-motion sans animation continue.
Anti-slop: pas de blabla marketing, pas d'action IA sans sortie appliquee, pas de provider direct client.
</design_plan>
```

## Architecture fonctionnelle cible

### 1. Socle UI commun

Creer des composants dans `src/features/vibefx-studio/components/ai/` :

- `StudioAiRail.jsx` : rail principal contextuel.
- `AiPromptComposer.jsx` : textarea, chips de contexte, bouton run.
- `AiActionCard.jsx` : action preconfiguree avec cout, duree, sortie.
- `AiJobTrace.jsx` : etapes job, provider, modele, credits, latence, statut.
- `AiOutputPicker.jsx` : resultats image/video/texte, actions appliquer/exporter.
- `AiCreditMeter.jsx` : solde, reserves, cout estime, lien achat.

Creer un module `src/features/vibefx-studio/ai/` :

- `studioAiActions.js` : catalogue d'actions par onglet.
- `studioAiPayloads.js` : construction payloads propres.
- `studioAiAdapters.js` : convertit une sortie IA en mutation studio.
- `studioAiClient.js` : wrapper `httpsCallable(functions, "createAiJob")`.
- `studioAiState.js` ou hook local : suivi job actif, historique court, erreurs.

Ne jamais exposer de cle OpenAI/Gemini/fal/Replicate dans le client.

### 2. Contrat job IA

Etendre `createAiJob` pour accepter des features media, tout en gardant :

- auth obligatoire ;
- App Check ;
- credits reserves/captures/releases en transaction ;
- idempotence via `clientRequestId` ;
- rate limit uid/feature/ipHash ;
- pas de prompt brut dans `securityEvents` ;
- outputs stockes dans Storage cote serveur si media ;
- provider/model choisi par policy serveur ;
- `productionAllowed=false` par defaut tant que benchmark non valide.

Payload client minimal :

```js
{
  feature: "image.edit.social_polish",
  prompt: "Rends cette photo plus nette, plus premium, sans changer le visage.",
  clientRequestId,
  context: {
    studioView: "vision-pro",
    sourceImagePath: "users/{uid}/uploads/source.png",
    canvasSnapshotPath: "users/{uid}/ai/inputs/{id}.png",
    format: "instagram-post",
    durationSeconds: 8,
    aspectRatio: "9:16",
    outputIntent: "apply_to_canvas"
  }
}
```

Le client peut fournir metadata et chemins Storage, mais jamais un cout final, un provider final ou un debit credits.

## Features IA par onglet

### Studio : agent "Style Director"

Besoin utilisateur : importer une image brute et obtenir rapidement un rendu social exploitable.

Actions UI :

- `Ameliorer cette image` : nettete, lumiere, contraste, peau, micro-details sans transformer le sujet.
- `Creer 3 moods social` : variantes colorimetriques appliquees comme presets non destructifs.
- `Generer caption + hashtags` : texte adapte au rendu et au format.
- `Reecrire mon prompt image` : transforme une idee vague en prompt exploitable pour generation.

Sorties :

- image editee dans une variante ;
- patch de filtres Studio/Vision ;
- caption renvoyee vers Publication.

Features backend :

- `text.caption.social`
- `text.prompt_rewrite.image`
- `image.edit.social_polish`
- `image.variation.style_set`

UI concrete :

- carte "Image importee detectee" si `images.length > 0`;
- sinon carte "Generer une base image" avec prompt text-to-image ;
- boutons de sortie `Appliquer`, `Ajouter variante`, `Envoyer Layout`.

### Fusion : agent "Composition Lab"

Besoin utilisateur : creer une direction visuelle forte pour reseaux sans regler chaque couleur a la main.

Actions UI :

- `Generer un fond de campagne` : prompt -> image/fond ou gradient guide.
- `Extraire une palette depuis l'image` : couleurs, roles CTA/signal/background.
- `Composer une affiche` : suggere mask shape, gradient, blend mode, format.
- `Generer overlay texture` : texture neon, grain, scanline, light leak, sans casser lisibilite.

Sorties :

- `fusionConfig.colors`;
- `fusionConfig.bgImage`;
- texture importable en `layoutTextures`;
- image de fond stockee dans `publications` ou `users/{uid}/ai/outputs`.

Features backend :

- `image.generate.social_background`
- `image.generate.overlay_texture`
- `vision.palette.extract`
- `text.composition.recipe`

UI concrete :

- rail de presets IA : `Cyber launch`, `Boutique premium`, `Concert reel`, `Food promo`, `Real estate`.
- preview avant application : fond seul, image seule, fusion finale.

### Layout : agent "Social Layout Builder"

Besoin utilisateur : obtenir un post/story/carrousel structure avec textes lisibles.

Actions UI :

- `Generer un layout depuis brief` : prompt -> template, format, textes, hierarchie.
- `Adapter en carrousel` : transforme un visuel en 2 ou 3 slides selon `pano-2`/`pano-3`.
- `Ecrire les textes du visuel` : titre court, sous-titre, CTA, mentions.
- `Verifier lisibilite sociale` : contraste texte/fond, safe areas, taille des mots.
- `Remplir les slots avec variations` : si plusieurs images, propose ordre et crop.

Sorties :

- patch `activeFormat`, `activeTemplate`, `texts`, `assets`, `slotConfigs`, `layoutBgColor`, `layoutTextures`;
- rapport lisibilite ;
- import vers publication avec caption pre-remplie.

Features backend :

- `text.layout.copy_social`
- `text.layout.accessibility_check`
- `image.generate.layout_asset`
- `image.edit.slot_background_extend`

UI concrete :

- chips de format : `Post`, `Story`, `Reel cover`, `Carrousel 2`, `Carrousel 3`.
- champ prompt : "Je vends une offre coaching fitness, ton premium, CTA reservation".
- resultats sous forme de patches applicables, jamais uniquement du texte.

### Vision : agent "Polish Pro"

Besoin utilisateur : aller plus loin que les filtres gratuits en obtenant une vraie retouche IA quand l'image source le merite.

Actions UI :

- `Polish premium` : retouche image IA haute qualite, detail, nettete, lumiere, peau, bruit.
- `Sauver une photo smartphone` : debruitage, dehaze, recuperation basses lumieres, tons peau.
- `Upscale social` : sortie adaptee a 1080/1440/2160 selon format.
- `Nettoyer fond leger` : suppression distractions simples via edit/mask si selection disponible.
- `Comparer gratuit vs IA` : applique le pipeline Vision local puis montre l'option IA payante.

Sorties :

- nouvelle image source remplaceable ou variante ;
- comparaison avant/apres ;
- rapport "ce qui a change" ;
- fallback local si credits insuffisants.

Features backend :

- `image.edit.vision_polish`
- `image.edit.smartphone_rescue`
- `image.upscale.social`
- `image.edit.mask_cleanup`

UI concrete :

- bouton premium pres du diagnostic existant, pas dans une page separee ;
- estimation credits plus haute que filtres locaux ;
- warning : "modifie les pixels, pas juste des sliders";
- sortie appliquable au canvas et conservant l'original.

### Video / Vibe_CUT : agent "Clip Director"

Besoin utilisateur : creer ou completer une video courte pour reels/stories/TikTok.

Actions UI :

- `Generer une video depuis prompt` : text-to-video.
- `Animer cette image` : image-to-video depuis canvas/layout ou image importee.
- `Creer intro 8s` : video courte generative a inserer au debut.
- `Generer B-roll` : scene de coupe de 4/6/8/16/20s selon provider.
- `Storyboard reel 30s` : ne genere pas 30s d'un coup si le provider ne convient pas ; produit un plan en 3 a 5 shots.
- `Generer voix off / sous-titres` : plus tard, via audio/transcription.
- `Musique IA licencee` : continuer la piste deja cadree dans `MusicLibrary`.

Sorties :

- clip video ajoute a la timeline ;
- plan de shots sous forme de clips placeholders ;
- texte overlay ajoute a la piste texte ;
- musique ajoutee avec manifest droits.

Contraintes provider :

- OpenAI Sora : generation async, statuts `queued/in_progress/completed/failed`, recuperation MP4 apres completion, `sora-2` pour exploration, `sora-2-pro` pour qualite/1080p, generations jusqu'a 20s selon docs OpenAI.
- Google Veo 3.1 Gemini API : text-to-video, image-to-video, video-to-video selon variante, 4/6/8s, audio natif, 24fps, sorties 720p/1080p/4K selon variante et contraintes.
- fal/Replicate : utiles comme aggregateurs, mais couts et licences/modeles exacts doivent etre lus par policy serveur et verrouilles par modele.

Features backend :

- `video.generate.text_to_video`
- `video.generate.image_to_video`
- `video.generate.broll`
- `video.storyboard.social_reel`
- `audio.music.generate_licensed`
- `audio.transcribe.subtitles`

UI concrete :

- dans empty state Video, ajouter deux CTA : `Importer video` et `Generer avec IA`;
- dans toolbar, ajouter bouton `AI clip`;
- modal/rail avec duree : `4s`, `6s`, `8s`, `16s`, `20s` selon provider;
- si l'utilisateur demande 30s, proposer automatiquement un storyboard en clips courts et afficher le cout total estime avant lancement;
- apres job reussi, appeler `addClip` avec le media telecharge depuis Storage/local blob.

### Library : agent "Asset Scout"

Besoin utilisateur : trouver ou creer vite des assets reutilisables.

Actions UI :

- `Generer pack stickers` : 4 assets PNG/WebP coherents.
- `Generer texture` : grain, halation, hologram, paper, glitch.
- `Rechercher assets compatibles` : catalogue local + tags.
- `Classer mes imports` : tags et usage.

Sorties :

- assets dans library utilisateur ;
- tags, source, licence, provider, prompt nettoye.

Features backend :

- `image.generate.asset_pack`
- `image.generate.texture_pack`
- `vision.asset.classify`

## Provider/router cible

Ne pas coder en dur un provider dans l'UI.

Ajouter/mettre a jour des policies Firestore `aiPricingPolicies/{feature}` avec :

```js
{
  enabled: true,
  modality: "image",
  quality: "standard",
  provider: "openai",
  model: "gpt-image-2",
  creditsCharged: 80,
  maxInputChars: 2200,
  maxOutputChars: 0,
  estimatedProviderCostUsd: 0.28,
  platformCostBufferUsd: 0.03,
  stripeAllocationUsd: 0.02,
  riskBufferUsd: 0.05,
  targetGrossMargin: 0.55,
  creditUnitValueUsd: 0.01,
  productionAllowed: false,
  routeCandidates: [
    {
      id: "openai_gpt_image_2",
      provider: "openai",
      model: "gpt-image-2",
      modality: "image",
      quality: "premium",
      productionAllowed: false,
      qualityScore: 0.92,
      latencyScore: 0.55,
      reliabilityScore: 0.75,
      legalSafetyScore: 0.9
    }
  ]
}
```

Les chiffres ci-dessus sont des placeholders. Avant production, recalculer depuis les tarifs officiels et les benchmarks reels.

## Sources API a verifier avant implementation production

Les infos de capacite/prix changent vite. Avant d'activer un provider reel, relire les sources officielles :

- OpenAI image generation/editing : https://developers.openai.com/api/docs/guides/image-generation
- OpenAI pricing : https://developers.openai.com/api/docs/pricing
- OpenAI Sora video generation : https://developers.openai.com/api/docs/guides/video-generation
- Gemini image generation : https://ai.google.dev/gemini-api/docs/image-generation
- Gemini Veo video generation : https://ai.google.dev/gemini-api/docs/video
- Gemini pricing : https://ai.google.dev/gemini-api/docs/pricing
- fal pricing / model pricing API : https://fal.ai/docs/documentation/model-apis/pricing
- Replicate pricing : https://replicate.com/pricing

Ce qui est confirme au 2026-05-20 par sources officielles consultees :

- OpenAI GPT Image permet generation et edition ; l'Image API a des endpoints generation/edit ; l'edition peut modifier une image existante et utiliser des masques.
- OpenAI Responses API permet des workflows image multi-turn avec `action: "generate"`, `action: "edit"` ou `auto`.
- OpenAI Sora API est asynchrone, expose des statuts de job, accepte text-to-video et image reference, et documente `sora-2` / `sora-2-pro` avec choix taille/duree jusqu'a 20s.
- Gemini Nano Banana/Gemini image permet generation et edition conversationnelle.
- Gemini Veo 3.1 via Gemini API supporte text-to-video et image-to-video ; les durees documentees sont 4/6/8s selon modele/contrainte, avec audio natif pour Veo 3.x.
- fal facture selon modele : image par image/megapixel, video par seconde ou par video ; les prix doivent etre recuperes par API/model endpoint.

## Implementation par lots

### Lot A - UI IA mock mais concrete

1. Creer `StudioAiRail` et l'ajouter dans `VibeFxStudio.jsx`.
2. Ajouter un bouton header `AI` qui ouvre/ferme le rail, avec etat actif.
3. Ajouter `studioAiActions.js` avec actions par onglet.
4. Faire fonctionner les actions texte existantes avec `createAiJob` mock :
   - `text.caption.draft`
   - `text.prompt_rewrite.draft`
5. Afficher sortie mock dans `AiOutputPicker`.
6. Ajouter tests smoke UI : rail visible, action par onglet, prompt, erreur Firebase non configuree, etat credits.

Definition de fini Lot A : l'utilisateur voit une IA utile dans chaque onglet, meme si les medias reels restent bloques.

### Lot B - Upload contextuel vers Storage

1. Creer snapshot canvas source en PNG/WebP.
2. Upload vers `users/{uid}/ai/inputs/{jobId}/source.png`.
3. Passer le chemin Storage dans `context`.
4. Rules Storage : ecriture client autorisee seulement input utilisateur, output IA interdit au client.
5. Afficher chips `Canvas`, `Image source`, `Format`, `Timeline`.

### Lot C - Policies media et providers en dry-run

1. Ajouter features media dans `DEFAULT_AI_PRICING_POLICIES` uniquement si mock/emulateur.
2. Ajouter schema `expectedOutputType`: `text`, `image`, `video`, `audio`, `layout_patch`.
3. Ajouter route candidates openai/gemini/fal/replicate avec `productionAllowed=false`.
4. Ajouter dry-run estimate sans appel provider reel.
5. Tests `test:ai-gateway` et `test:ai-ledger` renforces.

### Lot D - Image IA production controlee

1. Choisir un premier provider image officiel.
2. Implementer connecteur serveur.
3. Moderation/safety provider + policy interne.
4. Stocker output en Storage.
5. Retourner URL signee/chemin.
6. Brancher `image.edit.vision_polish` puis `image.generate.social_background`.
7. Benchmarker 20 prompts Vibe_fx reels.

### Lot E - Video IA production controlee

1. Ne pas lancer par defaut des 30s one-shot.
2. Router selon demande :
   - 4/6/8s : Veo ou provider video court.
   - 8/16/20s : Sora si disponible et autorise.
   - 30s : storyboard multi-shots + confirmation cout.
3. Implementer job async serveur + webhook/poll provider.
4. Stocker MP4 dans Storage.
5. Ajouter a timeline Vibe_CUT apres completion.
6. Aucun export/publication sans manifest droits/safety.

## Details UI attendus

### Rail ferme

- Bouton compact `AI` dans header, icone `Sparkles`.
- Badge si job en cours.
- Badge credits restants si compte connecte.

### Rail ouvert

Structure :

1. Header : `Agent IA`, onglet actif, solde credits, bouton fermer.
2. Action cards contextuelles.
3. Prompt composer.
4. Options : qualite, format, duree, sortie.
5. Estimate : credits, provider candidat, temps estime, risque.
6. Job trace.
7. Output picker.

Etats obligatoires :

- no image/video imported ;
- anonymous account ;
- no Firebase config ;
- insufficient credits ;
- policy disabled ;
- provider blocked ;
- queued/running ;
- succeeded ;
- failed with retry/refund message.

### Mobile

- Rail devient bottom sheet.
- Prompt composer ne couvre pas le canvas.
- Actions en horizontal scroll.
- Bouton run sticky dans la sheet seulement.

## Copy UX

Utiliser des libelles actionnables :

- `Polish premium`
- `Generer une base`
- `Animer cette image`
- `Creer un B-roll`
- `Adapter en story`
- `Verifier lisibilite`
- `Appliquer au canvas`
- `Ajouter a la timeline`
- `Envoyer vers publication`

Eviter :

- `Boost creativity`
- `Magic AI`
- `Supercharge`
- longs textes marketing dans l'app.

## Securite et anti-abus

- Toute IA media passe par Functions ou Cloud Run.
- Secrets en Secret Manager uniquement.
- App Check actif en production.
- Storage output IA non writable client.
- Rate limit par uid/feature/ipHash.
- Max input size par feature.
- Refuser prompts vides, trop longs, violents/illicites selon policy.
- Ne pas stocker prompt brut dans `securityEvents`.
- Watermark/metadata IA si provider l'impose.
- Journaliser provider/model/cout/credits/status.
- Prevoir kill switch par provider/model/feature.

## SEO

Le studio reste `noindex`.

Les pages publiques peuvent annoncer les capacites IA seulement si :

- la feature existe dans l'UI ;
- elle est clairement marquee beta si provider non final ;
- elle n'utilise pas de promesse "illimitee" ;
- elle explique credits et couts variables.

Mettre a jour `/pricing` et les pages SEO seulement apres Lot A/B visibles et Lot C cadre.

## Tests obligatoires

Apres implementation :

- `npm run lint`
- `npm run test:scope`
- `npm run audit:secrets`
- `npm run test:ai-gateway`
- `npm run test:ai-ledger`
- `npm run test:app-check`
- `npm run test:studio-ui`
- `npm run test:vision-ui` si Vision modifie
- `npm run test:video-ui` si Video modifie
- `npm run build`
- `npm --prefix functions run lint`

Ajouter un smoke dedie :

- `scripts/smoke-studio-ai-rail.spec.cjs`

Ce smoke doit verifier :

- rail AI ouvre/ferme ;
- actions changent selon onglet ;
- prompt obligatoire ;
- cout estime visible ;
- job mock texte reussit sous emulateur ou affiche erreur configuree hors Firebase ;
- aucun bouton media reel n'appelle provider depuis client ;
- mobile sans overflow.

## Definition de fini

La feature est finie quand :

- chaque onglet studio a au moins 3 actions IA pertinentes ;
- le rail IA existe et ne casse pas la structure responsive actuelle ;
- les credits sont visibles au moment de l'action ;
- les jobs passent par `createAiJob` ou un successeur serveur securise ;
- les outputs ont une action concrete dans le studio ;
- les providers reels restent bloques tant que policies, secrets, prix, licences et tests ne sont pas valides ;
- `map.md` documente les nouveaux fichiers ;
- lint/build/tests critiques passent.
