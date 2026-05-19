#!/usr/bin/env node
// ============================================================
//  🎨 MIDJOURNEY SCRAPER v4 — for Vibe_FX
// ============================================================
//  STRATEGY: "Scrape everything, classify after"
//
//  1. Scroll Explore → collect ALL image IDs (no filtering)
//  2. Visit each image → extract prompt
//  3. Classify prompt into themes using natural language
//  4. Download matched images, save to catalog in REAL TIME
//  5. Skip images that don't match any theme
//
//  Usage:
//    node scraper.mjs --themes all --limit 10
//    node scraper.mjs --themes portraits --scan 200 --tab new
//    node scraper.mjs --list
// ============================================================

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.mjs';
import { insertImage, getAllCatalog, getTotalCount } from './database.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════
//  CLI
// ═══════════════════════════════════════════════════════════

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = {
        themes: null,
        limit: CONFIG.maxDownloads,
        scan: CONFIG.maxImages,
        scrolls: CONFIG.maxScrolls,
        tab: CONFIG.tab,
        headless: CONFIG.headless,
        resolution: CONFIG.resolution,
        list: false,
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--themes': opts.themes = args[++i]?.split(',').map(t => t.trim()); break;
            case '--limit': opts.limit = parseInt(args[++i], 10); break;
            case '--scan': opts.scan = parseInt(args[++i], 10); break;
            case '--scrolls': opts.scrolls = parseInt(args[++i], 10); break;
            case '--tab': opts.tab = args[++i]; break;
            case '--headless': opts.headless = true; break;
            case '--resolution': opts.resolution = args[++i]; break;
            case '--list': opts.list = true; break;
            case '--help': printHelp(); process.exit(0);
        }
    }

    // Allow any positive limit value (no longer restricted to preset list)
    if (opts.limit < 1) opts.limit = 10;

    return opts;
}

