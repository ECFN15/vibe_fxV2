"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth, db } from "../../lib/firebase.js";
import PublicationComposer from "./components/PublicationComposer";
import { normalizeVibeFxDraft } from "./helpers/publicationHelpers";
import VibeFxStudio from "../vibefx-studio";

export default function PublicationsManager() {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("dashboard");
  const [draft, setDraft] = useState(null);
  const [selectedPublication, setSelectedPublication] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(auth));
  const [authError, setAuthError] = useState(auth ? "" : "Firebase Auth n'est pas initialise.");
  const currentUid = currentUser?.uid || "";

  const loadPublications = useCallback(async () => {
    setLoading(true);
    try {
      if (!db || !currentUid) {
        setPublications([]);
        return;
      }

      const snapshot = await getDocs(query(
        collection(db, "publications"),
        where("ownerUid", "==", currentUid),
        orderBy("updatedAt", "desc")
      ));
      setPublications(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    } catch (error) {
      console.error("Publications load error:", error);
      setPublications([]);
    } finally {
      setLoading(false);
    }
  }, [currentUid]);

  useEffect(() => {
    if (!auth) {
      return undefined;
    }

    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setAuthLoading(false);
        setAuthError("");
        return;
      }

      setAuthLoading(true);
      try {
        const credential = await signInAnonymously(auth);
        setCurrentUser(credential.user);
        setAuthError("");
      } catch (error) {
        console.error("Anonymous auth error:", error);
        setCurrentUser(null);
        setAuthError(error.message || "Connexion anonyme Firebase indisponible.");
      } finally {
        setAuthLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (authLoading) return undefined;
    const timer = window.setTimeout(() => {
      void loadPublications();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, loadPublications]);

  const handleImport = (payload) => {
    setDraft(normalizeVibeFxDraft(payload));
    setSelectedPublication(null);
    setMode("publish");
  };

  const handleSelectPublication = (publication) => {
    setSelectedPublication(publication);
    setDraft(null);
  };

  const handleDelete = async (publication) => {
    if (!window.confirm(`Supprimer "${publication.title || "cette publication"}" ?`)) return;
    await deleteDoc(doc(db, "publications", publication.id));
    if (selectedPublication?.id === publication.id) setSelectedPublication(null);
    await loadPublications();
  };

  const handleSetHomeFeature = async (publicationId) => {
    const updates = publications
      .filter((item) => item.featured || item.id === publicationId)
      .map((item) => updateDoc(doc(db, "publications", item.id), {
        featured: item.id === publicationId,
        updatedAt: serverTimestamp(),
      }));

    await Promise.all(updates);
    setSelectedPublication((current) => current ? { ...current, featured: current.id === publicationId } : current);
    await loadPublications();
  };

  const handleSavedPublication = (publication) => {
    setSelectedPublication(publication);
    setDraft(null);
    setPublications((current) => {
      const withoutSaved = current.filter((item) => item.id !== publication.id);
      const normalized = publication.featured
        ? withoutSaved.map((item) => ({ ...item, featured: false }))
        : withoutSaved;
      return [publication, ...normalized];
    });
  };

  return (
    <div className={`pub-manager vfx-mode ${mode === "layout" ? "is-layout" : "is-publish"}`}>
      {mode === "layout" ? (
        <div className="pub-layout-fullscreen">
          <VibeFxStudio
            publicationsCount={publications.length}
            onOpenPublications={() => setMode("dashboard")}
            onImportToPublication={handleImport}
          />
        </div>
      ) : (
        <PublicationComposer
          draft={draft}
          publication={selectedPublication}
          publications={publications}
          loading={loading || authLoading}
          authError={authError}
          onBackToLayout={() => setMode("layout")}
          onSelectPublication={handleSelectPublication}
          onDeletePublication={handleDelete}
          onSetHomeFeature={handleSetHomeFeature}
          onSaved={handleSavedPublication}
        />
      )}
    </div>
  );
}
