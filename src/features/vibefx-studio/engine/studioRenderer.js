import {
    NOISE_PATTERN_CANVAS,
    applyFusedPixelOps,
    applyClarity,
    applySharpness,
    applyHalation,
    applyPerceptualIntensityBlend,
    applySmartphoneOutputGuards
} from '../utils/canvasUtils';
import { normalizeVisionFilters } from '../utils/visionColorScience';

/**
 * renderStudio — Rendu du mode Studio/Fusion (crop, overlay, filtres).
 * Pipeline Vision Pro v3 — 10 étapes, fused pixel ops.
 */
export function renderStudio(ctx, targetCanvas, w, h, isPreview, quality, {
    images, cropRatio, cropPos, cropScale, isCropping,
    overlayImage, overlayOpacity, overlayScale, overlayPos, blendMode,
    filters, view, fusionConfig, selectedImgIndex
}) {
    const img = images[0];

    if (view === 'fusion' && fusionConfig) {
        if (fusionConfig.bgMode === 'image' && fusionConfig.bgImage) {
            ctx.save();
            const bgImg = fusionConfig.bgImage;

            // Safer fill logic (cover)
            const bgRatio = bgImg.width / bgImg.height || 1;
            const canvasRatio = w / h;
            let drawW, drawH, drawX, drawY;

            if (bgRatio > canvasRatio) {
                drawW = h * bgRatio;
                drawH = h;
                drawX = (w - drawW) / 2;
                drawY = 0;
            } else {
                drawW = w;
                drawH = w / bgRatio;
                drawX = 0;
                drawY = (h - drawH) / 2;
            }

            try {
                ctx.drawImage(bgImg, drawX, drawY, drawW, drawH);
            } catch (e) {
                console.warn("Background drawing failed:", e);
                renderFusionGradient(ctx, w, h, fusionConfig.colors || []);
            }
            ctx.restore();
        } else {
            // Draw fusion gradient background
            renderFusionGradient(ctx, w, h, fusionConfig.colors || []);
        }

        // Draw noise over background
        if (fusionConfig.noise > 0 && quality !== 'low') {
            ctx.save();
            const pattern = ctx.createPattern(NOISE_PATTERN_CANVAS, 'repeat');
            if (pattern) {
                ctx.globalCompositeOperation = 'overlay';
                ctx.fillStyle = pattern;
                ctx.globalAlpha = (fusionConfig.noise / 100) * 0.8;
                ctx.fillRect(0, 0, w, h);
            }
            ctx.restore();
        }

        // Draw Image with Shape Mask
        // MULTI-IMAGES RENDERING FOR FUSION
        if (images.length > 0) {
            images.forEach((img, index) => {
                ctx.save();

                // Get merged config or fallback
                const myConfig = { ...fusionConfig };
                const specificConfig = (fusionConfig.perImageConfigs || {})[index] || {};
                Object.assign(myConfig, specificConfig);

                ctx.globalCompositeOperation = myConfig.blendMode || 'normal';

                // Calculate base layout based on composition
                const comp = fusionConfig.composition || 'single';
                const count = images.length;
                let cX = w / 2;
                let cY = h / 2;
                let baseScale = 1;

                if (comp === 'split_v' && count >= 2) {
                    cY = index % 2 === 0 ? h * 0.25 : h * 0.75;
                    baseScale = 0.6;
                } else if (comp === 'split_h' && count >= 2) {
                    cX = index % 2 === 0 ? w * 0.25 : w * 0.75;
                    baseScale = 0.6;
                } else if (comp === 'scattered' && count >= 2) {
                    const prng = xfc32(index + 10, 20, 30, 40);
                    cX = w * (0.2 + prng() * 0.6);
                    cY = h * (0.2 + prng() * 0.6);
                    baseScale = 0.4 + prng() * 0.4;
                } else if (comp === 'asymmetric' && count >= 2) {
                    if (index === 0) {
                        cX = w * 0.4; cY = h * 0.4; baseScale = 0.8;
                    } else if (index === 1) {
                        cX = w * 0.7; cY = h * 0.7; baseScale = 0.4;
                    } else if (index === 2) {
                        cX = w * 0.2; cY = h * 0.8; baseScale = 0.3;
                    } else {
                        const prng = xfc32(index, 1, 2, 3);
                        cX = w * (0.2 + prng() * 0.6);
                        cY = h * (0.2 + prng() * 0.6);
                        baseScale = 0.2;
                    }
                }

                // Mask geometry
                const scale = (myConfig.imageScale / 100) * baseScale;
                let maskW = w * scale;
                let maskH = h * scale;

                // Force square aspect ratio for organic shapes to maintain proportions
                if (myConfig.maskShape !== 'none' && myConfig.maskShape !== 'rhombus') {
                    const sq = Math.min(maskW, maskH);
                    maskW = sq; maskH = sq;
                } else if (myConfig.maskShape === 'none') {
                    // Conserve l'aspect ratio original de l'image
                    const imgR = img.width / img.height;
                    const canR = w / h;
                    if (imgR > canR) {
                        maskW = w * scale;
                        maskH = maskW / imgR;
                    } else {
                        maskH = h * scale;
                        maskW = maskH * imgR;
                    }
                }

                // Applique la position globale + locale à la composition
                const px = myConfig.posX !== undefined ? myConfig.posX : 0;
                const py = myConfig.posY !== undefined ? myConfig.posY : 0;
                const globalPx = fusionConfig.imagePos ? fusionConfig.imagePos.x : 0;
                const globalPy = fusionConfig.imagePos ? fusionConfig.imagePos.y : 0;

                const maskX = cX - maskW / 2 + globalPx + px;
                const maskY = cY - maskH / 2 + globalPy + py;
                const centerX = maskX + maskW / 2;
                const centerY = maskY + maskH / 2;

                // DRAW MASK SHAPE & CLIP
                ctx.beginPath();
                if (myConfig.maskShape === 'blob1' || myConfig.maskShape === 'blob2') {
                    ctx.translate(centerX, centerY);
                    ctx.scale(maskW / 140, maskH / 140);
                    const p = new Path2D(myConfig.maskShape === 'blob1'
                        ? "M34.5,-45.5C45.2,-36.8,54.7,-25.1,59.2,-10.8C63.7,3.6,63.1,20.5,55.5,33.5C47.8,46.5,33.2,55.5,17.7,60.6C2.1,65.6,-14.4,66.7,-29.4,61.9C-44.4,57.1,-58,46.3,-65.4,31.7C-72.7,17,-73.9,0.5,-68.8,-14.3C-63.6,-29,-52.3,-41.8,-38.8,-49.5C-25.2,-57.2,-12.6,-59.6,1.2,-61.1C14.9,-62.5,23.8,-54.2,34.5,-45.5Z"
                        : "M46.7,-52.4C60.2,-41.7,70.5,-26.1,73.4,-9.4C76.2,7.4,71.5,25.2,59.9,39C48.4,52.8,29.9,62.6,9.1,68.4C-11.7,74.2,-34.8,76.1,-49.2,66.1C-63.6,56.1,-69.3,34.2,-71.4,14.2C-73.4,-5.8,-71.8,-24,-61.8,-38C-51.7,-52,-33.2,-61.8,-16.4,-67.4C0.4,-72.9,18,-74.3,33.2,-63.1Z");
                    ctx.clip(p);
                    // Inverse transform to draw image correctly
                    ctx.scale(140 / maskW, 140 / maskH);
                    ctx.translate(-centerX, -centerY);
                } else if (myConfig.maskShape === 'organic') {
                    renderOrganicBlob(ctx, centerX, centerY, maskW / 2, (myConfig.seed || 12345) + index);
                    ctx.clip();
                } else {
                    if (myConfig.maskShape === 'circle') {
                        ctx.arc(centerX, centerY, Math.min(maskW, maskH) / 2, 0, Math.PI * 2);
                    } else if (myConfig.maskShape === 'rhombus') {
                        ctx.moveTo(centerX, maskY);
                        ctx.lineTo(maskX + maskW, centerY);
                        ctx.lineTo(centerX, maskY + maskH);
                        ctx.lineTo(maskX, centerY);
                        ctx.closePath();
                    } else if (myConfig.maskShape === 'star') {
                        renderStar(ctx, centerX, centerY, 5, maskW / 2, maskW / 4);
                    } else {
                        ctx.rect(maskX, maskY, maskW, maskH);
                    }
                    ctx.clip();
                }

                // Draw image filling mask
                const imgRatio = img.width / img.height;
                const maskRatio = maskW / maskH;
                let drawW = maskW; let drawH = maskH;
                let drawX = maskX; let drawY = maskY;

                if (imgRatio > maskRatio) {
                    drawW = maskH * imgRatio;
                    drawX = maskX - (drawW - maskW) / 2;
                } else {
                    drawH = maskW / imgRatio;
                    drawY = maskY - (drawH - maskH) / 2;
                }

                ctx.drawImage(img, drawX, drawY, drawW, drawH);
                ctx.restore();

                // 2ND PASS FOR OUTLINE (Selection Feedback)
                if (isPreview && selectedImgIndex === index) {
                    ctx.save();

                    // Design.md Style: Pulsing Indigo Glow
                    const pulse = (Math.sin(Date.now() / 300) + 1) / 2;
                    const glowAlpha = 0.3 + pulse * 0.4;

                    ctx.shadowColor = `rgba(99, 102, 241, ${glowAlpha})`; // Indigo 500
                    ctx.shadowBlur = 12 + pulse * 8;
                    ctx.strokeStyle = '#818cf8'; // Indigo 400
                    ctx.lineWidth = 3.0;
                    ctx.setLineDash([]); // Ensure solid line

                    ctx.beginPath();
                    if (myConfig.maskShape === 'blob1' || myConfig.maskShape === 'blob2') {
                        ctx.translate(centerX, centerY);
                        ctx.scale(maskW / 140, maskH / 140);
                        const p = new Path2D(myConfig.maskShape === 'blob1'
                            ? "M34.5,-45.5C45.2,-36.8,54.7,-25.1,59.2,-10.8C63.7,3.6,63.1,20.5,55.5,33.5C47.8,46.5,33.2,55.5,17.7,60.6C2.1,65.6,-14.4,66.7,-29.4,61.9C-44.4,57.1,-58,46.3,-65.4,31.7C-72.7,17,-73.9,0.5,-68.8,-14.3C-63.6,-29,-52.3,-41.8,-38.8,-49.5C-25.2,-57.2,-12.6,-59.6,1.2,-61.1C14.9,-62.5,23.8,-54.2,34.5,-45.5Z"
                            : "M46.7,-52.4C60.2,-41.7,70.5,-26.1,73.4,-9.4C76.2,7.4,71.5,25.2,59.9,39C48.4,52.8,29.9,62.6,9.1,68.4C-11.7,74.2,-34.8,76.1,-49.2,66.1C-63.6,56.1,-69.3,34.2,-71.4,14.2C-73.4,-5.8,-71.8,-24,-61.8,-38C-51.7,-52,-33.2,-61.8,-16.4,-67.4C0.4,-72.9,18,-74.3,33.2,-63.1Z");
                        ctx.stroke(p);
                        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform after path
                    } else if (myConfig.maskShape === 'organic') {
                        renderOrganicBlob(ctx, centerX, centerY, maskW / 2, (myConfig.seed || 12345) + index);
                        ctx.stroke();
                    } else {
                        if (myConfig.maskShape === 'circle') {
                            ctx.arc(centerX, centerY, Math.min(maskW, maskH) / 2, 0, Math.PI * 2);
                        } else if (myConfig.maskShape === 'rhombus') {
                            ctx.moveTo(centerX, maskY); ctx.lineTo(maskX + maskW, centerY);
                            ctx.lineTo(centerX, maskY + maskH); ctx.lineTo(maskX, centerY); ctx.closePath();
                        } else if (myConfig.maskShape === 'star') {
                            renderStar(ctx, centerX, centerY, 5, maskW / 2, maskW / 4);
                        } else {
                            ctx.rect(maskX, maskY, maskW, maskH);
                        }
                        ctx.stroke();
                    }

                    ctx.restore();
                }
            });
        }
    } else {
        if (img) {
            let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;

            if (cropRatio !== 'original' || cropScale !== 1.0 || cropPos.x !== 0 || cropPos.y !== 0) {
                const effectiveRatio = cropRatio === 'original'
                    ? (img.width / img.height)
                    : (() => { const [rW, rH] = cropRatio.split(':').map(Number); return rW / rH; })();

                let baseSWidth, baseSHeight;
                const imgRatio = img.width / img.height;
                if (imgRatio > effectiveRatio) { baseSHeight = img.height; baseSWidth = baseSHeight * effectiveRatio; }
                else { baseSWidth = img.width; baseSHeight = baseSWidth / effectiveRatio; }

                const effectiveScale = Math.max(0.5, cropScale);
                sWidth = baseSWidth / effectiveScale;
                sHeight = baseSHeight / effectiveScale;
                const maxSx = img.width - sWidth;
                const maxSy = img.height - sHeight;
                let targetSx = maxSx * 0.5 - cropPos.x;
                let targetSy = maxSy * 0.5 - cropPos.y;
                sx = Math.max(0, Math.min(targetSx, maxSx));
                sy = Math.max(0, Math.min(targetSy, maxSy));
            }

            ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, w, h);

            // Crop grid overlay
            if (isPreview && isCropping) {
                renderCropGrid(ctx, w, h);
            }
        }

        // Overlay (Legacy Studio view overlap logic)
        if (overlayImage && overlayOpacity > 0) {
            ctx.save();
            ctx.globalCompositeOperation = blendMode;
            ctx.globalAlpha = overlayOpacity / 100;
            const scale = overlayScale / 100;
            const dw = w * scale;
            const dh = h * scale;
            const dx = (w - dw) / 2 + overlayPos.x;
            const dy = (h - dh) / 2 + overlayPos.y;
            ctx.drawImage(overlayImage, dx, dy, dw, dh);
            ctx.restore();
        }
    }

    // ═══════════════════════════════════════════════════════
    //  VISION PRO v3 — Optimized Filter Pipeline
    // ═══════════════════════════════════════════════════════
    applyFiltersPro(ctx, targetCanvas, w, h, quality, filters);
}

