# 📋 NOTICE — Intégration Midjourney Scraper dans Vibe_FX

> **Objectif** : Créer une page/interface complète dans Vibe_FX permettant de scraper des images depuis Midjourney Explore et les Rooms, directement depuis l'application, sans passer par le terminal.

---

## 1. CONTEXTE PROJET VIBE_FX

### Stack technique
- **Framework** : React 18 + Vite 4
- **Styling** : TailwindCSS 3
- **Icons** : lucide-react
- **Structure** : SPA (Single Page Application), pas de routing
- **Theme** : Dark mode par défaut (bg-neutral-900, border-neutral-800, text-neutral-200)
- **Design** : UI premium glassmorphism, coins arrondis (rounded-2xl), transitions douces

### Architecture des fichiers
```
src/
├── App.jsx                    # App principale (gère les vues: studio, layout)
├── main.jsx                   # Point d'entrée React
├── index.css                  # Styles globaux (Tailwind)
├── components/
│   ├── Header.jsx             # Barre de navigation supérieure
│   ├── Sidebar.jsx            # Sidebar gauche (contrôles)
│   ├── CanvasArea.jsx         # Zone de canvas principale
│   ├── panels/                # Panneaux de la sidebar
│   │   ├── StylePanel.jsx
│   │   ├── BackgroundPanel.jsx
│   │   ├── ExportPanel.jsx
│   │   ├── GeometryPanel.jsx
│   │   ├── TextAssetsPanel.jsx
│   │   ├── FusionPanel.jsx
│   │   └── VisionPanel.jsx
│   ├── modals/                # Fenêtres modales
│   └── ui/                    # Composants réutilisables
├── hooks/                     # Custom hooks React
├── data/                      # Données statiques (presets, formats)
├── engine/                    # Moteur de rendu
└── utils/                     # Fonctions utilitaires
```

### Pattern UI existant
La sidebar utilise des catégories avec boutons QuickButton :
```jsx
<QuickButton label="Nom" sub="Description" color="text-indigo-400" icon={<Icon />} onClick={handler} />
```

Les panneaux utilisent des sections avec headers :
```jsx
<h2 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-neutral-500">
  <Icon size={14} /> Titre Section
</h2>
```

---

## 2. LE SCRAPER MIDJOURNEY — CE QUI EXISTE

### Emplacement
```
scripts/midjourney-scraper/
├── scraper.mjs          # Script principal (2 modes : public + room)
├── fast-scraper.mjs     # Téléchargement rapide en vrac
├── config.mjs           # Configuration et définition des thèmes
├── package.json         # Dépendances (playwright)
├── .cookies.json        # Session sauvegardée (auto-généré, gitignored)
├── catalog.json         # Catalogue des images scrapées (auto-généré)
├── .gitignore
└── downloads/           # Images téléchargées par thème
    ├── textures/
    │   ├── halftone/
    │   ├── vhs-retro/
    │   ├── glitch/
    │   ├── broken-glass/
    │   ├── fractal-glass/
    │   ├── liquid-swirl/
    │   ├── paper-grain/
    │   ├── plastic-wrap/
    │   ├── metal-foil/
    │   ├── risograph/
    │   ├── noise-grain/
    │   ├── radiance-light/
    │   ├── color-gradients/
    │   ├── fabric-silk/
    │   ├── concrete-stone/
    │   ├── wood-organic/
    │   ├── smoke-fog/
    │   └── water-drops/
    ├── photography/
    │   ├── portraits/
    │   ├── landscapes/
    │   ├── cars/
    │   ├── architecture/
    │   ├── food/
    │   ├── fashion/
    │   └── animals/
    └── styles/
        ├── retro-vintage/
        ├── surreal/
        ├── minimalist/
        ├── dark-moody/
        ├── neon-cyberpunk/
        ├── abstract/
        ├── typography/
        ├── posters/
        └── 3d-render/
```

### Deux modes de fonctionnement

#### MODE PUBLIC (pas de login)
Scrape la page publique Midjourney Explore.
```bash
node scraper.mjs --themes portrait --limit 10
node scraper.mjs --themes halftone,glitch --limit 5 --tab new --scan 200
node scraper.mjs --themes all --limit 5
```

#### MODE ROOM (login requis, session sauvegardée)
Accède aux salons de discussion Midjourney (images en temps réel).
```bash
node scraper.mjs --room https://www.midjourney.com/rooms/XXXXX --themes all --limit 10
```
Première connexion : un navigateur Chromium s'ouvre, l'utilisateur se connecte manuellement (Google/Discord), le script sauvegarde les cookies dans `.cookies.json`. Les fois suivantes : connexion automatique.

