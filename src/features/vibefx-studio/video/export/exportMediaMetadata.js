export function resolveOutputMediaMetadata({ render = {}, output = {}, activeMode = 'localMock' } = {}) {
    if (output.mockOnly || activeMode === 'localMock') {
        return {
            container: 'mock',
            codec: 'simulation',
            contentType: 'aucun fichier',
        };
    }

    const format = String(render.format || '').toLowerCase();
    const contentType = output.contentType || formatToContentType(format);
    const container = format ? format.toUpperCase() : contentTypeToContainer(contentType);
    if (contentType.startsWith('image/')) {
        return {
            container,
            codec: formatCodecLabel(render.videoCodec || format || container, container),
            contentType,
        };
    }

    const videoCodec = formatCodecLabel(render.videoCodec, contentType === 'video/mp4' ? 'H.264' : 'video');
    const audioCodec = formatCodecLabel(render.audioCodec, contentType === 'video/mp4' ? 'AAC' : 'audio');

    return {
        container,
        codec: `${videoCodec}/${audioCodec}`,
        contentType,
    };
}

export function formatToContentType(format = '') {
    const normalized = String(format || '').trim().toLowerCase();
    if (normalized === 'webm') return 'video/webm';
    if (normalized === 'mov') return 'video/quicktime';
    if (normalized === 'png') return 'image/png';
    if (normalized === 'jpeg' || normalized === 'jpg') return 'image/jpeg';
    if (normalized === 'webp') return 'image/webp';
    return 'video/mp4';
}

export function formatCodecLabel(codec = '', fallback = 'video') {
    const normalized = String(codec || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (!normalized) return fallback;
    if (normalized === 'h264' || normalized === 'avc') return 'H.264';
    if (normalized === 'h265' || normalized === 'hevc') return 'H.265/HEVC';
    if (normalized === 'aac') return 'AAC';
    if (normalized === 'opus') return 'Opus';
    if (normalized === 'vp9') return 'VP9';
    if (normalized === 'vp8') return 'VP8';
    if (normalized === 'av1') return 'AV1';
    if (normalized === 'prores') return 'ProRes';
    if (normalized === 'dnxhr') return 'DNxHR';
    return String(codec).toUpperCase();
}

export function contentTypeToContainer(contentType = '') {
    const normalized = String(contentType || '').toLowerCase();
    if (normalized.includes('webm')) return 'WEBM';
    if (normalized.includes('quicktime')) return 'MOV';
    if (normalized.includes('png')) return 'PNG';
    if (normalized.includes('jpeg')) return 'JPEG';
    if (normalized.includes('webp')) return 'WEBP';
    return 'MP4';
}
