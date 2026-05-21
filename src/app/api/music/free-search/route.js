import { NextResponse } from 'next/server';
import { pixabayAudioAdapter } from '../_providers/pixabayAudioAdapter';

export const runtime = 'nodejs';

const MAX_QUERY_LENGTH = 80;
const DEFAULT_RESULTS_PER_PROVIDER = 8;
const MAX_RESULTS_PER_PROVIDER = 20;
const MAX_SCAN_PAGES = 5;
const REQUEST_TIMEOUT_MS = 9000;
const EXACT_AUDIO_HOSTS = new Set([
    'cdn.pixabay.com',
    'pixabay.com',
    'audio.jamendo.com',
    'whitebataudio.com',
    'www.whitebataudio.com',
    'freesound.org',
    'archive.org',
    'commons.wikimedia.org',
]);
const SUBDOMAIN_AUDIO_HOSTS = [
    'storage.jamendo.com',
    'freesound.org',
    'archive.org',
    'us.archive.org',
    'upload.wikimedia.org',
];

const PROVIDERS = [
    { id: 'pixabay', label: 'Pixabay Music', keyRequired: false, pageScan: true },
    { id: 'openverse', label: 'Openverse Audio', keyRequired: false },
    { id: 'jamendo', label: 'Jamendo Music', keyRequired: true, env: ['JAMENDO_CLIENT_ID', 'MUSIC_JAMENDO_CLIENT_ID'] },
    { id: 'freesound', label: 'Freesound', keyRequired: true, env: ['FREESOUND_API_KEY', 'MUSIC_FREESOUND_API_KEY'] },
    { id: 'archive', label: 'Internet Archive', keyRequired: false },
    { id: 'wikimedia', label: 'Wikimedia Commons', keyRequired: false },
];

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

