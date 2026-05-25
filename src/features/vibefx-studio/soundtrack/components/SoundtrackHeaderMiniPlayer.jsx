import React, { useMemo } from 'react';
import { Music2, Pause, Play, Shuffle, SkipBack, SkipForward } from 'lucide-react';

const formatDuration = (seconds = 0) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
};

export default function SoundtrackHeaderMiniPlayer({ controller, onOpenSoundtrack }) {
    const {
        player,
        selectedTrack,
        playbackMode = 'sequence',
        playableTracks = [],
        playTrack,
        playPreviousTrack,
        playNextTrack,
        togglePlaybackMode,
    } = controller || {};

    const track = selectedTrack || player?.currentTrack || null;
    const status = player?.status || 'idle';
    const isPlaying = track && player?.playingId === track.id && status === 'playing';
    const duration = Math.max(0, Number(player?.progress?.duration) || Number(track?.duration) || 0);
    const currentTime = Math.max(0, Math.min(duration || 0, Number(player?.progress?.currentTime) || 0));
    const progressRatio = duration ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
    const bars = useMemo(() => (
        Array.from({ length: 18 }, (_, index) => ({
            index,
            active: progressRatio >= (index + 1) / 18,
        }))
    ), [progressRatio]);

    return (
        <div className="vf-header-soundtrack" data-status={status} data-playing={isPlaying ? 'true' : 'false'}>
            <div className="vf-header-soundtrack__controls" aria-label="Controle global soundtrack">
                <button
                    type="button"
                    onClick={playPreviousTrack}
                    disabled={!track || playableTracks.length < 2}
                    aria-label="Piste precedente"
                    title="Piste precedente"
                >
                    <SkipBack size={12} />
                </button>
                <button
                    type="button"
                    onClick={() => track && playTrack?.(track)}
                    disabled={!track}
                    className="vf-header-soundtrack__play"
                    aria-label={isPlaying ? 'Pause soundtrack' : 'Lire soundtrack'}
                    title={isPlaying ? 'Pause' : 'Lire'}
                >
                    {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                </button>
                <button
                    type="button"
                    onClick={playNextTrack}
                    disabled={!track || playableTracks.length < 2}
                    aria-label="Piste suivante"
                    title="Piste suivante"
                >
                    <SkipForward size={12} />
                </button>
            </div>

            <button
                type="button"
                className="vf-header-soundtrack__meta"
                onClick={onOpenSoundtrack}
                title="Ouvrir Soundtrack"
            >
                <span>{track?.title || 'Soundtrack idle'}</span>
                <small>{track ? `${formatDuration(currentTime)} / ${formatDuration(duration)}` : 'Bibliotheque audio'}</small>
            </button>

            <div className="vf-header-soundtrack__rail" aria-hidden="true">
                {bars.map((bar) => (
                    <i key={bar.index} data-active={bar.active ? 'true' : 'false'} />
                ))}
            </div>

            <button
                type="button"
                onClick={togglePlaybackMode}
                disabled={playableTracks.length < 2}
                className="vf-header-soundtrack__mode"
                data-active={playbackMode === 'shuffle' ? 'true' : 'false'}
                aria-label={playbackMode === 'shuffle' ? 'Lecture aleatoire active' : 'Lecture en ordre active'}
                title={playbackMode === 'shuffle' ? 'Aleatoire active' : 'Auto next'}
            >
                {playbackMode === 'shuffle' ? <Shuffle size={12} /> : <Music2 size={12} />}
            </button>
        </div>
    );
}
