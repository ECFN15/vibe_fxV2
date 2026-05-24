export async function generatePlaceholderAiMusic(provider) {
    if (!provider.configured) {
        throw Object.assign(new Error(`${provider.keyEnv?.[0] || 'Cle API'} manquante: aucune requete ${provider.label} n'a ete appelee.`), {
            code: 'provider-missing-key',
            status: 503,
        });
    }

    throw Object.assign(new Error(`${provider.label} reste experimental: les endpoints publics/contrat technique doivent etre confirmes avant generation automatique.`), {
        code: 'provider-contract-required',
        status: 501,
    });
}
