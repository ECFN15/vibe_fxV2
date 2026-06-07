export const RENDER_QUEUE_STATUSES = ['queued', 'rendering', 'completed', 'failed', 'cancelled'];

export function createRenderQueueItem({ settings, manifest = null, source = 'local', now = new Date() } = {}) {
    const id = `render-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
        id,
        source,
        status: 'queued',
        progress: 0,
        settings,
        manifest,
        logs: [{ at: now.toISOString(), level: 'info', message: 'Added to render queue.' }],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
    };
}

export function transitionRenderQueueItem(item = {}, status = 'queued', updates = {}, now = new Date()) {
    if (!RENDER_QUEUE_STATUSES.includes(status)) {
        throw new Error(`Unsupported render queue status: ${status}`);
    }
    const progress = status === 'completed'
        ? 100
        : status === 'queued'
            ? Math.max(0, Number(updates.progress ?? item.progress ?? 0))
            : Math.max(0, Math.min(99, Number(updates.progress ?? item.progress ?? 0)));
    return {
        ...item,
        ...updates,
        status,
        progress,
        updatedAt: now.toISOString(),
        logs: [
            ...(item.logs || []),
            { at: now.toISOString(), level: status === 'failed' ? 'error' : 'info', message: updates.message || `Status: ${status}` },
        ],
    };
}
