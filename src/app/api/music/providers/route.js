import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const PROVIDERS = [
    {
        id: 'pixabay',
        label: 'Pixabay Music',
        status: 'manual-url-only',
        configured: true,
        officialDocsUrl: 'https://pixabay.com/api/docs/',
        licenseUrl: 'https://pixabay.com/service/license-summary/',
        note: 'Documentation API publique verifiee: recherche images/videos uniquement. Pas de scraping audio; import URL audio directe seulement si l utilisateur fournit une URL autorisee.',
    },
    {
        id: 'openverse',
        label: 'Openverse Audio',
        status: 'available',
        configured: true,
        officialDocsUrl: 'https://docs.openverse.org/api/',
    },
    {
        id: 'jamendo',
        label: 'Jamendo Music',
        status: process.env.JAMENDO_CLIENT_ID || process.env.MUSIC_JAMENDO_CLIENT_ID ? 'available' : 'provider-missing-key',
        configured: Boolean(process.env.JAMENDO_CLIENT_ID || process.env.MUSIC_JAMENDO_CLIENT_ID),
        officialDocsUrl: 'https://developer.jamendo.com/v3.0',
    },
    {
        id: 'freesound',
        label: 'Freesound',
        status: process.env.FREESOUND_API_KEY || process.env.MUSIC_FREESOUND_API_KEY ? 'available' : 'provider-missing-key',
        configured: Boolean(process.env.FREESOUND_API_KEY || process.env.MUSIC_FREESOUND_API_KEY),
        officialDocsUrl: 'https://freesound.org/docs/api/',
    },
    {
        id: 'archive',
        label: 'Internet Archive',
        status: 'available-review-heavy',
        configured: true,
        officialDocsUrl: 'https://archive.org/developers/',
    },
    {
        id: 'wikimedia',
        label: 'Wikimedia Commons',
        status: 'available-review-heavy',
        configured: true,
        officialDocsUrl: 'https://www.mediawiki.org/wiki/API:Main_page',
    },
];

export async function GET() {
    return NextResponse.json(
        {
            cachePolicy: 'provider metadata only; search responses must be controlled and cached when provider terms require it',
            providers: PROVIDERS,
        },
        {
            headers: {
                'cache-control': 'private, max-age=300',
            },
        }
    );
}
