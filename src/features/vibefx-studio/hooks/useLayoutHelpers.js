import { useCallback, useMemo } from 'react';

/**
 * useLayoutHelpers — Gère les opérations CRUD sur les textes, assets, slots et images.
 */
export default function useLayoutHelpers({
    texts, setTexts,
    assets, setAssets,
    activeTextId, setActiveTextId,
    activeAssetId, setActiveAssetId,
    selectedSlotIndex, setSelectedSlotIndex,
    slotConfigs, setSlotConfigs,
    images, setImages
}) {
    const addText = useCallback(() => {
        const newId = Date.now();
        const offset = texts.length * 0.05;
        setTexts(prev => [...prev, {
            id: newId,
            content: 'Nouveau Texte',
            x: 0.5, y: 0.5 + offset,
            font: 'Inter',
            bold: true, italic: false,
            color: '#ffffff',
            tracking: 0,
            rotate: 0,
            blend: 'source-over',
            opacity: 100,
            bgStyle: 'none',
            bgColor: '#000000',
            bgOpacity: 80,
            padding: 15
        }]);
        setActiveTextId(newId);
        setSelectedSlotIndex(null);
    }, [texts.length, setTexts, setActiveTextId, setSelectedSlotIndex]);

    const addAsset = useCallback((type) => {
        const newId = Date.now();
        setAssets(prev => [...prev, { id: newId, type, x: 0.5, y: 0.5, scale: 0.5, opacity: 90, rotate: -5, blend: 'source-over' }]);
        setActiveAssetId(newId);
        setActiveTextId(null);
        setSelectedSlotIndex(null);
    }, [setAssets, setActiveAssetId, setActiveTextId, setSelectedSlotIndex]);

    const updateActiveAsset = useCallback((key, value) => {
        if (!activeAssetId) return;
        setAssets(prev => prev.map(a => a.id === activeAssetId ? { ...a, [key]: value } : a));
    }, [activeAssetId, setAssets]);

    const deleteActiveAsset = useCallback(() => {
        if (!activeAssetId) return;
        setAssets(prev => prev.filter(a => a.id !== activeAssetId));
        setActiveAssetId(null);
    }, [activeAssetId, setAssets, setActiveAssetId]);

    const updateActiveText = useCallback((key, value) => {
        if (!activeTextId) return;
        setTexts(prev => prev.map(t => t.id === activeTextId ? { ...t, [key]: value } : t));
    }, [activeTextId, setTexts]);

    const deleteActiveText = useCallback(() => {
        if (!activeTextId) return;
        setTexts(prev => prev.filter(t => t.id !== activeTextId));
        setActiveTextId(null);
    }, [activeTextId, setTexts, setActiveTextId]);

    const getActiveText = useCallback(() => texts.find(t => t.id === activeTextId), [texts, activeTextId]);
    const getActiveAsset = useCallback(() => assets.find(a => a.id === activeAssetId), [assets, activeAssetId]);

    const updateSlotConfig = useCallback((key, value) => {
        if (selectedSlotIndex === null) return;
        setSlotConfigs(prev => ({
            ...prev,
            [selectedSlotIndex]: {
                ...(prev[selectedSlotIndex] || { zoom: 1, x: 0, y: 0, border: 0, blur: 0 }),
                [key]: value
            }
        }));
    }, [selectedSlotIndex, setSlotConfigs]);

    const moveLayoutImage = useCallback((index, direction) => {
        if ((direction === -1 && index > 0) || (direction === 1 && index < images.length - 1)) {
            const newImages = [...images];
            const target = index + direction;
            [newImages[index], newImages[target]] = [newImages[target], newImages[index]];
            setImages(newImages);
        }
    }, [images, setImages]);

    // Computed values
    const currentText = useMemo(() => texts.find(t => t.id === activeTextId), [texts, activeTextId]);
    const currentAsset = useMemo(() => assets.find(a => a.id === activeAssetId), [assets, activeAssetId]);

    return {
        addText, addAsset,
        updateActiveAsset, deleteActiveAsset,
        updateActiveText, deleteActiveText,
        getActiveText, getActiveAsset,
        updateSlotConfig, moveLayoutImage,
        currentText, currentAsset,
    };
}
