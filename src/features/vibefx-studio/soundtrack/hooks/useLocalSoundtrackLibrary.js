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
import { downloadJson, fetchAudioBlobForTrack } from '../services/soundtrackDownloads';
import {
    deleteLocalProjectSoundtrackTrack,
    loadLocalProjectSoundtrackManifest,
    persistAudioBlobToLocalProject,
} from '../services/soundtrackLocalProjectImport';

const MAX_AUDIO_BYTES = 150 * 1024 * 1024;
const MAX_AUDIO_SECONDS = 30 * 60;
const IGNORED_PIXABAY_TRACKS_KEY = 'vibefx-soundtrack-ignored-pixabay-tracks';
const PURGED_LOCAL_TRACK_TITLE_KEYS = new Set([
    'blooming chill',
    'epic action hero',
    'journey in space (epic background music)',
    'journey in space',
    'slim shady | eminem type beat - hip hop rap instrumental (prod....',
    'slim shady | eminem type beat - hip hop rap instrumental',
    'old movie ragtime piano',
    'krasnoshchok-dramatic-epic-music-493522',
]);
const PURGED_LOCAL_TRACK_TITLE_PATTERNS = [
    'journey in space',
    'slim shady | eminem type beat',
    'krasnoshchok-dramatic-epic-music-493522',
];

const normalizeFileMatchKey = (value = '') => String(value || '')
    .replace(/\.[a-z0-9]+$/i, '')
    .trim()
    .toLowerCase();

const normalizeTitleKey = (value = '') => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const isPurgedLocalTrack = (track = {}) => {
    const titleKey = normalizeTitleKey(track.title);
    return PURGED_LOCAL_TRACK_TITLE_KEYS.has(titleKey)
        || PURGED_LOCAL_TRACK_TITLE_PATTERNS.some((pattern) => titleKey.includes(pattern));
};

const isLocalProjectAudioUrl = (value = '') => String(value || '').startsWith('/music/local-imports/');

const hasLocalProjectAudio = (track = {}) => (
    isLocalProjectAudioUrl(track.downloadUrl)
    || isLocalProjectAudioUrl(track.previewUrl)
    || isLocalProjectAudioUrl(track.audioUrl)
);

const mergeLocalProjectTracks = (storedTracks = [], localProjectTracks = []) => {
    const storedById = new Map(storedTracks.map((track) => [track.id, track]));
    const merged = [];
    const seen = new Set();

    localProjectTracks.forEach((track) => {
        if (!track?.id) return;
        const stored = storedById.get(track.id) || {};
        merged.push({
            ...track,
            ...stored,
            fileName: track.fileName || stored.fileName || '',
            localPathHint: track.localPathHint || stored.localPathHint || '',
            downloadUrl: track.downloadUrl || stored.downloadUrl || '',
            previewUrl: track.previewUrl || stored.previewUrl || track.downloadUrl || stored.downloadUrl || '',
            audioUrl: track.audioUrl || stored.audioUrl || track.downloadUrl || stored.downloadUrl || '',
            fileAvailable: true,
            missingReason: '',
        });
        seen.add(track.id);
    });

    storedTracks.forEach((track) => {
        if (!track?.id || seen.has(track.id)) return;
        merged.push(track);
    });

    return merged.filter((track) => !isPurgedLocalTrack(track));
};

const normalizePixabayTrackId = (value = '') => {
    const match = String(value || '').toLowerCase().match(/(?:pixabay-ai-)?pixabay-(\d+)/);
    return match?.[1] ? `pixabay-${match[1]}` : '';
};

const normalizePixabayUrl = (value = '') => {
    const raw = String(value || '').trim();
    if (!raw.includes('pixabay.com/music/')) return '';
    try {
        const url = new URL(raw);
        return url.protocol === 'https:' ? url.toString().replace(/\/$/, '') : '';
    } catch {
        return '';
    }
};

const loadIgnoredPixabayTracks = () => {
    if (typeof window === 'undefined') return { ids: [], urls: [] };
    try {
        const parsed = JSON.parse(window.localStorage.getItem(IGNORED_PIXABAY_TRACKS_KEY) || '{}');
        return {
            ids: Array.isArray(parsed.ids) ? parsed.ids.map(normalizePixabayTrackId).filter(Boolean) : [],
            urls: Array.isArray(parsed.urls) ? parsed.urls.map(normalizePixabayUrl).filter(Boolean) : [],
        };
    } catch {
        return { ids: [], urls: [] };
    }
};

const saveIgnoredPixabayTracks = (value) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(IGNORED_PIXABAY_TRACKS_KEY, JSON.stringify({
        ids: Array.from(new Set(value.ids || [])).slice(0, 250),
        urls: Array.from(new Set(value.urls || [])).slice(0, 250),
    }));
};

