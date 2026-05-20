# MEGAPROMPT - Vibe_fx V2 production AI, monetization, security and video editor roadmap

Tu travailles dans `C:\Users\matth\Travail\vibe_fxv2`.

Mission : transformer Vibe_fx V2 en produit SaaS public securise, monetisable et scalable autour du studio image/video, avec paiement Stripe, credits IA, dashboard utilisateur, generation IA controlee, catalogue musique pro/IA, export video robuste et defenses anti-abus. Tu dois agir comme architecte produit + engineer full-stack senior + security engineer + fintech/payments engineer + AI cost engineer.

Date de reference : 2026-05-20. Avant toute decision de pricing/API, verifier les pages officielles car les tarifs et disponibilites changent souvent.

Sources officielles a verifier au demarrage :

- OpenAI pricing/models : https://openai.com/api/pricing/ et https://developers.openai.com/api/docs/models
- Gemini pricing/models : https://ai.google.dev/gemini-api/docs/pricing
- Anthropic pricing : https://platform.claude.com/docs/en/about-claude/pricing
- Groq pricing : https://groq.com/pricing
- DeepSeek API : https://api-docs.deepseek.com/
- Moonshot/Kimi API : https://www.kimi.com/help/kimi-api/api-pricing
- Alibaba Qwen / Model Studio : https://www.alibabacloud.com/help/en/model-studio/
- Zhipu/GLM : https://open.bigmodel.cn/
- MiniMax pricing/API : https://www.minimax.io/pricing et https://platform.minimax.io/docs/pricing/overview
- ByteDance/Volcengine/BytePlus Seed/Doubao/Seedance : verifier l'acces officiel local/international et les conditions enterprise avant toute integration.
- Together AI pricing : https://www.together.ai/pricing
- Fireworks pricing : https://fireworks.ai/pricing
- OpenRouter pricing/models : https://openrouter.ai/pricing
- Hugging Face Inference Providers : https://huggingface.co/docs/api-inference/en/pricing
- fal pricing : https://docs.fal.ai/documentation/model-apis/pricing
- Replicate pricing : https://replicate.com/pricing
- Runware pricing : https://runware.ai/pricing/
- Ideogram API pricing : https://ideogram.ai/features/api-pricing
- Leonardo AI API/pricing : https://leonardo.ai/pricing/
- Midjourney : verifier s'il existe enfin une API officielle. Sans API officielle, ne pas integrer en production.
- Civitai : verifier API, licence par modele, restrictions commerciales et risques content safety avant tout usage.
- Mubert API/pricing : https://mubert.com/api
- Stripe Checkout : https://docs.stripe.com/payments/checkout
- Stripe usage billing/credits : https://docs.stripe.com/billing/subscriptions/usage-based
- Stripe webhooks : https://docs.stripe.com/webhooks
- Firebase callable/App Check : https://firebase.google.com/docs/functions/callable et https://firebase.google.com/docs/app-check/cloud-functions
- Firestore transactions : https://firebase.google.com/docs/firestore/manage-data/transactions
- Firebase rules/auth : https://firebase.google.com/docs/rules/rules-and-auth

## 0. Regles projet obligatoires

Avant toute modification, lire dans cet ordre :

1. `AGENTS.md`
2. `map.md`
3. `seo.md`
4. `MEGAPROMPT.md`
5. `.agents/skills/cyber-neon/SKILL.md`
6. `.agents/skills/dark-ui/SKILL.md`
7. `.agents/skills/technical-ui/SKILL.md`
8. `.agents/skills/motion/SKILL.md`
9. `docs/music-sourcing-and-import-plan.md`
10. `src/features/vibefx-studio/video/`
11. `functions/index.js`
12. `firestore.rules`
13. `storage.rules`

Contraintes non negociables :

- Ne jamais modifier le projet source historique situe sur le Desktop.
- Ne pas toucher a `node_modules/`, `.next/`, `.git/`, `dist/`.
- Mettre a jour `map.md` si tu crees, supprimes, renommes, deplaces ou restructures un fichier.
- Ne jamais hardcoder de secret. Utiliser Firebase Secret Manager / variables d'environnement serveur.
- Les uploads utilisateurs persistants passent par Firebase Storage.
- Les appels IA, musique API, paiement et publication restent cote serveur Firebase Functions ou Cloud Run.
- Le client ne doit jamais appeler directement OpenAI/Gemini/Mubert/fal/Replicate/Runware/Stripe secret APIs.
- Les surfaces studio/app privees restent `noindex`.
- Toutes les operations credit/paiement doivent etre idempotentes et journalisees.

