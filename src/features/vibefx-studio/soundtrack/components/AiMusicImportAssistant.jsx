import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, UploadCloud } from 'lucide-react';
import { AI_AUDIO_PROVIDERS } from '../services/soundtrackDownloads';
import {
    AITRA_FREE_TRACKS_URL,
    PIXABAY_CONTENT_LICENSE_URL,
    SOUNDTRACK_PROVIDERS,
    getSoundtrackProviderQuickTags,
} from '../data/soundtrackDefaults';

const PIXABAY_AI_MANIFEST_URL = '/music/pixabay-ai/vibefx-pixabay-ai-manifest.json';
const PIXABAY_CLIENT_TIMEOUT_BASE_MS = 70000;
const PIXABAY_CLIENT_TIMEOUT_PER_EXTRA_TRACK_MS = 12000;
const PIXABAY_CLIENT_TIMEOUT_MAX_MS = 125000;

const FREE_AI_SOURCE_LINKS = [
    {
        id: 'aitra-free',
        label: 'Aitra Free',
        href: AITRA_FREE_TRACKS_URL,
        badge: 'full gratuit',
        note: 'Selection automatique depuis le catalogue gratuit.',
    },
    {
        id: 'pixabay',
        label: 'Pixabay Music',
        href: 'https://pixabay.com/music/search/ai-generated/',
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
    license: provider.id === 'pixabay' ? 'Pixabay Content License' : provider.licenseLabel || `${provider.label} generated audio license`,
    licenseUrl: provider.id === 'pixabay' ? PIXABAY_CONTENT_LICENSE_URL : licenseUrl || provider.licenseUrl || provider.officialDocsUrl || '',
    attribution: '',
    rightsStatus: provider.id === 'pixabay' ? 'needs-review' : 'ai-generated',
    socialUse: true,
    commercialUse,
    category: selectedTag?.label || selectedTag?.id || 'AI music',
    genre: selectedTag?.label || '',
    mood: selectedTag?.label || '',
    tags: ['ai-generated', provider.id, selectedTag?.id].filter(Boolean),
    licenseSnapshotVersion: `${provider.id}-manual-current`,
    contentIdWarning: provider.id === 'pixabay'
        ? 'Pixabay signale des droits tiers possibles et des risques Content ID. Conserver la page source et verifier avant publication.'
        : provider.id === 'aitra-free'
        ? 'Aitra Free interdit la revente du son brut, la fausse attribution, la distribution streaming comme morceau et Content ID.'
        : `Musique IA ${provider.label}: verifier les conditions du provider avant publication si necessaire.`,
    importEvent: `Import IA termine: ${provider.label}.`,
});

