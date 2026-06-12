import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function blocked(...parts) {
  return new RegExp(parts.join(""), "i");
}

const forbiddenPatterns = [
  blocked("Jar", "dins?"),
  blocked("Cha", "wi"),
  blocked("jar", "dins", "de", "cha", "wi"),
  blocked("jar", "dins", "-de-", "cha", "wi"),
  blocked("paysa", "gisme"),
  blocked("Fl", "ers"),
  blocked("create", "Quote", "Request"),
  blocked("create", "Order"),
  blocked("STATIC", "_PRODUCTS"),
  blocked("quote", "_requests"),
  blocked("pick", "up", "_slots"),
];

const scannedFiles = [
  "src",
  "functions",
  "firestore.rules",
  "storage.rules",
  "docs",
  "scripts",
  "package.json",
  "map.md",
];

function listFiles(path) {
  const absolute = join(root, path);
  if (!existsSync(absolute)) return [];
  if (statSync(absolute).isFile()) return [path];
  return readdirSync(absolute)
    .flatMap((entry) => listFiles(join(path, entry)))
    .filter((file) => !file.includes("node_modules") && !file.includes(".next"));
}

for (const file of scannedFiles.flatMap((path) => listFiles(path))) {
  const content = read(file);
  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(content, pattern, `${file} should not contain ${pattern}`);
  }
}

const functionsIndex = read("functions/index.js");
const functionsAccount = read("functions/src/account.js");
const functionsBilling = read("functions/src/billing.js");
const functionsBillingEvents = read("functions/src/billingEvents.js");
const functionsBillingSession = read("functions/src/billingSession.js");
const functionsAppCheck = read("functions/src/appCheck.js");
const functionsAiJobs = read("functions/src/ai/jobs.js");
const functionsAiJobUtils = read("functions/src/ai/jobUtils.js");
const functionsAiReconciliation = read("functions/src/ai/reconciliation.js");
const functionsAiPolicies = read("functions/src/ai/policies.js");
const functionsAiRouter = read("functions/src/ai/router.js");
const functionsAiProviderRegistry = read("functions/src/ai/providerRegistry.js");
const functionsPackage = JSON.parse(read("functions/package.json"));
assert.equal(functionsPackage.type, "commonjs");
assert.equal(functionsPackage.engines?.node, "20");
assert.match(functionsPackage.dependencies?.["firebase-functions"] || "", /^\^6\./);
assert.match(functionsPackage.dependencies?.["firebase-admin"] || "", /^\^13\./);
assert.match(functionsPackage.scripts?.lint || "", /src\/account\.js/);
assert.match(functionsPackage.scripts?.lint || "", /src\/appCheck\.js/);
assert.match(functionsPackage.scripts?.lint || "", /src\/ai\/reconciliation\.js/);

assert.doesNotMatch(functionsIndex, /matthis\.fradin/i);
assert.match(functionsIndex, /process\.env\.ADMIN_EMAILS/);
assert.match(functionsIndex, /shouldEnforceAppCheck\("ENFORCE_META_APP_CHECK"\)/);
assert.match(functionsAccount, /shouldEnforceAppCheck\("ENFORCE_ACCOUNT_APP_CHECK"\)/);
assert.match(functionsAccount, /requestAccountDeletion/);
assert.match(functionsAccount, /deleteAccountData/);
assert.match(functionsAccount, /assertRecentAuthentication/);
assert.match(functionsAccount, /RECENT_AUTH_MAX_AGE_MS/);
assert.match(functionsAccount, /deleteUser\(uid\)/);
assert.match(functionsAccount, /deleteFiles\(\{ prefix, force: true \}\)/);
assert.match(functionsAccount, /collection\("accountDeletionRequests"\)/);
assert.match(functionsAccount, /collection\("publications"\)\.where\("ownerUid", "==", uid\)/);
assert.match(functionsAccount, /collection\("aiJobs"\)\.where\("uid", "==", uid\)/);
assert.match(functionsAccount, /collection\("checkoutSessions"\)\.where\("uid", "==", uid\)/);
assert.match(functionsBilling, /shouldEnforceAppCheck\("ENFORCE_BILLING_APP_CHECK"\)/);
assert.match(functionsAiJobs, /shouldEnforceAppCheck\("ENFORCE_AI_APP_CHECK"\)/);
assert.match(functionsAppCheck, /FUNCTIONS_EMULATOR/);
assert.match(functionsAppCheck, /value === "false"/);
assert.match(functionsAppCheck, /return true/);
assert.match(functionsIndex, /reserveMetaOAuthState/);
assert.match(functionsIndex, /status: "processing"/);
assert.match(functionsIndex, /callbackStateRef/);
assert.match(functionsIndex, /status: "failed"/);
assert.match(functionsIndex, /isExpiredTimestamp/);
assert.match(functionsIndex, /status: "expired"/);
assert.match(functionsIndex, /Selectionne au moins une plateforme Meta/);
assert.match(functionsIndex, /Secrets META_APP_ID, META_APP_SECRET ou META_OAUTH_REDIRECT_URI manquants/);
assert.match(functionsIndex, /if \(ownerUid && data\.ownerUid !== ownerUid\)/);
assert.match(functionsIndex, /data\.metaSync\?\.status === "running" && lockUntil > now/);
assert.match(functionsIndex, /lockUntil: admin\.firestore\.Timestamp\.fromMillis\(now \+ 10 \* 60 \* 1000\)/);
assert.match(functionsIndex, /await releaseMetaLock\(ref, "failed"\)\.catch/);
assert.match(functionsIndex, /await releaseMetaLock\(ref, "done"\)/);

