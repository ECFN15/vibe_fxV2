import { MUSIC_PROVIDERS, getCuratedTracks } from '../../video/data/musicCatalog';

export const SOUNDTRACK_MANIFEST_FILE = 'vibefx-soundtrack.json';
export const SOUNDTRACK_FOLDER_NAME = 'Vibe_fx Soundtrack';
export const SOUNDTRACK_DB_NAME = 'vibefx-soundtrack-local';
export const SOUNDTRACK_DB_VERSION = 1;
export const PIXABAY_MUSIC_URL = 'https://pixabay.com/music/';
export const PIXABAY_CONTENT_LICENSE_URL = 'https://pixabay.com/service/license-summary/';
export const AITRA_FREE_URL = 'https://aitrafree.com/en';
export const AITRA_FREE_TRACKS_URL = 'https://aitrafree.com/en/tracks';
export const AITRA_FREE_TERMS_URL = 'https://aitrafree.com/en/terms';

export const SOUNDTRACK_PROVIDERS = [
    {
        id: 'aitra-free',
        label: 'Aitra Free',
        mediaType: 'ai-music/free-catalog',
        status: 'free-catalog',
        enabled: true,
        searchEnabled: false,
        generationEnabled: false,
        note: 'Banque dense de musiques IA gratuites: importer une page piste Aitra, une URL audio officielle ou un fichier MP3 telecharge.',
        officialDocsUrl: AITRA_FREE_TRACKS_URL,
        licenseUrl: AITRA_FREE_TERMS_URL,
        licenseLabel: 'Aitra Free Terms of Service',
    },
    {
        id: 'pixabay',
        label: 'Pixabay Music',
        mediaType: 'music',
        status: 'manual-exception',
        enabled: true,
        searchEnabled: true,
        note: 'Exception manuelle: scan borne Pixabay Music + import fichier/URL directe, sans generaliser aux autres providers.',
        officialDocsUrl: 'https://pixabay.com/music/',
    },
    {
        id: 'openverse',
        label: 'Openverse Audio',
        mediaType: 'audio',
        status: 'active',
        enabled: true,
        searchEnabled: true,
        note: 'Openverse resserre pour video sociale: source Jamendo prioritaire + recherches par style musical moderne.',
        officialDocsUrl: 'https://api.openverse.org/v1/#tag/audio',
    },
    {
        id: 'jamendo',
        label: 'Jamendo Music',
        mediaType: 'music',
        status: 'key-required',
        enabled: false,
        searchEnabled: false,
        hiddenWhenMissingKey: true,
        note: 'Official tracks API disponible seulement avec JAMENDO_CLIENT_ID serveur.',
        officialDocsUrl: 'https://developer.jamendo.com/v3.0/tracks',
    },
    {
        id: 'freesound',
        label: 'Freesound',
        mediaType: 'sfx/audio',
        status: 'key-required',
        enabled: false,
        searchEnabled: false,
        hiddenWhenMissingKey: true,
        note: 'Official APIv2 disponible seulement avec FREESOUND_API_KEY serveur.',
        officialDocsUrl: 'https://freesound.org/docs/api/',
    },
    {
        id: 'minimax-music',
        label: 'MiniMax Music',
        mediaType: 'ai-music',
        status: 'provider-missing-key',
        enabled: true,
        searchEnabled: false,
        generationEnabled: true,
        note: 'API officielle MiniMax Music: generation song/instrumental via prompt et lyrics optionnels, sortie audio serveur.',
        officialDocsUrl: 'https://platform.minimax.io/docs/guides/music-generation',
    },
    {
        id: 'mureka',
        label: 'Mureka API',
        mediaType: 'ai-music',
        status: 'provider-missing-key',
        enabled: true,
        searchEnabled: false,
        generationEnabled: true,
        note: 'API officielle Mureka: song, instrumental, lyrics, extension. Import manuel de generations existantes avant adapter automatique.',
        officialDocsUrl: 'https://platform.mureka.ai/docs/',
    },
    {
        id: 'replicate-music',
        label: 'Replicate Music',
        mediaType: 'ai-music/model-hub',
        status: 'provider-missing-key',
        enabled: true,
        searchEnabled: false,
        generationEnabled: true,
        note: 'Hub multi-modeles pour tester MiniMax, MusicGen et autres sorties audio via API.',
        officialDocsUrl: 'https://replicate.com/minimax/music-2.6',
    },
    {
        id: 'elevenlabs-music',
        label: 'ElevenLabs Music',
        mediaType: 'ai-music',
        status: 'provider-missing-key',
        enabled: true,
        searchEnabled: false,
        generationEnabled: true,
        note: 'API officielle ElevenLabs Music cote serveur: prompt, duree, instrumental, C2PA MP3 selon plan.',
        officialDocsUrl: 'https://elevenlabs.io/docs/api-reference/music/compose-detailed',
    },
    {
        id: 'mubert',
        label: 'Mubert API',
        mediaType: 'ai-music',
        status: 'provider-missing-key',
        enabled: true,
        searchEnabled: false,
        generationEnabled: true,
        note: 'API Mubert v3 cote serveur: playlists/channels, duree, intensite, mode, BPM, mp3/wav selon contrat.',
        officialDocsUrl: 'https://mubert.com/api/docs',
    },
];

