import React, { useRef, useCallback, useEffect, useState } from 'react';
import useVideoStore from '../store/videoStore';
import Clip from './Clip';
import Playhead from './Playhead';
import Ruler from './Ruler';
import TrackItem from './TrackItem';
import { Film, Music, Type, Plus, Sparkles, Volume2, Minus, ZoomIn } from 'lucide-react';

export const PIXELS_PER_SECOND_BASE = 80;
const TRACK_HEADER_WIDTH = 56;
const TIMELINE_MIN_ZOOM = 0.03;
const TRIM_EDGE_HITBOX = 56;

const TRACK_CONFIG = {
    video:  { height: 64,  label: 'Video',  icon: Film,     color: 'indigo',  bgActive: 'bg-indigo-500/5',  borderColor: 'border-indigo-500/20' },
    transitions: { height: 42, label: 'Trans', icon: Sparkles, color: 'purple', bgActive: 'bg-purple-500/5', borderColor: 'border-purple-500/20' },
    text:   { height: 48,  label: 'Texte',  icon: Type,     color: 'amber',   bgActive: 'bg-amber-500/5',   borderColor: 'border-amber-500/20' },
    audio:  { height: 48,  label: 'Audio',  icon: Volume2,  color: 'emerald', bgActive: 'bg-emerald-500/5', borderColor: 'border-emerald-500/20' },
    music:  { height: 48,  label: 'Musique', icon: Music,   color: 'purple',  bgActive: 'bg-purple-500/5',  borderColor: 'border-purple-500/20' },
};

