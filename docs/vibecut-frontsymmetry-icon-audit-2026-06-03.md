# Audit FrontSymmetry icones VibeCut - 2026-06-03

## Scope

- Page inspectee en priorite : `/studio?workspace=layout`, onglet VibeCut.
- Zones corrigees : preview normale, preview grand format, rail depot video, timeline, controles preview, bibliotheque musique VibeCut, actions header/layout `Importer` / `Export` / `PNG`.
- Objectif : centrer les glyphes dans les boutons carres sans changer le flux, les tailles de panneaux ou les positions des containers.

## Ancrage

- Preview et colonne droite : conteneurs flex en flux normal. Les corrections doivent rester sur les boutons ou spans internes.
- Boutons rotation/plein ecran/lecture : boutons carres ou actions inline-flex. Correction par classe locale, pas par padding parent.
- Zone depot : icone `Upload` dans un carre interne. Correction par glyph offset visuel, sans bouger le bouton de depot.

## Corrections appliquees

- `video-safe-area-overlay` retire de `VideoPreview.jsx`; l'overlay n'est plus rendu en preview normale ni en grand format.
- Ajout des primitives CSS :
  - `.vibecut-square-button` pour les boutons carres.
  - `.vibecut-icon-frame` pour les cadres internes qui portent uniquement une icone.
  - `.vibecut-action-button` pour les boutons mixtes icone + texte.
  - `.vibecut-upload-glyph` pour compenser le dessin optiquement haut du pictogramme upload.
- Ajout de `justify-center` sur les actions `Importer`, `Export`, `PNG` et `Publication` afin que l'icone et le texte restent groupes au centre.
- Le smoke test VibeCut verifie maintenant l'absence de safe area au lieu de sa presence.

## Reste a surveiller

- Les icones Instagram/Facebook dans les previews sociales sont des simulations d'app et ne doivent pas etre forcees par les primitives VibeCut.
- Les boutons Soundtrack ont leur propre systeme CSS; aucun decalage carre critique n'a ete corrige hors VibeCut pendant cette passe.
