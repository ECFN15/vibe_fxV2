"use client";

import React, { useMemo, useState } from 'react';
import { Download, Heart, Library, Music2, Radar, ShieldCheck } from 'lucide-react';
import AggregatorPanel from './components/AggregatorPanel';
import ProjectLibraryPanel from './components/ProjectLibraryPanel';
import SoundtrackFolderPanel from './components/SoundtrackFolderPanel';
import SoundtrackPlayer from './components/SoundtrackPlayer';
import SoundtrackPlaylists from './components/SoundtrackPlaylists';
import SoundtrackResults from './components/SoundtrackResults';
import SoundtrackRightsPanel from './components/SoundtrackRightsPanel';
import { useLocalSoundtrackLibrary } from './hooks/useLocalSoundtrackLibrary';
import { useProjectSoundLibrary } from './hooks/useProjectSoundLibrary';
import { useSoundtrackPlayer } from './hooks/useSoundtrackPlayer';
import { useSoundtrackSearch } from './hooks/useSoundtrackSearch';

const MOBILE_TABS = [
    { id: 'project', label: 'Projet', icon: Library },
    { id: 'scan', label: 'Scan', icon: Radar },
    { id: 'imports', label: 'Imports', icon: Download },
    { id: 'rights', label: 'Droits', icon: ShieldCheck },
];

const DESKTOP_MODES = [
    { id: 'project', label: 'Bibliotheque projet' },
    { id: 'aggregator', label: 'Agregateur' },
    { id: 'imports', label: 'Imports recents' },
    { id: 'rights', label: 'A verifier' },
];

