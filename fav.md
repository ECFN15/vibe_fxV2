# Tâche : Favoris Permanents (Soundtrack Library)

L'objectif de cette tâche est de s'assurer que les favoris de la bibliothèque musicale (Soundtrack) soient enregistrés de façon **totalement permanente** (synchronisés sur Firebase pour la partie projet, et pérennisés en local).

## État des Lieux Actuel

Il existe aujourd'hui deux implémentations distinctes dans le code :

1. **Bibliothèque Projet (`useProjectSoundLibrary.js`)** :
   - Déjà synchronisée avec Firebase Firestore via `patchProjectSoundTrack(uid, track.id, { favorite: !track.favorite })`.
   - **Persistance** : 100% permanente sur le cloud (Firebase).
   - **Problème** : En local dev (`localhost:3001`), Firebase n'est pas forcément initialisé ou connecté par défaut, ce qui fait basculer l'UI sur la bibliothèque locale.

2. **Bibliothèque Locale (`useLocalSoundtrackLibrary.js`)** :
   - Stockée dans le navigateur via **IndexedDB** (`saveIndexedSoundtrackLibrary`).
   - Écrite sur le disque local dans le manifest `soundtrack-manifest.json` **uniquement** si l'utilisateur connecte son dossier via l'API FileSystem (bouton `DOSSIER` dans l'UI).
   - **Problème** : Si le cache/les données du navigateur sont vidés ou si l'utilisateur change de navigateur, les favoris locaux non connectés à un dossier physique sont perdus.

---

## Plan d'Action pour Demain

### Option A : Forcer la synchronisation Firebase en Dev/Prod
- S'assurer que Firebase Auth/Firestore est bien disponible en local dev (`npm run emulators` ou connexion à un projet Firebase de test).
- Permettre à l'utilisateur de synchroniser sa bibliothèque locale vers son compte Firebase pour ne plus dépendre uniquement d'IndexedDB.

### Option B : Améliorer la robustesse de la persistance locale
- **Export automatique** : Proposer un export automatique ou une invite pour connecter le dossier local afin que le manifest sur le disque dur physique serve de source de vérité automatique.
- **LocalStorage de secours** : Doubler IndexedDB avec un stockage léger dans le `localStorage` pour les métadonnées de favoris afin de prévenir les purges agressives d'IndexedDB par certains navigateurs (comme Safari).

---

## Fichiers concernés pour l'implémentation
- [useLocalSoundtrackLibrary.js](file:///c:/Users/matth/Desktop/vibefx_V2/src/features/vibefx-studio/soundtrack/hooks/useLocalSoundtrackLibrary.js) : Gestion de la bibliothèque locale, IndexedDB et dossier.
- [useProjectSoundLibrary.js](file:///c:/Users/matth/Desktop/vibefx_V2/src/features/vibefx-studio/soundtrack/hooks/useProjectSoundLibrary.js) : Synchronisation Firebase.
- [ProjectLibraryPanel.jsx](file:///c:/Users/matth/Desktop/vibefx_V2/src/features/vibefx-studio/soundtrack/components/ProjectLibraryPanel.jsx) : Rendu de l'interface et gestion des clics sur les favoris.
