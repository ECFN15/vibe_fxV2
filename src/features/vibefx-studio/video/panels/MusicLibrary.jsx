import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Search, Play, Pause, Download, Music, Loader } from 'lucide-react';
import useVideoStore from '../store/videoStore';

const MUSIC_GENRES = [
    { id: '', name: 'Tous les genres' },
    { id: 'beats', name: 'Beats' },
    { id: 'classical', name: 'Classique' },
    { id: 'electronic', name: 'Electronique' },
    { id: 'hip hop', name: 'Hip Hop' },
    { id: 'jazz', name: 'Jazz' },
    { id: 'ambient', name: 'Ambient' },
    { id: 'cinematic', name: 'Cinematique' },
    { id: 'pop', name: 'Pop' },
    { id: 'rock', name: 'Rock' },
    { id: 'chill', name: 'Chill' },
    { id: 'lofi', name: 'Lo-Fi' },
    { id: 'happy', name: 'Joyeux' },
    { id: 'sad', name: 'Triste' },
    { id: 'epic', name: 'Epique' },
    { id: 'nature', name: 'Nature' },
];

const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
};

const MusicLibrary = () => {
    const { addAudioTrack, setActivePanel, currentTime } = useVideoStore();
    const [query, setQuery] = useState('');
    const [genre, setGenre] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [playingId, setPlayingId] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    const audioRef = useRef(null);
    const abortRef = useRef(null);

    const searchMusic = useCallback(async (searchQuery = '', searchGenre = '') => {
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setHasSearched(true);

        try {
            setResults(getCuratedTracks(searchQuery, searchGenre));
        } catch (err) {
            if (err.name !== 'AbortError') {
                setResults(getCuratedTracks(searchQuery, searchGenre));
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Load initial results
    useEffect(() => {
        searchMusic('', genre);
    }, [genre, searchMusic]);

    const handleSearch = (e) => {
        e.preventDefault();
        searchMusic(query, genre);
    };

    const togglePlay = (track) => {
        if (playingId === track.id) {
            audioRef.current?.pause();
            setPlayingId(null);
            return;
        }

        if (audioRef.current) {
            audioRef.current.pause();
        }

        const audio = new Audio(track.previewUrl || track.url);
        audio.volume = 0.5;
        audio.play().catch(() => {});
        audio.onended = () => setPlayingId(null);
        audioRef.current = audio;
        setPlayingId(track.id);
    };

    const importTrack = (track) => {
        addAudioTrack({
            name: track.title,
            url: track.url || track.previewUrl,
            duration: track.duration || 30,
            startTime: currentTime,
            source: 'library',
        });
    };

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                <h3 className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Bibliotheque Musicale</h3>
                <button onClick={() => setActivePanel(null)} className="text-neutral-500 hover:text-white transition">
                    <X size={14} />
                </button>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="px-3 py-2 border-b border-neutral-800/50">
                <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-sm px-3 py-1.5">
                    <Search size={12} className="text-neutral-500 shrink-0" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Rechercher..."
                        className="flex-1 bg-transparent text-[11px] text-white focus:outline-none placeholder-neutral-600"
                    />
                </div>
            </form>

            {/* Genre filter */}
            <div className="px-3 py-2 border-b border-neutral-800/50">
                <div className="flex gap-1 flex-wrap">
                    {MUSIC_GENRES.slice(0, 8).map(g => (
                        <button
                            key={g.id}
                            onClick={() => setGenre(g.id)}
                            className={`px-2 py-0.5 text-[8px] font-mono uppercase tracking-wider rounded-sm border transition-all ${
                                genre === g.id
                                    ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400'
                                    : 'border-neutral-800 text-neutral-500 hover:text-white hover:border-neutral-600'
                            }`}
                        >
                            {g.name}
                        </button>
                    ))}
                </div>
                <div className="flex gap-1 flex-wrap mt-1">
                    {MUSIC_GENRES.slice(8).map(g => (
                        <button
                            key={g.id}
                            onClick={() => setGenre(g.id)}
                            className={`px-2 py-0.5 text-[8px] font-mono uppercase tracking-wider rounded-sm border transition-all ${
                                genre === g.id
                                    ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400'
                                    : 'border-neutral-800 text-neutral-500 hover:text-white hover:border-neutral-600'
                            }`}
                        >
                            {g.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader size={16} className="text-neutral-500 animate-spin" />
                    </div>
                ) : results.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-neutral-600">
                        <Music size={20} />
                        <p className="text-[10px] font-mono mt-2 uppercase tracking-widest">
                            {hasSearched ? 'Aucun resultat' : 'Rechercher de la musique'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-neutral-800/40">
                        {results.map(track => (
                            <div
                                key={track.id}
                                className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-900/50 transition group"
                            >
                                {/* Play button */}
                                <button
                                    onClick={() => togglePlay(track)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-sm shrink-0 transition ${
                                        playingId === track.id
                                            ? 'bg-emerald-600/20 text-emerald-400'
                                            : 'bg-neutral-800 text-neutral-400 hover:text-white'
                                    }`}
                                >
                                    {playingId === track.id ? <Pause size={12} /> : <Play size={12} />}
                                </button>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-mono text-neutral-200 truncate">{track.title}</p>
                                    <p className="text-[8px] font-mono text-neutral-600 uppercase">
                                        {track.genre} {track.duration ? `/ ${formatDuration(track.duration)}` : ''}
                                    </p>
                                </div>

                                {/* Import */}
                                <button
                                    onClick={() => importTrack(track)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-500 hover:text-emerald-400 transition"
                                    title="Importer dans la timeline"
                                    aria-label={`Importer ${track.title} dans la timeline`}
                                >
                                    <Download size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Local import fallback */}
            <div className="px-3 py-2 border-t border-neutral-800">
                <LocalAudioImport />
            </div>
        </div>
    );
};

// Local file import fallback
const LocalAudioImport = () => {
    const { addAudioTrack, currentTime } = useVideoStore();
    const fileRef = useRef(null);

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const audio = new Audio(url);
        audio.onloadedmetadata = () => {
            addAudioTrack({
                name: file.name.replace(/\.[^.]+$/, ''),
                url,
                file,
                duration: audio.duration,
                startTime: currentTime,
            });
        };
        e.target.value = '';
    };

    return (
        <>
            <input ref={fileRef} type="file" accept="audio/*" onChange={handleFile} className="hidden" />
            <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-2 text-[9px] font-mono text-neutral-500 hover:text-white border border-dashed border-neutral-800 hover:border-neutral-600 transition uppercase tracking-widest"
            >
                Importer un fichier audio local
            </button>
        </>
    );
};

// Curated free music tracks (CC0 / royalty-free from various sources)
function getCuratedTracks(query = '', genre = '') {
    const files = [
        ['akira', 'Karl Casey - Akira.mp3', 'Electronique', 208, 'electronic cyberpunk synth beats'],
        ['andromeda', 'Karl Casey - Andromeda.mp3', 'Ambient', 157, 'ambient space deep cinematic'],
        ['black-tar', 'Karl Casey - Black Tar.mp3', 'Beats', 206, 'beats dark bass energy'],
        ['blade-runner', 'Karl Casey - Blade Runner.mp3', 'Cinematique', 160, 'cinematic synth futuristic'],
        ['chrome', 'Karl Casey - Chrome.mp3', 'Electronique', 207, 'electronic chrome cyber synth'],
        ['cyberpunk', 'Karl Casey - Cyberpunk.mp3', 'Electronique', 199, 'electronic cyberpunk night drive'],
        ['dark-matter', 'Karl Casey - Dark Matter.mp3', 'Ambient', 77, 'ambient dark matter space'],
        ['empty-streets', 'Karl Casey - Empty Streets.mp3', 'Chill', 199, 'chill night urban lofi'],
        ['exosuit', 'Karl Casey - Exosuit.mp3', 'Epique', 65, 'epic trailer synth power'],
        ['future-city', 'Karl Casey - Future City.mp3', 'Electronique', 108, 'electronic city futuristic'],
        ['ghost-shell', 'Karl Casey - Ghost in the Shell.mp3', 'Cinematique', 165, 'cinematic anime cyber'],
        ['hackers', 'Karl Casey - Hackers.mp3', 'Beats', 196, 'beats tech hacker electronic'],
        ['neon-blood', 'Karl Casey - Neon Blood.mp3', 'Electronique', 84, 'electronic neon dark'],
        ['night-drive', 'Karl Casey - Night Drive.mp3', 'Chill', 109, 'chill drive night synth'],
        ['overdrive', 'Karl Casey - Overdrive.mp3', 'Rock', 181, 'rock synth overdrive energy'],
        ['replicant', 'Karl Casey - Replicant.mp3', 'Ambient', 101, 'ambient replicant future'],
        ['system-failure', 'Karl Casey - System Failure.mp3', 'Cinematique', 223, 'cinematic tension glitch'],
        ['the-grid', 'Karl Casey - The Grid.mp3', 'Beats', 75, 'beats grid electronic'],
        ['tokyo-rain', 'Karl Casey - Tokyo Rain.mp3', 'Chill', 216, 'chill rain tokyo lofi'],
        ['virtual-reality', 'Karl Casey - Virtual Reality.mp3', 'Electronique', 37, 'electronic virtual reality'],
    ];

    const tracks = files.map(([id, fileName, trackGenre, duration, tags]) => ({
        id,
        title: fileName.replace(/\.mp3$/, '').replace('Karl Casey - ', ''),
        genre: trackGenre,
        duration,
        previewUrl: `/music/${encodeURIComponent(fileName)}`,
        url: `/music/${encodeURIComponent(fileName)}`,
        tags,
    }));

    let filtered = tracks;
    if (genre) {
        const genreLower = genre.toLowerCase();
        filtered = filtered.filter(t => t.tags.includes(genreLower) || t.genre.toLowerCase().includes(genreLower));
    }
    if (query) {
        const q = query.toLowerCase();
        filtered = filtered.filter(t => t.title.toLowerCase().includes(q) || t.tags.includes(q) || t.genre.toLowerCase().includes(q));
    }
    return filtered;
}

export default MusicLibrary;
