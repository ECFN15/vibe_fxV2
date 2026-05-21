# MEGAPROMPT - Soundtrack V2, bibliotheque projet et agregateur Pixabay

## Mission

Tu travailles dans `C:\Users\matth\Travail\vibe_fxv2`.

Reprends l'onglet `Soundtrack` existant et transforme-le en vraie surface production pour Vibe_CUT. L'interface actuelle est trop confuse et plusieurs actions ne fonctionnent pas. L'objectif est de reorganiser ce qui existe deja dans le projet, d'ajouter une vraie bibliotheque audio projet, et de creer une experience premium d'agregation/import depuis des sources gratuites comme Pixabay.

Ce prompt remplace l'intention UX de `docs/soundtrack-local-playlist-megaprompt.md` sans supprimer ses garanties utiles. Le modele n'est plus seulement "local-first" : il faut deux espaces clairs.

1. **Bibliotheque projet Vibe_fx** : sons disponibles dans le projet, persistants, rangeables, reutilisables dans Vibe_CUT.
2. **Agregateur premium** : recherche/scan de plateformes gratuites, priorite Pixabay, filtres puissants, ecoute, selection, import vers la bibliotheque projet ou telechargement local.

## Lecture obligatoire

Lis dans cet ordre avant de modifier :

1. `AGENTS.md`
2. `map.md`
3. `seo.md`
4. `MEGAPROMPT.md`
5. `.agents/skills/design/SKILL.md` ou `.agents/skills/design/skill.md`
6. `.agents/skills/dark-ui/SKILL.md`
7. `.agents/skills/technical-ui/SKILL.md`
8. `docs/music-sourcing-and-import-plan.md`
9. `docs/soundtrack-local-playlist-megaprompt.md`
10. `docs/changes-recovery-audit-megaprompt.md`
11. `src/features/vibefx-studio/soundtrack/`
12. `src/features/vibefx-studio/video/panels/MusicLibrary.jsx`
13. `src/features/vibefx-studio/video/data/musicCatalog.js`
14. `src/features/vibefx-studio/video/data/musicRights.js`
15. `src/features/vibefx-studio/video/utils/audioWaveform.js`
16. `src/app/api/music/free-search/route.js`
17. `src/app/api/music/import/route.js`
18. `storage.rules` et `firestore.rules`

## Sources officielles a verifier

Avant de coder le connecteur Pixabay, verifie les sources officielles actuelles :

- Pixabay API docs : `https://pixabay.com/api/docs/`
- Pixabay Content License Summary : `https://pixabay.com/service/license-summary/`
- Pixabay Terms si besoin : `https://pixabay.com/service/terms/`

Points connus a integrer :

- L'API publique documentee mentionne surtout images/videos ; ne suppose pas qu'un endpoint audio officiel existe sans verification.
- Les resultats API doivent afficher clairement la source Pixabay quand ils sont montres.
- Les limites API et obligations de cache doivent etre respectees : pas de requetes massives automatiques, cache serveur 24h si requis, pagination controlee.
- La licence Pixabay permet l'usage gratuit et la modification, mais interdit la redistribution standalone et signale que certains contenus peuvent porter des droits supplementaires. Le produit doit donc garder une trace de source/licence/page d'origine et un avertissement Content ID / droits tiers.

Si aucun endpoint officiel audio Pixabay n'est disponible :

- ne fais pas de scraping fragile ou interdit ;
- garde Pixabay comme provider "connecteur a valider" ;
- implemente un import URL Pixabay controle via `/api/music/import` si l'URL audio directe est fournie par l'utilisateur et autorisee ;
- documente clairement la limite dans l'UI et dans le rapport de reprise.

## Design obligatoire avec le skill `design`

Utilise le skill local `design` comme base visuelle principale.

Direction : **Vibe_OS Cockpit Mode / Technical Precision**.

Contraintes :

- fond global `#050505`, surfaces `#0a0a0a`, bordures `#171717`, separateurs `#262626`;
- texte principal `#e5e5e5`, secondaire `#737373`, accent actif `#6366f1`, danger `#ef4444`;
- densite visuelle elevee, symetrie, alignements rigides, grilles structurelles;
- rayons `0px` a `4px` maximum, pas de `rounded-xl`, pas de cartes molles;
- labels mono uppercase `text-[10px]`, `tracking-widest`;
- boutons ghost/flat avec bordure fine, icones lucide `14` ou `16`;
- inputs type terminal : fond sombre, bordure fine, typo mono;
- pas de texte marketing dans l'app, uniquement des etats, actions, droits, sources et resultats;
- pas de cartes imbriquees : utiliser des colonnes, rails, tables, panneaux et separateurs;
- micro-interactions 150-300ms, courbe `cubic-bezier(0.16, 1, 0.3, 1)`, reduced motion respecte.

