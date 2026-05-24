import { NextResponse } from 'next/server';
import { pixabayAudioAdapter } from '../_providers/pixabayAudioAdapter';

export const runtime = 'nodejs';

const MAX_QUERY_LENGTH = 80;
const DEFAULT_RESULTS_PER_PROVIDER = 20;
const MAX_RESULTS_PER_PROVIDER = 20;
const MAX_SCAN_PAGES = 5;
const MAX_SCAN_START_PAGE = 20;
const REQUEST_TIMEOUT_MS = 9000;
const EXACT_AUDIO_HOSTS = new Set([
    'cdn.pixabay.com',
    'pixabay.com',
    'audio.jamendo.com',
    'whitebataudio.com',
    'www.whitebataudio.com',
    'freesound.org',
]);
const SUBDOMAIN_AUDIO_HOSTS = [
    'storage.jamendo.com',
    'freesound.org',
];

const PROVIDERS = [
    {
        id: 'pixabay',
        label: 'Pixabay Music',
        mediaType: 'music',
        keyRequired: false,
        pageScan: true,
        officialDocsUrl: 'https://pixabay.com/music/',
    },
    {
        id: 'openverse',
        label: 'Openverse Audio',
        mediaType: 'audio',
        keyRequired: false,
        officialDocsUrl: 'https://api.openverse.org/v1/#tag/audio',
    },
    {
        id: 'jamendo',
        label: 'Jamendo Music',
        mediaType: 'music',
        keyRequired: true,
        env: ['JAMENDO_CLIENT_ID', 'MUSIC_JAMENDO_CLIENT_ID'],
        officialDocsUrl: 'https://developer.jamendo.com/v3.0/tracks',
    },
    {
        id: 'freesound',
        label: 'Freesound',
        mediaType: 'sfx/audio',
        keyRequired: true,
        env: ['FREESOUND_API_KEY', 'MUSIC_FREESOUND_API_KEY'],
        officialDocsUrl: 'https://freesound.org/docs/api/',
    },
];

const PROVIDER_MAP = new Map(PROVIDERS.map((provider) => [provider.id, provider]));

const JAMENDO_FEATURED_TAGS = new Set([
    'lounge',
    'classical',
    'electronic',
    'jazz',
    'pop',
    'hiphop',
    'relaxation',
    'rock',
    'soundtrack',
    'world',
    'metal',
]);

const OPENVERSE_SOURCE_ALIASES = {};

const normaliseText = (value, limit = MAX_QUERY_LENGTH) => (
    typeof value === 'string' ? value.trim().slice(0, limit) : ''
);

const normaliseNumber = (value, fallback, min, max) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, Math.round(number)));
};

