import React from 'react';
import PixabayImportAssistant from './PixabayImportAssistant';
import SoundtrackResults from './SoundtrackResults';
import SoundtrackSearch from './SoundtrackSearch';

export default function AggregatorPanel({
    search,
    player,
    localLibrary,
    projectLibrary,
    selectedTrack,
    onPlayTrack,
    onUseInVideo,
    onSelectTrack,
    onImportComplete,
    onOpenAiImport,
}) {
    const activeProvider = search.providerStatus?.find((provider) => provider.id === search.provider);
    const providerTitle = activeProvider?.label
        || search.providerDefinitions?.find((provider) => provider.id === search.provider)?.label
        || 'Openverse Audio';

    return (
        <section className="soundtrack-aggregator-panel" aria-label="Agregateur sources gratuites">
            <div className="soundtrack-aggregator-tools">
                <SoundtrackSearch search={search} onOpenAiImport={onOpenAiImport} />
                <PixabayImportAssistant
                    search={search}
                    localLibrary={localLibrary}
                    projectLibrary={projectLibrary}
                    onSelectTrack={onSelectTrack}
                    onImportComplete={onImportComplete}
                />
            </div>
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
                selectedTrack={selectedTrack}
                modeEyebrow="Agregateur provider-first"
                modeTitle={providerTitle}
                onPlayTrack={(track, url, options) => {
                    onSelectTrack(track);
                    onPlayTrack(track, url, options);
                }}
                onUseInVideo={onUseInVideo}
                onSelectTrack={onSelectTrack}
            />
        </section>
    );
}
