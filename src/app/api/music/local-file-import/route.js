import { createHash, randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_AUDIO_BYTES = 150 * 1024 * 1024;
const PUBLIC_MUSIC_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), 'public', 'music');
const IMPORT_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), 'public', 'music', 'local-imports');
const PUBLIC_BASE_URL = '/music/local-imports';
const MANIFEST_FILE = 'vibefx-local-imports-manifest.json';
const MANIFEST_PATH = path.join(IMPORT_DIR, MANIFEST_FILE);
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.aac', '.webm', '.m4a']);
const BUNDLED_SOURCE_DIRS = [
    {
        id: 'public-music',
        directory: PUBLIC_MUSIC_DIR,
        prefix: '',
        provider: 'bundled-local',
        sourceName: 'Bibliotheque locale public/music',
        category: 'Bibliotheque locale',
    },
    {
        id: 'pixabay-ai',
        directory: path.join(PUBLIC_MUSIC_DIR, 'pixabay-ai'),
        prefix: 'pixabay-ai-',
        provider: 'pixabay-ai',
        sourceName: 'Pixabay AI local',
        category: 'Pixabay AI',
    },
];

const PURGED_DEMO_TITLE_KEYS = new Set([
    'blooming chill',
    'epic action hero',
    'journey in space (epic background music)',
    'journey in space',
    'slim shady | eminem type beat - hip hop rap instrumental (prod....',
    'slim shady | eminem type beat - hip hop rap instrumental',
    'old movie ragtime piano',
    'krasnoshchok-dramatic-epic-music-493522',
]);
const PURGED_DEMO_TITLE_PATTERNS = [
    'journey in space',
    'slim shady | eminem type beat',
    'krasnoshchok-dramatic-epic-music-493522',
];

const nowIso = () => new Date().toISOString();

const normalizeTitleKey = (value = '') => (
    String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
);

const isPurgedDemoTitle = (value = '') => {
    const key = normalizeTitleKey(value);
    return PURGED_DEMO_TITLE_KEYS.has(key) || PURGED_DEMO_TITLE_PATTERNS.some((pattern) => key.includes(pattern));
};

const sanitizeFileName = (value = 'vibefx-audio') => {
    const cleaned = String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 90);
    return cleaned || 'vibefx-audio';
};

const stableLocalTrackId = (sourcePublicPath = '') => (
    `local-import-${createHash('sha1').update(sourcePublicPath).digest('hex').slice(0, 14)}`
);

const fileExists = async (filePath) => {
    try {
        await stat(filePath);
        return true;
    } catch {
        return false;
    }
};

