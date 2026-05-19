import React, { useState } from 'react';
import { Palette, Layers, Sparkles } from 'lucide-react';
import { NOISE_PATTERN_CANVAS } from '../../utils/canvasUtils';

import ControlGroup from '../ui/ControlGroup';
import SmoothBlurPopup from './SmoothBlurPopup';

const BackgroundPanel = ({ images, isDarkMode, layoutBgBlur, setLayoutBgBlur, layoutBgColor, setLayoutBgColor, layoutBgTexture, setLayoutBgTexture, layoutSmoothBlur, setLayoutSmoothBlur, showGuidelines, setShowGuidelines }) => {
    const [showSmoothBlurPopup, setShowSmoothBlurPopup] = useState(false);
    return (
        <div className="w-full">
            <div className={`flex flex-col gap-4 py-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>

                {/* BLUR THROUGH TOGGLE */}
                <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${isDarkMode ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-gray-200 shadow-sm'} ${layoutBgBlur ? 'ring-1 ring-indigo-500/50' : ''}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${layoutBgBlur ? 'bg-indigo-500/20 text-indigo-400' : (isDarkMode ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-500')}`}>
                            <Layers size={16} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold uppercase tracking-wider">Flou Arrière-plan</span>
                            <span className="text-[9px] opacity-60">{"Floute l'image principale en fond"}</span>
                        </div>
                    </div>
                    <button onClick={() => setLayoutBgBlur(!layoutBgBlur)} className={`w-11 h-6 rounded-full p-1 transition-colors relative shadow-inner ${layoutBgBlur ? 'bg-indigo-500' : (isDarkMode ? 'bg-neutral-700' : 'bg-gray-300')}`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${layoutBgBlur ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </button>
                </div>

                {/* FLOU LISSE (SMOOTH BLUR) */}
                <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${isDarkMode ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-gray-200 shadow-sm'} ${layoutSmoothBlur?.enabled ? 'ring-1 ring-indigo-500/50' : ''}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${layoutSmoothBlur?.enabled ? 'bg-indigo-500/20 text-indigo-400' : (isDarkMode ? 'bg-neutral-800 text-neutral-400' : 'bg-gray-100 text-gray-500')}`}>
                            <Sparkles size={16} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold uppercase tracking-wider">Flou Lisse</span>
                            <span className="text-[9px] opacity-60">Effet progressif directionnel</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSmoothBlurPopup(true)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-sm text-[9px] font-mono font-bold uppercase transition-all border ${isDarkMode ? 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20' : 'border-indigo-300 text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}
                        >
                            <Sparkles size={10} />
                            PRO MODE
                        </button>
                        <button onClick={() => setLayoutSmoothBlur({ ...layoutSmoothBlur, enabled: !layoutSmoothBlur.enabled })} className={`w-11 h-6 rounded-full p-1 transition-colors relative shadow-inner ${layoutSmoothBlur?.enabled ? 'bg-indigo-500' : (isDarkMode ? 'bg-neutral-700' : 'bg-gray-300')}`}>
                            <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${layoutSmoothBlur?.enabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </button>
                    </div>
                </div>

                {/* COLOR PALETTE */}
                <div className={`flex flex-col gap-3 p-4 rounded-2xl border transition-all duration-300 ${layoutBgBlur ? 'opacity-40 pointer-events-none grayscale-[50%]' : 'opacity-100'} ${isDarkMode ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest opacity-70">{"Couleur d'arrière-plan"}</span>
                    <div className="flex flex-wrap gap-2">
                        {/* Custom Color Picker */}
                        <div className={`relative flex items-center justify-center w-8 h-8 rounded-md overflow-hidden border-2 shadow-sm transition-transform hover:scale-105 active:scale-95 ${isDarkMode ? 'border-neutral-600' : 'border-gray-300'}`} title="Couleur personnalisée">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 pointer-events-none opacity-80"></div>
                            <input type="color" value={layoutBgColor} onChange={(e) => setLayoutBgColor(e.target.value)} className="absolute -top-4 -left-4 w-16 h-16 cursor-pointer opacity-0" />
                            <Palette size={14} className="pointer-events-none text-white drop-shadow-md z-10" />
                        </div>

                        {/* Preset Colors - Aesthetic / Vibe OS Theme */}
                        {[
                            '#09090b', // Noir Vibe (Gris très foncé)
                            '#fafafa', // Blanc cassé
                            '#1e1b4b', // Deep Indigo (Tech)
                            '#2e1065', // Deep Purple (Cyber)
                            '#052e16', // Forest Green
                            '#450a0a', // Deep Red/Burgundy
                            '#fef08a', // Pastel Yellow
                            '#fed7aa', // Pastel Orange
                            '#fbcfe8', // Pastel Peach
                        ].map(c => (
                            <button
                                key={c}
                                onClick={() => setLayoutBgColor(c)}
                                className={`w-8 h-8 rounded-md border-2 transition-all hover:scale-110 active:scale-95 shadow-sm ${layoutBgColor === c ? 'border-indigo-500 ring-2 ring-indigo-500/30' : (isDarkMode ? 'border-neutral-700' : 'border-gray-200')}`}
                                style={{ backgroundColor: c }}
                                title={c}
                            />
                        ))}
                    </div>
                </div>

                {/* TEXTURE */}
                <div className={`flex flex-col gap-2 p-4 rounded-2xl border ${isDarkMode ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <ControlGroup label="Texture Film (Grain visuel)" value={layoutBgTexture} onChange={setLayoutBgTexture} min={0} max={50} unit="%" isDarkMode={isDarkMode} />
                    <p className={`text-[9px] ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}>
                        {'Ajoute un effet "matière" ou "papier granuleux" par-dessus votre couleur de fond. Mettez à 0 pour une couleur lisse.'}
                    </p>
                </div>

                {/* SHOW PANORAMA GUIDELINES */}
                <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${isDarkMode ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`flex flex-col`}>
                            <span className="text-xs font-bold uppercase tracking-wider">Guides Panoramique</span>
                            <span className="text-[9px] opacity-60">Afficher les lignes de coupe rouges (Pano x2/x3)</span>
                        </div>
                    </div>
                    <button onClick={() => setShowGuidelines(!showGuidelines)} className={`w-11 h-6 rounded-full p-1 transition-colors relative shadow-inner ${showGuidelines ? 'bg-indigo-500' : (isDarkMode ? 'bg-neutral-700' : 'bg-gray-300')}`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${showGuidelines ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </button>
                </div>
            </div>

            <SmoothBlurPopup
                images={images}
                isOpen={showSmoothBlurPopup}
                onClose={() => setShowSmoothBlurPopup(false)}
                isDarkMode={isDarkMode}
                initialConfig={layoutSmoothBlur}
                onApply={(newConfig) => {
                    setLayoutSmoothBlur({ ...newConfig, enabled: true });
                }}
            />
        </div>
    );
};

export default BackgroundPanel;
