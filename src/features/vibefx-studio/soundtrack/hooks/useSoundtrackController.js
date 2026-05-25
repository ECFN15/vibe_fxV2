import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSoundtrackLibrary } from './useLocalSoundtrackLibrary';
import { useProjectSoundLibrary } from './useProjectSoundLibrary';
import { useSoundtrackPlayer } from './useSoundtrackPlayer';

export const getSoundtrackPlayableUrl = (track = {}) => (
    track.localObjectUrl || track.previewUrl || track.downloadUrl || track.audioUrl || track.url || ''
);

export function useSoundtrackController() {
    const library = useLocalSoundtrackLibrary();
    const projectLibrary = useProjectSoundLibrary();
    const player = useSoundtrackPlayer();
    const { play } = player;
    const [selectedTrackId, setSelectedTrackId] = useState('');
    const [playbackMode, setPlaybackMode] = useState('sequence');
    const handledEndedAtRef = useRef(0);

    const mergedTrackById = useMemo(() => {
        const map = new Map();
        library.tracks.forEach((track) => map.set(track.id, track));
        projectLibrary.tracks.forEach((track) => map.set(track.id, track));
        return map;
    }, [library.tracks, projectLibrary.tracks]);

    const playableTracks = useMemo(() => {
        const map = new Map();
        [...library.tracks, ...projectLibrary.tracks].forEach((track) => {
            if (!track?.id || !getSoundtrackPlayableUrl(track) || map.has(track.id)) return;
            map.set(track.id, track);
        });
        return Array.from(map.values());
    }, [library.tracks, projectLibrary.tracks]);

    const selectedTrack = mergedTrackById.get(selectedTrackId) || player.currentTrack || projectLibrary.tracks[0] || library.tracks[0] || null;

    const playTrack = useCallback((track, explicitUrl, options) => {
        if (!track) return;
        setSelectedTrackId(track.id);
        play(track, explicitUrl || getSoundtrackPlayableUrl(track), options);
    }, [play]);

    const getNextTrack = useCallback((fromTrack = selectedTrack, mode = playbackMode) => {
        if (!playableTracks.length) return null;
        if (playableTracks.length === 1) return playableTracks[0].id === fromTrack?.id ? null : playableTracks[0];
        if (mode === 'shuffle') {
            const candidates = playableTracks.filter((track) => track.id !== fromTrack?.id);
            return candidates[Math.floor(Math.random() * candidates.length)] || playableTracks[0];
        }
        const currentIndex = playableTracks.findIndex((track) => track.id === fromTrack?.id);
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % playableTracks.length : 0;
        return playableTracks[nextIndex];
    }, [playbackMode, playableTracks, selectedTrack]);

    const getPreviousTrack = useCallback((fromTrack = selectedTrack, mode = playbackMode) => {
        if (!playableTracks.length) return null;
        if (playableTracks.length === 1) return playableTracks[0].id === fromTrack?.id ? null : playableTracks[0];
        if (mode === 'shuffle') {
            const candidates = playableTracks.filter((track) => track.id !== fromTrack?.id);
            return candidates[Math.floor(Math.random() * candidates.length)] || playableTracks[0];
        }
        const currentIndex = playableTracks.findIndex((track) => track.id === fromTrack?.id);
        const previousIndex = currentIndex >= 0 ? (currentIndex - 1 + playableTracks.length) % playableTracks.length : playableTracks.length - 1;
        return playableTracks[previousIndex];
    }, [playbackMode, playableTracks, selectedTrack]);

    const playPreviousTrack = useCallback(() => {
        const previousTrack = getPreviousTrack(selectedTrack);
        if (previousTrack) playTrack(previousTrack);
    }, [getPreviousTrack, playTrack, selectedTrack]);

    const playNextTrack = useCallback(() => {
        const nextTrack = getNextTrack(selectedTrack);
        if (nextTrack) playTrack(nextTrack);
    }, [getNextTrack, playTrack, selectedTrack]);

    const togglePlaybackMode = useCallback(() => {
        setPlaybackMode((mode) => mode === 'shuffle' ? 'sequence' : 'shuffle');
    }, []);

    useEffect(() => {
        const event = player.endedEvent;
        if (!event?.at || handledEndedAtRef.current === event.at) return;
        handledEndedAtRef.current = event.at;
        const endedTrack = playableTracks.find((track) => track.id === event.trackId) || player.currentTrack;
        const nextTrack = getNextTrack(endedTrack, playbackMode);
        if (nextTrack) window.setTimeout(() => playTrack(nextTrack), 80);
    }, [getNextTrack, playTrack, playbackMode, playableTracks, player.currentTrack, player.endedEvent]);

    return {
        library,
        projectLibrary,
        player,
        selectedTrack,
        selectedTrackId,
        setSelectedTrackId,
        playbackMode,
        playableTracks,
        playTrack,
        playPreviousTrack,
        playNextTrack,
        togglePlaybackMode,
    };
}
