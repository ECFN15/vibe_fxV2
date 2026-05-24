import { buildAudioResponse, errorResponse, fetchVerifiedAudio } from '../_shared/audioImport';

export const runtime = 'nodejs';

const DATA_URL_LIMIT_BYTES = 32 * 1024 * 1024;

const AITRA_THEME_FILTERS = {
    rock: { category: '4' },
    pop: { category: '5' },
    metal: { category: '6' },
    'metal-hardcore': { category: '6' },
    punk: { category: '7' },
    healing: { category: '8' },
    'healing-world': { category: '8' },
    'world-music': { category: '8' },
    electronic: { category: '5', tags: '27' },
    dance: { tags: '27' },
    cinematic: { tags: '22' },
    epic: { tags: '22' },
    lofi: { category: '8', tags: '18' },
    'japanese-vocal': { tags: '26' },
    'english-vocal': { tags: '24' },
    'up-tempo': { tags: '17' },
    'mid-tempo': { tags: '18' },
    'slow-tempo': { tags: '19' },
    energetic: { tags: '20' },
    emotional: { tags: '25' },
    emo: { tags: '25' },
    stylish: { tags: '16' },
    cute: { tags: '15' },
    rap: { tags: '28' },
};

const parseAudioDataUrl = (value = '') => {
    const match = String(value).match(/^data:(audio\/[a-z0-9.+-]+);base64,([a-z0-9+/=]+)$/i);
    if (!match) return null;
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.byteLength > DATA_URL_LIMIT_BYTES) {
        throw Object.assign(new Error('Audio IA trop lourd pour import direct: limite 32 MB.'), { status: 400 });
    }
    return {
        buffer,
        contentType: match[1],
        finalUrl: 'server-generated-ai-audio',
        fileName: 'vibefx-ai-audio.mp3',
    };
};

