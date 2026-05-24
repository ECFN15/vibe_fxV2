import { NextResponse } from 'next/server';
import { isAiInterfacesEnabledForRequest } from '@/config/aiLaunch';
import { getAiProviderDefinition } from '../_providers/aiProviderRegistry';
import { generateElevenLabsMusic } from '../_providers/elevenLabsMusicAdapter';
import { generateMiniMaxMusic } from '../_providers/minimaxMusicAdapter';
import { generateMubertMusic } from '../_providers/mubertAdapter';
import { generatePlaceholderAiMusic } from '../_providers/placeholderAiAdapter';
import { buildAiProviderStatus } from '../_shared/providerTrack';

export const runtime = 'nodejs';

const MAX_PROMPT_LENGTH = 900;

const ADAPTERS = {
    'minimax-music': generateMiniMaxMusic,
    mureka: generatePlaceholderAiMusic,
    'replicate-music': generatePlaceholderAiMusic,
    'elevenlabs-music': generateElevenLabsMusic,
    mubert: generateMubertMusic,
    'stable-audio': generatePlaceholderAiMusic,
    loudly: generatePlaceholderAiMusic,
    soundraw: generatePlaceholderAiMusic,
    beatoven: generatePlaceholderAiMusic,
};

const normaliseText = (value = '', limit = MAX_PROMPT_LENGTH) => (
    typeof value === 'string' ? value.trim().slice(0, limit) : ''
);

const normaliseDuration = (value, provider) => {
    const fallback = provider.defaultDurationSeconds || 20;
    const number = Number(value);
    const max = provider.maxDurationSeconds || 180;
    if (!Number.isFinite(number)) return fallback;
    return Math.max(3, Math.min(max, Math.round(number)));
};

const errorPayload = (provider, message, code = 'provider-unavailable') => ({
    provider: provider?.id || 'unknown',
    configured: provider?.configured === true,
    status: code,
    providers: provider ? [buildAiProviderStatus(provider, {
        status: code,
        configured: provider.configured,
        error: message,
    })] : [],
    stats: {
        found: 0,
        importable: 0,
        ignored: 1,
        ignoredReasons: [{ reason: code, count: 1 }],
    },
    cache: { status: 'disabled' },
    tracks: [],
    error: message,
});

export async function POST(request) {
    if (!isAiInterfacesEnabledForRequest(request)) {
        return NextResponse.json({ error: 'Generation IA masquee pour ce lancement.' }, { status: 404 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Payload JSON invalide.' }, { status: 400 });
    }

    const providerId = normaliseText(body.provider, 40);
    const provider = getAiProviderDefinition(providerId);
    if (!provider) {
        return NextResponse.json(errorPayload(null, 'Provider IA inconnu.', 'unsupported-provider'), { status: 400 });
    }

    const adapter = ADAPTERS[provider.id];
    if (!adapter) {
        return NextResponse.json(errorPayload(provider, 'Adapter IA absent pour ce provider.', 'unsupported-provider'), { status: 400 });
    }

    const selectedPreset = provider.presets.find((preset) => preset.id === body.category) || provider.presets[0];
    const prompt = normaliseText(body.prompt) || selectedPreset?.prompt || 'music for a social video edit';
    const requestModel = {
        provider: provider.id,
        prompt,
        category: normaliseText(body.category, 60) || selectedPreset?.id || '',
        presetLabel: selectedPreset?.label || '',
        durationSeconds: normaliseDuration(body.durationSeconds, provider),
        instrumental: body.instrumental !== false,
        intensity: normaliseText(body.intensity, 20),
        mode: normaliseText(body.mode, 20),
        format: normaliseText(body.format, 10),
        bitrate: Number(body.bitrate) || 128,
        bpm: Number(body.bpm) || 0,
    };

    try {
        const result = await adapter(provider, requestModel);
        const tracks = Array.isArray(result.tracks) ? result.tracks : [];
        return NextResponse.json({
            provider: provider.id,
            configured: true,
            status: result.status || (tracks.length ? 'ready' : 'empty'),
            providers: [buildAiProviderStatus(provider, {
                status: result.status || 'api-active',
                configured: true,
                count: tracks.length,
                importable: tracks.filter((track) => track.importStatus === 'importable').length,
            })],
            sourceUrl: provider.officialDocsUrl,
            cache: { status: 'disabled', note: 'Generation IA non cachee par defaut.' },
            stats: {
                found: tracks.length,
                importable: tracks.filter((track) => track.importStatus === 'importable').length,
                ignored: tracks.filter((track) => track.importStatus !== 'importable').length,
                ignoredReasons: [],
            },
            tracks,
        });
    } catch (error) {
        const code = error.code || 'provider-unavailable';
        const status = error.status && error.status >= 400 ? error.status : 503;
        return NextResponse.json(errorPayload(provider, error.message || 'Generation IA indisponible.', code), { status });
    }
}
