# Corpus smartphone Vision

Date : 2026-05-20

## Objectif

Ce corpus sert a valider que les profils Vision restent exploitables sur des images smartphone non RAW deja traitees : HDR local, sharpening, reduction de bruit, compression et saturation native.

Le corpus reel n'est pas versionne. Les fichiers doivent rester dans `test-fixtures/vision-corpus/`, ignore par Git.

## Fichiers attendus

| ID | Fichier attendu | Objectif de validation |
| --- | --- | --- |
| `portrait-light` | peau claire en lumiere naturelle | proteger peau, blancs et micro-contraste |
| `portrait-medium-dark` | peau medium/foncee | limiter hue shift et ombres colorees |
| `selfie-interior` | selfie interieur smartphone | eviter peau rouge/verte et bruit sale |
| `landscape-blue-sky` | paysage ciel bleu | controler cyan, highlights et saturation ciel |
| `vegetation-green` | vegetation verte | eviter verts neon et clipping chroma |
| `night-neon` | nuit avec neons | proteger rouges/cyans et noirs detailles |
| `golden-hour` | lumiere chaude | ne pas surchauffer orange/peau |
| `tungsten-interior` | interieur tungstene | preserver neutres et blancs propres |
| `saturated-image` | image deja tres saturee | verifier saturation ceiling/chroma rolloff |
| `hazy-flat` | image terne/brumeuse | detecter voile gris et perte de contraste utile |
| `low-light-noise` | basse lumiere bruitee | eviter grain/bruit numerique sale |
| `social-compressed` | screenshot ou image reseau compressee | eviter artefacts accentues et aplats |

Extensions acceptees : `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`.

Les HEIC doivent etre convertis localement en JPEG/PNG avant validation, car le support navigateur/CI est variable.

## Commandes

```powershell
npm run check:vision-corpus
```

Par defaut, la commande affiche un etat non bloquant pour ne pas casser les environnements sans photos locales.

Pour lancer les gates navigateur/metriques sur les fixtures presentes :

```powershell
npm run test:vision-corpus
```

Cette commande demarre un serveur Next local puis applique Velvia, Ektar 100 et Leica Sepia aux images disponibles. Elle passe en skip si aucune fixture locale n'est presente.

Pour rendre le corpus obligatoire :

```powershell
$env:VISION_CORPUS_REQUIRED='1'; npm run check:vision-corpus
```

## Gates perceptuels

Chaque fichier doit etre inspecte a 40%, 80% et 100% sur les familles pertinentes :

- blancs propres, pas de dominante sale involontaire ;
- noirs avec detail, sauf profils explicitement high contrast ;
- peau plausible ;
- ciel non cyan radioactif ;
- verts non neon sauf intention forte ;
- rouges/oranges non clipses ;
- grain naturel, pas bruit numerique accentue ;
- vignette non bloquante pour le sujet ;
- pas de voile gris involontaire.

## Gates metriques

Les seuils doivent etre calibres sur ce corpus reel avant declaration stable :

- clipping hautes lumieres par canal ;
- noirs ecrases ;
- saturation moyenne et pixels tres satures ;
- derive des neutres ;
- bias coloré des neutres proteges ;
- derive hue/saturation/luma sur les pixels peau detectables ;
- variation luma/contraste ;
- risque de voile gris ;
- temps de rendu par megapixel.
