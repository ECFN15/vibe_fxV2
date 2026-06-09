# VibeCut Cost Telemetry Architecture - 2026-06-07

## Objectif

Mettre en place une telemetry couts professionnelle pour VibeCut, capable de repondre rapidement a quatre questions :

- Combien les exports video coutent-ils maintenant selon VibeCut ?
- Est-ce que Cloud Run, App Hosting ou Functions sont en surcharge ?
- Quelle est la facture Google officielle quand les donnees Billing arrivent ?
- Quel job, service, utilisateur ou test explique une derive ?

Le backoffice ne doit jamais afficher des `0,00 EUR` trompeurs. Une absence de source doit etre affichee comme `Non configure`, `Aucune ligne lue`, `Donnee stale` ou `Estimation incomplete`.

## Verdict

Le cout Google exact en temps reel n'existe pas via Cloud Billing. La bonne architecture est hybride :

1. Estimation live interne par job/export, ecrite par le serveur.
2. Cloud Monitoring et Cloud Logging pour l'activite quasi temps reel.
3. Cloud Billing Export BigQuery pour la facture officielle differee.
4. Reconciliation estimation/facture quand les donnees Google arrivent.
5. Alertes et kill switches pour gerer les pics avant que la facture finale soit connue.

## Sources de verite

### Estimation live VibeCut

Source principale pour piloter l'urgence.

Chaque export serveur doit creer et mettre a jour `videoExportJobs/{jobId}` avec :

- `startedAt`, `endedAt`, `status`, `phase`, `attempt`, `retryCount`.
- `service`, `region`, `revision`, `rendererMode`.
- `allocatedVcpu`, `allocatedMemoryGiB`, `concurrency`.
- `renderElapsedMs`, `downloadMs`, `probeMs`, `ffmpegMs`, `uploadMs`, `finalizeMs`.
- `inputBytes`, `outputBytes`, `clipCount`, `audioCount`, `durationMs`, `format`.
- `estimatedComputeCost`, `estimatedStorageCost`, `estimatedRequestCost`, `estimatedTotalCost`.
- `uid`, `ownerUid`, `devRun`, `source`, `workspaceId` quand disponible.

Les tests directs K1 qui appellent Cloud Run hors workflow doivent aussi produire un evenement telemetry ou etre marques clairement comme `hors jobs Firestore`.

### Cloud Monitoring

Source operationnelle rapide pour savoir si ca chauffe.

Sur Cloud Run et Functions v2, suivre au minimum :

- request count.
- request latency p50/p95/p99.
- response codes 4xx/5xx/429.
- instance count.
- billable instance time.
- CPU utilization.
- memory utilization.
- network sent/received bytes.
- pending requests / queue pressure quand disponible.
- concurrency effective.

Ces donnees ne sont pas une facture par job, mais elles permettent de detecter une surcharge ou une anomalie en quelques minutes.

### Cloud Logging

Source de correlation fine.

Chaque job doit ecrire des logs structures avec :

- `jobId`, `renderId`, `uid`, `service`, `revision`, `region`.
- `eventType` : `job.created`, `renderer.started`, `ffmpeg.started`, `ffmpeg.completed`, `output.uploaded`, `job.ready`, `job.failed`, `job.cancelled`.
- `durationMs`, `bytesIn`, `bytesOut`, `status`, `attempt`.
- `estimatedCostEur` et hypotheses de calcul.

Ne pas mettre `jobId` en label de metrique haute cardinalite. Le garder dans les logs et Firestore.

### Cloud Billing Export BigQuery

Source comptable officielle, mais differee.

Activer :

- Standard cost export.
- Detailed usage cost export.
- Pricing export si possible pour versionner les prix et recalibrer les estimations.

Le backoffice doit afficher cette source comme `Facture Google BigQuery`, pas comme cout temps reel. Elle sert a comparer la facture nette/brute/credits avec l'estimation VibeCut.

## Formule d'estimation renderer

Pour le Cloud Run renderer avec concurrency `1`, l'estimation par job est raisonnablement fiable :

```text
billable_seconds ~= ceil(duration_ms / 100) / 10
cpu_cost ~= billable_seconds * allocated_vcpu * unit_price_vcpu_second
memory_cost ~= billable_seconds * allocated_gib * unit_price_gib_second
request_cost ~= request_count * unit_price_request
egress_cost ~= output_gib * unit_price_egress
storage_cost ~= output_gib * unit_price_storage_gib_day * retention_days
job_estimate ~= cpu_cost + memory_cost + request_cost + egress_cost + storage_cost
```

Si concurrency > 1, l'attribution par job devient approximative. Repartir alors le temps facturable par poids :

```text
job_weight = duration_ms * complexity_score
job_share = job_weight / sum(instance_window_job_weights)
job_cost = instance_window_cost * job_share
```

Pour VibeCut, le renderer video doit rester en concurrency basse tant que chaque export consomme beaucoup de CPU/memoire.

## Reconciliation

Creer une couche de rapprochement avec trois vues :

- `VibeCut Live Estimate` : agregats Firestore/events.
- `Google Billing` : lignes BigQuery Billing par jour/service/SKU/projet.
- `Reconciliation` : ecart estimation/facture, lignes non correlees, jobs sans metriques, services factures inattendus.

