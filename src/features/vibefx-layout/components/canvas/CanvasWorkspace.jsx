import React from 'react';
import { Upload, Loader2, Maximize, Columns, Smartphone, Move, X, Plus, RectangleHorizontal, Square } from 'lucide-react';
import { CUSTOM_SHAPE_LIBRARY } from '../../data/constants';

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
    handleSlotImageUpload,
    // Canvas actions
    handleFullscreen,
    onCompareOpen,
    onInstaPreview,
    // Layout state
    selectedSlotIndex,
    activeTextId,
    activeTemplate,
    isDraggingText,
    isCropping,
    setImages,
    setSelectedImgIndex,
    activeFormat,
    showGuidelines,
    customEditMode,
    onAddCustomZone,
    texts = [],
    assets = [],
}) {
    const showCanvas = images.length > 0 || (texts && texts.length > 0) || (assets && assets.length > 0) || (view === 'layout' && activeTemplate?.id === 'custom');
    const showCustomShapePalette = view === 'layout' && activeTemplate?.id === 'custom' && customEditMode;

    const getShapeDropPosition = (event, shape) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return null;
        const x = Math.min(1 - shape.w, Math.max(0, ((event.clientX - rect.left) / rect.width) - (shape.w / 2)));
        const y = Math.min(1 - shape.h, Math.max(0, ((event.clientY - rect.top) / rect.height) - (shape.h / 2)));
        return { x, y };
    };

    const handleShapeDragStart = (event, shape) => {
        event.dataTransfer.setData('application/vibefx-shape', shape.id);
        event.dataTransfer.effectAllowed = 'copy';
    };

    const handleShapeDragOver = (event) => {
        if (!showCustomShapePalette) return;
        const shapeId = Array.from(event.dataTransfer.types).includes('application/vibefx-shape');
        if (!shapeId) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    };

    const handleShapeDrop = (event) => {
        if (!showCustomShapePalette) return;
        const shapeId = event.dataTransfer.getData('application/vibefx-shape');
        const shape = CUSTOM_SHAPE_LIBRARY.find((item) => item.id === shapeId);
        if (!shape) return;
        event.preventDefault();
        event.stopPropagation();
        onAddCustomZone?.(shape, getShapeDropPosition(event, shape));
    };

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

        if (activeFormat && (view === 'layout' || view === 'vision')) {
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
        <div className="vibefx-canvas-workspace lg:col-span-8 flex flex-col h-full overflow-hidden p-4 lg:p-6 relative">
            {/* Programmatic file inputs for canvas click actions */}
            <input
                id="layout-general-file-input"
                type="file"
                multiple
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
            />
            <input
                id="layout-slot-file-input"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleSlotImageUpload}
            />

            <div
                ref={canvasContainerRef}
                className={`vibefx-canvas-viewport flex-1 border-2 flex flex-col items-center justify-center relative overflow-y-auto overflow-x-hidden custom-scrollbar group shadow-none min-h-[400px] transition-colors duration-300 ${isDarkMode ? 'bg-black border-neutral-800' : 'bg-white border-gray-200'} ${!isDarkMode ? 'bg-blend-difference' : ''} ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
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

                        <div className="vibefx-source-actions flex flex-col sm:flex-row gap-4 justify-center items-center mt-2">
                            <label className={`cursor-pointer px-6 py-3 font-mono text-[10px] font-bold uppercase tracking-widest transition shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] inline-block border ${isDarkMode ? 'bg-indigo-900/20 border-indigo-500 text-indigo-400 hover:bg-indigo-900/40' : 'bg-black border-transparent text-white hover:bg-gray-800'}`}>
                                <span className="hidden sm:inline">[ PC LOCAL ]</span>
                                <span className="sm:hidden">[ LOCAL MOBILE ]</span>
                                <input type="file" multiple className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                        </div>
                    </div>
                ) : (
                    <div
                        className="vibefx-canvas-stage relative w-full h-full flex flex-col items-center pt-8 pb-[130px] px-8 overflow-y-auto no-scrollbar"
                        onDragOver={handleShapeDragOver}
                        onDrop={handleShapeDrop}
                    >
                        {showCustomShapePalette ? (
                            <div
                                className="absolute right-5 top-1/2 z-30 w-36 -translate-y-1/2 border border-indigo-400/40 bg-black/85 p-2 shadow-[0_0_28px_rgba(79,70,229,0.24)] backdrop-blur-xl"
                                onMouseDown={(event) => event.stopPropagation()}
                                onTouchStart={(event) => event.stopPropagation()}
                            >
                                <div className="mb-2 flex items-center gap-2 px-1 font-mono text-[9px] font-bold uppercase tracking-widest text-indigo-200">
                                    <Plus size={12} />
                                    Formes
                                </div>
                                <div className="grid gap-1.5">
                                    {CUSTOM_SHAPE_LIBRARY.map((shape) => (
                                        <button
                                            key={shape.id}
                                            type="button"
                                            draggable
                                            data-testid={`custom-shape-${shape.id}`}
                                            onDragStart={(event) => handleShapeDragStart(event, shape)}
                                            onClick={() => onAddCustomZone?.(shape, null)}
                                            className="group flex items-center gap-2 border border-neutral-800 bg-neutral-950/80 px-2 py-2 text-left transition hover:border-indigo-400/70 hover:bg-indigo-500/15"
                                            title={shape.description}
                                        >
                                            <span className="flex h-7 w-8 items-center justify-center text-indigo-300">
                                                {shape.id === 'square' ? <Square size={16} /> : <RectangleHorizontal size={18} />}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block truncate font-mono text-[9px] font-bold uppercase tracking-widest text-neutral-200">{shape.label}</span>
                                                <span className="block truncate text-[9px] text-neutral-500">{Math.round(shape.w * 100)} x {Math.round(shape.h * 100)}%</span>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                        <div className={`vibefx-canvas-frame vibefx-format-${activeFormat?.id || 'default'}`} style={{ position: 'relative', marginTop: "auto", marginBottom: "auto", ...getCanvasStyle() }}>
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

                            {/* HTML Overlays for File Upload (frontsymmetry implementation) */}
                            {view === 'layout' && (slotRectsState || []).filter(s => !s.hasImage).map(slot => {
                                const left = (slot.x / activeFormat.w) * 100;
                                const top = (slot.y / activeFormat.h) * 100;
                                const width = (slot.w / activeFormat.w) * 100;
                                const height = (slot.h / activeFormat.h) * 100;
                                return (
                                    <div key={slot.id} className="absolute z-30 flex items-center justify-center pointer-events-none" style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}>
                                        <button 
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const fileInput = document.getElementById('layout-slot-file-input');
                                                if (fileInput) {
                                                    fileInput.dataset.slotId = slot.id;
                                                    fileInput.click();
                                                }
                                            }}
                                            className="px-4 py-2 sm:px-6 sm:py-3 bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-400/50 hover:border-indigo-400 text-white font-mono text-xs sm:text-sm uppercase tracking-widest rounded-md backdrop-blur-md shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transition-all flex items-center gap-2 pointer-events-auto cursor-pointer"
                                        >
                                            <Plus size={16} /> IMPORT
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {images.length > 0 && (
                            <div className="vibefx-canvas-tools absolute top-4 left-4 flex gap-2 z-30 pointer-events-auto">
                                <button onMouseDown={(e) => e.stopPropagation()} onClick={onCompareOpen} className={`p-2 rounded-sm border shadow-lg transition-all active:scale-95 flex items-center justify-center ${isDarkMode ? 'bg-neutral-900/90 border-neutral-700 text-neutral-300 hover:bg-black hover:border-indigo-500 hover:text-indigo-400' : 'bg-white/90 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-500 hover:text-indigo-500'}`} title="Comparer"><Columns size={16} /></button>
                                <button onMouseDown={(e) => e.stopPropagation()} onClick={onInstaPreview} className={`p-2 rounded-sm border shadow-lg transition-all active:scale-95 flex items-center justify-center ${isDarkMode ? 'bg-indigo-900/20 border-indigo-500/50 text-indigo-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-500' : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-600 hover:text-white'}`} title="Preview Insta"><Smartphone size={16} /></button>
                            </div>
                        )}


                        {view === 'layout' && activeTemplate.id === 'polaroid' && isDraggingText && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-500/80 backdrop-blur px-3 py-1 rounded-full text-[10px] text-white pointer-events-none shadow-lg animate-in fade-in slide-in-from-top-2">
                                Mode déplacement texte actif
                            </div>
                        )}

                        {isCropping && view === 'studio' && (<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-white/50 text-sm bg-black/30 p-2 rounded backdrop-blur border border-white/20 px-3 py-1 flex items-center gap-2 animate-pulse"><Move size={14} /> Glissez pour déplacer</div>)}

                        <button onClick={handleFullscreen} className={`vibefx-fullscreen-button absolute top-4 right-4 p-2.5 rounded-sm shadow-lg transition-all active:scale-95 border z-20 pointer-events-auto flex items-center justify-center ${isDarkMode ? 'bg-neutral-900/90 border-neutral-700 text-neutral-300 hover:bg-black hover:border-indigo-500 hover:text-indigo-400' : 'bg-white/90 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-500 hover:text-indigo-500'}`}><Maximize size={18} /></button>
                        {view === 'layout' && (
                            <div className="vibefx-thumb-rail absolute bottom-4 left-6 right-6 flex gap-3 overflow-x-auto pb-2 pointer-events-auto no-scrollbar">
                                {images.map((img, i) => (
                                    <div key={i} className={`relative group flex-shrink-0 w-16 h-16 cursor-pointer border rounded-sm overflow-hidden transition-all active:scale-95 ${isDarkMode ? 'border-neutral-700' : 'border-gray-300'}`} onClick={() => setSelectedImgIndex(i)}>
                                        <img src={img.src} alt="" className="w-full h-full object-cover" />
                                        <button onClick={(e) => { e.stopPropagation(); const filtered = images.filter((_, idx) => idx !== i); setImages(filtered); }} className={`absolute top-0 right-0 w-6 h-6 flex items-center justify-center backdrop-blur-md text-white border-b border-l transition-colors z-10 bg-red-600 lg:bg-black/80 lg:hover:bg-red-600 ${isDarkMode ? 'border-neutral-700' : 'border-gray-400'}`} title="Supprimer">
                                            <X size={12} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                ))}
                                <div className="vibefx-thumbnail-source-actions flex flex-col gap-1 items-stretch">
                                    <label className={`flex-shrink-0 w-16 h-7 rounded-sm border border-dashed flex items-center justify-center cursor-pointer transition uppercase font-mono text-[8px] tracking-widest ${isDarkMode ? 'border-neutral-700 hover:border-indigo-500 text-neutral-500 hover:text-indigo-400' : 'border-gray-300 hover:border-indigo-500 text-gray-500 hover:text-indigo-500'}`} title="Ajouter depuis le PC">
                                        <span className="hidden sm:inline">PC</span>
                                        <span className="sm:hidden">MOBILE</span>
                                        <input type="file" multiple className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
