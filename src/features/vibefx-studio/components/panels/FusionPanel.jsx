import React, { useState } from 'react';
import { Layers, Move, Sparkles, Box, Circle, Hexagon, Triangle, Palette, Shuffle, Columns, SplitSquareVertical, LayoutTemplate, Grid, RefreshCw, Image as ImageIcon, Trash2, Zap, Plus } from 'lucide-react';
import ControlGroup from '../ui/ControlGroup';
import { FORMATS } from '../../data/constants';
import MeshGradientPro from './MeshGradientPopup';

const SHAPES = [
    { id: 'none', label: 'Original', icon: <Box size={14} /> },
    { id: 'circle', label: 'Cercle', icon: <Circle size={14} /> },
    { id: 'blob1', label: 'Onde 1', icon: <Sparkles size={14} /> },
    { id: 'blob2', label: 'Onde 2', icon: <Sparkles size={14} /> },
    { id: 'rhombus', label: 'Losange', icon: <Hexagon size={14} /> },
    { id: 'star', label: 'Étoile', icon: <Triangle size={14} /> },
    { id: 'organic', label: 'Organique', icon: <Shuffle size={14} /> }
];

const COMPOSITIONS = [
    { id: 'single', label: 'Unique', icon: <Box size={14} /> },
    { id: 'split_v', label: 'Split (V)', icon: <SplitSquareVertical size={14} /> },
    { id: 'split_h', label: 'Split (H)', icon: <Columns size={14} /> },
    { id: 'asymmetric', label: 'Complexe', icon: <Layers size={14} /> },
    { id: 'scattered', label: 'Étoilé', icon: <Grid size={14} /> }
];

const PRESET_GRADIENTS = [
    ['#6366f1', '#a855f7', '#ec4899', '#f43f5e'], // Synthwave
    ['#00c6ff', '#0072ff', '#4facfe', '#00f2fe'], // Ocean
    ['#f12711', '#f5af19', '#ff4b1f', '#ff9068'], // Fire
    ['#10b981', '#3b82f6', '#06b6d4', '#8b5cf6'], // Aurora
    ['#111111', '#333333', '#1a1a1a', '#0a0a0a'], // Dark Matter
    ['#fdfbfb', '#ebedee', '#f8fafc', '#e2e8f0']  // Minimal
];

