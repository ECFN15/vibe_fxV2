import { MUSIC_PROVIDERS, getCuratedTracks } from '../../video/data/musicCatalog';

export const SOUNDTRACK_MANIFEST_FILE = 'vibefx-soundtrack.json';
export const SOUNDTRACK_FOLDER_NAME = 'Vibe_fx Soundtrack';
export const SOUNDTRACK_DB_NAME = 'vibefx-soundtrack-local';
export const SOUNDTRACK_DB_VERSION = 1;
export const PIXABAY_MUSIC_URL = 'https://pixabay.com/music/';
export const PIXABAY_CONTENT_LICENSE_URL = 'https://pixabay.com/service/license-summary/';

export const SOUNDTRACK_PROVIDERS = [
    { id: 'openverse', label: 'Openverse', mediaType: 'audio', status: 'active', enabled: true },
    { id: 'pixabay', label: 'Pixabay Music', mediaType: 'music', status: 'page-scan-controlled', enabled: true },
    { id: 'jamendo', label: 'Jamendo', mediaType: 'music', status: 'coming-soon', enabled: false },
    { id: 'freesound', label: 'Freesound', mediaType: 'sfx/audio', status: 'coming-soon', enabled: false },
    { id: 'archive', label: 'Archive', mediaType: 'audio', status: 'coming-soon', enabled: false },
    { id: 'wikimedia', label: 'Wikimedia', mediaType: 'audio', status: 'coming-soon', enabled: false },
];

export const OPENVERSE_QUICK_TAGS = [
    { id: 'music', label: 'musique', query: 'music' },
    { id: 'instrumental', label: 'instrumental', query: 'instrumental music' },
    { id: 'ambient', label: 'ambient', query: 'ambient music' },
    { id: 'cinematic', label: 'cinematic', query: 'cinematic music' },
    { id: 'piano', label: 'piano', query: 'piano music' },
    { id: 'electronic', label: 'electronic', query: 'electronic music' },
    { id: 'jazz', label: 'jazz', query: 'jazz music' },
    { id: 'podcast', label: 'podcast', query: 'podcast intro' },
    { id: 'field-recording', label: 'field recording', query: 'field recording' },
    { id: 'sound-effect', label: 'sound effect', query: 'sound effect' },
];

export const PIXABAY_QUICK_TAGS = [
    { id: 'free-music', label: 'musique gratuite', query: 'free music' },
    { id: 'instrumental', label: 'instrumental', query: 'instrumental' },
    { id: 'spring', label: 'spring', query: 'spring' },
    { id: 'piano', label: 'piano', query: 'piano' },
    { id: 'motivation', label: 'motivation', query: 'motivation' },
    { id: 'chill', label: 'chill', query: 'chill' },
    { id: 'epic', label: 'epic', query: 'epic' },
    { id: 'relaxation', label: 'relaxation', query: 'relaxation' },
    { id: 'ringtone', label: 'sonnerie', query: 'ringtone' },
    { id: 'corporate', label: 'corporate', query: 'corporate' },
    { id: 'sport', label: 'sport', query: 'sport' },
];

export const SOUNDTRACK_CATEGORY_TAGS = OPENVERSE_QUICK_TAGS;

export const SOUNDTRACK_PROVIDER_QUICK_TAGS = {
    openverse: OPENVERSE_QUICK_TAGS,
    pixabay: PIXABAY_QUICK_TAGS,
};

export function getSoundtrackProviderQuickTags(provider = 'openverse') {
    return SOUNDTRACK_PROVIDER_QUICK_TAGS[provider] || OPENVERSE_QUICK_TAGS;
}

export function buildPixabayMusicSearchUrl(tagOrQuery = '') {
    const rawQuery = typeof tagOrQuery === 'object'
        ? tagOrQuery.query || tagOrQuery.id || tagOrQuery.label
        : tagOrQuery;
    const query = String(rawQuery || '').trim();
    if (!query) return PIXABAY_MUSIC_URL;
    return `${PIXABAY_MUSIC_URL}search/${encodeURIComponent(query).replace(/%20/g, '+')}/`;
}

export const SOUNDTRACK_PROVIDER_CARDS = MUSIC_PROVIDERS;

export function getStarterSoundtrackTracks(query = '', genre = '') {
    return getCuratedTracks(query, genre).map((track) => ({
        ...track,
        id: `starter-${track.id}`,
        provider: track.provider || 'white-bat-audio',
        sourceProvider: track.provider || 'white-bat-audio',
        sourceName: track.sourceName || 'White Bat Audio',
        sourcePageUrl: track.sourceUrl || 'https://whitebataudio.com/',
        downloadUrl: track.downloadUrl || track.url || track.previewUrl,
        previewUrl: track.previewUrl || track.url,
        audioUrl: track.previewUrl || track.url,
        importStatus: 'importable',
        fileAvailable: true,
        mood: track.genre || '',
        tags: Array.isArray(track.tags) ? track.tags : String(track.tags || '').split(/\s+/).filter(Boolean),
    }));
}
