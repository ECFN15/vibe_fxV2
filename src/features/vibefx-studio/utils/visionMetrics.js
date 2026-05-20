const DEFAULT_STEP = 4;
const CLIP_LOW = 3;
const CLIP_HIGH = 252;

const clamp01 = (value) => Math.max(0, Math.min(1, value));

function rgbToHsl(r, g, b) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;
    const lightness = (max + min) / 2;
    const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
    let hue = 0;

    if (delta !== 0) {
        if (max === rn) {
            hue = 60 * (((gn - bn) / delta) % 6);
        } else if (max === gn) {
            hue = 60 * (((bn - rn) / delta) + 2);
        } else {
            hue = 60 * (((rn - gn) / delta) + 4);
        }
    }

    return {
        hue: hue < 0 ? hue + 360 : hue,
        saturation: clamp01(saturation),
        lightness,
    };
}

function circularHueDistance(a, b) {
    const raw = Math.abs(a - b) % 360;
    return raw > 180 ? 360 - raw : raw;
}

function circularMeanDegrees(x, y) {
    if (x === 0 && y === 0) return 0;
    const degrees = Math.atan2(y, x) * 180 / Math.PI;
    return degrees < 0 ? degrees + 360 : degrees;
}

function isLikelySkinTone(r, g, b, hsl, luma) {
    const { hue, saturation } = hsl;
    const maxChannel = Math.max(r, g, b);
    const minChannel = Math.min(r, g, b);
    const chroma = maxChannel - minChannel;

    return luma >= 35
        && luma <= 235
        && saturation >= 0.12
        && saturation <= 0.74
        && chroma >= 16
        && hue >= 8
        && hue <= 58
        && r >= g * 0.82
        && r >= b * 1.02
        && g >= b * 0.78;
}

function percentileFromHistogram(histogram, total, percentile) {
    if (!total) return 0;
    const target = total * percentile;
    let running = 0;
    for (let index = 0; index < histogram.length; index += 1) {
        running += histogram[index];
        if (running >= target) return index;
    }
    return 255;
}

export function measureVisionImageData(imageData, options = {}) {
    const { data, width, height } = imageData || {};
    if (!data || !width || !height) {
        throw new Error('measureVisionImageData requires image data, width and height.');
    }

    const step = Math.max(1, Math.floor(options.step || DEFAULT_STEP));
    const histogram = new Array(256).fill(0);
    let pixels = 0;
    let lumaSum = 0;
    let lumaSqSum = 0;
    let saturationSum = 0;
    let maxSaturation = 0;
    let highSaturationPixels = 0;
    let channelClipHigh = 0;
    let channelClipLow = 0;
    let clippedHighlightPixels = 0;
    let crushedBlackPixels = 0;
    let neutralPixels = 0;
    let neutralChromaSum = 0;
    let protectedNeutralPixels = 0;
    let protectedNeutralChromaSum = 0;
    let protectedNeutralWarmCoolBiasSum = 0;
    let protectedNeutralGreenMagentaBiasSum = 0;
    let skinPixels = 0;
    let skinSaturationSum = 0;
    let skinLumaSum = 0;
    let skinHueX = 0;
    let skinHueY = 0;

    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
            const index = (y * width + x) * 4;
            const alpha = data[index + 3];
            if (alpha === 0) continue;

            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const luma = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
            const hsl = rgbToHsl(r, g, b);
            const saturation = hsl.saturation;
            const maxChannel = Math.max(r, g, b);
            const minChannel = Math.min(r, g, b);
            const chroma = maxChannel - minChannel;

            pixels += 1;
            histogram[luma] += 1;
            lumaSum += luma;
            lumaSqSum += luma * luma;
            saturationSum += saturation;
            maxSaturation = Math.max(maxSaturation, saturation);
            if (saturation > 0.82) highSaturationPixels += 1;
            if (r >= CLIP_HIGH) channelClipHigh += 1;
            if (g >= CLIP_HIGH) channelClipHigh += 1;
            if (b >= CLIP_HIGH) channelClipHigh += 1;
            if (r <= CLIP_LOW) channelClipLow += 1;
            if (g <= CLIP_LOW) channelClipLow += 1;
            if (b <= CLIP_LOW) channelClipLow += 1;
            if (maxChannel >= CLIP_HIGH && minChannel >= 235) clippedHighlightPixels += 1;
            if (luma <= 8) crushedBlackPixels += 1;
            if (chroma <= 8 && luma > 16 && luma < 245) {
                neutralPixels += 1;
                neutralChromaSum += chroma;
            }
            if (chroma <= 24 && luma > 18 && luma < 245) {
                protectedNeutralPixels += 1;
                protectedNeutralChromaSum += chroma;
                protectedNeutralWarmCoolBiasSum += r - b;
                protectedNeutralGreenMagentaBiasSum += g - ((r + b) / 2);
            }
            if (isLikelySkinTone(r, g, b, hsl, luma)) {
                const radians = hsl.hue * Math.PI / 180;
                const weight = Math.max(0.2, saturation);
                skinPixels += 1;
                skinSaturationSum += saturation;
                skinLumaSum += luma;
                skinHueX += Math.cos(radians) * weight;
                skinHueY += Math.sin(radians) * weight;
            }
        }
    }

    const meanLuma = pixels ? lumaSum / pixels : 0;
    const variance = pixels ? Math.max(0, (lumaSqSum / pixels) - (meanLuma * meanLuma)) : 0;

    return {
        pixels,
        meanLuma,
        lumaStdDev: Math.sqrt(variance),
        lumaP01: percentileFromHistogram(histogram, pixels, 0.01),
        lumaP05: percentileFromHistogram(histogram, pixels, 0.05),
        lumaP50: percentileFromHistogram(histogram, pixels, 0.5),
        lumaP95: percentileFromHistogram(histogram, pixels, 0.95),
        lumaP99: percentileFromHistogram(histogram, pixels, 0.99),
        averageSaturation: pixels ? saturationSum / pixels : 0,
        maxSaturation,
        highSaturationRatio: pixels ? highSaturationPixels / pixels : 0,
        channelClipHighRatio: pixels ? channelClipHigh / (pixels * 3) : 0,
        channelClipLowRatio: pixels ? channelClipLow / (pixels * 3) : 0,
        clippedHighlightRatio: pixels ? clippedHighlightPixels / pixels : 0,
        crushedBlackRatio: pixels ? crushedBlackPixels / pixels : 0,
        neutralRatio: pixels ? neutralPixels / pixels : 0,
        averageNeutralChroma: neutralPixels ? neutralChromaSum / neutralPixels : 0,
        protectedNeutralRatio: pixels ? protectedNeutralPixels / pixels : 0,
        averageProtectedNeutralChroma: protectedNeutralPixels ? protectedNeutralChromaSum / protectedNeutralPixels : 0,
        averageProtectedNeutralWarmCoolBias: protectedNeutralPixels ? protectedNeutralWarmCoolBiasSum / protectedNeutralPixels : 0,
        averageProtectedNeutralGreenMagentaBias: protectedNeutralPixels ? protectedNeutralGreenMagentaBiasSum / protectedNeutralPixels : 0,
        skinToneRatio: pixels ? skinPixels / pixels : 0,
        averageSkinHue: skinPixels ? circularMeanDegrees(skinHueX, skinHueY) : 0,
        averageSkinSaturation: skinPixels ? skinSaturationSum / skinPixels : 0,
        averageSkinLuma: skinPixels ? skinLumaSum / skinPixels : 0,
        histogram,
    };
}

