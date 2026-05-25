import React, { useMemo, useState, useEffect } from 'react';
import { X, Plus, Trash2, Bold, Italic, AlignCenter } from 'lucide-react';
import useVideoStore from '../store/videoStore';
import { loadGoogleFont } from '../preview/VideoPreview';
import { isTrackLocked } from '../model/timelineModel';

const GOOGLE_FONTS = [
    'Inter', 'Montserrat', 'Playfair Display', 'Oswald', 'Lato',
    'Merriweather', 'Abril Fatface', 'Cinzel', 'Caveat', 'Dancing Script',
    'Poppins', 'Roboto', 'Open Sans', 'Raleway', 'Bebas Neue',
    'Pacifico', 'Lobster', 'Righteous', 'Bangers', 'Permanent Marker',
    'Anton', 'Archivo Black', 'Titan One', 'Russo One', 'Press Start 2P',
    'Fredoka One', 'Comfortaa', 'Quicksand', 'Nunito', 'Source Code Pro',
];

const ANIMATION_IN = [
    { id: 'none', name: 'Aucune' },
    { id: 'fade', name: 'Fondu' },
    { id: 'typewriter', name: 'Machine a ecrire' },
    { id: 'slide-up', name: 'Glissement haut' },
    { id: 'slide-down', name: 'Glissement bas' },
    { id: 'scale', name: 'Zoom' },
    { id: 'blur-in', name: 'Flou' },
];

const ANIMATION_OUT = [
    { id: 'none', name: 'Aucune' },
    { id: 'fade', name: 'Fondu' },
    { id: 'slide-up', name: 'Glissement haut' },
    { id: 'slide-down', name: 'Glissement bas' },
    { id: 'scale', name: 'Retrecir' },
];

