const PIXABAY_BASE_URL = 'https://pixabay.com';
const PIXABAY_LICENSE_URL = 'https://pixabay.com/service/license-summary/';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 9000;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 20;
const MAX_PAGES = 5;

const responseCache = new Map();

export const PIXABAY_MUSIC_CATEGORIES = [
    'ai-generated',
    'free-music',
    'instrumental',
    'spring',
    'piano',
    'motivation',
    'chill',
    'epic',
    'relaxation',
    'ringtone',
    'corporate',
    'sport',
];

const toText = (value = '', maxLength = 90) => (
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''
);

const toNumber = (value, fallback, min, max) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, Math.round(number)));
};

const normalizeChoice = (value = '', allowed = []) => {
    const normalized = toText(value, 40).toLowerCase();
    return allowed.includes(normalized) ? normalized : '';
};

const decodeHtml = (value = '') => String(value)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const stripTags = (value = '') => decodeHtml(String(value).replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

const normalizeUrl = (value = '') => {
    try {
        return new URL(decodeHtml(value), PIXABAY_BASE_URL).toString();
    } catch {
        return '';
    }
};

const isPixabayMusicUrl = (value = '') => {
    try {
        const url = new URL(value, PIXABAY_BASE_URL);
        return url.hostname.endsWith('pixabay.com') && url.pathname.startsWith('/music/');
    } catch {
        return false;
    }
};

const isSafePixabayAudioUrl = (value = '') => {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && url.hostname === 'cdn.pixabay.com' && /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(url.pathname + url.search);
    } catch {
        return false;
    }
};

const extractProviderId = (sourceUrl = '') => {
    const match = sourceUrl.match(/-(\d+)\/?$/) || sourceUrl.match(/\/(\d+)\/?$/);
    if (match?.[1]) return `pixabay-${match[1]}`;
    const slug = sourceUrl.split('/').filter(Boolean).pop() || sourceUrl;
    return `pixabay-${slug.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80)}`;
};

const titleFromUrl = (sourceUrl = '') => {
    const last = sourceUrl.split('/').filter(Boolean).pop() || 'pixabay-music';
    return last
        .replace(/-\d+$/, '')
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'Pixabay Music';
};

const parseDurationSeconds = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.round(value));
    const text = toText(String(value || ''), 20);
    if (!text) return 0;
    const parts = text.split(':').map((part) => Number(part));
    if (parts.length === 2 && parts.every(Number.isFinite)) return parts[0] * 60 + parts[1];
    if (parts.length === 3 && parts.every(Number.isFinite)) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    const number = Number(text);
    return Number.isFinite(number) ? Math.round(number) : 0;
};

export function normalizePixabayFilters(filters = {}) {
    const query = toText(filters.query || filters.q || 'ambient');
    const category = normalizeChoice(filters.category, PIXABAY_MUSIC_CATEGORIES);
    return {
        provider: 'pixabay',
        mediaType: 'music',
        query,
        category,
        pages: toNumber(filters.pages, 1, 1, MAX_PAGES),
        limit: toNumber(filters.limit, DEFAULT_LIMIT, 1, MAX_LIMIT),
    };
}

export function buildPixabayCacheKey(filters = {}) {
    const normalized = normalizePixabayFilters(filters);
    return [
        'pixabay-audio-v1',
        normalized.query.toLowerCase(),
        normalized.category,
        `p${normalized.pages}`,
        `l${normalized.limit}`,
    ].join(':');
}

const buildSearchTerms = (filters = {}) => (
    [filters.query || filters.category]
        .map((part) => toText(part, 60).toLowerCase())
        .filter(Boolean)
        .join(' ')
        .trim() || 'ambient'
);

export function buildPixabayMusicSearchUrl(filters = {}, page = 1) {
    const normalized = normalizePixabayFilters(filters);
    const query = encodeURIComponent(buildSearchTerms(normalized)).replace(/%20/g, '+');
    const url = new URL(`/music/search/${query}/`, PIXABAY_BASE_URL);
    if (page > 1) url.searchParams.set('pagi', String(page));
    return url.toString();
}

const looksLikeAudioUrl = (key = '', value = '') => (
    typeof value === 'string'
    && /audio|download|preview|mp3|url/i.test(key)
    && isSafePixabayAudioUrl(value)
);

