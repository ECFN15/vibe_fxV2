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
    const audioGraphRef = useRef({ context: null, source: null, analyser: null, frame: 0, lastEmit: 0 });
    const [playingId, setPlayingId] = useState('');
    const [currentTrack, setCurrentTrack] = useState(null);
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const [visualizer, setVisualizer] = useState({ trackId: '', active: false, levels: [] });

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
        audioGraphRef.current = { context: null, source: null, analyser: null, frame: 0, lastEmit: 0 };
    }, []);

    const startVisualizer = useCallback((trackId, audio) => {
        cleanupAudioGraph();
        setVisualizer({ trackId, active: true, levels: [] });

        if (!canAnalyzeAudioUrl(audio.currentSrc || audio.src)) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        try {
            const context = new AudioContextClass();
            const analyser = context.createAnalyser();
            analyser.fftSize = 128;
            analyser.smoothingTimeConstant = 0.74;
            const source = context.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(context.destination);

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

            audioGraphRef.current = { context, source, analyser, frame: 0, lastEmit: 0 };
            context.resume().catch(() => {});
            audioGraphRef.current.frame = requestAnimationFrame(emitLevels);
        } catch {
            setVisualizer({ trackId, active: true, levels: [] });
        }
    }, [cleanupAudioGraph]);

    const stop = useCallback(() => {
        cleanupAudioGraph();
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setPlayingId('');
        setStatus('idle');
        setVisualizer({ trackId: '', active: false, levels: [] });
    }, [cleanupAudioGraph]);

    const play = useCallback((track, url) => {
        if (!url) {
            setError('Fichier local indisponible. Reconnectez le dossier ou telechargez la piste.');
            setStatus('error');
            return;
        }
        if (playingId === track.id) {
            stop();
            return;
        }
        cleanupAudioGraph();
        if (audioRef.current) audioRef.current.pause();
        const audio = new Audio(url);
        audio.volume = 0.62;
        audio.onplaying = () => {
            setStatus('playing');
            startVisualizer(track.id, audio);
        };
        audio.onpause = () => {
            if (audioRef.current !== audio) return;
            cleanupAudioGraph();
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
        };
        audioRef.current = audio;
        setCurrentTrack(track);
        setPlayingId(track.id);
        setStatus('loading');
        setVisualizer({ trackId: track.id, active: false, levels: [] });
        audio.play().catch((playError) => {
            cleanupAudioGraph();
            setError(playError.message || 'Lecture audio bloquee par le navigateur.');
            setStatus('error');
            setPlayingId('');
            setVisualizer({ trackId: '', active: false, levels: [] });
        });
    }, [cleanupAudioGraph, playingId, startVisualizer, stop]);

    useEffect(() => () => stop(), [stop]);

    return {
        playingId,
        currentTrack,
        status,
        error,
        visualizer,
        play,
        stop,
    };
}