### CLI Arguments complets
| Argument       | Valeurs                         | Défaut | Description                           |
|----------------|--------------------------------|--------|---------------------------------------|
| `--themes`     | nom1,nom2 ou "all"              | all    | Thèmes à cibler                       |
| `--limit`      | 5, 10, 20, 30, 50              | 10     | Downloads max par thème               |
| `--scan`       | nombre                          | 50     | Nombre d'images à analyser            |
| `--scrolls`    | nombre                          | 30     | Itérations de scroll max              |
| `--tab`        | top, new, video_top             | top    | Onglet Midjourney Explore             |
| `--room`       | URL complète                    | null   | URL du room (active le mode login)    |
| `--resolution` | high, medium, low               | high   | Qualité des images                    |
| `--headless`   | flag                            | false  | Cacher le navigateur                  |
| `--list`       | flag                            | -      | Afficher les thèmes disponibles       |
| `--logout`     | flag                            | -      | Effacer la session sauvegardée        |

### Limites autorisées pour --limit
**Seulement 5 valeurs possibles** : `5`, `10`, `20`, `30`, `50`
Si l'utilisateur entre une autre valeur, elle est arrondie à la plus proche.

### Structure du catalog.json
Chaque image scrapée est enregistrée dans le catalogue :
```json
{
  "jobId": "0c3f2d88-38f7-49a0-baae-1caf04412d64",
  "prompt": "A futuristic alien with sharp features, glitch art style...",
  "themes": ["glitch", "surreal_dreamlike"],
  "highResUrl": "https://cdn.midjourney.com/0c3f2d88.../0_0.jpeg",
  "detailUrl": "https://www.midjourney.com/jobs/0c3f2d88...",
  "scrapedAt": "2026-02-25T18:15:48.770Z"
}
```

---

## 3. THÈMES DISPONIBLES — DÉFINITIONS COMPLÈTES

### 📦 OVERLAYS & TEXTURES (pour effets et backgrounds)

| Clé config        | Dossier                  | Mots-clés principaux                                          |
|--------------------|--------------------------|--------------------------------------------------------------|
| `halftone`         | textures/halftone        | halftone, dot pattern, screen print, ben day dots            |
| `vhs_retro`        | textures/vhs-retro       | vhs, scan lines, crt screen, analog video, tape texture      |
| `glitch`           | textures/glitch          | glitch, anaglyph, chromatic aberration, pixel sort, static   |
| `broken_glass`     | textures/broken-glass    | broken glass, shattered glass, cracked glass, glass shards   |
| `fractal_glass`    | textures/fractal-glass   | fractal glass, prismatic, refraction, frosted glass, hazy    |
| `liquid_swirl`     | textures/liquid-swirl    | liquid swirl, liquid metal, chrome liquid, mercury, fluid art |
| `paper_grain`      | textures/paper-grain     | paper texture, parchment, crumpled paper, kraft, newsprint   |
| `plastic_wrap`     | textures/plastic-wrap    | plastic wrap, cellophane, shrink wrap, packaging plastic     |
| `metal_foil`       | textures/metal-foil      | metal texture, foil, aluminum, gold foil, brushed metal      |
| `risograph`        | textures/risograph       | risograph, riso print, riso texture, overprint               |
| `noise_grain`      | textures/noise-grain     | film grain, noise texture, grain overlay, 35mm grain         |
| `radiance_light`   | textures/radiance-light  | light leak, lens flare, bokeh, light rays, god rays, glow    |
| `color_gradient`   | textures/color-gradients | gradient, color palette, holographic, duotone, aurora         |
| `fabric_silk`      | textures/fabric-silk     | silk, velvet, satin, fabric, cloth, linen, textile            |
| `concrete_stone`   | textures/concrete-stone  | concrete, marble, granite, brick, plaster, terrazzo           |
| `wood_organic`     | textures/wood-organic    | wood texture, wood grain, bark, oak, bamboo                  |
| `smoke_fog`        | textures/smoke-fog       | smoke, fog, mist, haze, colored smoke, cloud, steam          |
| `water_drops`      | textures/water-drops     | water drops, rain drops, condensation, splash, dew drops     |

### 📷 PHOTOGRAPHY (banque d'images)

