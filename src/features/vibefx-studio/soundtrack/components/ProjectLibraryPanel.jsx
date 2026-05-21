import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Archive, ArrowDown, ArrowUp, Film, Heart, Import, ListMusic, Loader2, Music2, Pause, Play, Plus, ShieldAlert, Square, Trash2, Upload, UploadCloud, X } from 'lucide-react';
import { getRightsLabel, getSoundtrackRightsAudit } from '../services/soundtrackRights';

const formatDuration = (seconds = 0) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
};

const getTrackCategory = (track = {}) => (
    String(track.category || track.genre || track.mood || track.tags?.[0] || 'Sans categorie').trim()
);

const normalizeCategoryKey = (value = '') => (
    String(value || '').trim().toLowerCase()
);

const MiniWaveform = ({ track, active = false, levels = [], ratio = 0 }) => {
    const fallbackPeaks = Array.isArray(track.waveform?.peaks) && track.waveform.peaks.length
        ? track.waveform.peaks.slice(0, 72)
        : Array.from({ length: 64 }, (_, index) => 0.18 + ((index * 7) % 13) / 18);
    const peaks = active && levels.length
        ? Array.from({ length: 72 }, (_, index) => levels[index % levels.length])
        : fallbackPeaks;
    return (
        <div className="soundtrack-project-scrub__waveform" data-live={active ? 'true' : 'false'} aria-hidden="true">
            {peaks.map((peak, index) => {
                const past = peaks.length > 1 && index / (peaks.length - 1) <= ratio;
                return (
                    <span
                        key={index}
                        data-past={past ? 'true' : 'false'}
                        style={{ transform: `scaleY(${Math.max(0.08, Math.min(1, peak))})` }}
                    />
                );
            })}
        </div>
    );
};

