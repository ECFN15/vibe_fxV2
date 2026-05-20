const DEFAULT_STEP = 4;
const CLIP_LOW = 3;
const CLIP_HIGH = 252;

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smoothstep = (edge0, edge1, value) => {
    if (edge0 === edge1) return value >= edge1 ? 1 : 0;
    const t = clamp01((value - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
};

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

function hueRangeWeight(hue, center, radius) {
    const distance = circularHueDistance(hue, center);
    return 1 - smoothstep(radius * 0.62, radius, distance);
}

function buildHueBandAccumulator() {
    return {
        pixels: 0,
        saturationSum: 0,
        highSaturationPixels: 0,
        clipHighPixels: 0,
    };
}

function addHueBandSample(accumulator, weight, saturation, clippedChannelCount) {
    if (weight <= 0.04) return;
    accumulator.pixels += weight;
    accumulator.saturationSum += saturation * weight;
    if (saturation > 0.82) accumulator.highSaturationPixels += weight;
    if (clippedChannelCount > 0) accumulator.clipHighPixels += weight;
}

function summarizeHueBand(accumulator, pixels) {
    return {
        ratio: pixels ? accumulator.pixels / pixels : 0,
        averageSaturation: accumulator.pixels ? accumulator.saturationSum / accumulator.pixels : 0,
        highSaturationRatio: accumulator.pixels ? accumulator.highSaturationPixels / accumulator.pixels : 0,
        clipHighRatio: accumulator.pixels ? accumulator.clipHighPixels / accumulator.pixels : 0,
    };
}

function skinToneWeight(r, g, b, hsl, luma) {
    const { hue, saturation } = hsl;
    const maxChannel = Math.max(r, g, b);
    const minChannel = Math.min(r, g, b);
    const chroma = maxChannel - minChannel;
    const total = Math.max(1, r + g + b);
    const rn = r / total;
    const gn = g / total;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    const ycbcrDistance = Math.hypot((cb - 108) / 36, (cr - 154) / 32);

    const lumaWeight = smoothstep(22, 48, luma) * (1 - smoothstep(232, 248, luma));
    const chromaWeight = smoothstep(10, 26, chroma) * (1 - smoothstep(118, 172, chroma));
    const saturationWeight = smoothstep(0.08, 0.18, saturation) * (1 - smoothstep(0.78, 0.92, saturation));
    const hueCore = hue >= 8 && hue <= 62 ? 1 : 0;
    const hueSoft = hue >= 350 || hue <= 76 ? 0.58 : 0;
    const hueWeight = Math.max(hueCore, hueSoft);
    const channelShape = r >= g * 0.78 && r >= b * 0.96 && g >= b * 0.68 ? 1 : 0;
    const normalizedRgbShape = rn >= 0.33 && rn <= 0.52 && gn >= 0.25 && gn <= 0.39 ? 1 : 0;
    const ycbcrWeight = 1 - smoothstep(0.72, 1.55, ycbcrDistance);
    const shapeWeight = Math.max(channelShape * 0.72, normalizedRgbShape * 0.58, ycbcrWeight);

    return clamp01(lumaWeight * chromaWeight * saturationWeight * hueWeight * shapeWeight);
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
    let skinConfidenceSum = 0;
    let skinSaturationSum = 0;
    let skinLumaSum = 0;
    let skinHueX = 0;
    let skinHueY = 0;
    const skyBand = buildHueBandAccumulator();
    const foliageBand = buildHueBandAccumulator();
    const warmBand = buildHueBandAccumulator();

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
            const clippedChannelCount = (r >= CLIP_HIGH ? 1 : 0) + (g >= CLIP_HIGH ? 1 : 0) + (b >= CLIP_HIGH ? 1 : 0);

            pixels += 1;
            histogram[luma] += 1;
            lumaSum += luma;
            lumaSqSum += luma * luma;
            saturationSum += saturation;
            maxSaturation = Math.max(maxSaturation, saturation);
            if (saturation > 0.82) highSaturationPixels += 1;
            channelClipHigh += clippedChannelCount;
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
            const skinWeight = skinToneWeight(r, g, b, hsl, luma);
            if (skinWeight > 0.08) {
                const radians = hsl.hue * Math.PI / 180;
                const weight = skinWeight * Math.max(0.24, saturation);
                skinPixels += skinWeight;
                skinConfidenceSum += skinWeight;
                skinSaturationSum += saturation * skinWeight;
                skinLumaSum += luma * skinWeight;
                skinHueX += Math.cos(radians) * weight;
                skinHueY += Math.sin(radians) * weight;
            }

            const colorWeight = smoothstep(0.1, 0.22, saturation) * smoothstep(16, 44, chroma);
            const highlightGuard = 1 - smoothstep(236, 252, luma);
            const shadowGuard = smoothstep(18, 42, luma);
            addHueBandSample(
                skyBand,
                hueRangeWeight(hsl.hue, 210, 46) * colorWeight * smoothstep(52, 96, luma) * highlightGuard,
                saturation,
                clippedChannelCount,
            );
            addHueBandSample(
                foliageBand,
                hueRangeWeight(hsl.hue, 112, 58) * colorWeight * shadowGuard * highlightGuard,
                saturation,
                clippedChannelCount,
            );
            addHueBandSample(
                warmBand,
                Math.max(hueRangeWeight(hsl.hue, 18, 42), hueRangeWeight(hsl.hue, 358, 26)) * colorWeight * shadowGuard * highlightGuard,
                saturation,
                clippedChannelCount,
            );
        }
    }

    const meanLuma = pixels ? lumaSum / pixels : 0;
    const variance = pixels ? Math.max(0, (lumaSqSum / pixels) - (meanLuma * meanLuma)) : 0;
    const skySummary = summarizeHueBand(skyBand, pixels);
    const foliageSummary = summarizeHueBand(foliageBand, pixels);
    const warmSummary = summarizeHueBand(warmBand, pixels);

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
        skinToneConfidence: pixels ? skinConfidenceSum / pixels : 0,
        averageSkinHue: skinPixels ? circularMeanDegrees(skinHueX, skinHueY) : 0,
        averageSkinSaturation: skinPixels ? skinSaturationSum / skinPixels : 0,
        averageSkinLuma: skinPixels ? skinLumaSum / skinPixels : 0,
        skyToneRatio: skySummary.ratio,
        averageSkySaturation: skySummary.averageSaturation,
        skyHighSaturationRatio: skySummary.highSaturationRatio,
        skyClipHighRatio: skySummary.clipHighRatio,
        foliageToneRatio: foliageSummary.ratio,
        averageFoliageSaturation: foliageSummary.averageSaturation,
        foliageHighSaturationRatio: foliageSummary.highSaturationRatio,
        foliageClipHighRatio: foliageSummary.clipHighRatio,
        warmToneRatio: warmSummary.ratio,
        averageWarmSaturation: warmSummary.averageSaturation,
        warmHighSaturationRatio: warmSummary.highSaturationRatio,
        warmClipHighRatio: warmSummary.clipHighRatio,
        histogram,
    };
}

