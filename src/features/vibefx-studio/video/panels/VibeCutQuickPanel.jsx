import React, { useMemo, useState } from 'react';
import { Clapperboard, GripVertical, MousePointer2, Shuffle, Sparkles, Type, Wand2 } from 'lucide-react';
import useVideoStore from '../store/videoStore';
import {
    applyQuickToolToTimeline,
    getQuickToolSequenceSlot,
    getQuickToolPayload,
    QUICK_TOOL_GROUPS,
    QUICK_TOOL_TRANSFER_TYPE,
} from '../utils/quickTools';

const GROUP_ICON = {
    transitions: Shuffle,
    effects: Wand2,
    text: Type,
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

const PANEL_GROUP_MAP = {
    transitions: 'transitions',
    filters: 'effects',
    text: 'text',
};

const GROUP_PANEL_MAP = {
    transitions: 'transitions',
    effects: 'filters',
    text: 'text',
    volets: null,
};

const VibeCutQuickPanel = ({ renderPanel = null } = {}) => {
    const [activeGroupId, setActiveGroupId] = useState(QUICK_TOOL_GROUPS[0]?.id || 'effects');
    const currentTime = useVideoStore((state) => state.currentTime);
    const totalDuration = useVideoStore((state) => state.totalDuration);
    const transitionItems = useVideoStore((state) => state.transitionItems);
    const textOverlays = useVideoStore((state) => state.textOverlays);
    const updateTransitionItem = useVideoStore((state) => state.updateTransitionItem);
    const updateTextOverlay = useVideoStore((state) => state.updateTextOverlay);
    const setSelectedTransitionId = useVideoStore((state) => state.setSelectedTransitionId);
    const setSelectedTextId = useVideoStore((state) => state.setSelectedTextId);
    const activePanel = useVideoStore((state) => state.activePanel);
    const setActivePanel = useVideoStore((state) => state.setActivePanel);
    const activeGroup = useMemo(() => (
        QUICK_TOOL_GROUPS.find(group => group.id === activeGroupId) || QUICK_TOOL_GROUPS[0]
    ), [activeGroupId]);
    const placedSequenceSlots = useMemo(() => (
        (transitionItems || []).reduce((slots, item) => {
            const slot = item?.params?.sequenceSlot || item?.params?.placement;
            if (slot === 'intro' || slot === 'outro') {
                slots[slot] = item;
            }
            return slots;
        }, {})
    ), [transitionItems]);
    const sequenceEditors = useMemo(() => (
        ['intro', 'outro'].map((slot) => {
            const item = placedSequenceSlots[slot];
            if (!item) return null;
            const linkedTextId = item.params?.linkedTextId || `sequence-${slot}-text`;
            const text = (textOverlays || []).find(overlay => overlay.id === linkedTextId)
                || (textOverlays || []).find(overlay => overlay.params?.sequenceSlot === slot)
                || null;
            return { slot, item, text };
        }).filter(Boolean)
    ), [placedSequenceSlots, textOverlays]);

    const handleApply = (tool) => {
        applyQuickToolToTimeline(useVideoStore, tool, { startTime: currentTime });
    };

    const handleGroupSelect = (groupId) => {
        setActiveGroupId(groupId);
        const nextPanel = GROUP_PANEL_MAP[groupId] || null;
        if (nextPanel && activePanel !== nextPanel) {
            setActivePanel(nextPanel);
            return;
        }
        if (!nextPanel && activePanel) setActivePanel(null);
    };

    const detailedPanel = activePanel && renderPanel ? renderPanel() : null;
    const showQuickTools = !detailedPanel;

    const handleSequenceTextChange = (editor, content) => {
        if (!editor?.text?.id) return;
        updateTextOverlay(editor.text.id, { content }, { history: true });
        setSelectedTextId(null);
        setSelectedTransitionId(editor.item.id);
        setActivePanel(null);
    };

    const handleSequenceDurationChange = (editor, rawValue) => {
        if (!editor?.item?.id) return;
        const duration = clampSequenceDuration(rawValue);
        const textRange = getSequenceTextRange(editor.slot, editor.item, duration, totalDuration);
        updateTransitionItem(editor.item.id, { duration, startTime: textRange.startTime, endTime: textRange.endTime }, { history: true });
        if (editor.text?.id) {
            updateTextOverlay(editor.text.id, textRange, { history: true });
        }
        setSelectedTransitionId(editor.item.id);
        setSelectedTextId(null);
        setActivePanel(null);
    };

    return (
        <aside
            data-testid="vibecut-quick-panel"
            className="hidden w-96 shrink-0 flex-col border-l border-neutral-800 bg-neutral-950/98 2xl:w-[28rem] lg:flex"
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

            <div className="grid grid-cols-4 gap-1 border-b border-neutral-800 p-2">
                {QUICK_TOOL_GROUPS.map((group) => {
                    const Icon = GROUP_ICON[group.id] || Sparkles;
                    const accent = ACCENT_CLASS[group.accent] || ACCENT_CLASS.purple;
                    const active = group.id === (PANEL_GROUP_MAP[activePanel] || activeGroup.id);
                    return (
                        <button
                            key={group.id}
                            type="button"
                            data-testid={`quick-tool-group-${group.id}`}
                            aria-pressed={active}
                            onClick={() => handleGroupSelect(group.id)}
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

            {detailedPanel ? (
                <div className="min-h-0 flex-1 overflow-hidden" data-testid="vibecut-unified-panel">
                    {detailedPanel}
                </div>
            ) : (
            <div className="min-h-0 flex-1 overflow-y-auto p-3 custom-scrollbar">
                <div className="space-y-2">
                    {activeGroup.tools.map((tool) => {
                        const accent = ACCENT_CLASS[activeGroup.accent] || ACCENT_CLASS.purple;
                        const sequenceSlot = getQuickToolSequenceSlot(tool);
                        const placedSequence = sequenceSlot ? placedSequenceSlots[sequenceSlot] : null;
                        const sequenceState = placedSequence
                            ? (placedSequence.type === tool.transitionId ? 'Place' : 'Remplace')
                            : null;
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
                                            <span className="flex shrink-0 items-center gap-1">
                                                {sequenceState && (
                                                    <span className="rounded-sm border border-purple-400/25 bg-purple-500/10 px-1 py-0.5 text-[7px] font-mono uppercase tracking-widest text-purple-200">
                                                        {sequenceState}
                                                    </span>
                                                )}
                                                <GripVertical size={12} className="text-neutral-600 transition group-hover:text-neutral-300" />
                                            </span>
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

                {activeGroup.id === 'volets' && sequenceEditors.length > 0 && (
                    <div className="mt-4 space-y-3 border-t border-neutral-800 pt-3">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[8px] font-mono uppercase tracking-widest text-neutral-500">Reglage volet</span>
                            <span className="text-[8px] font-mono uppercase tracking-widest text-purple-300/70">
                                Texte + duree
                            </span>
                        </div>
                        {sequenceEditors.map((editor) => {
                            const duration = clampSequenceDuration(editor.item.duration || 1);
                            const label = editor.slot === 'intro' ? 'Intro' : 'Fin';
                            return (
                                <div
                                    key={editor.slot}
                                    data-testid={`volet-config-${editor.slot}`}
                                    className="rounded-sm border border-purple-500/20 bg-purple-500/[0.045] p-2.5"
                                >
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <span className="truncate text-[9px] font-mono uppercase tracking-widest text-purple-200">
                                            {label} - {editor.item.name}
                                        </span>
                                        <span className="shrink-0 text-[8px] font-mono tabular-nums text-purple-300/70">
                                            {duration.toFixed(1)}s
                                        </span>
                                    </div>
                                    <label className="block">
                                        <span className="mb-1 block text-[8px] font-mono uppercase tracking-widest text-neutral-500">Texte</span>
                                        <input
                                            type="text"
                                            data-testid={`volet-text-${editor.slot}`}
                                            value={editor.text?.content || ''}
                                            onChange={(event) => handleSequenceTextChange(editor, event.target.value)}
                                            className="h-8 w-full rounded-sm border border-neutral-800 bg-black/50 px-2 text-[10px] font-mono uppercase tracking-wider text-neutral-100 outline-none transition placeholder:text-neutral-700 focus:border-purple-300/60"
                                            placeholder={editor.slot === 'intro' ? 'Texte intro' : 'Texte fin'}
                                        />
                                    </label>
                                    <div className="mt-2 grid grid-cols-[1fr_3.8rem] items-center gap-2">
                                        <label className="min-w-0">
                                            <span className="sr-only">Duree du volet {label}</span>
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="4"
                                                step="0.1"
                                                value={duration}
                                                onChange={(event) => handleSequenceDurationChange(editor, event.target.value)}
                                                className="w-full accent-purple-400"
                                            />
                                        </label>
                                        <input
                                            type="number"
                                            min="0.5"
                                            max="4"
                                            step="0.1"
                                            data-testid={`volet-duration-${editor.slot}`}
                                            value={duration}
                                            onChange={(event) => handleSequenceDurationChange(editor, event.target.value)}
                                            className="h-8 rounded-sm border border-neutral-800 bg-black/50 px-1 text-center text-[10px] font-mono tabular-nums text-neutral-100 outline-none transition focus:border-purple-300/60"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            )}

            {showQuickTools && (
            <div className="border-t border-neutral-800 p-3">
                <div className="flex items-start gap-2 rounded-sm border border-neutral-800 bg-black/30 p-2">
                    <MousePointer2 size={12} className="mt-0.5 shrink-0 text-neutral-500" />
                    <p className="text-[8px] font-mono uppercase leading-relaxed tracking-widest text-neutral-600">
                        Cliquez pour placer au curseur. Les transitions se calent sur le cut le plus proche.
                    </p>
                </div>
            </div>
            )}
        </aside>
    );
};

function clampSequenceDuration(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 1;
    return Math.max(0.5, Math.min(4, numeric));
}

function getSequenceTextRange(slot, item, duration, totalDuration) {
    const previousDuration = Math.max(0.1, Number(item?.duration ?? ((item?.endTime ?? 0) - (item?.startTime ?? item?.start ?? 0))) || 0.1);
    const baseDuration = slot === 'outro' ? Math.max(0, (totalDuration || previousDuration) - previousDuration) : 0;
    const startTime = slot === 'outro' ? baseDuration : 0;
    return {
        startTime,
        endTime: startTime + duration,
    };
}

export default VibeCutQuickPanel;
