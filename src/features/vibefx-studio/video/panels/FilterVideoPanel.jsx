import React from 'react';
import { X, Sun, Contrast, Droplets, Thermometer, Eye, RotateCcw } from 'lucide-react';
import useVideoStore from '../store/videoStore';
import { isTrackLocked } from '../model/timelineModel';

const FILTER_CONTROLS = [
    { key: 'brightness', label: 'Luminosite', icon: Sun, min: 0, max: 200, default: 100 },
    { key: 'contrast', label: 'Contraste', icon: Contrast, min: 0, max: 200, default: 100 },
    { key: 'saturation', label: 'Saturation', icon: Droplets, min: 0, max: 200, default: 100 },
    { key: 'temperature', label: 'Temperature', icon: Thermometer, min: -100, max: 100, default: 0 },
    { key: 'vignette', label: 'Vignette', icon: Eye, min: 0, max: 100, default: 0 },
    { key: 'grain', label: 'Grain', min: 0, max: 100, default: 0 },
];

const VISION_PRESETS = [
    { name: 'Classic Chrome', filters: { brightness: 98, contrast: 115, saturation: 85, temperature: 5, vignette: 15, grain: 8 } },
    { name: 'Portra 400', filters: { brightness: 103, contrast: 95, saturation: 92, temperature: 8, vignette: 10, grain: 5 } },
    { name: 'Velvia', filters: { brightness: 100, contrast: 120, saturation: 140, temperature: -5, vignette: 10, grain: 3 } },
    { name: 'Eterna', filters: { brightness: 97, contrast: 90, saturation: 80, temperature: -3, vignette: 8, grain: 6 } },
    { name: 'Gold 200', filters: { brightness: 105, contrast: 105, saturation: 110, temperature: 15, vignette: 12, grain: 10 } },
    { name: 'Monochrome', filters: { brightness: 100, contrast: 115, saturation: 0, temperature: 0, vignette: 20, grain: 15 } },
    { name: 'Cyberpunk', filters: { brightness: 95, contrast: 130, saturation: 130, temperature: -20, vignette: 25, grain: 5 } },
    { name: 'Soft Dream', filters: { brightness: 108, contrast: 85, saturation: 90, temperature: 10, vignette: 5, grain: 0 } },
];

const FilterVideoPanel = () => {
    const { selectedClipId, clips, updateClip, setActivePanel, tracks } = useVideoStore();

    const clip = clips.find(c => c.id === selectedClipId);
    const filters = clip?.filters || { brightness: 100, contrast: 100, saturation: 100, temperature: 0, vignette: 0, grain: 0 };
    const videoLocked = isTrackLocked(tracks, 'video-main');

    const handleFilterChange = (key, value) => {
        if (videoLocked) return;
        if (!selectedClipId) return;
        updateClip(selectedClipId, { filters: { ...filters, [key]: value } });
    };

    const applyPreset = (preset) => {
        if (videoLocked) return;
        if (!selectedClipId) return;
        updateClip(selectedClipId, { filters: { ...preset.filters } });
    };

    const resetFilters = () => {
        if (videoLocked) return;
        if (!selectedClipId) return;
        updateClip(selectedClipId, {
            filters: { brightness: 100, contrast: 100, saturation: 100, temperature: 0, vignette: 0, grain: 0 }
        });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                <h3 className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Filtres</h3>
                <button onClick={() => setActivePanel(null)} className="text-neutral-500 hover:text-white transition">
                    <X size={14} />
                </button>
            </div>

            {!selectedClipId ? (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Selectionnez un clip</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
                    <div className="space-y-2">
                        <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Presets</span>
                        <div className="grid grid-cols-2 gap-1.5">
                            {VISION_PRESETS.map(preset => (
                                <button
                                    key={preset.name}
                                    onClick={() => applyPreset(preset)}
                                    disabled={videoLocked}
                                    className="px-3 py-2 text-[9px] font-mono text-neutral-400 border border-neutral-800 rounded-sm hover:border-indigo-500/40 hover:text-indigo-400 hover:bg-indigo-500/5 transition text-left disabled:opacity-40 disabled:hover:border-neutral-800 disabled:hover:text-neutral-400 disabled:hover:bg-transparent"
                                >
                                    {preset.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3 border-t border-neutral-800 pt-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Ajuster</span>
                            <button onClick={resetFilters} disabled={videoLocked} className="flex items-center gap-1 text-[8px] font-mono text-neutral-600 hover:text-white transition uppercase disabled:opacity-40 disabled:hover:text-neutral-600">
                                <RotateCcw size={9} />
                                Reset
                            </button>
                        </div>

                        {FILTER_CONTROLS.map(ctrl => {
                            const Icon = ctrl.icon;
                            return (
                                <div key={ctrl.key} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {Icon && <Icon size={10} className="text-neutral-600" />}
                                            <span className="text-[9px] font-mono text-neutral-500 uppercase">{ctrl.label}</span>
                                        </div>
                                        <span className="text-[9px] font-mono text-neutral-400 tabular-nums">{filters[ctrl.key]}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={ctrl.min} max={ctrl.max}
                                        aria-label={ctrl.label}
                                        value={filters[ctrl.key]}
                                        disabled={videoLocked}
                                        onChange={(e) => handleFilterChange(ctrl.key, parseInt(e.target.value))}
                                        className="w-full h-1 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-indigo-500 disabled:cursor-not-allowed disabled:opacity-45"
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilterVideoPanel;
