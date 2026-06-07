import React, { useMemo, useState } from 'react';
import {
    PROFESSIONAL_AUDIO_CODECS,
    PROFESSIONAL_FRAME_RATE_OPTIONS,
    PROFESSIONAL_QUALITY_PRESETS,
    PROFESSIONAL_RATE_CONTROL_MODES,
    PROFESSIONAL_VIDEO_CODECS,
    PROFESSIONAL_VIDEO_FORMATS,
    SOCIAL_EXPORT_PRESETS,
} from '../presets/exportPresets';
import {
    applyProfessionalPreset,
    estimateProfessionalExportSize,
    sanitizeExportFileName,
    updateProfessionalFormat,
    validateProfessionalExportSettings,
} from '../lib/exportSettings';

const TABS = ['Video', 'Audio', 'File', 'Advanced'];

export default function ExportSettingsPanel({
    value,
    durationSeconds = 0,
    onChange,
    onAddToQueue,
    queue = [],
}) {
    const [activeTab, setActiveTab] = useState('Video');
    const validation = useMemo(() => validateProfessionalExportSettings(value, { durationSeconds }), [durationSeconds, value]);
    const size = useMemo(() => estimateProfessionalExportSize(value, durationSeconds), [durationSeconds, value]);

    const patch = (section, updates) => {
        onChange?.({
            ...value,
            [section]: {
                ...value?.[section],
                ...updates,
            },
        });
    };

    return (
        <section className="rounded-sm border border-neutral-800 bg-neutral-950/80 p-3 space-y-3" data-testid="professional-export-settings">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[9px] font-mono uppercase tracking-widest text-cyan-300">Export Settings</p>
                    <p className="mt-1 text-[9px] font-mono leading-relaxed text-neutral-500">Preset social, codec, fichier et queue de rendu.</p>
                </div>
                <span className={`rounded-sm px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest ${validation.status === 'blocked' ? 'bg-red-500/10 text-red-300' : validation.status === 'warning' ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
                    {validation.status}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
                {SOCIAL_EXPORT_PRESETS.map((preset) => (
                    <button
                        key={preset.id}
                        type="button"
                        onClick={() => onChange?.(applyProfessionalPreset(value, preset.id))}
                        className={`rounded-sm border px-2 py-2 text-left transition ${value?.presetId === preset.id ? 'border-cyan-400/45 bg-cyan-500/10 text-cyan-100' : 'border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600'}`}
                    >
                        <span className="block text-[9px] font-mono uppercase tracking-widest">{preset.platform}</span>
                        <span className="block text-[10px] font-mono text-neutral-200">{preset.label}</span>
                        <span className="block text-[8px] font-mono text-neutral-600">{preset.width}x{preset.height}</span>
                    </button>
                ))}
            </div>

            <div className="flex gap-1 rounded-sm border border-neutral-800 bg-black p-1">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`min-h-8 flex-1 rounded-sm px-2 text-[9px] font-mono uppercase tracking-widest transition ${activeTab === tab ? 'bg-cyan-500/12 text-cyan-100' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === 'Video' && (
                <div className="grid gap-2">
                    <ToggleRow label="Export Video" checked={value?.video?.exportVideo !== false} onChange={(checked) => patch('video', { exportVideo: checked })} />
                    <ControlSelect label="Format" value={value?.video?.format} onChange={(format) => onChange?.(updateProfessionalFormat(value, format))} options={PROFESSIONAL_VIDEO_FORMATS.map((format) => ({ value: format.id, label: `${format.label} / ${format.status}` }))} />
                    <ControlSelect label="Codec" value={value?.video?.codec} onChange={(codec) => patch('video', { codec })} options={PROFESSIONAL_VIDEO_CODECS.map((codec) => ({ value: codec.id, label: `${codec.label} / ${codec.status}` }))} />
                    <ControlSelect label="Frame rate" value={value?.video?.frameRate} onChange={(frameRate) => patch('video', { frameRate: frameRate === 'timeline' ? 'timeline' : Number(frameRate) })} options={PROFESSIONAL_FRAME_RATE_OPTIONS.map((fps) => ({ value: fps, label: fps === 'timeline' ? 'Timeline' : `${fps} FPS` }))} />
                    <div className="grid grid-cols-2 gap-2">
                        <ControlInput label="Width" type="number" value={value?.video?.width} onChange={(width) => patch('video', { width: Number(width) })} />
                        <ControlInput label="Height" type="number" value={value?.video?.height} onChange={(height) => patch('video', { height: Number(height) })} />
                    </div>
                    <ControlSelect label="Quality preset" value={value?.video?.qualityPreset} onChange={(qualityPreset) => patch('video', { qualityPreset })} options={PROFESSIONAL_QUALITY_PRESETS.map((item) => ({ value: item, label: item }))} />
                    <ControlSelect label="Rate control" value={value?.video?.rateControl} onChange={(rateControl) => patch('video', { rateControl })} options={PROFESSIONAL_RATE_CONTROL_MODES.map((item) => ({ value: item, label: item }))} />
                    <ControlInput label="Bitrate Mbps" type="number" value={value?.video?.bitrateMbps} onChange={(bitrateMbps) => patch('video', { bitrateMbps: Number(bitrateMbps) })} />
                    <ToggleRow label="Network optimization" checked={value?.video?.networkOptimization === true} onChange={(checked) => patch('video', { networkOptimization: checked })} />
                    <ToggleRow label="Frame reordering" checked={value?.video?.frameReordering !== false} onChange={(checked) => patch('video', { frameReordering: checked })} />
                </div>
            )}

            {activeTab === 'Audio' && (
                <div className="grid gap-2">
                    <ToggleRow label="Export Audio" checked={value?.audio?.exportAudio === true} onChange={(checked) => patch('audio', { exportAudio: checked, codec: checked ? value?.audio?.codec || 'aac' : 'none' })} />
                    <ControlSelect label="Codec" value={value?.audio?.codec} onChange={(codec) => patch('audio', { codec })} options={PROFESSIONAL_AUDIO_CODECS.map((codec) => ({ value: codec.id, label: `${codec.label} / ${codec.status}` }))} />
                    <ControlSelect label="Sample rate" value={value?.audio?.sampleRate} onChange={(sampleRate) => patch('audio', { sampleRate: Number(sampleRate) })} options={[44100, 48000].map((rate) => ({ value: rate, label: `${rate / 1000} kHz` }))} />
                    <ControlSelect label="Bitrate" value={value?.audio?.bitrateKbps} onChange={(bitrateKbps) => patch('audio', { bitrateKbps: Number(bitrateKbps) })} options={[192, 256, 320].map((rate) => ({ value: rate, label: `${rate} kbps` }))} />
                    <ControlSelect label="Channels" value={value?.audio?.channels} onChange={(channels) => patch('audio', { channels })} options={[{ value: 'stereo', label: 'Stereo' }]} />
                </div>
            )}

            {activeTab === 'File' && (
                <div className="grid gap-2">
                    <ControlInput label="File name" value={value?.file?.fileName} onChange={(fileName) => patch('file', { fileName: sanitizeExportFileName(fileName) })} />
                    <ControlSelect label="Destination" value={value?.file?.destination} onChange={(destination) => patch('file', { destination })} options={[{ value: 'downloads', label: 'Downloads' }, { value: 'folder', label: 'Dossier PC' }, { value: 'firebase-storage', label: 'Firebase Storage' }]} />
                    <ControlSelect label="Render mode" value={value?.file?.renderMode} onChange={(renderMode) => patch('file', { renderMode })} options={[{ value: 'singleClip', label: 'Single clip' }, { value: 'individualClips', label: 'Individual clips' }]} />
                    <div className="rounded-sm border border-neutral-800 bg-black p-2 text-[9px] font-mono">
                        <div className="flex justify-between"><span className="text-neutral-500">Estimated file size</span><span className="text-neutral-200">{size.label}</span></div>
                        <div className="flex justify-between"><span className="text-neutral-500">Queue</span><span className="text-neutral-200">{queue.length}</span></div>
                    </div>
                </div>
            )}

            {activeTab === 'Advanced' && (
                <div className="grid gap-2">
                    <ControlInput label="Key frames" value={value?.video?.keyframes} onChange={(keyframes) => patch('video', { keyframes })} />
                    <ControlSelect label="Pixel aspect ratio" value={value?.video?.pixelAspectRatio} onChange={(pixelAspectRatio) => patch('video', { pixelAspectRatio })} options={[{ value: 'square', label: 'Square pixels' }]} />
                    <ControlSelect label="Encoding profile" value={value?.video?.encodingProfile} onChange={(encodingProfile) => patch('video', { encodingProfile })} options={[{ value: 'main', label: 'Main' }, { value: 'high', label: 'High' }]} />
                    <ToggleRow label="Transparent image background" checked={value?.image?.transparentBackground === true} onChange={(checked) => patch('image', { transparentBackground: checked })} />
                    <ControlSelect label="Image quality" value={value?.image?.quality} onChange={(quality) => patch('image', { quality: Number(quality) })} options={[0.72, 0.82, 0.92, 1].map((quality) => ({ value: quality, label: `${Math.round(quality * 100)}%` }))} />
                </div>
            )}

            {(validation.errors.length > 0 || validation.blockers.length > 0 || validation.warnings.length > 0) && (
                <div className="rounded-sm border border-neutral-800 bg-black p-2 text-[9px] font-mono leading-relaxed">
                    {[...validation.errors, ...validation.blockers, ...validation.warnings].slice(0, 4).map((message) => (
                        <p key={message} className={validation.status === 'blocked' ? 'text-red-300' : 'text-amber-300'}>{message}</p>
                    ))}
                </div>
            )}

            <button
                type="button"
                onClick={() => onAddToQueue?.({ settings: value, validation, size })}
                disabled={validation.status === 'blocked'}
                className="w-full rounded-sm border border-cyan-400/45 bg-cyan-500/12 px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-45"
            >
                Add to Render Queue
            </button>
        </section>
    );
}

function ControlSelect({ label, value, onChange, options }) {
    return (
        <label className="grid gap-1">
            <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">{label}</span>
            <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-sm border border-neutral-800 bg-black px-2 py-2 text-[10px] font-mono uppercase tracking-widest text-neutral-200 outline-none transition hover:border-neutral-600 focus:border-cyan-400">
                {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
        </label>
    );
}

function ControlInput({ label, value, onChange, type = 'text' }) {
    return (
        <label className="grid gap-1">
            <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">{label}</span>
            <input value={value ?? ''} type={type} onChange={(event) => onChange(event.target.value)} className="w-full rounded-sm border border-neutral-800 bg-black px-2 py-2 text-[10px] font-mono text-neutral-200 outline-none transition hover:border-neutral-600 focus:border-cyan-400" />
        </label>
    );
}

function ToggleRow({ label, checked, onChange }) {
    return (
        <label className="flex min-h-9 items-center justify-between gap-3 rounded-sm border border-neutral-800 bg-black px-2">
            <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-400">{label}</span>
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-cyan-400" />
        </label>
    );
}
