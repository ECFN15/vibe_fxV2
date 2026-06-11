import { useCallback } from 'react';

/**
 * useCanvasEvents — Gère tous les événements pointer (down, move, up) du canvas.
 * Couvre les interactions Layout (textes, assets, slots) et Studio (crop, overlay).
 */
export default function useCanvasEvents({
    canvasRef, view, images,
    // Layout state
    texts, setTexts, assets, setAssets,
    activeTextId, setActiveTextId,
    activeAssetId, setActiveAssetId,
    selectedSlotIndex, setSelectedSlotIndex,
    slotRects: slotRectsRef,
    activeTemplate,
    // Drag state
    isDragging, setIsDragging,
    isDraggingText, setIsDraggingText,
    isDraggingAsset, setIsDraggingAsset,
    activeGuides, setActiveGuides,
    // Refs
    lastMousePos: lastMousePosRef,
    dragOffset: dragOffsetRef,
    textMetrics: textMetricsRef,
    // Studio state
    isCropping,
    setCropPos,
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
                    dragOffsetRef.current = { x: pos.x - ax, y: pos.y - ay };
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
                    dragOffsetRef.current = { x: pos.x - tx, y: pos.y - ty };
                    textMetricsRef.current = { w: tw, h: th };
                    return;
                }
            }

            // 3. Slot Check
            for (let i = slotRectsRef.current.length - 1; i >= 0; i--) {
                const s = slotRectsRef.current[i];
                if (pos.x >= s.x && pos.x <= s.x + s.w && pos.y >= s.y && pos.y <= s.y + s.h) {
                    setSelectedSlotIndex(s.id); setActiveTextId(null); setActiveAssetId(null);

                    if (s.hasImage === false) {
                        setSelectedSlotIndex(s.id);
                    }
                    return;
                }
            }
            setSelectedSlotIndex(null); setActiveTextId(null); setActiveAssetId(null);
        }
        // STUDIO MODE LOGIC
        else {
            if (images.length === 0) return;
            if (!isCropping) return;

            setIsDragging(true);
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            lastMousePosRef.current = { x: clientX, y: clientY };
        }
    }, [canvasRef, view, assets, texts, images, isCropping, getPointerPos,
        setActiveAssetId, setSelectedSlotIndex, setActiveTextId, setIsDraggingAsset,
        setIsDraggingText, setIsDragging, slotRectsRef, dragOffsetRef, textMetricsRef, lastMousePosRef
    ]);

    const handlePointerMove = useCallback((e) => {
        // LAYOUT DRAG
        if (view === 'layout') {
            if (isDraggingText && canvasRef.current && activeTextId) {
                e.preventDefault();
                const pos = getPointerPos(e, canvasRef.current);
                const W = canvasRef.current.width; const H = canvasRef.current.height;
                const ctx = canvasRef.current.getContext('2d');

                let newX = pos.x - dragOffsetRef.current.x;
                let newY = pos.y - dragOffsetRef.current.y;

                // Snapping
                const snapThreshold = 15; const centerX = W / 2;
                const sideMargin = W * 0.018; const photoLeft = sideMargin; const photoRight = W - sideMargin;
                let guidesFound = []; const currentHalfW = textMetricsRef.current.w / 2;

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
                let newX = pos.x - dragOffsetRef.current.x;
                let newY = pos.y - dragOffsetRef.current.y;
                setAssets(prev => prev.map(a => a.id === activeAssetId ? { ...a, x: newX / W, y: newY / H } : a));
            }
        }
        // STUDIO DRAG
        else if (isDragging) {
            e.preventDefault();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const dx = clientX - lastMousePosRef.current.x;
            const dy = clientY - lastMousePosRef.current.y;
            if (isCropping) { const speedFactor = 1.5; setCropPos(prev => ({ x: prev.x + (dx * speedFactor), y: prev.y + (dy * speedFactor) })); }
            lastMousePosRef.current = { x: clientX, y: clientY };
        }
    }, [view, isDraggingText, isDraggingAsset, isDragging, canvasRef, activeTextId, activeAssetId,
        texts, isCropping, getPointerPos, setActiveGuides, setTexts, setAssets,
        setCropPos, dragOffsetRef, textMetricsRef, lastMousePosRef]);

    const handlePointerUp = useCallback(() => {
        setIsDragging(false);
        setIsDraggingText(false);
        setIsDraggingAsset(false);
        setActiveGuides([]);
    }, [setIsDragging, setIsDraggingText, setIsDraggingAsset, setActiveGuides]);

    return { handlePointerDown, handlePointerMove, handlePointerUp };
}
