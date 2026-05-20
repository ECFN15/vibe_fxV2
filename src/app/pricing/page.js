import Link from "next/link";
import { buildSeoJsonLd, buildSeoMetadata, getSeoPage } from "../seo-pages";

const page = getSeoPage("/pricing");

export const metadata = buildSeoMetadata(page);

const offers = [
  {
    name: "Premium lifetime",
    price: "29 EUR",
    tag: "Acces produit",
    description: "Debloque les outils non IA premium: workflows avances, exports plus longs et surfaces pro.",
    details: ["Paiement unique", "Pas d'IA illimitee", "Credits IA vendus separement"],
    productKey: "premium_lifetime",
  },
  {
    name: "500 credits",
    price: "5 EUR",
    tag: "Starter IA",
    description: "Pack de test pour captions, rewrites courts et premiers jobs IA controles.",
    details: ["1 credit ~= 0,01 EUR", "Ledger append-only", "Webhook Stripe obligatoire"],
    productKey: "credits_500",
  },
  {
    name: "1 200 credits",
    price: "10 EUR",
    tag: "Createur",
    description: "Pack createur leger avec meilleur ratio de credits pour usage regulier.",
    details: ["Credits payes", "Reservations anti double-clic", "Refund serveur si provider echoue"],
    productKey: "credits_1200",
    highlighted: true,
  },
  {
    name: "3 200 credits",
    price: "25 EUR",
    tag: "Production",
    description: "Pack pour generation image standard, batchs et exports avances quand les providers seront valides.",
    details: ["Marge cible 55%+ image", "Policy runtime", "Kill switch provider"],
    productKey: "credits_3200",
  },
  {
    name: "7 000 credits",
    price: "50 EUR",
    tag: "Studio",
    description: "Pack studio pour equipes qui enchainent assets, variantes et jobs media couteux.",
    details: ["Budget cap requis", "Audit provider", "Pas de provider non officiel"],
    productKey: "credits_7000",
  },
];

const tokenomics = [
  ["Unite client", "1 credit ~= 0,01 EUR de valeur affichee"],
  ["Source de verite", "users/{uid}/creditLedger + webhook Stripe signe"],
  ["Reservation", "createAiJob reserve avant appel provider, puis capture ou release"],
  ["Marge texte", "70%+ cible apres cout provider, Stripe, Firebase et risk buffer"],
  ["Marge image", "55%+ cible, provider reel bloque tant que benchmark absent"],
  ["Video IA", "45%+ minimum, jamais exposee sans benchmark legal/cout"],
  ["Provider reels", "productionAllowed=false jusqu'a pricing snapshot + legal review"],
];

const safeguards = [
  "Le client ne modifie jamais les credits.",
  "Le retour success_url Stripe ne credite rien.",
  "Les jobs IA sans credits sont refuses cote serveur.",
  "Midjourney et les scrapers restent bloques en SaaS public.",
];

export default function PricingPage() {
  const jsonLd = buildSeoJsonLd(page);

  return (
    <main className="vf-home vf-pricing-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="vf-nav" aria-label="Navigation principale">
        <Link href="/" className="vf-brand" aria-label="Vibe_fx V2 accueil">
          <span className="vf-brand-mark" aria-hidden="true" />
          Vibe_fx
        </Link>
        <div className="vf-nav-links" aria-label="Sections produit">
          <Link href="/account">
            <span className="vf-nav-link-dot" aria-hidden="true" />
            Compte
          </Link>
          <Link href="/studio">
            <span className="vf-nav-link-dot" aria-hidden="true" />
            Studio
          </Link>
        </div>
        <Link href="/account/billing" className="vf-nav-cta">
          Acheter
        </Link>
      </nav>

      <section className="vf-pricing-hero" aria-labelledby="pricing-title">
        <div className="vf-pricing-copy">
          <p className="vf-kicker">Tokenomics</p>
          <h1 id="pricing-title">Premium separe des credits IA.</h1>
          <p>
            Vibe_fx ne vend pas d&apos;IA illimitee. Le premium donne acces aux outils non IA,
            puis chaque job IA reserve des credits avec une policy serveur, un ledger et une marge cible.
          </p>
          <div className="vf-actions">
            <Link href="/account/billing" className="vf-primary">
              Ouvrir la boutique
            </Link>
            <Link href="/account/usage" className="vf-secondary">
              Voir usage
            </Link>
          </div>
        </div>

        <aside className="vf-pricing-ledger" aria-label="Resume credits">
          <div className="vf-shell-topbar">
            <span className="vf-live-dot" aria-hidden="true" />
            <strong>credit.ledger</strong>
            <em>webhook only</em>
          </div>
          <dl>
            <div>
              <dt>Credit unit</dt>
              <dd>0,01 EUR</dd>
            </div>
            <div>
              <dt>Fulfillment</dt>
              <dd>Stripe webhook</dd>
            </div>
            <div>
              <dt>AI providers</dt>
              <dd>locked</dd>
            </div>
            <div>
              <dt>Double debit</dt>
              <dd>idempotent</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="vf-pricing-grid" aria-label="Offres Vibe_fx">
        {offers.map((offer) => (
          <article className="vf-price-card" data-highlighted={offer.highlighted ? "true" : "false"} key={offer.productKey}>
            <span>{offer.tag}</span>
            <h2>{offer.name}</h2>
            <strong>{offer.price}</strong>
            <p>{offer.description}</p>
            <ul>
              {offer.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
            <Link href={`/account/billing?product=${offer.productKey}`}>
              Acheter via compte
            </Link>
          </article>
        ))}
      </section>

      <section className="vf-tokenomics" aria-labelledby="tokenomics-title">
        <div>
          <p className="vf-kicker">Pricing policy</p>
          <h2 id="tokenomics-title">Ce que l&apos;utilisateur doit comprendre.</h2>
          <p>
            Le prix client est stable en credits, mais le cout provider reste un cout serveur audite.
            Les providers reels restent des candidats tant que les snapshots de prix et les droits ne sont pas valides.
          </p>
        </div>
        <div className="vf-tokenomics-table">
          {tokenomics.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="vf-pricing-guards" aria-label="Garde-fous paiement et IA">
        {safeguards.map((guard) => (
          <article key={guard}>
            <span>Guard</span>
            <p>{guard}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
