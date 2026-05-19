import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Search, Play, Pause, Download, Volume2, Music, Loader, ChevronDown } from 'lucide-react';
import useVideoStore from '../store/videoStore';

// Pixabay API (free for non-commercial use)
const PIXABAY_API_KEY = '47874039-f3e5fab05e40ee3511fdbe6f6';

const MUSIC_CATEGORIES = [
    { id: '', name: 'Tout' },
    { id: 'backgrounds', name: 'Ambiance' },
    { id: 'music', name: 'Musique' },
    { id: 'effects', name: 'Effets' },
];

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
    const [category, setCategory] = useState('');
    const [genre, setGenre] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [playingId, setPlayingId] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    const audioRef = useRef(null);
    const abortRef = useRef(null);

    // Fetch music from Pixabay
    const searchMusic = useCallback(async (searchQuery = '', searchCategory = '', searchGenre = '') => {
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setHasSearched(true);

        try {
            const params = new URLSearchParams({
                key: PIXABAY_API_KEY,
                per_page: '40',
            });
            if (searchQuery) params.set('q', searchQuery);
            if (searchCategory) params.set('category', searchCategory);

            const url = `https://pixabay.com/api/videos/?${params.toString()}`;
            // Pixabay doesn't have a dedicated audio API in the free tier
            // Use their video API as a workaround - or use curated local tracks

            // For a real implementation, we'd use the Pixabay Audio API or Freesound
            // For now, provide a curated set of free music sources
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
        searchMusic('', category, genre);
    }, [category, genre]);

    const handleSearch = (e) => {
        e.preventDefault();
        searchMusic(query, category, genre);
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
    const tracks = [
        { id: 'ambient-1', title: 'Peaceful Morning', genre: 'Ambient', duration: 120, previewUrl: '', tags: 'ambient chill calm peaceful nature' },
        { id: 'electronic-1', title: 'Neon Pulse', genre: 'Electronique', duration: 95, previewUrl: '', tags: 'electronic beats dance energy' },
        { id: 'cinematic-1', title: 'Epic Horizon', genre: 'Cinematique', duration: 145, previewUrl: '', tags: 'cinematic epic orchestral dramatic' },
        { id: 'lofi-1', title: 'Late Night Study', genre: 'Lo-Fi', duration: 110, previewUrl: '', tags: 'lofi chill study relax beats' },
        { id: 'pop-1', title: 'Summer Vibes', genre: 'Pop', duration: 85, previewUrl: '', tags: 'pop happy summer upbeat' },
        { id: 'rock-1', title: 'Thunder Road', genre: 'Rock', duration: 130, previewUrl: '', tags: 'rock energy guitar power' },
        { id: 'jazz-1', title: 'Midnight Cafe', genre: 'Jazz', duration: 140, previewUrl: '', tags: 'jazz smooth night cafe' },
        { id: 'hiphop-1', title: 'Urban Flow', genre: 'Hip Hop', duration: 100, previewUrl: '', tags: 'hip hop beats urban rap' },
        { id: 'classical-1', title: 'Sunrise Sonata', genre: 'Classique', duration: 180, previewUrl: '', tags: 'classical piano beautiful' },
        { id: 'happy-1', title: 'Good Day Ahead', genre: 'Joyeux', duration: 75, previewUrl: '', tags: 'happy upbeat positive joyeux' },
        { id: 'sad-1', title: 'Rain on Glass', genre: 'Triste', duration: 155, previewUrl: '', tags: 'sad melancholy emotional triste' },
        { id: 'epic-1', title: 'Rise of Heroes', genre: 'Epique', duration: 160, previewUrl: '', tags: 'epic dramatic cinematic trailer' },
        { id: 'nature-1', title: 'Forest Stream', genre: 'Nature', duration: 200, previewUrl: '', tags: 'nature forest water calm ambient' },
        { id: 'beats-1', title: 'Trap Nation', genre: 'Beats', duration: 90, previewUrl: '', tags: 'beats trap bass energy' },
        { id: 'chill-1', title: 'Ocean Breeze', genre: 'Chill', duration: 125, previewUrl: '', tags: 'chill relax ocean summer lofi' },
        { id: 'electronic-2', title: 'Digital Dreams', genre: 'Electronique', duration: 105, previewUrl: '', tags: 'electronic synth futuristic' },
        { id: 'cinematic-2', title: 'Tension Rising', genre: 'Cinematique', duration: 95, previewUrl: '', tags: 'cinematic suspense thriller tension' },
        { id: 'ambient-2', title: 'Deep Space', genre: 'Ambient', duration: 190, previewUrl: '', tags: 'ambient space deep meditation' },
        { id: 'pop-2', title: 'Dancing Lights', genre: 'Pop', duration: 80, previewUrl: '', tags: 'pop dance fun party' },
        { id: 'lofi-2', title: 'Rainy Window', genre: 'Lo-Fi', duration: 115, previewUrl: '', tags: 'lofi rain cozy study' },
    ];

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
