#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_QUERY = 'ai-generated';
const DEFAULT_SEARCH_URL = 'https://pixabay.com/music/search/ai-generated/';
const DEFAULT_OUT_DIR = path.join(ROOT_DIR, 'public', 'music', 'pixabay-ai');
const PIXABAY_LICENSE_URL = 'https://pixabay.com/service/license-summary/';
const MAX_LIMIT = 30;
const MAX_PAGES = 3;
const MAX_AUDIO_BYTES = 150 * 1024 * 1024;
const DEFAULT_DELAY_MS = 1500;
const DEFAULT_TIMEOUT_MS = 45000;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const AUDIO_URL_PATTERN = /https:\/\/cdn\.pixabay\.com\/(?:download\/)?audio\/[^"'\s<>\\]+/i;
const CHALLENGE_PATTERN = /Just a moment|enable JavaScript and cookies|Access denied|captcha|challenge|cf_chl/i;

function printUsage() {
    console.log(`Usage:
  npm run import:pixabay-ai -- [options]

Options:
  --url <url>          Pixabay search URL. Default: ${DEFAULT_SEARCH_URL}
  --query <query>      Search query when --url is not changed. Default: ${DEFAULT_QUERY}
  --limit <number>     Max tracks to import. Default: 8, max: ${MAX_LIMIT}
  --pages <number>     Max search pages to inspect. Default: 1, max: ${MAX_PAGES}
  --start-page <num>   First Pixabay result page to inspect. Default: 1
  --out <dir>          Output directory. Default: public/music/pixabay-ai
  --dry-run            Scan links only; do not click download or write audio files.
  --headed             Show the browser window.
  --delay-ms <number>  Delay between track pages. Default: ${DEFAULT_DELAY_MS}
  --timeout-ms <num>   Navigation/download timeout. Default: ${DEFAULT_TIMEOUT_MS}
  --scan-limit <num>   Result links to inspect before exclusions. Default: limit + 8
  --exclude-ids <csv>   Pixabay track IDs to skip, e.g. pixabay-123,pixabay-456
  --exclude-urls <csv>  Pixabay source page URLs to skip
  --help               Show this help.

The script stops when Pixabay returns a challenge/captcha page. It does not bypass
technical restrictions and only downloads audio exposed by the public page flow.`);
}

function parseArgs(argv) {
    const options = {
        url: DEFAULT_SEARCH_URL,
        query: DEFAULT_QUERY,
        limit: 8,
        pages: 1,
        startPage: 1,
        outDir: DEFAULT_OUT_DIR,
        dryRun: false,
        headed: false,
        delayMs: DEFAULT_DELAY_MS,
        timeoutMs: DEFAULT_TIMEOUT_MS,
        scanLimit: 16,
        excludeIds: new Set(),
        excludeUrls: new Set(),
        help: false,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        const next = () => argv[++index];
        if (arg === '--help' || arg === '-h') options.help = true;
        else if (arg === '--dry-run') options.dryRun = true;
        else if (arg === '--headed') options.headed = true;
        else if (arg === '--url') options.url = String(next() || '').trim();
        else if (arg === '--query') {
            options.query = String(next() || '').trim() || DEFAULT_QUERY;
            options.url = buildSearchUrl(options.query, 1);
        } else if (arg === '--limit') options.limit = clampNumber(next(), 8, 1, MAX_LIMIT);
        else if (arg === '--pages') options.pages = clampNumber(next(), 1, 1, MAX_PAGES);
        else if (arg === '--start-page' || arg === '--page-start') options.startPage = clampNumber(next(), 1, 1, 20);
        else if (arg === '--out') options.outDir = path.resolve(ROOT_DIR, String(next() || DEFAULT_OUT_DIR));
        else if (arg === '--delay-ms') options.delayMs = clampNumber(next(), DEFAULT_DELAY_MS, 250, 30000);
        else if (arg === '--timeout-ms') options.timeoutMs = clampNumber(next(), DEFAULT_TIMEOUT_MS, 5000, 120000);
        else if (arg === '--scan-limit') options.scanLimit = clampNumber(next(), options.limit + 8, 1, MAX_LIMIT);
        else if (arg === '--exclude-ids') options.excludeIds = parseCsvSet(next()).map(normalizePixabayId).reduce((set, value) => value ? set.add(value) : set, new Set());
        else if (arg === '--exclude-urls') options.excludeUrls = parseCsvSet(next()).map(normalizeUrl).reduce((set, value) => value ? set.add(value) : set, new Set());
        else throw new Error(`Option inconnue: ${arg}`);
    }

    options.scanLimit = Math.max(options.limit, Math.min(MAX_LIMIT, options.scanLimit || options.limit + 8));
    if (!/^https:\/\/pixabay\.com\/music\//i.test(options.url)) {
        throw new Error('URL refusee: utilisez une URL https://pixabay.com/music/...');
    }
    return options;
}

function parseCsvSet(value = '') {
    return String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function normalizePixabayId(value = '') {
    const text = String(value || '').trim().toLowerCase();
    const match = text.match(/(?:pixabay-ai-)?pixabay-(\d+)/);
    if (match?.[1]) return `pixabay-${match[1]}`;
    const numeric = text.match(/^\d+$/);
    return numeric ? `pixabay-${numeric[0]}` : text;
}

function normalizeUrl(value = '') {
    try {
        const url = new URL(String(value || '').trim());
        url.hash = '';
        return url.toString().replace(/\/$/, '');
    } catch {
        return '';
    }
}

function clampNumber(value, fallback, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, Math.round(number)));
}

