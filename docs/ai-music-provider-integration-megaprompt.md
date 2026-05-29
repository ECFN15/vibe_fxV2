# MEGAPROMPT - Fournisseurs musique IA/API pour Soundtrack Vibe_fx

Tu travailles dans `C:\Users\matth\Travail\vibe_fxv2`.

Ne modifie jamais le projet source historique reference dans `AGENTS.md`.
Ne touche pas a `node_modules/`, `.next/`, `.git/`, `dist/`.
Lis avant toute modification :

1. `AGENTS.md`
2. `map.md`
3. `seo.md`
4. `MEGAPROMPT.md`
5. `docs/music-sourcing-and-import-plan.md`
6. `src/features/vibefx-studio/soundtrack/`
7. `src/app/api/music/`
8. `src/features/vibefx-studio/video/data/musicRights.js`
9. `src/features/vibefx-studio/video/data/musicCatalog.js`

## Objectif

Faire evoluer l'onglet Soundtrack en ajoutant les fournisseurs musique les plus solides pour une app de montage video reseaux sociaux : API officielle, qualite audio, diversite de styles, droits propres, import testable, pas de scraping, pas de dependance douteuse.

Le travail doit etre minutieux, fournisseur par fournisseur. Chaque fournisseur doit avoir sa propre barre de filtres/categories basee sur ce que la plateforme expose vraiment, pas une liste generique recyclee.

## Fournisseurs a auditer en priorite

Commence par ces fournisseurs, avec verification web obligatoire sur leurs docs officielles le jour de l'implementation :

1. ElevenLabs Music API
   - Docs de depart :
     - https://elevenlabs.io/docs/api-reference/music/compose-detailed
     - https://elevenlabs.io/docs/eleven-creative/products/music
   - Points a verifier : endpoint officiel, sortie audio telechargeable, formats, `music_length_ms`, `force_instrumental`, `composition_plan`, metadata, C2PA, conditions commerciales, restrictions de plan.

2. Stability AI / Stable Audio
   - Docs de depart :
     - https://platform.stability.ai/docs/
     - https://platform.stability.ai/docs/release-notes
     - https://stability.ai/news-updates/meet-stable-audio-3-the-model-family-built-for-artistic-experimentation-with-open-weight-models
   - Points a verifier : modele audio actuellement disponible via API, duree max, format, qualite stereo, donnees/licence, cout, statut Stable Audio 3.x, limites commerciales.

3. Loudly Music API
   - Docs de depart :
     - https://www.loudly.com/music-api
   - Points a verifier : developer portal, endpoints, catalog, generation parametrique, text-to-music, genre, tempo, energy, duration, playlists, stems, licence commerciale, export.

4. Mubert API
   - Docs de depart :
     - https://mubert.com/api
   - Points a verifier : API Render/stream/export, text, image, BPM, activity, genre, mood, instruments/stems, telechargement offline, licence/sublicensing.

5. SOUNDRAW API
   - Docs de depart :
     - https://soundraw.io/api
   - Points a verifier : API multi-user, generation par genre/mood/theme, customisation, licence, endpoints, telechargement.

6. Beatoven.ai API
   - Docs de depart :
     - https://www.beatoven.ai/api
   - Points a verifier : maestro Music Generation API, SFX API, prompts multimodaux, qualite, droits commerciaux, vitesse, endpoints et documentation technique disponible.

Garde Openverse existant comme fournisseur gratuit catalogue si son comportement actuel est stable. Garde Pixabay uniquement comme exception manuelle deja decidee. Ne reintegre pas Internet Archive ni Wikimedia Commons dans les providers actifs, sauf si une preuve technique nouvelle montre un corpus moderne, filtrable, legalement propre et compatible reseaux sociaux.

Interdictions :

- Pas d'API non officielle Suno/Udio.
- Pas de scraping de catalogues.
- Pas de cle API cote client.
- Pas de generation appelee directement depuis le navigateur.
- Pas d'import audio sans manifeste de droits.
- Pas de filtres inventes en pretendu "natif plateforme".

## Phase 0 - Audit officiel et decision fournisseur

Pour chaque fournisseur, cree une fiche dans `docs/ai-music-provider-audit.md` avec :

