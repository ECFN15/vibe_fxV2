# Import local Pixabay AI Generated

Objectif : importer quelques pistes depuis `https://pixabay.com/music/search/ai-generated/` sans API Pixabay, pour alimenter la bibliotheque Soundtrack/Vibe_CUT en local.

## Commandes

Verifier les liens sans telecharger :

```bash
npm run import:pixabay-ai -- --dry-run --limit 5
```

Telecharger un petit lot :

```bash
npm run import:pixabay-ai -- --limit 8 --pages 1
```

Le bouton `Chercher / importer` de la modale Soundtrack lance ce meme import local depuis `/api/music/pixabay-local-import` en developpement. Il utilise le theme selectionne (`AI generated`, `piano`, `epic`, etc.) et le champ `Nombre` comme limite de pistes a recuperer, puis ajoute les fichiers trouves a la bibliotheque locale ou projet.

Ouvrir le navigateur pour debug :

```bash
npm run import:pixabay-ai -- --headed --limit 3
```

Changer la destination :

```bash
npm run import:pixabay-ai -- --out public/music/pixabay-ai --limit 8
```

## Sorties

Le script cree par defaut :

- `public/music/pixabay-ai/*.mp3` ou autre extension audio detectee ;
- `public/music/pixabay-ai/vibefx-pixabay-ai-manifest.json`.

Chaque entree du manifest garde `sourceUrl`, `licenseUrl`, `license`, `contentIdWarning`, `downloadUrl` et `previewUrl`. Les chemins `downloadUrl`/`previewUrl` pointent vers `/music/pixabay-ai/...` quand le fichier est bien telecharge dans `public/`.

## Garde-fous

- Le script inspecte au maximum 3 pages et 30 pistes.
- Il attend entre les pages piste pour eviter les scans massifs.
- Il s'arrete si Pixabay affiche un captcha/challenge ou une page d'acces refuse.
- Il ne contourne pas Cloudflare, login, captcha ou restriction technique.
- Il n'utilise pas d'API et n'invente pas d'URL audio quand la page ne l'expose pas.

## Droits

Pixabay annonce une licence permissive, mais une piste peut encore exposer a des droits tiers ou Content ID. Pour chaque piste utilisee en publication sociale, conserver la page `sourceUrl`, la licence, la date d'import et le manifest Vibe_fx.
