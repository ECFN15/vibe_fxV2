import {
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    setDoc,
    updateDoc,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, firebaseReady, storage } from '../../../../lib/firebase';
import {
    PROJECT_SOUNDTRACK_MAX_BYTES,
    buildProjectSoundStoragePath,
    normalizeProjectSoundPlaylist,
    normalizeProjectSoundTrack,
    serializeProjectPlaylist,
    serializeProjectTrack,
    validateProjectTrackRights,
} from './projectSoundLibraryModel';

const nowIso = () => new Date().toISOString();

export {
    PROJECT_SOUNDTRACK_MAX_BYTES,
    normalizeProjectSoundPlaylist,
    normalizeProjectSoundTrack,
    serializeProjectPlaylist,
    serializeProjectTrack,
    validateProjectTrackRights,
};

export function getProjectSoundtrackCapability() {
    return {
        ready: firebaseReady && Boolean(auth && db && storage),
        reason: firebaseReady ? '' : 'Firebase client non configure.',
    };
}

export function subscribeProjectSoundTracks(uid, onChange, onError) {
    if (!uid || !db) return () => {};
    const tracksQuery = query(collection(db, 'users', uid, 'soundtrackTracks'), orderBy('updatedAt', 'desc'));
    return onSnapshot(
        tracksQuery,
        (snapshot) => {
            onChange(snapshot.docs.map((trackDoc) => normalizeProjectSoundTrack({
                id: trackDoc.id,
                ...trackDoc.data(),
            }, uid)));
        },
        onError
    );
}

export function subscribeProjectSoundPlaylists(uid, onChange, onError) {
    if (!uid || !db) return () => {};
    const playlistsQuery = query(collection(db, 'users', uid, 'soundtrackPlaylists'), orderBy('updatedAt', 'desc'));
    return onSnapshot(
        playlistsQuery,
        (snapshot) => {
            onChange(snapshot.docs.map((playlistDoc) => normalizeProjectSoundPlaylist({
                id: playlistDoc.id,
                ...playlistDoc.data(),
            }, uid)));
        },
        onError
    );
}

export async function uploadProjectSoundTrack({ uid, track, blob, contentType = 'audio/mpeg', fileName = '' }) {
    if (!uid || !storage || !db) throw new Error('Firebase indisponible pour la bibliotheque projet.');
    if (!blob?.type?.startsWith('audio/') && !String(contentType).startsWith('audio/')) {
        throw new Error('Import projet refuse: MIME audio requis.');
    }
    if (blob.size > PROJECT_SOUNDTRACK_MAX_BYTES) throw new Error('Import projet refuse: limite 150 MB.');

    const normalized = normalizeProjectSoundTrack(track, uid);
    const rights = validateProjectTrackRights(normalized);
    if (!rights.ok) {
        throw new Error(`Metadata droits incomplète: ${rights.missing.join(', ')}.`);
    }

    const storagePath = buildProjectSoundStoragePath({
        uid,
        track: normalized,
        contentType: contentType || blob.type || 'audio/mpeg',
        fileName: fileName || normalized.title,
    });
    const audioRef = ref(storage, storagePath);
    await uploadBytes(audioRef, blob, {
        contentType: contentType || blob.type || 'audio/mpeg',
        customMetadata: {
            sourceProvider: normalized.sourceProvider,
            rightsStatus: normalized.rightsStatus,
            license: normalized.license.slice(0, 120),
        },
    });
    const downloadUrl = await getDownloadURL(audioRef);
    const persisted = normalizeProjectSoundTrack({
        ...normalized,
        storagePath,
        downloadUrl,
        previewUrl: downloadUrl,
        updatedAt: nowIso(),
    }, uid);
    await setDoc(doc(db, 'users', uid, 'soundtrackTracks', persisted.id), serializeProjectTrack(persisted));
    return persisted;
}

export async function patchProjectSoundTrack(uid, trackId, patch) {
    if (!uid || !trackId || !db) throw new Error('Firebase indisponible.');
    await updateDoc(doc(db, 'users', uid, 'soundtrackTracks', trackId), {
        ...patch,
        updatedAt: nowIso(),
    });
}

export async function createProjectSoundPlaylist(uid, playlist) {
    if (!uid || !db) throw new Error('Firebase indisponible.');
    const normalized = normalizeProjectSoundPlaylist(playlist, uid);
    await setDoc(doc(db, 'users', uid, 'soundtrackPlaylists', normalized.id), serializeProjectPlaylist(normalized));
    return normalized;
}

export async function patchProjectSoundPlaylist(uid, playlistId, patch) {
    if (!uid || !playlistId || !db) throw new Error('Firebase indisponible.');
    await updateDoc(doc(db, 'users', uid, 'soundtrackPlaylists', playlistId), {
        ...patch,
        updatedAt: nowIso(),
    });
}

export async function deleteProjectSoundPlaylist(uid, playlistId) {
    if (!uid || !playlistId || !db) throw new Error('Firebase indisponible.');
    await deleteDoc(doc(db, 'users', uid, 'soundtrackPlaylists', playlistId));
}

export async function deleteProjectSoundTrack(uid, trackId, storagePath = '') {
    if (!uid || !trackId || !db) throw new Error('Firebase indisponible.');
    if (storagePath && storage) {
        await deleteObject(ref(storage, storagePath)).catch(() => {});
    }
    await deleteDoc(doc(db, 'users', uid, 'soundtrackTracks', trackId));
}
