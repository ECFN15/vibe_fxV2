import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import useVideoStore from '../store/videoStore';
import Clip from './Clip';
import Playhead from './Playhead';
import Ruler from './Ruler';
import TrackItem from './TrackItem';
import { Eye, EyeOff, Film, Lock, Magnet, Music, Type, Plus, Sparkles, Volume2, VolumeX, Minus, Unlock, ZoomIn } from 'lucide-react';
import { buildTimelineModel, buildTimelineSnapPoints, DEFAULT_SNAP_THRESHOLD_SECONDS } from '../model/timelineModel';

export const PIXELS_PER_SECOND_BASE = 80;
const TRACK_HEADER_WIDTH = 74;
const TIMELINE_MIN_ZOOM = 0.03;
const TRIM_EDGE_HITBOX = 56;

const TRACK_CONFIG = {
    video:  { id: 'video-main', height: 64,  label: 'Video',  icon: Film,     color: 'indigo',  bgActive: 'bg-indigo-500/5',  borderColor: 'border-indigo-500/20', canMute: false },
    transitions: { id: 'transition-main', height: 52, label: 'Effet', icon: Sparkles, color: 'purple', bgActive: 'bg-purple-500/5', borderColor: 'border-purple-500/20', canMute: false },
    text:   { id: 'text-main', height: 48,  label: 'Texte',  icon: Type,     color: 'amber',   bgActive: 'bg-amber-500/5',   borderColor: 'border-amber-500/20', canMute: false },
    audio:  { id: 'audio-main', height: 48,  label: 'Audio',  icon: Volume2,  color: 'emerald', bgActive: 'bg-emerald-500/5', borderColor: 'border-emerald-500/20', canHide: false },
    music:  { id: 'music-main', height: 48,  label: 'Musique', icon: Music,   color: 'purple',  bgActive: 'bg-purple-500/5',  borderColor: 'border-purple-500/20', canHide: false },
};

