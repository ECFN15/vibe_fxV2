import { buildAudioResponse, errorResponse, fetchVerifiedAudio } from '../../_shared/audioImport';

export const runtime = 'nodejs';

const FIREBASE_LOOKUP_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup';

function getBearerToken(request) {
    const header = request.headers.get('authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim() || '';
}

async function verifyFirebaseIdToken(idToken) {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '';
    if (!apiKey) {
        throw Object.assign(new Error('Verification auth Firebase indisponible cote serveur.'), { status: 503 });
    }
    if (!idToken) {
        throw Object.assign(new Error('Authentification requise pour importer dans le projet.'), { status: 401 });
    }

    let response;
    try {
        response = await fetch(`${FIREBASE_LOOKUP_URL}?key=${encodeURIComponent(apiKey)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
        });
    } catch {
        throw Object.assign(new Error('Verification auth Firebase impossible.'), { status: 503 });
    }

    if (!response.ok) {
        throw Object.assign(new Error('Session Firebase invalide ou expiree.'), { status: 401 });
    }

    const payload = await response.json().catch(() => ({}));
    const user = Array.isArray(payload.users) ? payload.users[0] : null;
    if (!user?.localId) {
        throw Object.assign(new Error('Session Firebase invalide.'), { status: 401 });
    }
    return { uid: user.localId };
}

function validateProjectImportMetadata(metadata = {}) {
    const missing = [];
    if (!metadata.sourceName && !metadata.sourceProvider && !metadata.provider) missing.push('source');
    if (!metadata.sourceUrl && !metadata.sourcePageUrl) missing.push('sourceUrl');
    if (!metadata.license) missing.push('license');
    if (!metadata.licenseUrl) missing.push('licenseUrl');
    if (!metadata.rightsStatus) missing.push('rightsStatus');
    if (metadata.rightsStatus === 'blocked') missing.push('rightsStatusBlocked');
    return missing;
}

export async function POST(request) {
    let user;
    try {
        user = await verifyFirebaseIdToken(getBearerToken(request));
    } catch (error) {
        return errorResponse(error.message || 'Authentification requise.', error.status || 401);
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return errorResponse('Payload JSON invalide.');
    }

    const audioUrl = typeof body.audioUrl === 'string' ? body.audioUrl.trim() : '';
    const metadata = body.trackMetadata && typeof body.trackMetadata === 'object' ? body.trackMetadata : {};
    const missing = validateProjectImportMetadata(metadata);
    if (missing.length > 0) {
        return errorResponse(`Metadata droits incomplète: ${missing.join(', ')}.`);
    }

    try {
        const audio = await fetchVerifiedAudio(audioUrl);
        const response = buildAudioResponse(audio);
        response.headers.set('x-vibefx-project-import-uid', user.uid);
        return response;
    } catch (error) {
        return errorResponse(error.message || 'Import projet refuse par la politique de sources.', error.status || 400);
    }
}