export function compareVisionMetrics(before, after) {
    const contrastRatio = before?.lumaStdDev ? after.lumaStdDev / before.lumaStdDev : 1;
    const saturationRatio = before?.averageSaturation ? after.averageSaturation / before.averageSaturation : 1;
    const greyVeilRisk = contrastRatio < 0.74
        && saturationRatio < 0.88
        && after.lumaP05 > before.lumaP05 + 8;
    const hasComparableSkin = before.skinToneRatio > 0.01 && after.skinToneRatio > 0.01;
    const hasComparableProtectedNeutrals = before.protectedNeutralRatio > 0.01 && after.protectedNeutralRatio > 0.01;

    return {
        meanLumaDelta: after.meanLuma - before.meanLuma,
        lumaStdDevDelta: after.lumaStdDev - before.lumaStdDev,
        contrastRatio,
        saturationDelta: after.averageSaturation - before.averageSaturation,
        saturationRatio,
        highSaturationDelta: after.highSaturationRatio - before.highSaturationRatio,
        channelClipHighDelta: after.channelClipHighRatio - before.channelClipHighRatio,
        channelClipLowDelta: after.channelClipLowRatio - before.channelClipLowRatio,
        crushedBlackDelta: after.crushedBlackRatio - before.crushedBlackRatio,
        clippedHighlightDelta: after.clippedHighlightRatio - before.clippedHighlightRatio,
        neutralChromaDelta: after.averageNeutralChroma - before.averageNeutralChroma,
        protectedNeutralChromaDelta: after.averageProtectedNeutralChroma - before.averageProtectedNeutralChroma,
        protectedNeutralWarmCoolBiasDelta: after.averageProtectedNeutralWarmCoolBias - before.averageProtectedNeutralWarmCoolBias,
        protectedNeutralGreenMagentaBiasDelta: after.averageProtectedNeutralGreenMagentaBias - before.averageProtectedNeutralGreenMagentaBias,
        protectedNeutralBiasDelta: hasComparableProtectedNeutrals
            ? Math.hypot(
                after.averageProtectedNeutralWarmCoolBias - before.averageProtectedNeutralWarmCoolBias,
                after.averageProtectedNeutralGreenMagentaBias - before.averageProtectedNeutralGreenMagentaBias,
            )
            : 0,
        skinHueShiftDeg: hasComparableSkin ? circularHueDistance(before.averageSkinHue, after.averageSkinHue) : 0,
        skinSaturationDelta: hasComparableSkin ? after.averageSkinSaturation - before.averageSkinSaturation : 0,
        skinLumaDelta: hasComparableSkin ? after.averageSkinLuma - before.averageSkinLuma : 0,
        skinToneRatioDelta: after.skinToneRatio - before.skinToneRatio,
        greyVeilRisk,
    };
}