const sanitizeFileName = (value = 'aitra-free-track') => (
    String(value || 'aitra-free-track')
        .normalize('NFKD')
        .replace(/[^\w.-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'aitra-free-track'
);

const extractAitraTrackId = (value = '') => {
    const trimmed = String(value || '').trim();
    if (/^\d{1,8}$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/^https:\/\/aitrafree\.com\/(?:en\/|ja\/)?tracks\/(\d+)/i);
    return match?.[1] || '';
};

const buildAitraDownloadUrl = (song) => {
    const r2Key = typeof song?.r2_key === 'string' ? song.r2_key.trim() : '';
    if (!r2Key || !song?.is_public) {
        throw Object.assign(new Error('Piste Aitra Free non publique ou fichier audio manquant.'), { status: 400 });
    }
    const title = sanitizeFileName(song.title_en || song.title || `aitra-free-${song.id || 'track'}`);
    return {
        title,
        url: `https://aitrafree.com/api/download/${encodeURIComponent(r2Key)}?title=${encodeURIComponent(title)}`,
    };
};

const normalizeAitraSong = (song = {}) => {
    const tags = Array.isArray(song.tags)
        ? song.tags.map((tag) => tag.name_en || tag.name).filter(Boolean)
        : [];
    const title = song.title_en || song.title || `Aitra Free ${song.id}`;
    return {
        id: String(song.id || ''),
        title,
        category: song.category_name_en || song.category_name || 'Aitra Free',
        tags,
        sourceUrl: `https://aitrafree.com/en/tracks/${song.id}`,
        license: 'Aitra Free Terms of Service',
        licenseUrl: 'https://aitrafree.com/en/terms',
        contentIdWarning: 'Aitra Free interdit la revente du son brut, la fausse attribution, la distribution streaming comme morceau et Content ID.',
    };
};

async function fetchAitraSongById(trackId) {
    if (!trackId) return null;

    const response = await fetch(`https://aitrafree.com/api/songs/${encodeURIComponent(trackId)}`, {
        headers: {
            Accept: 'application/json',
            'User-Agent': 'Vibe_fx audio importer',
        },
        cache: 'no-store',
    });
    if (!response.ok) {
        throw Object.assign(new Error('Piste Aitra Free introuvable.'), { status: 404 });
    }

    const payload = await response.json().catch(() => ({}));
    const song = payload?.song || null;
    if (!song) throw Object.assign(new Error('Piste Aitra Free introuvable.'), { status: 404 });
    return song;
}

async function fetchAitraSongsByTheme({ category = '', query = '', excludeTrackIds = [] } = {}) {
    const key = String(category || query || 'rock').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const filter = AITRA_THEME_FILTERS[key] || AITRA_THEME_FILTERS.rock;
    const excluded = new Set((Array.isArray(excludeTrackIds) ? excludeTrackIds : []).map(String));
    const params = new URLSearchParams({ limit: '30', page: '1' });
    if (filter.category) params.set('category', filter.category);
    if (filter.tags) params.set('tags', filter.tags);

    const firstResponse = await fetch(`https://aitrafree.com/api/songs?${params.toString()}`, {
        headers: {
            Accept: 'application/json',
            'User-Agent': 'Vibe_fx audio importer',
        },
        cache: 'no-store',
    });
    if (!firstResponse.ok) throw Object.assign(new Error('Catalogue Aitra Free indisponible.'), { status: 502 });
    const firstPayload = await firstResponse.json().catch(() => ({}));
    const totalPages = Math.max(1, Math.min(5, Number(firstPayload?.pagination?.totalPages) || 1));
    let songs = Array.isArray(firstPayload?.songs) ? firstPayload.songs : [];

    if (totalPages > 1) {
        const page = 1 + Math.floor(Math.random() * totalPages);
        if (page !== 1) {
            params.set('page', String(page));
            const response = await fetch(`https://aitrafree.com/api/songs?${params.toString()}`, {
                headers: {
                    Accept: 'application/json',
                    'User-Agent': 'Vibe_fx audio importer',
                },
                cache: 'no-store',
            });
            if (response.ok) {
                const payload = await response.json().catch(() => ({}));
                if (Array.isArray(payload?.songs) && payload.songs.length) songs = payload.songs;
            }
        }
    }

    const candidates = songs.filter((song) => song?.is_public && song?.r2_key && !excluded.has(String(song.id)));
    if (!candidates.length) throw Object.assign(new Error('Aucune piste Aitra Free disponible pour ce theme.'), { status: 404 });
    return candidates[Math.floor(Math.random() * candidates.length)];
}

async function fetchAitraTrackAudio({ audioUrl = '', category = '', query = '', excludeTrackIds = [] } = {}) {
    const trackId = extractAitraTrackId(audioUrl);
    const song = trackId
        ? await fetchAitraSongById(trackId)
        : await fetchAitraSongsByTheme({ category, query, excludeTrackIds });
    if (!song) return null;

    const { title, url } = buildAitraDownloadUrl(song);
    const metadata = normalizeAitraSong(song);
    const downloadUrl = url;
    const audio = await fetchVerifiedAudio(downloadUrl);
    return {
        ...audio,
        finalUrl: metadata.sourceUrl,
        fileName: `${title}.mp3`,
        metadata,
    };
}

export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return errorResponse('Payload JSON invalide.');
    }

    const dataUrl = typeof body.audioDataUrl === 'string' ? body.audioDataUrl.trim() : '';
    const audioUrl = typeof body.audioUrl === 'string' ? body.audioUrl.trim() : '';
    const provider = typeof body.provider === 'string' ? body.provider.trim() : '';
    const category = typeof body.category === 'string' ? body.category.trim() : '';
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    const excludeTrackIds = Array.isArray(body.excludeTrackIds) ? body.excludeTrackIds : [];

    try {
        if (dataUrl) return buildAudioResponse(parseAudioDataUrl(dataUrl));
        const aitraAudio = (provider === 'aitra-free' || extractAitraTrackId(audioUrl))
            ? await fetchAitraTrackAudio({ audioUrl, category, query, excludeTrackIds })
            : null;
        if (aitraAudio) return buildAudioResponse(aitraAudio);
        return buildAudioResponse(await fetchVerifiedAudio(audioUrl));
    } catch (error) {
        return errorResponse(error.message || 'Import audio IA refuse.', error.status || 400);
    }
}
