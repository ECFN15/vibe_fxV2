/**
 * renderAssets — Dessine les assets (tape, stickers) sur le canvas.
 */
export function renderAssets(ctx, w, h, { assets }) {
    assets.forEach(a => {
        ctx.save();
        const drawX = a.x * w;
        const drawY = a.y * h;
        ctx.translate(drawX, drawY);
        ctx.rotate((a.rotate || 0) * Math.PI / 180);
        ctx.globalAlpha = (a.opacity !== undefined ? a.opacity : 100) / 100;
        ctx.globalCompositeOperation = a.blend || 'source-over';

        if (a.type === 'tape') {
            const tapeW = 140;
            const tapeH = 35;
            ctx.shadowColor = 'rgba(0,0,0,0.15)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetY = 2;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';

            ctx.beginPath();
            ctx.moveTo(-tapeW / 2, -tapeH / 2);
            ctx.lineTo(tapeW / 2, -tapeH / 2);
            for (let i = 0; i < 5; i++) {
                ctx.lineTo(tapeW / 2 - ((i % 2) * 2), -tapeH / 2 + (tapeH / 5) * (i + 1));
            }
            ctx.lineTo(-tapeW / 2, tapeH / 2);
            for (let i = 0; i < 5; i++) {
                ctx.lineTo(-tapeW / 2 + ((i % 2) * 2), tapeH / 2 - (tapeH / 5) * (i + 1));
            }
            ctx.closePath();
            ctx.fill();

            // Tape texture details
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-tapeW / 2 + 10, -tapeH / 2 + 10);
            ctx.lineTo(tapeW / 2 - 10, tapeH / 2 - 5);
            ctx.stroke();
        }
        ctx.restore();
    });
}

/**
 * renderAssetSelection — Dessine l'indicateur de sélection d'asset.
 */
export function renderAssetSelection(ctx, w, h, { assets, activeAssetId }) {
    const a = assets.find(asset => asset.id === activeAssetId);
    if (!a) return;

    const drawX = a.x * w;
    const drawY = a.y * h;
    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.rotate((a.rotate || 0) * Math.PI / 180);
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    ctx.strokeRect(-75, -22, 150, 44);

    // Handles
    ctx.fillStyle = '#6366f1';
    ctx.beginPath(); ctx.arc(-75, -22, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(75, 22, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}
