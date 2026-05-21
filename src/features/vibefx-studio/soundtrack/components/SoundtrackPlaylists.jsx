import React, { useState } from 'react';
import { ArrowDown, ArrowUp, ListMusic, Plus, Trash2 } from 'lucide-react';

export default function SoundtrackPlaylists({ library }) {
    const [name, setName] = useState('');
    const [renameValue, setRenameValue] = useState('');
    const activePlaylist = library.playlists.find((playlist) => playlist.id === library.selectedPlaylistId) || null;
    const trackMap = new Map(library.tracks.map((track) => [track.id, track]));

    const create = (event) => {
        event.preventDefault();
        library.createPlaylist(name);
        setName('');
    };

    return (
        <section className="soundtrack-panel" aria-label="Playlists locales">
            <header className="soundtrack-section-header">
                <div>
                    <p>Local</p>
                    <h2>Playlists</h2>
                </div>
                <span>{library.playlists.length}</span>
            </header>

            <form className="soundtrack-inline-form" onSubmit={create}>
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nouvelle playlist" />
                <button type="submit" aria-label="Creer playlist"><Plus size={14} /></button>
            </form>

            <div className="soundtrack-playlist-list">
                {library.playlists.map((playlist) => (
                    <button
                        key={playlist.id}
                        type="button"
                        onClick={() => {
                            library.setSelectedPlaylistId(playlist.id);
                            setRenameValue(playlist.name);
                        }}
                        data-active={playlist.id === library.selectedPlaylistId}
                    >
                        <ListMusic size={13} />
                        <span>{playlist.name}</span>
                        <small>{playlist.trackIds.length}</small>
                    </button>
                ))}
            </div>

            {activePlaylist ? (
                <div className="soundtrack-playlist-detail">
                    <div className="soundtrack-inline-form">
                        <input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} placeholder={activePlaylist.name} />
                        <button type="button" onClick={() => library.renamePlaylist(activePlaylist.id, renameValue)}>Renommer</button>
                        <button type="button" onClick={() => library.deletePlaylist(activePlaylist.id)} aria-label="Supprimer playlist"><Trash2 size={13} /></button>
                    </div>
                    <div className="soundtrack-playlist-tracks">
                        {activePlaylist.trackIds.length === 0 ? (
                            <p>Aucune piste dans cette playlist.</p>
                        ) : activePlaylist.trackIds.map((trackId) => {
                            const track = trackMap.get(trackId);
                            return (
                                <div key={trackId} className="soundtrack-playlist-track">
                                    <span>{track?.title || 'Piste manquante'}</span>
                                    <div>
                                        <button type="button" onClick={() => library.movePlaylistTrack(activePlaylist.id, trackId, -1)} aria-label="Monter piste"><ArrowUp size={12} /></button>
                                        <button type="button" onClick={() => library.movePlaylistTrack(activePlaylist.id, trackId, 1)} aria-label="Descendre piste"><ArrowDown size={12} /></button>
                                        <button type="button" onClick={() => library.removeFromPlaylist(trackId, activePlaylist.id)} aria-label="Retirer piste"><Trash2 size={12} /></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <p className="soundtrack-panel-note">Creez ou selectionnez une playlist pour organiser les favoris locaux.</p>
            )}
        </section>
    );
}
