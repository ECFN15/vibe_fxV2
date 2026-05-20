import React, { useState } from 'react';
import { X, Download, Monitor, Smartphone } from 'lucide-react';
import useVideoStore from '../store/videoStore';
import { EXPORT_PRESETS, PlaybackEngine } from '../engine/VideoEngine';
import { drawTextOverlays } from '../preview/VideoPreview';

const ExportVideoPanel = () => {
    const [exportMessage, setExportMessage] = useState('');
    const {
        sequencePreset, setSequencePreset,
        exportFormat, setExportFormat,
        isExporting, exportProgress,
        setActivePanel, totalDuration, clips, transitions, transitionItems,
        audioTracks, textOverlays, setIsExporting, setExportProgress,
        projectName
    } = useVideoStore();

    const preset = EXPORT_PRESETS[sequencePreset] || EXPORT_PRESETS.youtube;
    const hasClips = clips.length > 0;

    const handleExport = async () => {
        const exportCanvas = document.createElement('canvas');
        if (!exportCanvas.captureStream || typeof MediaRecorder === 'undefined') {
            setExportMessage('Export navigateur indisponible sur cette session.');
            return;
        }

        const mimeCandidates = exportFormat === 'webm'
            ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
            : ['video/mp4;codecs=h264,aac', 'video/mp4;codecs=h264', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
        const mimeType = mimeCandidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
        if (!mimeType) {
            setExportMessage('Aucun codec MediaRecorder compatible trouve.');
            return;
        }

        const fps = preset?.fps || 30;
        exportCanvas.width = preset?.width || 1920;
        exportCanvas.height = preset?.height || 1080;
        exportCanvas.style.width = `${exportCanvas.width}px`;
        exportCanvas.style.height = `${exportCanvas.height}px`;
        exportCanvas.style.position = 'fixed';
        exportCanvas.style.left = '-100000px';
        exportCanvas.style.top = '0';
        exportCanvas.style.pointerEvents = 'none';
        document.body.appendChild(exportCanvas);

        const exportEngine = new PlaybackEngine(exportCanvas);
        const chunks = [];
        const stream = exportCanvas.captureStream(fps);
        let disconnectAudio = null;
        let recordStream = stream;
        let progressTimer = null;
        let renderTimer = null;

        try {
            await exportEngine.loadAllClips(clips);
            await exportEngine.loadAllAudioTracks(audioTracks);

            const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
            if (AudioContextCtor && exportEngine.connectAudioToDestination) {
                const audioContext = exportEngine.getOrCreateAudioContext(AudioContextCtor);
                await audioContext.resume();
                const destination = audioContext.createMediaStreamDestination();
                disconnectAudio = exportEngine.connectAudioToDestination(audioContext, destination);
                recordStream = new MediaStream([
                    ...stream.getVideoTracks(),
                    ...destination.stream.getAudioTracks(),
                ]);
            }
        } catch (error) {
            console.warn('Audio export mix unavailable:', error);
            setExportMessage('Export video sans piste audio mixee: le navigateur a refuse le mix audio.');
        }

        const recorder = new MediaRecorder(recordStream, {
            mimeType,
            videoBitsPerSecond: 8_000_000,
            audioBitsPerSecond: 192_000,
        });
        const startedAt = performance.now();
        const durationMs = Math.max(1000, totalDuration * 1000 + 500);
        let renderTime = 0;

        setExportMessage(mimeType.includes('mp4') ? 'Export MP4 en cours.' : 'Export WebM en cours; le MP4 natif depend du navigateur.');
        setExportProgress(0);
        setIsExporting(true);

        const cleanup = () => {
            window.clearInterval(progressTimer);
            window.clearInterval(renderTimer);
            recordStream.getTracks().forEach((track) => track.stop());
            stream.getTracks().forEach((track) => track.stop());
            disconnectAudio?.();
            exportEngine.dispose();
            exportCanvas.remove();
        };

        const stopRecording = () => {
            if (recorder.state === 'inactive') return;
            exportEngine.stopPlayback();
            recorder.stop();
        };

        const renderExportFrame = () => {
            exportEngine.renderFrame(clips, transitions, renderTime, transitionItems);
            drawTextOverlays(exportCanvas, textOverlays, renderTime, null);
            exportEngine.syncClipAudio(clips, transitions, renderTime, 1);
            exportEngine.syncExternalAudio(audioTracks, renderTime, 1);
            renderTime += 1 / fps;
            if (renderTime >= totalDuration) stopRecording();
        };

        recorder.ondataavailable = (event) => {
            if (event.data?.size) chunks.push(event.data);
        };

        recorder.onstop = () => {
            cleanup();
            setIsExporting(false);
            setExportProgress(100);

            const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
            const blob = new Blob(chunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${(projectName || 'vibecut').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}-${Date.now()}.${extension}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            setExportMessage(`Export termine (${extension.toUpperCase()}, ${(blob.size / 1024 / 1024).toFixed(1)} Mo).`);
        };

        progressTimer = window.setInterval(() => {
            const elapsed = performance.now() - startedAt;
            setExportProgress(Math.min(99, Math.round((elapsed / durationMs) * 100)));
        }, 200);

        recorder.start();
        renderExportFrame();
        renderTimer = window.setInterval(renderExportFrame, 1000 / fps);
        window.setTimeout(stopRecording, durationMs);
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
                    <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Format de sequence</span>
                    <div className="grid grid-cols-2 gap-1.5">
                        {Object.entries(EXPORT_PRESETS).map(([key, p]) => (
                            <button
                                key={key}
                                onClick={() => setSequencePreset(key)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-sm border transition-all text-left
                                    ${sequencePreset === key
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
                                ['Sequence', `${preset.name} ${preset.label}`],
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

                {exportMessage && (
                    <p className="text-[9px] font-mono text-neutral-500 leading-relaxed">
                        {exportMessage}
                    </p>
                )}
            </div>
        </div>
    );
};

export default ExportVideoPanel;
