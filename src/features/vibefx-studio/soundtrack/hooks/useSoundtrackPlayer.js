import { useCallback, useEffect, useRef, useState } from 'react';

const canAnalyzeAudioUrl = (value = '') => {
    if (typeof window === 'undefined') return false;
    try {
        const url = new URL(value, window.location.href);
        if (['blob:', 'data:'].includes(url.protocol)) return true;
        return url.origin === window.location.origin;
    } catch {
        return false;
    }
};

export function useSoundtrackPlayer() {
    const audioRef = useRef(null);
    const audioGraphRef = useRef({ context: null, source: null, analyser: null, audio: null, trackId: '', frame: 0, lastEmit: 0 });
    const pendingSeekRef = useRef(null);
    const [playingId, setPlayingId] = useState('');
    const [currentTrack, setCurrentTrack] = useState(null);
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const [visualizer, setVisualizer] = useState({ trackId: '', active: false, levels: [] });
    const [progress, setProgress] = useState({ currentTime: 0, duration: 0 });
    const [endedEvent, setEndedEvent] = useState(null);

    const cleanupAudioGraph = useCallback(() => {
        const graph = audioGraphRef.current;
        if (graph.frame) cancelAnimationFrame(graph.frame);
        try {
            graph.source?.disconnect();
            graph.analyser?.disconnect();
        } catch {
            // Best-effort cleanup; browsers can throw when nodes were already detached.
        }
        if (graph.context && graph.context.state !== 'closed') {
            graph.context.close().catch(() => {});
        }
        audioGraphRef.current = { context: null, source: null, analyser: null, audio: null, trackId: '', frame: 0, lastEmit: 0 };
    }, []);

    const pauseVisualizerFrame = useCallback(() => {
        const graph = audioGraphRef.current;
        if (graph.frame) cancelAnimationFrame(graph.frame);
        audioGraphRef.current = { ...graph, frame: 0 };
    }, []);

    const startVisualizer = useCallback((trackId, audio) => {
        setVisualizer({ trackId, active: true, levels: [] });

        if (!canAnalyzeAudioUrl(audio.currentSrc || audio.src)) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        try {
            let graph = audioGraphRef.current;
            if (graph.audio !== audio || !graph.context || !graph.analyser) {
                cleanupAudioGraph();
                const context = new AudioContextClass();
                const analyser = context.createAnalyser();
                analyser.fftSize = 128;
                analyser.smoothingTimeConstant = 0.74;
                const source = context.createMediaElementSource(audio);
                source.connect(analyser);
                analyser.connect(context.destination);
                graph = { context, source, analyser, audio, trackId, frame: 0, lastEmit: 0 };
            } else if (graph.frame) {
                cancelAnimationFrame(graph.frame);
                graph = { ...graph, trackId, frame: 0 };
            }

            const analyser = graph.analyser;
            const data = new Uint8Array(analyser.frequencyBinCount);
            const groupCount = 28;
            const emitLevels = (timestamp = 0) => {
                analyser.getByteFrequencyData(data);
                if (!audio.paused && timestamp - audioGraphRef.current.lastEmit > 70) {
                    const groupSize = Math.max(1, Math.floor(data.length / groupCount));
                    const levels = Array.from({ length: groupCount }, (_, groupIndex) => {
                        const start = groupIndex * groupSize;
                        const values = data.slice(start, start + groupSize);
                        const average = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
                        return Math.max(0.08, Math.min(1, average / 255));
                    });
                    audioGraphRef.current.lastEmit = timestamp;
                    setVisualizer({ trackId, active: true, levels });
                }
                audioGraphRef.current.frame = requestAnimationFrame(emitLevels);
            };

            audioGraphRef.current = graph;
            graph.context.resume().catch(() => {});
            audioGraphRef.current.frame = requestAnimationFrame(emitLevels);
        } catch {
            setVisualizer({ trackId, active: true, levels: [] });
        }
    }, [cleanupAudioGraph]);

    const stop = useCallback(() => {
        cleanupAudioGraph();
        pendingSeekRef.current = null;
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setPlayingId('');
        setStatus('idle');
        setVisualizer({ trackId: '', active: false, levels: [] });
        setProgress({ currentTime: 0, duration: 0 });
    }, [cleanupAudioGraph]);

    const play = useCallback((track, url, options = {}) => {
        if (!url) {
            setError('Fichier local indisponible. Reconnectez le dossier ou telechargez la piste.');
            setStatus('error');
            return;
        }
        if (playingId === track.id && audioRef.current) {
            const audio = audioRef.current;
            if (options.startAt !== undefined) {
                const nextTime = Math.max(0, Number(options.startAt) || 0);
                const duration = Number.isFinite(audio.duration) ? audio.duration : Number(track.duration) || progress.duration || 0;
                try {
                    audio.currentTime = Math.min(nextTime, duration || nextTime);
                    setProgress({ currentTime: audio.currentTime || nextTime, duration: duration || progress.duration || 0 });
                } catch {
                    pendingSeekRef.current = nextTime;
                }
                audio.play().catch((playError) => {
                    setError(playError.message || 'Lecture audio bloquee par le navigateur.');
                    setStatus('error');
                });
                return;
            }
            if (audio.paused || status === 'paused') {
                audio.play().catch((playError) => {
                    setError(playError.message || 'Lecture audio bloquee par le navigateur.');
                    setStatus('error');
                });
                return;
            }
            stop();
            return;
        }
        cleanupAudioGraph();
        if (audioRef.current) audioRef.current.pause();
        const audio = new Audio(url);
        audio.volume = 0.62;
        const startAt = Math.max(0, Number(options.startAt) || 0);
        pendingSeekRef.current = startAt > 0 ? startAt : null;
        const applyPendingSeek = () => {
            if (audioRef.current !== audio || pendingSeekRef.current === null) return;
            const duration = Number.isFinite(audio.duration) ? audio.duration : Number(track.duration) || 0;
            const nextTime = Math.min(pendingSeekRef.current, duration || pendingSeekRef.current);
            try {
                audio.currentTime = nextTime;
            } catch {
                return;
            }
            pendingSeekRef.current = null;
        };
        audio.onloadedmetadata = () => {
            if (audioRef.current !== audio) return;
            applyPendingSeek();
            setProgress({
                currentTime: audio.currentTime || 0,
                duration: Number.isFinite(audio.duration) ? audio.duration : Number(track.duration) || 0,
            });
        };
        audio.oncanplay = () => {
            if (audioRef.current !== audio) return;
            applyPendingSeek();
        };
        audio.ontimeupdate = () => {
            if (audioRef.current !== audio) return;
            setProgress({
                currentTime: audio.currentTime || 0,
                duration: Number.isFinite(audio.duration) ? audio.duration : Number(track.duration) || 0,
            });
        };
        audio.onplaying = () => {
            setStatus('playing');
            startVisualizer(track.id, audio);
            setProgress({
                currentTime: audio.currentTime || 0,
                duration: Number.isFinite(audio.duration) ? audio.duration : Number(track.duration) || 0,
            });
        };
        audio.onpause = () => {
            if (audioRef.current !== audio) return;
            pauseVisualizerFrame();
            setVisualizer((current) => current.trackId === track.id
                ? { ...current, active: false }
                : current);
            setStatus('paused');
        };
        audio.onerror = () => {
            if (audioRef.current !== audio) return;
            cleanupAudioGraph();
            setError('Lecture audio impossible dans ce navigateur.');
            setStatus('error');
            setPlayingId('');
            setVisualizer({ trackId: '', active: false, levels: [] });
        };
        audio.onended = () => {
            if (audioRef.current !== audio) return;
            cleanupAudioGraph();
            setPlayingId('');
            setStatus('idle');
            setVisualizer({ trackId: '', active: false, levels: [] });
            setProgress({ currentTime: 0, duration: Number(track.duration) || 0 });
            setEndedEvent({ trackId: track.id, at: Date.now() });
        };
        audioRef.current = audio;
        setCurrentTrack(track);
        setPlayingId(track.id);
        setStatus('loading');
        setVisualizer({ trackId: track.id, active: false, levels: [] });
        setProgress({ currentTime: 0, duration: Number(track.duration) || 0 });
        audio.play().catch((playError) => {
            cleanupAudioGraph();
            setError(playError.message || 'Lecture audio bloquee par le navigateur.');
            setStatus('error');
            setPlayingId('');
            setVisualizer({ trackId: '', active: false, levels: [] });
        });
    }, [cleanupAudioGraph, pauseVisualizerFrame, playingId, progress.duration, startVisualizer, status, stop]);

    const seek = useCallback((seconds) => {
        const audio = audioRef.current;
        const nextTime = Math.max(0, Number(seconds) || 0);
        if (audio) {
            const shouldResume = !audio.paused;
            const duration = Number.isFinite(audio.duration) ? audio.duration : progress.duration;
            const safeTime = Math.min(nextTime, duration || nextTime);
            try {
                audio.currentTime = safeTime;
            } catch {
                pendingSeekRef.current = safeTime;
            }
            setProgress({ currentTime: audio.currentTime || safeTime, duration: duration || progress.duration || 0 });
            if (shouldResume) {
                audio.play().catch((playError) => {
                    setError(playError.message || 'Lecture audio bloquee par le navigateur.');
                    setStatus('error');
                });
            }
            return;
        }
        setProgress((current) => ({
            ...current,
            currentTime: Math.min(nextTime, current.duration || nextTime),
        }));
    }, [progress.duration]);

    useEffect(() => () => stop(), [stop]);

    return {
        playingId,
        currentTrack,
        status,
        error,
        visualizer,
        progress,
        endedEvent,
        play,
        seek,
        stop,
    };
}
