import * as Icons from "lucide-react";

export default function MetaOAuthPanel({ enabled = true, connected, oauthBusy, saving, syncing, onConnect, onRefresh, onPublish }) {
  return (
    <>
      <button type="button" className="pub-secondary" disabled={!enabled || oauthBusy} onClick={onConnect}>
        {oauthBusy ? <span className="mini-spinner" /> : <Icons.Link size={15} />} Connecter OAuth
      </button>
      <button type="button" className="pub-ghost" disabled={!enabled || oauthBusy} onClick={onRefresh}>
        <Icons.RefreshCw size={15} /> Statut OAuth
      </button>
      <button type="button" className="pub-primary purple oauth" disabled={!enabled || saving || syncing || !connected} onClick={onPublish}>
        {syncing ? <span className="mini-spinner" /> : <Icons.Send size={15} />} Site + reseaux OAuth
      </button>
    </>
  );
}
