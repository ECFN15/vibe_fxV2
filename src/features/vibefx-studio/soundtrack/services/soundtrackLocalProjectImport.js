const LOCAL_IMPORT_ENDPOINT = '/api/music/local-file-import';

export async function loadLocalProjectSoundtrackManifest() {
    try {
        const response = await fetch(LOCAL_IMPORT_ENDPOINT, { cache: 'no-store' });
        if (!response.ok) return null;
        return response.json();
    } catch {
        return null;
    }
}

export async function persistAudioBlobToLocalProject({ track = {}, blob, fileName = '', contentType = '' }) {
    if (!blob) return null;
    try {
        const uploadFile = blob instanceof File
            ? blob
            : new File([blob], fileName || track.fileName || `${track.title || 'vibefx-audio'}.mp3`, {
                type: contentType || blob.type || 'audio/mpeg',
            });
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('metadata', JSON.stringify({
            ...track,
            fileName: fileName || track.fileName || uploadFile.name,
            contentType: contentType || uploadFile.type || blob.type || '',
        }));
        const response = await fetch(LOCAL_IMPORT_ENDPOINT, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) return null;
        return response.json();
    } catch {
        return null;
    }
}

export async function deleteLocalProjectSoundtrackTrack(track = {}) {
    try {
        await fetch(LOCAL_IMPORT_ENDPOINT, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                trackId: track.id || '',
                fileName: track.fileName || '',
                title: track.title || '',
            }),
        });
    } catch {
        // Browser-local IndexedDB deletion still proceeds when the dev file API is unavailable.
    }
}
