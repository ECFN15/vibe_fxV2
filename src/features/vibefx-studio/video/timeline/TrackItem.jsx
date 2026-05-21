import React, { useRef, useState, useCallback } from 'react';
import useVideoStore from '../store/videoStore';
import { X, GripVertical } from 'lucide-react';
import { DEFAULT_SNAP_THRESHOLD_SECONDS, snapTimelineRange } from '../model/timelineModel';

const COLOR_MAP = {
    amber:   { bg: 'bg-amber-900/30',   border: 'border-amber-600/30',   text: 'text-amber-400/80',   ring: 'ring-amber-500',   handle: 'bg-amber-500/60',   hoverBg: 'hover:bg-amber-900/40' },
    emerald: { bg: 'bg-emerald-900/30',  border: 'border-emerald-600/30', text: 'text-emerald-400/80', ring: 'ring-emerald-500', handle: 'bg-emerald-500/60', hoverBg: 'hover:bg-emerald-900/40' },
    purple:  { bg: 'bg-purple-900/30',   border: 'border-purple-600/30',  text: 'text-purple-400/80',  ring: 'ring-purple-500',  handle: 'bg-purple-500/60',  hoverBg: 'hover:bg-purple-900/40' },
    indigo:  { bg: 'bg-indigo-900/30',   border: 'border-indigo-600/30',  text: 'text-indigo-400/80',  ring: 'ring-indigo-500',  handle: 'bg-indigo-500/60',  hoverBg: 'hover:bg-indigo-900/40' },
};

