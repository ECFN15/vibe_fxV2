import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { CONFIG } from "../../../../scripts/midjourney-scraper/config.mjs";
import {
  deleteImage,
  getAllImagesForReclassify,
  getAllThemeCounts,
  getCatalog,
  getTotalCount,
  resetAll,
  updateImageThemes,
} from "../../../../scripts/midjourney-scraper/database.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const scraperDir = () => path.join(process.cwd(), "scripts", "midjourney-scraper");
const downloadsDir = () => path.join(scraperDir(), "downloads");

const CATEGORY_LABELS = {
  people: { label: "People", order: 0 },
  scenes: { label: "Scenes & Environments", order: 1 },
  objects: { label: "Objects & Products", order: 2 },
  nature: { label: "Nature & Animals", order: 3 },
  styles: { label: "Styles & Aesthetics", order: 4 },
  mediums: { label: "Mediums & Techniques", order: 5 },
};

function state() {
  if (!globalThis.__vibefxMidjourneyScraper) {
    globalThis.__vibefxMidjourneyScraper = {
      scrapingStatus: {
        status: "idle",
        phase: "",
        progress: 0,
        found: 0,
        matched: 0,
        downloaded: 0,
        errors: 0,
        message: "",
      },
      reclassifyStatus: {
        status: "idle",
        progress: 0,
        total: 0,
        changed: 0,
        message: "",
        changes: [],
      },
      scraperProcess: null,
    };
  }
  return globalThis.__vibefxMidjourneyScraper;
}

function json(data, status = 200) {
  return Response.json(data, { status });
}

export function themesResponse() {
  const categories = {};
  const themeCounts = getAllThemeCounts();

  for (const [themeKey, themeData] of Object.entries(CONFIG.themes)) {
    const catKey = themeData.folder.split("/")[0];
    const catConfig = CATEGORY_LABELS[catKey];
    if (!catConfig) continue;

    if (!categories[catKey]) {
      categories[catKey] = {
        label: catConfig.label,
        order: catConfig.order,
        themes: {},
      };
    }

    categories[catKey].themes[themeKey] = {
      label: themeKey.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
      folder: themeData.folder,
      keywords: themeData.keywords,
      count: themeCounts[themeKey] || 0,
    };
  }

  const sorted = {};
  Object.entries(categories)
    .sort(([, a], [, b]) => a.order - b.order)
    .forEach(([key, value]) => {
      sorted[key] = value;
    });

  return json({ categories: sorted, totalImages: getTotalCount() });
}

export function catalogResponse(request) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(1000, Math.max(1, parseInt(url.searchParams.get("limit") || "200", 10)));
  const theme = url.searchParams.get("theme") || undefined;
  const search = url.searchParams.get("search") || undefined;
  return json(getCatalog({ theme, page, limit, search }));
}

export async function deleteCatalogResponse(_request, { params }) {
  const jobId = params.jobId;
  const themes = deleteImage(jobId);

  for (const theme of themes) {
    const themeConfig = CONFIG.themes[theme];
    if (!themeConfig) continue;
    for (const ext of [".jpeg", ".webp", ".jpg", ".png"]) {
      const filePath = path.join(downloadsDir(), themeConfig.folder, `${jobId}${ext}`);
      try {
        await fs.unlink(filePath);
      } catch {
        // Missing local files are expected when only the catalog entry exists.
      }
    }
  }

  return json({ success: true, remaining: getTotalCount() });
}

export async function resetResponse() {
  resetAll();
  await clearDownloadedImages(downloadsDir());
  return json({ success: true, message: "All data cleared" });
}

async function clearDownloadedImages(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await clearDownloadedImages(fullPath);
      } else if (/\.(jpeg|jpg|png|webp)$/i.test(entry.name)) {
        await fs.unlink(fullPath);
      }
    }));
  } catch {
    // The downloads folder is created lazily by the scraper.
  }
}

export function statusResponse() {
  return json(state().scrapingStatus);
}

export async function scrapeResponse(request) {
  const current = state();
  if (current.scraperProcess) {
    return json({ error: "Scraping already in progress" }, 400);
  }

  const body = await request.json().catch(() => ({}));
  const args = [["scripts", "midjourney-scraper", "scraper.mjs"].join(path.sep)];
  args.push("--themes", Array.isArray(body.themes) && body.themes.length ? body.themes.join(",") : (body.themes || "all"));
  if (body.limit) args.push("--limit", body.limit.toString());
  if (body.scan) args.push("--scan", body.scan.toString());
  if (body.tab) args.push("--tab", body.tab);
  if (body.resolution) args.push("--resolution", body.resolution);
  args.push("--headless");

  current.scrapingStatus = {
    status: "running",
    phase: "starting",
    progress: 0,
    found: 0,
    matched: 0,
    downloaded: 0,
    errors: 0,
    message: "Starting scraper...",
  };

  current.scraperProcess = spawn(process.execPath, args, { cwd: process.cwd() });
  current.scraperProcess.stdout.on("data", (chunk) => updateScrapeStatus(chunk.toString()));
  current.scraperProcess.stderr.on("data", (chunk) => {
    console.error(`Scraper: ${chunk}`);
  });
  current.scraperProcess.on("exit", (code) => {
    current.scrapingStatus.status = code === 0 ? "done" : "error";
    current.scrapingStatus.progress = 100;
    current.scrapingStatus.message = code === 0 ? "Termine avec succes" : "Erreur lors du scraping";
    setTimeout(() => {
      if (current.scrapingStatus.status === "done" || current.scrapingStatus.status === "error") {
        current.scrapingStatus.status = "idle";
        current.scrapingStatus.progress = 0;
        current.scrapingStatus.phase = "";
      }
    }, 10000);
    current.scraperProcess = null;
  });

  return json({ success: true, message: "Scraping started" });
}

