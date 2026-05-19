# Audit de completion - chantier Vibe_fx V2

Derniere mise a jour : 2026-05-18

## Objectif concret audite

Le chantier demande de :

1. nettoyer l'import source et neutraliser l'identite source ;
2. reduire `functions/index.js` au scope Meta/OAuth/publication ;
3. modulariser `PublicationsManager.jsx` ;
4. corriger les warnings lint ;
5. securiser le modele multi-utilisateur ;
6. construire les pages SEO prioritaires ;
7. tester le parcours metier mise en page -> publication -> preview -> OAuth Meta quand la configuration est prete.

## Checklist prompt -> artefacts

| Exigence | Artefact / preuve | Statut |
| --- | --- | --- |
| Neutraliser l'identite source | Scan `rg` sans match sur les termes source dans `src`, `functions`, rules, docs, scripts et manifests. | OK |
| Supprimer fonctions hors produit | `functions/index.js` n'exporte plus que `publishPublicationToMeta`, `getMetaOAuthStatus`, `createMetaOAuthConnectUrl`, `disconnectMetaOAuth`, `publishPublicationToConnectedMeta`, `metaOAuthCallback`. | OK |
| Runtime Functions | `functions/package.json` cible CommonJS, Node 20, `firebase-functions` v6 et `firebase-admin` v13; `npm run test:scope` bloque une regression de ce socle. | OK |
| Garder/refactorer OAuth Meta | `functions/index.js` conserve OAuth connect, callback, status, disconnect, publication connectee et fallback manuel. | OK |
| Secrets callback OAuth explicites | `metaOAuthCallback` verifie `META_APP_ID`, `META_APP_SECRET` et `META_OAUTH_REDIRECT_URI` avant les appels Graph API et renvoie une erreur exploitable si la config est incomplete. | OK |
| State OAuth non rejouable | `metaOAuthCallback` reserve le document `meta_oauth_states/{stateId}` en transaction avec `status: "processing"` avant les appels Meta et le passe en `failed` si le callback echoue. | OK |
| Token OAuth expire | `publishPublicationToConnectedMeta` bloque un token Meta expire, marque la connexion `expired` et demande une reconnexion. | OK |
| Token Meta non expose | `publicMetaConnection` ne retourne pas `encryptedPageAccessToken`/`accessToken`; `getMetaOAuthStatus` ne renvoie que cette projection publique; `publishPublicationToConnectedMeta` dechiffre le token uniquement cote serveur. `npm run test:scope` bloque une regression. | OK |
| Deconnexion Meta nettoyante | `disconnectMetaOAuth` supprime explicitement le token chiffre et les metadonnees de connexion sensibles via `FieldValue.delete()` avant de marquer la connexion `disconnected`. | OK |
| Cibles Meta vides | `validateMetaTargets` refuse une synchronisation sans Instagram ni Facebook selectionne. | OK |
| Lock anti-doublon Meta | `acquireMetaLock` verifie `ownerUid`, refuse une sync `running` non expiree, pose un lock 10 min, et `publishPublicationWithCredentials` libere le lock en `done` ou `failed`; `npm run test:scope` bloque une regression. | OK |
| Publication Meta manuelle | `publishPublicationToMeta` exige un admin via custom claim, `ADMIN_EMAILS`, ou document `admins/{email}` actif; aucun email admin n'est hardcode. | OK |
| Secrets non hardcodes | `npm run audit:secrets` scanne les fichiers versionnables et bloque cles Firebase, tokens Meta, private keys et valeurs sensibles Meta hardcodees. | OK |
| Decouper `PublicationsManager.jsx` | Composants extraits dans `src/features/publications/components/`, helpers dans `src/features/publications/helpers/publicationHelpers.js`; ancien manager legacy, editeur interne et moteur canvas mort supprimes. | OK |
| Helpers slug/caption/upload/validation | `publicationHelpers.js` contient `slugify`, `buildChecker`, `resolvePublicationAssets`, `buildPublicationData`, normalisation draft. | OK |
| Corriger warnings lint | `npm run lint` passe sans erreur ni avertissement. | OK |
| `<img>` surfaces studio privees | Regle ESLint ciblee sur `src/features/**`; alt manquant corrige. | OK |
| Hooks deps | `useCanvasEvents.js`, `useCanvasRenderer.js`, `PublicationComposer.jsx` passent ESLint hooks. | OK |
| `ownerUid` publications | Creation/update publication impose `ownerUid`; chargement filtre `where("ownerUid", "==", uid)`. | OK |
| Session utilisateur studio | `PublicationsManager.jsx` initialise Firebase Auth en anonyme via `onAuthStateChanged` + `signInAnonymously` quand Auth est disponible, afin d'obtenir un `uid` pour le modele owner. | OK |
| Uploads Storage par utilisateur | `resolvePublicationAssets` upload sous `users/{uid}/publications/{publicationId}/...`; smoke test verifie cover + slide. | OK |
| Rules Firestore | `firestore.rules` impose owner create/update/read/delete, limite `users/{uid}` aux champs profil publics, bloque transfert `ownerUid`, bloque les collections techniques et interdit au client de falsifier `platformStatus`/`metaSync`. | OK |
| Rules Storage | `storage.rules` autorise write uniquement au proprietaire sous `users/{uid}/publications/**`, permet `get` public des medias sans autoriser `list`, et bloque l'ancien `/publications/**` en ecriture. | OK |
| Index Firestore | `firestore.indexes.json` ajoute `ownerUid ASC`, `updatedAt DESC`. | OK |
| App Check Meta optionnel | `src/lib/firebase.js` initialise App Check quand `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` existe; les callables Meta lisent `ENFORCE_META_APP_CHECK`; `check:e2e-readiness` bloque si l'enforcement est active sans cle client App Check. | OK |
| Pages SEO prioritaires | Routes App Router creees pour les six URLs demandees. | OK |
| Metadata/canonical/JSON-LD | `seo-pages.js`, `SeoLandingPage.jsx`; `npm run test:routes` verifie canonical + JSON-LD sur toutes les routes publiques, home incluse. | OK |
| Sitemap/robots | `sitemap.js`, `robots.js`; `npm run test:routes` verifie sitemap, robots et noindex studio. | OK |
| Pas de bundle studio sur pages publiques | `src/app/layout.js` n'importe plus les CSS studio; `src/app/studio/layout.js` les isole sur `/studio`; `npm run test:routes` verifie que les pages publiques ne chargent pas de chunks studio. | OK |
| Mise en page -> import publication | `VibeFxLayout` construit un payload avec `blob`, `socialImages`, `format`, `template`, `settings` et appelle `onImportToPublication(payload)`; `normalizeVibeFxDraft` + `npm run test:publication-flow` verifient le passage draft -> payload publication; `npm run test:studio-ui` verifie le flux navigateur `/studio` -> demo -> import -> page Publication. | OK hors Firebase reel |
| Enregistrement brouillon/publication | Code client present avec `setDoc`/`updateDoc`, `ownerUid`, Auth anonyme et upsert local apres sauvegarde; `npm run test:studio-emulators` clique la sauvegarde brouillon depuis `/studio` contre Auth/Firestore/Storage/Functions emulateurs et verifie le document Firestore + chemin Storage utilisateur. | OK sous emulateurs |
| Preview Instagram/Facebook | Preview composant presente; route/studio build OK; `npm run test:studio-ui` verifie l'affichage de la preview et la mise a jour de la description. | OK |
| OAuth Meta | Fonctions et garde-fous client presents; non teste sans app Meta, redirect URI et secrets. | Bloque config externe |
| Voie emulateurs Firebase | `firebase.json`, `src/lib/firebase.js`, `.env.example`, `npm run check:emulator-readiness` et `npm run test:emulators` testent Auth anonyme, profils users limites, creation publication avec payload `buildPublicationData`, ownership Firestore, lectures public/draft, collections techniques bloquees, chemins Storage, types MIME et limite 8 MB en local avec Java 21. | OK |
| Deploiement App Hosting | `apphosting.yaml` porte la cible Next.js App Hosting; `firebase.json` ne declare pas de Hosting classique `.next`; `firebase:deploy:backend` et `firebase:deploy:functions` passent par un wrapper qui exige `FIREBASE_PROJECT_ID`, refuse `demo-*` et limite les ressources deployees. | OK |
| CI | `.github/workflows/verify.yml` lance `verify:local`, `check:emulator-readiness`, `test:emulators` avec Java 21, `verify:routes`, `test:studio-ui` et `test:studio-emulators` sur push/PR. | OK |
| Fichiers env exemples | `.env.example` et `.env.emulators.example` sont versionnables via exceptions `.gitignore`, sans exposer `.env.local`. | OK |
| Audit dependances | `npm run audit:deps` passe avec 0 vulnerabilite grace a `overrides.postcss=8.5.10`. | OK |

