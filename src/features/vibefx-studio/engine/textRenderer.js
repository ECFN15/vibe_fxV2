/**
 * renderTexts — Moteur de typographie V2 avec backgrounds dynamiques.
 * Dessine tous les éléments texte avec leur fond, ombre, et style personnalisé.
 */
export function renderTexts(ctx, w, h, { texts }) {
    texts.forEach(t => {
        ctx.save();
        const drawX = t.x * w;
        const drawY = t.y * h;
        ctx.translate(drawX, drawY);
        ctx.rotate((t.rotate || 0) * Math.PI / 180);
        const textGlobalAlpha = (t.opacity !== undefined ? t.opacity : 100) / 100;
        ctx.globalAlpha = textGlobalAlpha;
        ctx.globalCompositeOperation = t.blend || 'source-over';

        const globalScale = (t.scale !== undefined ? t.scale : 100) / 100;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let fontSize = w * 0.05 * globalScale;
        ctx.font = `${t.italic ? 'italic ' : ''}${t.bold ? 'bold ' : ''}${fontSize}px ${t.font}`;

        const trackingScaled = (t.tracking || 0) * globalScale;
        if (ctx.letterSpacing !== undefined && trackingScaled !== 0) {
            ctx.letterSpacing = `${trackingScaled}px`;
        }

        // 1. DYNAMIC MEASUREMENT
        const metrics = ctx.measureText(t.content);
        const textW = metrics.width;
        const actualTracking = trackingScaled || 0;
        const adjustedTextW = textW + (actualTracking > 0 ? actualTracking * 2 : 0);
        const textH = fontSize;

        const scaleFactor = (w / 1000) * globalScale;
        const padX = ((t.padding !== undefined ? t.padding : 15) * scaleFactor) + (15 * globalScale);
        const padY = ((t.padding !== undefined ? t.padding : 15) * scaleFactor) + (10 * globalScale);

        const bgW = adjustedTextW + padX * 2;
        const bgH = textH + padY * 2;

        // 2. RENDER BACKGROUND (If any)
        if (t.bgStyle && t.bgStyle !== 'none') {
            renderTextBackground(ctx, t, bgW, bgH, padX, padY, scaleFactor, textGlobalAlpha);
        }

        // 3. RENDER TEXT
        ctx.save();
        if (t.bgStyle === 'none' && t.shadowBlur && t.shadowBlur > 0) {
            ctx.shadowColor = t.color || '#ffffff';
            ctx.shadowBlur = t.shadowBlur * scaleFactor;
        }
        ctx.fillStyle = t.color || '#ffffff';
        ctx.fillText(t.content, 0, 0);
        ctx.restore();

        ctx.restore();

        // Expose computed dimensions for hit testing (store on object for selection)
        t._computed = { drawX, drawY, bgW, bgH, adjustedTextW, textH };
    });
}

/**
 * renderTextBackground — Dessine le fond d'un texte (solid, rounded, tape, outline, tech).
 */