## 1. Objectif produit

Construire une version production de Vibe_fx avec :

- compte utilisateur Firebase Auth ;
- offre premium a paiement unique donnant acces au site complet hors consommation IA ;
- boutique de credits IA rechargeables ;
- dashboard utilisateur : statut premium, credits, historique, usage, exports, factures ;
- routage multi-modeles IA performant/cout-efficace ;
- protection anti-abus contre requetes IA non payees, duplication de credits, attaques console, replay, scripts, surcharge serveur ;
- export video plus robuste ;
- musique pro/IA avec licences propres ;
- roadmap technique chiffree pour marge et rentabilite.

## 2. Architecture cible

Conserver l'architecture choisie :

- Next.js App Router + Firebase App Hosting.
- Firebase Auth pour utilisateurs.
- Firestore pour profils, credits, jobs, manifests, payments, ledgers.
- Firebase Storage pour uploads/exports/assets generes.
- Firebase Functions v2 pour callables, webhooks Stripe, jobs courts.
- Cloud Run optionnel pour jobs longs : rendu video, IA media lourde, queues.
- Secret Manager pour cles fournisseurs.
- App Check obligatoire pour fonctions exposees au client.

Flux critique :

```text
Client Next.js
  -> Firebase Auth + App Check
  -> callable createAiJob / reserveCredits
  -> Firestore transaction reserve credits
  -> provider API server-side
  -> Storage output
  -> Firestore finalize job + credit ledger
  -> UI dashboard realtime
```

Le client ne calcule jamais le vrai prix, ne debite jamais les credits et ne decide jamais seul de l'acces premium.

## 3. Model router IA recommande

Creer un module serveur `functions/src/ai/modelRouter.js` ou equivalent.

Le router doit choisir un provider selon :

- type de tache : text, caption, prompt rewrite, image generation, image edit, video generation, transcription, music generation ;
- qualite demandee : draft, standard, premium ;
- budget utilisateur ;
- latence ;
- batch possible ;
- disponibilite provider ;
- marge cible ;
- politique de securite.

Ne pas limiter le router aux fournisseurs americains. Il doit supporter trois niveaux :

1. **Direct official APIs** : OpenAI, Gemini, Anthropic, DeepSeek, Kimi/Moonshot, Qwen/Alibaba, Zhipu/GLM, MiniMax, Mistral, Groq, Mubert, Ideogram, Leonardo, etc.
2. **Inference routers / aggregateurs** : OpenRouter, Together, Fireworks, Hugging Face Inference Providers, fal, Replicate, Runware. Utile pour comparer prix/latence, acceder a Qwen/DeepSeek/Kimi/Llama/gpt-oss/Flux/Wan/Kling/Seedance selon disponibilite, et avoir fallback multi-provider.
3. **Model marketplaces / community models** : Civitai, Hugging Face model hub, autres catalogues de LoRA/checkpoints. A traiter comme sources de modeles, pas comme fournisseur SaaS garanti, sauf si une API officielle, une licence commerciale claire, une moderation et un SLA existent.

Chaque provider doit etre decrit dans une registry serveur :

```js
{
  id: "deepseek",
  region: "CN",
  access: "direct-api",
  modalities: ["text", "reasoning", "coding"],
  apiStyle: "openai-compatible",
  dataPolicy: "verify-official",
  pricingUrl: "https://api-docs.deepseek.com/",
  reliabilityTier: "candidate",
  legalRisk: "medium",
  productionAllowed: false,
  notes: "Activer seulement apres verification DPA, logs, retention, paiement, quotas et conformite."
}
```

`productionAllowed` doit rester `false` tant que les points suivants ne sont pas verifies :

- API officielle ou contrat clair ;
- prix programme ou page officielle ;
- region et traitement des donnees acceptables ;
- politique d'utilisation des prompts pour entrainement ;
- droits commerciaux sur sorties ;
- moderation et abus ;
- SLA/quota/rate limits ;
- support paiement et facturation previsible ;
- absence d'utilisation d'API reverse-engineered ou de comptes grand public automatises.