const Timeline = ({ onImportClick }) => {
    const {
        clips, zoom, setZoom, scrollX, setScrollX,
        audioTracks, textOverlays, seekTo, totalDuration,
        transitions, transitionItems, setActivePanel, selectedClipId,
        setSelectedClipId, selectedTextId, setSelectedTextId,
        selectedTransitionId, setSelectedTransitionId,
        selectedAudioTrackId, setSelectedAudioTrackId,
        currentTime, reorderClips, updateClip,
        updateTimelineItem,
        tracks, setTrackState, snapEnabled, setSnapEnabled,
        beginHistoryTransaction, commitHistoryTransaction
    } = useVideoStore();

    const containerRef = useRef(null);
    const pps = PIXELS_PER_SECOND_BASE * zoom;

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
            setSelectedTransitionId(null);
            setSelectedAudioTrackId(null);
        }
    }, [scrollX, pps, totalDuration, seekTo, setSelectedClipId, setSelectedTextId, setSelectedTransitionId, setSelectedAudioTrackId]);

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

    /* ── Pan drag on background ── */
    const panRef = useRef(null);
    const dragClipIndexRef = useRef(null);
    const previousClipCountRef = useRef(0);
    const [activeTrim, setActiveTrim] = useState(null);
    const [dropIndicatorIndex, setDropIndicatorIndex] = useState(null);
    const [snapPreview, setSnapPreview] = useState(null);
    const timelineModel = useMemo(() => buildTimelineModel({
        clips,
        transitions,
        transitionItems,
        textOverlays,
        audioTracks,
        tracks,
        totalDuration,
    }), [audioTracks, clips, textOverlays, totalDuration, tracks, transitions, transitionItems]);
    const videoLaneItems = useMemo(() => (
        timelineModel.items
            .filter(item => item.type === 'video' && item.trackId === TRACK_CONFIG.video.id)
            .map(hydrateTimelineItem)
    ), [timelineModel]);
    const transitionLaneItems = useMemo(() => (
        timelineModel.items
            .filter(item => item.type === 'transition' && item.trackId === TRACK_CONFIG.transitions.id)
            .filter(item => item.params?.placement !== 'cut')
            .map(hydrateTimelineItem)
    ), [timelineModel]);
    const textLaneItems = useMemo(() => (
        timelineModel.items
            .filter(item => item.type === 'text' && item.trackId === TRACK_CONFIG.text.id)
            .map(hydrateTimelineItem)
    ), [timelineModel]);
    const musicLaneItems = useMemo(() => (
        timelineModel.items
            .filter(item => item.type === 'audio' && item.trackId === TRACK_CONFIG.music.id)
            .map(hydrateTimelineItem)
    ), [timelineModel]);
    const selectedClip = videoLaneItems.find(clip => clip.id === selectedClipId) || null;
    const selectedTransition = transitionLaneItems.find(item => item.id === selectedTransitionId) || null;
    const selectedText = textLaneItems.find(item => item.id === selectedTextId) || null;
    const selectedAudioTrack = musicLaneItems.find(item => item.id === selectedAudioTrackId) || null;
    const selectedTimelineItem = useMemo(() => {
        if (selectedTransition) return { kind: 'transition', item: selectedTransition, label: 'Transition' };
        if (selectedText) return { kind: 'text', item: selectedText, label: 'Texte' };
        if (selectedAudioTrack) return { kind: 'audio', item: selectedAudioTrack, label: 'Musique' };
        return null;
    }, [selectedAudioTrack, selectedText, selectedTransition]);
    const snapPoints = useMemo(() => buildTimelineSnapPoints({
        clips,
        transitions,
        totalDuration,
        currentTime,
    }), [clips, transitions, totalDuration, currentTime]);
    const snapThresholdSeconds = useMemo(() => (
        Math.max(DEFAULT_SNAP_THRESHOLD_SECONDS, 12 / Math.max(pps, 1))
    ), [pps]);
    const trackById = useMemo(() => Object.fromEntries(tracks.map(track => [track.id, track])), [tracks]);
    const getTrackState = useCallback((key) => trackById[TRACK_CONFIG[key].id] || {
        locked: false,
        muted: false,
        visible: true,
    }, [trackById]);
    const isTrackVisible = useCallback((key) => getTrackState(key).visible !== false, [getTrackState]);
    const isTrackMuted = useCallback((key) => getTrackState(key).muted === true, [getTrackState]);
    const isTrackLocked = useCallback((key) => getTrackState(key).locked === true, [getTrackState]);
    const selectedTimelineItemLocked = selectedTimelineItem ? isTrackLocked(
        selectedTimelineItem.kind === 'transition' ? 'transitions' : selectedTimelineItem.kind === 'audio' ? 'music' : selectedTimelineItem.kind
    ) : false;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const contentWidth = Math.max(totalDuration * pps + viewportWidth * 0.5, viewportWidth);
    const totalTrackHeight = Object.values(TRACK_CONFIG).reduce((sum, t) => sum + t.height, 0);

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
        if (e.currentTarget.setPointerCapture && !e.currentTarget.hasPointerCapture?.(e.pointerId)) {
            e.currentTarget.setPointerCapture(e.pointerId);
        }
        dragClipIndexRef.current = null;
        panRef.current = null;

        const startX = e.clientX;
        const startTrimStart = clip.trimStart;
        const startTrimEnd = clip.trimEnd;
        const speed = clip.speed || 1;
        const minDuration = Math.min(0.15, Math.max(0.05, clip.originalDuration / 1000));
        let frameId = null;
        let pendingClientX = e.clientX;
        const captureTarget = e.currentTarget;
        const previousCursor = document.body.style.cursor;
        const previousUserSelect = document.body.style.userSelect;

        setSelectedClipId(clip.id);
        setSelectedTextId(null);
        setSelectedTransitionId(null);
        setSelectedAudioTrackId(null);
        beginHistoryTransaction(`trim-clip-${clip.id}`);
        setActiveTrim({ clipId: clip.id, edge });
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';

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
            ev.preventDefault();
            pendingClientX = ev.clientX;
            if (frameId === null) frameId = window.requestAnimationFrame(applyTrim);
        };

        const handleUp = (ev) => {
            ev.preventDefault();
            pendingClientX = ev.clientX;
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
                frameId = null;
            }
            applyTrim();
            setActiveTrim(null);
            commitHistoryTransaction();
            if (captureTarget.releasePointerCapture && captureTarget.hasPointerCapture?.(ev.pointerId)) {
                captureTarget.releasePointerCapture(ev.pointerId);
            }
            document.body.style.cursor = previousCursor;
            document.body.style.userSelect = previousUserSelect;
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
            window.removeEventListener('pointercancel', handleUp);
            window.removeEventListener('dragstart', handleDragStart, true);
        };

        const handleDragStart = (ev) => {
            ev.preventDefault();
        };

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        window.addEventListener('pointercancel', handleUp);
        window.addEventListener('dragstart', handleDragStart, true);
    }, [beginHistoryTransaction, commitHistoryTransaction, pps, setSelectedAudioTrackId, setSelectedClipId, setSelectedTextId, setSelectedTransitionId, updateClip]);

    const handleClipPointerDown = useCallback((e, index, clip) => {
        if (e.button !== 0) return;
        if (isTrackLocked('video')) {
            e.stopPropagation();
            return;
        }
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
        setDropIndicatorIndex(index);

        const handleGlobalPointerUp = (ev) => {
            const fromIndex = dragClipIndexRef.current;
            dragClipIndexRef.current = null;
            const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-clip-index]');
            const targetIndex = target ? Number(target.dataset.clipIndex) : NaN;
            setDropIndicatorIndex(null);
            window.removeEventListener('pointermove', handleGlobalPointerMove);
            window.removeEventListener('pointercancel', handleGlobalPointerCancel);
            if (Number.isNaN(fromIndex) || Number.isNaN(targetIndex) || fromIndex === targetIndex) return;
            reorderClips(fromIndex, targetIndex);
        };

        const handleGlobalPointerMove = (ev) => {
            const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-clip-index]');
            const targetIndex = target ? Number(target.dataset.clipIndex) : NaN;
            if (!Number.isNaN(targetIndex)) setDropIndicatorIndex(targetIndex);
        };

        const handleGlobalPointerCancel = () => {
            dragClipIndexRef.current = null;
            setDropIndicatorIndex(null);
            window.removeEventListener('pointermove', handleGlobalPointerMove);
        };

        window.addEventListener('pointermove', handleGlobalPointerMove);
        window.addEventListener('pointercancel', handleGlobalPointerCancel, { once: true });
        window.addEventListener('pointerup', handleGlobalPointerUp, { once: true });
    }, [isTrackLocked, reorderClips, startClipTrim]);

    const handlePanEnd = useCallback((e) => {
        panRef.current = null;
    }, []);

    const updateSelectedClipTimecode = useCallback((field, value) => {
        if (!selectedClip) return;
        if (isTrackLocked('video')) return;
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return;
        const minDuration = 0.15;
        if (field === 'trimStart') {
            updateClip(selectedClip.id, {
                trimStart: Math.max(0, Math.min(selectedClip.trimEnd - minDuration, numeric)),
            });
        } else if (field === 'trimEnd') {
            updateClip(selectedClip.id, {
                trimEnd: Math.max(selectedClip.trimStart + minDuration, Math.min(selectedClip.originalDuration, numeric)),
            });
        }
    }, [isTrackLocked, selectedClip, updateClip]);

    const updateSelectedTimelineItemTimecode = useCallback((field, value) => {
        if (!selectedTimelineItem) return;
        const lockedKey = selectedTimelineItem.kind === 'transition' ? 'transitions' : selectedTimelineItem.kind === 'audio' ? 'music' : selectedTimelineItem.kind;
        if (isTrackLocked(lockedKey)) return;
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return;

        const { item } = selectedTimelineItem;
        const start = Number(item.startTime || 0);
        const end = Number(item.endTime || start + (item.duration || 0.5));
        const duration = Math.max(0.1, end - start);
        const maxEnd = Math.max(0.1, totalDuration || end || duration);
        let nextStart = start;
        let nextEnd = end;

        if (field === 'startTime') {
            nextStart = Math.max(0, Math.min(maxEnd - 0.1, numeric));
            nextEnd = Math.min(maxEnd, nextStart + duration);
        } else if (field === 'duration') {
            nextEnd = Math.min(maxEnd, nextStart + Math.max(0.1, numeric));
        }

        const updates = {
            start: nextStart,
            startTime: nextStart,
            endTime: nextEnd,
            duration: Math.max(0.1, nextEnd - nextStart),
        };

        updateTimelineItem(item.id, updates, { history: true });
    }, [isTrackLocked, selectedTimelineItem, totalDuration, updateTimelineItem]);

    return (
        <div className="flex flex-col bg-neutral-950 border-t border-neutral-800 select-none shrink-0">

            {/* ── Ruler ── */}
            <div className="flex h-7 border-b border-neutral-800">
                {/* Header spacer */}
                <div className="w-[74px] shrink-0 bg-neutral-950 border-r border-neutral-800 flex items-center justify-center">
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
                <div className="w-[74px] shrink-0 flex flex-col z-20 bg-neutral-950 border-r border-neutral-800">
                    {Object.entries(TRACK_CONFIG).map(([key, config]) => {
                        const Icon = config.icon;
                        const track = getTrackState(key);
                        const visible = track.visible !== false;
                        const muted = track.muted === true;
                        const locked = track.locked === true;
                        const hasItems = key === 'video' ? videoLaneItems.length > 0
                            : key === 'transitions' ? transitionLaneItems.length > 0
                            : key === 'text' ? textLaneItems.length > 0
                            : key === 'audio' ? false
                            : musicLaneItems.length > 0;
                        return (
                            <div
                                key={key}
                                className={`flex flex-col items-center justify-center gap-0.5 border-b border-neutral-800/50 cursor-pointer
                                    hover:bg-neutral-900/50 transition ${hasItems ? '' : 'opacity-50'} ${!visible || muted ? 'bg-neutral-900/70' : ''}`}
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
                                <div className="mt-0.5 flex items-center gap-0.5">
                                    {config.canHide !== false && (
                                        <button
                                            type="button"
                                            aria-label={`${visible ? 'Masquer' : 'Afficher'} piste ${config.label}`}
                                            data-testid={`track-${config.id}-visible`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTrackState(config.id, { visible: !visible });
                                            }}
                                            className={`grid h-4 w-4 place-items-center rounded-sm border border-neutral-800 ${visible ? 'text-neutral-500 hover:text-white' : 'text-red-300 bg-red-500/10'}`}
                                        >
                                            {visible ? <Eye size={9} /> : <EyeOff size={9} />}
                                        </button>
                                    )}
                                    {config.canMute !== false && (
                                        <button
                                            type="button"
                                            aria-label={`${muted ? 'Activer le son' : 'Muter'} piste ${config.label}`}
                                            data-testid={`track-${config.id}-mute`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTrackState(config.id, { muted: !muted });
                                            }}
                                            className={`grid h-4 w-4 place-items-center rounded-sm border border-neutral-800 ${muted ? 'text-amber-300 bg-amber-500/10' : 'text-neutral-500 hover:text-white'}`}
                                        >
                                            {muted ? <VolumeX size={9} /> : <Volume2 size={9} />}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        aria-label={`${locked ? 'Deverrouiller' : 'Verrouiller'} piste ${config.label}`}
                                        data-testid={`track-${config.id}-lock`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setTrackState(config.id, { locked: !locked });
                                        }}
                                        className={`grid h-4 w-4 place-items-center rounded-sm border border-neutral-800 ${locked ? 'text-cyan-300 bg-cyan-500/10' : 'text-neutral-500 hover:text-white'}`}
                                    >
                                        {locked ? <Lock size={9} /> : <Unlock size={9} />}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Scrollable track content ── */}
                <div className="flex-1 overflow-hidden relative" data-timeline-viewport="1">
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
                            {videoLaneItems.map((clip, i) => {
                                return (
                                    <div
                                        key={clip.id}
                                        className={`absolute top-1 bottom-1 ${isTrackLocked('video') ? 'opacity-65 cursor-not-allowed' : ''} ${!isTrackVisible('video') ? 'opacity-45' : ''}`}
                                        style={{ left: `${clip.start * pps}px`, width: `${Math.max(24, clip.duration * pps)}px` }}
                                        data-clip-index={i}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`Clip ${i + 1}: ${clip.name}`}
                                        draggable={false}
                                        onDragStart={(e) => e.preventDefault()}
                                        onPointerDown={(e) => handleClipPointerDown(e, i, clip)}
                                    >
                                        <Clip
                                            clip={clip}
                                            index={i}
                                            activeTrimEdge={activeTrim?.clipId === clip.id ? activeTrim.edge : null}
                                        />

                                    </div>
                                );
                            })}

                            {dropIndicatorIndex !== null && (
                                <div
                                    data-testid="timeline-drop-indicator"
                                    className="absolute top-0 bottom-0 z-30 w-0.5 bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.7)] pointer-events-none"
                                    style={{ left: `${(videoLaneItems[dropIndicatorIndex]?.start || 0) * pps}px` }}
                                >
                                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-sm border border-cyan-400/30 bg-neutral-950 px-1.5 py-0.5 text-[7px] font-mono uppercase tracking-widest text-cyan-200">
                                        Drop
                                    </span>
                                </div>
                            )}

                            {/* Add clip button */}
                            {videoLaneItems.length > 0 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onImportClick?.(); }}
                                    className="absolute top-1 bottom-1 flex items-center justify-center
                                        border border-dashed border-neutral-700/50 hover:border-indigo-500/40
                                        hover:bg-indigo-500/5 rounded-sm transition"
                                    style={{ left: `${((videoLaneItems.at(-1)?.start || 0) + (videoLaneItems.at(-1)?.duration || 0)) * pps + 4}px`, width: '40px' }}
                                >
                                    <Plus size={14} className="text-neutral-600" />
                                </button>
                            )}

                            {/* Empty state */}
                            {videoLaneItems.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-[9px] font-mono text-neutral-700 uppercase tracking-widest">
                                        Cliquez sur + pour importer une video
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Effect track */}
                        <div
                            className="relative border-y border-purple-500/20 bg-purple-950/[0.06] shadow-[inset_0_1px_0_rgba(168,85,247,0.12),inset_0_-1px_0_rgba(168,85,247,0.10)]"
                            style={{ height: `${TRACK_CONFIG.transitions.height}px` }}
                            data-track-area="transitions"
                            aria-label="Timeline effets de transition"
                        >
                            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(168,85,247,0.05)_1px,transparent_1px)] bg-[length:16px_100%]" data-track-bg="1" />
                            <div className="absolute left-2 top-1.5 z-0 rounded-sm border border-purple-500/20 bg-neutral-950/80 px-1.5 py-0.5 text-[7px] font-mono uppercase tracking-widest text-purple-300/60 pointer-events-none">
                                Timeline Effets
                            </div>

                            {transitionLaneItems.map(item => (
                                <TrackItem
                                    key={item.id}
                                    item={item}
                                    type="transition"
                                    pps={pps}
                                    trackHeight={TRACK_CONFIG.transitions.height}
                                    color="purple"
                                    label={`${item.icon || '*'} ${item.name}`}
                                    isSelected={item.id === selectedTransitionId}
                                    isLocked={isTrackLocked('transitions')}
                                    snapEnabled={snapEnabled}
                                    snapPoints={snapPoints}
                                    snapThreshold={snapThresholdSeconds}
                                    maxEnd={totalDuration}
                                    onSnapPreview={setSnapPreview}
                                    onSelect={() => {
                                        setSelectedClipId(null);
                                        setSelectedTextId(null);
                                        setSelectedAudioTrackId(null);
                                        setSelectedTransitionId(item.id);
                                        setActivePanel('transitions');
                                    }}
                                />
                            ))}

                            {transitionLaneItems.length === 0 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setActivePanel('transitions'); }}
                                    className="absolute inset-0 flex items-center justify-center group"
                                >
                                    <span className="flex items-center gap-1.5 text-[9px] font-mono text-neutral-700 group-hover:text-purple-400/70 transition">
                                        <Plus size={10} /> Ajouter un effet de transition
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

                            {textLaneItems.map(text => (
                                <TrackItem
                                    key={text.id}
                                    item={text}
                                    type="text"
                                    pps={pps}
                                    trackHeight={TRACK_CONFIG.text.height}
                                    color="amber"
                                    label={text.content}
                                    isSelected={text.id === selectedTextId}
                                    isLocked={isTrackLocked('text')}
                                    snapEnabled={snapEnabled}
                                    snapPoints={snapPoints}
                                    snapThreshold={snapThresholdSeconds}
                                    maxEnd={totalDuration}
                                    onSnapPreview={setSnapPreview}
                                    onSelect={() => {
                                        setSelectedClipId(null);
                                        setSelectedTransitionId(null);
                                        setSelectedAudioTrackId(null);
                                        setSelectedTextId(text.id);
                                        setActivePanel('text');
                                    }}
                                />
                            ))}

                            {textLaneItems.length === 0 && (
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
                            {videoLaneItems.map((clip, i) => {
                                return (
                                    <div
                                        key={clip.id}
                                        className={`absolute top-1 bottom-1 rounded-sm overflow-hidden transition-all
                                            ${isTrackLocked('audio') ? 'cursor-not-allowed opacity-65' : 'cursor-pointer'}
                                            ${isTrackMuted('audio') ? 'opacity-45 grayscale' : ''}
                                            ${selectedClipId === clip.id ? 'ring-1 ring-emerald-500/50' : ''}`}
                                        style={{ left: `${clip.start * pps}px`, width: `${Math.max(24, clip.duration * pps)}px` }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isTrackLocked('audio')) return;
                                            setSelectedClipId(clip.id);
                                            setSelectedTextId(null);
                                            setSelectedTransitionId(null);
                                            setSelectedAudioTrackId(null);
                                            setActivePanel('audio');
                                        }}
                                    >
                                        <div className="w-full h-full bg-emerald-900/20 border border-emerald-700/20 rounded-sm flex items-center px-2 relative overflow-hidden">
                                            {/* Fake waveform visualization */}
                                            <div className="absolute inset-0 flex items-center justify-center gap-px opacity-40">
                                                {Array.from({ length: Math.min(80, Math.floor(Math.max(24, clip.duration * pps) / 3)) }, (_, j) => (
                                                    <div
                                                        key={j}
                                                        className="w-0.5 bg-emerald-500/60 rounded-full shrink-0"
                                                        style={{ height: `${getWaveformBarHeight(clip.id || clip.name, j, i)}px` }}
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

                            {musicLaneItems.map(track => (
                                <TrackItem
                                    key={track.id}
                                    item={track}
                                    type="audio"
                                    pps={pps}
                                    trackHeight={TRACK_CONFIG.music.height}
                                    color="purple"
                                    label={track.name}
                                    isSelected={track.id === selectedAudioTrackId}
                                    isLocked={isTrackLocked('music')}
                                    snapEnabled={snapEnabled}
                                    snapPoints={snapPoints}
                                    snapThreshold={snapThresholdSeconds}
                                    maxEnd={totalDuration}
                                    onSnapPreview={setSnapPreview}
                                    onSelect={() => {
                                        setSelectedClipId(null);
                                        setSelectedTextId(null);
                                        setSelectedTransitionId(null);
                                        setSelectedAudioTrackId(track.id);
                                        setActivePanel('audio');
                                    }}
                                />
                            ))}

                            {musicLaneItems.length === 0 && (
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
                    {snapPreview && (
                        <div
                            data-testid="timeline-snap-indicator"
                            className="absolute top-0 bottom-0 z-30 w-px bg-cyan-300/90 shadow-[0_0_10px_rgba(103,232,249,0.7)] pointer-events-none"
                            style={{ left: `${snapPreview.time * pps - scrollX}px` }}
                        >
                            <span className="absolute top-1 left-1.5 rounded-sm border border-cyan-400/35 bg-neutral-950/95 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest text-cyan-200 whitespace-nowrap">
                                Snap {snapPreview.label}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Bottom bar: zoom + info ── */}
            <div className="flex items-center justify-between gap-3 px-3 min-h-10 border-t border-neutral-800/50 bg-neutral-950">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[8px] font-mono text-neutral-600 uppercase">
                        {clips.length} clip{clips.length !== 1 ? 's' : ''} / {transitionLaneItems.length} transition{transitionLaneItems.length !== 1 ? 's' : ''} / {textLaneItems.length} texte{textLaneItems.length !== 1 ? 's' : ''} / {musicLaneItems.length} piste{musicLaneItems.length !== 1 ? 's' : ''}
                    </span>
                    {selectedClip && (
                        <div className="flex items-center gap-1.5 rounded-sm border border-neutral-800 bg-neutral-900/60 px-2 py-1">
                            <span className="text-[8px] font-mono text-neutral-500 uppercase">Trim</span>
                            <label className="flex items-center gap-1 text-[8px] font-mono text-neutral-500">
                                In
                                <input
                                    aria-label="Timecode trim debut"
                                    type="number"
                                    min={0}
                                    max={selectedClip.trimEnd - 0.15}
                                    step={0.01}
                                    value={Number(selectedClip.trimStart || 0).toFixed(2)}
                                    disabled={isTrackLocked('video')}
                                    onChange={(e) => updateSelectedClipTimecode('trimStart', e.target.value)}
                                    className="w-16 rounded-sm border border-neutral-800 bg-black/60 px-1 py-0.5 text-[8px] text-neutral-200 tabular-nums focus:outline-none focus:border-indigo-400"
                                />
                            </label>
                            <label className="flex items-center gap-1 text-[8px] font-mono text-neutral-500">
                                Out
                                <input
                                    aria-label="Timecode trim fin"
                                    type="number"
                                    min={selectedClip.trimStart + 0.15}
                                    max={selectedClip.originalDuration}
                                    step={0.01}
                                    value={Number(selectedClip.trimEnd || 0).toFixed(2)}
                                    disabled={isTrackLocked('video')}
                                    onChange={(e) => updateSelectedClipTimecode('trimEnd', e.target.value)}
                                    className="w-16 rounded-sm border border-neutral-800 bg-black/60 px-1 py-0.5 text-[8px] text-neutral-200 tabular-nums focus:outline-none focus:border-indigo-400"
                                />
                            </label>
                        </div>
                    )}
                    {selectedTimelineItem && (
                        <div className="flex items-center gap-1.5 rounded-sm border border-cyan-500/20 bg-cyan-500/5 px-2 py-1">
                            <span className="text-[8px] font-mono text-cyan-300/80 uppercase">{selectedTimelineItem.label}</span>
                            <label className="flex items-center gap-1 text-[8px] font-mono text-neutral-500">
                                Start
                                <input
                                    aria-label="Timecode item start"
                                    type="number"
                                    min={0}
                                    max={Math.max(0, totalDuration - 0.1)}
                                    step={0.01}
                                    value={Number(selectedTimelineItem.item.startTime || 0).toFixed(2)}
                                    disabled={selectedTimelineItemLocked}
                                    onChange={(e) => updateSelectedTimelineItemTimecode('startTime', e.target.value)}
                                    className="w-16 rounded-sm border border-neutral-800 bg-black/60 px-1 py-0.5 text-[8px] text-neutral-200 tabular-nums focus:outline-none focus:border-cyan-400"
                                />
                            </label>
                            <label className="flex items-center gap-1 text-[8px] font-mono text-neutral-500">
                                Dur
                                <input
                                    aria-label="Timecode item duration"
                                    type="number"
                                    min={0.1}
                                    max={Math.max(0.1, totalDuration)}
                                    step={0.01}
                                    value={Math.max(0.1, Number((selectedTimelineItem.item.endTime || 0) - (selectedTimelineItem.item.startTime || 0))).toFixed(2)}
                                    disabled={selectedTimelineItemLocked}
                                    onChange={(e) => updateSelectedTimelineItemTimecode('duration', e.target.value)}
                                    className="w-16 rounded-sm border border-neutral-800 bg-black/60 px-1 py-0.5 text-[8px] text-neutral-200 tabular-nums focus:outline-none focus:border-cyan-400"
                                />
                            </label>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        aria-pressed={snapEnabled}
                        data-testid="timeline-snap-toggle"
                        onClick={() => setSnapEnabled(!snapEnabled)}
                        className={`flex h-8 items-center gap-1 rounded-sm border px-2 text-[8px] font-mono uppercase tracking-widest transition ${
                            snapEnabled
                                ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200'
                                : 'border-neutral-800 bg-neutral-900/50 text-neutral-500 hover:border-neutral-600 hover:text-neutral-200'
                        }`}
                    >
                        <Magnet size={10} />
                        Snap
                    </button>
                    <button
                        onClick={() => setZoom(Math.max(TIMELINE_MIN_ZOOM, zoom - 0.3))}
                        className="w-11 h-8 flex items-center justify-center text-neutral-600 hover:text-white transition rounded-sm hover:bg-neutral-800"
                    >
                        <Minus size={10} />
                    </button>
                    <div className="w-20 h-3 bg-neutral-800 rounded-full relative">
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
                        className="w-11 h-8 flex items-center justify-center text-neutral-600 hover:text-white transition rounded-sm hover:bg-neutral-800"
                    >
                        <ZoomIn size={10} />
                    </button>
                    <span className="text-[8px] font-mono text-neutral-600 tabular-nums w-8 text-center">{zoom.toFixed(1)}x</span>
                </div>
            </div>
        </div>
    );
};

function getWaveformBarHeight(seed = '', index = 0, lane = 0) {
    const hash = String(seed).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const wave = Math.sin(index * 0.58 + lane * 0.9 + hash * 0.013);
    const detail = Math.sin(index * 1.31 + hash * 0.021) * 0.5 + 0.5;
    return Math.max(4, Math.round(12 + wave * 9 + detail * 7));
}

function hydrateTimelineItem(item) {
    return {
        ...(item.source || {}),
        id: item.id,
        trackId: item.trackId,
        type: item.type,
        start: item.start,
        startTime: item.start,
        endTime: item.start + item.duration,
        duration: item.duration,
        trimStart: item.trimStart,
        trimEnd: item.trimEnd,
        zIndex: item.zIndex,
        params: item.params || {},
    };
}

export default Timeline;
