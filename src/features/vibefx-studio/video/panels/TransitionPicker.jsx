import React, { useEffect, useMemo, useState } from 'react';
import { X, Clock, Crosshair, Trash2 } from 'lucide-react';
import useVideoStore from '../store/videoStore';
import { TRANSITIONS, TRANSITION_CATEGORIES, formatTime } from '../engine/VideoEngine';
import { getSequencePlacement, getTimelineTrackRole, normalizeTransitionItems } from '../model/timelineModel';

const EDITABLE_TRANSITION_CATEGORIES = TRANSITION_CATEGORIES.filter(cat => !['intro', 'outro'].includes(cat.id));

const TransitionPicker = () => {
    const {
        clips, transitionItems, selectedTransitionId, setSelectedTransitionId,
        addTransitionItem, updateTransitionItem, removeTransitionItem,
        setActivePanel, currentTime, totalDuration, tracks
    } = useVideoStore();

    const [activeCategory, setActiveCategory] = useState('basic');
    const normalizedTransitionItems = useMemo(() => (
        normalizeTransitionItems(transitionItems, totalDuration)
            .filter(item => !getSequencePlacement(item))
    ), [totalDuration, transitionItems]);
    const selectedTransition = useMemo(() => {
        if (selectedTransitionId) {
            return normalizedTransitionItems.find(item => item.id === selectedTransitionId) || null;
        }
        return normalizedTransitionItems[0] || null;
    }, [normalizedTransitionItems, selectedTransitionId]);

    const [duration, setDuration] = useState(selectedTransition?.duration || 0.5);
    const filteredTransitions = TRANSITIONS.filter(t => t.category === activeCategory);
    const hasClips = clips.length > 0;
    const transitionTrackOptions = useMemo(() => (
        tracks.filter(track => getTimelineTrackRole(track) === 'transition')
    ), [tracks]);
    const transitionsLocked = transitionTrackOptions.length > 0 && transitionTrackOptions.every(track => track.locked);

    useEffect(() => {
        if (selectedTransition) setDuration(selectedTransition.duration || 0.5);
    }, [selectedTransition]);

    const clampTransitionStart = (start, dur) => {
        const maxStart = Math.max(0, totalDuration - dur);
        return Math.min(maxStart, Math.max(0, start));
    };

    const applyTransition = (transition) => {
        const nextDuration = duration || transition.defaultDuration || 0.5;
        if (transitionsLocked) return;
        if (selectedTransition) {
            updateTransitionItem(selectedTransition.id, {
                type: transition.id,
                name: transition.name,
                icon: transition.icon,
                category: transition.category,
                duration: nextDuration,
            });
            return;
        }

        const startTime = clampTransitionStart(currentTime, nextDuration);
        addTransitionItem({
            type: transition.id,
            name: transition.name,
            icon: transition.icon,
            category: transition.category,
            duration: nextDuration,
            startTime,
        });
    };

    const addAtCursor = () => {
        if (transitionsLocked) return;
        const transition = TRANSITIONS.find(t => t.category === activeCategory) || TRANSITIONS[0];
        const startTime = clampTransitionStart(currentTime, duration || transition.defaultDuration || 0.5);
        addTransitionItem({
            type: transition.id,
            name: transition.name,
            icon: transition.icon,
            category: transition.category,
            duration: duration || transition.defaultDuration || 0.5,
            startTime,
        });
    };

    const updateDuration = (value) => {
        const nextDuration = parseFloat(value);
        setDuration(nextDuration);
        if (selectedTransition && !transitionsLocked) {
            updateTransitionItem(selectedTransition.id, { duration: nextDuration });
        }
    };

    const clearTransition = () => {
        if (!selectedTransition) return;
        if (transitionsLocked) return;
        removeTransitionItem(selectedTransition.id);
    };

    if (!hasClips) {
        return (
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                    <h3 className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Transitions</h3>
                    <button onClick={() => setActivePanel(null)} className="text-neutral-500 hover:text-white transition">
                        <X size={14} />
                    </button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
                    <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                        Importez une video pour placer les animations sur la timeline Effets.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                <div>
                    <h3 className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Transitions</h3>
                    <p className="text-[8px] font-mono uppercase tracking-wider text-neutral-600 mt-0.5">
                        Timeline Effets entre la video et le texte
                    </p>
                </div>
                <button onClick={() => setActivePanel(null)} className="text-neutral-500 hover:text-white transition">
                    <X size={14} />
                </button>
            </div>

            <div className="px-3 py-2 border-b border-neutral-800/50 space-y-2">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-[8px] font-mono text-neutral-600 uppercase tracking-widest">Placees</span>
                    <button
                        onClick={addAtCursor}
                        disabled={transitionsLocked}
                        className="flex items-center gap-1 text-[8px] font-mono text-purple-300 hover:text-white border border-purple-500/25 hover:border-purple-400/60 rounded-sm px-2 py-1 transition"
                    >
                        <Crosshair size={10} /> Ajouter au curseur
                    </button>
                </div>

                {normalizedTransitionItems.length === 0 ? (
                    <p className="text-[9px] font-mono text-neutral-600 leading-relaxed">
                        Choisissez une animation ci-dessous: elle sera creee au temps courant, puis deplacable sur la timeline Effets.
                    </p>
                ) : (
                    <div className="space-y-1 max-h-28 overflow-y-auto custom-scrollbar">
                        {normalizedTransitionItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setSelectedTransitionId(item.id)}
                                data-testid="transition-picker-item"
                                data-transition-start={item.start.toFixed(3)}
                                data-transition-duration={item.duration.toFixed(3)}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-sm border text-left transition-all ${
                                    item.id === selectedTransition?.id
                                        ? 'bg-purple-600/15 border-purple-500/30 text-purple-300'
                                        : 'border-neutral-800 text-neutral-400 hover:border-neutral-600'
                                }`}
                            >
                                <span className="text-[10px] shrink-0">{item.icon}</span>
                                <span className="text-[9px] font-mono truncate flex-1">{item.name}</span>
                                <span className="text-[8px] font-mono text-neutral-600 tabular-nums">
                                    {formatTime(item.start)} - {formatTime(item.start + item.duration)}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {selectedTransition && (
                <div className="px-3 py-2 border-b border-neutral-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-purple-400">{selectedTransition.icon}</span>
                        <span className="text-[9px] font-mono text-purple-300">{selectedTransition.name}</span>
                        <span className="text-[8px] font-mono text-neutral-600">{selectedTransition.duration.toFixed(1)}s</span>
                    </div>
                    <button
                        onClick={clearTransition}
                        disabled={transitionsLocked}
                        className="flex items-center gap-1 text-[8px] font-mono text-neutral-600 hover:text-red-400 transition uppercase disabled:opacity-40 disabled:hover:text-neutral-600"
                    >
                        <Trash2 size={10} /> Retirer
                    </button>
                </div>
            )}

            <div className="flex items-center gap-3 px-4 py-2 border-b border-neutral-800/30">
                <Clock size={11} className="text-neutral-600 shrink-0" />
                <span className="text-[9px] font-mono text-neutral-500 uppercase shrink-0">Duree</span>
                <input
                    type="range" min={0.1} max={2} step={0.1} value={duration}
                    aria-label="Duree de transition"
                    disabled={transitionsLocked}
                    onChange={(e) => updateDuration(e.target.value)}
                    className="flex-1 h-1 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-purple-500 disabled:cursor-not-allowed disabled:opacity-45"
                />
                <span className="text-[10px] font-mono text-neutral-400 tabular-nums w-8 text-right">{duration.toFixed(1)}s</span>
            </div>

            <div className="flex gap-1 px-3 py-2 overflow-x-auto border-b border-neutral-800/30 scrollbar-hide">
                {EDITABLE_TRANSITION_CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest whitespace-nowrap transition-all rounded-sm
                            ${activeCategory === cat.id
                                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                                : 'text-neutral-500 hover:text-white border border-transparent hover:border-neutral-700'
                            }`}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                <div className="grid grid-cols-3 gap-2">
                    {filteredTransitions.map(transition => {
                        const isActive = selectedTransition?.type === transition.id;
                        return (
                            <button
                                key={transition.id}
                                onClick={() => applyTransition(transition)}
                                disabled={transitionsLocked}
                                aria-label={transition.name}
                                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-sm border transition-all group ${
                                    isActive
                                        ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                                        : 'bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:border-purple-500/50 hover:bg-neutral-900 hover:text-white'
                                }`}
                            >
                                <div className="w-full aspect-video bg-neutral-800 overflow-hidden flex items-center justify-center relative group-hover:scale-105 transition-transform">
                                    <div className="absolute inset-0 flex">
                                        <div className="w-1/2 h-full bg-purple-900/40 border-r border-purple-500/20" />
                                        <div className="w-1/2 h-full bg-indigo-900/40" />
                                    </div>
                                    <span className="text-base z-10 leading-none">{transition.icon}</span>
                                </div>
                                <span className="text-[8px] font-mono uppercase tracking-wider leading-none text-center">{transition.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default TransitionPicker;
