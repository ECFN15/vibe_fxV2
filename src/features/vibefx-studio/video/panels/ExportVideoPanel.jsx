import React from 'react';
import { X, Download, Monitor, Smartphone } from 'lucide-react';
import useVideoStore from '../store/videoStore';
import { EXPORT_PRESETS } from '../engine/VideoEngine';

const ExportVideoPanel = () => {
    const {
        exportPreset, setExportPreset,
        exportFormat, setExportFormat,
        isExporting, exportProgress,
        setActivePanel, totalDuration, clips
    } = useVideoStore();

    const preset = EXPORT_PRESETS[exportPreset];
    const hasClips = clips.length > 0;

    const handleExport = () => {
        alert('Export video en cours de developpement. Le pipeline WebCodecs sera integre prochainement.');
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                <h3 className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Exporter</h3>
                <button onClick={() => setActivePanel(null)} className="text-neutral-500 hover:text-white transition">
                    <X size={14} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
                <div className="space-y-2">
                    <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Plateforme</span>
                    <div className="grid grid-cols-2 gap-1.5">
                        {Object.entries(EXPORT_PRESETS).map(([key, p]) => (
                            <button
                                key={key}
                                onClick={() => setExportPreset(key)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-sm border transition-all text-left
                                    ${exportPreset === key
                                        ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-400'
                                        : 'bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:border-neutral-600'
                                    }`}
                            >
                                {p.height > p.width ? <Smartphone size={12} /> : <Monitor size={12} />}
                                <div>
                                    <div className="text-[10px] font-mono font-medium">{p.name}</div>
                                    <div className="text-[8px] font-mono text-neutral-500">{p.width}x{p.height}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Format</span>
                    <div className="flex gap-1.5">
                        {['mp4', 'webm'].map(fmt => (
                            <button
                                key={fmt}
                                onClick={() => setExportFormat(fmt)}
                                className={`flex-1 py-1.5 text-[10px] font-mono uppercase tracking-widest rounded-sm border transition-all
                                    ${exportFormat === fmt
                                        ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-400'
                                        : 'bg-neutral-900/50 border-neutral-800 text-neutral-500 hover:border-neutral-600'
                                    }`}
                            >
                                {fmt}
                            </button>
                        ))}
                    </div>
                </div>

                {preset && (
                    <div className="border border-neutral-800 rounded-sm p-3 space-y-1.5">
                        <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Resume</span>
                        <div className="space-y-1">
                            {[
                                ['Resolution', `${preset.width} x ${preset.height}`],
                                ['FPS', `${preset.fps}`],
                                ['Duree', `${totalDuration.toFixed(1)}s`],
                                ['Format', exportFormat.toUpperCase()],
                            ].map(([label, value]) => (
                                <div key={label} className="flex justify-between text-[9px] font-mono">
                                    <span className="text-neutral-500">{label}</span>
                                    <span className="text-neutral-300">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={handleExport}
                    disabled={!hasClips || isExporting}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 text-xs font-mono font-medium hover:bg-indigo-500 transition shadow-[0_0_20px_rgba(79,70,229,0.4)] disabled:opacity-50 disabled:shadow-none uppercase tracking-wider"
                >
                    <Download size={14} />
                    {isExporting ? `Export... ${exportProgress}%` : 'Exporter'}
                </button>

                {isExporting && (
                    <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${exportProgress}%` }} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExportVideoPanel;
