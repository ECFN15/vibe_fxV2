"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function AuthButton({ className = "" }) {
  const { user, isSignedIn, loading, signInWithGoogle, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const wrapRef = useRef(null);

  // Fermer le menu quand on clique n'importe où en dehors
  useEffect(() => {
    if (!showMenu) return;
    function handleOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showMenu]);

  if (loading) return null;

  if (!isSignedIn) {
    return (
      <button
        type="button"
        className={`vf-auth-btn vf-auth-btn--signin ${className}`}
        onClick={async () => {
          setBusy(true);
          try { await signInWithGoogle(); } catch {}
          setBusy(false);
        }}
        disabled={busy}
      >
        {busy ? "Connexion..." : "Se connecter"}
      </button>
    );
  }

  const label = user.email
    ? user.email.length > 20 ? user.email.slice(0, 18) + "…" : user.email
    : user.displayName || "Mon compte";

  return (
    <div ref={wrapRef} className={`vf-auth-btn--user-wrap ${className}`}>
      <button
        type="button"
        className="vf-auth-btn vf-auth-btn--user"
        onClick={() => setShowMenu((s) => !s)}
        aria-haspopup="true"
        aria-expanded={showMenu}
      >
        {user.photoURL && (
          <img src={user.photoURL} alt="" className="vf-auth-btn__avatar" width={20} height={20} referrerPolicy="no-referrer" />
        )}
        <span>{label}</span>
      </button>
      {showMenu && (
        <div className="vf-auth-btn__menu" role="menu">
          <a href="/account" className="vf-auth-btn__menu-item" role="menuitem">Mon compte</a>
          <button
            type="button"
            className="vf-auth-btn__menu-item vf-auth-btn__menu-item--danger"
            role="menuitem"
            onClick={async () => { setShowMenu(false); await logout(); }}
          >
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
