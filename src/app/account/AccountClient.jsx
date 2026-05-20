"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, firebaseReady, functions } from "../../lib/firebase";

const viewLabels = {
  overview: "Vue compte",
  billing: "Facturation",
  usage: "Usage",
};

const billingProducts = [
  { key: "premium_lifetime", label: "Premium lifetime", detail: "Acces complet hors credits IA" },
  { key: "credits_500", label: "500 credits", detail: "Pack demarrage IA" },
  { key: "credits_1200", label: "1 200 credits", detail: "Pack createur leger" },
  { key: "credits_3200", label: "3 200 credits", detail: "Pack production" },
  { key: "credits_7000", label: "7 000 credits", detail: "Pack studio" },
];

const aiFeatureOptions = [
  { key: "text.caption.draft", label: "Caption draft" },
  { key: "text.prompt_rewrite.draft", label: "Prompt rewrite draft" },
];

function formatNumber(value) {
  return new Intl.NumberFormat("fr-FR").format(Number(value || 0));
}

function providerIds(user) {
  return (user?.providerData || []).map((provider) => provider.providerId).filter(Boolean);
}

async function reauthenticateBeforeDeletion(user) {
  const providers = providerIds(user);
  if (providers.includes("google.com")) {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await reauthenticateWithPopup(user, provider);
    await user.getIdToken(true);
    return;
  }

  if (providers.includes("password")) {
    const email = user.email || "";
    const password = window.prompt("Confirme ton mot de passe pour supprimer le compte.");
    if (!email || !password) {
      throw new Error("Reconnexion requise avant suppression.");
    }
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(email, password));
    await user.getIdToken(true);
    return;
  }

  throw new Error("Reconnecte-toi avec Google ou email avant suppression.");
}

