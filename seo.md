# seo.md - Agent SEO Google pour Vibe_fx V2

## Role de ce document

Ce fichier sert d'agent SEO permanent pour Vibe_fx V2. Il doit accompagner la conception, le developpement, les audits et le deploiement. Toute page publique doit passer par ce document avant publication.

## Sources officielles a privilegier

- Google Search Central - SEO Starter Guide : https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google Search Central - JavaScript SEO basics : https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Google Search Central - Dynamic rendering workaround : https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering
- Google Search Central - Helpful, reliable, people-first content : https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Google Search Central - Page experience : https://developers.google.com/search/docs/appearance/page-experience
- Firebase App Hosting : https://firebase.google.com/docs/app-hosting
- Firebase App Hosting frameworks/tooling : https://firebase.google.com/docs/app-hosting/frameworks-tooling

## Decision d'architecture SEO

Le projet doit passer sur Next.js App Router deploye avec Firebase App Hosting.

Pourquoi :

- Les pages publiques ont besoin de HTML indexable, metadata propres, liens crawlables et contenu disponible sans attendre toute l'app client.
- Google peut rendre JavaScript, mais la doc Google rappelle qu'il existe des limites et que le contenu important peut poser probleme s'il n'apparait qu'apres rendu JS.
- Google indique que le dynamic rendering est une solution de contournement, pas une solution long terme ; il faut preferer server-side rendering, static rendering ou hydration.
- Firebase App Hosting supporte officiellement Next.js et Angular avec build/deploy preconfigures.

## Regle de separation SEO/app

Pages indexables :

- `/` page d'accueil produit.
- `/outil-publication-reseaux-sociaux` page cible principale.
- `/editeur-image-instagram` intention outil image.
- `/publier-instagram-facebook` intention publication reseaux.
- `/ressources/*` guides SEO/editoriaux.
- `/templates/*` pages de modeles et formats.
- `/comparatifs/*` pages comparaison si utiles.

Pages noindex :

- `/studio`
- `/app`
- `/dashboard`
- `/admin`
- callbacks OAuth
- pages de preview privees

## Checklist technique par page publique

- Une seule balise `h1`, descriptive et utile.
- `title` unique, lisible et inferieur a environ 60 caracteres quand possible.
- `description` unique, claire, orientee utilisateur.
- Canonical explicite.
- URL courte, stable, lisible, sans parametre inutile.
- Contenu principal rendu cote serveur ou statique.
- Liens internes en vrais liens `<a>` ou `Link`, pas seulement boutons JS.
- Images avec `alt` utile quand l'image porte de l'information.
- Large media optimise, dimensions stables, lazy loading sauf hero prioritaire.
- JSON-LD adapte : `SoftwareApplication`, `Organization`, `FAQPage`, `HowTo`, `Article` selon page.
- Page presente dans `sitemap.xml` si elle doit etre indexee.
- Page non bloquee par `robots.txt` si elle doit etre indexee.
- Aucun contenu important cache derriere une interaction obligatoire.

## Strategie contenu

L'objectif n'est pas de remplir le site avec des textes SEO generiques. Google demande du contenu utile, fiable et cree pour les personnes. Les contenus doivent aider un createur, une PME, un community manager ou une agence a comprendre et executer un workflow concret.

Clusters prioritaires :

- Editeur image reseaux sociaux.
- Creer une publication Instagram professionnelle.
- Publier sur Facebook et Instagram depuis un site.
- Meta OAuth pour publication sociale.
- Formats Instagram : post, story, reel, carrousel.
- Workflow image vers publication reseaux.
- Outil marketing visuel pour petites equipes.

Types de pages a creer :

- Pages produit avec preuve visuelle de l'outil.
- Guides pratiques.
- Templates de formats sociaux.
- Comparatifs sobres contre Canva, Buffer, Meta Business Suite, Later, etc.
- Glossaire technique : OAuth Meta, Graph API, App Review, token page, Storage, publication carrousel.

## Strategie technique JavaScript SEO

- Ne pas faire du marketing en SPA client-only.
- Les pages marketing doivent etre server components ou static generated.
- Les composants interactifs lourds doivent etre charges seulement ou necessaire.
- Le studio image est un client component et peut rester noindex.
- Les donnees publiques importantes ne doivent pas dependre d'un token utilisateur.
- Les pages de ressources doivent avoir un HTML complet avant hydration.

## Performance et page experience

Gates cibles :

- LCP mobile sous 2.5 s sur pages publiques importantes.
- INP sous 200 ms.
- CLS sous 0.1.
- Hero avec dimensions reservees.
- Pas de bundle editeur sur les pages SEO.
- Fonts controlees via `next/font`.
- Images optimisees, formats modernes et tailles responsives.

## Audit SEO en trois passes

### Passe 1 - Enrichissement

- Identifier chaque intention de recherche.
- Definir URL, title, description, H1, sections, schema JSON-LD.
- Ajouter liens internes entre pages proches.
- Ajouter preuves produit : captures, videos courtes, exemples de rendus.

### Passe 2 - Audit

- Verifier rendu HTML avec JS desactive ou via inspection source prerender.
- Verifier robots/sitemap/canonical.
- Verifier absence de pages noindex dans sitemap.
- Verifier `npm run build`.
- Verifier les metadata Next.js.
- Verifier performance Lighthouse/PageSpeed en mobile.
- Verifier Search Console apres deploy.

### Passe 3 - Verification croisee Google

- Relire les points Google Search Central ci-dessus.
- Confirmer que le contenu est utile et pas cree seulement pour manipuler le ranking.
- Confirmer que les pages JavaScript critiques sont SSR/SSG/hydratees proprement.
- Confirmer que le dynamic rendering n'est pas utilise comme base.
- Confirmer que les signaux page experience ne remplacent pas la qualite du contenu.

## Definition de fini SEO

Une page publique est prete seulement si :

- elle a une intention claire ;
- son contenu principal est indexable ;
- ses metadata/canonical/schema/sitemap sont coherents ;
- elle charge vite sur mobile ;
- elle propose une vraie valeur utilisateur ;
- elle peut etre auditee dans Search Console apres mise en ligne.
