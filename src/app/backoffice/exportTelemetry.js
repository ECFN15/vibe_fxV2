export const EXPORT_COST_ASSUMPTIONS = Object.freeze({
  cloudRunVcpu: 2,
  cloudRunMemoryGib: 2,
  cpuSecondUsd: 0.000024,
  memoryGibSecondUsd: 0.0000025,
  storageGibMonthUsd: 0.026,
  usdToEur: 0.92,
});

const GIB = 1024 ** 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export const EXPORT_TELEMETRY_RANGES = Object.freeze([
  { key: "day", label: "Jour", windowMs: DAY_MS },
  { key: "week", label: "Semaine", windowMs: 7 * DAY_MS },
  { key: "month", label: "Mois", windowMs: 30 * DAY_MS },
]);

export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === "function") {
    const next = value.toDate();
    return Number.isNaN(next.getTime()) ? null : next;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function estimateVideoExportCost(job = {}, assumptions = EXPORT_COST_ASSUMPTIONS) {
  const render = job.render || job.manifest?.render || {};
  const project = job.manifest?.project || {};
  const elapsedMs = Number(job.rendererResult?.elapsedMs || job.elapsedMs || 0);
  const durationSeconds = Number(project.duration || job.estimates?.durationSeconds || 0);
  const fallbackSeconds = durationSeconds > 0 ? durationSeconds * 1.35 : 0;
  const renderSeconds = Math.max(elapsedMs > 0 ? elapsedMs / 1000 : 0, fallbackSeconds);
  const outputSizeBytes = Number(job.output?.sizeBytes || job.outputSizeBytes || 0);

  const computeUsd = renderSeconds * (
    assumptions.cloudRunVcpu * assumptions.cpuSecondUsd +
    assumptions.cloudRunMemoryGib * assumptions.memoryGibSecondUsd
  );
  const storageUsdPerDay = outputSizeBytes > 0
    ? (outputSizeBytes / GIB) * assumptions.storageGibMonthUsd / 30
    : 0;
  const estimatedUsd = computeUsd + storageUsdPerDay;

  return {
    renderSeconds,
    outputSizeBytes,
    width: Number(render.width || 0),
    height: Number(render.height || 0),
    fps: Number(render.fps || 0),
    estimatedUsd,
    estimatedEur: estimatedUsd * assumptions.usdToEur,
  };
}

export function aggregateVideoExportTelemetry(jobs = [], now = new Date()) {
  const referenceTime = toDate(now) || new Date();
  const normalizedJobs = jobs
    .map((job) => {
      const createdAt = toDate(job.createdAt);
      const completedAt = toDate(job.completedAt || job.failedAt || job.cancelledAt);
      const estimate = estimateVideoExportCost(job);
      return {
        ...job,
        createdAtDate: createdAt,
        completedAtDate: completedAt,
        estimate,
      };
    })
    .filter((job) => job.createdAtDate);

  const ranges = EXPORT_TELEMETRY_RANGES.map((range) => {
    const startMs = referenceTime.getTime() - range.windowMs;
    const rangeJobs = normalizedJobs.filter((job) => job.createdAtDate.getTime() >= startMs);
    return {
      ...range,
      totalJobs: rangeJobs.length,
      readyExports: rangeJobs.filter((job) => job.status === "ready").length,
      failedJobs: rangeJobs.filter((job) => job.status === "failed").length,
      cancelledJobs: rangeJobs.filter((job) => job.status === "cancelled").length,
      activeJobs: rangeJobs.filter((job) => ["queued", "rendering", "finalizing"].includes(job.status)).length,
      estimatedCostEur: sum(rangeJobs, (job) => job.estimate.estimatedEur),
      estimatedCostUsd: sum(rangeJobs, (job) => job.estimate.estimatedUsd),
      outputSizeBytes: sum(rangeJobs, (job) => job.estimate.outputSizeBytes),
      renderSeconds: sum(rangeJobs, (job) => job.estimate.renderSeconds),
    };
  });

  return {
    total: {
      totalJobs: normalizedJobs.length,
      readyExports: normalizedJobs.filter((job) => job.status === "ready").length,
      failedJobs: normalizedJobs.filter((job) => job.status === "failed").length,
      cancelledJobs: normalizedJobs.filter((job) => job.status === "cancelled").length,
      activeJobs: normalizedJobs.filter((job) => ["queued", "rendering", "finalizing"].includes(job.status)).length,
      estimatedCostEur: sum(normalizedJobs, (job) => job.estimate.estimatedEur),
      estimatedCostUsd: sum(normalizedJobs, (job) => job.estimate.estimatedUsd),
      outputSizeBytes: sum(normalizedJobs, (job) => job.estimate.outputSizeBytes),
      renderSeconds: sum(normalizedJobs, (job) => job.estimate.renderSeconds),
    },
    ranges,
    recentJobs: normalizedJobs
      .sort((a, b) => b.createdAtDate.getTime() - a.createdAtDate.getTime())
      .slice(0, 8),
  };
}

export function aggregateCloudBillingTelemetry(cloudBilling = null, now = new Date()) {
  if (!cloudBilling || cloudBilling.status !== "ready" || !Array.isArray(cloudBilling.rows)) {
    return {
      status: cloudBilling?.status || "not_configured",
      message: cloudBilling?.message || "",
      source: cloudBilling?.source || "cloud-billing-bigquery",
      currency: cloudBilling?.currency || "EUR",
      ranges: EXPORT_TELEMETRY_RANGES.map((range) => ({
        ...range,
        actualCost: 0,
        credits: 0,
        netCost: 0,
        rows: 0,
      })),
      total: {
        actualCost: 0,
        credits: 0,
        netCost: 0,
        rows: 0,
      },
      services: [],
      recentRows: [],
    };
  }

  const referenceTime = toDate(now) || new Date();
  const rows = cloudBilling.rows
    .map((row) => ({
      ...row,
      usageDateDate: toDate(row.usageDate),
      cost: Number(row.cost || 0),
      credits: Number(row.credits || 0),
      netCost: Number(row.netCost || 0),
    }))
    .filter((row) => row.usageDateDate);

  const ranges = EXPORT_TELEMETRY_RANGES.map((range) => {
    const startMs = referenceTime.getTime() - range.windowMs;
    const rangeRows = rows.filter((row) => row.usageDateDate.getTime() >= startMs);
    return {
      ...range,
      actualCost: sum(rangeRows, (row) => row.cost),
      credits: sum(rangeRows, (row) => row.credits),
      netCost: sum(rangeRows, (row) => row.netCost),
      rows: rangeRows.length,
    };
  });

  return {
    status: cloudBilling.status,
    source: cloudBilling.source,
    table: cloudBilling.table,
    targetProjectId: cloudBilling.targetProjectId,
    currency: cloudBilling.currency || rows.find((row) => row.currency)?.currency || "EUR",
    total: {
      actualCost: sum(rows, (row) => row.cost),
      credits: sum(rows, (row) => row.credits),
      netCost: sum(rows, (row) => row.netCost),
      rows: rows.length,
    },
    ranges,
    services: Array.isArray(cloudBilling.services) ? cloudBilling.services : [],
    recentRows: rows
      .sort((a, b) => b.usageDateDate.getTime() - a.usageDateDate.getTime())
      .slice(0, 10),
  };
}

function sum(items, selector) {
  return items.reduce((total, item) => total + Number(selector(item) || 0), 0);
}
