import {
    SOUNDTRACK_FOLDER_NAME,
    SOUNDTRACK_MANIFEST_FILE,
} from '../data/soundtrackDefaults';
import {
    buildSoundtrackManifest,
    getAudioExtension,
    normalizeSoundtrackManifest,
    sanitizeFileName,
} from './soundtrackManifest';
import {
    clearSoundtrackDirectoryHandle,
    loadSoundtrackDirectoryHandle,
    saveSoundtrackDirectoryHandle,
} from './soundtrackIndexedDb';

export const hasDirectoryPicker = () => (
    typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
);

async function requestReadWritePermission(handle) {
    if (!handle?.queryPermission || !handle?.requestPermission) return 'unsupported';
    const options = { mode: 'readwrite' };
    const current = await handle.queryPermission(options);
    if (current === 'granted') return 'granted';
    return handle.requestPermission(options);
}

export async function restoreSoundtrackDirectory() {
    const handle = await loadSoundtrackDirectoryHandle();
    if (!handle) return { status: 'missing', handle: null, permission: 'missing' };
    const permission = await requestReadWritePermission(handle).catch(() => 'denied');
    if (permission !== 'granted') {
        return { status: 'permission-required', handle, permission };
    }
    return { status: 'connected', handle, permission };
}

export async function chooseSoundtrackDirectory() {
    if (!hasDirectoryPicker()) {
        return { status: 'unsupported', handle: null };
    }
    const parent = await window.showDirectoryPicker({ mode: 'readwrite' });
    const handle = await parent.getDirectoryHandle(SOUNDTRACK_FOLDER_NAME, { create: true });
    const permission = await requestReadWritePermission(handle);
    if (permission !== 'granted') {
        return { status: 'permission-required', handle, permission };
    }
    await saveSoundtrackDirectoryHandle(handle);
    return { status: 'connected', handle, permission };
}

export async function forgetSoundtrackDirectory() {
    await clearSoundtrackDirectoryHandle();
}

export async function readDiskManifest(directoryHandle) {
    if (!directoryHandle) return null;
    try {
        const fileHandle = await directoryHandle.getFileHandle(SOUNDTRACK_MANIFEST_FILE);
        const file = await fileHandle.getFile();
        return normalizeSoundtrackManifest(JSON.parse(await file.text()));
    } catch {
        return null;
    }
}

export async function writeDiskManifest(directoryHandle, library) {
    if (!directoryHandle) throw new Error('Dossier Soundtrack non connecte.');
    const fileHandle = await directoryHandle.getFileHandle(SOUNDTRACK_MANIFEST_FILE, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(buildSoundtrackManifest(library), null, 2));
    await writable.close();
}

export async function writeAudioFileToDirectory(directoryHandle, track, blob, contentType = '') {
    if (!directoryHandle) throw new Error('Dossier Soundtrack non connecte.');
    const extension = getAudioExtension(contentType || blob.type, track.downloadUrl || track.previewUrl);
    const baseName = sanitizeFileName(`${track.artist ? `${track.artist}-` : ''}${track.title}`);
    const fileName = `${baseName}.${extension}`;
    const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return fileName;
}

export async function readAudioFileFromDirectory(directoryHandle, fileName) {
    if (!directoryHandle || !fileName) return null;
    try {
        const fileHandle = await directoryHandle.getFileHandle(fileName);
        return fileHandle.getFile();
    } catch {
        return null;
    }
}

export async function verifyManifestFiles(directoryHandle, manifest) {
    const tracks = [];
    for (const track of manifest.tracks || []) {
        const file = track.fileName ? await readAudioFileFromDirectory(directoryHandle, track.fileName) : null;
        tracks.push({
            ...track,
            fileAvailable: Boolean(file),
            missingReason: file ? '' : 'fichier manquant ou permission dossier absente',
            localObjectUrl: file ? URL.createObjectURL(file) : '',
            file,
        });
    }
    return { ...manifest, tracks };
}