### 3.0 Benchmark fournisseur obligatoire

Avant d'integrer un fournisseur, creer un benchmark comparatif dans `docs/` :

```text
provider
model
modality
officialPricingUrl
inputCost
outputCost
unit
latencyP50
latencyP95
failureRate
qualityScore
licenseRisk
dataRetentionRisk
regions
maxConcurrency
rateLimitPolicy
refundPolicy
recommendedUse
marginAtCurrentCreditPrice
```

Tester au minimum 20 prompts reels Vibe_fx par categorie :

- captions social ;
- prompt rewrite image ;
- moderation text/image ;
- generation image produit/social ;
- video prompt/storyboard ;
- audio/music prompt ;
- transcription/captioning ;
- export helper/diagnostic.

Ne jamais choisir seulement le moins cher. Le router doit scorer :

```text
score = quality * 0.35 + margin * 0.25 + latency * 0.15 + reliability * 0.15 + legalSafety * 0.10
```

### 3.1 Texte, caption, SEO, prompt rewrite

Recommandation de depart :

- Default low cost : Gemini `gemini-3.1-flash-lite` ou Groq `openai/gpt-oss-20b` pour reformulation simple, tags, captions, classification.
- Standard : OpenAI `gpt-5.4-mini` pour qualite stable, vision/text, tooling leger.
- Premium : OpenAI `gpt-5.4` ou Anthropic Sonnet pour planning complexe, audit, generation de templates.
- Reserve expert : OpenAI `gpt-5.5` uniquement pour operations premium cheres ou admin.
- Candidats non-US a benchmarker : DeepSeek, Kimi/Moonshot, Qwen/Alibaba, Zhipu/GLM, MiniMax, Baidu ERNIE, Tencent Hunyuan.
- Candidats open-weight heberges : Qwen, DeepSeek, Kimi, GLM, Llama, gpt-oss, Mistral via Together/Fireworks/Groq/OpenRouter/Hugging Face.

Regles cout :

- Utiliser cache prompt si system prompt long.
- Utiliser Batch/Flex pour jobs non urgents.
- Imposer `max_output_tokens`.
- Refuser les prompts trop longs sans pack credit suffisant.
- Stocker tokens in/out, provider, model, cout estime et cout reel.

### 3.2 Image generation/edit

Recommandation de depart :

- Low cost/draft : provider type Runware/fal avec modeles rapides open-source selon cout courant.
- Standard : OpenAI GPT Image mini/latest ou FLUX via fal/Replicate selon meilleur cout/qualite du jour.
- Premium : OpenAI GPT Image high quality ou modele premium fal/Runware.
- Candidats a benchmarker : Ideogram API pour texte/logo/typographie, Leonardo API pour workflow createur, Black Forest Labs/FLUX via provider officiel ou aggregateur, Stability/SD3/SDXL, Qwen Image, Seedream/ByteDance si API officielle accessible.
- Civitai/Hugging Face LoRA/checkpoints : uniquement via pipeline auto-heberge ou provider qui autorise commercialement le modele. Capturer licence, creator, version, hash du modele, trigger words, restrictions commerciales et safety rating.
- Midjourney : excellent outil creatif/reference, mais ne pas brancher en production tant qu'il n'existe pas d'API officielle publique et des droits d'automatisation clairs. Interdire les APIs Discord reverse-engineered.

Exigences :

- Chaque generation image est un job asynchrone avec reservation de credits.
- Chaque output va dans Firebase Storage `users/{uid}/ai/image-jobs/{jobId}/...`.
- Enregistrer prompt original, prompt nettoye, seed si disponible, dimensions, provider, model, cout.
- Ajouter detection de contenu interdit avant appel provider.
- Ajouter watermark interne non visible ou metadata manifest pour audit, pas de watermark visuel sauf offre gratuite.

### 3.3 Video generation/rendering

Deux flux distincts :

1. Export edition Vibe_CUT : rendu du montage utilisateur.
2. Generation IA video : text-to-video / image-to-video.

Pour export Vibe_CUT :

