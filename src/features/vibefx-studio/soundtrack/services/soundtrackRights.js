import {
    RIGHTS_STATUS_LABELS,
    buildTrackRightsManifest,
    getTrackRightsIssues,
} from '../../video/data/musicRights';

const STATUS_MAP = {
    'cleared-social': 'verified-free',
    'credit-required': 'verified-free',
    review: 'needs-review',
    'licensed-project': 'user-declared',
    'user-declared': 'user-declared',
    'ai-generated': 'needs-review',
};

export function toLocalRightsStatus(status) {
    return STATUS_MAP[status] || status || 'needs-review';
}

export function getRightsLabel(status) {
    return RIGHTS_STATUS_LABELS[status] || RIGHTS_STATUS_LABELS[status?.replace('verified-free', 'cleared-social')] || status || 'A verifier';
}

export function getSoundtrackRightsAudit(track) {
    const videoCompatibleTrack = {
        ...track,
        rightsStatus: track.rightsStatus === 'verified-free' ? 'credit-required' : track.rightsStatus,
    };
    const audit = getTrackRightsIssues(videoCompatibleTrack);
    const blocked = track.rightsStatus === 'blocked' || audit.issues.length > 0;
    return {
        ...audit,
        blocked,
        manifest: buildTrackRightsManifest(videoCompatibleTrack),
    };
}

export function normalizeSearchTrackRights(track) {
    const localStatus = toLocalRightsStatus(track.rightsStatus);
    return {
        ...track,
        rightsStatus: localStatus,
        commercialUse: track.commercialUse === true,
        socialUse: track.socialUse === true,
    };
}
