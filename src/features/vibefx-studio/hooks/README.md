# 📁 `src/hooks`

## Rôle de ce dossier
Ce dossier centralise la **logique métier et le state management complexe** sous forme de Custom Hooks React (`usequelquechose`).
Cela permet d'alléger considérablement les composants UI (`App.jsx`) en séparant la "mécanique" de l'affichage.

## Contenu
- `useLayoutState.js` : Centralise les états complexes liés au layout (padding, gap, selected slots, zoom) qui étaient autrefois dans `App.jsx`.
- `useStudioFilters.js` : Centralise la logique d'application des filtres (contraste, saturation, teinte, grain).

## Principe de scalabilité
Un composant React doit idéalement être "bête" et se contenter d'afficher des données. Toute la logique complexe de transformation, de fetch, ou de mise à jour d'états multiples doit être extraite dans un Hook ici.
