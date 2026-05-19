import React from 'react';
import { MousePointer2, Zap, Sliders, Droplet, Sun, Contrast, ArrowLeft, Smartphone, LayoutTemplate, Box, StickyNote, Layers, Columns, Grid, Maximize, Move, Palette } from 'lucide-react';
import { PRESET_CATEGORIES, FORMATS, TEMPLATES } from '../data';

// Composants utilitaires internes
const QuickButton = ({ label, sub, color, icon, onClick, disabled, isDarkMode }) => (
    <button onClick={onClick} disabled={disabled} className={`${isDarkMode ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 hover:border-neutral-600' : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 shadow-sm'} p-4 rounded-xl text-left transition-all border disabled:opacity-50 group active:scale-95 flex flex-col justify-between h-24 relative overflow-hidden`}>
        <div className={`absolute top-2 right-2 opacity-30 group-hover:opacity-100 transition-opacity ${color}`}>{icon}</div>
        <span className={`block text-sm font-bold ${color} mt-auto`}>{label}</span>
        <span className={`${isDarkMode ? 'text-neutral-400' : 'text-gray-500'} text-[11px] font-medium`}>{sub}</span>
    </button>
);

const ControlGroup = ({ label, icon, value, onChange, min, max, step = 1, desc, isDarkMode }) => (
    <div className="flex flex-col gap-2">
        <div className="flex justify-between items-start">
            <div className="flex flex-col gap-0.5">
                <span className={`flex items-center gap-1.5 text-xs font-semibold ${isDarkMode ? 'text-neutral-300' : 'text-gray-700'}`}>{icon} {label}</span>
                {desc && <span className={`text-[10px] leading-tight ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}>{desc}</span>}
            </div>
            <div className="relative group shrink-0 ml-4">
                <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className={`w-14 text-center font-mono text-xs font-medium rounded-md py-1 px-1 outline-none ring-1 focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-neutral-800 text-neutral-200 ring-neutral-700' : 'bg-gray-50 text-gray-800 ring-gray-200'}`} min={min} max={max} step={step} />
            </div>
        </div>
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="slider w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
    </div>
);

// Composant principal Sidebar
const Sidebar = ({ isDarkMode, view, selectedSlotIndex, activeConfig, updateSlotConfig, setSelectedSlotIndex, activeCategory, setActiveCategory, images, filters, setFilters, activeFormat, setActiveFormat, activeTemplate, setActiveTemplate, padding, setPadding, gap, setGap, radius, setRadius, bgBlur, setBgBlur, bgTexture, setBgTexture }) => {

    // Mapping des icônes pour l'affichage dynamique
    const getIcon = (name) => {
        const ICONS = { Film: Zap, Contrast: Contrast, Sparkles: Zap, Box, StickyNote, Layers, Columns, LayoutTemplate, Grid, Maximize, Smartphone, Square: Box }; // Mapping simplifié
        const IconComp = ICONS[name] || Box;
        return <IconComp size={18} />;
    };

    return (
        <div className={`lg:col-span-4 flex flex-col h-full border rounded-2xl backdrop-blur-md overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-gray-200'}`}>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 relative">
                {/* PANEL SELECTIONNE */}
                {selectedSlotIndex !== null && activeConfig ? (
                    <div className="animate-in slide-in-from-right-4 fade-in duration-200 mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                                <MousePointer2 size={14} /> Zone Sélectionnée
                            </h3>
                            <button onClick={() => setSelectedSlotIndex(null)} className="text-[10px] text-gray-500 hover:text-white underline">Fermer</button>
                        </div>
                        <div className="bg-indigo-500/10 rounded-2xl p-4 border border-indigo-500/30 relative">
                            <ControlGroup label="Zoom" value={activeConfig.zoom} onChange={(v) => updateSlotConfig('zoom', v)} min={1} max={4} step={0.1} isDarkMode={isDarkMode} />
                            <ControlGroup label="Position X" value={activeConfig.x} onChange={(v) => updateSlotConfig('x', v)} min={-100} max={100} isDarkMode={isDarkMode} />
                            <ControlGroup label="Position Y" value={activeConfig.y} onChange={(v) => updateSlotConfig('y', v)} min={-100} max={100} isDarkMode={isDarkMode} />
                            <ControlGroup label="Bordure" value={activeConfig.border} onChange={(v) => updateSlotConfig('border', v)} min={0} max={20} isDarkMode={isDarkMode} />
                            <ControlGroup label="Flou (Blur)" value={activeConfig.blur} onChange={(v) => updateSlotConfig('blur', v)} min={0} max={50} isDarkMode={isDarkMode} />
                        </div>
                    </div>
                ) : null}

                {view === 'studio' && !activeCategory && (
                    <>
                        <div className="mb-8">
                            <h2 className={`text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}><Zap size={14} className="text-yellow-500" /> Styles</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {PRESET_CATEGORIES.map(cat => (<QuickButton key={cat.id} label={cat.label} sub={cat.sub} color={cat.color} icon={getIcon(cat.icon)} onClick={() => setActiveCategory(cat)} disabled={!images.length} isDarkMode={isDarkMode} />))}
                            </div>
                        </div>
                        <div className={`h-px w-full mb-8 ${isDarkMode ? 'bg-neutral-800' : 'bg-gray-100'}`} />
                        <div>
                            <h2 className={`text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2 ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}><Sliders size={14} className="text-indigo-500" /> Ajustements</h2>
                            <div className="space-y-7">
                                <ControlGroup label="Grain" icon={<Droplet size={14} />} value={filters.grain} onChange={(v) => setFilters({ ...filters, grain: v })} min={0} max={100} desc="Texture argentique" isDarkMode={isDarkMode} />
                                <ControlGroup label="Lumière" icon={<Sun size={14} />} value={filters.brightness} onChange={(v) => setFilters({ ...filters, brightness: v })} min={0} max={200} desc="Exposition globale" isDarkMode={isDarkMode} />
                                <ControlGroup label="Contraste" icon={<Contrast size={14} />} value={filters.contrast} onChange={(v) => setFilters({ ...filters, contrast: v })} min={0} max={200} desc="Dynamique des tons" isDarkMode={isDarkMode} />
                            </div>
                        </div>
                    </>
                )}
                {activeCategory && (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                        <button onClick={() => setActiveCategory(null)} className={`mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors self-start ${isDarkMode ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-black'}`}><ArrowLeft size={14} /> Retour</button>
                        <div className="space-y-2">
                            {activeCategory.profiles.map((profile, idx) => (
                                <button key={idx} onClick={() => setFilters(profile.filters)} className={`w-full border p-4 rounded-xl text-left transition-all group active:scale-[0.98] ${isDarkMode ? 'bg-neutral-800/40 hover:bg-neutral-800 border-neutral-800 hover:border-neutral-600' : 'bg-white hover:bg-gray-50 border-gray-100 hover:border-gray-300 shadow-sm'}`}>
                                    <span className={`font-semibold text-sm transition-colors ${isDarkMode ? 'text-neutral-200 group-hover:text-indigo-400' : 'text-gray-700 group-hover:text-indigo-600'}`}>{profile.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {view === 'layout' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <h2 className={`text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2 ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}><Smartphone size={14} /> Format</h2>
                        <div className="flex flex-wrap gap-2 mb-8">
                            {FORMATS.map(fmt => (
                                <button key={fmt.id} onClick={() => setActiveFormat(fmt)} className={`flex-1 min-w-[70px] flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${activeFormat.id === fmt.id ? 'bg-indigo-600 border-indigo-500 text-white' : (isDarkMode ? 'border-neutral-800 bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50')}`}>
                                    <div className="h-6 flex items-center justify-center mb-2">
                                        <div
                                            className={`border rounded-[2px] transition-all ${activeFormat.id === fmt.id ? 'border-white bg-white/20' : (isDarkMode ? 'border-neutral-500' : 'border-gray-400')}`}
                                            style={{
                                                height: '100%',
                                                aspectRatio: fmt.ratio,
                                                maxHeight: '24px'
                                            }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase" translate="no">{fmt.label.replace(/\s*\(.*?\)/, '')}</span>
                                </button>
                            ))}
                        </div>

                        <h2 className={`text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2 ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}><LayoutTemplate size={14} /> Templates</h2>
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {TEMPLATES.map(tpl => (
                                <button key={tpl.id} onClick={() => setActiveTemplate(tpl)} className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${activeTemplate.id === tpl.id ? (isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black') : (isDarkMode ? 'border-neutral-800 bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50')}`}>
                                    {getIcon(tpl.icon)}
                                    <div>
                                        <div className="text-xs font-bold">{tpl.label}</div>
                                        <div className="text-[10px] opacity-60">{tpl.slots} zone(s)</div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <h2 className={`text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2 ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}><Move size={14} /> Géométrie</h2>
                        <div className={`rounded-2xl p-4 border mb-6 ${isDarkMode ? 'bg-neutral-800/30 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                            <ControlGroup label="Marge" value={padding} onChange={setPadding} min={0} max={150} isDarkMode={isDarkMode} />
                            <ControlGroup label="Espace" value={gap} onChange={setGap} min={0} max={100} isDarkMode={isDarkMode} />
                            <ControlGroup label="Arrondi" value={radius} onChange={setRadius} min={0} max={150} isDarkMode={isDarkMode} />
                        </div>

                        <h2 className={`text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2 ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}><Palette size={14} /> Fond</h2>
                        <div className={`flex items-center justify-between mb-4 p-3 rounded-xl border ${isDarkMode ? 'bg-neutral-800/30 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                            <span className="text-sm font-medium flex items-center gap-2"><Layers size={14} className="text-indigo-400" /> Blur Through</span>
                            <button onClick={() => setBgBlur(!bgBlur)} className={`w-10 h-6 rounded-full p-1 transition-colors relative ${bgBlur ? 'bg-indigo-600' : 'bg-neutral-700'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${bgBlur ? 'translate-x-4' : ''}`}></div>
                            </button>
                        </div>
                        <div className={`rounded-2xl p-4 border ${isDarkMode ? 'bg-neutral-800/30 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                            <ControlGroup label="Grain Texture" value={bgTexture} onChange={setBgTexture} min={0} max={50} isDarkMode={isDarkMode} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;