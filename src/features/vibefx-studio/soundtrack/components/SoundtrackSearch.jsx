import React, { useEffect } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import {
    SOUNDTRACK_BPM_FILTERS,
    SOUNDTRACK_DURATION_FILTERS,
    SOUNDTRACK_GENRES,
    SOUNDTRACK_LICENSE_FILTERS,
    SOUNDTRACK_MOOD_FILTERS,
    SOUNDTRACK_PROVIDERS,
} from '../data/soundtrackDefaults';

const SelectControl = ({ label, value, onChange, options }) => (
    <label className="soundtrack-field">
        <span>{label}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
            {options.map((option) => (
                <option key={option.id} value={option.id}>{option.label || option.name}</option>
            ))}
        </select>
    </label>
);

export default function SoundtrackSearch({ search }) {
    useEffect(() => {
        search.search();
        // Initial load only; subsequent searches are explicit to avoid remote churn.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const submit = (event) => {
        event.preventDefault();
        search.search();
    };

    return (
        <section className="soundtrack-search" aria-label="Recherche soundtrack">
            <form className="soundtrack-search__command" onSubmit={submit}>
                <Search size={16} />
                <input
                    value={search.query}
                    onChange={(event) => search.setQuery(event.target.value)}
                    placeholder="ambient, cyberpunk, intro, jazz..."
                    aria-label="Recherche musique multi-source"
                />
                <button type="submit" disabled={search.status === 'loading'}>
                    {search.status === 'loading' ? 'Recherche...' : 'Chercher'}
                </button>
            </form>

            <div className="soundtrack-search__filters">
                <div className="soundtrack-filter-label">
                    <SlidersHorizontal size={13} />
                    Filtres
                </div>
                <SelectControl label="Provider" value={search.provider} onChange={search.setProvider} options={SOUNDTRACK_PROVIDERS} />
                <SelectControl label="Genre" value={search.genre} onChange={search.setGenre} options={SOUNDTRACK_GENRES} />
                <SelectControl label="Licence" value={search.license} onChange={search.setLicense} options={SOUNDTRACK_LICENSE_FILTERS} />
                <SelectControl label="Mood" value={search.mood} onChange={search.setMood} options={SOUNDTRACK_MOOD_FILTERS} />
                <SelectControl label="BPM" value={search.bpm} onChange={search.setBpm} options={SOUNDTRACK_BPM_FILTERS} />
                <SelectControl label="Duree" value={search.duration} onChange={search.setDuration} options={SOUNDTRACK_DURATION_FILTERS} />
            </div>

            <div className="soundtrack-provider-status" aria-label="Statut providers musique">
                {search.providerStatus.map((provider) => (
                    <span key={provider.id} data-state={provider.error ? 'warning' : 'ready'} title={provider.error || `${provider.count} resultats`}>
                        {provider.label}: {provider.error ? 'config' : provider.count}
                    </span>
                ))}
                {search.error && <span data-state="warning">{search.error}</span>}
            </div>
        </section>
    );
}
