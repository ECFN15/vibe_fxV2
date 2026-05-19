import React, { useRef } from 'react';
import { X, Plus, Trash2, Volume2, Library } from 'lucide-react';
import useVideoStore from '../store/videoStore';

const AudioPanel = () => {
    const {
        audioTracks, addAudioTrack, removeAudioTrack, updateAudioTrack,
        clips, selectedClipId, updateClip, setActivePanel, currentTime
    } = useVideoStore();

    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const audio = new Audio(url);
        audio.onloadedmetadata = () => {
            addAudioTrack({
                name: file.name.replace(/\.[^.]+$/, ''),
                url,
                file,
                duration: audio.duration,
                startTime: currentTime,
            });
        };
        e.target.value = '';
    };

    const selectedClip = clips.find(c => c.id === selectedClipId);

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                <h3 className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Audio</h3>
                <button onClick={() => setActivePanel(null)} className="text-neutral-500 hover:text-white transition">
                    <X size={14} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
                {/* Clip volume */}
                {selectedClip && (
                    <div className="border border-neutral-800 rounded-sm p-3 space-y-2">
                        <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Volume du clip</span>
                        <div className="flex items-center gap-3">
                            <Volume2 size={14} className="text-neutral-400 shrink-0" />
                            <input
                                type="range" min={0} max={200}
                                aria-label={`Volume du clip ${selectedClip.name}`}
                                value={selectedClip.volume}
                                onChange={(e) => updateClip(selectedClip.id, { volume: parseInt(e.target.value) })}
                                className="flex-1 h-1 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
                            />
                            <span className="text-[10px] font-mono text-neutral-400 tabular-nums w-8 text-right">{selectedClip.volume}%</span>
                        </div>
                    </div>
                )}

                {/* Music library button */}
                <button
                    onClick={() => setActivePanel('music')}
                    className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-emerald-800/50 hover:border-emerald-500/50 hover:bg-emerald-500/5 rounded-sm transition"
                >
                    <Library size={14} className="text-emerald-500/60" />
                    <span className="text-[10px] font-mono text-emerald-500/60 uppercase tracking-widest">Bibliotheque musicale</span>
                </button>

                {/* Music tracks */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Pistes audio</span>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="text-indigo-400 hover:text-indigo-300 transition"
                            aria-label="Importer une piste audio"
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileSelect} className="hidden" />

                    {audioTracks.length === 0 ? (
                        <p className="text-[9px] font-mono text-neutral-700 py-2">Aucune piste audio</p>
                    ) : (
                        audioTracks.map(track => (
                            <div key={track.id} className="border border-neutral-800 rounded-sm p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono text-neutral-300 truncate">{track.name}</span>
                                    <button
                                        onClick={() => removeAudioTrack(track.id)}
                                        className="text-neutral-600 hover:text-red-400 transition"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Volume2 size={12} className="text-neutral-500 shrink-0" />
                                    <input
                                        type="range" min={0} max={200}
                                        aria-label={`Volume de la piste ${track.name}`}
                                        value={track.volume}
                                        onChange={(e) => updateAudioTrack(track.id, { volume: parseInt(e.target.value) })}
                                        className="flex-1 h-1 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
                                    />
                                    <span className="text-[9px] font-mono text-neutral-400 tabular-nums w-8 text-right">{track.volume}%</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AudioPanel;
