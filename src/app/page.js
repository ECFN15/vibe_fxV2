import Link from "next/link";

const featureRows = [
  ["01", "Composer", "Formats post, story, reel, panorama et carrousel avec rendu canvas."],
  ["02", "Ajuster", "Images, textes, flous, bulles, fonds, slots, cadrage et preview sociale."],
  ["03", "Publier", "Brouillon site, upload Firebase Storage, publication Instagram/Facebook via Meta OAuth."],
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Vibe_fx V2",
  applicationCategory: "DesignApplication",
  operatingSystem: "Web",
  description:
    "Editeur web pour creer des visuels sociaux, preparer des publications et connecter Instagram/Facebook via Meta OAuth.",
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
          Vibe_fx V2
        </Link>
        <div className="vf-nav-links">
          <a href="#workflow">Workflow</a>
          <a href="#architecture">Architecture</a>
          <Link href="/studio">Studio</Link>
        </div>
      </nav>

      <section className="vf-hero">
        <div className="vf-hero-copy">
          <p className="vf-kicker">Cyber Neon / Dark UI / Firebase App Hosting</p>
          <h1>Un studio social pour creer une image et la publier sans changer d outil.</h1>
          <p>
            La V2 repart du moteur de mise en page existant, garde sa structure responsive,
            et prepare une architecture SEO-first pour transformer l outil en produit public.
          </p>
          <div className="vf-actions">
            <Link href="/studio" className="vf-primary">
              Ouvrir le studio
            </Link>
            <a href="#architecture" className="vf-secondary">
              Voir le plan
            </a>
          </div>
        </div>
        <div className="vf-terminal" aria-label="Apercu du workflow Vibe_fx">
          <div className="vf-terminal-head">
            <span />
            <span />
            <span />
            <strong>pipeline.live</strong>
          </div>
          {featureRows.map(([index, title, body]) => (
            <article key={index} className="vf-signal-row">
              <span>{index}</span>
              <div>
                <h2>{title}</h2>
                <p>{body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="workflow" className="vf-band">
        <p className="vf-kicker">Route produit cible</p>
        <h2>Mise en page vers publication reseaux.</h2>
        <div className="vf-grid">
          {["Importer une image", "Choisir un format social", "Modifier le rendu", "Importer vers publication", "Completer titre et caption", "Publier site + reseaux OAuth"].map((item) => (
            <div className="vf-card" key={item}>{item}</div>
          ))}
        </div>
      </section>

      <section id="architecture" className="vf-band vf-band-split">
        <div>
          <p className="vf-kicker">Choix technique</p>
          <h2>Next.js App Router sur Firebase App Hosting.</h2>
        </div>
        <p>
          Les pages publiques sont indexables avec metadata, sitemap, robots et JSON-LD.
          L editeur reste un client component isole, connecte a Firestore, Storage et Functions.
        </p>
      </section>
    </main>
  );
}
