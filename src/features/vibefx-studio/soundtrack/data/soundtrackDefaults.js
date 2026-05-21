import { MUSIC_PROVIDERS, getCuratedTracks } from '../../video/data/musicCatalog';

export const SOUNDTRACK_MANIFEST_FILE = 'vibefx-soundtrack.json';
export const SOUNDTRACK_FOLDER_NAME = 'Vibe_fx Soundtrack';
export const SOUNDTRACK_DB_NAME = 'vibefx-soundtrack-local';
export const SOUNDTRACK_DB_VERSION = 1;

export const SOUNDTRACK_PROVIDERS = [
    { id: 'openverse', label: 'Openverse', mediaType: 'audio', status: 'active', enabled: true },
    { id: 'pixabay', label: 'Pixabay Music', mediaType: 'music', status: 'page-scan-blocked', enabled: false },
    { id: 'jamendo', label: 'Jamendo', mediaType: 'music', status: 'coming-soon', enabled: false },
    { id: 'freesound', label: 'Freesound', mediaType: 'sfx/audio', status: 'coming-soon', enabled: false },
    { id: 'archive', label: 'Archive', mediaType: 'audio', status: 'coming-soon', enabled: false },
    { id: 'wikimedia', label: 'Wikimedia', mediaType: 'audio', status: 'coming-soon', enabled: false },
];

export const SOUNDTRACK_CATEGORY_TAGS = [
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

export const PIXABAY_QUICK_TAGS = SOUNDTRACK_CATEGORY_TAGS;
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