function printHelp() {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║     🎨 MIDJOURNEY SCRAPER v4 — "Scrape all, classify"   ║
╚══════════════════════════════════════════════════════════╝

Options:
  --themes <list>    Themes (comma-separated) or "all"
  --limit <n>        Downloads per theme: 5, 10, 20, 30, 50
  --scan <n>         Images to scan (default: 200)
  --tab <name>       top | new (default: top)
  --resolution <r>   high | medium | low
  --headless         Hide browser window
  --list             List available themes
`);
}

function listThemes() {
    console.log(`\n🎨 Available themes:\n`);
    const cats = {};
    for (const [name, theme] of Object.entries(CONFIG.themes)) {
        const cat = theme.folder.split('/')[0];
        if (!cats[cat]) cats[cat] = [];
        cats[cat].push({ name, kw: theme.keywords.slice(0, 4).join(', ') });
    }
    for (const [cat, themes] of Object.entries(cats)) {
        console.log(`  📁 ${cat.toUpperCase()}`);
        for (const t of themes) {
            console.log(`    • ${t.name.padEnd(20)} → ${t.kw}…`);
        }
        console.log();
    }
}

// ═══════════════════════════════════════════════════════════
//  LOGGING
// ═══════════════════════════════════════════════════════════

const C = {
    reset: '\x1b[0m', dim: '\x1b[2m', bright: '\x1b[1m',
    green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m',
    magenta: '\x1b[35m', cyan: '\x1b[36m', red: '\x1b[31m',
};

function log(emoji, msg, color = '') {
    const t = new Date().toLocaleTimeString('fr-FR');
    console.log(`${C.dim}[${t}]${C.reset} ${emoji} ${color}${msg}${C.reset}`);
}

function progress(current, total, label) {
    const pct = Math.min(Math.max(Math.round((current / (total || 1)) * 100), 0), 100);
    const filled = Math.min(Math.round(pct / 5), 20);
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
    process.stdout.write(`\r  ${C.cyan}${bar}${C.reset} ${pct}% ${label} (${current}/${total})`);
}

// ═══════════════════════════════════════════════════════════
//  CATALOG (real-time saving)
// ═══════════════════════════════════════════════════════════

const catalogPath = path.resolve(__dirname, CONFIG.catalogFile);

async function loadCatalog() {
    // Primary source: SQLite database
    try {
        return getAllCatalog();
    } catch {
        // Fallback to JSON if DB fails
        try {
            return JSON.parse(await fs.readFile(catalogPath, 'utf-8'));
        } catch {
            return [];
        }
    }
}

async function appendToCatalog(entry) {
    // Write to SQLite (primary — this is what the API reads)
    try {
        insertImage(entry);
    } catch (e) {
        console.error('[DB] Insert failed:', e.message);
    }

    // Also write to catalog.json as backup
    try {
        let existing = [];
        try { existing = JSON.parse(await fs.readFile(catalogPath, 'utf-8')); } catch { }
        if (existing.some(e => e.jobId === entry.jobId)) return true;
        const merged = [entry, ...existing];
        await fs.writeFile(catalogPath, JSON.stringify(merged, null, 2));
    } catch { }

    return true;
}

// ═══════════════════════════════════════════════════════════
//  🧠 SMART CLASSIFIER v4 — "Subject Extraction Engine"
// ═══════════════════════════════════════════════════════════
//
//  IMPROVEMENTS OVER v3:
//  1. MJ params stripping (--ar, --v, --style, etc.)
//  2. Multi-strategy subject extraction (not just first '.')
//  3. Exclusion keywords (prevent cross-contamination)
//  4. Priority system: subject themes > style themes
//  5. Improved scoring with exclusion penalties
//
//  Rule: A theme MUST match in the subject zone to qualify.
//  Secondary matches only boost the score, they can't qualify.
//  Max 2 themes per image (1 subject + 1 style preferred).
//
// ═══════════════════════════════════════════════════════════

const MAX_THEMES_PER_IMAGE = 2;

/**
 * Strip Midjourney parameters from prompt text.
 * Removes --ar, --v, --style, --chaos, --seed, --no, etc.
 */
function stripMjParams(text) {
    return text
        .replace(/\s--\w+(\s+\S+)?/g, '')       // --param value
        .replace(/\s*--\w+/g, '')                 // --param (no value)
        .replace(/\s+/g, ' ')                     // normalize whitespace
        .trim();
}

/**
 * Match a keyword against text, supporting both single-word
 * (with word boundary checks) and multi-word (substring) matching.
 */
function keywordMatch(text, keyword) {
    const kwLower = keyword.toLowerCase();
    if (kwLower.includes(' ')) {
        return text.includes(kwLower);
    } else {
        const escaped = kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?:^|[\\s,;:.!?()\\[\\]/\"'-])${escaped}(?:$|[\\s,;:.!?()\\[\\]/\"'-])`, 'i');
        return regex.test(text);
    }
}

/**
 * Extract the "subject zone" from a prompt.
 * This is the part that describes WHAT the image is about,
 * before style/lighting/composition/background details begin.
 *
 * Multi-strategy approach:
 * 1. Strip MJ params first
 * 2. Look for natural subject boundaries: period, comma-after-subject,
 *    semicolon, colon, pipe, em-dash — but only after 15+ chars
 * 3. Fallback: first 30% of text (minimum 60 chars)
 */
function extractSubject(text) {
    const clean = stripMjParams(text);

    // Strategy 1: Find first sentence-ending period (after 15+ chars)
    for (let i = 15; i < clean.length; i++) {
        if (clean[i] === '.' && i < clean.length - 1) {
            return clean.substring(0, i + 1);
        }
    }

    // Strategy 2: Find a strong clause separator (, ; : | —) after 20+ chars
    // These often separate subject from style description
    const separators = [', with', ', in ', ', on ', ', at ', '. ', ', under', ', using'];
    for (const sep of separators) {
        const idx = clean.indexOf(sep, 20);
        if (idx > 20 && idx < clean.length * 0.6) {
            return clean.substring(0, idx);
        }
    }

    // Strategy 3: Fallback — first 30% of text (minimum 60 chars)
    return clean.substring(0, Math.max(Math.floor(clean.length * 0.30), 60));
}

