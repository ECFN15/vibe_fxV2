import { Camera, Link, RefreshCw, Send, Share2 } from "lucide-react";

export default function MetaOAuthPanel({ enabled = true, connected, oauthBusy, saving, syncing, statusLabel = "", onConnect, onRefresh, onPublish }) {
  return (
    <section className="pub-oauth-panel" aria-label="Controle Meta OAuth">
      <header className="pub-module-head">
        <span>Meta OAuth</span>
        <strong>{connected ? "Connecte" : enabled ? "A connecter" : "Indisponible"}</strong>
      </header>
      <p className="pub-oauth-status">{statusLabel || "Statut OAuth non charge."}</p>
      <div className="pub-platform-grid" aria-label="Plateformes disponibles">
        <span data-active={connected ? "true" : "false"}><Camera size={14} /> Instagram</span>
        <span data-active={connected ? "true" : "false"}><Share2 size={14} /> Facebook</span>
      </div>
      <div className="pub-oauth-actions">
        <button type="button" className="pub-secondary" disabled={!enabled || oauthBusy} onClick={onConnect}>
          {oauthBusy ? <span className="mini-spinner" /> : <Link size={15} />} Connecter
        </button>
        <button type="button" className="pub-ghost" disabled={!enabled || oauthBusy} onClick={onRefresh}>
          <RefreshCw size={15} /> Rafraichir
        </button>
        <button type="button" className="pub-primary purple oauth" disabled={!enabled || saving || syncing || !connected} onClick={onPublish}>
          {syncing ? <span className="mini-spinner" /> : <Send size={15} />} Publier OAuth
        </button>
      </div>
    </section>
  );
}