- Court terme : ameliorer navigateur avec WebCodecs quand dispo et fallback MediaRecorder.
- Production : Cloud Run + FFmpeg pour rendu deterministe MP4/WebM, audio mix, textes, transitions, filtres, droits manifest.
- Stocker exports dans Firebase Storage.

Pour generation IA video :

- Router vers OpenAI Sora / Gemini Veo / fal / Runware / Replicate selon disponibilite, cout et licence.
- Benchmarker aussi MiniMax Hailuo, Kling, Wan, Seedance/ByteDance, Luma, Runway si API officielle/partenariat, selon prix et droits.
- ByteDance Seedance/Seedream : ne pas utiliser via proxy non officiel ; verifier acces BytePlus/Volcengine officiel, regions, KYC, droits, copyright/deepfake policy et disponibilite pays.
- Toujours job async, jamais callable longue synchrone.
- Credits eleves, marge stricte, limite duree/resolution.
- Afficher avant lancement : prix credit, duree estimee, non-remboursable sauf erreur serveur/provider.

### 3.4 Transcription, captions, speech

Recommandation :

- Low cost : Groq Whisper Large v3 Turbo si disponible et cout favorable.
- Standard : OpenAI transcription mini/Whisper selon tarifs officiels.
- Premium : diarization si necessaire.

Exigences :

- Generer SRT/VTT + segments JSON.
- Permettre captions/karaoke plus tard.
- Debiter par minute audio arrondie au palier minimal.

### 3.5 Musique IA et catalogue pro

Priorite :

- Catalogue pro : Epidemic Sound / Soundstripe / Artlist via partenariat/API officielle.
- Musique IA : Mubert API en premier candidat, car API publique, generation, streaming, sub-licensing, plans 5K/30K generations.
- Beatoven/Stable Audio : evaluer contrat/API avant integration.
- Suno/Udio : ne pas connecter automatiquement avant validation juridique stricte.

Exigences :

- Aucune musique externe sans source, licence, attribution, acquiredAt.
- Rights manifest obligatoire a l'export et a la publication.
- Import utilisateur persistant via Firebase Storage avec declaration de droits.
- Bloquer publication si piste sans droits declares.

## 4. Paiement et business model

Utiliser Stripe.

Approche recommandee :

- Paiement unique premium : Stripe Checkout Session `mode=payment`.
- Packs credits IA : Stripe Checkout Session `mode=payment`.
- Plus tard seulement : abonnement recurrent optionnel pour gros createurs, via Stripe Billing.
- Ne pas utiliser un abonnement illimite IA. Les couts API sont variables et peuvent exploser.

### 4.1 Produits Stripe

Creer ces produits dans Stripe Dashboard ou via script admin :

- `premium_lifetime`
  - prix cible initial : 29 EUR ou 49 EUR.
  - donne acces aux outils non IA premium : templates, exports plus longs, stockage projet, outils avancees.
  - ne donne pas credits IA illimites.

- `credits_500`
  - prix client : 5 EUR.
  - credits internes : 500.

- `credits_1200`
  - prix client : 10 EUR.
  - credits internes : 1200.

- `credits_3200`
  - prix client : 25 EUR.
  - credits internes : 3200.

- `credits_7000`
  - prix client : 50 EUR.
  - credits internes : 7000.

Adapter apres calcul reel. L'objectif est une marge nette minimale de 50% apres cout API + Stripe + Firebase.

### 4.2 Regle de marge

Chaque feature IA doit definir :

```js
{
  feature: "image.generate.standard",
  provider: "openai",
  model: "gpt-image-*",
  estimatedProviderCostUsd: 0.034,
  platformCostBufferUsd: 0.006,
  targetGrossMargin: 0.60,
  creditPriceUsd: 0.10,
  creditsCharged: 10
}
```

Formule :

```text
minClientPrice = (providerCost + firebaseCost + stripeAllocation + riskBuffer) / (1 - targetMargin)
creditsCharged = ceil(minClientPrice / creditUnitValue)
```

Ne jamais facturer uniquement au feeling. Chaque endpoint IA doit avoir un `pricingPolicy`.

### 4.2.1 Pricing dynamique par provider

Les fournisseurs chinois, open-weight et aggregateurs peuvent etre beaucoup moins chers, mais leurs prix, limites, politiques data et disponibilites changent vite. Ne jamais coder un prix fixe comme verite permanente.

Creer une table serveur :

