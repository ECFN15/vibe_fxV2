import { SOUNDTRACK_MANIFEST_FILE } from '../data/soundtrackDefaults';

export const SOUNDTRACK_SCHEMA_VERSION = 1;

const nowIso = () => new Date().toISOString();

export function createEmptySoundtrackManifest() {
    return {
        schemaVersion: SOUNDTRACK_SCHEMA_VERSION,
        app: 'vibe_fx',
        kind: 'soundtrack-library',
        updatedAt: nowIso(),
        tracks: [],
        playlists: [],
        favorites: [],
    };
}

export function safeSoundtrackId(prefix = 'soundtrack') {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function sanitizeFileName(value = 'vibefx-audio') {
    const cleaned = String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 90);
    return cleaned || 'vibefx-audio';
}

export function getAudioExtension(mime = '', fallbackUrl = '') {
    const lowerMime = String(mime).toLowerCase();
    if (lowerMime.includes('mpeg') || lowerMime.includes('mp3')) return 'mp3';
    if (lowerMime.includes('wav')) return 'wav';
    if (lowerMime.includes('ogg')) return 'ogg';
    if (lowerMime.includes('aac')) return 'aac';
    if (lowerMime.includes('webm')) return 'webm';
    const match = String(fallbackUrl).split('?')[0].match(/\.([a-z0-9]{2,5})$/i);
    return match?.[1]?.toLowerCase() || 'mp3';
}

export function normalizeSoundtrackTrack(track = {}) {
    const timestamp = nowIso();
    const id = track.id || safeSoundtrackId('track');
    const tags = Array.isArray(track.tags)
        ? track.tags.filter(Boolean).map(String)
        : String(track.tags || '').split(/\s+/).filter(Boolean);

    return {
        id,
        providerTrackId: track.providerTrackId || '',
        title: track.title || track.name || 'Untitled audio',
        artist: track.artist || '',
        provider: track.provider || 'user',
        sourceName: track.sourceName || track.provider || 'Import utilisateur',
        sourceUrl: track.sourceUrl || '',
        license: track.license || 'Licence a verifier',
        licenseUrl: track.licenseUrl || '',
        attribution: track.attribution || '',
        contentIdWarning: track.contentIdWarning || '',
        duration: Number(track.duration) || 0,
        bpm: Number(track.bpm) || 0,
        tags,
        category: track.category || track.genre || track.mood || tags[0] || '',
        mood: track.mood || track.genre || tags[0] || '',
        genre: track.genre || track.mood || tags[0] || '',
        fileName: track.fileName || '',
        localPathHint: track.localPathHint || '',
        localObjectUrl: track.localObjectUrl || '',
        downloadUrl: track.downloadUrl || track.url || '',
        previewUrl: track.previewUrl || track.url || track.downloadUrl || '',
        audioUrl: track.audioUrl || track.downloadUrl || track.previewUrl || track.url || '',
        importStatus: track.importStatus || (track.downloadUrl || track.previewUrl || track.audioUrl ? 'importable' : 'metadata-only'),
        blockedReason: track.blockedReason || '',
        sourcePageUrl: track.sourcePageUrl || track.sourceUrl || '',
        favorite: track.favorite === true,
        addedAt: track.addedAt || timestamp,
        updatedAt: track.updatedAt || timestamp,
        rightsStatus: track.rightsStatus || 'needs-review',
        commercialUse: track.commercialUse === true,
        socialUse: track.socialUse === true,
        licenseSnapshotVersion: track.licenseSnapshotVersion || 'local-current',
        fileAvailable: track.fileAvailable === true,
        missingReason: track.missingReason || '',
        waveform: track.waveform || null,
    };
}

export function normalizeSoundtrackPlaylist(playlist = {}) {
    const timestamp = nowIso();
    return {
        id: playlist.id || safeSoundtrackId('playlist'),
        name: playlist.name || 'Playlist',
        trackIds: Array.isArray(playlist.trackIds) ? playlist.trackIds.filter(Boolean).map(String) : [],
        createdAt: playlist.createdAt || timestamp,
        updatedAt: playlist.updatedAt || timestamp,
    };
}

export function normalizeSoundtrackManifest(raw = {}) {
    const manifest = typeof raw === 'object' && raw ? raw : {};
    const tracks = Array.isArray(manifest.tracks) ? manifest.tracks.map(normalizeSoundtrackTrack) : [];
    const trackIds = new Set(tracks.map((track) => track.id));
    const playlists = Array.isArray(manifest.playlists)
        ? manifest.playlists.map(normalizeSoundtrackPlaylist).map((playlist) => ({
            ...playlist,
            trackIds: playlist.trackIds.filter((id) => trackIds.has(id)),
        }))
        : [];
    const favorites = Array.isArray(manifest.favorites)
        ? manifest.favorites.filter((id) => trackIds.has(id)).map(String)
        : tracks.filter((track) => track.favorite).map((track) => track.id);

    return {
        ...createEmptySoundtrackManifest(),
        ...manifest,
        schemaVersion: Number(manifest.schemaVersion) || SOUNDTRACK_SCHEMA_VERSION,
        app: 'vibe_fx',
        kind: 'soundtrack-library',
        updatedAt: manifest.updatedAt || nowIso(),
        tracks: tracks.map((track) => ({ ...track, favorite: favorites.includes(track.id) })),
        playlists,
        favorites,
    };
}

export function buildSoundtrackManifest({ tracks = [], playlists = [] }) {
    const normalizedTracks = tracks.map(normalizeSoundtrackTrack);
    return {
        ...createEmptySoundtrackManifest(),
        tracks: normalizedTracks.map(({ localObjectUrl, file, blob, ...track }) => track),
        playlists: playlists.map(normalizeSoundtrackPlaylist),
        favorites: normalizedTracks.filter((track) => track.favorite).map((track) => track.id),
    };
}

export async function parseManifestFile(file) {
    const text = await file.text();
    return normalizeSoundtrackManifest(JSON.parse(text));
}

export function manifestDownloadName() {
    return SOUNDTRACK_MANIFEST_FILE;
}
