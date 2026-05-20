# Production SaaS audit - Vibe_fx V2

Date: 2026-05-20  
Scope: audit de reprise du megaprompt production IA, monetisation, securite et video. Le depot contient deja des amorces Lot 1-3; cet audit fige l'etat reel avant de poursuivre vers providers IA reels, musique/licences et export video production.

## 1. Executive summary

Vibe_fx V2 n'est pas encore pret production SaaS payant/IA, mais le socle critique est maintenant bien plus avance que le Lot 0 initial. Le socle Next.js + Firebase existe, le studio `/studio` est noindex, le flux layout -> publication -> Meta OAuth est present cote client et Functions, et les rules actuelles isolent les publications par `ownerUid`.

Etat courant apres les premieres passes Lot 1-3: `/account`, `/account/billing`, `/account/usage`, Stripe Checkout/webhook, ledger credits et gateway IA mock existent; les callables Meta, Billing et IA utilisent maintenant App Check par defaut hors emulateurs via `functions/src/appCheck.js`. Les providers IA reels restent volontairement non exposes tant que benchmark/pricing/legal review ne sont pas faits.

Les manques bloquants restants pour une production SaaS payante/IA sont:

- Les providers IA reels ne sont pas exposes: aucun benchmark officiel, snapshot de prix, DPA/retention/legal review et budget cap n'a encore valide un provider `productionAllowed=true`.
- App Check est configure cote Functions et pret cote client, mais l'enforcement doit etre valide sur un vrai projet Firebase avec `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY`.
- Stripe Checkout/webhook/ledger existent, mais il reste a tester avec Stripe CLI + emulateurs contre un projet de test configure.
- Les pages `/account`, `/account/billing`, `/account/usage` existent en noindex, mais doivent encore etre durcies UX/securite pour factures, alertes securite, sessions et usage detaille.
- Les routes Midjourney/scraper sont bloquees en production par defaut via double opt-in env, mais le code reste dans le build et doit rester interdit en SaaS public.
- Export video reste navigateur `MediaRecorder`; il detecte MP4/WebM et affiche les droits musique, mais il n'est pas deterministe Cloud Run/FFmpeg.
- Musique pro/IA reste au stade plan: aucun connecteur serveur Mubert/Epidemic/Soundstripe/Artlist et aucun rights manifest bloqueur d'export/publish n'est implemente.

Conclusion: ne pas integrer de provider IA reel tant que Lot 0 benchmark/pricing/legal n'est pas termine. La prochaine passe doit consolider les preuves Lot 1-3, puis attaquer Lot 4 seulement avec providers autorises et politiques de cout/marge versionnees.

## 2. Sources officielles verifiees au demarrage

Les prix/disponibilites changent. Aucune valeur de cout provider ne doit etre hardcodee comme verite permanente; elle doit entrer via `aiProviderPriceSnapshots` avec `fetchedAt`, `sourceUrl`, `checkedBy` et `confidence`.

