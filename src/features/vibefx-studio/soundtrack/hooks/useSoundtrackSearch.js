import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isAiProviderId } from '@/config/aiLaunch';
import { useAiLaunchSettings } from '@/hooks/useAiLaunchSettings';
import { SOUNDTRACK_PROVIDERS, getSoundtrackProviderQuickTags } from '../data/soundtrackDefaults';
import { buildProviderSearchUrl, normalizeProviderScanFilters } from '../services/providerSearchClient';
import { normalizeSoundtrackTrack } from '../services/soundtrackManifest';
import { normalizeSearchTrackRights } from '../services/soundtrackRights';

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const normalizeProviderTrack = (track = {}) => normalizeSoundtrackTrack(normalizeSearchTrackRights({
    ...track,
    id: track.id || track.providerTrackId,
    provider: track.provider || 'openverse',
    sourceName: track.sourceName || 'Openverse Audio',
    sourceUrl: track.sourceUrl || track.sourcePageUrl || '',
    sourcePageUrl: track.sourcePageUrl || track.sourceUrl || '',
    previewUrl: track.previewUrl || track.audioUrl || '',
    downloadUrl: track.downloadUrl || track.audioUrl || '',
    importStatus: track.importStatus || (track.audioUrl || track.downloadUrl ? 'importable' : 'metadata-only'),
    blockedReason: track.blockedReason || '',
}));