const publicMetaConnectionBody = /function publicMetaConnection\(data = \{\}\) \{([\s\S]*?)\n\}/.exec(functionsIndex)?.[1] || "";
assert.ok(publicMetaConnectionBody, "publicMetaConnection should exist");
assert.doesNotMatch(publicMetaConnectionBody, /encryptedPageAccessToken|accessToken|token:|secret/i);
assert.match(functionsIndex, /return publicMetaConnection\(snapshot\.data\(\)\)/);
assert.match(functionsIndex, /const token = decryptMetaToken\(connection\.encryptedPageAccessToken\)/);
assert.match(functionsIndex, /encryptedPageAccessToken: admin\.firestore\.FieldValue\.delete\(\)/);
assert.match(functionsBilling, /stripe\.webhooks\.constructEvent/);
assert.match(functionsBilling, /checkout\.sessions\.create/);
assert.match(functionsBilling, /idempotencyKey/);
assert.match(functionsBilling, /collection\("stripeEvents"\)/);
assert.match(functionsBilling, /collection\("payments"\)/);
assert.match(functionsBilling, /collection\("checkoutSessions"\)/);
assert.match(functionsBilling, /status: "fulfilled"/);
assert.doesNotMatch(functionsBilling, /allow_promotion_codes\s*:\s*true/);
assert.match(functionsBillingEvents, /checkout\.session\.async_payment_succeeded/);
assert.match(functionsBillingEvents, /checkout\.session\.async_payment_failed/);
assert.match(functionsBillingEvents, /checkout\.session\.expired/);
assert.match(functionsBillingSession, /metadata_credit_amount_mismatch/);
assert.match(functionsAiJobs, /collection\("aiJobs"\)/);
assert.match(functionsAiJobs, /collection\("aiRateLimits"\)/);
assert.match(functionsAiJobs, /collection\("securityEvents"\)/);
assert.match(functionsAiJobs, /requestIpHash/);
assert.match(functionsAiJobs, /ipHash/);
assert.match(functionsAiJobs, /creditLedger/);
assert.match(functionsAiJobs, /reservedCreditBalance/);
assert.match(functionsAiJobs, /createAiJob/);
assert.match(functionsAiJobs, /buildAiRouteAudit/);
assert.match(functionsAiJobs, /routeAudit/);
assert.match(functionsAiJobs, /routeScores/);
assert.match(functionsAiJobs, /rejectedCandidates/);
assert.match(functionsAiJobs, /estimatedGrossMargin/);
assert.match(functionsAiJobs, /margin_below_threshold/);
assert.match(functionsAiJobUtils, /normalizeIpHash/);
assert.match(functionsAiJobUtils, /rateLimitDocId/);
assert.match(functionsAiReconciliation, /onSchedule/);
assert.match(functionsAiReconciliation, /every 15 minutes/);
assert.match(functionsAiReconciliation, /releaseStaleAiReservation/);
assert.match(functionsAiReconciliation, /ai_reservation_stale_released/);
assert.match(functionsAiReconciliation, /reserved|running/);
assert.match(functionsAiPolicies, /aiPricingPolicies/);
assert.match(functionsAiPolicies, /calculatePricingPolicyEconomics/);
assert.match(functionsAiPolicies, /normalizeRouteCandidates/);
assert.match(functionsAiPolicies, /qualityScore/);
assert.match(functionsAiPolicies, /latencyScore/);
assert.match(functionsAiPolicies, /reliabilityScore/);
assert.match(functionsAiPolicies, /legalSafetyScore/);
assert.match(functionsAiPolicies, /estimatedProviderCostUsd/);
assert.match(functionsAiPolicies, /margin_below_threshold/);
assert.match(functionsAiPolicies, /minCreditsForTargetMargin/);
assert.match(functionsAiPolicies, /VIBEFX_ENABLE_MOCK_AI_GATEWAY/);
assert.match(functionsAiRouter, /ROUTER_WEIGHTS/);
assert.match(functionsAiRouter, /quality: 0\.35/);
assert.match(functionsAiRouter, /margin: 0\.25/);
assert.match(functionsAiRouter, /latency: 0\.15/);
assert.match(functionsAiRouter, /reliability: 0\.15/);
assert.match(functionsAiRouter, /legalSafety: 0\.10/);
assert.match(functionsAiRouter, /scoreRouteCandidate/);
assert.match(functionsAiRouter, /rejectedCandidates/);
assert.match(functionsAiProviderRegistry, /midjourney/);
assert.match(functionsAiProviderRegistry, /provider_not_allowed_in_production/);
assert.match(functionsAiProviderRegistry, /status: "blocked"/);
assert.match(functionsAiProviderRegistry, /civitai/);
assert.match(functionsAiProviderRegistry, /bytedance_seed/);
assert.match(functionsAiProviderRegistry, /openrouter/);
assert.doesNotMatch(functionsAiProviderRegistry, /productionAllowed: true/);