const isAllowedImportHost = (value = '') => {
    try {
        const url = new URL(value);
        const host = url.hostname.toLowerCase();
        return url.protocol === 'https:' && (
            EXACT_AUDIO_HOSTS.has(host)
            || SUBDOMAIN_AUDIO_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`))
        );
    } catch {
        return false;
    }
};

const getEnv = (names = []) => names.map((name) => process.env[name]).find(Boolean) || '';

const toBoolean = (value) => value === true || value === 'true' || value === 1 || value === '1';

const isNonCommercialLicense = (value = '') => {
    const lower = value.toLowerCase();
    return lower.includes('by-nc') || lower.includes('noncommercial') || lower.includes('non-commercial') || lower.includes('/nc');
};

const isPublicDomainLike = (value = '') => {
    const lower = value.toLowerCase();
    return lower.includes('cc0') || lower.includes('public domain') || lower.includes('publicdomain') || lower.includes('/zero/');
};

const inferLicenseLabel = (licenseUrl = '', fallback = '') => {
    const lower = licenseUrl.toLowerCase();
    if (fallback) return fallback;
    if (lower.includes('/by-nc-nd/')) return 'Creative Commons BY-NC-ND';
    if (lower.includes('/by-nc-sa/')) return 'Creative Commons BY-NC-SA';
    if (lower.includes('/by-nc/')) return 'Creative Commons BY-NC';
    if (lower.includes('/by-nd/')) return 'Creative Commons BY-ND';
    if (lower.includes('/by-sa/')) return 'Creative Commons BY-SA';
    if (lower.includes('/by/')) return 'Creative Commons BY';
    if (lower.includes('/zero/')) return 'Creative Commons Zero';
    if (lower.includes('publicdomain')) return 'Public domain';
    return 'Open license metadata';
};

const withTimeout = async (url, options = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                ...(options.headers || {}),
            },
            next: { revalidate: 1800 },
        });
        clearTimeout(timer);
        return response;
    } catch (error) {
        clearTimeout(timer);
        throw error;
    }
};

const trackId = (provider, id) => `${provider}-${String(id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80)}`;

const buildTrack = ({
    id,
    provider,
    title,
    artist = '',
    duration = 0,
    previewUrl = '',
    downloadUrl = '',
    sourceName,
    sourceUrl = '',
    license = '',
    licenseUrl = '',
    attribution = '',
    thumbnail = '',
    contentIdWarning = '',
    tags = [],
}) => {
    const licenseText = `${license} ${licenseUrl}`;
    const publicDomain = isPublicDomainLike(licenseText);
    const commercialUse = !isNonCommercialLicense(licenseText);
    const importUrl = downloadUrl || previewUrl;
    return {
        id: trackId(provider, id),
        provider,
        title: title || 'Untitled audio',
        artist,
        duration: Number(duration) || 0,
        image: thumbnail,
        genre: tags[0] || '',
        previewUrl: previewUrl || downloadUrl,
        downloadUrl: importUrl,
        downloadAllowed: isAllowedImportHost(importUrl),
        sourceName,
        sourceUrl,
        license: inferLicenseLabel(licenseUrl, license),
        licenseUrl,
        attribution: attribution || [title, artist].filter(Boolean).join(' by '),
        rightsStatus: publicDomain ? 'cleared-social' : 'credit-required',
        commercialUse,
        socialUse: true,
        contentIdWarning,
        licenseSnapshotVersion: `${provider}-${new Date().toISOString().slice(0, 10)}`,
    };
};

const searchOpenverse = async ({
    query,
    genre,
    category,
    limit,
    page,
    source,
    mediaCategory,
    licenseType,
    length,
}) => {
    const params = new URLSearchParams({
        q: query || genre || 'music',
        page_size: String(limit),
        page: String(page),
    });
    const tag = normaliseText(category || genre, 40);
    const sourceFilter = normaliseText(OPENVERSE_SOURCE_ALIASES[source] || source, 40);
    const mediaCategoryFilter = normaliseText(mediaCategory, 40);
    const licenseTypeFilter = normaliseText(licenseType, 40);
    const lengthFilter = normaliseText(length, 40);
    if (sourceFilter) params.set('source', sourceFilter);
    if (mediaCategoryFilter) params.set('category', mediaCategoryFilter);
    if (licenseTypeFilter) params.set('license_type', licenseTypeFilter);
    if (lengthFilter) params.set('length', lengthFilter);
    if (!mediaCategoryFilter && tag && ['music', 'sound_effect', 'podcast'].includes(tag)) params.set('category', tag);
    else if (tag && !/^(source|license|length|category|title)-/.test(tag) && !query.toLowerCase().includes(tag.toLowerCase())) params.set('tags', tag);
    const response = await withTimeout(`https://api.openverse.engineering/v1/audio/?${params.toString()}`);
    if (!response.ok) throw new Error('Openverse a refuse la recherche.');
    const payload = await response.json();
    const tracks = (payload.results || []).map((item) => buildTrack({
        id: item.id,
        provider: 'openverse',
        title: item.title,
        artist: item.creator,
        duration: item.duration ? Math.round(Number(item.duration) / 1000) : 0,
        previewUrl: item.url,
        downloadUrl: item.url,
        sourceName: `Openverse / ${item.provider || item.source || 'audio'}`,
        sourceUrl: item.foreign_landing_url,
        license: item.license ? `CC ${String(item.license).toUpperCase()}` : '',
        licenseUrl: item.license_url,
        attribution: item.attribution,
        thumbnail: item.thumbnail,
        contentIdWarning: 'Openverse agrege des metadonnees ouvertes mais ne garantit pas leur exactitude. Verifier la page source avant publication.',
        tags: item.genres || item.tags?.map((tag) => tag.name).filter(Boolean) || [],
    })).filter((track) => track.downloadAllowed);
    return { provider: 'openverse', configured: true, tracks };
};

const searchJamendo = async ({ query, genre, category, limit }) => {
    const clientId = getEnv(PROVIDERS.find((provider) => provider.id === 'jamendo').env);
    if (!clientId) return { provider: 'jamendo', configured: false, tracks: [], error: 'JAMENDO_CLIENT_ID manquant.' };
    const tag = normaliseText(category || genre, 40);

    const params = new URLSearchParams({
        client_id: clientId,
        format: 'json',
        limit: String(limit),
        imagesize: '100',
        audioformat: 'mp31',
        audiodlformat: 'mp32',
        groupby: 'artist_id',
        boost: 'popularity_month',
        include: 'licenses musicinfo',
        content_id_free: '1',
        type: 'single albumtrack',
        vocalinstrumental: 'instrumental',
    });
    if (query) params.set('search', query);
    if (tag) {
        params.set('fuzzytags', tag);
        if (JAMENDO_FEATURED_TAGS.has(tag)) params.set('tags', tag);
    }

    const response = await withTimeout(`https://api.jamendo.com/v3.0/tracks/?${params.toString()}`);
    if (!response.ok) throw new Error('Jamendo a refuse la recherche.');
    const payload = await response.json();
    if (payload.headers?.status === 'failed') throw new Error(payload.headers?.error_message || 'Reponse Jamendo invalide.');

    const tracks = (payload.results || []).map((item) => {
        const licenseUrl = item.license_ccurl || '';
        const title = item.name || 'Untitled Jamendo track';
        const artist = item.artist_name || 'Jamendo artist';
        return buildTrack({
            id: item.id,
            provider: 'jamendo',
            title,
            artist,
            duration: item.duration,
            previewUrl: item.audio,
            downloadUrl: toBoolean(item.audiodownload_allowed) ? item.audiodownload : item.audio,
            sourceName: 'Jamendo Music',
            sourceUrl: item.shareurl || item.shorturl,
            licenseUrl,
            attribution: `${title} by ${artist}`,
            thumbnail: item.album_image || item.image,
            contentIdWarning: toBoolean(item.content_id_free)
                ? 'Jamendo signale content_id_free=true; conserver la preuve de licence.'
                : 'Content ID non garanti. Verifier la page Jamendo avant publication sociale.',
            tags: item.musicinfo?.tags?.genres || [],
        });
    }).filter((track) => track.downloadAllowed);
    return { provider: 'jamendo', configured: true, tracks };
};

const searchFreesound = async ({ query, genre, category, limit }) => {
    const token = getEnv(PROVIDERS.find((provider) => provider.id === 'freesound').env);
    if (!token) return { provider: 'freesound', configured: false, tracks: [], error: 'FREESOUND_API_KEY manquant.' };
    const tag = normaliseText(category || genre, 40);

    const params = new URLSearchParams({
        query: query || tag || 'music loop',
        page_size: String(limit),
        fields: 'id,name,username,url,license,duration,previews,tags',
        token,
    });
    if (tag) params.set('filter', `tag:${tag} duration:[0 TO 1800]`);
    else params.set('filter', 'duration:[0 TO 1800]');

    const response = await withTimeout(`https://freesound.org/apiv2/search/?${params.toString()}`);
    if (!response.ok) throw new Error('Freesound a refuse la recherche.');
    const payload = await response.json();
    const tracks = (payload.results || []).map((item) => {
        const preview = item.previews?.['preview-hq-mp3'] || item.previews?.['preview-lq-mp3'] || item.previews?.['preview-hq-ogg'] || '';
        return buildTrack({
            id: item.id,
            provider: 'freesound',
            title: item.name,
            artist: item.username,
            duration: item.duration,
            previewUrl: preview,
            downloadUrl: preview,
            sourceName: 'Freesound',
            sourceUrl: item.url,
            license: item.license,
            licenseUrl: item.license,
            attribution: `${item.name} by ${item.username}`,
            contentIdWarning: 'Freesound est surtout utile pour SFX/loops. API gratuite non commerciale sauf accord; verifier la licence piste.',
            tags: item.tags || [],
        });
    }).filter((track) => track.downloadAllowed);
    return { provider: 'freesound', configured: true, tracks };
};

const SEARCHERS = {
    pixabay: async (filters) => pixabayAudioAdapter.search(filters),
    openverse: searchOpenverse,
    jamendo: searchJamendo,
    freesound: searchFreesound,
};

const buildStats = (tracks = [], providerStatus = []) => {
    const found = tracks.length;
    const importable = tracks.filter((track) => track.downloadAllowed).length;
    const ignoredReasons = providerStatus
        .filter((provider) => provider.error)
        .map((provider) => ({
            reason: provider.configured === false ? 'provider-missing-key' : 'provider-unavailable',
            count: 1,
        }));
    return {
        found,
        importable,
        ignored: Math.max(0, found - importable) + ignoredReasons.reduce((sum, item) => sum + item.count, 0),
        ignoredReasons,
    };
};

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const query = normaliseText(searchParams.get('q')) || 'ambient';
    const genre = normaliseText(searchParams.get('genre'), 40);
    const category = normaliseText(searchParams.get('category'), 40);
    const source = normaliseText(searchParams.get('source'), 40);
    const mediaCategory = normaliseText(searchParams.get('media_category'), 40);
    const licenseType = normaliseText(searchParams.get('license_type'), 40);
    const length = normaliseText(searchParams.get('length'), 40);
    const requestedProvider = normaliseText(searchParams.get('provider'), 30) || 'all';
    const limit = normaliseNumber(searchParams.get('limit'), DEFAULT_RESULTS_PER_PROVIDER, 1, MAX_RESULTS_PER_PROVIDER);
    const pages = normaliseNumber(searchParams.get('pages'), 1, 1, MAX_SCAN_PAGES);
    const pageStart = normaliseNumber(searchParams.get('start_page') || searchParams.get('page_start'), 1, 1, MAX_SCAN_START_PAGE);

    if (requestedProvider === 'pixabay') {
        const payload = await pixabayAudioAdapter.search({
            query,
            category,
            pages,
            limit,
        });
        return NextResponse.json(payload, {
            headers: {
                'cache-control': 'private, max-age=300, stale-while-revalidate=86400',
            },
        });
    }

    const selectedProviders = requestedProvider === 'all'
        ? PROVIDERS.filter((provider) => !provider.keyRequired || getEnv(provider.env)).map((provider) => provider.id)
        : PROVIDERS.some((provider) => provider.id === requestedProvider)
            ? [requestedProvider]
            : [];

    if (!selectedProviders.length) {
        return NextResponse.json({
            provider: requestedProvider,
            configured: false,
            providers: [{
                id: requestedProvider || 'unknown',
                label: requestedProvider || 'unknown',
                mediaType: 'audio',
                status: 'unsupported',
                configured: false,
                count: 0,
                importable: 0,
                error: 'Provider retire: aucune API audio exploitable dans Vibe_fx.',
            }],
            scan: { pages, limit, pageStart },
            cache: { status: 'disabled' },
            status: 'provider-unavailable',
            stats: {
                found: 0,
                importable: 0,
                ignored: 1,
                ignoredReasons: [{ reason: 'unsupported-provider', count: 1 }],
            },
            tracks: [],
        }, { status: 400 });
    }

    const scanJobs = selectedProviders.flatMap((provider) => (
        Array.from({ length: pages }, (_, index) => ({ provider, page: pageStart + index }))
    ));
    const settled = await Promise.allSettled(scanJobs.map((job) => SEARCHERS[job.provider]({
        query,
        genre,
        category,
        limit,
        page: job.page,
        source,
        mediaCategory,
        licenseType,
        length,
    })));
    const providerStatusMap = new Map();
    settled.forEach((result, index) => {
        const id = scanJobs[index].provider;
        const definition = PROVIDERS.find((provider) => provider.id === id);
        if (result.status === 'fulfilled') {
            const previous = providerStatusMap.get(id) || {
                id,
                label: definition.label,
                mediaType: definition.mediaType,
                status: result.value.configured === false ? 'provider-missing-key' : 'active',
                configured: result.value.configured,
                count: 0,
                importable: 0,
                error: result.value.error || '',
                officialDocsUrl: definition.officialDocsUrl,
            };
            providerStatusMap.set(id, {
                ...previous,
                configured: previous.configured || result.value.configured,
                status: previous.error || result.value.error ? previous.status : 'active',
                count: previous.count + result.value.tracks.length,
                importable: previous.importable + result.value.tracks.filter((track) => track.downloadAllowed).length,
                error: previous.error || result.value.error || '',
            });
            return;
        }
        providerStatusMap.set(id, {
            id,
            label: definition.label,
            mediaType: definition.mediaType,
            status: definition.keyRequired && !getEnv(definition.env) ? 'provider-missing-key' : 'provider-unavailable',
            configured: !definition.keyRequired,
            count: 0,
            importable: 0,
            error: result.reason?.message || 'Recherche indisponible.',
            officialDocsUrl: definition.officialDocsUrl,
        });
    });
    const providerStatus = selectedProviders.map((id) => providerStatusMap.get(id)).filter(Boolean);

    const seenTrackIds = new Set();
    const tracks = settled
        .flatMap((result) => result.status === 'fulfilled' ? result.value.tracks : [])
        .filter((track) => {
            if (seenTrackIds.has(track.id)) return false;
            seenTrackIds.add(track.id);
            return true;
        });

    const stats = buildStats(tracks, providerStatus);
    const sourceProvider = PROVIDER_MAP.get(requestedProvider) || PROVIDER_MAP.get(selectedProviders[0]);

    return NextResponse.json({
        provider: requestedProvider,
        configured: providerStatus.some((status) => status.configured),
        providers: providerStatus,
        scan: { pages, limit, pageStart },
        sourceUrl: sourceProvider?.officialDocsUrl || 'https://api.openverse.org/v1/#tag/audio',
        cache: {
            status: 'controlled',
            ttlSeconds: 86400,
            note: 'Recherches provider-first cote serveur, limitees et cachees pour eviter les scans massifs.',
        },
        status: tracks.length ? 'ready' : providerStatus.some((provider) => provider.error) ? 'provider-unavailable' : 'empty',
        stats,
        tracks,
    }, {
        headers: {
            'cache-control': 'private, max-age=300, stale-while-revalidate=86400',
        },
    });
}
