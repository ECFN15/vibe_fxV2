import { createExportServiceError } from './exportStorageService';

export const EXPORT_RENDER_PHASES = [
    { id: 'preparing_sources', label: 'Preparation des sources', from: 0, to: 15, durationMs: 700 },
    { id: 'queueing', label: 'Mise en file de rendu', from: 15, to: 25, durationMs: 650 },
    { id: 'rendering', label: 'Rendu video', from: 25, to: 80, durationMs: 2200 },
    { id: 'encoding', label: 'Encodage MP4', from: 80, to: 95, durationMs: 900 },
    { id: 'finalizing', label: 'Finalisation', from: 95, to: 100, durationMs: 550 },
];

export function resolveExportRenderMode() {
    const requestedMode = process.env.NEXT_PUBLIC_VIBECUT_EXPORT_MODE;
    if (requestedMode === 'server' || requestedMode === 'firebase') return requestedMode;
    return 'localMock';
}

export async function runExportRenderer({ job, manifest, mode = resolveExportRenderMode(), signal, onProgress } = {}) {
    if (mode === 'server' || mode === 'firebase') {
        return runFirebaseRenderer({ job, manifest, signal, onProgress });
    }

    return runLocalMockRenderer({ job, manifest, signal, onProgress });
}

async function runLocalMockRenderer({ job, manifest, signal, onProgress }) {
    const startedAt = Date.now();
    const logs = [];

    for (const phase of EXPORT_RENDER_PHASES) {
        assertNotCancelled(signal);
        const phaseStart = Date.now();
        const phaseLog = makePhaseLog(phase, manifest);
        logs.push(phaseLog);
        onProgress?.({
            ...job,
            status: phase.id === 'finalizing' ? 'finalizing' : 'rendering',
            phase: phase.id,
            phaseLabel: phase.label,
            stepLabel: phaseLog.message,
            progress: phase.from,
            logs: [...logs],
            elapsedMs: Date.now() - startedAt,
        });

        while (Date.now() - phaseStart < phase.durationMs) {
            assertNotCancelled(signal);
            await wait(120);
            const phaseProgress = Math.min(1, (Date.now() - phaseStart) / phase.durationMs);
            const progress = Math.round(phase.from + (phase.to - phase.from) * phaseProgress);
            onProgress?.({
                ...job,
                status: phase.id === 'finalizing' ? 'finalizing' : 'rendering',
                phase: phase.id,
                phaseLabel: phase.label,
                stepLabel: phaseLog.message,
                progress,
                logs: [...logs],
                elapsedMs: Date.now() - startedAt,
                estimatedRemainingMs: estimateRemainingMs(progress, startedAt),
            });
        }
    }

    const readyLog = {
        at: new Date().toISOString(),
        level: 'success',
        message: 'Workflow mock termine. Aucun MP4 reel n a ete genere en localMock.',
    };
    logs.push(readyLog);

    return {
        ...job,
        status: 'ready',
        phase: 'ready',
        phaseLabel: 'Pret',
        stepLabel: 'Mock termine',
        progress: 100,
        logs,
        elapsedMs: Date.now() - startedAt,
        output: {
            storagePath: null,
            downloadUrl: null,
            sizeBytes: manifest.estimates?.outputSize?.bytes || 0,
            expiresAt: null,
            mockOnly: true,
        },
    };
}

async function runFirebaseRenderer({ job, manifest, signal, onProgress }) {
    const [{ functions, firebaseReady }, { httpsCallable }] = await Promise.all([
        import('@/lib/firebase'),
        import('firebase/functions'),
    ]);

    if (!firebaseReady || !functions) {
        throw createExportServiceError({
            code: 'firebase-functions-not-configured',
            message: 'Firebase Functions n est pas configure pour Export Pro.',
            action: 'Renseigne Firebase puis garde NEXT_PUBLIC_VIBECUT_EXPORT_MODE=localMock tant que le backend export n est pas deploye.',
        });
    }

    assertNotCancelled(signal);
    onProgress?.({
        ...job,
        status: 'queued',
        phase: 'queueing',
        phaseLabel: 'Mise en file de rendu',
        stepLabel: 'Envoi du manifeste a Firebase Functions',
        progress: 18,
        logs: [{
            at: new Date().toISOString(),
            level: 'info',
            message: 'Callable createVideoExportJob appelee.',
        }],
    });

    try {
        const createVideoExportJob = httpsCallable(functions, 'createVideoExportJob');
        const result = await createVideoExportJob({ manifest });
        assertNotCancelled(signal);
        const data = result.data || {};
        const status = data.status || 'queued';
        const failed = status === 'failed';
        if (failed) {
            throw createExportServiceError({
                code: data.error?.code || 'firebase-render-failed',
                message: data.error?.message || 'Le rendu Firebase a echoue.',
                action: data.error?.action || 'Consulte les logs Firestore du job export.',
            });
        }

        return {
            ...job,
            id: data.jobId || job.id,
            status,
            phase: data.phase || status,
            phaseLabel: status === 'ready' ? 'Pret' : 'Rendu Firebase',
            stepLabel: data.output?.storagePath ? 'MP4 genere dans Firebase Storage' : 'Job export cree dans Firestore',
            progress: status === 'ready' ? 100 : Number(data.progress || 24),
            logs: data.logs || [{
                at: new Date().toISOString(),
                level: status === 'ready' ? 'success' : 'info',
                message: status === 'ready' ? 'Export Pro Firebase termine.' : 'Job Export Pro Firebase enregistre.',
            }],
            output: data.output || null,
            warnings: data.warnings || [],
        };
    } catch (error) {
        if (error.code?.startsWith?.('functions/')) {
            throw createExportServiceError({
                code: error.code,
                message: error.message || 'Callable Export Pro Firebase indisponible.',
                action: 'Verifie le deploy Functions, App Check et la configuration Cloud Run.',
                cause: error,
            });
        }
        throw error;
    }
}

function makePhaseLog(phase, manifest) {
    const render = manifest?.render || {};
    const messages = {
        preparing_sources: `Manifest ${manifest?.version || 1} pret, ${manifest?.clips?.length || 0} clip(s) a verifier.`,
        queueing: 'Simulation du verrou anti-doublon et de la file Cloud Run.',
        rendering: `Composition ${render.width}x${render.height} a ${render.fps} FPS depuis les sources originales.`,
        encoding: `Preset FFmpeg cible: libx264 ${render.preset}, CRF ${render.crf}, AAC ${Math.round((render.audioBitrate || 0) / 1000)}k.`,
        finalizing: 'Simulation upload Storage, sauvegarde manifeste et lien de telechargement.',
    };

    return {
        at: new Date().toISOString(),
        level: phase.id === 'rendering' ? 'info' : 'neutral',
        message: messages[phase.id] || phase.label,
    };
}

function estimateRemainingMs(progress, startedAt) {
    if (progress <= 0) return null;
    const elapsed = Date.now() - startedAt;
    return Math.max(0, Math.round((elapsed / progress) * (100 - progress)));
}

function assertNotCancelled(signal) {
    if (signal?.aborted) {
        throw createExportServiceError({
            code: 'job-cancelled',
            message: 'Export annule par l utilisateur.',
            action: 'Relance l export quand le montage est pret.',
        });
    }
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
