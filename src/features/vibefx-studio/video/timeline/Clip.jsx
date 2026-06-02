import React from 'react';
import useVideoStore from '../store/videoStore';
import { formatTime } from '../engine/VideoEngine';

const Clip = ({ clip, index, activeTrimEdge }) => {
    const {
        selectedClipId,
        setSelectedClipId,
        setSelectedTextId,
        setSelectedTransitionId,
        setSelectedAudioTrackId,
    } = useVideoStore();
    const clipDuration = (clip.trimEnd - clip.trimStart) / (clip.speed || 1);
    const sourceFrameRate = Number.isFinite(Number(clip.sourceFrameRate)) ? Math.round(Number(clip.sourceFrameRate)) : null;
    const orientationRotation = Number.isFinite(Number(clip.orientationRotation))
        ? ((Math.round(Number(clip.orientationRotation) / 90) * 90) % 360 + 360) % 360
        : 0;
    const fpsBadge = clip.socialFpsNormalized
        ? '60->30 FPS'
        : sourceFrameRate
            ? `${sourceFrameRate} FPS`
            : '';

    const isSelected = selectedClipId === clip.id;
    const isTrimming = Boolean(activeTrimEdge);

    return (
        <div
            data-testid={`video-clip-${index}`}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className={`relative w-full h-full rounded-sm overflow-hidden cursor-pointer select-none group
                ${isSelected
                    ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-neutral-950 z-10'
                    : 'ring-1 ring-neutral-700/60 hover:ring-neutral-500'
                }`}
            onClick={(e) => {
                e.stopPropagation();
                setSelectedClipId(clip.id);
                setSelectedTextId(null);
                setSelectedTransitionId(null);
                setSelectedAudioTrackId(null);
            }}
        >
            {/* Thumbnail filmstrip */}
            <div className="absolute inset-0 flex overflow-hidden">
                {clip.thumbnails && clip.thumbnails.length > 0 ? (
                    clip.thumbnails.map((thumb, i) => (
                        <img
                            key={i}
                            src={thumb}
                            alt=""
                            className="h-full object-cover flex-shrink-0"
                            style={{ width: `${100 / clip.thumbnails.length}%` }}
                            draggable={false}
                            onDragStart={(e) => e.preventDefault()}
                        />
                    ))
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-indigo-900/40 to-purple-900/40" />
                )}
            </div>

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

            {/* FPS import indicator */}
            {fpsBadge && (
                <div
                    className={`absolute top-0.5 left-1 z-10 pointer-events-none rounded-sm px-1 text-[7px] font-mono uppercase tracking-wider text-white shadow-sm ${
                        clip.socialFpsNormalized ? 'bg-emerald-500/80' : 'bg-neutral-900/70'
                    }`}
                    title={clip.socialFpsNormalized ? 'Import reseaux 30 FPS depuis source haute cadence' : 'Cadence source detectee'}
                >
                    {fpsBadge}
                </div>
            )}

            {orientationRotation !== 0 && (
                <div
                    className="absolute top-0.5 right-1 z-10 pointer-events-none rounded-sm bg-cyan-500/80 px-1 text-[7px] font-mono uppercase tracking-wider text-black shadow-sm"
                    title="Rotation appliquee au rendu"
                >
                    {orientationRotation} DEG
                </div>
            )}

            {/* Clip info */}
            <div className="absolute bottom-0 left-0 right-0 px-2 py-0.5 flex items-center justify-between">
                <span className="text-[8px] font-mono text-white/90 truncate max-w-[70%] font-medium">{clip.name}</span>
                <span className="text-[7px] font-mono text-white/50 tabular-nums">{formatTime(clipDuration)}</span>
            </div>

            {/* Speed indicator */}
            {clip.speed !== 1 && (
                <div className={`absolute ${orientationRotation !== 0 ? 'top-4 right-1' : 'top-0.5 right-1'} text-[7px] font-mono bg-indigo-600/80 text-white px-1 rounded-sm`}>
                    {clip.speed}x
                </div>
            )}

            {/* Left trim handle */}
            <div
                data-testid={`video-clip-${index}-trim-start`}
                data-trim-handle="1"
                data-trim-edge="start"
                aria-label={`Raccourcir le debut du clip ${clip.name}`}
                title="Raccourcir le debut"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                className={`absolute left-0 top-0 bottom-0 w-12 cursor-ew-resize z-20 flex items-center justify-start pl-1 touch-none
                    transition-colors ${activeTrimEdge === 'start' ? 'bg-indigo-500/60' : 'bg-gradient-to-r from-black/45 to-transparent hover:from-indigo-500/45'}`}
            >
                <div className={`w-1 h-8 rounded-full ${activeTrimEdge === 'start' ? 'bg-white' : 'bg-white/70 group-hover:bg-white'}`} />
            </div>

            {/* Right trim handle */}
            <div
                data-testid={`video-clip-${index}-trim-end`}
                data-trim-handle="1"
                data-trim-edge="end"
                aria-label={`Raccourcir la fin du clip ${clip.name}`}
                title="Raccourcir la fin"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                className={`absolute right-0 top-0 bottom-0 w-12 cursor-ew-resize z-20 flex items-center justify-end pr-1 touch-none
                    transition-colors ${activeTrimEdge === 'end' ? 'bg-indigo-500/60' : 'bg-gradient-to-l from-black/45 to-transparent hover:from-indigo-500/45'}`}
            >
                <div className={`w-1 h-8 rounded-full ${activeTrimEdge === 'end' ? 'bg-white' : 'bg-white/70 group-hover:bg-white'}`} />
            </div>

            {/* Trim duration overlay */}
            {isTrimming && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 pointer-events-none">
                    <span className="text-[11px] font-mono text-white tabular-nums font-bold">
                        {formatTime(clipDuration)}
                    </span>
                </div>
            )}
        </div>
    );
};

export default Clip;
