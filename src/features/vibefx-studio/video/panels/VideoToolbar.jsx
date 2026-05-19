import React from 'react';
import { Scissors, Type, Sparkles, Music, Gauge, Download, Filter, Trash2, Plus, Library } from 'lucide-react';
import useVideoStore from '../store/videoStore';

const VideoToolbar = ({ onImportClick }) => {
    const {
        clips, selectedClipId,
        splitClip, removeClip, activePanel, setActivePanel, transitions
    } = useVideoStore();

    const hasClips = clips.length > 0;

    const handleSplit = () => {
        if (!selectedClipId) return;
        const state = useVideoStore.getState();
        const currentTime = state.currentTime;
        let elapsed = 0;
        for (let i = 0; i < clips.length; i++) {
            const c = clips[i];
            const dur = (c.trimEnd - c.trimStart) / (c.speed || 1);
            let transitionDur = 0;
            if (i < clips.length - 1) {
                const key = `${c.id}->${clips[i + 1].id}`;
                if (transitions[key]) transitionDur = transitions[key].duration || 0;
            }
            if (c.id === selectedClipId) {
                if (currentTime >= elapsed && currentTime <= elapsed + dur) {
                    const localTime = c.trimStart + (currentTime - elapsed) * (c.speed || 1);
                    splitClip(c.id, localTime);
                }
                return;
            }
            elapsed += (dur - transitionDur);
        }
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
            <div className="flex items-center gap-1 px-3 h-12 overflow-x-auto scrollbar-hide">
                {/* Import button */}
                <button
                    onClick={onImportClick}
                    className="flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 rounded-sm transition-all min-w-[48px] h-9 text-neutral-500 hover:text-white hover:bg-white/5 border border-transparent mr-1"
                    title="Ajouter"
                >
                    <Plus size={14} />
                    <span className="text-[7px] font-mono uppercase tracking-wider leading-none">Ajouter</span>
                </button>

                <div className="w-px h-5 bg-neutral-800 shrink-0 mr-1" />

                {/* Tools */}
                {tools.map(tool => {
                    const isActive = tool.panel && activePanel === tool.panel;
                    const Icon = tool.icon;
                    const isDisabled = tool.disabled || (!hasClips && !['export', 'text', 'music'].includes(tool.id));
                    return (
                        <button
                            key={tool.id}
                            onClick={() => {
                                if (isDisabled) return;
                                if (tool.action) tool.action();
                                if (tool.panel) setActivePanel(tool.panel);
                            }}
                            disabled={isDisabled}
                            title={tool.label}
                            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-sm transition-all min-w-[48px] h-9
                                ${isActive
                                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                                    : 'text-neutral-500 hover:text-white hover:bg-white/5 border border-transparent'
                                }
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
