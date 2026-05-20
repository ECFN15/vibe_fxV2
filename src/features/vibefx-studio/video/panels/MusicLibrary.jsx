import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Search, Play, Pause, Download, Music, Loader, ExternalLink, Upload, ShieldCheck, Sparkles } from 'lucide-react';
import useVideoStore from '../store/videoStore';
import { MUSIC_GENRES, MUSIC_PROVIDERS, getCuratedTracks } from '../data/musicCatalog';

const MAX_AUDIO_IMPORT_BYTES = 150 * 1024 * 1024;
const MAX_AUDIO_IMPORT_SECONDS = 30 * 60;

const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
};

const MusicLibrary = () => {
    const { addAudioTrack, setActivePanel, currentTime } = useVideoStore();
    const [mode, setMode] = useState('catalog');
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

        if (audioRef.current) audioRef.current.pause();

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
            sourceName: track.sourceName,
            sourceUrl: track.sourceUrl,
            license: track.license,
            licenseUrl: track.licenseUrl,
            attribution: track.attribution,
            rightsStatus: track.rightsStatus,
        });
    };

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
                <div>
                    <h3 className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Bibliotheque Musicale</h3>
                    <p className="mt-0.5 text-[8px] font-mono uppercase tracking-widest text-neutral-600">Catalogue local / sources pro / import verifie</p>
                </div>
                <button onClick={() => setActivePanel(null)} className="text-neutral-500 transition hover:text-white" aria-label="Fermer la bibliotheque musicale">
                    <X size={14} />
                </button>
            </div>

            <div className="grid grid-cols-3 gap-1 border-b border-neutral-800/50 px-3 py-2">
                <ModeButton id="catalog" label="Catalogue" icon={Music} active={mode === 'catalog'} onClick={setMode} />
                <ModeButton id="providers" label="Sources" icon={ShieldCheck} active={mode === 'providers'} onClick={setMode} />
                <ModeButton id="import" label="Importer" icon={Upload} active={mode === 'import'} onClick={setMode} />
            </div>

            {mode === 'catalog' && (
                <CatalogView
                    query={query}
                    setQuery={setQuery}
                    genre={genre}
                    setGenre={setGenre}
                    results={results}
                    loading={loading}
                    hasSearched={hasSearched}
                    playingId={playingId}
                    handleSearch={handleSearch}
                    togglePlay={togglePlay}
                    importTrack={importTrack}
                />
            )}

            {mode === 'providers' && <ProviderView />}

            {mode === 'import' && <LocalAudioImport />}
        </div>
    );
};

const ModeButton = ({ id, label, icon: Icon, active, onClick }) => (
    <button
        type="button"
        onClick={() => onClick(id)}
        className={`flex items-center justify-center gap-1.5 rounded-sm border px-2 py-2 text-[9px] font-mono uppercase tracking-widest transition ${
            active
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-neutral-800 bg-neutral-950 text-neutral-500 hover:border-neutral-600 hover:text-white'
        }`}
    >
        <Icon size={12} />
        {label}
    </button>
);

const CatalogView = ({
    query, setQuery, genre, setGenre, results, loading, hasSearched, playingId, handleSearch, togglePlay, importTrack,
}) => (
    <div className="flex min-h-0 flex-1 flex-col">
        <form onSubmit={handleSearch} className="border-b border-neutral-800/50 px-3 py-2">
            <div className="flex items-center gap-2 rounded-sm border border-neutral-800 bg-neutral-900 px-3 py-1.5">
                <Search size={12} className="shrink-0 text-neutral-500" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher mood, genre, titre..."
                    className="flex-1 bg-transparent text-[11px] text-white placeholder-neutral-600 focus:outline-none"
                />
            </div>
        </form>

        <div className="border-b border-neutral-800/50 px-3 py-2">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                {MUSIC_GENRES.map(g => (
                    <button
                        key={g.id}
                        type="button"
                        onClick={() => setGenre(g.id)}
                        className={`shrink-0 rounded-sm border px-2 py-0.5 text-[8px] font-mono uppercase tracking-wider transition-all ${
                            genre === g.id
                                ? 'border-emerald-500/30 bg-emerald-600/20 text-emerald-400'
                                : 'border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-white'
                        }`}
                    >
                        {g.name}
                    </button>
                ))}
            </div>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader size={16} className="animate-spin text-neutral-500" />
                </div>
            ) : results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-neutral-600">
                    <Music size={20} />
                    <p className="mt-2 text-[10px] font-mono uppercase tracking-widest">
                        {hasSearched ? 'Aucun resultat' : 'Rechercher de la musique'}
                    </p>
                </div>
            ) : (
                <div className="divide-y divide-neutral-800/40">
                    {results.map(track => (
                        <TrackRow
                            key={track.id}
                            track={track}
                            isPlaying={playingId === track.id}
                            onPlay={() => togglePlay(track)}
                            onImport={() => importTrack(track)}
                        />
                    ))}
                </div>
            )}
        </div>

        <div className="shrink-0 border-t border-neutral-800 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-[8px] font-mono uppercase tracking-widest text-emerald-400/80">
                    White Bat Audio / credit obligatoire
                </p>
                <div className="flex shrink-0 gap-2">
                    <a href="https://whitebataudio.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[8px] font-mono uppercase tracking-widest text-emerald-400 hover:text-emerald-300">
                        Source <ExternalLink size={9} />
                    </a>
                    <a href="https://whitebataudio.com/license-agreement/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[8px] font-mono uppercase tracking-widest text-neutral-400 hover:text-white">
                        Licence <ExternalLink size={9} />
                    </a>
                </div>
            </div>
        </div>
    </div>
);

