"use client";

import React, { useMemo, useState } from 'react';
import { CheckCircle2, Library, Sparkles, UploadCloud, X } from 'lucide-react';
import AiMusicImportAssistant from './components/AiMusicImportAssistant';
import ProjectLibraryPanel from './components/ProjectLibraryPanel';
import SoundtrackPlayer from './components/SoundtrackPlayer';
import { useLocalSoundtrackLibrary } from './hooks/useLocalSoundtrackLibrary';
import { useProjectSoundLibrary } from './hooks/useProjectSoundLibrary';
import { useSoundtrackPlayer } from './hooks/useSoundtrackPlayer';
import { AI_AUDIO_PROVIDERS, fetchAudioBlobForTrack } from './services/soundtrackDownloads';

const MOBILE_TABS = [
    { id: 'ai-import', label: 'Import IA', icon: Sparkles },
    { id: 'project', label: 'Bibliotheque', icon: Library },
];

export default function SoundtrackPage({ onUseInVideo }) {
    const library = useLocalSoundtrackLibrary();
    const projectLibrary = useProjectSoundLibrary();
    const player = useSoundtrackPlayer();
    const [activeMobileTab, setActiveMobileTab] = useState('ai-import');
    const [libraryOpen, setLibraryOpen] = useState(false);
    const [aiImportProviderId, setAiImportProviderId] = useState('aitra-free');
    const [selectedTrackId, setSelectedTrackId] = useState('');

    const mergedTrackById = useMemo(() => {
        const map = new Map();
        library.tracks.forEach((track) => map.set(track.id, track));
        projectLibrary.tracks.forEach((track) => map.set(track.id, track));
        return map;
    }, [library.tracks, projectLibrary.tracks]);
    const selectedTrack = mergedTrackById.get(selectedTrackId) || player.currentTrack || projectLibrary.tracks[0] || library.tracks[0] || null;

    const playTrack = (track, explicitUrl, options) => {
        setSelectedTrackId(track.id);
        player.play(track, explicitUrl || track.localObjectUrl || track.previewUrl || track.downloadUrl, options);
    };

    const openAiImport = (providerId = 'aitra-free') => {
        setAiImportProviderId(AI_AUDIO_PROVIDERS.includes(providerId) ? providerId : 'aitra-free');
        setActiveMobileTab('ai-import');
        setLibraryOpen(false);
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
                                if (tab.id === 'ai-import') openAiImport(aiImportProviderId);
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
            </header>

            <div className="soundtrack-workspace soundtrack-workspace--aggregator">
                <section className="soundtrack-ai-import-workspace" data-mobile-active="true" aria-label="Import IA gratuit plein ecran">
                    <div className="soundtrack-ai-import-workspace__hero">
                        <div>
                            <p>Agregateur IA gratuit</p>
                            <h2>Choisis un theme, Vibe_fx importe les pistes</h2>
                            <span>Les pistes arrivent directement dans la bibliotheque Vibe_fx avec fichier local, categorie et licence.</span>
                        </div>
                        <div className="soundtrack-ai-import-workspace__metrics" aria-label="Etat bibliotheque">
                            <span><strong>{library.tracks.length}</strong> local</span>
                            <span><strong>{projectLibrary.tracks.length}</strong> projet</span>
                            <button type="button" onClick={() => setLibraryOpen(true)}>
                                <Library size={13} />
                                Ouvrir bibliotheque
                            </button>
                        </div>
                    </div>

                    <div className="soundtrack-ai-import-workspace__steps" aria-label="Flux import IA">
                        <span><Sparkles size={13} /> Source gratuite</span>
                        <span><UploadCloud size={13} /> Import automatique</span>
                        <span><CheckCircle2 size={13} /> Bibliotheque organisee</span>
                    </div>

                    <AiMusicImportAssistant
                        key={aiImportProviderId}
                        defaultProviderId={aiImportProviderId}
                        localLibrary={library}
                        projectLibrary={projectLibrary}
                        onSelectTrack={(track) => setSelectedTrackId(track.id)}
                        onImportComplete={(track) => {
                            setSelectedTrackId(track.id);
                            setLibraryOpen(true);
                        }}
                    />
                </section>

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
