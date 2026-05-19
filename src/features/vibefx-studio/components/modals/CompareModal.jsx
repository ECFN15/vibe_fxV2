import React from 'react';
import { Columns, X } from 'lucide-react';

/**
 * CompareModal — Modal de comparaison Avant/Après.
 */
export default function CompareModal({ isDarkMode, isOpen, onClose, modalBeforeRef, modalAfterRef }) {
    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 backdrop-blur-md flex flex-col p-4 animate-in fade-in duration-300 ${isDarkMode ? 'bg-black/95' : 'bg-white/95'}`}>
            <div className="flex justify-between items-center mb-4 px-4">
                <h3 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    <Columns size={20} className="text-indigo-500" /> Comparaison
                </h3>
                <button onClick={onClose} className={`p-2 rounded-full transition ${isDarkMode ? 'bg-neutral-800 hover:bg-neutral-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                    <X size={20} />
                </button>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden h-full">
                <div className={`relative flex flex-col h-full rounded-xl overflow-hidden border ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-gray-50 border-gray-200'}`}>
                    <div className={`absolute top-4 left-4 px-3 py-1 rounded text-xs font-bold uppercase z-10 border backdrop-blur-md ${isDarkMode ? 'bg-black/60 text-neutral-300 border-white/10' : 'bg-white/60 text-gray-600 border-black/10'}`}>Avant</div>
                    <div className="flex-1 flex items-center justify-center p-4 min-h-0 min-w-0 w-full h-full">
                        <canvas ref={modalBeforeRef} className="max-w-full max-h-full object-contain shadow-2xl" />
                    </div>
                </div>
                <div className={`relative flex flex-col h-full rounded-xl overflow-hidden border ${isDarkMode ? 'bg-neutral-900 border-indigo-500/30' : 'bg-gray-50 border-indigo-200'}`}>
                    <div className="absolute top-4 right-4 bg-indigo-600 px-3 py-1 rounded text-xs font-bold uppercase text-white z-10 shadow-lg">Après</div>
                    <div className="flex-1 flex items-center justify-center p-4 min-h-0 min-w-0 w-full h-full">
                        <canvas ref={modalAfterRef} className="max-w-full max-h-full object-contain shadow-2xl" />
                    </div>
                </div>
            </div>
        </div>
    );
}
