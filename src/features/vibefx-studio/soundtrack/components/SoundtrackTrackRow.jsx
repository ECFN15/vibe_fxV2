import React from 'react';
import { Download, ExternalLink, Film, Heart, Library, Pause, Play, Plus, ShieldCheck, Square, TriangleAlert, UploadCloud } from 'lucide-react';
import { AI_AUDIO_PROVIDERS } from '../services/soundtrackDownloads';
import { getRightsLabel, getSoundtrackRightsAudit } from '../services/soundtrackRights';

const formatDuration = (seconds = 0) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
};

const Waveform = ({ waveform, isActive, levels = [] }) => {
    const fallbackPeaks = Array.isArray(waveform?.peaks) && waveform.peaks.length
        ? waveform.peaks.slice(0, 56)
        : Array.from({ length: 40 }, (_, index) => 0.16 + ((index % 7) / 16));
    const peaks = isActive && levels.length
        ? Array.from({ length: 56 }, (_, index) => levels[index % levels.length])
        : fallbackPeaks;
    return (
        <div
            className="soundtrack-waveform"
            data-status={waveform?.status || 'placeholder'}
            data-live={isActive ? 'true' : 'false'}
            data-mode={isActive && !levels.length ? 'pulse' : 'levels'}
            aria-hidden="true"
        >
            {peaks.map((peak, index) => (
                <span
                    key={index}
                    style={{
                        '--bar-index': index,
                        transform: `scaleY(${Math.max(0.08, peak)})`,
                    }}
                />
            ))}
        </div>
    );
};

const ScrubWaveform = ({ track, active = false, levels = [], ratio = 0 }) => {
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

const AggregatorScrubPanel = ({ track, isSelected, player, onPlay, playableUrl }) => {
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
        <div className="soundtrack-project-scrub soundtrack-track-scrub" data-testid={`aggregator-scrub-${track.id}`}>
            <div className="soundtrack-project-scrub__head">
                <span>Preview piste</span>
                <strong>{formatDuration(currentTime)} / {formatDuration(duration)}</strong>
            </div>
            <ScrubWaveform
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
                    title={playableUrl ? 'Lire ou mettre en pause' : 'Preview audio indisponible'}
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
        </div>
    );
};

