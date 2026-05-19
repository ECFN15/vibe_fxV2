import React from 'react';
import { Upload, Loader2, Maximize, Columns, Smartphone, Move, Plus, X, Layers } from 'lucide-react';

/**
 * CanvasWorkspace — Zone canvas principale avec overlays, hints et thumbnails.
 */
export default function CanvasWorkspace({
    isDarkMode,
    isDraggable,
    canvasContainerRef,
    canvasRef,
    images,
    view,
    isProcessing,
    loadingStatus,
    loadingProgress,
    onOpenLibrarySelector,
    // Pointer events
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    // Upload
    handleImageUpload,
    // Canvas actions
    handleFullscreen,
    onCompareOpen,
    onInstaPreview,
    // Layout state
    selectedSlotIndex,
    activeTextId,
    activeTemplate,
    isDraggingText,
    overlayImage,
    isCropping,
    setImages,
    fusionConfig,
    setSelectedImgIndex,
    activeFormat,
    showGuidelines,
}) {
    // Show canvas if there are images OR if we are in Fusion mode (to see background image/gradient)
    const showCanvas = images.length > 0 || view === 'fusion';

    // Dynamic canvas style for consistent aspect ratios
    const getCanvasStyle = () => {
        let maxWidth = 'auto'; // base
        let aspect = undefined;

        if (activeFormat) {
            aspect = activeFormat.ratio || `${activeFormat.w} / ${activeFormat.h}`;
            if (activeFormat.id === 'insta-sq') maxWidth = '500px';
            else if (activeFormat.id === 'insta-port') maxWidth = '460px';
            else if (activeFormat.id === 'story') maxWidth = '350px';
            else if (activeFormat.id === 'insta-land' || activeFormat.ratio > 1.5) maxWidth = '800px';
        }

        if (activeFormat && (view === 'layout' || view === 'fusion' || view === 'vision')) {
            return {
                width: '100%',
                maxWidth: maxWidth,
                height: 'auto',
                aspectRatio: aspect,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            };
        }

        return {
            width: '100%',
            maxWidth: '550px',
            maxHeight: '75vh',
            height: 'auto',
            objectFit: 'contain'
        };
    };

    return (
        <div className="lg:col-span-8 flex flex-col h-full overflow-hidden p-4 lg:p-6 relative">
            <div
                ref={canvasContainerRef}
                className={`flex-1 border-2 flex flex-col items-center justify-center relative overflow-y-auto overflow-x-hidden custom-scrollbar group shadow-none min-h-[400px] transition-colors duration-300 ${isDarkMode ? 'bg-black border-neutral-800' : 'bg-white border-gray-200'} ${!isDarkMode ? 'bg-blend-difference' : ''} ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
                onMouseDown={handlePointerDown} onMouseMove={handlePointerMove} onMouseUp={handlePointerUp} onMouseLeave={handlePointerUp} onTouchStart={handlePointerDown} onTouchMove={handlePointerMove} onTouchEnd={handlePointerUp}
            >
                {/* Tech Markers */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-500 z-10 pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-500 z-10 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-500 z-10 pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-500 z-10 pointer-events-none"></div>

                {isProcessing && (<div className={`absolute inset-0 z-30 flex flex-col items-center justify-center backdrop-blur-md p-6 text-center ${isDarkMode ? 'bg-black/80 text-white' : 'bg-white/80 text-gray-900'}`}><Loader2 size={48} className="text-indigo-500 animate-spin mb-4" /><p className="font-mono text-lg mb-2 uppercase tracking-widest">{loadingStatus || "Processing..."}</p><div className={`w-full max-w-xs h-0.5 mb-2 overflow-hidden ${isDarkMode ? 'bg-neutral-800' : 'bg-gray-200'}`}><div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${loadingProgress}%` }}></div></div><p className={`text-xs font-mono ${isDarkMode ? 'text-neutral-500' : 'text-gray-500'}`}>{loadingProgress}%</p></div>)}

                {!showCanvas ? (
                    <div className="text-center p-8">
                        <div className={`w-24 h-24 flex items-center justify-center mx-auto mb-6 border border-dashed transition-colors duration-300 ${isDarkMode ? 'border-neutral-800 bg-neutral-900/50' : 'border-gray-300 bg-gray-50'}`}>
                            <Upload size={36} className={isDarkMode ? 'text-neutral-600' : 'text-gray-400'} />
                        </div>
                        <h3 className={`text-xl font-mono font-bold mb-2 uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Studio v2.0</h3>
                        <p className={`text-xs font-mono mb-8 uppercase tracking-wide ${isDarkMode ? 'text-neutral-500' : 'text-gray-500'}`}>Upload raw source data</p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-2">
                            <label className={`cursor-pointer px-6 py-3 font-mono text-[10px] font-bold uppercase tracking-widest transition shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] inline-block border ${isDarkMode ? 'bg-indigo-900/20 border-indigo-500 text-indigo-400 hover:bg-indigo-900/40' : 'bg-black border-transparent text-white hover:bg-gray-800'}`}>
                                [ PC LOCAL ]
                                <input type="file" multiple className="hidden" accept="image/*,.cr2,.nef,.arw,.dng" onChange={handleImageUpload} />
                            </label>

                            <button onClick={onOpenLibrarySelector} className={`cursor-pointer px-6 py-3 font-mono text-[10px] font-bold uppercase tracking-widest transition shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:shadow-[0_0_25px_rgba(236,72,153,0.5)] inline-block border flex items-center justify-center gap-2 ${isDarkMode ? 'bg-pink-900/20 border-pink-500 text-pink-400 hover:bg-pink-900/40' : 'bg-white border-pink-200 text-pink-600 hover:bg-pink-50'}`}>
                                <Layers size={14} /> [ BIBLIOTHÈQUE ]
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="relative w-full h-full flex flex-col items-center justify-center p-8 overflow-y-auto no-scrollbar">
                        <div style={{ position: 'relative', marginTop: "auto", marginBottom: "auto", ...getCanvasStyle() }}>
                            <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} className={`block object-contain shadow-2xl rounded-sm ring-1 z-10 relative ${isDarkMode ? 'ring-white/10' : 'ring-black/5'}`} />

                            {/* Pano Guidelines */}
                            {(activeFormat?.id === 'pano-2' || activeFormat?.id === 'pano-3') && showGuidelines && (
                                <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-sm flex">
                                    {activeFormat.id === 'pano-2' ? (
                                        <>
                                            <div className="w-1/2 h-full border-r-[1.5px] border-dashed border-red-500/80 shadow-[0_0_10px_rgba(255,0,0,0.5)]"></div>
                                            <div className="w-1/2 h-full"></div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-1/3 h-full border-r-[1.5px] border-dashed border-red-500/80 shadow-[0_0_10px_rgba(255,0,0,0.5)]"></div>
                                            <div className="w-1/3 h-full border-r-[1.5px] border-dashed border-red-500/80 shadow-[0_0_10px_rgba(255,0,0,0.5)]"></div>
                                            <div className="w-1/3 h-full"></div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {images.length > 0 && (
                            <div className="absolute top-4 left-4 flex gap-2 z-30 pointer-events-auto">
                                <button onMouseDown={(e) => e.stopPropagation()} onClick={onCompareOpen} className={`p-2 rounded-sm border shadow-lg transition-all active:scale-95 flex items-center justify-center ${isDarkMode ? 'bg-neutral-900/90 border-neutral-700 text-neutral-300 hover:bg-black hover:border-indigo-500 hover:text-indigo-400' : 'bg-white/90 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-500 hover:text-indigo-500'}`} title="Comparer"><Columns size={16} /></button>
                                <button onMouseDown={(e) => e.stopPropagation()} onClick={onInstaPreview} className={`p-2 rounded-sm border shadow-lg transition-all active:scale-95 flex items-center justify-center ${isDarkMode ? 'bg-indigo-900/20 border-indigo-500/50 text-indigo-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-500' : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-600 hover:text-white'}`} title="Preview Insta"><Smartphone size={16} /></button>
                            </div>
                        )}

                        {view === 'layout' && selectedSlotIndex === null && !activeTextId && activeTemplate.id !== 'polaroid' && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-[10px] text-white/70 pointer-events-none border border-white/10 animate-pulse">
                                Cliquez sur une image pour l'ajuster
                            </div>
                        )}
                        {view === 'layout' && activeTemplate.id === 'polaroid' && isDraggingText && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-500/80 backdrop-blur px-3 py-1 rounded-full text-[10px] text-white pointer-events-none shadow-lg animate-in fade-in slide-in-from-top-2">
                                Mode déplacement texte actif
                            </div>
                        )}

                        {view === 'fusion' && overlayImage && (<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-white/50 text-sm bg-black/30 p-2 rounded backdrop-blur border border-white/20 px-3 py-1 flex items-center gap-2"><Move size={14} /> Glissez pour bouger</div>)}
                        {isCropping && view === 'studio' && (<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-white/50 text-sm bg-black/30 p-2 rounded backdrop-blur border border-white/20 px-3 py-1 flex items-center gap-2 animate-pulse"><Move size={14} /> Glissez pour déplacer</div>)}

                        <button onClick={handleFullscreen} className={`absolute top-4 right-4 p-2.5 rounded-full shadow-lg transition-all active:scale-95 border z-20 pointer-events-auto ${isDarkMode ? 'bg-neutral-900/90 border-white/10 text-white hover:bg-black' : 'bg-white/90 border-gray-200 text-gray-700 hover:bg-gray-50'}`}><Maximize size={18} /></button>
                        {(view === 'layout' || view === 'fusion') && (
                            <div className="absolute bottom-4 left-6 right-6 flex gap-3 overflow-x-auto pb-2 pointer-events-auto no-scrollbar">
                                {images.map((img, i) => (
                                    <div key={i} className={`relative group flex-shrink-0 w-16 h-16 cursor-pointer border rounded-sm overflow-hidden transition-all active:scale-95 ${isDarkMode ? 'border-neutral-700' : 'border-gray-300'}`} onClick={() => setSelectedImgIndex(i)}>
                                        <img src={img.src} className="w-full h-full object-cover" />
                                        <button onClick={(e) => { e.stopPropagation(); const filtered = images.filter((_, idx) => idx !== i); setImages(filtered); }} className={`absolute top-0 right-0 w-6 h-6 flex items-center justify-center backdrop-blur-md text-white border-b border-l transition-colors z-10 bg-red-600 lg:bg-black/80 lg:hover:bg-red-600 ${isDarkMode ? 'border-neutral-700' : 'border-gray-400'}`} title="Supprimer">
                                            <X size={12} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                ))}
                                <div className="flex flex-col gap-1 items-stretch">
                                    <label className={`flex-shrink-0 w-16 h-7 rounded-sm border border-dashed flex items-center justify-center cursor-pointer transition uppercase font-mono text-[8px] tracking-widest ${isDarkMode ? 'border-neutral-700 hover:border-indigo-500 text-neutral-500 hover:text-indigo-400' : 'border-gray-300 hover:border-indigo-500 text-gray-500 hover:text-indigo-500'}`} title="Ajouter depuis le PC">
                                        PC
                                        <input type="file" multiple className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                    <button onClick={onOpenLibrarySelector} className={`flex-shrink-0 w-16 h-8 rounded-sm border border-dashed flex items-center justify-center cursor-pointer transition uppercase font-mono text-[8px] tracking-widest ${isDarkMode ? 'border-neutral-700 hover:border-pink-500 text-neutral-500 hover:text-pink-400' : 'border-gray-300 hover:border-pink-500 text-gray-500 hover:text-pink-500'}`} title="Ajouter depuis la Bibliothèque">
                                        <Layers size={12} className="mr-1" /> BIB
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
