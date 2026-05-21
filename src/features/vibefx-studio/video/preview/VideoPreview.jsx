import React, { useRef, useEffect, useLayoutEffect, useCallback, useMemo, useState } from 'react';
import useVideoStore from '../store/videoStore';
import { EXPORT_PRESETS, PlaybackEngine } from '../engine/VideoEngine';
import { resolveTimelineRenderPlan } from '../model/timelineModel';

// Load Google Font dynamically
const loadedFonts = new Set();
export function loadGoogleFont(fontName) {
    if (typeof document === 'undefined') return;
    if (loadedFonts.has(fontName)) return;
    loadedFonts.add(fontName);
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;700;900&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
}

// Draw text overlays on canvas
export function drawTextOverlays(canvas, textOverlays, currentTime, selectedTextId) {
    if (!canvas || !textOverlays || textOverlays.length === 0) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    textOverlays.forEach(text => {
        if (currentTime < text.startTime || currentTime > text.endTime) return;

        const totalDur = Math.max(0.01, text.endTime - text.startTime);
        const progress = (currentTime - text.startTime) / totalDur;

        // Animation alpha (in)
        let alpha = 1;
        const fadeLen = 0.15;
        if (text.animation === 'fade' || text.animation === 'none') {
            if (text.animation === 'fade') {
                if (progress < fadeLen) alpha = progress / fadeLen;
            }
        } else if (text.animation === 'scale') {
            if (progress < fadeLen) alpha = progress / fadeLen;
        } else if (text.animation === 'slide-up' || text.animation === 'slide-down') {
            if (progress < fadeLen) alpha = progress / fadeLen;
        } else if (text.animation === 'typewriter') {
            // typewriter: reveal chars progressively in first 30%
            alpha = 1;
        } else if (text.animation === 'blur-in') {
            if (progress < fadeLen) alpha = progress / fadeLen;
        }

        // Animation alpha (out)
        if (text.animationOut === 'fade' || !text.animationOut) {
            if (progress > 1 - fadeLen) alpha = Math.min(alpha, (1 - progress) / fadeLen);
        }

        const fontSize = Math.round((text.fontSize || 48) * (w / 1920));
        const fontWeight = text.bold ? '700' : '400';
        const fontStyle = text.italic ? 'italic' : 'normal';
        const fontFamily = text.font || 'Inter';

        loadGoogleFont(fontFamily);

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

        // Animation transforms
        let px = (text.x ?? 0.5) * w;
        let py = (text.y ?? 0.5) * h;
        let scale = 1;

        if (text.animation === 'scale' && progress < 0.2) {
            scale = 0.5 + (progress / 0.2) * 0.5;
        }
        if (text.animation === 'slide-up' && progress < 0.15) {
            py += (1 - progress / 0.15) * fontSize * 2;
        }
        if (text.animation === 'slide-down' && progress < 0.15) {
            py -= (1 - progress / 0.15) * fontSize * 2;
        }

        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
        ctx.fillStyle = text.color || '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = Math.round(fontSize * 0.15);
        ctx.shadowOffsetY = Math.round(fontSize * 0.05);

        if (scale !== 1) {
            ctx.translate(px, py);
            ctx.scale(scale, scale);
            px = 0;
            py = 0;
        }

        let displayText = text.content || '';
        if (text.animation === 'typewriter' && progress < 0.3) {
            const charCount = Math.floor((progress / 0.3) * displayText.length);
            displayText = displayText.slice(0, charCount);
        }

        ctx.fillText(displayText, px, py);

        // Selection indicator
        if (text.id === selectedTextId) {
            const metrics = ctx.measureText(text.content || '');
            const textW = metrics.width;
            const textH = fontSize * 1.2;
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 2;
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.setLineDash([4, 4]);
            const rx = scale !== 1 ? -textW / 2 - 8 : px - textW / 2 - 8;
            const ry = scale !== 1 ? -textH / 2 - 4 : py - textH / 2 - 4;
            ctx.strokeRect(rx, ry, textW + 16, textH + 8);
            ctx.setLineDash([]);
        }

        ctx.restore();
    });
}

// Draw position guides
function drawGuides(canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.save();
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    // Center cross
    ctx.beginPath();
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.stroke();
    // Thirds
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
    ctx.beginPath();
    ctx.moveTo(w / 3, 0); ctx.lineTo(w / 3, h);
    ctx.moveTo(2 * w / 3, 0); ctx.lineTo(2 * w / 3, h);
    ctx.moveTo(0, h / 3); ctx.lineTo(w, h / 3);
    ctx.moveTo(0, 2 * h / 3); ctx.lineTo(w, 2 * h / 3);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
}

