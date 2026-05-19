import React, { useState } from 'react';
import { X, Clock, ChevronRight } from 'lucide-react';
import useVideoStore from '../store/videoStore';
import { TRANSITIONS, TRANSITION_CATEGORIES } from '../engine/VideoEngine';

const TransitionPicker = () => {
    const {
        clips, transitions, setTransition, removeTransition, setActivePanel
    } = useVideoStore();

    const [activeCategory, setActiveCategory] = useState('basic');
    const [duration, setDuration] = useState(0.5);
    const [selectedPair, setSelectedPair] = useState(null);

    const filteredTransitions = TRANSITIONS.filter(t => t.category === activeCategory);

    // Build list of adjacent clip pairs
    const pairs = [];
    for (let i = 0; i < clips.length - 1; i++) {
        const key = `${clips[i].id}->${clips[i + 1].id}`;
        pairs.push({
            key,
            fromClip: clips[i],
            toClip: clips[i + 1],
            transition: transitions[key] || null,
            fromIndex: i,
        });
    }

    // Auto-select first pair if none selected
    const activePair = selectedPair ? pairs.find(p => p.key === selectedPair) : pairs[0];

    const applyTransition = (transition) => {
        if (!activePair) return;
        setTransition(activePair.fromClip.id, activePair.toClip.id, {
            type: transition.id,
            name: transition.name,
            icon: transition.icon,
            category: transition.category,
            duration,
        });
    };

    const clearTransition = () => {
        if (!activePair) return;
        removeTransition(activePair.fromClip.id, activePair.toClip.id);
    };

    if (clips.length < 2) {
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
                        Importez au moins 2 clips pour ajouter des transitions entre eux
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                <h3 className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Transitions</h3>
                <button onClick={() => setActivePanel(null)} className="text-neutral-500 hover:text-white transition">
                    <X size={14} />
                </button>
            </div>

            {/* Clip pair selector */}
            <div className="px-3 py-2 border-b border-neutral-800/50 space-y-1">
                <span className="text-[8px] font-mono text-neutral-600 uppercase tracking-widest">Jonction</span>
                <div className="space-y-1">
                    {pairs.map(pair => (
                        <button
                            key={pair.key}
                            onClick={() => setSelectedPair(pair.key)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-sm border text-left transition-all ${
                                activePair?.key === pair.key
                                    ? 'bg-purple-600/15 border-purple-500/30 text-purple-300'
                                    : 'border-neutral-800 text-neutral-400 hover:border-neutral-600'
                            }`}
                        >
                            <span className="text-[9px] font-mono truncate flex-1">{pair.fromClip.name}</span>
                            <ChevronRight size={10} className="text-neutral-600 shrink-0" />
                            <span className="text-[9px] font-mono truncate flex-1">{pair.toClip.name}</span>
                            {pair.transition && (
                                <span className="text-[7px] font-mono text-purple-400 bg-purple-500/10 px-1 rounded shrink-0">
                                    {pair.transition.name}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Current transition info */}
            {activePair?.transition && (
                <div className="px-3 py-2 border-b border-neutral-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-purple-400">{activePair.transition.icon}</span>
                        <span className="text-[9px] font-mono text-purple-300">{activePair.transition.name}</span>
                        <span className="text-[8px] font-mono text-neutral-600">{activePair.transition.duration}s</span>
                    </div>
                    <button
                        onClick={clearTransition}
                        className="text-[8px] font-mono text-neutral-600 hover:text-red-400 transition uppercase"
                    >
                        Retirer
                    </button>
                </div>
            )}

            {/* Duration */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-neutral-800/30">
                <Clock size={11} className="text-neutral-600 shrink-0" />
                <span className="text-[9px] font-mono text-neutral-500 uppercase shrink-0">Duree</span>
                <input
                    type="range" min={0.1} max={2} step={0.1} value={duration}
                    onChange={(e) => setDuration(parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-purple-500"
                />
                <span className="text-[10px] font-mono text-neutral-400 tabular-nums w-8 text-right">{duration}s</span>
            </div>

            {/* Categories */}
            <div className="flex gap-1 px-3 py-2 overflow-x-auto border-b border-neutral-800/30 scrollbar-hide">
                {TRANSITION_CATEGORIES.map(cat => (
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

            {/* Transition grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                <div className="grid grid-cols-3 gap-2">
                    {filteredTransitions.map(transition => {
                        const isActive = activePair?.transition?.type === transition.id;
                        return (
                            <button
                                key={transition.id}
                                onClick={() => applyTransition(transition)}
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
