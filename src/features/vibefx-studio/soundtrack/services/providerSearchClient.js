const DEFAULT_SCAN_LIMIT = 20;
const MAX_SCAN_LIMIT = 20;
const MAX_SCAN_PAGES = 5;
const MAX_SCAN_START_PAGE = 20;

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
        source: normalizeText(filters.source || '', 40),
        mediaCategory: normalizeText(filters.mediaCategory || filters.media_category || '', 40),
        licenseType: normalizeText(filters.licenseType || filters.license_type || '', 40),
        length: normalizeText(filters.length || '', 40),
        extension: normalizeText(filters.extension || '', 16),
        pages: normalizeNumber(filters.pages, 1, 1, MAX_SCAN_PAGES),
        pageStart: normalizeNumber(filters.pageStart || filters.startPage || filters.start_page, 1, 1, MAX_SCAN_START_PAGE),
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
        normalized.source.toLowerCase(),
        normalized.mediaCategory.toLowerCase(),
        normalized.licenseType.toLowerCase(),
        normalized.length.toLowerCase(),
        normalized.extension.toLowerCase(),
        `s${normalized.pageStart}`,
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
        start_page: String(normalized.pageStart),
    });
    if (normalized.source) params.set('source', normalized.source);
    if (normalized.mediaCategory) params.set('media_category', normalized.mediaCategory);
    if (normalized.licenseType) params.set('license_type', normalized.licenseType);
    if (normalized.length) params.set('length', normalized.length);
    if (normalized.extension) params.set('extension', normalized.extension);
    return `/api/music/free-search?${params.toString()}`;
}
