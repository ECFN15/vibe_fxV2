# 📁 `src/components/ui`

## Rôle de ce dossier
Ce dossier contient la **Bibliothèque de Composants UI bas niveau** (Design System) de Vibe_fx.
Ces composants sont purement présentationnels (dumb components) : ils ne gèrent pas d'état complexe et reçoivent toutes leurs données via des props.
Cela permet de maintenir une cohérence visuelle parfaite sur l'ensemble de l'application.

## Composants
- `ControlGroup.jsx` : Le composant standard pour les "Sliders" (Range input + Number input) utilisé partout pour gérer le grain, la lumière, le radius, etc.
- `QuickButton.jsx` : Les boutons stylisés pour sélectionner les Presets (Argentique, Cyberpunk, etc.).

## Philosophie
Si un bouton, un input ou une modale est utilisé plus d'une fois, il doit être extrait ici.