| Domaine | Sources officielles consultees | Decision d'audit |
| --- | --- | --- |
| OpenAI | https://openai.com/api/pricing/ ; https://developers.openai.com/api/docs/models | Candidate production apres DPA/retention/budget caps; page pricing officielle disponible. |
| Gemini | https://ai.google.dev/gemini-api/docs/pricing | Candidate; prix et modeles a snapshot avant integration. |
| Anthropic | https://platform.claude.com/docs/en/about-claude/pricing | Candidate texte premium; verifier DPA, region et usage data. |
| Groq | https://groq.com/pricing | Candidate low-latency text/transcription; verifier modeles exacts et quotas. |
| Mistral | https://mistral.ai/pricing | Candidate EU; page officielle disponible, verifier API pricing exact dans docs/console avant policy. |
| Stability | https://platform.stability.ai/pricing | Candidate image; page officielle chargee avec contenu limite, a revalider avant integration. |
| DeepSeek | https://api-docs.deepseek.com/ | Candidate non-US; `productionAllowed=false` tant que data policy, retention, facturation et conformite ne sont pas valides. |
| Kimi/Moonshot | https://www.kimi.com/help/kimi-api/api-pricing | Candidate non-US; page indique facturation token et renvoie vers plateforme Moonshot pour detail. |
| Qwen/Alibaba | https://www.alibabacloud.com/help/en/model-studio/ | Candidate; Model Studio officiel expose Qwen, image, video, speech docs. |
| Zhipu/GLM | https://open.bigmodel.cn/ | Candidate; site officiel JS-only dans l'audit, verification manuelle requise. |
| MiniMax | https://www.minimax.io/pricing ; https://platform.minimax.io/docs/pricing/overview | Candidate multimodal; page officielle mentionne text/audio/video/image/music + PAYG. |
| Baidu ERNIE/Qianfan | https://cloud.baidu.com/doc/qianfan/index.html | Candidate CN; verification juridique/regions requise. |
| Tencent Hunyuan | https://www.tencentcloud.com/document/product/1284/75531?lang=en | Candidate; docs officielles Hunyuan accessibles, verification pricing/regions/contrat requise. |
| ByteDance/Volcengine/BytePlus | https://www.volcengine.com/product/doubao ; https://www.byteplus.com/en/product/seedance | Candidate/enterprise only; ne pas integrer sans acces officiel, KYC, droits, regions et contrat. |
| Together | https://www.together.ai/pricing | Candidate aggregator/open-weight. |
| Fireworks | https://fireworks.ai/pricing | Candidate aggregator/open-weight; pricing serverless renvoie vers docs detaillees. |
| OpenRouter | https://openrouter.ai/pricing | Candidate aggregator admin-only au depart; page mentionne fournisseurs multiples, frais plateforme et routage regional. Pin provider/model/cost max obligatoire. |
| Hugging Face Inference Providers | https://huggingface.co/docs/api-inference/en/pricing | Candidate aggregator/model hub; chaque modele communautaire doit avoir review licence/safety. |
| fal | https://docs.fal.ai/documentation/model-apis/pricing | Candidate media/image/video. |
| Replicate | https://replicate.com/pricing | Candidate media/open-weight; cout par hardware/model a snapshot. |
| Runware | https://runware.ai/pricing/ | Candidate image low-cost; verifier ToS, safety, outputs commerciaux. |
| Ideogram | https://ideogram.ai/features/api-pricing | Candidate image texte/logo; page officielle API pricing disponible. |
| Leonardo | https://leonardo.ai/pricing/ | Candidate image/video; page mentionne API pay-as-you-go/custom. |
| Midjourney | https://docs.midjourney.com/hc/en-us/articles/32013696484109-Community-Guidelines | Blocked production: les guidelines indiquent que l'automatisation non autorisee et les apps tierces ne sont pas autorisees, sauf rares exceptions explicites. |
| Mubert | https://mubert.com/api | Candidate musique IA; integration serveur seulement, licence/sublicensing a verifier. |
| Stripe | https://docs.stripe.com/payments/checkout ; https://docs.stripe.com/billing/subscriptions/usage-based ; https://docs.stripe.com/webhooks | Checkout one-time + webhooks comme source unique de fulfillment. |
| Firebase | https://firebase.google.com/docs/functions/callable ; https://firebase.google.com/docs/app-check/cloud-functions ; https://firebase.google.com/docs/firestore/manage-data/transactions ; https://firebase.google.com/docs/rules/rules-and-auth | Callables auth/App Check, transactions Firestore et rules auth sont le socle. |

## 3. Cartographie actuelle

### Auth

- `src/lib/firebase.js` initialise Firebase Auth si `NEXT_PUBLIC_FIREBASE_*` est configure.
- `PublicationsManager.jsx` utilise `onAuthStateChanged` puis `signInAnonymously`.
- `/account` gere email/password, Google sign-in et liaison d'une session anonyme vers un compte permanent.
- `createCheckoutSession` refuse les comptes anonymes ou sans email avant achat.
- `/account` reauthentifie Google/email avant suppression; `requestAccountDeletion` exige ensuite une authentification recente puis supprime cote serveur les publications owner, purge Storage `users/{uid}/`, scrub prompts/outputs IA et emails Checkout, pose un tombstone `users/{uid}`, journalise `accountDeletionRequests/{uid}` puis supprime l'utilisateur Auth.

### Firestore

Collections actuellement utilisees/protegees:

