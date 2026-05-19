import React from 'react';
import { X } from 'lucide-react';
import AssetLibrary from '../library/AssetLibrary';

export default function AssetLibraryModal({ isDarkMode, isOpen, onClose, onSelect }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-300">
            <div className="absolute top-4 right-4 z-50 fade-in slide-in-from-top-4">
                <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 hover:scale-110 rounded-full text-white backdrop-blur-md transition-all shadow-xl">
                    <X size={24} strokeWidth={2.5} />
                </button>
            </div>
            <div className={`w-full h-full max-w-[1600px] border shadow-2xl relative flex overflow-hidden animate-in zoom-in-95 duration-300 ${isDarkMode ? 'border-neutral-800 rounded-xl' : 'border-neutral-200 rounded-xl bg-white'}`}>
                <AssetLibrary isDarkMode={isDarkMode} isPickerMode={true} onUseAsset={(url, type) => {
                    onSelect({ src: url, type });
                    onClose();
                }} />
            </div>
        </div>
    );
}
