import React from 'react';
import { Download, X } from 'lucide-react';

/**
 * ExportModal — Modal de paramètres d'exportation (format, nom, qualité).
 */
export default function ExportModal({
    isDarkMode,
    isOpen,
    onClose,
    exportName, setExportName,
    exportFormat, setExportFormat,
    exportQuality, setExportQuality,
    estimatedSize,
    onExport,
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className={`w-full max-w-lg border rounded-sm flex flex-col overflow-hidden shadow-2xl ${isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-gray-200'}`}>
                {/* HEADER */}
                <div className={`px-4 py-3 border-b flex items-center justify-between ${isDarkMode ? 'border-neutral-800' : 'border-gray-100'}`}>
                    <h3 className={`font-mono text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                        <Download size={14} className="text-indigo-500" /> Paramètres d'Exportation
                    </h3>
                    <button onClick={onClose} className={`transition-colors rounded-sm p-1 ${isDarkMode ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                        <X size={16} />
                    </button>
                </div>

                {/* BODY */}
                <div className="p-6 flex flex-col gap-6">
                    {/* NAME */}
                    <div className="flex flex-col gap-2">
                        <label className={`font-mono text-[10px] uppercase tracking-widest ${isDarkMode ? 'text-neutral-500' : 'text-gray-500'}`}>Nom du fichier</label>
                        <input
                            type="text"
                            value={exportName}
                            onChange={(e) => setExportName(e.target.value)}
                            className={`w-full px-3 py-2 font-mono text-xs rounded-sm border outline-none transition-colors ${isDarkMode ? 'bg-black border-neutral-800 focus:border-indigo-500 text-white' : 'bg-gray-50 border-gray-200 focus:border-indigo-500 text-black'}`}
                            placeholder="mon-nom-fichier"
                        />
                    </div>

                    {/* FORMAT */}
                    <div className="flex flex-col gap-2">
                        <label className={`font-mono text-[10px] uppercase tracking-widest ${isDarkMode ? 'text-neutral-500' : 'text-gray-500'}`}>Format</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'jpg', label: 'JPEG', desc: 'Idéal réseaux sociaux, léger et universel.' },
                                { id: 'png', label: 'PNG', desc: 'Qualité max sans perte, idéal pour le texte.' },
                                { id: 'webp', label: 'WEBP', desc: 'Le plus optimisé, parfait pour le web.' }
                            ].map(fmt => (
                                <button
                                    key={fmt.id}
                                    onClick={() => setExportFormat(fmt.id)}
                                    className={`relative flex flex-col items-center justify-center p-3 border rounded-sm transition-all active:scale-95 group ${exportFormat === fmt.id ? (isDarkMode ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-indigo-500 bg-indigo-50 text-indigo-600') : (isDarkMode ? 'border-neutral-800 hover:border-neutral-600 text-neutral-400' : 'border-gray-200 hover:border-gray-300 text-gray-500')}`}
                                >
                                    <span className="font-mono text-xs font-bold uppercase">{fmt.label}</span>
                                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded-sm text-[10px] font-mono leading-tight shadow-xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none transition-all z-20 ${isDarkMode ? 'bg-neutral-800 text-neutral-300 border border-neutral-700' : 'bg-white text-gray-600 border border-gray-200'}`}>
                                        {fmt.desc}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* QUALITY */}
                    {exportFormat !== 'png' && (
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <label className={`font-mono text-[10px] uppercase tracking-widest ${isDarkMode ? 'text-neutral-500' : 'text-gray-500'}`}>Compression & Qualité</label>
                                <span className={`font-mono text-xs font-bold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{exportQuality}%</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="100"
                                value={exportQuality}
                                onChange={(e) => setExportQuality(Number(e.target.value))}
                                className="w-full h-1 bg-neutral-800 rounded-none appearance-none cursor-pointer accent-indigo-500"
                            />
                            <div className="flex justify-between text-[8px] font-mono uppercase text-neutral-500 mt-1">
                                <span>Fichier Léger</span>
                                <span>Qualité Max</span>
                            </div>
                        </div>
                    )}

                    {/* ESTIMATED SIZE INFO */}
                    <div className={`mt-2 flex items-center justify-between p-3 rounded-sm border ${isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                        <div className="flex flex-col">
                            <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">Poids estimé</span>
                            {exportFormat === 'png' && <span className="text-xs mt-0.5 max-w-[200px] leading-tight opacity-75">Le PNG n'est pas compressé, le poids sera important.</span>}
                        </div>
                        <span className={`font-mono text-lg font-bold ${estimatedSize === 'Calcul...' ? 'animate-pulse text-indigo-500' : ''}`}>{estimatedSize}</span>
                    </div>
                </div>

                {/* FOOTER */}
                <div className={`p-4 border-t flex items-center justify-end gap-3 ${isDarkMode ? 'border-neutral-800 bg-neutral-900/50' : 'border-gray-100 bg-gray-50'}`}>
                    <button onClick={onClose} className={`px-4 py-2 rounded-sm font-mono text-[10px] uppercase tracking-widest font-bold transition-colors ${isDarkMode ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-gray-200 text-gray-600'}`}>Annuler</button>
                    <button onClick={onExport} className="px-6 py-2 rounded-sm font-mono text-[10px] uppercase tracking-widest font-bold transition-colors hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 flex items-center gap-2">
                        <Download size={14} /> Télécharger
                    </button>
                </div>
            </div>
        </div>
    );
}
