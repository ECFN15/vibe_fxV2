# Vibe_fx V2

Vibe_fx V2 est une application Next.js App Router ciblee Firebase App Hosting pour creer des visuels sociaux, les importer vers une publication, preparer caption/statuts/previews et publier vers Instagram/Facebook via Meta OAuth cote Firebase Functions.

## Stack

- Next.js App Router
- Firebase Auth, Firestore, Storage, Functions
- Firebase App Hosting cible
- Pages publiques SEO indexables
- Studio prive noindex

## Commandes principales

```powershell
npm run dev
npm run verify:local
npm run verify:routes
npm run test:studio-ui
npm run test:studio-emulators
npm run check:e2e-readiness
npm run check:emulator-readiness
```

`verify:local` lance lint, audit scope, audit secrets, smoke test publication, build Next et lint Functions.

`verify:routes` attend un serveur Next local sur `http://localhost:3000` par defaut. Utiliser `SMOKE_BASE_URL` pour cibler un autre port.

`test:studio-ui` attend aussi un serveur Next local et lance Playwright sur le flux `/studio` -> mise en page -> demo -> import publication -> preview.

## Etat actuel

- `functions/index.js` est reduit au perimetre Meta/OAuth/publication.
- Les anciennes fonctions hors produit et l'identite source ont ete retirees.
- `PublicationsManager.jsx` est modularise via `src/features/publications/components/` et `src/features/publications/helpers/`.
- Les publications sont rattachees a `ownerUid`.
- Le studio cree une session Firebase Auth anonyme quand Firebase est initialise, afin de disposer d'un `uid` avant l'enregistrement.
- Les uploads publication ciblent `users/{uid}/publications/...`.
- `firestore.rules`, `storage.rules` et `firestore.indexes.json` suivent ce modele.
- Les pages SEO prioritaires sont creees avec metadata/canonical/JSON-LD.

## Pages publiques

- `/`
- `/outil-publication-reseaux-sociaux`
- `/editeur-image-instagram`
- `/publier-instagram-facebook`
- `/templates`
- `/ressources/meta-oauth-publication-instagram-facebook`
- `/ressources/formats-instagram`

## Studio

- `/studio`
- `noindex`
- client component isole
- actions Meta/OAuth neutralisees quand Firebase Functions n'est pas initialise

## Firebase local

Un mode emulateurs est prepare :

```powershell
npm run check:emulator-readiness
npm run emulators
npm run test:emulators
npm run test:studio-emulators
```

Firebase Tools 15+ exige Java 21 ou plus pour lancer les emulateurs. La machine actuelle a ete observee avec Java 17, donc les emulateurs ne demarrent pas tant que Java 21+ n'est pas disponible.

`firebase-tools` et `@playwright/test` sont installes en devDependencies pour rendre les commandes Firebase et le smoke test navigateur reproductibles via `npm ci` et en CI.

`postcss` est force en `8.5.10` via `overrides` pour garder `npm audit --omit=optional` a zero vulnerabilite tout en restant sur Next `16.2.6`.

## Deploiement

L'application Next.js cible Firebase App Hosting via `apphosting.yaml`; le projet ne declare pas de bloc Firebase Hosting classique dans `firebase.json`.

Pour deployer le backend Firebase hors App Hosting :

```powershell
$env:FIREBASE_PROJECT_ID = "votre-projet-vibefx"
npm run firebase:deploy:backend
```

Les scripts de deploiement passent par `scripts/check-deploy-target.mjs` et refusent les projets `demo-*` ou l'ancien projet source. `firebase:deploy:functions` limite le deploiement aux Functions quand seules les callables Meta changent.

Pour App Hosting, creer/configurer le backend App Hosting dans Firebase puis lancer les rollouts avec les commandes `firebase apphosting:*` adaptees au projet.

Pour tester avec emulateurs, creer un `.env.local` depuis `.env.example` avec :

```powershell
Copy-Item .env.emulators.example .env.local
```

Ou renseigner manuellement :

```text
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-vibefx
```

## E2E reel restant

Le parcours complet Firebase/Meta demande encore une configuration externe :

- `.env.local` avec configuration Firebase publique reelle ;
- utilisateur Firebase Auth ;
- Anonymous Auth active dans Firebase Auth, ou un autre provider branche ;
- Firestore/Storage/Functions deployes ou emulateurs lances ;
- secrets Meta dans Firebase Secret Manager :
  - `META_APP_ID`
  - `META_APP_SECRET`
  - `META_OAUTH_REDIRECT_URI`
  - `META_TOKEN_ENCRYPTION_KEY`
- App Check configure cote client avant de passer `ENFORCE_META_APP_CHECK=true` sur les callables Meta ;
- pour la publication Meta manuelle optionnelle : `ADMIN_EMAILS`, un custom claim `admin`, ou un document `admins/{email}` actif ;
- app Meta configuree avec redirect URI et permissions.

Voir aussi :

- `docs/business-flow-test.md`
- `docs/completion-audit.md`