const exports = [...functionsIndex.matchAll(/exports\.([A-Za-z0-9_]+)\s*=/g)].map((match) => match[1]).sort();
assert.deepEqual(exports, [
  "cancelVideoExportJob",
  "createAiJob",
  "createCheckoutSession",
  "createMetaOAuthConnectUrl",
  "createVideoExportJob",
  "disconnectMetaOAuth",
  "getMetaOAuthStatus",
  "getVideoExportAdminTelemetry",
  "getVideoExportDownloadUrl",
  "metaOAuthCallback",
  "processVideoExportJob",
  "publishPublicationToConnectedMeta",
  "publishPublicationToMeta",
  "reconcileStaleAiReservations",
  "requestAccountDeletion",
  "retryVideoExportJob",
  "stripeWebhook",
].sort());

for (const path of [
  ".env.example",
  ".env.emulators.example",
  "functions/src/account.js",
  "functions/src/appCheck.js",
  "functions/src/billing.js",
  "functions/src/billingEvents.js",
  "functions/src/billingProducts.js",
  "functions/src/billingSession.js",
  "src/features/publications/components/PublicationComposer.jsx",
  "src/features/publications/components/PublicationDashboard.jsx",
  "src/features/publications/components/PublicationPreview.jsx",
  "functions/src/ai/jobs.js",
  "functions/src/ai/jobUtils.js",
  "functions/src/ai/mockProvider.js",
  "functions/src/ai/policies.js",
  "functions/src/ai/providerRegistry.js",
  "functions/src/ai/reconciliation.js",
  "functions/src/ai/router.js",
  "scripts/smoke-app-check.mjs",
  "scripts/smoke-account-deletion.mjs",
  "scripts/smoke-ai-gateway.mjs",
  "scripts/smoke-ai-ledger.mjs",
  "scripts/smoke-billing-ledger.mjs",
  "src/features/publications/components/MetaOAuthPanel.jsx",
  "src/features/publications/components/PublicationList.jsx",
  "src/features/publications/helpers/publicationHelpers.js",
  "scripts/smoke-studio-emulator-ui.mjs",
]) {
  assert.ok(existsSync(join(root, path)), `${path} should exist`);
}

const gitignore = read(".gitignore");
assert.match(gitignore, /!\.env\.example/);
assert.match(gitignore, /!\.env\.emulators\.example/);

const firestoreRules = read("firestore.rules");
assert.match(firestoreRules, /request\.resource\.data\.ownerUid == request\.auth\.uid/);
assert.match(firestoreRules, /request\.resource\.data\.ownerUid == resource\.data\.ownerUid/);
assert.match(firestoreRules, /isUserProfileCreateValid/);
assert.match(firestoreRules, /isUserProfileUpdateValid/);
assert.match(firestoreRules, /displayName/);
assert.doesNotMatch(firestoreRules, /allow read, create, update: if ownsUserDoc/);
assert.match(firestoreRules, /platformStatus/);
assert.match(firestoreRules, /metaSync/);
assert.match(firestoreRules, /affectedKeys\(\)\.hasAny/);
assert.match(firestoreRules, /accountDeletionRequests/);

const firebaseJson = JSON.parse(read("firebase.json"));
assert.equal(firebaseJson.hosting, undefined, "firebase.json should not configure classic Hosting for the App Hosting Next.js app");

