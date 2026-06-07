import {
    PROFESSIONAL_AUDIO_CODECS,
    PROFESSIONAL_QUALITY_PRESETS,
    PROFESSIONAL_RATE_CONTROL_MODES,
    PROFESSIONAL_RENDER_MODES,
    PROFESSIONAL_VIDEO_CODECS,
    PROFESSIONAL_VIDEO_FORMATS,
    SOCIAL_EXPORT_PRESETS,
} from '../presets/exportPresets';

const DEFAULT_FILE_NAME = 'vibefx-export';

export function sanitizeExportFileName(value = DEFAULT_FILE_NAME) {
    const sanitized = String(value || DEFAULT_FILE_NAME)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
    return sanitized || DEFAULT_FILE_NAME;
}

export function getSocialExportPreset(id = 'instagram-story-reels') {
    return SOCIAL_EXPORT_PRESETS.find((preset) => preset.id === id) || SOCIAL_EXPORT_PRESETS[2];
}

export function createDefaultProfessionalExportSettings({
    presetId = 'instagram-story-reels',
    fileName = DEFAULT_FILE_NAME,
    timelineFps = 30,
} = {}) {
    const preset = getSocialExportPreset(presetId);
    return {
        presetId: preset.id,
        file: {
            fileName: sanitizeExportFileName(fileName),
            destination: 'downloads',
            renderMode: 'singleClip',
        },
        video: {
            exportVideo: true,
            format: 'mp4',
            codec: 'h264',
            encoder: 'cloud-run-ffmpeg',
            networkOptimization: true,
            width: preset.width,
            height: preset.height,
            orientation: preset.orientation,
            frameRate: timelineFps || preset.fps || 30,
            pixelAspectRatio: 'square',
            encodingProfile: 'high',
            keyframes: 'auto',
            frameReordering: true,
            qualityPreset: 'high',
            rateControl: 'quality',
            bitrateMbps: 24,
        },
        image: {
            format: 'png',
            quality: 0.92,
            transparentBackground: false,
            retinaScale: 1,
            matchVisibleCanvas: true,
        },
        audio: {
            exportAudio: true,
            codec: 'aac',
            sampleRate: 48000,
            bitrateKbps: 256,
            channels: 'stereo',
        },
        advanced: {
            serverRenderer: true,
            allowFutureFormats: false,
            logsExpanded: false,
        },
    };
}

export function applyProfessionalPreset(settings = {}, presetId = 'instagram-story-reels') {
    const preset = getSocialExportPreset(presetId);
    return {
        ...settings,
        presetId: preset.id,
        video: {
            ...settings.video,
            width: preset.width,
            height: preset.height,
            orientation: preset.orientation,
            frameRate: settings.video?.frameRate || preset.fps || 30,
        },
    };
}

export function updateProfessionalFormat(settings = {}, formatId = 'mp4') {
    const format = PROFESSIONAL_VIDEO_FORMATS.find((item) => item.id === formatId) || PROFESSIONAL_VIDEO_FORMATS[0];
    return {
        ...settings,
        video: {
            ...settings.video,
            format: format.id,
            codec: format.defaultVideoCodec,
        },
        audio: {
            ...settings.audio,
            codec: format.defaultAudioCodec || 'none',
            exportAudio: Boolean(format.defaultAudioCodec),
        },
        image: {
            ...settings.image,
            format: ['png', 'jpeg', 'webp'].includes(format.id) ? format.id : settings.image?.format || 'png',
        },
    };
}

export function estimateProfessionalExportSize(settings = {}, durationSeconds = 0) {
    const format = settings.video?.format || 'mp4';
    const isImage = ['png', 'jpeg', 'webp'].includes(format);
    const width = Number(settings.video?.width || 1080);
    const height = Number(settings.video?.height || 1920);
    const duration = Math.max(0, Number(durationSeconds) || 0);
    const qualityMultiplier = { draft: 0.45, balanced: 0.72, high: 1, best: 1.45 }[settings.video?.qualityPreset] || 1;
    const videoBitrate = Math.max(1, Number(settings.video?.bitrateMbps || 24)) * 1_000_000;
    const audioBitrate = settings.audio?.exportAudio ? Math.max(64, Number(settings.audio?.bitrateKbps || 256)) * 1000 : 0;
    const bytes = isImage
        ? Math.round(width * height * (format === 'png' ? 1.8 : format === 'webp' ? 0.22 : 0.32) * qualityMultiplier)
        : Math.round(((videoBitrate + audioBitrate) * duration / 8) * qualityMultiplier);
    return {
        bytes,
        megabytes: bytes / 1024 / 1024,
        label: `${(bytes / 1024 / 1024).toFixed(bytes > 100 * 1024 * 1024 ? 0 : 1)} Mo`,
    };
}

