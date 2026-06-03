import React, { useEffect } from 'react';
import { X, Sun, Contrast, Droplets, Thermometer, Eye, RotateCcw, SlidersHorizontal } from 'lucide-react';
import useVideoStore from '../store/videoStore';
import { isTrackLocked } from '../model/timelineModel';

const DEFAULT_FILTERS = {
    exposure: 0,
    brightness: 100,
    contrast: 100,
    pivot: 50,
    saturation: 100,
    vibrance: 0,
    temperature: 0,
    tint: 0,
    hue: 0,
    shadows: 0,
    midtones: 0,
    highlights: 0,
    fade: 0,
    vignette: 0,
    grain: 0,
};

const FILTER_SECTIONS = [
    {
        title: 'Base',
        hint: 'Exposition, contraste et point de pivot',
        controls: [
            { key: 'exposure', label: 'Exposition', icon: Sun, min: -100, max: 100, default: 0, display: value => `${formatSigned(value / 100, 2)} EV` },
            { key: 'brightness', label: 'Luminosite', icon: Sun, min: 0, max: 200, default: 100, display: value => `${value}%` },
            { key: 'contrast', label: 'Contraste', icon: Contrast, min: 0, max: 200, default: 100, display: value => `${value}%` },
            { key: 'pivot', label: 'Pivot', icon: SlidersHorizontal, min: 0, max: 100, default: 50, display: value => (value / 100).toFixed(2) },
        ],
    },
    {
        title: 'Couleur',
        hint: 'Balance, teinte et saturation sociale',
        controls: [
            { key: 'temperature', label: 'Temperature', icon: Thermometer, min: -100, max: 100, default: 0, display: value => formatSigned(value) },
            { key: 'tint', label: 'Teinte vert/magenta', icon: Droplets, min: -100, max: 100, default: 0, display: value => formatSigned(value) },
            { key: 'hue', label: 'Rotation hue', icon: Droplets, min: -180, max: 180, default: 0, display: value => `${formatSigned(value)} deg` },
            { key: 'saturation', label: 'Saturation', icon: Droplets, min: 0, max: 200, default: 100, display: value => `${value}%` },
            { key: 'vibrance', label: 'Vibrance', icon: Droplets, min: -100, max: 100, default: 0, display: value => formatSigned(value) },
        ],
    },
    {
        title: 'Tons',
        hint: 'Corrections ciblees ombres / mediums / hautes lumieres',
        controls: [
            { key: 'shadows', label: 'Ombres', icon: Contrast, min: -100, max: 100, default: 0, display: value => formatSigned(value) },
            { key: 'midtones', label: 'Mediums', icon: Contrast, min: -100, max: 100, default: 0, display: value => formatSigned(value) },
            { key: 'highlights', label: 'Hautes lumieres', icon: Contrast, min: -100, max: 100, default: 0, display: value => formatSigned(value) },
        ],
    },
    {
        title: 'Finition',
        hint: 'Texture film, noirs leves et bord image',
        controls: [
            { key: 'fade', label: 'Fade film', icon: Eye, min: 0, max: 100, default: 0, display: value => `${value}%` },
            { key: 'vignette', label: 'Vignette', icon: Eye, min: 0, max: 100, default: 0, display: value => `${value}%` },
            { key: 'grain', label: 'Grain', icon: null, min: 0, max: 100, default: 0, display: value => `${value}%` },
        ],
    },
];

