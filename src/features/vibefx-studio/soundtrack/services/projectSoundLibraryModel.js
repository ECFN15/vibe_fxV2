import { getAudioExtension, safeSoundtrackId, sanitizeFileName } from './soundtrackManifest';

export const PROJECT_SOUNDTRACK_MAX_BYTES = 150 * 1024 * 1024;

export const PROJECT_TRACK_FIELDS = [
    'id',
    'ownerUid',
    'title',
    'artist',
    'sourceProvider',
    'provider',
    'sourceName',
    'sourceUrl',
    'sourcePageUrl',
    'license',
    'licenseUrl',
    'attribution',
    'contentIdWarning',
    'rightsStatus',
    'storagePath',
    'downloadUrl',
    'previewUrl',
    'duration',
    'bpm',
    'waveform',
    'tags',
    'category',
    'mood',
    'genre',
    'favorite',
    'archived',
    'commercialUse',
    'socialUse',
    'licenseSnapshotVersion',
    'importedAt',
    'updatedAt',
    'lastUsedAt',
];

export const PROJECT_PLAYLIST_FIELDS = [
    'id',
    'ownerUid',
    'name',
    'trackIds',
    'archived',
    'createdAt',
    'updatedAt',
];

const nowIso = () => new Date().toISOString();

const normalizeProjectRightsStatus = (track = {}) => {
    const status = track.rightsStatus || 'needs-review';
    const contentIdKnown = typeof track.contentIdWarning === 'string' && track.contentIdWarning.trim().length > 0;
    if (status === 'cleared-social' && !contentIdKnown) return 'needs-review';
    if (status === 'verified-free') return contentIdKnown ? 'cleared-social' : 'needs-review';
    if (status === 'review') return 'needs-review';
    return status;
};

export function normalizeProjectSoundTrack(track = {}, ownerUid = '') {
    const timestamp = nowIso();
    const provider = track.sourceProvider || track.provider || 'project';
    const tags = Array.isArray(track.tags)
        ? track.tags.filter(Boolean).map(String)
        : String(track.tags || '').split(/\s+/).filter(Boolean);
    return {
        id: track.id || safeSoundtrackId('project-track'),
        ownerUid: track.ownerUid || ownerUid,
        title: track.title || track.name || 'Untitled audio',
        artist: track.artist || '',
        sourceProvider: provider,
        provider,
        sourceName: track.sourceName || provider,
        sourceUrl: track.sourceUrl || track.sourcePageUrl || '',
        sourcePageUrl: track.sourcePageUrl || track.sourceUrl || '',
        license: track.license || '',
        licenseUrl: track.licenseUrl || '',
        attribution: track.attribution || '',
        contentIdWarning: track.contentIdWarning || 'Content ID et droits tiers a verifier avant publication sociale.',
        rightsStatus: normalizeProjectRightsStatus(track),
        storagePath: track.storagePath || '',
        downloadUrl: track.downloadUrl || '',
        previewUrl: track.previewUrl || track.downloadUrl || '',
        duration: Number(track.duration) || 0,
        bpm: Number(track.bpm) || 0,
        waveform: track.waveform || null,
        tags,
        category: track.category || '',
        mood: track.mood || track.genre || tags[0] || '',
        genre: track.genre || track.mood || tags[0] || '',
        favorite: track.favorite === true,
        archived: track.archived === true,
        commercialUse: track.commercialUse === true,
        socialUse: track.socialUse === true,
        licenseSnapshotVersion: track.licenseSnapshotVersion || `${provider}-current`,
        importedAt: track.importedAt || track.addedAt || timestamp,
        updatedAt: track.updatedAt || timestamp,
        lastUsedAt: track.lastUsedAt || '',
    };
}

export function validateProjectTrackRights(track = {}) {
    const missing = [];
    if (!track.sourceName && !track.sourceProvider && !track.provider) missing.push('source');
    if (!track.sourceUrl && !track.sourcePageUrl) missing.push('sourceUrl');
    if (!track.license) missing.push('license');
    if (!track.licenseUrl) missing.push('licenseUrl');
    if (!track.rightsStatus) missing.push('rightsStatus');
    if (track.rightsStatus === 'blocked') missing.push('rightsStatusBlocked');
    return {
        ok: missing.length === 0,
        missing,
    };
}

export function serializeProjectTrack(track = {}) {
    return Object.fromEntries(
        PROJECT_TRACK_FIELDS
            .filter((field) => track[field] !== undefined)
            .map((field) => [field, track[field] ?? ''])
    );
}

export function normalizeProjectSoundPlaylist(playlist = {}, ownerUid = '') {
    const timestamp = nowIso();
    const trackIds = Array.isArray(playlist.trackIds)
        ? Array.from(new Set(playlist.trackIds.filter(Boolean).map(String)))
        : [];
    return {
        id: playlist.id || safeSoundtrackId('project-playlist'),
        ownerUid: playlist.ownerUid || ownerUid,
        name: String(playlist.name || 'Playlist projet').trim() || 'Playlist projet',
        trackIds,
        archived: playlist.archived === true,
        createdAt: playlist.createdAt || timestamp,
        updatedAt: playlist.updatedAt || timestamp,
    };
}

export function serializeProjectPlaylist(playlist = {}) {
    return Object.fromEntries(
        PROJECT_PLAYLIST_FIELDS
            .filter((field) => playlist[field] !== undefined)
            .map((field) => [field, playlist[field] ?? ''])
    );
}

export function addTrackToProjectPlaylist(playlist = {}, trackId = '') {
    if (!trackId) return normalizeProjectSoundPlaylist(playlist);
    const normalized = normalizeProjectSoundPlaylist(playlist);
    if (normalized.trackIds.includes(trackId)) return normalized;
    return {
        ...normalized,
        trackIds: [...normalized.trackIds, trackId],
        updatedAt: nowIso(),
    };
}

export function removeTrackFromProjectPlaylist(playlist = {}, trackId = '') {
    const normalized = normalizeProjectSoundPlaylist(playlist);
    return {
        ...normalized,
        trackIds: normalized.trackIds.filter((id) => id !== trackId),
        updatedAt: nowIso(),
    };
}

export function moveTrackInProjectPlaylist(playlist = {}, trackId = '', direction = 0) {
    const normalized = normalizeProjectSoundPlaylist(playlist);
    const index = normalized.trackIds.indexOf(trackId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= normalized.trackIds.length) return normalized;
    const trackIds = [...normalized.trackIds];
    const [item] = trackIds.splice(index, 1);
    trackIds.splice(nextIndex, 0, item);
    return {
        ...normalized,
        trackIds,
        updatedAt: nowIso(),
    };
}

export function buildProjectSoundStoragePath({ uid, track, contentType = 'audio/mpeg', fileName = '' }) {
    if (!uid) throw new Error('uid_required');
    const normalized = normalizeProjectSoundTrack(track, uid);
    const extension = getAudioExtension(contentType, normalized.downloadUrl || normalized.previewUrl);
    const safeName = sanitizeFileName(fileName || normalized.title).replace(/\.[a-z0-9]{2,5}$/i, '') || 'vibefx-audio';
    return `users/${uid}/soundtrack/${normalized.id}/${safeName}.${extension}`;
}
