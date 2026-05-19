import React, { useRef, useEffect, useLayoutEffect, useCallback, useState } from 'react';
import useVideoStore from '../store/videoStore';
import { PlaybackEngine } from '../engine/VideoEngine';

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

const VideoPreview = () => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const engineRef = useRef(null);
    const [isDraggingText, setIsDraggingText] = useState(false);
    const [showGuides, setShowGuides] = useState(false);
    const dragRef = useRef(null);

    const {
        clips, transitions, transitionItems, isPlaying, totalDuration,
        playbackSpeed, setCurrentTime, textOverlays,
        selectedTextId, setSelectedTextId, updateTextOverlay,
        audioTracks, setPreviewCanvas, setPreviewEngine
    } = useVideoStore();

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
        if (!engineRef.current || clips.length === 0) return;
        
        // Load all clips, then render current frame
        // Use allSettled so we always render even if some clips fail
        Promise.allSettled([
            ...clips.map(clip => engineRef.current.loadClip(clip)),
            ...audioTracks.map(track => engineRef.current.loadAudioTrack(track)),
        ]).then(() => {
            if (!engineRef.current || !canvasRef.current) return;
            const time = useVideoStore.getState().currentTime;
            const { transitions, transitionItems } = useVideoStore.getState();
            engineRef.current.renderFrame(clips, transitions, time, transitionItems);
            const { textOverlays, selectedTextId } = useVideoStore.getState();
            drawTextOverlays(canvasRef.current, textOverlays, time, selectedTextId);
        }).catch(err => {
            console.warn('Failed to load clips:', err);
            // Still render the frame even on error
            if (engineRef.current && canvasRef.current) {
                const time = useVideoStore.getState().currentTime;
                engineRef.current.renderFrame(clips, useVideoStore.getState().transitions, time, useVideoStore.getState().transitionItems);
            }
        });
    }, [clips, audioTracks]);

    // Play/pause
    useEffect(() => {
        if (!engineRef.current || clips.length === 0) return;
        if (isPlaying) {
            engineRef.current.startPlayback(
                clips, transitions,
                () => useVideoStore.getState().currentTime,
                (t) => {
                    setCurrentTime(t);
                    if (canvasRef.current) {
                        drawTextOverlays(canvasRef.current, useVideoStore.getState().textOverlays, t, useVideoStore.getState().selectedTextId);
                    }
                },
                totalDuration,
                playbackSpeed,
                audioTracks,
                transitionItems
            );
        } else {
            engineRef.current.stopPlayback();
        }
        return () => { engineRef.current?.stopPlayback(); };
    }, [isPlaying, clips, transitions, transitionItems, totalDuration, playbackSpeed, audioTracks, setCurrentTime]);

    // Render on seek
    useEffect(() => {
        const renderCurrentTime = (time) => {
            if (!engineRef.current || isPlaying) return;
            if (clips.length === 0 && canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            } else {
                engineRef.current.seekTo(clips, transitions, time, transitionItems);
            }
            if (canvasRef.current) {
                drawTextOverlays(canvasRef.current, textOverlays, time, selectedTextId);
                if (showGuides && selectedTextId) drawGuides(canvasRef.current);
            }
        };

        renderCurrentTime(useVideoStore.getState().currentTime);

        const unsub = useVideoStore.subscribe((state, prevState) => {
            if ((state.currentTime !== prevState.currentTime || state.transitionItems !== prevState.transitionItems || state.textOverlays !== prevState.textOverlays || state.selectedTextId !== prevState.selectedTextId) && !state.isPlaying) {
                requestAnimationFrame(() => renderCurrentTime(state.currentTime));
            }
        });

        return unsub;
    }, [isPlaying, clips, transitions, transitionItems, textOverlays, selectedTextId, showGuides]);

    // Resize canvas
    useLayoutEffect(() => {
        if (!containerRef.current || !canvasRef.current) return;

        const resize = () => {
            const container = containerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            const aspect = 16 / 9;
            let w = rect.width;
            let h = w / aspect;
            if (h > rect.height) { h = rect.height; w = h * aspect; }
            canvasRef.current.width = Math.round(w * window.devicePixelRatio);
            canvasRef.current.height = Math.round(h * window.devicePixelRatio);
            canvasRef.current.style.width = `${Math.round(w)}px`;
            canvasRef.current.style.height = `${Math.round(h)}px`;

            if (!isPlaying) {
                const time = useVideoStore.getState().currentTime;
                if (clips.length === 0) {
                    const ctx = canvasRef.current.getContext('2d');
                    ctx.fillStyle = 'black';
                    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                } else if (engineRef.current) {
                    engineRef.current.seekTo(clips, transitions, time, transitionItems);
                }
                drawTextOverlays(canvasRef.current, textOverlays, time, selectedTextId);
            }
        };

        const observer = new ResizeObserver(() => resize());
        observer.observe(containerRef.current);
        resize();
        return () => observer.disconnect();
    }, [isPlaying, clips, transitions, transitionItems, textOverlays, selectedTextId]);

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
        const overlays = useVideoStore.getState().textOverlays;

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

    const handleCanvasPointerUp = useCallback(() => {
        if (isDraggingText) {
            setIsDraggingText(false);
            setTimeout(() => setShowGuides(false), 500);
            dragRef.current = null;
        }
    }, [isDraggingText]);

    const hasContent = clips.length > 0 || textOverlays.length > 0;

    return (
        <div ref={containerRef} className="relative flex-1 flex items-center justify-center bg-black overflow-hidden group">
            <canvas
                ref={canvasRef}
                className={`max-w-full max-h-full aspect-video transition-opacity duration-300 ${!hasContent ? 'opacity-0' : 'opacity-100'} ring-1 ring-neutral-800/30 shadow-2xl bg-black rounded-sm`}
                style={{ cursor: isDraggingText ? 'grabbing' : (selectedTextId ? 'grab' : 'default') }}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerLeave={handleCanvasPointerUp}
            />

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