const packageJson = JSON.parse(read("package.json"));
assert.equal(packageJson.scripts["firebase:deploy"], undefined, "package.json should not expose a broad firebase deploy script");
assert.match(packageJson.scripts["test:studio-emulators"], /smoke-studio-emulator-ui\.mjs/);
assert.match(packageJson.scripts["test:account-deletion"], /smoke-account-deletion\.mjs/);
assert.match(packageJson.scripts["test:app-check"], /smoke-app-check\.mjs/);
assert.match(packageJson.scripts["test:ai-gateway"], /smoke-ai-gateway\.mjs/);
assert.match(packageJson.scripts["test:ai-ledger"], /smoke-ai-ledger\.mjs/);
assert.match(packageJson.scripts["test:billing-ledger"], /smoke-billing-ledger\.mjs/);
assert.match(packageJson.scripts["verify:local"], /test:billing-ledger/);
assert.match(packageJson.scripts["verify:local"], /test:account-deletion/);
assert.match(packageJson.scripts["verify:local"], /test:app-check/);
assert.match(packageJson.scripts["firebase:deploy:backend"], /firebase-deploy\.mjs backend/);
assert.match(packageJson.scripts["firebase:deploy:functions"], /firebase-deploy\.mjs functions/);
assert.match(packageJson.scripts["check:deploy-target"], /check-deploy-target\.mjs/);

const firebaseDeployScript = read("scripts/firebase-deploy.mjs");
assert.match(firebaseDeployScript, /backend: "firestore,storage,functions"/);
assert.match(firebaseDeployScript, /functions: "functions"/);
assert.match(firebaseDeployScript, /scripts\/check-deploy-target\.mjs/);
assert.match(firebaseDeployScript, /"--project"/);
assert.match(firebaseDeployScript, /"--only"/);

const deployTargetCheck = read("scripts/check-deploy-target.mjs");
assert.match(deployTargetCheck, /FIREBASE_PROJECT_ID/);
assert.match(deployTargetCheck, /\^demo-/);
assert.match(deployTargetCheck, /Refusing deploy target/);

const e2eReadinessCheck = read("scripts/check-e2e-readiness.mjs");
assert.match(e2eReadinessCheck, /ENFORCE_ACCOUNT_APP_CHECK/);

const accountClient = read("src/app/account/AccountClient.jsx");
assert.match(accountClient, /reauthenticateBeforeDeletion/);
assert.match(accountClient, /reauthenticateWithPopup/);
assert.match(accountClient, /reauthenticateWithCredential/);
assert.match(accountClient, /requestAccountDeletion/);

const storageRules = read("storage.rules");
assert.match(storageRules, /match \/users\/\{userId\}\/publications/);
assert.match(storageRules, /allow get: if true/);
assert.match(storageRules, /allow list: if false/);
assert.match(storageRules, /allow create, update: if ownsPath\(userId\)/);
assert.match(storageRules, /match \/publications\/\{allPaths=\*\*\}/);
assert.match(storageRules, /allow create, update, delete: if false/);

const emulatorSmoke = read("scripts/smoke-firebase-emulators.mjs");
assert.match(emulatorSmoke, /signInAnonymously/);
assert.doesNotMatch(emulatorSmoke, /createUserWithEmailAndPassword/);

const publicationsManager = read("src/features/publications/PublicationsManager.jsx");
assert.match(publicationsManager, /onAuthStateChanged/);
assert.match(publicationsManager, /signInAnonymously/);
assert.match(publicationsManager, /where\("ownerUid", "==", currentUid\)/);
assert.match(publicationsManager, /handleSavedPublication/);
assert.match(publicationsManager, /setPublications\(\(current\) =>/);

const rootLayout = read("src/app/layout.js");
assert.doesNotMatch(rootLayout, /features\/(?:vibefx-layout|publications)/);

const studioLayout = read("src/app/studio/layout.js");
assert.match(studioLayout, /features\/vibefx-layout\/vibefx-tailwind\.css/);
assert.match(studioLayout, /features\/vibefx-layout\/vibefx-layout\.css/);
assert.match(studioLayout, /features\/publications\/publications\.css/);

const vibeFxLayout = read("src/features/vibefx-layout/VibeFxLayout.jsx");
assert.doesNotMatch(vibeFxLayout, new RegExp(">J" + "C<"));
assert.match(vibeFxLayout, />VF</);
assert.match(vibeFxLayout, /const buildSocialImages = async/);
assert.match(vibeFxLayout, /const payload = \{/);
assert.match(vibeFxLayout, /blob,/);
assert.match(vibeFxLayout, /socialImages,/);
assert.match(vibeFxLayout, /format: activeFormat/);
assert.match(vibeFxLayout, /template: activeTemplate/);
assert.match(vibeFxLayout, /settings: \{/);
assert.match(vibeFxLayout, /onImportToPublication\(payload\)/);

console.log("scope audit OK");