export function useSoundtrackSearch() {
    const { aiInterfacesEnabled } = useAiLaunchSettings();
    const defaultTag = getSoundtrackProviderQuickTags('openverse').find((tag) => tag.id === 'cinematic') || getSoundtrackProviderQuickTags('openverse')[0];
    const [provider, setProviderState] = useState('openverse');
    const [providerDefinitions, setProviderDefinitions] = useState(SOUNDTRACK_PROVIDERS.filter((item) => (
        item.searchEnabled && (aiInterfacesEnabled || !isAiProviderId(item.id))
    )));
    const [query, setQuery] = useState(defaultTag?.query || 'cinematic music');
    const [category, setCategory] = useState(defaultTag?.id || 'cinematic');
    const [pages, setPages] = useState(1);
    const [durationSeconds, setDurationSeconds] = useState(20);
    const [instrumental, setInstrumental] = useState(true);
    const [results, setResults] = useState([]);
    const [providerStatus, setProviderStatus] = useState([]);
    const [scanStats, setScanStats] = useState({ found: 0, importable: 0, ignored: 0, ignoredReasons: [] });
    const [cache, setCache] = useState({ status: 'idle' });
    const [sourceUrl, setSourceUrl] = useState('');
    const [warnings, setWarnings] = useState([]);
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const abortRef = useRef(null);
    const providerDefinitionsRef = useRef(providerDefinitions);

    useEffect(() => {
        providerDefinitionsRef.current = providerDefinitions;
    }, [providerDefinitions]);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/music/providers')
            .then((response) => response.ok ? response.json() : null)
            .then((payload) => {
                if (cancelled || !Array.isArray(payload?.providers)) return;
                const searchableProviders = payload.providers.filter((item) => (
                    (item.searchEnabled !== false || (aiInterfacesEnabled && item.generationEnabled === true))
                    && (aiInterfacesEnabled || !isAiProviderId(item.id))
                ));
                const fallbackProviders = SOUNDTRACK_PROVIDERS.filter((item) => (
                    item.searchEnabled && (aiInterfacesEnabled || !isAiProviderId(item.id))
                ));
                const nextProviders = searchableProviders.length ? searchableProviders : fallbackProviders;
                setProviderDefinitions(nextProviders);
                if (!nextProviders.some((item) => item.id === provider)) {
                    const nextProvider = nextProviders[0]?.id || 'openverse';
                    const [nextTag] = getSoundtrackProviderQuickTags(nextProvider);
                    setProviderState(nextProvider);
                    setQuery(nextTag?.query || 'music');
                    setCategory(nextTag?.id || 'music');
                    setPages(1);
                    setResults([]);
                    setProviderStatus([]);
                    setScanStats({ found: 0, importable: 0, ignored: 0, ignoredReasons: [] });
                    setCache({ status: 'idle' });
                    setSourceUrl('');
                    setWarnings([]);
                    setError('');
                    setStatus('idle');
                }
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [aiInterfacesEnabled, provider]);

    const activeProviderTags = useMemo(() => getSoundtrackProviderQuickTags(provider), [provider]);
    const activeProviderDefinition = useMemo(() => (
        providerDefinitions.find((item) => item.id === provider)
        || SOUNDTRACK_PROVIDERS.find((item) => item.id === provider)
        || null
    ), [provider, providerDefinitions]);
    const isAiProvider = aiInterfacesEnabled && activeProviderDefinition?.generationEnabled === true;
    const selectedTag = useMemo(() => (
        activeProviderTags.find((tag) => tag.id === category)
        || activeProviderTags.find((tag) => tag.query === query)
    ), [activeProviderTags, category, query]);

    const filters = useMemo(() => normalizeProviderScanFilters({
        provider,
        query,
        category,
        source: selectedTag?.sourceFilter?.source || '',
        mediaCategory: selectedTag?.sourceFilter?.mediaCategory || '',
        licenseType: selectedTag?.sourceFilter?.licenseType || '',
        length: selectedTag?.sourceFilter?.length || '',
        extension: selectedTag?.sourceFilter?.extension || '',
        pages,
        pageStart: 1,
    }), [category, pages, provider, query, selectedTag]);

    const generateAi = useCallback(async (activeFilters, controller) => {
        const response = await fetch('/api/music/ai-generate', {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: activeFilters.provider,
                prompt: activeFilters.query,
                category: activeFilters.category,
                durationSeconds,
                instrumental,
            }),
        });
        const payload = await response.json().catch(() => ({}));
        return { response, payload };
    }, [durationSeconds, instrumental]);

    const search = useCallback(async (overrides = {}) => {
        const activeFilters = normalizeProviderScanFilters({ ...filters, ...overrides });
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setProviderState(activeFilters.provider);
        setStatus('loading');
        setError('');
        setScanStats({ found: 0, importable: 0, ignored: 0, ignoredReasons: [] });
        setSourceUrl('');
        setWarnings([]);

        try {
            const aiResult = isAiProvider
                ? await generateAi(activeFilters, controller)
                : null;
            const response = aiResult
                ? aiResult.response
                : await fetch(buildProviderSearchUrl(activeFilters), { signal: controller.signal });
            const payload = aiResult?.payload || await response.json().catch(() => ({}));
            const providerLabel = providerDefinitionsRef.current.find((item) => item.id === activeFilters.provider)?.label || activeFilters.provider;
            if (!response.ok) {
                setResults([]);
                setProviderStatus(payload.providers || []);
                setScanStats(payload.stats || { found: 0, importable: 0, ignored: 1, ignoredReasons: [] });
                setCache(payload.cache || { status: 'error' });
                setSourceUrl(payload.sourceUrl || '');
                setError(payload.error || payload.providers?.[0]?.error || `Scan ${providerLabel} indisponible.`);
                setStatus(payload.status || 'error');
                return;
            }
            const tracks = Array.isArray(payload.tracks) ? payload.tracks.map(normalizeProviderTrack) : [];
            const stats = payload.stats || {
                found: tracks.length,
                importable: tracks.filter((track) => track.importStatus === 'importable').length,
                ignored: tracks.filter((track) => track.importStatus !== 'importable').length,
                ignoredReasons: [],
            };
            setResults(tracks);
            setProviderStatus(payload.providers || []);
            setScanStats(stats);
            setCache(payload.cache || { status: 'live' });
            setPages(activeFilters.pages);
            setSourceUrl(payload.sourceUrl || payload.scan?.urls?.[0] || '');
            setWarnings(Array.isArray(payload.warnings) ? payload.warnings : []);
            if (payload.status === 'provider-unavailable') {
                setStatus('provider-unavailable');
                setError(payload.providers?.[0]?.error || `${providerLabel} temporairement indisponible.`);
            } else {
                setStatus(tracks.length ? 'ready' : 'empty');
            }
        } catch (searchError) {
            if (searchError.name === 'AbortError') return;
            const providerDefinition = providerDefinitionsRef.current.find((item) => item.id === activeFilters.provider);
            const providerLabel = providerDefinition?.label || activeFilters.provider;
            setResults([]);
            setProviderStatus([{
                id: activeFilters.provider,
                label: providerLabel,
                mediaType: providerDefinition?.mediaType || 'audio',
                status: 'error',
                configured: true,
                count: 0,
                importable: 0,
                error: searchError.message || `Scan ${providerLabel} indisponible.`,
            }]);
            setError(searchError.message || `Scan ${providerLabel} indisponible.`);
            setStatus('error');
            setCache({ status: 'error' });
        }
    }, [filters, generateAi, isAiProvider]);

    const scanCategory = useCallback((tag) => {
        const providerTags = getSoundtrackProviderQuickTags(provider);
        const nextTag = typeof tag === 'string'
            ? providerTags.find((item) => item.id === tag || item.query === tag || item.label === tag)
            : tag;
        if (!nextTag) return;
        setCategory(nextTag.id);
        setQuery(nextTag.query);
        if (isAiProvider) {
            setCategory(nextTag.id);
            setQuery(nextTag.query);
            return;
        }
        search({
            provider,
            query: nextTag.query,
            category: nextTag.id,
            ...(nextTag.sourceFilter || {}),
            pages: 1,
        });
    }, [isAiProvider, provider, search]);

    const loadMore = useCallback(() => {
        if (status === 'loading' || status === 'provider-unavailable' || status === 'error' || pages >= 5) return;
        search({
            provider,
            query,
            category,
            ...(selectedTag?.sourceFilter || {}),
            pages: pages + 1,
        });
    }, [category, pages, provider, query, search, selectedTag, status]);

    const generateMore = useCallback(() => {
        if (status === 'loading') return;
        const activeTag = selectedTag || getSoundtrackProviderQuickTags(provider)[0];
        const nextStartPage = isAiProvider ? 1 : randomInt(2, 8);
        search({
            provider,
            query: activeTag?.query || query,
            category: activeTag?.id || category,
            ...(activeTag?.sourceFilter || {}),
            pages: 1,
            pageStart: nextStartPage,
        });
    }, [category, isAiProvider, provider, query, search, selectedTag, status]);

    const setProvider = useCallback((nextProvider) => {
        if (!providerDefinitionsRef.current.some((item) => item.id === nextProvider)) return;
        const [providerDefaultTag] = getSoundtrackProviderQuickTags(nextProvider);
        setProviderState(nextProvider);
        setQuery(providerDefaultTag?.query || 'music');
        setCategory(providerDefaultTag?.id || 'music');
        setPages(1);
        setDurationSeconds(20);
        setInstrumental(true);
        setResults([]);
        setProviderStatus([]);
        setScanStats({ found: 0, importable: 0, ignored: 0, ignoredReasons: [] });
        setCache({ status: 'idle' });
        setSourceUrl('');
        setWarnings([]);
        setError('');
        setStatus('idle');
    }, []);

    return {
        provider,
        providerDefinitions,
        setProvider,
        query,
        setQuery,
        category,
        setCategory,
        pages,
        setPages,
        results,
        providerStatus,
        scanStats,
        cache,
        sourceUrl,
        warnings,
        status,
        error,
        filters,
        isAiProvider,
        durationSeconds,
        setDurationSeconds,
        instrumental,
        setInstrumental,
        search,
        scanCategory,
        loadMore,
        generateMore,
    };
}
