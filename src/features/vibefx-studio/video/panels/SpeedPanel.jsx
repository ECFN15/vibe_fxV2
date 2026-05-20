import React from 'react';
import { X, Gauge } from 'lucide-react';
import useVideoStore from '../store/videoStore';
import { isTrackLocked } from '../model/timelineModel';

const SPEED_PRESETS = [
    { value: 0.25, label: '0.25x', desc: 'Super Slow' },
    { value: 0.5, label: '0.5x', desc: 'Slow Mo' },
    { value: 0.75, label: '0.75x', desc: 'Slow' },
    { value: 1, label: '1x', desc: 'Normal' },
    { value: 1.5, label: '1.5x', desc: 'Fast' },
    { value: 2, label: '2x', desc: 'Faster' },
    { value: 3, label: '3x', desc: 'Rush' },
    { value: 5, label: '5x', desc: 'Timelapse' },
];

const SpeedPanel = () => {
    const { selectedClipId, clips, updateClip, setActivePanel, tracks } = useVideoStore();

    const clip = clips.find(c => c.id === selectedClipId);
    const currentSpeed = clip?.speed || 1;
    const videoLocked = isTrackLocked(tracks, 'video-main');

    const handleSpeedChange = (speed) => {
        if (videoLocked) return;
        if (!selectedClipId) return;
        updateClip(selectedClipId, { speed });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                <h3 className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Vitesse</h3>
                <button onClick={() => setActivePanel(null)} className="text-neutral-500 hover:text-white transition">
                    <X size={14} />
                </button>
            </div>

            {!selectedClipId ? (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Selectionnez un clip</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                    <div className="flex items-center justify-center gap-3 py-4">
                        <Gauge size={20} className="text-indigo-400" />
                        <span className="text-3xl font-mono font-bold text-white tabular-nums">{currentSpeed}x</span>
                    </div>

                    <div className="space-y-2">
                        <input
                            type="range" min={0.1} max={5} step={0.05}
                            aria-label="Vitesse du clip"
                            value={currentSpeed}
                            disabled={videoLocked}
                            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-indigo-500 disabled:cursor-not-allowed disabled:opacity-45"
                        />
                        <div className="flex justify-between text-[8px] font-mono text-neutral-600">
                            <span>0.1x</span><span>1x</span><span>5x</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 pt-2">
                        {SPEED_PRESETS.map(preset => (
                            <button
                                key={preset.value}
                                onClick={() => handleSpeedChange(preset.value)}
                                disabled={videoLocked}
                                className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-sm border transition-all
                                    ${currentSpeed === preset.value
                                        ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-400'
                                        : 'bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white'
                                    }`}
                            >
                                <span className="text-[11px] font-mono font-bold">{preset.label}</span>
                                <span className="text-[7px] font-mono text-neutral-500 uppercase">{preset.desc}</span>
                            </button>
                        ))}
                    </div>

                    {clip && (
                        <div className="border-t border-neutral-800 pt-3 mt-3 space-y-1">
                            <div className="flex justify-between text-[9px] font-mono">
                                <span className="text-neutral-500">Original</span>
                                <span className="text-neutral-400">{(clip.trimEnd - clip.trimStart).toFixed(1)}s</span>
                            </div>
                            <div className="flex justify-between text-[9px] font-mono">
                                <span className="text-neutral-500">Resultat</span>
                                <span className="text-indigo-400">{((clip.trimEnd - clip.trimStart) / currentSpeed).toFixed(1)}s</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SpeedPanel;
