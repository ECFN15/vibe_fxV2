import * as Icons from "lucide-react";
import { formatDate } from "../helpers/publicationHelpers";

function platformSummary(publication) {
  const instagram = publication.platformStatus?.instagram?.status;
  const facebook = publication.platformStatus?.facebook?.status;
  return [instagram ? `IG:${instagram}` : "IG:ready", facebook ? `FB:${facebook}` : "FB:ready"].join(" / ");
}

export default function PublicationList({ publications, loading, selectedId, onSelect, onDelete, onSetHomeFeature, featureSaving }) {
  if (loading) return <div className="pub-empty"><div className="admin-login-spinner" />Chargement...</div>;
  if (!publications.length) {
    return (
      <div className="pub-empty">
        <Icons.Newspaper size={30} />
        <p>Aucune publication pour le moment.</p>
      </div>
    );
  }

  return publications.map((publication) => (
    <div key={publication.id} className={`pub-row-wrap ${selectedId === publication.id ? "active" : ""}`}>
      <button type="button" className="pub-row" aria-pressed={selectedId === publication.id} onClick={() => onSelect(publication)}>
        {publication.image ? <img src={publication.image} alt="" /> : <span className="pub-row-fallback"><Icons.Image size={18} /></span>}
        <span className="pub-row-title">
          <strong>{publication.title || "Sans titre"}</strong>
          <small>{publication.status === "published" ? "Publiee" : "Brouillon"} - {formatDate(publication.publishedAt || publication.updatedAt)}</small>
        </span>
        <span className="pub-row-meta">{publication.format?.label || "Format"}</span>
        <span className="pub-row-platforms">{platformSummary(publication)}</span>
        <i>{publication.featured ? "Featured" : "Queue"}</i>
      </button>
      {onSetHomeFeature ? (
        <button
          type="button"
          className={`pub-row-feature ${publication.featured ? "active" : ""}`}
          disabled={featureSaving || publication.status !== "published"}
          title={publication.status === "published" ? (publication.featured ? "Retirer de l'accueil" : "Mettre sur l'accueil") : "Publie d'abord cette publication"}
          onClick={() => onSetHomeFeature(publication.featured ? null : publication.id)}
        >
          <Icons.Pin size={13} />
          <span>{publication.featured ? "Retirer" : "Accueil"}</span>
        </button>
      ) : null}
      <button type="button" className="pub-row-delete" onClick={() => onDelete(publication)}>
        <Icons.Trash2 size={13} />
        <span>Supprimer</span>
      </button>
    </div>
  ));
}
