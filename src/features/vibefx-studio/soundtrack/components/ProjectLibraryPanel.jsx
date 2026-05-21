import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, ArrowDown, ArrowUp, Film, Heart, Import, ListMusic, Loader2, Music2, Plus, ShieldAlert, Trash2, Upload, X } from 'lucide-react';
import { getRightsLabel, getSoundtrackRightsAudit } from '../services/soundtrackRights';

const formatDuration = (seconds = 0) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
};

const ProjectTrackRow = ({ track, projectLibrary, activePlaylist, isSelected, onSelect, onUseInVideo }) => {
    const audit = getSoundtrackRightsAudit(track);
    const usable = track.downloadUrl && !audit.blocked && track.rightsStatus !== 'blocked';
    const inActivePlaylist = activePlaylist?.trackIds?.includes(track.id);
    return (
        <article className="soundtrack-project-row" data-selected={isSelected ? 'true' : 'false'} data-testid={`project-track-${track.id}`}>
            <button type="button" className="soundtrack-project-row__select" onClick={() => onSelect(track)}>
                <Music2 size={14} />
            </button>
            <button type="button" className="soundtrack-project-row__main" onClick={() => onSelect(track)}>
                <strong>{track.title}</strong>
                <span>{track.artist || track.sourceName} / {formatDuration(track.duration)}</span>
            </button>
            <div className="soundtrack-project-row__meta">
                <span>{track.sourceProvider}</span>
                {track.category && <span>{track.category}</span>}
                {track.mood && <span>{track.mood}</span>}
                <span data-state={track.rightsStatus === 'blocked' ? 'danger' : track.rightsStatus === 'needs-review' ? 'warning' : 'success'}>
                    {getRightsLabel(track.rightsStatus)}
                </span>
                {track.favorite && <span data-state="success">favori</span>}
            </div>
            <div className="soundtrack-project-row__actions">
                <button type="button" onClick={() => projectLibrary.toggleFavorite(track)} title="Favori" aria-label={`Favori ${track.title}`}>
                    <Heart size={13} fill={track.favorite ? 'currentColor' : 'none'} />
                </button>
                <button type="button" onClick={() => projectLibrary.markNeedsReview(track)} title="A verifier" aria-label={`Marquer ${track.title} a verifier`}>
                    <ShieldAlert size={13} />
                </button>
                <button
                    type="button"
                    onClick={() => inActivePlaylist ? projectLibrary.removeFromPlaylist(track.id, activePlaylist.id) : projectLibrary.addToPlaylist(track, activePlaylist?.id)}
                    disabled={!activePlaylist}
                    title={activePlaylist ? (inActivePlaylist ? 'Retirer de la playlist projet' : 'Ajouter a la playlist projet') : 'Selectionner une playlist projet'}
                    aria-label={`${inActivePlaylist ? 'Retirer' : 'Ajouter'} ${track.title} ${inActivePlaylist ? 'de' : 'a'} la playlist projet`}
                >
                    {inActivePlaylist ? <X size={13} /> : <ListMusic size={13} />}
                </button>
                {activePlaylist && inActivePlaylist && (
                    <>
                        <button type="button" onClick={() => projectLibrary.movePlaylistTrack(activePlaylist.id, track.id, -1)} title="Monter dans la playlist" aria-label={`Monter ${track.title} dans la playlist projet`}>
                            <ArrowUp size={13} />
                        </button>
                        <button type="button" onClick={() => projectLibrary.movePlaylistTrack(activePlaylist.id, track.id, 1)} title="Descendre dans la playlist" aria-label={`Descendre ${track.title} dans la playlist projet`}>
                            <ArrowDown size={13} />
                        </button>
                    </>
                )}
                <button type="button" onClick={() => onUseInVideo(track)} disabled={!usable} title={usable ? 'Utiliser dans Vibe_CUT' : 'Droits ou fichier indisponibles'}>
                    <Film size={13} />
                </button>
                <button type="button" onClick={() => projectLibrary.archiveTrack(track)} title="Archiver" aria-label={`Archiver ${track.title}`}>
                    <Archive size={13} />
                </button>
                <button type="button" onClick={() => projectLibrary.removeTrack(track)} title="Supprimer metadata" aria-label={`Supprimer ${track.title}`}>
                    <Trash2 size={13} />
                </button>
            </div>
        </article>
    );
};