const searchOpenverse = async ({ query, genre, limit, page }) => {
    const params = new URLSearchParams({
        q: query || genre || 'music',
        page_size: String(limit),
        page: String(page),
    });
    if (genre) params.set('tags', genre);
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

const searchJamendo = async ({ query, genre, limit }) => {
    const clientId = getEnv(PROVIDERS.find((provider) => provider.id === 'jamendo').env);
    if (!clientId) return { provider: 'jamendo', configured: false, tracks: [], error: 'JAMENDO_CLIENT_ID manquant.' };

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
    if (genre) params.set('fuzzytags', genre);

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

const searchFreesound = async ({ query, genre, limit }) => {
    const token = getEnv(PROVIDERS.find((provider) => provider.id === 'freesound').env);
    if (!token) return { provider: 'freesound', configured: false, tracks: [], error: 'FREESOUND_API_KEY manquant.' };

    const params = new URLSearchParams({
        query: query || genre || 'music loop',
        page_size: String(limit),
        fields: 'id,name,username,url,license,duration,previews,tags',
        token,
    });
    if (genre) params.set('filter', `tag:${genre} duration:[0 TO 1800]`);
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

const pickArchiveAudioFile = (files = []) => (
    files.find((file) => /vbr mp3/i.test(file.format || '') && file.name)
    || files.find((file) => /mp3/i.test(file.name || '') && file.name)
    || files.find((file) => /ogg/i.test(file.name || '') && file.name)
);

const searchArchive = async ({ query, genre, limit, page }) => {
    const term = normaliseText([query, genre].filter(Boolean).join(' '), 120) || 'music';
    const params = new URLSearchParams({
        q: `mediatype:audio AND (${term}) AND (licenseurl:creativecommons.org OR licenseurl:publicdomain)`,
        rows: String(Math.min(5, limit)),
        page: String(page),
        output: 'json',
    });
    ['identifier', 'title', 'creator', 'licenseurl'].forEach((field) => params.append('fl[]', field));
    const response = await withTimeout(`https://archive.org/advancedsearch.php?${params.toString()}`);
    if (!response.ok) throw new Error('Internet Archive a refuse la recherche.');
    const payload = await response.json();
    const docs = payload.response?.docs || [];
    const details = await Promise.allSettled(docs.map(async (doc) => {
        const metaResponse = await withTimeout(`https://archive.org/metadata/${encodeURIComponent(doc.identifier)}`);
        if (!metaResponse.ok) return null;
        const metadata = await metaResponse.json();
        const audioFile = pickArchiveAudioFile(metadata.files);
        if (!audioFile) return null;
        const fileUrl = `https://archive.org/download/${encodeURIComponent(doc.identifier)}/${encodeURIComponent(audioFile.name)}`;
        const title = doc.title || metadata.metadata?.title || doc.identifier;
        const artist = Array.isArray(doc.creator) ? doc.creator.join(', ') : doc.creator || metadata.metadata?.creator || 'Internet Archive contributor';
        const licenseUrl = Array.isArray(doc.licenseurl) ? doc.licenseurl[0] : doc.licenseurl || metadata.metadata?.licenseurl || '';
        return buildTrack({
            id: doc.identifier,
            provider: 'archive',
            title,
            artist,
            previewUrl: fileUrl,
            downloadUrl: fileUrl,
            sourceName: 'Internet Archive',
            sourceUrl: `https://archive.org/details/${doc.identifier}`,
            licenseUrl,
            attribution: `${title} by ${artist}`,
            contentIdWarning: 'Internet Archive a des metadonnees heterogenes. Verifier licenseurl et page item avant publication.',
            tags: ['archive'],
        });
    }));
    const tracks = details.map((item) => item.status === 'fulfilled' ? item.value : null).filter(Boolean);
    return { provider: 'archive', configured: true, tracks };
};

const cleanHtml = (value = '') => String(value).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const searchWikimedia = async ({ query, genre, limit }) => {
    const term = normaliseText([query, genre, 'filetype:ogg'].filter(Boolean).join(' '), 120) || 'music filetype:ogg';
    const params = new URLSearchParams({
        action: 'query',
        generator: 'search',
        gsrsearch: term,
        gsrnamespace: '6',
        gsrlimit: String(limit),
        prop: 'imageinfo',
        iiprop: 'url|extmetadata',
        format: 'json',
        origin: '*',
    });
    const response = await withTimeout(`https://commons.wikimedia.org/w/api.php?${params.toString()}`);
    if (!response.ok) throw new Error('Wikimedia Commons a refuse la recherche.');
    const payload = await response.json();
    const pages = Object.values(payload.query?.pages || {});
    const tracks = pages.map((page) => {
        const info = page.imageinfo?.[0];
        if (!info?.url || !/^audio\//i.test(info.mime || 'audio/unknown') && !/\.(ogg|oga|mp3|wav)$/i.test(info.url)) return null;
        const meta = info.extmetadata || {};
        const title = cleanHtml(meta.ObjectName?.value) || page.title?.replace(/^File:/, '') || 'Wikimedia audio';
        const artist = cleanHtml(meta.Artist?.value || meta.Credit?.value) || 'Wikimedia Commons contributor';
        const license = cleanHtml(meta.LicenseShortName?.value || meta.UsageTerms?.value);
        const licenseUrl = meta.LicenseUrl?.value || info.descriptionurl || '';
        return buildTrack({
            id: page.pageid,
            provider: 'wikimedia',
            title,
            artist,
            previewUrl: info.url,
            downloadUrl: info.url,
            sourceName: 'Wikimedia Commons',
            sourceUrl: info.descriptionurl,
            license,
            licenseUrl,
            attribution: `${title} by ${artist}`,
            contentIdWarning: 'Wikimedia Commons audio est tres heterogene. Verifier la page fichier et la licence avant publication.',
            tags: ['commons'],
        });
    }).filter(Boolean);
    return { provider: 'wikimedia', configured: true, tracks };
};

const SEARCHERS = {
    pixabay: async (filters) => pixabayAudioAdapter.search(filters),
    openverse: searchOpenverse,
    jamendo: searchJamendo,
    freesound: searchFreesound,
    archive: searchArchive,
    wikimedia: searchWikimedia,
};

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const query = normaliseText(searchParams.get('q')) || 'ambient';
    const genre = normaliseText(searchParams.get('genre'), 40);
    const category = normaliseText(searchParams.get('category'), 40);
    const requestedProvider = normaliseText(searchParams.get('provider'), 30) || 'all';
    const limit = normaliseNumber(searchParams.get('limit'), DEFAULT_RESULTS_PER_PROVIDER, 1, MAX_RESULTS_PER_PROVIDER);
    const pages = normaliseNumber(searchParams.get('pages'), 1, 1, MAX_SCAN_PAGES);

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
        ? PROVIDERS.map((provider) => provider.id)
        : PROVIDERS.some((provider) => provider.id === requestedProvider)
            ? [requestedProvider]
            : ['openverse'];

    const scanJobs = selectedProviders.flatMap((provider) => (
        Array.from({ length: pages }, (_, index) => ({ provider, page: index + 1 }))
    ));
    const settled = await Promise.allSettled(scanJobs.map((job) => SEARCHERS[job.provider]({ query, genre, limit, page: job.page })));
    const providerStatusMap = new Map();
    settled.forEach((result, index) => {
        const id = scanJobs[index].provider;
        const definition = PROVIDERS.find((provider) => provider.id === id);
        if (result.status === 'fulfilled') {
            const previous = providerStatusMap.get(id) || {
                id,
                label: definition.label,
                configured: result.value.configured,
                count: 0,
                error: result.value.error || '',
            };
            providerStatusMap.set(id, {
                ...previous,
                configured: previous.configured || result.value.configured,
                count: previous.count + result.value.tracks.length,
                error: previous.error || result.value.error || '',
            });
            return;
        }
        providerStatusMap.set(id, {
            id,
            label: definition.label,
            configured: !definition.keyRequired,
            count: 0,
            error: result.reason?.message || 'Recherche indisponible.',
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

    return NextResponse.json({
        provider: requestedProvider,
        configured: providerStatus.some((status) => status.configured),
        providers: providerStatus,
        scan: { pages, limit },
        sourceUrl: requestedProvider === 'pixabay' ? 'https://pixabay.com/api/docs/' : 'https://docs.openverse.org/api/',
        cache: {
            status: 'controlled',
            ttlSeconds: 86400,
            note: 'Pixabay impose un cache 24h pour son API images/videos; les scans Soundtrack restent volontaires et limites.',
        },
        tracks,
    }, {
        headers: {
            'cache-control': 'private, max-age=300, stale-while-revalidate=86400',
        },
    });
}