function updateScrapeStatus(text) {
  const current = state();
  if (text.includes("Scrolling to collect ALL images")) {
    current.scrapingStatus.phase = "scrolling";
    current.scrapingStatus.message = "Scrolling MJ Explore...";
  }
  if (text.includes("Processing")) {
    current.scrapingStatus.phase = "processing";
    current.scrapingStatus.message = "Analysing & downloading...";
  }

  const progressMatch = text.match(/([0-9]+)%\s+([^(]+)\s+\(([0-9]+)\/([0-9]+)\)/);
  if (progressMatch) {
    current.scrapingStatus.progress = parseInt(progressMatch[1], 10);
    const type = progressMatch[2].trim();
    const count = parseInt(progressMatch[3], 10);
    const total = parseInt(progressMatch[4], 10);
    if (type === "images found") {
      current.scrapingStatus.found = count;
      current.scrapingStatus.message = `Collecting images... (${count}/${total})`;
    }
    if (type === "processing") {
      current.scrapingStatus.message = `Processing... (${count}/${total})`;
    }
  }

  const statsMatch = text.match(/\[STATS\]\s*Found:\s*(\d+)\s*\|\s*Matched:\s*(\d+)\s*\|\s*Downloaded:\s*(\d+)\s*\|\s*Errors:\s*(\d+)/);
  if (statsMatch) {
    current.scrapingStatus.found = parseInt(statsMatch[1], 10);
    current.scrapingStatus.matched = parseInt(statsMatch[2], 10);
    current.scrapingStatus.downloaded = parseInt(statsMatch[3], 10);
    current.scrapingStatus.errors = parseInt(statsMatch[4], 10);
    current.scrapingStatus.phase = "downloading";
    current.scrapingStatus.message = `Matched: ${current.scrapingStatus.matched} | DL: ${current.scrapingStatus.downloaded}`;
  }

  const matchNotif = text.match(/\[MATCH\]\s*(.*)/);
  if (matchNotif) current.scrapingStatus.message = `Found: ${matchNotif[1].substring(0, 60)}`;
}

export async function imageResponse(_request, { params }) {
  const segments = params.path || [];
  if (segments.length < 3) return json({ error: "Invalid image path" }, 400);
  const category = segments[0];
  const theme = segments[1];
  const jobId = segments[2];
  const fullPath = `${category}/${theme}/${jobId}`;

  for (const ext of [".jpeg", ".webp", ".jpg", ".png"]) {
    const filePath = path.join(downloadsDir(), `${fullPath}${ext}`);
    const response = await fileResponse(filePath);
    if (response) return response;
  }

  for (const [, themeConfig] of Object.entries(CONFIG.themes)) {
    if (themeConfig.folder === `${category}/${theme}`) continue;
    for (const ext of [".jpeg", ".webp", ".jpg", ".png"]) {
      const response = await fileResponse(path.join(downloadsDir(), themeConfig.folder, `${jobId}${ext}`));
      if (response) return response;
    }
  }

  return proxyMidjourneyVariants([
    `https://cdn.midjourney.com/${jobId}/0_0.webp`,
    `https://cdn.midjourney.com/${jobId}/0_0.png`,
  ]);
}

async function fileResponse(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/webp";
    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch {
    return null;
  }
}

export async function proxyImageResponse(request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url || (!url.includes("cdn.midjourney.com") && !url.includes("midjourney.com"))) {
    return json({ error: "Only Midjourney CDN URLs are allowed" }, 400);
  }
  const variants = [url];
  if (url.includes(".webp")) variants.push(url.replace(".webp", ".png"));
  if (url.includes(".png")) variants.push(url.replace(".png", ".webp"));
  return proxyMidjourneyVariants(variants);
}

async function proxyMidjourneyVariants(urls) {
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      return new Response(Buffer.from(await response.arrayBuffer()), {
        headers: {
          "Content-Type": response.headers.get("content-type") || "image/webp",
          "Cache-Control": "public, max-age=604800, immutable",
        },
      });
    } catch {
      // Try the next variant.
    }
  }
  return json({ error: "Image not found" }, 404);
}

export function reclassifyStatusResponse() {
  return json(state().reclassifyStatus);
}

