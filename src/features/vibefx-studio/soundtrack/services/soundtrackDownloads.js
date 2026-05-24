import { manifestDownloadName } from './soundtrackManifest';

export const AI_AUDIO_PROVIDERS = [
    'aitra-free',
    'minimax-music',
    'mureka',
    'replicate-music',
    'elevenlabs-music',
    'stable-audio',
    'loudly',
    'mubert',
    'soundraw',
    'beatoven',
];

const decodeHeaderValue = (value) => {
    if (!value) return '';
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
};

export function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJson(payload, fileName = manifestDownloadName()) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    downloadBlob(blob, fileName);
}

export async function fetchAudioBlobForTrack(track, options = {}) {
    const sourceUrl = track.downloadUrl || track.previewUrl || track.url;
    if (!sourceUrl) throw new Error('URL audio manquante.');

    const canFetchDirectly = sourceUrl.startsWith('/')
        || sourceUrl.startsWith('data:audio/')
        || sourceUrl.includes('firebasestorage.googleapis.com')
        || sourceUrl.includes('storage.googleapis.com');

    if (canFetchDirectly) {
        const response = await fetch(sourceUrl);
        if (!response.ok) throw new Error('Audio local indisponible.');
        const blob = await response.blob();
        if (!blob.type.startsWith('audio/')) throw new Error('Le fichier local ne declare pas un MIME audio.');
        return {
            blob,
            contentType: blob.type || 'audio/mpeg',
            finalUrl: sourceUrl,
            fileName: decodeURIComponent(sourceUrl.split('/').pop() || `${track.title}.mp3`),
        };
    }

    const isAiAudio = AI_AUDIO_PROVIDERS.includes(track.provider) || track.rightsStatus === 'ai-generated';
    const endpoint = options.projectImport
        ? '/api/music/project/import-url'
        : isAiAudio ? '/api/music/ai-import' : '/api/music/import';
    const headers = { 'Content-Type': 'application/json' };
    if (options.idToken) headers.Authorization = `Bearer ${options.idToken}`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            audioUrl: sourceUrl,
            provider: track.provider || options.provider || undefined,
            category: track.themeId || track.category || options.category || undefined,
            query: track.query || options.query || undefined,
            excludeTrackIds: track.excludeTrackIds || options.excludeTrackIds || undefined,
            trackMetadata: options.trackMetadata || undefined,
        }),
    });
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Import audio refuse par la politique de sources.');
    }
    const blob = await response.blob();
    if (!blob.type.startsWith('audio/')) throw new Error('La source importee ne declare pas un MIME audio.');
    const disposition = response.headers.get('content-disposition') || '';
    const dispositionName = disposition.match(/filename="([^"]+)"/)?.[1];
    return {
        blob,
        contentType: response.headers.get('content-type') || blob.type || 'audio/mpeg',
        finalUrl: response.headers.get('x-vibefx-audio-source-url') || sourceUrl,
        fileName: dispositionName || `${track.title || 'vibefx-audio'}.mp3`,
        trackMetadata: {
            providerTrackId: decodeHeaderValue(response.headers.get('x-vibefx-track-id')),
            title: decodeHeaderValue(response.headers.get('x-vibefx-track-title')),
            category: decodeHeaderValue(response.headers.get('x-vibefx-track-category')),
            tags: decodeHeaderValue(response.headers.get('x-vibefx-track-tags')).split(',').map((tag) => tag.trim()).filter(Boolean),
            license: decodeHeaderValue(response.headers.get('x-vibefx-track-license')),
            licenseUrl: decodeHeaderValue(response.headers.get('x-vibefx-track-license-url')),
            contentIdWarning: decodeHeaderValue(response.headers.get('x-vibefx-track-content-warning')),
        },
    };
}

export function filePickerAccept() {
    return 'audio/*,.json,application/json';
}
