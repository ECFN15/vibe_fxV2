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
const functionsPackage = JSON.parse(read("functions/package.json"));
assert.equal(functionsPackage.type, "commonjs");
assert.equal(functionsPackage.engines?.node, "20");
assert.match(functionsPackage.dependencies?.["firebase-functions"] || "", /^\^6\./);
assert.match(functionsPackage.dependencies?.["firebase-admin"] || "", /^\^13\./);

assert.doesNotMatch(functionsIndex, /matthis\.fradin/i);
assert.match(functionsIndex, /process\.env\.ADMIN_EMAILS/);
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

const exports = [...functionsIndex.matchAll(/exports\.([A-Za-z0-9_]+)\s*=/g)].map((match) => match[1]).sort();
assert.deepEqual(exports, [
  "createMetaOAuthConnectUrl",
  "disconnectMetaOAuth",
  "getMetaOAuthStatus",
  "metaOAuthCallback",
  "publishPublicationToConnectedMeta",
  "publishPublicationToMeta",
].sort());

for (const path of [
  ".env.example",
  ".env.emulators.example",
  "src/features/publications/components/PublicationComposer.jsx",
  "src/features/publications/components/PublicationDashboard.jsx",
  "src/features/publications/components/PublicationPreview.jsx",
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

const firebaseJson = JSON.parse(read("firebase.json"));
assert.equal(firebaseJson.hosting, undefined, "firebase.json should not configure classic Hosting for the App Hosting Next.js app");

const packageJson = JSON.parse(read("package.json"));
assert.equal(packageJson.scripts["firebase:deploy"], undefined, "package.json should not expose a broad firebase deploy script");
assert.match(packageJson.scripts["test:studio-emulators"], /smoke-studio-emulator-ui\.mjs/);
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
