import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { CONFIG } from './config.mjs';
import {
    insertImage, deleteImage, resetAll, getTotalCount,
    getAllThemeCounts, getCatalog, getAllCatalog, closeDb,
    updateImageThemes, getAllImagesForReclassify
} from './database.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/downloads', express.static(path.join(__dirname, 'downloads'), {
    maxAge: '7d',
    immutable: true,
}));

// ── SMART LOCAL IMAGE RESOLVER ──────────────────────────────
// Because older scrapes used .jpeg and newer use .webp, this endpoint
// finds the actual file regardless of the extension.
// If NO local file exists, it proxies the image from Midjourney's CDN
// so the frontend can import it without CORS issues.
app.get('/api/image/:category/:theme/:jobId', async (req, res) => {
    const { category, theme, jobId } = req.params;
    const fullPath = `${category}/${theme}/${jobId}`;
    const exts = ['.jpeg', '.webp', '.jpg', '.png'];

    // 1. Try the requested path first
    for (const ext of exts) {
        const filePath = path.join(__dirname, 'downloads', fullPath + ext);
        try {
            await fs.access(filePath);
            res.set('Cache-Control', 'public, max-age=604800, immutable');
            return res.sendFile(filePath);
        } catch (e) { /* File doesn't exist, try next extension */ }
    }

    // 2. Search ALL theme folders (fixes multi-theme images stored elsewhere)
    for (const [, themeConfig] of Object.entries(CONFIG.themes)) {
        if (themeConfig.folder === `${category}/${theme}`) continue; // Already tried
        for (const ext of exts) {
            const altPath = path.join(__dirname, 'downloads', themeConfig.folder, jobId + ext);
            try {
                await fs.access(altPath);
                res.set('Cache-Control', 'public, max-age=604800, immutable');
                return res.sendFile(altPath);
            } catch (e) { /* Try next */ }
        }
    }

    // 3. Fallback: proxy from Midjourney CDN (try .webp then .png)
    const cdnVariants = [
        `https://cdn.midjourney.com/${jobId}/0_0.webp`,
        `https://cdn.midjourney.com/${jobId}/0_0.png`,
    ];

    for (const cdnUrl of cdnVariants) {
        try {
            const response = await fetch(cdnUrl);
            if (!response.ok) continue;
            res.set('Content-Type', response.headers.get('content-type') || 'image/webp');
            res.set('Cache-Control', 'public, max-age=604800, immutable');
            const buffer = Buffer.from(await response.arrayBuffer());
            return res.send(buffer);
        } catch (e) { continue; }
    }

    res.status(404).json({ error: 'Image not found locally or on CDN (.webp and .png)' });
});

// ── CDN IMAGE PROXY ─────────────────────────────────────────
// Proxies any Midjourney CDN image through our server to bypass CORS.
// Usage: /api/proxy-image?url=https://cdn.midjourney.com/...
app.get('/api/proxy-image', async (req, res) => {
    const { url } = req.query;
    if (!url || (!url.includes('cdn.midjourney.com') && !url.includes('midjourney.com'))) {
        return res.status(400).json({ error: 'Only Midjourney CDN URLs are allowed' });
    }

    // Build a list of URL variants to try
    const urlsToTry = [url];
    if (url.includes('.webp')) {
        urlsToTry.push(url.replace('.webp', '.png'));
    } else if (url.includes('.png')) {
        urlsToTry.push(url.replace('.png', '.webp'));
    }

    for (const tryUrl of urlsToTry) {
        try {
            const response = await fetch(tryUrl);
            if (!response.ok) continue;
            res.set('Content-Type', response.headers.get('content-type') || 'image/webp');
            res.set('Cache-Control', 'public, max-age=604800, immutable');
            const buffer = Buffer.from(await response.arrayBuffer());
            return res.send(buffer);
        } catch (e) {
            continue;
        }
    }

    res.status(404).json({ error: 'Image not found on CDN (tried .webp and .png)' });
});

let scrapingStatus = {
    status: 'idle',
    phase: '',
    progress: 0,
    found: 0,
    matched: 0,
    downloaded: 0,
    errors: 0,
    message: ''
};

let scraperProcess = null;

// Categories are auto-detected from theme folder structure
const CATEGORY_LABELS = {
    people: { label: '👤 People', order: 0 },
    scenes: { label: '🌄 Scenes & Environments', order: 1 },
    objects: { label: '🍔 Objects & Products', order: 2 },
    nature: { label: '🐾 Nature & Animals', order: 3 },
    styles: { label: '🎨 Styles & Aesthetics', order: 4 },
    mediums: { label: '🖌️ Mediums & Techniques', order: 5 },
};

