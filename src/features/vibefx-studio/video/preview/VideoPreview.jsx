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

function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}

function easeOutCubic(value) {
    return 1 - Math.pow(1 - clamp01(value), 3);
}

function resolvePreviewFrameRate(presetFps, sourceFpsMax, requestedFrameRate) {
    if (requestedFrameRate === 'auto') return null;
    const requested = Number(requestedFrameRate);
    if (Number.isFinite(requested) && requested > 0) return Math.min(60, Math.max(1, Math.round(requested)));
    const base = Number.isFinite(Number(presetFps)) ? Number(presetFps) : 30;
    const source = Number.isFinite(Number(sourceFpsMax)) ? Number(sourceFpsMax) : 0;
    return Math.min(60, Math.max(base, source || base));
}

function drawTrackedText(ctx, text, x, y, tracking = 0) {
    if (!tracking) {
        ctx.fillText(text, x, y);
        return;
    }
    const chars = Array.from(text);
    const widths = chars.map(char => ctx.measureText(char).width);
    const totalWidth = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, chars.length - 1) * tracking;
    let cursor = x - totalWidth / 2;
    ctx.textAlign = 'left';
    chars.forEach((char, index) => {
        ctx.fillText(char, cursor, y);
        cursor += widths[index] + tracking;
    });
    ctx.textAlign = 'center';
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
        const introProgress = clamp01(progress / fadeLen);
        const outroProgress = clamp01((progress - (1 - fadeLen)) / fadeLen);
        const introEase = easeOutCubic(introProgress);
        const outroEase = easeOutCubic(outroProgress);
        if (text.animation === 'fade' || text.animation === 'none') {
            if (text.animation === 'fade') {
                if (progress < fadeLen) alpha = introProgress;
            }
        } else if (text.animation === 'scale') {
            if (progress < fadeLen) alpha = introProgress;
        } else if (['slide-up', 'slide-down', 'reveal-up', 'wipe-mask', 'neon-scan', 'tracking-in', 'letter-pop'].includes(text.animation)) {
            if (progress < fadeLen) alpha = introProgress;
        } else if (text.animation === 'typewriter') {
            // typewriter: reveal chars progressively in first 30%
            alpha = 1;
        } else if (text.animation === 'blur-in') {
            if (progress < fadeLen) alpha = introProgress;
        }

        // Animation alpha (out)
        if (text.animationOut === 'fade' || !text.animationOut) {
            if (progress > 1 - fadeLen) alpha = Math.min(alpha, (1 - progress) / fadeLen);
        } else if (text.animationOut !== 'none' && progress > 1 - fadeLen) {
            alpha = Math.min(alpha, 1 - outroProgress);
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
        let rotation = 0;
        let tracking = 0;
        let clipMask = null;
        let glitchOffset = 0;

        if (text.animation === 'scale' && progress < 0.2) {
            scale = 0.5 + easeOutCubic(progress / 0.2) * 0.5;
        }
        if (text.animation === 'slide-up' && progress < 0.15) {
            py += (1 - introEase) * fontSize * 2;
        }
        if (text.animation === 'slide-down' && progress < 0.15) {
            py -= (1 - introEase) * fontSize * 2;
        }
        if (text.animation === 'reveal-up' && progress < 0.2) {
            py += (1 - easeOutCubic(progress / 0.2)) * fontSize * 1.25;
            clipMask = { x: px - fontSize * 8, y: py - fontSize * 0.72, width: fontSize * 16, height: fontSize * 1.7 };
        }
        if (text.animation === 'wipe-mask' && progress < 0.22) {
            const reveal = easeOutCubic(progress / 0.22);
            clipMask = { x: px - fontSize * 8, y: py - fontSize, width: fontSize * 16 * reveal, height: fontSize * 2 };
        }
        if (text.animation === 'neon-scan' && progress < 0.24) {
            tracking = (1 - easeOutCubic(progress / 0.24)) * fontSize * 0.18;
        }
        if (text.animation === 'tracking-in' && progress < 0.3) {
            tracking = (1 - easeOutCubic(progress / 0.3)) * fontSize * 0.42;
        }
        if (text.animation === 'letter-pop' && progress < 0.18) {
            scale = 0.72 + easeOutCubic(progress / 0.18) * 0.28;
            rotation = (1 - easeOutCubic(progress / 0.18)) * -0.05;
        }

        if (progress > 1 - fadeLen) {
            if (text.animationOut === 'slide-up') py -= outroEase * fontSize * 2;
            if (text.animationOut === 'slide-down') py += outroEase * fontSize * 2;
            if (text.animationOut === 'scale') scale = Math.max(0.2, 1 - outroEase * 0.45);
            if (text.animationOut === 'wipe-out') {
                clipMask = { x: px - fontSize * 8, y: py - fontSize, width: fontSize * 16 * (1 - outroEase), height: fontSize * 2 };
            }
            if (text.animationOut === 'glitch-out') {
                glitchOffset = Math.sin(outroEase * Math.PI * 10) * fontSize * 0.16;
                rotation = Math.sin(outroEase * Math.PI * 6) * 0.015;
            }
        }

        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
        ctx.fillStyle = text.color || '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = Math.round(fontSize * 0.15);
        ctx.shadowOffsetY = Math.round(fontSize * 0.05);
        if (text.animation === 'blur-in' && progress < 0.2) {
            ctx.filter = `blur(${Math.round((1 - easeOutCubic(progress / 0.2)) * 10)}px)`;
        }

        if (clipMask) {
            ctx.beginPath();
            ctx.rect(clipMask.x, clipMask.y, clipMask.width, clipMask.height);
            ctx.clip();
        }

        if (scale !== 1 || rotation !== 0) {
            ctx.translate(px, py);
            ctx.rotate(rotation);
            ctx.scale(scale, scale);
            px = 0;
            py = 0;
        }

        let displayText = text.content || '';
        if (text.animation === 'typewriter' && progress < 0.3) {
            const charCount = Math.floor((progress / 0.3) * displayText.length);
            displayText = displayText.slice(0, charCount);
        }

        drawTrackedText(ctx, displayText, px + glitchOffset, py, tracking);

        if (text.animation === 'neon-scan' && progress < 0.35) {
            const scan = easeOutCubic(progress / 0.35);
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = Math.round(fontSize * 0.5);
            ctx.strokeStyle = `rgba(0,229,255,${1 - scan})`;
            ctx.lineWidth = Math.max(2, fontSize * 0.04);
            ctx.beginPath();
            ctx.moveTo(px - fontSize * 6 + fontSize * 12 * scan, py - fontSize);
            ctx.lineTo(px - fontSize * 6 + fontSize * 12 * scan, py + fontSize);
            ctx.stroke();
            ctx.restore();
        }

        if (text.animationOut === 'glitch-out' && progress > 1 - fadeLen) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = Math.max(0, 1 - outroProgress) * 0.45;
            ctx.fillStyle = '#00e5ff';
            drawTrackedText(ctx, displayText, px - glitchOffset * 1.6, py, tracking);
            ctx.fillStyle = '#ff315f';
            drawTrackedText(ctx, displayText, px + glitchOffset * 1.6, py, tracking);
            ctx.restore();
        }

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
    const lastPlaybackStoreUpdateRef = useRef(0);

    const {
        clips, transitions, transitionItems, isPlaying, totalDuration,
        playbackSpeed, setCurrentTime, textOverlays,
        selectedTextId, setSelectedTextId, updateTextOverlay,
        audioTracks, tracks, setPreviewCanvas, setPreviewEngine, sequencePreset,
        filterPreviewBypassClipId, exportFrameRate
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
    const sourceFpsMax = useMemo(() => {
        const fpsValues = renderClips
            .map((clip) => Number(clip.sourceFrameRate || clip.importFrameRate || 0))
            .filter((fps) => Number.isFinite(fps) && fps > 0);
        return fpsValues.length ? Math.min(60, Math.max(...fpsValues.map((fps) => Math.round(fps)))) : 0;
    }, [renderClips]);
    const previewFrameRate = useMemo(() => (
        resolvePreviewFrameRate(preset.fps, sourceFpsMax, exportFrameRate)
    ), [exportFrameRate, preset.fps, sourceFpsMax]);

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
                (t, options = {}) => {
                    const now = performance.now();
                    if (options.force || now - lastPlaybackStoreUpdateRef.current >= 90) {
                        lastPlaybackStoreUpdateRef.current = now;
                        setCurrentTime(t);
                    }
                    if (canvasRef.current) {
                        const state = useVideoStore.getState();
                        const plan = resolveTimelineRenderPlan(state);
                        drawTextOverlays(canvasRef.current, plan.textOverlays, t, state.selectedTextId);
                    }
                },
                totalDuration,
                playbackSpeed,
                renderAudioTracks,
                renderTransitions,
                { previewFrameRate }
            );
        } else {
            engineRef.current.stopPlayback();
        }
        return () => { engineRef.current?.stopPlayback(); };
    }, [isPlaying, renderClips.length, playbackClips, transitions, renderTransitions, totalDuration, playbackSpeed, renderAudioTracks, previewFrameRate, setCurrentTime]);

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
            canvasRef.current.width = Math.round(preset.width);
            canvasRef.current.height = Math.round(preset.height);
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
                className={`max-w-full max-h-full transition-opacity duration-300 ${!hasContent ? 'opacity-0' : 'opacity-100'} bg-black`}
                style={{
                    aspectRatio: `${preset.width} / ${preset.height}`,
                    cursor: isDraggingText ? 'grabbing' : (selectedTextId ? 'grab' : 'default'),
                    imageRendering: 'auto',
                }}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerCancel={handleCanvasPointerUp}
            />

            {hasContent && showSafeArea && canvasCssSize.width > 0 && (
                <div
                    data-testid="video-safe-area-overlay"
                    className="absolute pointer-events-none"
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
