"use client";

import React, { useMemo, useState } from 'react';
import { Download, Heart, Library, ListMusic, Music2 } from 'lucide-react';
import SoundtrackFolderPanel from './components/SoundtrackFolderPanel';
import SoundtrackPlayer from './components/SoundtrackPlayer';
import SoundtrackPlaylists from './components/SoundtrackPlaylists';
import SoundtrackResults from './components/SoundtrackResults';
import SoundtrackRightsPanel from './components/SoundtrackRightsPanel';
import SoundtrackSearch from './components/SoundtrackSearch';
import { useLocalSoundtrackLibrary } from './hooks/useLocalSoundtrackLibrary';
import { useSoundtrackPlayer } from './hooks/useSoundtrackPlayer';
import { useSoundtrackSearch } from './hooks/useSoundtrackSearch';

const MOBILE_TABS = [
    { id: 'search', label: 'Recherche', icon: Music2 },
    { id: 'library', label: 'Bibliotheque', icon: Library },
    { id: 'playlists', label: 'Playlists', icon: ListMusic },
    { id: 'folder', label: 'Dossier', icon: Download },
];

export default function SoundtrackPage({ onUseInVideo }) {
    const search = useSoundtrackSearch();
    const library = useLocalSoundtrackLibrary();
    const player = useSoundtrackPlayer();
    const [activeMobileTab, setActiveMobileTab] = useState('search');
    const [showFavorites, setShowFavorites] = useState(false);
    const [selectedTrackId, setSelectedTrackId] = useState('');
    const mergedTrackById = useMemo(() => {
        const map = new Map();
        search.results.forEach((track) => map.set(track.id, track));
        library.tracks.forEach((track) => map.set(track.id, track));
        return map;
    }, [library.tracks, search.results]);
    const selectedTrack = mergedTrackById.get(selectedTrackId) || player.currentTrack || library.tracks[0] || search.results[0] || null;

    const playTrack = (track, explicitUrl) => {
        setSelectedTrackId(track.id);
        player.play(track, explicitUrl || track.localObjectUrl || track.previewUrl || track.downloadUrl);
    };

    const handleUseInVideo = async (track) => {
        setSelectedTrackId(track.id);
        const file = await library.getTrackFile(track);
        if (!file) {
            await library.checkMissingFiles();
            return;
        }
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
                            onClick={() => setActiveMobileTab(tab.id)}
                        >
                            <Icon size={14} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="soundtrack-workspace">
                <div className="soundtrack-main-column" data-mobile-active={activeMobileTab === 'search' || activeMobileTab === 'library'}>
                    <SoundtrackSearch search={search} />
                    <div className="soundtrack-toolbar">
                        <button
                            type="button"
                            data-active={!showFavorites}
                            onClick={() => setShowFavorites(false)}
                        >
                            <Music2 size={13} />
                            Resultats
                        </button>
                        <button
                            type="button"
                            data-active={showFavorites}
                            onClick={() => setShowFavorites(true)}
                        >
                            <Heart size={13} />
                            Favoris
                        </button>
                    </div>
                    <SoundtrackResults
                        results={search.results}
                        libraryTracks={library.tracks}
                        showFavorites={showFavorites}
                        searchStatus={search.status}
                        player={player}
                        library={library}
                        onPlayTrack={playTrack}
                        onUseInVideo={handleUseInVideo}
                    />
                </div>

                <aside className="soundtrack-side-column">
                    <div data-mobile-active={activeMobileTab === 'playlists'}>
                        <SoundtrackPlaylists library={library} />
                    </div>
                    <div data-mobile-active={activeMobileTab === 'folder'}>
                        <SoundtrackFolderPanel library={library} />
                    </div>
                    <div data-mobile-active={activeMobileTab === 'library'}>
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
