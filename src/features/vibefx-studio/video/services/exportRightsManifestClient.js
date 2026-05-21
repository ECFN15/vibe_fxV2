import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, firebaseReady } from '../../../../lib/firebase';
import { buildExportRightsManifestDocument } from '../data/musicRights';

const MANIFEST_FIELDS = [
    'id',
    'ownerUid',
    'userId',
    'exportId',
    'projectId',
    'projectName',
    'exportFormat',
    'sequencePreset',
    'status',
    'trackCount',
    'tracks',
    'blockers',
    'warnings',
    'createdAt',
    'updatedAt',
];

export function getExportRightsManifestCapability() {
    return {
        ready: firebaseReady && Boolean(auth && db),
        reason: firebaseReady ? '' : 'Firebase client non configure.',
    };
}

export function serializeExportRightsManifest(document = {}) {
    return Object.fromEntries(
        MANIFEST_FIELDS
            .filter((field) => document[field] !== undefined)
            .map((field) => [field, document[field] ?? ''])
    );
}

async function ensureManifestUser() {
    const capability = getExportRightsManifestCapability();
    if (!capability.ready) return { user: null, capability };
    if (auth.currentUser) return { user: auth.currentUser, capability };
    const credential = await signInAnonymously(auth);
    return { user: credential.user, capability };
}

export async function persistExportRightsManifest({ audioTracks = [], context = {} } = {}) {
    const { user, capability } = await ensureManifestUser();
    const manifest = buildExportRightsManifestDocument(audioTracks, {
        ...context,
        ownerUid: user?.uid || context.ownerUid || context.userId || '',
        userId: user?.uid || context.userId || null,
    });

    if (!capability.ready || !user?.uid) {
        return {
            persisted: false,
            reason: capability.reason || 'Utilisateur Firebase indisponible.',
            manifest,
        };
    }

    await setDoc(
        doc(db, 'users', user.uid, 'rightsManifests', manifest.id),
        serializeExportRightsManifest(manifest)
    );

    return {
        persisted: true,
        manifest,
    };
}