const collectJsonCandidates = (value, candidates = []) => {
    if (!value || typeof value !== 'object') return candidates;
    if (Array.isArray(value)) {
        value.forEach((item) => collectJsonCandidates(item, candidates));
        return candidates;
    }

    const entries = Object.entries(value);
    const urlValues = entries
        .filter(([key, item]) => /url|href|link|page/i.test(key) && typeof item === 'string')
        .map(([, item]) => normalizeUrl(item))
        .filter(isPixabayMusicUrl);
    const audioValues = entries
        .filter(([key, item]) => looksLikeAudioUrl(key, item))
        .map(([, item]) => normalizeUrl(item))
        .filter(isSafePixabayAudioUrl);

    if (urlValues.length || audioValues.length) {
        const sourceUrl = urlValues.find(Boolean) || '';
        candidates.push({
            providerId: sourceUrl ? extractProviderId(sourceUrl) : '',
            title: toText(value.title || value.name || value.caption || ''),
            artist: toText(value.user || value.username || value.author || value.artist || ''),
            duration: parseDurationSeconds(value.duration || value.length || value.durationSeconds),
            sourceUrl,
            audioUrl: audioValues[0] || '',
            thumbnail: normalizeUrl(value.thumbnail || value.thumbnailUrl || value.previewURL || value.image || ''),
            tags: [
                ...(Array.isArray(value.tags) ? value.tags : String(value.tags || '').split(',')),
                value.genre,
                value.category,
            ].filter(Boolean).map((tag) => toText(String(tag).toLowerCase(), 40)),
        });
    }

    entries.forEach(([, item]) => collectJsonCandidates(item, candidates));
    return candidates;
};