/**
 * renderFusionGradient — Draw a mesh gradient background
 */
function renderFusionGradient(ctx, w, h, colors) {
    if (!colors || colors.length < 4) return;

    // Base color (top left)
    ctx.fillStyle = colors[0];
    ctx.fillRect(0, 0, w, h);

    // Top Right
    const g1 = ctx.createRadialGradient(w, 0, 0, w, 0, Math.max(w, h));
    g1.addColorStop(0, colors[1]);
    g1.addColorStop(1, 'transparent');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);

    // Bottom Left
    const g2 = ctx.createRadialGradient(0, h, 0, 0, h, Math.max(w, h));
    g2.addColorStop(0, colors[2]);
    g2.addColorStop(1, 'transparent');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);

    // Bottom Right
    const g3 = ctx.createRadialGradient(w, h, 0, w, h, Math.max(w, h));
    g3.addColorStop(0, colors[3]);
    g3.addColorStop(1, 'transparent');
    ctx.fillStyle = g3;
    ctx.fillRect(0, 0, w, h);
}

/**
 * renderStar — helper geometry
 */
function renderStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
}

/**
 * Pseudo-random generator pour les formes
 */
function xfc32(a, b, c, d) {
    return function () {
        a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
        let t = (a + b) | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        d = d + 1 | 0;
        t = t + d | 0;
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    }
}

