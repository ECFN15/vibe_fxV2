import React, { useRef } from 'react';
import useVideoStore from '../store/videoStore';

const Playhead = ({ pps, scrollX }) => {
    const { currentTime, totalDuration, seekTo } = useVideoStore();
    const position = currentTime * pps - scrollX;
    const isDragging = useRef(false);

    const handlePointerDown = (e) => {
        e.stopPropagation();
        isDragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (!isDragging.current) return;
        const container = e.currentTarget.closest('.relative');
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left + scrollX;
        const time = Math.max(0, Math.min(totalDuration, x / pps));
        seekTo(time);
    };

    const handlePointerUp = (e) => {
        isDragging.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    if (position < -20 || position > (typeof window !== 'undefined' ? window.innerWidth : 2000)) {
        return null; // Off screen
    }

    return (
        <div
            className="absolute top-0 bottom-0 z-30 pointer-events-none"
            style={{ left: `${position}px` }}
        >
            {/* Head triangle */}
            <div
                className="absolute -top-0.5 left-1/2 -translate-x-1/2 pointer-events-auto cursor-grab active:cursor-grabbing"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                <svg width="14" height="14" viewBox="0 0 14 14" className="drop-shadow-lg">
                    <polygon points="0,0 14,0 14,8 7,14 0,8" fill="#6366f1" />
                </svg>
            </div>
            {/* Vertical line */}
            <div className="w-px h-full bg-indigo-500 mx-auto shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
        </div>
    );
};

export default Playhead;