const TrackRow = ({ track, isPlaying, onPlay, onImport }) => (
    <div className="group flex items-center gap-3 px-3 py-2 transition hover:bg-neutral-900/50">
        <button
            type="button"
            onClick={onPlay}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm transition ${
                isPlaying ? 'bg-emerald-600/20 text-emerald-400' : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
            aria-label={isPlaying ? `Mettre ${track.title} en pause` : `Ecouter ${track.title}`}
        >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
        </button>

        <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-mono text-neutral-200">{track.title}</p>
            <p className="text-[8px] font-mono uppercase text-neutral-600">
                {track.genre} {track.duration ? `/ ${formatDuration(track.duration)}` : ''}
            </p>
            <p className="truncate text-[8px] font-mono text-neutral-500">
                {track.sourceName} / {track.license}
            </p>
        </div>

        <button
            type="button"
            onClick={onImport}
            className="flex h-8 w-8 items-center justify-center rounded-sm border border-neutral-800 bg-neutral-950 text-neutral-400 transition hover:border-emerald-500/40 hover:text-emerald-400"
            title="Importer dans la timeline"
            aria-label={`Importer ${track.title} dans la timeline`}
        >
            <Download size={12} />
        </button>
    </div>
);

const ProviderView = () => (
    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="mb-3 rounded-sm border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-[9px] font-mono uppercase tracking-widest text-amber-300">Decision produit</p>
            <p className="mt-1 text-[10px] leading-relaxed text-neutral-400">
                Le meilleur flux est un connecteur serveur vers un fournisseur premium, plus un import utilisateur verifie.
                Les sites externes ne doivent pas etre scrapes et les cles API restent hors client.
            </p>
        </div>

        <div className="space-y-2">
            {MUSIC_PROVIDERS.map(provider => (
                <ProviderCard key={provider.id} provider={provider} />
            ))}
        </div>
    </div>
);

const ProviderCard = ({ provider }) => {
    const isAi = provider.tier.startsWith('ai');
    return (
        <div className="rounded-sm border border-neutral-800 bg-neutral-950 p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        {isAi ? <Sparkles size={12} className="text-fuchsia-300" /> : <ShieldCheck size={12} className="text-emerald-300" />}
                        <p className="truncate text-[10px] font-mono uppercase tracking-widest text-neutral-100">{provider.name}</p>
                    </div>
                    <p className="mt-1 text-[9px] font-mono uppercase tracking-widest text-neutral-500">{provider.label}</p>
                </div>
                <span className="shrink-0 rounded-sm border border-neutral-700 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest text-neutral-400">
                    {provider.status}
                </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
                {provider.strengths.map(strength => (
                    <span key={strength} className="rounded-sm bg-neutral-900 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest text-neutral-400">
                        {strength}
                    </span>
                ))}
            </div>

            <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">{provider.caveat}</p>

            <div className="mt-3 flex gap-3">
                <a href={provider.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[8px] font-mono uppercase tracking-widest text-emerald-400 hover:text-emerald-300">
                    Source <ExternalLink size={9} />
                </a>
                <a href={provider.licenseUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[8px] font-mono uppercase tracking-widest text-neutral-400 hover:text-white">
                    Licence/API <ExternalLink size={9} />
                </a>
            </div>
        </div>
    );
};

const LocalAudioImport = () => {
    const { addAudioTrack, currentTime } = useVideoStore();
    const fileRef = useRef(null);
    const [fileName, setFileName] = useState('');
    const [license, setLicense] = useState('owned');
    const [sourceName, setSourceName] = useState('Import utilisateur');
    const [attribution, setAttribution] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        setError('');
        if (!file) return;
        if (!file.type.startsWith('audio/')) {
            setFileName('');
            setError('Format refuse: importer un fichier audio.');
            e.target.value = '';
            return;
        }
        if (file.size > MAX_AUDIO_IMPORT_BYTES) {
            setFileName('');
            setError('Fichier trop lourd: limite 150 MB pour l import navigateur.');
            e.target.value = '';
            return;
        }
        setFileName(file.name);
    };

    const importSelectedFile = () => {
        const file = fileRef.current?.files?.[0];
        if (!file || busy) return;

        setBusy(true);
        setError('');

        const url = URL.createObjectURL(file);
        const audio = new Audio(url);
        audio.onloadedmetadata = () => {
            if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
                URL.revokeObjectURL(url);
                setBusy(false);
                setError('Duree audio illisible.');
                return;
            }
            if (audio.duration > MAX_AUDIO_IMPORT_SECONDS) {
                URL.revokeObjectURL(url);
                setBusy(false);
                setError('Duree trop longue: limite 30 minutes pour la timeline navigateur.');
                return;
            }

            addAudioTrack({
                name: file.name.replace(/\.[^.]+$/, ''),
                url,
                file,
                duration: audio.duration,
                startTime: currentTime,
                source: 'user-upload',
                sourceName: sourceName.trim() || 'Import utilisateur',
                license,
                attribution: attribution.trim(),
                rightsStatus: 'user-declared',
            });
            setBusy(false);
        };
        audio.onerror = () => {
            URL.revokeObjectURL(url);
            setBusy(false);
            setError('Impossible de lire ce fichier audio dans le navigateur.');
        };
    };

    return (
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <div className="rounded-sm border border-neutral-800 bg-neutral-950 p-3">
                <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-200">Import audio utilisateur</p>
                <p className="mt-1 text-[10px] leading-relaxed text-neutral-500">
                    Import local pour montage immediat. Pour un projet sauvegarde cloud, ce flux devra envoyer le fichier vers Firebase Storage avec la meme declaration de droits.
                </p>

                <input ref={fileRef} type="file" accept="audio/*" onChange={handleFile} className="hidden" />
                <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-neutral-700 px-3 py-3 text-[9px] font-mono uppercase tracking-widest text-neutral-400 transition hover:border-emerald-500/40 hover:text-emerald-300"
                >
                    <Upload size={13} />
                    {fileName || 'Choisir un fichier audio'}
                </button>

                <div className="mt-3 grid gap-2">
                    <label className="grid gap-1">
                        <span className="text-[8px] font-mono uppercase tracking-widest text-neutral-500">Licence declaree</span>
                        <select
                            value={license}
                            onChange={(e) => setLicense(e.target.value)}
                            className="rounded-sm border border-neutral-800 bg-neutral-900 px-2 py-2 text-[10px] text-neutral-200 outline-none focus:border-emerald-500/50"
                        >
                            <option value="owned">Je possede les droits / commande originale</option>
                            <option value="royalty-free">Royalty-free avec licence valide</option>
                            <option value="creative-commons">Creative Commons compatible</option>
                            <option value="ai-generated">Musique IA autorisee commercialement</option>
                        </select>
                    </label>

                    <label className="grid gap-1">
                        <span className="text-[8px] font-mono uppercase tracking-widest text-neutral-500">Source</span>
                        <input
                            value={sourceName}
                            onChange={(e) => setSourceName(e.target.value)}
                            className="rounded-sm border border-neutral-800 bg-neutral-900 px-2 py-2 text-[10px] text-neutral-200 outline-none focus:border-emerald-500/50"
                            placeholder="Ex: Epidemic Sound, Beatoven, client..."
                        />
                    </label>

                    <label className="grid gap-1">
                        <span className="text-[8px] font-mono uppercase tracking-widest text-neutral-500">Attribution / note droits</span>
                        <textarea
                            value={attribution}
                            onChange={(e) => setAttribution(e.target.value)}
                            rows={3}
                            className="resize-none rounded-sm border border-neutral-800 bg-neutral-900 px-2 py-2 text-[10px] text-neutral-200 outline-none focus:border-emerald-500/50"
                            placeholder="Credit obligatoire, numero de licence, URL source..."
                        />
                    </label>
                </div>

                {error && <p className="mt-2 text-[10px] text-red-300">{error}</p>}

                <button
                    type="button"
                    onClick={importSelectedFile}
                    disabled={!fileName || busy}
                    className="mt-3 w-full rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[9px] font-mono uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900 disabled:text-neutral-600"
                >
                    {busy ? 'Analyse audio...' : 'Importer dans la timeline'}
                </button>
            </div>
        </div>
    );
};

export default MusicLibrary;