const DEFAULT_FILTERS = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    temperature: 0,
    vignette: 0,
    grain: 0,
};

function applyFilterPreviewBypass(clips = [], clipId = null) {
    if (!clipId) return clips;
    return clips.map(clip => (
        clip.id === clipId || clip.sourceId === clipId
            ? { ...clip, filters: DEFAULT_FILTERS, params: { ...(clip.params || {}), filters: DEFAULT_FILTERS } }
            : clip
    ));
}

const VideoPreview = () => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const engineRef = useRef(null);
    const [isDraggingText, setIsDraggingText] = useState(false);
    const [showGuides, setShowGuides] = useState(false);
    const [canvasCssSize, setCanvasCssSize] = useState({ width: 0, height: 0 });
    const dragRef = useRef(null);
    const renderRequestRef = useRef(0);

    const {
        clips, transitions, transitionItems, isPlaying, totalDuration,
        playbackSpeed, setCurrentTime, textOverlays,
        selectedTextId, setSelectedTextId, updateTextOverlay,
        audioTracks, tracks, setPreviewCanvas, setPreviewEngine, sequencePreset,
        filterPreviewBypassClipId
    } = useVideoStore();
    const preset = EXPORT_PRESETS[sequencePreset] || EXPORT_PRESETS.youtube;
    const renderPlan = useMemo(() => resolveTimelineRenderPlan({
        clips,
        transitions,
        transitionItems,
        textOverlays,
        audioTracks,
        tracks,
        totalDuration,
    }), [audioTracks, clips, textOverlays, totalDuration, tracks, transitions, transitionItems]);
    const renderClips = useMemo(() => applyFilterPreviewBypass(renderPlan.clips, filterPreviewBypassClipId), [filterPreviewBypassClipId, renderPlan.clips]);
    const renderTransitions = renderPlan.allTransitions;
    const renderTextOverlays = renderPlan.textOverlays;
    const renderAudioTracks = renderPlan.audioTracks;
    const playbackClips = useMemo(() => applyFilterPreviewBypass(renderPlan.playbackClips, filterPreviewBypassClipId), [filterPreviewBypassClipId, renderPlan.playbackClips]);

    // Init PlaybackEngine
    useEffect(() => {
        if (!canvasRef.current) return;
        setPreviewCanvas(canvasRef.current);
        engineRef.current = new PlaybackEngine(canvasRef.current);
        setPreviewEngine(engineRef.current);
        return () => {
            setPreviewCanvas(null);
            setPreviewEngine(null);
            engineRef.current?.dispose();
        };
    }, [setPreviewCanvas, setPreviewEngine]);

    // Load clips and render
    useEffect(() => {
        if (!engineRef.current || renderClips.length === 0) return;
        
        // Load all clips, then render current frame
        // Use allSettled so we always render even if some clips fail
        Promise.allSettled([
            ...renderClips.map(clip => engineRef.current.loadClip(clip)),
            ...renderAudioTracks.map(track => engineRef.current.loadAudioTrack(track)),
        ]).then(async () => {
            if (!engineRef.current || !canvasRef.current) return;
            const time = useVideoStore.getState().currentTime;
            const state = useVideoStore.getState();
            const plan = resolveTimelineRenderPlan(state);
            const clipsForPreview = applyFilterPreviewBypass(plan.clips, state.filterPreviewBypassClipId);
            await engineRef.current.seekAndDraw(clipsForPreview, plan.transitions, time, plan.allTransitions);
            drawTextOverlays(canvasRef.current, plan.textOverlays, time, state.selectedTextId);
        }).catch(err => {
            console.warn('Failed to load clips:', err);
            // Still render the frame even on error
            if (engineRef.current && canvasRef.current) {
                const time = useVideoStore.getState().currentTime;
                const state = useVideoStore.getState();
                const plan = resolveTimelineRenderPlan(state);
                const clipsForPreview = applyFilterPreviewBypass(plan.clips, state.filterPreviewBypassClipId);
                engineRef.current.renderFrame(clipsForPreview, plan.transitions, time, plan.allTransitions);
            }
        });
    }, [renderAudioTracks, renderClips]);

    // Play/pause
    useEffect(() => {
        if (!engineRef.current || renderClips.length === 0) return;
        if (isPlaying) {
            engineRef.current.startPlayback(
                playbackClips, transitions,
                () => useVideoStore.getState().currentTime,
                (t) => {
                    setCurrentTime(t);
                    if (canvasRef.current) {
                        const state = useVideoStore.getState();
                        const plan = resolveTimelineRenderPlan(state);
                        drawTextOverlays(canvasRef.current, plan.textOverlays, t, state.selectedTextId);
                    }
                },
                totalDuration,
                playbackSpeed,
                renderAudioTracks,
                renderTransitions
            );
        } else {
            engineRef.current.stopPlayback();
        }
        return () => { engineRef.current?.stopPlayback(); };
    }, [isPlaying, renderClips.length, playbackClips, transitions, renderTransitions, totalDuration, playbackSpeed, renderAudioTracks, setCurrentTime]);

    // Render on seek
    useEffect(() => {
        const renderCurrentTime = async (time) => {
            const requestId = renderRequestRef.current + 1;
            renderRequestRef.current = requestId;
            if (!engineRef.current || isPlaying) return;
            if (renderClips.length === 0 && canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            } else {
                await engineRef.current.seekAndDraw(renderClips, transitions, time, renderTransitions);
            }
            if (requestId !== renderRequestRef.current) return;
            if (canvasRef.current) {
                drawTextOverlays(canvasRef.current, renderTextOverlays, time, selectedTextId);
                if (showGuides && selectedTextId) drawGuides(canvasRef.current);
            }
        };

        renderCurrentTime(useVideoStore.getState().currentTime);

        const unsub = useVideoStore.subscribe((state, prevState) => {
            if ((state.currentTime !== prevState.currentTime || state.clips !== prevState.clips || state.transitionItems !== prevState.transitionItems || state.textOverlays !== prevState.textOverlays || state.audioTracks !== prevState.audioTracks || state.selectedTextId !== prevState.selectedTextId || state.tracks !== prevState.tracks || state.filterPreviewBypassClipId !== prevState.filterPreviewBypassClipId) && !state.isPlaying) {
                requestAnimationFrame(() => { renderCurrentTime(state.currentTime); });
            }
        });

        return unsub;
    }, [isPlaying, renderClips, transitions, renderTransitions, renderTextOverlays, selectedTextId, showGuides]);

    // Resize canvas
    useLayoutEffect(() => {
        if (!containerRef.current || !canvasRef.current) return;

        const resize = () => {
            const container = containerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            const aspect = preset.width / preset.height;
            let w = rect.width;
            let h = w / aspect;
            if (h > rect.height) { h = rect.height; w = h * aspect; }
            canvasRef.current.width = Math.round(w * window.devicePixelRatio);
            canvasRef.current.height = Math.round(h * window.devicePixelRatio);
            canvasRef.current.style.width = `${Math.round(w)}px`;
            canvasRef.current.style.height = `${Math.round(h)}px`;
            setCanvasCssSize({ width: Math.round(w), height: Math.round(h) });

            if (!isPlaying) {
                const time = useVideoStore.getState().currentTime;
                if (renderClips.length === 0) {
                    const ctx = canvasRef.current.getContext('2d');
                    ctx.fillStyle = 'black';
                    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                } else if (engineRef.current) {
                    engineRef.current.seekAndDraw(renderClips, transitions, time, renderTransitions).then(() => {
                        if (canvasRef.current) drawTextOverlays(canvasRef.current, renderTextOverlays, time, selectedTextId);
                    });
                    return;
                }
                drawTextOverlays(canvasRef.current, renderTextOverlays, time, selectedTextId);
            }
        };

        const observer = new ResizeObserver(() => resize());
        observer.observe(containerRef.current);
        resize();
        return () => observer.disconnect();
    }, [isPlaying, renderClips, transitions, renderTransitions, renderTextOverlays, selectedTextId, preset.width, preset.height]);

    // Text drag on canvas
    const getCanvasCoords = useCallback((e) => {
        if (!canvasRef.current) return { x: 0.5, y: 0.5 };
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width)),
            y: Math.max(0.05, Math.min(0.95, (e.clientY - rect.top) / rect.height)),
        };
    }, []);

    const handleCanvasPointerDown = useCallback((e) => {
        const coords = getCanvasCoords(e);
        const currentTime = useVideoStore.getState().currentTime;
        const state = useVideoStore.getState();
        const overlays = resolveTimelineRenderPlan(state).textOverlays;

        // Find text under cursor
        let found = null;
        for (let i = overlays.length - 1; i >= 0; i--) {
            const t = overlays[i];
            if (currentTime < t.startTime || currentTime > t.endTime) continue;
            const dx = Math.abs(coords.x - (t.x ?? 0.5));
            const dy = Math.abs(coords.y - (t.y ?? 0.5));
            // Approximate hit area based on font size
            const hitW = 0.15 + (t.fontSize / 1920) * 2;
            const hitH = 0.05 + (t.fontSize / 1080);
            if (dx < hitW && dy < hitH) {
                found = t;
                break;
            }
        }

        if (found) {
            setSelectedTextId(found.id);
            setIsDraggingText(true);
            setShowGuides(true);
            dragRef.current = { id: found.id, offsetX: coords.x - (found.x ?? 0.5), offsetY: coords.y - (found.y ?? 0.5) };
            e.currentTarget.setPointerCapture?.(e.pointerId);
            e.preventDefault();
        } else {
            setSelectedTextId(null);
            setShowGuides(false);
        }
    }, [getCanvasCoords, setSelectedTextId]);

    const handleCanvasPointerMove = useCallback((e) => {
        if (!isDraggingText || !dragRef.current) return;
        const coords = getCanvasCoords(e);
        let newX = coords.x - dragRef.current.offsetX;
        let newY = coords.y - dragRef.current.offsetY;

        // Snap to center
        if (Math.abs(newX - 0.5) < 0.02) newX = 0.5;
        if (Math.abs(newY - 0.5) < 0.02) newY = 0.5;
        // Snap to thirds
        if (Math.abs(newX - 0.333) < 0.02) newX = 0.333;
        if (Math.abs(newX - 0.667) < 0.02) newX = 0.667;
        if (Math.abs(newY - 0.333) < 0.02) newY = 0.333;
        if (Math.abs(newY - 0.667) < 0.02) newY = 0.667;

        newX = Math.max(0.05, Math.min(0.95, newX));
        newY = Math.max(0.05, Math.min(0.95, newY));

        updateTextOverlay(dragRef.current.id, { x: newX, y: newY });
    }, [isDraggingText, getCanvasCoords, updateTextOverlay]);

    const handleCanvasPointerUp = useCallback((e) => {
        if (isDraggingText) {
            setIsDraggingText(false);
            setTimeout(() => setShowGuides(false), 500);
            dragRef.current = null;
            e.currentTarget.releasePointerCapture?.(e.pointerId);
        }
    }, [isDraggingText]);

    const hasContent = renderPlan.hasVisibleContent;
    const showSafeArea = preset.height >= preset.width;

    return (
        <div ref={containerRef} className="relative flex-1 flex items-center justify-center bg-black overflow-hidden group">
            <canvas
                ref={canvasRef}
                className={`max-w-full max-h-full transition-opacity duration-300 ${!hasContent ? 'opacity-0' : 'opacity-100'} ring-1 ring-neutral-800/30 shadow-2xl bg-black rounded-sm`}
                style={{
                    aspectRatio: `${preset.width} / ${preset.height}`,
                    cursor: isDraggingText ? 'grabbing' : (selectedTextId ? 'grab' : 'default'),
                }}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerCancel={handleCanvasPointerUp}
            />

            {hasContent && showSafeArea && canvasCssSize.width > 0 && (
                <div
                    data-testid="video-safe-area-overlay"
                    className="absolute pointer-events-none rounded-sm border border-cyan-300/35"
                    style={{
                        width: `${canvasCssSize.width}px`,
                        height: `${canvasCssSize.height}px`,
                    }}
                    aria-hidden="true"
                >
                    <div className="absolute left-[7%] right-[7%] top-[7%] bottom-[12%] border border-dashed border-cyan-300/40 rounded-sm" />
                    <div className="absolute left-[12%] right-[12%] top-[10%] h-[9%] border border-dashed border-amber-300/35 rounded-sm" />
                    <div className="absolute left-[10%] right-[10%] bottom-[8%] h-[14%] border border-dashed border-amber-300/35 rounded-sm" />
                    <span className="absolute left-2 top-2 rounded-sm border border-cyan-300/30 bg-black/65 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest text-cyan-200/80">
                        Safe areas
                    </span>
                </div>
            )}

            {!hasContent && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-neutral-600 pointer-events-none">
                    <div className="w-20 h-20 border border-dashed border-neutral-800 flex items-center justify-center ring-1 ring-inset ring-neutral-900 group-hover:border-neutral-700 transition-colors">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                            <polygon points="5,3 19,12 5,21" />
                        </svg>
                    </div>
                    <p className="text-[10px] font-mono uppercase tracking-widest group-hover:text-neutral-500 transition-colors">Importer du contenu</p>
                </div>
            )}
        </div>
    );
};

export default VideoPreview;
