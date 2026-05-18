// ═══════════════════════════════════════════════════════════
//  CANVAS UTILITIES — Vision Pro Colorimetry Engine v3
//
//  v2 → v3 Changelog:
//  - Fused pixel ops (4× getImageData → 1×) = perf ×4
//  - Physical blackbody temperature model (Tanner Helland)
//  - Added: Highlights, Shadows, Vibrance, Dehaze
//  - Added: Clarity (spatial high-pass), Sharpness (unsharp mask)
//  - Improved grain: 512px, Box-Muller gaussian
// ═══════════════════════════════════════════════════════════

// ── Improved Noise Pattern (512px, Box-Muller Gaussian) ──
export const createNoisePattern = () => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const idata = ctx.createImageData(size, size);
    const data = idata.data;
    for (let i = 0; i < data.length; i += 4) {
        const u1 = Math.random() || 0.0001;
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const val = Math.max(0, Math.min(255, Math.round(128 + z * 50)));
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
        data[i + 3] = Math.floor(Math.random() * 70);
    }
    ctx.putImageData(idata, 0, 0);
    return canvas;
};

export const NOISE_PATTERN_CANVAS = createNoisePattern();

// ── Tone Curve LUT Builder ───────────────────────────────
export function buildCurveLUT(points) {
    if (!points || points.length !== 5) {
        const lut = new Uint8Array(256);
        for (let i = 0; i < 256; i++) lut[i] = i;
        return lut;
    }
    const xs = [0, 64, 128, 192, 255];
    const ys = points;
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
        let seg = 0;
        for (let s = 0; s < 4; s++) {
            if (i >= xs[s] && i <= xs[s + 1]) { seg = s; break; }
        }
        if (i > xs[4]) seg = 3;
        const x0 = xs[seg], x1 = xs[seg + 1];
        const y0 = ys[seg], y1 = ys[seg + 1];
        const t = x1 === x0 ? 0 : (i - x0) / (x1 - x0);
        const t2 = t * t;
        const t3 = t2 * t;
        const h = 3 * t2 - 2 * t3;
        const val = y0 + (y1 - y0) * h;
        lut[i] = Math.max(0, Math.min(255, Math.round(val)));
    }
    return lut;
}

// ── Physical Temperature (Tanner Helland Blackbody) ──────
function blackbodyToRGB(kelvin) {
    const t = kelvin / 100;
    let r, g, b;
    if (t <= 66) {
        r = 255;
        g = Math.max(0, Math.min(255, 99.4708 * Math.log(t) - 161.1196));
    } else {
        r = Math.max(0, Math.min(255, 329.6987 * Math.pow(t - 60, -0.1332)));
        g = Math.max(0, Math.min(255, 288.1222 * Math.pow(t - 60, -0.0755)));
    }
    if (t >= 66) b = 255;
    else if (t <= 19) b = 0;
    else b = Math.max(0, Math.min(255, 138.5177 * Math.log(t - 10) - 305.0448));
    return { r, g, b };
}

function getTemperatureMultipliers(temperature) {
    if (!temperature || temperature === 0) return null;
    const kelvin = Math.max(2000, Math.min(12000, 6500 - temperature * 35));
    const target = blackbodyToRGB(kelvin);
    const neutral = blackbodyToRGB(6500);
    let rM = target.r / (neutral.r || 1);
    let gM = target.g / (neutral.g || 1);
    let bM = target.b / (neutral.b || 1);
    const mx = Math.max(rM, gM, bM);
    if (mx > 0) { rM /= mx; gM /= mx; bM /= mx; }
    const s = 0.5;
    return { rMul: 1 + (rM - 1) * s, gMul: 1 + (gM - 1) * s, bMul: 1 + (bM - 1) * s };
}

// ── Hex to RGB ───────────────────────────────────────────
function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 0, g: 0, b: 0 };
}