const parseAudioName = (fileName = '') => {
    const baseName = String(fileName || '').replace(/\.[a-z0-9]+$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
    const [artist, ...titleParts] = baseName.split(/\s+-\s+/).map((value) => value.trim()).filter(Boolean);
    if (artist && titleParts.length) {
        return { artist, title: titleParts.join(' - ') };
    }
    return { artist: '', title: baseName.replace(/[-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Audio local' };
};

const uniqueFileName = async (baseName, extension, usedFileNames) => {
    const safeBaseName = sanitizeFileName(baseName);
    let fileName = `${safeBaseName}.${extension}`;
    let index = 2;
    while (usedFileNames.has(fileName.toLowerCase()) || await fileExists(path.join(IMPORT_DIR, fileName))) {
        fileName = `${safeBaseName}-${index}.${extension}`;
        index += 1;
    }
    usedFileNames.add(fileName.toLowerCase());
    return fileName;
};

const getAudioExtension = (mime = '', fallbackName = '') => {
    const lowerMime = String(mime || '').toLowerCase();
    if (lowerMime.includes('mpeg') || lowerMime.includes('mp3')) return 'mp3';
    if (lowerMime.includes('wav')) return 'wav';
    if (lowerMime.includes('ogg')) return 'ogg';
    if (lowerMime.includes('aac')) return 'aac';
    if (lowerMime.includes('webm')) return 'webm';
    const match = String(fallbackName || '').split('?')[0].match(/\.([a-z0-9]{2,5})$/i);
    return match?.[1]?.toLowerCase() || 'mp3';
};

const createEmptyManifest = () => ({
    schemaVersion: 1,
    app: 'vibe_fx',
    kind: 'soundtrack-local-imports',
    updatedAt: nowIso(),
    tracks: [],
});

async function ensureImportDir() {
    await mkdir(IMPORT_DIR, { recursive: true });
}

async function readManifest() {
    await ensureImportDir();
    try {
        const parsed = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
        return {
            ...createEmptyManifest(),
            ...parsed,
            tracks: Array.isArray(parsed.tracks) ? parsed.tracks : [],
        };
    } catch {
        return createEmptyManifest();
    }
}

async function removeFileIfLocal(fileName = '') {
    const safeName = path.basename(String(fileName || ''));
    if (!safeName || safeName === MANIFEST_FILE) return;
    await unlink(path.join(IMPORT_DIR, safeName)).catch(() => {});
}

async function cleanManifest(manifest) {
    const keptTracks = [];
    for (const track of manifest.tracks || []) {
        if (isPurgedDemoTitle(track.title)) {
            await removeFileIfLocal(track.fileName);
        } else {
            keptTracks.push(track);
        }
    }
    return { ...manifest, tracks: keptTracks, updatedAt: nowIso() };
}

async function listBundledAudioFiles() {
    const files = [];
    for (const source of BUNDLED_SOURCE_DIRS) {
        const entries = await readdir(source.directory, { withFileTypes: true }).catch(() => []);
        for (const entry of entries) {
            if (!entry.isFile()) continue;
            const extension = path.extname(entry.name).toLowerCase();
            if (!AUDIO_EXTENSIONS.has(extension)) continue;
            const absolutePath = path.join(source.directory, entry.name);
            const size = await stat(absolutePath).then((value) => value.size).catch(() => 0);
            if (!size || size > MAX_AUDIO_BYTES) continue;
            const publicSourcePath = `/music/${source.id === 'pixabay-ai' ? 'pixabay-ai/' : ''}${entry.name}`;
            files.push({
                ...source,
                absolutePath,
                originalFileName: entry.name,
                publicSourcePath,
                extension: extension.slice(1) || 'mp3',
                size,
            });
        }
    }
    return files;
}

async function syncBundledAudioToLocalImports(manifest) {
    await ensureImportDir();
    const existingTracks = Array.isArray(manifest.tracks) ? manifest.tracks : [];
    const existingBySource = new Map(existingTracks.map((track) => [track.sourceLocalPath || track.originalPublicPath || '', track]).filter(([key]) => key));
    const existingIds = new Set(existingTracks.map((track) => track.id).filter(Boolean));
    const usedFileNames = new Set(existingTracks.map((track) => String(track.fileName || '').toLowerCase()).filter(Boolean));
    const bundledFiles = await listBundledAudioFiles();
    const importedTracks = [];
    const updatedExistingTracks = new Map();

    for (const sourceFile of bundledFiles) {
        const trackId = stableLocalTrackId(sourceFile.publicSourcePath);
        const parsedName = parseAudioName(sourceFile.originalFileName);
        const existingTrack = existingBySource.get(sourceFile.publicSourcePath)
            || existingTracks.find((track) => track.id === trackId);
        if (existingTrack) {
            const publicUrl = existingTrack.downloadUrl || `${PUBLIC_BASE_URL}/${existingTrack.fileName}`;
            updatedExistingTracks.set(existingTrack.id, {
                ...existingTrack,
                title: parsedName.title,
                artist: parsedName.artist,
                provider: existingTrack.provider || sourceFile.provider,
                sourceName: existingTrack.sourceName || sourceFile.sourceName,
                sourceUrl: existingTrack.sourceUrl || sourceFile.publicSourcePath,
                sourcePageUrl: existingTrack.sourcePageUrl || sourceFile.publicSourcePath,
                sourceLocalPath: existingTrack.sourceLocalPath || sourceFile.publicSourcePath,
                originalPublicPath: existingTrack.originalPublicPath || sourceFile.publicSourcePath,
                category: existingTrack.category || sourceFile.category,
                localPathHint: existingTrack.localPathHint || publicUrl,
                downloadUrl: publicUrl,
                previewUrl: existingTrack.previewUrl || publicUrl,
                audioUrl: existingTrack.audioUrl || publicUrl,
                fileAvailable: true,
                missingReason: '',
                updatedAt: nowIso(),
            });
            continue;
        }
        if (existingIds.has(trackId)) continue;
        if (isPurgedDemoTitle(parsedName.title)) continue;
        const fileName = await uniqueFileName(`${sourceFile.prefix}${sourceFile.originalFileName.replace(/\.[a-z0-9]+$/i, '')}`, sourceFile.extension, usedFileNames);
        try {
            await copyFile(sourceFile.absolutePath, path.join(IMPORT_DIR, fileName));
        } catch {
            continue;
        }
        const publicUrl = `${PUBLIC_BASE_URL}/${fileName}`;
        importedTracks.push({
            id: trackId,
            providerTrackId: '',
            title: parsedName.title,
            artist: parsedName.artist,
            provider: sourceFile.provider,
            sourceName: sourceFile.sourceName,
            sourceUrl: sourceFile.publicSourcePath,
            sourcePageUrl: sourceFile.publicSourcePath,
            sourceLocalPath: sourceFile.publicSourcePath,
            originalPublicPath: sourceFile.publicSourcePath,
            license: sourceFile.provider === 'pixabay-ai' ? 'Pixabay Content License' : 'Licence a verifier',
            licenseUrl: sourceFile.provider === 'pixabay-ai' ? 'https://pixabay.com/service/license-summary/' : '',
            attribution: parsedName.artist ? `${parsedName.artist} - ${parsedName.title}` : parsedName.title,
            contentIdWarning: sourceFile.provider === 'pixabay-ai'
                ? 'Piste locale issue du dossier Pixabay AI: verifier la page/source avant publication.'
                : 'Piste locale issue de public/music: verifier la licence avant publication.',
            duration: 0,
            bpm: 0,
            tags: [sourceFile.provider],
            category: sourceFile.category,
            mood: '',
            genre: '',
            fileName,
            localPathHint: publicUrl,
            downloadUrl: publicUrl,
            previewUrl: publicUrl,
            audioUrl: publicUrl,
            importStatus: 'importable',
            blockedReason: '',
            favorite: false,
            addedAt: nowIso(),
            updatedAt: nowIso(),
            rightsStatus: 'needs-review',
            commercialUse: sourceFile.provider === 'pixabay-ai',
            socialUse: true,
            licenseSnapshotVersion: 'local-current',
            fileAvailable: true,
            missingReason: '',
            waveform: null,
            contentType: 'audio/mpeg',
        });
    }

    const nextExistingTracks = updatedExistingTracks.size
        ? existingTracks.map((track) => updatedExistingTracks.get(track.id) || track)
        : existingTracks;
    if (!importedTracks.length && !updatedExistingTracks.size) return manifest;
    return {
        ...manifest,
        tracks: [...importedTracks, ...nextExistingTracks],
        updatedAt: nowIso(),
    };
}

async function writeManifest(manifest) {
    await ensureImportDir();
    await writeFile(MANIFEST_PATH, JSON.stringify({
        ...manifest,
        updatedAt: nowIso(),
    }, null, 2), 'utf8');
}

const localImportEnabled = () => (
    process.env.NODE_ENV !== 'production'
    || process.env.VIBEFX_ENABLE_LOCAL_AUDIO_IMPORT === 'true'
);

export async function GET() {
    if (!localImportEnabled()) {
        return NextResponse.json({ tracks: [], disabled: true }, { status: 200 });
    }
    const manifest = await syncBundledAudioToLocalImports(await cleanManifest(await readManifest()));
    await writeManifest(manifest);
    return NextResponse.json(manifest);
}

export async function POST(request) {
    if (!localImportEnabled()) {
        return NextResponse.json({ error: 'Import audio local desactive en production. Utilisez Firebase Storage.' }, { status: 403 });
    }

    let form;
    try {
        form = await request.formData();
    } catch {
        return NextResponse.json({ error: 'Payload multipart invalide.' }, { status: 400 });
    }

    const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
        return NextResponse.json({ error: 'Fichier audio manquant.' }, { status: 400 });
    }

    const metadataRaw = form.get('metadata');
    let metadata = {};
    if (typeof metadataRaw === 'string' && metadataRaw.trim()) {
        try {
            metadata = JSON.parse(metadataRaw);
        } catch {
            return NextResponse.json({ error: 'Metadata JSON invalide.' }, { status: 400 });
        }
    }

    const type = file.type || metadata.contentType || '';
    const extension = getAudioExtension(type, file.name || metadata.fileName);
    const typeLooksAudio = String(type).toLowerCase().startsWith('audio/');
    if (!typeLooksAudio && !['mp3', 'wav', 'ogg', 'aac', 'webm'].includes(extension)) {
        return NextResponse.json({ error: 'MIME audio invalide.' }, { status: 400 });
    }
    if (file.size > MAX_AUDIO_BYTES) {
        return NextResponse.json({ error: 'Fichier trop lourd: limite 150 MB.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength > MAX_AUDIO_BYTES) {
        return NextResponse.json({ error: 'Fichier trop lourd: limite 150 MB.' }, { status: 400 });
    }

    const title = metadata.title || String(file.name || '').replace(/\.[a-z0-9]+$/i, '') || 'Import audio';
    if (isPurgedDemoTitle(title)) {
        return NextResponse.json({ error: 'Cette piste demo a ete purgee de la base locale.' }, { status: 410 });
    }

    const baseName = sanitizeFileName(`${metadata.artist ? `${metadata.artist}-` : ''}${title}`);
    const fileName = `${baseName}-${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`;
    await ensureImportDir();
    await writeFile(path.join(IMPORT_DIR, fileName), buffer);

    const publicUrl = `${PUBLIC_BASE_URL}/${fileName}`;
    const manifest = await cleanManifest(await readManifest());
    const track = {
        ...metadata,
        id: metadata.id || `local-${randomUUID()}`,
        title,
        provider: metadata.provider || 'local-file',
        sourceName: metadata.sourceName || 'Fichier local',
        sourceUrl: metadata.sourceUrl || 'local-file',
        sourcePageUrl: metadata.sourcePageUrl || metadata.sourceUrl || 'local-file',
        fileName,
        localPathHint: publicUrl,
        downloadUrl: publicUrl,
        previewUrl: publicUrl,
        audioUrl: publicUrl,
        fileAvailable: true,
        missingReason: '',
        updatedAt: nowIso(),
        addedAt: metadata.addedAt || nowIso(),
    };
    const previousTrack = manifest.tracks.find((item) => item.id === track.id);
    if (previousTrack?.fileName && previousTrack.fileName !== fileName) {
        await removeFileIfLocal(previousTrack.fileName);
    }
    const nextTracks = manifest.tracks.some((item) => item.id === track.id)
        ? manifest.tracks.map((item) => item.id === track.id ? track : item)
        : [track, ...manifest.tracks];
    await writeManifest({ ...manifest, tracks: nextTracks });

    return NextResponse.json({
        ok: true,
        fileName,
        publicUrl,
        manifestUrl: `${PUBLIC_BASE_URL}/${MANIFEST_FILE}`,
        track,
    });
}

export async function DELETE(request) {
    if (!localImportEnabled()) {
        return NextResponse.json({ ok: true, disabled: true });
    }

    let body = {};
    try {
        body = await request.json();
    } catch {
        body = {};
    }

    const trackId = String(body.trackId || body.id || '');
    const fileName = path.basename(String(body.fileName || ''));
    const titleKey = normalizeTitleKey(body.title);
    const manifest = await cleanManifest(await readManifest());
    const keptTracks = [];
    let removed = 0;

    for (const track of manifest.tracks || []) {
        const matches = (
            (trackId && track.id === trackId)
            || (fileName && track.fileName === fileName)
            || (titleKey && normalizeTitleKey(track.title) === titleKey)
        );
        if (matches) {
            removed += 1;
            await removeFileIfLocal(track.fileName);
        } else {
            keptTracks.push(track);
        }
    }

    if (fileName && !removed) {
        await removeFileIfLocal(fileName);
    }

    await writeManifest({ ...manifest, tracks: keptTracks });
    return NextResponse.json({ ok: true, removed });
}
