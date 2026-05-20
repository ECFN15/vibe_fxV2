import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_AUDIO_IMPORT_BYTES = 150 * 1024 * 1024;
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

const isAllowedHost = (hostname) => {
    const host = hostname.toLowerCase();
    return EXACT_AUDIO_HOSTS.has(host) || SUBDOMAIN_AUDIO_HOSTS.some((domain) => (
        host === domain || host.endsWith(`.${domain}`)
    ));
};

const isAllowedAudioUrl = (value) => {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && isAllowedHost(url.hostname);
    } catch {
        return false;
    }
};

const errorResponse = (message, status = 400) => (
    NextResponse.json({ error: message }, { status })
);

export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return errorResponse('Payload JSON invalide.');
    }

    const audioUrl = typeof body.audioUrl === 'string' ? body.audioUrl.trim() : '';
    if (!isAllowedAudioUrl(audioUrl)) {
        return errorResponse('URL audio refusee: utilisez une URL HTTPS directe depuis une source gratuite verifiee.');
    }

    let response;
    try {
        response = await fetch(audioUrl, {
            method: 'GET',
            redirect: 'follow',
            headers: {
                Accept: 'audio/*, application/octet-stream;q=0.8',
            },
        });
    } catch {
        return errorResponse('Impossible de telecharger cette URL audio.', 502);
    }

    if (!response.ok) {
        return errorResponse('La source audio a refuse le telechargement.', 502);
    }

    const finalUrl = response.url || audioUrl;
    if (!isAllowedAudioUrl(finalUrl)) {
        return errorResponse('URL finale refusee par la politique de sources verifiees.');
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('audio/')) {
        return errorResponse('La ressource distante ne declare pas un contenu audio.');
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_AUDIO_IMPORT_BYTES) {
        return errorResponse('Fichier trop lourd: limite 150 MB.');
    }

    const reader = response.body?.getReader();
    if (!reader) {
        return errorResponse('Flux audio illisible.', 502);
    }

    const chunks = [];
    let totalBytes = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > MAX_AUDIO_IMPORT_BYTES) {
            await reader.cancel();
            return errorResponse('Fichier trop lourd: limite 150 MB.');
        }
        chunks.push(value);
    }

    const audioBuffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
    const fileName = decodeURIComponent(new URL(finalUrl).pathname.split('/').filter(Boolean).pop() || 'imported-audio');

    return new Response(audioBuffer, {
        status: 200,
        headers: {
            'content-type': contentType,
            'content-length': String(audioBuffer.byteLength),
            'content-disposition': `attachment; filename="${fileName.replace(/"/g, '')}"`,
            'x-vibefx-audio-source-url': finalUrl,
        },
    });
}