Exemples d'etats :

- `ready` : source presente et fraiche.
- `partial` : une source manque.
- `stale` : derniere donnee trop ancienne.
- `error` : lecture impossible.
- `not_configured` : source pas branchee.
- `empty_confirmed` : zero confirme par une source valide.

## UX backoffice recommandee

Console dense, sobre, orientee diagnostic.

Premier viewport :

- Barre haute : periode, environnement, source active, refresh, statut BigQuery.
- Carte `Estimation VibeCut live`.
- Carte `Facture Google BigQuery`.
- Carte `Ecart estimation/facture`.
- Petites cartes : jobs actifs, echecs/retries, latence p95, cout estime/minute.
- Table jobs recents.
- Rail alertes compact.

Colonnes table jobs :

- Job ID.
- Statut.
- User.
- Service/revision.
- Preset/format.
- Duree video.
- Temps rendu.
- Output size.
- Cout estime.
- Facture liee si disponible.
- Ecart.
- Date.

Alertes a afficher :

- Billing Export non configure.
- BigQuery lisible mais aucune ligne Cloud Run.
- Facture Google disponible mais aucun job VibeCut sur la periode.
- Jobs sans duree renderer.
- Jobs ready sans output size.
- Ecart estimation/facture > seuil.
- Service facture non attendu.
- Donnees Billing stale > 48h.
- Beaucoup de retries sur une fenetre courte.
- Instance count proche de max instances.
- P95 latency ou 5xx en hausse.

## Regles anti-zeros trompeurs

- Source absente : afficher `Non configure`, pas `0,00 EUR`.
- Source configuree sans ligne : afficher `Aucune ligne lue`.
- Periode sans jobs confirmes : afficher `Aucun job sur cette periode`.
- Champ manquant : afficher `Non disponible`.
- Cout vraiment zero : afficher `0,00 EUR confirme` avec la source.
- BigQuery en erreur : afficher `Lecture erreur` et conserver la derniere valeur avec badge `stale` si elle existe.
- Estimation impossible : afficher `Estimation incomplete`.
- Facture pas fraiche : afficher `Delai Billing possible`.
- Toujours afficher la source sous la valeur : `jobs Firestore`, `Cloud Monitoring`, `BigQuery Billing`, `estimation locale`.

## Control layer

Les budgets Google alertent, mais ne coupent pas instantanement la depense. VibeCut doit avoir ses propres garde-fous applicatifs :

- limiter la queue export.
- refuser temporairement les nouveaux renders non prioritaires.
- reduire les presets lourds.
- baisser `maxInstances` du renderer.
- bloquer les retries automatiques.
- afficher un etat `costGuard=warning|restricted|locked`.
- envoyer une notification dev quand cout estime/minute ou retries/minute depasse un seuil.

Budgets Google recommandes :

- budget projet global : 50%, 80%, 90%, 100%.
- budget compute serverless : Cloud Run, Cloud Run Functions, App Hosting.
- budget telemetry : BigQuery, Logging, Monitoring.

## Discipline de deploiement

Les agents doivent eviter les rollouts excessifs :

- developper et verifier en local avec `npm run dev`.
- grouper les petites corrections.
- lancer les smoke tests, lint et build avant deploy.
- eviter `gcloud run deploy --source` en boucle, car le deploy depuis source declenche Cloud Build/buildpacks.
- redeployer `render-service/` seulement quand le renderer change vraiment.
- si plusieurs essais renderer sont necessaires, construire une image versionnee une fois puis redeployer cette image.

## Implementation cible

Phase 1 - Instrumentation serveur :

- enrichir `functions/src/videoExport.js` avec evenements d'etat et cout estime serveur.
- enrichir `render-service/src/server.js` avec metriques par phase et revision.
- stocker `renderer.metrics` dans le job.

Phase 2 - Dashboard fiable :

- modifier `src/app/backoffice/exportTelemetry.js` pour separer estimation, facture, reconciliation.
- modifier `src/app/backoffice/BackofficeClient.jsx` pour afficher les etats `not_configured`, `stale`, `partial`, `empty_confirmed`.
- supprimer les `0,00 EUR` affiches sans source confirmee.

Phase 3 - BigQuery et Monitoring :

- activer Billing Export BigQuery standard + detailed.
- creer des vues BigQuery normalisees.
- ajouter des alertes Cloud Monitoring.
- ajouter budget alerts + Pub/Sub.

Phase 4 - Reconciliation pro :

- creer des agregats journaliers/horaires.
- detecter lignes non correlees.
- calibrer les prix unitaires depuis Pricing Export.
- exposer un drilldown job/service/user.

## Sources officielles

- Cloud Run deploy from source : https://docs.cloud.google.com/run/docs/deploying-source-code
- Cloud Run monitoring : https://docs.cloud.google.com/run/docs/monitoring
- Cloud Run metrics : https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Cloud Run pricing : https://cloud.google.com/run/pricing
- Cloud Billing Export BigQuery : https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery
- Cloud Billing tables frequency : https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-tables
- Cloud Billing budgets : https://docs.cloud.google.com/billing/docs/how-to/budgets
- Firebase App Hosting costs : https://firebase.google.com/docs/app-hosting/costs
