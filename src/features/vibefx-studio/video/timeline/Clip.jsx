import React, { useState, useRef } from 'react';
import useVideoStore from '../store/videoStore';
import { formatTime } from '../engine/VideoEngine';

const Clip = ({ clip, pps }) => {
    const { selectedClipId, setSelectedClipId, updateClip } = useVideoStore();
    const clipDuration = (clip.trimEnd - clip.trimStart) / (clip.speed || 1);

    const isSelected = selectedClipId === clip.id;
    const [isTrimming, setIsTrimming] = useState(null);
    const [tempTrimStart, setTempTrimStart] = useState(null);
    const [tempTrimEnd, setTempTrimEnd] = useState(null);

    const trimStartX = useRef(0);
    const trimStartValue = useRef(0);

    const activeTrimStart = tempTrimStart !== null ? tempTrimStart : clip.trimStart;
    const activeTrimEnd = tempTrimEnd !== null ? tempTrimEnd : clip.trimEnd;
    const activeDuration = (activeTrimEnd - activeTrimStart) / (clip.speed || 1);

    const handleTrimStart = (e, edge) => {
        e.stopPropagation();
        setIsTrimming(edge);
        trimStartX.current = e.clientX;
        trimStartValue.current = edge === 'start' ? clip.trimStart : clip.trimEnd;

        const onMove = (ev) => {
            const delta = (ev.clientX - trimStartX.current) / pps * (clip.speed || 1);
            if (edge === 'start') {
                const v = Math.max(0, Math.min(activeTrimEnd - 0.1, trimStartValue.current + delta));
                setTempTrimStart(v);
            } else {
                const v = Math.max(activeTrimStart + 0.1, Math.min(clip.originalDuration, trimStartValue.current + delta));
                setTempTrimEnd(v);
            }
        };

        const onUp = () => {
            setIsTrimming(null);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            setTempTrimStart((cs) => {
                setTempTrimEnd((ce) => {
                    const fs = cs !== null ? cs : clip.trimStart;
                    const fe = ce !== null ? ce : clip.trimEnd;
                    if (fs !== clip.trimStart || fe !== clip.trimEnd) {
                        updateClip(clip.id, { trimStart: fs, trimEnd: fe });
                    }
                    return null;
                });
                return null;
            });
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    return (
        <div
            className={`relative w-full h-full rounded-sm overflow-hidden cursor-pointer select-none group
                ${isSelected
                    ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-neutral-950 z-10'
                    : 'ring-1 ring-neutral-700/60 hover:ring-neutral-500'
                }`}
            onClick={(e) => { e.stopPropagation(); setSelectedClipId(clip.id); }}
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
                        />
                    ))
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-indigo-900/40 to-purple-900/40" />
                )}
            </div>

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

            {/* Clip info */}
            <div className="absolute bottom-0 left-0 right-0 px-2 py-0.5 flex items-center justify-between">
                <span className="text-[8px] font-mono text-white/90 truncate max-w-[70%] font-medium">{clip.name}</span>
                <span className="text-[7px] font-mono text-white/50 tabular-nums">{formatTime(clipDuration)}</span>
            </div>

            {/* Speed indicator */}
            {clip.speed !== 1 && (
                <div className="absolute top-0.5 right-1 text-[7px] font-mono bg-indigo-600/80 text-white px-1 rounded-sm">
                    {clip.speed}x
                </div>
            )}

            {/* Left trim handle */}
            <div
                className={`absolute left-0 top-0 bottom-0 w-2.5 cursor-col-resize z-10 flex items-center justify-center
                    transition-colors ${isTrimming === 'start' ? 'bg-indigo-500/50' : 'hover:bg-indigo-500/30'}`}
                onPointerDown={(e) => handleTrimStart(e, 'start')}
            >
                <div className="w-0.5 h-5 bg-white/40 rounded-full" />
            </div>

            {/* Right trim handle */}
            <div
                className={`absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize z-10 flex items-center justify-center
                    transition-colors ${isTrimming === 'end' ? 'bg-indigo-500/50' : 'hover:bg-indigo-500/30'}`}
                onPointerDown={(e) => handleTrimStart(e, 'end')}
            >
                <div className="w-0.5 h-5 bg-white/40 rounded-full" />
            </div>

            {/* Trim duration overlay */}
            {isTrimming && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 pointer-events-none">
                    <span className="text-[11px] font-mono text-white tabular-nums font-bold">
                        {formatTime(activeDuration)}
                    </span>
                </div>
            )}
        </div>
    );
};

export default Clip;