const FusionPanel = ({ isDarkMode, config, setConfig, images, activeFormat, setActiveFormat, onOpenLibrarySelector, selectedImgIndex, setSelectedImgIndex }) => {
    const [showMeshPro, setShowMeshPro] = useState(false);

    const updateConfig = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleColorChange = (index, newColor) => {
        const newColors = [...(config.colors || PRESET_GRADIENTS[0])];
        newColors[index] = newColor;
        updateConfig('colors', newColors);
    };

    const handleImageConfigChange = (imgIndex, key, value) => {
        const newConfigs = { ...(config.perImageConfigs || {}) };
        if (!newConfigs[imgIndex]) {
            newConfigs[imgIndex] = {};
        }
        newConfigs[imgIndex][key] = value;
        updateConfig('perImageConfigs', newConfigs);
    };

    const currentImgConfig = (imgIndex, key, defaultVal) => {
        const cfgs = config.perImageConfigs || {};
        if (cfgs[imgIndex] && cfgs[imgIndex][key] !== undefined) {
            return cfgs[imgIndex][key];
        }
        return config[key] !== undefined ? config[key] : defaultVal;
    };



    return (
        <>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 animate-in slide-in-from-right-4">
                <h2 className={`text-[10px] font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2 ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}>
                    <Palette size={14} className="text-indigo-500" /> FUSION GENERATOR
                </h2>

                <div className="space-y-8">
                    {/* FORMAT */}
                    {activeFormat && (
                        <div>
                            <div className={`text-[10px] font-mono font-bold mb-3 uppercase tracking-widest ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}>
                                Format (Réseaux Sociaux)
                            </div>
                            <div className="flex flex-wrap gap-2 mb-6">
                                {FORMATS.filter(f => f.id.includes('insta') || f.id === 'story').map(format => (
                                    <button
                                        key={format.id}
                                        onClick={() => setActiveFormat(format)}
                                        className={`flex-1 min-w-[70px] px-2 py-3 rounded-sm text-[9px] font-mono uppercase bg-transparent border transition-all flex flex-col items-center gap-2 justify-center
                                        ${activeFormat?.id === format.id
                                                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-[inset_0_0_10px_rgba(79,70,229,0.2)]'
                                                : (isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:bg-neutral-800' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300')
                                            }`}
                                    >
                                        <div className="h-6 flex items-center justify-center">
                                            <div
                                                className={`border rounded-[2px] transition-all ${activeFormat?.id === format.id ? 'border-indigo-400 bg-indigo-500/10' : (isDarkMode ? 'border-neutral-500' : 'border-gray-400')}`}
                                                style={{
                                                    height: '100%',
                                                    aspectRatio: format.ratio,
                                                    maxHeight: '24px'
                                                }}
                                            />
                                        </div>
                                        <div className="flex flex-col items-center gap-0.5" translate="no">
                                            <span className="font-bold tracking-wider">{format.label.replace(/\s*\(.*?\)/, '')}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TYPE DE FOND */}
                    <div className="pt-4 border-t border-neutral-800">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}>
                                Type de Fond
                            </div>
                            {/* INTERRUPTEUR PRO MODE */}
                            {(!config.bgMode || config.bgMode === 'gradient') && (
                                <button
                                    onClick={() => setShowMeshPro(true)}
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded-sm text-[9px] font-mono font-bold uppercase transition-all border ${isDarkMode ? 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20' : 'border-indigo-300 text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}
                                >
                                    <Sparkles size={10} />
                                    Pro Mode
                                </button>
                            )}
                        </div>

                        {/* V2 UX Segmented Control */}
                        <div className={`flex gap-1 p-1 rounded-sm border w-full max-w-[200px] mb-4 ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-gray-100 border-gray-200'}`}>
                            <button
                                onClick={() => updateConfig('bgMode', 'gradient')}
                                className={`flex-1 py-1.5 text-[9px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 rounded-sm
                                ${(!config.bgMode || config.bgMode === 'gradient')
                                        ? (isDarkMode ? 'bg-neutral-800 text-white shadow-sm' : 'bg-white text-black shadow-sm')
                                        : (isDarkMode ? 'text-neutral-500 hover:text-neutral-300' : 'text-gray-500 hover:text-gray-700')
                                    }`}
                            >
                                <Zap size={10} />
                                Dégradé
                            </button>
                            <button
                                onClick={() => updateConfig('bgMode', 'image')}
                                className={`flex-1 py-1.5 text-[9px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 rounded-sm
                                ${config.bgMode === 'image'
                                        ? (isDarkMode ? 'bg-neutral-800 text-white shadow-sm' : 'bg-white text-black shadow-sm')
                                        : (isDarkMode ? 'text-neutral-500 hover:text-neutral-300' : 'text-gray-500 hover:text-gray-700')
                                    }`}
                            >
                                <ImageIcon size={10} />
                                Image
                            </button>
                        </div>

                        <div className="mb-4">
                            {config.bgMode === 'image' && (
                                <div className="w-24 aspect-square">
                                    {config.bgImage ? (
                                        <div className="relative w-full h-full rounded border border-indigo-500 overflow-hidden group shadow-[0_0_10px_rgba(79,70,229,0.3)]">
                                            <img src={config.bgImage.src} className="w-full h-full object-cover" />
                                            <button onClick={() => updateConfig('bgImage', null)} className="absolute inset-0 flex items-center justify-center bg-red-600/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button onClick={onOpenLibrarySelector} className={`w-full h-full border border-dashed rounded flex flex-col items-center justify-center text-[8px] font-mono text-center transition-colors ${isDarkMode ? 'border-neutral-700 text-neutral-500 hover:border-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/5' : 'border-gray-300 text-gray-500 hover:border-indigo-500 hover:text-indigo-500 hover:bg-indigo-50'}`}>
                                            <Plus size={14} className="mb-0.5" />
                                            LIB
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {(!config.bgMode || config.bgMode === 'gradient') && (
                            <>
                                <div className="grid grid-cols-4 gap-2 mb-4 mt-2">
                                    {(config.colors || PRESET_GRADIENTS[0]).map((color, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-sm overflow-hidden border border-neutral-700 hover:border-indigo-500 transition-colors">
                                            <input
                                                type="color"
                                                value={color}
                                                onChange={(e) => handleColorChange(idx, e.target.value)}
                                                className="absolute inset-[-10px] w-[calc(100%+20px)] h-[calc(100%+20px)] cursor-pointer"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className={`text-[10px] font-mono font-bold mb-3 uppercase tracking-widest ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}>
                                    Presets Rapides
                                </div>
                                <div className="grid grid-cols-6 gap-2">
                                    {PRESET_GRADIENTS.map((preset, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => updateConfig('colors', preset)}
                                            className={`aspect-square rounded-sm border hover:scale-105 transition-transform ${isDarkMode ? 'border-neutral-700' : 'border-gray-200'}`}
                                            style={{
                                                background: `linear-gradient(135deg, ${preset[0]}, ${preset[3]})`
                                            }}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* NOISE & OVERLAYS */}
                    <div className="pt-4 border-t border-neutral-800">
                        <ControlGroup
                            label="Texture / Grain analogique"
                            icon={<Sparkles size={14} />}
                            value={config.noise}
                            onChange={(v) => updateConfig('noise', v)}
                            min={0} max={100}
                            isDarkMode={isDarkMode}
                        />
                    </div >

                    {/* ESPACE ET COMPOSITIONS */}
                    <div className="pt-4 border-t border-neutral-800">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}>
                                Composition
                            </div>
                            <div className={`text-[8px] font-mono border px-1.5 py-0.5 rounded-sm ${isDarkMode ? 'border-neutral-700 text-neutral-400' : 'border-gray-300 text-gray-500'}`}>
                                {images?.length || 0} Source(s)
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
                            {COMPOSITIONS.map(comp => (
                                <button
                                    key={comp.id}
                                    onClick={() => updateConfig('composition', comp.id)}
                                    className={`px-2 py-2 rounded-sm text-[9px] font-mono uppercase border transition-all flex flex-col items-center gap-1.5 justify-center
                                    ${(config.composition || 'single') === comp.id
                                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                                            : (isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-600' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300')
                                        }`}
                                >
                                    {comp.icon}
                                    {comp.label}
                                </button>
                            ))}
                        </div>
                    </div >

                    {/* IMAGE MASK SETTINGS */}
                    <div className="pt-4 border-t border-neutral-800">
                        <div className="flex justify-between items-center mb-3">
                            <div className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}>
                                Forme de l'Image
                            </div>
                            {images && images.length > 1 && (
                                <div className="flex items-center bg-neutral-900 rounded border border-neutral-800 p-0.5">
                                    <button
                                        onClick={() => setSelectedImgIndex(-1)}
                                        className={`px-2 py-0.5 text-[8px] font-mono uppercase transition-all ${selectedImgIndex === -1 ? 'bg-neutral-800 text-white rounded-sm shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                                    >
                                        Général
                                    </button>
                                    {images.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedImgIndex(i)}
                                            className={`px-1.5 py-0.5 text-[8px] font-mono transition-all ${selectedImgIndex === i ? 'bg-indigo-600 text-white rounded-sm shadow-[0_0_8px_rgba(79,70,229,0.4)]' : 'text-neutral-500 hover:text-indigo-300'}`}
                                        >
                                            IMG {i + 1}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {currentImgConfig(selectedImgIndex === -1 ? 0 : selectedImgIndex, 'maskShape', 'original') === 'organic' && (
                                <button onClick={() => selectedImgIndex === -1 ? updateConfig('seed', Math.floor(Math.random() * 10000)) : handleImageConfigChange(selectedImgIndex, 'seed', Math.floor(Math.random() * 10000))} className={`flex items-center gap-1 text-[9px] font-mono border px-2 py-1 rounded-sm transition-colors ml-2 ${isDarkMode ? 'border-indigo-500 text-indigo-400 hover:bg-indigo-500/20' : 'border-indigo-300 text-indigo-600 hover:bg-indigo-50'}`}>
                                    <RefreshCw size={10} /> Nouveau
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mb-6">
                            {SHAPES.map(shape => {
                                const isActive = selectedImgIndex === -1
                                    ? (config.maskShape || 'original') === shape.id
                                    : currentImgConfig(selectedImgIndex, 'maskShape', config.maskShape || 'original') === shape.id;

                                return (
                                    <button
                                        key={shape.id}
                                        onClick={() => {
                                            if (selectedImgIndex === -1) {
                                                updateConfig('maskShape', shape.id);
                                            } else {
                                                handleImageConfigChange(selectedImgIndex, 'maskShape', shape.id);
                                            }
                                        }}
                                        className={`px-3 py-2.5 rounded-sm text-[10px] font-mono font-bold uppercase border transition-all flex items-center gap-2 justify-center
                                        ${isActive
                                                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                                                : (isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-600' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300')
                                            }`}
                                    >
                                        {shape.icon}
                                        {shape.label}
                                    </button>
                                );
                            })}
                        </div>

                        <ControlGroup
                            label="Taille de l'image"
                            icon={<Move size={14} />}
                            value={selectedImgIndex === -1 ? (config.imageScale || 100) : currentImgConfig(selectedImgIndex, 'imageScale', config.imageScale || 100)}
                            onChange={(v) => {
                                if (selectedImgIndex === -1) updateConfig('imageScale', v);
                                else handleImageConfigChange(selectedImgIndex, 'imageScale', v);
                            }}
                            min={20} max={200}
                            isDarkMode={isDarkMode}
                        />

                        {selectedImgIndex !== -1 && (
                            <div className="pt-4 grid grid-cols-2 gap-4">
                                <ControlGroup
                                    label="Décalage X"
                                    value={currentImgConfig(selectedImgIndex, 'posX', 0)}
                                    onChange={(v) => handleImageConfigChange(selectedImgIndex, 'posX', v)}
                                    min={-500} max={500}
                                    isDarkMode={isDarkMode}
                                />
                                <ControlGroup
                                    label="Décalage Y"
                                    value={currentImgConfig(selectedImgIndex, 'posY', 0)}
                                    onChange={(v) => handleImageConfigChange(selectedImgIndex, 'posY', v)}
                                    min={-500} max={500}
                                    isDarkMode={isDarkMode}
                                />
                            </div>
                        )}
                    </div >

                    {/* BLEND MODE */}
                    < div className="pt-4 border-t border-neutral-800" >
                        <div className={`text-[10px] font-mono font-bold mb-3 uppercase tracking-widest ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}>
                            Mode de Fusion (Image)
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {['normal', 'screen', 'overlay', 'multiply', 'luminosity'].map(m => {
                                const isActive = selectedImgIndex === -1
                                    ? (config.blendMode || 'normal') === m
                                    : currentImgConfig(selectedImgIndex, 'blendMode', config.blendMode || 'normal') === m;

                                return (
                                    <button
                                        key={m}
                                        onClick={() => {
                                            if (selectedImgIndex === -1) updateConfig('blendMode', m);
                                            else handleImageConfigChange(selectedImgIndex, 'blendMode', m);
                                        }}
                                        className={`px-3 py-2 rounded-sm text-[10px] font-mono font-bold uppercase border transition-all 
                                        ${isActive
                                                ? 'bg-neutral-800 border-neutral-600 text-white'
                                                : (isDarkMode ? 'bg-black border-neutral-900 text-neutral-500 hover:border-neutral-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300')
                                            }`}
                                    >
                                        {m}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>

            <MeshGradientPro
                isOpen={showMeshPro}
                onClose={() => setShowMeshPro(false)}
                isDarkMode={isDarkMode}
                initialColors={config.colors || PRESET_GRADIENTS[0]}
                onApply={(colors) => {
                    updateConfig('colors', colors);
                    setShowMeshPro(false);
                }}
            />
        </>
    );
};

export default FusionPanel;