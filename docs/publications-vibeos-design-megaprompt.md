# MEGAPROMPT - Refonte design page Publications en Vibe_OS Cockpit

## Mission

Tu travailles dans `C:\Users\matth\Travail\vibe_fxv2`.

Refonds le design de la page `Publications` pour qu'elle soit coherente avec l'interface de mise en page Vibe_fx et avec le skill local `design`.

Le probleme actuel : la page publications ressemble a un dashboard marketing trop haut dans la page, avec des grands blocs arrondis, beaucoup d'elements colles en haut, une hierarchie visuelle qui ne correspond pas au cockpit Vibe_fx, et des containers/boutons/polices/couleurs qui ne suivent pas le systeme Vibe_OS.

Objectif : transformer la page publications en vraie surface de pilotage professionnelle pour finaliser, organiser et publier les contenus. Elle doit rester dense et precise, mais avec une respiration structurelle : marges, header, grille, rails, panneaux et zones d'action clairement separes.

Ne reconstruis pas la logique metier. Refonte UI/CSS/composition seulement, sauf correction mineure necessaire.

## Lecture obligatoire

Lis dans cet ordre avant de modifier :

1. `AGENTS.md`
2. `map.md`
3. `seo.md`
4. `MEGAPROMPT.md`
5. `.agents/skills/design/SKILL.md` ou `.agents/skills/design/skill.md`
6. `.agents/skills/dark-ui/SKILL.md`
7. `.agents/skills/technical-ui/SKILL.md`
8. `src/features/vibefx-layout/`
9. `src/features/vibefx-layout/vibefx-layout.css`
10. `src/features/vibefx-studio/components/Header.jsx`
11. `src/features/publications/PublicationsManager.jsx`
12. `src/features/publications/components/PublicationComposer.jsx`
13. `src/features/publications/components/PublicationDashboard.jsx`
14. `src/features/publications/components/PublicationList.jsx`
15. `src/features/publications/components/PublicationPreview.jsx`
16. `src/features/publications/components/MetaOAuthPanel.jsx`
17. `src/features/publications/components/InstagramPhonePreview.jsx`
18. `src/features/publications/publications.css`
19. `src/features/publications/helpers/publicationHelpers.js`

## Design system obligatoire : Vibe_OS Design System v2.0

Applique le skill `design` comme source principale.

### Philosophie

Concept : **Cockpit Mode / Technical Precision**.

L'interface est un outil de pilotage professionnel. Elle privilegie :

- densite d'information;
- precision des controles;
- esthetique futuriste et industrielle;
- symetrie, structure rigide, alignement parfait;
- transitions reactives mais non distrayantes;
- information compacte, separateurs fins, pas de grands blocs aeres.

Parametres :

- `DESIGN_VARIANCE: 2` : symetrie, structure rigide, alignement parfait.
- `MOTION_INTENSITY: 5` : transitions fluides, reactives, pas de distraction.
- `VISUAL_DENSITY: 8` : haute densite, information compacte, pas de cartes aeriennes.

### Palette

Utilise ces tokens partout dans `publications.css` :

```css
:root {
  --vibe-bg: #050505;
  --vibe-surface: #0a0a0a;
  --vibe-border: #171717;
  --vibe-separator: #262626;
  --vibe-text: #e5e5e5;
  --vibe-muted: #737373;
  --vibe-accent: #6366f1;
  --vibe-danger: #ef4444;
}
```

Roles :

- Fond global : `#050505`.
- Surfaces headers/sidebars/panneaux : `#0a0a0a`.
- Bordures principales : `#171717`.
- Separateurs internes : `#262626`.
- Texte principal : `#e5e5e5`, jamais `#fff` pur.
- Texte secondaire : `#737373`.
- Accent actif : `#6366f1`.
- Danger : `#ef4444`.

### Typographie

- UI generale : `Inter`, system sans-serif.
- Labels, titres de sections techniques, boutons, valeurs numeriques, compteurs, statuts : `ui-monospace`, `SFMono-Regular`, monospace.
- Labels obligatoires : uppercase, `tracking-widest`, `text-[10px]` ou equivalent CSS.
- Eviter les H1 marketing enormes. Le titre doit etre un titre cockpit, pas une hero landing page.

### Geometrie

