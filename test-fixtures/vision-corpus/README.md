# Vision smartphone corpus

Ce dossier est volontairement ignore par Git pour eviter de versionner des photos utilisateur ou des fichiers lourds.

Deposer ici des exports JPEG/PNG/WebP issus de photos smartphone non RAW, avec ces noms :

- `portrait-light`
- `portrait-medium-dark`
- `selfie-interior`
- `landscape-blue-sky`
- `vegetation-green`
- `night-neon`
- `golden-hour`
- `tungsten-interior`
- `saturated-image`
- `hazy-flat`
- `low-light-noise`
- `social-compressed`

Extensions acceptees par le script : `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`.

Les HEIC doivent etre convertis localement en JPEG/PNG pour les tests navigateur reproductibles.

Commande :

```powershell
npm run check:vision-corpus
```

Mode strict :

```powershell
$env:VISION_CORPUS_REQUIRED='1'; npm run check:vision-corpus
```
