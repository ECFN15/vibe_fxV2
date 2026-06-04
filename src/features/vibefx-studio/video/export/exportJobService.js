import { prepareExportSources, resolveExportStorageMode } from './exportStorageService';
import { runExportRenderer, resolveExportRenderMode } from './exportRenderService';

export const VIDEO_EXPORT_JOB_STATUSES = {
    draft: 'draft',
    preparingSources: 'preparing_sources',
    queued: 'queued',
    rendering: 'rendering',
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
            logs: appendLog(job.logs, 'Job renderer localMock cree.', 'info'),
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

export function retryVideoExportJob({ manifest, mode, signal, onUpdate } = {}) {
    return startVideoExportJob({ manifest, mode, signal, onUpdate });
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
