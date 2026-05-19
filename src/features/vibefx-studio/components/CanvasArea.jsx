import React from 'react';
import { Upload, ArrowLeft, ArrowRight, X, Loader2, Image as ImageIcon, Columns, Smartphone, Maximize } from 'lucide-react';

const CanvasArea = ({ view, images, isDarkMode, isProcessing, loadingStatus, loadingProgress, handleImageUpload, canvasRef, activeFormat, selectedSlotIndex, handleCanvasClick, moveLayoutImage, removeLayoutImage, openCompareModal, openInstaPreview, handleFullscreen, isDraggable, handleMouseDown, handleMouseMove, handleMouseUp }) => {
    // Dynamic canvas style for consistent aspect ratios
    const getCanvasStyle = () => {
        let maxWidth = '460px'; // base
        let aspect = undefined;

        if (activeFormat) {
            aspect = activeFormat.ratio || `${activeFormat.w} / ${activeFormat.h}`;
            if (activeFormat.id === 'insta-sq') maxWidth = '460px';
            else if (activeFormat.id === 'insta-port') maxWidth = '440px';
            else if (activeFormat.id === 'story') maxWidth = '310px';
            else if (activeFormat.id === 'insta-land' || activeFormat.ratio > 1.5) maxWidth = '700px';
        }

        // Si on a un format (Layout, Fusion...)
        if (activeFormat && (view === 'layout' || view === 'fusion' || view === 'vision')) {
            return {
                width: '100%',
                maxWidth: maxWidth,
                height: 'auto',
                aspectRatio: aspect,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            };
        }

        // Fallback Studio / Vision classique sans sélection format explicite
        return {
            width: '100%',
            maxWidth: '550px',
            maxHeight: '75vh',
            height: 'auto',
            objectFit: 'contain'
        };
    };

    return (
        <div className="lg:col-span-8 flex flex-col h-full overflow-y-auto overflow-x-hidden custom-scrollbar gap-4">
            {view === 'layout' ? (
                <>
                    <div
                        className={`flex-1 rounded-2xl border flex items-center justify-center relative overflow-hidden group shadow-sm min-h-[400px] p-6 transition-colors duration-300 ${isDarkMode ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-gray-200'} bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]`}
                        onClick={handleCanvasClick}
                    >
                        {!images.length ? (
                            <div className="text-center text-neutral-500 border-2 border-dashed border-neutral-700 rounded-3xl p-12 hover:border-neutral-600 transition">
                                <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
                                <p className="mb-6 font-medium">Importez vos photos pour la mise en page</p>
                                <label className={`cursor-pointer px-8 py-3 rounded-full font-semibold transition shadow-lg hover:shadow-xl inline-block mt-2 ${isDarkMode ? 'bg-white text-black hover:bg-neutral-200' : 'bg-black text-white hover:bg-gray-800'}`}>
                                    Choisir des photos
                                    <input type="file" multiple className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </label>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center w-full h-full p-4 overflow-y-auto">
                                <div style={{ position: 'relative', ...getCanvasStyle() }}>
                                    <canvas ref={canvasRef} className="w-full h-full block object-contain bg-neutral-900 cursor-pointer rounded-sm" style={{ width: '100%', height: '100%' }} />
                                    {selectedSlotIndex === null && images.length > 0 && (
                                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-[10px] text-white/70 pointer-events-none border border-white/10 animate-pulse">
                                            Cliquez sur une image pour l'ajuster
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    {images.length > 0 && !isProcessing && (
                        <div className={`h-28 border rounded-2xl backdrop-blur-md flex items-center px-6 gap-3 overflow-x-auto shrink-0 transition-colors duration-300 ${isDarkMode ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white/80 border-gray-200'}`}>
                            <label className={`flex-shrink-0 w-20 h-20 rounded-xl border border-dashed flex flex-col gap-2 items-center justify-center cursor-pointer transition  ${isDarkMode ? 'border-neutral-600 hover:bg-white/5 text-neutral-400 hover:text-white' : 'border-gray-300 hover:bg-black/5 text-gray-500 hover:text-black'}`}>
                                <Upload size={20} />
                                <span className="text-[10px] font-bold">Ajouter</span>
                                <input type="file" multiple className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                            {images.map((img, i) => (
                                <div key={i} className="relative group flex-shrink-0 w-20 h-20">
                                    <img src={img.src} className="w-full h-full object-cover rounded-xl border border-white/10" />
                                    <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-xl">
                                        <button onClick={() => moveLayoutImage(i, -1)} className="text-white hover:text-indigo-400 disabled:opacity-30" disabled={i === 0}><ArrowLeft size={12} /></button>
                                        <button onClick={() => moveLayoutImage(i, 1)} className="text-white hover:text-indigo-400 disabled:opacity-30" disabled={i === images.length - 1}><ArrowRight size={12} /></button>
                                    </div>
                                    <button onClick={() => removeLayoutImage(i)} className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow-sm hover:scale-110">
                                        <X size={10} />
                                    </button>
                                    <div className="absolute top-1 left-1 bg-black/60 backdrop-blur px-1.5 rounded text-[9px] font-bold">{i + 1}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                // SINGLE IMAGE / FUSION MODE
                <>
                    <div
                        className={`flex-1 rounded-2xl border flex items-center justify-center relative overflow-hidden group shadow-sm min-h-[400px] p-6 transition-colors duration-300 ${isDarkMode ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-gray-200'} bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] ${!isDarkMode ? 'bg-blend-difference' : ''} ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
                        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onTouchStart={handleMouseDown} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp}
                    >
                        {isProcessing && (<div className={`absolute inset-0 z-30 flex flex-col items-center justify-center backdrop-blur-md rounded-2xl p-6 text-center ${isDarkMode ? 'bg-neutral-950/80 text-white' : 'bg-white/80 text-gray-900'}`}><Loader2 size={48} className="text-indigo-500 animate-spin mb-4" /><p className="font-medium text-lg mb-2">{loadingStatus || "Traitement..."}</p><div className={`w-full max-w-xs rounded-full h-2.5 mb-2 overflow-hidden ${isDarkMode ? 'bg-neutral-800' : 'bg-gray-200'}`}><div className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${loadingProgress}%` }}></div></div><p className={`text-xs ${isDarkMode ? 'text-neutral-500' : 'text-gray-500'}`}>{loadingProgress}%</p></div>)}

                        {!images.length ? (
                            <div className="text-center p-8">
                                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-dashed transition-colors duration-300 ${isDarkMode ? 'border-neutral-800 bg-neutral-900/50' : 'border-gray-300 bg-gray-50'}`}>
                                    <Upload size={36} className={isDarkMode ? 'text-neutral-500' : 'text-gray-400'} />
                                </div>
                                <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Studio de Création</h3>
                                <p className={`text-sm mb-6 ${isDarkMode ? 'text-neutral-400' : 'text-gray-500'}`}>Créez votre Vibe unique.</p>
                                <label className={`cursor-pointer px-8 py-3 rounded-full font-semibold transition shadow-lg hover:shadow-xl inline-block mt-2 ${isDarkMode ? 'bg-white text-black hover:bg-neutral-200' : 'bg-black text-white hover:bg-gray-800'}`}>
                                    Sélectionner une photo
                                    <input type="file" multiple className="hidden" accept="image/*,.cr2,.nef,.arw,.dng" onChange={handleImageUpload} />
                                </label>
                            </div>
                        ) : (
                            <div className="relative w-full h-full flex flex-col items-center justify-center overflow-y-auto p-4">
                                <canvas ref={canvasRef} style={getCanvasStyle()} className={`object-contain shadow-2xl rounded-sm ring-1 ${isDarkMode ? 'ring-white/10' : 'ring-black/5'}`} />

                                <div className="absolute top-4 left-4 flex gap-2 z-30 pointer-events-auto">
                                    <button onMouseDown={(e) => e.stopPropagation()} onClick={openCompareModal} className={`p-3 rounded-full border shadow-lg transition-all active:scale-95 ${isDarkMode ? 'bg-neutral-900/90 border-white/10 text-white hover:bg-black' : 'bg-white/90 border-gray-200 text-gray-700 hover:bg-gray-50'}`} title="Comparer"><Columns size={18} /></button>
                                    <button onMouseDown={(e) => e.stopPropagation()} onClick={openInstaPreview} className="p-3 rounded-full bg-pink-600 text-white border border-white/10 hover:bg-pink-500 transition-all shadow-lg shadow-pink-500/30 active:scale-95" title="Preview Insta"><Smartphone size={18} /></button>
                                </div>
                                <button onClick={handleFullscreen} className={`absolute top-4 right-4 p-2.5 rounded-full shadow-lg transition-all active:scale-95 border z-20 pointer-events-auto ${isDarkMode ? 'bg-neutral-900/90 border-white/10 text-white hover:bg-black' : 'bg-white/90 border-gray-200 text-gray-700 hover:bg-gray-50'}`}><Maximize size={18} /></button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default CanvasArea;