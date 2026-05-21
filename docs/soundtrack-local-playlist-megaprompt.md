# MEGAPROMPT - Onglet Soundtrack local-first

## Mission

Tu travailles dans `C:\Users\matth\Travail\vibe_fxv2`. Integre dans le header du studio un nouvel onglet `Soundtrack`.

L'onglet doit ouvrir une page full screen dans le studio, pas un petit panneau Vibe_CUT. La page reprend les memes briques techniques deja creees pour Vibe_CUT :

- recherche multi-sources via `src/app/api/music/free-search/route.js` ;
- import controle via `src/app/api/music/import/route.js` ;
- metadata droits/licences via `src/features/vibefx-studio/video/data/musicRights.js` ;
- providers/catalogue via `src/features/vibefx-studio/video/data/musicCatalog.js` ;
- extraction waveform locale via `src/features/vibefx-studio/video/utils/audioWaveform.js` ;
- logique UX de `src/features/vibefx-studio/video/panels/MusicLibrary.jsx`, mais transformee en experience full page.

Objectif produit : permettre a l'utilisateur de chercher des sons, les ecouter, les mettre en favoris, creer des playlists et telecharger les fichiers sur son propre appareil. L'app ne doit pas heberger les fichiers audio utilisateur sur les serveurs Vibe_fx. L'utilisateur heberge sa bibliotheque localement.

## Regle fondamentale local-first

Ne stocke jamais les fichiers audio importes/telecharges dans Firebase Storage, Firestore, Next server, Functions ou autre stockage serveur.

Autorise uniquement :

- metadata locales dans IndexedDB ;
- handles locaux si File System Access API disponible ;
- fichiers audio dans un dossier choisi par l'utilisateur sur son appareil ;
- manifest local JSON dans ce dossier ;
- object URLs temporaires pour preview ;
- eventuellement cache navigateur local, jamais comme source de verite unique.

Ne promets pas une reconnaissance magique du disque. Une web app ne peut pas scanner un appareil sans permission. Le bon modele UX est :

1. L'utilisateur choisit ou cree un dossier local Soundtrack.
2. L'app garde la permission quand le navigateur le permet.
3. Au prochain lancement, l'app tente de reconnecter le dossier.
4. Si le navigateur refuse ou ne supporte pas ce mode, l'utilisateur re-selectionne le dossier, le manifest ou les fichiers.

## Compatibilite cible

La feature doit fonctionner sur :

- Windows desktop : Chrome, Edge, Firefox, Safari non concerne ;
- macOS desktop : Chrome, Edge, Safari, Firefox ;
- Android : Chrome/Edge Android, fallback file picker si besoin ;
- iPhone/iPad : Safari iOS et navigateurs iOS avec limitations Apple ;
- desktop PWA quand installee.

Important : adapter par capacite, pas par user-agent fragile.

### Capacites par niveau

Niveau A, meilleur cas :

- `showDirectoryPicker` disponible ;
- permission read/write persistable ;
- l'app peut ecrire `vibefx-soundtrack.json` et les fichiers audio dans le dossier choisi ;
- l'app recharge automatiquement la bibliotheque apres permission.

Niveau B, fallback correct :

- pas de dossier persistant ;
- l'app telecharge les fichiers via `a[download]` ;
- l'utilisateur importe ensuite le manifest ou plusieurs fichiers via `<input type="file" multiple accept="audio/*,.json">` ;
- IndexedDB garde les favoris/playlists tant que le navigateur garde ses donnees.

Niveau C, iOS strict :

- pas d'acces dossier fiable ;
- utiliser download/share sheet vers l'app Fichiers ;
- proposer import manuel du manifest ou des fichiers audio ;
- ne jamais afficher une promesse "auto-sync device" si l'API ne le permet pas.

## UX attendue

### Header studio

Ajouter un onglet `Soundtrack` dans `src/features/vibefx-studio/components/Header.jsx`.

Position conseillee :

- apres `Library` ;
- avant `Vision` et `Video`.

Icone lucide :

- `Music2`, `AudioLines` ou `Disc3`.

ID de vue conseille :

```js
{ id: "soundtrack", icon: "Music2", label: "Soundtrack" }
```

### Page full screen

Dans `src/features/vibefx-studio/VibeFxStudio.jsx`, quand `view === "soundtrack"`, afficher une page pleine largeur, comme `library`, sans canvas ni sidebar.

La page doit etre dense, concrete et production-ready :

- barre de recherche multi-source ;
- filtres provider, genre, BPM approximatif, duree, licence, mood ;
- resultat avec play/pause, waveform si disponible, source, licence, attribution ;
- bouton favori ;
- bouton "Ajouter a playlist" ;
- bouton "Telecharger localement" ;
- bouton "Utiliser dans Vibe_CUT" si l'utilisateur veut envoyer le son vers la timeline video ;
- panneau playlists ;
- panneau dossier local ;
- panneau droits/licence ;
- etat "dossier connecte", "permission requise", "fallback manuel".