export function compareVisionMetrics(before, after) {
    const contrastRatio = before?.lumaStdDev ? after.lumaStdDev / before.lumaStdDev : 1;
    const saturationRatio = before?.averageSaturation ? after.averageSaturation / before.averageSaturation : 1;
    const beforeTonalRange = Math.max(0, (before?.lumaP95 || 0) - (before?.lumaP05 || 0));
    const afterTonalRange = Math.max(0, (after?.lumaP95 || 0) - (after?.lumaP05 || 0));
    const tonalRangeRatio = beforeTonalRange ? afterTonalRange / beforeTonalRange : 1;
    const shadowLiftDelta = (after?.lumaP05 || 0) - (before?.lumaP05 || 0);
    const midtoneLiftDelta = (after?.lumaP50 || 0) - (before?.lumaP50 || 0);
    const highlightCompressionDelta = (before?.lumaP95 || 0) - (after?.lumaP95 || 0);
    const greyVeilScore = (
        clamp01((0.86 - contrastRatio) / 0.34) * 0.32
        + clamp01((0.86 - tonalRangeRatio) / 0.34) * 0.28
        + clamp01((0.94 - saturationRatio) / 0.38) * 0.2
        + clamp01((shadowLiftDelta - 5) / 26) * 0.14
        + clamp01((midtoneLiftDelta - 3) / 20) * 0.06
    );
    const greyVeilRisk = (
        greyVeilScore >= 0.52
        && shadowLiftDelta > 6
        && saturationRatio < 0.96
        && (contrastRatio < 0.82 || tonalRangeRatio < 0.82)
    ) || (
        contrastRatio < 0.74
        && saturationRatio < 0.88
        && shadowLiftDelta > 8
    );
    const hasComparableSkin = before.skinToneRatio > 0.01 && after.skinToneRatio > 0.01;
    const hasComparableProtectedNeutrals = before.protectedNeutralRatio > 0.01 && after.protectedNeutralRatio > 0.01;
    const hasComparableSky = before.skyToneRatio > 0.01 && after.skyToneRatio > 0.01;
    const hasComparableFoliage = before.foliageToneRatio > 0.01 && after.foliageToneRatio > 0.01;
    const hasComparableWarm = before.warmToneRatio > 0.01 && after.warmToneRatio > 0.01;

    return {
        meanLumaDelta: after.meanLuma - before.meanLuma,
        lumaStdDevDelta: after.lumaStdDev - before.lumaStdDev,
        contrastRatio,
        tonalRangeBefore: beforeTonalRange,
        tonalRangeAfter: afterTonalRange,
        tonalRangeDelta: afterTonalRange - beforeTonalRange,
        tonalRangeRatio,
        shadowLiftDelta,
        midtoneLiftDelta,
        highlightCompressionDelta,
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
        skySaturationDelta: hasComparableSky ? after.averageSkySaturation - before.averageSkySaturation : 0,
        skyHighSaturationDelta: after.skyHighSaturationRatio - before.skyHighSaturationRatio,
        skyClipHighDelta: after.skyClipHighRatio - before.skyClipHighRatio,
        foliageSaturationDelta: hasComparableFoliage ? after.averageFoliageSaturation - before.averageFoliageSaturation : 0,
        foliageHighSaturationDelta: after.foliageHighSaturationRatio - before.foliageHighSaturationRatio,
        foliageClipHighDelta: after.foliageClipHighRatio - before.foliageClipHighRatio,
        warmSaturationDelta: hasComparableWarm ? after.averageWarmSaturation - before.averageWarmSaturation : 0,
        warmHighSaturationDelta: after.warmHighSaturationRatio - before.warmHighSaturationRatio,
        warmClipHighDelta: after.warmClipHighRatio - before.warmClipHighRatio,
        greyVeilScore,
        greyVeilRisk,
    };
}
