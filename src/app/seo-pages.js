const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vibefx.app";

export const seoPages = [
  {
    slug: "outil-publication-reseaux-sociaux",
    path: "/outil-publication-reseaux-sociaux",
    kind: "SoftwareApplication",
    title: "Outil publication reseaux sociaux",
    metaTitle: "Outil publication reseaux sociaux",
    description:
      "Preparez vos visuels, captions, previews Instagram/Facebook et statuts de publication dans un studio web pense pour les equipes sociales.",
    eyebrow: "Workflow social",
    h1: "Un outil de publication reseaux sociaux avec creation visuelle integree.",
    intro:
      "Vibe_fx rassemble la mise en page, la preparation editoriale et le controle des formats avant publication. Le studio part d'un rendu image, puis le transforme en brouillon social pret a verifier.",
    primaryAction: "Ouvrir le studio",
    secondaryAction: "Voir les formats",
    secondaryHref: "/ressources/formats-instagram",
    terminalTitle: "publication.pipeline",
    steps: [
      "Composer une image sociale dans le studio.",
      "Importer le rendu vers la publication.",
      "Verifier titre, caption, image et plateformes.",
      "Publier sur le site puis vers Meta quand OAuth est pret.",
    ],
    metrics: ["Draft first", "Instagram/Facebook", "Firebase ready"],
    sections: [
      {
        title: "Un parcours de production continu.",
        body:
          "Le createur ne quitte pas l'outil entre le visuel et la publication. Les donnees utiles restent liees au brouillon, avec ownerUid, statut et image finale.",
      },
      {
        title: "Des surfaces privees separees du SEO.",
        body:
          "Les pages publiques restent indexables. Le studio et les workflows prives sont noindex et isoles du rendu marketing.",
      },
    ],
    cards: [
      "Formats post, story, reel et panorama",
      "Caption, hashtags et controle visuel",
      "Preview Instagram et Facebook",
      "Publication Meta par OAuth cote serveur",
    ],
    faq: [
      ["L'outil remplace-t-il Meta Business Suite ?", "Non. Il prepare les visuels et automatise le pont de publication quand les permissions Meta sont configurees."],
      ["Peut-on garder des brouillons ?", "Oui. Les publications sont rattachees a l'utilisateur connecte et peuvent rester en brouillon avant diffusion."],
    ],
  },
  {
    slug: "editeur-image-instagram",
    path: "/editeur-image-instagram",
    kind: "SoftwareApplication",
    title: "Editeur image Instagram",
    metaTitle: "Editeur image Instagram",
    description:
      "Creez des images Instagram en formats feed, story, reel cover et carousel avec un editeur web canvas, preview et export vers publication.",
    eyebrow: "Image Instagram",
    h1: "Cree une mise en page Instagram sans quitter le studio.",
    intro:
      "Un canvas sombre, des formats sociaux prets, des controles proches de l'image et un export direct vers la publication.",
    primaryAction: "Creer une mise en page",
    secondaryAction: "Voir les formats",
    secondaryHref: "/ressources/formats-instagram",
    terminalTitle: "canvas.renderer",
    steps: [
      "Importer ou choisir une image de depart.",
      "Ajuster cadrage, textes, flous et fond.",
      "Controler le rendu dans le format cible.",
      "Envoyer l'image vers la page publication.",
    ],
    metrics: ["Canvas", "4:5 / 9:16", "Preview sociale"],
    sections: [
      {
        title: "Des formats sociaux sans tableur de dimensions.",
        body:
          "Les ratios et zones de preview guident le rendu pour eviter les coupes visibles au moment de publier sur Instagram.",
      },
      {
        title: "Un editeur isole du reste du site.",
        body:
          "La surface de travail reste un client component. Les pages SEO n'ont pas besoin de charger le studio pour etre indexables.",
      },
    ],
    cards: ["Post portrait", "Story 9:16", "Cover reel", "Carrousel"],
    faq: [
      ["Peut-on modifier les textes dans l'image ?", "Oui. Le studio gere des calques texte et des controles de style avant export."],
      ["Le rendu est-il adapte aux stories ?", "Oui. Les previews signalent les zones sensibles des formats verticaux."],
    ],
  },
  {
    slug: "publier-instagram-facebook",
    path: "/publier-instagram-facebook",
    kind: "SoftwareApplication",
    title: "Publier Instagram Facebook",
    metaTitle: "Publier Instagram et Facebook",
    description:
      "Preparez une publication web puis connectez Instagram et Facebook via Meta OAuth pour publier depuis un backend Firebase securise.",
    eyebrow: "Meta OAuth",
    h1: "Publier sur Instagram et Facebook depuis un workflow Firebase securise.",
    intro:
      "La publication reseaux reste cote serveur: OAuth Meta, chiffrement du token, anti-doublon et statuts plateforme sont portes par Firebase Functions.",
    primaryAction: "Preparer une publication",
    secondaryAction: "Comprendre OAuth",
    secondaryHref: "/ressources/meta-oauth-publication-instagram-facebook",
    terminalTitle: "meta.oauth.status",
    steps: [
      "Creer ou ouvrir un brouillon de publication.",
      "Connecter le compte Meta quand le projet Firebase est pret.",
      "Choisir Instagram, Facebook ou les deux plateformes.",
      "Suivre les statuts et erreurs de publication.",
    ],
    metrics: ["OAuth serveur", "Lock anti-doublon", "Statuts plateforme"],
    sections: [
      {
        title: "Les secrets ne quittent pas le serveur.",
        body:
          "Les identifiants Meta et Firebase sont attendus dans Secret Manager ou variables d'environnement deployees, jamais dans le client.",
      },
      {
        title: "Chaque publication reste proprietaire.",
        body:
          "Les donnees Firestore portent ownerUid et les uploads partent dans un chemin Storage utilisateur.",
      },
    ],
    cards: ["Connexion Meta", "Publication Instagram", "Publication Facebook", "Disconnect OAuth"],
    faq: [
      ["Faut-il configurer une app Meta ?", "Oui. L'OAuth complet demande une app Meta, les scopes, une redirect URI et les secrets deployes."],
      ["La publication manuelle reste-t-elle possible ?", "Oui. Une voie manuelle admin peut rester disponible pour debug ou transition."],
    ],
  },
  {
    slug: "templates",
    path: "/templates",
    kind: "CollectionPage",
    title: "Templates sociaux",
    metaTitle: "Templates Instagram et reseaux sociaux",
    description:
      "Explorez les templates cible de Vibe_fx pour posts Instagram, stories, reels, panoramas et carrousels sociaux.",
    eyebrow: "Templates",
    h1: "Choisis un template social et transforme-le en publication.",
    intro:
      "Des bases graphiques pour post, story, carrousel et annonce, pensees pour partir vite puis personnaliser dans l'editeur.",
    primaryAction: "Choisir un template",
    secondaryAction: "Voir l'editeur",
    secondaryHref: "/editeur-image-instagram",
    terminalTitle: "template.registry",
    steps: [
      "Choisir un format de depart.",
      "Remplacer images et textes.",
      "Verifier les zones de coupe.",
      "Exporter vers publication.",
    ],
    metrics: ["Post", "Story", "Carrousel"],
    sections: [
      {
        title: "Un systeme de templates, pas une galerie decorative.",
        body:
          "Chaque template doit porter une intention de publication claire: annonce, preuve sociale, promotion, evenement ou ressource.",
      },
      {
        title: "Des formats prets pour la suite du workflow.",
        body:
          "Les templates seront relies au composer afin que le rendu image garde ses metadonnees utiles pour la publication.",
      },
    ],
    cards: ["Post Instagram portrait", "Story verticale", "Carrousel educatif", "Annonce evenement"],
    faq: [
      ["Les templates sont-ils deja tous finalises ?", "Non. Cette page pose l'architecture SEO et produit avant enrichissement de la bibliotheque."],
      ["Peut-on partir d'une image libre ?", "Oui. Les templates n'empechent pas l'import direct d'une image."],
    ],
  },
  {
    slug: "ressources/meta-oauth-publication-instagram-facebook",
    path: "/ressources/meta-oauth-publication-instagram-facebook",
    kind: "Article",
    title: "Meta OAuth publication Instagram Facebook",
    metaTitle: "Meta OAuth pour publier sur Instagram et Facebook",
    description:
      "Comprendre le role de Meta OAuth, des tokens, des pages Facebook et du compte Instagram Business dans un workflow de publication web.",
    eyebrow: "Ressource technique",
    h1: "Meta OAuth pour publier sur Instagram et Facebook depuis un site web.",
    intro:
      "Cette ressource explique le modele cible Vibe_fx: connexion utilisateur, stockage minimal des tokens, publication serveur et deconnexion propre.",
    primaryAction: "Voir le workflow Meta",
    secondaryAction: "Page publication",
    secondaryHref: "/publier-instagram-facebook",
    terminalTitle: "oauth.callback",
    steps: [
      "Generer une URL de connexion Meta cote serveur.",
      "Recevoir le callback et echanger le code.",
      "Associer page Facebook et compte Instagram Business.",
      "Publier avec locks et statuts persistants.",
    ],
    metrics: ["Secret Manager", "Callback", "Token storage"],
    sections: [
      {
        title: "OAuth est une frontiere serveur.",
        body:
          "Le client declenche la connexion, mais les secrets, l'echange de code et la publication restent dans Firebase Functions.",
      },
      {
        title: "Le modele multi-utilisateur est obligatoire.",
        body:
          "Chaque connexion Meta et chaque publication doivent etre rattachees a l'uid Firebase de l'utilisateur.",
      },
    ],
    cards: ["Scopes Meta", "Redirect URI", "Compte Instagram Business", "Anti-doublon"],
    faq: [
      ["Pourquoi passer par Facebook pour Instagram ?", "L'API Instagram Publishing fonctionne avec un compte Instagram Business ou Creator relie a une page Facebook."],
      ["Ou stocker les secrets ?", "Dans Firebase Secret Manager ou les secrets de l'environnement de deploiement, jamais dans le bundle client."],
    ],
  },
  {
    slug: "ressources/formats-instagram",
    path: "/ressources/formats-instagram",
    kind: "Article",
    title: "Formats Instagram",
    metaTitle: "Formats Instagram pour posts, stories et reels",
    description:
      "Guide des formats Instagram a gerer dans Vibe_fx: post portrait, carre, story, reel cover, panorama et carrousel.",
    eyebrow: "Guide formats",
    h1: "Formats Instagram: ratios utiles pour creer sans recadrage surprise.",
    intro:
      "Un bon workflow social commence par le ratio. Vibe_fx structure les formats pour que le rendu image, la preview et la publication utilisent la meme intention.",
    primaryAction: "Tester un format",
    secondaryAction: "Voir l'editeur",
    secondaryHref: "/editeur-image-instagram",
    terminalTitle: "format.checker",
    steps: [
      "Choisir le type de publication.",
      "Verifier ratio et zones sensibles.",
      "Adapter textes et image au cadre.",
      "Exporter vers le brouillon social.",
    ],
    metrics: ["1:1", "4:5", "9:16"],
    sections: [
      {
        title: "Le format influence le contenu.",
        body:
          "Une story ne se lit pas comme un post feed. Les zones UI et les coupes changent le placement des textes.",
      },
      {
        title: "La preview evite les erreurs tardives.",
        body:
          "Le controle avant publication detecte les textes proches des zones sensibles et les captions trop pauvres.",
      },
    ],
    cards: ["Feed 1:1", "Feed 4:5", "Story 9:16", "Reel cover"],
    faq: [
      ["Quel format privilegier pour le feed ?", "Le portrait 4:5 maximise souvent la surface visible dans le feed tout en restant compatible."],
      ["Une image 9:16 suffit-elle pour un reel ?", "Non. Pour publier un Reel via API, il faut une video; l'image peut servir de story ou de cover selon le workflow."],
    ],
  },
];

export function getSeoPage(slug) {
  const page = seoPages.find((item) => item.slug === slug);
  if (!page) {
    throw new Error(`Unknown SEO page: ${slug}`);
  }
  return page;
}

export function absoluteUrl(path) {
  return new URL(path, baseUrl).toString();
}

export function createSeoMetadata(page) {
  return {
    title: page.metaTitle,
    description: page.description,
    alternates: {
      canonical: page.path,
    },
    openGraph: {
      title: page.metaTitle,
      description: page.description,
      url: page.path,
      siteName: "Vibe_fx V2",
      type: page.kind === "Article" ? "article" : "website",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function createJsonLd(page) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": page.kind,
        "@id": `${absoluteUrl(page.path)}#page`,
        name: page.title,
        headline: page.h1,
        description: page.description,
        url: absoluteUrl(page.path),
        inLanguage: "fr-FR",
        isPartOf: {
          "@type": "WebSite",
          name: "Vibe_fx V2",
          url: absoluteUrl("/"),
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${absoluteUrl(page.path)}#faq`,
        mainEntity: page.faq.map(([question, answer]) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: {
            "@type": "Answer",
            text: answer,
          },
        })),
      },
    ],
  };
}
