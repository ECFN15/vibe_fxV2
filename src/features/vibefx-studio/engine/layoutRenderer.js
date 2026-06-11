import { NOISE_PATTERN_CANVAS } from '../utils/canvasUtils';

/**
 * renderLayoutBackground — Dessine le fond du layout (couleur, blur, polaroid).
 */
function renderLayoutMeshBackground(ctx, w, h, colors) {
    if (!colors || colors.length < 4) return false;

    ctx.fillStyle = colors[0];
    ctx.fillRect(0, 0, w, h);

    const g1 = ctx.createRadialGradient(w, 0, 0, w, 0, Math.max(w, h));
    g1.addColorStop(0, colors[1]);
    g1.addColorStop(1, 'transparent');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);

    const g2 = ctx.createRadialGradient(0, h, 0, 0, h, Math.max(w, h));
    g2.addColorStop(0, colors[2]);
    g2.addColorStop(1, 'transparent');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);

    const g3 = ctx.createRadialGradient(w, h, 0, w, h, Math.max(w, h));
    g3.addColorStop(0, colors[3]);
    g3.addColorStop(1, 'transparent');
    ctx.fillStyle = g3;
    ctx.fillRect(0, 0, w, h);

    return true;
}

function renderCoverImage(ctx, w, h, image) {
    if (!image?.width || !image?.height) return false;

    const imageRatio = image.width / image.height;
    const canvasRatio = w / h;
    let sw, sh, sx, sy;

    if (canvasRatio > imageRatio) {
        sw = image.width;
        sh = image.width / canvasRatio;
        sx = 0;
        sy = (image.height - sh) / 2;
    } else {
        sh = image.height;
        sw = image.height * canvasRatio;
        sy = 0;
        sx = (image.width - sw) / 2;
    }

    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, w, h);
    return true;
}

export function renderLayoutBackground(ctx, w, h, { images, layoutBgColor, layoutBgBlur, layoutBgGradient, layoutBgMeshColors, layoutLumenBackground, bgCanvas, activeTemplate }) {
    const hasMeshBackground = activeTemplate.id !== 'polaroid'
        && layoutBgGradient
        && renderLayoutMeshBackground(ctx, w, h, layoutBgMeshColors);

    if (!hasMeshBackground) {
        ctx.fillStyle = layoutBgColor;
        ctx.fillRect(0, 0, w, h);
    }

    if (activeTemplate.id !== 'polaroid' && layoutLumenBackground?.image) {
        renderCoverImage(ctx, w, h, layoutLumenBackground.image);
    }

    if (images.length > 0 && layoutBgBlur && bgCanvas && activeTemplate.id !== 'polaroid') {
        ctx.drawImage(bgCanvas, 0, 0, w, h);
    }

    if (activeTemplate.id === 'polaroid') {
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(0, 0, w, h);
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.03;
        const p = ctx.createPattern(NOISE_PATTERN_CANVAS, 'repeat');
        if (p) { ctx.fillStyle = p; ctx.fillRect(0, 0, w, h); }
        ctx.restore();
    }
}

/**
 * renderLayoutImageTexture - Dessine une texture utilisateur sous les slots d'image.
 */
export function renderLayoutImageTexture(ctx, w, h, { layoutTextures, activeTextureId, layoutTextureOpacity, activeTemplate }) {
    if (!layoutTextures?.length || activeTemplate.id === 'polaroid') return;

    const activeTexture = layoutTextures.find(texture => texture.id === activeTextureId) || layoutTextures[0];
    const textureImage = activeTexture?.image;
    if (!textureImage?.width || !textureImage?.height) return;

    const imgRatio = textureImage.width / textureImage.height;
    const canvasRatio = w / h;
    let sw, sh, sx, sy;

    if (canvasRatio > imgRatio) {
        sw = textureImage.width;
        sh = textureImage.width / canvasRatio;
        sx = 0;
        sy = (textureImage.height - sh) / 2;
    } else {
        sh = textureImage.height;
        sw = textureImage.height * canvasRatio;
        sy = 0;
        sx = (textureImage.width - sw) / 2;
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(100, layoutTextureOpacity ?? 65)) / 100;
    ctx.drawImage(textureImage, sx, sy, sw, sh, 0, 0, w, h);
    ctx.restore();
}

