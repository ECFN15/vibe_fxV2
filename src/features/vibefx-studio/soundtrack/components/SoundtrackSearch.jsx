import React from 'react';
import { AlertTriangle, CheckCircle2, Clock3, ExternalLink, Radio, Shuffle, UploadCloud } from 'lucide-react';
import {
    SOUNDTRACK_PROVIDERS,
    getSoundtrackProviderQuickTags,
} from '../data/soundtrackDefaults';

const statusLabel = {
    active: 'actif',
    'api-active': 'api active',
    experimental: 'experimental',
    'manual-exception': 'manuel',
    'page-scan-controlled': 'scan controle',
    'provider-unavailable': 'indispo',
    'key-required': 'cle requise',
    'provider-missing-key': 'cle manquante',
    'configured-coming-soon': 'a brancher',
    unsupported: 'retire',
    disabled: 'desactive',
};

const ProviderButton = ({ provider, selected, onSelect }) => {
    const disabled = provider.enabled === false || (provider.searchEnabled === false && provider.generationEnabled !== true);
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

export default function SoundtrackSearch({ search, onOpenAiImport }) {
    const ignoredReasons = search.scanStats?.ignoredReasons || [];
    const providerDefinitions = search.providerDefinitions?.length
        ? search.providerDefinitions
        : SOUNDTRACK_PROVIDERS.filter((provider) => provider.searchEnabled);
    const activeProviderDefinition = providerDefinitions.find((provider) => provider.id === search.provider)
        || SOUNDTRACK_PROVIDERS[0];
    const quickTags = getSoundtrackProviderQuickTags(search.provider);
    const activeProvider = search.providerStatus?.find((provider) => provider.id === search.provider);
    const isAiProvider = search.isAiProvider || activeProviderDefinition?.generationEnabled === true;
    const nativeFilters = activeProviderDefinition.filters || [];
    const providerControls = activeProviderDefinition.controls || {};
    const selectedTag = quickTags.find((tag) => tag.id === search.category)
        || quickTags.find((tag) => tag.query === search.query);
    const providerError = activeProvider?.error || search.error || '';
    const missingKey = activeProvider?.status === 'provider-missing-key'
        || activeProviderDefinition.status === 'provider-missing-key'
        || /missing|manquant|key/i.test(providerError);
    const presetMode = isAiProvider
        ? 'Presets Vibe_CUT (prompt-preset, non natif)'
        : 'Tags fournisseur';
    const blockedByProvider = search.status === 'provider-unavailable' || missingKey || /403|blocked|challenge|missing|manquant/i.test(providerError);
    const scanUnavailable = blockedByProvider || search.status === 'error' || Boolean(providerError);
    const isPixabay = search.provider === 'pixabay';

    return (
        <section className="soundtrack-search soundtrack-search--provider-first" aria-label="Agregateur provider-first">
            <div className="soundtrack-provider-strip" aria-label="Choix fournisseur audio">
                <div className="soundtrack-filter-label">
                    <Radio size={13} />
                    Provider
                </div>
                <div className="soundtrack-provider-strip__list">
                    {providerDefinitions.map((provider) => (
                        <ProviderButton
                            key={provider.id}
                            provider={provider}
                            selected={search.provider === provider.id}
                            onSelect={search.setProvider}
                        />
                    ))}
                </div>
            </div>

            <div className="soundtrack-provider-filter-panel" aria-label={`Filtres ${activeProviderDefinition.label}`}>
                <div className="soundtrack-provider-mode-note">
                    <strong>{isAiProvider ? `Filtres IA ${activeProviderDefinition.label}` : isPixabay ? 'Filtres Pixabay Music' : `Filtres ${activeProviderDefinition.label}`}</strong>
                    <span>{activeProviderDefinition.note || 'Filtres propres au fournisseur actif, sans filtres generiques partages.'}</span>
                </div>
                {nativeFilters.length > 0 && (
                    <div className="soundtrack-native-filter-strip" aria-label={`Dimensions natives ${activeProviderDefinition.label}`}>
                        {nativeFilters.map((filter) => (
                            <span key={filter.id} data-source={filter.source || 'native'}>
                                {filter.label}
                                <small>{filter.source || 'native'}</small>
                            </span>
                        ))}
                    </div>
                )}
                <div className="soundtrack-provider-tags" aria-label={`Suggestions ${activeProviderDefinition.label}`}>
                    <span className="soundtrack-provider-tags__legend">{presetMode}</span>
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

                {isAiProvider && (
                    <div className="soundtrack-ai-controls" aria-label={`Generation ${activeProviderDefinition.label}`}>
                        <label className="soundtrack-ai-controls__prompt">
                            <span>Prompt controle</span>
                            <textarea
                                value={search.query}
                                maxLength={900}
                                rows={2}
                                onChange={(event) => search.setQuery(event.target.value)}
                                placeholder="Decrivez la musique a generer"
                            />
                        </label>
                        <label>
                            <span>Duree cible</span>
                            <input
                                type="number"
                                min={3}
                                max={activeProviderDefinition.maxDurationSeconds || 600}
                                value={search.durationSeconds}
                                onChange={(event) => search.setDurationSeconds(event.target.value)}
                            />
                        </label>
                        {providerControls.instrumental !== false && (
                            <label className="soundtrack-ai-controls__toggle">
                                <input
                                    type="checkbox"
                                    checked={search.instrumental}
                                    onChange={(event) => search.setInstrumental(event.target.checked)}
                                />
                                <span>Instrumental</span>
                            </label>
                        )}
                        <button
                            type="button"
                            className="soundtrack-ai-controls__generate"
                            disabled={search.status === 'loading'}
                            onClick={() => search.search({
                                provider: search.provider,
                                query: search.query,
                                category: search.category,
                                pages: 1,
                            })}
                        >
                            {search.status === 'loading' ? 'generation...' : missingKey ? 'tester la config' : 'generer'}
                        </button>
                        <button
                            type="button"
                            className="soundtrack-ai-controls__import"
                            onClick={() => onOpenAiImport?.(activeProviderDefinition.id)}
                            title={`Generer et importer une musique ${activeProviderDefinition.label} par theme`}
                        >
                            <UploadCloud size={13} />
                            Assistant theme
                        </button>
                    </div>
                )}

                {scanUnavailable && (
                    <div className="soundtrack-provider-recovery soundtrack-provider-recovery--compact" data-state="warning">
                        <AlertTriangle size={15} />
                        <div>
                            <strong>{missingKey ? `${activeProviderDefinition.label}: KEY MISSING` : isPixabay ? 'Pixabay bloque le scan serveur' : `${activeProviderDefinition.label} indisponible`}</strong>
                            <p>{selectedTag?.label || search.query}: aucun resultat invente ni catalogue local affiche.</p>
                        </div>
                        {activeProviderDefinition.officialDocsUrl && (
                            <a
                                href={activeProviderDefinition.officialDocsUrl}
                                target="_blank"
                                rel="noreferrer"
                                title={`Ouvrir la documentation ${activeProviderDefinition.label}`}
                            >
                                Ouvrir docs
                                <ExternalLink size={12} />
                            </a>
                        )}
                        {isPixabay && (
                            <span>
                                Exception conservee: ouvrez Pixabay, telechargez le morceau, puis importez le fichier ou une URL directe cdn.pixabay.com/download/audio/...
                            </span>
                        )}
                    </div>
                )}

                <div className="soundtrack-scan-summary" aria-label={`Statut scan ${activeProviderDefinition.label}`}>
                    <span data-state="ready">trouves {search.scanStats?.found || 0}</span>
                    <span data-state="ready">importables {search.scanStats?.importable || 0}</span>
                    <span data-state={search.scanStats?.ignored ? 'warning' : 'neutral'}>ignores {search.scanStats?.ignored || 0}</span>
                    <span data-state={search.cache?.status === 'cached' ? 'ready' : 'neutral'}>cache {search.cache?.status || 'idle'}</span>
                    {activeProvider?.status && <span data-state={activeProvider.error ? 'warning' : 'ready'}>{activeProvider.status}</span>}
                    {isAiProvider && <span data-state={activeProviderDefinition.configured ? 'ready' : 'warning'}>{activeProviderDefinition.configured ? 'API' : 'KEY MISSING'}</span>}
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
                <div className="soundtrack-filter-actions" aria-label={`Extension scan ${activeProviderDefinition.label}`}>
                    <button
                        type="button"
                        onClick={search.generateMore}
                        disabled={search.status === 'loading'}
                        title={isAiProvider ? 'Generer une variante du filtre actif' : 'Explorer une autre page du filtre actif'}
                    >
                        <Shuffle size={11} />
                        generer plus
                    </button>
                    {search.status === 'ready' && (!isAiProvider || providerControls.variants) && (
                        <button
                            type="button"
                            onClick={search.loadMore}
                            disabled={search.pages >= 5}
                            title={search.pages >= 5 ? 'Limite de scan atteinte' : 'Charger la page suivante du filtre actif'}
                        >
                            + resultats
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
}
