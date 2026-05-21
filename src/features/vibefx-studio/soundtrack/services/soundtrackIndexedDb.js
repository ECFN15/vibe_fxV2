import {
    SOUNDTRACK_DB_NAME,
    SOUNDTRACK_DB_VERSION,
} from '../data/soundtrackDefaults';

const STORE = 'soundtrack';
const LIBRARY_KEY = 'library';
const HANDLE_KEY = 'directoryHandle';
const AUDIO_PREFIX = 'audio:';

const canUseIndexedDb = () => typeof indexedDB !== 'undefined';

function openSoundtrackDb() {
    if (!canUseIndexedDb()) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(SOUNDTRACK_DB_NAME, SOUNDTRACK_DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function withStore(mode, callback) {
    const db = await openSoundtrackDb();
    if (!db) return null;
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const store = transaction.objectStore(STORE);
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
            db.close();
            reject(transaction.error);
        };
        callback(store, resolve, reject);
    });
}

export async function loadIndexedSoundtrackLibrary() {
    try {
        return await withStore('readonly', (store, resolve, reject) => {
            const request = store.get(LIBRARY_KEY);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    } catch {
        return null;
    }
}

export async function saveIndexedSoundtrackLibrary(library) {
    try {
        await withStore('readwrite', (store, resolve, reject) => {
            const request = store.put(library, LIBRARY_KEY);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
        return true;
    } catch {
        return false;
    }
}

export async function loadIndexedSoundtrackAudio(trackId) {
    if (!trackId) return null;
    try {
        return await withStore('readonly', (store, resolve, reject) => {
            const request = store.get(`${AUDIO_PREFIX}${trackId}`);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    } catch {
        return null;
    }
}

export async function saveIndexedSoundtrackAudio(trackId, audioBlob, metadata = {}) {
    if (!trackId || !audioBlob) return false;
    try {
        await withStore('readwrite', (store, resolve, reject) => {
            const request = store.put({
                blob: audioBlob,
                fileName: metadata.fileName || '',
                type: audioBlob.type || metadata.type || '',
                updatedAt: new Date().toISOString(),
            }, `${AUDIO_PREFIX}${trackId}`);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
        return true;
    } catch {
        return false;
    }
}

export async function deleteIndexedSoundtrackAudio(trackId) {
    if (!trackId) return false;
    try {
        await withStore('readwrite', (store, resolve, reject) => {
            const request = store.delete(`${AUDIO_PREFIX}${trackId}`);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
        return true;
    } catch {
        return false;
    }
}

export async function loadSoundtrackDirectoryHandle() {
    try {
        return await withStore('readonly', (store, resolve, reject) => {
            const request = store.get(HANDLE_KEY);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    } catch {
        return null;
    }
}

export async function saveSoundtrackDirectoryHandle(handle) {
    try {
        await withStore('readwrite', (store, resolve, reject) => {
            const request = store.put(handle, HANDLE_KEY);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
        return true;
    } catch {
        return false;
    }
}

export async function clearSoundtrackDirectoryHandle() {
    try {
        await withStore('readwrite', (store, resolve, reject) => {
            const request = store.delete(HANDLE_KEY);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
        return true;
    } catch {
        return false;
    }
}
