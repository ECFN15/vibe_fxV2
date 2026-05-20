import React from "react";

const publicationRoutes = [
  {
    key: "website",
    label: "Your website",
    meta: "Live page",
    badge: "WEB",
    icon: "site",
    x: "28%",
    y: "29%",
    pulseDelay: "1.35s",
    path: "M371 210 C338 210 294 166 250 126",
  },
  {
    key: "instagram",
    label: "Instagram",
    meta: "Feed / story",
    badge: "IG",
    icon: "instagram",
    x: "28%",
    y: "50%",
    pulseDelay: "2.7s",
    path: "M371 210 C332 210 292 210 250 210",
  },
  {
    key: "facebook",
    label: "Facebook",
    meta: "Page post",
    badge: "FB",
    icon: "facebook",
    x: "28%",
    y: "71%",
    pulseDelay: "4.05s",
    path: "M371 210 C338 210 294 254 250 294",
  },
];

const routeCycle = "6.4s";

const oauthRoute = {
  pulseDelay: "0s",
  path: "M526 210 C496 210 456 210 423 210",
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
      {vibeFxBubbles.map(([x1, y1, x2, y2, x3, y3, radius, duration, begin], index) => (
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
      ))}
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

export function PublicationRoutePipeline() {
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
            <filter id="vf-route-glow" filterUnits="userSpaceOnUse" x="0" y="0" width="720" height="420">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="vf-route-gradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#2384ff" stopOpacity="0" />
              <stop offset="18%" stopColor="#43aaff" stopOpacity=".34" />
              <stop offset="50%" stopColor="#2384ff" stopOpacity=".96" />
              <stop offset="78%" stopColor="#93b8d8" stopOpacity=".28" />
              <stop offset="100%" stopColor="#d7dde8" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="vf-route-oauth-gradient" gradientUnits="userSpaceOnUse" x1="423" x2="526" y1="210" y2="210">
              <stop offset="0%" stopColor="#d7dde8" stopOpacity="0" />
              <stop offset="22%" stopColor="#8bbcff" stopOpacity=".4" />
              <stop offset="54%" stopColor="#2384ff" stopOpacity=".98" />
              <stop offset="82%" stopColor="#7fb7ff" stopOpacity=".38" />
              <stop offset="100%" stopColor="#d7dde8" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g
            className="vf-route-track vf-route-track--oauth"
            style={{ "--route-index": 0, "--route-speed": routeCycle, "--route-delay": oauthRoute.pulseDelay }}
          >
            <path d={oauthRoute.path} className="vf-route-line vf-route-line--base" />
            <path d={oauthRoute.path} className="vf-route-line vf-route-line--active" filter="url(#vf-route-glow)" />
            <VibeFxBubbleStream />
          </g>

          {publicationRoutes.map((route, index) => (
            <g
              className="vf-route-track"
              style={{ "--route-index": index + 1, "--route-speed": routeCycle, "--route-delay": route.pulseDelay }}
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
