import { normalizeAiProviderTrack } from '../_shared/providerTrack';

const ENDPOINT = 'https://api.minimax.io/v1/music_generation';
const REQUEST_TIMEOUT_MS = 180000;

const dataUrl = (buffer, contentType = 'audio/mpeg') => (
    `data:${contentType};base64,${buffer.toString('base64')}`
);

const decodeAudioPayload = (audioPayload) => {
    const audio = String(audioPayload || '').trim();
    if (!audio) return { audioUrl: '', buffer: null };
    if (/^https:\/\//i.test(audio)) return { audioUrl: audio, buffer: null };
    if (/^[a-f0-9]+$/i.test(audio) && audio.length % 2 === 0) {
        return { audioUrl: '', buffer: Buffer.from(audio, 'hex') };
    }
    if (/^[a-z0-9+/=\r\n]+$/i.test(audio)) {
        return { audioUrl: '', buffer: Buffer.from(audio, 'base64') };
    }
    return { audioUrl: '', buffer: null };
};

export async function generateMiniMaxMusic(provider, request) {
    const apiKey = process.env.MINIMAX_API_KEY || '';
    if (!apiKey) {
        throw Object.assign(new Error('MINIMAX_API_KEY manquant: ajoutez la cle cote serveur pour generer.'), {
            code: 'provider-missing-key',
            status: 503,
        });
    }

    const prompt = String(request.prompt || '').trim() || 'cinematic instrumental music for a social video';
    const targetDuration = Number(request.durationSeconds) || provider.defaultDurationSeconds || 30;
    const instrumental = request.instrumental !== false;
    const model = process.env.MINIMAX_MUSIC_MODEL || 'music-2.6-free';
    const payload = {
        model,
        prompt: `${prompt}. Target duration: about ${Math.round(targetDuration)} seconds.`,
        audio_setting: {
            sample_rate: 44100,
            bitrate: 256000,
            format: 'mp3',
        },
        output_format: 'hex',
        is_instrumental: instrumental,
    };

    if (!instrumental) {
        payload.lyrics_optimizer = true;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response;
    try {
        response = await fetch(ENDPOINT, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
    } finally {
        clearTimeout(timer);
    }

    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.base_resp?.status_code) {
        throw Object.assign(new Error(body?.base_resp?.status_msg || body?.message || `MiniMax a refuse la generation (${response.status}).`), {
            code: response.status === 401 || response.status === 403 ? 'provider-auth-failed' : 'provider-unavailable',
            status: response.status || 503,
        });
    }

    const audioPayload = body?.data?.audio || body?.data?.audio_url || body?.audio || body?.audio_url || '';
    const decoded = decodeAudioPayload(audioPayload);
    const audioUrl = decoded.audioUrl || (decoded.buffer ? dataUrl(decoded.buffer, 'audio/mpeg') : '');
    if (!audioUrl) {
        throw Object.assign(new Error('MiniMax a repondu sans audio importable.'), {
            code: 'provider-empty-audio',
            status: 502,
        });
    }

    const durationMs = Number(body?.extra_info?.music_duration) || Math.round(targetDuration * 1000);
    const traceId = body?.trace_id || `minimax-${Date.now()}`;

    return {
        provider: provider.id,
        configured: true,
        status: 'ready',
        tracks: [normalizeAiProviderTrack({
            id: traceId,
            provider: provider.id,
            providerLabel: provider.label,
            title: request.presetLabel || 'MiniMax generation',
            artist: 'MiniMax Music',
            duration: Math.round(durationMs / 1000),
            genre: request.category || '',
            tags: [request.category, instrumental ? 'instrumental' : 'lyrics-optimized'].filter(Boolean),
            audioUrl,
            sourceName: 'MiniMax Music API',
            sourceUrl: provider.officialDocsUrl,
            license: 'MiniMax Music API terms by account plan',
            licenseUrl: provider.licenseUrl,
            rightsStatus: 'ai-generated',
            commercialUse: true,
            socialUse: true,
            contentIdWarning: 'Verifier les conditions MiniMax du compte et conserver trace_id, prompt et modele avant publication sociale.',
            prompt,
            category: request.category,
            generationMetadata: {
                traceId,
                model,
                outputFormat: 'hex',
                instrumental,
                baseResponse: body?.base_resp || null,
                extraInfo: body?.extra_info || null,
            },
        })],
    };
}
