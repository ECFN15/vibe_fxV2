import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Download, Monitor, Smartphone, ShieldCheck, AlertTriangle, Server, RotateCcw, Trash2 } from 'lucide-react';
import useVideoStore from '../store/videoStore';
import { EXPORT_PRESETS, PlaybackEngine } from '../engine/VideoEngine';
import { drawTextOverlays } from '../preview/VideoPreview';
import { RIGHTS_STATUS_LABELS, buildExportRightsManifest, getRightsAudit } from '../data/musicRights';
import { buildExportFrameSchedule, resolveTimelineRenderPlan, validateExportAudioMix, validateExportFrameCoverage, validateExportTimeline, validateTimelineRenderPlan } from '../model/timelineModel';
import { persistExportRightsManifest } from '../services/exportRightsManifestClient';
import { buildExportManifest, validateExportManifest } from '../export/exportManifest';
import { retryVideoExportJob, startVideoExportJob } from '../export/exportJobService';

const MIME_CANDIDATES = {
    webm: ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8', 'video/webm;codecs=vp9', 'video/webm'],
    mp4: ['video/mp4;codecs=h264,aac', 'video/mp4;codecs=h264', 'video/mp4'],
};

export const EXPORT_FRAME_RATE_OPTIONS = [
    { value: 'auto', label: 'Auto' },
    { value: 24, label: '24' },
    { value: 25, label: '25' },
    { value: 30, label: '30' },
    { value: 50, label: '50' },
    { value: 60, label: '60' },
];

const EXPORT_QUALITY_OPTIONS = [
    { value: 'preview', label: 'Preview', description: '720p cible, controle rapide' },
    { value: 'pro', label: 'Pro', description: 'MP4 social propre, CRF 17' },
    { value: 'master', label: 'Master', description: 'Qualite max, fichier lourd' },
];

const EXPORT_FIT_OPTIONS = [
    { value: 'cover', label: 'Cover' },
    { value: 'contain', label: 'Contain' },
    { value: 'customCrop', label: 'Crop custom' },
    { value: 'fill', label: 'Fill avance' },
];

