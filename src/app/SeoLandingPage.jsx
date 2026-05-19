import Image from "next/image";
import Link from "next/link";
import { createJsonLd, seoPages } from "./seo-pages";

const graphicPages = {
  "editeur-image-instagram": {
    mode: "editor",
    proofTitle: "Interface mise en page",
    proofStatus: "Canvas actif",
    primaryHref: "/studio",
    secondaryHref: "/templates",
    chips: ["Post 4:5", "Story 9:16", "Texte", "Flou", "Export"],
    sidePanels: [
      ["Format", "Post Instagram portrait", "4:5"],
      ["Calque", "Titre + image", "2 actifs"],
      ["Export", "Vers publication", "Pret"],
    ],
    cards: [
      ["01", "Canvas central", "Un visuel lisible avec cadre, image et zone texte."],
      ["02", "Panneaux proches", "Formats, fond, texte et geometrie restent autour du rendu."],
      ["03", "Export propre", "La mise en page part vers Publication avec image et format."],
    ],
  },
  templates: {
    mode: "templates",
    proofTitle: "Template rack",
    proofStatus: "4 formats prets",
    primaryHref: "/studio",
    secondaryHref: "/editeur-image-instagram",
    chips: ["Portrait", "Story", "Carrousel", "Annonce", "Promo"],
    sidePanels: [
      ["Portrait", "Feed 4:5", "Impact"],
      ["Story", "9:16", "Plein ecran"],
      ["Carrousel", "Multi-slide", "Guide"],
    ],
    cards: [
      ["01", "Choisir une base", "Un format et une intention: annonce, guide, preuve ou promo."],
      ["02", "Personnaliser", "Image, texte et ambiance changent dans l'editeur."],
      ["03", "Publier", "Le template devient un brouillon pret pour Instagram/Facebook."],
    ],
  },
};

function PublicNav() {
  return (
    <nav className="vf-seo-nav" aria-label="Navigation publique">
      <Link href="/" className="vf-brand" aria-label="Vibe_fx V2 accueil">
        <span className="vf-brand-mark" aria-hidden="true" />
        Vibe_fx
      </Link>
      <div className="vf-seo-nav__links">
        <Link href="/outil-publication-reseaux-sociaux">Publication</Link>
        <Link href="/editeur-image-instagram">Editeur</Link>
        <Link href="/templates">Templates</Link>
      </div>
    </nav>
  );
}