const VISION_PRESETS = [
    { name: 'Clean Social', mood: 'Rec.709 net', filters: { contrast: 108, saturation: 106, vibrance: 12, vignette: 8 } },
    { name: 'Neon Pop', mood: 'Reels punchy', filters: { contrast: 118, pivot: 45, temperature: -6, tint: 4, saturation: 112, vibrance: 28, vignette: 18 } },
    { name: 'Cyberpunk', mood: 'Neon froid', filters: { brightness: 95, contrast: 130, pivot: 44, saturation: 130, vibrance: 18, temperature: -20, tint: 8, shadows: -10, vignette: 25, grain: 5 } },
    { name: 'Warm Film', mood: 'Lifestyle chaud', filters: { exposure: 15, contrast: 110, temperature: 14, tint: 3, saturation: 104, fade: 10, grain: 14, vignette: 10 } },
    { name: 'Cool Tech', mood: 'Produit futuriste', filters: { contrast: 114, temperature: -16, tint: 2, highlights: 8, shadows: -6, saturation: 98, vignette: 12 } },
    { name: 'Soft Pastel', mood: 'Doux et clair', filters: { exposure: 20, contrast: 92, saturation: 94, vibrance: 16, fade: 8, vignette: 4 } },
    { name: 'Soft Dream', mood: 'Legacy doux', filters: { brightness: 108, contrast: 85, saturation: 90, vibrance: 14, temperature: 10, vignette: 5, grain: 0 } },
    { name: 'High Contrast Mono', mood: 'Editorial noir/blanc', filters: { saturation: 0, contrast: 128, pivot: 50, shadows: -12, highlights: 10, grain: 8, vignette: 18 } },
    { name: 'Faded Retro', mood: 'Vintage social', filters: { contrast: 90, fade: 24, temperature: 8, saturation: 88, grain: 22, vignette: 24 } },
    { name: 'Bleach Bypass', mood: 'Dramatique froid', filters: { contrast: 132, saturation: 62, vibrance: -12, shadows: -16, highlights: 12, temperature: -6, grain: 10 } },
];

function formatSigned(value, digits = 0) {
    const numeric = Number(value) || 0;
    const formatted = digits > 0 ? numeric.toFixed(digits) : Math.round(numeric).toString();
    return numeric > 0 ? `+${formatted}` : formatted;
}

