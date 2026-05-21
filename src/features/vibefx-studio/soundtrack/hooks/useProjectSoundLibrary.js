import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { buildUnavailableWaveform, extractAudioWaveform } from '../../video/utils/audioWaveform';
import { auth } from '../../../../lib/firebase';
import { fetchAudioBlobForTrack } from '../services/soundtrackDownloads';
import {
    createProjectSoundPlaylist,
    deleteProjectSoundTrack,
    deleteProjectSoundPlaylist,
    getProjectSoundtrackCapability,
    normalizeProjectSoundTrack,
    patchProjectSoundPlaylist,
    patchProjectSoundTrack,
    subscribeProjectSoundPlaylists,
    subscribeProjectSoundTracks,
    uploadProjectSoundTrack,
} from '../services/projectSoundLibraryClient';
import {
    addTrackToProjectPlaylist,
    moveTrackInProjectPlaylist,
    normalizeProjectSoundPlaylist,
    removeTrackFromProjectPlaylist,
} from '../services/projectSoundLibraryModel';

const MAX_AUDIO_SECONDS = 30 * 60;

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

async function buildAudioFacts(blob) {
    const duration = await readAudioDuration(blob);
    if (duration > MAX_AUDIO_SECONDS) throw new Error('Import projet refuse: duree limitee a 30 minutes.');
    let waveform;
    try {
        waveform = await extractAudioWaveform(blob);
    } catch (error) {
        waveform = buildUnavailableWaveform(error.message);
    }
    return { duration, waveform };
}

