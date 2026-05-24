import { normalizeAiProviderTrack } from '../_shared/providerTrack';

const BASE_URL = 'https://music-api.mubert.com/api/v3/public';
const REQUEST_TIMEOUT_MS = 45000;

const getCredentials = () => ({
    customerId: process.env.MUBERT_CUSTOMER_ID || '',
    accessToken: process.env.MUBERT_ACCESS_TOKEN || process.env.MUBERT_API_KEY || '',
});

const withTimeout = async (url, options = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timer);
    }
};

const latestGeneration = (track = {}) => (
    Array.isArray(track.generations) && track.generations.length
        ? track.generations[track.generations.length - 1]
        : {}
);

const trackToResult = (provider, track, request) => {
    const generation = latestGeneration(track);
    const url = generation.url || '';
    return normalizeAiProviderTrack({
        id: track.id || track.session_id || Date.now(),
        provider: provider.id,
        providerLabel: provider.label,
        title: request.presetLabel || track.prompt || 'Mubert generation',
        artist: 'Mubert',
        duration: track.duration || request.durationSeconds,
        genre: request.category,
        tags: [request.category, track.intensity, track.mode].filter(Boolean),
        audioUrl: url,
        bpm: track.bpm || request.bpm || 0,
        sourceName: 'Mubert API',
        sourceUrl: provider.officialDocsUrl,
        license: 'Mubert royalty-free sublicensing terms by contract',
        licenseUrl: provider.licenseUrl,
        rightsStatus: 'ai-generated',
        commercialUse: true,
        socialUse: true,
        contentIdWarning: 'Conserver le contrat Mubert, le track id et la generation URL avant publication sociale.',
        prompt: request.prompt,
        category: request.category,
        generationMetadata: {
            trackId: track.id,
            sessionId: track.session_id,
            generationStatus: generation.status || 'processing',
            playlistIndex: track.playlist_index || request.playlistIndex,
            intensity: track.intensity || request.intensity,
            mode: track.mode || request.mode,
            format: generation.format || request.format,
            bitrate: generation.bitrate || request.bitrate,
        },
    });
};

export async function generateMubertMusic(provider, request) {
    const { customerId, accessToken } = getCredentials();
    if (!customerId || !accessToken) {
        throw Object.assign(new Error('MUBERT_CUSTOMER_ID et MUBERT_ACCESS_TOKEN manquants: ajoutez les secrets serveur pour generer.'), {
            code: 'provider-missing-key',
            status: 503,
        });
    }

    const durationSeconds = Math.max(15, Math.min(provider.maxDurationSeconds || 1500, Number(request.durationSeconds) || provider.defaultDurationSeconds || 20));
    const selectedPreset = provider.presets.find((preset) => preset.id === request.category) || provider.presets[0];
    const payload = {
        playlist_index: selectedPreset?.playlistIndex || request.playlistIndex || '1.0.0',
        duration: durationSeconds,
        bitrate: Number(request.bitrate) || 128,
        format: request.format === 'wav' ? 'wav' : 'mp3',
        intensity: ['low', 'medium', 'high'].includes(request.intensity) ? request.intensity : 'high',
        mode: ['track', 'jingle', 'loop', 'mix'].includes(request.mode) ? request.mode : 'track',
    };
    if (request.bpm) payload.bpm = Number(request.bpm);

    const response = await withTimeout(`${BASE_URL}/tracks`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'customer-id': customerId,
            'access-token': accessToken,
        },
        body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw Object.assign(new Error(body?.error || body?.message || `Mubert a refuse la generation (${response.status}).`), {
            code: response.status === 401 || response.status === 403 ? 'provider-auth-failed' : 'provider-unavailable',
            status: response.status,
        });
    }

    const track = body.data || body;
    return {
        provider: provider.id,
        configured: true,
        status: latestGeneration(track).url ? 'ready' : 'processing',
        tracks: [trackToResult(provider, track, {
            ...request,
            ...payload,
            presetLabel: selectedPreset?.label,
            playlistIndex: payload.playlist_index,
        })],
    };
}
