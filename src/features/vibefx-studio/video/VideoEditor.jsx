"use client";

import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import useVideoStore from './store/videoStore';
import { EXPORT_PRESETS, loadVideoFile, extractThumbnails, formatTimeFull } from './engine/VideoEngine';
import { resolveTimelineRenderPlan } from './model/timelineModel';
import { buildUnavailableWaveform, extractAudioWaveform } from './utils/audioWaveform';
import VideoPreview from './preview/VideoPreview';
import PreviewControls from './preview/PreviewControls';
import Timeline from './timeline/Timeline';
import VideoToolbar from './panels/VideoToolbar';
import TransitionPicker from './panels/TransitionPicker';
import TextPanel from './panels/TextPanel';
import AudioPanel from './panels/AudioPanel';
import SpeedPanel from './panels/SpeedPanel';
import ExportVideoPanel, { useVideoExportController } from './panels/ExportVideoPanel';
import FilterVideoPanel from './panels/FilterVideoPanel';
import MusicLibrary from './panels/MusicLibrary';
import VibeCutQuickPanel from './panels/VibeCutQuickPanel';
import { Clock, Download, Filter, ListVideo, Maximize2, Minimize2, Pause, Play, Plus, RotateCcw, RotateCw, Upload, X } from 'lucide-react';

const PANEL_LABELS = {
    transitions: 'Transitions',
    text: 'Texte',
    audio: 'Audio',
    music: 'Musique',
    speed: 'Vitesse',
    export: 'Export',
    filters: 'Filtres',
};

function getClipTimelineLabel(clip) {
    const start = Number.isFinite(Number(clip.startTime)) ? Number(clip.startTime) : 0;
    const duration = Math.max(0, Number(clip.duration || 0));
    return `${formatTimeFull(start)} - ${formatTimeFull(start + duration)}`;
}

