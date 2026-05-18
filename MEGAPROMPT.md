# MEGAPROMPT.md - Conception et lancement Vibe_fx V2

## Prompt a donner a l'agent qui construira le projet

Tu travailles dans `C:\Users\matth\Travail\vibe_fxV2`. Ne modifie jamais `C:\Users\matth\Desktop\jardin de chawi`. Le projet source sert uniquement de reference de lecture. Tu dois construire Vibe_fx V2 comme un nouveau produit public : un studio web puissant pour creer, modifier, preparer et publier des images sociales vers un site, Instagram et Facebook via Meta OAuth.

Avant de coder, lis dans cet ordre :

1. `AGENTS.md`
2. `map.md`
3. `seo.md`
4. `.agents/skills/cyber-neon/SKILL.md`
5. `.agents/skills/dark-ui/SKILL.md`
6. `.agents/skills/technical-ui/SKILL.md`
7. Le code importe dans `src/features/vibefx-layout/`
8. Le code importe dans `src/features/publications/PublicationsManager.jsx`
9. Le code Functions dans `functions/`

## Objectif produit

Creer une application web commercialisable ou les utilisateurs peuvent :

- arriver sur un site public bien reference ;
- comprendre l'outil et lancer le studio ;
- importer une image ;
- choisir un format social ;
- modifier image, textes, fonds, flous, positions, slots et style ;
- importer le rendu vers une publication ;
- completer titre, slug, resume, caption, hashtags, format social et statut ;
- connecter leur compte Meta via OAuth ;
- publier vers Instagram et Facebook depuis le dernier bouton "Site + reseaux OAuth" ;
- garder peu de donnees au depart : profils minimalistes, publications, medias et connexion Meta chiffree.

## Architecture imposee

Utilise Next.js App Router + Firebase App Hosting.

Raisons :

- SEO maximal pour les pages publiques via SSG/SSR, metadata, sitemap, robots, canonical et JSON-LD.
- Le studio image est lourd et interactif : il doit rester isole en client components noindex.
- Firebase reste l'environnement de deploiement connu : App Hosting pour Next.js, Auth, Firestore, Storage, Functions, App Check, Secret Manager.
- Ne pas choisir Vite SPA pour le produit public final : trop faible pour le SEO si les contenus marketing et ressources sont client-only.

## Cible Firebase

Prevoir un nouveau projet Firebase dedie a Vibe_fx V2, pas `jardindechawi`.

Services :

- Firebase App Hosting pour Next.js.
- Firebase Auth pour utilisateurs.
- Firestore pour publications, users, entitlements, templates, meta connection metadata.
- Firebase Storage pour medias utilisateurs.
- Firebase Functions v2 region `europe-west9` pour Meta OAuth, callback, chiffrement token, publication Instagram/Facebook et anti-doublon.
- App Check sur client et callable functions.
- Secret Manager pour `META_APP_ID`, `META_APP_SECRET`, `META_OAUTH_REDIRECT_URI`, `META_TOKEN_ENCRYPTION_KEY`.

## Modele de donnees cible

Collections :

- `users/{uid}` : email, displayName, plan, createdAt, updatedAt.
- `publications/{publicationId}` : ownerUid, title, slug, excerpt, caption, status, format, image, socialImages, layoutDraft, platformStatus, metaSync, createdAt, updatedAt.
- `templates/{templateId}` : public templates de formats et styles.
- `meta_connections/{uid}` ou `users/{uid}/meta_connections/default` : metadata publique de connexion, token chiffre serveur, pageId, pageName, igUserId, igUsername, scopes, tokenExpiresAt.
- `meta_oauth_states/{stateId}` : state temporaire OAuth, TTL, uid, status.
- `rate_limits/{hash}` : anti-abus serveur si besoin.

Ne jamais exposer les tokens Meta au client.

## Migration du code importe

Le code importe est une base de reference, pas la structure finale.

Principe non negociable : ne pas repartir de zero pour le moteur publication/Firebase. Le projet Jardin de Chawi contient deja le gros du travail utile sur la logique de publication, l'import depuis "mise en page", les uploads, les statuts Meta, les callables Firebase, les verrous anti-doublon et les regles Firestore/Storage. La mission est de porter, nettoyer, generaliser et securiser cette logique pour Vibe_fx V2, pas de la remplacer par une implementation nouvelle non prouvee.

Elements a reprendre comme base metier :

- `src/features/publications/PublicationsManager.jsx` : workflow layout -> publication, validation, upload Storage, preview, statut, boutons "Site + reseaux" et "Site + reseaux OAuth".
- `src/features/vibefx-layout/` : moteur canvas, formats sociaux, templates, export/import vers publication.
- `functions/index.js` : fonctions Meta/OAuth, chiffrement token, callback, publication Instagram/Facebook, lock de synchronisation, statuts par plateforme.
- `firestore.rules` et `storage.rules` du projet source : logique d'isolation client/admin, collections techniques interdites au SDK client, lectures publiques controlees, uploads images limites par chemin/type/taille.
- Docs source Meta/Firebase du projet Jardin de Chawi : comprendre les decisions deja validees avant de modifier les flows OAuth.

Phase 1 : audit

