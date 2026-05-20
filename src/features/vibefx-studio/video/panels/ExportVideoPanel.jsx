import React, { useEffect, useMemo, useState } from 'react';
import { X, Download, Monitor, Smartphone, ShieldCheck, AlertTriangle } from 'lucide-react';
import useVideoStore from '../store/videoStore';
import { EXPORT_PRESETS, PlaybackEngine } from '../engine/VideoEngine';
import { drawTextOverlays } from '../preview/VideoPreview';
import { RIGHTS_STATUS_LABELS, buildExportRightsManifest, getRightsAudit } from '../data/musicRights';
import { buildExportFrameSchedule, resolveTimelineRenderPlan, validateExportTimeline, validateTimelineRenderPlan } from '../model/timelineModel';

const ExportVideoPanel = () => {
    const [exportMessage, setExportMessage] = useState('');
    const [mimeSupport, setMimeSupport] = useState({ webm: false, mp4: false });
    const {
        sequencePreset, setSequencePreset,
        exportFormat, setExportFormat,
        isExporting, exportProgress,
        setActivePanel, totalDuration, clips, transitions, transitionItems,
        audioTracks, textOverlays, setIsExporting, setExportProgress,
        projectName, tracks
    } = useVideoStore();

    const preset = EXPORT_PRESETS[sequencePreset] || EXPORT_PRESETS.youtube;
    const exportPlan = useMemo(() => resolveTimelineRenderPlan({
        clips,
        transitions,
        transitionItems,
        textOverlays,
        audioTracks,
        tracks,
        totalDuration,
    }), [audioTracks, clips, textOverlays, totalDuration, tracks, transitions, transitionItems]);
    const hasClips = exportPlan.clips.length > 0;
    const exportClips = exportPlan.clips;
    const exportAllTransitions = exportPlan.allTransitions;
    const exportTextOverlays = exportPlan.textOverlays;
    const exportAudioTracks = exportPlan.audioTracks;
    const exportPlaybackClips = exportPlan.playbackClips;
    const rightsAudit = useMemo(() => getRightsAudit(exportAudioTracks), [exportAudioTracks]);
    const rightsBlockers = useMemo(() => (
        rightsAudit.flatMap(({ track, issues }) => issues.map(issue => ({ track, issue })))
    ), [rightsAudit]);
    const rightsManifest = useMemo(() => buildExportRightsManifest(exportAudioTracks), [exportAudioTracks]);
    const effectiveExportFormat = exportFormat === 'mp4' && !mimeSupport.mp4 ? 'webm' : exportFormat;
    const formatFallbackActive = exportFormat !== effectiveExportFormat;

    useEffect(() => {
        if (typeof MediaRecorder === 'undefined') return;
        setMimeSupport({
            webm: [
                'video/webm;codecs=vp9,opus',
                'video/webm;codecs=vp8,opus',
                'video/webm',
            ].some((candidate) => MediaRecorder.isTypeSupported(candidate)),
            mp4: [
                'video/mp4;codecs=h264,aac',
                'video/mp4;codecs=h264',
                'video/mp4',
            ].some((candidate) => MediaRecorder.isTypeSupported(candidate)),
        });
    }, []);

    const handleExport = async () => {
        if (rightsBlockers.length > 0) {
            setExportMessage('Export bloque: completez le manifeste de droits musique avant publication/export.');
            return;
        }

        if (typeof MediaRecorder === 'undefined') {
            setExportMessage('Export navigateur indisponible sur cette session.');
            return;
        }

        const requestedFormat = effectiveExportFormat;
        if (formatFallbackActive) {
            setExportFormat('webm');
        }

        const mimeCandidates = requestedFormat === 'webm'
            ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
            : ['video/mp4;codecs=h264,aac', 'video/mp4;codecs=h264', 'video/mp4'];
        const mimeType = mimeCandidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));

        const fps = Number(preset?.fps || 30);
        const frameSchedule = buildExportFrameSchedule({ totalDuration, fps });
        const timelineAudit = validateExportTimeline({ clips: exportClips, audioTracks: exportAudioTracks, transitionItems: exportAllTransitions, totalDuration, fps, mimeType });
        const renderPlanAudit = validateTimelineRenderPlan({ plan: exportPlan, totalDuration, frameDuration: frameSchedule.frameDuration || (1 / fps) });
        const auditErrors = [...timelineAudit.errors, ...renderPlanAudit.errors];
        const auditWarnings = [...timelineAudit.warnings, ...renderPlanAudit.warnings];
        if (auditErrors.length > 0) {
            setExportMessage(`Export bloque: ${auditErrors.join(' ')}`);
            return;
        }
        const warningNote = auditWarnings.length > 0 ? ` Checks: ${auditWarnings.join(' ')}` : '';
        if (auditWarnings.length > 0) setExportMessage(`Export prepare avec corrections.${warningNote}`);

        const exportCanvas = document.createElement('canvas');
        if (!exportCanvas.captureStream) {
            setExportMessage('Export canvas indisponible sur cette session.');
            return;
        }

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
        let renderStopped = false;
        let exportFailureMessage = '';

        const cleanupBeforeRecord = () => {
            recordStream.getTracks().forEach((track) => track.stop());
            stream.getTracks().forEach((track) => track.stop());
            disconnectAudio?.();
            exportEngine.dispose();
            exportCanvas.remove();
        };

        const clipLoadResults = await exportEngine.loadAllClips(exportClips);
        const audioLoadResults = await exportEngine.loadAllAudioTracks(exportAudioTracks);
        const mediaLoadErrors = [
            ...getRejectedMediaMessages(clipLoadResults, 'Clip video illisible'),
            ...getRejectedMediaMessages(audioLoadResults, 'Piste audio illisible'),
        ];

        if (mediaLoadErrors.length > 0) {
            cleanupBeforeRecord();
            setExportMessage(`Export bloque: ${mediaLoadErrors.join(' ')}`);
            return;
        }

        try {
            const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
            if (exportAudioTracks.length > 0) {
                if (!AudioContextCtor || !exportEngine.connectAudioToDestination) {
                    throw new Error('mix audio navigateur indisponible');
                }
                try {
                    const audioContext = exportEngine.getOrCreateAudioContext(AudioContextCtor);
                    await audioContext.resume();
                    const destination = audioContext.createMediaStreamDestination();
                    disconnectAudio = exportEngine.connectAudioToDestination(audioContext, destination);
                    recordStream = new MediaStream([
                        ...stream.getVideoTracks(),
                        ...destination.stream.getAudioTracks(),
                    ]);
                    if (destination.stream.getAudioTracks().length === 0) {
                        throw new Error('aucune piste audio en sortie');
                    }
                } catch (error) {
                    disconnectAudio?.();
                    throw error;
                }
            }
        } catch (error) {
            console.warn('Audio export mix unavailable:', error);
            cleanupBeforeRecord();
            setExportMessage(`Export bloque: impossible de mixer l'audio (${error.message}).`);
            return;
        }

        let recorder;
        try {
            recorder = new MediaRecorder(recordStream, {
                mimeType,
                videoBitsPerSecond: 8_000_000,
                audioBitsPerSecond: 192_000,
            });
        } catch (error) {
            recordStream.getTracks().forEach((track) => track.stop());
            stream.getTracks().forEach((track) => track.stop());
            disconnectAudio?.();
            exportEngine.dispose();
            exportCanvas.remove();
            setExportMessage(`Export impossible: ${error.message}`);
            return;
        }

        const startedAt = performance.now();
        const durationMs = Math.max(1000, frameSchedule.expectedDuration * 1000 + 500);
        let renderTime = 0;
        let frameIndex = 0;
        const frameDuration = frameSchedule.frameDuration;

        setExportMessage(`${mimeType.includes('mp4') ? 'Export MP4 en cours.' : 'Export WebM en cours. MP4 natif indisponible dans ce navigateur.'}${warningNote}`);
        setExportProgress(0);
        setIsExporting(true);

        const cleanup = () => {
            window.clearInterval(progressTimer);
            renderStopped = true;
            recordStream.getTracks().forEach((track) => track.stop());
            stream.getTracks().forEach((track) => track.stop());
            disconnectAudio?.();
            exportEngine.dispose();
            exportCanvas.remove();
        };

        const stopRecording = () => {
            if (recorder.state === 'inactive') return;
            renderStopped = true;
            exportEngine.stopPlayback();
            recorder.stop();
        };

        const failExport = (message) => {
            exportFailureMessage = message;
            setExportMessage(message);
            stopRecording();
        };

        const renderExportFrame = async () => {
            const frameResult = await exportEngine.seekAndDraw(exportClips, transitions, renderTime, exportAllTransitions);
            const frameShouldContainVideo = exportClips.length > 0 && renderTime < totalDuration - (frameDuration / 2);
            if (frameShouldContainVideo && !frameResult?.rendered) {
                throw new Error(`frame video non rendue a ${renderTime.toFixed(2)}s (${frameResult?.reason || 'aucun clip actif'})`);
            }
            drawTextOverlays(exportCanvas, exportTextOverlays, renderTime, null);
            exportEngine.syncClipAudio(exportPlaybackClips, transitions, renderTime, 1);
            exportEngine.syncExternalAudio(exportAudioTracks, renderTime, 1);
            stream.getVideoTracks().forEach((track) => track.requestFrame?.());
            frameIndex += 1;
            renderTime = Math.min(totalDuration, frameIndex * frameDuration);
            setExportProgress(Math.min(99, Math.round((frameIndex / frameSchedule.totalFrames) * 100)));
            if (frameIndex >= frameSchedule.totalFrames) stopRecording();
        };

        recorder.ondataavailable = (event) => {
            if (event.data?.size) chunks.push(event.data);
        };

        recorder.onerror = (event) => {
            failExport(`Export interrompu: ${event.error?.message || 'erreur MediaRecorder'}`);
        };

        recorder.onstop = () => {
            cleanup();
            setIsExporting(false);
            if (exportFailureMessage) {
                setExportMessage(exportFailureMessage);
                return;
            }
            setExportProgress(100);

            const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
            const blob = new Blob(chunks, { type: mimeType });
            if (blob.size === 0) {
                setExportMessage('Export echoue: fichier vide, aucune frame enregistree.');
                return;
            }
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${(projectName || 'vibecut').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}-${Date.now()}.${extension}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            const manifestNote = rightsManifest.length > 0 ? ` Manifeste droits pret: ${rightsManifest.length} piste(s).` : '';
            setExportMessage(`Export termine (${extension.toUpperCase()}, ${(blob.size / 1024 / 1024).toFixed(1)} Mo).${manifestNote}`);
        };

        progressTimer = window.setInterval(() => {
            const elapsed = performance.now() - startedAt;
            const timeProgress = totalDuration > 0 ? (renderTime / totalDuration) * 100 : 0;
            setExportProgress(Math.min(99, Math.max(Math.round((elapsed / durationMs) * 100), Math.round(timeProgress))));
        }, 200);

        recorder.start();
        const renderLoop = async () => {
            if (renderStopped || recorder.state === 'inactive') return;
            const frameStartedAt = performance.now();
            try {
                await renderExportFrame();
            } catch (error) {
                failExport(`Export interrompu: ${error.message}`);
                return;
            }
            const elapsed = performance.now() - frameStartedAt;
            window.setTimeout(renderLoop, Math.max(0, (1000 / fps) - elapsed));
        };
        renderLoop();
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
                                type="button"
                                onClick={() => setExportFormat(fmt)}
                                disabled={fmt === 'mp4' && !mimeSupport.mp4}
                                className={`flex-1 py-1.5 text-[10px] font-mono uppercase tracking-widest rounded-sm border transition-all
                                    ${effectiveExportFormat === fmt
                                        ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-400'
                                        : 'bg-neutral-900/50 border-neutral-800 text-neutral-500 hover:border-neutral-600'
                                    }`}
                            >
                                {fmt}{fmt === 'mp4' && !mimeSupport.mp4 ? ' indispo' : ''}
                            </button>
                        ))}
                    </div>
                    {!mimeSupport.mp4 && (
                        <p className="text-[9px] font-mono text-amber-300/80 leading-relaxed">
                            MP4 MediaRecorder n'est pas supporte ici: export WebM utilise pour eviter un faux MP4.
                        </p>
                    )}
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
                                ['Format demande', exportFormat.toUpperCase()],
                                ['Format reel', effectiveExportFormat.toUpperCase()],
                            ].map(([label, value]) => (
                                <div key={label} className="flex justify-between text-[9px] font-mono">
                                    <span className="text-neutral-500">{label}</span>
                                    <span
                                        className="text-neutral-300"
                                        data-testid={label === 'Format reel' ? 'export-effective-format' : undefined}
                                    >
                                        {value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {exportAudioTracks.length > 0 && (
                    <div className={`rounded-sm border p-3 space-y-2 ${
                        rightsBlockers.length > 0
                            ? 'border-red-500/25 bg-red-500/5'
                            : 'border-emerald-500/20 bg-emerald-500/5'
                    }`}>
                        <div className={`flex items-center gap-2 ${rightsBlockers.length > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                            {rightsBlockers.length > 0 ? <AlertTriangle size={12} /> : <ShieldCheck size={12} />}
                            <span className="text-[9px] font-mono uppercase tracking-widest">Gate droits musique</span>
                        </div>
                        <div className="space-y-2">
                            {rightsAudit.map(({ track, issues, warnings, manifest }) => (
                                <div key={track.id} className="rounded-sm border border-neutral-800/80 bg-neutral-950/70 p-2 text-[9px] font-mono leading-relaxed text-neutral-400">
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="min-w-0 text-neutral-200">{track.name}</span>
                                        <span className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[8px] uppercase tracking-widest ${
                                            issues.length > 0 ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300'
                                        }`}>
                                            {issues.length > 0 ? 'Blocked' : RIGHTS_STATUS_LABELS[track.rightsStatus] || 'Ready'}
                                        </span>
                                    </div>
                                    <div className="mt-1 text-neutral-500">
                                        {manifest.provider} / {manifest.license || 'licence manquante'}
                                    </div>
                                    {manifest.attribution && (
                                        <div className="mt-0.5 text-emerald-300/80">Credit: {manifest.attribution}</div>
                                    )}
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        <span className={`rounded-sm px-1.5 py-0.5 ${manifest.socialUse ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
                                            Social {manifest.socialUse ? 'OK' : 'non confirme'}
                                        </span>
                                        <span className={`rounded-sm px-1.5 py-0.5 ${manifest.commercialUse ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
                                            Commercial {manifest.commercialUse ? 'OK' : 'non confirme'}
                                        </span>
                                    </div>
                                    {issues.length > 0 && (
                                        <div className="mt-1 text-red-300/90">Blockers: {issues.join(', ')}</div>
                                    )}
                                    {warnings.length > 0 && (
                                        <div className="mt-1 text-amber-300/80">Warnings: {warnings.join(' / ')}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={handleExport}
                    disabled={!hasClips || isExporting || rightsBlockers.length > 0}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 text-xs font-mono font-medium hover:bg-indigo-500 transition shadow-[0_0_20px_rgba(79,70,229,0.4)] disabled:opacity-50 disabled:shadow-none uppercase tracking-wider"
                >
                    <Download size={14} />
                    {isExporting ? `Export... ${exportProgress}%` : rightsBlockers.length > 0 ? 'Droits audio incomplets' : 'Exporter'}
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

function getRejectedMediaMessages(results = [], fallback = 'Media illisible') {
    return results
        .filter(result => result.status === 'rejected')
        .map((result) => {
            const name = result.media?.name || result.media?.id || 'media';
            const reason = result.reason?.message || fallback;
            return `${fallback}: ${name} (${reason}).`;
        });
}

export default ExportVideoPanel;
