import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, UploadCloud } from 'lucide-react';
import {
    PIXABAY_CONTENT_LICENSE_URL,
    PIXABAY_MUSIC_URL,
    buildPixabayMusicSearchUrl,
    getSoundtrackProviderQuickTags,
} from '../data/soundtrackDefaults';

const cleanSourceUrl = (value = '') => {
    const trimmed = String(value || '').trim();
    return trimmed.startsWith('https://pixabay.com/music/') ? trimmed : '';
};

const buildMetadata = ({ file, selectedTag, sourceUrl }) => ({
    title: file?.name?.replace(/\.[a-z0-9]+$/i, '') || '',
    provider: 'pixabay',
    sourceProvider: 'pixabay',
    sourceName: 'Pixabay Music',
    sourceUrl,
    sourcePageUrl: sourceUrl,
    license: 'Pixabay Content License',
    licenseUrl: PIXABAY_CONTENT_LICENSE_URL,
    attribution: '',
    rightsStatus: 'review',
    socialUse: true,
    commercialUse: true,
    category: selectedTag?.label || selectedTag?.id || 'Pixabay Music',
    genre: selectedTag?.label || '',
    mood: selectedTag?.label || '',
    tags: ['pixabay', selectedTag?.id, selectedTag?.query].filter(Boolean),
    licenseSnapshotVersion: 'pixabay-content-license-manual',
    contentIdWarning: 'Import manuel Pixabay: conserver la page source et verifier les risques Content ID avant publication sociale.',
    importEvent: `Import Pixabay termine: ${selectedTag?.label || 'musique'}.`,
});

export default function PixabayImportAssistant({
    search,
    localLibrary,
    projectLibrary,
    onSelectTrack,
    onImportComplete,
}) {
    const inputRef = useRef(null);
    const [sourceDraft, setSourceDraft] = useState('');
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');
    const quickTags = getSoundtrackProviderQuickTags('pixabay');
    const selectedTag = quickTags.find((tag) => tag.id === search.category)
        || quickTags.find((tag) => tag.query === search.query)
        || quickTags[0];
    const officialUrl = useMemo(() => (
        search.sourceUrl || buildPixabayMusicSearchUrl(selectedTag) || PIXABAY_MUSIC_URL
    ), [search.sourceUrl, selectedTag]);
    const sourceUrl = cleanSourceUrl(sourceDraft) || officialUrl;
    const targetLabel = projectLibrary.capability?.ready ? 'Projet Firebase' : 'Bibliotheque locale';

    if (search.provider !== 'pixabay') return null;

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
                    const track = await projectLibrary.importFileToProject(file, buildMetadata({ file, selectedTag, sourceUrl }));
                    if (track) imported.push(track);
                }
            } else {
                imported.push(...(await localLibrary.importFiles(files, buildMetadata({ file: files[0], selectedTag, sourceUrl })) || []));
            }
            if (!imported.length) throw new Error('Aucun fichier audio importe.');
            onSelectTrack?.(imported[0]);
            onImportComplete?.(imported[0]);
            setStatus('ready');
            setMessage(`${imported.length} piste${imported.length > 1 ? 's' : ''} ajoutee${imported.length > 1 ? 's' : ''} a la bibliotheque Vibe_fx.`);
        } catch (error) {
            setStatus('error');
            setMessage(error.message || 'Import Pixabay impossible.');
        }
    };

    return (
        <section className="soundtrack-pixabay-assistant" data-state={status} data-testid="pixabay-import-assistant" aria-label="Assistant import Pixabay">
            <div className="soundtrack-pixabay-assistant__head">
                <div>
                    <p>Assistant Pixabay</p>
                    <strong>{selectedTag?.label || 'Pixabay Music'}</strong>
                </div>
                <span>{targetLabel}</span>
            </div>
            <div className="soundtrack-pixabay-assistant__flow">
                <a href={officialUrl} target="_blank" rel="noreferrer">
                    <ExternalLink size={13} />
                    Ouvrir Pixabay
                </a>
                <label>
                    <span>Page source piste</span>
                    <input
                        value={sourceDraft}
                        onChange={(event) => setSourceDraft(event.target.value)}
                        placeholder="https://pixabay.com/music/..."
                        aria-label="Page source Pixabay"
                    />
                </label>
                <button type="button" onClick={() => inputRef.current?.click()} disabled={status === 'loading'}>
                    {status === 'loading' ? <Loader2 size={13} className="soundtrack-spin" /> : <UploadCloud size={13} />}
                    Importer fichier telecharge
                </button>
            </div>
            <input
                ref={inputRef}
                type="file"
                accept="audio/*"
                multiple
                className="soundtrack-hidden-input"
                data-testid="pixabay-assisted-file-input"
                onChange={importFiles}
            />
            <div className="soundtrack-pixabay-assistant__meta">
                <span>Source Pixabay</span>
                <span>Licence pre-remplie</span>
                <span>Categorie {selectedTag?.label || 'Pixabay'}</span>
                {status === 'ready' && <span data-state="ready"><CheckCircle2 size={12} /> importe</span>}
                {message && <small data-state={status}>{message}</small>}
            </div>
        </section>
    );
}
