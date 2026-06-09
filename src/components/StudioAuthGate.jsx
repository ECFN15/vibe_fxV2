"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

// ── Icône oeil ───────────────────────────────────────────────
function EyeIcon({ open }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

// ── Champ mot de passe avec oeil ─────────────────────────────
function PasswordField({ id, label, value, onChange, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="vf-gate-field">
      <label htmlFor={id} className="vf-gate-field__label">{label}</label>
      <div className="vf-gate-field__wrap">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className="vf-gate-field__input"
          required
        />
        <button
          type="button"
          className="vf-gate-field__eye"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          tabIndex={-1}
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  );
}

// ── Erreur Firebase → message lisible ───────────────────────
function firebaseErrorMessage(code) {
  const map = {
    "auth/email-already-in-use": "Cette adresse est déjà utilisée. Connecte-toi.",
    "auth/invalid-email": "Adresse email invalide.",
    "auth/weak-password": "Mot de passe trop court (6 caractères minimum).",
    "auth/user-not-found": "Aucun compte pour cet email.",
    "auth/wrong-password": "Mot de passe incorrect.",
    "auth/invalid-credential": "Email ou mot de passe incorrect.",
    "auth/too-many-requests": "Trop de tentatives. Réessaie dans quelques minutes.",
    "auth/popup-closed-by-user": "Fenêtre fermée. Réessaie.",
    "auth/network-request-failed": "Erreur réseau. Vérifie ta connexion.",
  };
  return map[code] || "Une erreur est survenue. Réessaie.";
}

// ── Vues ─────────────────────────────────────────────────────
const VIEWS = { MAIN: "main", SIGNUP: "signup", SIGNIN: "signin", VERIFY: "verify" };

export default function StudioAuthGate({ children }) {
  const { isSignedIn, loading, signInWithGoogle, signUpWithEmail, signInWithEmail, resendVerificationEmail } = useAuth();

  const [view, setView] = useState(VIEWS.MAIN);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Champs formulaire
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const reset = (nextView) => {
    setError("");
    setSuccessMsg("");
    setEmail("");
    setPassword("");
    setPasswordConfirm("");
    setView(nextView);
  };

  // ── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="vf-studio-gate vf-studio-gate--loading" aria-busy="true">
        <span className="vf-studio-gate__spinner" />
      </div>
    );
  }

  if (isSignedIn) return children;

  // ── Google ────────────────────────────────────────────────
  const handleGoogle = async () => {
    setError("");
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(firebaseErrorMessage(e.code));
    } finally {
      setBusy(false);
    }
  };

  // ── Créer un compte ───────────────────────────────────────
  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== passwordConfirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 6) {
      setError("Mot de passe trop court (6 caractères minimum).");
      return;
    }
    setBusy(true);
    try {
      await signUpWithEmail(email, password);
      setView(VIEWS.VERIFY);
    } catch (e) {
      setError(firebaseErrorMessage(e.code));
    } finally {
      setBusy(false);
    }
  };

  // ── Connexion ─────────────────────────────────────────────
  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signInWithEmail(email, password);
      // onAuthStateChanged dans le context va mettre isSignedIn = true → children
    } catch (e) {
      setError(firebaseErrorMessage(e.code));
    } finally {
      setBusy(false);
    }
  };

  // ── Renvoyer email ────────────────────────────────────────
  const handleResend = async () => {
    setError("");
    setBusy(true);
    try {
      await resendVerificationEmail();
      setSuccessMsg("Email renvoyé ! Vérifie ta boite mail.");
    } catch (e) {
      setError(firebaseErrorMessage(e.code));
    } finally {
      setBusy(false);
    }
  };

  // ══════════════════════════════════════════════════════════
  // RENDU
  // ══════════════════════════════════════════════════════════
  return (
    <div className="vf-studio-gate" role="dialog" aria-modal="true">

      {/* ── Vue principale ── */}
      {view === VIEWS.MAIN && (
        <div className="vf-studio-gate__card">
          <span className="vf-studio-gate__kicker">Studio</span>
          <h1 className="vf-studio-gate__title">Connecte-toi pour accéder au studio</h1>
          <p className="vf-studio-gate__desc">
            Tes créations, exports et publications sont liés à ton compte.
          </p>
          {error && <p className="vf-studio-gate__error">{error}</p>}
          <button type="button" className="vf-studio-gate__btn" disabled={busy} onClick={handleGoogle}>
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" style={{flexShrink:0}}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {busy ? "Connexion..." : "Continuer avec Google"}
          </button>

          <div className="vf-gate-divider"><span>ou</span></div>

          <div className="vf-gate-email-actions">
            <button type="button" className="vf-studio-gate__btn vf-studio-gate__btn--secondary" onClick={() => reset(VIEWS.SIGNUP)}>
              Créer un compte avec email
            </button>
            <button type="button" className="vf-gate-link" onClick={() => reset(VIEWS.SIGNIN)}>
              J&apos;ai déjà un compte
            </button>
          </div>

          <a href="/" className="vf-studio-gate__back">← Retour à l&apos;accueil</a>
        </div>
      )}

      {/* ── Créer un compte ── */}
      {view === VIEWS.SIGNUP && (
        <div className="vf-studio-gate__card">
          <span className="vf-studio-gate__kicker">Créer un compte</span>
          <h1 className="vf-studio-gate__title">Nouveau compte</h1>
          <p className="vf-studio-gate__desc">
            Un lien de confirmation sera envoyé à ton adresse mail.
          </p>
          {error && <p className="vf-studio-gate__error">{error}</p>}
          <form className="vf-gate-form" onSubmit={handleSignUp} noValidate>
            <div className="vf-gate-field">
              <label htmlFor="gate-email-up" className="vf-gate-field__label">Adresse email</label>
              <input
                id="gate-email-up"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="vf-gate-field__input"
                placeholder="toi@exemple.com"
                required
              />
            </div>
            <PasswordField
              id="gate-pw-up"
              label="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <PasswordField
              id="gate-pw-confirm"
              label="Confirmer le mot de passe"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              autoComplete="new-password"
            />
            <button type="submit" className="vf-studio-gate__btn" disabled={busy || !email || !password || !passwordConfirm}>
              {busy ? "Création..." : "Créer mon compte"}
            </button>
          </form>
          <button type="button" className="vf-gate-link" onClick={() => reset(VIEWS.MAIN)}>← Retour</button>
        </div>
      )}

      {/* ── Connexion email ── */}
      {view === VIEWS.SIGNIN && (
        <div className="vf-studio-gate__card">
          <span className="vf-studio-gate__kicker">Connexion</span>
          <h1 className="vf-studio-gate__title">Connexion</h1>
          {error && <p className="vf-studio-gate__error">{error}</p>}
          <form className="vf-gate-form" onSubmit={handleSignIn} noValidate>
            <div className="vf-gate-field">
              <label htmlFor="gate-email-in" className="vf-gate-field__label">Adresse email</label>
              <input
                id="gate-email-in"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="vf-gate-field__input"
                placeholder="toi@exemple.com"
                required
              />
            </div>
            <PasswordField
              id="gate-pw-in"
              label="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button type="submit" className="vf-studio-gate__btn" disabled={busy || !email || !password}>
              {busy ? "Connexion..." : "Se connecter"}
            </button>
          </form>
          <button type="button" className="vf-gate-link" onClick={() => reset(VIEWS.MAIN)}>← Retour</button>
        </div>
      )}

      {/* ── Confirmation mail envoyé ── */}
      {view === VIEWS.VERIFY && (
        <div className="vf-studio-gate__card">
          <span className="vf-studio-gate__kicker">Vérification</span>
          <div className="vf-gate-verify-icon" aria-hidden="true">✉</div>
          <h1 className="vf-studio-gate__title">Confirme ton email</h1>
          <p className="vf-studio-gate__desc">
            Un lien de confirmation a été envoyé à <strong>{email}</strong>.
            Clique dessus pour activer ton compte et accéder au studio.
          </p>
          {error && <p className="vf-studio-gate__error">{error}</p>}
          {successMsg && <p className="vf-studio-gate__success">{successMsg}</p>}
          <button type="button" className="vf-studio-gate__btn vf-studio-gate__btn--secondary" disabled={busy} onClick={handleResend}>
            {busy ? "Envoi..." : "Renvoyer l'email"}
          </button>
          <button type="button" className="vf-gate-link" onClick={() => reset(VIEWS.SIGNIN)}>
            J&apos;ai confirmé → Me connecter
          </button>
        </div>
      )}

    </div>
  );
}
