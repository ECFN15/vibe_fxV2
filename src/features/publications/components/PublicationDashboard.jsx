"use client";

import * as Icons from "lucide-react";
import { formatDate } from "../helpers/publicationHelpers";
import PublicationList from "./PublicationList";

export default function PublicationDashboard({ stats, publications, loading, selectedId, onBackToLayout, onSelectPublication, onDeletePublication, onSetHomeFeature, featureSaving, message }) {
  const latest = publications.slice(0, 6);
  const queued = publications.filter((item) => item.status !== "published").slice(0, 3);
  const published = publications.filter((item) => item.status === "published");
  const currentFeatured = published.find((item) => item.featured);

  return (
    <div className="pub-hub">
      <section className="pub-hub-hero">
        <div className="pub-hub-copy">
          <span className="pub-hub-kicker">Publications</span>
          <h2>Dashboard publications</h2>
          <p>Un poste de controle clair pour preparer les visuels, reprendre les brouillons et envoyer le contenu vers le site, Instagram et Facebook.</p>
        </div>
        <button type="button" className="pub-hub-primary" onClick={onBackToLayout}>
          <span>Creer une mise en page</span>
          <i><Icons.ArrowUpRight size={17} /></i>
        </button>
      </section>

      {message ? <div className="pub-message final">{message}</div> : null}

      <section className="pub-hub-stats" aria-label="Etat des publications">
        <article>
          <Icons.FilePenLine size={18} />
          <strong>{stats.drafts}</strong>
          <span>Brouillons actifs</span>
        </article>
        <article>
          <Icons.Globe2 size={18} />
          <strong>{stats.published}</strong>
          <span>Publiees site</span>
        </article>
        <article>
          <Icons.Send size={18} />
          <strong>{stats.synced}</strong>
          <span>Synchronisees Insta</span>
        </article>
      </section>

      <section className="pub-hub-grid">
        <article className="pub-hub-card pub-hub-create">
          <div>
            <span className="pub-hub-card-kicker">Flux conseille</span>
            <h3>{"Mise en page d'abord, description ensuite."}</h3>
            <p>{"Le studio Vibe_fx reste plein ecran pour travailler le visuel sans compression. Une fois importe, cette page devient l'espace de finalisation texte et preview Instagram."}</p>
          </div>
          <div className="pub-hub-steps">
            <span><b>01</b> Composer le visuel</span>
            <span><b>02</b> Importer vers publication</span>
            <span><b>03</b> Verifier la preview mobile</span>
          </div>
          <button type="button" className="pub-hub-secondary" onClick={onBackToLayout}>
            <Icons.LayoutTemplate size={16} />
            Ouvrir la mise en page
          </button>
        </article>

        <aside className="pub-hub-card pub-hub-recent">
          <div className="pub-hub-card-head">
            <div>
              <span className="pub-hub-card-kicker">File recente</span>
              <h3>Derniers contenus</h3>
            </div>
            <small>{latest.length} element(s)</small>
          </div>
          <div className="pub-feature-strip">
            <span className="pub-feature-strip-kicker">Mise en avant accueil</span>
            {currentFeatured ? (
              <div className="pub-feature-current">
                {currentFeatured.image ? <img src={currentFeatured.image} alt="" /> : <span className="pub-row-fallback"><Icons.Image size={18} /></span>}
                <span>
                  <strong>{currentFeatured.title || "Sans titre"}</strong>
                  <small>Publiee - {formatDate(currentFeatured.publishedAt || currentFeatured.updatedAt)}</small>
                </span>
                <button type="button" className="pub-feature-remove" disabled={featureSaving} onClick={() => onSetHomeFeature(null)}>
                  Retirer
                </button>
              </div>
            ) : (
              <div className="pub-feature-empty">
                <strong>Aucune publication mise en avant</strong>
                <small>Utilise le bouton Accueil sur une publication publiee.</small>
              </div>
            )}
          </div>
          <div className="pub-hub-list">
            <PublicationList
              publications={latest}
              loading={loading}
              selectedId={selectedId}
              onSelect={onSelectPublication}
              onDelete={onDeletePublication}
              onSetHomeFeature={onSetHomeFeature}
              featureSaving={featureSaving}
            />
          </div>
        </aside>

        <article className="pub-hub-card pub-hub-queue">
          <span className="pub-hub-card-kicker">A finaliser</span>
          <h3>Brouillons en attente</h3>
          {queued.length ? (
            <div className="pub-hub-mini-list">
              {queued.map((item) => (
                <button type="button" key={item.id} onClick={() => onSelectPublication(item)}>
                  {item.image ? <img src={item.image} alt="" /> : <Icons.Image size={16} />}
                  <span>{item.title || "Sans titre"}</span>
                </button>
              ))}
            </div>
          ) : (
            <p>Aucun brouillon en attente. Lance une mise en page pour creer la prochaine publication.</p>
          )}
        </article>

        <article className="pub-hub-card pub-hub-checks">
          <span className="pub-hub-card-kicker">Checker</span>
          <h3>Avant publication</h3>
          <ul>
            <li>Format Instagram verifie dans la preview iPhone.</li>
            <li>{"Description et hashtags ajustes apres l'import."}</li>
            <li>Publication site separee de la synchronisation Meta.</li>
          </ul>
        </article>
      </section>
    </div>
  );
}