const VideoEditor = ({ onAiOpen }) => {
    const fileInputRef = useRef(null);
    const [isMobilePanelFullscreen, setIsMobilePanelFullscreen] = useState(false);
    const [isTheaterMode, setIsTheaterMode] = useState(false);
    const [isTheaterDropActive, setIsTheaterDropActive] = useState(false);
    const [isTheaterColorOpen, setIsTheaterColorOpen] = useState(false);
    const {
        addClip, updateClip, applyClipRotationToImportSession, clips, transitions, transitionItems, textOverlays,
        audioTracks, tracks, totalDuration, currentTime, isPlaying, togglePlay,
        seekTo, selectedClipId, setSelectedClipId, setSelectedTextId,
        setSelectedTransitionId, setSelectedAudioTrackId,
        sequencePreset, setSequencePreset,
        activePanel, setActivePanel, undo, redo
    } = useVideoStore();

    const renderPlan = useMemo(() => resolveTimelineRenderPlan({
        clips,
        transitions,
        transitionItems,
        textOverlays,
        audioTracks,
        tracks,
        totalDuration,
    }), [audioTracks, clips, textOverlays, totalDuration, tracks, transitions, transitionItems]);

    const theaterClips = renderPlan.clips;
    const selectedClip = clips.find((clip) => clip.id === selectedClipId) || null;
    const selectedImportSessionClipCount = selectedClip?.importSessionId
        ? clips.filter((clip) => clip.importSessionId === selectedClip.importSessionId).length
        : 0;
    const canApplyRotationToImportSession = selectedImportSessionClipCount > 1;
    const videoExport = useVideoExportController();

    const handleImportClick = () => fileInputRef.current?.click();

    const importFiles = useCallback(async (files) => {
        const videoFiles = files.filter((file) => file.type.startsWith('video/'));
        if (videoFiles.length === 0) return;
        const importSessionId = `import-${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2, 10)}`;
        for (const file of videoFiles) {
            try {
                const meta = await loadVideoFile(file);
                const clipId = crypto.randomUUID?.() || Math.random().toString(36).slice(2, 10);
                addClip({
                    id: clipId,
                    file: meta.file,
                    url: meta.url,
                    name: meta.name.replace(/\.[^.]+$/, ''),
                    duration: meta.duration,
                    width: meta.width,
                    height: meta.height,
                    displayWidth: meta.displayWidth,
                    displayHeight: meta.displayHeight,
                    orientationRotation: meta.orientationRotation,
                    orientationSource: meta.orientationSource,
                    importSessionId,
                    thumbnails: [],
                    sourceFrameRate: meta.sourceFrameRate,
                    sourceFrameRateRaw: meta.sourceFrameRateRaw,
                    sourceFrameRateStatus: meta.sourceFrameRateStatus,
                    importFrameRate: meta.importFrameRate,
                    importFrameRateMode: meta.importFrameRateMode,
                    socialFpsNormalized: meta.socialFpsNormalized,
                });

                const thumbCount = meta.duration > 90 ? 4 : meta.duration > 30 ? 6 : 8;
                extractThumbnails(meta.url, meta.duration, thumbCount, 60, meta)
                    .then((thumbnails) => updateClip(clipId, { thumbnails }))
                    .catch((err) => console.warn('Thumbnail extraction failed:', err));

                extractAudioWaveform(file)
                    .then((waveform) => updateClip(clipId, { waveform }))
                    .catch((err) => updateClip(clipId, { waveform: buildUnavailableWaveform(err.message) }));
            } catch (err) {
                console.warn('Video import failed:', err);
            }
        }
    }, [addClip, updateClip]);

    const handleFileSelect = useCallback(async (e) => {
        const files = Array.from(e.target.files);
        await importFiles(files);
        e.target.value = '';
    }, [importFiles]);

    const handleDrop = useCallback(async (e) => {
        e.preventDefault();
        setIsTheaterDropActive(false);
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/'));
        await importFiles(files);
    }, [importFiles]);

    const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };
    const handleTheaterDragEnter = (e) => {
        e.preventDefault();
        setIsTheaterDropActive(true);
    };
    const handleTheaterDragLeave = (e) => {
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setIsTheaterDropActive(false);
    };

    const handleClipJump = useCallback((clip) => {
        setSelectedClipId(clip.sourceId || clip.id);
        setSelectedTextId(null);
        setSelectedTransitionId(null);
        setSelectedAudioTrackId(null);
        seekTo(Math.max(0, Number(clip.startTime || 0)));
    }, [seekTo, setSelectedAudioTrackId, setSelectedClipId, setSelectedTextId, setSelectedTransitionId]);

    const handlePlayAll = useCallback(() => {
        if (clips.length === 0) return;
        if (currentTime >= totalDuration - 0.05) seekTo(0);
        if (!isPlaying) togglePlay();
    }, [clips.length, currentTime, isPlaying, seekTo, togglePlay, totalDuration]);

    const handleSelectedClipRotation = useCallback((delta) => {
        if (!selectedClip?.id) return;
        const currentRotation = Number.isFinite(Number(selectedClip.orientationRotation))
            ? Number(selectedClip.orientationRotation)
            : 0;
        const orientationRotation = ((currentRotation + delta) % 360 + 360) % 360;
        updateClip(selectedClip.id, { orientationRotation, orientationSource: 'manual' }, { history: true });
    }, [selectedClip, updateClip]);

    const handleApplyRotationToImportSession = useCallback(() => {
        if (!selectedClip?.id) return;
        applyClipRotationToImportSession(selectedClip.id);
    }, [applyClipRotationToImportSession, selectedClip]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

            const state = useVideoStore.getState();

            if (e.code === 'Space') {
                e.preventDefault();
                state.togglePlay();
            } else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
                e.preventDefault();
                const step = e.shiftKey ? 1 : 1 / 30;
                const direction = e.code === 'ArrowRight' ? 1 : -1;
                state.seekTo(Math.max(0, Math.min(state.totalDuration, state.currentTime + direction * step)));
            } else if (e.code === 'Escape') {
                e.preventDefault();
                state.setActivePanel(null);
            } else if (e.code === 'Delete' || e.code === 'Backspace') {
                if (state.selectedClipId) {
                    e.preventDefault();
                    state.removeClip(state.selectedClipId);
                } else if (state.selectedTextId) {
                    e.preventDefault();
                    state.removeTextOverlay(state.selectedTextId);
                }
            } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
                e.preventDefault();
                if (e.shiftKey) redo();
                else undo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    const renderPanel = () => {
        switch (activePanel) {
            case 'transitions': return <TransitionPicker />;
            case 'text':        return <TextPanel />;
            case 'audio':       return <AudioPanel />;
            case 'music':       return <MusicLibrary />;
            case 'speed':       return <SpeedPanel />;
            case 'export':      return <ExportVideoPanel />;
            case 'filters':     return <FilterVideoPanel />;
            default:            return null;
        }
    };

    const hasPanel = activePanel !== null;
    const activePanelLabel = PANEL_LABELS[activePanel] || 'Outils';

    useEffect(() => {
        if (!hasPanel) setIsMobilePanelFullscreen(false);
    }, [hasPanel]);

    useEffect(() => {
        if (clips.length === 0) setIsTheaterMode(false);
    }, [clips.length]);

    useEffect(() => {
        if (!isTheaterMode) setIsTheaterColorOpen(false);
    }, [isTheaterMode]);

    const renderPreviewDeck = (mode = 'normal') => (
        <div
            data-vibecut-preview-shell="true"
            data-preview-mode={mode}
            className={`relative flex min-h-0 flex-1 flex-col bg-black ${mode === 'theater' ? 'min-w-0' : ''}`}
        >
            {mode === 'normal' && (
                <button
                    type="button"
                    data-testid="vibecut-theater-open"
                    onClick={() => setIsTheaterMode(true)}
                    className="vibecut-action-button absolute right-3 top-3 z-10 inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-neutral-800 bg-neutral-950/82 px-3 text-[9px] font-mono uppercase tracking-widest text-neutral-300 backdrop-blur transition hover:border-indigo-400/50 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
                    title="Ouvrir la preview grand format"
                    aria-label="Ouvrir la preview grand format"
                >
                    <Maximize2 size={13} />
                    <span className="hidden sm:inline">Grand format</span>
                </button>
            )}
            <VideoPreview />
            <PreviewControls />
        </div>
    );

    const renderTheaterMode = () => (
        <div
            data-testid="vibecut-theater-mode"
            className="flex flex-1 min-h-0 bg-[#050506]"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-800 bg-neutral-950 px-4">
                    <div className="min-w-0">
                        <p className="text-[9px] font-mono uppercase tracking-widest text-indigo-300">Preview grand format</p>
                        <p className="truncate text-[9px] font-mono uppercase tracking-widest text-neutral-600">
                            Lecture timeline complete - {clips.length} clip{clips.length > 1 ? 's' : ''} - {formatTimeFull(totalDuration)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            data-testid="vibecut-theater-format-select"
                            value={sequencePreset}
                            onChange={(event) => setSequencePreset(event.target.value)}
                            className="h-8 max-w-44 rounded-sm border border-neutral-800 bg-neutral-900 px-2 text-[9px] font-mono uppercase tracking-widest text-neutral-300 outline-none transition hover:border-indigo-400/45 focus:border-indigo-400"
                            aria-label="Choisir le format preview et export"
                            title="Format preview/export"
                        >
                            {Object.entries(EXPORT_PRESETS).map(([key, preset]) => (
                                <option key={key} value={key}>
                                    {preset.label} - {preset.width}x{preset.height}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            data-testid="vibecut-theater-rotate-left"
                            onClick={() => handleSelectedClipRotation(-90)}
                            disabled={!selectedClip}
                            className="vibecut-square-button grid h-8 w-8 place-items-center rounded-sm border border-neutral-800 text-neutral-400 transition hover:border-cyan-400/45 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-35"
                            aria-label="Tourner le clip selectionne a gauche"
                            title={selectedClip ? 'Tourner a gauche' : 'Selectionne un clip dans la liste'}
                        >
                            <RotateCcw size={13} />
                        </button>
                        <button
                            type="button"
                            data-testid="vibecut-theater-rotate-right"
                            onClick={() => handleSelectedClipRotation(90)}
                            disabled={!selectedClip}
                            className="vibecut-square-button grid h-8 w-8 place-items-center rounded-sm border border-neutral-800 text-neutral-400 transition hover:border-cyan-400/45 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-35"
                            aria-label="Tourner le clip selectionne a droite"
                            title={selectedClip ? 'Tourner a droite' : 'Selectionne un clip dans la liste'}
                        >
                            <RotateCw size={13} />
                        </button>
                        <button
                            type="button"
                            data-testid="vibecut-theater-rotate-session"
                            onClick={handleApplyRotationToImportSession}
                            disabled={!canApplyRotationToImportSession}
                            className="vibecut-action-button inline-flex h-8 items-center justify-center rounded-sm border border-cyan-500/25 bg-cyan-500/8 px-2.5 text-[8px] font-mono uppercase tracking-widest text-cyan-100 transition hover:border-cyan-300/55 hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900/45 disabled:text-neutral-600"
                            title={canApplyRotationToImportSession ? `Appliquer cette rotation aux ${selectedImportSessionClipCount} videos importees ensemble` : 'Importe plusieurs videos ensemble pour activer la rotation de session'}
                        >
                            Session
                        </button>
                        <button
                            type="button"
                            data-testid="vibecut-theater-play-all"
                            onClick={handlePlayAll}
                            disabled={clips.length === 0}
                            className="vibecut-action-button inline-flex h-8 items-center justify-center gap-2 rounded-sm border border-indigo-500/40 bg-indigo-500/12 px-3 text-[9px] font-mono uppercase tracking-widest text-indigo-100 transition hover:border-indigo-300 hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                            {isPlaying ? <Pause size={12} /> : <Play size={12} fill="currentColor" />}
                            {isPlaying ? 'Lecture' : 'Lire tout'}
                        </button>
                        <button
                            type="button"
                            data-testid="vibecut-theater-color"
                            aria-pressed={isTheaterColorOpen}
                            onClick={() => setIsTheaterColorOpen((value) => !value)}
                            disabled={clips.length === 0}
                            className={`vibecut-action-button inline-flex h-8 items-center justify-center gap-2 rounded-sm border px-3 text-[9px] font-mono uppercase tracking-widest transition disabled:cursor-not-allowed disabled:opacity-35 ${
                                isTheaterColorOpen
                                    ? 'border-fuchsia-400/55 bg-fuchsia-500/14 text-fuchsia-100'
                                    : 'border-neutral-800 bg-neutral-950/70 text-neutral-300 hover:border-fuchsia-400/45 hover:text-fuchsia-100'
                            }`}
                            title={selectedClip ? 'Ouvrir la colorimetrie du clip selectionne' : 'Selectionne un clip pour regler la colorimetrie'}
                        >
                            <Filter size={12} />
                            <span className="hidden 2xl:inline">Colorimetrie</span>
                        </button>
                        <button
                            type="button"
                            data-testid="vibecut-theater-download"
                            onClick={videoExport.handleExport}
                            disabled={!videoExport.hasClips || videoExport.isExporting || videoExport.proExportPreflight.errors.length > 0}
                            className="vibecut-action-button inline-flex h-8 items-center justify-center gap-2 rounded-sm border border-cyan-500/40 bg-cyan-500/12 px-3 text-[9px] font-mono uppercase tracking-widest text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-35"
                            title={
                                videoExport.proExportPreflight.errors.length > 0
                                    ? videoExport.proExportPreflight.errors[0]
                                    : `Export Pro MP4 ${videoExport.exportFps} FPS`
                            }
                        >
                            <Download size={12} />
                            <span className="hidden xl:inline">
                                {videoExport.isExporting ? `Export Pro ${videoExport.exportProgress}%` : 'Export Pro'}
                            </span>
                        </button>
                        <button
                            type="button"
                            data-testid="vibecut-theater-close"
                            onClick={() => setIsTheaterMode(false)}
                            className="vibecut-square-button grid h-8 w-8 place-items-center rounded-sm border border-neutral-800 text-neutral-400 transition hover:border-neutral-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
                            aria-label="Fermer la preview grand format"
                            title="Fermer"
                        >
                            <Minimize2 size={13} />
                        </button>
                    </div>
                </div>
                {(videoExport.isExporting || videoExport.exportMessage) && (
                    <div
                        data-testid="vibecut-theater-export-progress"
                        className="shrink-0 border-b border-cyan-500/20 bg-cyan-950/14 px-4 py-2"
                    >
                        <div className="mb-1 flex items-center justify-between gap-3">
                            <p className="min-w-0 truncate text-[9px] font-mono uppercase tracking-widest text-cyan-100">
                                {videoExport.exportMessage || 'Export qualite en cours.'}
                            </p>
                            <span className="shrink-0 text-[9px] font-mono tabular-nums text-cyan-300">
                                {videoExport.exportProgress}%
                            </span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-sm bg-neutral-900">
                            <div
                                className="h-full bg-cyan-300 transition-[width] duration-200"
                                style={{ width: `${Math.max(0, Math.min(100, videoExport.exportProgress))}%` }}
                            />
                        </div>
                    </div>
                )}
                {renderPreviewDeck('theater')}
                {isTheaterColorOpen && (
                    <div
                        data-testid="vibecut-theater-mobile-color-panel"
                        className="lg:hidden max-h-[48dvh] shrink-0 overflow-y-auto border-t border-fuchsia-500/20 bg-neutral-950"
                    >
                        <FilterVideoPanel onClose={() => setIsTheaterColorOpen(false)} />
                    </div>
                )}
                <div
                    data-testid="vibecut-theater-mobile-drop"
                    onDragEnter={handleTheaterDragEnter}
                    onDragLeave={handleTheaterDragLeave}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="lg:hidden shrink-0 border-t border-neutral-800 bg-neutral-950 p-2"
                >
                    <select
                        data-testid="vibecut-theater-mobile-format-select"
                        value={sequencePreset}
                        onChange={(event) => setSequencePreset(event.target.value)}
                        className="mb-2 h-9 w-full rounded-sm border border-neutral-800 bg-neutral-900 px-2 text-[9px] font-mono uppercase tracking-widest text-neutral-300 outline-none focus:border-indigo-400 md:hidden"
                        aria-label="Choisir le format preview et export"
                    >
                        {Object.entries(EXPORT_PRESETS).map(([key, preset]) => (
                            <option key={key} value={key}>
                                {preset.label} - {preset.width}x{preset.height}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        data-testid="vibecut-theater-mobile-download"
                        onClick={videoExport.handleExport}
                        disabled={!videoExport.hasClips || videoExport.isExporting || videoExport.proExportPreflight.errors.length > 0}
                        className="mb-2 flex h-9 w-full items-center justify-center gap-2 rounded-sm border border-cyan-500/35 bg-cyan-500/12 px-3 text-[9px] font-mono uppercase tracking-widest text-cyan-100 transition disabled:cursor-not-allowed disabled:opacity-35 md:hidden"
                    >
                        <Download size={12} />
                        {videoExport.isExporting ? `Export Pro ${videoExport.exportProgress}%` : 'Export Pro MP4'}
                    </button>
                    <button
                        type="button"
                        data-testid="vibecut-theater-mobile-color"
                        aria-pressed={isTheaterColorOpen}
                        onClick={() => setIsTheaterColorOpen((value) => !value)}
                        disabled={clips.length === 0}
                        className="mb-2 flex h-9 w-full items-center justify-center gap-2 rounded-sm border border-fuchsia-500/35 bg-fuchsia-500/12 px-3 text-[9px] font-mono uppercase tracking-widest text-fuchsia-100 transition disabled:cursor-not-allowed disabled:opacity-35 md:hidden"
                    >
                        <Filter size={12} />
                        Colorimetrie
                    </button>
                    <div className="flex gap-2 overflow-x-auto">
                        <button
                            type="button"
                            onClick={handleImportClick}
                            className={`flex h-20 min-w-36 flex-col items-center justify-center gap-2 rounded-sm border border-dashed px-3 text-center transition
                                ${isTheaterDropActive
                                    ? 'border-cyan-300/70 bg-cyan-400/10 text-cyan-100'
                                    : 'border-neutral-800 bg-neutral-900/60 text-neutral-400'
                                }`}
                        >
                            <Upload size={15} className="vibecut-upload-glyph" />
                            <span className="text-[8px] font-mono uppercase tracking-widest">Deposer</span>
                        </button>
                            {theaterClips.map((clip, index) => (
                            <button
                                key={clip.id}
                                type="button"
                                onClick={() => handleClipJump(clip)}
                                className="flex h-20 min-w-40 items-center gap-2 rounded-sm border border-neutral-800 bg-neutral-900/60 p-2 text-left text-neutral-300"
                            >
                                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-neutral-800 text-[9px] font-mono text-neutral-400">
                                    {index + 1}
                                </div>
                                <span className="min-w-0">
                                    <span className="block truncate text-[9px] font-mono uppercase tracking-wider text-neutral-100">{clip.name || `Clip ${index + 1}`}</span>
                                    <span className="block text-[8px] font-mono text-neutral-600">{getClipTimelineLabel(clip)}</span>
                                    {Number(clip.orientationRotation || 0) !== 0 && (
                                        <span className="mt-1 inline-flex rounded-sm bg-cyan-400/80 px-1 text-[7px] font-mono uppercase tracking-wider text-black">
                                            {Number(clip.orientationRotation)} DEG
                                        </span>
                                    )}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <aside
                data-testid="vibecut-theater-drop-rail"
                data-drop-active={isTheaterDropActive ? 'true' : 'false'}
                onDragEnter={handleTheaterDragEnter}
                onDragLeave={handleTheaterDragLeave}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="hidden w-80 shrink-0 flex-col border-l border-neutral-800 bg-neutral-950 lg:flex"
            >
                {isTheaterColorOpen && (
                    <div
                        data-testid="vibecut-theater-color-panel"
                        className="max-h-[56vh] shrink-0 overflow-hidden border-b border-fuchsia-500/20 bg-black/35"
                    >
                        <FilterVideoPanel onClose={() => setIsTheaterColorOpen(false)} />
                    </div>
                )}
                <div className="border-b border-neutral-800 p-3">
                    <button
                        type="button"
                        onClick={handleImportClick}
                        className={`group flex min-h-32 w-full flex-col items-center justify-center gap-3 rounded-sm border border-dashed p-4 text-center transition
                            ${isTheaterDropActive
                                ? 'border-cyan-300/70 bg-cyan-400/10 text-cyan-100'
                                : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-indigo-400/45 hover:bg-indigo-500/8 hover:text-indigo-100'
                            }`}
                    >
                        <span className="vibecut-icon-frame grid h-10 w-10 place-items-center rounded-sm border border-neutral-700 bg-black/40 text-neutral-300 transition group-hover:border-indigo-400/50 group-hover:text-indigo-200">
                            <Upload size={17} className="vibecut-upload-glyph" />
                        </span>
                        <span className="text-[10px] font-mono uppercase tracking-widest">Deposer des videos</span>
                        <span className="text-[8px] font-mono uppercase tracking-widest text-neutral-600">Ajout direct a la sequence</span>
                    </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col">
                    <div className="flex h-10 items-center justify-between border-b border-neutral-800 px-3">
                        <span className="inline-flex items-center gap-2 text-[9px] font-mono uppercase tracking-widest text-neutral-400">
                            <ListVideo size={12} />
                            Sequence
                        </span>
                        <span className="text-[9px] font-mono tabular-nums text-neutral-600">{formatTimeFull(totalDuration)}</span>
                    </div>

                    {theaterClips.length === 0 ? (
                        <div className="grid flex-1 place-items-center px-5 text-center">
                            <div className="space-y-3">
                                <div className="mx-auto grid h-12 w-12 place-items-center rounded-sm border border-neutral-800 bg-neutral-900 text-neutral-500">
                                    <Plus size={16} />
                                </div>
                                <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Aucune video</p>
                                <p className="text-[9px] font-mono uppercase tracking-widest text-neutral-700">Depose un MP4, WebM ou MOV</p>
                            </div>
                        </div>
                    ) : (
                        <div className="min-h-0 flex-1 overflow-y-auto p-2">
                            {theaterClips.map((clip, index) => {
                                const sourceId = clip.sourceId || clip.id;
                                const isSelected = selectedClipId === sourceId;
                                return (
                                    <button
                                        key={clip.id}
                                        type="button"
                                        data-testid={`vibecut-theater-clip-${index}`}
                                        data-selected={isSelected ? 'true' : 'false'}
                                        onClick={() => handleClipJump(clip)}
                                        className={`mb-2 flex w-full items-center gap-2 rounded-sm border p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60
                                            ${isSelected
                                                ? 'border-indigo-400/55 bg-indigo-500/12 text-indigo-100'
                                                : 'border-neutral-800 bg-neutral-900/55 text-neutral-300 hover:border-neutral-600 hover:bg-neutral-900'
                                            }`}
                                    >
                                        <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-sm bg-neutral-800">
                                            {clip.thumbnails?.[0] ? (
                                                <img src={clip.thumbnails[0]} alt="" className="h-full w-full object-cover" draggable={false} />
                                            ) : (
                                                <div className="h-full w-full bg-gradient-to-br from-indigo-950 via-neutral-800 to-cyan-950" />
                                            )}
                                            <span className="absolute left-1 top-1 rounded-sm bg-black/70 px-1 text-[8px] font-mono text-white">{index + 1}</span>
                                        </div>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[10px] font-mono uppercase tracking-wider text-neutral-100">{clip.name || `Clip ${index + 1}`}</span>
                                            <span className="mt-1 inline-flex items-center gap-1 text-[8px] font-mono uppercase tracking-widest text-neutral-500">
                                                <Clock size={10} />
                                                {getClipTimelineLabel(clip)}
                                            </span>
                                            {Number(clip.orientationRotation || 0) !== 0 && (
                                                <span className="mt-1 inline-flex rounded-sm bg-cyan-400/80 px-1 text-[7px] font-mono uppercase tracking-wider text-black">
                                                    {Number(clip.orientationRotation)} DEG
                                                </span>
                                            )}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );

    return (
        <div
            className="flex-1 flex flex-col h-full overflow-hidden bg-black"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            <input ref={fileInputRef} type="file" accept="video/*" multiple onChange={handleFileSelect} className="hidden" />

            {/* Main area: Preview + Side panel */}
            <div className="flex-1 flex overflow-hidden min-h-0">
                {isTheaterMode ? (
                    renderTheaterMode()
                ) : (
                <>
                {/* Preview */}
                <div className="flex-1 flex flex-col min-w-0 bg-neutral-950">
                    {clips.length === 0 ? (
                        <div
                            className="flex-1 flex items-start justify-center px-4 sm:px-6 lg:px-8"
                            style={{ paddingTop: 'clamp(5rem, 12vh, 8rem)' }}
                        >
                            <div className="w-full" style={{ maxWidth: '26rem' }}>
                                <button
                                    onClick={handleImportClick}
                                    className="group w-full min-h-44 flex flex-col items-center justify-center gap-5 p-10 border border-dashed border-neutral-800 hover:border-indigo-500/40 transition-all hover:bg-indigo-500/5"
                                >
                                    <div className="w-14 h-14 flex items-center justify-center bg-neutral-900 group-hover:bg-indigo-600/20 transition">
                                        <Upload size={24} className="vibecut-upload-glyph text-neutral-500 group-hover:text-indigo-400 transition" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[11px] font-mono text-neutral-400 group-hover:text-white transition uppercase tracking-widest">
                                            Importer une video
                                        </p>
                                        <p className="text-[9px] font-mono text-neutral-700 mt-1 uppercase tracking-widest">
                                            MP4 / WebM / MOV / glisser-deposer
                                        </p>
                                        <p className="text-[8px] font-mono text-neutral-700 mt-1 uppercase tracking-widest">
                                            Cadence source preservee jusqu'a 60 FPS
                                        </p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    ) : (
                        renderPreviewDeck('normal')
                    )}
                </div>

                {/* Side panel */}
                {hasPanel && (
                    <div className="border-l border-neutral-800 bg-neutral-950 flex flex-col overflow-hidden shrink-0 hidden lg:flex w-80 min-h-0">
                        {renderPanel()}
                    </div>
                )}
                <VibeCutQuickPanel />
                </>
                )}
            </div>

            {/* Timeline */}
            {!isTheaterMode && <Timeline onImportClick={handleImportClick} />}

            {/* Toolbar */}
            {!isTheaterMode && <VideoToolbar onImportClick={handleImportClick} onAiOpen={onAiOpen} />}

            {/* Mobile overlay panel */}
            {hasPanel && (
                <div
                    data-testid="video-mobile-panel"
                    data-fullscreen={isMobilePanelFullscreen ? 'true' : 'false'}
                    style={{ height: isMobilePanelFullscreen ? 'calc(100dvh - 6.25rem)' : '46dvh' }}
                    className={`lg:hidden fixed inset-x-0 bottom-14 bg-neutral-950/98 backdrop-blur-md border-t border-neutral-800 z-30 flex flex-col min-h-0 shadow-[0_-24px_60px_rgba(0,0,0,0.72)]
                        ${isMobilePanelFullscreen ? 'top-11 max-h-none' : 'top-auto max-h-[46dvh]'}`}
                >
                    <div className="flex h-10 shrink-0 items-center justify-between border-b border-neutral-800 px-3">
                        <div className="min-w-0">
                            <p className="truncate text-[9px] font-mono uppercase tracking-widest text-neutral-500">Edition Reel</p>
                            <p className="truncate text-[10px] font-mono uppercase tracking-widest text-neutral-200">{activePanelLabel}</p>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                data-testid="video-mobile-panel-size"
                                aria-label={isMobilePanelFullscreen ? 'Reduire le panneau mobile' : 'Agrandir le panneau mobile'}
                                onClick={() => setIsMobilePanelFullscreen((value) => !value)}
                                className="vibecut-square-button grid h-8 w-8 place-items-center rounded-sm border border-neutral-800 text-neutral-400 transition hover:border-neutral-600 hover:text-white"
                            >
                                {isMobilePanelFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                            </button>
                            <button
                                type="button"
                                aria-label="Fermer le panneau mobile"
                                onClick={() => setActivePanel(null)}
                                className="vibecut-square-button grid h-8 w-8 place-items-center rounded-sm border border-neutral-800 text-neutral-400 transition hover:border-neutral-600 hover:text-white"
                            >
                                <X size={13} />
                            </button>
                        </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                        {renderPanel()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoEditor;
