import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Play, Pause, Shuffle, Copy, Download, Maximize, Zap, Sparkles, ChevronDown } from 'lucide-react';
import Select from '../ui/Select';

const PRESET_PALETTES = [
    { name: 'Midnight Ember', colors: ['#f12711', '#f5af19', '#ff4b1f', '#0a0a0a'] },
    { name: 'Aurora Borealis', colors: ['#10b981', '#3b82f6', '#06b6d4', '#171717'] },
    { name: 'Cyberpunk', colors: ['#ec4899', '#8b5cf6', '#3b82f6', '#0a0a0a'] },
    { name: 'Deep Space', colors: ['#0f2027', '#203a43', '#2c5364', '#050505'] },
];

const MeshGradientPro = ({ isOpen, onClose, isDarkMode, initialColors, onApply }) => {
    const [palette, setPalette] = useState(PRESET_PALETTES[0]);
    const [colors, setColors] = useState(initialColors || PRESET_PALETTES[0].colors);
    const [isPlaying, setIsPlaying] = useState(true);

    const [params, setParams] = useState({
        distortion: 20,
        swirl: 15,
        scale: 100,
        rotation: 45,
        speed: 50,
        edgeGrain: 20,
        filmGrain: 10
    });

    const [aspect, setAspect] = useState('1080x1080');
    const [format, setFormat] = useState('PNG');

    const blob1 = useRef(null);
    const blob2 = useRef(null);
    const blob3 = useRef(null);
    const blob4 = useRef(null);
    const blob5 = useRef(null);
    const blob6 = useRef(null);

    const isPlayingRef = useRef(isPlaying);
    isPlayingRef.current = isPlaying;
    const paramsRef = useRef(params);
    paramsRef.current = params;

    useEffect(() => {
        let req;
        let t = 0;
        const tick = () => {
            const p = paramsRef.current;
            t += 0.003 * (p.speed / 50) * (isPlayingRef.current ? 1 : 0);

            const d = p.distortion * 4; // Amplitude based on distortion
            const s = p.swirl / 100;    // Scale fluctuation

            const update = (ref, tX, tY, sX) => {
                if (ref.current) {
                    ref.current.style.transform = `translate(${tX}px, ${tY}px) scale(${1 + s * sX})`;
                }
            };

            update(blob1, Math.sin(t) * d, Math.cos(t * 1.2) * d, 0.5);
            update(blob2, Math.cos(t * 1.1) * d, Math.sin(t * 0.9) * d, 1.0);
            update(blob3, Math.sin(t * 0.8) * d, Math.cos(t * 1.3) * d, 0.8);
            update(blob4, Math.cos(t * 1.4) * d, Math.sin(t * 0.7) * d, -0.5);
            update(blob5, Math.sin(t * 1.2) * d, Math.cos(t * 0.8) * d, 0.4);
            update(blob6, Math.cos(t * 0.9) * d, Math.sin(t * 1.1) * d, -0.6);

            req = requestAnimationFrame(tick);
        };
        req = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(req);
    }, []);

    const updateParam = (key, value) => setParams(prev => ({ ...prev, [key]: value }));

    const handleRandomize = () => {
        setParams({
            distortion: Math.floor(Math.random() * 100),
            swirl: Math.floor(Math.random() * 100),
            scale: 50 + Math.floor(Math.random() * 150),
            rotation: Math.floor(Math.random() * 360),
            speed: 10 + Math.floor(Math.random() * 90),
            edgeGrain: Math.floor(Math.random() * 50),
            filmGrain: Math.floor(Math.random() * 50)
        });
        const randomPalette = PRESET_PALETTES[Math.floor(Math.random() * PRESET_PALETTES.length)];
        setColors(randomPalette.colors);
    };

    const shuffleColors = () => {
        setColors(prev => [...prev].sort(() => Math.random() - 0.5));
    };

    // Calculate aspect ratio styling
    const getPreviewStyle = () => {
        let aspectRatio = '1/1';
        let maxWidth = '460px'; // Increase base size for better visibility of gradients

        if (aspect === '1080x1080') {
            aspectRatio = '1/1';
            maxWidth = '460px'; // Carré: 460x460
        } else if (aspect === '1080x1350') {
            aspectRatio = '4/5';
            maxWidth = '440px'; // Portrait 4:5 : 440x550
        } else if (aspect === '1080x1920') {
            aspectRatio = '9/16';
            maxWidth = '310px'; // Story 9:16 : 310x551
        } else if (aspect === '1920x1080') {
            aspectRatio = '16/9';
            maxWidth = '700px'; // Paysage 16:9 : 700x393 (Tire profit de la largeur de l'écran)
        }

        return {
            height: 'auto',
            width: '100%',
            maxWidth: maxWidth,
            aspectRatio
        };
    };

    if (!isOpen) return null;

    // Design System (v2.0) styles mapping
    const bgBase = isDarkMode ? 'bg-[#050505]' : 'bg-gray-100';
    const bgPanel = isDarkMode ? 'bg-[#0a0a0a]' : 'bg-white';
    const borderColor = isDarkMode ? 'border-[#171717]' : 'border-gray-200';
    const textPrimary = isDarkMode ? 'text-[#e5e5e5]' : 'text-gray-900';
    const textSecondary = isDarkMode ? 'text-[#737373]' : 'text-gray-500';
    const separator = isDarkMode ? 'border-[#262626]' : 'border-gray-200';

    return createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-8" style={{ pointerEvents: 'auto' }}>
            {/* 1. Click Catcher (Invisible, just for closing) */}
            <div className="absolute inset-0 pointer-events-auto" onClick={onClose} />

            {/* 2. Base Soft Blur (Floute un peu tout le fond pour la lisibilité) */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    backgroundColor: 'rgba(5, 5, 5, 0.2)'
                }}
            />

            {/* 3. Progressive Intense Blur (Tous les côtés - Vignette Radiale) */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backdropFilter: 'blur(100px)',
                    WebkitBackdropFilter: 'blur(100px)',
                    WebkitMaskImage: 'radial-gradient(circle at center, transparent 30%, black 85%)',
                    maskImage: 'radial-gradient(circle at center, transparent 30%, black 85%)'
                }}
            />

            {/* 4. Fog Atmosphere (Brouillard qui se rassemble sur les 4 côtés) */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(circle at center, transparent 30%, rgba(5,5,5,0.6) 75%, rgba(0,0,0,0.95) 100%)'
                }}
            />

            {/* Modal Container */}
            <div className={`relative w-[80vw] max-w-[1200px] h-[80vh] min-h-[600px] max-h-[900px] flex overflow-hidden rounded-2xl border ${borderColor} shadow-[0_0_120px_rgba(0,0,0,0.8)] ${bgBase} animate-in zoom-in-95 duration-300`}>

                {/* Header/Nav (Absolute Top) */}
                <div className={`absolute top-0 left-0 w-full h-12 flex items-center justify-between px-6 border-b ${separator} bg-black/20 backdrop-blur-md z-10`}>
                    <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-indigo-500" />
                        <span className={`font-mono text-xs tracking-widest uppercase font-bold ${textPrimary}`}>Mesh Studio</span>
                    </div>
                    <button onClick={onClose} className={`p-2 hover:bg-white/5 rounded-sm transition-colors ${textSecondary} hover:${textPrimary}`}>
                        <X size={16} />
                    </button>
                </div>

                {/* Left Sidebar: Controls */}
                <div className={`w-[320px] h-full pt-16 pb-6 px-5 border-r ${separator} ${bgPanel} flex flex-col gap-6 overflow-y-auto custom-scrollbar z-0`}>

                    <button onClick={handleRandomize} className="w-full py-2.5 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[10px] uppercase tracking-widest font-bold rounded-sm transition-all active:scale-[0.98]">
                        <Shuffle size={14} /> Randomize
                    </button>

                    {/* Palette */}
                    <div className="space-y-3">
                        <div className={`font-mono text-[10px] uppercase tracking-widest ${textSecondary}`}>Palette</div>
                        <div className={`flex items-center p-2 border ${borderColor} rounded-sm bg-black/20 cursor-pointer hover:border-indigo-500 transition-colors`}>
                            <div className="flex gap-1.5 flex-1">
                                {colors.map((c, i) => (
                                    <div key={i} className="relative w-3.5 h-3.5 rounded-full border border-black/50 shadow-inner overflow-hidden" style={{ backgroundColor: c }}>
                                        <input
                                            type="color"
                                            value={c}
                                            onChange={(e) => {
                                                const newColors = [...colors];
                                                newColors[i] = e.target.value;
                                                setColors(newColors);
                                            }}
                                            className="absolute inset-[-10px] w-[calc(100%+20px)] h-[calc(100%+20px)] cursor-pointer opacity-0"
                                        />
                                    </div>
                                ))}
                            </div>
                            <span className={`font-mono text-[10px] ${textPrimary}`}>{palette.name}</span>
                        </div>
                        <button onClick={shuffleColors} className={`w-full py-1.5 flex items-center justify-center gap-2 border ${borderColor} hover:bg-white/5 font-mono text-[10px] uppercase tracking-widest rounded-sm ${textPrimary} transition-all`}>
                            <Shuffle size={12} /> Shuffle Palette
                        </button>
                    </div>

                    <div className={`w-full h-px border-t ${separator}`} />

                    {/* Parameters */}
                    <div className="space-y-4">
                        <div className={`font-mono text-[10px] uppercase tracking-widest ${textSecondary} flex justify-between`}>
                            Parameters
                        </div>

                        <SliderControl label="Distortion" value={params.distortion} onChange={(v) => updateParam('distortion', v)} />
                        <SliderControl label="Swirl" value={params.swirl} onChange={(v) => updateParam('swirl', v)} />
                        <SliderControl label="Scale" value={params.scale} onChange={(v) => updateParam('scale', v)} max={200} />
                        <SliderControl label="Rotation" value={params.rotation} onChange={(v) => updateParam('rotation', v)} max={360} suffix="°" />

                        <div className="flex items-center gap-2 mt-2">
                            <span className={`font-mono text-[10px] uppercase tracking-widest flex-1 ${textSecondary}`}>Speed</span>
                            <button onClick={() => setIsPlaying(!isPlaying)} className={`p-1 hover:bg-white/5 rounded-sm ${textPrimary}`}>
                                {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                            </button>
                            <input
                                type="range"
                                min="0" max="100"
                                value={params.speed}
                                onChange={(e) => updateParam('speed', Number(e.target.value))}
                                className="w-24 h-[2px] bg-neutral-800 appearance-none outline-none rounded-none accent-indigo-500 hover:scale-y-[2] transition-transform"
                            />
                            <span className={`font-mono text-[10px] w-8 text-right ${textPrimary}`}>{params.speed}%</span>
                        </div>
                    </div>

                    <div className={`w-full h-px border-t ${separator}`} />

                    {/* Grain */}
                    <div className="space-y-4">
                        <div className={`font-mono text-[10px] uppercase tracking-widest ${textSecondary}`}>Grain</div>
                        <SliderControl label="Edge Grain" value={params.edgeGrain} onChange={(v) => updateParam('edgeGrain', v)} />
                        <SliderControl label="Film Grain" value={params.filmGrain} onChange={(v) => updateParam('filmGrain', v)} />
                    </div>

                </div>

                {/* Right Area: Preview & Export */}
                <div className="flex-1 flex flex-col pt-12">

                    {/* Preview Area - Dynamic Center */}
                    <div className="flex-1 flex items-center justify-center p-12 overflow-hidden relative" style={{ backgroundImage: 'radial-gradient(circle, #262626 1px, transparent 1px)', backgroundSize: '16px 16px', backgroundPosition: 'center' }}>

                        <div className={`relative transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-2xl rounded-sm overflow-hidden border ${borderColor}`} style={getPreviewStyle()}>
                            {/* CSS Organic Mesh Engine */}
                            <div className="absolute inset-0 overflow-hidden" style={{ background: colors[0] }}>
                                <div
                                    className="absolute inset-0 w-full h-full"
                                    style={{
                                        filter: 'blur(70px) saturate(150%)',
                                        transform: `rotate(${params.rotation}deg) scale(${1.2 + (params.scale / 100) * 0.8})`,
                                        transformOrigin: 'center center'
                                    }}
                                >
                                    <div ref={blob1} className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full opacity-90 transition-transform mix-blend-screen" style={{ background: colors[1 % colors.length] }} />
                                    <div ref={blob2} className="absolute bottom-[-20%] right-[-10%] w-[90%] h-[90%] rounded-full opacity-90 transition-transform mix-blend-screen" style={{ background: colors[2 % colors.length] }} />
                                    <div ref={blob3} className="absolute top-[10%] right-[-30%] w-[70%] h-[70%] rounded-full opacity-90 transition-transform mix-blend-screen" style={{ background: colors[3 % colors.length] || colors[0] }} />
                                    <div ref={blob4} className="absolute bottom-[0%] left-[-20%] w-[80%] h-[80%] rounded-full opacity-80 transition-transform mix-blend-screen" style={{ background: colors[1 % colors.length] }} />
                                    <div ref={blob5} className="absolute top-[30%] left-[20%] w-[100%] h-[100%] rounded-full opacity-70 transition-transform mix-blend-screen" style={{ background: colors[2 % colors.length] }} />
                                    <div ref={blob6} className="absolute bottom-[20%] right-[20%] w-[80%] h-[80%] rounded-full opacity-80 transition-transform mix-blend-screen" style={{ background: colors[3 % colors.length] || colors[0] }} />
                                </div>
                            </div>


                            {/* Film Grain specific to preview */}
                            {params.filmGrain > 0 && (
                                <div className="absolute inset-0 opacity-[0.1]" style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                                    mixBlendMode: 'overlay'
                                }} />
                            )}
                        </div>

                        {/* Corner markers for immersion */}
                        <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-neutral-600"></div>
                        <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-neutral-600"></div>
                        <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-neutral-600"></div>
                        <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-neutral-600"></div>
                    </div>

                    {/* Bottom Export Bar */}
                    <div className={`h-16 border-t ${separator} px-6 flex items-center justify-between bg-black/40 backdrop-blur-md`}>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <span className={`font-mono text-[10px] uppercase tracking-widest ${textSecondary}`}>Aspect:</span>
                                <Select
                                    value={aspect}
                                    onChange={setAspect}
                                    isDarkMode={isDarkMode}
                                    options={[
                                        { value: "1080x1080", label: "Publication Insta (1:1)" },
                                        { value: "1080x1350", label: "Publication Insta (4:5)" },
                                        { value: "1080x1920", label: "Story / Réel (9:16)" },
                                        { value: "1920x1080", label: "Paysage (16:9)" }
                                    ]}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`font-mono text-[10px] uppercase tracking-widest ${textSecondary}`}>Format:</span>
                                <div className={`flex border ${borderColor} rounded-sm overflow-hidden`}>
                                    {['PNG', 'WebP'].map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setFormat(f)}
                                            className={`px-3 py-1 font-mono text-[10px] ${format === f ? 'bg-indigo-600 text-white' : `bg-transparent ${textPrimary} hover:bg-white/5`}`}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={() => onApply && onApply(colors)} className={`px-4 py-2 font-mono text-[10px] uppercase tracking-widest border ${borderColor} rounded-sm hover:bg-white/5 ${textPrimary} flex items-center gap-2 transition-all`}>
                                <Copy size={12} /> Apply to Studio
                            </button>
                            <button className={`px-4 py-2 font-mono text-[10px] uppercase tracking-widest rounded-sm bg-white text-black hover:bg-gray-200 flex items-center gap-2 transition-all font-bold`}>
                                <Download size={12} /> Download
                            </button>
                        </div>
                    </div>

                </div>

            </div>
        </div>,
        document.body
    );
};

// Subcomponent for Sliders
const SliderControl = ({ label, value, onChange, min = 0, max = 100, suffix = '%' }) => {
    return (
        <div className="flex items-center justify-between gap-3 group">
            <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 group-hover:text-neutral-300 transition-colors w-24">
                {label}
            </span>
            <input
                type="range"
                min={min} max={max}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="flex-1 h-[2px] bg-neutral-800 appearance-none outline-none rounded-none accent-indigo-500 hover:scale-y-[2] transition-transform cursor-pointer"
            />
            <span className="font-mono text-[10px] text-neutral-400 w-8 text-right">
                {value}{suffix}
            </span>
        </div>
    );
};

export default MeshGradientPro;