| Clé config           | Dossier                   | Mots-clés principaux                                      |
|----------------------|---------------------------|------------------------------------------------------------|
| `portrait`           | photography/portraits     | portrait, headshot, face, beauty, editorial, cinematic     |
| `landscape`          | photography/landscapes    | landscape, panorama, mountain, ocean, forest, drone shot   |
| `cars_vehicles`      | photography/cars          | car, sports car, supercar, vintage car, motorcycle         |
| `architecture_urban` | photography/architecture  | architecture, building, skyscraper, interior, cityscape    |
| `food_drink`         | photography/food          | food, gourmet, cocktail, coffee, dessert, plating          |
| `fashion_style`      | photography/fashion       | fashion, haute couture, editorial, runway, streetwear      |
| `animals_wildlife`   | photography/animals       | wildlife, animal portrait, safari, bird, pet portrait      |

### 🎨 STYLES & ART (inspiration)

| Clé config             | Dossier                | Mots-clés principaux                                     |
|------------------------|------------------------|----------------------------------------------------------|
| `retro_vintage`        | styles/retro-vintage   | retro, vintage, 70s, 80s, synthwave, vaporwave           |
| `surreal_dreamlike`    | styles/surreal         | surreal, dreamlike, fantasy, ethereal, psychedelic        |
| `minimalist`           | styles/minimalist      | minimalist, minimal, clean design, white space, zen      |
| `dark_moody`           | styles/dark-moody      | dark mood, moody, noir, gothic, chiaroscuro, shadows     |
| `neon_cyberpunk`       | styles/neon-cyberpunk  | neon, cyberpunk, neon lights, blade runner, sci-fi neon   |
| `abstract_art`         | styles/abstract        | abstract art, abstract painting, geometric, expressionism |
| `typography_lettering` | styles/typography      | typography, lettering, calligraphy, font design           |
| `poster_design`        | styles/posters         | poster design, movie poster, swiss design, bauhaus        |
| `3d_render`            | styles/3d-render       | 3d render, cinema 4d, blender, octane render, clay        |

---

## 4. CE QU'IL FAUT CONSTRUIRE — L'INTERFACE

### 4.1 Architecture requise

Il faut créer :

1. **Un serveur API léger** (Express ou équivalent) qui tourne en parallèle de Vite et sert de pont entre le frontend React et les scripts Node.js du scraper.
2. **Une nouvelle page/vue** dans Vibe_FX pour la "Banque d'Assets Midjourney"
3. **Des composants React** pour naviguer, déclencher le scraping, et visualiser/importer les images

### 4.2 Le serveur API (backend)

Créer un fichier `scripts/midjourney-scraper/server.mjs` — un petit serveur Express :

```
POST /api/scrape          → Lance le scraper avec les paramètres donnés
GET  /api/themes          → Retourne la liste des thèmes disponibles
GET  /api/catalog         → Retourne le catalog.json
GET  /api/downloads/:path → Sert les images téléchargées (statique)
GET  /api/status          → Statut du scraping en cours (idle/running/%)
POST /api/login           → Lance le mode login (ouvre Chromium pour l'user)
POST /api/logout          → Efface les cookies sauvegardés
```

#### POST /api/scrape — Corps de la requête
```json
{
  "mode": "public",                       // "public" ou "room"
  "themes": ["halftone", "glitch"],       // ou ["all"]
  "limit": 10,                            // 5 | 10 | 20 | 30 | 50
  "scan": 100,                            // nombre d'images à analyser
  "tab": "new",                           // "top" | "new" | "video_top"
  "resolution": "high",                   // "high" | "medium" | "low"
  "roomUrl": null                         // URL du room si mode=room
}
```

#### GET /api/status — Réponse
```json
{
  "status": "running",                    // "idle" | "running" | "done" | "error"
  "phase": "extracting",                  // "scrolling" | "extracting" | "downloading"
  "progress": 45,                         // pourcentage (0-100)
  "found": 87,                            // images trouvées
  "matched": 12,                          // images matchant un thème
  "downloaded": 8,                        // images téléchargées
  "errors": 1,
  "currentTheme": "halftone",
  "message": "Extracting prompts..."
}
```

#### GET /api/themes — Réponse
```json
{
  "categories": {
    "textures": {
      "label": "📦 Overlays & Textures",
      "themes": {
        "halftone": { "label": "Halftone", "folder": "textures/halftone", "keywords": ["halftone", "dot pattern", "..."], "count": 14 },
        "vhs_retro": { "label": "VHS / Retro", "folder": "textures/vhs-retro", "keywords": [...], "count": 3 }
      }
    },
    "photography": { ... },
    "styles": { ... }
  },
  "isLoggedIn": false,
  "totalImages": 234
}
```