function buildSearchUrl(query, page = 1) {
    const safeQuery = encodeURIComponent(String(query || DEFAULT_QUERY).trim()).replace(/%20/g, '+');
    const url = new URL(`/music/search/${safeQuery}/`, 'https://pixabay.com');
    if (page > 1) url.searchParams.set('pagi', String(page));
    return url.toString();
}

function pageUrlForIndex(baseUrl, query, page) {
    if (baseUrl === DEFAULT_SEARCH_URL || baseUrl.includes('/music/search/')) {
        const url = new URL(baseUrl);
        if (page > 1) url.searchParams.set('pagi', String(page));
        else url.searchParams.delete('pagi');
        return url.toString();
    }
    return buildSearchUrl(query, page);
}

function isPixabayTrackUrl(value = '') {
    try {
        const url = new URL(value);
        return url.hostname === 'pixabay.com'
            && /^\/music\/(?!search\/)[^/?#]+-\d+\/?$/i.test(url.pathname);
    } catch {
        return false;
    }
}

function isPixabayAudioUrl(value = '') {
    try {
        const url = new URL(value);
        return url.protocol === 'https:'
            && url.hostname === 'cdn.pixabay.com'
            && /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(url.pathname + url.search);
    } catch {
        return false;
    }
}

function sanitizeFileName(value = 'pixabay-audio') {
    const cleaned = String(value || 'pixabay-audio')
        .normalize('NFKD')
        .replace(/[^\w.\- ]+/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 90);
    return cleaned || 'pixabay-audio';
}

function titleFromUrl(url = '') {
    const slug = new URL(url).pathname.split('/').filter(Boolean).pop() || 'pixabay-audio';
    return slug
        .replace(/-\d+$/, '')
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function audioExtension(contentType = '', sourceUrl = '') {
    const lower = contentType.toLowerCase();
    if (lower.includes('wav')) return '.wav';
    if (lower.includes('ogg')) return '.ogg';
    if (lower.includes('mp4') || lower.includes('m4a')) return '.m4a';
    const pathMatch = new URL(sourceUrl).pathname.match(/\.(mp3|wav|ogg|m4a)$/i);
    return pathMatch ? `.${pathMatch[1].toLowerCase()}` : '.mp3';
}

function trackIdFromUrl(url = '') {
    const match = url.match(/-(\d+)\/?$/);
    return match?.[1] ? `pixabay-${match[1]}` : `pixabay-${sanitizeFileName(titleFromUrl(url)).toLowerCase()}`;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureNoChallenge(page, label) {
    const title = await page.title().catch(() => '');
    const bodyText = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
    if (CHALLENGE_PATTERN.test(`${title}\n${bodyText}`)) {
        throw new Error(`${label}: Pixabay a affiche un challenge/captcha. Import arrete.`);
    }
}

async function collectTrackLinks(page) {
    const links = await page.evaluate(() => {
        const candidates = [];
        for (const anchor of document.querySelectorAll('a[href]')) {
            const href = new URL(anchor.getAttribute('href'), window.location.href).toString();
            const label = anchor.textContent?.replace(/\s+/g, ' ').trim() || '';
            const container = anchor.closest('article, li, section, [class*="item"], [class*="card"], [class*="track"]');
            const context = container?.textContent?.replace(/\s+/g, ' ').trim() || '';
            candidates.push({ href, label, context });
        }
        return candidates;
    });

    const seen = new Set();
    return links
        .filter((item) => isPixabayTrackUrl(item.href))
        .filter((item) => {
            if (seen.has(item.href)) return false;
            seen.add(item.href);
            return true;
        })
        .map((item) => ({
            url: item.href,
            title: item.label || titleFromUrl(item.href),
            context: item.context,
        }));
}

async function collectTrackPageMetadata(page, fallback, options) {
    const domMetadata = await page.evaluate(() => {
        const text = (selector) => document.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() || '';
        const attr = (selector, name) => document.querySelector(selector)?.getAttribute(name) || '';
        const audioUrls = Array.from(document.querySelectorAll('audio[src], source[src], a[href]'))
            .map((node) => node.getAttribute('src') || node.getAttribute('href') || '')
            .filter(Boolean)
            .map((value) => new URL(value, window.location.href).toString());
        const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"], script[type="application/json"]'))
            .map((script) => script.textContent || '')
            .join('\n');
        return {
            title: attr('meta[property="og:title"]', 'content') || text('h1'),
            description: attr('meta[name="description"]', 'content') || attr('meta[property="og:description"]', 'content'),
            image: attr('meta[property="og:image"]', 'content'),
            audioUrls,
            jsonLd,
        };
    });

    const jsonAudioUrls = Array.from(domMetadata.jsonLd.matchAll(new RegExp(AUDIO_URL_PATTERN, 'ig'))).map((match) => match[0]);
    return {
        id: trackIdFromUrl(fallback.url),
        title: domMetadata.title || fallback.title || titleFromUrl(fallback.url),
        sourceUrl: fallback.url,
        sourcePageUrl: fallback.url,
        sourceName: 'Pixabay Music',
        provider: 'pixabay',
        license: 'Pixabay Content License',
        licenseUrl: PIXABAY_LICENSE_URL,
        attribution: domMetadata.title || fallback.title || titleFromUrl(fallback.url),
        rightsStatus: 'needs-review',
        socialUse: true,
        commercialUse: true,
        image: domMetadata.image || '',
        tags: Array.from(new Set(['pixabay', options?.query].filter(Boolean))),
        contentIdWarning: 'Pixabay signale des droits tiers possibles et des risques Content ID. Conserver la page source et verifier avant publication.',
        licenseSnapshotVersion: 'pixabay-content-license-current',
        audioUrls: [...domMetadata.audioUrls, ...jsonAudioUrls].filter(isPixabayAudioUrl),
    };
}

async function clickDownloadControl(page, timeoutMs) {
    const selectors = [
        'a:has-text("Free download")',
        'button:has-text("Free download")',
        'a:has-text("Download")',
        'button:has-text("Download")',
        '[download]',
    ];

    for (const selector of selectors) {
        const locator = page.locator(selector).first();
        if (await locator.isVisible({ timeout: 1000 }).catch(() => false)) {
            await locator.click({ timeout: timeoutMs });
            return true;
        }
    }
    return false;
}

async function saveDownload(download, outDir, metadata) {
    const suggested = sanitizeFileName(download.suggestedFilename() || `${metadata.title}.mp3`);
    const filePath = await uniqueFilePath(outDir, suggested);
    await download.saveAs(filePath);
    const fileStat = await stat(filePath);
    return {
        filePath,
        fileName: path.basename(filePath),
        bytes: fileStat.size,
        finalUrl: download.url(),
        contentType: 'audio/mpeg',
    };
}

async function fetchAudioWithContext(context, audioUrl, outDir, metadata, timeoutMs) {
    const response = await context.request.get(audioUrl, {
        timeout: timeoutMs,
        headers: {
            Accept: 'audio/*, application/octet-stream;q=0.8',
            Referer: metadata.sourceUrl,
            'User-Agent': USER_AGENT,
        },
    });
    if (!response.ok()) {
        throw new Error(`Telechargement audio refuse (${response.status()}).`);
    }
    const contentType = response.headers()['content-type'] || 'audio/mpeg';
    if (!contentType.toLowerCase().startsWith('audio/')) {
        throw new Error(`MIME audio invalide: ${contentType || 'inconnu'}.`);
    }
    const buffer = await response.body();
    if (buffer.byteLength > MAX_AUDIO_BYTES) {
        throw new Error('Fichier trop lourd: limite 150 MB.');
    }
    const extension = audioExtension(contentType, audioUrl);
    const filePath = await uniqueFilePath(outDir, `${sanitizeFileName(metadata.title)}${extension}`);
    await writeFile(filePath, buffer);
    return {
        filePath,
        fileName: path.basename(filePath),
        bytes: buffer.byteLength,
        finalUrl: response.url(),
        contentType,
    };
}

async function uniqueFilePath(outDir, fileName) {
    const parsed = path.parse(fileName);
    let candidate = path.join(outDir, `${sanitizeFileName(parsed.name)}${parsed.ext || '.mp3'}`);
    let index = 2;
    while (await stat(candidate).then(() => true).catch(() => false)) {
        candidate = path.join(outDir, `${sanitizeFileName(parsed.name)}-${index}${parsed.ext || '.mp3'}`);
        index += 1;
    }
    return candidate;
}

function toPublicPath(filePath) {
    const relative = path.relative(path.join(ROOT_DIR, 'public'), filePath).replace(/\\/g, '/');
    return relative.startsWith('..') ? '' : `/${relative}`;
}

async function inspectAndImportTrack(context, candidate, options) {
    const page = await context.newPage();
    const observedAudioUrls = new Set();
    page.on('request', (request) => {
        if (isPixabayAudioUrl(request.url())) observedAudioUrls.add(request.url());
    });
    page.on('response', (response) => {
        const contentType = response.headers()['content-type'] || '';
        if (isPixabayAudioUrl(response.url()) || contentType.toLowerCase().startsWith('audio/')) {
            observedAudioUrls.add(response.url());
        }
    });

    try {
        await page.goto(candidate.url, { waitUntil: 'domcontentloaded', timeout: options.timeoutMs });
        await page.waitForLoadState('networkidle', { timeout: 7000 }).catch(() => {});
        await ensureNoChallenge(page, candidate.url);
        const metadata = await collectTrackPageMetadata(page, candidate, options);
        metadata.audioUrls.forEach((url) => observedAudioUrls.add(url));

        const audioUrl = Array.from(observedAudioUrls).find(isPixabayAudioUrl);
        if (options.dryRun) {
            return {
                ...metadata,
                importStatus: audioUrl ? 'importable' : 'metadata-only',
                downloadUrl: audioUrl || '',
                previewUrl: audioUrl || '',
            };
        }

        let saved = null;
        if (audioUrl) {
            saved = await fetchAudioWithContext(context, audioUrl, options.outDir, metadata, options.timeoutMs);
        } else {
            const downloadPromise = page.waitForEvent('download', { timeout: 12000 }).catch(() => null);
            const clicked = await clickDownloadControl(page, options.timeoutMs);
            await page.waitForTimeout(1500).catch(() => {});
            const secondAudioUrl = Array.from(observedAudioUrls).find(isPixabayAudioUrl);
            if (secondAudioUrl) {
                saved = await fetchAudioWithContext(context, secondAudioUrl, options.outDir, metadata, options.timeoutMs);
            } else if (clicked) {
                const download = await downloadPromise;
                if (download) saved = await saveDownload(download, options.outDir, metadata);
            }
        }

        if (!saved) {
            return {
                ...metadata,
                importStatus: 'metadata-only',
                blockedReason: 'Aucune URL audio ou telechargement public detecte.',
            };
        }

        return {
            ...metadata,
            importStatus: 'importable',
            downloadUrl: toPublicPath(saved.filePath) || saved.finalUrl,
            previewUrl: toPublicPath(saved.filePath) || saved.finalUrl,
            originalDownloadUrl: saved.finalUrl,
            fileName: saved.fileName,
            filePath: path.relative(ROOT_DIR, saved.filePath).replace(/\\/g, '/'),
            bytes: saved.bytes,
            contentType: saved.contentType,
            downloadedAt: new Date().toISOString(),
        };
    } finally {
        await page.close().catch(() => {});
    }
}

async function runImport(options) {
    if (!options.dryRun) await mkdir(options.outDir, { recursive: true });

    const browser = await chromium.launch({ headless: !options.headed });
    const context = await browser.newContext({
        acceptDownloads: true,
        userAgent: USER_AGENT,
        viewport: { width: 1440, height: 960 },
        locale: 'en-US',
    });

    try {
        const page = await context.newPage();
        const trackMap = new Map();
        for (let pageOffset = 0; pageOffset < options.pages && trackMap.size < options.scanLimit; pageOffset += 1) {
            const pageIndex = options.startPage + pageOffset;
            const searchUrl = pageUrlForIndex(options.url, options.query, pageIndex);
            console.log(`Scan Pixabay: ${searchUrl}`);
            await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: options.timeoutMs });
            await page.waitForLoadState('networkidle', { timeout: 7000 }).catch(() => {});
            await ensureNoChallenge(page, searchUrl);
            const links = await collectTrackLinks(page);
            for (const link of links) {
                if (trackMap.size >= options.scanLimit) break;
                trackMap.set(link.url, link);
            }
        }
        await page.close();

        const candidates = Array.from(trackMap.values())
            .filter((candidate) => !options.excludeIds.has(normalizePixabayId(trackIdFromUrl(candidate.url))))
            .filter((candidate) => !options.excludeUrls.has(normalizeUrl(candidate.url)))
            .slice(0, options.limit);
        console.log(`Pistes trouvees: ${candidates.length}`);
        const tracks = [];
        const errors = [];
        for (const [index, candidate] of candidates.entries()) {
            console.log(`[${index + 1}/${candidates.length}] ${candidate.title || candidate.url}`);
            try {
                const track = await inspectAndImportTrack(context, candidate, options);
                tracks.push(track);
                console.log(`  -> ${track.importStatus}${track.fileName ? ` (${track.fileName})` : ''}`);
            } catch (error) {
                errors.push({ sourceUrl: candidate.url, title: candidate.title, error: error.message });
                console.log(`  -> erreur: ${error.message}`);
            }
            if (index < candidates.length - 1) await sleep(options.delayMs);
        }

        const manifest = {
            provider: 'pixabay',
            sourceUrl: options.url,
            query: options.query,
            startPage: options.startPage,
            dryRun: options.dryRun,
            generatedAt: new Date().toISOString(),
            licenseUrl: PIXABAY_LICENSE_URL,
            stats: {
                found: candidates.length,
                imported: tracks.filter((track) => track.importStatus === 'importable').length,
                metadataOnly: tracks.filter((track) => track.importStatus !== 'importable').length,
                errors: errors.length,
            },
            warnings: [
                'Pixabay Content License can still involve third-party rights or Content ID disputes.',
                'Keep each sourceUrl and license snapshot with the exported video/project.',
                'This local importer stops on captcha/challenge pages and does not bypass provider restrictions.',
            ],
            tracks,
            errors,
        };

        if (!options.dryRun) {
            const manifestPath = path.join(options.outDir, 'vibefx-pixabay-ai-manifest.json');
            await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
            console.log(`Manifest: ${path.relative(ROOT_DIR, manifestPath)}`);
        } else {
            console.log(JSON.stringify(manifest.stats, null, 2));
        }
        return manifest;
    } finally {
        await context.close().catch(() => {});
        await browser.close().catch(() => {});
    }
}

const isMain = fileURLToPath(import.meta.url) === path.resolve(process.argv[1] || '');

if (isMain) {
    try {
        const options = parseArgs(process.argv.slice(2));
        if (options.help) {
            printUsage();
            process.exit(0);
        }
        await runImport(options);
    } catch (error) {
        console.error(error.message || error);
        process.exit(1);
    }
}

export {
    buildSearchUrl,
    parseArgs,
    runImport,
    sanitizeFileName,
};