/**
 * renderOrganicBlob — Produit un galet aléatoire unique
 */
function renderOrganicBlob(ctx, cx, cy, radius, seed) {
    const prng = xfc32(seed, 12, 34, 56);
    const points = 8;
    const pts = [];
    for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const r = radius * (0.6 + prng() * 0.45); // variation de l'amplitude
        pts.push({
            x: cx + Math.cos(angle) * r,
            y: cy + Math.sin(angle) * r
        });
    }

    ctx.beginPath();
    let pPrev = pts[points - 1];
    let p0 = pts[0];
    ctx.moveTo((pPrev.x + p0.x) / 2, (pPrev.y + p0.y) / 2);

    for (let i = 0; i < points; i++) {
        const p1 = pts[i];
        const p2 = pts[(i + 1) % points];
        ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
    }
    ctx.closePath();
}

/**
 * renderCropGrid — Dessine la grille de crop (rule of thirds).
 */
function renderCropGrid(ctx, w, h) {
    const baseLW = Math.max(2, Math.min(w, h) * 0.003);
    ctx.beginPath();
    const x1 = w * 0.333; const x2 = w * 0.666;
    const y1 = h * 0.333; const y2 = h * 0.666;
    ctx.moveTo(x1, 0); ctx.lineTo(x1, h);
    ctx.moveTo(x2, 0); ctx.lineTo(x2, h);
    ctx.moveTo(0, y1); ctx.lineTo(w, y1);
    ctx.moveTo(0, y2); ctx.lineTo(w, y2);
    ctx.lineCap = 'square';
    ctx.lineWidth = baseLW * 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.lineWidth = baseLW * 2;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
}