/**
 * Classifier v4: Subject Extraction Engine
 *
 * Scoring formula:
 *   score = (subjectHits × 3) + (contextHits × 1) - (exclusionPenalty × 5)
 *
 * Rules:
 * - A theme MUST have ≥ minScore hits in the subject zone to qualify
 * - Exclusion keywords in the subject zone heavily penalize a theme
 * - If exclusion penalty makes score ≤ 0, theme is disqualified
 * - Subject-priority themes are preferred over style-priority themes
 * - Max 2 themes per image, preferring 1 subject + 1 style
 */
function classifyPrompt(prompt, activeThemes) {
    if (!prompt || prompt === 'Image' || prompt.length < 5) return [];

    const clean = stripMjParams(prompt.toLowerCase());
    const subject = extractSubject(prompt.toLowerCase());
    const rest = clean.substring(subject.length);

    const scores = [];

    for (const [name, cfg] of Object.entries(activeThemes)) {
        let subjectHits = 0;
        let contextHits = 0;
        let exclusionPenalty = 0;
        const minScore = cfg.minScore || 1;

        // Check positive keywords
        for (const kw of cfg.keywords) {
            if (keywordMatch(subject, kw)) {
                subjectHits++;
            } else if (keywordMatch(rest, kw)) {
                contextHits++;
            }
        }

        // Check exclusion keywords (if present)
        if (cfg.exclude && Array.isArray(cfg.exclude)) {
            for (const exKw of cfg.exclude) {
                if (keywordMatch(subject, exKw)) {
                    exclusionPenalty++;
                }
                // Exclusion in context is less severe but still relevant
                if (keywordMatch(rest, exKw)) {
                    exclusionPenalty += 0.3;
                }
            }
        }

        // RULE: Must have at least minScore hits in subject zone
        if (subjectHits >= minScore) {
            const rawScore = (subjectHits * 3) + contextHits;
            const penalty = exclusionPenalty * 5;
            const finalScore = rawScore - penalty;

            // Only qualify if score stays positive after penalties
            if (finalScore > 0) {
                scores.push({
                    name,
                    score: finalScore,
                    subjectHits,
                    contextHits,
                    exclusionPenalty,
                    priority: cfg.priority || 'style',
                });
            }
        }
    }

    if (scores.length === 0) return [];

    // Sort: subject themes first, then by score descending
    scores.sort((a, b) => {
        // First, prefer subject themes over style themes
        if (a.priority === 'subject' && b.priority !== 'subject') return -1;
        if (a.priority !== 'subject' && b.priority === 'subject') return 1;
        // Then by score
        return b.score - a.score;
    });

    // Select top themes with smart pairing:
    // Prefer 1 subject + 1 style if both exist
    const result = [];
    let hasSubject = false;
    let hasStyle = false;

    for (const s of scores) {
        if (result.length >= MAX_THEMES_PER_IMAGE) break;

        if (s.priority === 'subject') {
            if (!hasSubject || result.length < MAX_THEMES_PER_IMAGE) {
                result.push(s.name);
                hasSubject = true;
            }
        } else {
            if (!hasStyle || (!hasSubject && result.length < MAX_THEMES_PER_IMAGE)) {
                result.push(s.name);
                hasStyle = true;
            }
        }
    }

    // If we still have room, fill with remaining top scorers
    if (result.length < MAX_THEMES_PER_IMAGE) {
        for (const s of scores) {
            if (result.length >= MAX_THEMES_PER_IMAGE) break;
            if (!result.includes(s.name)) {
                result.push(s.name);
            }
        }
    }

    return result;
}

// ═══════════════════════════════════════════════════════════
//  BROWSER DOWNLOAD
// ═══════════════════════════════════════════════════════════

async function downloadViaBrowser(page, imageUrl, filepath) {
    await fs.mkdir(path.dirname(filepath), { recursive: true });

    const buffer = await page.evaluate(async (url) => {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const blob = await resp.blob();
        const ab = await blob.arrayBuffer();
        const bytes = new Uint8Array(ab);
        let bin = '';
        const chunk = 8192;
        for (let i = 0; i < bytes.length; i += chunk) {
            const slice = bytes.subarray(i, i + chunk);
            for (let j = 0; j < slice.length; j++) {
                bin += String.fromCharCode(slice[j]);
            }
        }
        return btoa(bin);
    }, imageUrl);

    await fs.writeFile(filepath, Buffer.from(buffer, 'base64'));
}