const TrackScrubPanel = ({ track, isSelected, player, onPlay, playableUrl, onReconnect }) => {
    if (!isSelected) return null;
    const isCurrent = player?.playingId === track.id;
    const isPlaying = isCurrent && player?.status === 'playing';
    const duration = Math.max(0, Number(isCurrent ? player?.progress?.duration : track.duration) || Number(track.duration) || 0);
    const currentTime = Math.max(0, Math.min(duration || 0, isCurrent ? Number(player?.progress?.currentTime) || 0 : 0));
    const ratio = duration ? currentTime / duration : 0;

    const seekTo = (value) => {
        const nextTime = Number(value) || 0;
        if (!isCurrent && playableUrl) {
            onPlay(track, playableUrl, { startAt: nextTime });
            return;
        }
        player?.seek?.(nextTime);
    };

    return (
        <div className="soundtrack-project-scrub" data-testid={`project-scrub-${track.id}`}>
            <div className="soundtrack-project-scrub__head">
                <span>Preview piste</span>
                <strong>{formatDuration(currentTime)} / {formatDuration(duration)}</strong>
            </div>
            <MiniWaveform
                track={track}
                active={isCurrent && player?.visualizer?.active}
                levels={isCurrent ? player?.visualizer?.levels : []}
                ratio={ratio}
            />
            <div className="soundtrack-project-scrub__controls">
                <button
                    type="button"
                    onClick={() => playableUrl && onPlay(track, playableUrl)}
                    disabled={!playableUrl}
                    title={playableUrl ? 'Lire ou mettre en pause' : 'Fichier audio indisponible'}
                    aria-label={isPlaying ? `Pause preview ${track.title}` : `Lire preview ${track.title}`}
                >
                    {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                </button>
                <input
                    type="range"
                    min="0"
                    max={duration || 1}
                    step="0.1"
                    value={currentTime}
                    disabled={!playableUrl}
                    onChange={(event) => seekTo(event.target.value)}
                    aria-label={`Avancer la piste ${track.title}`}
                />
                <button
                    type="button"
                    onClick={player?.stop}
                    disabled={!isCurrent}
                    title="Stop"
                    aria-label={`Stop preview ${track.title}`}
                >
                    <Square size={12} />
                </button>
            </div>
            {!playableUrl && (
                <p className="soundtrack-project-scrub__notice">
                    <span>Fichier audio non reconnecte. Reimporte le meme fichier pour restaurer la lecture sans creer de doublon.</span>
                    <button type="button" onClick={onReconnect}>Reimporter audio</button>
                </p>
            )}
        </div>
    );
};

const ProjectTrackRow = ({ track, projectLibrary, activePlaylist, isSelected, player, onSelect, onPlay, onUseInVideo, onReconnect }) => {
    const audit = getSoundtrackRightsAudit(track);
    const usable = track.downloadUrl && !audit.blocked && track.rightsStatus !== 'blocked';
    const inActivePlaylist = activePlaylist?.trackIds?.includes(track.id);
    const playableUrl = track.localObjectUrl || track.previewUrl || track.downloadUrl;
    return (
        <>
            <article className="soundtrack-project-row" data-selected={isSelected ? 'true' : 'false'} data-testid={`project-track-${track.id}`}>
                <button type="button" className="soundtrack-project-row__select" onClick={() => onPlay(track, playableUrl)} disabled={!playableUrl} title="Ecouter">
                    {player?.playingId === track.id && player?.status === 'playing' ? <Pause size={13} /> : <Play size={13} />}
                </button>
                <button type="button" className="soundtrack-project-row__main" onClick={() => onSelect(track)}>
                    <strong>{track.title}</strong>
                    <span>{track.artist || track.sourceName} / {formatDuration(track.duration)}</span>
                </button>
                <div className="soundtrack-project-row__meta">
                    <span>{track.sourceProvider}</span>
                    <span>{getTrackCategory(track)}</span>
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
            <TrackScrubPanel track={track} isSelected={isSelected} player={player} onPlay={onPlay} playableUrl={playableUrl} onReconnect={onReconnect} />
        </>
    );
};

const LocalTrackRow = ({ track, localLibrary, activePlaylist, inActivePlaylist, isSelected, player, onSelect, onPlay, onUseInVideo, onReconnect }) => {
    const audit = getSoundtrackRightsAudit(track);
    const usable = (track.localObjectUrl || track.downloadUrl || track.previewUrl) && !audit.blocked;
    const playableUrl = track.localObjectUrl || track.downloadUrl || track.previewUrl;
    return (
        <>
        <article className="soundtrack-project-row soundtrack-project-row--local" data-selected={isSelected ? 'true' : 'false'} data-testid={`local-track-${track.id}`}>
            <button
                type="button"
                className="soundtrack-project-row__select"
                onClick={() => onPlay(track, playableUrl)}
                disabled={!playableUrl}
                title={playableUrl ? 'Ecouter' : 'Fichier audio a reimporter'}
            >
                {player?.playingId === track.id && player?.status === 'playing' ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button type="button" className="soundtrack-project-row__main" onClick={() => onSelect(track)}>
                <strong>{track.title}</strong>
                <span>{track.artist || track.sourceName} / {formatDuration(track.duration)}</span>
            </button>
            <div className="soundtrack-project-row__meta">
                <span>local</span>
                <span>{getTrackCategory(track)}</span>
                <span data-state={track.fileAvailable ? 'success' : 'warning'}>{track.fileAvailable ? 'fichier ok' : 'metadata'}</span>
                <span data-state={audit.blocked ? 'danger' : track.rightsStatus === 'needs-review' ? 'warning' : 'success'}>
                    {getRightsLabel(track.rightsStatus)}
                </span>
            </div>
            <div className="soundtrack-project-row__actions">
                <button type="button" onClick={() => localLibrary.toggleFavorite(track)} title="Favori" aria-label={`Favori ${track.title}`}>
                    <Heart size={13} fill={track.favorite ? 'currentColor' : 'none'} />
                </button>
                <button
                    type="button"
                    onClick={() => inActivePlaylist ? localLibrary.removeFromPlaylist(track.id, activePlaylist.id) : localLibrary.addToPlaylist(track, activePlaylist?.id)}
                    disabled={!activePlaylist}
                    title={activePlaylist ? (inActivePlaylist ? 'Retirer de la playlist' : 'Ajouter a la playlist') : 'Selectionner une playlist'}
                    aria-label={`${inActivePlaylist ? 'Retirer' : 'Ajouter'} ${track.title} ${inActivePlaylist ? 'de' : 'a'} la playlist bibliotheque`}
                >
                    {inActivePlaylist ? <X size={13} /> : <ListMusic size={13} />}
                </button>
                <button type="button" onClick={() => onUseInVideo(track)} disabled={!usable} title={usable ? 'Utiliser dans Vibe_CUT' : 'Fichier indisponible ou droits bloques'}>
                    <Film size={13} />
                </button>
                <button type="button" onClick={() => localLibrary.removeTrack(track)} title="Supprimer de la bibliotheque locale" aria-label={`Supprimer ${track.title}`}>
                    <Trash2 size={13} />
                </button>
            </div>
        </article>
        <TrackScrubPanel track={track} isSelected={isSelected} player={player} onPlay={onPlay} playableUrl={playableUrl} onReconnect={onReconnect} />
        </>
    );
};

const StarterTrackRow = ({ track, isSelected, player, onSelect, onPlay, onImportProject, onUseInVideo, busy, onReconnect }) => {
    const audit = getSoundtrackRightsAudit(track);
    const playableUrl = track.localObjectUrl || track.previewUrl || track.downloadUrl;
    return (
        <>
        <article className="soundtrack-project-row soundtrack-project-row--starter" data-selected={isSelected ? 'true' : 'false'} data-testid={`project-starter-track-${track.id}`}>
            <button type="button" className="soundtrack-project-row__select" onClick={() => onPlay(track)} title="Ecouter">
                {player?.playingId === track.id && player?.status === 'playing' ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button type="button" className="soundtrack-project-row__main" onClick={() => onSelect(track)}>
                <strong>{track.title}</strong>
                <span>{track.artist || track.sourceName} / {formatDuration(track.duration)}</span>
            </button>
            <div className="soundtrack-project-row__meta">
                <span>incluse</span>
                <span>{track.genre || track.mood || 'Vibe_CUT'}</span>
                <span data-state={audit.blocked ? 'danger' : 'warning'}>{getRightsLabel(track.rightsStatus)}</span>
            </div>
            <div className="soundtrack-project-row__actions">
                <button type="button" onClick={() => onImportProject(track)} disabled={busy || audit.blocked} title="Importer dans la bibliotheque projet">
                    <UploadCloud size={13} />
                </button>
                <button type="button" onClick={() => onUseInVideo(track)} disabled={audit.blocked} title="Utiliser dans Vibe_CUT">
                    <Film size={13} />
                </button>
            </div>
        </article>
        <TrackScrubPanel track={track} isSelected={isSelected} player={player} onPlay={onPlay} playableUrl={playableUrl} onReconnect={onReconnect} />
        </>
    );
};

export default function ProjectLibraryPanel({ projectLibrary, localLibrary, starterTracks = [], selectedTrack, player, onSelectTrack, onPlayTrack, onUseInVideo, variant = 'panel' }) {
    const inputRef = useRef(null);
    const [showArchived, setShowArchived] = useState(false);
    const [playlistName, setPlaylistName] = useState('');
    const [renameValue, setRenameValue] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [draft, setDraft] = useState({ category: '', tags: '' });
    const playlistLibrary = projectLibrary.capability?.ready ? projectLibrary : localLibrary;
    const playlistMode = projectLibrary.capability?.ready ? 'project' : 'local';
    const playlists = playlistLibrary?.playlists || [];
    const selectedPlaylistId = playlistLibrary?.selectedPlaylistId || '';
    const activePlaylist = playlists.find((playlist) => playlist.id === selectedPlaylistId) || null;
    const activeProjectPlaylist = playlistMode === 'project' ? activePlaylist : null;
    const activeLocalPlaylist = playlistMode === 'local' ? activePlaylist : null;
    const playlistScopeLabel = playlistMode === 'project' ? 'Playlists projet' : 'Playlists bibliotheque';
    const categoryOptions = useMemo(() => {
        const categories = new Map();
        [...projectLibrary.tracks, ...(localLibrary?.tracks || []), ...starterTracks].forEach((track) => {
            const category = getTrackCategory(track);
            const key = normalizeCategoryKey(category);
            if (key && !categories.has(key)) categories.set(key, category);
        });
        return Array.from(categories.entries())
            .sort(([, labelA], [, labelB]) => labelA.localeCompare(labelB))
            .map(([key, label]) => ({ key, label }));
    }, [localLibrary?.tracks, projectLibrary.tracks, starterTracks]);
    const categoryMatches = useCallback((track) => (
        !categoryFilter || normalizeCategoryKey(getTrackCategory(track)) === categoryFilter
    ), [categoryFilter]);
    const visibleTracks = useMemo(() => {
        const baseTracks = projectLibrary.tracks.filter((track) => showArchived || !track.archived);
        if (!activeProjectPlaylist) return baseTracks;
        const trackMap = new Map(baseTracks.map((track) => [track.id, track]));
        return activeProjectPlaylist.trackIds.map((trackId) => trackMap.get(trackId)).filter(Boolean);
    }, [activeProjectPlaylist, projectLibrary.tracks, showArchived]);
    const filteredProjectTracks = useMemo(() => (
        activeProjectPlaylist ? visibleTracks : visibleTracks.filter(categoryMatches)
    ), [activeProjectPlaylist, categoryMatches, visibleTracks]);
    const projectTrackIds = useMemo(() => new Set(projectLibrary.tracks.map((track) => track.sourceTrackId || track.id)), [projectLibrary.tracks]);
    const visibleStarterTracks = useMemo(() => (
        activePlaylist ? [] : starterTracks.filter((track) => !projectTrackIds.has(track.id)).filter(categoryMatches)
    ), [activePlaylist, categoryMatches, projectTrackIds, starterTracks]);
    const visibleLocalTracks = useMemo(() => (
        activeProjectPlaylist ? [] : (localLibrary?.tracks || []).filter(categoryMatches)
    ), [activeProjectPlaylist, categoryMatches, localLibrary?.tracks]);
    const localTrackIds = useMemo(() => new Set((localLibrary?.tracks || []).map((track) => track.id)), [localLibrary?.tracks]);

    useEffect(() => {
        setDraft({
            category: getTrackCategory(selectedTrack),
            tags: Array.isArray(selectedTrack?.tags) ? selectedTrack.tags.join(', ') : '',
        });
    }, [selectedTrack, selectedTrack?.id, selectedTrack?.tags]);

    const selectedIsLocal = selectedTrack?.id && localTrackIds.has(selectedTrack.id);
    const selectedIsProject = selectedTrack?.storagePath || projectLibrary.tracks.some((track) => track.id === selectedTrack?.id);
    const canEditSelectedMetadata = selectedIsLocal || selectedIsProject;
    const reconnectLocalAudio = useCallback(() => {
        inputRef.current?.click();
    }, []);
    const saveMetadata = (event) => {
        event.preventDefault();
        if (!selectedTrack?.id) return;
        const patch = {
            category: draft.category.trim(),
            tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        };
        if (selectedIsLocal) localLibrary?.updateTrackMetadata?.(selectedTrack, patch);
        else projectLibrary.updateTrackMetadata(selectedTrack, patch);
    };

    return (
        <section className={`soundtrack-panel soundtrack-project-panel soundtrack-project-panel--${variant}`} aria-label="Bibliotheque projet Vibe_fx">
            <header className="soundtrack-section-header">
                <div>
                    <p>Projet</p>
                    <h2>Bibliotheque Vibe_fx</h2>
                </div>
                <span data-state={projectLibrary.status === 'error' ? 'warning' : 'ready'}>
                    {filteredProjectTracks.length + visibleLocalTracks.length + visibleStarterTracks.length} piste{filteredProjectTracks.length + visibleLocalTracks.length + visibleStarterTracks.length > 1 ? 's' : ''}
                </span>
            </header>

            <div className="soundtrack-project-status" data-state={projectLibrary.status}>
                {projectLibrary.status === 'loading' || projectLibrary.status === 'authenticating' ? <Loader2 size={14} className="soundtrack-spin" /> : <Import size={14} />}
                <p>{playlistMode === 'local' ? (localLibrary?.lastEvent || 'Bibliotheque locale active. Firebase projet indisponible.') : projectLibrary.message}</p>
            </div>

            <div className="soundtrack-project-actions">
                <button type="button" onClick={() => inputRef.current?.click()}>
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
                    if (projectLibrary.capability?.ready) {
                        projectLibrary.importFileToProject(file, {
                            socialUse: false,
                            commercialUse: false,
                        });
                    } else {
                        localLibrary?.importFiles?.(event.target.files);
                    }
                    event.target.value = '';
                }}
            />

            <div className="soundtrack-project-playlists" aria-label={playlistScopeLabel}>
                <div className="soundtrack-project-playlists__head">
                    <span>{playlistScopeLabel}</span>
                    <small>{playlists.length}</small>
                </div>
                <form
                    className="soundtrack-inline-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        playlistLibrary?.createPlaylist?.(playlistName);
                        setPlaylistName('');
                    }}
                >
                    <input value={playlistName} onChange={(event) => setPlaylistName(event.target.value)} placeholder={playlistMode === 'local' ? 'Nouvelle playlist bibliotheque' : 'Nouvelle playlist projet'} />
                    <button type="submit" aria-label={playlistMode === 'local' ? 'Creer playlist bibliotheque' : 'Creer playlist projet'}><Plus size={14} /></button>
                </form>
                <div className="soundtrack-project-playlist-list">
                    <button type="button" data-active={!activePlaylist} onClick={() => playlistLibrary?.setSelectedPlaylistId?.('')}>
                        <ListMusic size={13} />
                        <span>Toutes</span>
                        <small>{visibleLocalTracks.length + filteredProjectTracks.length + visibleStarterTracks.length}</small>
                    </button>
                    {playlists.map((playlist) => (
                        <button
                            key={playlist.id}
                            type="button"
                            data-active={playlist.id === selectedPlaylistId}
                            onClick={() => {
                                playlistLibrary?.setSelectedPlaylistId?.(playlist.id);
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
                        <button type="button" onClick={() => playlistLibrary?.renamePlaylist?.(activePlaylist.id, renameValue)}>Renommer</button>
                        <button type="button" onClick={() => playlistLibrary?.deletePlaylist?.(activePlaylist.id)} aria-label={playlistMode === 'local' ? 'Supprimer playlist bibliotheque' : 'Supprimer playlist projet'}><Trash2 size={13} /></button>
                    </div>
                )}
                {!activePlaylist && (
                    <label className="soundtrack-category-filter">
                        <span>Categorie</span>
                        <select
                            value={categoryFilter}
                            onChange={(event) => setCategoryFilter(event.target.value)}
                            aria-label="Filtrer la bibliotheque par categorie"
                        >
                            <option value="">Toutes categories</option>
                            {categoryOptions.map((category) => (
                                <option key={category.key} value={category.key}>{category.label}</option>
                            ))}
                        </select>
                    </label>
                )}
            </div>

            {canEditSelectedMetadata && (
                <form className="soundtrack-project-metadata" onSubmit={saveMetadata}>
                    <div className="soundtrack-project-playlists__head">
                        <span>Classement piste</span>
                        <small>{selectedTrack.title}</small>
                    </div>
                    <input
                        list="soundtrack-category-options"
                        value={draft.category}
                        onChange={(event) => setDraft((value) => ({ ...value, category: event.target.value }))}
                        placeholder="Categorie principale"
                    />
                    <datalist id="soundtrack-category-options">
                        {categoryOptions.map((category) => (
                            <option key={category.key} value={category.label} />
                        ))}
                    </datalist>
                    <input value={draft.tags} onChange={(event) => setDraft((value) => ({ ...value, tags: event.target.value }))} placeholder="Tags, separes par virgules" />
                    <button type="submit">Enregistrer</button>
                </form>
            )}

            {filteredProjectTracks.length === 0 && visibleLocalTracks.length === 0 && visibleStarterTracks.length === 0 ? (
                <div className="soundtrack-empty-state soundtrack-empty-state--compact">
                    <Music2 size={18} />
                    <p>{categoryFilter ? 'Aucune piste dans cette categorie.' : 'Bibliotheque projet vide.'}</p>
                </div>
            ) : (
                <div className="soundtrack-project-list">
                    {visibleStarterTracks.length > 0 && (
                        <div className="soundtrack-project-list__group">
                            <div className="soundtrack-project-playlists__head">
                                <span>Pistes Vibe_CUT incluses</span>
                                <small>{visibleStarterTracks.length}</small>
                            </div>
                        </div>
                    )}
                    {visibleStarterTracks.map((track) => (
                        <StarterTrackRow
                            key={track.id}
                            track={track}
                            isSelected={selectedTrack?.id === track.id}
                            player={player}
                            onSelect={onSelectTrack}
                            onPlay={onPlayTrack}
                            onImportProject={projectLibrary.importTrackToProject}
                            onUseInVideo={onUseInVideo}
                            busy={projectLibrary.busyTrackId === track.id}
                            onReconnect={reconnectLocalAudio}
                        />
                    ))}
                    {visibleLocalTracks.length > 0 && (
                        <div className="soundtrack-project-list__group">
                            <div className="soundtrack-project-playlists__head">
                                <span>Imports locaux</span>
                                <small>{visibleLocalTracks.length}</small>
                            </div>
                        </div>
                    )}
                    {visibleLocalTracks.map((track) => (
                        <LocalTrackRow
                            key={track.id}
                            track={track}
                            localLibrary={localLibrary}
                            activePlaylist={activeLocalPlaylist}
                            inActivePlaylist={Boolean(activeLocalPlaylist?.trackIds?.includes(track.id))}
                            isSelected={selectedTrack?.id === track.id}
                            player={player}
                            onSelect={onSelectTrack}
                            onPlay={onPlayTrack}
                            onUseInVideo={onUseInVideo}
                            onReconnect={reconnectLocalAudio}
                        />
                    ))}
                    {filteredProjectTracks.length > 0 && (visibleStarterTracks.length > 0 || visibleLocalTracks.length > 0) && (
                        <div className="soundtrack-project-list__group">
                            <div className="soundtrack-project-playlists__head">
                                <span>Imports projet</span>
                                <small>{filteredProjectTracks.length}</small>
                            </div>
                        </div>
                    )}
                    {filteredProjectTracks.map((track) => (
                        <ProjectTrackRow
                            key={track.id}
                            track={track}
                            projectLibrary={projectLibrary}
                            activePlaylist={activeProjectPlaylist}
                            isSelected={selectedTrack?.id === track.id}
                            player={player}
                            onSelect={onSelectTrack}
                            onPlay={onPlayTrack}
                            onUseInVideo={onUseInVideo}
                            onReconnect={reconnectLocalAudio}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
