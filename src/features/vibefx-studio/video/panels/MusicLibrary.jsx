import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Search, Play, Pause, Download, Music, Loader, ExternalLink, Upload, ShieldCheck, Sparkles, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { isAiProviderId } from '@/config/aiLaunch';
import { useAiLaunchSettings } from '@/hooks/useAiLaunchSettings';
import useVideoStore from '../store/videoStore';
import { MUSIC_GENRES, MUSIC_PROVIDERS, getCuratedTracks } from '../data/musicCatalog';
import {
    RIGHTS_IMPORT_PRESETS,
    RIGHTS_STATUS_LABELS,
    buildTrackRightsManifest,
    getRightsPreset,
    getTrackRightsIssues,
} from '../data/musicRights';
import { buildUnavailableWaveform, extractAudioWaveform } from '../utils/audioWaveform';

const MAX_AUDIO_IMPORT_BYTES = 150 * 1024 * 1024;
const MAX_AUDIO_IMPORT_SECONDS = 30 * 60;
const FREE_SOURCE_FILTERS = [
    { id: 'all', label: 'Toutes' },
    { id: 'openverse', label: 'Openverse' },
    { id: 'jamendo', label: 'Jamendo' },
    { id: 'freesound', label: 'Freesound' },
    { id: 'archive', label: 'Archive' },
    { id: 'wikimedia', label: 'Wikimedia' },
];

const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
};

const createTrackId = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2, 10);

const MusicLibrary = () => {
    const { aiInterfacesEnabled } = useAiLaunchSettings();
    const { addAudioTrack, updateAudioTrack, setActivePanel, currentTime } = useVideoStore();
    const [mode, setMode] = useState('import');
    const [importPresetId, setImportPresetId] = useState('pixabay-manual');
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

    const importTrack = async (track) => {
        const id = createTrackId();
        const acquiredAt = new Date().toISOString();
        const rightsTrack = {
            ...track,
            id,
            acquiredAt,
        };
        addAudioTrack({
            id,
            name: track.title,
            url: track.url || track.previewUrl,
            duration: track.duration || 30,
            startTime: currentTime,
            source: 'library',
            provider: track.provider,
            sourceName: track.sourceName,
            sourceUrl: track.sourceUrl,
            license: track.license,
            licenseUrl: track.licenseUrl,
            attribution: track.attribution,
            rightsStatus: track.rightsStatus,
            commercialUse: track.commercialUse === true,
            socialUse: track.socialUse === true,
            contentIdWarning: track.contentIdWarning,
            licenseSnapshotVersion: track.licenseSnapshotVersion,
            acquiredAt,
            waveform: { status: 'pending', peaks: [] },
            rightsManifest: buildTrackRightsManifest(rightsTrack),
        });

        extractAudioWaveform(track.url || track.previewUrl)
            .then((waveform) => updateAudioTrack(id, { waveform }))
            .catch((err) => updateAudioTrack(id, { waveform: buildUnavailableWaveform(err.message) }));
    };

    const startVerifiedImport = (presetId) => {
        setImportPresetId(presetId);
        setMode('import');
    };

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!aiInterfacesEnabled && mode === 'ai') {
            setMode('import');
        }
    }, [aiInterfacesEnabled, mode]);

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
                <div>
                    <h3 className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Bibliotheque Musicale</h3>
                    <p className="mt-0.5 text-[8px] font-mono uppercase tracking-widest text-neutral-600">Recherche gratuite / starter pack / sources pro</p>
                </div>
                <button onClick={() => setActivePanel(null)} className="text-neutral-500 transition hover:text-white" aria-label="Fermer la bibliotheque musicale">
                    <X size={14} />
                </button>
            </div>

            <div className={`grid ${aiInterfacesEnabled ? 'grid-cols-4' : 'grid-cols-3'} gap-1 border-b border-neutral-800/50 px-3 py-2`}>
                <ModeButton id="import" label="Gratuit" icon={Search} active={mode === 'import'} onClick={setMode} />
                <ModeButton id="catalog" label="Starter" icon={Music} active={mode === 'catalog'} onClick={setMode} />
                <ModeButton id="providers" label="Sources" icon={ShieldCheck} active={mode === 'providers'} onClick={setMode} />
                {aiInterfacesEnabled && <ModeButton id="ai" label="IA" icon={Sparkles} active={mode === 'ai'} onClick={setMode} />}
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

            {mode === 'providers' && <ProviderView aiInterfacesEnabled={aiInterfacesEnabled} onStartImport={startVerifiedImport} />}

            {mode === 'import' && <LocalAudioImport initialPresetId={importPresetId} onSelectPreset={setImportPresetId} />}

            {aiInterfacesEnabled && mode === 'ai' && <AiMusicView />}
        </div>
    );
};

