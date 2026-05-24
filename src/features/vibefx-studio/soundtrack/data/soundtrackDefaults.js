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
        note: 'Catalogue Pixabay Music complet: familles creatives, sous-themes video et scan borne par recherche officielle.',
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

export const PIXABAY_THEME_GROUPS = [
    { id: 'video', label: 'Usage video' },
    { id: 'cinematic', label: 'Cinematique' },
    { id: 'mood', label: 'Humeurs' },
    { id: 'genre', label: 'Genres' },
    { id: 'movement', label: 'Mouvement' },
    { id: 'theme', label: 'Themes' },
    { id: 'format', label: 'Formats' },
    { id: 'duration', label: 'Duree' },
    { id: 'content', label: 'Selection' },
];

export const PIXABAY_QUICK_TAGS = [
    { id: 'background-music', group: 'video', label: 'musique de fond', query: 'background music' },
    { id: 'no-copyright-music', group: 'video', label: 'musique libre de droits', query: 'royalty free music' },
    { id: 'commercial', group: 'video', label: 'commercial', query: 'commercial music' },
    { id: 'corporate', group: 'video', label: 'entreprise', query: 'corporate' },
    { id: 'advertising', group: 'video', label: 'publicite', query: 'advertising music' },
    { id: 'social-media', group: 'video', label: 'reseaux sociaux', query: 'social media music' },
    { id: 'youtube', group: 'video', label: 'youtube', query: 'youtube background music' },
    { id: 'vlog', group: 'video', label: 'vlog', query: 'vlog music' },
    { id: 'tutorial', group: 'video', label: 'tutoriel', query: 'tutorial music' },
    { id: 'intro-opener', group: 'video', label: 'intro / opener', query: 'intro music' },
    { id: 'logo-reveal', group: 'video', label: 'logo reveal', query: 'logo reveal music' },
    { id: 'podcast', group: 'video', label: 'podcast', query: 'podcast music' },
    { id: 'slideshow', group: 'video', label: 'diaporama', query: 'slideshow music' },
    { id: 'ai-generated', group: 'video', label: 'AI generated', query: 'ai-generated' },

    { id: 'cinematic', group: 'cinematic', label: 'cinematographique', query: 'cinematic' },
    { id: 'cinematic-trailer', group: 'cinematic', label: 'bande-annonce', query: 'cinematic trailer' },
    { id: 'cinematic-epic', group: 'cinematic', label: 'epique cinema', query: 'cinematic epic' },
    { id: 'cinematic-soundtrack', group: 'cinematic', label: 'musique de film', query: 'cinematic soundtrack' },
    { id: 'film-score', group: 'cinematic', label: 'bande originale', query: 'film score' },
    { id: 'cinematic-score', group: 'cinematic', label: 'score cinema', query: 'cinematic score' },
    { id: 'cinematic-intro', group: 'cinematic', label: 'intro cinema', query: 'cinematic intro' },
    { id: 'adventure', group: 'cinematic', label: 'aventure', query: 'adventure music' },
    { id: 'action-cinematic', group: 'cinematic', label: 'action cinema', query: 'action cinematic music' },
    { id: 'dramatic', group: 'cinematic', label: 'dramatique', query: 'dramatic music' },
    { id: 'atmospheric-cinematic', group: 'cinematic', label: 'atmosphere cinema', query: 'atmospheric cinematic' },
    { id: 'dark-cinematic', group: 'cinematic', label: 'dark cinematic', query: 'dark cinematic' },
    { id: 'horror', group: 'cinematic', label: 'horreur', query: 'horror' },
    { id: 'suspense', group: 'cinematic', label: 'suspense', query: 'suspense' },

    { id: 'motivation', group: 'mood', label: 'motivation', query: 'motivation' },
    { id: 'inspiring', group: 'mood', label: 'inspirant', query: 'inspiring music' },
    { id: 'happy', group: 'mood', label: 'joyeux', query: 'happy music' },
    { id: 'emotional', group: 'mood', label: 'emotion', query: 'emotional music' },
    { id: 'sad', group: 'mood', label: 'sad', query: 'sad' },
    { id: 'romantic', group: 'mood', label: 'romantique', query: 'romantic music' },
    { id: 'dreamy', group: 'mood', label: 'dreamy', query: 'dreamy music' },
    { id: 'chill', group: 'mood', label: 'chill', query: 'chill music' },
    { id: 'relaxation', group: 'mood', label: 'relaxation', query: 'relaxation' },
    { id: 'peaceful', group: 'mood', label: 'paisible', query: 'peaceful music' },
    { id: 'hopeful', group: 'mood', label: 'hopeful', query: 'hopeful music' },
    { id: 'mysterious', group: 'mood', label: 'mysterieux', query: 'mysterious music' },
    { id: 'funny', group: 'mood', label: 'fun / playful', query: 'funny music' },

    { id: 'pop', group: 'genre', label: 'pop', query: 'pop music' },
    { id: 'dance', group: 'genre', label: 'dance', query: 'dance music' },
    { id: 'electronic', group: 'genre', label: 'electronique', query: 'electronic music' },
    { id: 'house', group: 'genre', label: 'house', query: 'house music' },
    { id: 'hip-hop', group: 'genre', label: 'hip hop', query: 'hip hop music' },
    { id: 'phonk', group: 'genre', label: 'phonk', query: 'phonk' },
    { id: 'rock', group: 'genre', label: 'rock', query: 'rock music' },
    { id: 'metal', group: 'genre', label: 'metal', query: 'metal music' },
    { id: 'funk', group: 'genre', label: 'funk', query: 'funk music' },
    { id: 'jazz', group: 'genre', label: 'jazz', query: 'jazz music' },
    { id: 'classical', group: 'genre', label: 'classique', query: 'classical music' },
    { id: 'orchestral', group: 'genre', label: 'orchestral', query: 'orchestral music' },
    { id: 'synthwave', group: 'genre', label: 'synthwave', query: 'synthwave' },
    { id: 'trap', group: 'genre', label: 'trap', query: 'trap music' },
    { id: 'afrobeat', group: 'genre', label: 'afrobeat', query: 'afrobeat' },
    { id: 'samba', group: 'genre', label: 'samba / latin', query: 'samba latin music' },
    { id: 'reggae', group: 'genre', label: 'reggae', query: 'reggae music' },
    { id: 'folk', group: 'genre', label: 'folk', query: 'folk music' },

    { id: 'upbeat', group: 'movement', label: 'upbeat', query: 'upbeat music' },
    { id: 'energetic', group: 'movement', label: 'energique', query: 'energetic music' },
    { id: 'action', group: 'movement', label: 'action', query: 'action music' },
    { id: 'sport', group: 'movement', label: 'sport', query: 'sport' },
    { id: 'fast', group: 'movement', label: 'rapide', query: 'fast music' },
    { id: 'slow', group: 'movement', label: 'lent', query: 'slow music' },
    { id: 'calm', group: 'movement', label: 'calme', query: 'calm music' },
    { id: 'groove', group: 'movement', label: 'groove', query: 'groove music' },
    { id: 'beats', group: 'movement', label: 'beats', query: 'beats' },
    { id: 'percussion', group: 'movement', label: 'percussion', query: 'percussion music' },
    { id: 'build-up', group: 'movement', label: 'montee', query: 'build up music' },
    { id: 'transition-rise', group: 'movement', label: 'rise / tension', query: 'rising tension music' },

    { id: 'birthday', group: 'theme', label: 'anniversaire', query: 'birthday' },
    { id: 'spring', group: 'theme', label: 'printemps', query: 'spring' },
    { id: 'summer', group: 'theme', label: 'ete', query: 'summer music' },
    { id: 'winter', group: 'theme', label: 'hiver', query: 'winter music' },
    { id: 'wedding', group: 'theme', label: 'mariage', query: 'wedding music' },
    { id: 'fashion', group: 'theme', label: 'fashion', query: 'fashion music' },
    { id: 'business', group: 'theme', label: 'business', query: 'business music' },
    { id: 'travel', group: 'theme', label: 'voyage', query: 'travel music' },
    { id: 'nature', group: 'theme', label: 'nature', query: 'nature music' },
    { id: 'kids', group: 'theme', label: 'kids', query: 'kids music' },
    { id: 'technology', group: 'theme', label: 'technologie', query: 'technology music' },
    { id: 'gaming', group: 'theme', label: 'gaming', query: 'game music' },
    { id: 'halloween', group: 'theme', label: 'halloween', query: 'halloween music' },
    { id: 'christmas', group: 'theme', label: 'christmas', query: 'christmas music' },

    { id: 'instrumental', group: 'format', label: 'instrumental', query: 'instrumental' },
    { id: 'piano', group: 'format', label: 'piano', query: 'piano' },
    { id: 'guitar', group: 'format', label: 'guitare', query: 'guitar music' },
    { id: 'ambient', group: 'format', label: 'ambient', query: 'ambient music' },
    { id: 'lofi', group: 'format', label: 'lofi', query: 'lofi' },
    { id: 'meditation', group: 'format', label: 'meditation', query: 'meditation music' },
    { id: 'song', group: 'format', label: 'chanson', query: 'song' },
    { id: 'vocal', group: 'format', label: 'vocal', query: 'vocal music' },
    { id: 'loop', group: 'format', label: 'loop', query: 'music loop' },
    { id: 'jingle', group: 'format', label: 'jingle', query: 'jingle music' },
    { id: 'stinger', group: 'format', label: 'stinger', query: 'stinger music' },
    { id: 'sound-logo', group: 'format', label: 'sound logo', query: 'sound logo music' },
    { id: 'ringtone', group: 'format', label: 'sonnerie', query: 'ringtone' },

    { id: 'short-music', group: 'duration', label: 'court', query: 'short music' },
    { id: 'one-minute', group: 'duration', label: 'env. 1 min', query: 'one minute music' },
    { id: 'two-minutes', group: 'duration', label: 'env. 2 min', query: 'two minute music' },
    { id: 'three-minutes', group: 'duration', label: 'env. 3 min', query: 'three minute music' },
    { id: 'long-background', group: 'duration', label: 'long fond', query: 'long background music' },

    { id: 'popular', group: 'content', label: 'populaire', query: 'popular music' },
    { id: 'featured', group: 'content', label: 'selection', query: 'featured music' },
    { id: 'main-title', group: 'content', label: 'titre principal', query: 'main title music' },
    { id: 'new-music', group: 'content', label: 'nouveautes', query: 'new music' },
    { id: 'creator-safe', group: 'content', label: 'creator safe', query: 'creator safe music' },
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

export function getSoundtrackProviderQuickTagGroups(provider = 'openverse') {
    const tags = getSoundtrackProviderQuickTags(provider);
    if (provider !== 'pixabay') return [];
    return PIXABAY_THEME_GROUPS.filter((group) => tags.some((tag) => tag.group === group.id));
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
