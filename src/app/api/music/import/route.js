import { buildAudioResponse, errorResponse, fetchVerifiedAudio } from '../_shared/audioImport';

export const runtime = 'nodejs';

export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return errorResponse('Payload JSON invalide.');
    }

    const audioUrl = typeof body.audioUrl === 'string' ? body.audioUrl.trim() : '';
    try {
        return buildAudioResponse(await fetchVerifiedAudio(audioUrl));
    } catch (error) {
        return errorResponse(error.message || 'Import audio refuse par la politique de sources.', error.status || 400);
    }
}
