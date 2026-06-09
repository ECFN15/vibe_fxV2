"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

/**
 * Bloque l'accès au studio tant que l'utilisateur n'est pas connecté
 * avec un vrai compte (pas anonyme). Affiche une modale de connexion.
 */
export default function StudioAuthGate({ children }) {
  const { isSignedIn, loading, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (loading) {
    return (
      <div className="vf-studio-gate vf-studio-gate--loading" aria-busy="true">
        <span className="vf-studio-gate__spinner" />
      </div>
    );
  }

  if (isSignedIn) return children;

  return (
    <div className="vf-studio-gate" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <div className="vf-studio-gate__card">
        <span className="vf-studio-gate__kicker">Studio</span>
        <h1 id="gate-title" className="vf-studio-gate__title">Connecte-toi pour accéder au studio</h1>
        <p className="vf-studio-gate__desc">
          Tes créations, exports et publications sont liés à ton compte.
          Connecte-toi avec Google pour commencer.
        </p>
        {error && <p className="vf-studio-gate__error">{error}</p>}
        <button
          type="button"
          className="vf-studio-gate__btn"
          disabled={busy}
          onClick={async () => {
            setError("");
            setBusy(true);
            try {
              await signInWithGoogle();
            } catch (e) {
              setError(e.message?.includes("popup-closed") ? "Fenêtre fermée. Réessaie." : "Connexion impossible. Réessaie.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Connexion..." : "Continuer avec Google"}
        </button>
        <a href="/" className="vf-studio-gate__back">← Retour à l&apos;accueil</a>
      </div>
    </div>
  );
}
