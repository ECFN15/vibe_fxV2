# Test parcours metier Vibe_fx V2

Derniere mise a jour : 2026-05-18

## Couverture validee localement

- Routes publiques et studio servis par Next en local :
  - `/`
  - `/studio`
  - `/outil-publication-reseaux-sociaux`
  - `/editeur-image-instagram`
  - `/publier-instagram-facebook`
  - `/templates`
  - `/ressources/meta-oauth-publication-instagram-facebook`
  - `/ressources/formats-instagram`
  - `/robots.txt`
  - `/sitemap.xml`
- Smoke test routes :
  - HTTP 200 sur toutes les routes publiques prioritaires, `/studio`, `robots.txt`, `sitemap.xml`;
  - JSON-LD, canonical et absence de `noindex` sur toutes les pages publiques prioritaires;
  - absence de chunks studio/publications/vibefx-layout sur les pages publiques;
  - `noindex` sur `/studio`;
  - `Disallow: /studio` dans `robots.txt`;
  - presence des routes publiques dans `sitemap.xml`.
- Smoke test Node des helpers publication :
  - normalisation d'un export mise en page via `normalizeVibeFxDraft`;
  - validation caption/format via `buildChecker`;
  - construction payload publication via `buildPublicationData`;
  - verification de `ownerUid`, slug, statut draft et social image.
- Import mise en page :
  - `VibeFxLayout.jsx` construit un payload avec `blob`, `socialImages`, `format`, `template` et `settings`;
  - le payload est transmis par `onImportToPublication(payload)` vers `PublicationsManager`.
- Etat local publication :
  - apres sauvegarde, `PublicationsManager.jsx` ajoute/remplace la publication dans la liste locale;
  - si la publication sauvegardee est mise en avant, les autres entrees locales sont normalisees a `featured: false`.
- Session studio :
  - `PublicationsManager.jsx` cree une session Firebase Auth anonyme quand Auth est initialise;
  - cette session fournit le `uid` utilise pour charger `where("ownerUid", "==", uid)` et sauvegarder les publications.

Commande versionnee :

```powershell
npm run verify:local
npm run test:publication-flow
npm run test:routes
npm run test:studio-ui
```

`npm run test:routes` attend un serveur Next accessible sur `http://localhost:3000` par defaut. Pour cibler un autre serveur, utiliser `SMOKE_BASE_URL`, par exemple :

```powershell
$env:SMOKE_BASE_URL="http://localhost:3001"; npm run test:routes
```

`npm run test:studio-ui` utilise Playwright et attend aussi un serveur Next accessible via `SMOKE_BASE_URL` ou `http://localhost:3000`. Il verifie le flux navigateur suivant : `/studio` -> ouvrir la mise en page -> lancer la demo -> importer -> afficher la preview publication -> modifier la description.

Resultat observe :

```text
publication flow smoke test OK
route smoke test OK (http://localhost:3000)
route smoke test OK (http://localhost:3020)
studio UI smoke test OK
Firebase emulator readiness OK
firebase emulator smoke test OK
```

## Couverture validee par build

- `npm run lint` passe sans erreur ni avertissement.
- `npm run audit:secrets` passe et bloque les signatures courantes de secrets commites.
- `npm run build` passe et prerender 13 routes App Router.
- `npm --prefix functions run lint` passe avec `node --check index.js`.
- `npm run verify:local` rejoue lint, audit scope, audit secrets, smoke test publication, build, lint Functions et audit dependances.
- `npm run verify:routes` rejoue le smoke test routes contre le serveur local, y compris contre `next start` via `SMOKE_BASE_URL`.
- `npm run test:studio-ui` rejoue un smoke test navigateur Playwright du flux mise en page -> import publication -> preview, y compris contre `next start` via `SMOKE_BASE_URL`.

## Non valide localement sans configuration externe

Les etapes suivantes exigent un vrai projet Firebase configure dans `.env.local` et les secrets Meta deployes :

- authentification utilisateur Firebase, avec Anonymous Auth active ou un autre provider branche ;
- ecriture Firestore reelle d'un brouillon ou d'une publication ;
- upload Firebase Storage reel sous `users/{uid}/publications/...`;
- appel callable Functions depuis le client ;
- connexion OAuth Meta ;
- callback OAuth Meta ;
- publication Instagram/Facebook reelle.

