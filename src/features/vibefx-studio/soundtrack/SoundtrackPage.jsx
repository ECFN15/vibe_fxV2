"use client";

import React, { useMemo, useState } from 'react';
import { Heart, Library, Music2, Radar, X } from 'lucide-react';
import AggregatorPanel from './components/AggregatorPanel';
import ProjectLibraryPanel from './components/ProjectLibraryPanel';
import SoundtrackFolderPanel from './components/SoundtrackFolderPanel';
import SoundtrackPlayer from './components/SoundtrackPlayer';
import SoundtrackResults from './components/SoundtrackResults';
import SoundtrackRightsPanel from './components/SoundtrackRightsPanel';
import { getStarterSoundtrackTracks } from './data/soundtrackDefaults';
import { useLocalSoundtrackLibrary } from './hooks/useLocalSoundtrackLibrary';
import { useProjectSoundLibrary } from './hooks/useProjectSoundLibrary';
import { useSoundtrackPlayer } from './hooks/useSoundtrackPlayer';
import { useSoundtrackSearch } from './hooks/useSoundtrackSearch';
import { fetchAudioBlobForTrack } from './services/soundtrackDownloads';

const MOBILE_TABS = [
    { id: 'scan', label: 'Scan', icon: Radar },
    { id: 'project', label: 'Bibliotheque', icon: Library },
];

const DESKTOP_MODES = [
    { id: 'project', label: 'Bibliotheque projet' },
    { id: 'aggregator', label: 'Agregateur' },
];

export default function SoundtrackPage({ onUseInVideo }) {
    const search = useSoundtrackSearch();
    const library = useLocalSoundtrackLibrary();
    const projectLibrary = useProjectSoundLibrary();
    const player = useSoundtrackPlayer();
    const starterTracks = useMemo(() => getStarterSoundtrackTracks(), []);
    const [activeMobileTab, setActiveMobileTab] = useState('scan');
    const [libraryOpen, setLibraryOpen] = useState(false);
    const [showFavorites, setShowFavorites] = useState(false);
    const [selectedTrackId, setSelectedTrackId] = useState('');
    const mergedTrackById = useMemo(() => {
        const map = new Map();
        search.results.forEach((track) => map.set(track.id, track));
        starterTracks.forEach((track) => map.set(track.id, track));
        library.tracks.forEach((track) => map.set(track.id, track));
        projectLibrary.tracks.forEach((track) => map.set(track.id, track));
        return map;
    }, [library.tracks, projectLibrary.tracks, search.results, starterTracks]);
    const selectedTrack = mergedTrackById.get(selectedTrackId) || player.currentTrack || projectLibrary.tracks[0] || starterTracks[0] || library.tracks[0] || search.results[0] || null;

    const playTrack = (track, explicitUrl, options) => {
        setSelectedTrackId(track.id);
        player.play(track, explicitUrl || track.localObjectUrl || track.previewUrl || track.downloadUrl, options);
    };

    const handleUseInVideo = async (track) => {
        setSelectedTrackId(track.id);
        let file = await library.getTrackFile(track);
        if (!file && track.storagePath && track.downloadUrl) {
            const response = await fetch(track.downloadUrl);
            file = await response.blob();
        }
        if (!file && (track.downloadUrl || track.previewUrl || track.url)) {
            const fetched = await fetchAudioBlobForTrack(track);
            file = fetched.blob;
        }
        if (!file) {
            await library.checkMissingFiles();
            return;
        }
        await projectLibrary.markUsed(track);
        onUseInVideo?.(track, file);
    };

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
                                setLibraryOpen(tab.id === 'project');
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
                            data-active={mode.id === 'project' ? libraryOpen : !libraryOpen}
                            onClick={() => setLibraryOpen(mode.id === 'project')}
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

            <div className="soundtrack-workspace soundtrack-workspace--aggregator">
                <div className="soundtrack-main-column" data-mobile-active="true">
                    {!showFavorites && (
                        <AggregatorPanel
                            search={search}
                            player={player}
                            localLibrary={library}
                            projectLibrary={projectLibrary}
                            onPlayTrack={playTrack}
                            onUseInVideo={handleUseInVideo}
                            onSelectTrack={(track) => setSelectedTrackId(track.id)}
                            onImportComplete={() => setLibraryOpen(true)}
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
                </div>

                <aside className="soundtrack-side-column">
                    <div>
                        <SoundtrackFolderPanel library={library} />
                    </div>
                    <div>
                        <SoundtrackRightsPanel selectedTrack={selectedTrack} />
                    </div>
                </aside>
            </div>

            {libraryOpen && (
                <div className="soundtrack-library-backdrop" onClick={() => setLibraryOpen(false)}>
                    <section
                        className="soundtrack-library-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Bibliotheque projet Vibe_fx"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <header className="soundtrack-library-modal__header">
                            <div>
                                <p>Bibliotheque projet</p>
                                <h2>Vibe_fx Library</h2>
                            </div>
                            <button type="button" onClick={() => setLibraryOpen(false)} aria-label="Fermer la bibliotheque">
                                <X size={16} />
                            </button>
                        </header>
                        <ProjectLibraryPanel
                            variant="modal"
                            projectLibrary={projectLibrary}
                            localLibrary={library}
                            starterTracks={starterTracks}
                            selectedTrack={selectedTrack}
                            player={player}
                            onSelectTrack={(track) => setSelectedTrackId(track.id)}
                            onPlayTrack={playTrack}
                            onUseInVideo={handleUseInVideo}
                        />
                    </section>
                </div>
            )}

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
