# AGENTS.md - Vibe_fx V2

## Priorite de lecture

Tout agent IA doit lire ces fichiers dans cet ordre avant de modifier le projet :

1. `AGENTS.md` - regles de travail, contraintes et liens vers les docs.
2. `map.md` - carte vivante du projet, a tenir a jour.
3. `seo.md` - strategie SEO Google, gates de validation et sources officielles.
4. `MEGAPROMPT.md` - prompt maitre de conception pour lancer la vraie construction.
5. Les skills utiles dans `.agents/skills/`, surtout `cyber-neon`, `dark-ui`, `technical-ui` et `motion`.

## Intention produit

Vibe_fx V2 est un nouveau projet independant, cree dans `C:\Users\matth\Travail\vibe_fxV2`, a partir de l'analyse de `C:\Users\matth\Desktop\jardin de chawi` sans modifier le projet source.

Le produit cible est un outil web public permettant :

- de creer et modifier des images sociales dans une page "mise en page" ;
- d'importer le rendu vers une page publication ;
- de finaliser titre, caption, image, formats sociaux et statut ;
- de publier sur le site et vers Instagram/Facebook via Meta OAuth ;
- de limiter le stockage de donnees au strict necessaire au depart.

## Regles de modification

- Ne jamais modifier le projet source `C:\Users\matth\Desktop\jardin de chawi`.
- Ne pas toucher aux dossiers `node_modules/`, `.next/`, `.git/`, `dist/`.
- Mettre a jour `map.md` a chaque creation, suppression, renommage, deplacement ou modification structurelle.
- Les images statiques vont dans `public/assets/`.
- Les uploads utilisateurs doivent passer par Firebase Storage.
- Les secrets Meta/Firebase ne doivent jamais etre hardcodes.
- Les parcours OAuth, publication reseaux, chiffrement token et anti-doublon restent cote serveur Firebase Functions.
- Les pages publiques doivent etre indexables ; les surfaces studio/app privees doivent etre `noindex`.

## Architecture cible choisie

Choix principal : Next.js App Router + Firebase App Hosting.

Raison : le besoin de referencement maximal exclut un SPA pur pour les pages marketing et ressources SEO. Next.js permet SSG/SSR/metadata/sitemap/robots/structured data, tandis que l'editeur image reste un client component isole. Firebase App Hosting supporte officiellement Next.js et s'integre a Auth, Firestore, Storage, Functions et Secret Manager.

## Design system cible

Ne pas reprendre la pate graphique de Jardin de Chawi.

- Direction principale : `cyber-neon` pour la marque et les pages publiques.
- Direction produit : `dark-ui` pour les surfaces de travail longues.
- Direction workflow : `technical-ui` pour les panneaux, statuts, logs, tables et controles.
- Contrainte forte : ne pas casser la structure responsive existante de la page mise en page ; changer l'UI et les tokens, pas l'ergonomie deja validee.

## Code importe a auditer avant construction

Le projet contient deja des copies de reference issues du projet source :

- `src/features/vibefx-layout/` : moteur et UI de la page mise en page.
- `src/features/publications/PublicationsManager.jsx` : studio publications + route import vers publication + boutons Meta.
- `functions/` : base Functions copiee, a reduire au strict necessaire Vibe_fx V2 avant deploy.
- `public/assets/vibefx/demo-astronaut.png` : image demo.

Ces copies sont des materiaux de depart, pas une architecture finale validee.

Important : le moteur publication/Firebase du projet source est une base a conserver. Les prochains agents doivent porter et generaliser la logique deja faite dans Jardin de Chawi : publication manager, route mise en page vers publication, uploads Storage, callables Meta OAuth, locks anti-doublon, statuts plateforme et regles Firestore/Storage. Il ne faut pas reconstruire cette logique de zero sauf si une partie est explicitement invalide pour le modele multi-utilisateur Vibe_fx V2.

## Gates avant toute vraie implementation

- Lire `MEGAPROMPT.md` et suivre son ordre.
- Faire un audit des imports existants.
- Decouper `PublicationsManager.jsx` en modules propres avant d'ajouter des features.
- Extraire les fonctions Firebase inutiles au produit Vibe_fx V2.
- Verifier `npm run lint`, `npm run build`, et `npm --prefix functions run lint`.
- Valider SEO : metadata, canonical, sitemap, robots, structured data, rendu HTML sans JS pour pages publiques.