async function collectAllImages(page, opts) {
    const url = `${CONFIG.baseUrl}?tab=${opts.tab}`;
    log('🌐', `Loading ${url}`, C.cyan);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    log('✅', 'Explore page loaded', C.green);
    log('📜', `Scrolling to collect ALL images (target: ${opts.scan})...`, C.yellow);

    const collectedJobs = new Set();
    let staleCount = 0;

    for (let s = 0; s < opts.scrolls; s++) {
        const jobs = await page.evaluate(() => {
            const links = document.querySelectorAll('a[href*="/jobs/"]');
            return Array.from(links)
                .map(a => a.getAttribute('href')?.match(/\/jobs\/([a-f0-9-]+)/)?.[1])
                .filter(Boolean);
        });

        const prevSize = collectedJobs.size;
        for (const id of jobs) collectedJobs.add(id);

        progress(collectedJobs.size, opts.scan, 'images found');

        if (collectedJobs.size >= opts.scan) break;
        if (collectedJobs.size === prevSize) {
            if (++staleCount > 5) break;
        } else {
            staleCount = 0;
        }

        await page.evaluate(() => {
            const el = document.querySelector('#pageScroll') || document.documentElement;
            el.scrollBy({ top: 1200, behavior: 'smooth' });
        });
        await page.waitForTimeout(CONFIG.scrollDelay);
    }

    console.log();
    log('📦', `Collected ${collectedJobs.size} total image IDs`, C.green);
    return Array.from(collectedJobs);
}

