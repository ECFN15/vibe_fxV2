import React from 'react';
import { Smartphone, LayoutTemplate, Square, Columns, Box, StickyNote, Layers, Grid, Maximize, RectangleHorizontal, Sparkles } from 'lucide-react';
import { FORMATS, TEMPLATES } from '../../data/constants';

// Reusable Button Component inside (or imported if moved to common UI)
const QuickButton = ({ label, sub, color, icon, onClick, disabled, isDarkMode }) => (
  <button onClick={onClick} disabled={disabled} className={`${isDarkMode ? 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 hover:border-neutral-600' : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300'} p-3 text-left transition-all border disabled:opacity-50 group active:scale-[0.98] flex flex-col justify-between h-20 relative overflow-hidden`}>
    <div className={`absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity ${color}`}>{icon}</div>
    <span className={`block text-xs font-mono font-bold uppercase tracking-wider ${color} mt-auto`}>{label}</span>
    <span className={`${isDarkMode ? 'text-neutral-500' : 'text-gray-400'} text-[9px] font-mono leading-tight`}>{sub}</span>
    <div className={`absolute bottom-0 left-0 h-0.5 bg-current w-0 group-hover:w-full transition-all duration-500 ${color}`}></div>
  </button>
);

const ExportPanel = ({ isDarkMode, activeFormat, setActiveFormat, activeTemplate, setActiveTemplate, setOverlayMode, overlayMode, setSelectedSlotIndex, setActiveTextId }) => {
    
    // Mapping des icônes pour l'affichage dynamique
    const getIcon = (iconElement) => {
        // In the data file, icons are JSX elements. We can clone them to adjust props if needed, or just return them.
        // Assuming TEMPLATES array has React Elements as icons.
        return iconElement;
    };

    return (
        <>
            {/* 2. FORMAT */}
            <div className="mb-6">
                <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}><Smartphone size={14}/> Format</h3>
                <div className="grid grid-cols-3 gap-2">
                    {FORMATS.map(fmt => (
                        <button key={fmt.id} onClick={() => setActiveFormat(fmt)} className={`flex flex-col items-center justify-center p-3 border transition-all ${activeFormat.id === fmt.id ? 'bg-indigo-900/30 border-indigo-500 text-indigo-400' : (isDarkMode ? 'border-neutral-800 bg-transparent text-neutral-500 hover:border-neutral-600' : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-white')}`}>
                            <div className="mb-2">{fmt.icon}</div><span className="text-[10px] font-mono font-bold uppercase">{fmt.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* 3. TEMPLATES */}
            <div className="mb-6">
                <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}><LayoutTemplate size={14}/> Modèles</h3>
                <div className="grid grid-cols-2 gap-3">
                    {TEMPLATES.map(tpl => (
                        <button key={tpl.id} onClick={() => { setActiveTemplate(tpl); setSelectedSlotIndex(null); setActiveTextId(null); }} className={`flex items-center gap-3 p-3 border text-left transition-all ${activeTemplate.id === tpl.id ? (isDarkMode ? 'bg-neutral-900 text-white border-white' : 'bg-black text-white border-black') : (isDarkMode ? 'border-neutral-800 bg-transparent text-neutral-500 hover:border-neutral-600' : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-white')}`}>
                            {tpl.icon}
                            <div><div className="text-xs font-bold">{tpl.label}</div><div className="text-[10px] opacity-60">{tpl.slots} zone(s)</div></div>
                        </button>
                    ))}
                </div>
            </div>
            
            {/* SUB-MENU OVERLAY */}
            {activeTemplate.id === 'pip' && (
                <div className={`animate-in slide-in-from-top-2 fade-in duration-300 rounded-xl p-3 border mb-6 ${isDarkMode ? 'bg-neutral-800/50 border-neutral-700' : 'bg-gray-100 border-gray-200'}`}>
                    <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-3 ml-1 ${isDarkMode ? 'text-neutral-400' : 'text-gray-500'}`}>Style Overlay</h4>
                    <div className="flex flex-col gap-2">
                        {[
                            { id: 'square', label: 'Carré (1:1)', icon: <Square size={14}/> },
                            { id: 'landscape', label: 'Paysage (3:2)', icon: <RectangleHorizontal size={14}/> },
                            { id: 'adaptive', label: 'Adaptatif (Auto)', icon: <Sparkles size={14}/> }
                        ].map(mode => (
                            <button key={mode.id} onClick={() => setOverlayMode(mode.id)} className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all text-xs font-medium ${overlayMode === mode.id ? 'bg-indigo-600 border-indigo-500 text-white' : (isDarkMode ? 'border-white/5 hover:bg-white/5 text-gray-400 hover:text-white' : 'border-black/5 hover:bg-black/5 text-gray-600 hover:text-black')}`}>
                                {mode.icon} {mode.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
};

export default ExportPanel;