## Commandes de verification

Dernieres commandes passees :

```powershell
npm run lint
npm run build
npm --prefix functions run lint
npm run verify:local
npm run audit:secrets
npm run test:scope
npm run test:publication-flow
npm run test:routes
npm run test:studio-ui
npm run check:emulator-readiness
npm run test:emulators
npm run test:studio-emulators
npm run check:deploy-target
npm run audit:deps
```

## Conclusion

Le chantier est complet pour les artefacts et validations executables localement dans ce repo sans configuration Firebase/Meta. Le parcours local verifiable couvre maintenant `/studio` -> mise en page -> demo -> import publication -> preview -> clic `Brouillon` -> document Firestore + media Storage sous emulateurs.

La validation E2E reelle Firebase/Meta hors emulateurs reste conditionnee aux elements externes suivants :

- `.env.local` avec configuration Firebase client reelle ;
- utilisateur Firebase Auth testable ;
- rules Firestore/Storage deployees pour un test reel hors emulateurs ;
- Firebase Functions deployees ou emulateur Functions lance ;
- secrets Meta deployes : `META_APP_ID`, `META_APP_SECRET`, `META_OAUTH_REDIRECT_URI`, `META_TOKEN_ENCRYPTION_KEY` ;
- app Meta configuree avec redirect URI et permissions.

Note : les rules Firestore/Storage sont validees sous emulateurs avec Java 21 via `npm run test:emulators`. Le poste local utilise encore Java 17 par defaut, donc il faut activer Java 21 dans le shell ou l'installer par defaut avant de relancer cette commande sans surcharge `JAVA_HOME`.

Le script suivant formalise ce blocage :

```powershell
npm run check:e2e-readiness
```
