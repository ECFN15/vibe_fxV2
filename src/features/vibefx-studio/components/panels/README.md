# 📁 `src/components/panels`

## Rôle de ce dossier
Ce dossier contient les **Panneaux de Contrôle** (Sidebars) de l'application Vibe_fx. Chaque fichier correspond à un onglet ou un module de la sidebar droite.
Cette architecture permet de **sharder** la logique UI de `App.jsx` pour un code ultra-scalable et maintenable.

## Composants
- `BackgroundPanel.jsx` : Gestion de la couleur de fond, de l'opacité (blur) et du grain.
- `ExportPanel.jsx` : Options d'export (format, qualité, panoramas).
- `GeometryPanel.jsx` : Gestion des marges, espacements (gap) et arrondis (border-radius).
- `StylePanel.jsx` : Le "Studio", gestion des presets argentiques/numériques et filtres (Lumière, Contraste, Grain, etc.).
- `TextAssetsPanel.jsx` : Outils de typographie et d'ajout d'assets visuels (scotch, éléments graphiques).
- `VisionPanel.jsx` : Onglet dédié aux profils colorimétriques de constructeurs (Fujifilm, Kodak, Leica...).

## Dépendances
- Ils consomment les composants de bas niveau depuis `src/components/ui` (ex: `ControlGroup`, `QuickButton`).
- Ils reçoivent le state depuis `App.jsx` en tant que props.