// ── THEMES ───────────────────────────────────────────────────
app.get('/api/themes', async (req, res) => {
    try {
        const categories = {};
        const themeCounts = getAllThemeCounts();

        for (const [themeKey, themeData] of Object.entries(CONFIG.themes)) {
            const catKey = themeData.folder.split('/')[0];
            const catConfig = CATEGORY_LABELS[catKey];
            if (!catConfig) continue;

            if (!categories[catKey]) {
                categories[catKey] = {
                    label: catConfig.label,
                    order: catConfig.order,
                    themes: {}
                };
            }

            const count = themeCounts[themeKey] || 0;
            categories[catKey].themes[themeKey] = {
                label: themeKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                folder: themeData.folder,
                keywords: themeData.keywords,
                count
            };
        }

        const totalImages = getTotalCount();

        // Sort categories by order
        const sorted = {};
        Object.entries(categories)
            .sort(([, a], [, b]) => a.order - b.order)
            .forEach(([k, v]) => { sorted[k] = v; });

        res.json({ categories: sorted, totalImages });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── CATALOG (PAGINATED) ──────────────────────────────────────
app.get('/api/catalog', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit) || 200));
        const theme = req.query.theme || undefined;
        const search = req.query.search || undefined;

        const result = getCatalog({ theme, page, limit, search });
        res.json(result);
    } catch (e) {
        console.error('API /catalog ERROR:', e.message);
        res.status(500).json({ error: 'Failed to read catalog.' });
    }
});

// ── CATALOG LEGACY (full dump for scraper compat) ────────────
app.get('/api/catalog/all', async (req, res) => {
    try {
        const data = getAllCatalog();
        res.json(data);
    } catch (e) {
        console.error('API /catalog/all ERROR:', e.message);
        res.status(500).json({ error: 'Failed to read full catalog.' });
    }
});

