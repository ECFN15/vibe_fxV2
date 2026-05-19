import React, { useRef, useState, useCallback } from 'react';
import useVideoStore from '../store/videoStore';
import { X, GripVertical } from 'lucide-react';

const COLOR_MAP = {
    amber:   { bg: 'bg-amber-900/30',   border: 'border-amber-600/30',   text: 'text-amber-400/80',   ring: 'ring-amber-500',   handle: 'bg-amber-500/60',   hoverBg: 'hover:bg-amber-900/40' },
    emerald: { bg: 'bg-emerald-900/30',  border: 'border-emerald-600/30', text: 'text-emerald-400/80', ring: 'ring-emerald-500', handle: 'bg-emerald-500/60', hoverBg: 'hover:bg-emerald-900/40' },
    purple:  { bg: 'bg-purple-900/30',   border: 'border-purple-600/30',  text: 'text-purple-400/80',  ring: 'ring-purple-500',  handle: 'bg-purple-500/60',  hoverBg: 'hover:bg-purple-900/40' },
    indigo:  { bg: 'bg-indigo-900/30',   border: 'border-indigo-600/30',  text: 'text-indigo-400/80',  ring: 'ring-indigo-500',  handle: 'bg-indigo-500/60',  hoverBg: 'hover:bg-indigo-900/40' },
};

const TrackItem = ({ item, type, pps, trackHeight, color = 'amber', label, isSelected, onSelect }) => {
    const { updateTextOverlay, updateAudioTrack, removeTextOverlay, removeAudioTrack } = useVideoStore();

    const [dragMode, setDragMode] = useState(null); // 'move' | 'resize-left' | 'resize-right'
    const [visualStart, setVisualStart] = useState(null);
    const [visualEnd, setVisualEnd] = useState(null);
    const dragRef = useRef(null);

    const colors = COLOR_MAP[color] || COLOR_MAP.amber;

    const startTime = visualStart !== null ? visualStart : (item.startTime || 0);
    const endTime = visualEnd !== null ? visualEnd : (item.endTime || (item.startTime || 0) + 3);
    const duration = endTime - startTime;

    const left = startTime * pps;
    const width = Math.max(24, duration * pps);
    const itemHeight = trackHeight - 8; // 4px margin top/bottom

    const updateItem = useCallback((id, updates) => {
        if (type === 'text') updateTextOverlay(id, updates);
        else if (type === 'audio') updateAudioTrack(id, updates);
    }, [type, updateTextOverlay, updateAudioTrack]);

    const deleteItem = useCallback((e) => {
        e.stopPropagation();
        if (type === 'text') removeTextOverlay(item.id);
        else if (type === 'audio') removeAudioTrack(item.id);
    }, [type, item.id, removeTextOverlay, removeAudioTrack]);

    // Unified pointer handler
    const handlePointerDown = useCallback((e, mode) => {
        e.stopPropagation();
        e.preventDefault();
        if (onSelect) onSelect();

        const startX = e.clientX;
        const origStart = item.startTime || 0;
        const origEnd = item.endTime || origStart + 3;

        setDragMode(mode);
        dragRef.current = { startX, origStart, origEnd, mode };

        const onMove = (ev) => {
            const dx = ev.clientX - startX;
            const dt = dx / pps;

            if (mode === 'move') {
                const newStart = Math.max(0, origStart + dt);
                const dur = origEnd - origStart;
                setVisualStart(newStart);
                setVisualEnd(newStart + dur);
            } else if (mode === 'resize-left') {
                const newStart = Math.max(0, Math.min(origEnd - 0.2, origStart + dt));
                setVisualStart(newStart);
            } else if (mode === 'resize-right') {
                const newEnd = Math.max(origStart + 0.2, origEnd + dt);
                setVisualEnd(newEnd);
            }
        };

        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);

            // Commit
            const finalStart = visualStart !== null ? visualStart : origStart;
            const finalEnd = visualEnd !== null ? visualEnd : origEnd;

            // Use the latest values from the state updaters
            setVisualStart(vs => {
                setVisualEnd(ve => {
                    const fs = vs !== null ? vs : origStart;
                    const fe = ve !== null ? ve : origEnd;
                    updateItem(item.id, { startTime: fs, endTime: fe });
                    return null;
                });
                return null;
            });

            setDragMode(null);
            dragRef.current = null;
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    }, [pps, item, onSelect, updateItem, visualStart, visualEnd]);

    return (
        <div
            className={`absolute rounded-sm overflow-hidden transition-shadow group
                ${colors.bg} border ${colors.border}
                ${isSelected ? `ring-1 ${colors.ring} ring-offset-1 ring-offset-neutral-950 z-20` : 'z-10'}
                ${dragMode === 'move' ? 'shadow-xl opacity-90 cursor-grabbing z-30' : 'cursor-pointer'}
            `}
            style={{
                left: `${left}px`,
                width: `${width}px`,
                top: '4px',
                height: `${itemHeight}px`,
            }}
            onClick={(e) => { e.stopPropagation(); if (onSelect) onSelect(); }}
        >
            {/* ── Left resize handle ── */}
            <div
                className={`absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-10
                    hover:${colors.handle} transition-colors flex items-center justify-center
                    ${dragMode === 'resize-left' ? colors.handle : ''}`}
                onPointerDown={(e) => handlePointerDown(e, 'resize-left')}
            >
                <div className="w-0.5 h-3 bg-white/20 rounded-full group-hover:bg-white/40" />
            </div>

            {/* ── Content (drag to move) ── */}
            <div
                className="absolute left-2 right-2 top-0 bottom-0 flex items-center gap-1.5 px-1 cursor-grab active:cursor-grabbing overflow-hidden"
                onPointerDown={(e) => handlePointerDown(e, 'move')}
            >
                <GripVertical size={10} className={`${colors.text} opacity-0 group-hover:opacity-50 shrink-0 transition`} />
                <span className={`text-[9px] font-mono ${colors.text} truncate flex-1 pointer-events-none leading-tight`}>
                    {label}
                </span>

                {/* Duration badge */}
                <span className={`text-[7px] font-mono ${colors.text} opacity-50 shrink-0 tabular-nums`}>
                    {duration.toFixed(1)}s
                </span>
            </div>

            {/* ── Right resize handle ── */}
            <div
                className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10
                    hover:${colors.handle} transition-colors flex items-center justify-center
                    ${dragMode === 'resize-right' ? colors.handle : ''}`}
                onPointerDown={(e) => handlePointerDown(e, 'resize-right')}
            >
                <div className="w-0.5 h-3 bg-white/20 rounded-full group-hover:bg-white/40" />
            </div>

            {/* ── Delete button ── */}
            <button
                onClick={deleteItem}
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center
                    bg-neutral-900 border border-neutral-700 rounded-full
                    opacity-0 group-hover:opacity-100 transition-opacity z-20
                    text-neutral-400 hover:text-red-400 hover:border-red-500/50"
            >
                <X size={8} />
            </button>

            {/* ── Drag mode overlay ── */}
            {dragMode && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none z-10">
                    <span className="text-[9px] font-mono text-white/80 tabular-nums font-bold">
                        {dragMode === 'move' ? `${startTime.toFixed(1)}s` : `${duration.toFixed(1)}s`}
                    </span>
                </div>
            )}
        </div>
    );
};

export default TrackItem;
