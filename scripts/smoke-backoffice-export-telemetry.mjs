import assert from "node:assert/strict";
import { readFile, writeFile, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = path.join(process.cwd(), "src", "app", "backoffice", "exportTelemetry.js");
const backofficeClientPath = path.join(process.cwd(), "src", "app", "backoffice", "BackofficeClient.jsx");
const tempDir = await mkdtemp(path.join(os.tmpdir(), "vibefx-export-telemetry-"));
const tempModulePath = path.join(tempDir, "exportTelemetry.mjs");
await writeFile(tempModulePath, await readFile(sourcePath, "utf8"), "utf8");
const backofficeSource = await readFile(backofficeClientPath, "utf8");

const {
  aggregateCloudBillingTelemetry,
  aggregateVideoExportTelemetry,
  estimateVideoExportCost,
} = await import(pathToFileURL(tempModulePath).href);

const now = new Date("2026-06-05T12:00:00.000Z");
const jobs = [
  {
    id: "job_ready",
    status: "ready",
    createdAt: "2026-06-05T10:00:00.000Z",
    manifest: {
      project: { duration: 10 },
      render: { width: 1920, height: 1080, fps: 30 },
    },
    rendererResult: { elapsedMs: 24_000 },
    output: { sizeBytes: 5 * 1024 * 1024 },
  },
  {
    id: "job_failed",
    status: "failed",
    createdAt: "2026-06-03T10:00:00.000Z",
    manifest: {
      project: { duration: 4 },
      render: { width: 1080, height: 1920, fps: 30 },
    },
  },
  {
    id: "job_old",
    status: "ready",
    createdAt: "2026-05-01T10:00:00.000Z",
    manifest: {
      project: { duration: 60 },
      render: { width: 1080, height: 1080, fps: 30 },
    },
  },
];

const readyCost = estimateVideoExportCost(jobs[0]);
assert.ok(readyCost.estimatedEur > 0, "ready export should have an estimated cost");
assert.equal(readyCost.renderSeconds, 24);

const telemetry = aggregateVideoExportTelemetry(jobs, now);
const day = telemetry.ranges.find((range) => range.key === "day");
const week = telemetry.ranges.find((range) => range.key === "week");
const month = telemetry.ranges.find((range) => range.key === "month");

assert.equal(day.totalJobs, 1);
assert.equal(day.readyExports, 1);
assert.equal(week.totalJobs, 2);
assert.equal(week.failedJobs, 1);
assert.equal(month.totalJobs, 2);
assert.equal(telemetry.recentJobs[0].id, "job_ready");

const billingTelemetry = aggregateCloudBillingTelemetry({
  status: "ready",
  source: "cloud-billing-bigquery",
  table: "billing_project.billing_dataset.gcp_billing_export_v1",
  currency: "EUR",
  services: [
    { service: "Cloud Run", cost: 0.006, credits: 0, netCost: 0.006, currency: "EUR" },
  ],
  rows: [
    {
      usageDate: "2026-06-05",
      service: "Cloud Run",
      sku: "CPU Allocation Time",
      projectId: "vibefx-v2",
      currency: "EUR",
      cost: 0.004,
      credits: 0,
      netCost: 0.004,
    },
    {
      usageDate: "2026-06-03",
      service: "Cloud Run",
      sku: "Memory Allocation Time",
      projectId: "vibefx-v2",
      currency: "EUR",
      cost: 0.002,
      credits: -0.001,
      netCost: 0.001,
    },
  ],
}, now);
assert.equal(billingTelemetry.status, "ready");
assert.equal(billingTelemetry.ranges.find((range) => range.key === "day").netCost, 0.004);
assert.equal(billingTelemetry.ranges.find((range) => range.key === "week").netCost, 0.005);
assert.equal(billingTelemetry.services[0].service, "Cloud Run");

assert.match(backofficeSource, /httpsCallable\(firebaseFunctions,\s*"getVideoExportAdminTelemetry"\)/, "backoffice must try the admin-global export telemetry callable first");
assert.match(backofficeSource, /where\("uid",\s*"==",\s*currentUser\.uid\)/, "backoffice must keep an owner-scoped fallback for non-admin users");
assert.match(backofficeSource, /Vue admin globale/, "backoffice must label the global admin telemetry scope");
assert.match(backofficeSource, /Vue limitee aux jobs lisibles par ce compte/, "backoffice must label the owner-scoped fallback scope");
assert.match(backofficeSource, /Billing Export BigQuery/, "backoffice must label real billing telemetry as BigQuery-backed");
assert.match(backofficeSource, /Estimation/, "backoffice must keep internal estimates separate from billed costs");

console.log("smoke-backoffice-export-telemetry: ok");
