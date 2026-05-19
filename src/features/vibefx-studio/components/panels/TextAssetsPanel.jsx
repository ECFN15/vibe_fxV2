import React from 'react';
import { Type, Scaling, RotateCcw, Droplet, Bold, Italic, Trash2, Square, Type as TypeIcon, Maximize, ArrowRightLeft } from 'lucide-react';
import { FONT_OPTIONS } from '../../data/constants';
import ControlGroup from '../ui/ControlGroup';
import Select from '../ui/Select';

const TextAssetsPanel = ({
    isDarkMode,
    addText,
    currentText,
    updateActiveText,
    deleteActiveText,
    setActiveTextId,
}) => {

    const handleSwapColors = () => {
        if (!currentText) return;
        const oldColor = currentText.color || '#ffffff';
        const oldBgColor = currentText.bgColor || '#000000';
        updateActiveText('color', oldBgColor);
        updateActiveText('bgColor', oldColor);
    };

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-4">
                <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}>Gérer les éléments</span>
                <button onClick={addText} className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-mono font-bold uppercase transition shadow-md">+ Nouveau Texte</button>
            </div>

            {currentText ? (
                <div className={`p-5 rounded-2xl border mb-6 animate-in slide-in-from-right-4 ${isDarkMode ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400">Édition en cours</span>
                        <button onClick={() => setActiveTextId(null)} className="text-[10px] uppercase font-bold text-gray-500 hover:text-indigo-400 transition">Terminer</button>
                    </div>

                    {/* INPUT PRINCIPAL */}
                    <input
                        type="text"
                        value={currentText.content}
                        onChange={(e) => updateActiveText('content', e.target.value)}
                        className={`w-full bg-transparent border-b-2 px-0 py-2 text-lg font-bold focus:outline-none focus:border-indigo-500 mb-6 transition-colors ${isDarkMode ? 'border-neutral-700 text-white' : 'border-gray-300 text-black'}`}
                        placeholder="Votre texte ici..."
                    />

                    {/* FOND DYNAMIQUE (V2) - EXTENDED DESIGNS */}
                    <div className="mb-6">
                        <span className={`block text-[10px] font-mono font-bold uppercase tracking-widest mb-3 ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}>Style de Fond & Design</span>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            {[
                                { id: 'none', label: 'Brut', icon: <TypeIcon size={16} className="opacity-70" /> },
                                { id: 'solid', label: 'Bloc', icon: <Square size={16} fill="currentColor" /> },
                                { id: 'rounded', label: 'Bulle', icon: <rect width="16" height="16" rx="4" fill="currentColor" /> },
                                { id: 'tape', label: 'Scotch', icon: <path d="M2 4 L14 4 L16 6 L14 8 L16 10 L14 12 L2 12 Z" fill="currentColor" /> },
                                { id: 'tech', label: 'Tech Corners', icon: <path d="M2 6 L6 2 L18 2 L18 14 L14 18 L2 18 Z" fill="none" stroke="currentColor" strokeWidth="2" /> },
                                { id: 'outline', label: 'Contour', icon: <rect width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /> }
                            ].map(style => {
                                const isActive = (currentText.bgStyle || 'none') === style.id;
                                return (
                                    <button
                                        key={style.id}
                                        onClick={() => updateActiveText('bgStyle', style.id)}
                                        className={`flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all ${isActive ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : (isDarkMode ? 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500' : 'bg-gray-50 border-gray-200 text-gray-600 hover:text-black hover:border-gray-300')}`}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 20 20" className="mb-1">{style.icon}</svg>
                                        <span className="text-[9px] font-bold uppercase tracking-wider">{style.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* COULEURS (TEXTE & FOND) */}
                    <div className={`flex items-center justify-between p-3 rounded-xl border mb-6 ${isDarkMode ? 'bg-neutral-800/50 border-neutral-700' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-[9px] font-mono uppercase text-gray-500">Couleur Texte</span>
                            <div className={`relative w-8 h-8 rounded-full border-2 overflow-hidden ${isDarkMode ? 'border-neutral-600' : 'border-gray-300'} shadow-inner`}>
                                <input type="color" value={currentText.color || '#ffffff'} onChange={(e) => updateActiveText('color', e.target.value)} className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer" />
                            </div>
                        </div>

                        <button onClick={handleSwapColors} className={`p-2 rounded-full transition-transform hover:scale-110 active:scale-95 ${isDarkMode ? 'bg-neutral-700 text-white hover:bg-neutral-600 border-neutral-600' : 'bg-white text-black border shadow-sm'}`} title="Inverser les couleurs">
                            <ArrowRightLeft size={14} />
                        </button>

                        <div className={`flex flex-col items-center gap-1 ${(currentText.bgStyle === 'none' || !currentText.bgStyle) ? 'opacity-30 pointer-events-none' : ''} transition-opacity`}>
                            <span className="text-[9px] font-mono uppercase text-gray-500">Couleur Fond/Bord</span>
                            <div className={`relative w-8 h-8 rounded-full border-2 overflow-hidden ${isDarkMode ? 'border-neutral-600' : 'border-gray-300'} shadow-inner`}>
                                <input type="color" value={currentText.bgColor || '#000000'} onChange={(e) => updateActiveText('bgColor', e.target.value)} className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer" />
                            </div>
                        </div>
                    </div>

                    {/* OPTIONS TYPOGRAPHIQUES */}
                    <div className="space-y-4 mb-4">
                        <Select
                            value={currentText.font}
                            onChange={(v) => updateActiveText('font', v)}
                            isDarkMode={isDarkMode}
                            options={FONT_OPTIONS}
                            className="w-full mb-4"
                        />
                        <div className="flex gap-2 mb-2">
                            <button onClick={() => updateActiveText('bold', !currentText.bold)} className={`flex-1 py-2 border rounded-lg text-xs font-bold transition-colors ${currentText.bold ? 'bg-indigo-600 border-indigo-500 text-white' : (isDarkMode ? 'border-neutral-700 text-neutral-400 hover:text-white' : 'border-gray-200 text-gray-600')}`}><Bold size={14} className="mx-auto" /></button>
                            <button onClick={() => updateActiveText('italic', !currentText.italic)} className={`flex-1 py-2 border rounded-lg text-xs italic transition-colors ${currentText.italic ? 'bg-indigo-600 border-indigo-500 text-white' : (isDarkMode ? 'border-neutral-700 text-neutral-400 hover:text-white' : 'border-gray-200 text-gray-600')}`}><Italic size={14} className="mx-auto" /></button>
                        </div>

                        <ControlGroup label="Taille Globale (Échelle)" icon={<Maximize size={12} />} value={currentText.scale !== undefined ? currentText.scale : 100} onChange={(v) => updateActiveText('scale', v)} min={10} max={300} unit="%" isDarkMode={isDarkMode} />

                        <ControlGroup label="Espacement (Tracking)" icon={<Scaling size={12} />} value={currentText.tracking || 0} onChange={(v) => updateActiveText('tracking', v)} min={-10} max={20} unit="px" isDarkMode={isDarkMode} />
                        <ControlGroup label="Marge Fond (Padding)" icon={<Square size={12} />} value={currentText.padding !== undefined ? currentText.padding : 15} onChange={(v) => updateActiveText('padding', v)} min={0} max={100} unit="px" isDarkMode={isDarkMode} />

                        {/* Paramètres conditionnels spécifiques au style */}
                        {currentText.bgStyle === 'rounded' && (
                            <ControlGroup label="Arrondi (Radius)" icon={<Square size={12} />} value={currentText.borderRadius !== undefined ? currentText.borderRadius : 12} onChange={(v) => updateActiveText('borderRadius', v)} min={0} max={100} unit="px" isDarkMode={isDarkMode} />
                        )}

                        {currentText.bgStyle === 'tech' && (
                            <ControlGroup label="Taille Coins (Corners)" icon={<Square size={12} />} value={currentText.cornerSize !== undefined ? currentText.cornerSize : 10} onChange={(v) => updateActiveText('cornerSize', v)} min={0} max={50} unit="px" isDarkMode={isDarkMode} />
                        )}

                        {currentText.bgStyle === 'outline' && (
                            <ControlGroup label="Épaisseur Contour" icon={<Square size={12} />} value={currentText.borderWidth !== undefined ? currentText.borderWidth : 2} onChange={(v) => updateActiveText('borderWidth', v)} min={1} max={20} unit="px" isDarkMode={isDarkMode} />
                        )}

                        <ControlGroup label="Effet Lueur (Glow/Ombre)" icon={<Square size={12} />} value={currentText.shadowBlur || 0} onChange={(v) => updateActiveText('shadowBlur', v)} min={0} max={50} unit="px" isDarkMode={isDarkMode} />

                        <div className={`h-px w-full my-4 ${isDarkMode ? 'bg-neutral-800' : 'bg-gray-100'}`} />

                        <ControlGroup label="Rotation" icon={<RotateCcw size={12} />} value={currentText.rotate || 0} onChange={(v) => updateActiveText('rotate', v)} min={-180} max={180} unit="deg" isDarkMode={isDarkMode} />
                        <ControlGroup label="Opacité Globale" icon={<Droplet size={12} />} value={currentText.opacity !== undefined ? currentText.opacity : 100} onChange={(v) => updateActiveText('opacity', v)} min={0} max={100} unit="%" isDarkMode={isDarkMode} />
                        {currentText.bgStyle && currentText.bgStyle !== 'none' && (
                            <ControlGroup label="Opacité Fond" icon={<Square size={12} />} value={currentText.bgOpacity !== undefined ? currentText.bgOpacity : 80} onChange={(v) => updateActiveText('bgOpacity', v)} min={0} max={100} unit="%" isDarkMode={isDarkMode} />
                        )}
                    </div>

                    <button onClick={deleteActiveText} className="w-full mt-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                        <Trash2 size={14} /> Supprimer ce module
                    </button>
                </div>
            ) : (
                <div className={`p-8 rounded-2xl border border-dashed text-center transition-colors ${isDarkMode ? 'border-neutral-800 bg-neutral-900/30' : 'border-gray-200 bg-gray-50'}`}>
                    <TypeIcon size={24} className={`mx-auto mb-3 opacity-30 ${isDarkMode ? 'text-white' : 'text-black'}`} />
                    <p className={`text-xs font-medium ${isDarkMode ? 'text-neutral-400' : 'text-gray-500'}`}>Sélectionnez un texte sur le canevas ou créez-en un nouveau pour le personnaliser.</p>
                </div>
            )}
        </div>
    );
};

export default TextAssetsPanel;