const getPixabayFingerprint = (track = {}) => {
    const provider = String(track.provider || track.sourceProvider || '').toLowerCase();
    const looksPixabay = provider.includes('pixabay')
        || String(track.id || '').includes('pixabay')
        || String(track.sourceUrl || track.sourcePageUrl || '').includes('pixabay.com/music/');
    if (!looksPixabay) return { ids: [], urls: [] };
    return {
        ids: [track.providerTrackId, track.id, track.sourceTrackId].map(normalizePixabayTrackId).filter(Boolean),
        urls: [track.sourcePageUrl, track.sourceUrl].map(normalizePixabayUrl).filter(Boolean),
    };
};

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

async function validateAudioBlob(blob, fallbackDuration = 0) {
    if (!blob?.type?.startsWith('audio/')) throw new Error('MIME audio invalide.');
    if (blob.size > MAX_AUDIO_BYTES) throw new Error('Fichier trop lourd: limite 150 MB.');
    let duration = 0;
    try {
        duration = await readAudioDuration(blob);
    } catch {
        duration = 0;
    }
    if ((!Number.isFinite(duration) || duration <= 0 || duration > MAX_AUDIO_SECONDS) && fallbackDuration > 0 && fallbackDuration <= MAX_AUDIO_SECONDS) {
        return fallbackDuration;
    }
    if (duration > MAX_AUDIO_SECONDS) throw new Error('Duree trop longue: limite 30 minutes.');
    return duration;
}