- `users/{uid}`: profil minimal client, champs limites.
- `publications/{publicationId}`: ownerUid, publication, image, status, format, platformStatus/metaSync.
- `meta_connections/{uid}`: denied client.
- `meta_oauth_states/{stateId}`: denied client.
- `admins/{email}`: lu par Functions pour admin, pas de rule specifique donc deny client via catch-all.
- `users/{uid}/creditLedger/{entryId}`: lecture owner, ecriture client interdite.
- `aiJobs/{jobId}`: lecture owner, ecriture client interdite.
- `aiRateLimits/{bucketId}`: denied client.
- `payments/{paymentId}`: lecture owner, ecriture client interdite.
- `checkoutSessions/{sessionId}`: lecture owner, ecriture client interdite.
- `accountDeletionRequests/{uid}`: denied client.
- `stripeEvents/{eventId}`: denied client.
- `aiPricingPolicies/{policyId}`, `aiProviderPriceSnapshots/{snapshotId}`, `providerRegistry/{providerId}`, `securityEvents/{eventId}`: denied client.
- `exportJobs/{jobId}`, `rightsManifests/{manifestId}`: lecture owner seulement, ecriture client interdite.

Manques:

- Les collections techniques sont protegees par rules, mais les vues admin, les index metier, les alertes budget provider, la reconciliation Stripe quotidienne et les workflows reels `exportJobs`/`rightsManifests` restent a construire.
- `aiProviderPriceSnapshots` et `aiPricingPolicies` existent comme schemas cibles et policy runtime, mais aucun snapshot officiel versionne n'a encore ete alimente depuis un benchmark reel.

### Storage

Rules actuelles:

- `users/{uid}/publications/**`: lecture publique, write/delete owner seulement, images <= 8 MB.
- ancien `/publications/**`: lecture publique, ecriture interdite.
- `users/{uid}/uploads/images/**`: lecture/ecriture owner, image <= 20 MB.
- `users/{uid}/uploads/audio/**`: lecture/ecriture owner, audio <= 100 MB.
- `users/{uid}/uploads/video/**`: lecture/ecriture owner, video <= 500 MB.
- `users/{uid}/ai/**`: lecture owner, ecriture client interdite.
- `users/{uid}/exports/**`: lecture owner, ecriture client interdite.
- tout le reste deny.

Manques:

- Validation audio/video par magic bytes et duree cote serveur.
- Liaison Storage `publications` publique vers statut Firestore publie ou alternative URLs signees compatibles Meta Graph.
- Generation serveur des outputs IA/export et manifests; les chemins sont reserves par rules mais les jobs reels ne les alimentent pas encore.

### Functions

Exports actuels:

- `publishPublicationToMeta` admin manuel.
- `getMetaOAuthStatus`.
- `createMetaOAuthConnectUrl`.
- `disconnectMetaOAuth`.
- `publishPublicationToConnectedMeta`.
- `metaOAuthCallback`.
- `createCheckoutSession`.
- `stripeWebhook`.
- `requestAccountDeletion`.
- `createAiJob`.
- `reconcileStaleAiReservations`.

Points solides:

- Secrets Meta via Secret Manager.
- Token Meta chiffre AES-256-GCM.
- OAuth state reserve en transaction.
- Lock `metaSync` anti-doublon publication.
- Verification ownerUid pour publication OAuth connectee.

Etat implementation partiel:

- Stripe Checkout/webhook, ledger credits et gateway IA mock sont amorces cote Functions.
- `npm run test:billing-ledger` couvre le fulfillment premium/credits, le statut `checkoutSessions`, et l'idempotence webhook Stripe sur `event.id` et `checkout.session.id`.
- `createAiJob` applique Auth + App Check, reserve/capture/release en transaction, et rate limit par `uid + feature + ipHash + minute`.
- `reconcileStaleAiReservations` libere toutes les 15 minutes les jobs IA restes `reserved` ou `running` trop longtemps afin d'eviter des credits bloques apres crash Function/provider.
- Les refus IA sensibles sont journalises dans `securityEvents` avec hash de requete client et hash IP, sans prompt brut ni IP brute.

Manques:

- Aucun provider IA reel n'est autorise production.
- Les tests emulator complets restent bloques tant que Java 21+ n'est pas disponible localement.
- L'enforcement App Check doit etre valide sur projet Firebase reel avant deploy.

### Routes Next/API

Actuelles:

- `/` public indexable.
- `/studio` noindex.
- `/pricing`, `/outil-publication-reseaux-sociaux`, `/editeur-image-instagram`, `/publier-instagram-facebook`, `/templates`, `/ressources/*` publics indexables si contenu SSR.
- `/account`, `/account/billing`, `/account/usage` noindex.
- `/api/catalog`, `/api/scrape`, `/api/image/*`, `/api/proxy-image`, `/api/reclassify/*`, `/api/reset`, `/api/status`, `/api/themes`: API bibliotheque Midjourney/scraper local.

Risque critique:

- Les routes Midjourney/scraper sont incompatibles avec la cible production publique si elles permettent scraping ou proxy d'images Midjourney. Elles sont actuellement bloquees en production par defaut et ne s'activent qu'avec `VIBEFX_ENABLE_MIDJOURNEY_LIBRARY=true` + `VIBEFX_ALLOW_UNSAFE_MIDJOURNEY_LIBRARY_IN_PROD=true`; ce double opt-in ne doit pas etre utilise en SaaS public.

## 4. Surfaces a rendre privees/noindex

Deja prive/noindex:

- `/studio` via metadata robots.
- `/account`, `/account/billing`, `/account/usage` via metadata robots.
- `/api/**` disallow dans robots.
- `/admin/**` disallow dans robots.

A creer plus tard en noindex si ces surfaces sont ajoutees:

- `/account/jobs`.
- `/account/exports`.
- `/auth/callback/**` si ajoute.
- Toute preview privee de projet/publication non publiee.

A garder indexable:

- `/`.
- `/pricing`.
- Futures pages SEO definies dans `seo.md` si contenu SSR complet.

## 5. Schema Firestore cible

```text
users/{uid}
  email, displayName, photoURL
  plan: "free" | "premium"
  premiumUntil: null | timestamp
  creditBalance: number
  bonusCreditBalance: number
  reservedCreditBalance: number
  lifetimePaidCents: number
  currency: "eur"
  createdAt, updatedAt
  lastLoginAt
  deletionRequestedAt

users/{uid}/creditLedger/{entryId}
  type: "purchase" | "reserve" | "capture" | "release" | "refund" | "admin_adjustment"
  amount: number
  balanceAfter: number
  bonusBalanceAfter: number
  reservedAfter: number
  jobId: string | null
  stripeSessionId: string | null
  stripePaymentIntentId: string | null
  idempotencyKey: string
  actor: "stripe_webhook" | "ai_job" | "admin" | "system"
  createdAt

aiJobs/{jobId}
  uid
  feature
  modality
  status: "created" | "reserved" | "running" | "succeeded" | "failed" | "refunded" | "blocked"
  quality: "draft" | "standard" | "premium"
  estimatedCredits
  capturedCredits
  pricingPolicyId
  provider
  model
  providerRequestId
  providerStatus
  idempotencyKey
  inputHash
  promptRedacted
  outputStoragePath
  outputManifestPath
  errorCode
  errorSafeMessage
  createdAt, updatedAt, startedAt, finishedAt

payments/{paymentId}
  uid
  provider: "stripe"
  productType: "premium_lifetime" | "credits"
  priceId
  amountTotal
  currency
  creditAmount
  stripeSessionId
  stripePaymentIntentId
  status
  fulfilledAt
  idempotencyKey
  createdAt, updatedAt

stripeEvents/{eventId}
  type
  livemode
  checkoutSessionId
  paymentIntentId
  processedAt
  status: "processed" | "ignored" | "failed"
  errorCode

checkoutSessions/{sessionId}
  uid
  clientRequestId
  productType
  priceId
  status: "created" | "completed" | "expired" | "failed"
  stripeSessionId
  createdAt, updatedAt

aiProviderPriceSnapshots/{snapshotId}
  provider, model, modality, unit
  inputUsdPerUnit, outputUsdPerUnit
  mediaUsdPerSecond, mediaUsdPerImage
  sourceUrl, fetchedAt, checkedBy
  confidence: "official" | "partner" | "manual" | "unknown"

aiPricingPolicies/{policyId}
  feature, modality, quality
  enabled
  providerPreference: [{ provider, model, maxProviderCostUsd, fallbackRank }]
  targetGrossMargin
  firebaseCostBufferUsd
  stripeAllocationUsd
  riskBufferUsd
  creditUnitValueEur
  minCredits
  creditsCharged
  minMarginRequired
  killSwitch
  updatedAt, updatedBy

providerRegistry/{providerId}
  region, access, modalities, apiStyle
  dataPolicy, pricingUrl, reliabilityTier
  legalRisk, productionAllowed
  allowedForUsers
  notes, checkedAt, checkedBy

securityEvents/{eventId}
  uid, ipHash, feature, type, severity
  reason, createdAt
  requestId

exportJobs/{jobId}
  uid, projectId, status, preset, durationSec
  estimatedCredits, capturedCredits
  compositionStoragePath
  outputStoragePath
  rightsManifestId
  createdAt, updatedAt

rightsManifests/{manifestId}
  uid, projectId, exportJobId
  tracks: [{ trackId, provider, sourceUrl, licenseUrl, licenseSnapshotVersion, attribution, acquiredAt, rightsStatus }]
  status: "complete" | "blocked" | "needs_review"
  createdAt, updatedAt
```

