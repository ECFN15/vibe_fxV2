# MEGAPROMPT - Audit et reprise des changes interrompus

## Mission

Tu travailles dans `C:\Users\matth\Travail\vibe_fxv2`.

Le projet contient un gros worktree non committe, probablement issu d'une session Codex CLI interrompue. Ta mission est de comprendre exactement ce qui a ete ajoute, modifie, supprime ou laisse incomplet, puis de reprendre ou terminer proprement sans perdre le travail existant.

Ne commence pas par coder. Commence par auditer les changes.

## Regles absolues

- Ne modifie jamais le projet source local analyse en amont.
- Ne touche pas a `node_modules/`, `.next/`, `.git/`, `dist/`.
- Ne fais pas de `git reset --hard`, `git checkout --`, `git clean`, suppression recursive ou revert global.
- Considere tous les changements existants comme du travail utilisateur ou agent a preserver jusqu'a preuve claire du contraire.
- Si un fichier semble genere, lourd ou accidentel, documente-le avant toute action.
- Mets a jour `map.md` pour toute creation, suppression, renommage, deplacement ou modification structurelle.
- Les secrets Meta/Firebase/Stripe/IA ne doivent jamais etre hardcodes.
- Les pages publiques restent indexables ; `/studio`, `/account`, surfaces privees et API internes restent `noindex`/hors sitemap public.
- Les fichiers audio utilisateur de Soundtrack restent local-first : pas de stockage serveur.
- Les tokens Meta, OAuth, publication reseaux, locks anti-doublon et chiffrement restent cote serveur Firebase Functions.

## Lecture obligatoire avant audit

Lis dans cet ordre :

1. `AGENTS.md`
2. `map.md`
3. `seo.md`
4. `MEGAPROMPT.md`
5. `.agents/skills/cyber-neon/SKILL.md`
6. `.agents/skills/dark-ui/SKILL.md`
7. `.agents/skills/technical-ui/SKILL.md`
8. `.agents/skills/motion/SKILL.md`

Puis lis les prompts/docs lies aux changements recents :

- `docs/studio-ai-agents-megaprompt.md`
- `docs/soundtrack-local-playlist-megaprompt.md`
- `docs/video-editor-bug-hunter-megaprompt.md`
- `docs/music-sourcing-and-import-plan.md`
- `docs/production-ai-monetization-security-megaprompt.md`
- `docs/production-saas-audit.md`

## Etat initial connu a verifier

Au moment de creation de ce prompt, le worktree contenait notamment :

- Modifications studio/publications : `src/app/studio/*`, `src/features/publications/*`, `src/features/vibefx-studio/VibeFxStudio.jsx`, `Header.jsx`.
- Nouvelle colonne/rail agents IA : `src/features/vibefx-studio/ai/`, `src/features/vibefx-studio/components/ai/`, `scripts/smoke-studio-ai-rail.spec.cjs`.
- Nouvel onglet Soundtrack local-first : `src/features/vibefx-studio/soundtrack/`, `scripts/smoke-soundtrack-ui.spec.cjs`, `docs/soundtrack-local-playlist-megaprompt.md`.
- Gros chantier Vibe_CUT video : `VideoEditor.jsx`, `VideoEngine.js`, `timelineModel.js`, `videoStore.js`, `Timeline.jsx`, `TrackItem.jsx`, `ExportVideoPanel.jsx`, `FilterVideoPanel.jsx`, `VideoToolbar.jsx`, `VideoPreview.jsx`, `Playhead.jsx`.
- Tests video renforces : `scripts/smoke-video-timeline-model.mjs`, `scripts/smoke-video-store.mjs`, `scripts/smoke-video-ui.spec.cjs`.
- Changement `package.json` : scripts `test:studio-ui`, `test:soundtrack-ui`, `test:video-ui`.
- Donnees scraper Midjourney : `scripts/midjourney-scraper/catalog.json`, `data/catalog.db`, `data/catalog.db-wal`, nombreux `.webp` non suivis et deux `.webp` supprimes.
- Fichiers potentiellement accidentels a classer : `.firebase/logs/vsce-debug.log`, bases SQLite WAL, assets de scraping, gros fichiers binaires.