const TextPanel = () => {
    const {
        textOverlays, addTextOverlay, addTextTrack, updateTextOverlay, removeTextOverlay,
        setActivePanel, currentTime, totalDuration, selectedTextId, setSelectedTextId, tracks
    } = useVideoStore();
    const textTrackOptions = useMemo(() => (
        tracks
            .filter(track => track.type === 'text')
            .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
            .map((track, index) => ({
                id: track.id,
                label: index === 0 ? 'Texte' : `Texte ${index + 1}`,
                locked: track.locked === true,
            }))
    ), [tracks]);
    const allTextTracksLocked = textTrackOptions.length > 0 && textTrackOptions.every(track => track.locked);

    useEffect(() => {
        GOOGLE_FONTS.forEach(f => loadGoogleFont(f));
    }, []);

    const handleAdd = () => {
        if (allTextTracksLocked) return;
        addTextOverlay({
            content: 'Votre Texte',
            startTime: currentTime,
            endTime: Math.min(currentTime + 3, Math.max(totalDuration, 3)),
        });
    };
    const handleAddTimeline = () => {
        addTextTrack();
        setActivePanel('text');
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                <h3 className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Texte</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleAddTimeline}
                        className="inline-flex items-center gap-1 rounded-sm border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[9px] font-mono uppercase tracking-widest text-amber-200 transition hover:bg-amber-500/15"
                        title="Ajouter une timeline texte"
                        aria-label="Ajouter une timeline texte"
                    >
                        <Plus size={11} />
                        Timeline
                    </button>
                    <button onClick={handleAdd} disabled={allTextTracksLocked} className="text-indigo-400 hover:text-indigo-300 transition disabled:opacity-40 disabled:hover:text-indigo-400" title="Ajouter un texte" aria-label="Ajouter un texte">
                        <Plus size={14} />
                    </button>
                    <button onClick={() => setActivePanel(null)} className="text-neutral-500 hover:text-white transition">
                        <X size={14} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                {textOverlays.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest mb-3">Aucun texte</p>
                        <button onClick={handleAdd} disabled={allTextTracksLocked} className="px-4 py-2 text-[10px] font-mono text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/10 transition uppercase tracking-widest disabled:opacity-40 disabled:hover:bg-transparent">
                            + Ajouter un texte
                        </button>
                        <button onClick={handleAddTimeline} className="mt-2 px-4 py-2 text-[10px] font-mono text-amber-300 border border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10 transition uppercase tracking-widest">
                            + Ajouter une timeline
                        </button>
                        <p className="text-[9px] font-mono text-neutral-700 mt-3">
                            Glissez le texte sur la preview pour le positionner
                        </p>
                    </div>
                ) : (
                    textOverlays.map(text => (
                        <TextOverlayEditor
                            key={text.id}
                            text={text}
                            isSelected={text.id === selectedTextId}
                            onSelect={() => setSelectedTextId(text.id)}
                            onUpdate={(updates) => updateTextOverlay(text.id, updates)}
                            onDelete={() => removeTextOverlay(text.id)}
                            trackOptions={textTrackOptions}
                            disabled={isTrackLocked(tracks, text.trackId || 'text-main')}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

const TextOverlayEditor = ({ text, isSelected, onSelect, onUpdate, onDelete, trackOptions = [], disabled = false }) => {
    const [showFontPicker, setShowFontPicker] = useState(false);
    const [fontSearch, setFontSearch] = useState('');

    const filteredFonts = fontSearch
        ? GOOGLE_FONTS.filter(f => f.toLowerCase().includes(fontSearch.toLowerCase()))
        : GOOGLE_FONTS;

    return (
        <div
            className={`border rounded-sm p-3 space-y-3 cursor-pointer transition-all ${
                isSelected
                    ? 'border-indigo-500/50 bg-indigo-500/5'
                    : 'border-neutral-800 hover:border-neutral-700'
            }`}
            onClick={onSelect}
        >
            {/* Content input */}
            <input
                type="text"
                value={text.content}
                disabled={disabled}
                onChange={(e) => onUpdate({ content: e.target.value })}
                aria-label="Contenu du texte"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-sm px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                style={{ fontFamily: `"${text.font}", sans-serif` }}
                placeholder="Votre texte..."
            />

            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
                <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest">Piste</span>
                <select
                    value={text.trackId || 'text-main'}
                    disabled={disabled}
                    onChange={(e) => onUpdate({ trackId: e.target.value })}
                    aria-label="Piste timeline du texte"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-sm px-2 py-1 text-[10px] text-neutral-300 font-mono disabled:opacity-45"
                    onClick={(e) => e.stopPropagation()}
                >
                    {trackOptions.map(track => (
                        <option key={track.id} value={track.id} disabled={track.locked && track.id !== (text.trackId || 'text-main')}>
                            {track.label}{track.locked ? ' - verrouillee' : ''}
                        </option>
                    ))}
                </select>
            </div>

            {/* Font selector */}
            <div className="relative">
                <button
                    onClick={(e) => { e.stopPropagation(); setShowFontPicker(!showFontPicker); }}
                    disabled={disabled}
                    className="w-full flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-sm px-3 py-1.5 text-[11px] text-neutral-300 hover:border-neutral-600 transition disabled:opacity-45"
                    style={{ fontFamily: `"${text.font}", sans-serif` }}
                >
                    <span>{text.font}</span>
                    <span className="text-neutral-600 text-[9px]">Police</span>
                </button>

                {showFontPicker && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-neutral-900 border border-neutral-700 rounded-sm shadow-xl max-h-48 overflow-hidden flex flex-col">
                        <input
                            type="text"
                            value={fontSearch}
                            onChange={(e) => setFontSearch(e.target.value)}
                            placeholder="Rechercher..."
                            className="px-3 py-1.5 bg-neutral-950 border-b border-neutral-800 text-[10px] text-white focus:outline-none"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            {filteredFonts.map(font => (
                                <button
                                    key={font}
                                    onClick={(e) => { e.stopPropagation(); onUpdate({ font }); setShowFontPicker(false); setFontSearch(''); }}
                                    disabled={disabled}
                                    className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-indigo-500/10 transition ${
                                        text.font === font ? 'text-indigo-400 bg-indigo-500/5' : 'text-neutral-300'
                                    }`}
                                    style={{ fontFamily: `"${font}", sans-serif` }}
                                >
                                    {font}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Size slider */}
            <div className="flex items-center gap-2">
                <span className="text-[8px] font-mono text-neutral-500 uppercase w-8 shrink-0">Taille</span>
                <input
                    type="range"
                    min={16} max={200} value={text.fontSize}
                    disabled={disabled}
                    onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
                    className="flex-1 h-1 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-indigo-500 disabled:cursor-not-allowed disabled:opacity-45"
                    onClick={(e) => e.stopPropagation()}
                />
                <span className="text-[9px] font-mono text-neutral-400 w-7 text-right tabular-nums">{text.fontSize}</span>
            </div>

            {/* Color + Style */}
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={text.color}
                    disabled={disabled}
                    onChange={(e) => onUpdate({ color: e.target.value })}
                    className="w-11 h-11 bg-transparent border border-neutral-700 rounded-sm cursor-pointer shrink-0"
                    onClick={(e) => e.stopPropagation()}
                />
                <button
                    onClick={(e) => { e.stopPropagation(); onUpdate({ bold: !text.bold }); }}
                    disabled={disabled}
                    className={`w-11 h-11 flex items-center justify-center border rounded-sm transition ${
                        text.bold ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' : 'border-neutral-700 text-neutral-500'
                    }`}
                >
                    <Bold size={12} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onUpdate({ italic: !text.italic }); }}
                    disabled={disabled}
                    className={`w-11 h-11 flex items-center justify-center border rounded-sm transition ${
                        text.italic ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' : 'border-neutral-700 text-neutral-500'
                    }`}
                >
                    <Italic size={12} />
                </button>
                <div className="flex-1" />
                <button
                    onClick={(e) => { e.stopPropagation(); onUpdate({ x: 0.5, y: 0.5 }); }}
                    disabled={disabled}
                    className="w-11 h-11 flex items-center justify-center border border-neutral-700 text-neutral-500 hover:text-white rounded-sm transition"
                    title="Centrer"
                >
                    <AlignCenter size={12} />
                </button>
            </div>

            {/* Animations */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <span className="text-[8px] font-mono text-neutral-600 uppercase block mb-1">Entree</span>
                    <select
                        value={text.animation || 'fade'}
                        disabled={disabled}
                        onChange={(e) => onUpdate({ animation: e.target.value })}
                        aria-label="Animation d'entree du texte"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-sm px-2 py-1 text-[10px] text-neutral-300 font-mono"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {ANIMATION_IN.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>
                <div>
                    <span className="text-[8px] font-mono text-neutral-600 uppercase block mb-1">Sortie</span>
                    <select
                        value={text.animationOut || 'fade'}
                        disabled={disabled}
                        onChange={(e) => onUpdate({ animationOut: e.target.value })}
                        aria-label="Animation de sortie du texte"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-sm px-2 py-1 text-[10px] text-neutral-300 font-mono"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {ANIMATION_OUT.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Timing */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <span className="text-[8px] font-mono text-neutral-600 uppercase block mb-1">Debut</span>
                    <input
                        type="number"
                        value={parseFloat(text.startTime.toFixed(1))}
                        disabled={disabled}
                        onChange={(e) => onUpdate({ startTime: Math.max(0, parseFloat(e.target.value) || 0) })}
                        aria-label="Debut du texte"
                        step={0.1} min={0}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-sm px-2 py-1 text-[10px] text-neutral-300 font-mono tabular-nums"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
                <div>
                    <span className="text-[8px] font-mono text-neutral-600 uppercase block mb-1">Fin</span>
                    <input
                        type="number"
                        value={parseFloat(text.endTime.toFixed(1))}
                        disabled={disabled}
                        onChange={(e) => onUpdate({ endTime: Math.max(text.startTime + 0.1, parseFloat(e.target.value) || 0) })}
                        aria-label="Fin du texte"
                        step={0.1} min={0}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-sm px-2 py-1 text-[10px] text-neutral-300 font-mono tabular-nums"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            </div>

            {/* Delete */}
            <div className="flex justify-end pt-1">
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    disabled={disabled}
                    className="flex items-center gap-1.5 text-[9px] font-mono text-neutral-600 hover:text-red-400 transition uppercase disabled:opacity-40 disabled:hover:text-neutral-600"
                >
                    <Trash2 size={10} />
                    Supprimer
                </button>
            </div>
        </div>
    );
};

export default TextPanel;