export function validateProfessionalExportSettings(settings = {}, { durationSeconds = 0, renderer = 'cloud-run-ffmpeg' } = {}) {
    const errors = [];
    const warnings = [];
    const blockers = [];
    const format = PROFESSIONAL_VIDEO_FORMATS.find((item) => item.id === settings.video?.format);
    const codec = PROFESSIONAL_VIDEO_CODECS.find((item) => item.id === settings.video?.codec);
    const audioCodec = PROFESSIONAL_AUDIO_CODECS.find((item) => item.id === settings.audio?.codec);

    if (!format) errors.push('Format export inconnu.');
    if (!codec) errors.push('Codec video/image inconnu.');
    if (format && codec && !codec.formats.includes(format.id)) {
        errors.push(`Codec ${codec.label} incompatible avec ${format.label}.`);
    }
    if (!PROFESSIONAL_RENDER_MODES.includes(settings.file?.renderMode)) {
        errors.push('Mode de rendu invalide.');
    }
    if (!PROFESSIONAL_QUALITY_PRESETS.includes(settings.video?.qualityPreset)) {
        errors.push('Preset qualite invalide.');
    }
    if (!PROFESSIONAL_RATE_CONTROL_MODES.includes(settings.video?.rateControl)) {
        errors.push('Rate control invalide.');
    }
    if (Number(settings.video?.width) < 64 || Number(settings.video?.height) < 64) {
        errors.push('Resolution custom trop petite.');
    }
    if (Number(settings.video?.width) > 4096 || Number(settings.video?.height) > 4096) {
        blockers.push('Resolution superieure au plafond MVP 4096px.');
    }
    if (durationSeconds <= 0 && !['png', 'jpeg', 'webp'].includes(format?.id)) {
        errors.push('Duree timeline invalide pour un export video.');
    }
    if (settings.audio?.exportAudio && (!audioCodec || !audioCodec.formats.includes(format?.id))) {
        errors.push('Codec audio incompatible avec le container.');
    }
    if (format?.status === 'server_required') {
        blockers.push(`${format.label} est prepare dans le modele mais non rendu par le renderer final actuel.`);
    }
    if (codec?.status === 'server_required' || codec?.status === 'future') {
        blockers.push(`${codec.label} demande une extension renderer avant export final.`);
    }
    if (format?.status === 'future') {
        blockers.push(`${format.label} est une capacite future, pas un export final actif.`);
    }
    if (settings.file?.renderMode === 'individualClips') {
        blockers.push('Individual clips est reserve a une future file serveur; le MVP rend un single clip.');
    }
    if (settings.video?.pixelAspectRatio !== 'square') {
        blockers.push('Pixel aspect ratio non carre non supporte pour les exports sociaux MVP.');
    }
    if (settings.video?.frameRate === 59.94) {
        warnings.push('59.94 FPS est normalise selon le renderer; verifier le fichier final par ffprobe.');
    }
    if (settings.video?.networkOptimization !== true && format?.id === 'mp4') {
        warnings.push('Network optimization desactive: le MP4 peut demarrer moins vite en lecture web.');
    }
    if (renderer === 'cloud-run-ffmpeg' && format?.id === 'mp4' && codec?.id === 'h264') {
        warnings.push('Chemin final supporte: Cloud Run FFmpeg MP4 H.264/AAC.');
    }

    return {
        status: errors.length || blockers.length ? 'blocked' : warnings.length ? 'warning' : 'ready',
        errors: Array.from(new Set(errors)),
        blockers: Array.from(new Set(blockers)),
        warnings: Array.from(new Set(warnings)),
        supportedFinal: errors.length === 0 && blockers.length === 0,
    };
}

export function buildProfessionalRenderOverrides(settings = {}) {
    return {
        format: settings.video?.format,
        videoCodec: settings.video?.codec,
        audioCodec: settings.audio?.exportAudio ? settings.audio?.codec : '',
        encoder: settings.video?.encoder,
        networkOptimization: settings.video?.networkOptimization === true,
        pixelAspectRatio: settings.video?.pixelAspectRatio || 'square',
        encodingProfile: settings.video?.encodingProfile || 'high',
        keyframes: settings.video?.keyframes || 'auto',
        frameReordering: settings.video?.frameReordering !== false,
        rateControl: settings.video?.rateControl || 'quality',
        targetBitrate: Math.max(1, Number(settings.video?.bitrateMbps || 24)) * 1_000_000,
        audioSampleRate: settings.audio?.sampleRate || 48000,
        audioBitrate: settings.audio?.exportAudio ? Math.max(64, Number(settings.audio?.bitrateKbps || 256)) * 1000 : 0,
        audioChannels: settings.audio?.channels || 'stereo',
        exportVideo: settings.video?.exportVideo !== false,
        exportAudio: settings.audio?.exportAudio === true,
        image: settings.image,
        renderMode: settings.file?.renderMode || 'singleClip',
        destination: settings.file?.destination || 'downloads',
        fileName: sanitizeExportFileName(settings.file?.fileName),
    };
}
