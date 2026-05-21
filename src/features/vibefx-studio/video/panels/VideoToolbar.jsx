import React from 'react';
import { Scissors, Type, Sparkles, Music, Gauge, Download, Filter, Trash2, Plus, Library } from 'lucide-react';
import useVideoStore from '../store/videoStore';
import { resolveTimelineRenderPlan } from '../model/timelineModel';

const VideoToolbar = ({ onImportClick, onAiOpen }) => {
    const {
        clips, selectedClipId,
        splitClip, removeClip, activePanel, setActivePanel
    } = useVideoStore();

    const hasClips = clips.length > 0;

    const handleSplit = () => {
        if (!selectedClipId) return;
        const state = useVideoStore.getState();
        const currentTime = state.currentTime;
        const plan = resolveTimelineRenderPlan(state);
        const clip = plan.clips.find(item => item.id === selectedClipId);
        if (!clip) return;

        const start = Number(clip.start ?? clip.startTime ?? 0);
        const duration = Number(clip.duration || 0);
        const end = start + duration;
        if (currentTime < start || currentTime > end) return;

        const speed = Number(clip.speed) || 1;
        const trimStart = Number(clip.trimStart) || 0;
        const trimEnd = Number(clip.trimEnd) || trimStart;
        const localTime = Math.max(trimStart, Math.min(trimEnd, trimStart + (currentTime - start) * speed));
        splitClip(clip.id, localTime);
    };

    const handleDelete = () => {
        if (!selectedClipId) return;
        removeClip(selectedClipId);
    };

    const tools = [
        { id: 'split',       icon: Scissors,  label: 'Couper',     action: handleSplit, disabled: !selectedClipId || !hasClips },
        { id: 'delete',      icon: Trash2,    label: 'Supprimer',  action: handleDelete, disabled: !selectedClipId || !hasClips },
        { id: 'transitions', icon: Sparkles,  label: 'Transition', panel: 'transitions' },
        { id: 'text',        icon: Type,       label: 'Texte',      panel: 'text' },
        { id: 'audio',       icon: Music,      label: 'Audio',      panel: 'audio' },
        { id: 'music',       icon: Library,    label: 'Musique',    panel: 'music' },
        { id: 'speed',       icon: Gauge,      label: 'Vitesse',    panel: 'speed' },
        { id: 'filters',     icon: Filter,     label: 'Filtres',    panel: 'filters' },
        { id: 'export',      icon: Download,   label: 'Exporter',   panel: 'export' },
    ];

    return (
        <div className="shrink-0 border-t border-neutral-800 bg-neutral-950 select-none">
            <div className="flex items-center gap-1 px-3 h-14 overflow-x-auto scrollbar-hide">
                {/* Import button */}
                <button
                    onClick={onImportClick}
                    aria-label="Ajouter"
                    className="flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 rounded-sm transition-all min-w-[48px] h-11 text-neutral-500 hover:text-white hover:bg-white/5 border border-transparent mr-1"
                    title="Ajouter"
                >
                    <Plus size={14} />
                    <span className="text-[7px] font-mono uppercase tracking-wider leading-none">Ajouter</span>
                </button>

                <div className="w-px h-5 bg-neutral-800 shrink-0 mr-1" />
                {onAiOpen && (
                    <button
                        type="button"
                        data-testid="video-tool-ai-clip"
                        onClick={onAiOpen}
                        title="AI clip"
                        aria-label="AI clip"
                        className="flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-sm transition-all min-w-[52px] h-11 text-cyan-300 hover:text-white hover:bg-cyan-500/10 border border-cyan-500/25"
                    >
                        <Sparkles size={14} />
                        <span className="text-[7px] font-mono uppercase tracking-wider leading-none">AI clip</span>
                    </button>
                )}

                {/* Tools */}
                {tools.map(tool => {
                    const isActive = tool.panel && activePanel === tool.panel;
                    const Icon = tool.icon;
                    const isDisabled = tool.disabled || (!hasClips && !['export', 'text', 'music'].includes(tool.id));
                    return (
                        <button
                            key={tool.id}
                            data-testid={`video-tool-${tool.id}`}
                            onClick={() => {
                                if (isDisabled) return;
                                if (tool.action) tool.action();
                                if (tool.panel) setActivePanel(tool.panel);
                            }}
                            disabled={isDisabled}
                            title={tool.label}
                            aria-label={tool.label}
                            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-sm transition-all min-w-[48px] h-11
                                ${isActive
                                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                                    : 'text-neutral-500 hover:text-white hover:bg-white/5 border border-transparent'
                                }
                                ${tool.id === 'export' ? `sticky right-0 z-10 shadow-[-12px_0_22px_rgba(10,10,10,0.92)] ${isActive ? '' : 'bg-neutral-950'}` : ''}
                                disabled:opacity-25 disabled:cursor-not-allowed
                            `}
                        >
                            <Icon size={14} />
                            <span className="text-[7px] font-mono uppercase tracking-wider leading-none">{tool.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default VideoToolbar;
