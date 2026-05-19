import React from 'react';
import { Camera, Sun, Moon, Zap, Layers, LayoutTemplate, Aperture, Download, Library, Film, Send } from 'lucide-react';
import MusicPlayer from './MusicPlayer';

const Header = ({ isDarkMode, setIsDarkMode, view, setView, hasImages, onReset, onExport, onImportPublication, onOpenPublications }) => {
    // Helper simple pour les icônes conditionnelles
    const getIcon = (name) => {
        const map = { Zap, Layers, LayoutTemplate, Aperture, Library, Film };
        const Icon = map[name];
        return Icon ? <Icon size={14} /> : null;
    };

    return (
        <header className={`border-b backdrop-blur-md sticky top-0 z-20 shrink-0 transition-colors duration-300 ${isDarkMode ? 'border-neutral-800 bg-black/90' : 'border-gray-200 bg-white/90'}`}>
            <div className="max-w-[1920px] mx-auto px-6 h-14 flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-[150px]">
                    <div className="w-8 h-8 bg-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                        <Camera size={16} className="text-white" />
                    </div>
                    <h1 className="text-lg font-mono font-bold tracking-tighter uppercase hidden sm:block">Vibe<span className="text-indigo-500">_OS</span></h1>
                    <div className="h-4 w-px bg-neutral-700 mx-2 hidden sm:block"></div>
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-1.5 transition-all duration-300 ${isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-black'}`}>
                        {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                    <MusicPlayer isDarkMode={isDarkMode} />
                </div>

                <div className="flex h-full items-center gap-1">
                    {[
                        { id: 'studio', icon: 'Zap', label: 'Studio' },
                        { id: 'fusion', icon: 'Layers', label: 'Fusion' },
                        { id: 'layout', icon: 'LayoutTemplate', label: 'Layout' },
                        { id: 'library', icon: 'Library', label: 'Library' },
                        { id: 'vision-pro', icon: 'Aperture', label: 'Vision' },
                        { id: 'video', icon: 'Film', label: 'Video' }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setView(tab.id)} className={`relative h-full flex items-center gap-2 px-6 text-[10px] uppercase font-mono tracking-widest transition-all duration-300 border-b-2 ${view === tab.id ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : tab.id === 'video' ? 'border-transparent text-purple-500 hover:text-purple-400 hover:bg-purple-500/5' : 'border-transparent text-neutral-500 hover:text-white hover:bg-white/5'}`}>
                            {getIcon(tab.icon)} <span className="hidden md:inline">{tab.label}</span>
                            {tab.id === 'video' && <span className="text-[7px] bg-purple-500/20 text-purple-400 px-1 py-px font-mono uppercase tracking-wider hidden lg:inline">New</span>}
                        </button>
                    ))}
                </div>

                <div className="flex gap-4 min-w-[150px] justify-end items-center">
                    {onOpenPublications && (
                        <button onClick={onOpenPublications} className={`hidden lg:block text-[10px] uppercase font-mono tracking-widest px-3 py-1 transition-colors duration-200 border ${isDarkMode ? 'border-neutral-800 text-neutral-500 hover:text-white hover:border-indigo-500/50' : 'border-gray-200 text-gray-500 hover:text-black'}`}>Publications</button>
                    )}
                    <button onClick={onReset} disabled={!hasImages} className={`hidden sm:block text-[10px] uppercase font-mono tracking-widest px-3 py-1 transition-colors duration-200 disabled:opacity-30 border border-transparent hover:border-red-900/50 ${isDarkMode ? 'text-neutral-500 hover:text-red-400 hover:bg-red-950/20' : 'text-gray-500 hover:text-red-600'}`}>Reset</button>
                    {onImportPublication && (
                        <button onClick={onImportPublication} disabled={!hasImages} className="hidden xl:flex items-center gap-2 border border-indigo-500/40 bg-indigo-500/10 text-indigo-300 px-4 py-1.5 text-[10px] font-mono font-medium hover:bg-indigo-500 hover:text-white transition disabled:opacity-40 disabled:bg-transparent uppercase tracking-wide">
                            <Send size={14} /> Publication
                        </button>
                    )}
                    <button onClick={onExport} disabled={!hasImages} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-1.5 text-xs font-mono font-medium hover:bg-indigo-500 transition shadow-[0_0_20px_rgba(79,70,229,0.4)] disabled:opacity-50 disabled:shadow-none uppercase tracking-wide clip-path-polygon">
                        <Download size={14} /> <span className="hidden sm:inline">Export</span>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