Ne te fie pas uniquement a cette liste. Elle sert de point de depart, pas de source de verite finale.

## Phase 1 - Inventaire Git sans modification

Execute et conserve les sorties importantes dans ton raisonnement :

```bash
git status --short
git diff --stat
git diff --name-status
git ls-files --others --exclude-standard
git diff --check
```

Puis regroupe les changements par lots :

- Documentation et prompts.
- Config/scripts/tests.
- Studio shell/header/routing.
- Publications.
- Agents IA studio.
- Soundtrack local-first.
- Vibe_CUT video/timeline/export.
- Scraper/catalogue/assets.
- Logs/fichiers generes ou probablement accidentels.

Pour chaque lot, note :

- fichiers modifies ;
- fichiers crees ;
- fichiers supprimes ;
- intention probable ;
- risques ;
- tests correspondants ;
- statut : `a garder`, `a corriger`, `a finir`, `a deplacer`, `a ignorer`, `a supprimer seulement apres confirmation`.

## Phase 2 - Lecture fichier par fichier

Pour chaque fichier texte modifie ou cree :

1. Lis le diff complet avec `git diff -- <path>` ou le fichier entier si nouveau.
2. Identifie le contrat public du fichier : props, exports, routes, scripts, CSS global, side effects.
3. Cherche les TODO, placeholders, console logs, handlers morts, imports inutilises, valeurs hardcodees.
4. Verifie si le fichier respecte l'architecture existante et les docs.
5. Note les dependances entrantes/sortantes avec `rg`.

Commandes utiles :

```bash
rg "TODO|FIXME|console\.log|debugger|throw new Error|localStorage|indexedDB|showDirectoryPicker|createAiJob|addAudioTrack|credits|soundtrack|timeline|allTransitions|rightsManifest|noindex|metadata|robots|sitemap" src scripts docs functions
rg "source_project_marker|META_|FIREBASE_|STRIPE_|OPENAI_|ANTHROPIC_|GEMINI_|secret|token|apiKey|privateKey" .
```

Pour les binaires et assets :

- Ne les ouvre pas tous un par un.
- Liste taille, nombre et chemins.
- Verifie s'ils sont attendus par le scraper ou s'ils devraient etre ignores.
- Ne supprime rien sans avoir determine si un fichier versionne ou un catalogue les reference.

## Phase 3 - Audit fonctionnel par domaine

### Studio shell et header

Verifie :

- `Soundtrack` apparait au bon endroit dans le header.
- L'ancien onglet `Credits` n'a pas ete retire par erreur si `/account` ou le dashboard credits en depend.
- Les actions `Publications`, `AI`, export/import restent accessibles desktop et mobile.
- Le header mobile ne masque pas l'onglet `Video`.
- `/studio?workspace=layout` continue d'ouvrir le bon workspace.

### Publications

Verifie :

- Le flux layout -> publication fonctionne encore.
- Le champ caption provenant de l'IA ne casse pas les champs manuels.
- Les uploads passent toujours par Firebase Storage.
- Les callables Meta restent serveur, sans token client.
- Les statuts plateformes et erreurs restent lisibles.

### Agents IA studio

Verifie :

- Les composants du rail IA ne contournent pas `createAiJob`.
- Aucun provider/secret n'est appele depuis le client.
- Les actions IA sont contextuelles par onglet et ne modifient pas l'etat sans validation claire.
- Credits/couts/latence/statut job sont affiches sans inventer une production IA si le provider mock est actif.
- Les erreurs App Check/auth/credits insuffisants sont gerees.

### Soundtrack local-first

Verifie :

- Aucun fichier audio utilisateur n'est envoye vers Firestore, Storage, Functions ou un backend.
- IndexedDB, File System Access API, manifest JSON et fallback download/import sont propres.
- `/api/music/free-search` et `/api/music/import` sont reutilises sans scraping de catalogues interdits.
- Les droits/licences/attributions bloquent l'envoi Vibe_CUT quand incomplets.
- Les object URLs sont revoquees quand necessaire.
- Les fallbacks Firefox/Safari/iOS restent honnetes : pas de promesse d'auto-sync disque si non supporte.

