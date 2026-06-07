import { createExportServiceError, prepareExportSources, resolveExportStorageMode } from './exportStorageService';
import { runExportRenderer, resolveExportRenderMode } from './exportRenderService';

export const VIDEO_EXPORT_JOB_STATUSES = {
    draft: 'draft',
    preparingSources: 'preparing_sources',
    queued: 'queued',
    rendering: 'rendering',
    retrying: 'retrying',
    finalizing: 'finalizing',
    ready: 'ready',
    failed: 'failed',
    cancelled: 'cancelled',
};

export function createVideoExportJobRecord({ manifest, mode = 'localMock' } = {}) {
    const now = new Date().toISOString();
    const id = `video-export-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    return {
        id,
        manifestVersion: manifest?.version || 1,
        projectId: manifest?.project?.id || null,
        projectName: manifest?.project?.name || 'Untitled',
        qualityMode: manifest?.render?.qualityMode || 'pro',
        mode,
        status: VIDEO_EXPORT_JOB_STATUSES.draft,
        phase: 'preflight',
        phaseLabel: 'Preflight',
        stepLabel: 'Job cree localement',
        progress: 0,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        output: null,
        error: null,
        logs: [],
        estimates: manifest?.estimates || null,
        render: manifest?.render || null,
        manifest,
    };
}

export async function startVideoExportJob({ manifest, mode = resolveExportRenderMode(), signal, onUpdate } = {}) {
    const storageMode = mode === 'localMock' ? 'localMock' : resolveExportStorageMode();
    let job = createVideoExportJobRecord({ manifest, mode });

    const publish = (patch = {}) => {
        job = {
            ...job,
            ...patch,
            updatedAt: new Date().toISOString(),
            logs: patch.logs || job.logs,
        };
        onUpdate?.(job);
        return job;
    };

    try {
        publish({
            status: VIDEO_EXPORT_JOB_STATUSES.preparingSources,
            phase: 'preparing_sources',
            phaseLabel: 'Preparation des sources',
            stepLabel: 'Generation manifeste et verification sources',
            progress: 1,
        });

        const prepared = await prepareExportSources({
            manifest,
            mode: storageMode,
            onProgress: (update) => publish({
                status: VIDEO_EXPORT_JOB_STATUSES.preparingSources,
                ...update,
                logs: appendLog(job.logs, update.stepLabel, 'neutral'),
            }),
        });

        publish({
            status: VIDEO_EXPORT_JOB_STATUSES.queued,
            phase: 'queueing',
            phaseLabel: 'Mise en file de rendu',
            stepLabel: 'Creation job renderer',
            progress: 16,
            logs: appendLog(job.logs, mode === 'localMock' ? 'Job renderer localMock cree.' : 'Job renderer Firebase cree.', 'info'),
            warnings: prepared.warnings || [],
        });

        const rendered = await runExportRenderer({
            job,
            manifest: prepared.manifest,
            mode,
            signal,
            onProgress: (update) => publish(update),
        });

        const renderedStatus = rendered.status || VIDEO_EXPORT_JOB_STATUSES.ready;
        const terminal = [
            VIDEO_EXPORT_JOB_STATUSES.ready,
            VIDEO_EXPORT_JOB_STATUSES.failed,
            VIDEO_EXPORT_JOB_STATUSES.cancelled,
        ].includes(renderedStatus);

        return publish({
            ...rendered,
            status: renderedStatus,
            completedAt: terminal ? new Date().toISOString() : null,
        });
    } catch (error) {
        const cancelled = error.code === 'job-cancelled' || signal?.aborted;
        return publish({
            status: cancelled ? VIDEO_EXPORT_JOB_STATUSES.cancelled : VIDEO_EXPORT_JOB_STATUSES.failed,
            phase: cancelled ? 'cancelled' : 'failed',
            phaseLabel: cancelled ? 'Annule' : 'Echec export',
            stepLabel: error.message || 'Erreur export',
            progress: cancelled ? job.progress : Math.max(job.progress || 0, 1),
            completedAt: new Date().toISOString(),
            error: {
                code: error.code || 'export-job-failed',
                message: error.message || 'Erreur export inconnue.',
                action: error.action || 'Verifie les sources et relance l export.',
            },
            logs: appendLog(job.logs, error.message || 'Erreur export', cancelled ? 'warning' : 'error'),
        });
    }
}

export function retryVideoExportJob({ jobId, manifest, mode = resolveExportRenderMode(), signal, onUpdate } = {}) {
    if ((mode === 'firebase' || mode === 'server') && jobId) {
        return retryFirebaseVideoExportJob({ jobId, signal, onUpdate });
    }
    return startVideoExportJob({ manifest, mode, signal, onUpdate });
}

async function retryFirebaseVideoExportJob({ jobId, signal, onUpdate } = {}) {
    const [{ functions, firebaseReady }, { httpsCallable }] = await Promise.all([
        import('@/lib/firebase'),
        import('firebase/functions'),
    ]);

    if (!firebaseReady || !functions) {
        throw createExportServiceError({
            code: 'firebase-functions-not-configured',
            message: 'Firebase Functions n est pas configure pour relancer Export Pro.',
            action: 'Verifie Firebase ou relance en simulation locale.',
        });
    }
    assertNotCancelled(signal);
    onUpdate?.({
        id: jobId,
        mode: 'firebase',
        status: VIDEO_EXPORT_JOB_STATUSES.retrying,
        phase: 'retrying',
        phaseLabel: 'Relance export',
        stepLabel: 'Callable retryVideoExportJob appelee.',
        progress: 18,
        logs: [{
            at: new Date().toISOString(),
            level: 'info',
            message: 'Relance serveur depuis le manifest stocke.',
        }],
    });

    try {
        const callable = httpsCallable(functions, 'retryVideoExportJob');
        const result = await callable({ jobId });
        assertNotCancelled(signal);
        const data = result.data || {};
        if (data.status === 'failed') {
            throw createExportServiceError({
                code: data.error?.code || 'firebase-retry-failed',
                message: data.error?.message || 'La relance Firebase a echoue.',
                action: data.error?.action || 'Consulte les logs Firestore du job export.',
            });
        }
        return normalizeVideoExportJob({
            ...data,
            id: data.jobId || jobId,
            mode: 'firebase',
            projectName: data.projectName || 'Export Pro',
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        if (error.code?.startsWith?.('functions/')) {
            throw createExportServiceError({
                code: error.code,
                message: error.message || 'Callable retryVideoExportJob indisponible.',
                action: 'Verifie le deploy Functions, App Check et la configuration Cloud Run.',
                cause: error,
            });
        }
        throw error;
    }
}

export async function getVideoExportDownloadUrl({ jobId } = {}) {
    if (!jobId) {
        throw new Error('jobId export requis pour regenerer une URL de telechargement.');
    }
    const [{ functions, firebaseReady }, { httpsCallable }] = await Promise.all([
        import('@/lib/firebase'),
        import('firebase/functions'),
    ]);

    if (!firebaseReady || !functions) {
        throw new Error('Firebase Functions non configure pour regenerer une URL de telechargement.');
    }

    const callable = httpsCallable(functions, 'getVideoExportDownloadUrl');
    const result = await callable({ jobId });
    return result.data || {};
}

export async function subscribeLatestVideoExportJob({ onUpdate, onError } = {}) {
    const [{ auth, db, firebaseReady }, { onAuthStateChanged }, firestoreSdk] = await Promise.all([
        import('@/lib/firebase'),
        import('firebase/auth'),
        import('firebase/firestore'),
    ]);

    if (!firebaseReady || !auth || !db) {
        onError?.(new Error('Firebase non configure pour suivre les jobs export.'));
        return () => {};
    }

    let unsubscribeSnapshot = () => {};
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        unsubscribeSnapshot();
        unsubscribeSnapshot = () => {};
        if (!user) {
            onUpdate?.(null);
            return;
        }

        const jobsQuery = firestoreSdk.query(
            firestoreSdk.collection(db, 'videoExportJobs'),
            firestoreSdk.where('uid', '==', user.uid),
            firestoreSdk.orderBy('updatedAt', 'desc'),
            firestoreSdk.limit(1)
        );
        unsubscribeSnapshot = firestoreSdk.onSnapshot(
            jobsQuery,
            (snapshot) => {
                const latest = snapshot.docs[0];
                onUpdate?.(latest ? normalizeVideoExportJob({ id: latest.id, ...latest.data() }) : null);
            },
            (error) => onError?.(error)
        );
    });

    return () => {
        unsubscribeSnapshot();
        unsubscribeAuth();
    };
}

export function appendLog(logs = [], message = '', level = 'neutral') {
    if (!message) return logs;
    return [
        ...logs,
        {
            at: new Date().toISOString(),
            level,
            message,
        },
    ].slice(-16);
}

function normalizeVideoExportJob(job = {}) {
    const manifestSummary = job.manifestSummary || {};
    const projectName = job.projectName || manifestSummary.project?.name || job.project?.name || 'Export Pro';
    const estimates = job.estimates || {
        sourceSize: manifestSummary.sourceSizeBytes ? {
            bytes: manifestSummary.sourceSizeBytes,
            label: formatBytes(manifestSummary.sourceSizeBytes),
        } : null,
        cost: manifestSummary.estimatedCostLabel ? {
            eur: manifestSummary.estimatedCostEur || 0,
            label: manifestSummary.estimatedCostLabel,
        } : null,
    };

    return {
        ...job,
        id: job.id,
        projectName,
        estimates,
        mode: job.mode || job.renderer?.mode || 'firebase',
        createdAt: normalizeDateValue(job.createdAt),
        updatedAt: normalizeDateValue(job.updatedAt),
        completedAt: normalizeDateValue(job.completedAt),
        failedAt: normalizeDateValue(job.failedAt),
        cancelledAt: normalizeDateValue(job.cancelledAt),
        logs: (job.logs || []).map((log) => ({
            ...log,
            at: normalizeDateValue(log.at || log.createdAt) || new Date().toISOString(),
        })),
    };
}

function normalizeDateValue(value) {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
    if (typeof value.toDate === 'function') {
        const date = value.toDate();
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }
    return null;
}

function formatBytes(bytes = 0) {
    const value = Number(bytes) || 0;
    if (value <= 0) return '0 Mo';
    return `${(value / 1024 / 1024).toFixed(value > 100 * 1024 * 1024 ? 0 : 1)} Mo`;
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
