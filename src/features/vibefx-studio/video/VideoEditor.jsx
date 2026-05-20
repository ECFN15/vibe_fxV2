"use client";

import React, { useRef, useCallback, useEffect } from 'react';
import useVideoStore from './store/videoStore';
import { loadVideoFile, extractThumbnails } from './engine/VideoEngine';
import VideoPreview from './preview/VideoPreview';
import PreviewControls from './preview/PreviewControls';
import Timeline from './timeline/Timeline';
import VideoToolbar from './panels/VideoToolbar';
import TransitionPicker from './panels/TransitionPicker';
import TextPanel from './panels/TextPanel';
import AudioPanel from './panels/AudioPanel';
import SpeedPanel from './panels/SpeedPanel';
import ExportVideoPanel from './panels/ExportVideoPanel';
import FilterVideoPanel from './panels/FilterVideoPanel';
import MusicLibrary from './panels/MusicLibrary';
import { Upload } from 'lucide-react';

const VideoEditor = () => {
    const fileInputRef = useRef(null);
    const { addClip, updateClip, clips, activePanel, undo, redo } = useVideoStore();

    const handleImportClick = () => fileInputRef.current?.click();

    const importFiles = useCallback(async (files) => {
        for (const file of files) {
            if (!file.type.startsWith('video/')) continue;
            try {
                const meta = await loadVideoFile(file);
                const clipId = crypto.randomUUID?.() || Math.random().toString(36).slice(2, 10);
                addClip({
                    id: clipId,
                    file: meta.file,
                    url: meta.url,
                    name: meta.name.replace(/\.[^.]+$/, ''),
                    duration: meta.duration,
                    thumbnails: [],
                });

                const thumbCount = meta.duration > 90 ? 4 : meta.duration > 30 ? 6 : 8;
                extractThumbnails(meta.url, meta.duration, thumbCount)
                    .then((thumbnails) => updateClip(clipId, { thumbnails }))
                    .catch((err) => console.warn('Thumbnail extraction failed:', err));
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
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/'));
        await importFiles(files);
    }, [importFiles]);

    const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };

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

    return (
        <div
            className="flex-1 flex flex-col h-full overflow-hidden bg-black"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            <input ref={fileInputRef} type="file" accept="video/*" multiple onChange={handleFileSelect} className="hidden" />

            {/* Main area: Preview + Side panel */}
            <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Preview */}
                <div className="flex-1 flex flex-col min-w-0 bg-neutral-950">
                    {clips.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center p-4">
                            <div className="w-full max-w-md">
                                <button
                                    onClick={handleImportClick}
                                    className="group w-full flex flex-col items-center gap-5 p-10 border border-dashed border-neutral-800 hover:border-indigo-500/40 transition-all hover:bg-indigo-500/5"
                                >
                                    <div className="w-14 h-14 flex items-center justify-center bg-neutral-900 group-hover:bg-indigo-600/20 transition">
                                        <Upload size={24} className="text-neutral-500 group-hover:text-indigo-400 transition" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[11px] font-mono text-neutral-400 group-hover:text-white transition uppercase tracking-widest">
                                            Importer une video
                                        </p>
                                        <p className="text-[9px] font-mono text-neutral-700 mt-1 uppercase tracking-widest">
                                            MP4 / WebM / MOV / glisser-deposer
                                        </p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <VideoPreview />
                            <PreviewControls />
                        </>
                    )}
                </div>

                {/* Side panel */}
                {hasPanel && (
                    <div className="border-l border-neutral-800 bg-neutral-950 flex flex-col overflow-hidden shrink-0 hidden lg:flex w-80 min-h-0">
                        {renderPanel()}
                    </div>
                )}
            </div>

            {/* Timeline */}
            <Timeline onImportClick={handleImportClick} />

            {/* Toolbar */}
            <VideoToolbar onImportClick={handleImportClick} />

            {/* Mobile overlay panel */}
            {hasPanel && (
                <div className="lg:hidden fixed inset-x-0 bottom-14 top-1/3 bg-neutral-950/98 backdrop-blur-md border-t border-neutral-800 z-30 flex flex-col min-h-0">
                    {renderPanel()}
                </div>
            )}
        </div>
    );
};

export default VideoEditor;
