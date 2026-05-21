import React from 'react';
import { AlertTriangle, CheckCircle2, Clock3, ExternalLink, Radio } from 'lucide-react';
import {
    SOUNDTRACK_PROVIDERS,
    getSoundtrackProviderQuickTags,
} from '../data/soundtrackDefaults';

const statusLabel = {
    active: 'actif',
    'coming-soon': 'a venir',
    'provider-missing-key': 'cle manquante',
    'configured-coming-soon': 'a brancher',
    'page-scan-blocked': 'scan bloque',
    'page-scan-controlled': 'scan controle',
    disabled: 'desactive',
};

const ProviderButton = ({ provider, selected, onSelect }) => {
    const disabled = !provider.enabled;
    return (
        <button
            type="button"
            className="soundtrack-provider-choice"
            data-active={selected ? 'true' : 'false'}
            data-status={provider.status}
            disabled={disabled}
            onClick={() => !disabled && onSelect(provider.id)}
            title={disabled ? `${provider.label}: ${statusLabel[provider.status] || provider.status}` : `${provider.label}: actif`}
        >
            <span className="soundtrack-provider-choice__name">{provider.label}</span>
            <span className="soundtrack-provider-choice__meta">{provider.mediaType}</span>
            <span className="soundtrack-provider-choice__status">
                {selected ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}
                {selected ? (statusLabel[provider.status] || 'actif') : statusLabel[provider.status] || provider.status}
            </span>
        </button>
    );
};

export default function SoundtrackSearch({ search }) {
    const ignoredReasons = search.scanStats?.ignoredReasons || [];
    const activeProviderDefinition = SOUNDTRACK_PROVIDERS.find((provider) => provider.id === search.provider)
        || SOUNDTRACK_PROVIDERS[0];
    const quickTags = getSoundtrackProviderQuickTags(search.provider);
    const activeProvider = search.providerStatus?.find((provider) => provider.id === search.provider);
    const selectedTag = quickTags.find((tag) => tag.id === search.category)
        || quickTags.find((tag) => tag.query === search.query);
    const providerError = activeProvider?.error || search.error || '';
    const blockedByProvider = search.status === 'provider-unavailable' || /403|blocked|challenge/i.test(providerError);
    const scanUnavailable = blockedByProvider || search.status === 'error' || Boolean(providerError);
    const isPixabayBlocked = search.provider === 'pixabay' && blockedByProvider;

    return (
        <section className="soundtrack-search soundtrack-search--provider-first" aria-label="Agregateur provider-first">
            <div className="soundtrack-provider-strip" aria-label="Choix fournisseur audio">
                <div className="soundtrack-filter-label">
                    <Radio size={13} />
                    Provider
                </div>
                <div className="soundtrack-provider-strip__list">
                    {SOUNDTRACK_PROVIDERS.map((provider) => (
                        <ProviderButton
                            key={provider.id}
                            provider={provider}
                            selected={search.provider === provider.id}
                            onSelect={search.setProvider}
                        />
                    ))}
                </div>
            </div>

            <div className="soundtrack-pixabay-panel" aria-label={`Filtres ${activeProviderDefinition.label}`}>
                <div className="soundtrack-provider-mode-note">
                    <strong>{search.provider === 'pixabay' ? 'Filtres Pixabay Music' : 'Requetes Openverse Audio'}</strong>
                    <span>
                        {search.provider === 'pixabay'
                            ? 'Tags publics Pixabay Music, scan serveur borne, aucune API audio officielle.'
                            : 'Recherche texte Openverse sur titre, description et tags; pas de tags Pixabay forces.'}
                    </span>
                </div>
                <div className="soundtrack-pixabay-tags" aria-label={`Suggestions ${activeProviderDefinition.label}`}>
                    {quickTags.map((tag) => (
                        <button
                            type="button"
                            key={tag.id}
                            data-active={search.category === tag.id ? 'true' : 'false'}
                            disabled={search.status === 'loading'}
                            onClick={() => search.scanCategory(tag)}
                            aria-label={`Scanner le filtre ${activeProviderDefinition.label} ${tag.label}`}
                        >
                            {tag.label}
                        </button>
                    ))}
                </div>

                {scanUnavailable && (
                    <div className="soundtrack-provider-recovery soundtrack-provider-recovery--compact" data-state="warning">
                        <AlertTriangle size={15} />
                        <div>
                            <strong>{isPixabayBlocked ? 'Pixabay bloque le scan serveur' : `${activeProviderDefinition.label} indisponible`}</strong>
                            <p>{selectedTag?.label || search.query}: aucun resultat invente ni catalogue local affiche.</p>
                        </div>
                        {isPixabayBlocked && (
                            <a
                                href={search.sourceUrl || 'https://pixabay.com/music/'}
                                target="_blank"
                                rel="noreferrer"
                                title="Ouvrir Pixabay Music dans le navigateur"
                            >
                                Ouvrir Pixabay
                                <ExternalLink size={12} />
                            </a>
                        )}
                        {isPixabayBlocked && (
                            <span>
                                Methode fiable: telecharger le morceau depuis Pixabay puis Importer fichier, ou coller une URL directe cdn.pixabay.com/download/audio/... dans le panneau URL audio directe.
                            </span>
                        )}
                    </div>
                )}

                <div className="soundtrack-scan-summary" aria-label={`Statut scan ${activeProviderDefinition.label}`}>
                    <span data-state="ready">trouves {search.scanStats?.found || 0}</span>
                    <span data-state="ready">importables {search.scanStats?.importable || 0}</span>
                    <span data-state={search.scanStats?.ignored ? 'warning' : 'neutral'}>ignores {search.scanStats?.ignored || 0}</span>
                    <span data-state={search.cache?.status === 'cached' ? 'ready' : 'neutral'}>cache {search.cache?.status || 'idle'}</span>
                    {search.status === 'ready' && (
                        <button
                            type="button"
                            onClick={search.loadMore}
                            disabled={search.pages >= 5}
                            title={search.pages >= 5 ? 'Limite de scan atteinte' : 'Charger la page suivante'}
                        >
                            + resultats
                        </button>
                    )}
                    {activeProvider?.status && <span data-state={activeProvider.error ? 'warning' : 'ready'}>{activeProvider.status}</span>}
                    {ignoredReasons.map((item) => (
                        <span key={item.reason} data-state="warning">{item.reason} x{item.count}</span>
                    ))}
                    {search.error && (
                        <span data-state="warning">
                            <AlertTriangle size={12} />
                            {search.error}
                        </span>
                    )}
                </div>
            </div>
        </section>
    );
}