// ── DELETE IMAGE ─────────────────────────────────────────────
app.delete('/api/catalog/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const themes = deleteImage(jobId);

        // Also remove the image files
        for (const theme of themes) {
            const themeConfig = CONFIG.themes[theme];
            if (themeConfig) {
                const exts = ['.jpeg', '.webp', '.jpg', '.png'];
                for (const ext of exts) {
                    const filePath = path.join(__dirname, 'downloads', themeConfig.folder, `${jobId}${ext}`);
                    try { await fs.unlink(filePath); } catch (e) { }
                }
            }
        }

        const remaining = getTotalCount();
        res.json({ success: true, remaining });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── RESET ALL ────────────────────────────────────────────────
app.post('/api/reset', async (req, res) => {
    try {
        resetAll();

        const downloadsPath = path.join(__dirname, 'downloads');
        async function clearDir(dir) {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        await clearDir(fullPath);
                    } else if (/\.(jpeg|jpg|png|webp)$/i.test(entry.name)) {
                        await fs.unlink(fullPath);
                    }
                }
            } catch (e) { }
        }
        await clearDir(downloadsPath);

        res.json({ success: true, message: 'All data cleared' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── RECLASSIFY ALL IMAGES ────────────────────────────────────
// Re-runs the v4 classifier on ALL existing images in the database.
// Updates theme associations and optionally moves files.
let reclassifyStatus = { status: 'idle', progress: 0, total: 0, changed: 0, message: '' };

// Import classifier functions inline (same logic as scraper.mjs)
function stripMjParamsServer(text) {
    return text
        .replace(/\s--\w+(\s+\S+)?/g, '')
        .replace(/\s*--\w+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function keywordMatchServer(text, keyword) {
    const kwLower = keyword.toLowerCase();
    if (kwLower.includes(' ')) {
        return text.includes(kwLower);
    } else {
        const escaped = kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?:^|[\\s,;:.!?()\\[\\]/"'-])${escaped}(?:$|[\\s,;:.!?()\\[\\]/"'-])`, 'i');
        return regex.test(text);
    }
}

function extractSubjectServer(text) {
    const clean = stripMjParamsServer(text);
    for (let i = 15; i < clean.length; i++) {
        if (clean[i] === '.' && i < clean.length - 1) {
            return clean.substring(0, i + 1);
        }
    }
    const separators = [', with', ', in ', ', on ', ', at ', '. ', ', under', ', using'];
    for (const sep of separators) {
        const idx = clean.indexOf(sep, 20);
        if (idx > 20 && idx < clean.length * 0.6) {
            return clean.substring(0, idx);
        }
    }
    return clean.substring(0, Math.max(Math.floor(clean.length * 0.30), 60));
}

function classifyPromptServer(prompt, themes) {
    if (!prompt || prompt === 'Image' || prompt.length < 5) return [];
    const clean = stripMjParamsServer(prompt.toLowerCase());
    const subject = extractSubjectServer(prompt.toLowerCase());
    const rest = clean.substring(subject.length);
    const scores = [];

    for (const [name, cfg] of Object.entries(themes)) {
        let subjectHits = 0, contextHits = 0, exclusionPenalty = 0;
        const minScore = cfg.minScore || 1;

        for (const kw of cfg.keywords) {
            if (keywordMatchServer(subject, kw)) subjectHits++;
            else if (keywordMatchServer(rest, kw)) contextHits++;
        }

        if (cfg.exclude && Array.isArray(cfg.exclude)) {
            for (const exKw of cfg.exclude) {
                if (keywordMatchServer(subject, exKw)) exclusionPenalty++;
                if (keywordMatchServer(rest, exKw)) exclusionPenalty += 0.3;
            }
        }

        // Match criterion: must have subject hit OR a very strong context match
        if (subjectHits >= (cfg.minScore || 1) || (contextHits >= 3)) {
            const s = (subjectHits * 3) + contextHits - (exclusionPenalty * 5);
            if (s > 0) {
                scores.push({
                    name,
                    score: s,
                    priority: cfg.priority || 'style',
                    hasSubject: subjectHits > 0
                });
            }
        }
    }

    if (scores.length === 0) return [];

    scores.sort((a, b) => {
        if (a.priority === 'subject' && b.priority !== 'subject') return -1;
        if (a.priority !== 'subject' && b.priority === 'subject') return 1;
        return b.score - a.score;
    });

    const result = [];
    let hasSubject = false, hasStyle = false;
    for (const s of scores) {
        if (result.length >= 2) break;
        if (s.priority === 'subject') {
            if (!hasSubject || result.length < 2) { result.push(s.name); hasSubject = true; }
        } else {
            if (!hasStyle || (!hasSubject && result.length < 2)) { result.push(s.name); hasStyle = true; }
        }
    }
    if (result.length < 2) {
        for (const s of scores) {
            if (result.length >= 2) break;
            if (!result.includes(s.name)) result.push(s.name);
        }
    }
    return result;
}

app.post('/api/reclassify', async (req, res) => {
    if (reclassifyStatus.status === 'running') {
        return res.status(400).json({ error: 'Reclassification already in progress' });
    }

    reclassifyStatus = { status: 'running', progress: 0, total: 0, changed: 0, message: 'Starting reclassification...', changes: [] };
    res.json({ success: true, message: 'Reclassification started' });

    // Run asynchronously
    try {
        const allImages = getAllImagesForReclassify();
        reclassifyStatus.total = allImages.length;
        let changed = 0;
        const changes = [];

        for (let i = 0; i < allImages.length; i++) {
            const img = allImages[i];
            const newThemes = classifyPromptServer(img.prompt, CONFIG.themes);

            const oldSorted = [...img.oldThemes].sort().join(',');
            const newSorted = [...newThemes].sort().join(',');

            if (oldSorted !== newSorted) {
                updateImageThemes(img.jobId, newThemes);

                // Move files if theme folders changed
                const oldFolders = img.oldThemes.map(t => CONFIG.themes[t]?.folder).filter(Boolean);
                const newFolders = newThemes.map(t => CONFIG.themes[t]?.folder).filter(Boolean);

                // Copy files to new theme folders if they don't exist there
                const exts = ['.jpeg', '.webp', '.jpg', '.png'];
                for (const newFolder of newFolders) {
                    if (oldFolders.includes(newFolder)) continue;
                    // Try to find the source file in any old folder
                    for (const oldFolder of oldFolders) {
                        for (const ext of exts) {
                            const srcPath = path.join(__dirname, 'downloads', oldFolder, `${img.jobId}${ext}`);
                            const dstPath = path.join(__dirname, 'downloads', newFolder, `${img.jobId}${ext}`);
                            try {
                                await fs.access(srcPath);
                                await fs.mkdir(path.join(__dirname, 'downloads', newFolder), { recursive: true });
                                await fs.copyFile(srcPath, dstPath);
                                break;
                            } catch { /* file not found, try next */ }
                        }
                    }
                }

                changed++;
                changes.push({
                    jobId: img.jobId,
                    promptPreview: (img.prompt || '').substring(0, 60),
                    oldThemes: img.oldThemes,
                    newThemes,
                    highResUrl: img.highResUrl,
                });
            }

            reclassifyStatus.progress = Math.round(((i + 1) / allImages.length) * 100);
            reclassifyStatus.changed = changed;
            reclassifyStatus.message = `Processing ${i + 1}/${allImages.length}... (${changed} changed)`;
        }

        reclassifyStatus.status = 'done';
        reclassifyStatus.progress = 100;
        reclassifyStatus.message = `Done! ${changed}/${allImages.length} images reclassified.`;
        reclassifyStatus.changes = changes.slice(0, 300); // Send top 300 changes to avoid massive payload

        // We DO NOT auto-reset the status here anymore, so the frontend can display the report.
        // It will be cleared when the user closes the report modal on the frontend.
    } catch (error) {
        console.error('Reclassification error:', error);
        reclassifyStatus.status = 'error';
        reclassifyStatus.message = `Error: ${error.message}`;
    }
});

app.get('/api/reclassify/status', (req, res) => {
    res.json(reclassifyStatus);
});

app.post('/api/reclassify/reset', (req, res) => {
    reclassifyStatus = { status: 'idle', progress: 0, total: 0, changed: 0, message: '', changes: [] };
    res.json({ success: true });
});

// ── STATUS ───────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
    res.json(scrapingStatus);
});

// ── SCRAPE ───────────────────────────────────────────────────
app.post('/api/scrape', (req, res) => {
    if (scraperProcess) {
        return res.status(400).json({ error: 'Scraping already in progress' });
    }

    const { themes, limit, scan, tab, resolution } = req.body;

    const args = [path.join(__dirname, 'scraper.mjs')];

    if (themes) {
        args.push('--themes', Array.isArray(themes) && themes.length ? themes.join(',') : 'all');
    } else {
        args.push('--themes', 'all');
    }

    if (limit) args.push('--limit', limit.toString());
    if (scan) args.push('--scan', scan.toString());
    if (tab) args.push('--tab', tab);
    if (resolution) args.push('--resolution', resolution);
    args.push('--headless');

    scrapingStatus = {
        status: 'running', phase: 'starting', progress: 0,
        found: 0, matched: 0, downloaded: 0, errors: 0,
        message: 'Starting scraper...'
    };

    scraperProcess = spawn('node', args, { cwd: __dirname });

    scraperProcess.stdout.on('data', (data) => {
        const text = data.toString();

        // Phase detection
        if (text.includes('Scrolling to collect ALL images')) {
            scrapingStatus.phase = 'scrolling';
            scrapingStatus.message = 'Scrolling MJ Explore...';
        }
        if (text.includes('Processing')) {
            scrapingStatus.phase = 'processing';
            scrapingStatus.message = 'Analysing & downloading...';
        }

        // Progress bar
        const progressMatch = text.match(/([0-9]+)%\s+([^\(]+)\s+\(([0-9]+)\/([0-9]+)\)/);
        if (progressMatch) {
            scrapingStatus.progress = parseInt(progressMatch[1], 10);
            const type = progressMatch[2].trim();
            const current = parseInt(progressMatch[3], 10);
            const total = parseInt(progressMatch[4], 10);
            if (type === 'images found') {
                scrapingStatus.found = current;
                scrapingStatus.message = `Collecting images... (${current}/${total})`;
            }
            if (type === 'processing') {
                scrapingStatus.message = `Processing... (${current}/${total})`;
            }
        }

        // Real-time stats
        const statsMatch = text.match(/\[STATS\]\s*Found:\s*(\d+)\s*\|\s*Matched:\s*(\d+)\s*\|\s*Downloaded:\s*(\d+)\s*\|\s*Errors:\s*(\d+)/);
        if (statsMatch) {
            scrapingStatus.found = parseInt(statsMatch[1], 10);
            scrapingStatus.matched = parseInt(statsMatch[2], 10);
            scrapingStatus.downloaded = parseInt(statsMatch[3], 10);
            scrapingStatus.errors = parseInt(statsMatch[4], 10);
            scrapingStatus.phase = 'downloading';
            scrapingStatus.message = `Matched: ${scrapingStatus.matched} | DL: ${scrapingStatus.downloaded}`;
        }

        // Match notification
        const matchNotif = text.match(/\[MATCH\]\s*(.*)/);
        if (matchNotif) {
            scrapingStatus.message = `Found: ${matchNotif[1].substring(0, 60)}`;
        }
    });

    scraperProcess.stderr.on('data', (data) => {
        console.error(`Scraper: ${data}`);
    });

    scraperProcess.on('exit', (code) => {
        scrapingStatus.status = code === 0 ? 'done' : 'error';
        scrapingStatus.progress = 100;
        scrapingStatus.message = code === 0 ? 'Terminé avec succès' : 'Erreur lors du scraping';
        setTimeout(() => {
            if (scrapingStatus.status === 'done' || scrapingStatus.status === 'error') {
                scrapingStatus.status = 'idle';
                scrapingStatus.progress = 0;
                scrapingStatus.phase = '';
            }
        }, 10000);
        scraperProcess = null;
    });

    res.json({ success: true, message: 'Scraping started' });
});

// ── Graceful shutdown ────────────────────────────────────────
process.on('SIGINT', () => {
    console.log('\n[Server] Shutting down...');
    closeDb();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n[Server] Shutting down...');
    closeDb();
    process.exit(0);
});

const PORT = process.env.PORT || 3456;
app.listen(PORT, () => console.log(`Scraper API listening on port ${PORT}`));
