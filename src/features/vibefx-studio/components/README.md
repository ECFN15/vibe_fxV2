# Composants du Projet

Ce dossier contient les composants React réutilisables et les panneaux d'interface.

## Structure

*   `canvas/CanvasWorkspace.jsx`: La zone principale de rendu (Canvas). Gere l affichage des images, du texte, des assets et les interactions souris (drag & drop).
*   `Header.jsx`: Barre de navigation supérieure (Logo, Tabs, Mode Sombre, Export).
*   `Sidebar.jsx`: Conteneur principal de la barre latérale. Intègre les panneaux spécifiques.

## Panneaux (src/components/panels/)

Ces composants sont des sous-sections de la Sidebar, extraits pour la maintenabilité :

*   `StylePanel.jsx`: Contrôles pour le mode "Studio" (Filtres, Presets).
*   `TextAssetsPanel.jsx`: Gestion des textes et des stickers/tape.
*   `GeometryPanel.jsx`: Contrôles de mise en page (Marges, Arrondis).
*   `ExportPanel.jsx`: Sélection des formats et templates.
*   `VisionPanel.jsx`: Sélection des marques d'appareils photo (Vision Pro).

## UI Générique

*   `ControlGroup`: Slider + Input numérique.
*   `QuickButton`: Bouton de sélection rapide avec icône.
