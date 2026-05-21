import React from 'react';
import SoundtrackResults from './SoundtrackResults';
import SoundtrackSearch from './SoundtrackSearch';

export default function AggregatorPanel({
    search,
    player,
    localLibrary,
    projectLibrary,
    onPlayTrack,
    onUseInVideo,
    onSelectTrack,
}) {
    const activeProvider = search.providerStatus?.find((provider) => provider.id === search.provider);
    const providerTitle = activeProvider?.label
        || (search.provider === 'pixabay' ? 'Pixabay Music' : 'Openverse Audio');

    return (
        <section className="soundtrack-aggregator-panel" aria-label="Agregateur sources gratuites">
            <SoundtrackSearch search={search} />
            <SoundtrackResults
                results={search.results}
                libraryTracks={localLibrary.tracks}
                projectTracks={projectLibrary.tracks}
                showFavorites={false}
                searchStatus={search.status}
                statusMessage={search.error}
                player={player}
                library={localLibrary}
                projectLibrary={projectLibrary}
                modeEyebrow="Agregateur provider-first"
                modeTitle={providerTitle}
                onPlayTrack={(track, url) => {
                    onSelectTrack(track);
                    onPlayTrack(track, url);
                }}
                onUseInVideo={onUseInVideo}
                onSelectTrack={onSelectTrack}
            />
        </section>
    );
}
