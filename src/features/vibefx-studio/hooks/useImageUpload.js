import { useCallback } from 'react';

/**
 * useImageUpload — Gère l'upload d'images et d'overlays.
 * v3: Uses createObjectURL instead of readAsDataURL (33% less memory).
 */
export default function useImageUpload({
    images, setImages, view, setView,
    setIsProcessing, setLoadingProgress,
    setExportName, setOverlayImage, setBlendMode
}) {
    const handleImageUpload = useCallback(async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        setIsProcessing(true);
        setLoadingProgress(0);
        const newImages = [];
        const total = files.length;
        if (files.length > 0) setExportName(files[0].name.split('.')[0] + "_edit");

        for (let i = 0; i < total; i++) {
            const file = files[i];
            await new Promise((resolve, reject) => {
                // Use createObjectURL instead of readAsDataURL — avoids Base64 encoding overhead
                const url = URL.createObjectURL(file);
                const img = new Image();
                img.onload = () => {
                    // URL.revokeObjectURL(url);
                    newImages.push(img);
                    resolve();
                };
                img.onerror = () => {
                    // URL.revokeObjectURL(url);
                    // Fallback to readAsDataURL for edge cases
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        const fallbackImg = new Image();
                        fallbackImg.onload = () => { newImages.push(fallbackImg); resolve(); };
                        fallbackImg.onerror = () => resolve(); // Skip broken files
                        fallbackImg.src = evt.target.result;
                    };
                    reader.readAsDataURL(file);
                };
                img.src = url;
            });
            setLoadingProgress(Math.round(((i + 1) / total) * 100));
        }
        setImages(prev => [...prev, ...newImages]);
        setIsProcessing(false);
        if (view === 'studio' && (images.length + newImages.length) > 1) setView('layout');
    }, [images, view, setImages, setView, setIsProcessing, setLoadingProgress, setExportName]);

    const handleOverlayUpload = useCallback((e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            // URL.revokeObjectURL(url);
            setOverlayImage(img);
            setBlendMode('screen');
        };
        img.onerror = () => {
            // URL.revokeObjectURL(url);
        };
        img.src = url;
    }, [setOverlayImage, setBlendMode]);

    return { handleImageUpload, handleOverlayUpload };
}