- Radius : `0px` a `4px` maximum.
- Interdit : `rounded-xl`, `rounded-2xl`, gros cards doux.
- Bordures : 1px, fines.
- Pas d'ombres portees diffuses.
- Privilegier grilles, bordures, lignes, glows internes discrets.
- Boutons principaux avec coins coupes via `clip-path` si coherent.
- Containers structures par `border-r`, `border-b`, `border-t`, pas par cartes flottantes.
- Zones de preview avec corner markers techniques.

### Boutons et inputs

- Boutons : ghost transparent avec bordure ou flat accent.
- Hover : remplissage progressif, bordure accent, soulignement anime ou fond discret.
- Feedback : `active:scale(0.98)` ou equivalent.
- Inputs : terminaux, fond sombre, bordure fine, typo mono pour labels/champs techniques.
- Icônes lucide petites : `14` ou `16`.

### Motion

- Courbe : `cubic-bezier(0.16, 1, 0.3, 1)`.
- Duree : 150ms a 300ms.
- Micro interactions seulement : opacite, couleur, leger scale, slide-in panneaux.
- Respecter `prefers-reduced-motion`.

## Contraintes produit

Ne casse pas :

- le flux mise en page -> publication;
- le draft importe depuis Vibe_fx;
- la sauvegarde publication;
- les uploads Storage;
- les statuts plateforme;
- le panneau Meta OAuth;
- la preview Instagram/Facebook;
- la liste des publications;
- la selection/suppression/mise en avant;
- les erreurs si Firebase n'est pas initialise.

Ne deplace pas la logique Firebase dans le CSS ou dans des hacks.

## Fichiers cibles

Priorite :

- `src/features/publications/publications.css`
- `src/features/publications/components/PublicationComposer.jsx`
- `src/features/publications/components/PublicationDashboard.jsx`
- `src/features/publications/components/PublicationList.jsx`
- `src/features/publications/components/PublicationPreview.jsx`
- `src/features/publications/components/MetaOAuthPanel.jsx`
- `src/features/publications/components/InstagramPhonePreview.jsx`

`PublicationsManager.jsx` ne doit changer que si la structure d'enveloppe l'exige.

## Structure cible

### Page globale

Remplacer l'effet "tout colle en haut" par une vraie composition :

- fond global plein ecran `#050505`;
- wrapper page avec marge haute raisonnable sous le header studio;
- largeur maximum controlee, mais pas trop etroite;
- gutters lateraux constants;
- grille principale lisible;
- header publications propre;
- toolbar d'actions;
- contenu en panneaux cockpit.

Exemple d'intention :

