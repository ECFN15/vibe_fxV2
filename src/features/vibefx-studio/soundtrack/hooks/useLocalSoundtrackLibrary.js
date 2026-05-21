import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildUnavailableWaveform, extractAudioWaveform } from '../../video/utils/audioWaveform';
import {
    buildSoundtrackManifest,
    normalizeSoundtrackManifest,
    normalizeSoundtrackPlaylist,
    normalizeSoundtrackTrack,
    parseManifestFile,
    safeSoundtrackId,
    sanitizeFileName,
} from '../services/soundtrackManifest';
import {
    chooseSoundtrackDirectory,
    forgetSoundtrackDirectory,
    hasDirectoryPicker,
    readDiskManifest,
    restoreSoundtrackDirectory,
    verifyManifestFiles,
    writeAudioFileToDirectory,
    writeDiskManifest,
} from '../services/soundtrackFilesystem';
import {
    deleteIndexedSoundtrackAudio,
    loadIndexedSoundtrackAudio,
    loadIndexedSoundtrackLibrary,
    saveIndexedSoundtrackAudio,
    saveIndexedSoundtrackLibrary,
} from '../services/soundtrackIndexedDb';
import { downloadBlob, downloadJson, fetchAudioBlobForTrack } from '../services/soundtrackDownloads';

const MAX_AUDIO_BYTES = 150 * 1024 * 1024;
const MAX_AUDIO_SECONDS = 30 * 60;
const normalizeFileMatchKey = (value = '') => String(value || '')
    .replace(/\.[a-z0-9]+$/i, '')
    .trim()
    .toLowerCase();

async function readAudioDuration(blob) {
    const url = URL.createObjectURL(blob);
    try {
        const audio = document.createElement('audio');
        audio.preload = 'metadata';
        audio.src = url;
        await new Promise((resolve, reject) => {
            audio.onloadedmetadata = resolve;
            audio.onerror = () => reject(new Error('Duree audio illisible.'));
        });
        return Number.isFinite(audio.duration) ? audio.duration : 0;
    } finally {
        URL.revokeObjectURL(url);
    }
}

async function validateAudioBlob(blob) {
    if (!blob?.type?.startsWith('audio/')) throw new Error('MIME audio invalide.');
    if (blob.size > MAX_AUDIO_BYTES) throw new Error('Fichier trop lourd: limite 150 MB.');
    const duration = await readAudioDuration(blob);
    if (duration > MAX_AUDIO_SECONDS) throw new Error('Duree trop longue: limite 30 minutes.');
    return duration;
}

