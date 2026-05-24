import { isAiInterfacesEnabledForRequest } from '@/config/aiLaunch';
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

export async function POST(request) {
    if (!isAiInterfacesEnabledForRequest(request)) {
        return errorResponse('Import audio IA masque pour ce lancement.', 404);
    }

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
        return buildAudioResponse(await fetchVerifiedAudio(audioUrl));
    } catch (error) {
        return errorResponse(error.message || 'Import audio IA refuse.', error.status || 400);
    }
}
