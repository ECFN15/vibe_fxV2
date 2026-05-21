import React from 'react';
import { Loader2, Music2 } from 'lucide-react';
import SoundtrackTrackRow from './SoundtrackTrackRow';

export default function SoundtrackResults({
    results,
    libraryTracks,
    showFavorites,
    searchStatus,
    player,
    library,
    onPlayTrack,
    onUseInVideo,
}) {
    const rows = showFavorites ? libraryTracks.filter((track) => track.favorite) : results;

    return (
        <section className="soundtrack-results" aria-label="Resultats soundtrack">
            <header className="soundtrack-section-header">
                <div>
                    <p>Catalogue</p>
                    <h2>{showFavorites ? 'Favoris locaux' : 'Recherche multi-source'}</h2>
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
                    <p>{showFavorites ? 'Aucun favori local.' : 'Aucun resultat pour ces filtres.'}</p>
                </div>
            ) : (
                <div className="soundtrack-results__list">
                    {rows.map((track) => (
                        <SoundtrackTrackRow
                            key={track.id}
                            track={libraryTracks.find((item) => item.id === track.id) || track}
                            playlists={library.playlists}
                            selectedPlaylistId={library.selectedPlaylistId}
                            isPlaying={player.playingId === track.id}
                            isBusy={library.busyTrackId === track.id}
                            onPlay={onPlayTrack}
                            onFavorite={library.toggleFavorite}
                            onAddToPlaylist={library.addToPlaylist}
                            onDownload={library.downloadTrackLocally}
                            onUseInVideo={onUseInVideo}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
