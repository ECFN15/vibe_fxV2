import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, ScanSearch, Download, ImageIcon, AlertTriangle } from 'lucide-react';

export default function ScrapingStatus({ status, isDarkMode }) {
    if (!status || status.status === 'idle') return null;

    const { phase, progress, found, matched, downloaded, errors, message } = status;
    const isDone = status.status === 'done';
    const isError = status.status === 'error';
    const isRunning = status.status === 'running';

    return (
        <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-[500px] border shadow-2xl p-5 transition-all duration-300 ${isDarkMode ? 'bg-neutral-900/95 border-neutral-700 backdrop-blur-xl' : 'bg-white/95 border-gray-300 backdrop-blur-xl'}`}>
            <div className="flex items-center gap-4 mb-3">
                {isDone ? (
                    <CheckCircle2 className="text-green-500 shrink-0" size={20} />
                ) : isError ? (
                    <AlertCircle className="text-red-500 shrink-0" size={20} />
                ) : (
                    <Loader2 className="animate-spin text-indigo-500 shrink-0" size={20} />
                )}

                <div className="flex-1">
                    <div className="flex justify-between items-center mb-1.5">
                        <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-neutral-400">
                            {isDone ? 'Scraping terminé' : isError ? 'Erreur de scraping' : 'Scraping en cours'}
                        </span>
                        <span className="font-mono text-[10px] text-indigo-400">{progress}%</span>
                    </div>

                    <div className="w-full bg-neutral-800 h-1.5 relative overflow-hidden rounded-full">
                        <div
                            className={`absolute top-0 left-0 h-full transition-all duration-500 rounded-full ${isDone ? 'bg-green-500' : isError ? 'bg-red-500' : 'bg-indigo-500'}`}
                            style={{ width: `${progress}%` }}
                        />
                        {isRunning && (
                            <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
                        )}
                    </div>
                </div>
            </div>

            {/* Live message */}
            <div className="font-mono text-[10px] text-neutral-300 mt-3 pt-3 border-t border-neutral-800/50">
                <span className="uppercase tracking-widest block mb-2 text-neutral-400">{message}</span>

                {/* Stats grid */}
                <div className="grid grid-cols-4 gap-2 mt-2">
                    <div className={`flex flex-col items-center p-2 rounded ${isDarkMode ? 'bg-neutral-800/50' : 'bg-gray-100'}`}>
                        <ScanSearch size={14} className="text-blue-400 mb-1" />
                        <span className="text-[10px] font-bold text-blue-400">{found}</span>
                        <span className="text-[8px] uppercase tracking-wider text-neutral-500">Trouvé</span>
                    </div>
                    <div className={`flex flex-col items-center p-2 rounded ${isDarkMode ? 'bg-neutral-800/50' : 'bg-gray-100'}`}>
                        <ImageIcon size={14} className="text-indigo-400 mb-1" />
                        <span className="text-[10px] font-bold text-indigo-400">{matched}</span>
                        <span className="text-[8px] uppercase tracking-wider text-neutral-500">Correspond.</span>
                    </div>
                    <div className={`flex flex-col items-center p-2 rounded ${isDarkMode ? 'bg-neutral-800/50' : 'bg-gray-100'}`}>
                        <Download size={14} className="text-green-400 mb-1" />
                        <span className="text-[10px] font-bold text-green-400">{downloaded}</span>
                        <span className="text-[8px] uppercase tracking-wider text-neutral-500">DL</span>
                    </div>
                    <div className={`flex flex-col items-center p-2 rounded ${isDarkMode ? 'bg-neutral-800/50' : 'bg-gray-100'}`}>
                        <AlertTriangle size={14} className={`mb-1 ${errors > 0 ? 'text-red-400' : 'text-neutral-600'}`} />
                        <span className={`text-[10px] font-bold ${errors > 0 ? 'text-red-400' : 'text-neutral-600'}`}>{errors}</span>
                        <span className="text-[8px] uppercase tracking-wider text-neutral-500">Erreur</span>
                    </div>
                </div>
            </div>

            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-indigo-500/50 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-indigo-500/50 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-indigo-500/50 pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-indigo-500/50 pointer-events-none"></div>
        </div>
    );
}
