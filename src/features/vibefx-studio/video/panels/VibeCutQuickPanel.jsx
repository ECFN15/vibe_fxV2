import React, { useMemo, useState } from 'react';
import { Clapperboard, GripVertical, MousePointer2, Sparkles, Type, Wand2 } from 'lucide-react';
import useVideoStore from '../store/videoStore';
import {
    applyQuickToolToTimeline,
    getQuickToolPayload,
    QUICK_TOOL_GROUPS,
    QUICK_TOOL_TRANSFER_TYPE,
} from '../utils/quickTools';

const GROUP_ICON = {
    effects: Wand2,
    text: Type,
    animations: Sparkles,
    volets: Clapperboard,
};

const ACCENT_CLASS = {
    cyan: {
        active: 'border-cyan-400/35 bg-cyan-400/10 text-cyan-200',
        card: 'hover:border-cyan-300/45 hover:bg-cyan-500/[0.08]',
        dot: 'bg-cyan-300',
    },
    amber: {
        active: 'border-amber-400/35 bg-amber-400/10 text-amber-200',
        card: 'hover:border-amber-300/45 hover:bg-amber-500/[0.08]',
        dot: 'bg-amber-300',
    },
    purple: {
        active: 'border-purple-400/35 bg-purple-400/10 text-purple-200',
        card: 'hover:border-purple-300/45 hover:bg-purple-500/[0.08]',
        dot: 'bg-purple-300',
    },
};

const VibeCutQuickPanel = () => {
    const [activeGroupId, setActiveGroupId] = useState(QUICK_TOOL_GROUPS[0]?.id || 'effects');
    const currentTime = useVideoStore((state) => state.currentTime);
    const activeGroup = useMemo(() => (
        QUICK_TOOL_GROUPS.find(group => group.id === activeGroupId) || QUICK_TOOL_GROUPS[0]
    ), [activeGroupId]);

    const handleApply = (tool) => {
        applyQuickToolToTimeline(useVideoStore, tool, { startTime: currentTime });
    };

    return (
        <aside
            data-testid="vibecut-quick-panel"
            className="hidden w-72 shrink-0 flex-col border-l border-neutral-800 bg-neutral-950/98 lg:flex"
        >
            <div className="border-b border-neutral-800 px-3 py-3">
                <p className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">VibeCut</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                    <h2 className="text-[11px] font-mono uppercase tracking-widest text-neutral-200">Outils rapides</h2>
                    <span className="rounded-sm border border-neutral-800 bg-black/40 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest text-neutral-500">
                        Drag/drop
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-1 border-b border-neutral-800 p-2">
                {QUICK_TOOL_GROUPS.map((group) => {
                    const Icon = GROUP_ICON[group.id] || Sparkles;
                    const accent = ACCENT_CLASS[group.accent] || ACCENT_CLASS.purple;
                    const active = group.id === activeGroup.id;
                    return (
                        <button
                            key={group.id}
                            type="button"
                            data-testid={`quick-tool-group-${group.id}`}
                            aria-pressed={active}
                            onClick={() => setActiveGroupId(group.id)}
                            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-sm border px-1 text-[8px] font-mono uppercase tracking-widest transition ${
                                active
                                    ? accent.active
                                    : 'border-neutral-800 bg-neutral-900/45 text-neutral-500 hover:border-neutral-600 hover:text-neutral-200'
                            }`}
                        >
                            <Icon size={13} />
                            <span className="truncate">{group.label}</span>
                        </button>
                    );
                })}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 custom-scrollbar">
                <div className="space-y-2">
                    {activeGroup.tools.map((tool) => {
                        const accent = ACCENT_CLASS[activeGroup.accent] || ACCENT_CLASS.purple;
                        return (
                            <button
                                key={tool.id}
                                type="button"
                                draggable
                                data-testid={`quick-tool-${tool.id}`}
                                onClick={() => handleApply(tool)}
                                onDragStart={(event) => {
                                    event.dataTransfer.effectAllowed = 'copy';
                                    event.dataTransfer.setData(QUICK_TOOL_TRANSFER_TYPE, getQuickToolPayload(tool));
                                    event.dataTransfer.setData('text/plain', tool.label);
                                }}
                                className={`group w-full rounded-sm border border-neutral-800 bg-neutral-900/55 p-3 text-left transition ${accent.card}`}
                            >
                                <span className="flex items-start gap-2">
                                    <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${accent.dot}`} />
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center justify-between gap-2">
                                            <span className="truncate text-[10px] font-mono uppercase tracking-widest text-neutral-200">
                                                {tool.label}
                                            </span>
                                            <GripVertical size={12} className="shrink-0 text-neutral-600 transition group-hover:text-neutral-300" />
                                        </span>
                                        <span className="mt-1 block text-[9px] font-mono uppercase tracking-wider text-neutral-600">
                                            {tool.detail}
                                        </span>
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="border-t border-neutral-800 p-3">
                <div className="flex items-start gap-2 rounded-sm border border-neutral-800 bg-black/30 p-2">
                    <MousePointer2 size={12} className="mt-0.5 shrink-0 text-neutral-500" />
                    <p className="text-[8px] font-mono uppercase leading-relaxed tracking-widest text-neutral-600">
                        Cliquez pour placer au curseur, ou glissez sur une piste de la timeline.
                    </p>
                </div>
            </div>
        </aside>
    );
};

export default VibeCutQuickPanel;