## 6. Rules Firestore proposees

Principes:

- Client lit uniquement ses donnees non sensibles.
- Client ne modifie jamais ledger, payments, stripeEvents, aiJobs finals, pricing, provider registry ou securityEvents.
- Les mutations critiques passent par Admin SDK en Functions.

Rules cibles:

```text
/users/{uid}
  read own
  create own profile minimal only
  update own displayName/photoURL/lastSeen only
  deny plan/credits/lifetimePaid direct client update

/users/{uid}/creditLedger/{entry}
  read own
  write deny

/publications/{publicationId}
  read if published or owner
  create/update/delete owner, but deny platformStatus/metaSync/server fields

/aiJobs/{jobId}
  read owner
  write deny

/payments/{paymentId}
  read owner
  write deny

/checkoutSessions/{sessionId}
  read owner
  write deny

/accountDeletionRequests/{uid}
  read/write deny client

/aiPricingPolicies/{policyId}
  optional read if enabled/publicSummary only; otherwise deny
  write deny

/aiProviderPriceSnapshots/{snapshotId}
  deny client

/providerRegistry/{providerId}
  optional read only sanitized provider summaries; write deny

/securityEvents/{eventId}
  deny client

/meta_connections, /meta_oauth_states, /stripeEvents
  deny client
```

Tests emulator obligatoires:

- un utilisateur A ne lit/ecrit pas les docs de B;
- client ne peut pas augmenter `creditBalance`;
- client ne peut pas creer `creditLedger`;
- client ne peut pas modifier `aiJobs.status`, `payments`, `stripeEvents`;
- owner peut creer/modifier publication sans `platformStatus/metaSync`;
- publication `published` reste lisible publiquement.

## 7. Rules Storage proposees

```text
users/{uid}/publications/**
  get public only si publication publiee OU garder get public temporaire pour Meta image_url
  create/update owner image only <= 8 MB

users/{uid}/uploads/images/**
  read owner
  create owner image only <= 20 MB

users/{uid}/uploads/audio/**
  read owner
  create owner audio only <= limite v1
  validation duree/magic bytes cote serveur avant usage export/publish

users/{uid}/ai/image-jobs/{jobId}/**
  read owner
  write deny client

users/{uid}/ai/video-jobs/{jobId}/**
  read owner
  write deny client

users/{uid}/exports/{exportId}/**
  read owner, optional signed/public URL via serveur pour partage
  write deny client

public/assets/**
  read public, write deny client
```

Decision a prendre: Meta Graph demande des `image_url` accessibles publiquement. Pour les publications sociales, conserver un chemin public controle ou generer des URLs signees/temporaires serveur compatibles Meta.

## 8. Produits Stripe et mapping serveur

Le client ne doit envoyer qu'un `productKey` ou `priceKey` connu, jamais un `creditAmount` fiable.

```js
const STRIPE_PRODUCTS = {
  premium_lifetime: {
    productType: "premium_lifetime",
    entitlement: { plan: "premium", premiumUntil: null },
    mode: "payment",
    envPriceVar: "STRIPE_PRICE_PREMIUM_LIFETIME",
  },
  credits_500: {
    productType: "credits",
    creditAmount: 500,
    mode: "payment",
    envPriceVar: "STRIPE_PRICE_CREDITS_500",
  },
  credits_1200: {
    productType: "credits",
    creditAmount: 1200,
    mode: "payment",
    envPriceVar: "STRIPE_PRICE_CREDITS_1200",
  },
  credits_3200: {
    productType: "credits",
    creditAmount: 3200,
    mode: "payment",
    envPriceVar: "STRIPE_PRICE_CREDITS_3200",
  },
  credits_7000: {
    productType: "credits",
    creditAmount: 7000,
    mode: "payment",
    envPriceVar: "STRIPE_PRICE_CREDITS_7000",
  },
};
```