const TrackItem = ({
    item,
    type,
    pps,
    trackHeight,
    color = 'amber',
    label,
    isSelected,
    isLocked = false,
    snapEnabled = false,
    snapPoints = [],
    snapThreshold = DEFAULT_SNAP_THRESHOLD_SECONDS,
    maxEnd = 0,
    onSnapPreview,
    onSelect
}) => {
    const {
        updateTimelineItem,
        removeTextOverlay, removeAudioTrack, removeTransitionItem,
        beginHistoryTransaction, commitHistoryTransaction,
        notifyTimelineEditRejected
    } = useVideoStore();

    const [dragMode, setDragMode] = useState(null); // 'move' | 'resize-left' | 'resize-right'
    const [visualStart, setVisualStart] = useState(null);
    const [visualEnd, setVisualEnd] = useState(null);
    const dragRef = useRef(null);
    const visualStartRef = useRef(null);
    const visualEndRef = useRef(null);

    const colors = COLOR_MAP[color] || COLOR_MAP.amber;

    const startTime = visualStart !== null ? visualStart : (item.startTime || 0);
    const endTime = visualEnd !== null ? visualEnd : (item.endTime || (item.startTime || 0) + 3);
    const duration = endTime - startTime;

    const left = startTime * pps;
    const width = Math.max(24, duration * pps);
    const itemHeight = trackHeight - 8; // 4px margin top/bottom
    const waveformPeaks = Array.isArray(item.waveform?.peaks) ? item.waveform.peaks : [];

    const deleteItem = useCallback((e) => {
        e.stopPropagation();
        if (isLocked) return;
        if (type === 'text') removeTextOverlay(item.id);
        else if (type === 'audio') removeAudioTrack(item.id);
        else if (type === 'transition') removeTransitionItem(item.id);
    }, [type, item.id, isLocked, removeTextOverlay, removeAudioTrack, removeTransitionItem]);

    // Unified pointer handler
    const handlePointerDown = useCallback((e, mode) => {
        e.stopPropagation();
        e.preventDefault();
        if (isLocked) {
            if (onSelect) onSelect();
            notifyTimelineEditRejected('track-locked', 'Piste verrouillee: edition ignoree.');
            return;
        }
        if (onSelect) onSelect();
        beginHistoryTransaction(`${type}-${mode}-${item.id}`);

        const startX = e.clientX;
        const origStart = item.startTime || 0;
        const origEnd = item.endTime || origStart + 3;
        const duration = Math.max(0.2, origEnd - origStart);
        const timelineEnd = Math.max(maxEnd || 0, origEnd, origStart + duration);
        const minDuration = 0.2;
        const captureTarget = e.currentTarget;

        if (captureTarget.setPointerCapture && !captureTarget.hasPointerCapture?.(e.pointerId)) {
            captureTarget.setPointerCapture(e.pointerId);
        }

        setDragMode(mode);
        visualStartRef.current = null;
        visualEndRef.current = null;
        dragRef.current = { startX, origStart, origEnd, mode };

        const onMove = (ev) => {
            ev.preventDefault();
            const dx = ev.clientX - startX;
            const dt = dx / pps;
            let nextStart = origStart;
            let nextEnd = origEnd;

            if (mode === 'move') {
                nextStart = Math.max(0, Math.min(timelineEnd - duration, origStart + dt));
                nextEnd = nextStart + duration;
            } else if (mode === 'resize-left') {
                nextStart = Math.max(0, Math.min(origEnd - minDuration, origStart + dt));
                nextEnd = origEnd;
            } else if (mode === 'resize-right') {
                nextStart = origStart;
                nextEnd = Math.max(origStart + minDuration, Math.min(timelineEnd, origEnd + dt));
            }

            const snapped = snapEnabled ? snapTimelineRange({
                start: nextStart,
                end: nextEnd,
                mode,
                points: snapPoints,
                threshold: snapThreshold,
                totalDuration: timelineEnd,
                minDuration,
            }) : { start: nextStart, end: nextEnd, snap: null };

            visualStartRef.current = snapped.start;
            visualEndRef.current = snapped.end;
            setVisualStart(snapped.start);
            setVisualEnd(snapped.end);
            onSnapPreview?.(snapped.snap ? {
                time: snapped.snap.time,
                label: snapped.snap.point?.label || `${snapped.snap.time.toFixed(2)}s`,
                type: snapped.snap.point?.type || 'marker',
            } : null);
        };

        const onUp = (ev) => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            if (captureTarget.releasePointerCapture && captureTarget.hasPointerCapture?.(ev.pointerId)) {
                captureTarget.releasePointerCapture(ev.pointerId);
            }

            const finalStart = visualStartRef.current !== null ? visualStartRef.current : origStart;
            const finalEnd = visualEndRef.current !== null ? visualEndRef.current : origEnd;
            visualStartRef.current = null;
            visualEndRef.current = null;
            setVisualStart(null);
            setVisualEnd(null);
            updateTimelineItem(item.id, { startTime: finalStart, endTime: finalEnd });
            commitHistoryTransaction();
            onSnapPreview?.(null);

            setDragMode(null);
            dragRef.current = null;
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
    }, [beginHistoryTransaction, commitHistoryTransaction, notifyTimelineEditRejected, pps, item, isLocked, maxEnd, onSelect, onSnapPreview, snapEnabled, snapPoints, snapThreshold, type, updateTimelineItem]);

    return (
        <div
            data-track-item-type={type}
            data-track-item-start={startTime.toFixed(3)}
            data-track-item-duration={duration.toFixed(3)}
            data-waveform-status={type === 'audio' ? (item.waveform?.status || 'missing') : undefined}
            data-testid={`${type}-track-item-${item.id}`}
            className={`absolute rounded-sm overflow-hidden transition-shadow group
                ${colors.bg} border ${colors.border}
                ${isSelected ? `ring-1 ${colors.ring} ring-offset-1 ring-offset-neutral-950 z-20` : 'z-10'}
                ${dragMode === 'move' ? 'shadow-xl opacity-90 cursor-grabbing z-30' : isLocked ? 'cursor-not-allowed opacity-65' : 'cursor-pointer'}
            `}
            style={{
                left: `${left}px`,
                width: `${width}px`,
                top: '4px',
                height: `${itemHeight}px`,
            }}
            onClick={(e) => { e.stopPropagation(); if (onSelect) onSelect(); }}
        >
            {type === 'audio' && (
                <div
                    data-testid={`audio-waveform-${item.id}`}
                    data-waveform-status={item.waveform?.status || 'missing'}
                    className="absolute inset-x-2 top-1 bottom-1 flex items-center gap-px opacity-55 pointer-events-none"
                    aria-hidden="true"
                >
                    {(waveformPeaks.length ? waveformPeaks : Array.from({ length: 48 }, () => 0.18)).map((peak, index) => (
                        <span
                            key={`${item.id}-wave-${index}`}
                            className={`min-w-0 flex-1 rounded-full ${item.waveform?.status === 'ready' ? 'bg-emerald-300/70' : 'bg-neutral-500/35'}`}
                            style={{ height: `${Math.max(3, Math.round(peak * (itemHeight - 8)))}px` }}
                        />
                    ))}
                </div>
            )}

            {/* ── Left resize handle ── */}
            {!isLocked && <div
                className={`absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-10
                    hover:${colors.handle} transition-colors flex items-center justify-center
                    ${dragMode === 'resize-left' ? colors.handle : ''}`}
                onPointerDown={(e) => handlePointerDown(e, 'resize-left')}
            >
                <div className="w-0.5 h-3 bg-white/20 rounded-full group-hover:bg-white/40" />
            </div>}

            {/* ── Content (drag to move) ── */}
            <div
                className={`absolute left-2 right-2 top-0 bottom-0 flex items-center gap-1.5 px-1 overflow-hidden ${isLocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
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
            {!isLocked && <div
                className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10
                    hover:${colors.handle} transition-colors flex items-center justify-center
                    ${dragMode === 'resize-right' ? colors.handle : ''}`}
                onPointerDown={(e) => handlePointerDown(e, 'resize-right')}
            >
                <div className="w-0.5 h-3 bg-white/20 rounded-full group-hover:bg-white/40" />
            </div>}

            {/* ── Delete button ── */}
            {!isLocked && <button
                onClick={deleteItem}
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center
                    bg-neutral-900 border border-neutral-700 rounded-full
                    opacity-0 group-hover:opacity-100 transition-opacity z-20
                    text-neutral-400 hover:text-red-400 hover:border-red-500/50"
            >
                <X size={8} />
            </button>}

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