function renderTextBackground(ctx, t, bgW, bgH, padX, padY, scaleFactor, textGlobalAlpha) {
    ctx.save();

    // Shadow/Glow
    if (t.shadowBlur && t.shadowBlur > 0) {
        ctx.shadowColor = t.bgColor || '#000000';
        ctx.shadowBlur = t.shadowBlur * scaleFactor;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    ctx.globalAlpha = ((t.bgOpacity !== undefined ? t.bgOpacity : 100) / 100) * textGlobalAlpha;
    ctx.fillStyle = t.bgColor || '#000000';
    ctx.strokeStyle = t.bgColor || '#000000';

    if (t.bgStyle === 'tape') {
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 6 * scaleFactor;
        ctx.shadowOffsetY = 3 * scaleFactor;
        ctx.globalAlpha = ((t.bgOpacity !== undefined ? t.bgOpacity : 85) / 100) * textGlobalAlpha;

        ctx.beginPath();
        ctx.moveTo(-bgW / 2, -bgH / 2);
        ctx.lineTo(bgW / 2, -bgH / 2);
        for (let i = 0; i < 7; i++) {
            ctx.lineTo(bgW / 2 - ((i % 2) * 4 * scaleFactor), -bgH / 2 + (bgH / 7) * (i + 1));
        }
        ctx.lineTo(-bgW / 2, bgH / 2);
        for (let i = 0; i < 7; i++) {
            ctx.lineTo(-bgW / 2 + ((i % 2) * 4 * scaleFactor), bgH / 2 - (bgH / 7) * (i + 1));
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1 * scaleFactor;
        ctx.beginPath();
        ctx.moveTo(-bgW / 2 + padX, -bgH / 2 + padY);
        ctx.lineTo(bgW / 2 - padX, bgH / 2 - padY / 2);
        ctx.stroke();
    }
    else if (t.bgStyle === 'rounded') {
        ctx.beginPath();
        let rad = (t.borderRadius !== undefined ? t.borderRadius : 12) * scaleFactor;
        const maxRad = Math.min(bgW / 2, bgH / 2);
        if (rad > maxRad) rad = maxRad;
        ctx.roundRect(-bgW / 2, -bgH / 2, bgW, bgH, rad);
        ctx.fill();
    }
    else if (t.bgStyle === 'solid') {
        ctx.fillRect(-bgW / 2, -bgH / 2, bgW, bgH);
    }
    else if (t.bgStyle === 'outline') {
        ctx.lineWidth = (t.borderWidth !== undefined ? t.borderWidth : 2) * scaleFactor;
        ctx.globalAlpha = textGlobalAlpha;
        ctx.strokeRect(-bgW / 2, -bgH / 2, bgW, bgH);
    }
    else if (t.bgStyle === 'tech') {
        const corner = (t.cornerSize !== undefined ? t.cornerSize : 10) * scaleFactor;
        ctx.beginPath();
        ctx.moveTo(-bgW / 2 + corner, -bgH / 2);
        ctx.lineTo(bgW / 2, -bgH / 2);
        ctx.lineTo(bgW / 2, bgH / 2 - corner);
        ctx.lineTo(bgW / 2 - corner, bgH / 2);
        ctx.lineTo(-bgW / 2, bgH / 2);
        ctx.lineTo(-bgW / 2, -bgH / 2 + corner);
        ctx.closePath();
        ctx.fill();

        // Tech accents
        ctx.fillStyle = t.color || '#ffffff';
        ctx.globalAlpha = textGlobalAlpha * 0.5;
        ctx.fillRect(-bgW / 2, -bgH / 2, corner * 0.4, 2 * scaleFactor);
        ctx.fillRect(-bgW / 2, -bgH / 2, 2 * scaleFactor, corner * 0.4);
        ctx.fillRect(bgW / 2 - corner * 0.4, bgH / 2 - 2 * scaleFactor, corner * 0.4, 2 * scaleFactor);
        ctx.fillRect(bgW / 2 - 2 * scaleFactor, bgH / 2 - corner * 0.4, 2 * scaleFactor, corner * 0.4);
    }

    ctx.restore();
}

/**
 * renderTextSelection — Dessine l'indicateur de sélection de texte.
 */
export function renderTextSelection(ctx, w, h, { texts, activeTextId }) {
    const t = texts.find(text => text.id === activeTextId);
    if (!t || !t._computed) return;

    const { drawX, drawY, bgW, bgH, adjustedTextW, textH } = t._computed;

    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.rotate((t.rotate || 0) * Math.PI / 180);

    const hitW = (t.bgStyle && t.bgStyle !== 'none') ? bgW : adjustedTextW;
    const hitH = (t.bgStyle && t.bgStyle !== 'none') ? bgH : textH;

    ctx.strokeStyle = 'rgba(99, 102, 241, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(-hitW / 2 - 2, -hitH / 2 - 2, hitW + 4, hitH + 4);

    // Control dots
    ctx.fillStyle = '#6366f1';
    ctx.fillRect(-hitW / 2 - 5, -hitH / 2 - 5, 6, 6);
    ctx.fillRect(hitW / 2 - 1, hitH / 2 - 1, 6, 6);

    ctx.restore();
}