- Identifier les dependances exactes de `src/features/vibefx-layout/`.
- Identifier tout ce qui est encore lie a Jardin de Chawi : textes, labels, avatars, routes, collections, droits admin, images, fallback.
- Identifier les fonctions utiles dans `PublicationsManager.jsx`.
- Identifier dans `functions/index.js` uniquement le flux Meta/OAuth/publication a garder.
- Comparer les rules Firestore/Storage source avec les rules Vibe_fx V2 et porter les garanties utiles : interdiction des collections techniques au client, verification ownerUid, limites image, chemins Storage publics/privés, App Check quand actif.
- Corriger les erreurs ESLint actuelles du code importe avant toute nouvelle feature : hooks React, composants crees pendant render, apostrophes JSX, balises `<img>` sur surfaces publiques et refs a renommer si necessaire.

Phase 2 : modularisation

- Garder la structure responsive de la page mise en page.
- Remplacer uniquement l'UI/tokens/style selon cyber-neon + dark-ui.
- Decouper `PublicationsManager.jsx` :
  - `PublicationDashboard`
  - `PublicationComposer`
  - `PublicationPreview`
  - `MetaOAuthPanel`
  - `PublicationList`
  - helpers validation/caption/slug/upload
- Extraire un service Firebase client :
  - publications CRUD
  - upload Storage
  - callables Meta OAuth
- Extraire le flux layout -> publication avec un contrat de payload propre.

Phase 3 : Functions propres

Refactorer `functions/index.js` depuis la logique source deja fonctionnelle, en supprimant seulement ce qui est specifique Jardin de Chawi et en gardant uniquement :

- `createMetaOAuthConnectUrl`
- `metaOAuthCallback`
- `getMetaOAuthStatus`
- `disconnectMetaOAuth`
- `publishPublicationToConnectedMeta`
- eventuellement `publishPublicationToMeta` manuel uniquement si necessaire en admin interne

Exigences serveur :

- verifier auth utilisateur ;
- verifier ownerUid de la publication ;
- utiliser state OAuth securise et expire ;
- chiffrer token page avec AES-256-GCM ;
- stocker token uniquement cote serveur ;
- lock anti-doublon pendant publication ;
- statut par plateforme : Instagram/Facebook ;
- erreurs exploitables cote UI ;
- journaliser sans token ni donnees sensibles.

## UX cible

Route publique :

1. Home SEO : preuve produit, promesse claire, CTA studio.
2. Pages SEO ressources/templates.
3. Connexion utilisateur.
4. Studio `/studio` noindex.
5. Mise en page.
6. Import vers publication.
7. Publication composer.
8. Connexion Meta OAuth.
9. Dernier bouton : publier site + reseaux OAuth.

Le studio doit pouvoir etre utilise longtemps :

- controles proches du canvas ;
- etats loading/saving/syncing/failed/success ;
- preview Instagram/Facebook ;
- messages d'erreur lisibles ;
- sauvegarde brouillon ;
- pas de stockage superflu.

## Direction visuelle obligatoire

Ne pas reprendre Jardin de Chawi.

Utilise les skills importes :

- `cyber-neon` pour l'identite : fond noir, signal violet/cyan, edges lumineux, marque futuriste.
- `dark-ui` pour l'app : surfaces profondes, lisibles, premium, utilisables longtemps.
- `technical-ui` pour workflow : panneaux, statuts, logs, controles, precision.
- `motion` seulement si utile et performant.

Contraintes :

- ne pas casser le responsive existant de la page mise en page ;
- ne pas deplacer brutalement les zones fonctionnelles ;
- remplacer la peau visuelle par tokens/design system ;
- ne pas ajouter d'effets qui nuisent a la lisibilite ;
- respecter reduced motion.

## SEO a construire

Lis et applique `seo.md`.

Pages publiques prioritaires :

- `/`
- `/outil-publication-reseaux-sociaux`
- `/editeur-image-instagram`
- `/publier-instagram-facebook`
- `/templates`
- `/ressources/meta-oauth-publication-instagram-facebook`
- `/ressources/formats-instagram`

Chaque page doit avoir :

- metadata Next.js ;
- canonical ;
- contenu HTML indexable ;
- JSON-LD adapte ;
- liens internes ;
- images optimisees ;
- sitemap ;
- pas de bundle studio inutile.

Le studio et les routes privees restent `noindex`.

## Qualite et validation

Apres chaque phase :

- mettre a jour `map.md` ;
- executer `npm run lint` ;
- executer `npm run build` ;
- executer `npm --prefix functions run lint` si Functions modifiees ;
- verifier que les pages publiques n'importent pas le studio lourd ;
- verifier que les secrets ne sont pas dans le repo ;
- verifier que les rules Firestore/Storage correspondent au modele de donnees ;
- tester le parcours layout -> publication avec donnees locales ou Firebase dev ;
- tester OAuth en environnement deploye uniquement quand les secrets et URLs Meta sont prets.

## Definition de fini

Le projet est pret pour une premiere mise en ligne quand :

- l'architecture Next.js + Firebase App Hosting est propre ;
- les pages publiques sont SEO-ready ;
- le studio fonctionne sans regression responsive ;
- le flux mise en page -> publication fonctionne ;
- l'OAuth Meta est serveur, chiffre et teste ;
- le bouton final publie vers les reseaux avec statut clair ;
- `map.md`, `seo.md`, `AGENTS.md` et `README.md` sont a jour ;
- les checks lint/build/functions passent.