const pixabayClientTimeoutMs = (count) => Math.min(
    PIXABAY_CLIENT_TIMEOUT_MAX_MS,
    PIXABAY_CLIENT_TIMEOUT_BASE_MS + Math.max(0, count - 1) * PIXABAY_CLIENT_TIMEOUT_PER_EXTRA_TRACK_MS,
);

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
    const importCounterRef = useRef(0);
    const availableProviders = useMemo(() => {
        const definitions = providerDefinitions || search?.providerDefinitions || SOUNDTRACK_PROVIDERS;
        const providerMap = new Map();
        definitions.forEach((item) => {
            if (AI_AUDIO_PROVIDERS.includes(item.id) || item.id === 'pixabay') providerMap.set(item.id, item);
        });
        SOUNDTRACK_PROVIDERS.forEach((item) => {
            if ((AI_AUDIO_PROVIDERS.includes(item.id) || item.id === 'pixabay') && !providerMap.has(item.id)) providerMap.set(item.id, item);
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
    const [batchCount, setBatchCount] = useState(1);
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

    if (!provider || (!AI_AUDIO_PROVIDERS.includes(provider.id) && provider.id !== 'pixabay')) return null;

    const generateAndImport = async () => {
        if (provider.id === 'pixabay') {
            const count = Math.max(1, Math.min(5, Number(batchCount) || 1));
            setStatus('loading');
            setMessage(`Recherche Pixabay ${selectedTag?.label || 'AI generated'}...`);
            const controller = new AbortController();
            const timeoutId = window.setTimeout(() => controller.abort(), pixabayClientTimeoutMs(count));
            try {
                const response = await fetch('/api/music/pixabay-local-import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller.signal,
                    body: JSON.stringify({
                        query: selectedTag?.query || 'ai-generated',
                        category: selectedTag?.id || 'ai-generated',
                        limit: count,
                        pages: count > 4 ? 2 : 1,
                    }),
                });
                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(payload.error || 'Import local Pixabay impossible.');
                }
                const manifestTracks = Array.isArray(payload?.tracks)
                    ? payload.tracks.filter((track) => track.importStatus === 'importable' && (track.downloadUrl || track.previewUrl))
                    : [];
                if (!manifestTracks.length) throw new Error('Aucune piste Pixabay importable trouvee pour ce theme.');
                const imported = [];
                for (const track of manifestTracks.slice(0, count)) {
                    const metadata = {
                        ...buildMetadata({
                            provider,
                            selectedTag,
                            proofUrl: track.sourceUrl || proofUrl,
                            licenseUrl: track.licenseUrl || PIXABAY_CONTENT_LICENSE_URL,
                            commercialUse: true,
                        }),
                        ...track,
                        id: `pixabay-ai-${track.id}`,
                        provider: 'pixabay',
                        sourceProvider: 'pixabay',
                        sourceName: 'Pixabay Music',
                        sourceUrl: track.sourceUrl || track.sourcePageUrl || provider.officialDocsUrl,
                        sourcePageUrl: track.sourcePageUrl || track.sourceUrl || provider.officialDocsUrl,
                        license: 'Pixabay Content License',
                        licenseUrl: track.licenseUrl || PIXABAY_CONTENT_LICENSE_URL,
                        rightsStatus: 'needs-review',
                        socialUse: true,
                        commercialUse: true,
                        tags: Array.from(new Set([...(track.tags || []), 'pixabay', 'ai-generated'])),
                    };
                    const importedTrack = projectLibrary.capability?.ready
                        ? await projectLibrary.importTrackToProject(metadata)
                        : await localLibrary.importRemoteTrack({ audioUrl: track.downloadUrl || track.previewUrl, metadata });
                    if (importedTrack) imported.push(importedTrack);
                }
                if (!imported.length) throw new Error('Import Pixabay refuse par la bibliotheque.');
                onSelectTrack?.(imported[0]);
                onImportComplete?.(imported[0]);
                setStatus('ready');
                setMessage(`${imported.length} piste${imported.length > 1 ? 's' : ''} Pixabay ajoutee${imported.length > 1 ? 's' : ''}.`);
            } catch (error) {
                setStatus('error');
                setMessage(error?.name === 'AbortError'
                    ? 'Pixabay met trop longtemps a repondre. Relance le theme ou choisis un autre tag.'
                    : error.message || 'Import Pixabay impossible.');
            } finally {
                window.clearTimeout(timeoutId);
            }
            return;
        }
        if (provider.id !== 'aitra-free') {
            setStatus('error');
            setMessage('Generation gratuite automatique disponible sur Aitra Free.');
            return;
        }
        const count = Math.max(1, Math.min(5, Number(batchCount) || 1));
        setStatus('loading');
        setMessage(`Recherche Aitra ${selectedTag?.label || 'theme'}...`);
        try {
            const imported = [];
            const excludeTrackIds = [];
            for (let index = 0; index < count; index += 1) {
                importCounterRef.current += 1;
                const draftTrack = {
                    ...buildMetadata({
                        provider,
                        selectedTag,
                        proofUrl,
                        licenseUrl,
                        commercialUse: true,
                    }),
                    id: buildManualTrackId(provider.id, `${selectedTag?.id || 'theme'}-${importCounterRef.current}-${index}`),
                    title: `Aitra Free - ${selectedTag?.label || 'selection'}`,
                    downloadUrl: AITRA_FREE_TRACKS_URL,
                    previewUrl: AITRA_FREE_TRACKS_URL,
                    audioUrl: AITRA_FREE_TRACKS_URL,
                    themeId: selectedTag?.id || '',
                    query: selectedTag?.query || selectedTag?.label || '',
                    excludeTrackIds: [...excludeTrackIds],
                    importStatus: 'importable',
                };
                const track = await localLibrary.importRemoteTrack({ audioUrl: AITRA_FREE_TRACKS_URL, metadata: draftTrack });
                if (track) {
                    imported.push(track);
                    if (track.providerTrackId) excludeTrackIds.push(track.providerTrackId);
                    await new Promise((resolve) => window.setTimeout(resolve, 650));
                }
            }
            if (!imported.length) throw new Error('Aucune piste Aitra Free importee.');
            onSelectTrack?.(imported[0]);
            onImportComplete?.(imported[0]);
            setStatus('ready');
            setMessage(`${imported.length} piste${imported.length > 1 ? 's' : ''} Aitra ajoutee${imported.length > 1 ? 's' : ''}.`);
        } catch (error) {
            setStatus('error');
            setMessage(error.message || 'Generation/import Aitra impossible.');
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
                    <article
                        key={source.id}
                        data-active={provider.id === source.id ? 'true' : 'false'}
                        role="button"
                        tabIndex={0}
                        aria-pressed={provider.id === source.id}
                        onClick={() => {
                            setManualProviderId(source.id);
                            setSelectedTagId(source.id === 'pixabay' ? 'ai-generated' : selectedTagId);
                            setStatus('idle');
                            setMessage('');
                        }}
                        onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return;
                            event.preventDefault();
                            setManualProviderId(source.id);
                            setSelectedTagId(source.id === 'pixabay' ? 'ai-generated' : selectedTagId);
                            setStatus('idle');
                            setMessage('');
                        }}
                    >
                        <div>
                            <strong>{source.label}</strong>
                            <span>{source.badge}</span>
                        </div>
                        <p>{source.note}</p>
                        <nav aria-label={`Liens ${source.label}`}>
                            <a
                                href={source.href}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(event) => event.stopPropagation()}
                                onKeyDown={(event) => event.stopPropagation()}
                            >
                                Ouvrir
                                <ExternalLink size={11} />
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
                    <span>Nombre</span>
                    <input
                        type="number"
                        min={1}
                        max={5}
                        value={batchCount}
                        onChange={(event) => setBatchCount(event.target.value)}
                        aria-label="Nombre de pistes a importer"
                    />
                </label>
                <button type="button" onClick={generateAndImport} disabled={status === 'loading'}>
                    {status === 'loading' ? <Loader2 size={13} className="soundtrack-spin" /> : <UploadCloud size={13} />}
                    {provider.id === 'pixabay' ? 'Chercher / importer' : 'Generer / importer'}
                </button>
            </div>
            <details className="soundtrack-ai-manual-import">
                <summary>Import manuel avance</summary>
                <div className="soundtrack-pixabay-assistant__flow soundtrack-ai-import-assistant__flow">
                    <a href={provider.officialDocsUrl || '#'} target="_blank" rel="noreferrer">
                        <ExternalLink size={13} />
                        Docs provider
                    </a>
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
