const DEFAULT_SCAN_LIMIT = 8;
const MAX_SCAN_LIMIT = 20;
const MAX_SCAN_PAGES = 3;

const normalizeText = (value = '', maxLength = 80) => (
    typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
);

const normalizeNumber = (value, fallback, min, max) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, Math.round(number)));
};

export function normalizeProviderScanFilters(filters = {}) {
    return {
        provider: normalizeText(filters.provider || 'all', 30) || 'all',
        query: normalizeText(filters.query || filters.q || 'ambient'),
        genre: normalizeText(filters.genre || '', 40),
        mood: normalizeText(filters.mood || '', 40),
        license: normalizeText(filters.license || '', 40),
        bpm: normalizeText(filters.bpm || '', 20),
        duration: normalizeText(filters.duration || '', 20),
        sort: normalizeText(filters.sort || 'relevant', 20) || 'relevant',
        pages: normalizeNumber(filters.pages, 1, 1, MAX_SCAN_PAGES),
        limit: normalizeNumber(filters.limit, DEFAULT_SCAN_LIMIT, 1, MAX_SCAN_LIMIT),
    };
}

export function buildProviderScanCacheKey(filters = {}) {
    const normalized = normalizeProviderScanFilters(filters);
    return [
        'soundtrack-provider-scan-v1',
        normalized.provider,
        normalized.query.toLowerCase(),
        normalized.genre.toLowerCase(),
        normalized.mood.toLowerCase(),
        normalized.license.toLowerCase(),
        normalized.bpm,
        normalized.duration,
        normalized.sort,
        `p${normalized.pages}`,
        `l${normalized.limit}`,
    ].join(':');
}

export function buildProviderSearchUrl(filters = {}) {
    const normalized = normalizeProviderScanFilters(filters);
    const params = new URLSearchParams({
        provider: normalized.provider,
        q: normalized.query || normalized.mood || normalized.genre || 'ambient',
        limit: String(normalized.limit),
        pages: String(normalized.pages),
        sort: normalized.sort,
    });
    if (normalized.genre) params.set('genre', normalized.genre);
    if (normalized.mood) params.set('mood', normalized.mood);
    if (normalized.license) params.set('license', normalized.license);
    return `/api/music/free-search?${params.toString()}`;
}