- Nom fournisseur.
- URL docs officielles consultees.
- Date de verification.
- Type : generation IA, catalogue IA, SFX, streaming, marketplace, hybride.
- Endpoint(s) utilisables.
- Authentification requise.
- Formats audio disponibles.
- Duree min/max.
- Parametres officiels de generation/recherche.
- Categories/filtres officiellement exposes.
- Conditions de droits : commercial, social media, redistribution, attribution, Content ID, interdictions.
- Cout ou plan requis si disponible.
- Risques : legal, qualite, latence, quotas, absence de docs, licence floue.
- Decision : `active`, `experimental`, `manual-only`, `rejected`.
- Raison de la decision.

Regle de decision :

- `active` seulement si API officielle, licence claire, audio telechargeable/importable, categories ou prompts controles, test technique possible.
- `experimental` si prometteur mais docs/prix/quotas partiellement opaques.
- `manual-only` si qualite bonne mais API ou licence incompatible avec integration automatique.
- `rejected` si scraping requis, API non officielle, droits flous, qualite trop aleatoire ou import impossible.

## Phase 1 - Architecture cible

Conserve le design actuel Soundtrack, mais ajoute une couche provider IA propre.

Contraintes :

- Les appels providers passent par routes serveur Next.js sous `src/app/api/music/`.
- Les secrets sont lus depuis variables env serveur.
- Aucun secret dans le repo.
- Chaque provider a un adapter isole.
- Le front ne connait que des providers normalises.
- Les resultats doivent utiliser le meme modele que les pistes Soundtrack existantes : titre, artiste/source, duree, playableUrl/proxyUrl, page source, licence, attribution, provider id, tags/categories, rights metadata.
- Les imports doivent reutiliser le pipeline d'import et manifeste de droits existant.
- Les providers indisponibles ou sans cle doivent rester visibles comme `unavailable` ou `experimental`, sans casser l'UI.

Proposition de structure, a adapter au code reel :

- `src/app/api/music/ai-providers/route.js`
  - Retourne metadata providers, statuts, filtres natifs, cout/plan approximatif si public, besoin de cle.
- `src/app/api/music/ai-generate/route.js`
  - Lance une generation ou une recherche provider selon adapter.
  - Valide provider/filter/duration/prompt.
  - Retourne resultats normalises.
- `src/app/api/music/ai-import/route.js`
  - Importe un resultat genere ou telechargeable via proxy serveur.
  - Valide host, MIME audio, taille, droits, attribution.
- `src/app/api/music/_providers/<provider>Adapter.js`
  - Un adapter par fournisseur.
- `src/app/api/music/_shared/providerTrack.js`
  - Normalisation commune si necessaire.

N'ajoute cette structure que si elle s'integre proprement aux fichiers existants. Si le projet possede deja une meilleure surface (`free-search`, `providers`, `audioImport`), reutilise-la et evite la duplication.

## Phase 2 - Filtres par fournisseur

Objectif UI : chaque fournisseur affiche une barre de filtres qui represente son vrai systeme.

Regle stricte :

- Si le provider expose officiellement des `genres`, `moods`, `themes`, `activity`, `energy`, `tempo`, `duration`, `instrumental`, `SFX`, alors la barre doit reprendre ces dimensions.
- Si le provider ne donne pas de liste officielle exhaustive, n'invente pas une fausse liste "native". Cree alors une section `Presets Vibe_CUT` clairement marquee, basee sur des prompts controles pour montage social.
- Ne melange pas tous les providers dans la meme taxonomie.
- Un clic sur `generer plus` ou `+ resultats` doit rester dans le filtre actif du provider actif.
- Le provider ne doit jamais changer de categorie tout seul.

Categories Vibe_CUT a couvrir quand elles sont compatibles avec le fournisseur :

- cinematic
- trailer / epic
- action trailer
- corporate / brand
- fashion / club
- short commercial
- electronic
- house
- hip hop
- jazz
- funk
- rock
- lofi
- ambient / lounge
- impact / whoosh
- riser / transition
- intro / opener
- podcast / talk bed
- luxury / premium
- tech / futuristic
- emotional / inspiring

Pour chaque provider, documente dans `docs/ai-music-provider-audit.md` si ces labels sont :

- `native` : label/parametre officiel du provider.
- `mapped` : mapping explicite vers plusieurs parametres officiels.
- `prompt-preset` : prompt Vibe_CUT, pas un filtre natif.
- `unsupported` : a ne pas afficher pour ce provider.

## Phase 3 - UX Soundtrack

Dans l'agregateur :

