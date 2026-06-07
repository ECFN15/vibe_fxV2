import { sanitizeExportFileName } from './exportSettings';

export function resolveImageContentType(format = 'png') {
    if (format === 'jpeg' || format === 'jpg') return 'image/jpeg';
    if (format === 'webp') return 'image/webp';
    return 'image/png';
}

export async function exportCanvasImage(canvas, {
    format = 'png',
    quality = 0.92,
    fileName = 'vibefx-export',
    transparentBackground = false,
} = {}) {
    if (!canvas || typeof canvas.toBlob !== 'function') {
        throw new Error('Canvas export unavailable.');
    }
    const contentType = resolveImageContentType(format);
    const normalizedQuality = Math.max(0.05, Math.min(1, Number(quality) || 0.92));
    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
            if (!result) {
                reject(new Error('Canvas image export returned an empty blob.'));
                return;
            }
            resolve(result);
        }, contentType, contentType === 'image/png' ? undefined : normalizedQuality);
    });
    return {
        blob,
        contentType,
        fileName: `${sanitizeExportFileName(fileName)}.${format === 'jpeg' ? 'jpg' : format}`,
        transparentBackground: contentType === 'image/png' && transparentBackground,
    };
}

export function compareCanvasVisualSignature(a, b, { sampleSize = 5, tolerance = 0 } = {}) {
    if (!a || !b || a.width !== b.width || a.height !== b.height) {
        return { match: false, reason: 'dimension-mismatch' };
    }
    const ctxA = a.getContext?.('2d', { willReadFrequently: true });
    const ctxB = b.getContext?.('2d', { willReadFrequently: true });
    if (!ctxA || !ctxB) return { match: false, reason: 'context-unavailable' };
    const points = [];
    for (let y = 1; y <= sampleSize; y += 1) {
        for (let x = 1; x <= sampleSize; x += 1) {
            points.push([
                Math.floor((a.width * x) / (sampleSize + 1)),
                Math.floor((a.height * y) / (sampleSize + 1)),
            ]);
        }
    }
    const mismatches = points.filter(([x, y]) => {
        const pa = ctxA.getImageData(x, y, 1, 1).data;
        const pb = ctxB.getImageData(x, y, 1, 1).data;
        return Math.abs(pa[0] - pb[0]) > tolerance
            || Math.abs(pa[1] - pb[1]) > tolerance
            || Math.abs(pa[2] - pb[2]) > tolerance
            || Math.abs(pa[3] - pb[3]) > tolerance;
    });
    return { match: mismatches.length === 0, mismatches: mismatches.length, samples: points.length };
}
