import { buildAudioResponse, errorResponse, fetchVerifiedAudio } from '../_shared/audioImport';

export const runtime = 'nodejs';

const DATA_URL_LIMIT_BYTES = 32 * 1024 * 1024;

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

async function fetchAitraTrackAudio(value = '') {
    const trackId = extractAitraTrackId(value);
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
    const r2Key = typeof song?.r2_key === 'string' ? song.r2_key.trim() : '';
    if (!r2Key || !song?.is_public) {
        throw Object.assign(new Error('Piste Aitra Free non publique ou fichier audio manquant.'), { status: 400 });
    }

    const title = sanitizeFileName(song.title_en || song.title || `aitra-free-${trackId}`);
    const downloadUrl = `https://aitrafree.com/api/download/${encodeURIComponent(r2Key)}?title=${encodeURIComponent(title)}`;
    const audio = await fetchVerifiedAudio(downloadUrl);
    return {
        ...audio,
        finalUrl: `https://aitrafree.com/en/tracks/${trackId}`,
        fileName: `${title}.mp3`,
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

    try {
        if (dataUrl) return buildAudioResponse(parseAudioDataUrl(dataUrl));
        const aitraAudio = await fetchAitraTrackAudio(audioUrl);
        if (aitraAudio) return buildAudioResponse(aitraAudio);
        return buildAudioResponse(await fetchVerifiedAudio(audioUrl));
    } catch (error) {
        return errorResponse(error.message || 'Import audio IA refuse.', error.status || 400);
    }
}
