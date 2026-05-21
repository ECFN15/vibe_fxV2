import React, { useRef, useState } from 'react';
import { Database, Download, FolderOpen, Import, RefreshCw, Unplug } from 'lucide-react';
import { filePickerAccept } from '../services/soundtrackDownloads';

export default function SoundtrackFolderPanel({ library }) {
    const inputRef = useRef(null);
    const [manualUrl, setManualUrl] = useState('');
    const [manualTitle, setManualTitle] = useState('');
    const [manualSourceUrl, setManualSourceUrl] = useState('');
    const [manualLicense, setManualLicense] = useState('Pixabay Content License - import manuel verifie');
    const state = library.folderState;
    const capabilityLabel = state.capability === 'directory'
        ? 'File System Access API'
        : state.capability === 'fallback'
            ? 'Fallback manuel'
            : 'Detection';

    return (
        <section className="soundtrack-panel" aria-label="Dossier local Soundtrack">
            <header className="soundtrack-section-header">
                <div>
                    <p>Dossier</p>
                    <h2>Stockage local</h2>
                </div>
                <span data-state={state.status}>{state.status}</span>
            </header>

            <div className="soundtrack-folder-status" data-status={state.status}>
                <Database size={16} />
                <div>
                    <strong>{capabilityLabel}</strong>
                    <p>{state.message}</p>
                </div>
            </div>

            <div className="soundtrack-folder-actions">
                <button type="button" onClick={library.connectFolder} disabled={state.capability === 'fallback'}>
                    <FolderOpen size={14} />
                    Choisir dossier
                </button>
                <button type="button" onClick={library.disconnectFolder}>
                    <Unplug size={14} />
                    Oublier
                </button>
                <button type="button" onClick={library.checkMissingFiles}>
                    <RefreshCw size={14} />
                    Verifier fichiers
                </button>
                <button type="button" onClick={library.exportManifest}>
                    <Download size={14} />
                    Export manifest
                </button>
                <button type="button" onClick={() => inputRef.current?.click()}>
                    <Import size={14} />
                    Import manifest/fichiers
                </button>
            </div>

            <input
                ref={inputRef}
                type="file"
                multiple
                accept={filePickerAccept()}
                onChange={(event) => {
                    library.importFiles(event.target.files);
                    event.target.value = '';
                }}
                className="soundtrack-hidden-input"
            />

            <form
                className="soundtrack-manual-import"
                onSubmit={async (event) => {
                    event.preventDefault();
                    const imported = await library.importRemoteTrack({
                        audioUrl: manualUrl,
                        metadata: {
                            title: manualTitle || 'Pixabay audio',
                            provider: 'pixabay',
                            sourceName: 'Pixabay Music',
                            sourceUrl: manualSourceUrl || 'https://pixabay.com/music/',
                            license: manualLicense,
                            licenseUrl: 'https://pixabay.com/service/license-summary/',
                            rightsStatus: 'needs-review',
                            socialUse: true,
                            commercialUse: true,
                            contentIdWarning: 'Pixabay n a pas d API musique officielle publique ici. Verifier la page source et ne pas scraper le catalogue.',
                        },
                    });
                    if (imported) {
                        setManualUrl('');
                        setManualTitle('');
                        setManualSourceUrl('');
                    }
                }}
            >
                <label>
                    <span>URL audio directe</span>
                    <input value={manualUrl} onChange={(event) => setManualUrl(event.target.value)} placeholder="https://cdn.pixabay.com/.../track.mp3" />
                </label>
                <label>
                    <span>Titre</span>
                    <input value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} placeholder="Nom de la piste" />
                </label>
                <label>
                    <span>Page source</span>
                    <input value={manualSourceUrl} onChange={(event) => setManualSourceUrl(event.target.value)} placeholder="https://pixabay.com/music/..." />
                </label>
                <label>
                    <span>Licence</span>
                    <input value={manualLicense} onChange={(event) => setManualLicense(event.target.value)} />
                </label>
                <button type="submit" disabled={!manualUrl.trim() || Boolean(library.busyTrackId)}>
                    Importer URL locale
                </button>
            </form>

            <p className="soundtrack-panel-note">
                Les fichiers audio restent sur cet appareil ou dans le dossier choisi. IndexedDB garde seulement les metadata, favoris, playlists et le handle local quand le navigateur l'autorise.
            </p>
            {library.lastEvent && <p className="soundtrack-event">{library.lastEvent}</p>}
        </section>
    );
}
