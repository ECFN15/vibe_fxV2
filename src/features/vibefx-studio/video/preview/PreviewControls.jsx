import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import useVideoStore from '../store/videoStore';
import { formatTimeFull } from '../engine/VideoEngine';

const PreviewControls = () => {
    const {
        isPlaying, togglePlay, currentTime, totalDuration,
        seekTo, playbackSpeed, setPlaybackSpeed, clips
    } = useVideoStore();

    const hasClips = clips.length > 0;
    const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

    const handleProgressClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        seekTo(ratio * totalDuration);
    };

    const skipBack = () => seekTo(Math.max(0, currentTime - 5));
    const skipForward = () => seekTo(Math.min(totalDuration, currentTime + 5));

    const speeds = [0.25, 0.5, 1, 1.5, 2];
    const nextSpeed = () => {
        const idx = speeds.indexOf(playbackSpeed);
        const next = speeds[(idx + 1) % speeds.length];
        setPlaybackSpeed(next);
    };

    return (
        <div className="shrink-0 border-t border-neutral-800 bg-black/60 backdrop-blur-sm">
            {/* Progress bar */}
            <div
                className="h-1 bg-neutral-800 cursor-pointer group relative"
                onClick={handleProgressClick}
            >
                <div
                    className="h-full bg-indigo-500 transition-[width] duration-75 relative"
                    style={{ width: `${progress}%` }}
                >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-indigo-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg shadow-indigo-500/30" />
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between px-4 h-10">
                <div className="flex items-center gap-1">
                    <button
                        onClick={skipBack}
                        disabled={!hasClips}
                        className="p-1.5 text-neutral-400 hover:text-white transition disabled:opacity-30"
                    >
                        <SkipBack size={14} />
                    </button>

                    <button
                        onClick={togglePlay}
                        disabled={!hasClips}
                        className="p-2 text-white hover:text-indigo-400 transition disabled:opacity-30"
                    >
                        {isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
                    </button>

                    <button
                        onClick={skipForward}
                        disabled={!hasClips}
                        className="p-1.5 text-neutral-400 hover:text-white transition disabled:opacity-30"
                    >
                        <SkipForward size={14} />
                    </button>
                </div>

                {/* Time display */}
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-neutral-400 tabular-nums">
                        {formatTimeFull(currentTime)}
                    </span>
                    <span className="text-[10px] text-neutral-600">/</span>
                    <span className="text-[11px] font-mono text-neutral-500 tabular-nums">
                        {formatTimeFull(totalDuration)}
                    </span>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={nextSpeed}
                        className="text-[10px] font-mono text-neutral-500 hover:text-white transition px-2 py-0.5 border border-neutral-800 hover:border-neutral-600"
                    >
                        {playbackSpeed}x
                    </button>
                    <button className="p-1.5 text-neutral-400 hover:text-white transition">
                        <Volume2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PreviewControls;