const Timeline = ({ onImportClick }) => {
    const {
        clips, zoom, setZoom, scrollX, setScrollX,
        audioTracks, textOverlays, seekTo, totalDuration,
        transitions, transitionItems, setActivePanel, selectedClipId,
        setSelectedClipId, selectedTextId, setSelectedTextId,
        selectedTransitionId, setSelectedTransitionId,
        currentTime, reorderClips, updateClip
    } = useVideoStore();

    const containerRef = useRef(null);
    const pps = PIXELS_PER_SECOND_BASE * zoom;

    // Compute clip start positions (sequential, accounting for transitions)
    const clipPositions = computeClipPositions(clips, transitions, pps);

    /* ── Scroll / Zoom ── */
    const handleWheel = useCallback((e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const rect = containerRef.current?.getBoundingClientRect();
            const mouseX = e.clientX - (rect?.left || 0) + scrollX;
            const timeAtMouse = mouseX / pps;

            const newZoom = Math.max(TIMELINE_MIN_ZOOM, Math.min(10, zoom + (e.deltaY > 0 ? -0.15 : 0.15)));
            const newPps = PIXELS_PER_SECOND_BASE * newZoom;
            const newScrollX = Math.max(0, timeAtMouse * newPps - (e.clientX - (rect?.left || 0)));

            setZoom(newZoom);
            setScrollX(newScrollX);
        } else {
            setScrollX(Math.max(0, scrollX + e.deltaX + e.deltaY));
        }
    }, [zoom, scrollX, setZoom, setScrollX, pps]);

    /* ── Click on track background = seek ── */
    const handleTrackBgClick = useCallback((e) => {
        if (e.target.dataset.trackBg || e.target.dataset.trackArea) {
            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left - TRACK_HEADER_WIDTH + scrollX;
            const time = Math.max(0, Math.min(totalDuration, x / pps));
            seekTo(time);
            // Deselect all
            setSelectedClipId(null);
            setSelectedTextId(null);
        }
    }, [scrollX, pps, totalDuration, seekTo, setSelectedClipId, setSelectedTextId]);

    /* ── Touch: pinch-zoom + pan ── */
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        let lastDist = 0;
        let lastX = 0;

        const onTouchStart = (e) => {
            if (e.touches.length === 2) lastDist = Math.abs(e.touches[0].clientX - e.touches[1].clientX);
            else lastX = e.touches[0].clientX;
        };
        const onTouchMove = (e) => {
            if (e.touches.length === 2) {
                const d = Math.abs(e.touches[0].clientX - e.touches[1].clientX);
                setZoom(zoom + (d - lastDist) * 0.005);
                lastDist = d;
                e.preventDefault();
            } else {
                const dx = lastX - e.touches[0].clientX;
                setScrollX(Math.max(0, scrollX + dx));
                lastX = e.touches[0].clientX;
            }
        };
        el.addEventListener('touchstart', onTouchStart, { passive: false });
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
        };
    }, [zoom, scrollX, setZoom, setScrollX]);

    /* ── Dimensions ── */
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const contentWidth = Math.max(totalDuration * pps + viewportWidth * 0.5, viewportWidth);
    const totalTrackHeight = Object.values(TRACK_CONFIG).reduce((sum, t) => sum + t.height, 0);

    /* ── Pan drag on background ── */
    const panRef = useRef(null);
    const dragClipIndexRef = useRef(null);
    const previousClipCountRef = useRef(0);
    const [activeTrim, setActiveTrim] = useState(null);

    useEffect(() => {
        const previousClipCount = previousClipCountRef.current;
        previousClipCountRef.current = clips.length;
        if (clips.length <= previousClipCount || totalDuration <= 0) return;

        const trackWidth = containerRef.current?.clientWidth || viewportWidth;
        const availableWidth = Math.max(320, trackWidth - TRACK_HEADER_WIDTH - 48);
        const currentWidth = totalDuration * pps;
        if (currentWidth <= availableWidth * 1.4) return;

        const fittedZoom = Math.max(TIMELINE_MIN_ZOOM, Math.min(1, availableWidth / (totalDuration * PIXELS_PER_SECOND_BASE)));
        setZoom(fittedZoom);
        setScrollX(0);
    }, [clips.length, totalDuration, pps, setZoom, setScrollX, viewportWidth]);

    const handlePanStart = useCallback((e) => {
        if (e.target.dataset.trackBg || e.target.dataset.trackArea) {
            panRef.current = { startX: e.clientX, startScrollX: scrollX };
        }
    }, [scrollX]);
    const handlePanMove = useCallback((e) => {
        if (!panRef.current) return;
        const dx = e.clientX - panRef.current.startX;
        setScrollX(Math.max(0, panRef.current.startScrollX - dx));
    }, [setScrollX]);
    const startClipTrim = useCallback((e, clip, edge) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        dragClipIndexRef.current = null;
        panRef.current = null;
        setSelectedClipId(clip.id);
        setActiveTrim({ clipId: clip.id, edge });

        const startX = e.clientX;
        const startTrimStart = clip.trimStart;
        const startTrimEnd = clip.trimEnd;
        const speed = clip.speed || 1;
        const minDuration = Math.min(0.15, Math.max(0.05, clip.originalDuration / 1000));
        let frameId = null;
        let pendingClientX = e.clientX;

        const applyTrim = () => {
            frameId = null;
            const delta = ((pendingClientX - startX) / pps) * speed;
            if (edge === 'start') {
                const trimStart = Math.max(0, Math.min(startTrimEnd - minDuration, startTrimStart + delta));
                updateClip(clip.id, { trimStart });
            } else {
                const trimEnd = Math.max(startTrimStart + minDuration, Math.min(clip.originalDuration, startTrimEnd + delta));
                updateClip(clip.id, { trimEnd });
            }
        };

        const handleMove = (ev) => {
            pendingClientX = ev.clientX;
            if (frameId === null) frameId = window.requestAnimationFrame(applyTrim);
        };

        const handleUp = (ev) => {
            pendingClientX = ev.clientX;
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
                frameId = null;
            }
            applyTrim();
            setActiveTrim(null);
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
            window.removeEventListener('pointercancel', handleUp);
        };

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        window.addEventListener('pointercancel', handleUp);
    }, [pps, setSelectedClipId, updateClip]);

    const handleClipPointerDown = useCallback((e, index, clip) => {
        if (e.button !== 0) return;
        const trimEdge = e.target.closest('[data-trim-edge]')?.dataset.trimEdge;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const edgeZone = Math.min(TRIM_EDGE_HITBOX, Math.max(28, rect.width * 0.3));

        if (trimEdge === 'start' || x <= edgeZone) {
            startClipTrim(e, clip, 'start');
            return;
        }
        if (trimEdge === 'end' || x >= rect.width - edgeZone) {
            startClipTrim(e, clip, 'end');
            return;
        }

        e.stopPropagation();
        dragClipIndexRef.current = index;

        const handleGlobalPointerUp = (ev) => {
            const fromIndex = dragClipIndexRef.current;
            dragClipIndexRef.current = null;
            const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-clip-index]');
            const targetIndex = target ? Number(target.dataset.clipIndex) : NaN;
            if (Number.isNaN(fromIndex) || Number.isNaN(targetIndex) || fromIndex === targetIndex) return;
            reorderClips(fromIndex, targetIndex);
        };

        window.addEventListener('pointerup', handleGlobalPointerUp, { once: true });
    }, [reorderClips, startClipTrim]);

    const handlePanEnd = useCallback((e) => {
        panRef.current = null;
    }, []);

    return (
        <div className="flex flex-col bg-neutral-950 border-t border-neutral-800 select-none shrink-0">

            {/* ── Ruler ── */}
            <div className="flex h-7 border-b border-neutral-800">
                {/* Header spacer */}
                <div className="w-14 shrink-0 bg-neutral-950 border-r border-neutral-800 flex items-center justify-center">
                    <span className="text-[7px] font-mono text-neutral-700 uppercase">Time</span>
                </div>
                {/* Ruler content */}
                <div className="flex-1 overflow-hidden relative">
                    <Ruler scrollX={scrollX} pps={pps} totalDuration={totalDuration} contentWidth={contentWidth} />
                </div>
            </div>

            {/* ── Tracks container ── */}
            <div
                ref={containerRef}
                className="relative flex"
                style={{ height: `${totalTrackHeight + 4}px` }}
                onWheel={handleWheel}
                onClick={handleTrackBgClick}
                onPointerDown={handlePanStart}
                onPointerMove={handlePanMove}
                onPointerUp={handlePanEnd}
                onPointerLeave={handlePanEnd}
            >
                {/* ── Fixed track headers (left column) ── */}
                <div className="w-14 shrink-0 flex flex-col z-20 bg-neutral-950 border-r border-neutral-800">
                    {Object.entries(TRACK_CONFIG).map(([key, config]) => {
                        const Icon = config.icon;
                        const hasItems = key === 'video' ? clips.length > 0
                            : key === 'transitions' ? transitionItems.length > 0
                            : key === 'text' ? textOverlays.length > 0
                            : key === 'audio' ? false
                            : audioTracks.length > 0;
                        return (
                            <div
                                key={key}
                                className={`flex flex-col items-center justify-center gap-0.5 border-b border-neutral-800/50 cursor-pointer
                                    hover:bg-neutral-900/50 transition ${hasItems ? '' : 'opacity-50'}`}
                                style={{ height: `${config.height}px` }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (key === 'text') setActivePanel('text');
                                    else if (key === 'transitions') setActivePanel('transitions');
                                    else if (key === 'music') setActivePanel('music');
                                    else if (key === 'audio') setActivePanel('audio');
                                    else if (key === 'video') onImportClick?.();
                                }}
                            >
                                <Icon size={13} className={`text-${config.color}-500/70`} />
                                <span className={`text-[7px] font-mono uppercase tracking-wide text-${config.color}-500/50`}>
                                    {config.label}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* ── Scrollable track content ── */}
                <div className="flex-1 overflow-hidden relative">
                    <div
                        className="absolute top-0 left-0 bottom-0"
                        style={{ width: `${contentWidth}px`, transform: `translate3d(-${scrollX}px, 0, 0)` }}
                    >
                        {/* ═══ VIDEO TRACK ═══ */}
                        <div
                            className="relative border-b border-neutral-800/50"
                            style={{ height: `${TRACK_CONFIG.video.height}px` }}
                            data-track-area="video"
                        >
                            <div className="absolute inset-0 bg-indigo-500/[0.02]" data-track-bg="1" />

                            {/* Clips positioned absolutely by their computed start positions */}
                            {clips.map((clip, i) => {
                                const pos = clipPositions[i];
                                return (
                                    <div
                                        key={clip.id}
                                        className="absolute top-1 bottom-1"
                                        style={{ left: `${pos.left}px`, width: `${pos.width}px` }}
                                        data-clip-index={i}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`Clip ${i + 1}: ${clip.name}`}
                                        onPointerDown={(e) => handleClipPointerDown(e, i, clip)}
                                    >
                                        <Clip
                                            clip={clip}
                                            index={i}
                                            activeTrimEdge={activeTrim?.clipId === clip.id ? activeTrim.edge : null}
                                        />

                                        {/* Transition indicator between this and next clip */}
                                        {i < clips.length - 1 && transitions[`${clip.id}->${clips[i+1].id}`] && (
                                            <div
                                                className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-6 flex items-center justify-center
                                                    bg-purple-600/40 border border-purple-500/50 rounded-full cursor-pointer
                                                    hover:bg-purple-600/60 hover:scale-110 transition-all shadow-lg shadow-purple-500/20"
                                                onClick={(e) => { e.stopPropagation(); setActivePanel('transitions'); }}
                                                title={transitions[`${clip.id}->${clips[i+1].id}`].name}
                                            >
                                                <Sparkles size={10} className="text-purple-300" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Add clip button */}
                            {clips.length > 0 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onImportClick?.(); }}
                                    className="absolute top-1 bottom-1 flex items-center justify-center
                                        border border-dashed border-neutral-700/50 hover:border-indigo-500/40
                                        hover:bg-indigo-500/5 rounded-sm transition"
                                    style={{ left: `${(clipPositions[clips.length - 1]?.left || 0) + (clipPositions[clips.length - 1]?.width || 0) + 4}px`, width: '40px' }}
                                >
                                    <Plus size={14} className="text-neutral-600" />
                                </button>
                            )}

                            {/* Empty state */}
                            {clips.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-[9px] font-mono text-neutral-700 uppercase tracking-widest">
                                        Cliquez sur + pour importer une video
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Transition track */}
                        <div
                            className="relative border-b border-neutral-800/50"
                            style={{ height: `${TRACK_CONFIG.transitions.height}px` }}
                            data-track-area="transitions"
                        >
                            <div className="absolute inset-0 bg-purple-500/[0.02]" data-track-bg="1" />

                            {transitionItems.map(item => (
                                <TrackItem
                                    key={item.id}
                                    item={item}
                                    type="transition"
                                    pps={pps}
                                    trackHeight={TRACK_CONFIG.transitions.height}
                                    color="purple"
                                    label={`${item.icon || '*'} ${item.name}`}
                                    isSelected={item.id === selectedTransitionId}
                                    onSelect={() => { setSelectedTransitionId(item.id); setActivePanel('transitions'); }}
                                />
                            ))}

                            {transitionItems.length === 0 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setActivePanel('transitions'); }}
                                    className="absolute inset-0 flex items-center justify-center group"
                                >
                                    <span className="flex items-center gap-1.5 text-[9px] font-mono text-neutral-700 group-hover:text-purple-400/70 transition">
                                        <Plus size={10} /> Ajouter une transition
                                    </span>
                                </button>
                            )}
                        </div>

                        {/* Text track */}
                        <div
                            className="relative border-b border-neutral-800/50"
                            style={{ height: `${TRACK_CONFIG.text.height}px` }}
                            data-track-area="text"
                        >
                            <div className="absolute inset-0 bg-amber-500/[0.02]" data-track-bg="1" />

                            {textOverlays.map(text => (
                                <TrackItem
                                    key={text.id}
                                    item={text}
                                    type="text"
                                    pps={pps}
                                    trackHeight={TRACK_CONFIG.text.height}
                                    color="amber"
                                    label={text.content}
                                    isSelected={text.id === selectedTextId}
                                    onSelect={() => { setSelectedTextId(text.id); setActivePanel('text'); }}
                                />
                            ))}

                            {textOverlays.length === 0 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setActivePanel('text'); }}
                                    className="absolute inset-0 flex items-center justify-center group"
                                >
                                    <span className="flex items-center gap-1.5 text-[9px] font-mono text-neutral-700 group-hover:text-amber-400/60 transition">
                                        <Plus size={10} /> Ajouter du texte
                                    </span>
                                </button>
                            )}
                        </div>

                        {/* ═══ AUDIO TRACK (clip audio) ═══ */}
                        <div
                            className="relative border-b border-neutral-800/50"
                            style={{ height: `${TRACK_CONFIG.audio.height}px` }}
                            data-track-area="audio"
                        >
                            <div className="absolute inset-0 bg-emerald-500/[0.02]" data-track-bg="1" />

                            {/* Audio waveform placeholder for each clip */}
                            {clips.map((clip, i) => {
                                const pos = clipPositions[i];
                                return (
                                    <div
                                        key={clip.id}
                                        className={`absolute top-1 bottom-1 rounded-sm overflow-hidden cursor-pointer transition-all
                                            ${selectedClipId === clip.id ? 'ring-1 ring-emerald-500/50' : ''}`}
                                        style={{ left: `${pos.left}px`, width: `${pos.width}px` }}
                                        onClick={(e) => { e.stopPropagation(); setSelectedClipId(clip.id); setActivePanel('audio'); }}
                                    >
                                        <div className="w-full h-full bg-emerald-900/20 border border-emerald-700/20 rounded-sm flex items-center px-2 relative overflow-hidden">
                                            {/* Fake waveform visualization */}
                                            <div className="absolute inset-0 flex items-center justify-center gap-px opacity-40">
                                                {Array.from({ length: Math.min(80, Math.floor(pos.width / 3)) }, (_, j) => (
                                                    <div
                                                        key={j}
                                                        className="w-0.5 bg-emerald-500/60 rounded-full shrink-0"
                                                        style={{ height: `${12 + Math.sin(j * 0.5 + i) * 10 + Math.random() * 8}px` }}
                                                    />
                                                ))}
                                            </div>
                                            <div className="relative z-10 flex items-center gap-1.5">
                                                <Volume2 size={9} className="text-emerald-400/50" />
                                                <span className="text-[8px] font-mono text-emerald-400/60 truncate">{clip.name}</span>
                                            </div>
                                            {/* Volume indicator */}
                                            <span className="absolute right-1.5 top-1 text-[7px] font-mono text-emerald-500/40">
                                                {clip.volume}%
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ═══ MUSIC TRACK ═══ */}
                        <div
                            className="relative"
                            style={{ height: `${TRACK_CONFIG.music.height}px` }}
                            data-track-area="music"
                        >
                            <div className="absolute inset-0 bg-purple-500/[0.02]" data-track-bg="1" />

                            {audioTracks.map(track => (
                                <TrackItem
                                    key={track.id}
                                    item={track}
                                    type="audio"
                                    pps={pps}
                                    trackHeight={TRACK_CONFIG.music.height}
                                    color="purple"
                                    label={track.name}
                                    isSelected={false}
                                    onSelect={() => setActivePanel('audio')}
                                />
                            ))}

                            {audioTracks.length === 0 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setActivePanel('music'); }}
                                    className="absolute inset-0 flex items-center justify-center group"
                                >
                                    <span className="flex items-center gap-1.5 text-[9px] font-mono text-neutral-700 group-hover:text-purple-400/60 transition">
                                        <Plus size={10} /> Ajouter de la musique
                                    </span>
                                </button>
                            )}
                        </div>

                    </div>

                    {/* ── Playhead (above everything) ── */}
                    <Playhead pps={pps} scrollX={scrollX} />

                    {/* ── Current time indicator line across all tracks ── */}
                    <div
                        className="absolute top-0 bottom-0 w-px bg-indigo-500/30 pointer-events-none z-10"
                        style={{ left: `${currentTime * pps - scrollX}px` }}
                    />
                </div>
            </div>

            {/* ── Bottom bar: zoom + info ── */}
            <div className="flex items-center justify-between px-3 h-6 border-t border-neutral-800/50 bg-neutral-950">
                <div className="flex items-center gap-2">
                    <span className="text-[8px] font-mono text-neutral-600 uppercase">
                        {clips.length} clip{clips.length !== 1 ? 's' : ''} / {transitionItems.length} transition{transitionItems.length !== 1 ? 's' : ''} / {textOverlays.length} texte{textOverlays.length !== 1 ? 's' : ''} / {audioTracks.length} piste{audioTracks.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setZoom(Math.max(TIMELINE_MIN_ZOOM, zoom - 0.3))}
                        className="w-5 h-5 flex items-center justify-center text-neutral-600 hover:text-white transition rounded-sm hover:bg-neutral-800"
                    >
                        <Minus size={10} />
                    </button>
                    <div className="w-20 h-1 bg-neutral-800 rounded-full relative">
                        <div
                            className="absolute top-0 left-0 h-full bg-indigo-500/40 rounded-full"
                            style={{ width: `${Math.min(100, (zoom / 5) * 100)}%` }}
                        />
                        <input
                            type="range"
                            min={TIMELINE_MIN_ZOOM}
                            max={5}
                            step={0.01}
                            value={zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="absolute inset-0 w-full opacity-0 cursor-pointer"
                        />
                    </div>
                    <button
                        onClick={() => setZoom(Math.min(10, zoom + 0.3))}
                        className="w-5 h-5 flex items-center justify-center text-neutral-600 hover:text-white transition rounded-sm hover:bg-neutral-800"
                    >
                        <ZoomIn size={10} />
                    </button>
                    <span className="text-[8px] font-mono text-neutral-600 tabular-nums w-8 text-center">{zoom.toFixed(1)}x</span>
                </div>
            </div>
        </div>
    );
};

/** Compute absolute pixel positions for each clip */
function computeClipPositions(clips, transitions, pps) {
    const positions = [];
    let currentLeft = 0;

    for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const clipDur = (clip.trimEnd - clip.trimStart) / (clip.speed || 1);
        const width = clipDur * pps;

        positions.push({ left: currentLeft, width, duration: clipDur });

        // Account for transition overlap with next clip
        let overlapPx = 0;
        if (i < clips.length - 1) {
            const key = `${clip.id}->${clips[i + 1].id}`;
            const tr = transitions[key];
            if (tr) overlapPx = (tr.duration || 0) * pps;
        }

        currentLeft += width - overlapPx + 2; // 2px gap between clips
    }

    return positions;
}

export default Timeline;
