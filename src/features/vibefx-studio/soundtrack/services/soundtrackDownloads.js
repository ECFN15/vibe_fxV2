import { manifestDownloadName } from './soundtrackManifest';

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

export async function fetchAudioBlobForTrack(track) {
    const sourceUrl = track.downloadUrl || track.previewUrl || track.url;
    if (!sourceUrl) throw new Error('URL audio manquante.');

    if (sourceUrl.startsWith('/')) {
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

    const response = await fetch('/api/music/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl: sourceUrl }),
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
    };
}

export function filePickerAccept() {
    return 'audio/*,.json,application/json';
}
