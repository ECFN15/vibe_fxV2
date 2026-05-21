import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const PROVIDERS = [
    {
        id: 'openverse',
        label: 'Openverse Audio',
        mediaType: 'audio',
        status: 'active',
        configured: true,
        officialDocsUrl: 'https://docs.openverse.org/api/',
        note: 'Provider audio actif pour les scans Soundtrack par categorie, sans cle API serveur.',
    },
    {
        id: 'pixabay',
        label: 'Pixabay Music',
        mediaType: 'music',
        status: 'page-scan-blocked',
        configured: false,
        officialDocsUrl: 'https://pixabay.com/api/docs/',
        licenseUrl: 'https://pixabay.com/service/license-summary/',
        note: 'Documentation API publique verifiee: recherche images/videos uniquement. Le scan des pages Music renvoie actuellement un challenge 403 cote serveur; garder Pixabay en import manuel URL directe.',
    },
    {
        id: 'jamendo',
        label: 'Jamendo Music',
        mediaType: 'music',
        status: process.env.JAMENDO_CLIENT_ID || process.env.MUSIC_JAMENDO_CLIENT_ID ? 'configured-coming-soon' : 'provider-missing-key',
        configured: false,
        officialDocsUrl: 'https://developer.jamendo.com/v3.0',
    },
    {
        id: 'freesound',
        label: 'Freesound',
        mediaType: 'sfx/audio',
        status: process.env.FREESOUND_API_KEY || process.env.MUSIC_FREESOUND_API_KEY ? 'configured-coming-soon' : 'provider-missing-key',
        configured: false,
        officialDocsUrl: 'https://freesound.org/docs/api/',
    },
    {
        id: 'archive',
        label: 'Internet Archive',
        mediaType: 'audio',
        status: 'coming-soon',
        configured: false,
        officialDocsUrl: 'https://archive.org/developers/',
    },
    {
        id: 'wikimedia',
        label: 'Wikimedia Commons',
        mediaType: 'audio',
        status: 'coming-soon',
        configured: false,
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