/**
 * renderSlot — Dessine une image dans un slot avec zoom, pan, border, blur.
 */
export function renderSlot(ctx, slotId, imgIndex, x, y, sw, sh, overrideRadius, { images, slotConfigs, radius, layoutBgBlur, layoutBgColor, activeTemplate, slotRects }) {
    const cfg = slotConfigs[slotId] || { zoom: 1, x: 0, y: 0, border: 0, blur: 0 };
    const safeImgIndex = images.length > 0 ? imgIndex % images.length : null;
    const img = cfg.image || (safeImgIndex !== null ? images[safeImgIndex] : null);
    const effRadius = overrideRadius !== undefined ? overrideRadius : radius;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, sw, sh, effRadius);
    ctx.save();
    ctx.clip();
    if (!layoutBgBlur && activeTemplate.id !== 'polaroid') {
        ctx.fillStyle = "#000000";
        ctx.fillRect(x, y, sw, sh);
    }

    if (!img?.width || !img?.height) {
        ctx.fillStyle = activeTemplate.id === 'custom' ? 'rgba(99, 102, 241, 0.08)' : '#050505';
        ctx.fillRect(x, y, sw, sh);
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = activeTemplate.id === 'custom' ? 'rgba(129, 140, 248, 0.55)' : 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = Math.max(2, Math.min(sw, sh) * 0.006);
        ctx.setLineDash([Math.max(8, sw * 0.025), Math.max(6, sw * 0.014)]);
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, sw - 2, sh - 2, Math.max(0, effRadius - 1));
        ctx.stroke();
        ctx.restore();
        ctx.restore();
        slotRects.push({ id: slotId, x, y, w: sw, h: sh, r: effRadius, hasImage: false });
        return;
    }

    const imgRatio = img.width / img.height;
    const slotRatio = sw / sh;
    let baseW, baseH;
    if (slotRatio > imgRatio) { baseW = sw; baseH = sw / imgRatio; }
    else { baseH = sh; baseW = sh * imgRatio; }
    const scale = cfg.zoom;
    const finalW = baseW * scale;
    const finalH = baseH * scale;
    const centerX = x + (sw - finalW) / 2;
    const centerY = y + (sh - finalH) / 2;
    const panX = cfg.x * (sw / 100);
    const panY = cfg.y * (sh / 100);

    if (cfg.blur > 0) ctx.filter = `blur(${cfg.blur}px)`;
    ctx.drawImage(img, centerX + panX, centerY + panY, finalW, finalH);
    ctx.filter = 'none';
    ctx.restore();

    if (cfg.border > 0 && activeTemplate.id !== 'polaroid') {
        ctx.lineWidth = cfg.border;
        ctx.strokeStyle = layoutBgBlur ? '#ffffff' : layoutBgColor;
        ctx.stroke();
    }
    ctx.restore();
    slotRects.push({ id: slotId, x, y, w: sw, h: sh, r: effRadius });
}

/**
 * renderTemplateSlots — Dispatch les slots selon le template actif.
 */
