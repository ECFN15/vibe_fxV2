import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Eraser, RefreshCcw, Shuffle, Sparkles, X } from 'lucide-react';
import {
    DEFAULT_SMOOTH_BLUR_CONFIG,
    SMOOTH_BLUR_LOOK_PRESETS,
    SMOOTH_BLUR_LIMITS,
    createDisabledSmoothBlurConfig,
    createRandomSmoothBlurConfig,
    normalizeSmoothBlurConfig,
    resolveSmoothBlurLayers,
} from '@/features/vibefx-shared/utils/smoothBlur';

const DIRS = [
    { id: 'up', icon: ArrowUp },
    { id: 'down', icon: ArrowDown },
    { id: 'right', icon: ArrowRight },
    { id: 'left', icon: ArrowLeft },
];

const EASE_TYPES = [
    { id: 'in', label: 'Dans' },
    { id: 'out', label: 'Dehors' },
    { id: 'inOut', label: 'Entree Sortie' },
];

const PRESETS = [
    { id: 'linear', label: 'Lineaire' },
    { id: 'sine', label: 'Sinus' },
    { id: 'quad', label: 'Quad' },
    { id: 'cubic', label: 'Cubique' },
    { id: 'quart', label: 'Quart' },
    { id: 'quint', label: 'Quint' },
    { id: 'expo', label: 'Expo' },
    { id: 'circ', label: 'Circ' },
];

const CurveIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 opacity-60">
        <path d="M4 20c8 0 16-16 16-16" />
    </svg>
);

const createInitialConfig = (initialConfig) => normalizeSmoothBlurConfig(
    initialConfig || DEFAULT_SMOOTH_BLUR_CONFIG,
    { enabledDefault: true }
);

const resolvePreviewImageSrc = (images) => {
    const firstImage = Array.isArray(images) ? images.find(Boolean) : null;
    if (!firstImage) return '';
    if (typeof firstImage === 'string') return firstImage;
    return firstImage.currentSrc || firstImage.src || firstImage.url || firstImage.dataUrl || '';
};

const DottedSlider = ({ label, testId, value, onChange, min = 0, max = 100, suffix = '' }) => {
    const safeValue = Math.min(max, Math.max(min, Number(value) || min));
    const pct = max === min ? 0 : ((safeValue - min) / (max - min)) * 100;

    return (
        <label className="flex h-14 items-center justify-between rounded-xl bg-white/[0.03] p-3.5 transition-colors hover:bg-white/[0.05]">
            <span className="w-24 shrink-0 text-sm font-semibold text-neutral-400">{label}</span>
            <span className="relative flex h-full min-w-0 flex-1 items-center px-4">
                <span className="pointer-events-none absolute inset-x-4 flex h-[2px] items-center justify-between opacity-20">
                    {[...Array(11)].map((_, i) => <span key={i} className="h-[3px] w-[3px] rounded-full bg-white" />)}
                </span>
                <input
                    type="range"
                    data-testid={testId}
                    aria-label={label}
                    min={min}
                    max={max}
                    value={safeValue}
                    onChange={(event) => onChange(Number(event.target.value))}
                    className="absolute inset-x-4 z-10 h-full w-[calc(100%-2rem)] cursor-pointer opacity-0"
                />
                <span className="pointer-events-none absolute left-4 right-4 h-full" aria-hidden="true">
                    <span
                        className="absolute top-1/2 h-5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-neutral-300 shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                        style={{ left: `${pct}%` }}
                    />
                </span>
            </span>
            <span className="w-16 shrink-0 text-right text-sm font-bold tabular-nums text-neutral-300">{safeValue}{suffix}</span>
        </label>
    );
};

