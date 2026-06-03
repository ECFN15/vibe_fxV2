import React, { useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Maximize2 } from 'lucide-react';
import useVideoStore from '../store/videoStore';
import { formatTimeFull } from '../engine/VideoEngine';

const PreviewControls = () => {
    const isScrubbingRef = useRef(false);
    const {
        isPlaying, togglePlay, currentTime, totalDuration,
        seekTo, playbackSpeed, setPlaybackSpeed, clips, previewCanvas
    } = useVideoStore();

    const hasClips = clips.length > 0;
    const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

    const seekFromClientX = (clientX, target) => {
        if (!totalDuration || !target) return;
        const rect = target.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        seekTo(ratio * totalDuration);
    };

    const handleProgressPointerDown = (e) => {
        if (e.button !== 0) return;
        isScrubbingRef.current = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        seekFromClientX(e.clientX, e.currentTarget);
        e.preventDefault();
    };

    const handleProgressPointerMove = (e) => {
        if (!isScrubbingRef.current) return;
        seekFromClientX(e.clientX, e.currentTarget);
        e.preventDefault();
    };

    const handleProgressPointerUp = (e) => {
        if (!isScrubbingRef.current) return;
        isScrubbingRef.current = false;
        seekFromClientX(e.clientX, e.currentTarget);
        e.currentTarget.releasePointerCapture?.(e.pointerId);
        e.preventDefault();
    };

    const handleProgressKeyDown = (e) => {
        const fineStep = e.altKey ? 0.04 : 0.1;
        const step = e.shiftKey ? 5 : fineStep;
        let nextTime = currentTime;

        if (e.key === 'ArrowLeft') nextTime = currentTime - step;
        else if (e.key === 'ArrowRight') nextTime = currentTime + step;
        else if (e.key === 'Home') nextTime = 0;
        else if (e.key === 'End') nextTime = totalDuration;
        else return;

        e.preventDefault();
        seekTo(Math.max(0, Math.min(totalDuration, nextTime)));
    };

    const skipBack = () => seekTo(Math.max(0, currentTime - 5));
    const skipForward = () => seekTo(Math.min(totalDuration, currentTime + 5));

    const speeds = [0.25, 0.5, 1, 1.5, 2];
    const nextSpeed = () => {
        const idx = speeds.indexOf(playbackSpeed);
        const next = speeds[(idx + 1) % speeds.length];
        setPlaybackSpeed(next);
    };

    const openFullscreenPreview = () => {
        const target = previewCanvas?.closest?.('[data-vibecut-preview-shell]') || previewCanvas?.parentElement || previewCanvas;
        if (!target?.requestFullscreen) return;
        target.requestFullscreen().catch((error) => {
            console.warn('Preview fullscreen failed:', error);
        });
    };

    return (
        <div className="shrink-0 border-t border-neutral-800 bg-black/60 backdrop-blur-sm">
            {/* Progress bar */}
            <div
                className="h-2 bg-neutral-800 cursor-pointer group relative touch-none"
                onPointerDown={handleProgressPointerDown}
                onPointerMove={handleProgressPointerMove}
                onPointerUp={handleProgressPointerUp}
                onPointerCancel={handleProgressPointerUp}
                onKeyDown={handleProgressKeyDown}
                role="slider"
                aria-label="Position de lecture"
                aria-valuemin={0}
                aria-valuemax={Math.round(totalDuration)}
                aria-valuenow={Math.round(currentTime)}
                aria-valuetext={`${formatTimeFull(currentTime)} / ${formatTimeFull(totalDuration)}`}
                tabIndex={hasClips ? 0 : -1}
            >
                <div
                    className="h-full bg-indigo-500 transition-[width] duration-75 relative"
                    style={{ width: `${progress}%` }}
                >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-indigo-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg shadow-indigo-500/30" />
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between px-3 h-12">
                <div className="flex items-center gap-1">
                    <button
                        onClick={skipBack}
                        disabled={!hasClips}
                        aria-label="Reculer de 5 secondes"
                        className="vibecut-square-button h-11 w-11 flex items-center justify-center text-neutral-400 hover:text-white transition disabled:opacity-30"
                    >
                        <SkipBack size={14} />
                    </button>

                    <button
                        onClick={togglePlay}
                        disabled={!hasClips}
                        aria-label={isPlaying ? 'Pause' : 'Lire'}
                        className="vibecut-square-button h-11 w-11 flex items-center justify-center text-white hover:text-indigo-400 transition disabled:opacity-30"
                    >
                        {isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
                    </button>

                    <button
                        onClick={skipForward}
                        disabled={!hasClips}
                        aria-label="Avancer de 5 secondes"
                        className="vibecut-square-button h-11 w-11 flex items-center justify-center text-neutral-400 hover:text-white transition disabled:opacity-30"
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
                        aria-label="Changer la vitesse de lecture preview"
                        className="h-11 min-w-[48px] px-2 text-[10px] font-mono text-neutral-500 hover:text-white transition border border-neutral-800 hover:border-neutral-600"
                    >
                        {playbackSpeed}x
                    </button>
                    <button
                        onClick={openFullscreenPreview}
                        disabled={!hasClips || !previewCanvas}
                        className="vibecut-square-button h-11 w-11 flex items-center justify-center text-neutral-400 hover:text-white transition disabled:opacity-30"
                        aria-label="Agrandir la preview"
                        title="Agrandir la preview"
                    >
                        <Maximize2 size={14} />
                    </button>
                    <button className="vibecut-square-button h-11 w-11 flex items-center justify-center text-neutral-400 hover:text-white transition" aria-label="Volume preview">
                        <Volume2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PreviewControls;