Ne pas ajouter de blabla marketing. Les textes doivent expliquer des etats, des actions, des erreurs, des droits.

## Architecture proposee

Creer un dossier feature dedie :

```text
src/features/vibefx-studio/soundtrack/
|-- SoundtrackPage.jsx
|-- soundtrack.css
|-- components/
|   |-- SoundtrackSearch.jsx
|   |-- SoundtrackResults.jsx
|   |-- SoundtrackTrackRow.jsx
|   |-- SoundtrackPlayer.jsx
|   |-- SoundtrackPlaylists.jsx
|   |-- SoundtrackFolderPanel.jsx
|   `-- SoundtrackRightsPanel.jsx
|-- hooks/
|   |-- useSoundtrackSearch.js
|   |-- useSoundtrackPlayer.js
|   `-- useLocalSoundtrackLibrary.js
|-- services/
|   |-- soundtrackFilesystem.js
|   |-- soundtrackManifest.js
|   |-- soundtrackIndexedDb.js
|   |-- soundtrackDownloads.js
|   `-- soundtrackRights.js
`-- data/
    `-- soundtrackDefaults.js
```

Reutiliser les fichiers Vibe_CUT existants quand c'est plus propre que copier :

- `musicRights.js` pour les labels, blockers et manifest droits ;
- `musicCatalog.js` pour providers et tracks de depart ;
- `audioWaveform.js` pour waveform locale.

## Modele de donnees local

### Track local

```ts
type LocalSoundtrackTrack = {
  id: string;
  title: string;
  artist?: string;
  provider: string;
  sourceName: string;
  sourceUrl: string;
  license: string;
  licenseUrl?: string;
  attribution?: string;
  contentIdWarning?: string;
  duration?: number;
  bpm?: number;
  tags: string[];
  mood?: string;
  fileName?: string;
  localPathHint?: string;
  localObjectUrl?: string;
  downloadUrl?: string;
  previewUrl?: string;
  favorite: boolean;
  addedAt: string;
  updatedAt: string;
  rightsStatus: "verified-free" | "needs-review" | "user-declared" | "blocked";
};
```

### Playlist locale

```ts
type LocalSoundtrackPlaylist = {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: string;
  updatedAt: string;
};
```

### Manifest disque

Nom du fichier :

```text
vibefx-soundtrack.json
```

Exemple :

```json
{
  "schemaVersion": 1,
  "app": "vibe_fx",
  "kind": "soundtrack-library",
  "updatedAt": "2026-05-21T00:00:00.000Z",
  "tracks": [],
  "playlists": [],
  "favorites": []
}
```

Le manifest doit rester lisible par humain, versionne et tolerant aux champs inconnus.

## Flux de telechargement local

### Avec File System Access API

1. L'utilisateur clique "Choisir dossier Soundtrack".
2. Appelle `window.showDirectoryPicker({ mode: "readwrite" })`.
3. Cree ou ouvre un sous-dossier `Vibe_fx Soundtrack` si l'utilisateur a choisi un dossier parent.
4. Telecharge le son via `/api/music/import` quand le provider exige un proxy controle.
5. Ecrit le fichier audio dans le dossier local via `FileSystemWritableFileStream`.
6. Met a jour `vibefx-soundtrack.json`.
7. Met a jour IndexedDB avec le handle, les metadata, les playlists et favoris.

### Sans File System Access API

1. Telecharger le fichier via `Blob` + `URL.createObjectURL` + `<a download>`.
2. Telecharger aussi ou proposer d'exporter `vibefx-soundtrack.json`.
3. Demander a l'utilisateur de reimporter le manifest/fichiers si le navigateur ne permet pas la reconnexion automatique.
4. Garder les metadata dans IndexedDB comme confort local, pas comme garantie de fichier disponible.

## Recherche et import

S'appuyer sur :

```text
GET /api/music/free-search?provider=openverse&q=ambient
POST /api/music/import
```

Ne jamais scraper YouTube, Pixabay, Artlist, Epidemic, Soundstripe ou une page catalogue.

Afficher clairement :

- provider ;
- licence ;
- source ;
- attribution requise ;
- avertissement Content ID ;
- statut droits.

Bloquer l'ajout local si :

- URL non audio ;
- domaine non autorise par `/api/music/import` ;
- MIME non audio ;
- duree illisible ;
- taille trop grande ;
- licence inconnue sans confirmation utilisateur ;
- droits bloques.

## Favoris et playlists

Les favoris et playlists doivent etre locaux :

- IndexedDB pour l'etat rapide ;
- manifest JSON pour l'etat portable ;
- pas Firestore.

Actions minimum :

- creer playlist ;
- renommer playlist ;
- supprimer playlist ;
- ajouter un son ;
- retirer un son ;
- reorder par drag and drop ou boutons haut/bas ;
- mettre/enlever favori ;
- filtrer favoris ;
- exporter manifest ;
- importer manifest ;
- verifier fichiers manquants.

## Reconnexion au lancement

Au chargement de l'onglet Soundtrack :

1. Charger IndexedDB.
2. Si un directory handle existe, demander/valider permission.
3. Lire `vibefx-soundtrack.json`.
4. Verifier que les fichiers references existent.
5. Generer des object URLs temporaires pour preview.
6. Signaler les pistes manquantes au lieu de casser l'UI.

Si pas de handle :

- afficher "Dossier local non connecte" ;
- proposer "Reconnecter dossier" ;
- proposer "Importer manifest" ;
- garder les playlists visibles mais marquer les fichiers comme indisponibles.

## Securite et vie privee

- Ne jamais uploader l'audio local vers serveur.
- Ne jamais stocker les noms complets de chemins systeme en clair dans un backend.
- Ne jamais logger les URLs locales ou handles.
- Ne jamais utiliser de secrets provider cote client.
- Ne jamais contourner CORS par scraping.
- Revoquer les object URLs quand elles ne sont plus utilisees.
- Valider MIME, taille et duree avant lecture longue.
- Respecter `prefers-reduced-motion`.

## Integration Vibe_CUT

La page Soundtrack doit pouvoir envoyer un track local vers Vibe_CUT :

- si le track a un `File` ou `Blob` disponible, construire un payload compatible avec l'import audio actuel ;
- reutiliser la validation droits de `MusicLibrary.jsx` ;
- conserver attribution/licence dans les metadata de la timeline ;
- ne pas forcer de copie serveur.

Prevoir une API interne de type :

```ts
onUseInVideo(track: LocalSoundtrackTrack, file: File | Blob): void
```

Si le fichier n'est pas disponible localement, afficher une action "Reconnecter fichier".

## Design

Respecter le systeme existant :

- `dark-ui` pour la surface longue ;
- `technical-ui` pour les tableaux, statuts, filtres, droits ;
- accents cyber-neon sobres ;
- pas de landing page ;
- pas de texte marketing ;
- full page utilisable sur desktop et mobile ;
- boutons avec icones lucide ;
- pas de cartes imbriquees ;
- controles tactiles utilisables sur mobile.

Sur mobile :

- recherche en haut ;
- player sticky compact en bas ;
- tabs internes : Recherche, Bibliotheque, Playlists, Dossier ;
- actions principales accessibles au pouce ;
- pas de hover-only.

## Tests obligatoires

Ajouter ou etendre des tests Playwright/smoke.

### Tests desktop

- l'onglet `Soundtrack` apparait dans le header ;
- click ouvre la page full screen ;
- recherche mockee affiche des resultats ;
- favori toggle persiste en IndexedDB ;
- creation playlist persiste ;
- ajout/retrait track playlist fonctionne ;
- export manifest genere un JSON valide ;
- import manifest restaure playlist/favoris ;
- un track sans fichier local apparait avec etat "fichier manquant".

### Tests API

- `/api/music/free-search` continue de normaliser les providers ;
- `/api/music/import` refuse les domaines non allowlistes ;
- `/api/music/import` refuse non-audio ;
- pas de stockage serveur appele dans Soundtrack.

### Tests responsive

- 390x844 mobile ;
- 768x1024 tablette ;
- 1440x900 desktop ;
- 1920x1080 desktop large.

### Tests compatibilite feature detection

Mocker :

- `showDirectoryPicker` disponible ;
- `showDirectoryPicker` absent ;
- permission refusee ;
- manifest invalide ;
- fichier audio absent.

## Gates de validation

Avant de finir :

```bash
npm run lint
npm run build
npm --prefix functions run lint
```

Puis validation navigateur :

- `/studio?workspace=layout` header non casse ;
- onglet Soundtrack visible ;
- page Soundtrack full screen ;
- recherche et fallback local visibles ;
- pas de lien public vers stockage serveur audio utilisateur ;
- mobile sans overlap.

## Definition de fini

La feature est finie seulement si :

- le header contient `Soundtrack` ;
- la page est accessible depuis le studio ;
- l'agregateur musique existant est reutilise ;
- l'utilisateur peut chercher, pre-ecouter, favori, playlist, telecharger localement ;
- les playlists/favoris restent locaux ;
- un manifest local portable existe ;
- l'app reconnecte le dossier quand le navigateur l'autorise ;
- les fallbacks iOS/Safari/Firefox sont propres ;
- aucun fichier audio utilisateur n'est envoye vers les serveurs Vibe_fx ;
- les droits/licences restent visibles et bloquants quand necessaire.
