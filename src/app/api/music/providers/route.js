import { NextResponse } from 'next/server';
import { isAiInterfacesEnabledForRequest } from '@/config/aiLaunch';
import { getAiProviderDefinitions } from '../_providers/aiProviderRegistry';
import { buildAiProviderStatus } from '../_shared/providerTrack';

export const runtime = 'nodejs';

const PROVIDERS = [
    {
        id: 'pixabay',
        label: 'Pixabay Music',
        mediaType: 'music',
        status: 'manual-exception',
        configured: true,
        enabled: true,
        searchEnabled: true,
        officialDocsUrl: 'https://pixabay.com/music/',
        licenseUrl: 'https://pixabay.com/service/license-summary/',
        note: 'Exception manuelle conservee : pas d API Music audio officielle, mais scan borne + assistant import fichier/URL directe Pixabay.',
    },
    {
        id: 'openverse',
        label: 'Openverse Audio',
        mediaType: 'audio',
        status: 'active',
        configured: true,
        enabled: true,
        searchEnabled: true,
        officialDocsUrl: 'https://api.openverse.org/v1/#tag/audio',
        note: 'Provider audio actif recentre sur musique video sociale: Openverse source Jamendo par styles, avec Freesound seulement pour SFX courts.',
    },
    {
        id: 'jamendo',
        label: 'Jamendo Music',
        mediaType: 'music',
        status: process.env.JAMENDO_CLIENT_ID || process.env.MUSIC_JAMENDO_CLIENT_ID ? 'active' : 'provider-missing-key',
        configured: Boolean(process.env.JAMENDO_CLIENT_ID || process.env.MUSIC_JAMENDO_CLIENT_ID),
        enabled: Boolean(process.env.JAMENDO_CLIENT_ID || process.env.MUSIC_JAMENDO_CLIENT_ID),
        searchEnabled: Boolean(process.env.JAMENDO_CLIENT_ID || process.env.MUSIC_JAMENDO_CLIENT_ID),
        hiddenWhenMissingKey: true,
        officialDocsUrl: 'https://developer.jamendo.com/v3.0/tracks',
        note: 'Official tracks API: search, tags/fuzzytags, vocalinstrumental, include licenses/musicinfo et URL audio. Cache/resultats uniquement cote serveur.',
    },
    {
        id: 'freesound',
        label: 'Freesound',
        mediaType: 'sfx/audio',
        status: process.env.FREESOUND_API_KEY || process.env.MUSIC_FREESOUND_API_KEY ? 'active' : 'provider-missing-key',
        configured: Boolean(process.env.FREESOUND_API_KEY || process.env.MUSIC_FREESOUND_API_KEY),
        enabled: Boolean(process.env.FREESOUND_API_KEY || process.env.MUSIC_FREESOUND_API_KEY),
        searchEnabled: Boolean(process.env.FREESOUND_API_KEY || process.env.MUSIC_FREESOUND_API_KEY),
        hiddenWhenMissingKey: true,
        officialDocsUrl: 'https://freesound.org/docs/api/',
        note: 'Official APIv2: search/text avec query, filter tag:* et previews MP3/OGG importables sans OAuth2.',
    },
].filter((provider) => !provider.hiddenWhenMissingKey || provider.configured);

export async function GET(request) {
    const aiProviders = isAiInterfacesEnabledForRequest(request)
        ? getAiProviderDefinitions().map((provider) => buildAiProviderStatus(provider))
        : [];
    return NextResponse.json(
        {
            cachePolicy: 'provider metadata only; search responses must be controlled and cached when provider terms require it',
            providers: [...PROVIDERS, ...aiProviders],
        },
        {
            headers: {
                'cache-control': 'private, max-age=300',
            },
        }
    );
}
