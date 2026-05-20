import React from 'react';
import { X, Upload, Trash2, Volume2, Library, ShieldCheck } from 'lucide-react';
import useVideoStore from '../store/videoStore';
import { RIGHTS_STATUS_LABELS, getTrackRightsIssues } from '../data/musicRights';
import { isTrackLocked } from '../model/timelineModel';

const AudioPanel = () => {
    const {
        audioTracks, removeAudioTrack, updateAudioTrack,
        clips, selectedClipId, updateClip, setActivePanel, tracks
    } = useVideoStore();

    const selectedClip = clips.find(c => c.id === selectedClipId) || clips[0];
    const videoLocked = isTrackLocked(tracks, 'video-main');
    const musicLocked = isTrackLocked(tracks, 'music-main');

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
                                type="range" min={0} max={100}
                                aria-label={`Volume du clip ${selectedClip.name}`}
                                value={selectedClip.volume}
                                disabled={videoLocked}
                                onChange={(e) => updateClip(selectedClip.id, { volume: parseInt(e.target.value) })}
                                className="flex-1 h-1 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-indigo-500 disabled:cursor-not-allowed disabled:opacity-45"
                            />
                            <span className="text-[10px] font-mono text-neutral-400 tabular-nums w-8 text-right">{selectedClip.volume}%</span>
                        </div>
                    </div>
                )}

                {/* Music library button */}
                <button
                    onClick={() => setActivePanel('music')}
                    disabled={musicLocked}
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
                            onClick={() => setActivePanel('music')}
                            disabled={musicLocked}
                            className="text-indigo-400 hover:text-indigo-300 transition"
                            aria-label="Importer une piste audio avec declaration de droits"
                        >
                            <Upload size={14} />
                        </button>
                    </div>

                    {audioTracks.length === 0 ? (
                        <p className="text-[9px] font-mono text-neutral-700 py-2">Aucune piste audio. Utilisez la bibliotheque pour importer avec les droits.</p>
                    ) : (
                        audioTracks.map(track => {
                            const audit = getTrackRightsIssues(track);
                            return (
                                <div key={track.id} className="border border-neutral-800 rounded-sm p-3 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="min-w-0 truncate text-[10px] font-mono text-neutral-300">{track.name}</span>
                                        <button
                                            onClick={() => removeAudioTrack(track.id)}
                                            disabled={musicLocked}
                                            className="text-neutral-600 hover:text-red-400 transition disabled:opacity-40 disabled:hover:text-neutral-600"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Volume2 size={12} className="text-neutral-500 shrink-0" />
                                        <input
                                            type="range" min={0} max={100}
                                            aria-label={`Volume de la piste ${track.name}`}
                                            value={track.volume}
                                            disabled={musicLocked}
                                            onChange={(e) => updateAudioTrack(track.id, { volume: parseInt(e.target.value) })}
                                            className="flex-1 h-2 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-emerald-500 disabled:cursor-not-allowed disabled:opacity-45"
                                        />
                                        <span className="text-[9px] font-mono text-neutral-400 tabular-nums w-8 text-right">{track.volume}%</span>
                                    </div>
                                    <div className={`inline-flex max-w-full items-center gap-1 rounded-sm px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest ${
                                        audit.issues.length > 0 ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300'
                                    }`}>
                                        <ShieldCheck size={9} />
                                        {audit.issues.length > 0 ? 'Droits incomplets' : RIGHTS_STATUS_LABELS[track.rightsStatus] || 'Droits OK'}
                                    </div>
                                    {track.attribution && (
                                        <p className="text-[8px] font-mono leading-relaxed text-neutral-500">Credit: {track.attribution}</p>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default AudioPanel;
