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
    return (
        <section className="soundtrack-aggregator-panel" aria-label="Agregateur sources gratuites">
            <SoundtrackSearch search={search} />
            <SoundtrackResults
                results={search.results}
                libraryTracks={localLibrary.tracks}
                projectTracks={projectLibrary.tracks}
                showFavorites={false}
                searchStatus={search.status}
                player={player}
                library={localLibrary}
                projectLibrary={projectLibrary}
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
