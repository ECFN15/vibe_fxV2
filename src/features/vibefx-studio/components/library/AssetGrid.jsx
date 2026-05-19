import React, { useState, useEffect, useRef } from 'react';
import { Copy, Plus, ExternalLink, Trash2, Image as ImageIcon, Heart, Download, Share2 } from 'lucide-react';

const ImageWithFallback = React.memo(({ src, fallbackSequence, alt, isDeleting, onLoadSuccess }) => {
    const [currentSrc, setCurrentSrc] = useState(src);
    const [failCount, setFailCount] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);

    const handleError = () => {
        if (failCount < fallbackSequence.length) {
            setCurrentSrc(fallbackSequence[failCount]);
            setFailCount(prev => prev + 1);
        }
    };

    useEffect(() => {
        if (isLoaded && onLoadSuccess) {
            onLoadSuccess(currentSrc);
        }
    }, [isLoaded, currentSrc, onLoadSuccess]);

    return (
        <>
            {/* Show placeholder ONLY until the image is confirmed fully loaded and decoded */}
            {!isLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black transition-opacity duration-500 z-0">
                    <div className="relative w-10 h-10 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
                        <ImageIcon size={16} className="text-indigo-500/50" />
                    </div>
                </div>
            )}
            <img
                src={currentSrc}
                onError={handleError}
                onLoad={() => setIsLoaded(true)}
                alt={alt}
                className={`relative z-10 w-full h-full object-cover transition-[transform,opacity] duration-700 transform-gpu ${isLoaded ? 'opacity-100' : 'opacity-0'} ${isDeleting ? 'animate-disintegrate scale-100' : 'group-hover:scale-110'}`}
            />
        </>
    );
});

