import React, { useRef, useState } from 'react';
import {
    X, ChevronLeft, ChevronRight, MoreHorizontal, Signal, Wifi, Heart,
    MessageCircle, Send, Bookmark, Home, Search, PlusSquare, Video
} from 'lucide-react';
import { Iphone } from '../Iphone15Pro';

/**
 * InstaPreviewModal — Aperçu Instagram dans un frame iPhone.
 */
export default function InstaPreviewModal({ isDarkMode, isOpen, previewUrl, onClose, activeFormat }) {
    const carouselRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);

    if (!isOpen || !previewUrl) return null;

    const isStory = activeFormat?.id === 'story';
    const isPano = activeFormat?.id === 'pano-2' || activeFormat?.id === 'pano-3';

    const handleDotClick = (index) => {
        setActiveIndex(index);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="relative w-full max-w-[340px] select-none pointer-events-auto scale-90 md:scale-100" onClick={(e) => e.stopPropagation()}>
                <Iphone>
                    <div className={`w-full h-full ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'} flex flex-col overflow-hidden relative`}>
                        {/* STATUS BAR */}
                        <div className="h-11 px-8 flex items-end justify-between text-[13px] font-semibold z-20 shrink-0 pb-1.5 leading-none">
                            <div className="flex-1"><span>9:41</span></div>
                            <div className="flex items-center gap-1.5 flex-1 justify-end">
                                <Signal size={14} fill="currentColor" strokeWidth={0} />
                                <Wifi size={14} strokeWidth={2} />
                                <div className="w-[20px] h-[10px] border border-current rounded-[3px] p-[1px] relative opacity-90">
                                    <div className="h-full bg-current rounded-[1px] w-[80%]" />
                                    <div className="absolute -right-[3px] top-[2.5px] w-[2px] h-[4px] bg-current rounded-r-full" />
                                </div>
                            </div>
                        </div>

                        {/* INSTAGRAM HEADER / CONTENT BASED ON FORMAT */}
                        {!isStory ? (
                            <>
                                <div className="h-11 px-3 flex items-center justify-between shrink-0 z-10">
                                    <div className="flex items-center gap-4">
                                        <ChevronLeft size={28} strokeWidth={2.5} className="cursor-pointer" onClick={onClose} />
                                        <span className="text-lg font-bold tracking-tight">Publications</span>
                                    </div>
                                    <div className="w-10 h-10 flex items-center justify-end">
                                        <MoreHorizontal size={22} className="opacity-80" />
                                    </div>
                                </div>

                                {/* SCROLLABLE FEED */}
                                <div className="flex-1 overflow-y-auto no-scrollbar">
                                    {/* POST HEADER */}
                                    <div className="px-3 py-2.5 flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[1.5px]">
                                                <div className={`w-full h-full rounded-full p-[1.5px] ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
                                                    <img src="https://i.pravatar.cc/150?img=32" className="w-full h-full rounded-full object-cover" />
                                                </div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-xs leading-none">ton_vibe_fx</span>
                                                <span className="text-[10px] opacity-60 leading-tight mt-0.5 font-medium text-indigo-500/80">Vibe_fx Studio • Original</span>
                                            </div>
                                        </div>
                                        <MoreHorizontal size={18} className="opacity-40" />
                                    </div>

                                    {/* MAIN IMAGE OR CAROUSEL */}
                                    {isPano ? (
                                        <div className="w-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden relative group pointer-events-auto" style={{ aspectRatio: 4 / 5 }}>
                                            <div
                                                className="flex h-full transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
                                                style={{
                                                    transform: `translateX(-${activeIndex * (100 / (activeFormat.id === 'pano-3' ? 3 : 2))}%)`,
                                                    width: activeFormat.id === 'pano-3' ? '300%' : '200%'
                                                }}
                                            >
                                                {/* Slide 1 */}
                                                <div className="h-full relative overflow-hidden shrink-0" style={{ width: activeFormat.id === 'pano-3' ? '33.333%' : '50%' }}>
                                                    <img src={previewUrl} className="absolute top-0 h-full max-w-none pointer-events-none select-none" style={{ left: '0%', width: activeFormat.id === 'pano-3' ? '300%' : '200%' }} alt="Preview 1" />
                                                </div>
                                                {/* Slide 2 */}
                                                <div className="h-full relative overflow-hidden shrink-0" style={{ width: activeFormat.id === 'pano-3' ? '33.333%' : '50%' }}>
                                                    <img src={previewUrl} className="absolute top-0 h-full max-w-none pointer-events-none select-none" style={{ left: '-100%', width: activeFormat.id === 'pano-3' ? '300%' : '200%' }} alt="Preview 2" />
                                                </div>
                                                {/* Slide 3 (if pano-3) */}
                                                {activeFormat.id === 'pano-3' && (
                                                    <div className="h-full relative overflow-hidden shrink-0" style={{ width: '33.333%' }}>
                                                        <img src={previewUrl} className="absolute top-0 h-full max-w-none pointer-events-none select-none" style={{ left: '-200%', width: '300%' }} alt="Preview 3" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* NAVIGATION OVERLAY BUTTONS (INSTAGRAM WEB DESKTOP STYLE) */}
                                            {activeIndex > 0 && (
                                                <div
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDotClick(activeIndex - 1); }}
                                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex justify-center items-center rounded-full bg-black/60 hover:bg-black/80 text-white z-[9999] transition-colors shadow-xl pointer-events-auto cursor-pointer border border-white/50 backdrop-blur-md"
                                                >
                                                    <ChevronLeft size={22} strokeWidth={2.5} className="mr-0.5" />
                                                </div>
                                            )}
                                            {activeIndex < (activeFormat.id === 'pano-3' ? 2 : 1) && (
                                                <div
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDotClick(activeIndex + 1); }}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex justify-center items-center rounded-full bg-black/60 hover:bg-black/80 text-white z-[9999] transition-colors shadow-xl pointer-events-auto cursor-pointer border border-white/50 backdrop-blur-md"
                                                >
                                                    <ChevronRight size={22} strokeWidth={2.5} className="ml-0.5" />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden flex items-center justify-center pointer-events-auto" style={{ aspectRatio: activeFormat?.ratio || 1 }}>
                                            <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                                        </div>
                                    )}

                                    {/* POST ACTIONS & DOTS */}
                                    <div className="px-3 py-3">
                                        <div className="flex items-center justify-between mb-2.5 relative">
                                            <div className="flex items-center gap-4 relative z-10">
                                                <Heart size={26} strokeWidth={1.8} className="hover:scale-110 active:scale-90 transition-transform cursor-pointer" />
                                                <MessageCircle size={26} strokeWidth={1.8} className="-rotate-90" />
                                                <Send size={26} strokeWidth={1.8} className="rotate-12" />
                                            </div>

                                            {/* PANO DOTS MOVED OUTSIDE IMAGE WITH LARGE CLICK AREAS */}
                                            {isPano && (
                                                <div className="absolute inset-x-0 flex justify-center z-[9999] top-[7px] pointer-events-none">
                                                    <div className="flex gap-[6px] pointer-events-auto">
                                                        <div
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDotClick(0); }}
                                                            className="p-1 -m-1 cursor-pointer"
                                                        >
                                                            <div className={`w-[6px] h-[6px] rounded-full transition-colors duration-300 ${activeIndex === 0 ? 'bg-indigo-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}></div>
                                                        </div>
                                                        <div
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDotClick(1); }}
                                                            className="p-1 -m-1 cursor-pointer"
                                                        >
                                                            <div className={`w-[6px] h-[6px] rounded-full transition-colors duration-300 ${activeIndex === 1 ? 'bg-indigo-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}></div>
                                                        </div>
                                                        {activeFormat.id === 'pano-3' && (
                                                            <div
                                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDotClick(2); }}
                                                                className="p-1 -m-1 cursor-pointer"
                                                            >
                                                                <div className={`w-[6px] h-[6px] rounded-full transition-colors duration-300 ${activeIndex === 2 ? 'bg-indigo-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <Bookmark size={26} strokeWidth={1.8} className="relative z-10" />
                                        </div>

                                        {/* LIKES & CAPTION */}
                                        <div className="space-y-1.5">
                                            <div className="font-bold text-[13px] tracking-tight">2 841 J'aime</div>
                                            <div className="text-[13px] leading-[18px]">
                                                <span className="font-bold mr-2 text-[13.5px]">ton_vibe_fx</span>
                                                <span className="opacity-95 text-neutral-800 dark:text-neutral-200">Incroyable ce rendu avec l'app Vibe_fx ! Un vrai workflow de pro pour mes shoots. 🎨✨</span>
                                                <div className="text-indigo-500/90 mt-1 font-medium">#vibefx #photography #creative</div>
                                            </div>
                                            <div className="text-[10px] opacity-40 uppercase tracking-tighter mt-1 font-semibold">Il y a 45 minutes</div>
                                        </div>
                                    </div>
                                </div>

                                {/* BOTTOM TAB BAR + HOME INDICATOR */}
                                <div className={`h-[76px] border-t ${isDarkMode ? 'border-neutral-900 bg-black' : 'border-neutral-200 bg-white'} px-6 flex flex-col shrink-0 z-20 absolute bottom-0 w-full`}>
                                    <div className="flex-1 flex items-center justify-around pb-5 pt-1">
                                        <Home size={26} strokeWidth={2} />
                                        <Search size={26} strokeWidth={2} className="opacity-40" />
                                        <PlusSquare size={26} strokeWidth={2} className="opacity-40" />
                                        <Video size={26} strokeWidth={2} className="opacity-40" />
                                        <div className="w-7 h-7 rounded-full border border-black/5 dark:border-white/5 overflow-hidden opacity-40">
                                            <img src="https://i.pravatar.cc/150?img=32" className="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                    <div className="h-6 flex items-center justify-center pb-2">
                                        <div className={`w-[130px] h-[5px] rounded-full ${isDarkMode ? 'bg-white/30' : 'bg-black/20'}`} />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 relative bg-black flex flex-col justify-between">
                                {/* FULLSCREEN STORY IMAGE */}
                                <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center z-0 overflow-hidden pb-8">
                                    <img src={previewUrl} className="w-full h-full object-cover rounded-xl" alt="Preview" />
                                </div>
                                {/* OVERLAYS */}
                                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />
                                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none" />

                                {/* TOP STORY UI */}
                                <div className="px-3 pt-2 z-20 flex flex-col gap-2 text-white">
                                    <div className="w-full h-[2px] bg-white/30 rounded-full overflow-hidden">
                                        <div className="w-1/3 h-full bg-white rounded-full"></div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden">
                                                <img src="https://i.pravatar.cc/150?img=32" className="w-full h-full object-cover" />
                                            </div>
                                            <span className="font-semibold text-sm shadow-sm">ton_vibe_fx</span>
                                            <span className="text-white/60 text-xs shadow-sm">2h</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <MoreHorizontal size={20} />
                                            <X size={26} onClick={onClose} className="cursor-pointer" />
                                        </div>
                                    </div>
                                </div>

                                {/* BOTTOM STORY UI */}
                                <div className="px-4 pb-[38px] z-20 flex items-center gap-4 text-white w-full">
                                    <div className="flex-1 border border-white/40 rounded-full px-5 py-3 bg-black/20 backdrop-blur-sm text-sm font-medium">
                                        Envoyer un message
                                    </div>
                                    <Heart size={28} className="hover:scale-110 transition-transform cursor-pointer" />
                                    <Send size={28} className="rotate-12 hover:scale-110 transition-transform cursor-pointer" />
                                </div>
                                {/* HOME INDICATOR LAYER */}
                                <div className="h-[30px] flex items-end justify-center pb-2 z-30 absolute w-full bottom-0 pointer-events-none">
                                    <div className="w-[130px] h-[5px] rounded-full bg-white/30" />
                                </div>
                            </div>
                        )}
                    </div>
                </Iphone>
            </div >
            <button onClick={onClose} className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition z-50"><X size={20} /></button>
        </div >
    );
}