const ModeButton = ({ id, label, icon: Icon, active, onClick }) => (
    <button
        type="button"
        onClick={() => onClick(id)}
        data-testid={`music-library-mode-${id}`}
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
            className={`vibecut-square-button flex h-11 w-11 shrink-0 items-center justify-center rounded-sm transition ${
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
            <p className="mt-0.5 inline-flex max-w-full items-center gap-1 rounded-sm border border-emerald-500/20 bg-emerald-500/5 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider text-emerald-300/90">
                <ShieldCheck size={9} />
                {RIGHTS_STATUS_LABELS[track.rightsStatus] || track.rightsStatus}
            </p>
        </div>

        <button
            type="button"
            onClick={onImport}
            data-testid="music-catalog-import-track"
            className="vibecut-square-button flex h-11 w-11 items-center justify-center rounded-sm border border-neutral-800 bg-neutral-950 text-neutral-400 transition hover:border-emerald-500/40 hover:text-emerald-400"
            title="Importer dans la timeline"
            aria-label={`Importer ${track.title} dans la timeline`}
        >
            <Download size={12} />
        </button>
    </div>
);

const ProviderView = ({ aiInterfacesEnabled, onStartImport }) => (
    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="mb-3 rounded-sm border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-[9px] font-mono uppercase tracking-widest text-amber-300">Decision produit</p>
            <p className="mt-1 text-[10px] leading-relaxed text-neutral-400">
                Trois voies seulement: catalogue premium sous contrat, sources gratuites verifiees en import manuel,
                {aiInterfacesEnabled
                    ? 'et generation IA via connecteurs serveur. Aucun scraping, aucune cle provider dans le client.'
                    : 'avec sources gratuites et imports verifies pour ce premier lancement. Aucun scraping, aucune cle provider dans le client.'}
            </p>
        </div>

        <div className={`mb-3 grid ${aiInterfacesEnabled ? 'grid-cols-3' : 'grid-cols-2'} gap-1`}>
            {[
                ['Premium', 'Partner API', 'Production social safe'],
                ['Free verifie', 'Import manuel', 'Tests et templates'],
                ...(aiInterfacesEnabled ? [['IA', 'Callable serveur', 'Quota + licence capturee']] : []),
            ].map(([title, meta, body]) => (
                <div key={title} className="rounded-sm border border-neutral-800 bg-neutral-950 p-2">
                    <p className="text-[8px] font-mono uppercase tracking-widest text-neutral-200">{title}</p>
                    <p className="mt-1 text-[8px] font-mono uppercase tracking-widest text-emerald-300/80">{meta}</p>
                    <p className="mt-1 text-[9px] leading-snug text-neutral-500">{body}</p>
                </div>
            ))}
        </div>

        <div className="space-y-2">
            {MUSIC_PROVIDERS.filter((provider) => aiInterfacesEnabled || !isAiProviderId(provider.id)).map(provider => (
                <ProviderCard key={provider.id} provider={provider} onStartImport={onStartImport} />
            ))}
        </div>
    </div>
);

const PROVIDER_IMPORT_PRESET = {
    'openverse-audio': 'openverse-free-api',
    pixabay: 'pixabay-manual',
    'jamendo-music': 'jamendo-free-api',
    freesound: 'freesound-free-api',
    'internet-archive': 'archive-free-api',
    wikimedia: 'wikimedia-free-api',
    jamendo: 'jamendo-licensed',
};

const ProviderCard = ({ provider, onStartImport }) => {
    const isAi = provider.tier.startsWith('ai');
    const importPresetId = PROVIDER_IMPORT_PRESET[provider.id];
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

            <div className="mt-3 flex flex-wrap gap-2">
                {importPresetId && (
                    <button
                        type="button"
                        onClick={() => onStartImport(importPresetId)}
                        className="inline-flex items-center gap-1 rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[8px] font-mono uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-500/15"
                    >
                        <Upload size={9} />
                        Importer cette source
                    </button>
                )}
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

const LocalAudioImport = ({ initialPresetId = 'pixabay-manual', onSelectPreset }) => {
    const { addAudioTrack, currentTime } = useVideoStore();
    const fileRef = useRef(null);
    const [fileName, setFileName] = useState('');
    const [presetId, setPresetId] = useState(initialPresetId);
    const initialPreset = getRightsPreset(initialPresetId);
    const [license, setLicense] = useState(initialPreset.license);
    const [licenseUrl, setLicenseUrl] = useState(initialPreset.licenseUrl);
    const [sourceName, setSourceName] = useState(initialPreset.sourceName);
    const [sourceUrl, setSourceUrl] = useState(initialPreset.sourceUrl);
    const [attribution, setAttribution] = useState('');
    const [commercialUse, setCommercialUse] = useState(initialPreset.commercialUse);
    const [socialUse, setSocialUse] = useState(initialPreset.socialUse);
    const [contentIdWarning, setContentIdWarning] = useState(initialPreset.contentIdWarning);
    const [directAudioUrl, setDirectAudioUrl] = useState('');
    const [freeQuery, setFreeQuery] = useState('');
    const [freeGenre, setFreeGenre] = useState('');
    const [freeProvider, setFreeProvider] = useState('all');
    const [freeResults, setFreeResults] = useState([]);
    const [freeProviderStatus, setFreeProviderStatus] = useState([]);
    const [freeStatus, setFreeStatus] = useState('idle');
    const [freeSearchError, setFreeSearchError] = useState('');
    const [remoteImport, setRemoteImport] = useState(null);
    const [remotePlaying, setRemotePlaying] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const remoteAudioRef = useRef(null);
    const freeSearchAbortRef = useRef(null);

    const clearRemoteImport = useCallback((revoke = true) => {
        if (remoteAudioRef.current) {
            remoteAudioRef.current.pause();
            remoteAudioRef.current = null;
        }
        setRemotePlaying(false);
        setRemoteImport((previous) => {
            if (revoke && previous?.blobUrl) URL.revokeObjectURL(previous.blobUrl);
            return null;
        });
    }, []);

    const applyPreset = (id) => {
        const preset = getRightsPreset(id);
        setPresetId(id);
        onSelectPreset?.(id);
        setSourceName(preset.sourceName);
        setSourceUrl(preset.sourceUrl);
        setLicense(preset.license);
        setLicenseUrl(preset.licenseUrl);
        setAttribution(preset.attribution);
        setCommercialUse(preset.commercialUse);
        setSocialUse(preset.socialUse);
        setContentIdWarning(preset.contentIdWarning);
        setDirectAudioUrl('');
        clearRemoteImport();
        setError('');
    };

    useEffect(() => {
        applyPreset(initialPresetId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialPresetId]);

    useEffect(() => () => clearRemoteImport(), [clearRemoteImport]);
    useEffect(() => () => freeSearchAbortRef.current?.abort(), []);

    const selectedPreset = getRightsPreset(presetId);

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

    const getDeclaredRights = () => {
        const preset = getRightsPreset(presetId);
        return {
            preset,
            declaredRights: {
                sourceName: sourceName.trim(),
                sourceUrl: sourceUrl.trim(),
                license: license.trim(),
                licenseUrl: licenseUrl.trim(),
                attribution: attribution.trim(),
                rightsStatus: preset.rightsStatus,
                commercialUse,
                socialUse,
                contentIdWarning: contentIdWarning.trim(),
            },
        };
    };

    const validateDeclaredRights = (declaredRights) => {
        const rightsAudit = getTrackRightsIssues(declaredRights);
        if (rightsAudit.issues.length > 0) {
            setError(`Droits incomplets: ${rightsAudit.issues.join(', ')}.`);
            return false;
        }
        return true;
    };

    const addAudioBlobToTimeline = async ({ blobUrl, file, name, duration, source, preset, declaredRights, downloadUrl = '' }) => {
        const id = createTrackId();
        const acquiredAt = new Date().toISOString();
        const trackRights = {
            id,
            provider: preset.id,
            ...declaredRights,
            downloadUrl,
            licenseSnapshotVersion: 'manual-current',
            acquiredAt,
        };
        let waveform;
        try {
            waveform = await extractAudioWaveform(file || blobUrl);
        } catch (err) {
            waveform = buildUnavailableWaveform(err.message);
        }

        addAudioTrack({
            id,
            name,
            url: blobUrl,
            file,
            duration,
            startTime: currentTime,
            source,
            ...trackRights,
            waveform,
            rightsManifest: buildTrackRightsManifest(trackRights),
        });
    };

    const buildFreeTrackDeclaredRights = (track) => ({
        sourceName: track.sourceName || 'Source gratuite verifiee',
        sourceUrl: track.sourceUrl || '',
        license: track.license || 'Licence ouverte a verifier',
        licenseUrl: track.licenseUrl || '',
        attribution: track.attribution || '',
        rightsStatus: track.rightsStatus || 'credit-required',
        commercialUse: track.commercialUse === true,
        socialUse: track.socialUse === true,
        contentIdWarning: track.contentIdWarning || '',
    });

    const getFreeTrackPresetId = (track) => {
        if (track.provider === 'openverse') return 'openverse-free-api';
        if (track.provider === 'jamendo') return 'jamendo-free-api';
        if (track.provider === 'freesound') return 'freesound-free-api';
        if (track.provider === 'archive') return 'archive-free-api';
        if (track.provider === 'wikimedia') return 'wikimedia-free-api';
        return 'openverse-free-api';
    };

    const applyFreeTrackRights = (track) => {
        const presetIdForTrack = getFreeTrackPresetId(track);
        const declaredRights = buildFreeTrackDeclaredRights(track);
        setPresetId(presetIdForTrack);
        setSourceName(declaredRights.sourceName);
        setSourceUrl(declaredRights.sourceUrl);
        setLicense(declaredRights.license);
        setLicenseUrl(declaredRights.licenseUrl);
        setAttribution(declaredRights.attribution);
        setCommercialUse(declaredRights.commercialUse);
        setSocialUse(declaredRights.socialUse);
        setContentIdWarning(declaredRights.contentIdWarning);
        setDirectAudioUrl(track.downloadUrl || '');
        setError('');
        return { preset: getRightsPreset(presetIdForTrack), declaredRights };
    };

    const searchFreeCatalog = async (event) => {
        event?.preventDefault();
        if (freeStatus === 'loading') return;

        freeSearchAbortRef.current?.abort();
        const controller = new AbortController();
        freeSearchAbortRef.current = controller;
        setFreeStatus('loading');
        setFreeSearchError('');

        const params = new URLSearchParams();
        if (freeQuery.trim()) params.set('q', freeQuery.trim());
        if (freeGenre.trim()) params.set('genre', freeGenre.trim());
        params.set('provider', freeProvider);

        let response;
        try {
            response = await fetch(`/api/music/free-search?${params.toString()}`, { signal: controller.signal });
        } catch (err) {
            if (err.name === 'AbortError') return;
            setFreeResults([]);
            setFreeStatus('error');
            setFreeSearchError('Recherche Jamendo indisponible.');
            return;
        }

        const payload = await response.json().catch(() => ({}));
        if (response.status === 503) {
            setFreeResults([]);
            setFreeStatus('unavailable');
            setFreeSearchError(payload.error || 'Connecteur Jamendo non configure.');
            return;
        }
        if (!response.ok) {
            setFreeResults([]);
            setFreeStatus('error');
            setFreeSearchError(payload.error || 'Recherche Jamendo refusee.');
            return;
        }

        const tracks = Array.isArray(payload.tracks) ? payload.tracks : [];
        setFreeProviderStatus(Array.isArray(payload.providers) ? payload.providers : []);
        setFreeResults(tracks);
        setFreeStatus(tracks.length > 0 ? 'ready' : 'empty');
    };

    const importSelectedFile = () => {
        const file = fileRef.current?.files?.[0];
        if (!file || busy) return;

        const { preset, declaredRights } = getDeclaredRights();
        if (!validateDeclaredRights(declaredRights)) return;

        setBusy(true);
        setError('');

        const url = URL.createObjectURL(file);
        const audio = new Audio(url);
        audio.onloadedmetadata = async () => {
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

            await addAudioBlobToTimeline({
                name: file.name.replace(/\.[^.]+$/, ''),
                blobUrl: url,
                file,
                duration: audio.duration,
                source: 'user-upload',
                preset,
                declaredRights,
            });
            setBusy(false);
        };
        audio.onerror = () => {
            URL.revokeObjectURL(url);
            setBusy(false);
            setError('Impossible de lire ce fichier audio dans le navigateur.');
        };
    };

    const fetchDirectAudioFile = async (options = null) => {
        const audioUrl = options?.audioUrl || directAudioUrl.trim();
        if (!audioUrl || busy) return null;

        const rightsPayload = options?.declaredRights && options?.preset
            ? { preset: options.preset, declaredRights: options.declaredRights }
            : getDeclaredRights();
        const { preset, declaredRights } = rightsPayload;
        if (!validateDeclaredRights(declaredRights)) return null;

        setBusy(true);
        setError('');

        let response;
        try {
            response = await fetch('/api/music/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    audioUrl,
                    sourceName: declaredRights.sourceName,
                    sourceUrl: declaredRights.sourceUrl,
                    license: declaredRights.license,
                    licenseUrl: declaredRights.licenseUrl,
                }),
            });
        } catch {
            setBusy(false);
            setError('Import distant impossible: reseau indisponible.');
            return null;
        }

        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            setBusy(false);
            setError(payload.error || 'Import distant refuse.');
            return null;
        }

        const blob = await response.blob();
        const finalAudioUrl = response.headers.get('x-vibefx-audio-source-url') || audioUrl;
        const fileName = (() => {
            try {
                return decodeURIComponent(new URL(finalAudioUrl).pathname.split('/').filter(Boolean).pop() || 'audio-import');
            } catch {
                return 'audio-import';
            }
        })();
        const file = new File([blob], fileName, { type: blob.type || 'audio/mpeg' });
        const blobUrl = URL.createObjectURL(file);
        return { blobUrl, file, finalAudioUrl, fileName, preset, declaredRights };
    };

    const previewDirectAudioUrl = async (options = null) => {
        clearRemoteImport();
        const payload = await fetchDirectAudioFile(options?.audioUrl ? options : null);
        if (!payload) return;

        const audio = new Audio(payload.blobUrl);
        audio.onloadedmetadata = () => {
            if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
                URL.revokeObjectURL(payload.blobUrl);
                setBusy(false);
                setError('Duree audio distante illisible.');
                return;
            }
            if (audio.duration > MAX_AUDIO_IMPORT_SECONDS) {
                URL.revokeObjectURL(payload.blobUrl);
                setBusy(false);
                setError('Duree trop longue: limite 30 minutes pour la timeline navigateur.');
                return;
            }

            audio.volume = 0.5;
            audio.onended = () => setRemotePlaying(false);
            remoteAudioRef.current = audio;
            setRemoteImport({
                ...payload,
                name: payload.file.name.replace(/\.[^.]+$/, ''),
                duration: audio.duration,
            });
            setFileName(payload.file.name);
            setBusy(false);
        };
        audio.onerror = () => {
            URL.revokeObjectURL(payload.blobUrl);
            setBusy(false);
            setError('Impossible de lire le fichier audio distant dans le navigateur.');
        };
    };

    const toggleRemotePreview = () => {
        if (!remoteAudioRef.current) return;
        if (remotePlaying) {
            remoteAudioRef.current.pause();
            setRemotePlaying(false);
            return;
        }
        remoteAudioRef.current.play().then(() => setRemotePlaying(true)).catch(() => {
            setRemotePlaying(false);
            setError('Lecture preview refusee par le navigateur.');
        });
    };

    const importPreparedRemoteAudio = async () => {
        if (!remoteImport || busy) return;
        const { preset, declaredRights } = remoteImport.preset && remoteImport.declaredRights
            ? { preset: remoteImport.preset, declaredRights: remoteImport.declaredRights }
            : getDeclaredRights();
        if (!validateDeclaredRights(declaredRights)) return;

        setBusy(true);
        await addAudioBlobToTimeline({
            name: remoteImport.name,
            blobUrl: remoteImport.blobUrl,
            file: remoteImport.file,
            duration: remoteImport.duration,
            source: 'verified-url-import',
            preset,
            declaredRights,
            downloadUrl: remoteImport.finalAudioUrl,
        });
        setBusy(false);
        clearRemoteImport(false);
    };

    const previewFreeCatalogTrack = async (track) => {
        if (!track.downloadAllowed || !track.downloadUrl) {
            setError('Cette piste ne peut pas etre telechargee via l application.');
            return;
        }
        const rightsPayload = applyFreeTrackRights(track);
        setFileName(track.title);
        await previewDirectAudioUrl({
            audioUrl: track.downloadUrl,
            preset: rightsPayload.preset,
            declaredRights: rightsPayload.declaredRights,
        });
    };

    return (
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <div className="rounded-sm border border-neutral-800 bg-neutral-950 p-3">
                <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-200">Importer une nouvelle musique gratuite</p>
                <p className="mt-1 text-[10px] leading-relaxed text-neutral-500">
                    Cherchez via un connecteur officiel configure cote serveur, prechargez la piste, ecoutez-la, puis importez-la avec ses droits.
                    Les imports fichier/URL restent disponibles pour les sources gratuites sans API.
                </p>

                <div className="mt-3 grid grid-cols-3 gap-1 rounded-sm border border-neutral-800 bg-neutral-900/40 p-1.5">
                    {[
                        ['1', 'Source officielle'],
                        ['2', 'Fichier audio'],
                        ['3', 'Droits captures'],
                    ].map(([step, label]) => (
                        <div key={step} className="rounded-sm bg-neutral-950 px-2 py-1.5">
                            <p className="text-[8px] font-mono uppercase tracking-widest text-emerald-300">Step {step}</p>
                            <p className="mt-0.5 text-[8px] font-mono uppercase tracking-wider text-neutral-400">{label}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-3 grid grid-cols-1 gap-1">
                    {RIGHTS_IMPORT_PRESETS.map(preset => (
                        <button
                            key={preset.id}
                            type="button"
                            onClick={() => applyPreset(preset.id)}
                            className={`flex items-start justify-between gap-2 rounded-sm border px-2 py-2 text-left transition ${
                                presetId === preset.id
                                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                                    : 'border-neutral-800 bg-neutral-900/50 text-neutral-500 hover:border-neutral-600 hover:text-neutral-200'
                            }`}
                        >
                            <span className="min-w-0">
                                <span className="block text-[9px] font-mono uppercase tracking-widest">{preset.label}</span>
                                <span className="mt-0.5 block text-[8px] font-mono uppercase tracking-widest opacity-70">{preset.lane}</span>
                            </span>
                            {presetId === preset.id ? <ClipboardCheck size={12} className="mt-0.5 shrink-0" /> : null}
                        </button>
                    ))}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 rounded-sm border border-emerald-500/20 bg-emerald-500/5 p-2">
                    <div className="min-w-0">
                        <p className="truncate text-[9px] font-mono uppercase tracking-widest text-emerald-300">{selectedPreset.label}</p>
                        <p className="mt-0.5 text-[9px] leading-snug text-neutral-500">{selectedPreset.contentIdWarning}</p>
                    </div>
                    {sourceUrl && sourceUrl !== 'user-declared' && (
                        <a
                            href={sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 rounded-sm border border-emerald-500/30 px-2 py-1 text-[8px] font-mono uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-500/10"
                        >
                            Ouvrir <ExternalLink size={9} className="ml-1 inline" />
                        </a>
                    )}
                </div>

                <div className="mt-3 rounded-sm border border-emerald-500/20 bg-emerald-500/5 p-2">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-[9px] font-mono uppercase tracking-widest text-emerald-300">Catalogue gratuit agrege</p>
                            <p className="mt-1 text-[9px] leading-relaxed text-neutral-500">
                                Openverse, Jamendo, Freesound, Internet Archive et Wikimedia passent par des APIs officielles cote serveur.
                                Les cles optionnelles restent hors client.
                            </p>
                        </div>
                        <a href="https://docs.openverse.org/api/" target="_blank" rel="noreferrer" className="shrink-0 text-[8px] font-mono uppercase tracking-widest text-emerald-300 hover:text-emerald-200">
                            Docs <ExternalLink size={9} className="ml-1 inline" />
                        </a>
                    </div>

                    <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
                        {FREE_SOURCE_FILTERS.map((source) => (
                            <button
                                key={source.id}
                                type="button"
                                onClick={() => setFreeProvider(source.id)}
                                className={`shrink-0 rounded-sm border px-2 py-1 text-[8px] font-mono uppercase tracking-widest transition ${
                                    freeProvider === source.id
                                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                                        : 'border-neutral-800 bg-neutral-950 text-neutral-500 hover:border-neutral-600 hover:text-neutral-200'
                                }`}
                            >
                                {source.label}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={searchFreeCatalog} className="mt-2 grid grid-cols-[1fr_auto] gap-1">
                        <input
                            value={freeQuery}
                            onChange={(e) => setFreeQuery(e.target.value)}
                            className="min-w-0 rounded-sm border border-neutral-800 bg-neutral-950 px-2 py-2 text-[10px] text-neutral-200 outline-none focus:border-emerald-500/50"
                            placeholder="mood, genre, artiste..."
                        />
                        <button
                            type="submit"
                            disabled={freeStatus === 'loading'}
                            className="rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-2 py-2 text-[8px] font-mono uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900 disabled:text-neutral-600"
                        >
                            {freeStatus === 'loading' ? 'Recherche...' : 'Chercher'}
                        </button>
                    </form>
                    <select
                        value={freeGenre}
                        onChange={(e) => setFreeGenre(e.target.value)}
                        className="mt-1 w-full rounded-sm border border-neutral-800 bg-neutral-950 px-2 py-2 text-[10px] text-neutral-300 outline-none focus:border-emerald-500/50"
                    >
                        {MUSIC_GENRES.map((item) => (
                            <option key={item.id || 'all'} value={item.id}>{item.name}</option>
                        ))}
                    </select>

                    {freeSearchError && (
                        <p className={`mt-2 text-[9px] leading-relaxed ${freeStatus === 'unavailable' ? 'text-amber-200/80' : 'text-red-300'}`}>
                            {freeSearchError}
                        </p>
                    )}
                    {freeProviderStatus.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {freeProviderStatus.map((provider) => (
                                <span
                                    key={provider.id}
                                    className={`rounded-sm px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest ${
                                        provider.error
                                            ? 'bg-amber-500/10 text-amber-300'
                                            : 'bg-emerald-500/10 text-emerald-300'
                                    }`}
                                    title={provider.error || `${provider.count} piste(s)`}
                                >
                                    {provider.label}: {provider.error ? 'config' : provider.count}
                                </span>
                            ))}
                        </div>
                    )}
                    {freeStatus === 'empty' && (
                        <p className="mt-2 text-[9px] leading-relaxed text-neutral-500">Aucun resultat gratuit pour cette recherche.</p>
                    )}
                    {freeResults.length > 0 && (
                        <div className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
                            {freeResults.map((track) => (
                                <div key={track.id} className="rounded-sm border border-neutral-800 bg-neutral-950 p-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate text-[9px] font-mono uppercase tracking-widest text-neutral-200">{track.title}</p>
                                            <p className="mt-0.5 truncate text-[8px] font-mono uppercase tracking-widest text-neutral-500">
                                                {track.sourceName} / {track.artist} {track.duration ? `/ ${formatDuration(track.duration)}` : ''}
                                            </p>
                                            <p className="mt-1 truncate text-[8px] text-neutral-500">{track.license}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => previewFreeCatalogTrack(track)}
                                            disabled={!track.downloadAllowed || busy}
                                            className="shrink-0 rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[8px] font-mono uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900 disabled:text-neutral-600"
                                        >
                                            Precharger
                                        </button>
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        <span className={`rounded-sm px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest ${track.commercialUse ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
                                            Commercial {track.commercialUse ? 'OK' : 'NC/verifier'}
                                        </span>
                                        <span className="rounded-sm bg-neutral-900 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest text-neutral-400">
                                            Social a verifier
                                        </span>
                                        {track.sourceUrl && (
                                            <a href={track.sourceUrl} target="_blank" rel="noreferrer" className="rounded-sm bg-neutral-900 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest text-emerald-300 hover:text-emerald-200">
                                                Source
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <input ref={fileRef} type="file" accept="audio/*" onChange={handleFile} className="hidden" />
                <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-neutral-700 px-3 py-3 text-[9px] font-mono uppercase tracking-widest text-neutral-400 transition hover:border-emerald-500/40 hover:text-emerald-300"
                >
                    <Upload size={13} />
                    {fileName || 'Choisir un fichier audio'}
                </button>

                <div className="mt-3 rounded-sm border border-neutral-800 bg-neutral-900/50 p-2">
                    <label className="grid gap-1">
                        <span className="text-[8px] font-mono uppercase tracking-widest text-neutral-500">URL audio directe verified-free</span>
                        <input
                            value={directAudioUrl}
                            onChange={(e) => {
                                setDirectAudioUrl(e.target.value);
                                clearRemoteImport();
                            }}
                            className="rounded-sm border border-neutral-800 bg-neutral-950 px-2 py-2 text-[10px] text-neutral-200 outline-none focus:border-emerald-500/50"
                            placeholder="https://cdn.pixabay.com/.../track.mp3"
                        />
                    </label>
                    <p className="mt-1 text-[9px] leading-relaxed text-neutral-500">
                        Option serveur controlee: URL audio finale uniquement, domaines allowlistes, pas de page catalogue ni scraping.
                    </p>
                    <button
                        type="button"
                        onClick={previewDirectAudioUrl}
                        disabled={!directAudioUrl.trim() || busy}
                        className="mt-2 w-full rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[9px] font-mono uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900 disabled:text-neutral-600"
                    >
                        {busy ? 'Prechargement...' : 'Precharger et ecouter'}
                    </button>
                    {remoteImport && (
                        <div className="mt-2 rounded-sm border border-emerald-500/20 bg-neutral-950 p-2">
                            <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="truncate text-[9px] font-mono uppercase tracking-widest text-neutral-200">{remoteImport.name}</p>
                                    <p className="mt-0.5 text-[8px] font-mono uppercase tracking-widest text-neutral-500">
                                        {formatDuration(remoteImport.duration)} - precharge serveur
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={toggleRemotePreview}
                                    className="shrink-0 rounded-sm border border-neutral-700 p-2 text-neutral-300 transition hover:border-emerald-500/40 hover:text-emerald-300"
                                    aria-label={remotePlaying ? 'Pause preview audio distante' : 'Lire preview audio distante'}
                                >
                                    {remotePlaying ? <Pause size={12} /> : <Play size={12} />}
                                </button>
                            </div>
                            <p className="mt-1 truncate text-[8px] font-mono uppercase tracking-widest text-neutral-600">{remoteImport.finalAudioUrl}</p>
                            <button
                                type="button"
                                onClick={importPreparedRemoteAudio}
                                disabled={busy}
                                className="mt-2 w-full rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[9px] font-mono uppercase tracking-widest text-emerald-200 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900 disabled:text-neutral-600"
                            >
                                Importer la piste prechargee
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-3 grid gap-2">
                    <label className="grid gap-1">
                        <span className="text-[8px] font-mono uppercase tracking-widest text-neutral-500">Source</span>
                        <input
                            value={sourceName}
                            onChange={(e) => setSourceName(e.target.value)}
                            className="rounded-sm border border-neutral-800 bg-neutral-900 px-2 py-2 text-[10px] text-neutral-200 outline-none focus:border-emerald-500/50"
                            placeholder="Ex: Pixabay Music, Jamendo, client..."
                        />
                    </label>

                    <label className="grid gap-1">
                        <span className="text-[8px] font-mono uppercase tracking-widest text-neutral-500">URL source / preuve</span>
                        <input
                            value={sourceUrl}
                            onChange={(e) => setSourceUrl(e.target.value)}
                            className="rounded-sm border border-neutral-800 bg-neutral-900 px-2 py-2 text-[10px] text-neutral-200 outline-none focus:border-emerald-500/50"
                            placeholder="URL officielle de la piste, facture, ou user-declared"
                        />
                    </label>

                    <label className="grid gap-1">
                        <span className="text-[8px] font-mono uppercase tracking-widest text-neutral-500">Licence</span>
                        <input
                            value={license}
                            onChange={(e) => setLicense(e.target.value)}
                            className="rounded-sm border border-neutral-800 bg-neutral-900 px-2 py-2 text-[10px] text-neutral-200 outline-none focus:border-emerald-500/50"
                            placeholder="Nom de la licence ou numero de licence"
                        />
                    </label>

                    <label className="grid gap-1">
                        <span className="text-[8px] font-mono uppercase tracking-widest text-neutral-500">URL licence</span>
                        <input
                            value={licenseUrl}
                            onChange={(e) => setLicenseUrl(e.target.value)}
                            className="rounded-sm border border-neutral-800 bg-neutral-900 px-2 py-2 text-[10px] text-neutral-200 outline-none focus:border-emerald-500/50"
                            placeholder="URL licence officielle ou user-declared"
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

                    <label className="grid gap-1">
                        <span className="text-[8px] font-mono uppercase tracking-widest text-neutral-500">Avertissement Content ID / restriction</span>
                        <textarea
                            value={contentIdWarning}
                            onChange={(e) => setContentIdWarning(e.target.value)}
                            rows={2}
                            className="resize-none rounded-sm border border-neutral-800 bg-neutral-900 px-2 py-2 text-[10px] text-neutral-200 outline-none focus:border-emerald-500/50"
                            placeholder="Ex: claims possibles, attribution obligatoire, licence a renouveler..."
                        />
                    </label>

                    <div className="grid gap-2 rounded-sm border border-neutral-800 bg-neutral-900/50 p-2">
                        <label className="flex items-start gap-2 text-[10px] leading-relaxed text-neutral-300">
                            <input
                                type="checkbox"
                                checked={socialUse}
                                onChange={(e) => setSocialUse(e.target.checked)}
                                className="mt-0.5 accent-emerald-500"
                            />
                            La licence autorise l usage social / publication reseaux pour ce projet.
                        </label>
                        <label className="flex items-start gap-2 text-[10px] leading-relaxed text-neutral-300">
                            <input
                                type="checkbox"
                                checked={commercialUse}
                                onChange={(e) => setCommercialUse(e.target.checked)}
                                className="mt-0.5 accent-emerald-500"
                            />
                            La licence autorise un usage commercial si le projet est monetise.
                        </label>
                    </div>
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

const AiMusicView = () => (
    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="rounded-sm border border-fuchsia-500/20 bg-fuchsia-500/5 p-3">
            <div className="flex items-center gap-2 text-fuchsia-200">
                <Sparkles size={13} />
                <p className="text-[10px] font-mono uppercase tracking-widest">Generation IA musique</p>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-neutral-400">
                Le client ne generera pas de musique directement. Le flux cible est un callable Firebase qui valide auth,
                quota, politique de prompt, appelle Mubert/Beatoven/Stable Audio cote serveur, puis stocke audio et licence.
            </p>
        </div>

        <div className="mt-3 grid gap-2 rounded-sm border border-neutral-800 bg-neutral-950 p-3">
            {[
                'Prompt, mood, genre, BPM et duree envoyes au callable serveur',
                'Cles fournisseur stockees dans Secret Manager',
                'Audio genere persiste dans Firebase Storage',
                'Licence et manifeste importes dans la timeline avec la piste',
            ].map(item => (
                <div key={item} className="flex items-start gap-2 text-[10px] leading-relaxed text-neutral-400">
                    <ShieldCheck size={11} className="mt-0.5 shrink-0 text-emerald-300" />
                    <span>{item}</span>
                </div>
            ))}
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-sm border border-amber-500/20 bg-amber-500/5 p-3">
            <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-300" />
            <p className="text-[10px] leading-relaxed text-amber-100/80">
                Suno/Udio restent en import manuel experimental. Ne pas auto-publier sans revue juridique.
            </p>
        </div>
    </div>
);

export default MusicLibrary;