```text
Publication Surface
|-- Header cockpit
|   |-- breadcrumb / module label
|   |-- titre compact
|   |-- statut auth/sync
|   `-- actions principales
|-- Metrics strip / status rail
|-- Main grid
|   |-- Left rail: queue / liste / filtres
|   |-- Center: composer ou dashboard operationnel
|   `-- Right rail: preview + Meta OAuth + statut plateformes
`-- Activity / recent publications / errors
```

### Header publications

Le header ne doit plus etre une grande hero card.

Attendu :

- hauteur compacte;
- alignement horizontal;
- label mono `PUBLICATIONS`;
- titre type `Centre de publication`;
- sous-texte court;
- actions a droite :
  - `Mise en page`;
  - `Nouvelle publication` si pertinent;
  - `Rafraichir` si disponible;
- statut Firebase/Auth discret;
- marges haut/bas suffisantes pour ne pas coller au bord.

### Dashboard publications

Transformer les anciennes grandes cartes en cockpit :

- bande de metrics compacte avec 4-6 cellules en grille;
- chaque cellule : label mono, valeur, sous-label, icone petite;
- pas de gros cards arrondis;
- etats `empty`, `loading`, `auth missing`, `failed`;
- section `File recente` en table/list dense;
- section `Flux conseille` comme panneau operationnel, pas bloc editorial large.

### Composer publication

Le composer doit etre un poste de finalisation :

- colonne gauche : formulaire titre/slug/extrait/caption/statut/format;
- centre ou droite : preview image/social;
- rail droit : Meta OAuth + actions publication + plateformes;
- header interne avec statut brouillon/saved/sync;
- footer sticky ou toolbar action claire.

Les champs doivent ressembler a des controles cockpit :

- labels mono uppercase;
- inputs sombres;
- bordures fines;
- aides courtes;
- erreurs lisibles;
- pas de gros espaces vides.

### Liste publications

Liste attendue :

- table ou rows techniques;
- colonnes : titre, statut, format, plateformes, updatedAt, featured, actions;
- row selected visible;
- actions compactes avec icones lucide;
- empty state utile avec CTA vers mise en page.

### Preview

La preview doit devenir un module technique :

- cadre avec corner markers;
- metadata format/source;
- image stable, dimensions reservees;
- statut export/import;
- preview Instagram/Facebook conservee;
- pas de cadre style carte marketing.

### Meta OAuth

Le panneau OAuth doit etre un module de controle :

- etat connexion;
- plateformes disponibles;
- scopes/status;
- bouton connecter/deconnecter;
- erreurs et expiration token;
- texte court, operationnel.

## Interdits visuels

- Pas de hero marketing geant.
- Pas de cards arrondies `16px+`.
- Pas de gros blocs flottants avec ombre.
- Pas de palette vert/lime dominante qui diverge de Vibe_OS.
- Pas de blanc pur pour le texte.
- Pas de tout coller en haut de viewport.
- Pas de paragraphes explicatifs longs dans l'app.
- Pas de nested cards.
- Pas de bouton texte sans icone quand une icone lucide claire existe.
- Pas de changement fonctionnel Firebase/Meta sans raison.

## Accessibilite et responsive

Desktop :

- 1440x900 et 1920x1080 doivent avoir une grille propre;
- pas de vide absurde au centre;
- preview et actions visibles sans scroll excessif.

Mobile/tablette :

- 390x844, 768x1024;
- header compact;
- sections empilees dans l'ordre : actions, statut, composer, preview, liste;
- actions principales atteignables;
- pas d'overflow horizontal;
- textes dans boutons non coupes;
- preview ne doit pas couvrir le formulaire.

Focus :

- focus visible sur boutons/inputs;
- selection row visible autrement que par couleur;
- erreurs avec texte et action.

## Plan d'execution

1. Auditer l'etat actuel de `publications.css` et des composants.
2. Identifier les classes existantes a conserver pour ne pas casser le markup.
3. Proposer un `design_plan` court dans le rapport ou dans le message de travail :
   - grille;
   - header;
   - rails;
   - panels;
   - states;
   - mobile.
4. Refondre d'abord `publications.css` avec tokens Vibe_OS.
5. Ajuster le JSX seulement la ou la structure actuelle empeche le design.
6. Verifier les etats :
   - Firebase absent;
   - aucune publication;
   - publication selectionnee;
   - draft importe;
   - saving;
   - OAuth absent/connecte/expire;
   - erreurs upload/publication.
7. Tester responsive avec navigateur.
8. Mettre `map.md` a jour si structure modifiee.

## Tests obligatoires

Lancer :

```bash
npm run lint
npm run test:publication-flow
npm run test:studio-ui
npm run build
```

Si CSS ou layout studio global touche :

```bash
npm run test:routes
```

Si Functions ou rules touchees, ce qui ne devrait pas etre necessaire :

```bash
npm --prefix functions run lint
npm run test:emulators
```

## Verification navigateur

Ouvrir `/studio`.

Verifier :

- page publications au dashboard;
- bouton retour mise en page;
- import depuis mise en page vers publication;
- composer visible;
- preview visible;
- Meta OAuth panel visible;
- liste publications ou empty state propre;
- message `Firebase Auth n'est pas initialise` integre dans le design;
- desktop 1440x900;
- desktop 1920x1080;
- mobile 390x844;
- pas d'overlap;
- pas d'overflow horizontal.

Faire une capture avant/apres si possible.

## Definition de fini

La refonte est finie quand :

- la page publications ressemble a une extension naturelle de la mise en page Vibe_fx;
- le design suit le skill `design` Vibe_OS Cockpit;
- il y a un vrai header, des marges, une grille et des rails;
- containers, boutons, inputs, labels, couleurs et typo sont harmonises;
- la page n'est plus collee en haut;
- les workflows publication ne regressent pas;
- les etats loading/empty/error/auth sont propres;
- desktop et mobile sont verifies;
- les tests passent ou les blocages sont documentes.