function GraphicLandingPage({ page, data, jsonLd, relatedPages }) {
  return (
    <main className={`vf-seo vf-graphic-page vf-graphic-page--${data.mode}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicNav />

      <section className="vf-graphic-hero">
        <div className="vf-graphic-copy">
          <p className="vf-kicker">{page.eyebrow}</p>
          <h1>{page.h1}</h1>
          <p>{page.intro}</p>
          <div className="vf-actions">
            <Link href={data.primaryHref} className="vf-primary">
              {page.primaryAction}
            </Link>
            <Link href={data.secondaryHref} className="vf-secondary">
              {page.secondaryAction}
            </Link>
          </div>
          <div className="vf-graphic-chipline" aria-label="Controles disponibles">
            {data.chips.map((chip) => (
              <span key={chip}>{chip}</span>
            ))}
          </div>
        </div>

        <div className="vf-editor-mockup" aria-label={data.proofTitle}>
          <div className="vf-editor-mockup__top">
            <span aria-hidden="true" />
            <strong>{data.proofTitle}</strong>
            <em>{data.proofStatus}</em>
          </div>
          <div className="vf-editor-mockup__body">
            <div className="vf-editor-mockup__rail" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="vf-editor-canvas">
              {data.mode === "templates" ? (
                <div className="vf-template-rack" aria-hidden="true">
                  {["Post", "Story", "Carousel", "Promo"].map((template, index) => (
                    <div className="vf-template-tile" style={{ "--tile-index": index }} key={template}>
                      <span>{template}</span>
                      <strong>{index === 1 ? "9:16" : index === 2 ? "x5" : "4:5"}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <Image
                  src="/assets/vibefx/demo-astronaut.png"
                  alt="Apercu graphique d'une mise en page Vibe_fx"
                  fill
                  priority
                  sizes="(max-width: 860px) 100vw, 38vw"
                />
              )}
              <div className="vf-editor-canvas__caption">
                <span>{data.mode === "editor" ? "Mise en page" : "Template social"}</span>
                <strong>{data.mode === "editor" ? "Neon launch post" : "Post / Story / Carousel"}</strong>
              </div>
            </div>
            <div className="vf-editor-side">
              {data.sidePanels.map(([label, title, meta]) => (
                <article key={label}>
                  <span>{label}</span>
                  <strong>{title}</strong>
                  <em>{meta}</em>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="vf-graphic-cards" aria-label="Points forts">
        {data.cards.map(([index, title, body]) => (
          <article key={title}>
            <span>{index}</span>
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </section>

      <section className="vf-graphic-related" aria-label="Pages liees">
        {relatedPages.map((related) => (
          <Link key={related.path} href={related.path}>
            <span>{related.eyebrow}</span>
            {related.title}
          </Link>
        ))}
      </section>
    </main>
  );
}

const publicationRoutes = [
  {
    key: "website",
    label: "Your website",
    meta: "Live page",
    badge: "WEB",
    icon: "site",
    x: "28%",
    y: "29%",
    pulseDelay: 4.55,
    path: "M362 202 C322 188 294 122 244 122",
  },
  {
    key: "instagram",
    label: "Instagram",
    meta: "Feed / story",
    badge: "IG",
    icon: "instagram",
    x: "28%",
    y: "50%",
    pulseDelay: 1.55,
    path: "M362 210 C324 210 294 210 244 210",
  },
  {
    key: "facebook",
    label: "Facebook",
    meta: "Page post",
    badge: "FB",
    icon: "facebook",
    x: "28%",
    y: "71%",
    pulseDelay: 3.05,
    path: "M362 218 C322 232 294 298 244 298",
  },
];

const routeCycle = "6.4s";

const oauthRoute = {
  pulseDelay: 0,
  path: "M526 210 C498 210 474 210 432 210",
};

const vibeFxBubbles = [
  [538, 206, 525, 199, 501, 203, 3.4, 5.8, "-.8s"],
  [545, 214, 530, 224, 507, 217, 2.2, 7.2, "-2.1s"],
  [534, 218, 518, 211, 492, 222, 4.8, 8.4, "-4.7s"],
  [548, 204, 533, 195, 512, 199, 1.8, 6.6, "-1.4s"],
  [540, 211, 522, 217, 486, 209, 3.9, 9.1, "-6.2s"],
  [532, 203, 517, 195, 497, 187, 2.6, 7.8, "-3.2s"],
  [551, 219, 535, 228, 516, 236, 3.1, 8.8, "-5.4s"],
  [536, 213, 516, 207, 489, 214, 5.6, 10.2, "-7.1s"],
  [544, 201, 529, 193, 505, 195, 2.1, 6.1, "-.2s"],
  [530, 209, 511, 216, 482, 204, 3.6, 9.7, "-8.5s"],
  [549, 210, 531, 207, 513, 214, 2.8, 7.5, "-3.9s"],
  [535, 222, 520, 231, 498, 226, 1.7, 5.4, "-1.9s"],
  [542, 216, 523, 213, 494, 219, 4.2, 8.1, "-6.8s"],
  [533, 206, 515, 200, 490, 194, 2.4, 6.9, "-4.2s"],
  [547, 217, 528, 221, 503, 231, 3.3, 9.4, "-7.8s"],
];

function VibeFxBubbleStream() {
  return (
    <g className="vf-route-bubbles" aria-hidden="true">
      {vibeFxBubbles.map(([x1, y1, x2, y2, x3, y3, radius, duration, begin], index) => {
        return (
          <circle className="vf-route-bubble" cx={x1} cy={y1} r="0" opacity="0" key={`${x1}-${y1}-${index}`}>
            <animate
              attributeName="cx"
              dur={`${duration}s`}
              begin={begin}
              values={`${x1};${x2};${x3};${x1}`}
              keyTimes="0;.26;.82;1"
              calcMode="spline"
              keySplines=".2 .7 .25 1;.37 0 .2 1;.7 0 .84 .24"
              repeatCount="indefinite"
            />
            <animate
              attributeName="cy"
              dur={`${duration}s`}
              begin={begin}
              values={`${y1};${y2};${y3};${y1}`}
              keyTimes="0;.26;.82;1"
              calcMode="spline"
              keySplines=".2 .7 .25 1;.37 0 .2 1;.7 0 .84 .24"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              dur={`${duration}s`}
              begin={begin}
              values="0;.64;.48;.12;0"
              keyTimes="0;.14;.58;.84;1"
              calcMode="spline"
              keySplines=".2 .7 .25 1;.37 0 .2 1;.7 0 .84 .24;.7 0 .84 .24"
              repeatCount="indefinite"
            />
            <animate
              attributeName="r"
              dur={`${duration}s`}
              begin={begin}
              values={`0;${radius};${(radius * .82).toFixed(1)};${(radius * .36).toFixed(1)};0`}
              keyTimes="0;.18;.62;.86;1"
              calcMode="spline"
              keySplines=".2 .7 .25 1;.37 0 .2 1;.7 0 .84 .24;.7 0 .84 .24"
              repeatCount="indefinite"
            />
          </circle>
        );
      })}
    </g>
  );
}

function RouteIcon({ icon }) {
  if (icon === "instagram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id="vf-instagram-gradient-a" cx="30%" cy="107%" r="130%">
            <stop offset="0" stopColor="#fdf497" />
            <stop offset=".18" stopColor="#fdf497" />
            <stop offset=".45" stopColor="#fd5949" />
            <stop offset=".72" stopColor="#d6249f" />
            <stop offset="1" stopColor="#285AEB" />
          </radialGradient>
        </defs>
        <rect width="24" height="24" rx="6" fill="url(#vf-instagram-gradient-a)" />
        <rect x="6.2" y="6.2" width="11.6" height="11.6" rx="3.4" fill="none" stroke="#fff" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3" fill="none" stroke="#fff" strokeWidth="1.8" />
        <circle cx="16.4" cy="7.7" r="1.15" fill="#fff" />
      </svg>
    );
  }

  if (icon === "facebook") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect width="24" height="24" rx="6" fill="#1877F2" />
        <path
          fill="#fff"
          d="M13.45 20.1v-7.2h2.42l.36-2.8h-2.78V8.31c0-.81.23-1.36 1.39-1.36h1.48V4.44c-.26-.03-1.14-.11-2.16-.11-2.14 0-3.6 1.31-3.6 3.7v2.07H8.14v2.8h2.42v7.2h2.89Z"
        />
      </svg>
    );
  }

  return null;
}

function PublicationRoutePipeline() {
  return (
    <section className="vf-route-pipeline" aria-labelledby="route-pipeline-title">
      <header className="vf-route-header">
        <div>
          <p className="vf-kicker">Pipeline</p>
          <h2 id="route-pipeline-title">Vibe_fx route le visuel final.</h2>
        </div>
        <div className="vf-route-legend" aria-label="Routes de publication">
          {publicationRoutes.map((route) => (
            <span key={route.key}>{route.label}</span>
          ))}
        </div>
      </header>

      <div className="vf-route-stage" aria-label="Animation du pipeline Vibe_fx vers le site, Instagram et Facebook">
        <svg className="vf-route-svg" viewBox="0 0 720 420" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <defs>
            <filter id="vf-route-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="vf-route-gradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#00e5ff" stopOpacity="0" />
              <stop offset="18%" stopColor="#00e5ff" stopOpacity=".18" />
              <stop offset="50%" stopColor="#00e5ff" stopOpacity=".98" />
              <stop offset="82%" stopColor="#cdfb52" stopOpacity=".22" />
              <stop offset="100%" stopColor="#cdfb52" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g
            className="vf-route-track vf-route-track--oauth"
            style={{ "--route-index": 0, "--route-speed": routeCycle, "--route-delay": `${oauthRoute.pulseDelay}s` }}
          >
            <path d={oauthRoute.path} className="vf-route-line vf-route-line--base" />
            <path d={oauthRoute.path} className="vf-route-line vf-route-line--active" filter="url(#vf-route-glow)" />
            <VibeFxBubbleStream />
          </g>

          {publicationRoutes.map((route, index) => (
            <g
              className="vf-route-track"
              style={{ "--route-index": index + 1, "--route-speed": routeCycle, "--route-delay": `${route.pulseDelay}s` }}
              key={route.key}
            >
              <path d={route.path} className="vf-route-line vf-route-line--base" />
              <path d={route.path} className="vf-route-line vf-route-line--active" filter="url(#vf-route-glow)" />
            </g>
          ))}
        </svg>

        <div className="vf-route-core" aria-label="Vibe_fx">
          <div className="vf-route-core__inner">
            <span className="vf-route-core__mark">V</span>
            <strong>Vibe_fx</strong>
            <em>publish</em>
          </div>
        </div>

        <div className="vf-route-oauth" aria-label="Authentification OAuth">
          <div className="vf-route-oauth__inner">
            <span className="vf-route-oauth__glyph" aria-hidden="true">
              <i />
              <i />
            </span>
            <strong>OAuth</strong>
            <em>Meta auth</em>
          </div>
        </div>

        {publicationRoutes.map((route, index) => (
          <article
            className={`vf-route-node vf-route-node--${route.key}`}
            style={{ "--route-x": route.x, "--route-y": route.y, "--route-index": index }}
            key={route.key}
          >
            <div className="vf-route-node__inner">
              <span className={`vf-route-node__icon vf-route-node__icon--${route.icon}`} aria-hidden="true">
                <RouteIcon icon={route.icon} />
              </span>
              <small>{route.badge}</small>
              <strong>{route.label}</strong>
              <em>{route.meta}</em>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function SeoLandingPage({ page }) {
  const jsonLd = createJsonLd(page);
  const relatedPages = seoPages.filter((item) => item.path !== page.path).slice(0, 3);
  const graphicPage = graphicPages[page.slug];

  if (graphicPage) {
    return (
      <GraphicLandingPage
        page={page}
        data={graphicPage}
        jsonLd={jsonLd}
        relatedPages={relatedPages}
      />
    );
  }

  return (
    <main className="vf-seo">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicNav />

      <section className="vf-seo-hero">
        <div className="vf-seo-hero__copy">
          <p className="vf-kicker">{page.eyebrow}</p>
          <h1>{page.h1}</h1>
          <p>{page.intro}</p>
          <div className="vf-actions">
            <Link href="/studio" className="vf-primary">
              {page.primaryAction}
            </Link>
            <Link href={page.secondaryHref} className="vf-secondary">
              {page.secondaryAction}
            </Link>
          </div>
          <div className="vf-seo-metrics" aria-label="Signaux produit">
            {page.metrics.map((metric) => (
              <span key={metric}>{metric}</span>
            ))}
          </div>
        </div>

        <div className="vf-seo-proof" aria-label="Apercu produit Vibe_fx">
          <div className="vf-seo-proof__head">
            <span aria-hidden="true" />
            <strong>{page.terminalTitle}</strong>
          </div>
          <div className="vf-seo-proof__body">
            <div className="vf-seo-preview">
              <Image
                src="/assets/vibefx/demo-astronaut.png"
                alt="Apercu d'un visuel social cree dans Vibe_fx"
                width={720}
                height={900}
                priority
              />
            </div>
            <ol className="vf-seo-steps">
              {page.steps.map((step, index) => (
                <li key={step}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="vf-seo-strip" aria-label="Capacites">
        {page.cards.map((card) => (
          <article key={card} className="vf-seo-card">
            <span>Signal</span>
            <h2>{card}</h2>
          </article>
        ))}
      </section>

      {page.slug === "outil-publication-reseaux-sociaux" ? (
        <PublicationRoutePipeline />
      ) : (
        <section className="vf-seo-section">
          {page.sections.map((section) => (
            <article key={section.title}>
              <p className="vf-kicker">Systeme</p>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </article>
          ))}
        </section>
      )}

      <section className="vf-seo-faq" aria-labelledby="faq-title">
        <div>
          <p className="vf-kicker">FAQ</p>
          <h2 id="faq-title">Questions utiles avant de publier.</h2>
        </div>
        <div className="vf-seo-faq__items">
          {page.faq.map(([question, answer]) => (
            <article key={question}>
              <h3>{question}</h3>
              <p>{answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="vf-seo-related" aria-label="Pages liees">
        {relatedPages.map((related) => (
          <Link key={related.path} href={related.path}>
            <span>{related.eyebrow}</span>
            {related.title}
          </Link>
        ))}
      </section>
    </main>
  );
}
