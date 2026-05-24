"use client";

import React, { useMemo, useState } from 'react';
import { Heart, Library, Music2, Radar, Sparkles, X } from 'lucide-react';
import AggregatorPanel from './components/AggregatorPanel';
import AiMusicImportAssistant from './components/AiMusicImportAssistant';
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
import { AI_AUDIO_PROVIDERS, fetchAudioBlobForTrack } from './services/soundtrackDownloads';

const MOBILE_TABS = [
    { id: 'scan', label: 'Scan', icon: Radar },
    { id: 'project', label: 'Bibliotheque', icon: Library },
];

const DESKTOP_MODES = [
    { id: 'project', label: 'Bibliotheque' },
    { id: 'aggregator', label: 'Sources gratuites' },
];

const HIDDEN_STARTER_TRACKS_KEY = 'vibefx-soundtrack-hidden-starter-tracks';

const loadHiddenStarterTracks = () => {
    if (typeof window === 'undefined') return [];
    try {
        const parsed = JSON.parse(window.localStorage.getItem(HIDDEN_STARTER_TRACKS_KEY) || '[]');
        return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
    } catch {
        return [];
    }
};

const saveHiddenStarterTracks = (trackIds) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(HIDDEN_STARTER_TRACKS_KEY, JSON.stringify(trackIds));
};

export default function SoundtrackPage({ onUseInVideo }) {
    const search = useSoundtrackSearch();
    const library = useLocalSoundtrackLibrary();
    const projectLibrary = useProjectSoundLibrary();
    const player = useSoundtrackPlayer();
    const starterTracks = useMemo(() => getStarterSoundtrackTracks(), []);
    const [hiddenStarterTrackIds, setHiddenStarterTrackIds] = useState(loadHiddenStarterTracks);
    const hiddenStarterTrackIdSet = useMemo(() => new Set(hiddenStarterTrackIds), [hiddenStarterTrackIds]);
    const visibleStarterTracks = useMemo(() => (
        starterTracks.filter((track) => !hiddenStarterTrackIdSet.has(track.id))
    ), [hiddenStarterTrackIdSet, starterTracks]);
    const [activeMobileTab, setActiveMobileTab] = useState('scan');
    const [libraryOpen, setLibraryOpen] = useState(false);
    const [aiImportProviderId, setAiImportProviderId] = useState('aitra-free');
    const [aiImportOpen, setAiImportOpen] = useState(false);
    const [showFavorites, setShowFavorites] = useState(false);
    const [selectedTrackId, setSelectedTrackId] = useState('');
    const mergedTrackById = useMemo(() => {
        const map = new Map();
        search.results.forEach((track) => map.set(track.id, track));
        visibleStarterTracks.forEach((track) => map.set(track.id, track));
        library.tracks.forEach((track) => map.set(track.id, track));
        projectLibrary.tracks.forEach((track) => map.set(track.id, track));
        return map;
    }, [library.tracks, projectLibrary.tracks, search.results, visibleStarterTracks]);
    const selectedTrack = mergedTrackById.get(selectedTrackId) || player.currentTrack || projectLibrary.tracks[0] || visibleStarterTracks[0] || library.tracks[0] || search.results[0] || null;

    const playTrack = (track, explicitUrl, options) => {
        setSelectedTrackId(track.id);
        player.play(track, explicitUrl || track.localObjectUrl || track.previewUrl || track.downloadUrl, options);
    };

    const openAiImport = (providerId = 'aitra-free') => {
        setAiImportProviderId(AI_AUDIO_PROVIDERS.includes(providerId) ? providerId : 'aitra-free');
        setAiImportOpen(true);
    };

    const removeStarterTrack = (track) => {
        if (!track?.id) return;
        setHiddenStarterTrackIds((current) => {
            if (current.includes(track.id)) return current;
            const next = [...current, track.id];
            saveHiddenStarterTracks(next);
            return next;
        });
        if (selectedTrackId === track.id) setSelectedTrackId('');
        if (player.playingId === track.id) player.stop();
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
                <div className="soundtrack-command-strip__actions">
                    <button type="button" onClick={() => openAiImport(search.provider)} title="Importer une musique IA gratuite deja publiee">
                        <Sparkles size={13} />
                        Import IA gratuit
                    </button>
                </div>
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
                            selectedTrack={selectedTrack}
                            onPlayTrack={playTrack}
                            onUseInVideo={handleUseInVideo}
                            onSelectTrack={(track) => setSelectedTrackId(track.id)}
                            onImportComplete={() => setLibraryOpen(true)}
                            onOpenAiImport={openAiImport}
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
                            selectedTrack={selectedTrack}
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
                            starterTracks={visibleStarterTracks}
                            selectedTrack={selectedTrack}
                            player={player}
                            onSelectTrack={(track) => setSelectedTrackId(track.id)}
                            onPlayTrack={playTrack}
                            onRemoveStarterTrack={removeStarterTrack}
                            onUseInVideo={handleUseInVideo}
                        />
                    </section>
                </div>
            )}

            {aiImportOpen && (
                <div className="soundtrack-ai-import-backdrop" onClick={() => setAiImportOpen(false)}>
                    <section
                        className="soundtrack-ai-import-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Importer une musique IA gratuite"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <header className="soundtrack-ai-import-modal__header">
                            <div>
                                <p>Banque IA gratuite</p>
                                <h2>Choisis un theme, Vibe_fx importe les pistes</h2>
                            </div>
                            <button type="button" onClick={() => setAiImportOpen(false)} aria-label="Fermer import IA">
                                <X size={16} />
                            </button>
                        </header>
                        <div className="soundtrack-ai-import-modal__guide" aria-label="Etapes import IA">
                            <span><strong>1</strong> Choisis la plateforme IA</span>
                            <span><strong>2</strong> Clique Generer / importer</span>
                            <span><strong>3</strong> Importe en bibliotheque</span>
                        </div>
                        <p className="soundtrack-ai-import-modal__note">
                            Ce flux recupere automatiquement des pistes deja publiees sur Aitra Free selon le theme choisi. Pixabay reste en import officiel manuel pour eviter le scraping de telechargements.
                        </p>
                        <AiMusicImportAssistant
                            key={aiImportProviderId}
                            compact
                            defaultProviderId={aiImportProviderId}
                            localLibrary={library}
                            projectLibrary={projectLibrary}
                            onSelectTrack={(track) => setSelectedTrackId(track.id)}
                            onImportComplete={(track) => {
                                setSelectedTrackId(track.id);
                                setAiImportOpen(false);
                                setLibraryOpen(true);
                            }}
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
