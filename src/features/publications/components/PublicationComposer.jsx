"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { collection, doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions, storage } from "../../../lib/firebase.js";
import {
  DEFAULT_TEXT,
  buildChecker,
  buildPublicationData,
  getCanonicalFormat,
  getFunctionErrorMessage,
  resolvePublicationAssets,
} from "../helpers/publicationHelpers";
import MetaOAuthPanel from "./MetaOAuthPanel";
import PublicationDashboard from "./PublicationDashboard";
import PublicationList from "./PublicationList";
import PublicationPreview from "./PublicationPreview";

export default function PublicationComposer({ draft, publication, publications, loading, authError = "", currentUser = null, accountData = null, onBackToLayout, onSelectPublication, onDeletePublication, onSetHomeFeature, onSaved }) {
  const initialFormat = useMemo(
    () => getCanonicalFormat(draft?.format || publication?.format),
    [draft?.format, publication?.format]
  );
  const [title, setTitle] = useState(publication?.title || "");
  const [excerpt, setExcerpt] = useState(publication?.excerpt || "");
  const [content, setContent] = useState(publication?.content || "");
  const [caption, setCaption] = useState(publication?.caption || draft?.caption || "");
  const [tags, setTags] = useState((publication?.tags || []).join(", "));
  const [featured, setFeatured] = useState(Boolean(publication?.featured));
  const [publishKind, setPublishKind] = useState(publication?.format?.publishKind || draft?.format?.publishKind || initialFormat.publishKind);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [featureSaving, setFeatureSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [metaOAuth, setMetaOAuth] = useState({ status: "loading" });
  const [oauthBusy, setOauthBusy] = useState(false);
  const canUseMetaFunctions = Boolean(functions);

  const visualUrl = draft?.image || publication?.image || "";
  const socialImages = useMemo(
    () => draft?.socialImages?.length
      ? draft.socialImages
      : publication?.socialImages || (visualUrl ? [{ url: visualUrl, index: 0, width: initialFormat.width, height: initialFormat.height }] : []),
    [draft, initialFormat, publication, visualUrl]
  );
  const format = useMemo(
    () => ({ ...initialFormat, publishKind, slices: initialFormat.slices || socialImages.length || 1 }),
    [initialFormat, publishKind, socialImages.length]
  );
  const textLayers = useMemo(
    () => draft?.layoutDraft?.textLayers || publication?.layoutDraft?.textLayers || [DEFAULT_TEXT],
    [draft, publication]
  );
  const exportSize = draft?.imageBlob?.size || null;
  const checker = useMemo(() => buildChecker({ caption, format, exportSize, textLayers }), [caption, exportSize, format, textLayers]);
  const stats = useMemo(() => {
    const drafts = publications.filter((item) => item.status !== "published").length;
    const published = publications.filter((item) => item.status === "published").length;
    const synced = publications.filter((item) => item.platformStatus?.instagram?.status === "published").length;
    return { drafts, published, synced };
  }, [publications]);

  const loadMetaOAuthStatus = useCallback(async () => {
    if (!canUseMetaFunctions) {
      setMetaOAuth({
        status: "unavailable",
        lastError: "Firebase Functions non initialise. Configure NEXT_PUBLIC_FIREBASE_* avant OAuth Meta.",
      });
      return;
    }
    try {
      const callable = httpsCallable(functions, "getMetaOAuthStatus");
      const result = await callable();
      setMetaOAuth(result.data || { status: "not_connected" });
    } catch (error) {
      console.error("Meta OAuth status error:", error);
      setMetaOAuth({ status: "error", lastError: getFunctionErrorMessage(error) });
    }
  }, [canUseMetaFunctions]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMetaOAuthStatus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadMetaOAuthStatus]);

  const openMetaOAuthConnect = async () => {
    if (!canUseMetaFunctions) {
      setMessage("Connexion OAuth indisponible: configure Firebase Functions et les secrets Meta avant de connecter un compte.");
      return;
    }
    setOauthBusy(true);
    setMessage("");
    try {
      const callable = httpsCallable(functions, "createMetaOAuthConnectUrl");
      const result = await callable();
      const url = result.data?.url;
      if (!url) throw new Error("URL OAuth Meta manquante.");
      window.open(url, "meta-oauth", "width=720,height=820,noopener,noreferrer");
      setMessage("Fenetre Meta ouverte. Termine la connexion puis actualise le statut OAuth.");
      window.setTimeout(loadMetaOAuthStatus, 4500);
    } catch (error) {
      console.error("Meta OAuth connect error:", error);
      setMessage(`Connexion OAuth impossible: ${getFunctionErrorMessage(error)}`);
    } finally {
      setOauthBusy(false);
    }
  };

  const metaOAuthLabel = metaOAuth?.connected
    ? `OAuth connecte: ${metaOAuth.pageName || metaOAuth.pageId} -> @${metaOAuth.igUsername || metaOAuth.igUserId}`
    : metaOAuth?.status === "loading"
      ? "Verification de la connexion OAuth Meta..."
      : metaOAuth?.status === "error"
        ? `OAuth erreur: ${metaOAuth.lastError || "statut indisponible"}`
        : metaOAuth?.status === "unavailable"
          ? metaOAuth.lastError
        : "OAuth Meta non connecte.";

  const buildData = (status, payload, uid) => buildPublicationData({
    publication,
    title,
    excerpt,
    content,
    caption,
    tags,
    featured,
    status,
    payload,
    initialFormat,
    publishKind,
    draft,
    checker,
    uid,
  });

  const savePublication = async (status = "draft") => {
    setSaving(true);
    setMessage("");
    try {
      const uid = auth?.currentUser?.uid;
      if (!db || !uid) throw new Error("Connexion utilisateur requise pour enregistrer une publication.");
      const publicationRef = publication?.id ? doc(db, "publications", publication.id) : doc(collection(db, "publications"));
      const payload = await resolvePublicationAssets({ storage, draft, publication, format, socialImages, publicationId: publicationRef.id, uid });
      const data = buildData(status, payload, uid);
      if (publication?.id) {
        await updateDoc(publicationRef, data);
      } else {
        await setDoc(publicationRef, { ...data, createdAt: serverTimestamp() });
      }
      if (data.featured) {
        await onSetHomeFeature(publicationRef.id);
      }
      const saved = { ...publication, ...data, id: publicationRef.id, image: payload.imageUrl, socialImages: payload.socialImages };
      onSaved(saved);
      setMessage(status === "published" ? "Publication visible sur le site." : "Brouillon enregistre.");
      return saved;
    } catch (error) {
      console.error("Publication save error:", error);
      const storageHint = error.code === "storage/unauthorized" ? " Les regles Firebase Storage doivent etre deployees pour autoriser /users/{uid}/publications." : "";
      setMessage(`Erreur: ${error.message}.${storageHint}`);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const setHomeFeature = async (publicationId) => {
    setFeatureSaving(true);
    setMessage("");
    try {
      await onSetHomeFeature(publicationId || null);
      setMessage(publicationId ? "Publication mise en avant sur l'accueil." : "Mise en avant retiree de l'accueil.");
    } catch (error) {
      console.error("Home feature update error:", error);
      setMessage(`Erreur: ${error.message}`);
    } finally {
      setFeatureSaving(false);
    }
  };

  const publishToMeta = async () => {
    if (!canUseMetaFunctions) {
      setMessage("Publication reseaux indisponible: Firebase Functions n'est pas initialise.");
      return;
    }
    const saved = await savePublication("published");
    if (!saved?.id) return;
    setSyncing(true);
    setMessage("");
    try {
      const callable = httpsCallable(functions, "publishPublicationToMeta");
      const result = await callable({ publicationId: saved.id, targets: { instagram: true, facebook: true } });
      setMessage(`Synchronisation manuelle terminee: ${JSON.stringify(result.data)}`);
    } catch (error) {
      console.error("Meta publish error:", error);
      setMessage(`Publication reseaux manuelle en attente: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const publishToConnectedMeta = async () => {
    if (!canUseMetaFunctions) {
      setMessage("Publication OAuth indisponible: Firebase Functions n'est pas initialise.");
      return;
    }
    const saved = await savePublication("published");
    if (!saved?.id) return;
    setSyncing(true);
    setMessage("");
    try {
      const callable = httpsCallable(functions, "publishPublicationToConnectedMeta");
      const result = await callable({ publicationId: saved.id, targets: { instagram: true, facebook: true } });
      setMessage(`Synchronisation OAuth terminee: ${JSON.stringify(result.data)}`);
      await loadMetaOAuthStatus();
    } catch (error) {
      console.error("Meta OAuth publish error:", error);
      setMessage(`Publication OAuth en attente: ${getFunctionErrorMessage(error)}`);
    } finally {
      setSyncing(false);
    }
  };

  if (!visualUrl) {
    return (
      <PublicationDashboard
        stats={stats}
        publications={publications}
        loading={loading}
        selectedId={publication?.id}
        onBackToLayout={onBackToLayout}
        onSelectPublication={onSelectPublication}
        onDeletePublication={onDeletePublication}
        onSetHomeFeature={setHomeFeature}
        featureSaving={featureSaving}
        message={authError || message}
        currentUser={currentUser}
        accountData={accountData}
      />
    );
  }

  return (
    <div className="pub-final-page">
      <header className="pub-final-top">
        <div>
          <span>Publication</span>
          <h2>{publication?.id ? "Finaliser la publication" : "Description et preview finale"}</h2>
          <p>{"Le visuel vient de la page Mise en page. Ici on gere le texte, la publication site, la preview Instagram et l'envoi reseaux."}</p>
        </div>
        <div className="pub-final-actions">
          <button type="button" className="pub-ghost" onClick={onBackToLayout}><Icons.LayoutTemplate size={15} /> Ouvrir mise en page</button>
          <button type="button" className="pub-secondary" disabled={saving} onClick={() => savePublication("draft")}>{saving ? <span className="mini-spinner" /> : <Icons.Save size={15} />} Brouillon</button>
          <button type="button" className="pub-primary" disabled={saving} onClick={() => savePublication("published")}>{saving ? <span className="mini-spinner" /> : <Icons.Globe2 size={15} />} Publier site</button>
          <button type="button" className="pub-primary purple" disabled={saving || syncing || !canUseMetaFunctions} onClick={publishToMeta}>{syncing ? <span className="mini-spinner" /> : <Icons.Send size={15} />} Site + reseaux</button>
          <MetaOAuthPanel
            enabled={canUseMetaFunctions}
            connected={Boolean(metaOAuth?.connected)}
            oauthBusy={oauthBusy}
            saving={saving}
            syncing={syncing}
            onConnect={openMetaOAuthConnect}
            onRefresh={loadMetaOAuthStatus}
            onPublish={publishToConnectedMeta}
          />
        </div>
      </header>

      {authError ? <div className="pub-message final">{authError}</div> : null}
      {message ? <div className="pub-message final">{message}</div> : null}
      <div className="pub-message final oauth-status">{metaOAuthLabel}</div>

      <section className="pub-final-stagebar" aria-label="Progression publication">
        <article className="done"><Icons.Check size={15} /><span>Visuel importe</span></article>
        <article className="active"><Icons.PencilLine size={15} /><span>Description & site</span></article>
        <article><Icons.Smartphone size={15} /><span>Preview & reseaux</span></article>
      </section>

      {!visualUrl ? (
        <section className="pub-dashboard-strip">
          <article><strong>{stats.drafts}</strong><span>Brouillons</span></article>
          <article><strong>{stats.published}</strong><span>Publiees site</span></article>
          <article><strong>{stats.synced}</strong><span>Synchronisees Insta</span></article>
          <button type="button" onClick={onBackToLayout}>
            <Icons.LayoutTemplate size={18} />
            <span>Creer une mise en page</span>
          </button>
        </section>
      ) : null}

      <div className="pub-final-grid">
        <aside className="pub-final-list">
          <PublicationList
            publications={publications}
            loading={loading}
            selectedId={publication?.id}
            onSelect={onSelectPublication}
            onDelete={onDeletePublication}
          />
        </aside>

        <section className="pub-final-form">
          {!visualUrl ? (
            <div className="pub-import-needed">
              <Icons.LayoutTemplate size={44} />
              <strong>{"Importe d'abord depuis la page Mise en page"}</strong>
              <button type="button" className="pub-primary" onClick={onBackToLayout}>Ouvrir la mise en page</button>
            </div>
          ) : (
            <>
              <div className="pub-final-card visual">
                <img src={visualUrl} alt="" />
                <div>
                  <span className="pub-final-card-kicker">Visuel source</span>
                  <strong>{initialFormat.label}</strong>
                  <span>{initialFormat.width} x {initialFormat.height}px</span>
                  <em>{socialImages.length} slide{socialImages.length > 1 ? "s" : ""} pour la publication</em>
                </div>
              </div>

              <div className="pub-final-card pub-final-copy">
                <div className="pub-final-card-title">
                  <span className="pub-final-card-kicker">Texte publication</span>
                  <h3>Legende, site et contexte.</h3>
                </div>
                <label className="pub-field"><span>Titre site</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex : Lancement campagne social media" /></label>
                <label className="pub-field"><span>Resume accueil</span><textarea rows={2} value={excerpt} onChange={(event) => setExcerpt(event.target.value)} /></label>
                <label className="pub-field featured"><span>Description Instagram / Facebook</span><textarea rows={7} value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Texte du post, hashtags, appel a l'action..." /></label>
                <label className="pub-field"><span>Contenu page detail</span><textarea rows={5} value={content} onChange={(event) => setContent(event.target.value)} /></label>
                <label className="pub-field"><span>Tags</span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="instagram, facebook, marque" /></label>
                <div className="pub-final-card-title compact">
                  <span className="pub-final-card-kicker">Destination</span>
                </div>
                <label className="pub-checkline"><input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} /> {"Mettre en avant sur l'accueil"}</label>
                {initialFormat.supportsReel ? (
                  <div className="pub-kind-switch">
                    <span>Destination Instagram</span>
                    <button type="button" className={publishKind === "story" ? "active" : ""} onClick={() => setPublishKind("story")}>Story</button>
                    <button type="button" className={publishKind === "reel" ? "active" : ""} onClick={() => setPublishKind("reel")}>Reel</button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </section>

        <PublicationPreview
          imageUrl={visualUrl}
          socialImages={socialImages}
          format={format}
          caption={caption}
          title={title}
          checker={checker}
          exportSize={exportSize}
        />
      </div>
    </div>
  );
}
