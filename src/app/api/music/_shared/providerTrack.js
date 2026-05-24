const LICENSE_SNAPSHOT_DATE = '2026-05-22';

const toSeconds = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.round(number));
};

export const safeProviderTrackId = (provider, id = '') => (
    `${provider}-${String(id || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80)}`
);

export function normalizeAiProviderTrack(track = {}) {
    const provider = track.provider || 'ai-music';
    const title = track.title || track.name || `${track.providerLabel || provider} generation`;
    const audioUrl = track.audioUrl || track.downloadUrl || track.previewUrl || '';
    const licenseUrl = track.licenseUrl || track.termsUrl || '';

    return {
        id: safeProviderTrackId(provider, track.id || track.providerTrackId || title),
        provider,
        providerTrackId: track.providerTrackId || track.id || '',
        title,
        artist: track.artist || track.providerLabel || track.sourceName || provider,
        duration: toSeconds(track.duration || track.durationSeconds),
        image: track.image || '',
        genre: track.genre || track.category || '',
        tags: Array.isArray(track.tags) ? track.tags.filter(Boolean).map(String) : [],
        previewUrl: audioUrl,
        downloadUrl: audioUrl,
        audioUrl,
        downloadAllowed: Boolean(audioUrl),
        importStatus: audioUrl ? 'importable' : 'metadata-only',
        sourceName: track.sourceName || track.providerLabel || provider,
        sourceUrl: track.sourceUrl || track.officialDocsUrl || '',
        sourcePageUrl: track.sourcePageUrl || track.sourceUrl || track.officialDocsUrl || '',
        license: track.license || 'AI provider commercial license',
        licenseUrl,
        attribution: track.attribution || '',
        rightsStatus: track.rightsStatus || 'ai-generated',
        commercialUse: track.commercialUse === true,
        socialUse: track.socialUse === true,
        contentIdWarning: track.contentIdWarning || 'Conserver la preuve fournisseur et verifier les restrictions Content ID avant publication.',
        licenseSnapshotVersion: track.licenseSnapshotVersion || `${provider}-${LICENSE_SNAPSHOT_DATE}`,
        prompt: track.prompt || '',
        category: track.category || '',
        bpm: Number(track.bpm) || 0,
        generationMetadata: track.generationMetadata || {},
    };
}

export function buildAiProviderStatus(provider, patch = {}) {
    return {
        id: provider.id,
        label: provider.label,
        mediaType: provider.mediaType || 'ai-music',
        type: provider.type || 'generation-ai',
        status: patch.status || provider.status,
        configured: patch.configured ?? provider.configured,
        enabled: patch.enabled ?? provider.enabled,
        searchEnabled: false,
        generationEnabled: provider.generationEnabled === true,
        count: patch.count || 0,
        importable: patch.importable || 0,
        error: patch.error || '',
        officialDocsUrl: provider.officialDocsUrl,
        licenseUrl: provider.licenseUrl,
        filters: provider.filters || [],
        controls: provider.controls || {},
        presets: provider.presets || [],
        defaultDurationSeconds: provider.defaultDurationSeconds || 20,
        maxDurationSeconds: provider.maxDurationSeconds || 180,
        note: provider.note || '',
    };
}
