import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, UploadCloud } from 'lucide-react';
import { AI_AUDIO_PROVIDERS } from '../services/soundtrackDownloads';
import {
    AITRA_FREE_TERMS_URL,
    AITRA_FREE_TRACKS_URL,
    SOUNDTRACK_PROVIDERS,
    getSoundtrackProviderQuickTags,
} from '../data/soundtrackDefaults';

const FREE_AI_SOURCE_LINKS = [
    {
        id: 'aitra-free',
        label: 'Aitra Free',
        href: AITRA_FREE_TRACKS_URL,
        terms: AITRA_FREE_TERMS_URL,
        badge: 'full gratuit',
        note: 'Page piste, ID ou MP3 officiel acceptes.',
    },
    {
        id: 'pixabay',
        label: 'Pixabay Music',
        href: 'https://pixabay.com/music/search/ai-generated/',
        terms: 'https://pixabay.com/service/license-summary/',
        badge: 'gratuit manuel',
        note: 'Telechargement officiel conseille, pas de scraping massif.',
    },
];

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

const extractAitraTrackId = (value = '') => {
    const trimmed = String(value || '').trim();
    if (/^\d{1,8}$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/^https:\/\/aitrafree\.com\/(?:en\/|ja\/)?tracks\/(\d+)/i);
    return match?.[1] || '';
};

const normalizeImportUrlDraft = (providerId, value = '') => {
    const cleaned = cleanHttpsUrl(value);
    if (cleaned) return cleaned;
    const aitraTrackId = providerId === 'aitra-free' ? extractAitraTrackId(value) : '';
    return aitraTrackId ? `https://aitrafree.com/en/tracks/${aitraTrackId}` : '';
};

const buildMetadata = ({ file, provider, selectedTag, proofUrl, licenseUrl, commercialUse = true }) => ({
    title: file?.name?.replace(/\.[a-z0-9]+$/i, '') || '',
    provider: provider.id,
    sourceProvider: provider.id,
    sourceName: provider.label,
    sourceUrl: proofUrl || provider.officialDocsUrl || '',
    sourcePageUrl: proofUrl || provider.officialDocsUrl || '',
    license: provider.licenseLabel || `${provider.label} generated audio license`,
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
    contentIdWarning: provider.id === 'aitra-free'
        ? 'Aitra Free interdit la revente du son brut, la fausse attribution, la distribution streaming comme morceau et Content ID.'
        : `Musique IA ${provider.label}: verifier les conditions du provider avant publication si necessaire.`,
    importEvent: `Import IA termine: ${provider.label}.`,
});

export default function AiMusicImportAssistant({
    search = null,
    localLibrary,
    projectLibrary,
    onSelectTrack,
    onImportComplete,
    providerDefinitions,
    defaultProviderId = 'aitra-free',
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
    const audioUrl = normalizeImportUrlDraft(provider?.id, audioUrlDraft);
    const targetLabel = projectLibrary.capability?.ready ? 'Projet Firebase' : 'Bibliotheque locale';

    if (!provider || !AI_AUDIO_PROVIDERS.includes(provider.id)) return null;

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
            const aitraTrackId = provider.id === 'aitra-free' ? extractAitraTrackId(audioUrlDraft || audioUrl) : '';
            const draftTrack = {
                ...buildMetadata({
                    provider,
                    selectedTag,
                    proofUrl,
                    licenseUrl,
                    commercialUse: true,
                }),
                id: buildManualTrackId(provider.id, audioUrl),
                title: aitraTrackId ? `Aitra Free track ${aitraTrackId}` : `${provider.label} import`,
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
                    <p>Import banque IA gratuite</p>
                    <strong>{provider.label}</strong>
                </div>
                <span>{targetLabel}</span>
            </div>
            <div className="soundtrack-ai-source-grid" aria-label="Sources IA gratuites">
                {FREE_AI_SOURCE_LINKS.map((source) => (
                    <article key={source.id} data-active={provider.id === source.id ? 'true' : 'false'}>
                        <div>
                            <strong>{source.label}</strong>
                            <span>{source.badge}</span>
                        </div>
                        <p>{source.note}</p>
                        <nav aria-label={`Liens ${source.label}`}>
                            <a href={source.href} target="_blank" rel="noreferrer">
                                Ouvrir
                                <ExternalLink size={11} />
                            </a>
                            <a href={source.terms} target="_blank" rel="noreferrer">
                                Termes
                            </a>
                        </nav>
                    </article>
                ))}
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
                    <span>{provider.id === 'aitra-free' ? 'Page Aitra / ID / URL audio' : 'URL audio directe'}</span>
                    <input
                        value={audioUrlDraft}
                        onChange={(event) => setAudioUrlDraft(event.target.value)}
                        placeholder={provider.id === 'aitra-free' ? 'https://aitrafree.com/en/tracks/103 ou 103' : 'https://.../audio.mp3'}
                        aria-label="URL audio directe IA"
                    />
                </label>
                <button type="button" onClick={importUrl} disabled={status === 'loading' || !audioUrl}>
                    {status === 'loading' ? <Loader2 size={13} className="soundtrack-spin" /> : <UploadCloud size={13} />}
                    {provider.id === 'aitra-free' ? 'Importer Aitra' : 'Importer URL'}
                </button>
                <button type="button" onClick={() => inputRef.current?.click()} disabled={status === 'loading'}>
                    {status === 'loading' ? <Loader2 size={13} className="soundtrack-spin" /> : <UploadCloud size={13} />}
                    Importer fichier
                </button>
            </div>
            <details className="soundtrack-ai-manual-import" open>
                <summary>Infos source et licence</summary>
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
                        <span>Info provider optionnelle</span>
                        <input
                            value={licenseUrlDraft}
                            onChange={(event) => setLicenseUrlDraft(event.target.value)}
                            placeholder={provider.licenseUrl || provider.officialDocsUrl || 'https://...'}
                            aria-label="URL information fournisseur IA"
                        />
                    </label>
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
                <span>{provider.id === 'aitra-free' ? 'Aitra Free' : 'Provider IA'}</span>
                <span>Import auto bibliotheque</span>
                <span>{selectedTag?.label || 'prompt libre'}</span>
                {status === 'ready' && <span data-state="ready"><CheckCircle2 size={12} /> importe</span>}
                {message && <small data-state={status}>{message}</small>}
            </div>
        </section>
    );
}
