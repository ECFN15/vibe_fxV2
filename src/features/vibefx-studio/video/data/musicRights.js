export const RIGHTS_STATUS_LABELS = {
    'cleared-social': 'Cleared social',
    'credit-required': 'Credit requis',
    'user-declared': 'Declare utilisateur',
    'licensed-project': 'Licence projet',
    'ai-generated': 'IA sous licence',
    review: 'A verifier',
};

export const RIGHTS_IMPORT_PRESETS = [
    {
        id: 'white-bat-audio',
        label: 'White Bat Audio',
        lane: 'verified-free',
        sourceName: 'White Bat Audio',
        sourceUrl: 'https://whitebataudio.com/',
        license: 'Free Music License - attribution requise',
        licenseUrl: 'https://whitebataudio.com/license-agreement/',
        attribution: 'Music by Karl Casey @ White Bat Audio',
        rightsStatus: 'credit-required',
        commercialUse: true,
        socialUse: true,
        contentIdWarning: 'Attribution requise. Verifier les conditions exactes au moment de publier.',
    },
    {
        id: 'pixabay-manual',
        label: 'Pixabay Music verifie',
        lane: 'verified-free',
        sourceName: 'Pixabay Music',
        sourceUrl: 'https://pixabay.com/music/',
        license: 'Pixabay Content License - import manuel verifie',
        licenseUrl: 'https://pixabay.com/service/license-summary/',
        attribution: '',
        rightsStatus: 'review',
        commercialUse: true,
        socialUse: true,
        contentIdWarning: 'Import manuel ou script local controle: conserver la page source Pixabay, la licence et le manifest avant publication sociale.',
    },
    {
        id: 'jamendo-licensed',
        label: 'Jamendo Licensing',
        lane: 'low-cost',
        sourceName: 'Jamendo Licensing',
        sourceUrl: 'https://licensing.jamendo.com/',
        license: 'Licence piste/projet Jamendo',
        licenseUrl: 'https://support-licensing.jamendo.com/catalog-licenses',
        attribution: '',
        rightsStatus: 'licensed-project',
        commercialUse: true,
        socialUse: true,
        contentIdWarning: 'Royalty-free ne veut pas dire gratuit. Conserver la preuve de licence projet.',
    },
    {
        id: 'openverse-free-api',
        label: 'Openverse Audio',
        lane: 'verified-free',
        sourceName: 'Openverse Audio',
        sourceUrl: 'https://openverse.org/audio',
        license: 'Creative Commons / public domain - metadata Openverse',
        licenseUrl: 'https://docs.openverse.org/api/',
        attribution: '',
        rightsStatus: 'credit-required',
        commercialUse: false,
        socialUse: true,
        contentIdWarning: 'Openverse agrege des metadonnees ouvertes mais ne garantit pas leur exactitude. Verifier la source originale.',
    },
    {
        id: 'jamendo-free-api',
        label: 'Jamendo Music API',
        lane: 'verified-free',
        sourceName: 'Jamendo Music',
        sourceUrl: 'https://www.jamendo.com/start',
        license: 'Creative Commons - metadata Jamendo',
        licenseUrl: 'https://creativecommons.org/licenses/',
        attribution: '',
        rightsStatus: 'credit-required',
        commercialUse: false,
        socialUse: true,
        contentIdWarning: 'Recherche via API officielle Jamendo si JAMENDO_CLIENT_ID est configure. Verifier la licence CC piste par piste avant publication commerciale.',
    },
    {
        id: 'freesound-free-api',
        label: 'Freesound API',
        lane: 'verified-free-sfx',
        sourceName: 'Freesound',
        sourceUrl: 'https://freesound.org/',
        license: 'Creative Commons - metadata Freesound',
        licenseUrl: 'https://freesound.org/docs/api/',
        attribution: '',
        rightsStatus: 'credit-required',
        commercialUse: false,
        socialUse: true,
        contentIdWarning: 'Freesound est surtout adapte aux SFX/loops. API gratuite non commerciale sauf accord; verifier la licence piste.',
    },
    {
        id: 'archive-free-api',
        label: 'Internet Archive Audio',
        lane: 'verified-free-review',
        sourceName: 'Internet Archive',
        sourceUrl: 'https://archive.org/details/audio',
        license: 'Creative Commons / public domain - metadata Archive',
        licenseUrl: 'https://archive.org/developers/metadata-schema/',
        attribution: '',
        rightsStatus: 'credit-required',
        commercialUse: false,
        socialUse: true,
        contentIdWarning: 'Metadonnees Archive heterogenes. Verifier licenseurl et page item avant publication.',
    },
    {
        id: 'wikimedia-free-api',
        label: 'Wikimedia Commons Audio',
        lane: 'verified-free-review',
        sourceName: 'Wikimedia Commons',
        sourceUrl: 'https://commons.wikimedia.org/wiki/Category:Audio_files',
        license: 'Creative Commons / public domain - metadata Commons',
        licenseUrl: 'https://commons.wikimedia.org/wiki/Commons:API/MediaWiki',
        attribution: '',
        rightsStatus: 'credit-required',
        commercialUse: false,
        socialUse: true,
        contentIdWarning: 'Wikimedia Commons audio est heterogene. Verifier fichier, auteur, attribution et licence.',
    },
    {
        id: 'user-owned',
        label: 'Original / commande client',
        lane: 'owned',
        sourceName: 'Import utilisateur',
        sourceUrl: 'user-declared',
        license: 'Droits declares par utilisateur',
        licenseUrl: 'user-declared',
        attribution: '',
        rightsStatus: 'user-declared',
        commercialUse: false,
        socialUse: false,
        contentIdWarning: 'Declaration manuelle: conserver contrat, facture ou accord ecrit hors app.',
    },
    {
        id: 'ai-licensed',
        label: 'IA avec licence fournisseur',
        lane: 'ai-manual',
        sourceName: 'AI music provider',
        sourceUrl: '',
        license: 'Licence IA commerciale a verifier',
        licenseUrl: '',
        attribution: '',
        rightsStatus: 'ai-generated',
        commercialUse: false,
        socialUse: false,
        contentIdWarning: 'L automatisation IA doit passer par un callable serveur. Import manuel seulement si la licence est capturee.',
    },
];

