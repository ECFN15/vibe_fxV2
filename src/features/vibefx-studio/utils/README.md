# 📁 `src/utils`

## Rôle de ce dossier
Ce dossier contient les **fonctions utilitaires pures** (Pure Functions) de l'application. 
Il ne contient **aucun composant React** (pas de JSX). 

## Contenu
- `canvasUtils.js` : Outils de génération et de manipulation bas niveau pour le Canvas. Par exemple, la fonction complexe `createNoisePattern()` qui génère la texture granuleuse via `ImageData` est isolée ici pour ne pas polluer l'UI.

## Règle d'or
Toute fonction qui prend un `input` et retourne un `output` sans toucher au state React (comme des calculs mathématiques, des parsers de dates, ou de l'image processing bas niveau) doit aller ici.
