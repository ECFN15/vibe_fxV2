import { useCallback } from 'react';

/**
 * useCanvasEvents — Gère tous les événements pointer (down, move, up) du canvas.
 * Couvre les interactions Layout (textes, assets, slots) et Studio/Fusion (crop, overlay).
 */
export default function useCanvasEvents({
    canvasRef, view, images,
    // Layout state
    texts, setTexts, assets, setAssets,
    activeTextId, setActiveTextId,
    activeAssetId, setActiveAssetId,
    selectedSlotIndex, setSelectedSlotIndex,
    slotRects,
    // Drag state
    isDragging, setIsDragging,
    isDraggingText, setIsDraggingText,
    isDraggingAsset, setIsDraggingAsset,
    activeGuides, setActiveGuides,
    // Refs
    lastMousePos, dragOffset, textMetrics,
    // Studio/Fusion state
    isCropping,
    setOverlayPos, setCropPos,
    fusionConfig, setFusionConfig,
    selectedImgIndex, setSelectedImgIndex,
}) {
    const getPointerPos = useCallback((e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    }, []);

    const handlePointerDown = useCallback((e) => {
        if (!canvasRef.current) return;

        // LAYOUT MODE LOGIC
        if (view === 'layout') {
            const pos = getPointerPos(e, canvasRef.current);
            const W = canvasRef.current.width;
            const H = canvasRef.current.height;
            const ctx = canvasRef.current.getContext('2d');

            // 1. Assets Check
            for (let i = assets.length - 1; i >= 0; i--) {
                const a = assets[i];
                const ax = a.x * W; const ay = a.y * H;
                if (Math.abs(pos.x - ax) < 60 && Math.abs(pos.y - ay) < 20) {
                    setActiveAssetId(a.id); setSelectedSlotIndex(null); setActiveTextId(null); setIsDraggingAsset(true);
                    dragOffset.current = { x: pos.x - ax, y: pos.y - ay };
                    return;
                }
            }

            // 2. Text Check (Universal)
            for (let i = texts.length - 1; i >= 0; i--) {
                const t = texts[i];
                const tx = t.x * W; const ty = t.y * H;
                const globalScale = (t.scale !== undefined ? t.scale : 100) / 100;
                let fontSize = W * 0.05 * globalScale;

                ctx.font = `${t.italic ? 'italic ' : ''}${t.bold ? 'bold ' : ''}${fontSize}px ${t.font.includes(' ') ? t.font : t.font}`;
                const metrics = ctx.measureText(t.content);

                const scaleFactor = W / 1000;
                const padX = ((t.padding !== undefined ? t.padding : 15) * scaleFactor * globalScale) + 15;
                const padY = ((t.padding !== undefined ? t.padding : 15) * scaleFactor * globalScale) + 10;

                const tw = metrics.width + (padX * 2);
                const th = fontSize + (padY * 2);

                if (pos.x >= tx - tw / 2 && pos.x <= tx + tw / 2 && pos.y >= ty - th / 2 && pos.y <= ty + th / 2) {
                    setActiveTextId(t.id); setSelectedSlotIndex(null); setActiveAssetId(null); setIsDraggingText(true);
                    dragOffset.current = { x: pos.x - tx, y: pos.y - ty };
                    textMetrics.current = { w: tw, h: th };
                    return;
                }
            }

            // 3. Slot Check
            for (let i = slotRects.current.length - 1; i >= 0; i--) {
                const s = slotRects.current[i];
                if (pos.x >= s.x && pos.x <= s.x + s.w && pos.y >= s.y && pos.y <= s.y + s.h) {
                    setSelectedSlotIndex(s.id); setActiveTextId(null); setActiveAssetId(null);
                    return;
                }
            }
            setSelectedSlotIndex(null); setActiveTextId(null); setActiveAssetId(null);
        }
        // STUDIO / FUSION MODE LOGIC
        else {
            if (images.length === 0) return;
            const isFusionDrag = view === 'fusion';
            const isCropDrag = view !== 'fusion' && isCropping;
            if (!isFusionDrag && !isCropDrag) return;

            if (isFusionDrag) {
                const pos = getPointerPos(e, canvasRef.current);
                const W = canvasRef.current.width;
                const H = canvasRef.current.height;

                // Hit detection matching studioRenderer.js placement (z-index order reverse)
                for (let i = images.length - 1; i >= 0; i--) {
                    const comp = fusionConfig.composition || 'single';
                    const specific = (fusionConfig.perImageConfigs || {})[i] || {};
                    const scale = ((specific.imageScale || fusionConfig.imageScale) / 100);

                    // Base coordinates logic as per studioRenderer.js
                    let cX = W / 2, cY = H / 2, baseScale = 1;

                    if (comp === 'split_v' && images.length >= 2) {
                        cY = i % 2 === 0 ? H * 0.25 : H * 0.75; baseScale = 0.6;
                    } else if (comp === 'split_h' && images.length >= 2) {
                        cX = i % 2 === 0 ? W * 0.25 : W * 0.75; baseScale = 0.6;
                    } else if (comp === 'scattered' && images.length >= 2) {
                        // PRNG MUST match studioRenderer.js: xfc32(i + 10, 20, 30, 40)
                        const seed = i + 10;
                        let a = seed >>> 0, b = 20 >>> 0, c = 30 >>> 0, d = 40 >>> 0;
                        const xfc32_local = () => { let t = (a + b) | 0; a = b ^ b >>> 9; b = c + (c << 3) | 0; c = (c << 21 | c >>> 11); d = d + 1 | 0; t = t + d | 0; c = c + t | 0; return (t >>> 0) / 4294967296; };
                        cX = W * (0.2 + xfc32_local() * 0.6); cY = H * (0.2 + xfc32_local() * 0.6); baseScale = 0.4 + xfc32_local() * 0.4;
                    } else if (comp === 'asymmetric' && images.length >= 2) {
                        if (i === 0) { cX = W * 0.4; cY = H * 0.4; baseScale = 0.8; }
                        else if (i === 1) { cX = W * 0.7; cY = H * 0.7; baseScale = 0.4; }
                        else if (i === 2) { cX = W * 0.2; cY = H * 0.8; baseScale = 0.3; }
                        else {
                            const seed = i;
                            let a = seed >>> 0, b = 1 >>> 0, c = 2 >>> 0, d = 3 >>> 0;
                            const xfc32_local = () => { let t = (a + b) | 0; a = b ^ b >>> 9; b = c + (c << 3) | 0; c = (c << 21 | c >>> 11); d = d + 1 | 0; t = t + d | 0; c = c + t | 0; return (t >>> 0) / 4294967296; };
                            cX = W * (0.2 + xfc32_local() * 0.6); cY = H * (0.2 + xfc32_local() * 0.6); baseScale = 0.2;
                        }
                    }

                    const finalScale = scale * baseScale;
                    let mW = W * finalScale;
                    let mH = H * finalScale;

                    // SYNC: studioRenderer.js geometry constraint
                    const maskShape = specific.maskShape || fusionConfig.maskShape || 'none';
                    if (maskShape !== 'none' && maskShape !== 'rhombus') {
                        const sq = Math.min(mW, mH);
                        mW = sq; mH = sq;
                    } else if (maskShape === 'none') {
                        const img = images[i];
                        if (img) {
                            const imgR = img.width / img.height;
                            const canR = W / H;
                            if (imgR > canR) {
                                mW = W * finalScale;
                                mH = mW / imgR;
                            } else {
                                mH = H * finalScale;
                                mW = mH * imgR;
                            }
                        }
                    }

                    const px = specific.posX || 0;
                    const py = specific.posY || 0;
                    const gPx = fusionConfig.imagePos?.x || 0;
                    const gPy = fusionConfig.imagePos?.y || 0;

                    const activeCenter = { x: cX + px + gPx, y: cY + py + gPy };

                    // Hit check logic
                    if (Math.abs(pos.x - activeCenter.x) < mW / 2 && Math.abs(pos.y - activeCenter.y) < mH / 2) {
                        setSelectedImgIndex(i);
                        setIsDragging(true);
                        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                        lastMousePos.current = { x: clientX, y: clientY };
                        return;
                    }
                }
                setSelectedImgIndex(-1); // Background click
            }

            setIsDragging(true);
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            lastMousePos.current = { x: clientX, y: clientY };
        }
    }, [canvasRef, view, assets, texts, images, isCropping, getPointerPos,
        setActiveAssetId, setSelectedSlotIndex, setActiveTextId, setIsDraggingAsset,
        setIsDraggingText, setIsDragging, slotRects, dragOffset, textMetrics, lastMousePos]);

    const handlePointerMove = useCallback((e) => {
        // LAYOUT DRAG
        if (view === 'layout') {
            if (isDraggingText && canvasRef.current && activeTextId) {
                e.preventDefault();
                const pos = getPointerPos(e, canvasRef.current);
                const W = canvasRef.current.width; const H = canvasRef.current.height;
                const ctx = canvasRef.current.getContext('2d');

                let newX = pos.x - dragOffset.current.x;
                let newY = pos.y - dragOffset.current.y;

                // Snapping
                const snapThreshold = 15; const centerX = W / 2;
                const sideMargin = W * 0.018; const photoLeft = sideMargin; const photoRight = W - sideMargin;
                let guidesFound = []; const currentHalfW = textMetrics.current.w / 2;

                // 1. Canvas Center
                if (Math.abs(newX - centerX) < snapThreshold) { newX = centerX; guidesFound.push(centerX); }
                // 2. Photo Edges
                if (Math.abs((newX - currentHalfW) - photoLeft) < snapThreshold) { newX = photoLeft + currentHalfW; guidesFound.push(photoLeft); }
                if (Math.abs((newX + currentHalfW) - photoRight) < snapThreshold) { newX = photoRight - currentHalfW; guidesFound.push(photoRight); }

                // 3. Snap INTER-TEXTES
                texts.forEach(otherT => {
                    if (otherT.id !== activeTextId) {
                        const otherX = otherT.x * W;
                        const otherScale = (otherT.scale !== undefined ? otherT.scale : 100) / 100;
                        let otherFontSize = W * 0.05 * otherScale;

                        ctx.font = `${otherT.italic ? 'italic ' : ''}${otherT.bold ? 'bold ' : ''}${otherFontSize}px ${otherT.font.includes(' ') ? otherT.font : otherT.font}`;
                        const otherMetrics = ctx.measureText(otherT.content);

                        const otherScaleFactor = W / 1000;
                        const otherPadX = ((otherT.padding !== undefined ? otherT.padding : 15) * otherScaleFactor * otherScale) + 15;
                        const otherHalfW = (otherMetrics.width + (otherPadX * 2)) / 2;

                        // Center to Center
                        if (Math.abs(newX - otherX) < snapThreshold) { newX = otherX; guidesFound.push(otherX); }
                        // Left to Left
                        const currentLeft = newX - currentHalfW;
                        const otherLeft = otherX - otherHalfW;
                        if (Math.abs(currentLeft - otherLeft) < snapThreshold) { newX = otherLeft + currentHalfW; guidesFound.push(otherLeft); }
                        // Right to Right
                        const currentRight = newX + currentHalfW;
                        const otherRight = otherX + otherHalfW;
                        if (Math.abs(currentRight - otherRight) < snapThreshold) { newX = otherRight - currentHalfW; guidesFound.push(otherRight); }
                    }
                });

                setActiveGuides(guidesFound);
                setTexts(prev => prev.map(t => t.id === activeTextId ? { ...t, x: newX / W, y: newY / H } : t));
            }
            else if (isDraggingAsset && canvasRef.current && activeAssetId) {
                e.preventDefault();
                const pos = getPointerPos(e, canvasRef.current);
                const W = canvasRef.current.width; const H = canvasRef.current.height;
                let newX = pos.x - dragOffset.current.x;
                let newY = pos.y - dragOffset.current.y;
                setAssets(prev => prev.map(a => a.id === activeAssetId ? { ...a, x: newX / W, y: newY / H } : a));
            }
        }
        // STUDIO DRAG
        else if (isDragging) {
            e.preventDefault();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const dx = clientX - lastMousePos.current.x;
            const dy = clientY - lastMousePos.current.y;
            if (view === 'fusion') {
                if (selectedImgIndex !== null) {
                    setFusionConfig(prev => {
                        const per = { ...(prev.perImageConfigs || {}) };
                        const spec = { ...(per[selectedImgIndex] || {}) };
                        spec.posX = (spec.posX || 0) + dx;
                        spec.posY = (spec.posY || 0) + dy;
                        per[selectedImgIndex] = spec;
                        return { ...prev, perImageConfigs: per };
                    });
                } else {
                    setFusionConfig(prev => ({
                        ...prev,
                        imagePos: { x: (prev.imagePos?.x || 0) + dx, y: (prev.imagePos?.y || 0) + dy }
                    }));
                }
            }
            else if (isCropping) { const speedFactor = 1.5; setCropPos(prev => ({ x: prev.x + (dx * speedFactor), y: prev.y + (dy * speedFactor) })); }
            lastMousePos.current = { x: clientX, y: clientY };
        }
    }, [view, isDraggingText, isDraggingAsset, isDragging, canvasRef, activeTextId, activeAssetId,
        texts, isCropping, getPointerPos, setActiveGuides, setTexts, setAssets,
        setCropPos, dragOffset, textMetrics, lastMousePos, setFusionConfig]);

    const handlePointerUp = useCallback(() => {
        setIsDragging(false);
        setIsDraggingText(false);
        setIsDraggingAsset(false);
        setActiveGuides([]);
    }, [setIsDragging, setIsDraggingText, setIsDraggingAsset, setActiveGuides]);

    return { handlePointerDown, handlePointerMove, handlePointerUp };
}