async function processImages(page, jobIds, activeThemes, opts, outputBase, exploreUrl) {
    log('🔍', `Processing ${jobIds.length} images: click → extract → classify → download`, C.yellow);

    // Load existing catalog to avoid duplicates
    const existingCatalog = await loadCatalog();
    const existingIds = new Set(existingCatalog.map(e => e.jobId));

    // Only count NEW downloads in THIS session (not existing catalog)
    const themeDownloaded = {};
    for (const name of Object.keys(activeThemes)) themeDownloaded[name] = 0;

    let scanned = 0, matched = 0, downloaded = 0, skipped = 0, errors = 0;
    let consecutiveCloudflare = 0;

    const checkAllFull = () => {
        return Object.entries(activeThemes).every(([name]) => themeDownloaded[name] >= opts.limit);
    };

    // Random delay to mimic human behavior
    const humanDelay = (min, max) => page.waitForTimeout(min + Math.random() * (max - min));

    // We need to go back to Explore to click images one by one
    log('🌐', 'Returning to Explore page for click-based extraction...', C.cyan);
    await page.goto(exploreUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    for (const jobId of jobIds) {
        if (checkAllFull()) {
            log('✅', 'All themes have reached their download limit!', C.green);
            break;
        }

        // Stop if Cloudflare is consistently blocking us
        if (consecutiveCloudflare >= 5) {
            log('⚠️', 'Cloudflare is blocking requests. Stopping to avoid ban.', C.red);
            break;
        }

        // Skip already catalogued
        if (existingIds.has(jobId)) {
            skipped++;
            scanned++;
            continue;
        }

        scanned++;
        progress(scanned, jobIds.length, 'processing');

        try {
            // ── CLICK THE IMAGE LINK FROM EXPLORE ──────────────
            // Try to find and click the link on the current page
            const linkSelector = `a[href*="/jobs/${jobId}"]`;
            let link = await page.$(linkSelector);

            if (!link) {
                // Image might be off-screen, try scrolling to find it
                let found = false;
                for (let attempt = 0; attempt < 10; attempt++) {
                    await page.evaluate(() => {
                        const el = document.querySelector('#pageScroll') || document.documentElement;
                        el.scrollBy({ top: 600, behavior: 'smooth' });
                    });
                    await page.waitForTimeout(800);
                    link = await page.$(linkSelector);
                    if (link) { found = true; break; }
                }
                if (!found) {
                    // Can't find on page, try direct navigation as fallback
                    try {
                        await page.goto(`https://www.midjourney.com/jobs/${jobId}`, {
                            waitUntil: 'domcontentloaded', timeout: 12000,
                        });
                        await humanDelay(1500, 2500);
                    } catch (e) {
                        errors++;
                        continue;
                    }
                }
            }

            if (link) {
                // Click the link naturally (less suspicious than goto)
                await link.click();
                await humanDelay(1500, 3000);
            }

            // ── CHECK FOR CLOUDFLARE BLOCK ─────────────────────
            const pageTitle = await page.title();
            if (pageTitle.includes('Just a moment') || pageTitle.includes('Cloudflare')) {
                consecutiveCloudflare++;
                log('🛡️', `Cloudflare challenge detected (${consecutiveCloudflare}/5)`, C.yellow);
                // Wait longer and go back to Explore
                await humanDelay(5000, 10000);
                await page.goto(exploreUrl, { waitUntil: 'networkidle', timeout: 60000 });
                await page.waitForTimeout(3000);
                continue;
            }
            consecutiveCloudflare = 0;

            // ── EXTRACT PROMPT ─────────────────────────────────
            const promptData = await page.evaluate(() => {
                const bw = document.querySelector('div.break-word p');
                let prompt = bw?.innerText?.trim() || null;

                if (!prompt || prompt === 'Image') {
                    const meta = document.querySelector('meta[property="og:description"]');
                    const c = meta?.getAttribute('content');
                    if (c && c !== 'Image' && !c.includes('Feed of')) prompt = c;
                }

                const isVideo = !!document.querySelector('video') ||
                    !!document.querySelector('span[class*="video"]') ||
                    document.querySelector('meta[property="og:type"]')?.content?.includes('video');

                const img = document.querySelector('img[src*="cdn.midjourney.com"]');
                return {
                    prompt: prompt || '',
                    imgUrl: img?.src || null,
                    isVideo
                };
            });

            if (promptData.isVideo) {
                await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => { });
                await humanDelay(800, 1500);
                continue;
            }
            if (!promptData.prompt || promptData.prompt.length < 5) {
                await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => { });
                await humanDelay(800, 1500);
                continue;
            }

            // ── CLASSIFY ───────────────────────────────────────
            const themes = classifyPrompt(promptData.prompt, activeThemes);

            if (themes.length === 0) {
                await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => { });
                await humanDelay(800, 1500);
                continue;
            }

            matched++;

            const downloadableThemes = themes.filter(t => themeDownloaded[t] < opts.limit);
            if (downloadableThemes.length === 0) {
                await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => { });
                await humanDelay(800, 1500);
                continue;
            }

            // ── DOWNLOAD ───────────────────────────────────────
            const upgradeUrl = (url) => url ? url.replace(/_\d+_[A-Z]+\.webp.*$/, '.webp') : url;
            const originalUrl = promptData.imgUrl || `https://cdn.midjourney.com/${jobId}/0_0.webp`;
            const dlUrl = opts.resolution === 'high' ? upgradeUrl(originalUrl) : originalUrl;
            const ext = 'webp';

            let didDownload = false;
            for (const themeName of downloadableThemes) {
                const cfg = activeThemes[themeName];
                const filepath = path.join(outputBase, cfg.folder, `${jobId}.${ext}`);

                try {
                    await downloadViaBrowser(page, dlUrl, filepath);
                    themeDownloaded[themeName]++;
                    didDownload = true;
                } catch (e) {
                    errors++;
                }
            }

            if (didDownload) {
                downloaded++;
                const entry = {
                    jobId,
                    prompt: promptData.prompt,
                    themes,
                    highResUrl: upgradeUrl(promptData.imgUrl) || `https://cdn.midjourney.com/${jobId}/0_0.webp`,
                    detailUrl: `https://www.midjourney.com/jobs/${jobId}`,
                    scrapedAt: new Date().toISOString(),
                };

                const added = await appendToCatalog(entry);
                if (added) {
                    console.log(`\n[MATCH] ${themes.join(',')} | ${promptData.prompt.substring(0, 60)}...`);
                    console.log(`[STATS] Found: ${scanned} | Matched: ${matched} | Downloaded: ${downloaded} | Errors: ${errors}`);
                }
            }

            // ── GO BACK TO EXPLORE ─────────────────────────────
            await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => { });
            await humanDelay(800, 2000);

        } catch (err) {
            errors++;
            // Try to recover by going back to Explore
            try {
                await page.goto(exploreUrl, { waitUntil: 'networkidle', timeout: 30000 });
                await page.waitForTimeout(2000);
            } catch (e) { /* best effort */ }
        }
    }

    console.log();
    return { scanned, matched, downloaded, skipped, errors };
}

