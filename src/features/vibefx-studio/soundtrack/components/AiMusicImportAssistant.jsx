import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, Music2, UploadCloud } from 'lucide-react';
import { AI_AUDIO_PROVIDERS } from '../services/soundtrackDownloads';
import { SOUNDTRACK_PROVIDERS, getSoundtrackProviderQuickTags, getStarterSoundtrackTracks } from '../data/soundtrackDefaults';

const cleanHttpsUrl = (value = '') => {
    const trimmed = String(value || '').trim();
    try {
        const url = new URL(trimmed);
        return url.protocol === 'https:' ? url.toString() : '';
    } catch {
        return '';
    }
};

const buildManualTrackId = (providerId = 'ai', audioUrl = '') => (
    `${providerId}-${String(audioUrl || 'manual-audio')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 72) || 'manual-audio'}`
);

const buildMetadata = ({ file, provider, selectedTag, proofUrl, licenseUrl, commercialUse = true }) => ({
    title: file?.name?.replace(/\.[a-z0-9]+$/i, '') || '',
    provider: provider.id,
    sourceProvider: provider.id,
    sourceName: provider.label,
    sourceUrl: proofUrl || provider.officialDocsUrl || '',
    sourcePageUrl: proofUrl || provider.officialDocsUrl || '',
    license: `${provider.label} generated audio license`,
    licenseUrl: licenseUrl || provider.licenseUrl || provider.officialDocsUrl || '',
    attribution: '',
    rightsStatus: 'ai-generated',
    socialUse: true,
    commercialUse,
    category: selectedTag?.label || selectedTag?.id || 'AI music',
    genre: selectedTag?.label || '',
    mood: selectedTag?.label || '',
    tags: ['ai-generated', provider.id, selectedTag?.id].filter(Boolean),
    licenseSnapshotVersion: `${provider.id}-manual-current`,
    contentIdWarning: `Musique IA ${provider.label}: verifier les conditions du provider avant publication si necessaire.`,
    importEvent: `Import IA termine: ${provider.label}.`,
});

const THEME_KEYWORDS = {
    cinematic: ['cinematic', 'ghost-shell', 'blade-runner', 'system-failure'],
    'trailer-epic': ['epic', 'exosuit', 'overdrive', 'system-failure'],
    'action-trailer': ['epic', 'beats', 'overdrive', 'black-tar'],
    'corporate-brand': ['electronic', 'future-city', 'chrome'],
    'fashion-club': ['electronic', 'neon-city', 'cyberpunk'],
    'short-commercial': ['electronic', 'virtual-reality', 'the-grid'],
    electronic: ['electronic', 'chrome', 'cyberpunk', 'future-city'],
    house: ['electronic', 'neon-city', 'akira'],
    'hip-hop': ['beats', 'hackers', 'the-grid'],
    jazz: ['chill', 'tokyo-rain', 'empty-streets'],
    funk: ['beats', 'the-grid', 'black-tar'],
    rock: ['rock', 'overdrive'],
    lofi: ['chill', 'lofi', 'night-drive', 'tokyo-rain'],
    'ambient-lounge': ['ambient', 'andromeda', 'replicant', 'dark-matter'],
    'impact-whoosh': ['cinematic', 'system-failure', 'exosuit'],
    'riser-transition': ['cinematic', 'system-failure', 'virtual-reality'],
    'intro-opener': ['epic', 'exosuit', 'future-city'],
    'podcast-talk-bed': ['chill', 'empty-streets', 'night-drive'],
    'luxury-premium': ['chill', 'blade-runner', 'andromeda'],
    'tech-futuristic': ['electronic', 'future-city', 'neuromancer', 'virtual-reality'],
    'emotional-inspiring': ['ambient', 'andromeda', 'replicant'],
};

const normalizeToken = (value = '') => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