export function useLocalSoundtrackLibrary() {
    const [tracks, setTracks] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [ignoredPixabayTracks, setIgnoredPixabayTracks] = useState(loadIgnoredPixabayTracks);
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

    const ignorePixabayTrack = useCallback((trackOrId) => {
        const fingerprint = typeof trackOrId === 'string'
            ? { ids: [normalizePixabayTrackId(trackOrId)].filter(Boolean), urls: [] }
            : getPixabayFingerprint(trackOrId);
        if (!fingerprint.ids.length && !fingerprint.urls.length) return;
        setIgnoredPixabayTracks((current) => {
            const next = {
                ids: Array.from(new Set([...(current.ids || []), ...fingerprint.ids])),
                urls: Array.from(new Set([...(current.urls || []), ...fingerprint.urls])),
            };
            saveIgnoredPixabayTracks(next);
            return next;
        });
    }, []);

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
        const localProjectManifest = normalizeSoundtrackManifest(await loadLocalProjectSoundtrackManifest() || {});
        const localProjectTracks = localProjectManifest.tracks
            .filter((track) => hasLocalProjectAudio(track))
            .map((track) => ({
                ...track,
                fileAvailable: true,
                missingReason: '',
            }));
        const restoredIndexedTracks = await Promise.all(stored.tracks.map(async (track) => {
            if (isPurgedLocalTrack(track)) {
                await deleteIndexedSoundtrackAudio(track.id);
                return null;
            }
            const storedAudio = await loadIndexedSoundtrackAudio(track.id);
            const blob = storedAudio?.blob instanceof Blob ? storedAudio.blob : null;
            if (!blob) {
                if (hasLocalProjectAudio(track)) {
                    return {
                        ...track,
                        fileAvailable: true,
                        missingReason: '',
                    };
                }
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
        const mergedInitialTracks = mergeLocalProjectTracks(restoredIndexedTracks.filter(Boolean), localProjectTracks);
        const initialTrackIds = new Set(mergedInitialTracks.map((track) => track.id));
        const initialPlaylists = stored.playlists.map((playlist) => ({
            ...playlist,
            trackIds: playlist.trackIds.filter((id) => initialTrackIds.has(id)),
        }));
        setTracks(mergedInitialTracks);
        setPlaylists(initialPlaylists);
        await saveIndexedSoundtrackLibrary(buildSoundtrackManifest({ tracks: mergedInitialTracks, playlists: initialPlaylists }));

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
        verified.tracks = verified.tracks.filter((track) => !isPurgedLocalTrack(track));
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
            const trustedBundledAudio = String(track.downloadUrl || track.previewUrl || track.url || '').startsWith('/music/');
            const duration = await validateAudioBlob(fetched.blob, trustedBundledAudio ? Number(track.duration) || 0 : 0);
            let fileName = track.fileName;
            let localProjectImport = null;
            if (directoryHandleRef.current) {
                fileName = await writeAudioFileToDirectory(directoryHandleRef.current, track, fetched.blob, fetched.contentType);
            } else {
                fileName = fetched.fileName || `${sanitizeFileName(track.title)}.mp3`;
                localProjectImport = await persistAudioBlobToLocalProject({
                    track: { ...track, fileName },
                    blob: fetched.blob,
                    fileName,
                    contentType: fetched.contentType,
                });
                fileName = localProjectImport?.fileName || fileName;
            }
            const objectUrl = URL.createObjectURL(fetched.blob);
            objectUrlsRef.current.add(objectUrl);
            let waveform;
            try {
                waveform = await extractAudioWaveform(fetched.blob);
            } catch (error) {
                waveform = buildUnavailableWaveform(error.message);
            }
            const remoteMetadata = Object.fromEntries(Object.entries(fetched.trackMetadata || {}).filter(([, value]) => value));
            const nextTrack = normalizeSoundtrackTrack({
                ...track,
                ...remoteMetadata,
                category: remoteMetadata.category || track.category || track.genre || track.mood || track.provider || 'Bibliotheque',
                fileName,
                localPathHint: localProjectImport?.publicUrl || (fileName ? `./${fileName}` : ''),
                localObjectUrl: objectUrl,
                downloadUrl: localProjectImport?.publicUrl || fetched.finalUrl,
                previewUrl: localProjectImport?.publicUrl || fetched.finalUrl,
                audioUrl: localProjectImport?.publicUrl || fetched.finalUrl,
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
            setLastEvent(directoryHandleRef.current
                ? 'Ajoute a la bibliotheque Vibe_fx et ecrit dans le dossier local.'
                : localProjectImport?.publicUrl
                    ? 'Ajoute a la bibliotheque Vibe_fx et copie dans public/music/local-imports.'
                    : 'Ajoute a la bibliotheque Vibe_fx locale.');
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
            id: metadata.id || safeSoundtrackId('track'),
            providerTrackId: metadata.providerTrackId || '',
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
            const trackId = existingTrack?.id || safeSoundtrackId('track');
            let fileName = file.name;
            let localPathHint = file.name;
            let publicAudioUrl = '';
            if (directoryHandleRef.current) {
                fileName = await writeAudioFileToDirectory(directoryHandleRef.current, { ...metadata, title: importedTitle }, file, file.type);
                localPathHint = `./${fileName}`;
            } else {
                const localProjectImport = await persistAudioBlobToLocalProject({
                    track: {
                        ...existingTrack,
                        ...metadata,
                        id: trackId,
                        title: metadata.title || existingTrack?.title || importedTitle,
                        provider: metadata.provider || existingTrack?.provider || 'local-file',
                    },
                    blob: file,
                    fileName: file.name,
                    contentType: file.type,
                });
                if (localProjectImport?.publicUrl) {
                    fileName = localProjectImport.fileName || file.name;
                    localPathHint = localProjectImport.publicUrl;
                    publicAudioUrl = localProjectImport.publicUrl;
                }
            }
            const importedTrack = normalizeSoundtrackTrack({
                ...existingTrack,
                id: trackId,
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
                fileName,
                localPathHint,
                localObjectUrl: objectUrl,
                downloadUrl: publicAudioUrl || existingTrack?.downloadUrl || '',
                previewUrl: publicAudioUrl || existingTrack?.previewUrl || existingTrack?.downloadUrl || '',
                audioUrl: publicAudioUrl || existingTrack?.audioUrl || existingTrack?.downloadUrl || '',
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
        ignorePixabayTrack(trackOrId);
        if (typeof trackOrId === 'object') deleteLocalProjectSoundtrackTrack(trackOrId);
        deleteIndexedSoundtrackAudio(trackId);
        commitLibrary(
            tracks.filter((track) => track.id !== trackId),
            playlists.map((playlist) => ({
                ...playlist,
                trackIds: playlist.trackIds.filter((id) => id !== trackId),
                updatedAt: new Date().toISOString(),
            }))
        );
    }, [commitLibrary, ignorePixabayTrack, playlists, tracks]);

    const clearLibrary = useCallback(async () => {
        tracks.forEach(ignorePixabayTrack);
        await Promise.all(tracks.map((track) => deleteLocalProjectSoundtrackTrack(track)));
        await Promise.all(tracks.map((track) => deleteIndexedSoundtrackAudio(track.id)));
        revokeTrackedUrls();
        setSelectedPlaylistId('');
        await commitLibrary([], []);
        setLastEvent('Bibliotheque locale videe.');
    }, [commitLibrary, ignorePixabayTrack, revokeTrackedUrls, tracks]);

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
        ignoredPixabayTracks,
        ignorePixabayTrack,
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
        clearLibrary,
        exportManifest,
        checkMissingFiles,
        getTrackFile,
    };
}
