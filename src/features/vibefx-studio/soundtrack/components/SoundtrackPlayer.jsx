import React from 'react';
import { Pause, Play, Square } from 'lucide-react';

const formatDuration = (seconds = 0) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
};

export default function SoundtrackPlayer({ track, status, playingId, onPlay, onStop }) {
    const isPlaying = track && playingId === track.id && status === 'playing';
    return (
        <div className="soundtrack-player" data-status={status || 'idle'}>
            <button
                type="button"
                onClick={() => track && onPlay(track)}
                disabled={!track}
                className="soundtrack-icon-button soundtrack-player__play"
                aria-label={isPlaying ? 'Pause soundtrack' : 'Lire soundtrack'}
            >
                {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <div className="soundtrack-player__meta">
                <span>{track?.title || 'Aucune piste selectionnee'}</span>
                <small>{track ? `${track.sourceName || track.provider} / ${formatDuration(track.duration)}` : 'Preview locale temporaire'}</small>
            </div>
            <button
                type="button"
                onClick={onStop}
                disabled={!track}
                className="soundtrack-icon-button"
                aria-label="Stop soundtrack"
            >
                <Square size={13} />
            </button>
        </div>
    );
}
