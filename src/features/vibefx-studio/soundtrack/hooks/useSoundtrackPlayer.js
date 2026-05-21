import { useCallback, useEffect, useRef, useState } from 'react';

export function useSoundtrackPlayer() {
    const audioRef = useRef(null);
    const [playingId, setPlayingId] = useState('');
    const [currentTrack, setCurrentTrack] = useState(null);
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');

    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setPlayingId('');
        setStatus('idle');
    }, []);

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
        if (audioRef.current) audioRef.current.pause();
        const audio = new Audio(url);
        audio.volume = 0.62;
        audio.onplaying = () => setStatus('playing');
        audio.onpause = () => setStatus('paused');
        audio.onerror = () => {
            setError('Lecture audio impossible dans ce navigateur.');
            setStatus('error');
            setPlayingId('');
        };
        audio.onended = () => {
            setPlayingId('');
            setStatus('idle');
        };
        audioRef.current = audio;
        setCurrentTrack(track);
        setPlayingId(track.id);
        setStatus('loading');
        audio.play().catch((playError) => {
            setError(playError.message || 'Lecture audio bloquee par le navigateur.');
            setStatus('error');
            setPlayingId('');
        });
    }, [playingId, stop]);

    useEffect(() => () => stop(), [stop]);

    return {
        playingId,
        currentTrack,
        status,
        error,
        play,
        stop,
    };
}