export const OPENVERSE_QUICK_TAGS = [
    { id: 'cinematic', label: 'cinematic', query: 'cinematic music', sourceFilter: { source: 'jamendo', mediaCategory: 'music' } },
    { id: 'trailer-epic', label: 'trailer / epic', query: 'epic trailer music', sourceFilter: { source: 'jamendo', mediaCategory: 'music' } },
    { id: 'action-trailer', label: 'action trailer', query: 'action cinematic music', sourceFilter: { source: 'jamendo', mediaCategory: 'music' } },
    { id: 'corporate', label: 'corporate / brand', query: 'corporate music', sourceFilter: { source: 'jamendo', mediaCategory: 'music' } },
    { id: 'electronic', label: 'electronic', query: 'electronic music', sourceFilter: { source: 'jamendo', mediaCategory: 'music' } },
    { id: 'house', label: 'house', query: 'house music', sourceFilter: { source: 'jamendo', mediaCategory: 'music' } },
    { id: 'jazz', label: 'jazz', query: 'jazz music', sourceFilter: { source: 'jamendo', mediaCategory: 'music' } },
    { id: 'ambient', label: 'ambient / lounge', query: 'ambient lounge music', sourceFilter: { source: 'jamendo', mediaCategory: 'music' } },
    { id: 'lofi', label: 'lofi', query: 'lofi hip hop music', sourceFilter: { source: 'jamendo', mediaCategory: 'music' } },
    { id: 'hiphop', label: 'hip hop', query: 'hip hop music', sourceFilter: { source: 'jamendo', mediaCategory: 'music' } },
    { id: 'funk', label: 'funk', query: 'funk music', sourceFilter: { source: 'jamendo', mediaCategory: 'music' } },
    { id: 'rock', label: 'rock', query: 'rock music', sourceFilter: { source: 'jamendo', mediaCategory: 'music' } },
    { id: 'short-commercial', label: 'short commercial', query: 'upbeat music', sourceFilter: { source: 'jamendo', mediaCategory: 'music', licenseType: 'commercial', length: 'short' } },
    { id: 'impact-whoosh', label: 'impact / whoosh', query: 'impact cinematic sound', sourceFilter: { source: 'freesound', length: 'short' } },
];

export const JAMENDO_QUICK_TAGS = [
    { id: 'instrumental', label: 'instrumental', query: 'instrumental' },
    { id: 'lounge', label: 'lounge', query: 'lounge' },
    { id: 'classical', label: 'classical', query: 'classical' },
    { id: 'electronic', label: 'electronic', query: 'electronic' },
    { id: 'jazz', label: 'jazz', query: 'jazz' },
    { id: 'pop', label: 'pop', query: 'pop' },
    { id: 'hiphop', label: 'hiphop', query: 'hiphop' },
    { id: 'relaxation', label: 'relaxation', query: 'relaxation' },
    { id: 'rock', label: 'rock', query: 'rock' },
    { id: 'soundtrack', label: 'soundtrack', query: 'soundtrack' },
];

