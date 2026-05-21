import { useCallback, useMemo, useRef, useState } from 'react';
import { getStarterSoundtrackTracks } from '../data/soundtrackDefaults';
import { buildProviderSearchUrl } from '../services/providerSearchClient';
import { normalizeSoundtrackTrack } from '../services/soundtrackManifest';
import { normalizeSearchTrackRights } from '../services/soundtrackRights';

const durationMatches = (track, filter) => {
    if (!filter) return true;
    const duration = Number(track.duration) || 0;
    if (filter === 'short') return duration > 0 && duration < 60;
    if (filter === 'medium') return duration >= 60 && duration <= 240;
    if (filter === 'long') return duration > 240;
    return true;
};

const bpmMatches = (track, filter) => {
    if (!filter) return true;
    const bpm = Number(track.bpm) || 0;
    if (!bpm) return true;
    if (filter === 'slow') return bpm < 90;
    if (filter === 'mid') return bpm >= 90 && bpm <= 130;
    if (filter === 'fast') return bpm > 130;
    return true;
};

const trackMatchesText = (track, query) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return [track.title, track.artist, track.sourceName, track.license, track.mood, ...(track.tags || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
};

export function useSoundtrackSearch() {
    const [query, setQuery] = useState('ambient');
    const [provider, setProvider] = useState('all');
    const [genre, setGenre] = useState('');
    const [license, setLicense] = useState('');
    const [mood, setMood] = useState('');
    const [bpm, setBpm] = useState('');
    const [duration, setDuration] = useState('');
    const [results, setResults] = useState([]);
    const [providerStatus, setProviderStatus] = useState([]);
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const abortRef = useRef(null);

    const filters = useMemo(() => ({
        query,
        provider,
        genre,
        license,
        mood,
        bpm,
        duration,
    }), [bpm, duration, genre, license, mood, provider, query]);

    const applyFilters = useCallback((tracks, activeFilters = filters) => (
        tracks
            .map((track) => normalizeSoundtrackTrack(normalizeSearchTrackRights(track)))
            .filter((track) => trackMatchesText(track, activeFilters.query))
            .filter((track) => !activeFilters.genre || track.tags.includes(activeFilters.genre) || track.mood.toLowerCase().includes(activeFilters.genre.toLowerCase()))
            .filter((track) => !activeFilters.license || track.rightsStatus === activeFilters.license || track.rightsStatus === 'verified-free' && activeFilters.license === 'cleared-social')
            .filter((track) => !activeFilters.mood || track.tags.includes(activeFilters.mood) || track.mood.toLowerCase().includes(activeFilters.mood.toLowerCase()))
            .filter((track) => bpmMatches(track, activeFilters.bpm))
            .filter((track) => durationMatches(track, activeFilters.duration))
    ), [filters]);

    const search = useCallback(async (overrides = {}) => {
        const activeFilters = { ...filters, ...overrides };
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setStatus('loading');
        setError('');

        const starterTracks = getStarterSoundtrackTracks(activeFilters.query, activeFilters.genre);
        if (activeFilters.provider === 'starter' || activeFilters.provider === 'pixabay') {
            setResults(applyFilters(starterTracks, activeFilters));
            setProviderStatus(activeFilters.provider === 'pixabay'
                ? [
                    {
                        id: 'pixabay',
                        label: 'Pixabay Music',
                        configured: true,
                        count: 0,
                        error: 'Import manuel: collez une URL audio directe Pixabay ou telechargez depuis la source officielle.',
                    },
                    { id: 'starter', label: 'Starter local', configured: true, count: starterTracks.length, error: '' },
                ]
                : [{ id: 'starter', label: 'Starter local', configured: true, count: starterTracks.length, error: '' }]);
            setStatus('ready');
            return;
        }

        try {
            const response = await fetch(buildProviderSearchUrl({
                ...activeFilters,
                provider: activeFilters.provider === 'all' ? 'all' : activeFilters.provider,
            }), { signal: controller.signal });
            if (!response.ok) throw new Error('Recherche musique indisponible.');
            const payload = await response.json();
            const remoteTracks = Array.isArray(payload.tracks) ? payload.tracks : [];
            const merged = activeFilters.provider === 'all' ? [...starterTracks, ...remoteTracks] : remoteTracks;
            setResults(applyFilters(merged, activeFilters));
            setProviderStatus([
                { id: 'starter', label: 'Starter local', configured: true, count: starterTracks.length, error: '' },
                ...(payload.providers || []),
            ]);
            setStatus(merged.length ? 'ready' : 'empty');
        } catch (searchError) {
            if (searchError.name === 'AbortError') return;
            setResults(applyFilters(starterTracks, activeFilters));
            setProviderStatus([{ id: 'starter', label: 'Starter local', configured: true, count: starterTracks.length, error: '' }]);
            setError(searchError.message || 'Recherche distante indisponible. Starter local affiche.');
            setStatus(starterTracks.length ? 'fallback' : 'error');
        }
    }, [applyFilters, filters]);

    return {
        query,
        setQuery,
        provider,
        setProvider,
        genre,
        setGenre,
        license,
        setLicense,
        mood,
        setMood,
        bpm,
        setBpm,
        duration,
        setDuration,
        results,
        providerStatus,
        status,
        error,
        search,
    };
}