```text
aiProviderPriceSnapshots/{snapshotId}
  provider
  model
  modality
  unit
  inputUsdPerUnit
  outputUsdPerUnit
  mediaUsdPerSecond
  mediaUsdPerImage
  sourceUrl
  fetchedAt
  checkedBy
  confidence: "official" | "partner" | "manual" | "unknown"
```

Les prix client doivent venir de `aiPricingPolicies`, pas directement de la page provider. Si le cout provider augmente au-dessus de la marge minimale :

- bloquer les jobs non essentiels ;
- basculer vers fallback moins cher ;
- augmenter credits requis apres validation admin ;
- notifier admin.

Objectif marge par famille :

- texte simple : marge brute 70%+ ;
- image standard : marge brute 55%+ ;
- video IA : marge brute 45%+ minimum car cout volatile ;
- musique IA : marge brute 50%+ ;
- export serveur : marge brute 50%+.

Pour les fournisseurs non-US ou moins connus, appliquer un `riskBuffer` plus haut tant que fiabilite, support, politique data et droits commerciaux ne sont pas prouves.

### 4.3 Credit unit

Definir une unite simple :

- 1 credit = environ 0.01 EUR de valeur client.
- Cout interne cible par credit consomme <= 0.004 EUR pour garder marge.
- Bonus credits possibles, mais separes des paid credits.

Le dashboard doit afficher credits, pas cout provider.

## 5. Systeme credits anti-duplication

Ne jamais stocker seulement `user.credits = 1000` comme source de verite.

Utiliser un ledger immuable :

```text
users/{uid}
  plan: "free" | "premium"
  premiumUntil: null | timestamp
  creditBalance: number
  bonusCreditBalance: number
  lifetimePaidCents: number
  createdAt, updatedAt

users/{uid}/creditLedger/{entryId}
  type: "purchase" | "reserve" | "capture" | "release" | "refund" | "admin_adjustment"
  amount: number
  balanceAfter: number
  jobId: string | null
  stripeSessionId: string | null
  idempotencyKey: string
  createdAt
  actor: "stripe_webhook" | "ai_job" | "admin"

aiJobs/{jobId}
  uid
  feature
  status: "created" | "reserved" | "running" | "succeeded" | "failed" | "refunded"
  estimatedCredits
  capturedCredits
  provider
  model
  providerRequestId
  idempotencyKey
  inputHash
  outputStoragePath
  errorCode
  createdAt, updatedAt
```

Regle transactionnelle :

1. Client demande `createAiJob`.
2. Function verifie Auth + App Check + premium/credits.
3. Firestore transaction :
   - lit user ;
   - verifie creditBalance ;
   - cree aiJob status `reserved` ;
   - ajoute ledger `reserve` ;
   - decremente balance disponible ou marque credits reserves ;
   - utilise idempotencyKey unique.
4. Function appelle provider.
5. Function finalize :
   - success : ledger `capture`, status `succeeded`.
   - failure provider/server : ledger `release/refund`, status `failed`.
   - failure policy/user input refuse : pas de refund si provider deja appele selon regle affichee.

Protection anti double clic :

- `idempotencyKey = uid + feature + clientRequestId`.
- Si meme key existe, retourner le job existant.
- Ne jamais recreer reservation pour meme key.

## 6. Connexion utilisateur et dashboard

Implementer :

- Firebase Auth email/password + Google sign-in.
- Anonymous Auth autorisee pour tester, mais achat/credits exigent compte lie a email.
- Upgrade anonymous -> permanent account avant paiement.
- Dashboard `/account` prive noindex.

Dashboard attendu :

- Carte profil : email, uid, statut premium.
- Barre credits : credits restants, credits reserves, credits bonus.
- Usage par categorie : image, video, musique, transcription, export.
- Historique jobs IA avec status, cout credits, date, bouton reouvrir.
- Historique paiements avec Stripe session/payment intent id.
- Boutique : premium lifetime + packs credits.
- Alertes securite : derniere connexion, sessions, usage anormal.
- Bouton supprimer compte avec purge conforme.

## 7. Boutique achat

Pages :

- `/pricing` public indexable : premium lifetime + credits IA, FAQ claire.
- `/account/billing` prive noindex : achat, invoices, historique.
- `/account/usage` prive noindex : barres usage.