export function useLocalSoundtrackLibrary() {
    const [tracks, setTracks] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [folderState, setFolderState] = useState({
        capability: 'detecting',
        status: 'loading',
        message: 'Initialisation de la bibliotheque locale.',
    });
    const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
    const [busyTrackId, setBusyTrackId] = useState('');
    const [lastEvent, setLastEvent] = useState('');
    const directoryHandleRef = useRef(null);
    const objectUrlsRef = useRef(new Set());

    const library = useMemo(() => ({ tracks, playlists }), [playlists, tracks]);

    const revokeTrackedUrls = useCallback(() => {
        objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        objectUrlsRef.current.clear();
    }, []);

    const commitLibrary = useCallback(async (nextTracks, nextPlaylists, options = {}) => {
        const normalizedTracks = nextTracks.map((track) => ({
            ...normalizeSoundtrackTrack(track),
            localObjectUrl: track.localObjectUrl || '',
            file: track.file,
            fileAvailable: track.fileAvailable === true,
            missingReason: track.missingReason || '',
            waveform: track.waveform || null,
        }));
        const normalizedPlaylists = nextPlaylists.map(normalizeSoundtrackPlaylist);
        setTracks(normalizedTracks);
        setPlaylists(normalizedPlaylists);
        const manifest = buildSoundtrackManifest({ tracks: normalizedTracks, playlists: normalizedPlaylists });
        await saveIndexedSoundtrackLibrary(manifest);
        if (options.writeDisk !== false && directoryHandleRef.current) {
            await writeDiskManifest(directoryHandleRef.current, { tracks: normalizedTracks, playlists: normalizedPlaylists }).catch(() => {
                setFolderState((current) => ({
                    ...current,
                    status: 'permission-required',
                    message: 'Manifest non ecrit. Reconnectez le dossier Soundtrack.',
                }));
            });
        }
    }, []);

    const loadInitial = useCallback(async () => {
        revokeTrackedUrls();
        const supportsDirectory = hasDirectoryPicker();
        if (!supportsDirectory) {
            setFolderState({
                capability: 'fallback',
                status: 'manual',
                message: 'Acces dossier indisponible. Utilisez telechargement navigateur puis import manifest/fichiers.',
            });
        }
        const stored = normalizeSoundtrackManifest(await loadIndexedSoundtrackLibrary() || {});
        const restoredIndexedTracks = await Promise.all(stored.tracks.map(async (track) => {
            const storedAudio = await loadIndexedSoundtrackAudio(track.id);
            const blob = storedAudio?.blob instanceof Blob ? storedAudio.blob : null;
            if (!blob) {
                return {
                    ...track,
                    fileAvailable: false,
                    missingReason: track.fileName ? 'fichier audio a reimporter' : 'telechargement local non verifie',
                };
            }
            const objectUrl = URL.createObjectURL(blob);
            objectUrlsRef.current.add(objectUrl);
            return {
                ...track,
                localObjectUrl: objectUrl,
                file: blob,
                fileAvailable: true,
                missingReason: '',
            };
        }));
        setTracks(restoredIndexedTracks);
        setPlaylists(stored.playlists);

        if (!supportsDirectory) {
            setFolderState({
                capability: 'fallback',
                status: 'manual',
                message: 'Acces dossier indisponible. Utilisez telechargement navigateur puis import manifest/fichiers.',
            });
            return;
        }

        const restored = await restoreSoundtrackDirectory();
        if (restored.status !== 'connected') {
            setFolderState({
                capability: 'directory',
                status: restored.status,
                message: restored.status === 'permission-required'
                    ? 'Permission dossier requise pour reconnecter les fichiers.'
                    : 'Dossier local non connecte.',
            });
            return;
        }

        directoryHandleRef.current = restored.handle;
        const diskManifest = await readDiskManifest(restored.handle);
        if (!diskManifest) {
            setFolderState({
                capability: 'directory',
                status: 'connected',
                message: 'Dossier connecte. Aucun manifest disque pour le moment.',
            });
            return;
        }
        const verified = await verifyManifestFiles(restored.handle, diskManifest);
        verified.tracks.forEach((track) => {
            if (track.localObjectUrl) objectUrlsRef.current.add(track.localObjectUrl);
        });
        setTracks(verified.tracks);
        setPlaylists(verified.playlists);
        await saveIndexedSoundtrackLibrary(buildSoundtrackManifest(verified));
        setFolderState({
            capability: 'directory',
            status: 'connected',
            message: 'Dossier Soundtrack reconnecte.',
        });
    }, [revokeTrackedUrls]);

    useEffect(() => {
        loadInitial();
        return () => revokeTrackedUrls();
    }, [loadInitial, revokeTrackedUrls]);

    const connectFolder = useCallback(async () => {
        try {
            const result = await chooseSoundtrackDirectory();
            if (result.status !== 'connected') {
                setFolderState({
                    capability: hasDirectoryPicker() ? 'directory' : 'fallback',
                    status: result.status,
                    message: 'Permission dossier refusee ou indisponible.',
                });
                return;
            }
            directoryHandleRef.current = result.handle;
            await writeDiskManifest(result.handle, library);
            setFolderState({
                capability: 'directory',
                status: 'connected',
                message: 'Dossier Soundtrack connecte.',
            });
        } catch (error) {
            setFolderState({
                capability: hasDirectoryPicker() ? 'directory' : 'fallback',
                status: 'error',
                message: error.message || 'Connexion dossier annulee.',
            });
        }
    }, [library]);

    const disconnectFolder = useCallback(async () => {
        directoryHandleRef.current = null;
        await forgetSoundtrackDirectory();
        setFolderState({
            capability: hasDirectoryPicker() ? 'directory' : 'fallback',
            status: 'manual',
            message: 'Dossier oublie. Les metadata locales restent dans IndexedDB.',
        });
    }, []);

    const toggleFavorite = useCallback((trackOrId) => {
        const trackId = typeof trackOrId === 'string' ? trackOrId : trackOrId?.id;
        if (!trackId) return;
        const existing = tracks.find((track) => track.id === trackId);
        const nextTracks = existing
            ? tracks.map((track) => track.id === trackId ? {
                ...track,
                favorite: !track.favorite,
                updatedAt: new Date().toISOString(),
            } : track)
            : [normalizeSoundtrackTrack({ ...trackOrId, favorite: true, fileAvailable: false, missingReason: 'pas encore telecharge localement' }), ...tracks];
        commitLibrary(nextTracks, playlists);
    }, [commitLibrary, playlists, tracks]);

    const createPlaylist = useCallback((name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const playlist = normalizeSoundtrackPlaylist({
            id: safeSoundtrackId('playlist'),
            name: trimmed,
            trackIds: [],
        });
        setSelectedPlaylistId(playlist.id);
        commitLibrary(tracks, [...playlists, playlist]);
    }, [commitLibrary, playlists, tracks]);

    const renamePlaylist = useCallback((playlistId, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        commitLibrary(tracks, playlists.map((playlist) => playlist.id === playlistId ? {
            ...playlist,
            name: trimmed,
            updatedAt: new Date().toISOString(),
        } : playlist));
    }, [commitLibrary, playlists, tracks]);

    const deletePlaylist = useCallback((playlistId) => {
        if (selectedPlaylistId === playlistId) setSelectedPlaylistId('');
        commitLibrary(tracks, playlists.filter((playlist) => playlist.id !== playlistId));
    }, [commitLibrary, playlists, selectedPlaylistId, tracks]);

    const addToPlaylist = useCallback((trackOrId, playlistId) => {
        if (!playlistId) return;
        const trackId = typeof trackOrId === 'string' ? trackOrId : trackOrId?.id;
        if (!trackId) return;
        const nextTracks = tracks.some((track) => track.id === trackId)
            ? tracks
            : [normalizeSoundtrackTrack({ ...trackOrId, fileAvailable: false, missingReason: 'pas encore telecharge localement' }), ...tracks];
        commitLibrary(nextTracks, playlists.map((playlist) => {
            if (playlist.id !== playlistId || playlist.trackIds.includes(trackId)) return playlist;
            return {
                ...playlist,
                trackIds: [...playlist.trackIds, trackId],
                updatedAt: new Date().toISOString(),
            };
        }));
    }, [commitLibrary, playlists, tracks]);

    const removeFromPlaylist = useCallback((trackId, playlistId) => {
        commitLibrary(tracks, playlists.map((playlist) => playlist.id === playlistId ? {
            ...playlist,
            trackIds: playlist.trackIds.filter((id) => id !== trackId),
            updatedAt: new Date().toISOString(),
        } : playlist));
    }, [commitLibrary, playlists, tracks]);

    const movePlaylistTrack = useCallback((playlistId, trackId, direction) => {
        commitLibrary(tracks, playlists.map((playlist) => {
            if (playlist.id !== playlistId) return playlist;
            const index = playlist.trackIds.indexOf(trackId);
            const nextIndex = index + direction;
            if (index < 0 || nextIndex < 0 || nextIndex >= playlist.trackIds.length) return playlist;
            const trackIds = [...playlist.trackIds];
            const [item] = trackIds.splice(index, 1);
            trackIds.splice(nextIndex, 0, item);
            return { ...playlist, trackIds, updatedAt: new Date().toISOString() };
        }));
    }, [commitLibrary, playlists, tracks]);

    const downloadTrackLocally = useCallback(async (track) => {
        setBusyTrackId(track.id);
        setLastEvent('');
        try {
            const fetched = await fetchAudioBlobForTrack(track);
            const duration = await validateAudioBlob(fetched.blob);
            let fileName = track.fileName;
            if (directoryHandleRef.current) {
                fileName = await writeAudioFileToDirectory(directoryHandleRef.current, track, fetched.blob, fetched.contentType);
            } else {
                const extensionName = fetched.fileName || `${sanitizeFileName(track.title)}.mp3`;
                downloadBlob(fetched.blob, extensionName);
            }
            const objectUrl = URL.createObjectURL(fetched.blob);
            objectUrlsRef.current.add(objectUrl);
            let waveform;
            try {
                waveform = await extractAudioWaveform(fetched.blob);
            } catch (error) {
                waveform = buildUnavailableWaveform(error.message);
            }
            const nextTrack = normalizeSoundtrackTrack({
                ...track,
                category: track.category || track.genre || track.mood || track.provider || 'Bibliotheque',
                fileName,
                localPathHint: fileName ? `./${fileName}` : '',
                localObjectUrl: objectUrl,
                downloadUrl: fetched.finalUrl,
                duration: duration || track.duration,
                fileAvailable: true,
                missingReason: '',
                waveform,
            });
            const nextTracks = tracks.some((item) => item.id === nextTrack.id)
                ? tracks.map((item) => item.id === nextTrack.id ? { ...item, ...nextTrack } : item)
                : [nextTrack, ...tracks];
            await saveIndexedSoundtrackAudio(nextTrack.id, fetched.blob, { fileName });
            await commitLibrary(nextTracks, playlists);
            setLastEvent(directoryHandleRef.current ? 'Ajoute a la bibliotheque Vibe_fx et ecrit dans le dossier local.' : 'Ajoute a la bibliotheque Vibe_fx locale.');
            return nextTrack;
        } catch (error) {
            setLastEvent(error.message || 'Telechargement local impossible.');
            return null;
        } finally {
            setBusyTrackId('');
        }
    }, [commitLibrary, playlists, tracks]);

    const importRemoteTrack = useCallback(async ({ audioUrl, metadata = {} }) => {
        if (!audioUrl?.trim()) return null;
        const draftTrack = normalizeSoundtrackTrack({
            id: safeSoundtrackId('track'),
                title: metadata.title || 'Piste distante',
                provider: metadata.provider || 'manual-url',
                category: metadata.category || 'Import URL',
            sourceName: metadata.sourceName || 'URL audio directe',
            sourceUrl: metadata.sourceUrl || audioUrl,
            license: metadata.license || 'Licence a verifier',
            licenseUrl: metadata.licenseUrl || '',
            attribution: metadata.attribution || '',
            rightsStatus: metadata.rightsStatus || 'needs-review',
            socialUse: metadata.socialUse === true,
            commercialUse: metadata.commercialUse === true,
            contentIdWarning: metadata.contentIdWarning || 'Import manuel: verifier la source officielle et conserver la preuve de licence.',
            downloadUrl: audioUrl.trim(),
            previewUrl: audioUrl.trim(),
            fileAvailable: false,
            missingReason: 'pas encore telecharge localement',
        });
        return downloadTrackLocally(draftTrack);
    }, [downloadTrackLocally]);

    const importFiles = useCallback(async (fileList, metadata = {}) => {
        const files = Array.from(fileList || []);
        if (!files.length) return;
        let nextTracks = [...tracks];
        let nextPlaylists = [...playlists];
        const importedTracks = [];

        for (const file of files) {
            if (file.type === 'application/json' || file.name.endsWith('.json')) {
                const manifest = await parseManifestFile(file);
                nextTracks = manifest.tracks.map((track) => ({
                    ...track,
                    fileAvailable: false,
                    missingReason: track.fileName ? 'fichier audio a reimporter' : 'fichier audio non reference',
                }));
                nextPlaylists = manifest.playlists;
                continue;
            }
            if (!file.type.startsWith('audio/')) continue;
            const duration = await validateAudioBlob(file);
            const objectUrl = URL.createObjectURL(file);
            objectUrlsRef.current.add(objectUrl);
            let waveform;
            try {
                waveform = await extractAudioWaveform(file);
            } catch (error) {
                waveform = buildUnavailableWaveform(error.message);
            }
            const importedTitle = metadata.title || file.name.replace(/\.[a-z0-9]+$/i, '');
            const existingTrack = nextTracks.find((track) => (
                (track.fileName && track.fileName === file.name)
                || normalizeFileMatchKey(track.title) === normalizeFileMatchKey(importedTitle)
            ));
            const importedTrack = normalizeSoundtrackTrack({
                ...existingTrack,
                id: existingTrack?.id || safeSoundtrackId('track'),
                title: metadata.title || existingTrack?.title || importedTitle,
                provider: metadata.provider || existingTrack?.provider || 'local-file',
                category: metadata.category || existingTrack?.category || 'Import fichier',
                sourceName: metadata.sourceName || existingTrack?.sourceName || 'Fichier local',
                sourceUrl: metadata.sourceUrl || existingTrack?.sourceUrl || 'local-file',
                sourcePageUrl: metadata.sourcePageUrl || existingTrack?.sourcePageUrl || metadata.sourceUrl || 'local-file',
                license: metadata.license || existingTrack?.license || 'Droits declares par utilisateur',
                licenseUrl: metadata.licenseUrl || existingTrack?.licenseUrl || 'user-declared',
                attribution: metadata.attribution || existingTrack?.attribution || '',
                contentIdWarning: metadata.contentIdWarning || existingTrack?.contentIdWarning || '',
                rightsStatus: metadata.rightsStatus || existingTrack?.rightsStatus || 'user-declared',
                socialUse: metadata.socialUse === true || existingTrack?.socialUse === true,
                commercialUse: metadata.commercialUse === true || existingTrack?.commercialUse === true,
                licenseSnapshotVersion: metadata.licenseSnapshotVersion || existingTrack?.licenseSnapshotVersion || 'user-declared-current',
                tags: metadata.tags || existingTrack?.tags || ['local-upload'],
                fileName: file.name,
                localPathHint: file.name,
                localObjectUrl: objectUrl,
                fileAvailable: true,
                duration,
                file,
                waveform,
            });
            await saveIndexedSoundtrackAudio(importedTrack.id, file, { fileName: file.name });
            importedTracks.push(importedTrack);
            nextTracks = existingTrack
                ? nextTracks.map((track) => track.id === existingTrack.id ? importedTrack : track)
                : [importedTrack, ...nextTracks];
        }
        await commitLibrary(nextTracks, nextPlaylists);
        setLastEvent(metadata.importEvent || 'Import local termine.');
        return importedTracks;
    }, [commitLibrary, playlists, tracks]);

    const updateTrackMetadata = useCallback((track, patch) => {
        if (!track?.id) return;
        commitLibrary(tracks.map((item) => item.id === track.id ? {
            ...item,
            ...patch,
            updatedAt: new Date().toISOString(),
        } : item), playlists);
    }, [commitLibrary, playlists, tracks]);

    const removeTrack = useCallback((trackOrId) => {
        const trackId = typeof trackOrId === 'string' ? trackOrId : trackOrId?.id;
        if (!trackId) return;
        deleteIndexedSoundtrackAudio(trackId);
        commitLibrary(
            tracks.filter((track) => track.id !== trackId),
            playlists.map((playlist) => ({
                ...playlist,
                trackIds: playlist.trackIds.filter((id) => id !== trackId),
                updatedAt: new Date().toISOString(),
            }))
        );
    }, [commitLibrary, playlists, tracks]);

    const exportManifest = useCallback(() => {
        downloadJson(buildSoundtrackManifest(library));
    }, [library]);

    const checkMissingFiles = useCallback(async () => {
        if (!directoryHandleRef.current) {
            const nextTracks = await Promise.all(tracks.map(async (track) => {
                if (track.localObjectUrl) {
                    return { ...track, fileAvailable: true, missingReason: '' };
                }
                const storedAudio = await loadIndexedSoundtrackAudio(track.id);
                const blob = storedAudio?.blob instanceof Blob ? storedAudio.blob : null;
                if (!blob) {
                    return { ...track, fileAvailable: false, missingReason: 'fichier audio a reimporter' };
                }
                const objectUrl = URL.createObjectURL(blob);
                objectUrlsRef.current.add(objectUrl);
                return { ...track, localObjectUrl: objectUrl, file: blob, fileAvailable: true, missingReason: '' };
            }));
            await commitLibrary(nextTracks, playlists, { writeDisk: false });
            return;
        }
        const verified = await verifyManifestFiles(directoryHandleRef.current, buildSoundtrackManifest(library));
        verified.tracks.forEach((track) => {
            if (track.localObjectUrl) objectUrlsRef.current.add(track.localObjectUrl);
        });
        await commitLibrary(verified.tracks, verified.playlists, { writeDisk: false });
        setLastEvent('Verification fichiers terminee.');
    }, [commitLibrary, library, playlists, tracks]);

    const getTrackFile = useCallback(async (track) => {
        if (track.file instanceof File || track.file instanceof Blob) return track.file;
        if (track.localObjectUrl) {
            const response = await fetch(track.localObjectUrl);
            return response.blob();
        }
        const storedAudio = await loadIndexedSoundtrackAudio(track.id);
        if (storedAudio?.blob instanceof Blob) return storedAudio.blob;
        if (directoryHandleRef.current && track.fileName) {
            const verified = await verifyManifestFiles(directoryHandleRef.current, { tracks: [track], playlists: [] });
            return verified.tracks[0]?.file || null;
        }
        return null;
    }, []);

    return {
        tracks,
        playlists,
        folderState,
        selectedPlaylistId,
        setSelectedPlaylistId,
        busyTrackId,
        lastEvent,
        connectFolder,
        disconnectFolder,
        toggleFavorite,
        createPlaylist,
        renamePlaylist,
        deletePlaylist,
        addToPlaylist,
        removeFromPlaylist,
        movePlaylistTrack,
        downloadTrackLocally,
        importRemoteTrack,
        importFiles,
        updateTrackMetadata,
        removeTrack,
        exportManifest,
        checkMissingFiles,
        getTrackFile,
    };
}