Fulfillment:

- uniquement `checkout.session.completed`;
- verifier signature webhook;
- verifier `payment_status` paye/valide;
- transaction Firestore idempotente sur `event.id`, `checkout.session.id`, `payment_intent`;
- ajouter `payments/{paymentId}`;
- ajouter ledger `purchase` ou entitlement premium;
- ne rien accorder sur `success_url`.

## 9. Table `aiPricingPolicies` proposee

Les credits ci-dessous sont des valeurs de cadrage a recalculer apres benchmark et snapshots officiels. Tant que `providerCostSnapshotId` n'existe pas, `enabled=false`.

| policyId | Feature | Qualite | Cible | Credits v0 | Marge cible | Statut |
| --- | --- | --- | --- | ---: | ---: | --- |
| `text.caption.draft.v1` | Caption/tags simples | draft | Gemini/Groq fallback OpenAI mini | 1-3 | 70% | disabled until benchmark |
| `text.prompt_rewrite.standard.v1` | Rewrite prompt image | standard | OpenAI mini fallback Gemini | 3-8 | 70% | disabled until benchmark |
| `image.generate.draft.v1` | Image rapide | draft | Runware/fal/Replicate | 20-60 | 55% | disabled until benchmark |
| `image.generate.standard.v1` | Image social standard | standard | OpenAI image or FLUX provider | 60-140 | 55% | disabled until benchmark |
| `image.edit.standard.v1` | Edition image | standard | OpenAI image/edit or provider image edit | 40-120 | 55% | disabled until benchmark |
| `video.generate.draft.v1` | Text/image-to-video court | draft | fal/Runware/Replicate/MiniMax candidate | 300+ | 45% | disabled until benchmark |
| `audio.transcribe.standard.v1` | Transcription minute | standard | OpenAI/Groq | per-minute | 70% | disabled until benchmark |
| `music.generate.standard.v1` | Musique IA courte | standard | Mubert candidate | TBD | 50% | disabled until contract |
| `export.video.server.v1` | Rendu serveur FFmpeg | premium | Cloud Run internal | duration-based | 50% | disabled until infra |

Policy runtime:

```text
minClientPrice = (providerCost + firebaseCost + stripeAllocation + riskBuffer) / (1 - targetMargin)
creditsCharged = ceil(minClientPrice / creditUnitValue)
```

Etat implementation: `functions/src/ai/policies.js` expose `calculatePricingPolicyEconomics` et normalise les champs `creditUnitValueUsd`, `estimatedProviderCostUsd`, `platformCostBufferUsd`, `stripeAllocationUsd`, `riskBufferUsd`, `targetGrossMargin`, `estimatedGrossMargin`, `estimatedClientPriceUsd`, `estimatedInternalCostUsd` et `minCreditsForTargetMargin`. Si la marge estimee est sous `targetGrossMargin`, `normalizePricingPolicy` refuse avec `margin_below_threshold`; `createAiJob` remonte une erreur `failed-precondition` sans debiter de credits.

Si marge estimee < `targetGrossMargin`, le router doit refuser ou basculer fallback. Le fallback multi-provider reste a implementer apres benchmark officiel.

## 10. Model router v1 propose

Module serveur cible: `functions/src/ai/modelRouter.js` ou equivalent. Etat actuel: l'equivalent existe dans `functions/src/ai/router.js`.

Inputs:

```js
{
  uid,
  feature,
  modality,
  quality,
  maxCredits,
  clientRequestId,
  inputHash,
  promptLength,
  safetyFlags,
  allowBatch,
}
```

Selection:

1. Lire `aiPricingPolicies/{policyId}`.
2. Refuser si `enabled=false` ou `killSwitch=true`.
3. Filtrer `providerRegistry`:
   - `productionAllowed=true`;
   - modality compatible;
   - region/data policy acceptable;
   - provider/model non blocked;
   - cout snapshot <= `maxProviderCostUsd`.
4. Calculer score:

```text
score = quality * 0.35 + margin * 0.25 + latency * 0.15 + reliability * 0.15 + legalSafety * 0.10
```

