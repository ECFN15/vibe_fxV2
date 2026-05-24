import { NextResponse } from 'next/server';
import { isAiInterfacesEnabledForRequest } from '@/config/aiLaunch';
import { getAiProviderDefinitions } from '../_providers/aiProviderRegistry';
import { buildAiProviderStatus } from '../_shared/providerTrack';

export const runtime = 'nodejs';

export async function GET(request) {
    if (!isAiInterfacesEnabledForRequest(request)) {
        return NextResponse.json({ error: 'Interfaces IA masquees pour ce lancement.' }, { status: 404 });
    }

    const providers = getAiProviderDefinitions().map((provider) => buildAiProviderStatus(provider));
    return NextResponse.json(
        {
            verifiedAt: '2026-05-22',
            cachePolicy: 'provider metadata only; generation always runs server-side and requires provider secrets',
            providers,
        },
        {
            headers: {
                'cache-control': 'private, max-age=300',
            },
        }
    );
}