/**
 * applyFiltersPro — Vision Pro v3 pipeline.
 *
 * Pipeline Order:
 *  1. CSS Filters (brightness, contrast, saturation, hue-rotate, sepia, blur)
 *  2. Fused Pixel Ops (curves + temperature + highlights/shadows + dehaze +
 *     faded blacks + split toning + vibrance) — SINGLE getImageData pass
 *  3. Legacy Tint (backward compat overlay tint)
 *  4. Clarity (spatial high-pass mid-frequency boost)
 *  5. Sharpness (unsharp mask, small radius)
 *  6. Halation (glow around highlights — CineStill)
 *  7. Vignette (radial gradient)
 *  8. Grain (noise pattern)
 *  9. Intensity Blend (original/filtered mix)
 */
function applyFiltersPro(ctx, targetCanvas, w, h, quality, filters) {
    const safeFilters = normalizeVisionFilters(filters);
    const intensity = safeFilters.filterIntensity !== undefined ? safeFilters.filterIntensity : 100;
    if (intensity === 0) return;

    // Save original for intensity blending
    let originalCanvas = null;
    if (intensity < 100) {
        originalCanvas = document.createElement('canvas');
        originalCanvas.width = w;
        originalCanvas.height = h;
        originalCanvas.getContext('2d').drawImage(targetCanvas, 0, 0);
    }

    // ── Stage 1: CSS Filters ─────────────────────────────
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(targetCanvas, 0, 0);

    ctx.clearRect(0, 0, w, h);

    const hueRotate = safeFilters.hueRotate || 0;
    const cssSaturation = quality === 'low' ? (safeFilters.saturation !== undefined ? safeFilters.saturation : 100) : 100;
    ctx.filter = [
        `brightness(${safeFilters.brightness}%)`,
        `contrast(${safeFilters.contrast}%)`,
        `saturate(${cssSaturation}%)`,
        safeFilters.sepia ? `sepia(${safeFilters.sepia}%)` : '',
        (quality !== 'low' && safeFilters.blur) ? `blur(${safeFilters.blur}px)` : '',
        hueRotate ? `hue-rotate(${hueRotate}deg)` : ''
    ].filter(Boolean).join(' ');

    ctx.drawImage(tempCanvas, 0, 0);
    ctx.filter = 'none';

    const doPixelOps = quality !== 'low';

    if (doPixelOps) {
        // ── Stage 2: Fused Pixel Ops (single pass) ───────
        applyFusedPixelOps(ctx, w, h, safeFilters);
    }

    // ── Stage 3: Legacy Tint ─────────────────────────────
    if (safeFilters.tintIntensity > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = safeFilters.tintColor;
        ctx.globalAlpha = safeFilters.tintIntensity / 100;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    if (doPixelOps) {
        // ── Stage 4: Clarity ─────────────────────────────
        applyClarity(ctx, targetCanvas, w, h, safeFilters.clarity);

        // ── Stage 5: Sharpness ───────────────────────────
        applySharpness(ctx, targetCanvas, w, h, safeFilters.sharpness);

        // ── Stage 6: Halation ────────────────────────────
        applyHalation(ctx, w, h, safeFilters.halation, safeFilters.halationColor);
    }

    // ── Stage 7: Vignette ────────────────────────────────
    if (safeFilters.vignette > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        const gradient = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.85);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0, ${safeFilters.vignette / 100})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    // ── Stage 8: Grain ───────────────────────────────────
    if (safeFilters.grain > 0 && quality !== 'low') {
        ctx.save();
        const pattern = ctx.createPattern(NOISE_PATTERN_CANVAS, 'repeat');
        if (pattern) {
            ctx.globalCompositeOperation = 'overlay';
            ctx.fillStyle = pattern;
            ctx.globalAlpha = (safeFilters.grain / 100) * 0.5;
            ctx.fillRect(0, 0, w, h);
        }
        ctx.restore();
    }

    // ── Stage 9: Intensity Blend ─────────────────────────
    if (doPixelOps) {
        applySmartphoneOutputGuards(ctx, w, h, safeFilters);
    }

    if (intensity < 100 && originalCanvas) {
        applyPerceptualIntensityBlend(ctx, w, h, originalCanvas, intensity);
    }
}