// ═══════════════════════════════════════════════════════════
//  FUSED PIXEL OPS — Single getImageData/putImageData pass
//  Merges: Curves + Highlights/Shadows + Temperature +
//          Dehaze + Faded Blacks + Split Toning + Vibrance
// ═══════════════════════════════════════════════════════════
export function applyFusedPixelOps(ctx, w, h, filters) {
    const hasCustomCurve = (c) => c && (c[0] !== 0 || c[1] !== 64 || c[2] !== 128 || c[3] !== 192 || c[4] !== 255);

    const needsCurves = hasCustomCurve(filters.toneCurveR) || hasCustomCurve(filters.toneCurveG) ||
        hasCustomCurve(filters.toneCurveB) || hasCustomCurve(filters.toneCurveMaster);
    const temp = filters.temperature || 0;
    const faded = filters.fadedBlacks || 0;
    const shTintInt = filters.shadowTintIntensity || 0;
    const hlTintInt = filters.highlightTintIntensity || 0;
    const hl = filters.highlights || 0;
    const sh = filters.shadows || 0;
    const vib = filters.vibrance || 0;
    const dh = filters.dehaze || 0;

    if (!needsCurves && temp === 0 && faded === 0 && shTintInt === 0 &&
        hlTintInt === 0 && hl === 0 && sh === 0 && vib === 0 && dh === 0) return;

    // ── Pre-compute outside the pixel loop ──
    const lutR = buildCurveLUT(filters.toneCurveR);
    const lutG = buildCurveLUT(filters.toneCurveG);
    const lutB = buildCurveLUT(filters.toneCurveB);
    const lutM = buildCurveLUT(filters.toneCurveMaster);
    const tempMul = getTemperatureMultipliers(temp);
    const lift = faded * 2.55;
    const shRgb = hexToRgb(filters.shadowTint || '#000000');
    const hlRgb = hexToRgb(filters.highlightTint || '#ffffff');
    const hlAmt = hl / 100;
    const shAmt = sh / 100;
    const vibAmt = vib / 100;
    const dhAmt = dh / 100;

    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;

    for (let i = 0; i < d.length; i += 4) {
        let r = d[i], g = d[i + 1], b = d[i + 2];

        // 1. Tone Curves
        if (needsCurves) {
            r = lutR[lutM[r]];
            g = lutG[lutM[g]];
            b = lutB[lutM[b]];
        }

        // 2. Highlights / Shadows
        if (hl !== 0 || sh !== 0) {
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            const ln = lum / 255;
            if (hl !== 0) {
                const w2 = ln * ln;
                const shift = -hlAmt * 80 * w2;
                r += shift; g += shift; b += shift;
            }
            if (sh !== 0) {
                const w2 = (1 - ln) * (1 - ln);
                const shift = shAmt * 80 * w2;
                r += shift; g += shift; b += shift;
            }
        }

        // 3. Temperature (physical blackbody)
        if (tempMul) {
            r *= tempMul.rMul;
            g *= tempMul.gMul;
            b *= tempMul.bMul;
        }

        // 4. Dehaze
        if (dh > 0) {
            const minCh = Math.min(r, g, b);
            const haze = minCh * dhAmt * 0.4;
            r -= haze; g -= haze; b -= haze;
            r += (r - 128) * dhAmt * 0.15;
            g += (g - 128) * dhAmt * 0.15;
            b += (b - 128) * dhAmt * 0.15;
        }

        // 5. Faded Blacks
        if (faded > 0) {
            r = r + (lift - r * lift / 255);
            g = g + (lift - g * lift / 255);
            b = b + (lift - b * lift / 255);
        }

        // 6. Split Toning
        if (shTintInt > 0 || hlTintInt > 0) {
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            if (shTintInt > 0) {
                const sw = (1 - lum / 255) * (shTintInt / 100) * 0.5;
                r += (shRgb.r - r) * sw;
                g += (shRgb.g - g) * sw;
                b += (shRgb.b - b) * sw;
            }
            if (hlTintInt > 0) {
                const hw = (lum / 255) * (hlTintInt / 100) * 0.5;
                r += (hlRgb.r - r) * hw;
                g += (hlRgb.g - g) * hw;
                b += (hlRgb.b - b) * hw;
            }
        }

        // 7. Vibrance (smart saturation — protects already-saturated colors)
        if (vib !== 0) {
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            const curSat = maxC > 0 ? (maxC - minC) / maxC : 0;
            const avg = (r + g + b) / 3;
            const vs = vibAmt * (1 - curSat) * 0.7;
            r += (r - avg) * vs;
            g += (g - avg) * vs;
            b += (b - avg) * vs;
        }

        d[i] = Math.max(0, Math.min(255, r));
        d[i + 1] = Math.max(0, Math.min(255, g));
        d[i + 2] = Math.max(0, Math.min(255, b));
    }

    ctx.putImageData(imageData, 0, 0);
}

