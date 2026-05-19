"use client";

import React from 'react';
import { Film, ArrowLeft, Undo2, Redo2 } from 'lucide-react';
import VideoEditor from './video/VideoEditor';
import useVideoStore from './video/store/videoStore';

function VideoApp({ onBack }) {
    const { clips, undo, redo, canUndo, canRedo } = useVideoStore();

    return (
        <div className="min-h-screen flex flex-col h-screen overflow-hidden font-sans bg-black text-gray-300">
            {/* Header */}
            <header className="border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-md sticky top-0 z-20 shrink-0">
                <div className="px-4 h-11 flex items-center justify-between gap-4">
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

                    {/* Center: undo/redo + clip count */}
                    <div className="flex items-center gap-2">
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
                                <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-widest">
                                    {clips.length} clip{clips.length > 1 ? 's' : ''}
                                </span>
                            </>
                        )}
                    </div>

                    {/* Right: empty for now */}
                    <div className="w-20 shrink-0" />
                </div>
            </header>

            {/* Editor */}
            <main className="flex-1 flex overflow-hidden">
                <VideoEditor />
            </main>
        </div>
    );
}

export default VideoApp;
