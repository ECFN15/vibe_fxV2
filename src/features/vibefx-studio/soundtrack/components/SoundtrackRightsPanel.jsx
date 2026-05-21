import React from 'react';
import { ExternalLink, ShieldCheck, TriangleAlert } from 'lucide-react';
import { SOUNDTRACK_PROVIDER_CARDS } from '../data/soundtrackDefaults';
import { getRightsLabel, getSoundtrackRightsAudit } from '../services/soundtrackRights';

export default function SoundtrackRightsPanel({ selectedTrack }) {
    const audit = selectedTrack ? getSoundtrackRightsAudit(selectedTrack) : null;
    const providers = SOUNDTRACK_PROVIDER_CARDS.filter((provider) => ['free', 'free-risk', 'licensed', 'premium'].includes(provider.tier)).slice(0, 6);

    return (
        <section className="soundtrack-panel" aria-label="Droits et licences">
            <header className="soundtrack-section-header">
                <div>
                    <p>Droits</p>
                    <h2>Licence</h2>
                </div>
                <span>{selectedTrack ? getRightsLabel(selectedTrack.rightsStatus) : 'aucune piste'}</span>
            </header>

            {selectedTrack ? (
                <div className="soundtrack-rights-detail">
                    <div className="soundtrack-rights-title">
                        {audit.blocked ? <TriangleAlert size={16} /> : <ShieldCheck size={16} />}
                        <div>
                            <strong>{selectedTrack.title}</strong>
                            <p>{selectedTrack.sourceName} / {selectedTrack.license}</p>
                        </div>
                    </div>
                    <dl>
                        <dt>Source</dt>
                        <dd>{selectedTrack.sourceUrl ? <a href={selectedTrack.sourceUrl} target="_blank" rel="noreferrer">Ouvrir <ExternalLink size={11} /></a> : 'manquante'}</dd>
                        <dt>Licence</dt>
                        <dd>{selectedTrack.licenseUrl ? <a href={selectedTrack.licenseUrl} target="_blank" rel="noreferrer">Verifier <ExternalLink size={11} /></a> : 'manquante'}</dd>
                        <dt>Attribution</dt>
                        <dd>{selectedTrack.attribution || 'non renseignee'}</dd>
                        <dt>Content ID</dt>
                        <dd>{selectedTrack.contentIdWarning || 'aucun avertissement capture'}</dd>
                    </dl>
                    {audit.issues.length > 0 && (
                        <div className="soundtrack-rights-list" data-state="danger">
                            {audit.issues.map((issue) => <span key={issue}>{issue}</span>)}
                        </div>
                    )}
                    {audit.warnings.length > 0 && (
                        <div className="soundtrack-rights-list" data-state="warning">
                            {audit.warnings.map((warning) => <span key={warning}>{warning}</span>)}
                        </div>
                    )}
                </div>
            ) : (
                <p className="soundtrack-panel-note">Selectionnez une piste pour voir la source, la licence, l'attribution et les blocages avant usage video.</p>
            )}

            <div className="soundtrack-provider-cards">
                {providers.map((provider) => (
                    <a key={provider.id} href={provider.url} target="_blank" rel="noreferrer">
                        <strong>{provider.name}</strong>
                        <span>{provider.status}</span>
                    </a>
                ))}
            </div>
        </section>
    );
}