Le champ `count` correspond au nombre d'images déjà téléchargées dans ce dossier thème.

#### GET /api/catalog — Réponse
Retourne directement le contenu de `catalog.json` (tableau d'objets image).

### 4.3 L'interface React — Vue "Asset Library"

#### Navigation
Ajouter un 3ème onglet/vue dans le Header.jsx, à côté de "Studio" et "Layout" :
- **📚 Library** (ou "Assets" ou "Banque")

#### Page principale : Asset Library

**Layout** : Plein écran (utilise toute la zone canvas + sidebar), style galerie premium.

**Structure** :
```
┌─────────────────────────────────────────────────────────────┐
│  HEADER  [Studio]  [Layout]  [📚 Library]        🌙 Dark   │
├────────────────────┬────────────────────────────────────────┤
│                    │                                        │
│   SIDEBAR          │   GRILLE D'IMAGES                     │
│   CONTROLES        │                                        │
│                    │   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐    │
│   📦 Textures  ▼   │   │     │ │     │ │     │ │     │    │
│   ├ Halftone (14)  │   │ img │ │ img │ │ img │ │ img │    │
│   ├ VHS (3)        │   │     │ │     │ │     │ │     │    │
│   ├ Glitch (8)     │   └─────┘ └─────┘ └─────┘ └─────┘    │
│   ├ Broken Glass   │   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐    │
│   └ ...            │   │     │ │     │ │     │ │     │    │
│                    │   │ img │ │ img │ │ img │ │ img │    │
│   📷 Photos    ▼   │   │     │ │     │ │     │ │     │    │
│   ├ Portraits (22) │   └─────┘ └─────┘ └─────┘ └─────┘    │
│   ├ Landscapes     │                                        │
│   └ ...            │   [Charger plus]                       │
│                    │                                        │
│   🎨 Styles    ▼   ├────────────────────────────────────────┤
│   ├ Retro (5)      │   STATUS BAR                           │
│   └ ...            │   ██████████░░░░░░ 65% Downloading...  │
│                    │                                        │
│   ──────────────── │                                        │
│   🚀 SCRAPER       │                                        │
│                    │                                        │
│   Source:          │                                        │
│   ○ Explore (public│                                        │
│   ○ Room (login)   │                                        │
│                    │                                        │
│   Onglet: [New ▼]  │                                        │
│   Limite: [10  ▼]  │                                        │
│   Qualité: [HD ▼]  │                                        │
│   Scan:   [100]    │                                        │
│                    │                                        │
│   [🔍 Scraper Now] │                                        │
│   [🔑 Login MJ]    │                                        │
│                    │                                        │
└────────────────────┴────────────────────────────────────────┘
```

#### Composants à créer

##### 1. `AssetLibrary.jsx` — Page principale
- Affiche 3 zones : sidebar de filtres, grille d'images, barre de statut
- Gère les states: thème sélectionné, images affichées, statut scraping

##### 2. `AssetSidebar.jsx` — Sidebar gauche
- **Section "Thèmes"** : Arborescence des catégories (textures/photos/styles)
  - Chaque catégorie est dépliable (accordion)
  - Chaque thème affiche son nom + nombre d'images existantes entre parenthèses
  - Cliquer sur un thème filtre la grille pour n'afficher que ses images
  - Thème sélectionné = surligné en indigo

- **Section "Scraper"** : Contrôles pour lancer le scraping
  - **Source** : Radio buttons "Explore (public)" / "Room (login requis)"
  - **Onglet** : Select dropdown → top / new / video_top
  - **Limite** : Select dropdown → 5 / 10 / 20 / 30 / 50 (images par thème)
  - **Qualité** : Select dropdown → HD (high) / Medium / Light (low)
  - **Scan** : Slider ou input → 50 à 500 (images à analyser avant filtrage)
  - **Thèmes cibles** : Multi-select des thèmes à scraper (ou bouton "Tous")
  - **Bouton principal** : `🔍 Lancer le Scraping` (gros bouton indigo, disabled si scraping en cours)
  - **Bouton login** : `🔑 Connexion Midjourney` (visible seulement si source=Room)
  - **Bouton logout** : petit texte "Déconnecter" sous le bouton login

##### 3. `AssetGrid.jsx` — Grille d'images
- Grille responsive : 4 colonnes desktop, 3 tablet, 2 mobile
- Chaque image affiche :
  - Thumbnail (chargée depuis le serveur API : `/api/downloads/textures/halftone/xxx.jpeg`)
  - Au hover : overlay sombre avec :
    - Le prompt Midjourney (texte tronqué, 2 lignes max)
    - Badges des thèmes matchés
    - Bouton "📋 Copier prompt"  
    - Bouton "✨ Utiliser" (importe l'image dans le canvas Vibe_FX comme background/overlay)
    - Bouton "🔗 Voir sur Midjourney" (ouvre le detailUrl dans un nouvel onglet)

- **Lightbox** : au clic sur l'image → modal plein écran avec :
  - Image en haute résolution
  - Prompt complet
  - Thèmes associés
  - Boutons d'action (copier prompt, utiliser, ouvrir MJ)
  - Date de scraping

- **État vide** : Si aucune image dans le thème sélectionné
  - Message avec illustration : "Aucune image dans ce thème"
  - Bouton CTA : "Lancer un scraping de [nom du thème]" → remplit automatiquement les champs du scraper et lance

##### 4. `ScrapingStatus.jsx` — Barre de progression
- S'affiche en bas de la page quand un scraping est en cours
- Fixée en bas (sticky), style toast/notification
- Contenu :
  - Barre de progression animée (pourcentage)
  - Phase actuelle : "Scrolling..." / "Extraction des prompts..." / "Téléchargement..."
  - Compteurs : images trouvées / matchées / téléchargées
  - Bouton "Annuler"
- Disparaît après 5s une fois terminé (avec récap : "✅ 12 images téléchargées en 45s")

##### 5. `AssetModal.jsx` — Modal lightbox
- Background blur (backdrop-blur-xl)
- Image centrée, max 80vh
- Infos à droite ou en-dessous sur mobile
- Navigation ← → entre images du thème

### 4.4 Interaction avec Vibe_FX — Bouton "Utiliser"

Quand l'utilisateur clique "Utiliser" sur une image de la library :
1. L'image est importée dans le state global de Vibe_FX
2. Elle peut être utilisée comme :
   - **Background** de la composition (via BackgroundPanel)
   - **Overlay/Texture** appliquée par-dessus (blend mode multiply, screen, overlay…)
   - **Image dans un slot** du template actif

Pour cela, il faut exposer une fonction callback que AssetLibrary peut appeler :
```jsx
// Dans App.jsx
const handleAssetImport = (imageUrl, type) => {
  if (type === 'background') {
    setBgImage(imageUrl);
  } else if (type === 'overlay') {
    setOverlayImage(imageUrl);
  } else if (type === 'slot') {
    // Ajouter à la liste d'images disponibles
    setImages(prev => [...prev, { src: imageUrl, fromMidjourney: true }]);
  }
};
```

### 4.5 Configuration du proxy Vite

Pour que le frontend React puisse appeler l'API du serveur scraper, ajouter un proxy dans `vite.config.js` :

```js
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3456',
        changeOrigin: true,
      }
    }
  }
});
```

Le serveur API du scraper tournera sur le port `3456`.

---

## 5. DESIGN GUIDELINES

### Palette de couleurs (cohérent avec Vibe_FX existant)
```
Background principal : bg-neutral-950 ou bg-neutral-900
Cartes/Panneaux      : bg-neutral-800/50 border-neutral-700
Accent principal     : indigo-500 / indigo-600
Accent secondaire    : violet-500
Succès               : green-500
Warning              : yellow-500
Danger               : red-500
Texte principal      : text-neutral-200
Texte secondaire     : text-neutral-400
Texte tertiaire      : text-neutral-500
```

### Composants visuels
- **Boutons** : `rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95`
- **Bouton primaire** : `bg-indigo-600 hover:bg-indigo-500 text-white`
- **Cards** : `bg-neutral-800/50 border border-neutral-700 rounded-2xl overflow-hidden`
- **Badges thèmes** : `px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400`
- **Séparateurs** : `h-px w-full bg-neutral-800`
- **Animations** : `transition-all duration-200` sur tout, `animate-in fade-in slide-in-from-bottom-4` sur les apparitions

### Icônes à utiliser (lucide-react)
```
Library/Assets  → Library ou ImagePlus
Textures        → Layers
Photography     → Camera
Styles          → Palette
Scraper         → Search ou Scan
Download        → Download
Import/Use      → ArrowDownToLine ou Import
Room/Login      → LogIn ou KeyRound
Settings        → SlidersHorizontal
Expand          → Maximize2
Copy prompt     → Copy
View on MJ      → ExternalLink
Cancel          → X
Status running  → Loader2 (avec animate-spin)
```

---

## 6. SCRIPTS NPM DISPONIBLES

```json
{
  "list": "node scraper.mjs --list",
  "logout": "node scraper.mjs --logout",
  "scrape": "node scraper.mjs",
  "scrape:new": "node scraper.mjs --tab new",
  "scrape:textures:all": "node scraper.mjs --themes halftone,vhs_retro,glitch,broken_glass,fractal_glass,liquid_swirl,paper_grain,plastic_wrap,metal_foil,risograph,noise_grain,radiance_light,color_gradient,fabric_silk,smoke_fog,water_drops,concrete_stone,wood_organic --limit 5 --tab new --scan 200",
  "scrape:photos:all": "node scraper.mjs --themes portrait,landscape,cars_vehicles,architecture_urban,food_drink,fashion_style,animals_wildlife --limit 5",
  "scrape:styles:all": "node scraper.mjs --themes retro_vintage,surreal_dreamlike,minimalist,dark_moody,neon_cyberpunk,abstract_art,poster_design,3d_render --limit 5 --tab new",
  "scrape:all": "node scraper.mjs --themes all --limit 5 --scan 200",
  "room": "node scraper.mjs --room https://www.midjourney.com/rooms/09ef7297-15ad-4cbc-a958-6bcdca8d181b --themes all --limit 10",
  "room:textures": "node scraper.mjs --room https://www.midjourney.com/rooms/09ef7297-15ad-4cbc-a958-6bcdca8d181b --themes halftone,vhs_retro,glitch,broken_glass,liquid_swirl,paper_grain,metal_foil --limit 10",
  "fast": "node fast-scraper.mjs"
}
```

---

## 7. ÉTAPES D'IMPLÉMENTATION — STATUT ✅

### Phase 1 — Backend API ✅ FAIT
1. Express installé dans `scripts/midjourney-scraper/`.
2. `server.mjs` créé (port 3456).
3. Gestion des subprocess avec `spawn` pour suivre la progression en temps réel.
4. Proxy configuré dans `vite.config.js`.

### Phase 2 — Frontend base ✅ FAIT
1. Vue "Library" ajoutée dans `App.jsx` et `Header.jsx`.
2. Structure complète `AssetLibrary.jsx` avec grille et sidebar technique.
3. Intégration du thème Vibe_OS (font-mono, 10px, clip-path).

### Phase 3 — Scraper UI ✅ FAIT
1. Contrôles complets dans `AssetSidebar.jsx` (Explore/Room, Limit, Scan, Quality).
2. Diagnostic de login Midjourney intégré dynamiquement.
3. `ScrapingStatus.jsx` pour le feedback visuel de progression.

### Phase 4 — Import dans Vibe_FX ✅ FAIT
1. Callback `handleAssetImport` dans `App.jsx`.
2. Support de l'import comme Background (Studio) ou Overlay (Fusion).
3. Redirection automatique vers la vue correspondante après import.

---

## 8. RÉSUMÉ DE L'ARCHITECTURE FINALE

L'intégration est désormais opérationnelle. L'application Vibe_FX agit comme un cockpit de pilotage pour le scraper Midjourney :

1. **Le Cerveau (Scripts)** : Les scripts `.mjs` originaux gèrent la logique lourde et Playwright.
2. **Le Pont (API)** : `server.mjs` permet de piloter les scripts via HTTP.
3. **Le Cockpit (UI)** : L'onglet "Library" dans Vibe_FX offre une interface premium pour explorer, scraper et importer sans quitter l'application.

---

## 9. NOTES TECHNIQUES COMPLÉMENTAIRES

- **Démarrage** : Il faut lancer `node server.mjs` dans le dossier du scraper en plus de `npm run dev`.
- **Fallbacks** : Si une image locale n'est pas trouvée (problème d'extension jpeg/webp), le système bascule automatiquement sur l'URL native de Midjourney (`cdn.midjourney.com`).
- **Design logic** : Les composants utilisent `backdrop-blur-xl` et le noir ultra (`#050505`) pour une immersion totale.

---
*Mise à jour le 25 Février 2026 suite à l'intégration complète.*
