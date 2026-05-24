import { normalizeAiProviderTrack } from '../_shared/providerTrack';

const ENDPOINT = 'https://api.elevenlabs.io/v1/music/detailed';
const REQUEST_TIMEOUT_MS = 120000;

const getBoundary = (contentType = '') => contentType.match(/boundary="?([^";]+)"?/i)?.[1] || '';

const parseMultipartMixed = (buffer, contentType) => {
    const boundary = getBoundary(contentType);
    if (!boundary) return { metadata: {}, audio: buffer };

    const marker = `--${boundary}`;
    const payload = buffer.toString('binary');
    const parts = payload.split(marker).filter((part) => part.trim() && !part.trim().startsWith('--'));
    let metadata = {};
    let audio = null;

    for (const part of parts) {
        const normalized = part.replace(/^\r?\n/, '');
        const separator = normalized.indexOf('\r\n\r\n') >= 0 ? '\r\n\r\n' : '\n\n';
        const headerEnd = normalized.indexOf(separator);
        if (headerEnd < 0) continue;
        const headers = normalized.slice(0, headerEnd).toLowerCase();
        let body = normalized.slice(headerEnd + separator.length);
        body = body.replace(/\r?\n$/, '');
        if (headers.includes('application/json')) {
            try {
                metadata = JSON.parse(body);
            } catch {
                metadata = {};
            }
            continue;
        }
        if (headers.includes('audio/') || headers.includes('octet-stream')) {
            audio = Buffer.from(body, 'binary');
        }
    }

    return { metadata, audio: audio || buffer };
};

const dataUrl = (buffer, contentType = 'audio/mpeg') => (
    `data:${contentType};base64,${buffer.toString('base64')}`
);

export async function generateElevenLabsMusic(provider, request) {
    const apiKey = process.env.ELEVENLABS_API_KEY || '';
    if (!apiKey) {
        throw Object.assign(new Error('ELEVENLABS_API_KEY manquant: ajoutez la cle cote serveur pour generer.'), {
            code: 'provider-missing-key',
            status: 503,
        });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const durationSeconds = Math.max(3, Math.min(provider.maxDurationSeconds || 600, Number(request.durationSeconds) || provider.defaultDurationSeconds || 20));
    const prompt = String(request.prompt || '').trim() || 'cinematic instrumental music for a social video';

    let response;
    try {
        response = await fetch(`${ENDPOINT}?output_format=mp3_44100_128`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
                Accept: 'multipart/mixed, audio/mpeg',
            },
            body: JSON.stringify({
                prompt,
                music_length_ms: Math.round(durationSeconds * 1000),
                model_id: 'music_v1',
                force_instrumental: request.instrumental !== false,
                sign_with_c2pa: true,
            }),
        });
    } finally {
        clearTimeout(timer);
    }

    if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw Object.assign(new Error(errorText || `ElevenLabs a refuse la generation (${response.status}).`), {
            code: response.status === 401 || response.status === 403 ? 'provider-auth-failed' : 'provider-unavailable',
            status: response.status,
        });
    }

    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const buffer = Buffer.from(await response.arrayBuffer());
    const parsed = contentType.includes('multipart/')
        ? parseMultipartMixed(buffer, contentType)
        : { metadata: {}, audio: buffer };
    const audioContentType = contentType.includes('multipart/') ? 'audio/mpeg' : contentType;
    const songId = response.headers.get('song-id') || parsed.metadata?.song_id || `elevenlabs-${Date.now()}`;
    const title = parsed.metadata?.song_metadata?.title || request.presetLabel || 'ElevenLabs generation';
    const genres = parsed.metadata?.song_metadata?.genres || [];

    return {
        provider: provider.id,
        configured: true,
        status: 'ready',
        tracks: [normalizeAiProviderTrack({
            id: songId,
            provider: provider.id,
            providerLabel: provider.label,
            title,
            artist: 'ElevenLabs Music',
            duration: durationSeconds,
            genre: genres[0] || request.category || '',
            tags: [request.category, ...genres].filter(Boolean),
            audioUrl: dataUrl(parsed.audio, audioContentType),
            sourceName: 'ElevenLabs Music API',
            sourceUrl: provider.officialDocsUrl,
            license: 'ElevenLabs Music commercial terms by subscription tier',
            licenseUrl: provider.licenseUrl,
            rightsStatus: 'ai-generated',
            commercialUse: true,
            socialUse: true,
            contentIdWarning: 'Verifier les Music Terms ElevenLabs par tier et conserver la reponse song-id/C2PA si disponible.',
            prompt,
            category: request.category,
            generationMetadata: {
                songId,
                compositionPlan: parsed.metadata?.composition_plan || null,
                songMetadata: parsed.metadata?.song_metadata || null,
                outputFormat: 'mp3_44100_128',
                c2paRequested: true,
            },
        })],
    };
}