Etat implementation: `functions/src/ai/policies.js` normalise `routeCandidates` et `functions/src/ai/router.js` applique ces poids dans `ROUTER_WEIGHTS`. Les candidats dont le provider est bloque, incompatible ou non autorise en production sont rejetes; le meilleur candidat restant est retourne avec `routeScore`, `routeScores`, `routeCandidateId` et `rejectedCandidates`, puis `createAiJob` persiste provider/model, `requestIpHash` et un `routeAudit` complet dans `aiJobs/{jobId}`. Le bucket anti-abus `aiRateLimits` est segmente par `uid + feature + ipHash + minute`. La scheduled Function `reconcileStaleAiReservations` reutilise le chemin transactionnel `release` pour rembourser les reservations IA perimees.

5. Retourner `{ provider, model, pricingPolicyId, estimatedCredits, estimatedProviderCostUsd, auditReason }`.
6. Ecrire l'audit de selection dans `aiJobs/{jobId}`. Le detail `routeScores/rejectedCandidates` est persiste; reste a construire une vue admin d'audit et des alertes budget provider.

Fallback v1:

- text draft: Gemini/Groq -> OpenAI mini.
- text premium: OpenAI large/Anthropic -> Mistral candidate selon benchmark.
- image draft: Runware/fal/Replicate -> OpenAI image si marge OK.
- image typography/logo: Ideogram candidate -> OpenAI image.
- video: aucun provider expose utilisateur avant benchmark legal/cout.
- music: Mubert admin-only jusqu'a contrat/licence claire.

## 11. Provider registry initiale

Statut de prudence: aucun fournisseur IA externe n'est `productionAllowed=true` tant que les benchmarks, DPA/ToS, retention, droits commerciaux, moderation, quotas, budget caps et snapshots de prix ne sont pas termines.

| Provider | Region | Access | Modalites | Statut | Raison |
| --- | --- | --- | --- | --- | --- |
| OpenAI | US/EU options selon offre | direct-api | text, vision, image, audio | candidate | Source officielle prix/modeles; verifier data residency, budgets et modele exact. |
| Gemini | US/global | direct-api | text, vision, image/video selon API | candidate | Prix officiel; verifier modeles disponibles et droits outputs. |
| Anthropic | US/global | direct-api | text, vision | candidate | Bon premium text; verifier cout, DPA, retention. |
| Mistral | EU | direct-api | text, agents | candidate | Bon candidat EU; API pricing exact a snapshot. |
| Groq | US/global | direct-api | text, speech selon offre | candidate | Latence/cout; verifier modeles et quotas. |
| Stability | US/UK | direct-api | image | candidate | Image API; pricing page a revalider. |
| Ideogram | US/Canada | direct-api | image, edit, typography | candidate | Page API pricing officielle; volume/custom possible. |
| Leonardo | AU/US/global | direct-api | image, video | candidate | API PAYG/custom mentionnee; verifier droits/commercial. |
| Mubert | global | direct-api | music | candidate | API officielle; besoin contrat/licence/sublicensing. |
| DeepSeek | CN | direct-api | text, reasoning, coding | candidate | Non-US low-cost; data/legal/rate/payment a verifier. |
| Kimi/Moonshot | CN | direct-api | text, long context | candidate | Prix token officiel; data/legal a verifier. |
| Qwen/Alibaba Model Studio | CN/HK/global selon compte | direct-api | text, image, video, speech | candidate | Docs officielles; regions et conformite a verifier. |
| Zhipu/GLM | CN | direct-api | text/multimodal | candidate | Site officiel JS-only; verification manuelle requise. |
| MiniMax | CN/global | direct-api | text, audio, image, video, music | candidate | Docs pricing officielles; verifier droits et pays. |
| Baidu ERNIE/Qianfan | CN | direct-api | text/multimodal | candidate | Docs officielles CN; verifier access international. |
| Tencent Hunyuan | CN/global selon offre Tencent Cloud | direct-api | text, translation, 3D selon docs consultees | candidate | Docs officielles API accessibles; pricing, regions, data policy et usage social a verifier avant exposition. |
| ByteDance Volcengine/Doubao/Seedance/Seedream | CN/global enterprise | direct/enterprise | text, image, video | candidate | Uniquement via acces officiel/contrat; pas de proxy. |
| Together | US/global | aggregator | open-weight text/image selon catalogue | candidate | Verifier modele exact, region, data policy. |
| Fireworks | US/global | aggregator/hosted | open-weight text/vision | candidate | Serverless/on-demand officiel; verifier model prices. |
| OpenRouter | global | aggregator | multi-provider text/vision | candidate admin-only | Pin provider/model/region/cout max; pas d'autorouting opaque en prod. |
| Hugging Face Inference Providers | global | aggregator/marketplace | multi-modal | candidate | Chaque provider/modele doit etre verrouille et audite. |
| fal | global | aggregator/media | image, video, audio selon modeles | candidate | Bon media; model-level pricing/licence a snapshot. |
| Replicate | global | aggregator/media | image, video, audio, open-weight | candidate | Hardware/model cost a snapshot; licences par modele. |
| Runware | global | direct/aggregator image | image | candidate | Low-cost image; verifier safety, ToS, droits. |
| Civitai | marketplace/community | model source | LoRA/checkpoints | candidate only | Jamais trusted globalement; review par modele: licence, hash, createur, restrictions, safety. |
| Hugging Face model hub | marketplace/community | model source | open-weight | candidate only | Review par modele; pas d'exposition sans licence commerciale claire. |
| Midjourney | US | consumer app/manual reference | image | blocked | Pas d'API officielle publique validee; routes scraper/proxy du repo a retirer ou bloquer en prod. |

