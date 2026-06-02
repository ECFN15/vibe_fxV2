import { useCallback } from 'react';

const readImageFile = (file) => new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
        img.name = file.name;
        resolve(img);
    };
    img.onerror = () => {
        const reader = new FileReader();
        reader.onload = (evt) => {
            const fallbackImg = new Image();
            fallbackImg.onload = () => {
                fallbackImg.name = file.name;
                resolve(fallbackImg);
            };
            fallbackImg.onerror = () => resolve(null);
            fallbackImg.src = evt.target.result;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    };
    img.src = url;
});

/**
 * useImageUpload - handles source image uploads for studio and layout.
 * Uses createObjectURL first to avoid Base64 overhead, with FileReader fallback.
 */
export default function useImageUpload({
    images, setImages, view, setView,
    setIsProcessing, setLoadingProgress,
    setExportName
}) {
    const handleImageUpload = useCallback(async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setIsProcessing(true);
        setLoadingProgress(0);
        const newImages = [];
        const total = files.length;
        setExportName(files[0].name.split('.')[0] + "_edit");

        for (let i = 0; i < total; i += 1) {
            const file = files[i];
            const img = await readImageFile(file);
            if (img) newImages.push(img);
            setLoadingProgress(Math.round(((i + 1) / total) * 100));
        }

        setImages(prev => [...prev, ...newImages]);
        setIsProcessing(false);
        if (view === 'studio' && (images.length + newImages.length) > 1) setView('layout');
        e.target.value = '';
    }, [images, view, setImages, setView, setIsProcessing, setLoadingProgress, setExportName]);

    const handleReplaceImageUpload = useCallback(async (e, replaceIndex) => {
        const file = e.target.files?.[0];
        if (!file || replaceIndex < 0) return;

        setIsProcessing(true);
        setLoadingProgress(0);
        setExportName(file.name.split('.')[0] + "_edit");

        const img = await readImageFile(file);
        if (img) {
            setImages(prev => prev.map((current, index) => (index === replaceIndex ? img : current)));
        }

        setLoadingProgress(100);
        setIsProcessing(false);
        e.target.value = '';
    }, [setImages, setIsProcessing, setLoadingProgress, setExportName]);

    return { handleImageUpload, handleReplaceImageUpload };
}