const FilterVideoPanel = ({ onClose = null } = {}) => {
    const {
        selectedClipId, clips, updateClip, setActivePanel, tracks,
        filterPreviewBypassClipId, setFilterPreviewBypassClipId
    } = useVideoStore();

    const clip = clips.find(c => c.id === selectedClipId);
    const filters = { ...DEFAULT_FILTERS, ...(clip?.filters || {}) };
    const effectLocked = isTrackLocked(tracks, 'effect-main');
    const previewMode = selectedClipId && filterPreviewBypassClipId === selectedClipId ? 'before' : 'after';

    useEffect(() => {
        if (filterPreviewBypassClipId && filterPreviewBypassClipId !== selectedClipId) {
            setFilterPreviewBypassClipId(null);
        }
    }, [filterPreviewBypassClipId, selectedClipId, setFilterPreviewBypassClipId]);

    useEffect(() => (
        () => setFilterPreviewBypassClipId(null)
    ), [setFilterPreviewBypassClipId]);

    const handleFilterChange = (key, value) => {
        if (effectLocked) return;
        if (!selectedClipId) return;
        updateClip(selectedClipId, { filters: { ...filters, [key]: value } });
    };

    const applyPreset = (preset) => {
        if (effectLocked) return;
        if (!selectedClipId) return;
        updateClip(selectedClipId, { filters: { ...DEFAULT_FILTERS, ...preset.filters } });
    };

    const resetFilters = () => {
        if (effectLocked) return;
        if (!selectedClipId) return;
        updateClip(selectedClipId, {
            filters: { ...DEFAULT_FILTERS }
        });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                <h3 className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Filtres</h3>
                <button onClick={onClose || (() => setActivePanel(null))} className="text-neutral-500 hover:text-white transition">
                    <X size={14} />
                </button>
            </div>

            {!selectedClipId ? (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Selectionnez un clip</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
                    <div className="rounded-sm border border-cyan-500/20 bg-cyan-500/5 p-2 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono text-cyan-300/80 uppercase tracking-widest">Preview filtre</span>
                            <span className="text-[8px] font-mono text-neutral-500 uppercase" data-testid="filter-preview-mode">
                                {previewMode === 'before' ? 'Avant' : 'Apres'}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                            <button
                                type="button"
                                aria-pressed={previewMode === 'before'}
                                data-testid="filter-preview-before"
                                onClick={() => setFilterPreviewBypassClipId(selectedClipId)}
                                className={`rounded-sm border px-2 py-1.5 text-[9px] font-mono uppercase tracking-widest transition ${
                                    previewMode === 'before'
                                        ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200'
                                        : 'border-neutral-800 bg-neutral-950/50 text-neutral-500 hover:border-neutral-600 hover:text-neutral-200'
                                }`}
                            >
                                Avant
                            </button>
                            <button
                                type="button"
                                aria-pressed={previewMode === 'after'}
                                data-testid="filter-preview-after"
                                onClick={() => setFilterPreviewBypassClipId(null)}
                                className={`rounded-sm border px-2 py-1.5 text-[9px] font-mono uppercase tracking-widest transition ${
                                    previewMode === 'after'
                                        ? 'border-indigo-400/40 bg-indigo-400/10 text-indigo-200'
                                        : 'border-neutral-800 bg-neutral-950/50 text-neutral-500 hover:border-neutral-600 hover:text-neutral-200'
                                }`}
                            >
                                Apres
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Looks cinema</span>
                            <span className="text-[8px] font-mono text-neutral-700 uppercase tracking-widest">SDR social</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                            {VISION_PRESETS.map(preset => (
                                <button
                                    key={preset.name}
                                    onClick={() => applyPreset(preset)}
                                    disabled={effectLocked}
                                    aria-label={preset.name}
                                    className="group min-h-16 rounded-sm border border-neutral-800 bg-neutral-950/70 px-3 py-2 text-left transition hover:border-indigo-500/40 hover:bg-indigo-500/5 disabled:opacity-40 disabled:hover:border-neutral-800 disabled:hover:bg-neutral-950/70"
                                >
                                    <span className="block text-[9px] font-mono uppercase tracking-wider text-neutral-300 group-hover:text-indigo-200">{preset.name}</span>
                                    <span className="mt-1 block text-[8px] font-mono uppercase tracking-widest text-neutral-600">{preset.mood}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 border-t border-neutral-800 pt-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Etalonnage avance</span>
                            <button onClick={resetFilters} disabled={effectLocked} className="flex items-center gap-1 text-[8px] font-mono text-neutral-600 hover:text-white transition uppercase disabled:opacity-40 disabled:hover:text-neutral-600">
                                <RotateCcw size={9} />
                                Reset
                            </button>
                        </div>

                        {FILTER_SECTIONS.map(section => (
                            <div key={section.title} className="rounded-sm border border-neutral-800/80 bg-neutral-950/45 p-3">
                                <div className="mb-3 flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[9px] font-mono uppercase tracking-widest text-neutral-300">{section.title}</p>
                                        <p className="mt-0.5 text-[8px] font-mono uppercase tracking-widest text-neutral-700">{section.hint}</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {section.controls.map(ctrl => {
                                        const Icon = ctrl.icon;
                                        const value = Number.isFinite(Number(filters[ctrl.key])) ? Number(filters[ctrl.key]) : ctrl.default;
                                        return (
                                            <div key={ctrl.key} className="space-y-1.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        {Icon && <Icon size={10} className="shrink-0 text-neutral-600" />}
                                                        <span className="truncate text-[9px] font-mono uppercase tracking-wider text-neutral-500">{ctrl.label}</span>
                                                    </div>
                                                    <span className={`shrink-0 text-[9px] font-mono tabular-nums ${value === ctrl.default ? 'text-neutral-500' : 'text-indigo-200'}`}>
                                                        {ctrl.display ? ctrl.display(value) : value}
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={ctrl.min}
                                                    max={ctrl.max}
                                                    aria-label={ctrl.label}
                                                    value={value}
                                                    disabled={effectLocked}
                                                    onChange={(e) => handleFilterChange(ctrl.key, parseInt(e.target.value, 10))}
                                                    className="w-full h-1 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-indigo-500 disabled:cursor-not-allowed disabled:opacity-45"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilterVideoPanel;
