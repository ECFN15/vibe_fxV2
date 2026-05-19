import React from 'react';
import { X, CheckCircle, ArrowRight } from 'lucide-react';

export default function ReclassifyReportModal({ isDarkMode, status, onClose }) {
    if (!status || status.status !== 'done') return null;

    const changes = status.changes || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`relative flex flex-col w-full max-w-4xl max-h-[85vh] rounded-xl overflow-hidden shadow-2xl border ${isDarkMode ? 'bg-[#0f0f0f] border-neutral-800' : 'bg-white border-gray-200'}`}>

                {/* Header */}
                <div className={`px-6 py-4 flex items-center justify-between border-b ${isDarkMode ? 'border-neutral-800 bg-[#141414]' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="text-green-500 w-5 h-5" />
                            <h2 className={`text-lg font-bold uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                Rapport de Reclassification
                            </h2>
                        </div>
                        <p className={`text-sm mt-1 uppercase tracking-wider ${isDarkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
                            {status.changed} images sur {status.total} ont été reclassifiées dans de nouvelles catégories.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-gray-200 text-gray-500 hover:text-black'}`}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body / List */}
                <div className={`flex-1 overflow-y-auto p-6 ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-white'}`}>
                    {changes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12">
                            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                                <CheckCircle className="text-blue-500 w-8 h-8" />
                            </div>
                            <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Aucune image modifiée</h3>
                            <p className={isDarkMode ? 'text-neutral-400' : 'text-slate-500'}>Toutes les images étaient déjà correctement classées selon le nouveau modèle de données.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {changes.map((c, i) => (
                                <div key={i} className={`flex items-start gap-4 p-4 rounded-lg border ${isDarkMode ? 'border-neutral-800 bg-[#111] hover:bg-neutral-800/80 transition-colors' : 'border-gray-100 bg-gray-50 hover:bg-white transition-colors'}`}>

                                    {/* Preview Img */}
                                    <div className="w-16 h-16 rounded-md overflow-hidden shrink-0 border border-neutral-700/50 bg-black">
                                        <img
                                            src={c.highResUrl ? c.highResUrl.replace(/_\d+_[A-Z]+\.webp.*$/, '.webp') : `https://cdn.midjourney.com/${c.jobId}/0_0.webp`}
                                            alt="preview"
                                            className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                                            onError={(e) => {
                                                const target = e.currentTarget;
                                                if (!target.dataset.retried) {
                                                    target.dataset.retried = 'true';
                                                    target.src = `https://cdn.midjourney.com/${c.jobId}/0_0.png`;
                                                } else {
                                                    target.style.display = 'none';
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm italic mb-2 truncate ${isDarkMode ? 'text-neutral-400' : 'text-gray-600'}`}>"{c.promptPreview}..."</p>

                                        <div className="flex items-center gap-3 flex-wrap">
                                            {/* Old Tags */}
                                            <div className="flex gap-1 flex-wrap">
                                                {c.oldThemes.length ? c.oldThemes.map(t => (
                                                    <span key={t} className={`text-[10px] px-2 py-0.5 rounded border uppercase tracking-wider font-bold ${isDarkMode ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                                        {t.replace(/_/g, ' ')}
                                                    </span>
                                                )) : (
                                                    <span className={`text-[10px] px-2 py-0.5 rounded border uppercase tracking-wider font-bold ${isDarkMode ? 'bg-neutral-800 text-neutral-500 border-transparent' : 'bg-gray-200 text-gray-500 border-transparent'}`}>Non Classé</span>
                                                )}
                                            </div>

                                            <ArrowRight size={14} className={isDarkMode ? 'text-neutral-600' : 'text-gray-400'} />

                                            {/* New Tags */}
                                            <div className="flex gap-1 flex-wrap">
                                                {c.newThemes.length ? c.newThemes.map(t => (
                                                    <span key={t} className={`text-[10px] px-2 py-0.5 rounded border uppercase tracking-wider font-bold ${isDarkMode ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-green-100 text-green-700 border-green-200'}`}>
                                                        {t.replace(/_/g, ' ')}
                                                    </span>
                                                )) : (
                                                    <span className={`text-[10px] px-2 py-0.5 rounded border uppercase tracking-wider font-bold ${isDarkMode ? 'bg-neutral-800 text-neutral-500 border-transparent' : 'bg-gray-200 text-gray-500 border-transparent'}`}>Non Classé</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            ))}
                            {status.changed > 300 && (
                                <div className="text-center py-4 text-sm text-neutral-500 italic">
                                    Affichage des 300 premières modifications sur {status.changed}...
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`p-4 border-t flex justify-end ${isDarkMode ? 'border-neutral-800 bg-[#141414]' : 'border-gray-100 bg-gray-50'}`}>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-[#5d3fd3] hover:bg-[#6b4ce6] text-white text-xs uppercase tracking-widest font-bold rounded shadow-lg shadow-[#5d3fd3]/20 transition-all flex items-center gap-2"
                    >
                        Terminer <CheckCircle size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
