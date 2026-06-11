import React from 'react';
import { Upload, Loader2, Maximize, Columns, Smartphone, Move, Plus, X, Layers, RectangleHorizontal, Square, Sparkles, Type, Palette, SlidersHorizontal, Image as ImageIcon, ImagePlus, RefreshCw, Waves, Undo2, Redo2, Trash2 } from 'lucide-react';
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
    handleReplaceImageUpload,
    handleRemoveSlotImage,
    // Canvas actions
    handleFullscreen,
    onCompareOpen,
    onInstaPreview,
    // Layout state
    selectedSlotIndex,
    setSelectedSlotIndex,
    activeTextId,
    activeTemplate,
    isDraggingText,
    isCropping,
    setImages,
    activeFormat,
    showGuidelines,
    visionCompareSplit,
    customEditMode,
    onAddCustomZone,
    onDeleteCustomZone,
    layoutHasGeneratedBackground = false,
    layoutQuickActions,
    slotRectsState,
    // Undo / Redo
    undo,
    redo,
    canUndo,
    canRedo,
}) {
    const showCanvas = images.length > 0 || (view === 'layout' && (activeTemplate?.id === 'custom' || layoutHasGeneratedBackground));
    const showCustomShapePalette = view === 'layout' && activeTemplate?.id === 'custom';

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
        <div className="lg:col-span-8 flex flex-col h-full overflow-hidden p-4 lg:p-6 relative">
            <div
                ref={canvasContainerRef}
                className={`flex-1 border-2 flex flex-col items-center relative overflow-y-auto overflow-x-hidden custom-scrollbar group shadow-none min-h-[400px] transition-colors duration-300 ${isDarkMode ? 'bg-black border-neutral-800' : 'bg-white border-gray-200'} ${!isDarkMode ? 'bg-blend-difference' : ''} ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
                onMouseDown={handlePointerDown} onMouseMove={handlePointerMove} onMouseUp={handlePointerUp} onMouseLeave={handlePointerUp} onTouchStart={handlePointerDown} onTouchMove={handlePointerMove} onTouchEnd={handlePointerUp}
            >
                {/* Tech Markers */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-500 z-10 pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-500 z-10 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-500 z-10 pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-500 z-10 pointer-events-none"></div>
                {view === 'layout' && layoutQuickActions ? (
                    <LayoutQuickRail
                        isDarkMode={isDarkMode}
                        actions={layoutQuickActions}
                    />
                ) : null}

                {isProcessing && (<div className={`absolute inset-0 z-30 flex flex-col items-center justify-center backdrop-blur-md p-6 text-center ${isDarkMode ? 'bg-black/80 text-white' : 'bg-white/80 text-gray-900'}`}><Loader2 size={48} className="text-indigo-500 animate-spin mb-4" /><p className="font-mono text-lg mb-2 uppercase tracking-widest">{loadingStatus || "Processing..."}</p><div className={`w-full max-w-xs h-0.5 mb-2 overflow-hidden ${isDarkMode ? 'bg-neutral-800' : 'bg-gray-200'}`}><div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${loadingProgress}%` }}></div></div><p className={`text-xs font-mono ${isDarkMode ? 'text-neutral-500' : 'text-gray-500'}`}>{loadingProgress}%</p></div>)}

                {!showCanvas ? (
                    <div className="text-center p-8 flex-1 flex flex-col items-center justify-center">
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

                            {onOpenLibrarySelector && <button onClick={onOpenLibrarySelector} className={`cursor-pointer px-6 py-3 font-mono text-[10px] font-bold uppercase tracking-widest transition shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:shadow-[0_0_25px_rgba(236,72,153,0.5)] inline-block border flex items-center justify-center gap-2 ${isDarkMode ? 'bg-pink-900/20 border-pink-500 text-pink-400 hover:bg-pink-900/40' : 'bg-white border-pink-200 text-pink-600 hover:bg-pink-50'}`}>
                                <Layers size={14} /> [ BIBLIOTHÃˆQUE ]
                            </button>}
                        </div>
                    </div>
                ) : (
                    <div
                        className="relative w-full h-full overflow-y-auto no-scrollbar"
                        onDragOver={handleShapeDragOver}
                        onDrop={handleShapeDrop}
                    >
                        <div className="w-full min-h-full flex flex-col items-center justify-start pb-[100px] px-4 md:px-8" style={{ paddingTop: '60px' }}>
                            <div style={{ position: 'relative', ...getCanvasStyle() }} className="transition-all duration-300">
                                <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} className={`block object-contain shadow-2xl rounded-sm ring-1 z-10 relative ${isDarkMode ? 'ring-white/10' : 'ring-black/5'}`} />
                                {visionCompareSplit?.enabled && visionCompareSplit.beforeUrl && (
                                    <div
                                        className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-sm"
                                        data-testid="vision-split-overlay"
                                        aria-hidden="true"
                                    >
                                        <img
                                            src={visionCompareSplit.beforeUrl}
                                            alt="Vision Compare Before"
                                            className="absolute inset-0 h-full w-full object-cover"
                                            style={{ clipPath: `inset(0 ${100 - visionCompareSplit.position}% 0 0)` }}
                                        />
                                        <div
                                            className="absolute bottom-0 top-0 w-1 bg-cyan-400/90 shadow-[0_0_15px_rgba(34,211,238,0.6)]"
                                            style={{ left: `${visionCompareSplit.position}%`, transform: 'translateX(-50%)' }}
                                        />
                                        <div
                                            className="absolute top-3 rounded-sm border border-cyan-300/70 bg-black/80 px-2 py-1 text-[9px] font-mono uppercase tracking-widest text-cyan-100"
                                            style={{ left: `min(calc(${visionCompareSplit.position}% + 8px), calc(100% - 72px))` }}
                                        >
                                            Avant
                                        </div>
                                    </div>
                                )}

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

                                {/* Native HTML Overlay Buttons for slots (Import / Trash) */}
                                {slotRectsState && slotRectsState.length > 0 && activeFormat && (
                                    <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden rounded-sm">
                                        {slotRectsState.map((rect, idx) => {
                                            const formatW = activeFormat.w || activeFormat.width || 1;
                                            const formatH = activeFormat.h || activeFormat.height || 1;
                                            const leftPercent = (rect.x / formatW) * 100;
                                            const topPercent = (rect.y / formatH) * 100;
                                            const widthPercent = (rect.w / formatW) * 100;
                                            const heightPercent = (rect.h / formatH) * 100;

                                            const relativeArea = (rect.w / formatW) * (rect.h / formatH);
                                            const baseScale = Math.sqrt(relativeArea) * 1.0 + 0.5;
                                            const buttonScale = Math.max(0.65, Math.min(1.2, baseScale));

                                            if (rect.hasImage === false) {
                                                return (
                                                    <div
                                                        key={`slot-btn-${idx}`}
                                                        className="absolute flex items-center justify-center pointer-events-auto group"
                                                        style={{
                                                            left: `${leftPercent}%`,
                                                            top: `${topPercent}%`,
                                                            width: `${widthPercent}%`,
                                                            height: `${heightPercent}%`,
                                                        }}
                                                        onPointerDown={(e) => {
                                                            e.stopPropagation();
                                                            if (setSelectedSlotIndex) {
                                                                setSelectedSlotIndex(rect.id);
                                                            }
                                                        }}
                                                    >
                                                        <div
                                                            className="absolute top-2 right-2 flex gap-1.5 z-40 pointer-events-auto"
                                                            style={{
                                                                transform: `scale(${buttonScale})`,
                                                                transformOrigin: 'top right'
                                                            }}
                                                        >
                                                            <label
                                                                className="cursor-pointer w-6 h-6 bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 rounded transition-all flex items-center justify-center shadow-lg"
                                                                title="Importer une image"
                                                            >
                                                                <Upload size={12} strokeWidth={2.5} />
                                                                <input
                                                                    type="file"
                                                                    className="hidden"
                                                                    accept="image/*,.cr2,.nef,.arw,.dng"
                                                                    onChange={(e) => {
                                                                        if (handleSlotImageUpload) {
                                                                            handleSlotImageUpload(e, rect.id);
                                                                        }
                                                                    }}
                                                                />
                                                            </label>
                                                            {activeTemplate?.id === 'custom' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (onDeleteCustomZone) {
                                                                            onDeleteCustomZone(rect.id);
                                                                        }
                                                                    }}
                                                                    className="w-6 h-6 bg-red-950/80 border border-red-500/40 text-red-200 hover:bg-red-600 hover:text-white hover:border-red-500 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-lg"
                                                                    title="Supprimer cette zone"
                                                                    aria-label="Supprimer la zone"
                                                                >
                                                                    <X size={12} strokeWidth={2.5} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            } else {
                                                // Slot has image: render trash button in the corner
                                                return (
                                                    <div
                                                        key={`slot-btn-${idx}`}
                                                        className="absolute flex items-center justify-center pointer-events-auto group"
                                                        style={{
                                                            left: `${leftPercent}%`,
                                                            top: `${topPercent}%`,
                                                            width: `${widthPercent}%`,
                                                            height: `${heightPercent}%`,
                                                        }}
                                                        onPointerDown={(e) => {
                                                            e.stopPropagation();
                                                            if (setSelectedSlotIndex) {
                                                                setSelectedSlotIndex(rect.id);
                                                            }
                                                        }}
                                                    >
                                                        <div
                                                            className="absolute top-2 right-2 z-40 pointer-events-auto"
                                                            style={{
                                                                transform: `scale(${buttonScale})`,
                                                                transformOrigin: 'top right'
                                                            }}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (handleRemoveSlotImage) {
                                                                        handleRemoveSlotImage(rect.id);
                                                                    }
                                                                }}
                                                                className="w-6 h-6 bg-red-600 hover:bg-red-500 text-white rounded shadow-lg transition-all transform hover:scale-110 active:scale-90 cursor-pointer opacity-0 group-hover:opacity-100 flex items-center justify-center"
                                                                title="Supprimer l'image de cette zone"
                                                                aria-label="Supprimer"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>



                        {images.length > 0 && (
                            <div className="absolute top-4 left-4 flex gap-2 z-30 pointer-events-auto">
                                <button onMouseDown={(e) => e.stopPropagation()} onClick={onCompareOpen} className={`p-2 rounded-sm border shadow-lg transition-all active:scale-95 flex items-center justify-center ${isDarkMode ? 'bg-neutral-900/90 border-neutral-700 text-neutral-300 hover:bg-black hover:border-indigo-500 hover:text-indigo-400' : 'bg-white/90 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-500 hover:text-indigo-500'}`} title="Comparer"><Columns size={16} /></button>
                                <button onMouseDown={(e) => e.stopPropagation()} onClick={onInstaPreview} className={`p-2 rounded-sm border shadow-lg transition-all active:scale-95 flex items-center justify-center ${isDarkMode ? 'bg-indigo-900/20 border-indigo-500/50 text-indigo-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-500' : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-600 hover:text-white'}`} title="Preview Insta"><Smartphone size={16} /></button>
                            </div>
                        )}

                        {/* Undo / Redo controls in the center-top area */}
                        {(view === 'layout' || view === 'studio') && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-30 pointer-events-auto">
                                <button
                                    type="button"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={undo}
                                    disabled={!canUndo}
                                    className={`p-2 rounded-sm border shadow-lg transition-all active:scale-95 flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed ${
                                        isDarkMode
                                            ? 'bg-neutral-900/90 border-neutral-700 text-neutral-300 hover:bg-black hover:border-indigo-500 hover:text-indigo-400'
                                            : 'bg-white/90 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-500 hover:text-indigo-500'
                                    }`}
                                    title="Annuler (Ctrl+Z)"
                                    aria-label="Annuler"
                                >
                                    <Undo2 size={15} />
                                </button>
                                <button
                                    type="button"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={redo}
                                    disabled={!canRedo}
                                    className={`p-2 rounded-sm border shadow-lg transition-all active:scale-95 flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed ${
                                        isDarkMode
                                            ? 'bg-neutral-900/90 border-neutral-700 text-neutral-300 hover:bg-black hover:border-indigo-500 hover:text-indigo-400'
                                            : 'bg-white/90 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-500 hover:text-indigo-500'
                                    }`}
                                    title="Refaire (Ctrl+Y / Ctrl+Shift+Z)"
                                    aria-label="Refaire"
                                >
                                    <Redo2 size={15} />
                                </button>
                            </div>
                        )}

                        {view === 'layout' && activeTemplate.id === 'polaroid' && isDraggingText && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-500/80 backdrop-blur px-3 py-1 rounded-full text-[10px] text-white pointer-events-none shadow-lg animate-in fade-in slide-in-from-top-2">
                                Mode dÃ©placement texte actif
                            </div>
                        )}

                        {isCropping && view === 'studio' && (<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-white/50 text-sm bg-black/30 p-2 rounded backdrop-blur border border-white/20 px-3 py-1 flex items-center gap-2 animate-pulse"><Move size={14} /> Glissez pour dÃ©placer</div>)}

                        <button onClick={handleFullscreen} className={`absolute top-4 right-4 p-2.5 rounded-full shadow-lg transition-all active:scale-95 border z-20 pointer-events-auto ${isDarkMode ? 'bg-neutral-900/90 border-white/10 text-white hover:bg-black' : 'bg-white/90 border-gray-200 text-gray-700 hover:bg-gray-50'}`}><Maximize size={18} /></button>

                        {view === 'layout' && (
                            <div className={`vibefx-thumb-rail vibefx-source-dock absolute bottom-4 left-6 right-6 flex gap-3 overflow-x-auto pb-2 pointer-events-auto no-scrollbar ${isDarkMode ? 'is-dark' : 'is-light'}`}>
                                <label className="vibefx-source-add" title="Ajouter une image depuis le PC">
                                    <ImagePlus size={18} />
                                    <span>Ajouter image</span>
                                    <small>PC local</small>
                                    <input type="file" multiple className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </label>
                                {images.map((img, i) => (
                                    <div key={i} className="vibefx-source-card">
                                        <img src={img.src} alt={img.name || `Image source ${i + 1}`} className="vibefx-source-card__image" />
                                        <label className="vibefx-source-card__replace" title="Changer cette image" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                                            <RefreshCw size={11} />
                                            <span>Changer</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={(event) => handleReplaceImageUpload?.(event, i)} />
                                        </label>
                                        <button onClick={(e) => { e.stopPropagation(); const filtered = images.filter((_, idx) => idx !== i); setImages(filtered); }} className="vibefx-source-card__delete" title="Supprimer">
                                            <X size={12} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                ))}
                                {onOpenLibrarySelector && (
                                    <button type="button" onClick={onOpenLibrarySelector} className="vibefx-source-library" title="Ajouter depuis la bibliotheque">
                                        <Layers size={14} />
                                        <span>Bibliotheque</span>
                                    </button>
                                )}
                                <div className="hidden">
                                    <label className={`flex-shrink-0 w-16 h-7 rounded-sm border border-dashed flex items-center justify-center cursor-pointer transition uppercase font-mono text-[8px] tracking-widest ${isDarkMode ? 'border-neutral-700 hover:border-indigo-500 text-neutral-500 hover:text-indigo-400' : 'border-gray-300 hover:border-indigo-500 text-gray-500 hover:text-indigo-500'}`} title="Ajouter depuis le PC">
                                        PC
                                        <input type="file" multiple className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                    {onOpenLibrarySelector && <button onClick={onOpenLibrarySelector} className={`flex-shrink-0 w-16 h-8 rounded-sm border border-dashed flex items-center justify-center cursor-pointer transition uppercase font-mono text-[8px] tracking-widest ${isDarkMode ? 'border-neutral-700 hover:border-pink-500 text-neutral-500 hover:text-pink-400' : 'border-gray-300 hover:border-pink-500 text-gray-500 hover:text-pink-500'}`} title="Ajouter depuis la BibliothÃ¨que">
                                        <Layers size={12} className="mr-1" /> BIB
                                    </button>}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function LayoutQuickRail({ isDarkMode, actions }) {
    const openAccordion = (accordion) => actions.onOpenAccordion?.(accordion);
    const buttons = [
        {
            id: 'mesh',
            label: 'Mesh',
            title: 'Ouvrir Mesh Studio pour le fond',
            icon: Sparkles,
            active: false,
            enabled: actions.layoutBgGradient,
            status: actions.layoutBgGradient ? 'On' : 'Studio',
            onClick: actions.onOpenMesh,
            featured: true,
        },
        {
            id: 'lumen',
            label: 'Lumen',
            title: 'Ouvrir Lumen shaders pour le fond',
            icon: Waves,
            active: false,
            enabled: actions.layoutLumenBackground,
            status: actions.layoutLumenBackground ? 'On' : 'New',
            onClick: actions.onOpenLumen,
            featured: true,
        },
        {
            id: 'blur-pro',
            label: 'Flou Pro',
            title: 'Ouvrir le Flou lisse pro mode',
            icon: Layers,
            active: false,
            enabled: actions.smoothBlurEnabled,
            status: actions.smoothBlurEnabled ? 'On' : null,
            onClick: actions.onOpenSmoothBlur,
            featured: true,
        },
        {
            id: 'bg-blur',
            label: 'Flou fond',
            title: 'Activer ou couper le flou d arriere-plan',
            icon: ImageIcon,
            active: false,
            enabled: actions.layoutBgBlur,
            status: actions.layoutBgBlur ? 'On' : 'Off',
            onClick: actions.onToggleBgBlur,
        },
        {
            id: 'texts',
            label: 'Texte',
            title: 'Ouvrir Textes et Boutons',
            icon: Type,
            active: actions.activeAccordion === 'texts',
            status: actions.activeAccordion === 'texts' ? 'Ouvert' : null,
            onClick: () => openAccordion('texts'),
        },
        {
            id: 'background',
            label: 'Fond',
            title: 'Ouvrir Fond Global',
            icon: Palette,
            active: actions.activeAccordion === 'background',
            status: actions.activeAccordion === 'background' ? 'Ouvert' : null,
            onClick: () => openAccordion('background'),
        },
        {
            id: 'geometry',
            label: 'Marges',
            title: 'Ouvrir Geometrie et Marges',
            icon: SlidersHorizontal,
            active: actions.activeAccordion === 'geometry',
            status: actions.activeAccordion === 'geometry' ? 'Ouvert' : null,
            onClick: () => openAccordion('geometry'),
        },
    ];

    return (
        <aside
            className={`vibefx-layout-quick-rail ${isDarkMode ? 'is-dark' : 'is-light'}`}
            aria-label="Raccourcis de mise en page"
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
        >
            <div className="vibefx-layout-quick-rail__label">Acces rapides</div>
            <div className="vibefx-layout-quick-rail__buttons">
                {buttons.map(({ id, label, title, icon: Icon, active, enabled, status, featured, onClick }) => (
                    <button
                        key={id}
                        type="button"
                        className="vibefx-layout-quick-rail__button"
                        data-active={active ? 'true' : 'false'}
                        data-enabled={enabled ? 'true' : 'false'}
                        data-featured={featured ? 'true' : 'false'}
                        onClick={onClick}
                        title={title}
                        aria-label={title}
                        aria-pressed={enabled ? 'true' : active ? 'true' : 'false'}
                    >
                        <Icon size={15} />
                        <span>{label}</span>
                        {status ? <em>{status}</em> : null}
                    </button>
                ))}
            </div>
        </aside>
    );
}