export default function SmoothBlurPopup({ images, isOpen, onClose, isDarkMode, initialConfig, onApply, previewCanvasRef }) {
    const [config, setConfig] = useState(() => createInitialConfig(initialConfig));
    const [canvasPreviewSrc, setCanvasPreviewSrc] = useState('');

    useEffect(() => {
        if (isOpen) setConfig(createInitialConfig(initialConfig));
    }, [isOpen, initialConfig]);

    useEffect(() => {
        if (!isOpen) {
            setCanvasPreviewSrc('');
            return;
        }

        const canvas = previewCanvasRef?.current;
        if (!canvas?.width || !canvas?.height) {
            setCanvasPreviewSrc('');
            return;
        }

        try {
            setCanvasPreviewSrc(canvas.toDataURL('image/png'));
        } catch {
            setCanvasPreviewSrc('');
        }
    }, [isOpen, previewCanvasRef, images]);

    const previewImageSrc = useMemo(() => (
        canvasPreviewSrc || resolvePreviewImageSrc(images)
    ), [canvasPreviewSrc, images]);

    if (!isOpen) return null;

    const bgPanel = isDarkMode ? 'bg-[#18181A]' : 'bg-[#FAFAFA]';
    const borderColor = isDarkMode ? 'border-[#2D2D2F]' : 'border-gray-300';
    const previewLayers = config.enabled ? resolveSmoothBlurLayers(config) : [];

    const updateConfig = (key, value) => {
        setConfig((previous) => normalizeSmoothBlurConfig({ ...previous, enabled: true, [key]: value }, { enabledDefault: true }));
    };

    const applyLookPreset = (presetConfig) => {
        setConfig(normalizeSmoothBlurConfig({ ...presetConfig, enabled: true }, { enabledDefault: true }));
    };

    const randomizeConfig = () => setConfig(createRandomSmoothBlurConfig());

    const resetConfig = () => setConfig(createInitialConfig(initialConfig));
    const resetAllConfig = () => setConfig(createDisabledSmoothBlurConfig());
    const applyConfig = () => {
        onApply(normalizeSmoothBlurConfig(config, { enabledDefault: true }));
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-8" style={{ pointerEvents: 'auto' }}>
            <div className="absolute inset-0 pointer-events-auto bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="absolute inset-0 pointer-events-none" style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', backgroundColor: 'rgba(5, 5, 5, 0.2)' }} />
            <div className={`relative flex h-[80vh] min-h-[600px] max-h-[900px] w-[80vw] max-w-[1200px] overflow-hidden rounded-[24px] border ${borderColor} ${bgPanel} shadow-[0_0_120px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300`}>
                <div className={`z-0 flex h-full w-[340px] flex-col gap-2 overflow-y-auto border-r ${borderColor} ${bgPanel} px-6 pb-6 pt-8 text-[#e5e5e5] custom-scrollbar`}>
                    <div className="mb-4 flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold tracking-tight">Flou lisse</span>
                            <span className="font-mono text-xs font-bold text-lime-500">v1.2</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={randomizeConfig} data-testid="smooth-blur-random" className="text-neutral-500 transition-colors hover:text-cyan-200" title="Generer un look aleatoire propre" aria-label="Aleatoire">
                                <Shuffle size={17} />
                            </button>
                            <button type="button" onClick={resetConfig} className="text-neutral-500 transition-colors hover:text-white" title="Revenir aux reglages ouverts" aria-label="Revenir aux reglages ouverts">
                                <RefreshCcw size={18} />
                            </button>
                        </div>
                    </div>
                    <div className="mt-2 flex h-14 items-center justify-between rounded-xl bg-white/[0.03] p-2.5 px-4">
                        <span className="w-24 text-sm font-semibold text-neutral-400">Direction</span>
                        <div className="flex flex-1 items-center justify-end gap-1.5">
                            {DIRS.map(({ id, icon: Icon }) => {
                                const isActive = config.direction === id;
                                return (
                                    <button key={id} type="button" data-testid={`smooth-blur-direction-${id}`} onClick={() => updateConfig('direction', id)} className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${isActive ? 'bg-white/20 text-white shadow-sm' : 'bg-white/[0.04] text-neutral-400 hover:bg-white/10 hover:text-neutral-200'}`}>
                                        <Icon size={18} strokeWidth={2.5} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="mt-2 flex flex-col gap-2">
                        <DottedSlider label="Hauteur" testId="smooth-blur-height" value={config.height} onChange={(value) => updateConfig('height', value)} min={SMOOTH_BLUR_LIMITS.height.min} max={SMOOTH_BLUR_LIMITS.height.max} suffix="%" />
                        <DottedSlider label="Precision" testId="smooth-blur-precision" value={config.precision} onChange={(value) => updateConfig('precision', value)} min={SMOOTH_BLUR_LIMITS.precision.min} max={SMOOTH_BLUR_LIMITS.precision.max} />
                        <DottedSlider label="Flou" testId="smooth-blur-blur" value={config.blur} onChange={(value) => updateConfig('blur', value)} min={SMOOTH_BLUR_LIMITS.blur.min} max={SMOOTH_BLUR_LIMITS.blur.max} suffix="px" />
                    </div>
                    <div className="mt-4 flex flex-col gap-3 rounded-xl bg-white/[0.03] p-5">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Looks rapides</span>
                            <button type="button" onClick={resetAllConfig} data-testid="smooth-blur-reset-all" className="flex items-center gap-1.5 rounded-md border border-red-400/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-200/80 transition hover:border-red-300/40 hover:bg-red-500/10 hover:text-red-100" title="Remettre la preview sans aucun flou">
                                <Eraser size={12} />
                                Reset all
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {SMOOTH_BLUR_LOOK_PRESETS.map(({ id, label, description, config: presetConfig }) => (
                                <button
                                    key={id}
                                    type="button"
                                    data-testid={`smooth-blur-look-${id}`}
                                    onClick={() => applyLookPreset(presetConfig)}
                                    title={description}
                                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-transparent px-3 py-2 text-left text-xs font-bold text-neutral-300 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-white"
                                >
                                    <Sparkles size={13} className="shrink-0 text-cyan-300/80" />
                                    <span className="truncate">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-6 rounded-xl bg-white/[0.03] p-5">
                        <div className="flex flex-col gap-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">{"Type d'assouplissement"}</span>
                            <div className="flex flex-wrap gap-2">
                                {EASE_TYPES.map(({ id, label }) => {
                                    const isActive = config.easeType === id;
                                    return <button key={id} type="button" data-testid={`smooth-blur-ease-${id}`} onClick={() => updateConfig('easeType', id)} className={`flex items-center rounded-lg border px-4 py-1.5 text-sm font-semibold transition-all ${isActive ? 'border-white/20 bg-white/[0.12] text-white shadow-sm' : 'border-white/10 bg-transparent text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-200'}`}><CurveIcon />{label}</button>;
                                })}
                            </div>
                        </div>
                        <div className="flex flex-col gap-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Courbes</span>
                            <div className="flex flex-wrap gap-2">
                                {PRESETS.map(({ id, label }) => {
                                    const isActive = config.preset === id;
                                    return <button key={id} type="button" data-testid={`smooth-blur-preset-${id}`} onClick={() => updateConfig('preset', id)} className={`flex items-center rounded-lg border px-3.5 py-1.5 text-sm font-semibold transition-all ${isActive ? 'border-white/20 bg-white/[0.12] text-white shadow-sm' : 'border-white/10 bg-transparent text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-200'}`}><CurveIcon />{label}</button>;
                                })}
                            </div>
                        </div>
                    </div>
                    <button type="button" data-testid="smooth-blur-reverse" className="mt-4 flex cursor-pointer items-center justify-between rounded-xl bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]" onClick={() => updateConfig('reverse', !config.reverse)}>
                        <span className="text-sm font-bold text-neutral-400">Sens inverse</span>
                        <span className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${config.reverse ? 'border-blue-600 bg-blue-600' : 'border-white/20 bg-transparent'}`}>
                            {config.reverse && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                        </span>
                    </button>
                </div>
                <div className="relative flex flex-1 flex-col" style={{ backgroundImage: 'radial-gradient(circle, #262626 1px, transparent 1px)', backgroundSize: '16px 16px', backgroundPosition: 'center', backgroundColor: isDarkMode ? '#050505' : '#f5f5f5' }}>
                    <div className="absolute right-6 top-6 z-20">
                        <button type="button" onClick={onClose} className="rounded-full p-2 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"><X size={20} /></button>
                    </div>
                    <div className="relative flex flex-1 items-center justify-center overflow-hidden p-12">
                        <div
                            className={`relative overflow-hidden rounded-sm border ${borderColor} shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`}
                            style={{ width: 'min(100%, 440px)', aspectRatio: '4 / 5' }}
                        >
                            {previewImageSrc ? <img src={previewImageSrc} data-testid="smooth-blur-preview-image" className="absolute inset-0 h-full w-full object-cover" alt="Preview Background" /> : <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-neutral-800 font-mono text-[10px] uppercase tracking-widest text-neutral-500">Aucune Image</div>}
                            <div className="pointer-events-none absolute inset-0" data-testid="smooth-blur-preview-layers">
                                {previewLayers.map((layer, index) => <div key={index} className="absolute inset-0" style={{ inset: `-${config.blur}px`, backdropFilter: `blur(${layer.blur.toFixed(2)}px)`, WebkitBackdropFilter: `blur(${layer.blur.toFixed(2)}px)`, maskImage: layer.cssMask, WebkitMaskImage: layer.cssMask }} />)}
                            </div>
                        </div>
                        <div className="absolute left-12 top-12 h-4 w-4 border-l border-t border-neutral-600"></div>
                        <div className="absolute right-12 top-12 h-4 w-4 border-r border-t border-neutral-600"></div>
                        <div className="absolute bottom-12 left-12 h-4 w-4 border-b border-l border-neutral-600"></div>
                        <div className="absolute bottom-12 right-12 h-4 w-4 border-b border-r border-neutral-600"></div>
                    </div>
                    <div className={`flex h-20 items-center justify-between border-t ${borderColor} bg-black/40 px-8 backdrop-blur-md`}>
                        <span className="text-sm text-neutral-500">Flou lisse pro mode</span>
                        <button type="button" onClick={applyConfig} className="rounded-xl bg-blue-600 px-8 py-3 font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all hover:bg-blue-500">APPLIQUER</button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