export default function SoundtrackTrackRow({
    track,
    importedInProject,
    playlists,
    selectedPlaylistId,
    isSelected,
    isPlaying,
    player,
    visualizer,
    isBusy,
    isProjectBusy,
    projectImportUnavailableReason = '',
    onPlay,
    onSelect,
    onFavorite,
    onAddToPlaylist,
    onDownload,
    onImportProject,
    onUseInVideo,
}) {
    const audit = getSoundtrackRightsAudit(track);
    const playableUrl = track.localObjectUrl || track.previewUrl || track.downloadUrl;
    const canUseInVideo = track.fileAvailable || Boolean(track.localObjectUrl) || Boolean(track.storagePath && track.downloadUrl) || playableUrl?.startsWith('data:audio/');
    const isRemoteProviderResult = ['pixabay', 'openverse', 'jamendo', 'freesound', ...AI_AUDIO_PROVIDERS].includes(track.provider);
    const showMissingFile = track.fileAvailable === false && !track.storagePath && !isRemoteProviderResult;
    const canImportProject = track.importStatus === 'importable' && Boolean(track.downloadUrl || track.previewUrl || track.audioUrl);
    const projectImportDisabledReason = projectImportUnavailableReason || (audit.blocked ? 'Droits bloques pour import projet.' : '');
    const visualizerActive = visualizer?.trackId === track.id && visualizer.active;

    return (
        <>
            <article
                className="soundtrack-track-row"
                data-testid={`soundtrack-track-${track.id}`}
                data-import-status={track.importStatus || 'local'}
                data-missing={showMissingFile ? 'true' : 'false'}
                data-playing={visualizerActive ? 'true' : 'false'}
                data-selected={isSelected ? 'true' : 'false'}
                onClick={() => onSelect?.(track)}
            >
                <button
                    type="button"
                    className="soundtrack-track-row__play"
                    onClick={() => onPlay(track, playableUrl)}
                    disabled={!playableUrl}
                    aria-label={isPlaying ? `Pause ${track.title}` : `Ecouter ${track.title}`}
                    title={playableUrl ? 'Ecouter' : 'Preview audio indisponible'}
                >
                    {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                </button>

                <div className="soundtrack-track-row__main">
                    <div className="soundtrack-track-row__title">
                        <strong>{track.title}</strong>
                        <span>{track.artist || track.sourceName}</span>
                    </div>
                    <Waveform waveform={track.waveform} isActive={visualizerActive} levels={visualizer?.levels} />
                    <div className="soundtrack-track-row__chips">
                        <span>{track.provider}</span>
                        <span>{formatDuration(track.duration)}</span>
                        {track.bpm ? <span>{track.bpm} BPM</span> : null}
                        <span>{track.license}</span>
                        {importedInProject && <span data-state="success">projet</span>}
                        {track.importStatus === 'metadata-only' && <span data-state="warning">metadata-only</span>}
                        {track.importStatus === 'blocked' && <span data-state="danger">blocked</span>}
                        <span data-state={audit.blocked ? 'danger' : track.rightsStatus === 'needs-review' ? 'warning' : 'success'}>
                            {audit.blocked ? <TriangleAlert size={11} /> : <ShieldCheck size={11} />}
                            {getRightsLabel(track.rightsStatus)}
                        </span>
                        {showMissingFile && <span data-state="warning">fichier manquant</span>}
                        {track.blockedReason && <span data-state="warning">{track.blockedReason}</span>}
                    </div>
                </div>

                <div className="soundtrack-track-row__actions">
                    <button
                        type="button"
                        className="soundtrack-icon-button"
                        onClick={() => onFavorite(track)}
                        aria-pressed={track.favorite}
                        aria-label={track.favorite ? `Retirer ${track.title} des favoris` : `Ajouter ${track.title} aux favoris`}
                        title="Favori"
                    >
                        <Heart size={14} fill={track.favorite ? 'currentColor' : 'none'} />
                    </button>
                    <select
                        value=""
                        onChange={(event) => {
                            if (event.target.value) onAddToPlaylist(track, event.target.value);
                        }}
                        aria-label={`Ajouter ${track.title} a une playlist`}
                    >
                        <option value="">Playlist</option>
                        {playlists.map((playlist) => (
                            <option key={playlist.id} value={playlist.id}>{playlist.name}</option>
                        ))}
                        {selectedPlaylistId && !playlists.some((playlist) => playlist.id === selectedPlaylistId) ? (
                            <option value={selectedPlaylistId}>Playlist active</option>
                        ) : null}
                    </select>
                    <button
                        type="button"
                        className="soundtrack-icon-button"
                        onClick={() => onAddToPlaylist(track, selectedPlaylistId)}
                        disabled={!selectedPlaylistId}
                        title="Ajouter a la playlist active"
                        aria-label={`Ajouter ${track.title} a la playlist active`}
                    >
                        <Plus size={14} />
                    </button>
                    {canImportProject || importedInProject ? (
                        <button
                            type="button"
                            className="soundtrack-action-button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onImportProject?.(track);
                            }}
                            disabled={!onImportProject || isProjectBusy || audit.blocked || importedInProject || Boolean(projectImportUnavailableReason)}
                            title={projectImportDisabledReason || (importedInProject ? 'Deja dans le projet' : 'Importer dans la bibliotheque projet')}
                            aria-label={`Importer ${track.title} dans la bibliotheque projet`}
                        >
                            <UploadCloud size={14} />
                            {importedInProject ? 'Projet' : isProjectBusy ? 'Import...' : projectImportUnavailableReason ? 'Projet indispo' : 'Importer projet'}
                        </button>
                    ) : (
                        <span className="soundtrack-row-status" data-state={track.importStatus === 'blocked' ? 'danger' : 'warning'}>
                            {track.importStatus === 'blocked' ? 'Bloque' : 'Source seule'}
                        </span>
                    )}
                    {playableUrl && (
                        <button
                            type="button"
                            className="soundtrack-action-button"
                            onClick={() => onDownload(track)}
                            disabled={isBusy || audit.blocked}
                            aria-label={`Importer ${track.title} dans la bibliotheque Vibe_fx locale`}
                            title="Importer dans la bibliotheque Vibe_fx locale"
                        >
                            {isBusy ? <Download size={14} /> : <Library size={14} />}
                            {isBusy ? 'Import...' : 'Bibliotheque'}
                        </button>
                    )}
                    <button
                        type="button"
                        className="soundtrack-action-button"
                        onClick={() => onUseInVideo(track)}
                        disabled={!canUseInVideo || audit.blocked}
                        aria-label={`Utiliser ${track.title} dans Vibe_CUT`}
                        title={canUseInVideo ? 'Utiliser dans Vibe_CUT' : 'Reconnecter ou telecharger le fichier avant usage video'}
                    >
                        <Film size={14} />
                        Vibe_CUT
                    </button>
                    {track.sourceUrl && (
                        <a
                            className="soundtrack-icon-button"
                            href={track.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="Ouvrir source"
                            aria-label={`Ouvrir la source de ${track.title}`}
                            onClick={(event) => event.stopPropagation()}
                        >
                            <ExternalLink size={14} />
                        </a>
                    )}
                </div>
            </article>
            <AggregatorScrubPanel
                track={track}
                isSelected={isSelected}
                player={player}
                onPlay={onPlay}
                playableUrl={playableUrl}
            />
        </>
    );
}