// ═══════════════════════════════════════════════════════════
//  CLARITY — Spatial high-pass mid-frequency boost
// ═══════════════════════════════════════════════════════════
export function applyClarity(ctx, canvas, w, h, clarity) {
    if (!clarity || clarity === 0) return;

    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = w;
    blurCanvas.height = h;
    const blurCtx = blurCanvas.getContext('2d');
    const radius = Math.max(15, Math.min(w, h) * 0.025);
    blurCtx.filter = `blur(${radius}px)`;
    blurCtx.drawImage(canvas, 0, 0);

    const origData = ctx.getImageData(0, 0, w, h);
    const blurData = blurCtx.getImageData(0, 0, w, h);
    const od = origData.data;
    const bd = blurData.data;
    const amount = clarity / 100;

    for (let i = 0; i < od.length; i += 4) {
        od[i] = Math.max(0, Math.min(255, od[i] + (od[i] - bd[i]) * amount));
        od[i + 1] = Math.max(0, Math.min(255, od[i + 1] + (od[i + 1] - bd[i + 1]) * amount));
        od[i + 2] = Math.max(0, Math.min(255, od[i + 2] + (od[i + 2] - bd[i + 2]) * amount));
    }

    ctx.putImageData(origData, 0, 0);
}

// ═══════════════════════════════════════════════════════════
//  SHARPNESS — Unsharp mask (small radius)
// ═══════════════════════════════════════════════════════════
export function applySharpness(ctx, canvas, w, h, sharpness) {
    if (!sharpness || sharpness === 0) return;

    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = w;
    blurCanvas.height = h;
    const blurCtx = blurCanvas.getContext('2d');
    blurCtx.filter = `blur(1.5px)`;
    blurCtx.drawImage(canvas, 0, 0);

    const origData = ctx.getImageData(0, 0, w, h);
    const blurData = blurCtx.getImageData(0, 0, w, h);
    const od = origData.data;
    const bd = blurData.data;
    const amount = sharpness / 50;

    for (let i = 0; i < od.length; i += 4) {
        od[i] = Math.max(0, Math.min(255, od[i] + (od[i] - bd[i]) * amount));
        od[i + 1] = Math.max(0, Math.min(255, od[i + 1] + (od[i + 1] - bd[i + 1]) * amount));
        od[i + 2] = Math.max(0, Math.min(255, od[i + 2] + (od[i + 2] - bd[i + 2]) * amount));
    }

    ctx.putImageData(origData, 0, 0);
}

// ═══════════════════════════════════════════════════════════
//  HALATION — CineStill signature glow (unchanged from v2)
// ═══════════════════════════════════════════════════════════
export function applyHalation(ctx, w, h, halation, halationColor) {
    if (!halation || halation === 0) return;
    const haloRgb = hexToRgb(halationColor || '#ff4500');
    const imageData = ctx.getImageData(0, 0, w, h);
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w;
    maskCanvas.height = h;
    const maskCtx = maskCanvas.getContext('2d');
    const maskData = maskCtx.createImageData(w, h);
    const threshold = 200;
    for (let i = 0; i < imageData.data.length; i += 4) {
        const lum = 0.299 * imageData.data[i] + 0.587 * imageData.data[i + 1] + 0.114 * imageData.data[i + 2];
        if (lum > threshold) {
            const strength = (lum - threshold) / (255 - threshold);
            maskData.data[i] = haloRgb.r;
            maskData.data[i + 1] = haloRgb.g;
            maskData.data[i + 2] = haloRgb.b;
            maskData.data[i + 3] = Math.floor(strength * 255);
        }
    }
    maskCtx.putImageData(maskData, 0, 0);
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = w;
    blurCanvas.height = h;
    const blurCtx = blurCanvas.getContext('2d');
    const blurRadius = Math.max(10, Math.min(w, h) * 0.03) * (halation / 50);
    blurCtx.filter = `blur(${blurRadius}px)`;
    blurCtx.drawImage(maskCanvas, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = Math.min(1, halation / 60);
    ctx.drawImage(blurCanvas, 0, 0);
    ctx.restore();
}
