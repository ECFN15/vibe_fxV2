import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCcw, Moon, ArrowUp, ArrowDown, ArrowRight, ArrowLeft, X } from 'lucide-react';

const easings = {
    linear: t => t,
    sine: t => 1 - Math.cos((t * Math.PI) / 2),
    quad: t => t * t,
    cubic: t => t * t * t,
    quart: t => t * t * t * t,
    quint: t => t * t * t * t * t,
    expo: t => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
    circ: t => 1 - Math.sqrt(1 - t * t),
};

const renderPreviewMask = (config) => {
    let layers = [];
    const baseEase = easings[config.preset] || easings.linear;

    const ease = (t) => {
        if (config.preset === 'linear') return config.reverse ? 1 - t : t;
        let val = 0;
        if (config.easeType === 'in') val = baseEase(t);
        else if (config.easeType === 'out') val = 1 - baseEase(1 - t);
        else if (config.easeType === 'inOut') val = t < 0.5 ? baseEase(t * 2) / 2 : 1 - baseEase((1 - t) * 2) / 2;
        return config.reverse ? 1 - val : val;
    };

    const dirMap = {
        'up': 'to top',
        'down': 'to bottom',
        'right': 'to right',
        'left': 'to left'
    };

    const P = Math.min(30, Math.max(5, config.precision));
    const step = 100 / P;

    for (let i = 0; i < P; i++) {
        const progress = i / (P - 1);
        const easedProgress = Math.max(0, Math.min(1, ease(progress)));
        const currentBlur = (easedProgress * config.blur).toFixed(2);

        const maskScale = config.height / 100;

        const p1 = Math.max(0, (i * step - 2 * step)) * maskScale;
        const p2 = Math.max(0, (i * step)) * maskScale;
        const p3 = Math.min(100, (i * step + step)) * maskScale;
        const p4 = Math.min(100, (i * step + 3 * step)) * maskScale;

        let finalStop = p4;
        let p3Stop = p3;

        if (i === P - 1) {
            p3Stop = config.height;
            finalStop = 100;
        }

        const maskGradient = `linear-gradient(${dirMap[config.direction]}, rgba(0,0,0,0) ${p1}%, rgba(0,0,0,1) ${p2}%, rgba(0,0,0,1) ${p3Stop}%, rgba(0,0,0,0) ${finalStop}%)`;

        layers.push({
            blur: currentBlur,
            mask: maskGradient
        });
    }

    return layers;
};

const DIRS = [
    { id: 'up', icon: ArrowUp },
    { id: 'down', icon: ArrowDown },
    { id: 'right', icon: ArrowRight },
    { id: 'left', icon: ArrowLeft }
];

const EASE_TYPES = [
    { id: 'in', label: 'Dans' },
    { id: 'out', label: 'Dehors' },
    { id: 'inOut', label: 'Entrée Sortie' }
];

const PRESETS = [
    { id: 'linear', label: 'Linéaire' },
    { id: 'sine', label: 'Sinus' },
    { id: 'quad', label: 'Quad' },
    { id: 'cubic', label: 'Cubique' },
    { id: 'quart', label: 'Litre' },
    { id: 'quint', label: 'Quint' },
    { id: 'expo', label: 'Expo' },
    { id: 'circ', label: 'Circ' }
];

const CurveIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 opacity-60">
        <path d="M4 20c8 0 16-16 16-16" />
    </svg>
);

const DottedSlider = ({ label, value, onChange, min = 0, max = 100, suffix = '' }) => {
    return (
        <div className="flex items-center justify-between p-3.5 bg-white/[0.03] rounded-xl hover:bg-white/[0.05] transition-colors group h-14 relative">
            <span className="font-semibold text-sm text-neutral-400 w-24">
                {label}
            </span>
            <div className="flex-1 px-4 relative flex items-center h-full">
                {/* Dotted background track */}
                <div className="absolute inset-x-4 h-[2px] flex items-center justify-between pointer-events-none opacity-20">
                    {[...Array(11)].map((_, i) => (
                        <div key={i} className="w-[3px] h-[3px] bg-white rounded-full"></div>
                    ))}
                </div>
                {/* Custom thumb logic */}
                <input
                    type="range"
                    min={min} max={max}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="absolute inset-x-4 w-[calc(100%-2rem)] opacity-0 cursor-pointer h-full z-10"
                />
                <div
                    className="h-5 w-1 bg-neutral-300 rounded-sm absolute shadow-[0_0_10px_rgba(255,255,255,0.2)] pointer-events-none"
                    style={{ left: `calc(1rem + ${((value - min) / (max - min)) * 100}% - 2px)` }}
                />
            </div>
            <span className="font-bold text-sm text-neutral-300 w-12 text-right">
                {value}{suffix}
            </span>
        </div>
    );
};