export function renderTemplateSlots(ctx, w, h, opts) {
    const { activeTemplate, padding, gap, images, overlayMode, radius } = opts;
    const safeW = w - (padding * 2);
    const safeH = h - (padding * 2);
    const startX = padding;
    const startY = padding;

    const rs = (slotId, imgIndex, x, y, sw, sh, overrideRadius) => {
        renderSlot(ctx, slotId, imgIndex, x, y, sw, sh, overrideRadius, opts);
    };

    if (activeTemplate.id === 'custom') {
        const zones = activeTemplate.customLayout?.zones || [];
        zones.filter(zone => !zone.hidden).forEach((zone, index) => {
            const slotX = startX + (zone.x * safeW);
            const slotY = startY + (zone.y * safeH);
            const slotW = zone.w * safeW;
            const slotH = zone.h * safeH;
            rs(zone.id || `custom-${index}`, zone.imageIndex ?? index, slotX, slotY, slotW, slotH, zone.radius);
        });
    }
    else if (activeTemplate.id === 'minimal') {
        rs(0, 0, startX, startY, safeW, safeH);
    }
    else if (activeTemplate.id === 'polaroid') {
        const sideMargin = w * 0.018;
        const topMargin = w * 0.018;
        const bottomMargin = h * 0.14;
        rs(0, 0, sideMargin, topMargin, w - (sideMargin * 2), h - topMargin - bottomMargin, 1);
    }
    else if (activeTemplate.id === 'pip') {
        rs(0, 0, startX, startY, safeW, safeH);

        // Dark veil
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.roundRect(startX, startY, safeW, safeH, radius);
        ctx.fill();
        ctx.restore();

        // Foreground PiP
        const overlayImgIdx = images.length > 1 ? 1 : 0;
        const fgImg = images[overlayImgIdx];
        const fgRatio = fgImg.width / fgImg.height;
        let pipW, pipH;
        if (overlayMode === 'square') { pipW = safeW * 0.90; pipH = pipW; }
        else if (overlayMode === 'landscape') { pipW = safeW * 0.92; pipH = pipW * (2 / 3); }
        else {
            if (fgRatio > 1) { pipW = safeW; pipH = safeW / fgRatio; }
            else { pipH = safeH * 0.8; pipW = pipH * fgRatio; if (pipW > safeW) { pipW = safeW; pipH = pipW / fgRatio; } }
        }
        const pipX = startX + (safeW - pipW) / 2;
        const pipY = startY + (safeH - pipH) / 2;

        // Drop shadow
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
        ctx.beginPath(); ctx.roundRect(pipX, pipY, pipW, pipH, radius); ctx.fill();
        ctx.restore();

        rs(1, overlayImgIdx, pipX, pipY, pipW, pipH);
    }
    else if (activeTemplate.id === 'split') {
        const hS = (safeH - gap) / 2;
        rs(0, 0, startX, startY, safeW, hS);
        rs(1, 1, startX, startY + hS + gap, safeW, hS);
    }
    else if (activeTemplate.id === 'filmstrip') {
        const hS = (safeH - (gap * 2)) / 3;
        rs(0, 0, startX, startY, safeW, hS);
        rs(1, 1, startX, startY + hS + gap, safeW, hS);
        rs(2, 2, startX, startY + (hS + gap) * 2, safeW, hS);
    }
    else if (activeTemplate.id === 'mosaic') {
        const c1W = (safeW - gap) * 0.6; const c2W = safeW - c1W - gap; const c2H = (safeH - gap) / 2;
        rs(0, 0, startX, startY, c1W, safeH);
        rs(1, 1, startX + c1W + gap, startY, c2W, c2H);
        rs(2, 2, startX + c1W + gap, startY + c2H + gap, c2W, c2H);
    }
    else if (activeTemplate.id === 'grid4') {
        const wS = (safeW - gap) / 2; const hS = (safeH - gap) / 2;
        rs(0, 0, startX, startY, wS, hS);
        rs(1, 1, startX + wS + gap, startY, wS, hS);
        rs(2, 2, startX, startY + hS + gap, wS, hS);
        rs(3, 3, startX + wS + gap, startY + hS + gap, wS, hS);
    }
    else if (activeTemplate.id === 'cinema') {
        const cineH = safeW * (9 / 16);
        const cineY = startY + (safeH - cineH) / 2;
        rs(0, 0, startX, cineY, safeW, cineH);
    }
}

/**
 * renderLayoutTexture — Ajoute la texture de grain au layout.
 */
export function renderLayoutTexture(ctx, w, h, { layoutBgTexture, activeTemplate }) {
    if (layoutBgTexture > 0 && activeTemplate.id !== 'polaroid') {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = (layoutBgTexture / 100) * 0.5;
        const pattern = ctx.createPattern(NOISE_PATTERN_CANVAS, 'repeat');
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }
}

/**
 * renderSlotSelection — Dessine l'indicateur de sélection de slot.
 */
export function renderSlotSelection(ctx, { selectedSlotIndex, slotRects }) {
    const selectedRect = slotRects.find(s => s.id === selectedSlotIndex);
    if (!selectedRect) return;

    const { x, y, w: sw, h: sh, r } = selectedRect;
    ctx.save();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(99, 102, 241, 0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, sw - 2, sh - 2, r);
    ctx.stroke();
    ctx.restore();
}

/**
 * renderGuides — Dessine les guides d'alignement lors du drag.
 */
export function renderGuides(ctx, h, { activeGuides }) {
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#00FFFF';
    ctx.setLineDash([]);
    activeGuides.forEach(gx => {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
    });
    ctx.restore();
}