Flux achat :

1. Client clique pack.
2. Callable `createCheckoutSession` cote serveur.
3. Function verifie Auth.
4. Function cree Stripe Checkout Session.
5. Metadata stricte :
   - `uid`
   - `productType`
   - `creditAmount`
   - `priceId`
   - `clientRequestId`
6. Stripe redirige.
7. Webhook Stripe est seule source de fulfillment.
8. Webhook verifie signature Stripe.
9. Webhook transaction Firestore idempotente.
10. Dashboard se met a jour.

Ne jamais accorder premium/credits sur retour `success_url`.

## 8. Securite application

Threat model prioritaire :

- utilisateur modifie JS dans console pour appeler IA sans payer ;
- replay de requetes callable ;
- duplication credits par double webhook Stripe ;
- vol de cle API exposee client ;
- upload fichier dangereux ;
- XSS via prompt, titre, caption, nom fichier ;
- SSRF via import URL ;
- spam de jobs IA avec comptes gratuits ;
- abus App Check debug token ;
- contournement Firestore rules ;
- attaque par concurrence sur debit credits ;
- webhook Stripe falsifie ;
- DoS par gros prompts ou gros fichiers ;
- publication avec token Meta vole/expire.
- fuite de donnees vers provider IA avec retention/entrainement non acceptee ;
- provider non officiel qui route vers un modele different de celui annonce ;
- modele marketplace dont la licence interdit usage commercial ;
- modele communautaire dangereux/non modere ;
- fournisseur low-cost qui change prix ou limites sans preavis.

Controles obligatoires :

- Auth obligatoire sur endpoints IA/paiement.
- App Check enforce sur callables.
- Firestore rules : user lit/ecrit seulement ses documents non sensibles ; aucun write direct sur ledger/payments/aiJobs finals.
- Admin SDK seulement cote functions pour ledger, payments, jobs.
- Secret Manager pour provider keys.
- Rate limiting par uid + IP hash + feature.
- Quotas free stricts.
- Job queue avec concurrence par user.
- Validation schema serveur avec Zod ou equivalent.
- Sanitization output avant affichage.
- CSP stricte sur Next.
- Pas d'import URL arbitraire v1.
- Upload validation MIME + magic bytes + taille + duree.
- Logs securite `securityEvents`.
- Alertes admin si usage anormal.
- Budget caps provider au dashboard fournisseur.
- Allowlist stricte des providers production.
- Kill switch par provider/model/feature.
- Blocage automatique si marge estimee < seuil.
- Audit log de provider selection pour chaque job.
- DPA/ToS/licence notes dans registry provider.

Regle fournisseurs :

- `trusted` : officiel, contrat/licence verifiee, monitoring actif, production autorisee.
- `candidate` : benchmark possible, admin-only, pas expose aux utilisateurs.
- `blocked` : API non officielle, scraping, droits flous, safety impossible.

Midjourney sans API officielle publique doit rester `blocked` pour integration serveur. Il peut rester dans une liste `manualCreativeReference` uniquement.

Civitai doit rester `candidate` pour veille/model discovery, jamais `trusted` globalement. Chaque modele Civitai doit etre evalue individuellement avec licence commerciale, hash/version, createur, usage interdit, safety review et provenance.

## 9. Securite credits/paiements

Stripe :

- Utiliser Checkout Sessions pour one-time payments.
- Webhook HTTPS uniquement.
- Verifier signature webhook.
- Idempotence sur `event.id`, `checkout.session.id`, `payment_intent`.
- Ignorer tout event non attendu.
- Fulfillment seulement sur `checkout.session.completed` + payment status valide.
- Enregistrer raw minimal event metadata, pas donnees carte.
- Tester avec Stripe CLI.

Firestore :

- Toutes operations credit dans transaction.
- Ledger append-only.
- Interdire client write sur ledger.
- Ne jamais faire confiance a `creditAmount` venant du client.
- Mapper `priceId -> credits` cote serveur uniquement.
- Bloquer credit negatif.
- Ajouter reconcile job quotidien Stripe vs Firestore.

## 10. Export video production

Objectif : export deterministe, publiable, non noir, audio mixe, texte net, ratio correct.

Phases :

### Phase A - Court terme navigateur

