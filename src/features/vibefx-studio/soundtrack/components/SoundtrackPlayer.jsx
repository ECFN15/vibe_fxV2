import React, { useCallback, useMemo, useRef } from 'react';
import { Pause, Play, Shuffle, SkipBack, SkipForward } from 'lucide-react';

const formatDuration = (seconds = 0) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
};

export default function SoundtrackPlayer({
    track,
    status,
    playingId,
    progress = { currentTime: 0, duration: 0 },
    playbackMode = 'sequence',
    queueSize = 0,
    onPlay,
    onSeek,
    onPrevious,
    onNext,
    onTogglePlaybackMode,
}) {
    const scrubRef = useRef(null);
    const isPlaying = track && playingId === track.id && status === 'playing';
    const duration = Math.max(0, Number(progress.duration) || Number(track?.duration) || 0);
    const currentTime = Math.max(0, Math.min(duration || 0, Number(progress.currentTime) || 0));
    const progressRatio = duration ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
    const progressPercent = `${progressRatio * 100}%`;
    const progressBars = useMemo(() => (
        Array.from({ length: 42 }, (_, index) => {
            const barRatio = (index + 1) / 42;
            return {
                index,
                active: progressRatio >= barRatio,
                height: 26 + ((index * 7) % 9) * 5,
            };
        })
    ), [progressRatio]);
    const seekFromPointer = useCallback((event) => {
        if (!duration || !scrubRef.current) return;
        const rect = scrubRef.current.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        onSeek?.(ratio * duration);
    }, [duration, onSeek]);
    const handleScrubPointerDown = useCallback((event) => {
        if (!duration) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        seekFromPointer(event);
    }, [duration, seekFromPointer]);
    const handleScrubPointerMove = useCallback((event) => {
        if (!duration || event.buttons !== 1) return;
        seekFromPointer(event);
    }, [duration, seekFromPointer]);
    const handleScrubKeyDown = useCallback((event) => {
        if (!duration) return;
        const step = event.shiftKey ? 15 : 5;
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            onSeek?.(Math.max(0, currentTime - step));
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            onSeek?.(Math.min(duration, currentTime + step));
        } else if (event.key === 'Home') {
            event.preventDefault();
            onSeek?.(0);
        } else if (event.key === 'End') {
            event.preventDefault();
            onSeek?.(duration);
        }
    }, [currentTime, duration, onSeek]);

    return (
        <div className="soundtrack-player" data-status={status || 'idle'}>
            <div className="soundtrack-player__identity">
                <div className="soundtrack-player__controls">
                    <button
                        type="button"
                        onClick={onPrevious}
                        disabled={!track || queueSize < 2}
                        className="soundtrack-icon-button"
                        aria-label="Piste precedente"
                        title={playbackMode === 'shuffle' ? 'Piste aleatoire precedente' : 'Piste precedente'}
                    >
                        <SkipBack size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => track && onPlay(track)}
                        disabled={!track}
                        className="soundtrack-icon-button soundtrack-player__play"
                        aria-label={isPlaying ? 'Pause soundtrack' : 'Lire soundtrack'}
                    >
                        {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                    </button>
                    <button
                        type="button"
                        onClick={onNext}
                        disabled={!track || queueSize < 2}
                        className="soundtrack-icon-button"
                        aria-label="Piste suivante"
                        title={playbackMode === 'shuffle' ? 'Piste aleatoire' : 'Piste suivante'}
                    >
                        <SkipForward size={14} />
                    </button>
                </div>
                <div className="soundtrack-player__meta">
                    <span>{track?.title || 'Aucune piste selectionnee'}</span>
                    <small>{track ? `${track.sourceName || track.provider} / ${formatDuration(duration)}` : 'Preview locale temporaire'}</small>
                </div>
            </div>
            <div className="soundtrack-player__timeline">
                <div className="soundtrack-player__time">
                    <span>{formatDuration(currentTime)}</span>
                    <span>{formatDuration(duration)}</span>
                </div>
                <div
                    ref={scrubRef}
                    className="soundtrack-player__scrub"
                    role="slider"
                    tabIndex={track && duration ? 0 : -1}
                    aria-valuemin={0}
                    aria-valuemax={Math.max(1, Math.round(duration))}
                    aria-valuenow={Math.round(currentTime)}
                    aria-disabled={!track || !duration}
                    aria-label="Avancer la musique en cours"
                    style={{ '--soundtrack-player-progress': progressPercent }}
                    onPointerDown={handleScrubPointerDown}
                    onPointerMove={handleScrubPointerMove}
                    onKeyDown={handleScrubKeyDown}
                >
                    <div className="soundtrack-player__scrub-grid" aria-hidden="true">
                        {progressBars.map((bar) => (
                            <span
                                key={bar.index}
                                data-active={bar.active ? 'true' : 'false'}
                                style={{ '--bar-height': `${bar.height}%` }}
                            />
                        ))}
                    </div>
                    <i className="soundtrack-player__scrub-fill" aria-hidden="true" />
                    <i className="soundtrack-player__scrub-head" aria-hidden="true" />
                </div>
            </div>
            <div className="soundtrack-player__mode">
                <button
                    type="button"
                    onClick={onTogglePlaybackMode}
                    disabled={queueSize < 2}
                    data-active={playbackMode === 'shuffle' ? 'true' : 'false'}
                    className="soundtrack-icon-button"
                    aria-label={playbackMode === 'shuffle' ? 'Lecture aleatoire active' : 'Lecture en ordre active'}
                    title={playbackMode === 'shuffle' ? 'Aleatoire active' : 'Lecture suivante automatique'}
                >
                    <Shuffle size={14} />
                </button>
                <small>{playbackMode === 'shuffle' ? 'Aleatoire' : 'Auto next'}</small>
            </div>
        </div>
    );
}
