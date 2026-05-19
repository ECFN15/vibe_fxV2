import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Copy, ExternalLink, Download, Plus } from 'lucide-react';

export default function AssetModal({ isDarkMode, image, onClose, onNavigate, onUseAsset, themesData }) {

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') onNavigate(-1);
            if (e.key === 'ArrowRight') onNavigate(1);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, onNavigate]);

    if (!image) return null;

    const handleCopy = (e, text) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
    };

    const handleOpenMJ = (e, url) => {
        e.stopPropagation();
        window.open(url, '_blank');
    };

    // We need the folder name. We can find it from themesData.
    let folderName = '';
    if (themesData?.categories) {
        for (const c of Object.values(themesData.categories)) {
            if (image.themes[0] && c.themes[image.themes[0]]) {
                folderName = c.themes[image.themes[0]].folder;
                break;
            }
        }
    }

    // Rule: Local High-Res > MJ CDN Upgraded High-Res > Catalog fallback
    const upgradeMjUrl = (url) => {
        if (!url) return null;
        return url.replace(/_\d+_[A-Z]+\.webp.*$/, '.webp');
    };

    const cdnHighRes = upgradeMjUrl(image.highResUrl) || `https://cdn.midjourney.com/${image.jobId}/0_0.webp`;
    const localSrc = folderName ? `/api/image/${folderName}/${image.jobId}` : null;
    const initialSrc = localSrc || cdnHighRes;

    const [currentSrc, setCurrentSrc] = useState(initialSrc);
    useEffect(() => { setCurrentSrc(initialSrc); }, [initialSrc]);

    const handleUse = (type) => {
        onUseAsset(currentSrc, type);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 sm:p-8" onClick={onClose}>

            <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="absolute top-6 right-6 p-2 text-white hover:bg-white/10 transition-colors z-50 rounded-sm"
            >
                <X size={24} />
            </button>

            {/* Navigation Left */}
            <button
                onClick={(e) => { e.stopPropagation(); onNavigate(-1); }}
                className="absolute left-6 top-1/2 -translate-y-1/2 p-3 text-white hover:bg-white/10 transition-colors z-50 rounded-sm hidden sm:block"
            >
                <ChevronLeft size={36} />
            </button>

            {/* Navigation Right */}
            <button
                onClick={(e) => { e.stopPropagation(); onNavigate(1); }}
                className="absolute right-6 top-1/2 -translate-y-1/2 p-3 text-white hover:bg-white/10 transition-colors z-50 rounded-sm hidden sm:block"
            >
                <ChevronRight size={36} />
            </button>

            <div
                className="relative max-w-6xl max-h-[90vh] w-full flex flex-col md:flex-row gap-6 bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >

                {/* Image Section */}
                <div className="flex-1 max-h-[60vh] md:max-h-[90vh] bg-black flex items-center justify-center relative group">
                    <img
                        src={currentSrc}
                        onError={() => {
                            if (localSrc && currentSrc.includes(localSrc)) {
                                setCurrentSrc(cdnHighRes);
                            }
                            else if (currentSrc.includes(cdnHighRes) && cdnHighRes !== image.highResUrl) {
                                setCurrentSrc(image.highResUrl);
                            }
                            else if (currentSrc.includes('.webp')) {
                                setCurrentSrc(currentSrc.replace('.webp', '.png'));
                            }
                        }}
                        alt="Asset Full"
                        className="w-full h-full object-contain"
                    />

                    {/* Corner Markers */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-500/50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-500/50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>

                {/* Details Section */}
                <div className="w-full md:w-80 lg:w-96 flex flex-col justify-between p-6 bg-neutral-900 border-l border-neutral-800 custom-scrollbar overflow-y-auto">

                    <div className="space-y-6">
                        <div>
                            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> Metadata
                            </h2>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {image.themes.map(t => (
                                    <span key={t} className="px-2 py-1 bg-indigo-500/10 text-indigo-400 font-mono text-[10px] uppercase tracking-widest border border-indigo-500/20">
                                        {t}
                                    </span>
                                ))}
                            </div>
                            <div className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">
                                Scraped On: {new Date(image.scrapedAt).toLocaleDateString()}
                            </div>
                        </div>

                        <div>
                            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">Parameters</h2>
                            <p className="font-mono text-[11px] leading-loose text-neutral-300 bg-neutral-950 p-4 border border-neutral-800 h-32 overflow-y-auto custom-scrollbar">
                                {image.prompt}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3 mt-6 pt-6 border-t border-neutral-800">
                        <button
                            onClick={(e) => handleCopy(e, image.prompt)}
                            className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors border border-neutral-700"
                        >
                            <Copy size={14} /> Copy Prompt
                        </button>

                        <button
                            onClick={(e) => handleOpenMJ(e, image.detailUrl)}
                            className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors border border-neutral-700"
                        >
                            <ExternalLink size={14} /> Midjourney Page
                        </button>

                        <div className="grid grid-cols-2 gap-2 mt-4">
                            <button
                                onClick={() => handleUse('background')}
                                className="col-span-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 clip-path-polygon shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                            >
                                <Plus size={14} /> Import to Canvas
                            </button>
                            <button
                                onClick={() => handleUse('overlay')}
                                className="col-span-2 py-2 bg-transparent border border-indigo-500/50 hover:bg-indigo-500/10 text-indigo-400 font-mono text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                <Plus size={12} /> Set as Overlay Layer
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            {/* Mobile Navigation Area (overlapping image to allow swiping visually but we use buttons for now) */}
            <div className="absolute inset-x-0 bottom-4 flex justify-between px-6 sm:hidden pointer-events-none">
                <button
                    onClick={(e) => { e.stopPropagation(); onNavigate(-1); }}
                    className="p-3 bg-neutral-900 border border-neutral-800 text-white pointer-events-auto"
                >
                    <ChevronLeft size={24} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onNavigate(1); }}
                    className="p-3 bg-neutral-900 border border-neutral-800 text-white pointer-events-auto"
                >
                    <ChevronRight size={24} />
                </button>
            </div>
        </div>
    );
}
