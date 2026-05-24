import { NextResponse } from 'next/server';

export const MAX_AUDIO_IMPORT_BYTES = 150 * 1024 * 1024;

const EXACT_AUDIO_HOSTS = new Set([
    'cdn.pixabay.com',
    'pixabay.com',
    'audio.jamendo.com',
    'whitebataudio.com',
    'www.whitebataudio.com',
    'freesound.org',
    'aitrafree.com',
    'api.minimax.io',
    'filecdn.minimax.chat',
    'api.mureka.ai',
    'platform.mureka.ai',
    'replicate.com',
    'replicate.delivery',
    'fal.media',
]);

const SUBDOMAIN_AUDIO_HOSTS = [
    'storage.jamendo.com',
    'freesound.org',
    'minimax.io',
    'minimax.chat',
    'mureka.ai',
    'replicate.delivery',
    'fal.media',
];

export const errorResponse = (message, status = 400) => (
    NextResponse.json({ error: message }, { status })
);

export const isAllowedHost = (hostname) => {
    const host = hostname.toLowerCase();
    return EXACT_AUDIO_HOSTS.has(host) || SUBDOMAIN_AUDIO_HOSTS.some((domain) => (
        host === domain || host.endsWith(`.${domain}`)
    ));
};

export const isAllowedAudioUrl = (value) => {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && isAllowedHost(url.hostname);
    } catch {
        return false;
    }
};

export async function fetchVerifiedAudio(audioUrl) {
    if (!isAllowedAudioUrl(audioUrl)) {
        throw Object.assign(
            new Error('URL audio refusee: utilisez une URL HTTPS directe depuis une source verifiee ou importez le fichier audio.'),
            { status: 400 }
        );
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
        throw Object.assign(new Error('Impossible de telecharger cette URL audio.'), { status: 502 });
    }

    if (!response.ok) {
        throw Object.assign(new Error('La source audio a refuse le telechargement.'), { status: 502 });
    }

    const finalUrl = response.url || audioUrl;
    if (!isAllowedAudioUrl(finalUrl)) {
        throw Object.assign(new Error('URL finale refusee par la politique de sources verifiees.'), { status: 400 });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('audio/')) {
        throw Object.assign(new Error('La ressource distante ne declare pas un contenu audio.'), { status: 400 });
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_AUDIO_IMPORT_BYTES) {
        throw Object.assign(new Error('Fichier trop lourd: limite 150 MB.'), { status: 400 });
    }

    const reader = response.body?.getReader();
    if (!reader) {
        throw Object.assign(new Error('Flux audio illisible.'), { status: 502 });
    }

    const chunks = [];
    let totalBytes = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > MAX_AUDIO_IMPORT_BYTES) {
            await reader.cancel();
            throw Object.assign(new Error('Fichier trop lourd: limite 150 MB.'), { status: 400 });
        }
        chunks.push(value);
    }

    return {
        buffer: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))),
        contentType,
        finalUrl,
        fileName: decodeURIComponent(new URL(finalUrl).pathname.split('/').filter(Boolean).pop() || 'imported-audio'),
    };
}

const encodeHeaderValue = (value = '') => encodeURIComponent(String(value || '').slice(0, 500));

export function buildAudioResponse({ buffer, contentType, finalUrl, fileName, metadata = null }) {
    const headers = {
        'content-type': contentType,
        'content-length': String(buffer.byteLength),
        'content-disposition': `attachment; filename="${String(fileName || 'imported-audio').replace(/"/g, '')}"`,
        'x-vibefx-audio-source-url': finalUrl,
    };

    if (metadata) {
        headers['x-vibefx-track-id'] = encodeHeaderValue(metadata.id);
        headers['x-vibefx-track-title'] = encodeHeaderValue(metadata.title);
        headers['x-vibefx-track-category'] = encodeHeaderValue(metadata.category);
        headers['x-vibefx-track-tags'] = encodeHeaderValue(Array.isArray(metadata.tags) ? metadata.tags.join(',') : metadata.tags);
        headers['x-vibefx-track-license'] = encodeHeaderValue(metadata.license);
        headers['x-vibefx-track-license-url'] = encodeHeaderValue(metadata.licenseUrl);
        headers['x-vibefx-track-content-warning'] = encodeHeaderValue(metadata.contentIdWarning);
    }

    return new Response(buffer, {
        status: 200,
        headers,
    });
}