- Ajouter les providers IA solides sous les providers existants.
- Afficher clairement `API`, `EXPERIMENTAL`, `KEY MISSING`, `MANUAL`, `UNAVAILABLE`.
- Pour chaque provider actif :
  - barre de filtres specifique ;
  - duree cible ;
  - option instrumental si supportee ;
  - controle prompt court si supporte ;
  - bouton `generer` ;
  - bouton compact `generer plus` qui reste dans le filtre courant ;
  - bouton `+ resultats` si le provider supporte pagination/variantes ;
  - bouton import vers bibliotheque projet/local ;
  - preview waveform + seek comme les resultats Openverse actuels.
- Les erreurs doivent expliquer quoi faire : cle absente, quota, provider timeout, licence non confirmee, format non importe.

Ne transforme pas la page en panneau marketing. Ca doit rester une surface de travail dense, lisible, type cockpit.

## Phase 4 - Tests d'importation reels

Prevois deux niveaux de tests.

### Tests sans cles reelles

- Providers listables.
- Providers avec cle absente affichent `KEY MISSING`.
- Filtres provider-specifiques visibles.
- `generer plus` reste dans le provider/filtre actif.
- `+ resultats` reste dans le provider/filtre actif.
- Aucune requete provider externe n'est appelee sans cle.
- Aucun secret n'est expose dans le bundle client.
- L'import refuse les hosts non allowlistes.
- Les providers rejetes ne reapparaissent pas comme actifs.

### Tests avec cles reelles optionnelles

Ces tests doivent etre skip si les variables env manquent.

Pour chaque provider actif :

1. Appeler une generation courte, 10 a 20 secondes si le provider le permet.
2. Demander un filtre pertinent pour Vibe_CUT, par exemple `trailer / epic` ou `cinematic`.
3. Verifier que le resultat contient un audio telechargeable/proxyable.
4. Precharger l'audio dans le navigateur.
5. Importer vers bibliotheque projet/local.
6. Verifier le manifeste de droits.
7. Lire la piste importee.
8. Exporter ou simuler l'ajout vers Vibe_CUT.

Variables env proposees, a ajuster aux docs officielles :

- `ELEVENLABS_API_KEY`
- `STABILITY_API_KEY`
- `LOUDLY_API_KEY`
- `MUBERT_API_KEY`
- `SOUNDRAW_API_KEY`
- `BEATOVEN_API_KEY`

Ne hardcode jamais ces cles.

## Phase 5 - Bilan qualite

Cree `docs/ai-music-provider-quality-report.md`.

Pour chaque fournisseur teste, note :

- Taux de succes technique.
- Latence mediane.
- Qualite percue pour montage social.
- Regularite des resultats dans le filtre demande.
- Diversite des styles.
- Qualite des transitions/SFX si applicable.
- Clarte des droits.
- Simplicite d'import.
- Couts/quotas si connus.
- Probleme UX observe.
- Decision finale : garder, garder experimental, cacher par defaut, supprimer.

Score sur 100 :

- 25 qualite audio
- 20 precision du filtre/categorie
- 15 regularite sur plusieurs generations
- 15 droits/licence/import
- 10 latence
- 10 diversite utile pour reseaux sociaux
- 5 ergonomie API

Ajoute ensuite un plan d'amelioration :

- meilleurs presets prompts ;
- categories a retirer ;
- providers a masquer ;
- caching ou jobs async necessaires ;
- besoin d'une file d'attente ;
- besoin d'une moderation ou detection droits ;
- cout moyen par generation et impact credits Vibe_fx.

## Definition de fini

Le travail est fini seulement si :

- `docs/ai-music-provider-audit.md` existe et justifie chaque provider.
- Les providers actifs ont des adapters isoles et des statuts clairs.
- Les filtres affiches sont specifiques au fournisseur.
- Les providers sans cle ne cassent pas l'UI.
- `generer plus` et `+ resultats` restent dans le filtre actif.
- L'import d'au moins un provider actif est teste ou skippe proprement faute de cle.
- Les droits/licences sont presents dans les metadata importees.
- `docs/ai-music-provider-quality-report.md` existe.
- `map.md` est mis a jour.
- Les checks passent :
  - `npm run lint`
  - `npm run test:soundtrack-ui`
  - `npm run test:soundtrack-core`
  - `npm run build`
- Si Functions sont modifiees :
  - `npm --prefix functions run lint`

## Reponse finale attendue

Dans ta reponse finale, donne :

- Providers gardes et pourquoi.
- Providers rejetes/experimentaux et pourquoi.
- Filtres ajoutes par provider.
- Tests executes et resultats.
- Limitations restantes.
- Prochaine meilleure amelioration.