- Garder MediaRecorder fallback.
- Detecter support WebM/MP4 et annoncer vrai format.
- Ajouter metadata validation via ffprobe en test local/CI si dispo.
- Ajouter progress + annulation + anti double clic.
- Ajouter tests export audio/video/text.

### Phase B - WebCodecs

- Renderer frame-by-frame avec seek attendu.
- Encoder via WebCodecs si disponible.
- Audio via WebAudio OfflineAudioContext.
- Fallback MediaRecorder.

### Phase C - Cloud Run FFmpeg

- Export job envoye serveur.
- Assets source lus depuis Storage.
- Composition JSON deterministe.
- FFmpeg encode MP4 H.264/AAC + WebM optionnel.
- Progress par Firestore.
- Cout credits pour exports longs/premium.
- Sortie Storage avec expiration ou retention selon plan.

## 11. Undo/redo production

Implementer historique robuste :

- Command pattern ou snapshots debounces.
- Toutes actions couvertes : trim, split, reorder, speed, filter, volume, text move/edit, transition move/resize, music import/delete.
- Regrouper drag continu en une seule entree history.
- Ctrl+Z / Ctrl+Shift+Z.
- Tests unitaires store + Playwright.

## 12. Waveform reelle et audio pro

Implementer :

- Decode audio via Web Audio `decodeAudioData`.
- Generer peaks downsampled.
- Cache peaks en IndexedDB local, puis Storage/Firestore si projet cloud.
- Afficher waveform stable.
- Fades in/out handles.
- Mute/solo/lock par track.
- Master meter + clipping warning.
- Plus tard : BPM/beat grid, ducking auto, loudness target.

## 13. Timeline mobile tactile

Objectif : utilisable au doigt.

- Cibles tactiles 44px minimum.
- Bottom sheets par outil.
- Timeline rows plus hautes sur mobile.
- Handles trim larges.
- Long press menu.
- Snap magnetique.
- Pinch/slider zoom.
- Drag avec pointer capture partout.
- Tests Playwright mobile : drag playhead, trim, move text, open panels, export.

## 14. CI et tests export profonds

Ajouter :

- Tests store unitaires credits/transactions en emulateur.
- Tests Stripe webhook idempotence avec fixtures.
- Tests Firestore rules : client ne peut pas modifier ledger/payments.
- Tests Functions callables : unauth/appcheck absent refuse.
- Tests AI router en mock provider.
- Tests credit reservation/capture/refund.
- Tests Playwright achat mock Stripe.
- Tests export ffprobe : resolution, duree, audio stream, non-black frames.
- Tests securite basiques : XSS strings, oversized prompts, repeated requests, double click.

## 15. Roadmap d'implementation

### Lot 0 - Provider scouting global et economie IA

- Rechercher fournisseurs US, Europe, Chine/Asie, open-weight, aggregateurs et marketplaces.
- Verifier uniquement sources officielles ou contrats partenaires.
- Construire `providerRegistry`.
- Classer `trusted/candidate/blocked`.
- Benchmarker qualite/cout/latence sur prompts Vibe_fx reels.
- Construire `aiProviderPriceSnapshots`.
- Construire `aiPricingPolicies` avec marge, riskBuffer et fallback.
- Identifier fournisseurs a exclure : API reverse-engineered, droits flous, data policy incompatible, contenu non modere.

Definition of done :

- chaque provider a une source officielle, un statut et une raison ;
- chaque feature IA a au moins un provider principal et un fallback ;
- aucun provider non officiel n'est expose aux utilisateurs ;
- les prix credits couvrent cout API + Stripe/Firebase + marge.

### Lot 1 - Fondations securite et comptes

- Firebase Auth permanent + upgrade anonymous.
- App Check web.
- Rules Firestore/Storage durcies.
- Dashboard utilisateur minimal.
- `users/{uid}` schema.
- Tests emulator.

Definition of done :

- un utilisateur connecte voit son dashboard ;
- un utilisateur ne peut lire/ecrire que ses donnees autorisees ;
- callables sensibles refusent unauth ;
- App Check pret a enforce.

### Lot 2 - Stripe premium + credits

- Produits Stripe.
- Checkout Sessions.
- Webhook signature.
- Ledger credits append-only.
- Idempotence.
- Boutique `/pricing` + `/account/billing`.
- Tests Stripe CLI + emulator.

