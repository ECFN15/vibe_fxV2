"use client";

import Link from "next/link";
import { AI_FRONT_SURFACES, AI_INTERFACES_DEFAULT_ENABLED } from "@/config/aiLaunch";
import { useAiLaunchSettings } from "@/hooks/useAiLaunchSettings";

export default function BackofficeClient() {
  const { aiInterfacesEnabled, setAiInterfacesEnabled, resetAiInterfaces } = useAiLaunchSettings();
  const disabledCount = aiInterfacesEnabled ? 0 : AI_FRONT_SURFACES.length;

  return (
    <main className="vf-backoffice">
      <nav className="vf-nav vf-backoffice-nav" aria-label="Navigation backoffice">
        <Link href="/" className="vf-brand" aria-label="Vibe_fx V2 accueil">
          <span className="vf-brand-mark" aria-hidden="true" />
          Vibe_fx
        </Link>
        <div className="vf-nav-links">
          <Link href="/studio">
            <span className="vf-nav-link-dot" aria-hidden="true" />
            Studio
          </Link>
          <Link href="/pricing">
            <span className="vf-nav-link-dot" aria-hidden="true" />
            Tarifs
          </Link>
        </div>
        <Link href="/backoffice" className="vf-nav-cta" aria-current="page">
          Backoffice
        </Link>
      </nav>

      <section className="vf-backoffice-hero" aria-labelledby="backoffice-title">
        <div className="vf-backoffice-copy">
          <p className="vf-kicker">Launch control</p>
          <h1 id="backoffice-title">Backoffice IA pour le premier lancement prod.</h1>
          <p>
            Firebase n&apos;est pas encore branche pour securiser ce backoffice. Ce switch agit donc comme
            override local navigateur: le deploy garde les interfaces IA masquees par defaut, et le bouton
            permet de les remettre en place pour verifier le prochain lancement.
          </p>
        </div>

        <aside className="vf-ai-launch-card" data-enabled={aiInterfacesEnabled ? "true" : "false"}>
          <span>{aiInterfacesEnabled ? "Override local actif" : "Mode lancement prod"}</span>
          <strong>{aiInterfacesEnabled ? "Interfaces IA visibles" : "Interfaces IA masquees"}</strong>
          <p>
            {aiInterfacesEnabled
              ? "Ce navigateur remonte les entrees IA pour controle. Le flag prod reste separe."
              : `${disabledCount} surfaces front/API IA sont masquees pour le lancement.`}
          </p>
          <div className="vf-ai-launch-actions">
            <button
              type="button"
              onClick={() => setAiInterfacesEnabled(!aiInterfacesEnabled)}
            >
              {aiInterfacesEnabled ? "Masquer l\u0027IA" : "Remettre l\u0027IA en place"}
            </button>
            <button type="button" onClick={resetAiInterfaces}>
              Revenir au defaut
            </button>
          </div>
          <dl>
            <div>
              <dt>Defaut deploy</dt>
              <dd>{AI_INTERFACES_DEFAULT_ENABLED ? "IA on" : "IA off"}</dd>
            </div>
            <div>
              <dt>Portee</dt>
              <dd>Navigateur local</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="vf-backoffice-grid" aria-label="Cartographie IA front">
        <article>
          <span>Objectif prod</span>
          <strong>Lancer sans fonctionnalite IA visible.</strong>
          <p>Le studio, la publication, le pricing premium et les sources musicales non IA restent accessibles.</p>
        </article>
        <article>
          <span>Retour un clic</span>
          <strong>Override local reversible.</strong>
          <p>Le code IA reste en place, mais non monte tant que le switch ou le flag env ne l&apos;active pas.</p>
        </article>
        <article>
          <span>Suite Firebase</span>
          <strong>Remplacer par un vrai gate serveur.</strong>
          <p>Quand Auth/claims seront prets, ce panneau devra devenir admin-only.</p>
        </article>
      </section>

      <section className="vf-backoffice-table-panel" aria-labelledby="ai-map-title">
        <header>
          <div>
            <p className="vf-kicker">Surface map</p>
            <h2 id="ai-map-title">Interfaces IA neutralisees.</h2>
          </div>
          <span className="vf-backoffice-status" data-enabled={aiInterfacesEnabled ? "true" : "false"}>
            {aiInterfacesEnabled ? "Visible localement" : "Masque par defaut"}
          </span>
        </header>

        <div className="vf-backoffice-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Zone</th>
                <th>Route</th>
                <th>Surface</th>
                <th>Etat sans IA</th>
              </tr>
            </thead>
            <tbody>
              {AI_FRONT_SURFACES.map((surface) => (
                <tr key={surface.id}>
                  <td>{surface.zone}</td>
                  <td><code>{surface.route}</code></td>
                  <td>{surface.surface}</td>
                  <td>{surface.disabledState}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