const pickStarterTrackForTheme = (selectedTag = {}) => {
    const candidates = getStarterSoundtrackTracks();
    const keywords = [
        ...(THEME_KEYWORDS[selectedTag.id] || []),
        ...String(selectedTag.query || selectedTag.label || selectedTag.id || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
    ];
    const scored = candidates.map((track, index) => {
        const haystack = normalizeToken(`${track.id} ${track.title} ${track.genre} ${track.tags}`);
        const rawScore = keywords.reduce((total, keyword) => total + (haystack.includes(normalizeToken(keyword)) ? 1 : 0), 0);
        const duration = Number(track.duration) || 0;
        const durationPenalty = duration > 600 ? 3 : duration > 300 ? 1 : 0;
        return { track, score: rawScore - durationPenalty, duration, index };
    }).sort((a, b) => b.score - a.score || a.duration - b.duration || a.index - b.index);
    return scored[0]?.track || candidates[0] || null;
};

const buildFallbackTrack = (starterTrack, selectedTag, provider) => ({
    ...starterTrack,
    id: `theme-${selectedTag?.id || 'music'}-${starterTrack.id}`,
    sourceTrackId: starterTrack.id,
    title: `${starterTrack.title} (${selectedTag?.label || 'theme'})`,
    provider: starterTrack.provider || 'white-bat-audio',
    sourceProvider: starterTrack.sourceProvider || starterTrack.provider || 'white-bat-audio',
    sourceName: starterTrack.sourceName || 'White Bat Audio',
    sourceUrl: starterTrack.sourceUrl || 'https://whitebataudio.com/',
    sourcePageUrl: starterTrack.sourcePageUrl || starterTrack.sourceUrl || 'https://whitebataudio.com/',
    downloadUrl: starterTrack.downloadUrl || starterTrack.url || starterTrack.previewUrl,
    previewUrl: starterTrack.previewUrl || starterTrack.url || starterTrack.downloadUrl,
    audioUrl: starterTrack.audioUrl || starterTrack.url || starterTrack.previewUrl,
    category: selectedTag?.label || starterTrack.genre || 'Theme music',
    mood: selectedTag?.label || starterTrack.mood || '',
    tags: Array.from(new Set([
        ...(Array.isArray(starterTrack.tags) ? starterTrack.tags : String(starterTrack.tags || '').split(/\s+/)),
        'theme-import',
        selectedTag?.id,
        provider?.id ? `${provider.id}-fallback` : '',
    ].filter(Boolean))),
    rightsStatus: starterTrack.rightsStatus || 'credit-required',
    commercialUse: starterTrack.commercialUse === true,
    socialUse: starterTrack.socialUse !== false,
    importStatus: 'importable',
    contentIdWarning: starterTrack.contentIdWarning || 'Piste locale incluse: verifier attribution/licence avant publication sociale.',
    importEvent: `Theme ${selectedTag?.label || 'music'} importe depuis la bibliotheque locale.`,
});

export default function AiMusicImportAssistant({
    search = null,
    localLibrary,
    projectLibrary,
    onSelectTrack,
    onImportComplete,
    providerDefinitions,
    defaultProviderId = 'minimax-music',
    compact = false,
}) {
    const inputRef = useRef(null);
    const availableProviders = useMemo(() => {
        const definitions = providerDefinitions || search?.providerDefinitions || SOUNDTRACK_PROVIDERS;
        const providerMap = new Map();
        definitions.forEach((item) => {
            if (AI_AUDIO_PROVIDERS.includes(item.id)) providerMap.set(item.id, item);
        });
        SOUNDTRACK_PROVIDERS.forEach((item) => {
            if (AI_AUDIO_PROVIDERS.includes(item.id) && !providerMap.has(item.id)) providerMap.set(item.id, item);
        });
        return Array.from(providerMap.values());
    }, [providerDefinitions, search?.providerDefinitions]);
    const initialProviderId = search?.provider && AI_AUDIO_PROVIDERS.includes(search.provider)
        ? search.provider
        : defaultProviderId;
    const [manualProviderId, setManualProviderId] = useState(initialProviderId);
    const [audioUrlDraft, setAudioUrlDraft] = useState('');
    const [proofUrlDraft, setProofUrlDraft] = useState('');
    const [licenseUrlDraft, setLicenseUrlDraft] = useState('');
    const [durationSeconds, setDurationSeconds] = useState(20);
    const [instrumental, setInstrumental] = useState(true);
    const [selectedTagId, setSelectedTagId] = useState(search?.category || '');
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');
    const activeProviderId = search?.provider && AI_AUDIO_PROVIDERS.includes(search.provider)
        ? search.provider
        : manualProviderId;
    const provider = useMemo(() => (
        availableProviders.find((item) => item.id === activeProviderId)
    ), [activeProviderId, availableProviders]);
    const quickTags = getSoundtrackProviderQuickTags(activeProviderId);
    const selectedTag = quickTags.find((tag) => tag.id === selectedTagId)
        || quickTags.find((tag) => tag.id === search?.category)
        || quickTags.find((tag) => tag.query === search?.query)
        || quickTags[0];
    const proofUrl = cleanHttpsUrl(proofUrlDraft) || provider?.officialDocsUrl || '';
    const licenseUrl = cleanHttpsUrl(licenseUrlDraft) || provider?.licenseUrl || provider?.officialDocsUrl || '';
    const audioUrl = cleanHttpsUrl(audioUrlDraft);
    const targetLabel = projectLibrary.capability?.ready ? 'Projet Firebase' : 'Bibliotheque locale';

    if (!provider || !AI_AUDIO_PROVIDERS.includes(provider.id)) return null;

    const importGeneratedTrack = async (track) => {
        const rightsStatus = track.rightsStatus || 'ai-generated';
        const generatedByAi = rightsStatus === 'ai-generated' || AI_AUDIO_PROVIDERS.includes(track.provider || provider.id);
        const normalizedTrack = {
            ...track,
            provider: track.provider || provider.id,
            sourceProvider: track.sourceProvider || provider.id,
            sourceName: track.sourceName || provider.label,
            sourceUrl: track.sourceUrl || provider.officialDocsUrl || '',
            sourcePageUrl: track.sourcePageUrl || track.sourceUrl || provider.officialDocsUrl || '',
            license: track.license || `${provider.label} generated audio`,
            licenseUrl: track.licenseUrl || provider.licenseUrl || provider.officialDocsUrl || '',
            rightsStatus,
            socialUse: true,
            commercialUse: true,
            category: selectedTag?.label || selectedTag?.id || 'AI music',
            tags: Array.from(new Set([
                ...(Array.isArray(track.tags) ? track.tags : []),
                generatedByAi ? 'ai-generated' : '',
                provider.id,
                selectedTag?.id,
            ].filter(Boolean))),
            importStatus: track.importStatus || 'importable',
        };
        return projectLibrary.capability?.ready
            ? projectLibrary.importTrackToProject(normalizedTrack)
            : localLibrary.downloadTrackLocally(normalizedTrack);
    };

    const importThemeFallback = async (reason = '') => {
        const starterTrack = pickStarterTrackForTheme(selectedTag);
        if (!starterTrack) throw new Error(reason || 'Aucune piste locale disponible pour ce theme.');
        const fallbackTrack = buildFallbackTrack(starterTrack, selectedTag, provider);
        const imported = await importGeneratedTrack(fallbackTrack);
        if (!imported) throw new Error(reason || 'Import theme impossible.');
        onSelectTrack?.(imported);
        onImportComplete?.(imported);
        setStatus('ready');
        setMessage(`${selectedTag.label} importe depuis les musiques incluses. ${reason ? 'Provider IA non configure.' : ''}`.trim());
    };

    const generateAndImport = async () => {
        if (!selectedTag) {
            setStatus('error');
            setMessage('Choisis un theme musical.');
            return;
        }
        setStatus('loading');
        setMessage(`Generation ${selectedTag.label} en cours...`);
        try {
            const response = await fetch('/api/music/ai-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: provider.id,
                    prompt: selectedTag.query,
                    category: selectedTag.id,
                    durationSeconds: Number(durationSeconds) || 20,
                    instrumental,
                }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload.error || `${provider.label} n'est pas connecte pour generer.`);
            }
            const generatedTrack = (payload.tracks || []).find((track) => (
                track.importStatus === 'importable' || track.downloadUrl || track.previewUrl || track.audioUrl
            ));
            if (!generatedTrack) throw new Error('Aucune musique importable retournee par le provider.');
            const imported = await importGeneratedTrack(generatedTrack);
            if (!imported) throw new Error('Generation recue, mais import bibliotheque impossible.');
            onSelectTrack?.(imported);
            onImportComplete?.(imported);
            setStatus('ready');
            setMessage(`${selectedTag.label} ajoutee a la bibliotheque.`);
        } catch (error) {
            try {
                await importThemeFallback(error.message || 'Provider IA indisponible.');
            } catch (fallbackError) {
                setStatus('error');
                setMessage(fallbackError.message || error.message || 'Generation/import impossible.');
            }
        }
    };

    const importFiles = async (event) => {
        const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('audio/'));
        event.target.value = '';
        if (!files.length) return;
        setStatus('loading');
        setMessage('');
        try {
            const imported = [];
            if (projectLibrary.capability?.ready) {
                for (const file of files) {
                    const track = await projectLibrary.importFileToProject(file, buildMetadata({
                        file,
                        provider,
                        selectedTag,
                        proofUrl,
                        licenseUrl,
                        commercialUse: true,
                    }));
                    if (track) imported.push(track);
                }
            } else {
                imported.push(...(await localLibrary.importFiles(files, buildMetadata({
                    file: files[0],
                    provider,
                    selectedTag,
                    proofUrl,
                    licenseUrl,
                    commercialUse: true,
                })) || []));
            }
            if (!imported.length) throw new Error('Aucun fichier audio IA importe.');
            onSelectTrack?.(imported[0]);
            onImportComplete?.(imported[0]);
            setStatus('ready');
            setMessage(`${imported.length} generation${imported.length > 1 ? 's' : ''} IA ajoutee${imported.length > 1 ? 's' : ''}.`);
        } catch (error) {
            setStatus('error');
            setMessage(error.message || 'Import IA impossible.');
        }
    };

    const importUrl = async () => {
        if (!audioUrl) {
            setStatus('error');
            setMessage('URL audio HTTPS requise.');
            return;
        }
        setStatus('loading');
        setMessage('');
        try {
            const draftTrack = {
                ...buildMetadata({
                    provider,
                    selectedTag,
                    proofUrl,
                    licenseUrl,
                    commercialUse: true,
                }),
                id: buildManualTrackId(provider.id, audioUrl),
                title: `${provider.label} import`,
                downloadUrl: audioUrl,
                previewUrl: audioUrl,
                audioUrl,
                importStatus: 'importable',
            };
            const imported = projectLibrary.capability?.ready
                ? await projectLibrary.importTrackToProject(draftTrack)
                : await localLibrary.importRemoteTrack({ audioUrl, metadata: draftTrack });
            if (!imported) throw new Error('Import URL IA refuse.');
            onSelectTrack?.(imported);
            onImportComplete?.(imported);
            setStatus('ready');
            setMessage('URL audio IA importee dans la bibliotheque Vibe_fx.');
        } catch (error) {
            setStatus('error');
            setMessage(error.message || 'Import URL IA impossible.');
        }
    };

    return (
        <section
            className={`soundtrack-pixabay-assistant soundtrack-ai-import-assistant${compact ? ' soundtrack-ai-import-assistant--compact' : ''}`}
            data-state={status}
            data-testid="ai-music-import-assistant"
            aria-label="Assistant import generation IA"
        >
            <div className="soundtrack-pixabay-assistant__head">
                <div>
                    <p>Generation par theme</p>
                    <strong>{provider.label}</strong>
                </div>
                <span>{targetLabel}</span>
            </div>
            <div className="soundtrack-ai-theme-picker" aria-label="Themes musique IA">
                {quickTags.slice(0, 12).map((tag) => (
                    <button
                        key={tag.id}
                        type="button"
                        data-active={selectedTag?.id === tag.id ? 'true' : 'false'}
                        onClick={() => setSelectedTagId(tag.id)}
                    >
                        {tag.label}
                    </button>
                ))}
            </div>
            <div className="soundtrack-ai-generate-panel">
                {!search?.provider && (
                    <label>
                        <span>Provider</span>
                        <select
                            value={manualProviderId}
                            onChange={(event) => setManualProviderId(event.target.value)}
                            aria-label="Provider musique IA"
                        >
                            {availableProviders.map((item) => (
                                <option key={item.id} value={item.id}>{item.label}</option>
                            ))}
                        </select>
                    </label>
                )}
                <label>
                    <span>Duree</span>
                    <input
                        type="number"
                        min={3}
                        max={provider.maxDurationSeconds || 300}
                        value={durationSeconds}
                        onChange={(event) => setDurationSeconds(event.target.value)}
                        aria-label="Duree musique IA"
                    />
                </label>
                <label className="soundtrack-ai-generate-panel__toggle">
                    <input
                        type="checkbox"
                        checked={instrumental}
                        onChange={(event) => setInstrumental(event.target.checked)}
                    />
                    <span>Instrumental</span>
                </label>
                <button type="button" onClick={generateAndImport} disabled={status === 'loading'}>
                    {status === 'loading' ? <Loader2 size={13} className="soundtrack-spin" /> : <Music2 size={13} />}
                    Generer et importer
                </button>
            </div>
            <details className="soundtrack-ai-manual-import">
                <summary>Option avancee: fichier ou URL deja recuperee</summary>
                <div className="soundtrack-pixabay-assistant__flow soundtrack-ai-import-assistant__flow">
                    <a href={provider.officialDocsUrl || '#'} target="_blank" rel="noreferrer">
                        <ExternalLink size={13} />
                        Docs provider
                    </a>
                    <label>
                        <span>Page provider optionnelle</span>
                        <input
                            value={proofUrlDraft}
                            onChange={(event) => setProofUrlDraft(event.target.value)}
                            placeholder={provider.officialDocsUrl || 'https://...'}
                            aria-label="URL source optionnelle IA"
                        />
                    </label>
                    <label>
                        <span>URL audio directe</span>
                        <input
                            value={audioUrlDraft}
                            onChange={(event) => setAudioUrlDraft(event.target.value)}
                            placeholder="https://.../audio.mp3"
                            aria-label="URL audio directe IA"
                        />
                    </label>
                    <label>
                        <span>Info provider optionnelle</span>
                        <input
                            value={licenseUrlDraft}
                            onChange={(event) => setLicenseUrlDraft(event.target.value)}
                            placeholder={provider.licenseUrl || provider.officialDocsUrl || 'https://...'}
                            aria-label="URL information fournisseur IA"
                        />
                    </label>
                    <button type="button" onClick={importUrl} disabled={status === 'loading' || !audioUrl}>
                        {status === 'loading' ? <Loader2 size={13} className="soundtrack-spin" /> : <UploadCloud size={13} />}
                        Importer URL
                    </button>
                    <button type="button" onClick={() => inputRef.current?.click()} disabled={status === 'loading'}>
                        {status === 'loading' ? <Loader2 size={13} className="soundtrack-spin" /> : <UploadCloud size={13} />}
                        Importer fichier
                    </button>
                </div>
            </details>
            <input
                ref={inputRef}
                type="file"
                accept="audio/*"
                multiple
                className="soundtrack-hidden-input"
                data-testid="ai-music-assisted-file-input"
                onChange={importFiles}
            />
            <div className="soundtrack-pixabay-assistant__meta">
                <span>Provider IA</span>
                <span>Import auto bibliotheque</span>
                <span>{selectedTag?.label || 'prompt libre'}</span>
                {status === 'ready' && <span data-state="ready"><CheckCircle2 size={12} /> importe</span>}
                {message && <small data-state={status}>{message}</small>}
            </div>
        </section>
    );
}