export default function AssetGrid({
    isDarkMode, images, selectedTheme, themesData, onUseAsset, onOpenLightbox, onScrape, onDelete, isPickerMode
}) {
    // Track which jobIds are visually "pending deletion" (for UI rendering)
    const [pendingIds, setPendingIds] = useState(new Set());
    // Store timer IDs in a ref so they survive re-renders without stale closures
    const timersRef = useRef({});
    // Store the actual loaded URLs to ensure correct formats (.png vs .webp) are used
    const workingUrlsRef = useRef({});

    // Cleanup all timers on unmount
    useEffect(() => {
        return () => {
            Object.values(timersRef.current).forEach(clearTimeout);
        };
    }, []);

    const handleCopy = (e, text) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
    };

    const handleUse = (e, url, type) => {
        e.stopPropagation();
        onUseAsset(url, type);
    };

    const handleOpenMJ = (e, url) => {
        e.stopPropagation();
        window.open(url, '_blank');
    };

    const handleDownload = async (e, url, prompt) => {
        e.stopPropagation();
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network failure');
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;
            const safeName = prompt ? prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'image';
            a.download = `${safeName}.webp`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Download failed', err);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'image.webp';
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    const handleShare = async (e, url, title) => {
        e.stopPropagation();
        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'Image Vibe_fx',
                    text: title ? `Regardez cette image : "${title}"` : 'Regardez cette magnifique image !',
                    url: url
                });
            } else {
                await navigator.clipboard.writeText(url);
                alert("Le lien de l'image a été copié dans le presse-papier !");
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Erreur lors du partage:', err);
            }
        }
    };

    const handleDeleteRequest = (e, jobId) => {
        e.stopPropagation();

        // Disallow multiple clicks on the same image
        if (timersRef.current[jobId]) return;

        // Mark as pending visually
        setPendingIds(prev => new Set(prev).add(jobId));

        // Set 10s timer before actual deletion
        const timerId = setTimeout(() => {
            // Clean up ref
            delete timersRef.current[jobId];
            // Remove from visual pending state
            setPendingIds(prev => {
                const next = new Set(prev);
                next.delete(jobId);
                return next;
            });
            // Execute the actual delete
            if (onDelete) onDelete(jobId);
        }, 10000);

        timersRef.current[jobId] = timerId;
    };

    const handleCancelDelete = (e, jobId) => {
        e.stopPropagation();
        // Clear timer from ref
        if (timersRef.current[jobId]) {
            clearTimeout(timersRef.current[jobId]);
            delete timersRef.current[jobId];
        }
        // Remove from visual pending state
        setPendingIds(prev => {
            const next = new Set(prev);
            next.delete(jobId);
            return next;
        });
    };

    return (
        <div className="relative">
            {images.length === 0 ? (
                <div className={`col-span-full border flex flex-col items-center justify-center p-20 text-center ${isDarkMode ? 'border-neutral-800 bg-neutral-900/50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mb-6">
                        <ImageIcon size={24} className="text-neutral-500" />
                    </div>
                    <h3 className="font-mono text-sm font-bold uppercase tracking-widest mb-2 text-neutral-300">
                        {selectedTheme ? 'Collection Vide' : 'Aucun Résultat'}
                    </h3>
                    <p className="font-mono text-xs text-neutral-500 mb-6 max-w-sm">
                        {selectedTheme
                            ? `Aucune image n'a encore été téléchargée pour le thème "${selectedTheme}".`
                            : `Lancez une recherche pour collecter de nouvelles images.`
                        }
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {images.map((img, idx) => {
                        let folderName = '';
                        if (themesData?.categories) {
                            for (const c of Object.values(themesData.categories)) {
                                if (img.themes[0] && c.themes[img.themes[0]]) {
                                    folderName = c.themes[img.themes[0]].folder;
                                    break;
                                }
                            }
                        }

                        // Rule: Local High-Res > MJ CDN Upgraded High-Res > Catalog fallback
                        const upgradeMjUrl = (url) => {
                            if (!url) return null;
                            return url.replace(/_\d+_[A-Z]+\.webp.*$/, '.webp');
                        };

                        const cdnHighRes = upgradeMjUrl(img.highResUrl) || `https://cdn.midjourney.com/${img.jobId}/0_0.webp`;
                        const localSrc = folderName ? `/api/image/${folderName}/${img.jobId}` : null;
                        const initialSrc = localSrc || cdnHighRes;

                        const fallbackSeq = [cdnHighRes, img.highResUrl, cdnHighRes.replace('.webp', '.png')];
                        const isDeleting = pendingIds.has(img.jobId);

                        return (
                            <div
                                key={img.jobId}
                                className={`group relative aspect-square overflow-hidden cursor-pointer border transition-colors duration-150 hover:z-10 hover:border-indigo-500/50 transform-gpu will-change-transform ${isDarkMode ? 'border-neutral-800 bg-[#0a0a0a]' : 'border-gray-200 bg-white'} ${isDeleting ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : ''}`}
                                style={{ animationDelay: `${idx * 30}ms` }}
                                onClick={(e) => {
                                    if (isDeleting) return;
                                    const finalUrl = workingUrlsRef.current[img.jobId] || initialSrc;
                                    if (isPickerMode) handleUse(e, finalUrl, 'background');
                                    else onOpenLightbox(img);
                                }}
                            >
                                {/* FAST GLOW BACKGROUND */}
                                {!isDeleting && <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none mix-blend-screen z-20"></div>}
                                {isDeleting && <div className="absolute inset-0 bg-red-900/40 pointer-events-none mix-blend-multiply z-20"></div>}

                                <ImageWithFallback
                                    src={initialSrc}
                                    fallbackSequence={fallbackSeq}
                                    alt={img.prompt}
                                    isDeleting={isDeleting}
                                    onLoadSuccess={(url) => { workingUrlsRef.current[img.jobId] = url; }}
                                />

                                {/* OVERLAY - Normal state */}
                                {!isDeleting && (
                                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 p-4 flex flex-col transition-[opacity,transform] duration-200 ease-out z-30 ${isPickerMode ? 'bg-black/60 backdrop-blur-[2px] justify-center items-center' : 'bg-black/90 justify-between translate-y-2 group-hover:translate-y-0'}`}>

                                        {!isPickerMode ? (
                                            <>
                                                <div className="space-y-2">
                                                    <div className="flex flex-wrap gap-1">
                                                        {img.themes.map(t => (
                                                            <span key={t} className="px-1.5 py-0.5 border border-indigo-500/30 text-[9px] uppercase tracking-widest text-indigo-300 bg-indigo-500/10 font-mono">
                                                                {t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <p className="text-[10px] text-gray-300 font-mono leading-relaxed line-clamp-4 overflow-hidden text-ellipsis italic">
                                                        "{img.prompt}"
                                                    </p>
                                                </div>

                                                <div className="flex flex-col gap-2 mt-auto">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button
                                                            onClick={(e) => handleDownload(e, workingUrlsRef.current[img.jobId] || initialSrc, img.prompt)}
                                                            className="px-2 py-1.5 border border-emerald-500/30 bg-emerald-900/20 hover:bg-emerald-500/40 text-emerald-300 text-[9px] uppercase font-mono tracking-widest flex items-center justify-center gap-1 transition-colors duration-200"
                                                            title="Télécharger l'image"
                                                        >
                                                            <Download size={12} /> DL
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleShare(e, workingUrlsRef.current[img.jobId] || initialSrc, img.prompt)}
                                                            className="px-2 py-1.5 border border-sky-500/30 bg-sky-900/20 hover:bg-sky-500/40 text-sky-300 text-[9px] uppercase font-mono tracking-widest flex items-center justify-center gap-1 transition-colors duration-200"
                                                            title="Partager l'image"
                                                        >
                                                            <Share2 size={12} /> Share
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-2">
                                                        <button onClick={(e) => handleCopy(e, img.prompt)} className="px-2 py-1.5 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-white text-[9px] uppercase font-mono tracking-widest flex items-center justify-center gap-1 transition-colors duration-200" title="Copier le prompt">
                                                            <Copy size={12} /> Prompt
                                                        </button>
                                                        <button onClick={(e) => handleOpenMJ(e, img.detailUrl)} className="px-2 py-1.5 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-white text-[9px] uppercase font-mono tracking-widest flex items-center justify-center gap-1 transition-colors duration-200" title="Ouvrir dans Midjourney">
                                                            <ExternalLink size={12} /> MJ
                                                        </button>
                                                        <button onClick={(e) => handleDeleteRequest(e, img.jobId)} className="px-2 py-1.5 border border-red-900/50 bg-red-950/50 hover:bg-red-900/60 text-red-400 text-[9px] uppercase font-mono tracking-widest flex items-center justify-center gap-1 transition-colors duration-200" title="Supprimer">
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>

                                                    <button
                                                        onClick={(e) => handleUse(e, workingUrlsRef.current[img.jobId] || initialSrc, 'background')}
                                                        className="w-full px-2 py-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-400 text-white text-[10px] uppercase font-mono tracking-widest font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-[0_0_15px_rgba(79,70,229,0.4)] clip-path-polygon will-change-transform"
                                                    >
                                                        <Plus size={14} /> Importer
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <button
                                                onClick={(e) => handleUse(e, workingUrlsRef.current[img.jobId] || initialSrc, 'background')}
                                                className="px-4 py-2 bg-pink-600 hover:bg-pink-500 border border-pink-400 text-white text-[9px] uppercase font-mono tracking-widest font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(236,72,153,0.5)] clip-path-polygon hover:shadow-[0_0_30px_rgba(236,72,153,0.7)]"
                                            >
                                                <Plus size={16} />
                                                <span>Sélectionner</span>
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* OVERLAY - Deleting State */}
                                {isDeleting && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm p-4 flex flex-col items-center justify-center z-30 animate-in fade-in duration-300">
                                        <div className="relative text-red-500 text-[10px] uppercase font-mono tracking-[0.2em] font-bold mb-4 animate-pulse">
                                            Purge imminente...
                                        </div>
                                        <button
                                            onClick={(e) => handleCancelDelete(e, img.jobId)}
                                            className="px-6 py-3 bg-red-600/20 hover:bg-red-500/30 border border-red-500 text-red-100 text-[11px] uppercase font-mono tracking-widest font-bold flex items-center justify-center gap-3 transition-colors shadow-[0_0_30px_rgba(239,68,68,0.5)] clip-path-polygon"
                                        >
                                            <Heart size={16} fill="currentColor" className="animate-heartbeat text-red-500" />
                                            Save Me
                                        </button>
                                    </div>
                                )}

                                {/* CORNER MARKERS - Instant snap */}
                                <div className={`absolute top-2 left-2 w-2 h-2 border-t border-l pointer-events-none transition-opacity duration-150 z-40 ${isDeleting ? 'border-red-500 opacity-100' : 'border-indigo-500/50 opacity-0 group-hover:opacity-100'}`}></div>
                                <div className={`absolute top-2 right-2 w-2 h-2 border-t border-r pointer-events-none transition-opacity duration-150 z-40 ${isDeleting ? 'border-red-500 opacity-100' : 'border-indigo-500/50 opacity-0 group-hover:opacity-100'}`}></div>
                                <div className={`absolute bottom-2 left-2 w-2 h-2 border-b border-l pointer-events-none transition-opacity duration-150 z-40 ${isDeleting ? 'border-red-500 opacity-100' : 'border-indigo-500/50 opacity-0 group-hover:opacity-100'}`}></div>
                                <div className={`absolute bottom-2 right-2 w-2 h-2 border-b border-r pointer-events-none transition-opacity duration-150 z-40 ${isDeleting ? 'border-red-500 opacity-100' : 'border-indigo-500/50 opacity-0 group-hover:opacity-100'}`}></div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
