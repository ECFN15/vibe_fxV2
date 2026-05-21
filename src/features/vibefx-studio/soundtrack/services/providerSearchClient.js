const DEFAULT_SCAN_LIMIT = 20;
const MAX_SCAN_LIMIT = 20;
const MAX_SCAN_PAGES = 5;

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
        provider: normalizeText(filters.provider || 'openverse', 30) || 'openverse',
        query: normalizeText(filters.query || filters.q || 'ambient'),
        category: normalizeText(filters.category || '', 40),
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
        normalized.category.toLowerCase(),
        `p${normalized.pages}`,
        `l${normalized.limit}`,
    ].join(':');
}

export function buildProviderSearchUrl(filters = {}) {
    const normalized = normalizeProviderScanFilters(filters);
    const params = new URLSearchParams({
        provider: normalized.provider,
        q: normalized.query || normalized.category || 'ambient',
        category: normalized.category || normalized.query || 'ambient',
        limit: String(normalized.limit),
        pages: String(normalized.pages),
    });
    return `/api/music/free-search?${params.toString()}`;
}
