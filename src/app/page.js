import Link from "next/link";
import Image from "next/image";

const featureCards = [
  {
    name: "Publication",
    href: "/outil-publication-reseaux-sociaux",
    status: "Draft ready",
    body: "Titre, caption, statut, preview sociale et dernier controle avant diffusion.",
  },
  {
    name: "Editeur",
    href: "/editeur-image-instagram",
    status: "Canvas live",
    body: "Image, textes, formats, flous et cadrage dans une surface de creation dediee.",
  },
  {
    name: "Templates",
    href: "/templates",
    status: "Format kit",
    body: "Post portrait, story, carrousel et annonces avec intentions de publication.",
  },
];

const navItems = [
  ["Publication", "/outil-publication-reseaux-sociaux"],
  ["Editeur", "/editeur-image-instagram"],
  ["Templates", "/templates"],
];

const pipelineSteps = [
  ["01", "Image", "Canvas editor"],
  ["02", "Brouillon", "Publication composer"],
  ["03", "Meta", "Instagram + Facebook"],
];

const socialPipeline = [
  ["Studio", "Creation du visuel", "Canvas, formats et templates"],
  ["Publication", "Brouillon pret", "Titre, caption et preview"],
  ["Instagram", "Envoi connecte", "Post ou story selon format"],
  ["Facebook", "Diffusion page", "Statut de publication suivi"],
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Vibe_fx V2",
  url: "https://vibefx.app/",
  inLanguage: "fr-FR",
  applicationCategory: "DesignApplication",
  operatingSystem: "Web",
  description:
    "Studio web SEO-first pour creer des visuels sociaux, preparer des publications et publier vers Instagram et Facebook via Meta OAuth cote serveur.",
  publisher: {
    "@type": "Organization",
    name: "Vibe_fx",
    url: "https://vibefx.app/",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
  },
};

export default function Home() {
  return (
    <main className="vf-home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="vf-nav" aria-label="Navigation principale">
        <Link href="/" className="vf-brand" aria-label="Vibe_fx V2 accueil">
          <span className="vf-brand-mark" aria-hidden="true" />
          Vibe_fx
        </Link>
        <div className="vf-nav-links">
          {navItems.map(([label, href]) => (
            <Link href={href} key={label}>
              <span className="vf-nav-link-dot" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </div>
        <Link href="/studio" className="vf-nav-cta">
          Launch app
        </Link>
      </nav>

      <section className="vf-hero" aria-labelledby="home-title">
        <div className="vf-hero-copy">
          <h1 id="home-title">
            Cree ton visuel social. Publie sur Instagram et Facebook.
          </h1>
          <p>
            Vibe_fx V2 rassemble editeur d&apos;image, templates sociaux,
            brouillon de publication et pipeline Instagram/Facebook dans une
            page SSR rapide, indexable et prete pour transformer le studio en
            produit public.
          </p>
          <div className="vf-actions" aria-label="Actions principales">
            <Link href="/studio" className="vf-primary">
              Launch app
            </Link>
            <Link href="/templates" className="vf-secondary">
              Explorer les templates
            </Link>
          </div>
          <div className="vf-hero-stats" aria-label="Statuts du workflow">
            <span>Canvas pret</span>
            <span>Brouillon sync</span>
            <span>OAuth Meta serveur</span>
          </div>
        </div>

        <div className="vf-product-shell" aria-label="Apercu du studio Vibe_fx">
          <div className="vf-shell-topbar">
            <span className="vf-live-dot" aria-hidden="true" />
            <strong>studio.vibefx</strong>
            <em>SSR product proof</em>
          </div>

          <div className="vf-shell-grid">
            <section className="vf-editor-preview" aria-labelledby="editor-preview-title">
              <div className="vf-editor-toolbar" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="vf-canvas-card">
                <Image
                  src="/assets/vibefx/demo-astronaut.png"
                  alt="Apercu d'un visuel social cree dans l'editeur Vibe_fx"
                  fill
                  priority
                  sizes="(max-width: 860px) 100vw, 38vw"
                />
                <div className="vf-canvas-overlay">
                  <span>4:5 portrait</span>
                  <strong id="editor-preview-title">Social image editor</strong>
                </div>
              </div>
            </section>

            <section className="vf-publish-panel" aria-labelledby="publish-panel-title">
              <div>
                <span className="vf-mini-label">Publication</span>
                <h2 id="publish-panel-title">Pipeline instantane quand Meta OAuth est pret.</h2>
              </div>
              <ol className="vf-pipeline">
                {pipelineSteps.map(([index, title, detail]) => (
                  <li key={title}>
                    <span>{index}</span>
                    <div>
                      <strong>{title}</strong>
                      <small>{detail}</small>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="vf-platforms" aria-label="Plateformes cible">
                <span>Instagram</span>
                <span>Facebook</span>
                <span>Site</span>
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="vf-feature-band" aria-label="Fonctionnalites principales">
        {featureCards.map((card) => (
          <Link href={card.href} className="vf-feature-card" key={card.name}>
            <span>{card.status}</span>
            <h2>{card.name}</h2>
            <p>{card.body}</p>
          </Link>
        ))}
      </section>

      <section className="vf-social-pipeline" aria-labelledby="social-pipeline-title">
        <div className="vf-social-pipeline-copy">
          <span className="vf-mini-label">Pipeline live</span>
          <h2 id="social-pipeline-title">
            Du visuel au post publie, Instagram et Facebook restent dans le meme flux.
          </h2>
          <p>
            Compose l&apos;image, transforme-la en publication, connecte Meta OAuth
            quand ton compte est pret, puis suis le statut plateforme par plateforme.
          </p>
        </div>

        <div className="vf-social-flow" aria-label="Pipeline de publication sociale">
          <div className="vf-social-beam" aria-hidden="true" />
          {socialPipeline.map(([title, status, detail], index) => (
            <article className="vf-social-node" style={{ "--node-index": index }} key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <strong>{status}</strong>
              <p>{detail}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
