import React, { useRef } from 'react';
import useVideoStore from '../store/videoStore';
import { drawTextOverlays } from '../preview/VideoPreview';

const Playhead = ({ pps, scrollX }) => {
    const { currentTime, totalDuration, seekTo } = useVideoStore();
    const position = currentTime * pps - scrollX;
    const isDragging = useRef(false);
    const rootRef = useRef(null);
    const rafRef = useRef(null);
    const pendingClientX = useRef(null);
    const viewportRef = useRef(null);

    const getViewport = (target) => {
        if (viewportRef.current) return viewportRef.current;
        viewportRef.current = target.closest('[data-timeline-viewport]');
        return viewportRef.current;
    };

    const scrubToClientX = (clientX, target) => {
        const viewport = getViewport(target);
        if (!viewport) return;

        const rect = viewport.getBoundingClientRect();
        const x = clientX - rect.left + scrollX;
        const time = Math.max(0, Math.min(totalDuration, x / pps));
        const visualLeft = time * pps - scrollX;

        if (rootRef.current) {
            rootRef.current.style.left = `${visualLeft}px`;
        }

        seekTo(time);

        const state = useVideoStore.getState();
        const engine = state.previewEngine;
        const canvas = state.previewCanvas;
        if (engine && canvas) {
            engine.renderFrame(state.clips, state.transitions, time, state.transitionItems);
            drawTextOverlays(canvas, state.textOverlays, time, state.selectedTextId);
            if (state.isPlaying) {
                engine.syncClipAudio(state.clips, state.transitions, time, state.playbackSpeed);
                engine.syncExternalAudio(state.audioTracks, time, state.playbackSpeed);
            }
        }
    };

    const scheduleScrub = (clientX, target) => {
        pendingClientX.current = clientX;
        if (rafRef.current !== null) return;
        rafRef.current = window.requestAnimationFrame(() => {
            rafRef.current = null;
            scrubToClientX(pendingClientX.current, target);
        });
    };

    const handlePointerDown = (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        isDragging.current = true;
        viewportRef.current = getViewport(e.currentTarget);
        e.currentTarget.setPointerCapture?.(e.pointerId);
        document.body.style.userSelect = 'none';
        scheduleScrub(e.clientX, e.currentTarget);
    };

    const handlePointerMove = (e) => {
        if (!isDragging.current) return;
        e.preventDefault();
        scheduleScrub(e.clientX, e.currentTarget);
    };

    const handlePointerUp = (e) => {
        if (!isDragging.current) return;
        e.preventDefault();
        isDragging.current = false;
        if (rafRef.current !== null) {
            window.cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        scrubToClientX(e.clientX, e.currentTarget);
        e.currentTarget.releasePointerCapture?.(e.pointerId);
        document.body.style.userSelect = '';
        viewportRef.current = null;
    };

    if (position < -20 || position > (typeof window !== 'undefined' ? window.innerWidth : 2000)) {
        return null; // Off screen
    }

    return (
        <div
            ref={rootRef}
            className="absolute top-0 bottom-0 z-30 pointer-events-none"
            style={{ left: `${position}px` }}
            data-testid="timeline-playhead"
        >
            {/* Full-height hitbox: the playhead can be grabbed from the line, not only the small head. */}
            <div
                className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-5 pointer-events-auto cursor-ew-resize touch-none"
                aria-label="Deplacer le curseur de timeline"
                role="slider"
                aria-valuemin={0}
                aria-valuemax={Math.round(totalDuration * 10) / 10}
                aria-valuenow={Math.round(currentTime * 10) / 10}
                tabIndex={0}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            />
            {/* Head triangle */}
            <div
                className="absolute -top-0.5 left-1/2 -translate-x-1/2 pointer-events-auto cursor-grab active:cursor-grabbing touch-none"
                aria-hidden="true"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
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