export default function ProjectLibraryPanel({ projectLibrary, selectedTrack, onSelectTrack, onUseInVideo }) {
    const inputRef = useRef(null);
    const [showArchived, setShowArchived] = useState(false);
    const [playlistName, setPlaylistName] = useState('');
    const [renameValue, setRenameValue] = useState('');
    const [draft, setDraft] = useState({ category: '', mood: '', genre: '', tags: '' });
    const activePlaylist = projectLibrary.playlists.find((playlist) => playlist.id === projectLibrary.selectedPlaylistId) || null;
    const visibleTracks = useMemo(() => {
        const baseTracks = projectLibrary.tracks.filter((track) => showArchived || !track.archived);
        if (!activePlaylist) return baseTracks;
        const trackMap = new Map(baseTracks.map((track) => [track.id, track]));
        return activePlaylist.trackIds.map((trackId) => trackMap.get(trackId)).filter(Boolean);
    }, [activePlaylist, projectLibrary.tracks, showArchived]);

    useEffect(() => {
        setDraft({
            category: selectedTrack?.category || '',
            mood: selectedTrack?.mood || '',
            genre: selectedTrack?.genre || '',
            tags: Array.isArray(selectedTrack?.tags) ? selectedTrack.tags.join(', ') : '',
        });
    }, [selectedTrack?.id, selectedTrack?.category, selectedTrack?.mood, selectedTrack?.genre, selectedTrack?.tags]);

    const saveMetadata = (event) => {
        event.preventDefault();
        if (!selectedTrack?.id) return;
        projectLibrary.updateTrackMetadata(selectedTrack, {
            category: draft.category.trim(),
            mood: draft.mood.trim(),
            genre: draft.genre.trim(),
            tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        });
    };

    return (
        <section className="soundtrack-panel soundtrack-project-panel" aria-label="Bibliotheque projet Vibe_fx">
            <header className="soundtrack-section-header">
                <div>
                    <p>Projet</p>
                    <h2>Bibliotheque Vibe_fx</h2>
                </div>
                <span data-state={projectLibrary.status === 'error' ? 'warning' : 'ready'}>
                    {projectLibrary.tracks.length} piste{projectLibrary.tracks.length > 1 ? 's' : ''}
                </span>
            </header>

            <div className="soundtrack-project-status" data-state={projectLibrary.status}>
                {projectLibrary.status === 'loading' || projectLibrary.status === 'authenticating' ? <Loader2 size={14} className="soundtrack-spin" /> : <Import size={14} />}
                <p>{projectLibrary.message}</p>
            </div>

            <div className="soundtrack-project-actions">
                <button type="button" onClick={() => inputRef.current?.click()} disabled={projectLibrary.status === 'unavailable'}>
                    <Upload size={14} />
                    Importer fichier
                </button>
                <button type="button" onClick={() => setShowArchived((value) => !value)} data-active={showArchived}>
                    <Archive size={14} />
                    Archives
                </button>
            </div>
            <input
                ref={inputRef}
                type="file"
                accept="audio/*"
                className="soundtrack-hidden-input"
                onChange={(event) => {
                    const [file] = Array.from(event.target.files || []);
                    projectLibrary.importFileToProject(file, {
                        socialUse: false,
                        commercialUse: false,
                    });
                    event.target.value = '';
                }}
            />

            <div className="soundtrack-project-playlists" aria-label="Playlists projet">
                <div className="soundtrack-project-playlists__head">
                    <span>Playlists projet</span>
                    <small>{projectLibrary.playlists.length}</small>
                </div>
                <form
                    className="soundtrack-inline-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        projectLibrary.createPlaylist(playlistName);
                        setPlaylistName('');
                    }}
                >
                    <input value={playlistName} onChange={(event) => setPlaylistName(event.target.value)} placeholder="Nouvelle playlist projet" />
                    <button type="submit" aria-label="Creer playlist projet"><Plus size={14} /></button>
                </form>
                <div className="soundtrack-project-playlist-list">
                    <button type="button" data-active={!activePlaylist} onClick={() => projectLibrary.setSelectedPlaylistId('')}>
                        <ListMusic size={13} />
                        <span>Toutes</span>
                        <small>{projectLibrary.tracks.filter((track) => showArchived || !track.archived).length}</small>
                    </button>
                    {projectLibrary.playlists.map((playlist) => (
                        <button
                            key={playlist.id}
                            type="button"
                            data-active={playlist.id === projectLibrary.selectedPlaylistId}
                            onClick={() => {
                                projectLibrary.setSelectedPlaylistId(playlist.id);
                                setRenameValue(playlist.name);
                            }}
                        >
                            <ListMusic size={13} />
                            <span>{playlist.name}</span>
                            <small>{playlist.trackIds.length}</small>
                        </button>
                    ))}
                </div>
                {activePlaylist && (
                    <div className="soundtrack-project-playlist-edit">
                        <input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} placeholder={activePlaylist.name} />
                        <button type="button" onClick={() => projectLibrary.renamePlaylist(activePlaylist.id, renameValue)}>Renommer</button>
                        <button type="button" onClick={() => projectLibrary.deletePlaylist(activePlaylist.id)} aria-label="Supprimer playlist projet"><Trash2 size={13} /></button>
                    </div>
                )}
            </div>

            {selectedTrack?.storagePath && (
                <form className="soundtrack-project-metadata" onSubmit={saveMetadata}>
                    <div className="soundtrack-project-playlists__head">
                        <span>Classement piste</span>
                        <small>{selectedTrack.title}</small>
                    </div>
                    <input value={draft.category} onChange={(event) => setDraft((value) => ({ ...value, category: event.target.value }))} placeholder="Categorie" />
                    <input value={draft.mood} onChange={(event) => setDraft((value) => ({ ...value, mood: event.target.value }))} placeholder="Mood" />
                    <input value={draft.genre} onChange={(event) => setDraft((value) => ({ ...value, genre: event.target.value }))} placeholder="Genre" />
                    <input value={draft.tags} onChange={(event) => setDraft((value) => ({ ...value, tags: event.target.value }))} placeholder="Tags, separes par virgules" />
                    <button type="submit">Enregistrer</button>
                </form>
            )}

            {visibleTracks.length === 0 ? (
                <div className="soundtrack-empty-state soundtrack-empty-state--compact">
                    <Music2 size={18} />
                    <p>Bibliotheque projet vide.</p>
                </div>
            ) : (
                <div className="soundtrack-project-list">
                    {visibleTracks.map((track) => (
                        <ProjectTrackRow
                            key={track.id}
                            track={track}
                            projectLibrary={projectLibrary}
                            activePlaylist={activePlaylist}
                            isSelected={selectedTrack?.id === track.id}
                            onSelect={onSelectTrack}
                            onUseInVideo={onUseInVideo}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