export default function SoundtrackPage({ onUseInVideo }) {
    const search = useSoundtrackSearch();
    const library = useLocalSoundtrackLibrary();
    const projectLibrary = useProjectSoundLibrary();
    const player = useSoundtrackPlayer();
    const [activeMobileTab, setActiveMobileTab] = useState('scan');
    const [activeMode, setActiveMode] = useState('aggregator');
    const [showFavorites, setShowFavorites] = useState(false);
    const [selectedTrackId, setSelectedTrackId] = useState('');
    const mergedTrackById = useMemo(() => {
        const map = new Map();
        search.results.forEach((track) => map.set(track.id, track));
        library.tracks.forEach((track) => map.set(track.id, track));
        projectLibrary.tracks.forEach((track) => map.set(track.id, track));
        return map;
    }, [library.tracks, projectLibrary.tracks, search.results]);
    const selectedTrack = mergedTrackById.get(selectedTrackId) || player.currentTrack || projectLibrary.tracks[0] || library.tracks[0] || search.results[0] || null;

    const playTrack = (track, explicitUrl) => {
        setSelectedTrackId(track.id);
        player.play(track, explicitUrl || track.localObjectUrl || track.previewUrl || track.downloadUrl);
    };

    const handleUseInVideo = async (track) => {
        setSelectedTrackId(track.id);
        let file = await library.getTrackFile(track);
        if (!file && track.storagePath && track.downloadUrl) {
            const response = await fetch(track.downloadUrl);
            file = await response.blob();
        }
        if (!file) {
            await library.checkMissingFiles();
            return;
        }
        await projectLibrary.markUsed(track);
        onUseInVideo?.(track, file);
    };

    const projectTracksNeedingReview = projectLibrary.tracks.filter((track) => track.rightsStatus === 'needs-review' || track.rightsStatus === 'blocked');
    const importsRecent = projectLibrary.tracks.slice(0, 12);
    const activeProjectPlaylist = projectLibrary.playlists.find((playlist) => playlist.id === projectLibrary.selectedPlaylistId) || null;
    const projectModeTracks = useMemo(() => {
        const baseTracks = projectLibrary.tracks.filter((track) => !track.archived);
        if (!activeProjectPlaylist) return baseTracks;
        const trackMap = new Map(baseTracks.map((track) => [track.id, track]));
        return activeProjectPlaylist.trackIds.map((trackId) => trackMap.get(trackId)).filter(Boolean);
    }, [activeProjectPlaylist, projectLibrary.tracks]);
    const visibleMode = activeMode;

    return (
        <div className="soundtrack-page" data-testid="soundtrack-page">
            <div className="soundtrack-mobile-tabs" role="tablist" aria-label="Navigation Soundtrack">
                {MOBILE_TABS.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={activeMobileTab === tab.id}
                            onClick={() => {
                                setActiveMobileTab(tab.id);
                                setActiveMode(tab.id === 'scan' ? 'aggregator' : tab.id);
                            }}
                        >
                            <Icon size={14} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <header className="soundtrack-command-strip">
                <div>
                    <p>Soundtrack V2</p>
                    <strong>Vibe_CUT audio cockpit</strong>
                </div>
                <nav aria-label="Modes Soundtrack">
                    {DESKTOP_MODES.map((mode) => (
                        <button
                            key={mode.id}
                            type="button"
                            data-active={activeMode === mode.id}
                            onClick={() => setActiveMode(mode.id)}
                        >
                            {mode.label}
                        </button>
                    ))}
                </nav>
                <div className="soundtrack-command-strip__status">
                    <span data-state={projectLibrary.status === 'error' ? 'warning' : 'ready'}>{projectLibrary.status}</span>
                    <span>{projectLibrary.tracks.length} projet</span>
                    <span>{search.results.length} scan</span>
                </div>
            </header>

            <div className="soundtrack-workspace">
                <aside className="soundtrack-left-column" data-mobile-active={visibleMode === 'project'}>
                    <ProjectLibraryPanel
                        projectLibrary={projectLibrary}
                        selectedTrack={selectedTrack}
                        onSelectTrack={(track) => setSelectedTrackId(track.id)}
                        onUseInVideo={handleUseInVideo}
                    />
                </aside>

                <div className="soundtrack-main-column" data-mobile-active={visibleMode === 'aggregator' || visibleMode === 'imports' || visibleMode === 'rights'}>
                    {visibleMode === 'aggregator' && (
                        <>
                            {!showFavorites && (
                                <AggregatorPanel
                                    search={search}
                                    player={player}
                                    localLibrary={library}
                                    projectLibrary={projectLibrary}
                                    onPlayTrack={playTrack}
                                    onUseInVideo={handleUseInVideo}
                                    onSelectTrack={(track) => setSelectedTrackId(track.id)}
                                />
                            )}
                            <div className="soundtrack-toolbar">
                                <button type="button" data-active={!showFavorites} onClick={() => setShowFavorites(false)}>
                                    <Music2 size={13} />
                                    Resultats scan
                                </button>
                                <button type="button" data-active={showFavorites} onClick={() => setShowFavorites(true)}>
                                    <Heart size={13} />
                                    Favoris locaux
                                </button>
                            </div>
                            {showFavorites && (
                                <SoundtrackResults
                                    results={search.results}
                                    libraryTracks={library.tracks}
                                    projectTracks={projectLibrary.tracks}
                                    showFavorites
                                    searchStatus={search.status}
                                    player={player}
                                    library={library}
                                    projectLibrary={projectLibrary}
                                    onPlayTrack={playTrack}
                                    onUseInVideo={handleUseInVideo}
                                    onSelectTrack={(track) => setSelectedTrackId(track.id)}
                                />
                            )}
                        </>
                    )}
                    {visibleMode === 'project' && (
                        <SoundtrackResults
                            results={projectModeTracks}
                            libraryTracks={[]}
                            projectTracks={projectLibrary.tracks}
                            showFavorites={false}
                            modeEyebrow={activeProjectPlaylist ? 'Playlist projet' : 'Bibliotheque projet'}
                            modeTitle={activeProjectPlaylist?.name || 'Pistes projet'}
                            searchStatus={projectLibrary.status === 'loading' ? 'loading' : 'ready'}
                            player={player}
                            library={library}
                            projectLibrary={projectLibrary}
                            onPlayTrack={playTrack}
                            onUseInVideo={handleUseInVideo}
                            onSelectTrack={(track) => setSelectedTrackId(track.id)}
                        />
                    )}
                    {visibleMode === 'imports' && (
                        <SoundtrackResults
                            results={importsRecent}
                            libraryTracks={[]}
                            projectTracks={projectLibrary.tracks}
                            showFavorites={false}
                            modeEyebrow="Projet"
                            modeTitle="Imports recents"
                            searchStatus={projectLibrary.status === 'loading' ? 'loading' : 'ready'}
                            player={player}
                            library={library}
                            projectLibrary={projectLibrary}
                            onPlayTrack={playTrack}
                            onUseInVideo={handleUseInVideo}
                            onSelectTrack={(track) => setSelectedTrackId(track.id)}
                        />
                    )}
                    {visibleMode === 'rights' && (
                        <SoundtrackResults
                            results={projectTracksNeedingReview}
                            libraryTracks={[]}
                            projectTracks={projectLibrary.tracks}
                            showFavorites={false}
                            modeEyebrow="Droits"
                            modeTitle="A verifier"
                            searchStatus="ready"
                            player={player}
                            library={library}
                            projectLibrary={projectLibrary}
                            onPlayTrack={playTrack}
                            onUseInVideo={handleUseInVideo}
                            onSelectTrack={(track) => setSelectedTrackId(track.id)}
                        />
                    )}
                </div>

                <aside className="soundtrack-side-column">
                    <div data-mobile-active={activeMobileTab === 'imports'}>
                        <SoundtrackPlaylists library={library} />
                    </div>
                    <div data-mobile-active={activeMobileTab === 'imports'}>
                        <SoundtrackFolderPanel library={library} />
                    </div>
                    <div data-mobile-active={activeMobileTab === 'rights'}>
                        <SoundtrackRightsPanel selectedTrack={selectedTrack} />
                    </div>
                </aside>
            </div>

            <SoundtrackPlayer
                track={selectedTrack}
                status={player.status}
                playingId={player.playingId}
                onPlay={(track) => playTrack(track)}
                onStop={player.stop}
            />
        </div>
    );
}
