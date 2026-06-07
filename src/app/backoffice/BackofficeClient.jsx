"use client";

import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AI_FRONT_SURFACES, AI_INTERFACES_DEFAULT_ENABLED } from "@/config/aiLaunch";
import { useAiLaunchSettings } from "@/hooks/useAiLaunchSettings";
import { auth, db, firebaseReady, functions as firebaseFunctions } from "@/lib/firebase";
import {
  aggregateCloudBillingTelemetry,
  aggregateVideoExportTelemetry,
  estimateVideoExportCost,
} from "./exportTelemetry";

export default function BackofficeClient() {
  const { aiInterfacesEnabled, setAiInterfacesEnabled, resetAiInterfaces } = useAiLaunchSettings();
  const [user, setUser] = useState(auth?.currentUser || null);
  const [exportJobs, setExportJobs] = useState([]);
  const [cloudBilling, setCloudBilling] = useState(null);
  const [exportTelemetryState, setExportTelemetryState] = useState({
    loading: Boolean(auth && db),
    message: auth ? "" : "Firebase Auth n'est pas initialise.",
  });
  const disabledCount = aiInterfacesEnabled ? 0 : AI_FRONT_SURFACES.length;
  const exportTelemetry = useMemo(() => aggregateVideoExportTelemetry(exportJobs), [exportJobs]);
  const billingTelemetry = useMemo(() => aggregateCloudBillingTelemetry(cloudBilling), [cloudBilling]);

  const loadExportTelemetry = useCallback(async (currentUser) => {
    if (!firebaseReady || !db || !currentUser) {
      setExportJobs([]);
      setCloudBilling(null);
      setExportTelemetryState({
        loading: false,
        message: firebaseReady ? "Connecte un compte Firebase pour voir les exports." : "Firebase n'est pas configure.",
      });
      return;
    }

    setExportTelemetryState({ loading: true, message: "" });
    try {
      if (firebaseFunctions) {
        try {
          const callable = httpsCallable(firebaseFunctions, "getVideoExportAdminTelemetry");
          const result = await callable({ limit: 120 });
          const data = result.data || {};
          if (Array.isArray(data.jobs)) {
            setExportJobs(data.jobs);
            setCloudBilling(data.cloudBilling || null);
            setExportTelemetryState({
              loading: false,
              message: `Vue admin globale: ${data.summary?.totalJobs ?? data.jobs.length} jobs recents. ${formatBillingStateMessage(data.cloudBilling)}`,
            });
            return;
          }
        } catch (adminError) {
          if (!String(adminError.code || "").includes("permission-denied")) {
            console.warn("Admin export telemetry unavailable", adminError);
          }
        }
      }

      const snapshot = await getDocs(query(
        collection(db, "videoExportJobs"),
        where("uid", "==", currentUser.uid),
        orderBy("createdAt", "desc"),
        limit(100)
      ));
      setExportJobs(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      setCloudBilling(null);
      setExportTelemetryState({
        loading: false,
        message: "Vue limitee aux jobs lisibles par ce compte. La vue globale demande un compte admin.",
      });
    } catch (error) {
      setExportJobs([]);
      setCloudBilling(null);
      setExportTelemetryState({
        loading: false,
        message: error.message || "Lecture des exports impossible.",
      });
    }
  }, []);

  useEffect(() => {
    if (!auth) {
      return undefined;
    }
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      loadExportTelemetry(currentUser);
    });
  }, [loadExportTelemetry]);

  return (
    <main className="vf-backoffice">
      <nav className="vf-nav vf-backoffice-nav" aria-label="Navigation backoffice">
        <Link href="/" className="vf-brand" aria-label="Vibe_fx V2 accueil">
          <span className="vf-brand-mark" aria-hidden="true" />
          Vibe_fx
        </Link>
        <div className="vf-nav-links">
          <Link href="/studio">
            <span className="vf-nav-link-dot" aria-hidden="true" />
            Studio
          </Link>
          <Link href="/pricing">
            <span className="vf-nav-link-dot" aria-hidden="true" />
            Tarifs
          </Link>
        </div>
        <Link href="/backoffice" className="vf-nav-cta" aria-current="page">
          Backoffice
        </Link>
      </nav>

      <section className="vf-backoffice-hero" aria-labelledby="backoffice-title">
        <div className="vf-backoffice-copy">
          <p className="vf-kicker">Launch control</p>
          <h1 id="backoffice-title">Backoffice IA pour le premier lancement prod.</h1>
          <p>
            Firebase n&apos;est pas encore branche pour securiser ce backoffice. Ce switch agit donc comme
            override local navigateur: le deploy garde les interfaces IA masquees par defaut, et le bouton
            permet de les remettre en place pour verifier le prochain lancement.
          </p>
        </div>

        <aside className="vf-ai-launch-card" data-enabled={aiInterfacesEnabled ? "true" : "false"}>
          <span>{aiInterfacesEnabled ? "Override local actif" : "Mode lancement prod"}</span>
          <strong>{aiInterfacesEnabled ? "Interfaces IA visibles" : "Interfaces IA masquees"}</strong>
          <p>
            {aiInterfacesEnabled
              ? "Ce navigateur remonte les entrees IA pour controle. Le flag prod reste separe."
              : `${disabledCount} surfaces front/API IA sont masquees pour le lancement.`}
          </p>
          <div className="vf-ai-launch-actions">
            <button
              type="button"
              onClick={() => setAiInterfacesEnabled(!aiInterfacesEnabled)}
            >
              {aiInterfacesEnabled ? "Masquer l\u0027IA" : "Remettre l\u0027IA en place"}
            </button>
            <button type="button" onClick={resetAiInterfaces}>
              Revenir au defaut
            </button>
          </div>
          <dl>
            <div>
              <dt>Defaut deploy</dt>
              <dd>{AI_INTERFACES_DEFAULT_ENABLED ? "IA on" : "IA off"}</dd>
            </div>
            <div>
              <dt>Portee</dt>
              <dd>Navigateur local</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="vf-backoffice-grid" aria-label="Cartographie IA front">
        <article>
          <span>Objectif prod</span>
          <strong>Lancer sans fonctionnalite IA visible.</strong>
          <p>Le studio, la publication, le pricing premium et les sources musicales non IA restent accessibles.</p>
        </article>
        <article>
          <span>Retour un clic</span>
          <strong>Override local reversible.</strong>
          <p>Le code IA reste en place, mais non monte tant que le switch ou le flag env ne l&apos;active pas.</p>
        </article>
        <article>
          <span>Suite Firebase</span>
          <strong>Remplacer par un vrai gate serveur.</strong>
          <p>Quand Auth/claims seront prets, ce panneau devra devenir admin-only.</p>
        </article>
      </section>

      <ExportTelemetryPanel
        user={user}
        telemetry={exportTelemetry}
        billingTelemetry={billingTelemetry}
        jobs={exportJobs}
        loading={exportTelemetryState.loading}
        message={exportTelemetryState.message}
        onRefresh={() => loadExportTelemetry(auth?.currentUser || user)}
      />

      <section className="vf-backoffice-table-panel" aria-labelledby="ai-map-title">
        <header>
          <div>
            <p className="vf-kicker">Surface map</p>
            <h2 id="ai-map-title">Interfaces IA neutralisees.</h2>
          </div>
          <span className="vf-backoffice-status" data-enabled={aiInterfacesEnabled ? "true" : "false"}>
            {aiInterfacesEnabled ? "Visible localement" : "Masque par defaut"}
          </span>
        </header>

        <div className="vf-backoffice-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Zone</th>
                <th>Route</th>
                <th>Surface</th>
                <th>Etat sans IA</th>
              </tr>
            </thead>
            <tbody>
              {AI_FRONT_SURFACES.map((surface) => (
                <tr key={surface.id}>
                  <td>{surface.zone}</td>
                  <td><code>{surface.route}</code></td>
                  <td>{surface.surface}</td>
                  <td>{surface.disabledState}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function ExportTelemetryPanel({ user, telemetry, billingTelemetry, jobs, loading, message, onRefresh }) {
  return (
    <section className="vf-export-ops" aria-labelledby="export-ops-title" aria-busy={loading}>
      <header className="vf-export-ops-head">
        <div>
          <p className="vf-kicker">Export telemetry</p>
          <h2 id="export-ops-title">Exports video et cout Cloud Run.</h2>
          <p>
            Les couts Google viennent du Billing Export BigQuery quand il est configure; les jobs gardent une estimation interne pour comparer.
          </p>
        </div>
        <div className="vf-export-ops-actions">
          <span>{user?.email || user?.uid || "Compte non connecte"}</span>
          <button type="button" onClick={onRefresh} disabled={loading}>
            {loading ? "Lecture..." : "Rafraichir"}
          </button>
        </div>
      </header>

      {message ? <p className="vf-export-ops-note">{message}</p> : null}

      <div className="vf-export-metric-grid" aria-label="Synthese exports">
        {telemetry.ranges.map((range) => (
          <article key={range.key} className="vf-export-metric-card">
            <span>{range.label}</span>
            <strong>{range.readyExports}</strong>
            <dl>
              <div><dt>Jobs</dt><dd>{range.totalJobs}</dd></div>
              <div><dt>Actifs</dt><dd>{range.activeJobs}</dd></div>
              <div><dt>Echecs</dt><dd>{range.failedJobs}</dd></div>
              <div><dt>Estimation</dt><dd>{formatMoney(range.estimatedCostEur)}</dd></div>
            </dl>
          </article>
        ))}
      </div>

      <div className="vf-export-billing-grid" aria-label="Couts Google Cloud Run">
        {billingTelemetry.ranges.map((range) => (
          <article key={range.key} className="vf-export-billing-card">
            <span>{range.label}</span>
            <strong>{formatMoney(range.netCost, billingTelemetry.currency)}</strong>
            <dl>
              <div><dt>Cout brut</dt><dd>{formatMoney(range.actualCost, billingTelemetry.currency)}</dd></div>
              <div><dt>Credits</dt><dd>{formatMoney(range.credits, billingTelemetry.currency)}</dd></div>
              <div><dt>Lignes</dt><dd>{range.rows}</dd></div>
            </dl>
          </article>
        ))}
      </div>

      <div className="vf-export-billing-panel">
        <header>
          <div>
            <span>Google Billing</span>
            <strong>{formatBillingPanelTitle(billingTelemetry)}</strong>
          </div>
          <small>{billingTelemetry.table || billingTelemetry.message || "Configure Billing Export BigQuery pour activer la facture reelle."}</small>
        </header>
        {billingTelemetry.services.length ? (
          <div className="vf-export-service-list">
            {billingTelemetry.services.map((service) => (
              <div key={service.service}>
                <span>{service.service}</span>
                <strong>{formatMoney(service.netCost, service.currency || billingTelemetry.currency)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p>Aucune ligne Cloud Run facturee n&apos;est disponible dans la fenetre lue.</p>
        )}
      </div>

      <div className="vf-export-ops-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Job</th>
              <th>Statut</th>
              <th>Rendu</th>
              <th>Output</th>
              <th>Cout estime</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length ? telemetry.recentJobs.map((job) => {
              const estimate = estimateVideoExportCost(job);
              return (
                <tr key={job.id}>
                  <td><code>{job.id}</code></td>
                  <td><span className="vf-export-status" data-status={job.status || "unknown"}>{formatExportStatus(job.status)}</span></td>
                  <td>{formatRenderSpec(job, estimate)}</td>
                  <td>{formatBytes(estimate.outputSizeBytes)}</td>
                  <td>{formatMoney(estimate.estimatedEur)}</td>
                  <td>{formatDate(job.createdAtDate || job.createdAt)}</td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={6}>Aucun job export visible pour ce compte.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatBillingStateMessage(cloudBilling) {
  if (cloudBilling?.status === "ready") {
    return "Cout Google Cloud Run lu depuis Billing Export BigQuery.";
  }
  if (cloudBilling?.status === "error") {
    return "Billing Export BigQuery configure mais lecture en erreur.";
  }
  return "Billing Export BigQuery non configure: estimation interne uniquement.";
}

function formatBillingPanelTitle(billingTelemetry) {
  if (billingTelemetry.status === "ready") return "Facture Cloud Run";
  if (billingTelemetry.status === "error") return "Lecture facture en erreur";
  return "Facture non branchee";
}

function formatExportStatus(status) {
  const labels = {
    queued: "En file",
    rendering: "Rendu",
    finalizing: "Finalisation",
    ready: "Pret",
    failed: "Echoue",
    cancelled: "Annule",
  };
  return labels[status] || status || "Inconnu";
}

function formatRenderSpec(job, estimate) {
  const duration = Number(job.manifest?.project?.duration || job.estimates?.durationSeconds || 0);
  const size = estimate.width && estimate.height ? `${estimate.width}x${estimate.height}` : "Format inconnu";
  const fps = estimate.fps ? `${estimate.fps} FPS` : "FPS inconnu";
  return `${size} - ${fps} - ${formatDuration(duration)}`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "duree inconnue";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}m ${String(rest).padStart(2, "0")}s`;
}

function formatMoney(value, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: value >= 1 ? 2 : 4,
  }).format(Number(value || 0));
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!bytes) return "Non dispo";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  if (bytes < 1024 ** 3) return `${(bytes / (1024 ** 2)).toFixed(1)} Mo`;
  return `${(bytes / (1024 ** 3)).toFixed(2)} Go`;
}

function formatDate(value) {
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Non disponible";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(date);
}
