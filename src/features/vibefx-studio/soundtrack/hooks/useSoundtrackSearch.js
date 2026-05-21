import { useCallback, useMemo, useRef, useState } from 'react';
import { SOUNDTRACK_CATEGORY_TAGS } from '../data/soundtrackDefaults';
import { buildProviderSearchUrl, normalizeProviderScanFilters } from '../services/providerSearchClient';
import { normalizeSoundtrackTrack } from '../services/soundtrackManifest';
import { normalizeSearchTrackRights } from '../services/soundtrackRights';

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
    const defaultTag = SOUNDTRACK_CATEGORY_TAGS.find((tag) => tag.id === 'instrumental') || SOUNDTRACK_CATEGORY_TAGS[0];
    const [provider, setProviderState] = useState('openverse');
    const [query, setQuery] = useState(defaultTag?.query || 'instrumental');
    const [category, setCategory] = useState(defaultTag?.id || 'instrumental');
    const [pages, setPages] = useState(1);
    const [results, setResults] = useState([]);
    const [providerStatus, setProviderStatus] = useState([]);
    const [scanStats, setScanStats] = useState({ found: 0, importable: 0, ignored: 0, ignoredReasons: [] });
    const [cache, setCache] = useState({ status: 'idle' });
    const [sourceUrl, setSourceUrl] = useState('');
    const [warnings, setWarnings] = useState([]);
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const abortRef = useRef(null);

    const filters = useMemo(() => normalizeProviderScanFilters({
        provider,
        query,
        category,
        pages,
    }), [category, pages, provider, query]);

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
            const response = await fetch(buildProviderSearchUrl(activeFilters), { signal: controller.signal });
            const payload = await response.json().catch(() => ({}));
            const providerLabel = activeFilters.provider === 'pixabay' ? 'Pixabay' : 'Openverse';
            if (!response.ok) throw new Error(payload.error || `Scan ${providerLabel} indisponible.`);
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
            const providerLabel = activeFilters.provider === 'pixabay' ? 'Pixabay Music' : 'Openverse Audio';
            setResults([]);
            setProviderStatus([{
                id: activeFilters.provider,
                label: providerLabel,
                mediaType: activeFilters.provider === 'pixabay' ? 'music' : 'audio',
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
    }, [filters]);

    const scanCategory = useCallback((tag) => {
        const nextTag = typeof tag === 'string'
            ? SOUNDTRACK_CATEGORY_TAGS.find((item) => item.id === tag || item.query === tag || item.label === tag)
            : tag;
        if (!nextTag) return;
        setCategory(nextTag.id);
        setQuery(nextTag.query);
        search({ provider, query: nextTag.query, category: nextTag.id, pages: 1 });
    }, [provider, search]);

    const setProvider = useCallback((nextProvider) => {
        setProviderState(nextProvider);
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
        search,
        scanCategory,
    };
}