export const FREESOUND_QUICK_TAGS = [
    { id: 'loop', label: 'loop', query: 'loop' },
    { id: 'field-recording', label: 'field recording', query: 'field-recording' },
    { id: 'ambience', label: 'ambience', query: 'ambience' },
    { id: 'foley', label: 'foley', query: 'foley' },
    { id: 'whoosh', label: 'whoosh', query: 'whoosh' },
    { id: 'transition', label: 'transition', query: 'transition' },
    { id: 'drone', label: 'drone', query: 'drone' },
    { id: 'glitch', label: 'glitch', query: 'glitch' },
    { id: 'percussion', label: 'percussion', query: 'percussion' },
    { id: 'water', label: 'water', query: 'water' },
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

export const AI_VIBECUT_PRESET_TAGS = [
    { id: 'cinematic', label: 'cinematic', query: 'cinematic background music for a polished social video, clean edit points', promptPreset: true },
    { id: 'trailer-epic', label: 'trailer / epic', query: 'epic trailer music with cinematic drums, rising tension, bold impacts, no vocals', promptPreset: true },
    { id: 'action-trailer', label: 'action trailer', query: 'fast action trailer cue, punchy percussion, risers, impacts, energetic cuts', promptPreset: true },
    { id: 'corporate-brand', label: 'corporate / brand', query: 'modern optimistic brand music, confident corporate pulse, clean synths and light percussion', promptPreset: true },
    { id: 'fashion-club', label: 'fashion / club', query: 'stylish fashion show club track, glossy electronic groove, premium nightlife energy', promptPreset: true },
    { id: 'short-commercial', label: 'short commercial', query: 'short commercial bed for social ad, upbeat hook, quick intro and clean ending', promptPreset: true },
    { id: 'electronic', label: 'electronic', query: 'electronic social video music, tight drums, modern synth bass, polished mix', promptPreset: true },
    { id: 'house', label: 'house', query: 'house music loop for reels, steady four-on-the-floor, warm chords, clean drop', promptPreset: true },
    { id: 'hip-hop', label: 'hip hop', query: 'hip hop beat for short-form video, punchy drums, bass groove, instrumental', promptPreset: true },
    { id: 'jazz', label: 'jazz', query: 'modern jazz background, tasteful chords, brushed drums, social video underscore', promptPreset: true },
    { id: 'funk', label: 'funk', query: 'funk', promptPreset: true },
    { id: 'rock', label: 'rock', query: 'driving rock instrumental for video montage, energetic drums and guitars', promptPreset: true },
    { id: 'lofi', label: 'lofi', query: 'lofi beat for calm social video, warm texture, relaxed groove, instrumental', promptPreset: true },
    { id: 'ambient-lounge', label: 'ambient / lounge', query: 'ambient lounge bed, smooth texture, subtle pulse, elegant background music', promptPreset: true },
    { id: 'impact-whoosh', label: 'impact / whoosh', query: 'short impact and whoosh transition sound design for social video edit', promptPreset: true },
    { id: 'riser-transition', label: 'riser / transition', query: 'short riser transition with clean sweep and ending impact', promptPreset: true },
    { id: 'intro-opener', label: 'intro / opener', query: 'short opener sting, premium intro cue, clean logo reveal energy', promptPreset: true },
    { id: 'podcast-talk-bed', label: 'podcast / talk bed', query: 'low-distraction podcast talk bed, subtle rhythm, warm background, no vocals', promptPreset: true },
    { id: 'luxury-premium', label: 'luxury / premium', query: 'luxury premium brand music, minimal elegant groove, refined cinematic tone', promptPreset: true },
    { id: 'tech-futuristic', label: 'tech / futuristic', query: 'futuristic tech product music, precise synth pulses, clean modern sound', promptPreset: true },
    { id: 'emotional-inspiring', label: 'emotional / inspiring', query: 'emotional inspiring soundtrack, hopeful progression, cinematic but restrained', promptPreset: true },
];

export const AITRA_FREE_QUICK_TAGS = [
    { id: 'rock', label: 'rock', query: 'rock' },
    { id: 'pop', label: 'pop', query: 'pop' },
    { id: 'metal-hardcore', label: 'metal / hardcore', query: 'metal hardcore' },
    { id: 'punk', label: 'punk', query: 'punk' },
    { id: 'healing-world', label: 'healing / world', query: 'healing world music' },
    { id: 'dance', label: 'dance', query: 'dance' },
    { id: 'cinematic', label: 'epic / cinematic', query: 'epic' },
    { id: 'japanese-vocal', label: 'japanese vocal', query: 'japanese vocal' },
    { id: 'english-vocal', label: 'english vocal', query: 'english vocal' },
    { id: 'up-tempo', label: 'up tempo', query: 'up tempo' },
    { id: 'mid-tempo', label: 'mid tempo', query: 'mid tempo' },
    { id: 'slow-tempo', label: 'slow tempo', query: 'slow tempo' },
    { id: 'energetic', label: 'energetic', query: 'energetic' },
    { id: 'stylish', label: 'stylish', query: 'stylish' },
    { id: 'rap', label: 'rap', query: 'rap' },
];

export const SOUNDTRACK_CATEGORY_TAGS = OPENVERSE_QUICK_TAGS;

export const SOUNDTRACK_PROVIDER_QUICK_TAGS = {
    'aitra-free': AITRA_FREE_QUICK_TAGS,
    pixabay: PIXABAY_QUICK_TAGS,
    openverse: OPENVERSE_QUICK_TAGS,
    jamendo: JAMENDO_QUICK_TAGS,
    freesound: FREESOUND_QUICK_TAGS,
    'minimax-music': AI_VIBECUT_PRESET_TAGS,
    mureka: AI_VIBECUT_PRESET_TAGS,
    'replicate-music': AI_VIBECUT_PRESET_TAGS,
    'elevenlabs-music': AI_VIBECUT_PRESET_TAGS,
    'stable-audio': AI_VIBECUT_PRESET_TAGS,
    loudly: AI_VIBECUT_PRESET_TAGS,
    mubert: AI_VIBECUT_PRESET_TAGS,
    soundraw: AI_VIBECUT_PRESET_TAGS,
    beatoven: AI_VIBECUT_PRESET_TAGS,
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