export function resetReclassifyResponse() {
  state().reclassifyStatus = { status: "idle", progress: 0, total: 0, changed: 0, message: "", changes: [] };
  return json({ success: true });
}

export async function reclassifyResponse() {
  const current = state();
  if (current.reclassifyStatus.status === "running") return json({ error: "Reclassification already in progress" }, 400);
  current.reclassifyStatus = { status: "running", progress: 0, total: 0, changed: 0, message: "Starting...", changes: [] };
  void runReclassify();
  return json({ success: true, message: "Reclassification started" });
}

async function runReclassify() {
  const current = state();
  try {
    const allImages = getAllImagesForReclassify();
    current.reclassifyStatus.total = allImages.length;
    let changed = 0;
    const changes = [];

    allImages.forEach((img, index) => {
      const newThemes = classifyPrompt(img.prompt, CONFIG.themes);
      if ([...img.oldThemes].sort().join(",") !== [...newThemes].sort().join(",")) {
        updateImageThemes(img.jobId, newThemes);
        changed += 1;
        changes.push({
          jobId: img.jobId,
          promptPreview: (img.prompt || "").substring(0, 60),
          oldThemes: img.oldThemes,
          newThemes,
        });
      }
      current.reclassifyStatus.progress = Math.round(((index + 1) / Math.max(allImages.length, 1)) * 100);
      current.reclassifyStatus.changed = changed;
      current.reclassifyStatus.message = `Processing ${index + 1}/${allImages.length}... (${changed} changed)`;
    });

    current.reclassifyStatus.status = "done";
    current.reclassifyStatus.progress = 100;
    current.reclassifyStatus.message = `Done! ${changed}/${allImages.length} images reclassified.`;
    current.reclassifyStatus.changes = changes.slice(0, 300);
  } catch (error) {
    console.error("Reclassification error:", error);
    current.reclassifyStatus.status = "error";
    current.reclassifyStatus.message = `Error: ${error.message}`;
  }
}

function classifyPrompt(prompt, themes) {
  if (!prompt || prompt === "Image" || prompt.length < 5) return [];
  const clean = stripMjParams(prompt.toLowerCase());
  const subject = extractSubject(prompt.toLowerCase());
  const rest = clean.substring(subject.length);
  const scores = [];

  for (const [name, cfg] of Object.entries(themes)) {
    let subjectHits = 0;
    let contextHits = 0;
    let exclusionPenalty = 0;
    for (const kw of cfg.keywords || []) {
      const word = typeof kw === "string" ? kw : kw.word;
      if (!word) continue;
      if (keywordMatch(subject, word)) subjectHits += 1;
      else if (keywordMatch(rest, word)) contextHits += 1;
    }
    for (const exKw of cfg.exclude || []) {
      if (keywordMatch(subject, exKw)) exclusionPenalty += 1;
      if (keywordMatch(rest, exKw)) exclusionPenalty += 0.3;
    }
    if (subjectHits >= (cfg.minScore || 1) || contextHits >= 3) {
      const score = (subjectHits * 3) + contextHits - (exclusionPenalty * 5);
      if (score > 0) scores.push({ name, score, priority: cfg.priority || "style", hasSubject: subjectHits > 0 });
    }
  }

  scores.sort((a, b) => {
    if (a.priority === "subject" && b.priority !== "subject") return -1;
    if (a.priority !== "subject" && b.priority === "subject") return 1;
    return b.score - a.score;
  });

  const result = [];
  let hasSubject = false;
  let hasStyle = false;
  for (const item of scores) {
    if (result.length >= 2) break;
    if (item.priority === "subject") {
      if (!hasSubject || result.length < 2) {
        result.push(item.name);
        hasSubject = true;
      }
    } else if (!hasStyle || (!hasSubject && result.length < 2)) {
      result.push(item.name);
      hasStyle = true;
    }
  }
  for (const item of scores) {
    if (result.length >= 2) break;
    if (!result.includes(item.name)) result.push(item.name);
  }
  return result;
}

function stripMjParams(text) {
  return text.replace(/\s--\w+(\s+\S+)?/g, "").replace(/\s*--\w+/g, "").replace(/\s+/g, " ").trim();
}

function extractSubject(text) {
  const clean = stripMjParams(text);
  for (let i = 15; i < clean.length; i += 1) {
    if (clean[i] === "." && i < clean.length - 1) return clean.substring(0, i + 1);
  }
  for (const sep of [", with", ", in ", ", on ", ", at ", ". ", ", under", ", using"]) {
    const idx = clean.indexOf(sep, 20);
    if (idx > 20 && idx < clean.length * 0.6) return clean.substring(0, idx);
  }
  return clean.substring(0, Math.max(Math.floor(clean.length * 0.3), 60));
}

function keywordMatch(text, keyword) {
  const lower = keyword.toLowerCase();
  if (lower.includes(" ")) return text.includes(lower);
  const escaped = lower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[\\s,;:.!?()\\[\\]/"'-])${escaped}(?:$|[\\s,;:.!?()\\[\\]/"'-])`, "i").test(text);
}