## 12. Plan de tests Lot 1-3

Lot 1:

- `npm run lint`.
- `npm run build`.
- `npm run functions:lint`.
- `npm run test:emulators`.
- Nouveaux tests rules:
  - user profile own read/update;
  - credit fields non modifiables par client;
  - ledger/payments/aiJobs writes interdits;
  - account routes noindex.

Lot 2:

- Stripe CLI webhook fixtures:
  - `checkout.session.completed` premium;
  - `checkout.session.completed` credits;
  - replay meme `event.id`;
  - replay meme `session.id` nouveau `event.id`;
  - unpaid/expired/unknown price ignored.
- Emulator transaction:
  - ledger append once;
  - balance non negatif;
  - success_url ne credite rien.
- Etat implementation local sans emulateur: `scripts/smoke-billing-ledger.mjs` teste fulfillment credits, replay du meme `event.id`, deuxieme event sur la meme Checkout Session, statut `checkoutSessions` en succes/echec, fulfillment premium sans ledger credits, et marquage `expired`. Reste a rejouer ces cas avec Stripe CLI + emulateurs contre un projet de test configure.

Lot 3:

- Mock provider:
  - unauth refuse;
  - App Check absent refuse en prod config;
  - credits insuffisants refuse;
  - double `clientRequestId` retourne meme job;
  - success capture;
  - provider failure release/refund;
  - policy kill switch bloque;
  - marge sous seuil bloque/fallback.

Video/export:

- Playwright export smoke actuel a conserver.
- Ajouter ffprobe si disponible: resolution, duree, audio stream, non-black frames.

## 13. Prochaine passe priorisee

1. Relancer et consigner les gates locaux Lot 1-3: `npm run lint`, `npm run test:scope`, `npm run audit:secrets`, `npm run test:routes`, `npm run test:billing-ledger`, `npm run test:ai-gateway`, `npm run test:ai-ledger`, `npm run test:app-check`, `npm run build`, `npm run functions:lint`, puis `npm run test:emulators` si Java 21+ est disponible.
2. Rejouer Stripe en conditions proches production avec Stripe CLI + emulateurs: premium, credits, event replay, session replay, unpaid/expired/unknown price.
3. Finaliser le Lot 0 provider avant tout appel IA reel: benchmark 20 prompts par categorie, `aiProviderPriceSnapshots`, DPA/retention/licence, budget caps, provider/model pinned, `productionAllowed=true` uniquement apres validation.
4. Construire la vue admin d'audit IA: routeScores/rejectedCandidates, marge estimee, budget provider, kill switch provider/model/feature.
5. Demarrer Lot 4 seulement sur provider(s) officiellement valides; garder Midjourney bloque et les routes scraper/proxy desactivees en production SaaS.
6. Ouvrir la passe musique/export video: rights manifests bloquants, connecteur Mubert serveur si contrat/licence valide, puis design Cloud Run/FFmpeg pour exports deterministes.