async function upsertUserProfile(user) {
  if (!db || !user) return null;

  const ref = doc(db, "users", user.uid);
  const snapshot = await getDoc(ref);
  const payload = {
    email: user.email || "",
    displayName: user.displayName || "",
    photoURL: user.photoURL || "",
    isAnonymous: Boolean(user.isAnonymous),
    providers: providerIds(user),
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (!snapshot.exists()) {
    await setDoc(ref, {
      ...payload,
      createdAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, payload, { merge: true });
  }

  return (await getDoc(ref)).data();
}

function safeDate(value) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Non disponible";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function AccountClient({ initialView = "overview" }) {
  const [view, setView] = useState(initialView);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [checkouts, setCheckouts] = useState([]);
  const [loading, setLoading] = useState(Boolean(auth));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(auth ? "" : "Firebase Auth n'est pas configure.");
  const [authMode, setAuthMode] = useState("link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [aiFeature, setAiFeature] = useState(aiFeatureOptions[0].key);
  const [aiPrompt, setAiPrompt] = useState("");

  const refreshAccountData = useCallback(async (currentUser) => {
    if (!db || !currentUser) {
      setProfile(null);
      setJobs([]);
      setPayments([]);
      setCheckouts([]);
      return;
    }

    const nextProfile = await upsertUserProfile(currentUser);
    setProfile(nextProfile || {});

    const [jobSnapshot, paymentSnapshot, checkoutSnapshot] = await Promise.all([
      getDocs(query(
        collection(db, "aiJobs"),
        where("uid", "==", currentUser.uid),
        orderBy("createdAt", "desc"),
        limit(8)
      )).catch(() => ({ docs: [] })),
      getDocs(query(
        collection(db, "payments"),
        where("uid", "==", currentUser.uid),
        orderBy("createdAt", "desc"),
        limit(8)
      )).catch(() => ({ docs: [] })),
      getDocs(query(
        collection(db, "checkoutSessions"),
        where("uid", "==", currentUser.uid),
        orderBy("updatedAt", "desc"),
        limit(5)
      )).catch(() => ({ docs: [] })),
    ]);

    setJobs(jobSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    setPayments(paymentSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    setCheckouts(checkoutSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, []);

  useEffect(() => {
    if (!auth) {
      return undefined;
    }

    return onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setMessage("");
      try {
        let resolvedUser = currentUser;
        if (!resolvedUser) {
          resolvedUser = (await signInAnonymously(auth)).user;
        }
        setUser(resolvedUser);
        setEmail(resolvedUser.email || "");
        setDisplayName(resolvedUser.displayName || "");
        await refreshAccountData(resolvedUser);
      } catch (error) {
        setMessage(error.message || "Connexion compte indisponible.");
      } finally {
        setLoading(false);
      }
    });
  }, [refreshAccountData]);

  const status = useMemo(() => {
    const plan = profile?.plan || "free";
    return {
      plan,
      premium: plan === "premium",
      credits: profile?.creditBalance || 0,
      bonusCredits: profile?.bonusCreditBalance || 0,
      reservedCredits: profile?.reservedCreditBalance || 0,
      paid: profile?.lifetimePaidCents || 0,
    };
  }, [profile]);

  const handleGoogle = async () => {
    if (!auth) return;
    setBusy(true);
    setMessage("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      let credential;
      if (auth.currentUser?.isAnonymous) {
        credential = await linkWithPopup(auth.currentUser, provider).catch(async (error) => {
          if (error.code === "auth/credential-already-in-use" || error.code === "auth/email-already-in-use") {
            return signInWithPopup(auth, provider);
          }
          throw error;
        });
      } else {
        credential = await signInWithPopup(auth, provider);
      }
      setUser(credential.user);
      await refreshAccountData(credential.user);
      setMessage("Compte Google connecte.");
    } catch (error) {
      setMessage(error.message || "Connexion Google impossible.");
    } finally {
      setBusy(false);
    }
  };

  const handleEmailAction = async (event) => {
    event.preventDefault();
    if (!auth || !email || !password) return;
    setBusy(true);
    setMessage("");
    try {
      let credential;
      if (authMode === "login") {
        credential = await signInWithEmailAndPassword(auth, email, password);
      } else if (auth.currentUser?.isAnonymous) {
        credential = await linkWithCredential(auth.currentUser, EmailAuthProvider.credential(email, password));
      } else {
        credential = await createUserWithEmailAndPassword(auth, email, password);
      }
      if (displayName && credential.user.displayName !== displayName) {
        await updateProfile(credential.user, { displayName });
      }
      setUser(credential.user);
      await refreshAccountData(credential.user);
      setMessage(authMode === "login" ? "Session ouverte." : "Compte permanent lie.");
    } catch (error) {
      setMessage(error.message || "Action email impossible.");
    } finally {
      setBusy(false);
    }
  };

  const handleProfileSave = async () => {
    if (!auth?.currentUser) return;
    setBusy(true);
    setMessage("");
    try {
      await updateProfile(auth.currentUser, { displayName });
      await refreshAccountData(auth.currentUser);
      setMessage("Profil mis a jour.");
    } catch (error) {
      setMessage(error.message || "Mise a jour profil impossible.");
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (!auth) return;
    setBusy(true);
    try {
      await signOut(auth);
      setMessage("Session fermee. Une session anonyme de test sera recreee.");
    } finally {
      setBusy(false);
    }
  };

  const handleAccountDeletion = async () => {
    if (!functions || !auth?.currentUser) {
      setMessage("Firebase Functions n'est pas configure.");
      return;
    }
    if (!window.confirm("Supprimer ce compte et purger les donnees utilisateur ? Cette action est irreversible.")) {
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await reauthenticateBeforeDeletion(auth.currentUser);
      const requestDeletion = httpsCallable(functions, "requestAccountDeletion");
      await requestDeletion({});
      await signOut(auth).catch(() => undefined);
      setUser(null);
      setProfile(null);
      setJobs([]);
      setPayments([]);
      setCheckouts([]);
      setMessage("Compte supprime. Les donnees utilisateur ont ete purgees cote serveur.");
    } catch (error) {
      setMessage(error.message || "Suppression compte impossible.");
    } finally {
      setBusy(false);
    }
  };

  const handleCheckout = async (productKey) => {
    if (!functions || !auth?.currentUser) {
      setMessage("Firebase Functions n'est pas configure.");
      return;
    }
    if (auth.currentUser.isAnonymous) {
      setMessage("Lie un compte permanent avant achat.");
      setView("overview");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const createCheckout = httpsCallable(functions, "createCheckoutSession");
      const randomId = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
      const clientRequestId = `${Date.now()}_${randomId}`;
      const result = await createCheckout({ productKey, clientRequestId });
      const url = result.data?.url;
      if (!url) throw new Error("URL Checkout Stripe manquante.");
      window.location.assign(url);
    } catch (error) {
      setMessage(error.message || "Creation Checkout impossible.");
      setBusy(false);
    }
  };

  const handleCreateAiJob = async (event) => {
    event.preventDefault();
    if (!functions || !auth?.currentUser) {
      setMessage("Firebase Functions n'est pas configure.");
      return;
    }
    if (auth.currentUser.isAnonymous) {
      setMessage("Lie un compte permanent avant de lancer un job IA.");
      setView("overview");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const createJob = httpsCallable(functions, "createAiJob");
      const randomId = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
      const clientRequestId = `${Date.now()}_${randomId}`;
      const result = await createJob({ feature: aiFeature, prompt: aiPrompt, clientRequestId });
      await refreshAccountData(auth.currentUser);
      setAiPrompt("");
      setMessage(`Job IA ${result.data?.status || "cree"}: ${result.data?.jobId || ""}`.trim());
    } catch (error) {
      setMessage(error.message || "Creation job IA impossible.");
    } finally {
      setBusy(false);
    }
  };

  const isAnonymous = Boolean(user?.isAnonymous);
  const providers = providerIds(user);

  return (
    <main className="vf-account-shell">
      <nav className="vf-account-nav" aria-label="Navigation compte">
        <Link href="/" className="vf-brand" aria-label="Vibe_fx V2 accueil">
          <span className="vf-brand-mark" aria-hidden="true" />
          Vibe_fx
        </Link>
        <div className="vf-account-tabs" role="tablist" aria-label="Sections compte">
          {Object.entries(viewLabels).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={view === key}
              data-active={view === key}
              onClick={() => setView(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <Link href="/studio" className="vf-account-studio">Studio</Link>
      </nav>

      <section className="vf-account-hero" aria-labelledby="account-title">
        <div>
          <p className="vf-account-kicker">Compte prive</p>
          <h1 id="account-title">Profil, credits et securite d&apos;usage.</h1>
          <p>
            Le dashboard lit les droits et credits depuis Firestore. Les achats, credits IA et jobs restent
            controles par Functions et webhooks serveur.
          </p>
        </div>
        <div className="vf-account-status" data-state={isAnonymous ? "warning" : "success"}>
          <span>{isAnonymous ? "Session anonyme" : "Compte permanent"}</span>
          <strong>{user?.email || user?.uid || "Connexion en cours"}</strong>
          <small>{providers.length ? providers.join(", ") : "anonymous"}</small>
        </div>
      </section>

      {message ? <p className="vf-account-message">{message}</p> : null}
      {!firebaseReady ? <p className="vf-account-message danger">Firebase public config manquante.</p> : null}

      <section className="vf-account-grid" aria-busy={loading}>
        <article className="vf-account-panel vf-account-auth">
          <div className="vf-account-panel-head">
            <span>Identity</span>
            <strong>{isAnonymous ? "Lier un compte" : "Compte lie"}</strong>
          </div>
          <p>
            Les credits IA et achats exigent un compte permanent. La session anonyme reste utile pour tester le studio.
          </p>
          <button type="button" className="vf-account-primary" disabled={busy || loading} onClick={handleGoogle}>
            {busy ? "Traitement..." : "Continuer avec Google"}
          </button>
          <form className="vf-account-form" onSubmit={handleEmailAction}>
            <div className="vf-account-segment">
              <button type="button" data-active={authMode === "link"} onClick={() => setAuthMode("link")}>Lier/creer</button>
              <button type="button" data-active={authMode === "login"} onClick={() => setAuthMode("login")}>Connexion</button>
            </div>
            <label>
              <span>Email</span>
              <input type="email" value={email} autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              <span>Mot de passe</span>
              <input type="password" value={password} autoComplete={authMode === "login" ? "current-password" : "new-password"} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <label>
              <span>Nom public</span>
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </label>
            <button type="submit" disabled={busy || !email || !password}>
              {authMode === "login" ? "Ouvrir la session" : "Lier le compte"}
            </button>
          </form>
        </article>

        <article className="vf-account-panel">
          <div className="vf-account-panel-head">
            <span>Plan</span>
            <strong>{status.premium ? "Premium" : "Free"}</strong>
          </div>
          <div className="vf-account-metric">
            <span>Credits disponibles</span>
            <strong>{formatNumber(status.credits)}</strong>
          </div>
          <div className="vf-account-bars">
            <span style={{ "--value": `${Math.min(100, status.credits / 10)}%` }}>Payes</span>
            <span style={{ "--value": `${Math.min(100, status.bonusCredits / 10)}%` }}>Bonus</span>
            <span style={{ "--value": `${Math.min(100, status.reservedCredits / 10)}%` }}>Reserves</span>
          </div>
          <Link href="/pricing" className="vf-account-secondary">Voir les tarifs</Link>
        </article>

        <article className="vf-account-panel">
          <div className="vf-account-panel-head">
            <span>Securite</span>
            <strong>Lecture seule sensible</strong>
          </div>
          <dl className="vf-account-facts">
            <div><dt>UID</dt><dd>{user?.uid || "..."}</dd></div>
            <div><dt>Derniere activite</dt><dd>{safeDate(profile?.lastLoginAt)}</dd></div>
            <div><dt>Total paye</dt><dd>{(status.paid / 100).toFixed(2)} EUR</dd></div>
          </dl>
          <div className="vf-account-actions">
            <button type="button" onClick={handleProfileSave} disabled={busy || isAnonymous}>Enregistrer profil</button>
            <button type="button" onClick={handleSignOut} disabled={busy}>Fermer session</button>
            <button type="button" onClick={handleAccountDeletion} disabled={busy || isAnonymous}>Supprimer compte</button>
          </div>
        </article>
      </section>

      <section id="account-panel" className="vf-account-workspace" data-view={view} aria-live="polite">
        {view === "billing" ? (
          <BillingPanel
            busy={busy}
            products={billingProducts}
            payments={payments}
            checkouts={checkouts}
            onCheckout={handleCheckout}
          />
        ) : view === "usage" ? (
          <UsagePanel
            busy={busy}
            jobs={jobs}
            aiFeature={aiFeature}
            aiPrompt={aiPrompt}
            onFeatureChange={setAiFeature}
            onPromptChange={setAiPrompt}
            onCreateAiJob={handleCreateAiJob}
          />
        ) : (
          <div className="vf-account-readiness">
            {[
              ["Auth permanent", isAnonymous ? "A lier" : "Actif"],
              ["Credits ledger", "Serveur uniquement"],
              ["Stripe fulfillment", "Webhook uniquement"],
              ["AI gateway", "Mock credits v1"],
            ].map(([label, value]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function AccountTable({ title, columns, rows, empty }) {
  return (
    <article className="vf-account-table-panel">
      <header>
        <span>Historique</span>
        <h2>{title}</h2>
      </header>
      {rows.length ? (
        <div className="vf-account-table-wrap">
          <table>
            <thead>
              <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row[0]}-${index}`}>
                  {row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="vf-account-empty">{empty}</p>
      )}
    </article>
  );
}

function UsagePanel({
  jobs,
  busy,
  aiFeature,
  aiPrompt,
  onFeatureChange,
  onPromptChange,
  onCreateAiJob,
}) {
  return (
    <div className="vf-account-usage-stack">
      <article className="vf-account-ai-panel" aria-labelledby="ai-job-title">
        <header>
          <span>AI gateway</span>
          <h2 id="ai-job-title">Nouveau job IA</h2>
        </header>
        <form className="vf-account-ai-form" onSubmit={onCreateAiJob}>
          <label>
            <span>Feature</span>
            <select value={aiFeature} onChange={(event) => onFeatureChange(event.target.value)}>
              {aiFeatureOptions.map((option) => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Prompt</span>
            <textarea
              value={aiPrompt}
              maxLength={1600}
              rows={4}
              onChange={(event) => onPromptChange(event.target.value)}
            />
          </label>
          <button type="submit" disabled={busy || !aiPrompt.trim()}>
            {busy ? "Traitement..." : "Lancer le job"}
          </button>
        </form>
      </article>
      <AccountTable
        title="Jobs IA"
        empty="Aucun job IA."
        rows={jobs.map((job) => [
          job.feature || "job",
          job.status || "unknown",
          `${formatNumber(job.capturedCredits || job.estimatedCredits || 0)} credits`,
          safeDate(job.createdAt),
        ])}
        columns={["Feature", "Statut", "Cout", "Date"]}
      />
    </div>
  );
}

function BillingPanel({ products, payments, checkouts, busy, onCheckout }) {
  return (
    <div className="vf-account-billing-stack">
      <article className="vf-account-shop" aria-labelledby="billing-shop-title">
        <header>
          <span>Boutique</span>
          <h2 id="billing-shop-title">Premium et credits IA</h2>
        </header>
        <div className="vf-account-shop-grid">
          {products.map((product) => (
            <button
              key={product.key}
              type="button"
              className="vf-account-shop-item"
              disabled={busy}
              onClick={() => onCheckout(product.key)}
            >
              <strong>{product.label}</strong>
              <span>{product.detail}</span>
            </button>
          ))}
        </div>
      </article>
      <AccountTable
        title="Paiements"
        empty="Aucun paiement Stripe fulfil par webhook pour ce compte."
        rows={payments.map((payment) => [
          payment.productType || "payment",
          payment.status || "unknown",
          payment.stripeSessionId || payment.id,
          safeDate(payment.createdAt),
        ])}
        columns={["Produit", "Statut", "Session", "Date"]}
      />
      <AccountTable
        title="Sessions Checkout"
        empty="Aucune session Checkout creee depuis ce compte."
        rows={checkouts.map((checkout) => [
          checkout.productKey || checkout.productType || "checkout",
          checkout.status || "unknown",
          checkout.stripeSessionId || checkout.id,
          safeDate(checkout.updatedAt || checkout.createdAt),
        ])}
        columns={["Produit", "Statut", "Session", "Mise a jour"]}
      />
    </div>
  );
}