export const getRightsPreset = (id) => RIGHTS_IMPORT_PRESETS.find((preset) => preset.id === id) || RIGHTS_IMPORT_PRESETS[0];

const present = (value) => typeof value === 'string' ? value.trim().length > 0 : Boolean(value);

export function getTrackRightsIssues(track) {
    const issues = [];
    const warnings = [];

    if (!present(track.sourceName)) issues.push('Source manquante');
    if (!present(track.sourceUrl)) issues.push('URL source/preuve manquante');
    if (!present(track.license)) issues.push('Licence manquante');
    if (!present(track.licenseUrl)) issues.push('URL licence manquante');
    if (!present(track.rightsStatus)) issues.push('Statut droits manquant');
    if (track.rightsStatus === 'credit-required' && !present(track.attribution)) {
        issues.push('Attribution requise manquante');
    }
    if (track.socialUse !== true) {
        issues.push('Usage social non confirme');
    }
    if (track.commercialUse !== true) {
        warnings.push('Usage commercial non confirme');
    }
    if (present(track.contentIdWarning)) {
        warnings.push(track.contentIdWarning);
    }

    return { issues, warnings };
}

export function buildTrackRightsManifest(track, context = {}) {
    return {
        trackId: track.id,
        title: track.name || track.title || '',
        provider: track.provider || track.sourceName || 'unknown',
        sourceName: track.sourceName || '',
        sourceUrl: track.sourceUrl || '',
        downloadUrl: track.downloadUrl || '',
        license: track.license || '',
        licenseUrl: track.licenseUrl || '',
        licenseSnapshotVersion: track.licenseSnapshotVersion || 'manual-current',
        attribution: track.attribution || '',
        rightsStatus: track.rightsStatus || 'review',
        commercialUse: track.commercialUse === true,
        socialUse: track.socialUse === true,
        contentIdWarning: track.contentIdWarning || '',
        acquiredAt: track.acquiredAt || new Date().toISOString(),
        userId: context.userId || track.userId || null,
        exportId: context.exportId || track.exportId || null,
    };
}

export function buildExportRightsManifest(audioTracks, context = {}) {
    return audioTracks.map((track) => buildTrackRightsManifest(track, context));
}

export function buildExportRightsManifestDocument(audioTracks, context = {}) {
    const createdAt = context.createdAt || new Date().toISOString();
    const normalizedCreatedAt = createdAt.replace(/[^0-9a-z]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
    const exportId = context.exportId || `export-${normalizedCreatedAt || Date.now()}`;
    const ownerUid = context.ownerUid || context.userId || '';
    const tracks = buildExportRightsManifest(audioTracks, {
        ...context,
        exportId,
        userId: ownerUid || context.userId || null,
    });
    const audits = audioTracks.map((track) => ({
        trackId: track.id,
        issues: getTrackRightsIssues(track).issues,
        warnings: getTrackRightsIssues(track).warnings,
    }));
    const blockers = audits.flatMap((audit) => audit.issues.map((issue) => ({
        trackId: audit.trackId,
        issue,
    })));
    const warnings = audits.flatMap((audit) => audit.warnings.map((warning) => ({
        trackId: audit.trackId,
        warning,
    })));

    return {
        id: context.manifestId || exportId,
        ownerUid,
        userId: ownerUid || null,
        exportId,
        projectId: context.projectId || '',
        projectName: context.projectName || '',
        exportFormat: context.exportFormat || '',
        sequencePreset: context.sequencePreset || '',
        status: blockers.length > 0 ? 'blocked' : warnings.length > 0 ? 'warning' : 'ready',
        trackCount: tracks.length,
        tracks,
        blockers,
        warnings,
        createdAt,
        updatedAt: context.updatedAt || createdAt,
    };
}

export function getRightsAudit(audioTracks) {
    return audioTracks.map((track) => ({
        track,
        manifest: buildTrackRightsManifest(track),
        ...getTrackRightsIssues(track),
    }));
}