Definition of done :

- achat premium active compte via webhook ;
- achat credits credite une seule fois meme si webhook rejoue ;
- retour success_url seul ne donne rien.

### Lot 3 - AI gateway credits

- `createAiJob`.
- Model router.
- Reservation/capture/refund.
- Mock provider.
- Rate limits.
- Dashboard usage.

Definition of done :

- impossible de lancer une IA sans credits ;
- double click ne double-debite pas ;
- echec provider rembourse selon politique ;
- cout/marge journalises.

### Lot 4 - Image/text AI production

- Prompt rewrite low cost.
- Image generation/edit standard.
- Storage outputs.
- Moderation.
- Tests cout et limites.

Definition of done :

- images generees depuis dashboard ;
- cout estime proche cout reel ;
- marge positive.

### Lot 5 - Musique pro/IA

- Rights manifest.
- Import utilisateur Storage.
- Mubert backend connector.
- Catalogue provider abstraction.
- Blocage publication si droits incomplets.

Definition of done :

- musique IA generee en job ;
- droits visibles dans export/publish ;
- aucune cle provider client.

### Lot 6 - Export video production

- Export queue.
- WebCodecs ou Cloud Run FFmpeg.
- Progress/retry/cancel.
- Tests ffprobe CI.

Definition of done :

- MP4 deterministe ;
- audio/text/filtres/transitions valides ;
- export long ne bloque pas le navigateur.

### Lot 7 - Timeline pro

- Undo/redo complet.
- Waveform reelle.
- Mobile tactile.
- Snap/zoom/timecode.

Definition of done :

- parcours createur complet fluide desktop/mobile ;
- regressions couvertes par tests.

## 16. Rapport attendu a chaque passe

Chaque agent doit livrer :

1. Resume executif : ce qui est production-ready ou non.
2. Fichiers modifies.
3. Schema Firestore/Storage mis a jour.
4. Regles de securite ajoutees.
5. Endpoints/callables crees.
6. Provider/API integres et raison du choix.
7. Calcul cout/marge par feature.
8. Tests lances et resultats.
9. Risques restants.
10. Prochaine passe priorisee.

## 17. Interdictions

- Pas de cle API dans le client.
- Pas de credits modifies par le client.
- Pas de fulfillment paiement hors webhook.
- Pas de scraping musique/video/image.
- Pas de promesse "IA illimitee".
- Pas de prix sans marge calculee.
- Pas d'export/publish avec droits musique inconnus.
- Pas de stockage public d'uploads utilisateurs.
- Pas d'ecriture directe client dans ledger/payments.
- Pas d'API Midjourney non officielle, Discord automation ou reverse-engineering.
- Pas de modele Civitai/Hugging Face communautaire sans licence commerciale explicite et safety review.
- Pas de provider "moins cher" sans verification officielle du prix, politique data et droits commerciaux.
- Pas d'aggregateur qui peut router vers un provider inconnu sans verrouiller provider/model et cout max.

## 18. Premier travail a faire au lancement

Commencer par un audit sans coder :

1. Cartographier Auth/Firestore/Storage/Functions existants.
2. Lister les surfaces client qui devront devenir privees.
3. Proposer schema Firestore complet.
4. Proposer rules Firestore/Storage.
5. Proposer produits Stripe et mapping `priceId -> entitlement`.
6. Proposer table `aiPricingPolicies`.
7. Proposer model router v1 avec fallback.
8. Proposer provider registry globale :
   - US/EU : OpenAI, Anthropic, Mistral, Stability, Ideogram, Leonardo, fal, Replicate, Runware.
   - Chine/Asie : DeepSeek, Qwen/Alibaba, Kimi/Moonshot, Zhipu/GLM, MiniMax, Baidu ERNIE, Tencent Hunyuan, ByteDance Seed/Seedance/Seedream.
   - Open-weight/aggregateurs : OpenRouter, Together, Fireworks, Groq, Hugging Face Inference Providers.
   - Marketplaces : Civitai, Hugging Face model hub, autres catalogues LoRA/checkpoints.
9. Classer chaque provider `trusted/candidate/blocked`.
10. Proposer plan de tests emulator + Stripe CLI.
11. Seulement ensuite implementer Lot 1.
