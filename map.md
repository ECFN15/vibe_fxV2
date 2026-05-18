# map.md - Carte vivante Vibe_fx V2

Derniere mise a jour : 2026-05-18

## Regle

Mettre a jour ce fichier a chaque creation, suppression, renommage, deplacement ou modification structurelle.

## Arbre actuel

```text
.
├── .agents/
│   └── skills/                       # 23 skills design importes depuis refero-design-skills
│       ├── clean-saas/
│       ├── cyber-neon/               # Direction visuelle marque / pages publiques
│       ├── dark-ui/                  # Direction visuelle surfaces produit
│       ├── editorial-minimal/
│       ├── editorial-type/
│       ├── experimental-type/
│       ├── expressive-brand/
│       ├── geometric-modern/
│       ├── glossy-modern/
│       ├── high-contrast/
│       ├── high-end-design/
│       ├── light-ui/
│       ├── minimal-design/
│       ├── monochrome-ui/
│       ├── motion/
│       ├── pastel/
│       ├── playful-design/
│       ├── serif-display/
│       ├── soft-gradients/
│       ├── technical-sans/
│       ├── technical-ui/             # Direction controles/workflow
│       ├── utilitarian/
│       └── vibrant-accents/
├── docs/                             # Dossier pret pour docs longues futures
├── functions/
│   ├── index.js                      # Copie source actuelle ; a reduire au scope Vibe_fx V2 avant deploy
│   ├── package.json                  # Firebase Functions Node 20
│   └── package-lock.json
├── public/
│   ├── assets/
│   │   └── vibefx/
│   │       └── demo-astronaut.png    # Asset demo repris pour le studio
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── src/
│   ├── app/
│   │   ├── studio/
│   │   │   ├── page.js               # Page studio noindex
│   │   │   └── StudioClient.jsx      # Client wrapper du studio
│   │   ├── favicon.ico
│   │   ├── globals.css               # Base CSS + premiere direction cyber/dark
│   │   ├── layout.js                 # Metadata racine + imports CSS globaux
│   │   ├── page.js                   # Premiere page publique/SEO de cadrage
│   │   ├── robots.js                 # Robots Next.js
│   │   └── sitemap.js                # Sitemap Next.js
│   ├── features/
│   │   ├── publications/
│   │   │   ├── PublicationsManager.jsx # Studio publications copie source, a modulariser
│   │   │   └── publications.css
│   │   └── vibefx-layout/
│   │       ├── components/
│   │       │   ├── canvas/
│   │       │   │   └── CanvasWorkspace.jsx
│   │       │   ├── panels/
│   │       │   │   ├── BackgroundPanel.jsx
│   │       │   │   ├── GeometryPanel.jsx
│   │       │   │   ├── SmoothBlurPopup.jsx
│   │       │   │   └── TextAssetsPanel.jsx
│   │       │   ├── sidebar/
│   │       │   │   └── LayoutSidebar.jsx
│   │       │   ├── tutorial/
│   │       │   │   ├── LayoutDemoOverlay.jsx
│   │       │   │   └── LayoutTutorialOverlay.jsx
│   │       │   └── ui/
│   │       │       ├── ControlGroup.jsx
│   │       │       └── Select.jsx
│   │       ├── data/
│   │       │   └── constants.jsx
│   │       ├── engine/
│   │       │   ├── assetRenderer.js
│   │       │   ├── layoutRenderer.js
│   │       │   └── textRenderer.js
│   │       ├── hooks/
│   │       │   ├── useCanvasEvents.js
│   │       │   ├── useCanvasRenderer.js
│   │       │   ├── useImageUpload.js
│   │       │   └── useLayoutHelpers.js
│   │       ├── utils/
│   │       │   └── canvasUtils.js
│   │       ├── index.js
│   │       ├── VibeFxLayout.jsx
│   │       ├── vibefx-layout.css
│   │       └── vibefx-tailwind.css
│   └── lib/
│       └── firebase.js               # Client Firebase NEXT_PUBLIC_*
├── .env.example                      # Variables publiques + secrets a creer
├── .gitignore
├── AGENTS.md                         # Regles agents du projet
├── apphosting.yaml                   # Base Firebase App Hosting
├── CLAUDE.md                         # Fichier genere, non encore enrichi
├── eslint.config.mjs
├── firebase.json                     # Config Firebase actuelle
├── firestore.indexes.json
├── firestore.rules                   # Regles initiales Vibe_fx V2
├── jsconfig.json
├── MEGAPROMPT.md                     # Prompt maitre de conception/deploiement
├── next.config.mjs
├── package.json                      # Next.js + Firebase + lucide + three
├── package-lock.json
├── README.md
├── seo.md                            # Agent SEO Google
├── skills-lock.json                  # Lock des 23 skills importes
└── storage.rules                     # Regles initiales Storage
```

## Pages actuelles

- `/` : page publique de cadrage SEO et produit.
- `/studio` : entree noindex vers le studio Vibe_fx importe.
- `/robots.txt` : genere par `src/app/robots.js`.
- `/sitemap.xml` : genere par `src/app/sitemap.js`.

## Pages cible a creer plus tard

- `/outil-publication-reseaux-sociaux`
- `/editeur-image-instagram`
- `/publier-instagram-facebook`
- `/templates`
- `/templates/post-instagram-portrait`
- `/templates/story-instagram`
- `/templates/carrousel-instagram`
- `/ressources`
- `/ressources/meta-oauth-publication-instagram-facebook`
- `/ressources/formats-instagram`
- `/ressources/publier-depuis-un-site-web`
- `/legal/confidentialite`
- `/legal/conditions`

## Statut

- Projet cree dans `C:\Users\matth\Travail\vibe_fxV2`.
- Les 23 skills ont ete importes avec `npx skills add C:/Users/matth/Desktop/design-skills-db/publish/refero-design-skills`.
- Des dependances ont ete ajoutees : Next.js, React, Firebase, lucide-react, three.
- Les fichiers de cadrage racine sont maintenant presents.
- `npm --prefix functions run lint` passe avec `node --check index.js`.
- `npm run lint` echoue actuellement sur le code React importe : 60 problemes, dont 33 erreurs, principalement regles React hooks/static-components/no-unescaped-entities et `next/no-img-element`. La premiere phase du `MEGAPROMPT.md` doit auditer et corriger ces points avant build/deploy.
- Le prompt maitre demande explicitement de reprendre comme base la logique publication/Firebase deja travaillee dans Jardin de Chawi : moteur layout, `PublicationsManager.jsx`, Functions Meta/OAuth, verrous, statuts et rules Firestore/Storage.
- La vraie implementation produit doit suivre `MEGAPROMPT.md`.
