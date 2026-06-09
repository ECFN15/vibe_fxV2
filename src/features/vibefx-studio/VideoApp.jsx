"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, Film, Monitor, Shield, Smartphone, Sparkles, Trash2, Undo2, Redo2, RotateCcw, RotateCw } from 'lucide-react';
import { useAiLaunchSettings } from '@/hooks/useAiLaunchSettings';
import { useAuth } from '@/context/AuthContext';

const ADMIN_EMAIL = 'matthis.fradin2@gmail.com';
import VideoEditor from './video/VideoEditor';
import useVideoStore from './video/store/videoStore';
import { EXPORT_PRESETS } from './video/engine/VideoEngine';
import { EXPORT_FRAME_RATE_OPTIONS, resolveExportFps } from './video/panels/ExportVideoPanel';
import StudioAiRail from './components/ai/StudioAiRail';

function VideoApp({ onBack }) {
    const { aiInterfacesEnabled } = useAiLaunchSettings();
    const { user } = useAuth();
    const isAdmin = user?.email === ADMIN_EMAIL;
    const [isSequenceMenuOpen, setIsSequenceMenuOpen] = useState(false);
    const [isAiRailOpen, setIsAiRailOpen] = useState(false);
    const menuRef = useRef(null);
    const {
        clips, undo, redo, canUndo, canRedo,
        sequencePreset, setSequencePreset,
        selectedClipId, updateClip, removeClip, applyClipRotationToImportSession,
        exportFrameRate, setExportFrameRate,
    } = useVideoStore();
    const activePreset = EXPORT_PRESETS[sequencePreset] || EXPORT_PRESETS.youtube;
    const selectedClip = clips.find((clip) => clip.id === selectedClipId) || null;
    const selectedImportSessionClipCount = selectedClip?.importSessionId
        ? clips.filter((clip) => clip.importSessionId === selectedClip.importSessionId).length
        : 0;
    const canApplyRotationToImportSession = selectedImportSessionClipCount > 1;
    const sourceFpsMax = useMemo(() => {
        const fpsValues = clips
            .map((clip) => Number(clip.sourceFrameRate || clip.importFrameRate || 0))
            .filter((fps) => Number.isFinite(fps) && fps > 0);
        return fpsValues.length ? Math.min(60, Math.max(...fpsValues.map((fps) => Math.round(fps)))) : 0;
    }, [clips]);
    const exportFps = useMemo(() => (
        resolveExportFps(activePreset.fps, sourceFpsMax, exportFrameRate)
    ), [activePreset.fps, exportFrameRate, sourceFpsMax]);
    const aiContext = useMemo(() => ({
        view: 'video',
        hasImage: false,
        hasVideo: clips.length > 0,
        imageCount: 0,
        videoClipCount: clips.length,
        activeFormat: {
            id: sequencePreset,
            label: activePreset.label,
            ratio: activePreset.width && activePreset.height ? activePreset.width / activePreset.height : null,
        },
        canvasReady: clips.length > 0,
        timelineReady: true,
    }), [activePreset.height, activePreset.label, activePreset.width, clips.length, sequencePreset]);

    useEffect(() => {
        if (!isSequenceMenuOpen) return undefined;
        const handlePointerDown = (event) => {
            if (!menuRef.current?.contains(event.target)) {
                setIsSequenceMenuOpen(false);
            }
        };
        window.addEventListener('pointerdown', handlePointerDown);
        return () => window.removeEventListener('pointerdown', handlePointerDown);
    }, [isSequenceMenuOpen]);

    const rotateSelectedClip = useCallback((delta) => {
        if (!selectedClip?.id) return;
        const currentRotation = Number.isFinite(Number(selectedClip.orientationRotation))
            ? Number(selectedClip.orientationRotation)
            : 0;
        const orientationRotation = ((currentRotation + delta) % 360 + 360) % 360;
        updateClip(selectedClip.id, { orientationRotation, orientationSource: 'manual' }, { history: true });
    }, [selectedClip, updateClip]);

    const applySelectedRotationToImportSession = useCallback(() => {
        if (!selectedClip?.id) return;
        applyClipRotationToImportSession(selectedClip.id);
    }, [applyClipRotationToImportSession, selectedClip]);

    const deleteSelectedClip = useCallback(() => {
        if (!selectedClip?.id) return;
        removeClip(selectedClip.id);
    }, [removeClip, selectedClip]);

    return (
        <div className="min-h-screen flex flex-col h-screen overflow-hidden font-sans bg-black text-gray-300">
            {/* Header */}
            <header className="border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-md sticky top-0 z-20 shrink-0">
                <div className="relative px-4 h-11 flex items-center justify-between gap-4">
                    {/* Left: back + logo */}
                    <div className="flex items-center gap-3 shrink-0">
                        <button onClick={onBack} className="p-1.5 text-neutral-600 hover:text-white transition" title="Retour">
                            <ArrowLeft size={14} />
                        </button>
                        <div className="h-4 w-px bg-neutral-800" />
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 flex items-center justify-center bg-indigo-600">
                                <Film size={12} className="text-white" />
                            </div>
                            <span className="text-[12px] font-mono font-bold tracking-tighter uppercase hidden sm:block">
                                Vibe<span className="text-indigo-400">_CUT</span>
                            </span>
                        </div>
                    </div>

                    {/* Sequence preset pinned near the left command zone. */}
                    <div
                        ref={menuRef}
                        className="absolute top-1/2 hidden -translate-x-1/2 -translate-y-1/2 sm:block"
                        style={{ left: 'clamp(11rem, 22vw, 27rem)' }}
                    >
                        <button
                            type="button"
                            data-testid="sequence-preset-menu-toggle"
                            aria-expanded={isSequenceMenuOpen}
                            onClick={() => setIsSequenceMenuOpen((value) => !value)}
                            className="inline-flex h-8 items-center gap-2 rounded-sm border border-neutral-800 bg-neutral-900 px-2.5 text-[9px] font-mono uppercase tracking-widest text-neutral-300 hover:border-indigo-500/50 hover:text-indigo-300 transition"
                        >
                            <span className="hidden lg:inline">Type de sequence</span>
                            <span className="text-indigo-300">{activePreset.label}</span>
                            <ChevronDown size={12} />
                        </button>

                        {isSequenceMenuOpen && (
                            <div
                                data-testid="sequence-preset-menu"
                                className="absolute left-1/2 top-10 z-50 -translate-x-1/2 border border-neutral-700 bg-neutral-950 p-2 shadow-[0_18px_60px_rgba(0,0,0,0.85)]"
                                style={{ width: '16rem' }}
                            >
                                <div className="px-2 pb-2">
                                    <p className="text-[9px] font-mono uppercase tracking-widest text-neutral-400">Type de sequence</p>
                                    <p className="text-[9px] font-mono uppercase tracking-widest text-neutral-600">
                                        Applique a l'apercu et a l'export
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 gap-1">
                                    {Object.entries(EXPORT_PRESETS).map(([key, preset]) => {
                                        const isVertical = preset.height > preset.width;
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                data-testid={`sequence-preset-${key}`}
                                                aria-pressed={sequencePreset === key}
                                                onClick={() => {
                                                    setSequencePreset(key);
                                                    setIsSequenceMenuOpen(false);
                                                }}
                                                className={`flex items-center justify-between gap-3 rounded-sm border px-3 py-2 text-left transition
                                                    ${sequencePreset === key
                                                        ? 'border-indigo-500/70 bg-indigo-950 text-indigo-200'
                                                        : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200'
                                                    }`}
                                            >
                                                <span className="flex min-w-0 items-center gap-2">
                                                    {isVertical ? <Smartphone size={12} /> : <Monitor size={12} />}
                                                    <span className="min-w-0">
                                                        <span className="block truncate text-[10px] font-mono font-medium">{preset.name}</span>
                                                        <span className="block text-[8px] font-mono text-neutral-500">{preset.width}x{preset.height}</span>
                                                    </span>
                                                </span>
                                                <span className="shrink-0 text-[9px] font-mono text-neutral-500">{preset.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Center: undo/redo + clip count */}
                    <div className="flex min-w-0 items-center gap-2">
                        <button
                            onClick={undo}
                            disabled={!canUndo()}
                            className="p-1.5 text-neutral-500 hover:text-white transition disabled:opacity-20 disabled:cursor-not-allowed"
                            title="Annuler (Ctrl+Z)"
                        >
                            <Undo2 size={14} />
                        </button>
                        <button
                            onClick={redo}
                            disabled={!canRedo()}
                            className="p-1.5 text-neutral-500 hover:text-white transition disabled:opacity-20 disabled:cursor-not-allowed"
                            title="Refaire (Ctrl+Shift+Z)"
                        >
                            <Redo2 size={14} />
                        </button>
                        {clips.length > 0 && (
                            <>
                                <div className="h-4 w-px bg-neutral-800 mx-1" />
                                <button
                                    type="button"
                                    data-testid="header-rotate-left"
                                    disabled={!selectedClip}
                                    onClick={() => rotateSelectedClip(-90)}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-neutral-800 bg-neutral-900/70 text-neutral-400 transition hover:border-cyan-400/35 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-30"
                                    title="Tourner le clip selectionne a gauche"
                                    aria-label="Tourner le clip selectionne a gauche"
                                >
                                    <RotateCcw size={12} />
                                </button>
                                <button
                                    type="button"
                                    data-testid="header-rotate-right"
                                    disabled={!selectedClip}
                                    onClick={() => rotateSelectedClip(90)}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-neutral-800 bg-neutral-900/70 text-neutral-400 transition hover:border-cyan-400/35 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-30"
                                    title="Tourner le clip selectionne a droite"
                                    aria-label="Tourner le clip selectionne a droite"
                                >
                                    <RotateCw size={12} />
                                </button>
                                <button
                                    type="button"
                                    data-testid="header-rotate-session"
                                    disabled={!canApplyRotationToImportSession}
                                    onClick={applySelectedRotationToImportSession}
                                    className="inline-flex h-7 items-center justify-center rounded-sm border border-cyan-500/25 bg-cyan-500/8 px-2 text-[8px] font-mono uppercase tracking-widest text-cyan-100 transition hover:border-cyan-300/55 hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900/50 disabled:text-neutral-600"
                                    title={canApplyRotationToImportSession ? `Appliquer cette rotation aux ${selectedImportSessionClipCount} videos importees ensemble` : 'Importe plusieurs videos ensemble pour activer la rotation de session'}
                                    aria-label="Appliquer la rotation a la session d'import"
                                >
                                    Session
                                </button>
                                <button
                                    type="button"
                                    data-testid="header-delete-selected"
                                    disabled={!selectedClip}
                                    onClick={deleteSelectedClip}
                                    className="inline-flex h-7 items-center justify-center gap-1 rounded-sm border border-neutral-800 bg-neutral-900/70 px-2 text-[8px] font-mono uppercase tracking-widest text-neutral-400 transition hover:border-rose-400/45 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-30"
                                    title={selectedClip ? 'Supprimer la video selectionnee' : 'Selectionne une video a supprimer'}
                                    aria-label="Supprimer la video selectionnee"
                                >
                                    <Trash2 size={11} />
                                    <span className="hidden lg:inline">Supprimer</span>
                                </button>
                                <select
                                    data-testid="header-export-fps-select"
                                    value={exportFrameRate}
                                    onChange={(event) => setExportFrameRate(event.target.value === 'auto' ? 'auto' : Number(event.target.value))}
                                    className="h-7 rounded-sm border border-neutral-800 bg-neutral-900/70 px-2 text-[9px] font-mono uppercase tracking-widest text-neutral-300 outline-none transition hover:border-indigo-400/35 focus:border-indigo-400"
                                    title={`FPS preview/export: ${exportFps}`}
                                    aria-label="Choisir les FPS preview et export"
                                >
                                    {EXPORT_FRAME_RATE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.value === 'auto' ? `Auto ${exportFps} FPS` : `Preview/export ${option.label} FPS`}
                                        </option>
                                    ))}
                                </select>
                                <div className="h-4 w-px bg-neutral-800 mx-1" />
                                <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-widest">
                                    {clips.length} clip{clips.length > 1 ? 's' : ''}
                                </span>
                            </>
                        )}
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-2">
                        {isAdmin && (
                            <Link
                                href="/backoffice"
                                data-testid="vibecut-header-backoffice"
                                className="inline-flex h-7 items-center justify-center gap-1.5 rounded-sm border border-cyan-500/35 bg-cyan-500/10 px-2.5 text-[8px] font-mono uppercase tracking-widest text-cyan-100 transition hover:border-cyan-300/65 hover:bg-cyan-500/16 hover:text-white"
                                title="Ouvrir le backoffice"
                            >
                                <Shield size={11} />
                                <span className="hidden sm:inline">Backoffice</span>
                            </Link>
                        )}
                        {aiInterfacesEnabled && (
                            <button
                                type="button"
                                data-testid="studio-ai-toggle"
                                data-active={isAiRailOpen ? 'true' : 'false'}
                                onClick={() => setIsAiRailOpen(current => !current)}
                                className="vf-ai-header-button"
                                aria-pressed={isAiRailOpen}
                                title="AI clip"
                            >
                                <Sparkles size={13} />
                                AI
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Editor */}
            <main className="flex-1 flex overflow-hidden">
                <VideoEditor onAiOpen={aiInterfacesEnabled ? () => setIsAiRailOpen(true) : null} />
            </main>
            {aiInterfacesEnabled && (
                <StudioAiRail
                    open={isAiRailOpen}
                    onClose={() => setIsAiRailOpen(false)}
                    view="video"
                    context={aiContext}
                    mutators={{}}
                />
            )}
        </div>
    );
}

export default VideoApp;