Avant tout gros code UI, produire mentalement ou dans le rapport un mini design plan :

- grille principale;
- rails et panneaux;
- composants denses;
- etats empty/loading/error/success;
- mobile.

## Architecture cible Soundtrack V2

Garder `src/features/vibefx-studio/soundtrack/`, mais reorganiser si necessaire.

Architecture cible possible :

```text
src/features/vibefx-studio/soundtrack/
|-- SoundtrackPage.jsx
|-- soundtrack.css
|-- components/
|   |-- ProjectLibraryPanel.jsx
|   |-- ProjectTrackTable.jsx
|   |-- AggregatorPanel.jsx
|   |-- ProviderScanControls.jsx
|   |-- ProviderResultTable.jsx
|   |-- SoundtrackPlayer.jsx
|   |-- TrackInspector.jsx
|   |-- PlaylistManager.jsx
|   `-- RightsStatusPanel.jsx
|-- data/
|   |-- soundtrackDefaults.js
|   `-- soundtrackProviders.js
|-- hooks/
|   |-- useProjectSoundLibrary.js
|   |-- useProviderScan.js
|   |-- useSoundtrackPlayer.js
|   `-- useSoundtrackSelection.js
|-- services/
|   |-- projectSoundLibraryClient.js
|   |-- providerSearchClient.js
|   |-- soundtrackDownloads.js
|   |-- soundtrackIndexedDb.js
|   |-- soundtrackManifest.js
|   `-- soundtrackRights.js
`-- README.md
```

Ne renomme pas tout si l'existant peut etre corrige proprement. Priorite : rendre coherent et fonctionnel.

## Layout produit attendu

La page doit etre une surface full-screen dans `/studio`, pas un panneau secondaire.

Layout desktop :

- **Top command strip** : recherche, provider, scan, statut, compteur, actions globales.
- **Colonne gauche** : bibliotheque projet, playlists/dossiers/categories, filtres rapides.
- **Centre** : table principale selon mode actif :
  - `Bibliotheque projet`
  - `Agregateur`
  - `Imports recents`
  - `A verifier`
- **Colonne droite** : inspecteur piste + droits + actions Vibe_CUT.
- **Bottom bar/player** : player compact persistent, waveform, temps, volume, source.

Layout mobile :

- tabs internes : `Projet`, `Scan`, `Imports`, `Droits`;
- recherche en haut;
- table convertie en rows compactes;
- inspecteur en drawer;
- player sticky bas;
- aucun overflow horizontal non controle.

## Mode 1 - Bibliotheque projet Vibe_fx

Objectif : centraliser les sons disponibles dans le projet pour les edits Vibe_CUT.

La bibliotheque projet doit permettre :

- voir les sons deja disponibles sur les serveurs/projet;
- ranger par categorie, mood, genre, source, licence, usage, projet, playlist;
- importer un son trouve depuis l'agregateur dans cette bibliotheque;
- importer un fichier local utilisateur dans la bibliotheque projet avec metadata et droits;
- reutiliser une piste dans Vibe_CUT sans refaire la recherche;
- supprimer ou archiver une piste si elle n'est plus voulue;
- marquer une piste comme favorite ou "a verifier";
- garder waveform, duree, BPM si detectables;
- garder attribution/source/licence/page d'origine.

### Stockage cible

Contrairement a l'ancien prompt local-first, ici la bibliotheque projet peut stocker les pistes importees dans Firebase Storage si l'utilisateur choisit explicitement "Importer dans le projet".

Regles :

- fichiers audio projet dans Storage sous un chemin owner-scoped, par exemple `users/{uid}/soundtrack/{trackId}/{fileName}`;
- metadata dans Firestore sous un chemin owner-scoped, par exemple `users/{uid}/soundtrackTracks/{trackId}` ou collection equivalente compatible rules;
- playlists/categorisation owner-scoped;
- pas de piste publique par defaut;
- pas de secrets provider dans le client;
- validation taille/MIME/duree cote client et cote serveur/rules quand possible;
- rules Storage/Firestore a mettre a jour si necessaire;
- aucune piste ne doit etre importee en projet sans metadata minimale de droits.

### Modele Track projet

```ts
type ProjectSoundTrack = {
  id: string;
  ownerUid: string;
  title: string;
  artist?: string;
  sourceProvider: "pixabay" | "openverse" | "jamendo" | "freesound" | "archive" | "wikimedia" | "local-upload" | "project";
  sourceUrl?: string;
  sourcePageUrl?: string;
  license: string;
  licenseUrl?: string;
  attribution?: string;
  contentIdWarning?: string;
  rightsStatus: "cleared-social" | "needs-review" | "blocked" | "user-declared";
  storagePath?: string;
  downloadUrl?: string;
  previewUrl?: string;
  duration?: number;
  bpm?: number;
  waveform?: { status: string; peaks: number[] };
  tags: string[];
  category?: string;
  mood?: string;
  genre?: string;
  favorite: boolean;
  importedAt: string;
  updatedAt: string;
  lastUsedAt?: string;
};
```

## Mode 2 - Agregateur premium Pixabay et sources gratuites

Objectif : une interface propre pour chercher, scanner, pre-ecouter et importer.

Providers prioritaires :

1. Pixabay, si un chemin officiel et legal existe pour audio.
2. Openverse.
3. Jamendo si `JAMENDO_CLIENT_ID` est configure.
4. Freesound si `FREESOUND_API_KEY` est configure.
5. Internet Archive.
6. Wikimedia Commons.
7. Sources internes/projet.

### Interface scan premium

Le scan doit etre volontaire, parametre et controle :

- champ recherche;
- provider;
- categorie;
- genre;
- mood;
- duree min/max;
- BPM min/max;
- licence;
- usage social/commercial;
- ordre : populaire, recent, pertinent;
- pages a scanner;
- limite resultats;
- bouton `Scanner`;
- cache et statut `cached`, `live`, `rate limited`, `provider missing key`, `blocked`.

Ne pas lancer de scan massif automatique au chargement.

### Resultats

Chaque resultat doit afficher :

- play/pause;
- waveform ou placeholder stable;
- titre;
- auteur;
- provider;
- source/page officielle;
- duree;
- BPM si connu;
- tags;
- licence;
- statut droits;
- avertissement Content ID si connu;
- actions :
  - `Ecouter`;
  - `Importer projet`;
  - `Telecharger local`;
  - `Ajouter a selection`;
  - `Ouvrir source`;
  - `Utiliser dans Vibe_CUT` seulement si fichier deja disponible.

### Import projet depuis agregateur

Flux attendu :

1. L'utilisateur scanne une source.
2. Il ecoute une piste.
3. Il clique `Importer projet`.
4. L'app affiche un recap droits/source/licence.
5. L'utilisateur confirme.
6. Le serveur/proxy telecharge ou recupere l'audio si autorise.
7. Le fichier est stocke dans Firebase Storage owner-scoped.
8. Les metadata sont ecrites en Firestore.
9. La piste apparait dans `Bibliotheque projet`.
10. Elle devient utilisable dans Vibe_CUT.

Si le provider ne permet pas l'import serveur direct :

- proposer `Telecharger local`;
- proposer `Importer fichier local dans projet`;
- garder la source et la licence quand l'utilisateur ajoute le fichier.

## API serveur a creer ou corriger

Ne mets jamais une cle Pixabay/Jamendo/Freesound cote client.

Routes possibles :

```text
GET /api/music/providers
GET /api/music/search
POST /api/music/scan
POST /api/music/project/import-url
POST /api/music/project/import-file-metadata
GET /api/music/project/library
PATCH /api/music/project/tracks/[trackId]
DELETE /api/music/project/tracks/[trackId]
```

Tu peux garder `/api/music/free-search` et `/api/music/import` si tu les generalises proprement.

Exigences serveur :

- auth obligatoire pour importer dans le projet;
- App Check si applicable;
- secrets lus via env/Secret Manager, jamais hardcodes;
- allowlist stricte des domaines audio;
- validation MIME audio;
- limite taille;
- limite duree;
- anti-abus/rate limit par uid/IP hash si necessaire;
- cache provider 24h si requis par le provider;
- logs sans URL locale sensible ni secret;
- erreurs exploitables par l'UI.

## Firebase rules

Si tu ajoutes le stockage projet :

- mets `storage.rules` a jour pour `users/{uid}/soundtrack/...`;
- limite les MIME `audio/*`;
- limite la taille si possible;
- empeche un utilisateur d'ecrire chez un autre;
- empeche les outputs IA/export sensibles d'etre ecrits par le client si deja interdit.

Si tu ajoutes Firestore :

- metadata owner-scoped seulement;
- ecriture client limitee aux champs autorises ou via serveur si plus sur;
- pas de credit/ledger/payment modifiables client;
- pas de secrets/licences provider sensibles.

## Integration Vibe_CUT

Depuis la bibliotheque projet :

- bouton `Utiliser dans Vibe_CUT`;
- ajoute la piste via le store video existant;
- conserve `rightsManifest`, attribution, source, licence, provider;
- waveform disponible si pre-calculee, sinon extraction best-effort;
- `lastUsedAt` mis a jour;
- si la piste est `needs-review` ou `blocked`, bloquer ou demander validation selon le niveau.

Depuis l'agregateur :

- `Utiliser dans Vibe_CUT` n'est actif que si la piste est deja importee ou si un Blob/File local est disponible;
- sinon l'action principale est `Importer projet`.

## A corriger dans l'existant

Auditer et corriger :

- boutons qui ne font rien;
- imports locaux qui ne rendent pas la piste reutilisable;
- resultats qui affichent des providers mais ne savent pas importer;
- confusion entre favoris, playlists locales, dossier local et bibliotheque projet;
- badges `fichier manquant` trop presents si la piste est seulement un resultat distant;
- `Vibe_CUT` desactive sans explication;
- player qui ne suit pas la selection;
- layouts avec cartes imbriquees et panneaux trop lourds;
- responsive mobile avec zones cachees ou scroll casse.

## UX exacte attendue

### Premier etat

Si aucune piste projet :

- colonne gauche : `Bibliotheque projet vide`;
- centre : agregateur pret avec source `Pixabay` ou `Sources gratuites`;
- droite : explication courte des droits et actions;
- CTA primaire : `Scanner`;
- CTA secondaire : `Importer fichier`.

### Apres scan

- centre rempli avec resultats;
- compteur resultats;
- statut provider/cache;
- boutons import/telechargement;
- preview audio immediate;
- les resultats restent consultables sans polluer la bibliotheque projet.

### Apres import projet

- toast ou statut `Importe`;
- piste visible dans bibliotheque projet;
- action `Utiliser dans Vibe_CUT` active;
- source/licence toujours visibles;
- piste memorisee apres refresh.

### Apres telechargement local

- fichier telecharge sur l'appareil;
- metadata gardee localement si utile;
- mais ne pas pretendre que la piste est dans le projet tant qu'elle n'a pas ete importee.

## Tests obligatoires

Ajouter ou corriger les tests.

### Tests unitaires/purs

- normalisation provider Pixabay/source gratuite;
- validation droits;
- mapping `ProviderTrack -> ProjectSoundTrack`;
- refus import sans metadata licence;
- statut `needs-review` si Content ID inconnu;
- cache key provider/filtres.

### Tests API

- recherche provider mockee;
- scan pagine avec limite;
- provider non configure renvoie une erreur lisible;
- import URL refuse domaine non allowliste;
- import URL refuse non audio;
- import projet exige auth;
- metadata projet conserve source/licence/attribution.

### Tests Playwright

- ouvrir `/studio`, onglet `Soundtrack`;
- design desktop : deux modes visibles `Bibliotheque projet` et `Agregateur`;
- scanner avec mock Pixabay;
- ecouter un resultat;
- importer un resultat dans bibliotheque projet;
- voir la piste dans la bibliotheque apres refresh;
- envoyer la piste dans Vibe_CUT;
- telecharger local sans l'ajouter au projet;
- mobile 390x844 sans overlap;
- etats empty/loading/error/rate-limit visibles.

## Gates

Avant de finir :

```bash
npm run lint
npm run test:scope
npm run audit:secrets
npm run test:soundtrack-ui
npm run test:video-ui
npm run build
npm --prefix functions run lint
```

Si Firebase rules ou stockage sont modifies :

```bash
npm run test:emulators
npm run test:studio-emulators
```

Si les routes publiques ou SEO sont touchees :

```bash
npm run test:routes
```

## Documentation a mettre a jour

- `map.md` pour toute structure creee/modifiee.
- `.env.example` pour les variables provider serveur, par exemple `PIXABAY_API_KEY`, seulement si le connecteur officiel le justifie.
- `docs/music-sourcing-and-import-plan.md` si la strategie Pixabay/projet change.
- `docs/changes-recovery-audit.md` si ce travail s'inscrit dans la reprise du worktree interrompu.

## Definition de fini

Soundtrack V2 est fini quand :

- le design suit le skill `design` cockpit technique;
- la page est lisible, dense, premium et mieux organisee;
- la bibliotheque projet est separee clairement de l'agregateur;
- une piste importee dans le projet est persistante, rangeable et reutilisable dans Vibe_CUT;
- Pixabay est integre seulement via un chemin officiel/autorise ou documente comme limite;
- les sources gratuites ont des filtres et resultats coherents;
- on peut ecouter, importer projet, telecharger local, ouvrir source;
- les droits/licences/Content ID sont visibles et bloquants quand necessaire;
- aucun secret provider n'est cote client;
- les tests et gates passent ou les blocages externes sont documentes.
