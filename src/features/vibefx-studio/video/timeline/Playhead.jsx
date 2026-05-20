import React, { useRef } from 'react';
import useVideoStore from '../store/videoStore';
import { drawTextOverlays } from '../preview/VideoPreview';
import { resolveTimelineRenderPlan } from '../model/timelineModel';

const Playhead = ({ pps, scrollX }) => {
    const { currentTime, totalDuration, seekTo } = useVideoStore();
    const position = currentTime * pps - scrollX;
    const isDragging = useRef(false);
    const rootRef = useRef(null);
    const rafRef = useRef(null);
    const pendingClientX = useRef(null);
    const viewportRef = useRef(null);
    const renderRequestRef = useRef(0);

    const getViewport = (target) => {
        if (viewportRef.current) return viewportRef.current;
        viewportRef.current = target.closest('[data-timeline-viewport]');
        return viewportRef.current;
    };

    const renderScrubFrame = (time) => {
        const state = useVideoStore.getState();
        const engine = state.previewEngine;
        const canvas = state.previewCanvas;
        if (!engine || !canvas) return;

        const requestId = renderRequestRef.current + 1;
        renderRequestRef.current = requestId;
        const plan = resolveTimelineRenderPlan(state);
        const renderPromise = engine.seekAndDraw
            ? engine.seekAndDraw(plan.clips, plan.transitions, time, plan.allTransitions)
            : Promise.resolve(engine.renderFrame(plan.clips, plan.transitions, time, plan.allTransitions));

        renderPromise.then(() => {
            if (requestId !== renderRequestRef.current) return;
            drawTextOverlays(canvas, plan.textOverlays, time, state.selectedTextId);
        }).catch((error) => {
            console.warn('Playhead scrub render failed:', error);
        });

        if (state.isPlaying) {
            engine.syncClipAudio(plan.playbackClips, plan.transitions, time, state.playbackSpeed);
            engine.syncExternalAudio(plan.audioTracks, time, state.playbackSpeed);
        }
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
        renderScrubFrame(time);
    };

    const scheduleScrub = (clientX, target) => {
        pendingClientX.current = clientX;
        if (rafRef.current !== null) return;
        rafRef.current = window.requestAnimationFrame(() => {
            rafRef.current = null;
            scrubToClientX(pendingClientX.current, target);
        });
    };

    const scrubToTime = (time) => {
        const nextTime = Math.max(0, Math.min(totalDuration, time));
        const visualLeft = nextTime * pps - scrollX;

        if (rootRef.current) {
            rootRef.current.style.left = `${visualLeft}px`;
        }

        seekTo(nextTime);
        renderScrubFrame(nextTime);
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

    const handleKeyDown = (e) => {
        const fineStep = e.altKey ? 0.04 : 0.1;
        const step = e.shiftKey ? 1 : fineStep;
        let nextTime = currentTime;

        if (e.key === 'ArrowLeft') nextTime = currentTime - step;
        else if (e.key === 'ArrowRight') nextTime = currentTime + step;
        else if (e.key === 'Home') nextTime = 0;
        else if (e.key === 'End') nextTime = totalDuration;
        else return;

        e.preventDefault();
        e.stopPropagation();
        scrubToTime(nextTime);
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
                className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-11 pointer-events-auto cursor-ew-resize touch-none rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/80"
                aria-label="Deplacer le curseur de timeline"
                role="slider"
                aria-valuemin={0}
                aria-valuemax={Math.round(totalDuration * 10) / 10}
                aria-valuenow={Math.round(currentTime * 10) / 10}
                aria-valuetext={`${Math.round(currentTime * 10) / 10} secondes`}
                tabIndex={0}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onKeyDown={handleKeyDown}
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