### Vibe_CUT video

Verifie :

- `timelineModel.js` reste le modele canonique `tracks[]`/`items[]`.
- Les transitions de coupe et libres sont resolues sans doubles effets ni overlap invalide.
- Le store refuse les edits sur pistes verrouillees.
- Le playhead scrub met a jour preview/audio sans latence ou crash.
- Export MP4/WebM gere les codecs supportes et n'ecrit pas de blob partiel si erreur.
- Les manifests droits audio sont obligatoires avant export.
- Les controles mobile ne couvrent pas la timeline/export.

### SEO / pages publiques

Verifie :

- Les pages publiques n'importent pas les CSS lourds studio.
- `src/app/page.js`, `pricing/page.js`, `robots.js`, `sitemap.js`, metadata et canonical restent coherents.
- Aucun contenu prive/studio n'est ajoute au sitemap.
- Le rendu HTML public reste utile sans JS.

### Scraper/catalogue/assets

Verifie :

- Si `scripts/midjourney-scraper/catalog.json`, `catalog.db`, `catalog.db-wal` et les `.webp` doivent etre versionnes.
- Si les suppressions des deux `.webp` sont voulues.
- Si `.firebase/logs/vsce-debug.log` est un log accidentel.
- Si `.gitignore` doit etre ajuste plutot que committer des fichiers volatils.

Ne prends pas de decision destructive sans preuve ou instruction utilisateur.

## Phase 4 - Rapport obligatoire avant reprise

Cree ou mets a jour un rapport local :

```text
docs/changes-recovery-audit.md
```

Structure attendue :

```md
# Audit reprise changes interrompus

## Resume executif

## Inventaire Git

## Lots de changements

## Fichiers a garder

## Fichiers a corriger

## Fichiers a finir

## Fichiers generes / a ignorer / a confirmer

## Risques critiques

## Plan de reprise par ordre

## Tests executes

## Tests restants
```

Le rapport doit permettre au prochain agent ou a l'utilisateur de savoir :

- ce qui a ete fait ;
- ce qui marche ;
- ce qui est incomplet ;
- ce qui est risque ;
- quoi terminer en premier.

## Phase 5 - Reprise implementation

Apres le rapport, reprends par ordre de risque :

1. Corriger les erreurs de build/lint bloquantes.
2. Corriger les regressions de navigation studio/header.
3. Stabiliser Vibe_CUT model/store/export/tests.
4. Stabiliser Soundtrack local-first et son test.
5. Stabiliser le rail IA sans appels secrets client.
6. Nettoyer les fichiers generes/volatils uniquement apres classification claire.
7. Mettre `map.md` a jour.

Ne melange pas un refactor cosmetique avec une correction fonctionnelle critique.

## Gates de validation

Lance au minimum :

```bash
npm run lint
npm run test:scope
npm run audit:secrets
npm run test:publication-flow
npm run test:video-ui
npm run test:soundtrack-ui
npm run test:studio-ui
npm run build
npm --prefix functions run lint
```

Si un test ne peut pas tourner localement, documente la raison exacte dans `docs/changes-recovery-audit.md`.

Si les changements touchent Firebase/Meta/Stripe/IA :

```bash
npm run test:account-deletion
npm run test:billing-products
npm run test:billing-ledger
npm run test:ai-gateway
npm run test:ai-ledger
npm run test:app-check
```

Si les changements touchent routes publiques/SEO :

```bash
npm run test:routes
npm run build
```

## Definition de fini

La reprise est terminee seulement si :

- chaque fichier modifie/cree/supprime a ete classe ;
- les fichiers generes/volatils ont une decision documentee ;
- les features Soundtrack, IA studio, Vibe_CUT et Publications ont un statut clair ;
- les regressions critiques sont corrigees ;
- `map.md` decrit l'architecture reelle ;
- `docs/changes-recovery-audit.md` existe et contient les tests executes/restants ;
- les gates passent ou les echecs restants sont expliques avec action suivante concrete.