const extractJsonCandidates = (html = '') => {
    const candidates = [];
    const scriptPattern = /<script[^>]+type=["']application\/(?:ld\+)?json["'][^>]*>([\s\S]*?)<\/script>/gi;
    for (const match of html.matchAll(scriptPattern)) {
        try {
            collectJsonCandidates(JSON.parse(stripTags(match[1])), candidates);
        } catch {
            // Ignore non-JSON scripts; public pages change frequently.
        }
    }

    const nextData = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
    if (nextData?.[1]) {
        try {
            collectJsonCandidates(JSON.parse(stripTags(nextData[1])), candidates);
        } catch {
            // Ignore invalid embedded data.
        }
    }
    return candidates;
};

const extractAnchorCandidates = (html = '') => {
    const audioUrls = Array.from(html.matchAll(/https:\/\/cdn\.pixabay\.com\/download\/audio\/[^"'\s<>\\]+/gi))
        .map((match) => normalizeUrl(match[0]))
        .filter(isSafePixabayAudioUrl);
    const anchors = [];
    const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    for (const match of html.matchAll(anchorPattern)) {
        const sourceUrl = normalizeUrl(match[1]);
        if (!isPixabayMusicUrl(sourceUrl) || /\/music\/search\//i.test(sourceUrl)) continue;
        anchors.push({
            providerId: extractProviderId(sourceUrl),
            title: stripTags(match[2]) || titleFromUrl(sourceUrl),
            artist: '',
            duration: parseDurationSeconds(match[0].match(/(\d{1,2}:\d{2}(?::\d{2})?)/)?.[1]),
            sourceUrl,
            audioUrl: audioUrls.length === 1 ? audioUrls[0] : '',
            thumbnail: normalizeUrl(match[0].match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || ''),
            tags: [],
        });
    }
    return anchors;
};

export function normalizePixabayResult(candidate = {}, filters = {}) {
    const sourceUrl = normalizeUrl(candidate.sourceUrl);
    const audioUrl = normalizeUrl(candidate.audioUrl);
    const safeAudioUrl = isSafePixabayAudioUrl(audioUrl) ? audioUrl : '';
    const providerId = candidate.providerId || (sourceUrl ? extractProviderId(sourceUrl) : '');
    const tags = Array.from(new Set([
        ...((Array.isArray(candidate.tags) ? candidate.tags : []).filter(Boolean)),
        filters.category,
    ].filter(Boolean).map((tag) => toText(String(tag).toLowerCase(), 40))));

    const title = toText(candidate.title) || titleFromUrl(sourceUrl);
    const importStatus = safeAudioUrl ? 'importable' : sourceUrl ? 'metadata-only' : 'blocked';
    return {
        id: providerId || `pixabay-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80)}`,
        provider: 'pixabay',
        providerTrackId: providerId,
        title,
        artist: toText(candidate.artist) || 'Pixabay contributor',
        duration: parseDurationSeconds(candidate.duration),
        genre: tags[0] || '',
        mood: '',
        movement: '',
        theme: '',
        tags,
        image: normalizeUrl(candidate.thumbnail),
        thumbnail: normalizeUrl(candidate.thumbnail),
        sourceName: 'Pixabay Music',
        sourceUrl,
        sourcePageUrl: sourceUrl,
        previewUrl: safeAudioUrl,
        downloadUrl: safeAudioUrl,
        audioUrl: safeAudioUrl,
        downloadAllowed: Boolean(safeAudioUrl),
        license: 'Pixabay Content License',
        licenseUrl: PIXABAY_LICENSE_URL,
        attribution: title,
        rightsStatus: safeAudioUrl ? 'needs-review' : 'needs-review',
        commercialUse: true,
        socialUse: true,
        contentIdWarning: 'Pixabay signale des droits tiers possibles et des risques Content ID. Conserver la page source et verifier avant publication.',
        licenseSnapshotVersion: 'pixabay-content-license-current',
        importStatus,
        blockedReason: importStatus === 'metadata-only'
            ? 'URL audio directe non extraite depuis la page publique; ouverture source requise.'
            : importStatus === 'blocked'
                ? 'Page source Pixabay introuvable dans le resultat.'
                : '',
    };
}

export function dedupePixabayResults(tracks = []) {
    const seen = new Set();
    return tracks.filter((track) => {
        const key = track.providerTrackId || track.sourceUrl || track.id;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function parsePixabayMusicHtml(html = '', filters = {}) {
    const normalized = normalizePixabayFilters(filters);
    const candidates = [
        ...extractJsonCandidates(html),
        ...extractAnchorCandidates(html),
    ];
    const tracks = dedupePixabayResults(candidates.map((candidate) => normalizePixabayResult(candidate, normalized)))
        .slice(0, normalized.limit);
    const importable = tracks.filter((track) => track.importStatus === 'importable').length;
    const metadataOnly = tracks.filter((track) => track.importStatus === 'metadata-only').length;
    return {
        tracks,
        stats: {
            found: tracks.length,
            importable,
            ignored: metadataOnly,
            ignoredReasons: metadataOnly ? [{ reason: 'metadata-only', count: metadataOnly }] : [],
        },
    };
}

async function fetchHtml(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                Accept: 'text/html,application/xhtml+xml',
                'User-Agent': 'Vibe_fx Soundtrack provider scan (+https://pixabay.com/service/terms/)',
            },
            next: { revalidate: 86400 },
        });
        const text = await response.text();
        return { ok: response.ok, status: response.status, text, url };
    } finally {
        clearTimeout(timer);
    }
}

const isBlockedPage = (html = '', status = 200) => (
    status === 403
    || /cf_chl|Just a moment|enable JavaScript and cookies|Access denied/i.test(html)
);

export function createPixabayAudioAdapter() {
    return {
        id: 'pixabay',
        label: 'Pixabay Music',
        capabilities: {
            mediaTypes: ['music'],
            officialApi: false,
            pageScan: true,
            maxPages: MAX_PAGES,
            maxLimit: MAX_LIMIT,
        },
        async search(filters = {}) {
            const normalized = normalizePixabayFilters(filters);
            const cacheKey = buildPixabayCacheKey(normalized);
            const cached = responseCache.get(cacheKey);
            if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
                return { ...cached.payload, cache: { status: 'cached', ttlSeconds: Math.round((CACHE_TTL_MS - (Date.now() - cached.createdAt)) / 1000) } };
            }

            const pageUrls = Array.from({ length: normalized.pages }, (_, index) => buildPixabayMusicSearchUrl(normalized, index + 1));
            const pageResults = [];
            const errors = [];

            for (const pageUrl of pageUrls) {
                try {
                    const response = await fetchHtml(pageUrl);
                    if (isBlockedPage(response.text, response.status)) {
                        errors.push({ url: pageUrl, reason: `Pixabay page scan blocked (${response.status}).` });
                        continue;
                    }
                    if (!response.ok) {
                        errors.push({ url: pageUrl, reason: `Pixabay response ${response.status}.` });
                        continue;
                    }
                    pageResults.push(parsePixabayMusicHtml(response.text, normalized));
                } catch (error) {
                    errors.push({ url: pageUrl, reason: error.name === 'AbortError' ? 'Pixabay timeout.' : 'Pixabay network error.' });
                }
            }

            const tracks = dedupePixabayResults(pageResults.flatMap((item) => item.tracks)).slice(0, normalized.limit);
            const importable = tracks.filter((track) => track.importStatus === 'importable').length;
            const metadataOnly = tracks.filter((track) => track.importStatus === 'metadata-only').length;
            const ignoredReasons = [];
            if (metadataOnly) ignoredReasons.push({ reason: 'metadata-only', count: metadataOnly });
            if (errors.length) ignoredReasons.push({ reason: 'provider-unavailable', count: errors.length });

            const payload = {
                provider: 'pixabay',
                configured: true,
                status: errors.length && !tracks.length ? 'provider-unavailable' : errors.length ? 'partial' : 'ready',
                providers: [{
                    id: 'pixabay',
                    label: 'Pixabay Music',
                    mediaType: 'music',
                    status: errors.length && !tracks.length ? 'provider-unavailable' : errors.length ? 'partial' : 'active',
                    configured: true,
                    count: tracks.length,
                    importable,
                    error: errors[0]?.reason || '',
                }],
            scan: { pages: normalized.pages, limit: normalized.limit, urls: pageUrls },
                stats: {
                    found: tracks.length,
                    importable,
                    ignored: metadataOnly + errors.length,
                    ignoredReasons,
                },
                sourceUrl: pageUrls[0] || 'https://pixabay.com/music/',
                category: normalized.category,
                licenseUrl: PIXABAY_LICENSE_URL,
                warnings: [
                    'Pixabay audio is not exposed by the documented public API; this provider uses a controlled server-side public page scan.',
                    'No mass scan and no automatic bulk download.',
                ],
                tracks,
                cache: { status: 'live', ttlSeconds: CACHE_TTL_MS / 1000 },
            };
            responseCache.set(cacheKey, { createdAt: Date.now(), payload });
            return payload;
        },
    };
}

export const pixabayAudioAdapter = createPixabayAudioAdapter();
