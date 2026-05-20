const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vibefx.app";

export const seoPages = {
  "/outil-publication-reseaux-sociaux": {
    slug: "/outil-publication-reseaux-sociaux",
    title: "Outil de publication reseaux sociaux",
    metaTitle: "Outil publication reseaux sociaux",
    description:
      "Preparez un visuel social, une caption et une diffusion Instagram/Facebook depuis un workflow web securise cote serveur.",
    h1: "Outil de publication pour Instagram, Facebook et site.",
    intro:
      "Vibe_fx V2 relie la creation visuelle, la preparation editoriale et la publication Meta OAuth dans un pipeline lisible pour les petites equipes marketing.",
    proof: "Pipeline image -> brouillon -> OAuth Meta",
    stats: ["SSR indexable", "Meta OAuth serveur", "Drafts ownerUid"],
    cards: [
      ["Canvas social", "Formats 4:5, 1:1, 9:16 et carrousels prets a exporter."],
      ["Composer editorial", "Titre, resume, caption, hashtags, statut et preview mobile dans le meme espace."],
      ["Publication controlee", "Les tokens Meta restent chiffres cote serveur et les statuts plateforme restent auditables."],
    ],
    steps: [
      ["01", "Creer", "Composez le visuel dans le studio."],
      ["02", "Finaliser", "Controlez caption, format, image et statut."],
      ["03", "Publier", "Diffusez sur le site puis Instagram/Facebook quand OAuth est connecte."],
    ],
    faq: [
      ["L'outil publie-t-il sans OAuth Meta ?", "Non. La publication reseaux passe par les APIs officielles Meta et par des fonctions serveur."],
      ["Le client voit-il les tokens Meta ?", "Non. Le client lit seulement un statut public de connexion."],
    ],
    schemaType: "SoftwareApplication",
  },
  "/editeur-image-instagram": {
    slug: "/editeur-image-instagram",
    title: "Editeur image Instagram",
    metaTitle: "Editeur image Instagram",
    description:
      "Creez des images Instagram en 4:5, story 9:16 ou carrousel, puis importez le rendu vers une publication prete a finaliser.",
    h1: "Editeur image Instagram pour visuels 4:5, stories et carrousels.",
    intro:
      "Le studio isole l'edition lourde dans `/studio` tout en gardant les pages publiques rapides, lisibles et indexables.",
    proof: "Studio image noindex, pages publiques SSR",
    stats: ["4:5 feed", "9:16 story", "Carrousel"],
    cards: [
      ["Formats sociaux", "Portrait, carre, story/reel cover et panoramas multi-slides."],
      ["Mise en page", "Textes, slots, fonds, flous, textures et positions gardent un contrat de payload propre."],
      ["Import publication", "Le rendu exporte devient un brouillon avec image principale et slides sociales."],
    ],
    steps: [
      ["01", "Importer", "Chargez l'image source ou un asset valide."],
      ["02", "Composer", "Ajustez format, texte, contraste, fonds et slots."],
      ["03", "Transferer", "Envoyez le rendu vers le composer publication."],
    ],
    faq: [
      ["Le studio est-il indexe ?", "Non. Le studio est prive/noindex; cette page publique explique le workflow en HTML SSR."],
      ["Les uploads persistent ou ?", "Les uploads utilisateur persistants doivent passer par Firebase Storage."],
    ],
    schemaType: "SoftwareApplication",
  },
  "/publier-instagram-facebook": {
    slug: "/publier-instagram-facebook",
    title: "Publier sur Instagram et Facebook",
    metaTitle: "Publier Instagram Facebook",
    description:
      "Publiez un visuel social vers Instagram et Facebook avec un flux Meta OAuth serveur, verrous anti-doublon et statuts par plateforme.",
    h1: "Publier sur Instagram et Facebook avec un flux OAuth serveur.",
    intro:
      "Vibe_fx V2 evite les secrets dans le navigateur: OAuth, token chiffre, lock anti-doublon et publication restent dans Firebase Functions.",
    proof: "Functions europe-west9 + token chiffre",
    stats: ["AES-256-GCM", "Lock Meta", "Statuts IG/FB"],
    cards: [
      ["Connexion Meta", "Creation d'URL OAuth, callback et stockage de connexion sont traites serveur."],
      ["Anti-doublon", "La publication prend un lock `metaSync` avant appel Graph API."],
      ["Statuts exploitables", "Instagram et Facebook gardent chacun leur resultat et leur erreur safe."],
    ],
    steps: [
      ["01", "Connecter", "L'utilisateur connecte sa Page et Instagram Business."],
      ["02", "Verifier", "La Function controle ownerUid, expiration token et cibles."],
      ["03", "Publier", "Le serveur appelle Graph API et met a jour les statuts."],
    ],
    faq: [
      ["Pourquoi pas publier depuis le client ?", "Parce que les tokens, secrets et controles anti-rejeu doivent rester cote serveur."],
      ["Le retour OAuth suffit-il a publier ?", "Non. Il connecte le compte; la publication reste une action controlee."],
    ],
    schemaType: "HowTo",
  },
  "/templates": {
    slug: "/templates",
    title: "Templates sociaux Vibe_fx",
    metaTitle: "Templates sociaux Vibe_fx",
    description:
      "Decouvrez les familles de templates et formats sociaux prevus pour preparer posts, stories, reels covers et carrousels.",
    h1: "Templates sociaux pour posts, stories et carrousels.",
    intro:
      "Les templates Vibe_fx cadrent les dimensions, les slots et les zones de texte avant l'export vers publication.",
    proof: "Formats + templates + garde-fous",
    stats: ["Portrait", "Story", "Pano"],
    cards: [
      ["Portrait 4:5", "Format feed prioritaire pour campagnes et visuels produit."],
      ["Story 9:16", "Zone verticale avec avertissements sur les zones UI."],
      ["Carrousel", "Slides generees a partir de formats panoramiques."],
    ],
    steps: [
      ["01", "Choisir", "Selectionnez un format social."],
      ["02", "Adapter", "Appliquez un template selon le nombre d'images."],
      ["03", "Exporter", "Generez image principale et slides."],
    ],
    faq: [
      ["Les templates sont-ils publics ?", "Les pages templates sont publiques; les projets et brouillons utilisateur restent prives."],
      ["Le reel est-il une image ?", "La couverture 9:16 existe, mais l'API Reels exige une video MP4 pour publier un Reel."],
    ],
    schemaType: "CollectionPage",
  },
  "/ressources/meta-oauth-publication-instagram-facebook": {
    slug: "/ressources/meta-oauth-publication-instagram-facebook",
    title: "Meta OAuth pour publication Instagram Facebook",
    metaTitle: "Meta OAuth Instagram Facebook",
    description:
      "Comprendre le flux Meta OAuth utilise par Vibe_fx pour connecter une Page Facebook et un compte Instagram Business sans exposer de token au client.",
    h1: "Meta OAuth pour publier vers Instagram et Facebook.",
    intro:
      "Cette ressource explique le flux cible: state temporaire, callback serveur, token page chiffre, statut public et publication controlee.",
    proof: "State temporaire + callback serveur",
    stats: ["State TTL", "Token chiffre", "No client secret"],
    cards: [
      ["State non rejouable", "Le callback reserve le state en transaction avant les appels Graph API."],
      ["Token protege", "Le token page est chiffre et n'est jamais retourne au navigateur."],
      ["Publication owner-only", "La Function verifie que la publication appartient a l'utilisateur connecte."],
    ],
    steps: [
      ["01", "Demande", "Le client demande une URL OAuth via callable auth."],
      ["02", "Callback", "Meta renvoie code et state vers une Function HTTPS."],
      ["03", "Connexion", "Le serveur echange le token et stocke une connexion sanitizee."],
    ],
    faq: [
      ["Pourquoi un state OAuth ?", "Il lie la demande a un utilisateur et limite le rejeu."],
      ["Ou sont stockes les tokens ?", "Dans Firestore cote serveur, sous forme chiffree, avec acces client interdit par rules."],
    ],
    schemaType: "Article",
  },
  "/ressources/formats-instagram": {
    slug: "/ressources/formats-instagram",
    title: "Formats Instagram utiles",
    metaTitle: "Formats Instagram utiles",
    description:
      "Guide pratique des formats Instagram geres par Vibe_fx: feed 4:5, carre, story 9:16, cover reel et carrousel.",
    h1: "Formats Instagram pour feed, story et carrousel.",
    intro:
      "Les formats sociaux influencent la composition, la lisibilite du texte et le type de publication possible via l'API Meta.",
    proof: "Dimensions et contraintes publication",
    stats: ["1080x1350", "1080x1080", "1080x1920"],
    cards: [
      ["Feed portrait", "1080 x 1350, ratio 4:5, utile pour occuper plus d'espace dans le fil."],
      ["Story", "1080 x 1920, ratio 9:16, avec zones UI a eviter pour le texte."],
      ["Carrousel", "Plusieurs slides, utiles pour campagnes et avant/apres."],
    ],
    steps: [
      ["01", "Dimensionner", "Choisir le ratio adapte au canal."],
      ["02", "Composer", "Garder le texte dans les zones lisibles."],
      ["03", "Verifier", "Utiliser le checker avant publication."],
    ],
    faq: [
      ["Un format 9:16 peut-il etre publie en Reel ?", "Pas comme image seule. L'API Reels demande une video_url MP4."],
      ["Combien de hashtags ?", "Le checker signale les limites classiques, dont 30 hashtags Instagram."],
    ],
    schemaType: "Article",
  },
  "/pricing": {
    slug: "/pricing",
    title: "Tarifs Vibe_fx",
    metaTitle: "Tarifs Vibe_fx",
    description:
      "Offre premium a paiement unique et packs de credits IA rechargeables, sans promesse d'IA illimitee.",
    h1: "Tarifs simples: premium non-IA et credits IA rechargeables.",
    intro:
      "Le modele cible separe l'acces premium aux outils et la consommation IA. Les credits sont accordes uniquement via webhook Stripe.",
    proof: "Stripe Checkout + ledger credits",
    stats: ["Premium", "Credits IA", "Webhook only"],
    cards: [
      ["Premium lifetime", "Acces aux outils non IA premium, sans credits IA illimites."],
      ["Packs credits", "500, 1200, 3200 ou 7000 credits internes selon le pack."],
      ["Fulfillment serveur", "Le retour success_url ne debloque rien; le webhook Stripe est la source de verite."],
    ],
    steps: [
      ["01", "Choisir", "Selectionnez premium ou un pack credits."],
      ["02", "Payer", "Checkout Session Stripe en mode payment."],
      ["03", "Crediter", "Webhook signe, transaction Firestore et ledger append-only."],
    ],
    faq: [
      ["Les credits IA sont-ils illimites ?", "Non. Les couts provider varient; chaque job IA doit reserver des credits."],
      ["Quand les credits sont-ils ajoutes ?", "Uniquement apres validation du webhook Stripe signe."],
    ],
    schemaType: "OfferCatalog",
  },
};

export function getSeoPage(slug) {
  return seoPages[slug];
}

export function buildSeoMetadata(page) {
  return {
    title: page.metaTitle,
    description: page.description,
    alternates: {
      canonical: page.slug,
    },
    openGraph: {
      title: page.title,
      description: page.description,
      url: page.slug,
      siteName: "Vibe_fx V2",
      type: "website",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function buildSeoJsonLd(page) {
  return {
    "@context": "https://schema.org",
    "@type": page.schemaType || "WebPage",
    name: page.title,
    url: `${siteUrl}${page.slug}`,
    inLanguage: "fr-FR",
    description: page.description,
    publisher: {
      "@type": "Organization",
      name: "Vibe_fx",
      url: siteUrl,
    },
    mainEntity: page.faq.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
  };
}

export const publicSeoRoutes = Object.keys(seoPages);
