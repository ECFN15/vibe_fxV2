import React from 'react';
import {
    Smartphone, LayoutTemplate, Square, RectangleHorizontal, Sparkles,
    ChevronDown, MousePointer2, Scaling, Palette, Type
} from 'lucide-react';
import { CUSTOM_LAYOUT_PRESETS, DEFAULT_CUSTOM_TEMPLATE, FORMATS, TEMPLATES } from '../../data/constants';
import ControlGroup from '../ui/ControlGroup';
import TextAssetsPanel from '../panels/TextAssetsPanel';
import GeometryPanel from '../panels/GeometryPanel';
import BackgroundPanel from '../panels/BackgroundPanel';

/**
 * LayoutSidebar — Sidebar complète du mode Layout (slot editor, formats, templates, accordéons).
 */
export default function LayoutSidebar({
    images,
    setImages,
    isDarkMode,
    // Slot selection
    selectedSlotIndex, setSelectedSlotIndex,
    activeConfig, updateSlotConfig,
    // Format
    activeFormat, setActiveFormat,
    // Template
    activeTemplate, setActiveTemplate,
    setActiveTextId,
    // Overlay mode (PiP)
    overlayMode, setOverlayMode,
    // Accordion state
    activeAccordion, setActiveAccordion,
    // Text & Assets
    addText, addAsset,
    currentText, currentAsset,
    updateActiveText, deleteActiveText,
    setTexts,
    setActiveAssetId, deleteActiveAsset,
    activeAssetId, setAssets, assets,
    // Geometry
    padding, setPadding,
    gap, setGap,
    radius, setRadius,
    // Background
    layoutBgBlur, setLayoutBgBlur,
    layoutBgColor, setLayoutBgColor,
    layoutBgTexture, setLayoutBgTexture,
    layoutSmoothBlur, setLayoutSmoothBlur,
    showGuidelines, setShowGuidelines,
}) {
    const isCustomTemplate = activeTemplate.id === 'custom';
    const customPresetId = activeTemplate.customLayout?.presetId;
    const customZonesCount = activeTemplate.customLayout?.zones?.length || 0;

    const applyCustomPreset = (preset) => {
        if (!isCustomTemplate) {
            setTexts?.([]);
        }
        setActiveTemplate({
            ...DEFAULT_CUSTOM_TEMPLATE,
            label: preset.label,
            slots: preset.zones.length,
            customLayout: {
                version: 1,
                presetId: preset.id,
                zones: preset.zones,
            },
        });
        setSelectedSlotIndex(null);
        setActiveTextId(null);
    };

    const handleSelectedSlotImageUpload = (event) => {
        const file = event.target.files?.[0];
        if (!file || selectedSlotIndex === null) return;
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            img.name = file.name;
            updateSlotConfig('image', img);
            updateSlotConfig('imageSrc', url);
            updateSlotConfig('imageName', file.name);
            setImages?.(prev => [...prev, img]);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
        };
        img.src = url;
        event.target.value = '';
    };

    return (
        <div className="vibefx-sidebar-scroll flex-1 overflow-y-auto custom-scrollbar p-5 animate-in slide-in-from-right-4">
            {/* 1. SELECTION PANEL */}
            {selectedSlotIndex !== null && activeConfig ? (
                <div className="animate-in slide-in-from-right-4 fade-in duration-200 mb-6">
                    <div className="flex justify-between items-center mb-4"><h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2"><MousePointer2 size={14} /> Zone Sélectionnée</h3><button onClick={() => setSelectedSlotIndex(null)} className="text-[10px] text-gray-500 hover:text-white underline">Fermer</button></div>
                    <div className="bg-indigo-500/10 rounded-2xl p-4 border border-indigo-500/30 relative">
                        {isCustomTemplate ? (
                            <div className="mb-4 rounded-xl border border-indigo-400/30 bg-black/30 p-3">
                                <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-indigo-200">Image de zone</p>
                                <label className="inline-flex cursor-pointer items-center justify-center border border-indigo-400/60 bg-indigo-500/15 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-indigo-100 transition hover:bg-indigo-500/25">
                                    Importer dans ce bloc
                                    <input type="file" className="hidden" accept="image/*" onChange={handleSelectedSlotImageUpload} />
                                </label>
                                {activeConfig.imageName ? (
                                    <p className="mt-2 truncate text-[11px] text-neutral-400">{activeConfig.imageName}</p>
                                ) : (
                                    <p className="mt-2 text-[11px] text-neutral-500">Clique un bloc sur le canvas, puis importe son image.</p>
                                )}
                            </div>
                        ) : null}
                        <ControlGroup label="Zoom" value={activeConfig.zoom} onChange={(v) => updateSlotConfig('zoom', v)} min={1} max={4} step={0.1} unit="x" isDarkMode={isDarkMode} />
                        <ControlGroup label="Position X" value={activeConfig.x} onChange={(v) => updateSlotConfig('x', v)} min={-100} max={100} unit="%" isDarkMode={isDarkMode} />
                        <ControlGroup label="Position Y" value={activeConfig.y} onChange={(v) => updateSlotConfig('y', v)} min={-100} max={100} unit="%" isDarkMode={isDarkMode} />
                        <ControlGroup label="Bordure" value={activeConfig.border} onChange={(v) => updateSlotConfig('border', v)} min={0} max={20} unit="px" isDarkMode={isDarkMode} />
                        <ControlGroup label="Flou" value={activeConfig.blur} onChange={(v) => updateSlotConfig('blur', v)} min={0} max={50} unit="px" isDarkMode={isDarkMode} />
                    </div>
                    <hr className={`my-6 ${isDarkMode ? 'border-neutral-800' : 'border-gray-200'}`} />
                </div>
            ) : null}

            {/* 2. FORMAT */}
            <div className="mb-6">
                <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}><Smartphone size={14} /> Format</h3>
                <div className="vibefx-format-grid">
                    {FORMATS.map(fmt => (
                        <button key={fmt.id} data-format-id={fmt.id} onClick={() => setActiveFormat(fmt)} className={`vibefx-format-button flex-1 min-w-[70px] flex flex-col items-center justify-center p-3 border transition-all ${activeFormat.id === fmt.id ? 'bg-indigo-900/30 border-indigo-500 text-indigo-400' : (isDarkMode ? 'border-neutral-800 bg-transparent text-neutral-500 hover:border-neutral-600' : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-white')}`}>
                            <div className="vibefx-format-icon h-6 flex items-center justify-center mb-2">
                                <div
                                    className={`border rounded-[2px] transition-all ${activeFormat.id === fmt.id ? 'border-indigo-400 bg-indigo-500/10' : (isDarkMode ? 'border-neutral-500' : 'border-gray-400')}`}
                                    style={{
                                        height: '100%',
                                        aspectRatio: fmt.ratio,
                                        maxHeight: '24px'
                                    }}
                                />
                            </div>
                            <span className="vibefx-format-label text-[10px] font-mono font-bold uppercase" translate="no">{fmt.label.replace(/\s*\(.*?\)/, '')}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* 3. TEMPLATES */}
            <div className="mb-6">
                <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}><LayoutTemplate size={14} /> Modèles</h3>
                <div className="grid grid-cols-2 gap-3">
                    {TEMPLATES.map(tpl => (
                        <button key={tpl.id} onClick={() => { setActiveTemplate(tpl); setSelectedSlotIndex(null); setActiveTextId(null); }} className={`flex items-center gap-3 p-3 border text-left transition-all ${activeTemplate.id === tpl.id ? (isDarkMode ? 'bg-neutral-900 text-white border-white' : 'bg-black text-white border-black') : (isDarkMode ? 'border-neutral-800 bg-transparent text-neutral-500 hover:border-neutral-600' : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-white')}`}>
                            {tpl.icon}
                            <div><div className="text-xs font-bold">{tpl.label}</div><div className="text-[10px] opacity-60">{tpl.slots} zone(s)</div></div>
                        </button>
                    ))}
                </div>
                <div className={`mt-3 border p-3 ${isCustomTemplate ? 'border-indigo-500/60 bg-indigo-500/10' : (isDarkMode ? 'border-neutral-800 bg-black/20' : 'border-gray-200 bg-gray-50')}`}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                            <div className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Modele personnalise</div>
                            <div className="mt-1 text-[10px] uppercase tracking-widest opacity-60">
                                {isCustomTemplate ? `${customZonesCount} zones actives` : 'Canvas vide + blocs importables'}
                            </div>
                        </div>
                        <LayoutTemplate size={18} className={isCustomTemplate ? 'text-indigo-300' : 'opacity-50'} />
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {CUSTOM_LAYOUT_PRESETS.map(preset => (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => applyCustomPreset(preset)}
                                className={`border px-3 py-2 text-left transition-all ${customPresetId === preset.id ? 'border-indigo-400 bg-indigo-500/20 text-indigo-100' : (isDarkMode ? 'border-neutral-800 text-neutral-400 hover:border-indigo-500/50 hover:text-white' : 'border-gray-200 text-gray-600 hover:border-indigo-400 hover:bg-white')}`}
                            >
                                <span className="block text-[11px] font-bold uppercase tracking-widest">{preset.label}</span>
                                <span className="mt-1 block text-[10px] opacity-60">{preset.description}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* SUB-MENU OVERLAY */}
            {activeTemplate.id === 'pip' && (
                <div className={`animate-in slide-in-from-top-2 fade-in duration-300 rounded-xl p-3 border mb-6 ${isDarkMode ? 'bg-neutral-800/50 border-neutral-700' : 'bg-gray-100 border-gray-200'}`}>
                    <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-3 ml-1 ${isDarkMode ? 'text-neutral-400' : 'text-gray-500'}`}>Style Overlay</h4>
                    <div className="flex flex-col gap-2">
                        {[
                            { id: 'square', label: 'Carré (1:1)', icon: <Square size={14} /> },
                            { id: 'landscape', label: 'Paysage (3:2)', icon: <RectangleHorizontal size={14} /> },
                            { id: 'adaptive', label: 'Adaptatif (Auto)', icon: <Sparkles size={14} /> }
                        ].map(mode => (
                            <button key={mode.id} onClick={() => setOverlayMode(mode.id)} className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all text-xs font-medium ${overlayMode === mode.id ? 'bg-indigo-600 border-indigo-500 text-white' : (isDarkMode ? 'border-white/5 hover:bg-white/5 text-gray-400 hover:text-white' : 'border-black/5 hover:bg-black/5 text-gray-600 hover:text-black')}`}>
                                {mode.icon} {mode.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ACCORDEONS (TEXTES, GEOMETRIE, FOND) */}
            <div className="flex flex-col gap-3">

                {/* TEXTES ACCORDION */}
                <div className={`rounded-2xl border overflow-hidden transition-colors ${isDarkMode ? 'border-neutral-800 bg-neutral-900/20' : 'border-gray-200 bg-gray-50/50'}`}>
                    <button
                        onClick={() => setActiveAccordion(activeAccordion === 'texts' ? null : 'texts')}
                        className={`w-full flex items-center justify-between p-4 focus:outline-none transition-colors ${activeAccordion === 'texts' ? (isDarkMode ? 'bg-neutral-800/50' : 'bg-gray-100') : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                        <div className={`flex items-center gap-3 text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            <Type size={16} className={activeAccordion === 'texts' ? 'text-indigo-500' : ''} /> Textes & Boutons
                        </div>
                        <ChevronDown size={16} className={`transition-transform duration-300 ${activeAccordion === 'texts' ? 'rotate-180 text-indigo-500' : 'opacity-50'}`} />
                    </button>

                    <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${activeAccordion === 'texts' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="overflow-hidden">
                            <div className="p-4 border-t border-neutral-800/50 dark:border-white/5">
                                <TextAssetsPanel
                                    isDarkMode={isDarkMode}
                                    addText={addText}
                                    addAsset={addAsset}
                                    currentText={currentText}
                                    currentAsset={currentAsset}
                                    updateActiveText={updateActiveText}
                                    deleteActiveText={deleteActiveText}
                                    setActiveTextId={setActiveTextId}
                                    setActiveAssetId={setActiveAssetId}
                                    deleteActiveAsset={deleteActiveAsset}
                                    activeAssetId={activeAssetId}
                                    setAssets={setAssets}
                                    assets={assets}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* GEOMETRY ACCORDION */}
                <div className={`rounded-2xl border overflow-hidden transition-colors ${isDarkMode ? 'border-neutral-800 bg-neutral-900/20' : 'border-gray-200 bg-gray-50/50'}`}>
                    <button
                        onClick={() => setActiveAccordion(activeAccordion === 'geometry' ? null : 'geometry')}
                        className={`w-full flex items-center justify-between p-4 focus:outline-none transition-colors ${activeAccordion === 'geometry' ? (isDarkMode ? 'bg-neutral-800/50' : 'bg-gray-100') : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                        <div className={`flex items-center gap-3 text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            <Scaling size={16} className={activeAccordion === 'geometry' ? 'text-indigo-500' : ''} /> Géométrie & Marges
                        </div>
                        <ChevronDown size={16} className={`transition-transform duration-300 ${activeAccordion === 'geometry' ? 'rotate-180 text-indigo-500' : 'opacity-50'}`} />
                    </button>

                    <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${activeAccordion === 'geometry' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="overflow-hidden">
                            <div className="p-4 border-t border-neutral-800/50 dark:border-white/5">
                                <GeometryPanel
                                    isDarkMode={isDarkMode}
                                    padding={padding}
                                    setPadding={setPadding}
                                    gap={gap}
                                    setGap={setGap}
                                    radius={radius}
                                    setRadius={setRadius}
                                    activeTemplate={activeTemplate}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* BACKGROUND ACCORDION */}
                <div className={`rounded-2xl border overflow-hidden transition-colors ${isDarkMode ? 'border-neutral-800 bg-neutral-900/20' : 'border-gray-200 bg-gray-50/50'}`}>
                    <button
                        onClick={() => setActiveAccordion(activeAccordion === 'background' ? null : 'background')}
                        className={`w-full flex items-center justify-between p-4 focus:outline-none transition-colors ${activeAccordion === 'background' ? (isDarkMode ? 'bg-neutral-800/50' : 'bg-gray-100') : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                        <div className={`flex items-center gap-3 text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            <Palette size={16} className={activeAccordion === 'background' ? 'text-indigo-500' : ''} /> Fond Global
                        </div>
                        <ChevronDown size={16} className={`transition-transform duration-300 ${activeAccordion === 'background' ? 'rotate-180 text-indigo-500' : 'opacity-50'}`} />
                    </button>

                    <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${activeAccordion === 'background' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="overflow-hidden">
                            <div className="p-4 border-t border-neutral-800/50 dark:border-white/5">
                                <BackgroundPanel
                                    images={images}
                                    isDarkMode={isDarkMode}
                                    layoutBgBlur={layoutBgBlur}
                                    setLayoutBgBlur={setLayoutBgBlur}
                                    layoutBgColor={layoutBgColor}
                                    setLayoutBgColor={setLayoutBgColor}
                                    layoutBgTexture={layoutBgTexture}
                                    setLayoutBgTexture={setLayoutBgTexture}
                                    layoutSmoothBlur={layoutSmoothBlur}
                                    setLayoutSmoothBlur={setLayoutSmoothBlur}
                                    showGuidelines={showGuidelines}
                                    setShowGuidelines={setShowGuidelines}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
