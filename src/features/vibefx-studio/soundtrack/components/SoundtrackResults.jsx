import React from 'react';
import { Loader2, Music2 } from 'lucide-react';
import SoundtrackTrackRow from './SoundtrackTrackRow';

export default function SoundtrackResults({
    results,
    libraryTracks,
    projectTracks = [],
    showFavorites,
    searchStatus,
    statusMessage,
    player,
    library,
    projectLibrary,
    modeEyebrow,
    modeTitle,
    onPlayTrack,
    onUseInVideo,
    onSelectTrack,
}) {
    const rows = showFavorites ? libraryTracks.filter((track) => track.favorite) : results;
    const projectTrackIds = new Set(projectTracks.map((track) => track.id));

    return (
        <section className="soundtrack-results" aria-label="Resultats soundtrack">
            <header className="soundtrack-section-header">
                <div>
                    <p>{modeEyebrow || (showFavorites ? 'Selection locale' : 'Agregateur')}</p>
                    <h2>{modeTitle || (showFavorites ? 'Favoris locaux' : 'Sources gratuites')}</h2>
                </div>
                <span>{rows.length} piste{rows.length > 1 ? 's' : ''}</span>
            </header>

            {searchStatus === 'loading' ? (
                <div className="soundtrack-empty-state">
                    <Loader2 size={18} className="soundtrack-spin" />
                    <p>Recherche des sources gratuites...</p>
                </div>
            ) : rows.length === 0 ? (
                <div className="soundtrack-empty-state">
                    <Music2 size={20} />
                    <p>
                        {showFavorites
                            ? 'Aucun favori local.'
                            : searchStatus === 'idle'
                                ? 'Pret a scanner la source active.'
                                : statusMessage || (searchStatus === 'provider-unavailable' || searchStatus === 'error'
                                    ? 'Provider indisponible pour ce scan. Reessayez plus tard ou utilisez une autre source active.'
                                    : 'Aucun resultat pour ces filtres.')}
                    </p>
                </div>
            ) : (
                <div className="soundtrack-results__list">
                    {rows.map((track) => (
                        <SoundtrackTrackRow
                            key={track.id}
                            track={libraryTracks.find((item) => item.id === track.id) || track}
                            importedInProject={projectTrackIds.has(track.id)}
                            playlists={library.playlists}
                            selectedPlaylistId={library.selectedPlaylistId}
                            isPlaying={player.playingId === track.id}
                            visualizer={player.visualizer}
                            isBusy={library.busyTrackId === track.id}
                            isProjectBusy={projectLibrary?.busyTrackId === track.id}
                            projectImportUnavailableReason={projectLibrary?.capability?.ready ? '' : projectLibrary?.capability?.reason || 'Firebase projet non configure.'}
                            onPlay={onPlayTrack}
                            onSelect={onSelectTrack}
                            onFavorite={library.toggleFavorite}
                            onAddToPlaylist={library.addToPlaylist}
                            onDownload={library.downloadTrackLocally}
                            onImportProject={projectLibrary?.importTrackToProject}
                            onUseInVideo={onUseInVideo}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