export function useVideoExportController() {
    const [exportMessage, setExportMessage] = useState('');
    const [proExportMessage, setProExportMessage] = useState('');
    const [exportQualityMode, setExportQualityMode] = useState('pro');
    const [exportFitMode, setExportFitMode] = useState('cover');
    const [activeExportJob, setActiveExportJob] = useState(null);
    const [exportJobHistory, setExportJobHistory] = useState([]);
    const [isExportJobModalOpen, setIsExportJobModalOpen] = useState(false);
    const exportJobAbortRef = useRef(null);
    const [mimeSupport, setMimeSupport] = useState({ webm: false, mp4: false });
    const {
        sequencePreset, setSequencePreset,
        exportFormat, setExportFormat,
        exportFrameRate, setExportFrameRate,
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
    const sourceFpsMax = useMemo(() => resolveSourceFpsMax(exportClips), [exportClips]);
    const exportFps = useMemo(() => resolveExportFps(preset?.fps, sourceFpsMax, exportFrameRate), [exportFrameRate, preset?.fps, sourceFpsMax]);
    const exportAllTransitions = exportPlan.allTransitions;
    const exportTextOverlays = exportPlan.textOverlays;
    const exportAudioTracks = exportPlan.audioTracks;
    const exportPlaybackClips = exportPlan.playbackClips;
    const hasAudibleClipAudio = exportPlaybackClips.some(clip => Number(clip.volume ?? 100) > 0);
    const shouldMixAudio = hasAudibleClipAudio || exportAudioTracks.length > 0;
    const rightsAudit = useMemo(() => getRightsAudit(exportAudioTracks), [exportAudioTracks]);
    const rightsBlockers = useMemo(() => (
        rightsAudit.flatMap(({ track, issues }) => issues.map(issue => ({ track, issue })))
    ), [rightsAudit]);
    const rightsManifest = useMemo(() => buildExportRightsManifest(exportAudioTracks), [exportAudioTracks]);
    const effectiveExportFormat = exportFormat === 'mp4' && !mimeSupport.mp4 ? 'webm' : exportFormat;
    const formatFallbackActive = exportFormat !== effectiveExportFormat;
    const proExportManifest = useMemo(() => buildExportManifest({
        projectName,
        userId: 'local-user',
        renderPlan: {
            ...exportPlan,
            totalDuration,
        },
        preset,
        sequencePreset,
        exportFps,
        qualityMode: exportQualityMode,
        fitMode: exportFitMode,
        rightsManifest,
        frameSchedule: buildExportFrameSchedule({ totalDuration, fps: exportFps }),
        generatedAt: 'local-preflight',
    }), [exportFitMode, exportFps, exportPlan, exportQualityMode, preset, projectName, rightsManifest, sequencePreset, totalDuration]);
    const proExportPreflight = useMemo(() => {
        const fps = exportFps;
        const frameSchedule = buildExportFrameSchedule({ totalDuration, fps });
        const timelineAudit = validateExportTimeline({
            clips: exportClips,
            audioTracks: exportAudioTracks,
            transitionItems: exportAllTransitions,
            totalDuration,
            fps,
            mimeType: 'video/mp4',
        });
        const audioMixAudit = validateExportAudioMix({
            playbackClips: exportPlaybackClips,
            audioTracks: exportAudioTracks,
            shouldMixAudio,
            totalDuration,
        });
        const renderPlanAudit = validateTimelineRenderPlan({
            plan: exportPlan,
            totalDuration,
            frameDuration: frameSchedule.frameDuration || (1 / fps),
        });
        const frameCoverageAudit = validateExportFrameCoverage({
            frameSchedule,
            transitionItems: exportAllTransitions,
            totalDuration,
        });
        const manifestAudit = validateExportManifest(proExportManifest, { mode: 'localMock' });
        const rightsErrors = rightsBlockers.map(({ track, issue }) => `${track.name || track.id}: ${issue}.`);
        const errors = [
            ...rightsErrors,
            ...timelineAudit.errors,
            ...audioMixAudit.errors,
            ...renderPlanAudit.errors,
            ...frameCoverageAudit.errors,
            ...manifestAudit.errors,
        ];
        const warnings = [
            ...timelineAudit.warnings,
            ...audioMixAudit.warnings,
            ...renderPlanAudit.warnings,
            ...frameCoverageAudit.warnings,
            ...manifestAudit.warnings,
        ];

        return {
            errors: Array.from(new Set(errors)),
            warnings: Array.from(new Set(warnings)),
            frameSchedule,
            fps,
            manifest: proExportManifest,
            status: errors.length > 0 ? 'blocked' : warnings.length > 0 ? 'warning' : 'ready',
        };
    }, [exportAllTransitions, exportAudioTracks, exportClips, exportFps, exportPlaybackClips, exportPlan, proExportManifest, rightsBlockers, shouldMixAudio, totalDuration]);
    const exportPreflight = useMemo(() => {
        const fps = exportFps;
        const frameSchedule = buildExportFrameSchedule({ totalDuration, fps });
        const mimeType = getSupportedMimeType(effectiveExportFormat);
        const timelineAudit = validateExportTimeline({
            clips: exportClips,
            audioTracks: exportAudioTracks,
            transitionItems: exportAllTransitions,
            totalDuration,
            fps,
            mimeType,
        });
        const audioMixAudit = validateExportAudioMix({
            playbackClips: exportPlaybackClips,
            audioTracks: exportAudioTracks,
            shouldMixAudio,
            totalDuration,
        });
        const renderPlanAudit = validateTimelineRenderPlan({
            plan: exportPlan,
            totalDuration,
            frameDuration: frameSchedule.frameDuration || (1 / fps),
        });
        const frameCoverageAudit = validateExportFrameCoverage({
            frameSchedule,
            transitionItems: exportAllTransitions,
            totalDuration,
        });
        const browserErrors = typeof MediaRecorder === 'undefined'
            ? ['Export navigateur indisponible sur cette session.']
            : [];
        const AudioContextCtor = typeof window !== 'undefined'
            ? (window.AudioContext || window.webkitAudioContext)
            : null;
        const audioMixErrors = shouldMixAudio && !AudioContextCtor
            ? ['Mix audio export indisponible: AudioContext non supporte par ce navigateur.']
            : [];
        const rightsErrors = rightsBlockers.map(({ track, issue }) => `${track.name || track.id}: ${issue}.`);
        const errors = [
            ...browserErrors,
            ...audioMixErrors,
            ...rightsErrors,
            ...timelineAudit.errors,
            ...audioMixAudit.errors,
            ...renderPlanAudit.errors,
            ...frameCoverageAudit.errors,
        ];
        const warnings = [
            ...timelineAudit.warnings,
            ...audioMixAudit.warnings,
            ...renderPlanAudit.warnings,
            ...frameCoverageAudit.warnings,
        ];

        return {
            errors,
            warnings,
            frameSchedule,
            fps,
            mimeType,
            status: errors.length > 0 ? 'blocked' : warnings.length > 0 ? 'warning' : 'ready',
        };
    }, [effectiveExportFormat, exportAllTransitions, exportAudioTracks, exportClips, exportFps, exportPlaybackClips, exportPlan, rightsBlockers, shouldMixAudio, totalDuration]);

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

    const handleProExport = async () => {
        if (proExportPreflight.errors.length > 0) {
            setProExportMessage(`Export Pro bloque: ${proExportPreflight.errors.join(' ')}`);
            setIsExportJobModalOpen(true);
            return;
        }

        exportJobAbortRef.current?.abort?.();
        const abortController = new AbortController();
        exportJobAbortRef.current = abortController;
        setIsExportJobModalOpen(true);
        setProExportMessage('Export Pro MP4 lance en localMock.');

        const manifest = buildExportManifest({
            projectName,
            userId: 'local-user',
            renderPlan: {
                ...exportPlan,
                totalDuration,
            },
            preset,
            sequencePreset,
            exportFps,
            qualityMode: exportQualityMode,
            fitMode: exportFitMode,
            rightsManifest,
            frameSchedule: proExportPreflight.frameSchedule,
        });

        const updateJob = (job) => {
            setActiveExportJob(job);
            setExportProgress(job.progress || 0);
            setIsExporting(!['ready', 'failed', 'cancelled'].includes(job.status));
            setExportJobHistory((history) => upsertExportJobHistory(history, job));
        };

        setExportProgress(0);
        setIsExporting(true);
        const finalJob = await startVideoExportJob({
            manifest,
            mode: 'localMock',
            signal: abortController.signal,
            onUpdate: updateJob,
        });
        updateJob(finalJob);
        setIsExporting(false);
        setProExportMessage(resolveJobMessage(finalJob));
    };

    const cancelProExport = () => {
        exportJobAbortRef.current?.abort?.();
    };

    const retryProExport = async (job = activeExportJob) => {
        const manifest = job?.manifest || buildExportManifest({
            projectName,
            userId: 'local-user',
            renderPlan: {
                ...exportPlan,
                totalDuration,
            },
            preset,
            sequencePreset,
            exportFps,
            qualityMode: exportQualityMode,
            fitMode: exportFitMode,
            rightsManifest,
        });
        exportJobAbortRef.current?.abort?.();
        const abortController = new AbortController();
        exportJobAbortRef.current = abortController;
        setIsExportJobModalOpen(true);
        setIsExporting(true);
        const finalJob = await retryVideoExportJob({
            manifest,
            mode: 'localMock',
            signal: abortController.signal,
            onUpdate: (nextJob) => {
                setActiveExportJob(nextJob);
                setExportProgress(nextJob.progress || 0);
                setExportJobHistory((history) => upsertExportJobHistory(history, nextJob));
            },
        });
        setActiveExportJob(finalJob);
        setExportJobHistory((history) => upsertExportJobHistory(history, finalJob));
        setIsExporting(false);
        setProExportMessage(resolveJobMessage(finalJob));
    };

    const removeExportJobFromHistory = (jobId) => {
        setExportJobHistory((history) => history.filter(job => job.id !== jobId));
    };

    const handleBrowserDraftExport = async () => {
        if (exportPreflight.errors.length > 0) {
            setExportMessage(`Export brouillon bloque: ${exportPreflight.errors.join(' ')}`);
            return;
        }

            const requestedFormat = effectiveExportFormat;
            if (formatFallbackActive) {
                setExportFormat('webm');
            }

        const { fps, frameSchedule, mimeType } = exportPreflight;
        const warningNote = exportPreflight.warnings.length > 0 ? ` Checks: ${exportPreflight.warnings.join(' ')}` : '';
        const exportId = `export-${Date.now()}`;
        if (exportPreflight.warnings.length > 0) setExportMessage(`Export brouillon prepare avec corrections.${warningNote}`);

        const recordCanvas = document.createElement('canvas');
        if (!recordCanvas.captureStream) {
            setExportMessage('Export brouillon canvas indisponible sur cette session.');
            return;
        }

        recordCanvas.width = preset?.width || 1920;
        recordCanvas.height = preset?.height || 1080;
        recordCanvas.style.width = `${recordCanvas.width}px`;
        recordCanvas.style.height = `${recordCanvas.height}px`;
        recordCanvas.style.position = 'fixed';
        recordCanvas.style.left = '-100000px';
        recordCanvas.style.top = '0';
        recordCanvas.style.pointerEvents = 'none';
        document.body.appendChild(recordCanvas);

        const exportEngine = new PlaybackEngine(recordCanvas);
        const chunks = [];
        const stream = recordCanvas.captureStream(0);
        let disconnectAudio = null;
        let recordStream = stream;
        let progressTimer = null;
        let renderTimer = null;
        let stopTimer = null;
        let renderStopped = false;
        let exportFailureMessage = '';

        const cleanupBeforeRecord = () => {
            recordStream.getTracks().forEach((track) => track.stop());
            stream.getTracks().forEach((track) => track.stop());
            disconnectAudio?.();
            exportEngine.dispose();
            recordCanvas.remove();
        };

        const clipLoadResults = await exportEngine.loadAllClips(exportClips);
        const audioLoadResults = await exportEngine.loadAllAudioTracks(exportAudioTracks);
        const mediaLoadErrors = [
            ...getRejectedMediaMessages(clipLoadResults, 'Clip video illisible'),
            ...getRejectedMediaMessages(audioLoadResults, 'Piste audio illisible'),
        ];

        if (mediaLoadErrors.length > 0) {
            cleanupBeforeRecord();
            setExportMessage(`Export brouillon bloque: ${mediaLoadErrors.join(' ')}`);
            return;
        }

        try {
            const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
            if (shouldMixAudio) {
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
            setExportMessage(`Export brouillon bloque: impossible de mixer l'audio (${error.message}).`);
            return;
        }

        let recorder;
        try {
            const videoBitsPerSecond = resolveQualityVideoBitrate(recordCanvas.width, recordCanvas.height, fps);
            const audioBitsPerSecond = 256_000;
            recorder = new MediaRecorder(recordStream, {
                mimeType,
                bitsPerSecond: videoBitsPerSecond + audioBitsPerSecond,
                videoBitsPerSecond,
                audioBitsPerSecond,
            });
        } catch (error) {
            recordStream.getTracks().forEach((track) => track.stop());
            stream.getTracks().forEach((track) => track.stop());
            disconnectAudio?.();
            exportEngine.dispose();
            recordCanvas.remove();
            setExportMessage(`Export brouillon impossible: ${error.message}`);
            return;
        }

        const durationMs = Math.max(1000, frameSchedule.expectedDuration * 1000 + 1500);
        const startedAt = performance.now();
        let renderTime = 0;
        let renderedFrameCount = 0;
        let blankFrameStreak = 0;
        const frameDuration = frameSchedule.frameDuration;
        const maxBlankFrameStreak = Math.max(3, Math.ceil(fps * 0.15));

        setExportMessage(`${mimeType.includes('mp4') ? 'Export rapide navigateur (brouillon) MP4 en cours.' : 'Export rapide navigateur (brouillon) WebM en cours. MP4 natif indisponible dans ce navigateur.'}${warningNote}`);
        setExportProgress(0);
        setIsExporting(true);

        const cleanup = () => {
            window.clearInterval(progressTimer);
            window.clearInterval(renderTimer);
            window.clearTimeout(stopTimer);
            renderStopped = true;
            recordStream.getTracks().forEach((track) => track.stop());
            stream.getTracks().forEach((track) => track.stop());
            disconnectAudio?.();
            exportEngine.dispose();
            recordCanvas.remove();
        };

        const stopRecording = () => {
            if (recorder.state === 'inactive') return;
            renderStopped = true;
            exportEngine.stopPlayback();
            recorder.stop();
        };

        const failExport = (message) => {
            if (exportFailureMessage) return;
            exportFailureMessage = message;
            setExportMessage(message);
            stopRecording();
        };

        recorder.ondataavailable = (event) => {
            if (event.data?.size) chunks.push(event.data);
        };

        recorder.onerror = (event) => {
            failExport(`Export interrompu: ${event.error?.message || 'erreur MediaRecorder'}`);
        };

        recorder.onstop = async () => {
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
            if (renderedFrameCount === 0) {
                setExportMessage('Export echoue: aucune frame video rendue.');
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
            let manifestNote = '';
            if (rightsManifest.length > 0) {
                try {
                    const persistResult = await persistExportRightsManifest({
                        audioTracks: exportAudioTracks,
                        context: {
                            exportId,
                            projectName,
                            exportFormat: extension,
                            sequencePreset,
                        },
                    });
                    manifestNote = persistResult.persisted
                        ? ` Manifeste droits sauvegarde: ${persistResult.manifest.id}.`
                        : ` Manifeste droits pret: ${persistResult.manifest.trackCount} piste(s), non sauvegarde (${persistResult.reason}).`;
                } catch (error) {
                    manifestNote = ` Manifeste droits pret: ${rightsManifest.length} piste(s), sauvegarde impossible (${error.message}).`;
                }
            }
            setExportMessage(`Export termine (${extension.toUpperCase()}, ${(blob.size / 1024 / 1024).toFixed(1)} Mo).${manifestNote}`);
        };

        progressTimer = window.setInterval(() => {
            const elapsed = performance.now() - startedAt;
            const timeProgress = totalDuration > 0 ? (renderTime / totalDuration) * 100 : 0;
            setExportProgress(Math.min(99, Math.max(Math.round((elapsed / durationMs) * 100), Math.round(timeProgress))));
        }, 200);

        setExportMessage(`${mimeType.includes('mp4') ? 'Encodage brouillon MP4 navigateur.' : 'Encodage brouillon WebM navigateur.'} MediaRecorder ne garantit pas un rendu final pro.${warningNote}`);
        recorder.start(250);
        const videoTracks = stream.getVideoTracks();
        let frameIndex = 0;
        const totalFrames = frameSchedule.totalFrames;

        const renderExportFrame = (time) => {
            const frameResult = exportEngine.renderFrame(exportClips, transitions, time, exportAllTransitions);
            const frameShouldContainVideo = exportClips.length > 0 && time < totalDuration - (frameDuration / 2);
            if (frameShouldContainVideo && !frameResult?.rendered) {
                failExport(`Export interrompu: frame video non rendue a ${time.toFixed(2)}s (${frameResult?.reason || 'aucun clip actif'})`);
                return false;
            }
            drawTextOverlays(recordCanvas, exportTextOverlays, time, null);
            exportEngine.syncClipAudio(exportPlaybackClips, transitions, time, 1, exportAllTransitions);
            exportEngine.syncExternalAudio(exportAudioTracks, time, 1);
            videoTracks.forEach((track) => track.requestFrame?.());
            renderedFrameCount += 1;
            if (frameShouldContainVideo) {
                const frameHealth = sampleCanvasFrameHealth(recordCanvas);
                if (frameHealth.checkable && frameHealth.blank) {
                    blankFrameStreak += 1;
                    if (blankFrameStreak >= maxBlankFrameStreak) {
                        failExport(`Export interrompu: frames noires consecutives a ${time.toFixed(2)}s`);
                        return false;
                    }
                } else {
                    blankFrameStreak = 0;
                }
            }
            return true;
        };

        renderExportFrame(0);

        renderTimer = window.setInterval(() => {
            if (renderStopped || recorder.state === 'inactive' || exportFailureMessage) return;
            frameIndex += 1;
            renderTime = Math.min(totalDuration, frameIndex * frameDuration);
            if (!renderExportFrame(renderTime)) return;
            setExportProgress(Math.min(99, Math.round((frameIndex / Math.max(totalFrames, 1)) * 100)));
            if (frameIndex >= totalFrames || renderTime >= totalDuration - (frameDuration / 2)) {
                stopRecording();
            }
        }, 1000 / fps);
        stopTimer = window.setTimeout(stopRecording, durationMs);
    };

    return {
        activeExportJob,
        audioTracks: exportAudioTracks,
        cancelProExport,
        effectiveExportFormat,
        exportAudioTracks,
        exportFps,
        exportFormat,
        exportFrameRate,
        exportFitMode,
        exportJobHistory,
        exportMessage,
        exportPreflight,
        exportProgress,
        exportQualityMode,
        formatFallbackActive,
        handleBrowserDraftExport,
        handleExport: handleProExport,
        handleProExport,
        hasAudibleClipAudio,
        hasClips,
        isExportJobModalOpen,
        isExporting,
        mimeSupport,
        preset,
        proExportManifest,
        proExportMessage,
        proExportPreflight,
        projectName,
        removeExportJobFromHistory,
        retryProExport,
        rightsAudit,
        rightsBlockers,
        sequencePreset,
        setActivePanel,
        setExportFormat,
        setExportFrameRate,
        setExportFitMode,
        setExportJobHistory,
        setExportJobModalOpen: setIsExportJobModalOpen,
        setExportQualityMode,
        setSequencePreset,
        shouldMixAudio,
        sourceFpsMax,
        totalDuration,
    };
}

const ExportVideoPanel = () => {
    const {
        activeExportJob,
        cancelProExport,
        effectiveExportFormat,
        exportAudioTracks,
        exportFps,
        exportFormat,
        exportFrameRate,
        exportFitMode,
        exportJobHistory,
        exportMessage,
        exportPreflight,
        exportProgress,
        exportQualityMode,
        handleBrowserDraftExport,
        handleExport,
        hasAudibleClipAudio,
        hasClips,
        isExportJobModalOpen,
        isExporting,
        mimeSupport,
        preset,
        proExportManifest,
        proExportMessage,
        proExportPreflight,
        removeExportJobFromHistory,
        retryProExport,
        rightsAudit,
        rightsBlockers,
        sequencePreset,
        setActivePanel,
        setExportFormat,
        setExportFrameRate,
        setExportFitMode,
        setExportJobModalOpen,
        setExportQualityMode,
        setSequencePreset,
        shouldMixAudio,
        sourceFpsMax,
        totalDuration,
    } = useVideoExportController();

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
                                    <div className="text-[8px] font-mono text-neutral-500">{p.width}x{p.height} / {p.label} / auto {p.fps}-60 FPS</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="rounded-sm border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <span className="text-[9px] font-mono text-cyan-300 uppercase tracking-widest">Export Pro serveur</span>
                            <p className="mt-1 text-[9px] font-mono leading-relaxed text-neutral-400">
                                LocalMock actif: valide le workflow Cloud Run/FFmpeg sans generer de faux MP4.
                            </p>
                        </div>
                        <Server size={14} className="mt-0.5 shrink-0 text-cyan-300" />
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                        {EXPORT_QUALITY_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setExportQualityMode(option.value)}
                                className={`rounded-sm border px-2 py-2 text-left transition ${
                                    exportQualityMode === option.value
                                        ? 'border-cyan-400/55 bg-cyan-400/12 text-cyan-100'
                                        : 'border-neutral-800 bg-neutral-950/70 text-neutral-400 hover:border-neutral-600'
                                }`}
                            >
                                <span className="block text-[9px] font-mono uppercase tracking-widest">{option.label}</span>
                                <span className="mt-1 block text-[8px] font-mono leading-snug text-neutral-500">{option.description}</span>
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <label className="space-y-1">
                            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Fit</span>
                            <select
                                value={exportFitMode}
                                onChange={(event) => setExportFitMode(event.target.value)}
                                className="w-full rounded-sm border border-neutral-800 bg-neutral-950 px-2 py-2 text-[10px] font-mono uppercase tracking-widest text-neutral-200 outline-none transition hover:border-neutral-600 focus:border-cyan-400"
                            >
                                {EXPORT_FIT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </label>
                        <div className="rounded-sm border border-neutral-800 bg-neutral-950/70 p-2">
                            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Estimation</span>
                            <div className="mt-1 space-y-1 text-[9px] font-mono">
                                <div className="flex justify-between gap-2">
                                    <span className="text-neutral-500">Taille</span>
                                    <span className="text-neutral-300">{proExportManifest.estimates.outputSize.label}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                    <span className="text-neutral-500">Temps</span>
                                    <span className="text-neutral-300">{proExportManifest.estimates.renderTime.label}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Fallback navigateur brouillon</span>
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

                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                        <label htmlFor="vibecut-export-fps" className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">
                            FPS preview/export
                        </label>
                        <span className="text-[9px] font-mono text-indigo-300 uppercase tracking-widest">
                            {exportFps} FPS
                        </span>
                    </div>
                    <select
                        id="vibecut-export-fps"
                        data-testid="export-fps-select"
                        value={exportFrameRate}
                        onChange={(event) => setExportFrameRate(event.target.value === 'auto' ? 'auto' : Number(event.target.value))}
                        className="w-full rounded-sm border border-neutral-800 bg-neutral-950 px-2 py-2 text-[10px] font-mono uppercase tracking-widest text-neutral-200 outline-none transition hover:border-neutral-600 focus:border-indigo-400"
                    >
                        {EXPORT_FRAME_RATE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.value === 'auto' ? `Auto (${sourceFpsMax || preset.fps} FPS)` : `${option.label} FPS`}
                            </option>
                        ))}
                    </select>
                </div>

                {preset && (
                    <div className="border border-neutral-800 rounded-sm p-3 space-y-1.5">
                        <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Resume</span>
                        <div className="space-y-1">
                            {[
                                ['Resolution', `${preset.width} x ${preset.height}`],
                                ['Sequence', `${preset.name} ${preset.label}`],
                                ['FPS', `${exportFps}`],
                                ['Source FPS', sourceFpsMax > exportFps ? `${sourceFpsMax}->${exportFps} FPS` : `${sourceFpsMax || exportFps} FPS preserve`],
                                ['Duree', `${totalDuration.toFixed(1)}s`],
                                ['Audio export', shouldMixAudio ? [
                                    hasAudibleClipAudio ? 'clips' : '',
                                    exportAudioTracks.length > 0 ? 'musique' : '',
                                ].filter(Boolean).join(' + ') : 'aucun'],
                                ['Controle frames', 'actif'],
                                ['Format demande', exportFormat.toUpperCase()],
                                ['Format reel', effectiveExportFormat.toUpperCase()],
                            ].map(([label, value]) => (
                                <div key={label} className="flex justify-between text-[9px] font-mono">
                                    <span className="text-neutral-500">{label}</span>
                                    <span
                                        className="text-neutral-300"
                                        data-testid={label === 'Format reel' ? 'export-effective-format' : label === 'Audio export' ? 'export-audio-mix' : label === 'Controle frames' ? 'export-frame-guard' : undefined}
                                    >
                                        {value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div
                    className={`rounded-sm border p-3 space-y-1.5 ${
                        proExportPreflight.status === 'blocked'
                            ? 'border-red-500/25 bg-red-500/5'
                            : proExportPreflight.status === 'warning'
                                ? 'border-amber-500/25 bg-amber-500/5'
                                : 'border-cyan-500/20 bg-cyan-500/5'
                    }`}
                    data-testid="export-pro-preflight"
                    data-preflight-status={proExportPreflight.status}
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-400">Preflight Export Pro</span>
                        <span
                            className={`rounded-sm px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest ${
                                proExportPreflight.status === 'blocked'
                                    ? 'bg-red-500/10 text-red-300'
                                    : proExportPreflight.status === 'warning'
                                        ? 'bg-amber-500/10 text-amber-300'
                                        : 'bg-cyan-500/10 text-cyan-200'
                            }`}
                        >
                            {proExportPreflight.status === 'blocked' ? 'Bloque' : proExportPreflight.status === 'warning' ? 'Warnings' : 'Pret'}
                        </span>
                    </div>
                    {proExportPreflight.errors.length > 0 ? (
                        <p className="text-[9px] font-mono leading-relaxed text-red-300/90">
                            {proExportPreflight.errors.slice(0, 2).join(' ')}
                        </p>
                    ) : proExportPreflight.warnings.length > 0 ? (
                        <p className="text-[9px] font-mono leading-relaxed text-amber-300/85">
                            {proExportPreflight.warnings.slice(0, 2).join(' ')}
                        </p>
                    ) : (
                        <p className="text-[9px] font-mono leading-relaxed text-cyan-200/80">
                            Manifeste MP4, sources, frames, audio, droits et cadrage verifies pour orchestration serveur.
                        </p>
                    )}
                </div>

                <div
                    className={`rounded-sm border p-3 space-y-1.5 ${
                        exportPreflight.status === 'blocked'
                            ? 'border-red-500/25 bg-red-500/5'
                            : exportPreflight.status === 'warning'
                                ? 'border-amber-500/25 bg-amber-500/5'
                                : 'border-emerald-500/20 bg-emerald-500/5'
                    }`}
                    data-testid="export-preflight"
                    data-preflight-status={exportPreflight.status}
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-400">Preflight brouillon navigateur</span>
                        <span
                            className={`rounded-sm px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest ${
                                exportPreflight.status === 'blocked'
                                    ? 'bg-red-500/10 text-red-300'
                                    : exportPreflight.status === 'warning'
                                        ? 'bg-amber-500/10 text-amber-300'
                                        : 'bg-emerald-500/10 text-emerald-300'
                            }`}
                        >
                            {exportPreflight.status === 'blocked' ? 'Bloque' : exportPreflight.status === 'warning' ? 'Warnings' : 'Pret'}
                        </span>
                    </div>
                    {exportPreflight.errors.length > 0 ? (
                        <p className="text-[9px] font-mono leading-relaxed text-red-300/90">
                            {exportPreflight.errors.slice(0, 2).join(' ')}
                        </p>
                    ) : exportPreflight.warnings.length > 0 ? (
                        <p className="text-[9px] font-mono leading-relaxed text-amber-300/85">
                            {exportPreflight.warnings.slice(0, 2).join(' ')}
                        </p>
                    ) : (
                        <p className="text-[9px] font-mono leading-relaxed text-emerald-300/80">
                            Frames, duree, codec, transitions et audio verifies.
                        </p>
                    )}
                </div>

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

                <div className="space-y-2">
                    <button
                        onClick={handleExport}
                        disabled={!hasClips || isExporting || proExportPreflight.errors.length > 0}
                        className="w-full flex items-center justify-center gap-2 border border-cyan-400/50 bg-cyan-500/15 text-cyan-50 py-2.5 text-xs font-mono font-medium hover:bg-cyan-500/22 transition shadow-[0_0_20px_rgba(34,211,238,0.22)] disabled:opacity-50 disabled:shadow-none uppercase tracking-wider"
                    >
                        <Server size={14} />
                        {isExporting ? `Export Pro... ${exportProgress}%` : proExportPreflight.errors.length > 0 ? 'Export Pro bloque' : 'Export Pro MP4'}
                    </button>
                    <button
                        onClick={handleBrowserDraftExport}
                        disabled={!hasClips || isExporting || exportPreflight.errors.length > 0}
                        className="w-full flex items-center justify-center gap-2 border border-neutral-800 bg-neutral-950/80 text-neutral-300 py-2 text-[10px] font-mono font-medium hover:border-neutral-600 hover:text-white transition disabled:opacity-50 uppercase tracking-wider"
                    >
                        <Download size={13} />
                        Export rapide navigateur (brouillon)
                    </button>
                </div>

                {isExporting && (
                    <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${exportProgress}%` }} />
                    </div>
                )}

                {(proExportMessage || exportMessage) && (
                    <p className="text-[9px] font-mono text-neutral-500 leading-relaxed">
                        {proExportMessage || exportMessage}
                    </p>
                )}

                {exportJobHistory.length > 0 && (
                    <ExportJobHistory
                        jobs={exportJobHistory}
                        onRetry={retryProExport}
                        onRemove={removeExportJobFromHistory}
                    />
                )}
            </div>

            {isExportJobModalOpen && (
                <ExportRenderModal
                    job={activeExportJob}
                    manifest={proExportManifest}
                    onCancel={cancelProExport}
                    onClose={() => setExportJobModalOpen(false)}
                    onRetry={retryProExport}
                />
            )}
        </div>
    );
};

function ExportRenderModal({ job, manifest, onCancel, onClose, onRetry }) {
    const status = job?.status || 'preparing_sources';
    const progress = Math.max(0, Math.min(100, Number(job?.progress || 0)));
    const isRunning = !['ready', 'failed', 'cancelled'].includes(status);
    const elapsed = formatDurationMs(job?.elapsedMs || 0);
    const remaining = job?.estimatedRemainingMs ? formatDurationMs(job.estimatedRemainingMs) : 'calcul';
    const render = job?.render || manifest?.render || {};
    const outputSize = job?.output?.sizeBytes || manifest?.estimates?.outputSize?.bytes || 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 px-3 backdrop-blur-sm">
            <div className="w-full max-w-xl overflow-hidden rounded-sm border border-cyan-400/25 bg-neutral-950 shadow-[0_0_55px_rgba(34,211,238,0.18)]">
                <div className="flex items-start justify-between gap-4 border-b border-neutral-800 px-4 py-3">
                    <div>
                        <p className="text-[9px] font-mono uppercase tracking-widest text-cyan-300">Export Pro MP4</p>
                        <h3 className="mt-1 text-sm font-mono uppercase tracking-wider text-white">{job?.projectName || manifest?.project?.name || 'VibeCut'}</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-8 w-8 place-items-center rounded-sm border border-neutral-800 text-neutral-500 transition hover:border-neutral-600 hover:text-white"
                        aria-label="Fermer la modale export"
                    >
                        <X size={14} />
                    </button>
                </div>

                <div className="space-y-4 p-4">
                    <div className="rounded-sm border border-neutral-800 bg-neutral-900/45 p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-200">{job?.phaseLabel || 'Preparation'}</p>
                                <p className="mt-1 text-[9px] font-mono leading-relaxed text-neutral-500">{job?.stepLabel || 'Initialisation du job localMock.'}</p>
                            </div>
                            <span className="shrink-0 text-lg font-mono tabular-nums text-cyan-200">{progress}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-sm bg-neutral-950">
                            <div className="h-full bg-cyan-300 transition-[width] duration-200" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="mt-3 text-[9px] font-mono leading-relaxed text-neutral-400">
                            Tu peux laisser cet export tourner. Le rendu final est calcule sur serveur; en localMock, seules les phases et validations sont simulees.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                            ['Mode', render.qualityLabel || render.qualityMode || 'Pro'],
                            ['Format', `${render.width || 0}x${render.height || 0}`],
                            ['FPS', render.fps || 0],
                            ['Est.', outputSize ? formatBytes(outputSize) : 'mock'],
                            ['Ecoule', elapsed],
                            ['Restant', isRunning ? remaining : '-'],
                            ['Codec', 'H.264/AAC'],
                            ['Etat', status],
                        ].map(([label, value]) => (
                            <div key={label} className="rounded-sm border border-neutral-800 bg-neutral-950/80 p-2">
                                <p className="text-[8px] font-mono uppercase tracking-widest text-neutral-600">{label}</p>
                                <p className="mt-1 truncate text-[10px] font-mono text-neutral-200">{value}</p>
                            </div>
                        ))}
                    </div>

                    {job?.error && (
                        <div className="rounded-sm border border-red-500/25 bg-red-500/8 p-3">
                            <p className="text-[9px] font-mono uppercase tracking-widest text-red-300">{job.error.code}</p>
                            <p className="mt-1 text-[10px] leading-relaxed text-red-100">{job.error.message}</p>
                            <p className="mt-1 text-[9px] font-mono leading-relaxed text-red-200/75">{job.error.action}</p>
                        </div>
                    )}

                    <div className="rounded-sm border border-neutral-800 bg-black p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">Logs renderer</p>
                            <span className="text-[8px] font-mono uppercase tracking-widest text-neutral-600">localMock</span>
                        </div>
                        <div className="max-h-36 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
                            {(job?.logs?.length ? job.logs : [{ at: new Date().toISOString(), level: 'neutral', message: 'En attente du premier evenement export.' }]).map((log, index) => (
                                <div key={`${log.at}-${index}`} className={`text-[9px] font-mono leading-relaxed ${log.level === 'error' ? 'text-red-300' : log.level === 'success' ? 'text-emerald-300' : log.level === 'warning' ? 'text-amber-300' : 'text-neutral-400'}`}>
                                    <span className="text-neutral-600">{formatLogTime(log.at)}</span> {log.message}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-neutral-800 px-4 py-3">
                    {isRunning ? (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="rounded-sm border border-red-500/35 bg-red-500/10 px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-red-200 transition hover:bg-red-500/18"
                        >
                            Annuler
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onRetry(job)}
                            className="inline-flex items-center gap-2 rounded-sm border border-cyan-500/35 bg-cyan-500/10 px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-cyan-100 transition hover:bg-cyan-500/18"
                        >
                            <RotateCcw size={12} />
                            Relancer
                        </button>
                    )}
                    <button
                        type="button"
                        disabled={!job?.output?.downloadUrl}
                        onClick={() => {
                            if (job?.output?.downloadUrl) {
                                window.open(job.output.downloadUrl, '_blank', 'noopener,noreferrer');
                            }
                        }}
                        className="inline-flex items-center gap-2 rounded-sm border border-neutral-700 bg-neutral-900 px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-neutral-300 transition hover:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-45"
                        title={job?.output?.downloadUrl ? 'Telecharger le MP4' : job?.output?.storagePath ? 'MP4 disponible dans Storage, URL signee absente' : 'Aucun fichier reel en localMock'}
                    >
                        <Download size={12} />
                        Telecharger MP4
                    </button>
                </div>
            </div>
        </div>
    );
}

function ExportJobHistory({ jobs = [], onRetry, onRemove }) {
    return (
        <div className="rounded-sm border border-neutral-800 bg-neutral-950/70 p-3 space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Historique exports</span>
                <span className="text-[8px] font-mono text-neutral-600 uppercase tracking-widest">{jobs.length}</span>
            </div>
            <div className="space-y-1.5">
                {jobs.slice(0, 5).map((job) => (
                    <div key={job.id} className="rounded-sm border border-neutral-800 bg-neutral-900/45 p-2">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="truncate text-[10px] font-mono text-neutral-200">{job.projectName}</p>
                                <p className="mt-0.5 text-[8px] font-mono uppercase tracking-widest text-neutral-600">
                                    {job.status} / {job.render?.qualityLabel || job.qualityMode} / {formatDateTime(job.updatedAt)}
                                </p>
                            </div>
                            <span className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest ${getJobStatusClass(job.status)}`}>
                                {job.progress || 0}%
                            </span>
                        </div>
                        <div className="mt-2 flex gap-1.5">
                            <button
                                type="button"
                                onClick={() => onRetry(job)}
                                className="inline-flex h-7 items-center gap-1 rounded-sm border border-neutral-800 px-2 text-[8px] font-mono uppercase tracking-widest text-neutral-400 transition hover:border-cyan-500/45 hover:text-cyan-100"
                            >
                                <RotateCcw size={10} />
                                Retry
                            </button>
                            <button
                                type="button"
                                onClick={() => onRemove(job.id)}
                                className="inline-flex h-7 items-center gap-1 rounded-sm border border-neutral-800 px-2 text-[8px] font-mono uppercase tracking-widest text-neutral-500 transition hover:border-red-500/35 hover:text-red-200"
                            >
                                <Trash2 size={10} />
                                Supprimer
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function upsertExportJobHistory(history = [], job = {}) {
    if (!job?.id) return history;
    return [job, ...history.filter(item => item.id !== job.id)].slice(0, 8);
}

function resolveJobMessage(job = {}) {
    if (job.status === 'ready') return 'Export Pro localMock termine: workflow valide, aucun MP4 reel genere.';
    if (job.status === 'cancelled') return 'Export Pro annule.';
    if (job.status === 'failed') return `Export Pro echoue: ${job.error?.message || 'erreur inconnue'}`;
    return job.stepLabel || 'Export Pro en cours.';
}

function getJobStatusClass(status = '') {
    if (status === 'ready') return 'bg-emerald-500/10 text-emerald-300';
    if (status === 'failed') return 'bg-red-500/10 text-red-300';
    if (status === 'cancelled') return 'bg-amber-500/10 text-amber-300';
    return 'bg-cyan-500/10 text-cyan-200';
}

function formatBytes(bytes = 0) {
    const value = Number(bytes) || 0;
    if (value <= 0) return '0 Mo';
    return `${(value / 1024 / 1024).toFixed(value > 100 * 1024 * 1024 ? 0 : 1)} Mo`;
}

function formatDurationMs(ms = 0) {
    const seconds = Math.max(0, Math.round((Number(ms) || 0) / 1000));
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
}

function formatLogTime(value = '') {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--:--:--';
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDateTime(value = '') {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'date inconnue';
    return date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function getRejectedMediaMessages(results = [], fallback = 'Media illisible') {
    return results
        .filter(result => result.status === 'rejected')
        .map((result) => {
            const name = result.media?.name || result.media?.id || 'media';
            const reason = result.reason?.message || fallback;
            return `${fallback}: ${name} (${reason}).`;
        });
}

function getSupportedMimeType(format = 'webm') {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = MIME_CANDIDATES[format] || MIME_CANDIDATES.webm;
    return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || '';
}

function resolveSourceFpsMax(clips = []) {
    const detected = clips
        .map((clip) => Number(clip.sourceFrameRate || clip.importFrameRate || 0))
        .filter((fps) => Number.isFinite(fps) && fps > 0);
    if (!detected.length) return 0;
    return Math.min(60, Math.max(...detected.map((fps) => Math.round(fps))));
}

function resolveQualityVideoBitrate(width = 1920, height = 1080, fps = 30) {
    const pixels = Math.max(1, Number(width) * Number(height));
    const normalizedFps = Math.max(24, Math.min(60, Number(fps) || 30));
    const bitsPerPixelFrame = 0.28;
    return Math.round(Math.min(90_000_000, Math.max(24_000_000, pixels * normalizedFps * bitsPerPixelFrame)));
}

export function resolveExportFps(presetFps, sourceFpsMax, override = 'auto') {
    const requestedFps = Number(override);
    if (override !== 'auto' && Number.isFinite(requestedFps) && requestedFps > 0) {
        return Math.min(60, Math.max(1, Math.round(requestedFps)));
    }
    const baseFps = Number.isFinite(Number(presetFps)) ? Number(presetFps) : 30;
    const sourceFps = Number.isFinite(Number(sourceFpsMax)) ? Number(sourceFpsMax) : 0;
    return Math.min(60, Math.max(baseFps, sourceFps || baseFps));
}

function sampleCanvasFrameHealth(canvas) {
    try {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx || canvas.width <= 0 || canvas.height <= 0) return { checkable: false, blank: false };

        const points = [
            [0.5, 0.5], [0.35, 0.5], [0.65, 0.5],
            [0.5, 0.35], [0.5, 0.65], [0.2, 0.2],
            [0.8, 0.2], [0.2, 0.8], [0.8, 0.8],
        ];
        const lumas = points.map(([rx, ry]) => {
            const x = Math.max(0, Math.min(canvas.width - 1, Math.floor(canvas.width * rx)));
            const y = Math.max(0, Math.min(canvas.height - 1, Math.floor(canvas.height * ry)));
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            return (pixel[0] + pixel[1] + pixel[2]) / 3;
        });
        const max = Math.max(...lumas);
        const min = Math.min(...lumas);
        const mean = lumas.reduce((sum, value) => sum + value, 0) / lumas.length;

        return {
            checkable: true,
            blank: max <= 3 && mean <= 2 && (max - min) <= 3,
            mean,
            spread: max - min,
        };
    } catch {
        return { checkable: false, blank: false };
    }
}

export default ExportVideoPanel;
