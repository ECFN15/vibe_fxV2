import { MUSIC_GENRES, MUSIC_PROVIDERS, getCuratedTracks } from '../../video/data/musicCatalog';

export const SOUNDTRACK_MANIFEST_FILE = 'vibefx-soundtrack.json';
export const SOUNDTRACK_FOLDER_NAME = 'Vibe_fx Soundtrack';
export const SOUNDTRACK_DB_NAME = 'vibefx-soundtrack-local';
export const SOUNDTRACK_DB_VERSION = 1;

export const SOUNDTRACK_PROVIDERS = [
    { id: 'all', label: 'Toutes sources' },
    { id: 'starter', label: 'Starter local' },
    { id: 'pixabay', label: 'Pixabay manuel' },
    { id: 'openverse', label: 'Openverse' },
    { id: 'jamendo', label: 'Jamendo' },
    { id: 'freesound', label: 'Freesound' },
    { id: 'archive', label: 'Archive' },
    { id: 'wikimedia', label: 'Wikimedia' },
];

export const SOUNDTRACK_LICENSE_FILTERS = [
    { id: '', label: 'Toutes licences' },
    { id: 'cleared-social', label: 'Cleared social' },
    { id: 'credit-required', label: 'Credit requis' },
    { id: 'user-declared', label: 'Declare utilisateur' },
    { id: 'review', label: 'A verifier' },
];

export const SOUNDTRACK_MOOD_FILTERS = [
    { id: '', label: 'Tous moods' },
    { id: 'ambient', label: 'Ambient' },
    { id: 'cinematic', label: 'Cinematique' },
    { id: 'chill', label: 'Chill' },
    { id: 'epic', label: 'Epique' },
    { id: 'electronic', label: 'Electronique' },
    { id: 'beats', label: 'Beats' },
];

export const SOUNDTRACK_BPM_FILTERS = [
    { id: '', label: 'Tout BPM' },
    { id: 'slow', label: '< 90' },
    { id: 'mid', label: '90-130' },
    { id: 'fast', label: '> 130' },
];

export const SOUNDTRACK_DURATION_FILTERS = [
    { id: '', label: 'Toute duree' },
    { id: 'short', label: '< 1 min' },
    { id: 'medium', label: '1-4 min' },
    { id: 'long', label: '> 4 min' },
];

export const SOUNDTRACK_GENRES = MUSIC_GENRES;
export const SOUNDTRACK_PROVIDER_CARDS = MUSIC_PROVIDERS;

export function getStarterSoundtrackTracks(query = '', genre = '') {
    return getCuratedTracks(query, genre).map((track) => ({
        ...track,
        id: `starter-${track.id}`,
        provider: track.provider || 'white-bat-audio',
        sourceName: track.sourceName || 'White Bat Audio',
        downloadUrl: track.downloadUrl || track.url || track.previewUrl,
        previewUrl: track.previewUrl || track.url,
        mood: track.genre || '',
        tags: Array.isArray(track.tags) ? track.tags : String(track.tags || '').split(/\s+/).filter(Boolean),
    }));
}