Le client des publications neutralise les actions Meta quand Firebase Functions n'est pas initialise, afin d'eviter des appels OAuth avant configuration du projet.

Commande de readiness :

```powershell
npm run check:e2e-readiness
```

Cette commande liste les variables publiques Firebase absentes et rappelle que les secrets Meta doivent etre verifies dans Firebase Secret Manager pour les Functions deployees.

## Mode emulateurs Firebase

Une voie de test locale est preparee avec les emulateurs Firebase :

```powershell
npm run check:emulator-readiness
npm run emulators
npm run test:emulators
```

Dans un autre terminal, creer un `.env.local` de test avec les valeurs demo :

```powershell
Copy-Item .env.emulators.example .env.local
```

Les valeurs minimales sont notamment :

```text
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-vibefx
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true
```

Puis relancer Next :

```powershell
npm run dev
```

Le client se connecte alors aux ports locaux :

- Auth : `9099`
- Firestore : `8080`
- Functions : `5001`
- Storage : `9199`
- UI emulateurs : `4000`

Cette voie permet de tester Auth, Firestore, Storage et Functions localement. Elle ne remplace pas le test Meta OAuth reel, qui demande toujours une app Meta, une redirect URI et des secrets deployes.

Note : Firebase Tools 15+ exige Java 21 ou plus pour les emulateurs. `npm run check:emulator-readiness` signale ce prerequis avant lancement. Le test a ete valide avec un JDK 21 dans `JAVA_HOME`; le Java systeme du poste reste a mettre a niveau si la commande doit fonctionner sans surcharge d'environnement.

`npm run test:emulators` demarre Auth, Firestore et Storage via `emulators:exec`, connecte deux utilisateurs anonymes comme le studio, puis verifie :

- creation/update d'un profil utilisateur avec champs publics limites ;
- refus de creation/update client de `plan`, `role` ou droits utilisateur sur son propre profil ;
- refus de lecture du profil utilisateur par un autre utilisateur ;
- creation publication par son proprietaire avec un payload complet construit par `buildPublicationData` ;
- lecture/query par `ownerUid` ;
- refus de lecture d'un brouillon par un autre utilisateur ;
- lecture publique d'une publication publiee ;
- refus de creation/update par un autre utilisateur ;
- refus de transfert `ownerUid` ;
- refus de creation/update client de faux `platformStatus` et `metaSync` ;
- refus d'ecriture client dans les collections techniques comme `meta_connections` ;
- upload autorise sous `users/{uid}/publications/...` ;
- lecture directe publique d'un media utilisateur par URL Storage ;
- refus de listing des dossiers medias utilisateur ;
- refus d'upload par un autre utilisateur ;
- refus d'upload non-image ou superieur a 8 MB ;
- refus d'ecriture sous l'ancien chemin `/publications`.

Variables et secrets requis :

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION`
- `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` pour les callables Meta, Billing et IA en production
- `META_APP_ID`
- `META_APP_SECRET`
- `META_OAUTH_REDIRECT_URI`
- `META_TOKEN_ENCRYPTION_KEY`
- selon le mode manuel : `META_ACCESS_TOKEN`, `META_IG_USER_ID`, `META_FACEBOOK_PAGE_ID`
- pour autoriser le mode manuel : `ADMIN_EMAILS`, custom claim `admin`, ou document `admins/{email}` actif
- App Check est enforce par defaut hors emulateurs; `ENFORCE_META_APP_CHECK=false`, `ENFORCE_BILLING_APP_CHECK=false` ou `ENFORCE_AI_APP_CHECK=false` ne doivent servir qu'en session locale controlee.

## Checklist a rejouer avec Firebase pret

1. Ouvrir `/studio`.
2. Creer une mise en page.
3. Importer le rendu vers publication.
4. Enregistrer un brouillon et verifier `ownerUid` dans Firestore.
5. Publier site et verifier `status: "published"`.
6. Verifier que les uploads sont sous `users/{uid}/publications/...`.
7. Verifier les previews Instagram/Facebook dans la page publication.
8. Connecter OAuth Meta.
9. Publier vers Instagram/Facebook via `publishPublicationToConnectedMeta`.
10. Verifier les statuts plateforme et le verrou anti-doublon.
11. Verifier qu'un token Meta expire marque la connexion `expired` et demande une reconnexion.