export default function SmoothBlurPopup({ images, isOpen, onClose, isDarkMode, initialConfig, onApply }) {
    const [config, setConfig] = useState(initialConfig || {
        enabled: true,
        direction: 'down',
        height: 54,
        precision: 35,
        blur: 64,
        easeType: 'in',
        preset: 'linear',
        reverse: false
    });

    if (!isOpen) return null;

    const updateConfig = (key, val) => setConfig(prev => ({ ...prev, [key]: val }));

    const previewLayers = renderPreviewMask(config);

    const bgPanel = isDarkMode ? 'bg-[#18181A]' : 'bg-[#FAFAFA]';
    const borderColor = isDarkMode ? 'border-[#2D2D2F]' : 'border-gray-300';
    const textPrimary = isDarkMode ? 'text-[#EFEFEF]' : 'text-gray-900';
    const textSecondary = isDarkMode ? 'text-[#9CA3AF]' : 'text-gray-500';

    return createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-8" style={{ pointerEvents: 'auto' }}>
            {/* 1. Click Catcher */}
            <div className="absolute inset-0 pointer-events-auto bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* 2. Base Soft Blur */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    backgroundColor: 'rgba(5, 5, 5, 0.2)'
                }}
            />

            {/* Modal Container (Like Mesh Studio) */}
            <div className={`relative w-[80vw] max-w-[1200px] h-[80vh] min-h-[600px] max-h-[900px] flex overflow-hidden rounded-[24px] border ${borderColor} shadow-[0_0_120px_rgba(0,0,0,0.8)] ${bgPanel} animate-in zoom-in-95 duration-300`}>

                {/* Left Sidebar: Controls */}
                <div className={`w-[340px] h-full pt-8 pb-6 px-6 border-r ${borderColor} ${bgPanel} flex flex-col gap-2 overflow-y-auto custom-scrollbar z-0 text-[#e5e5e5]`}>

                    {/* Header */}
                    <div className="flex items-center justify-between mb-4 px-1">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-xl tracking-tight">Flou lisse</span>
                            <span className="text-lime-500 text-xs font-mono font-bold">v1.0</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setConfig(initialConfig)} className="text-neutral-500 hover:text-white transition-colors">
                                <RefreshCcw size={18} />
                            </button>
                            <button className="text-neutral-500 hover:text-white transition-colors">
                                <Moon size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Direction Row */}
                    <div className="flex items-center justify-between p-2.5 px-4 bg-white/[0.03] rounded-xl h-14 mt-2">
                        <span className="font-semibold text-sm text-neutral-400 w-24">
                            Direction
                        </span>
                        <div className="flex items-center gap-1.5 flex-1 justify-end">
                            {DIRS.map(d => {
                                const Icon = d.icon;
                                const isActive = config.direction === d.id;
                                return (
                                    <button
                                        key={d.id}
                                        onClick={() => updateConfig('direction', d.id)}
                                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? 'bg-white/20 text-white shadow-sm' : 'bg-white/[0.04] text-neutral-400 hover:bg-white/10 hover:text-neutral-200'}`}
                                    >
                                        <Icon size={18} strokeWidth={2.5} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sliders */}
                    <div className="flex flex-col gap-2 mt-2">
                        <DottedSlider label="Hauteur" value={config.height} onChange={(v) => updateConfig('height', v)} min={0} max={100} suffix="%" />
                        <DottedSlider label="Précision" value={config.precision} onChange={(v) => updateConfig('precision', v)} min={1} max={30} suffix="" />
                        <DottedSlider label="Flou" value={config.blur} onChange={(v) => updateConfig('blur', v)} min={0} max={200} suffix="px" />
                    </div>

                    {/* EASING TYPE + PRESETS */}
                    <div className="mt-4 bg-white/[0.03] rounded-xl p-5 flex flex-col gap-6">

                        <div className="flex flex-col gap-3">
                            <span className="font-bold text-xs text-neutral-500 uppercase tracking-wider">Type d'assouplissement</span>
                            <div className="flex flex-wrap gap-2">
                                {EASE_TYPES.map((ease, idx) => {
                                    const isActive = config.easeType === ease.id;
                                    return (
                                        <button
                                            key={ease.id}
                                            onClick={() => updateConfig('easeType', ease.id)}
                                            className={`flex items-center px-4 py-1.5 rounded-lg border transition-all text-sm font-semibold ${isActive ? 'bg-white/[0.12] border-white/20 text-white shadow-sm' : 'bg-transparent border-white/10 text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-200'}`}
                                        >
                                            <CurveIcon />
                                            {ease.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <span className="font-bold text-xs text-neutral-500 uppercase tracking-wider">Préréglages</span>
                            <div className="flex flex-wrap gap-2">
                                {PRESETS.map(preset => {
                                    const isActive = config.preset === preset.id;
                                    return (
                                        <button
                                            key={preset.id}
                                            onClick={() => updateConfig('preset', preset.id)}
                                            className={`flex items-center px-3.5 py-1.5 rounded-lg border transition-all text-sm font-semibold ${isActive ? 'bg-white/[0.12] border-white/20 text-white shadow-sm' : 'bg-transparent border-white/10 text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-200'}`}
                                        >
                                            <CurveIcon />
                                            {preset.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Area (Sens inverse) */}
                    <div className="mt-4 flex items-center justify-between p-4 bg-white/[0.03] rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer" onClick={() => updateConfig('reverse', !config.reverse)}>
                        <span className="font-bold text-sm text-neutral-400">Sens inverse</span>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${config.reverse ? 'bg-blue-600 border-blue-600' : 'bg-transparent border-white/20'}`}>
                            {config.reverse && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            )}
                        </div>
                    </div>

                </div>

                {/* Right Area: Large Canvas Preview */}
                <div className="flex-1 flex flex-col relative" style={{ backgroundImage: 'radial-gradient(circle, #262626 1px, transparent 1px)', backgroundSize: '16px 16px', backgroundPosition: 'center', backgroundColor: isDarkMode ? '#050505' : '#f5f5f5' }}>

                    {/* Close button on Top Right */}
                    <div className="absolute top-6 right-6 z-20">
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-neutral-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 flex items-center justify-center p-12 overflow-hidden relative">
                        <div className={`relative transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-2xl rounded-sm overflow-hidden border ${borderColor}`} style={{ width: '100%', maxWidth: '440px', aspectRatio: '4/5' }}>
                            {images && images.length > 0 ? (
                                <img src={images[0].src} className="absolute inset-0 w-full h-full object-cover" alt="Preview Background" />
                            ) : (
                                <div className="absolute inset-0 w-full h-full bg-neutral-800 flex items-center justify-center text-neutral-500 font-mono text-[10px] uppercase tracking-widest">
                                    Aucune Image
                                </div>
                            )}

                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={config.direction === 'up' || config.direction === 'down' ? { height: '100%' } : { width: '100%' }}
                            >
                                {previewLayers.map((layer, idx) => (
                                    <div
                                        key={idx}
                                        className="absolute inset-0"
                                        style={{
                                            inset: `-${config.blur}px`,
                                            backdropFilter: `blur(${layer.blur}px)`,
                                            WebkitBackdropFilter: `blur(${layer.blur}px)`,
                                            maskImage: layer.mask,
                                            WebkitMaskImage: layer.mask,
                                        }}
                                    ></div>
                                ))}
                            </div>
                        </div>

                        {/* Corner markers */}
                        <div className="absolute top-12 left-12 w-4 h-4 border-t border-l border-neutral-600"></div>
                        <div className="absolute top-12 right-12 w-4 h-4 border-t border-r border-neutral-600"></div>
                        <div className="absolute bottom-12 left-12 w-4 h-4 border-b border-l border-neutral-600"></div>
                        <div className="absolute bottom-12 right-12 w-4 h-4 border-b border-r border-neutral-600"></div>
                    </div>

                    {/* Bottom Export Bar */}
                    <div className={`h-20 border-t ${borderColor} px-8 flex items-center justify-between bg-black/40 backdrop-blur-md`}>
                        <span className="text-neutral-500 text-sm">Flou lisse pro mode</span>
                        <button onClick={() => {
                            onApply(config);
                            onClose();
                        }} className={`px-8 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]`}>
                            APPLIQUER
                        </button>
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
}