// ═══════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
    const opts = parseArgs();
    if (opts.list) { listThemes(); process.exit(0); }

    // Resolve themes
    let activeThemes = {};
    if (!opts.themes || opts.themes[0] === 'all') {
        activeThemes = { ...CONFIG.themes };
    } else {
        for (const name of opts.themes) {
            if (CONFIG.themes[name]) {
                activeThemes[name] = CONFIG.themes[name];
            } else {
                const found = Object.entries(CONFIG.themes).find(([k]) => k.includes(name) || name.includes(k));
                if (found) activeThemes[found[0]] = found[1];
                else log('⚠️', `Unknown theme: "${name}", skipping`, C.yellow);
            }
        }
    }

    if (Object.keys(activeThemes).length === 0) {
        log('❌', 'No valid themes selected', C.red);
        process.exit(1);
    }

    console.log(`
╔══════════════════════════════════════════════════════════╗
║     🎨 MIDJOURNEY SCRAPER v4 — "Scrape all, classify"   ║
║     🧠 Smart classification by prompt analysis           ║
╚══════════════════════════════════════════════════════════╝
`);

    log('🎯', `Active themes: ${Object.keys(activeThemes).join(', ')}`, C.cyan);
    log('📊', `Scan: ${opts.scan} images → Download: max ${opts.limit}/theme`, C.blue);
    log('📑', `Tab: ${opts.tab} | Resolution: ${opts.resolution}`, C.blue);
    console.log();

    // Create output directories
    const outputBase = path.resolve(__dirname, CONFIG.outputDir);
    for (const theme of Object.values(activeThemes)) {
        await fs.mkdir(path.join(outputBase, theme.folder), { recursive: true });
    }

    // Launch browser
    // IMPORTANT: Use '--headless=new' Chrome arg for the modern headless mode.
    // The old headless breaks IntersectionObserver on MJ's infinite scroll,
    // causing the scraper to get stuck at ~50 images.
    log('🚀', 'Launching browser...', C.magenta);
    const launchArgs = [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
    ];
    if (opts.headless) {
        launchArgs.push('--headless=new');
    }
    const browser = await chromium.launch({
        headless: false,  // We handle headless via --headless=new arg
        args: launchArgs,
    });
    const context = await browser.newContext({
        viewport: CONFIG.viewport,
        userAgent: CONFIG.userAgent,
        locale: 'en-US',
    });
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    const page = await context.newPage();

    // Phase 1: Collect ALL image IDs
    const jobIds = await collectAllImages(page, opts);

    if (jobIds.length === 0) {
        log('❌', 'No images found on Explore page', C.red);
        await browser.close();
        process.exit(1);
    }

    // Phase 2+3+4: Extract → Classify → Download
    const exploreUrl = `${CONFIG.baseUrl}?tab=${opts.tab}`;
    const stats = await processImages(page, jobIds, activeThemes, opts, outputBase, exploreUrl);

    await browser.close();

    // Summary
    console.log(`
╔══════════════════════════════════════════════════════════╗
║                  ✅ SCRAPING COMPLETE                    ║
╚══════════════════════════════════════════════════════════╝
`);
    console.log(`  📊 Scanned: ${stats.scanned} | Matched: ${stats.matched} | Downloaded: ${stats.downloaded} | Skipped: ${stats.skipped} | Errors: ${stats.errors}`);

    // Per-theme counts
    const catalog = await loadCatalog();
    const tCounts = {};
    for (const e of catalog) for (const t of e.themes) tCounts[t] = (tCounts[t] || 0) + 1;
    console.log(`\n  📁 Theme totals:`);
    for (const [name] of Object.entries(activeThemes)) {
        if (tCounts[name]) console.log(`    • ${name}: ${tCounts[name]} images`);
    }
    console.log();
}

main().catch(err => {
    console.error(`\n❌ Fatal: ${err.message}\n${err.stack}`);
    process.exit(1);
});