export function useProjectSoundLibrary() {
    const capability = useMemo(() => getProjectSoundtrackCapability(), []);
    const [user, setUser] = useState(auth?.currentUser || null);
    const [tracks, setTracks] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
    const [status, setStatus] = useState(capability.ready ? 'auth-required' : 'unavailable');
    const [message, setMessage] = useState(capability.reason || 'Connexion Firebase requise pour la bibliotheque projet.');
    const [busyTrackId, setBusyTrackId] = useState('');
    const uid = user?.uid || '';

    useEffect(() => {
        if (!auth) return undefined;
        return onAuthStateChanged(auth, (nextUser) => {
            setUser(nextUser);
            setStatus(nextUser ? 'loading' : 'auth-required');
            setMessage(nextUser ? 'Chargement bibliotheque projet.' : 'Authentification requise pour importer dans le projet.');
        });
    }, []);

    useEffect(() => {
        if (!user?.uid || !capability.ready) return undefined;
        const unsubscribeTracks = subscribeProjectSoundTracks(
            user.uid,
            (nextTracks) => {
                setTracks(nextTracks);
                setStatus('ready');
                setMessage(nextTracks.length ? 'Bibliotheque projet synchronisee.' : 'Bibliotheque projet vide.');
            },
            (error) => {
                setStatus('error');
                setMessage(error.message || 'Lecture bibliotheque projet impossible.');
            }
        );
        const unsubscribePlaylists = subscribeProjectSoundPlaylists(
            user.uid,
            (nextPlaylists) => {
                setPlaylists(nextPlaylists);
                if (selectedPlaylistId && !nextPlaylists.some((playlist) => playlist.id === selectedPlaylistId)) {
                    setSelectedPlaylistId('');
                }
            },
            (error) => {
                setStatus('error');
                setMessage(error.message || 'Lecture playlists projet impossible.');
            }
        );
        return () => {
            unsubscribeTracks();
            unsubscribePlaylists();
        };
    }, [capability.ready, selectedPlaylistId, user?.uid]);

    const ensureUser = useCallback(async () => {
        if (!capability.ready || !auth) throw new Error(capability.reason || 'Firebase non configure.');
        if (auth.currentUser) return auth.currentUser;
        setStatus('authenticating');
        setMessage('Ouverture session projet.');
        const credential = await signInAnonymously(auth);
        return credential.user;
    }, [capability]);

    const importTrackToProject = useCallback(async (track) => {
        setBusyTrackId(track.id);
        try {
            const currentUser = await ensureUser();
            const normalizedForImport = normalizeProjectSoundTrack({
                ...track,
                sourceProvider: track.provider || track.sourceProvider,
                sourcePageUrl: track.sourcePageUrl || track.sourceUrl,
                rightsStatus: track.rightsStatus === 'verified-free' ? 'cleared-social' : track.rightsStatus,
            }, currentUser.uid);
            const idToken = await currentUser.getIdToken();
            const fetched = await fetchAudioBlobForTrack(track, {
                projectImport: true,
                idToken,
                trackMetadata: normalizedForImport,
            });
            const facts = await buildAudioFacts(fetched.blob);
            const imported = await uploadProjectSoundTrack({
                uid: currentUser.uid,
                blob: fetched.blob,
                contentType: fetched.contentType,
                fileName: fetched.fileName,
                track: normalizeProjectSoundTrack({
                    ...normalizedForImport,
                    duration: facts.duration || track.duration,
                    waveform: facts.waveform,
                    downloadUrl: fetched.finalUrl || track.downloadUrl,
                    previewUrl: fetched.finalUrl || track.previewUrl,
                }, currentUser.uid),
            });
            setStatus('ready');
            setMessage(`Importe dans le projet: ${imported.title}.`);
            return imported;
        } catch (error) {
            setStatus('error');
            setMessage(error.message || 'Import projet impossible.');
            return null;
        } finally {
            setBusyTrackId('');
        }
    }, [ensureUser]);

    const importFileToProject = useCallback(async (file, metadata = {}) => {
        if (!file) return null;
        setBusyTrackId(file.name);
        try {
            const currentUser = await ensureUser();
            const facts = await buildAudioFacts(file);
            const imported = await uploadProjectSoundTrack({
                uid: currentUser.uid,
                blob: file,
                contentType: file.type || 'audio/mpeg',
                fileName: file.name,
                track: normalizeProjectSoundTrack({
                    id: `upload-${Date.now()}`,
                    title: metadata.title || file.name.replace(/\.[a-z0-9]+$/i, ''),
                    artist: metadata.artist || '',
                    sourceProvider: 'local-upload',
                    sourceName: metadata.sourceName || 'Import fichier utilisateur',
                    sourceUrl: metadata.sourceUrl || 'user-declared',
                    sourcePageUrl: metadata.sourcePageUrl || metadata.sourceUrl || 'user-declared',
                    license: metadata.license || 'Droits declares par utilisateur',
                    licenseUrl: metadata.licenseUrl || 'user-declared',
                    attribution: metadata.attribution || '',
                    contentIdWarning: metadata.contentIdWarning || 'Declaration utilisateur: conserver la preuve hors app.',
                    rightsStatus: metadata.rightsStatus || 'user-declared',
                    socialUse: metadata.socialUse === true,
                    commercialUse: metadata.commercialUse === true,
                    duration: facts.duration,
                    waveform: facts.waveform,
                    tags: metadata.tags || ['local-upload'],
                }, currentUser.uid),
            });
            setStatus('ready');
            setMessage(`Fichier importe dans le projet: ${imported.title}.`);
            return imported;
        } catch (error) {
            setStatus('error');
            setMessage(error.message || 'Import fichier projet impossible.');
            return null;
        } finally {
            setBusyTrackId('');
        }
    }, [ensureUser]);

    const toggleFavorite = useCallback(async (track) => {
        if (!uid || !track?.id) return;
        await patchProjectSoundTrack(uid, track.id, { favorite: !track.favorite });
    }, [uid]);

    const markNeedsReview = useCallback(async (track) => {
        if (!uid || !track?.id) return;
        await patchProjectSoundTrack(uid, track.id, { rightsStatus: 'needs-review' });
    }, [uid]);

    const archiveTrack = useCallback(async (track) => {
        if (!uid || !track?.id) return;
        await patchProjectSoundTrack(uid, track.id, { archived: true });
    }, [uid]);

    const removeTrack = useCallback(async (track) => {
        if (!uid || !track?.id) return;
        await deleteProjectSoundTrack(uid, track.id, track.storagePath);
    }, [uid]);

    const markUsed = useCallback(async (track) => {
        if (!uid || !track?.id) return;
        await patchProjectSoundTrack(uid, track.id, { lastUsedAt: new Date().toISOString() });
    }, [uid]);

    const createPlaylist = useCallback(async (name) => {
        const trimmed = String(name || '').trim();
        if (!trimmed) return null;
        const currentUser = await ensureUser();
        const playlist = await createProjectSoundPlaylist(currentUser.uid, normalizeProjectSoundPlaylist({
            name: trimmed,
            trackIds: [],
        }, currentUser.uid));
        setSelectedPlaylistId(playlist.id);
        setStatus('ready');
        setMessage(`Playlist projet creee: ${playlist.name}.`);
        return playlist;
    }, [ensureUser]);

    const renamePlaylist = useCallback(async (playlistId, name) => {
        const trimmed = String(name || '').trim();
        if (!uid || !playlistId || !trimmed) return;
        await patchProjectSoundPlaylist(uid, playlistId, { name: trimmed });
    }, [uid]);

    const deletePlaylist = useCallback(async (playlistId) => {
        if (!uid || !playlistId) return;
        if (selectedPlaylistId === playlistId) setSelectedPlaylistId('');
        await deleteProjectSoundPlaylist(uid, playlistId);
    }, [selectedPlaylistId, uid]);

    const addToPlaylist = useCallback(async (trackOrId, playlistId = selectedPlaylistId) => {
        if (!uid || !playlistId) return;
        const trackId = typeof trackOrId === 'string' ? trackOrId : trackOrId?.id;
        if (!trackId) return;
        const playlist = playlists.find((item) => item.id === playlistId);
        if (!playlist) return;
        const nextPlaylist = addTrackToProjectPlaylist(playlist, trackId);
        await patchProjectSoundPlaylist(uid, playlistId, { trackIds: nextPlaylist.trackIds });
    }, [playlists, selectedPlaylistId, uid]);

    const removeFromPlaylist = useCallback(async (trackId, playlistId = selectedPlaylistId) => {
        if (!uid || !playlistId || !trackId) return;
        const playlist = playlists.find((item) => item.id === playlistId);
        if (!playlist) return;
        const nextPlaylist = removeTrackFromProjectPlaylist(playlist, trackId);
        await patchProjectSoundPlaylist(uid, playlistId, { trackIds: nextPlaylist.trackIds });
    }, [playlists, selectedPlaylistId, uid]);

    const movePlaylistTrack = useCallback(async (playlistId, trackId, direction) => {
        if (!uid || !playlistId || !trackId) return;
        const playlist = playlists.find((item) => item.id === playlistId);
        if (!playlist) return;
        const nextPlaylist = moveTrackInProjectPlaylist(playlist, trackId, direction);
        await patchProjectSoundPlaylist(uid, playlistId, { trackIds: nextPlaylist.trackIds });
    }, [playlists, uid]);

    const updateTrackMetadata = useCallback(async (track, patch) => {
        if (!uid || !track?.id) return;
        await patchProjectSoundTrack(uid, track.id, patch);
    }, [uid]);

    return {
        user,
        tracks,
        playlists,
        selectedPlaylistId,
        setSelectedPlaylistId,
        status,
        message,
        busyTrackId,
        capability,
        ensureUser,
        importTrackToProject,
        importFileToProject,
        toggleFavorite,
        markNeedsReview,
        archiveTrack,
        removeTrack,
        markUsed,
        createPlaylist,
        renamePlaylist,
        deletePlaylist,
        addToPlaylist,
        removeFromPlaylist,
        movePlaylistTrack,
        updateTrackMetadata,
    };
}
