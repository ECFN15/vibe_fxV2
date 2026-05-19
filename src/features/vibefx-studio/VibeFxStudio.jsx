"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';


// --- DATA ---
import { FORMATS, TEMPLATES, FONT_OPTIONS, PRESET_CATEGORIES, CAMERA_BRANDS } from './data/constants';

// --- COMPOSANTS ---
import VisionPanel from './components/panels/VisionPanel';
import FusionPanel from './components/panels/FusionPanel';
import StylePanel from './components/panels/StylePanel';
import Header from './components/Header';
import CanvasWorkspace from './components/canvas/CanvasWorkspace';
import LayoutSidebar from './components/sidebar/LayoutSidebar';
import ExportModal from './components/modals/ExportModal';
import InstaPreviewModal from './components/modals/InstaPreviewModal';
import CompareModal from './components/modals/CompareModal';
import AssetLibrary from './components/library/AssetLibrary';
import AssetLibraryModal from './components/modals/AssetLibraryModal';
import VideoApp from './VideoApp';

// --- HOOKS ---
import useExport from './hooks/useExport';
import useImageUpload from './hooks/useImageUpload';
import useLayoutHelpers from './hooks/useLayoutHelpers';
import useCanvasEvents from './hooks/useCanvasEvents';
import useCanvasRenderer from './hooks/useCanvasRenderer';

const canvasToBlob = (canvas, mimeType = 'image/png', quality = 0.92) =>
    new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), mimeType, quality);
    });

const buildSocialImages = async (exportCanvas, activeFormat) => {
    const slices = activeFormat?.id === 'pano-2' ? 2 : activeFormat?.id === 'pano-3' ? 3 : 1;
    if (slices <= 1) {
        return [{
            url: exportCanvas.toDataURL('image/png'),
            blob: await canvasToBlob(exportCanvas, 'image/png'),
            width: exportCanvas.width,
            height: exportCanvas.height,
            index: 0,
        }];
    }

    const sliceWidth = exportCanvas.width / slices;
    const slides = [];
    for (let index = 0; index < slices; index += 1) {
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = sliceWidth;
        sliceCanvas.height = exportCanvas.height;
        const sliceCtx = sliceCanvas.getContext('2d');
        sliceCtx.drawImage(exportCanvas, index * sliceWidth, 0, sliceWidth, exportCanvas.height, 0, 0, sliceWidth, exportCanvas.height);
        slides.push({
            url: sliceCanvas.toDataURL('image/png'),
            blob: await canvasToBlob(sliceCanvas, 'image/png'),
            width: sliceCanvas.width,
            height: sliceCanvas.height,
            index,
        });
    }
    return slides;
};

// --- APP PRINCIPALE ---
function App({ onImportToPublication, onOpenPublications }) {
    const [view, setView] = useState('studio');
    const [images, setImages] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);
    const [selectedBrand, setSelectedBrand] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(true);

    // --- STATE LAYOUT (MAJ) ---
    const [activeFormat, setActiveFormat] = useState(FORMATS[0]);
    const [activeTemplate, setActiveTemplate] = useState(TEMPLATES[0]);
    const [overlayMode, setOverlayMode] = useState('landscape');
    const [activeAccordion, setActiveAccordion] = useState('texts'); // 'texts', 'geometry', 'texture', 'background'

    // Texts & Assets
    const [texts, setTexts] = useState([
        { id: 1, content: 'Vibe_fx', x: 0.5, y: 0.85, font: 'Inter', bold: true, italic: false, color: '#ffffff', tracking: 0, opacity: 100, rotate: 0, blend: 'source-over' }
    ]);
    const [assets, setAssets] = useState([]);
    const [activeTextId, setActiveTextId] = useState(null);
    const [activeAssetId, setActiveAssetId] = useState(null);
    const [isDraggingText, setIsDraggingText] = useState(false);
    const [isDraggingAsset, setIsDraggingAsset] = useState(false);
    const [activeGuides, setActiveGuides] = useState([]);

    // Layout Styles
    const [padding, setPadding] = useState(40);
    const [gap, setGap] = useState(20);
    const [radius, setRadius] = useState(0);
    const [layoutBgColor, setLayoutBgColor] = useState('#000000');
    const [layoutBgBlur, setLayoutBgBlur] = useState(true);
    const [layoutBgTexture, setLayoutBgTexture] = useState(15);
    const [layoutTextures, setLayoutTextures] = useState([]);
    const [activeTextureId, setActiveTextureId] = useState(null);
    const [layoutTextureOpacity, setLayoutTextureOpacity] = useState(70);
    const [layoutBgGradient, setLayoutBgGradient] = useState(false); // New Smart Background
    const [selectedSlotIndex, setSelectedSlotIndex] = useState(null);
    const [slotConfigs, setSlotConfigs] = useState({});

    // Smooth Blur
    const [layoutSmoothBlur, setLayoutSmoothBlur] = useState({
        enabled: false,
        direction: 'down',
        height: 54, // in %
        precision: 35,
        blur: 64, // in px
        preset: 'linear',
        easeType: 'in',
        reverse: false
    });

    // Studio & Fusion State
    const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
    const [cropScale, setCropScale] = useState(1.0);
    const [isCropping, setIsCropping] = useState(false);
    const [cropRatio, setCropRatio] = useState('original');
    const [overlayImage, setOverlayImage] = useState(null);
    const [blendMode, setBlendMode] = useState('screen');
    const [overlayOpacity, setOverlayOpacity] = useState(70);
    const [overlayPos, setOverlayPos] = useState({ x: 0, y: 0 });
    const [overlayScale, setOverlayScale] = useState(100);
    const [showGuidelines, setShowGuidelines] = useState(true);

    const [fusionConfig, setFusionConfig] = useState({
        colors: ['#6366f1', '#a855f7', '#ec4899', '#f43f5e'],
        noise: 40,
        maskShape: 'blob1',
        imageScale: 100,
        imagePos: { x: 0, y: 0 },
        blendMode: 'normal',
        perImageConfigs: {}
    });
    const [selectedImgIndex, setSelectedImgIndex] = useState(null);

    // System
    const [isDragging, setIsDragging] = useState(false);
    const lastMousePos = useRef({ x: 0, y: 0 });
    const dragOffset = useRef({ x: 0, y: 0 });
    const textMetrics = useRef({ w: 0, h: 0 });

    const [isProcessing, setIsProcessing] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingStatus, setLoadingStatus] = useState("");
    const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
    const [isInstaPreviewOpen, setIsInstaPreviewOpen] = useState(false);
    const [instaPreviewUrl, setInstaPreviewUrl] = useState(null);
    const [fileInfo, setFileInfo] = useState(null);
    const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
    const [libraryModalTarget, setLibraryModalTarget] = useState('foreground'); // 'foreground' | 'background'

    // Filtres (Studio)
    const [filters, setFilters] = useState({
        brightness: 100, contrast: 100, saturation: 100,
        sepia: 0, blur: 0, grain: 0, vignette: 0,
        tintColor: '#ffffff', tintIntensity: 0
    });

    const canvasRef = useRef(null);
    const canvasContainerRef = useRef(null);
    const bgCanvasRef = useRef(null);
    const slotRects = useRef([]);
    const modalBeforeRef = useRef(null);
    const modalAfterRef = useRef(null);
    const requestRef = useRef();

    useEffect(() => {
        document.body.style.backgroundColor = isDarkMode ? '#0a0a0a' : '#f9fafb';
        document.body.style.color = isDarkMode ? 'white' : '#111827';
    }, [isDarkMode]);

    // CHARGEMENT DES POLICES GOOGLE FONTS
    useEffect(() => {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Caveat:wght@400;700&family=Courier+Prime:wght@400;700&family=Dancing+Script:wght@400;700&family=Inter:wght@300;400;600;800&family=Lato:wght@300;400;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&family=Montserrat:wght@300;400;600;800&family=Oswald:wght@400;600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Shadows+Into+Light&family=Cinzel:wght@400;700&family=Prata&family=Nothing+You+Could+Do&family=Covered+By+Your+Grace&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        return () => { document.head.removeChild(link); };
    }, []);

    // --- HOOKS: LAYOUT HELPERS ---
    const {
        addText, addAsset,
        updateActiveAsset, deleteActiveAsset,
        updateActiveText, deleteActiveText,
        getActiveText, getActiveAsset,
        updateSlotConfig, moveLayoutImage,
        currentText, currentAsset,
    } = useLayoutHelpers({
        texts, setTexts, assets, setAssets,
        activeTextId, setActiveTextId,
        activeAssetId, setActiveAssetId,
        selectedSlotIndex, setSelectedSlotIndex,
        slotConfigs, setSlotConfigs,
        images, setImages
    });

    // --- HOOKS: CANVAS EVENTS ---
    const { handlePointerDown, handlePointerMove, handlePointerUp } = useCanvasEvents({
        canvasRef, view, images,
        texts, setTexts, assets, setAssets,
        activeTextId, setActiveTextId,
        activeAssetId, setActiveAssetId,
        selectedSlotIndex, setSelectedSlotIndex,
        slotRects,
        isDragging, setIsDragging,
        isDraggingText, setIsDraggingText,
        isDraggingAsset, setIsDraggingAsset,
        activeGuides, setActiveGuides,
        lastMousePos, dragOffset, textMetrics,
        isCropping,
        setOverlayPos, setCropPos,
        fusionConfig, setFusionConfig,
        selectedImgIndex, setSelectedImgIndex,
    });

    // --- HOOKS: CANVAS RENDERER ---
    const { getCanvasDimensions, renderPipeline } = useCanvasRenderer({
        canvasRef, images, view,
        activeFormat, activeTemplate, overlayMode,
        padding, gap, radius,
        layoutBgColor, layoutBgBlur, layoutBgTexture, layoutSmoothBlur,
        layoutTextures, activeTextureId, layoutTextureOpacity,
        selectedSlotIndex, slotConfigs,
        slotRects, bgCanvasRef,
        texts, assets, activeTextId, activeAssetId,
        isDraggingText, activeGuides,
        cropRatio, cropPos, cropScale, isCropping,
        filters,
        isDragging, requestRef,
        fusionConfig,
        selectedImgIndex,
    });


    // --- HOOKS: EXPORT ---
    const {
        exportName, setExportName,
        exportFormat, setExportFormat,
        isExportModalOpen, setIsExportModalOpen,
        exportQuality, setExportQuality,
        estimatedSize,
        handleDownload,
        performExport,
    } = useExport({ images, canvasRef, getCanvasDimensions, renderPipeline, activeFormat });

    const { handleImageUpload } = useImageUpload({
        images, setImages, view, setView,
        setIsProcessing, setLoadingProgress,
        setExportName
    });


    const handleFullscreen = () => { if (canvasRef.current?.requestFullscreen) canvasRef.current.requestFullscreen(); };

    const renderFinalCanvas = useCallback(() => {
        const { width, height } = getCanvasDimensions();
        if (!width || !height) return null;
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = width;
        exportCanvas.height = height;
        renderPipeline(exportCanvas, width, height, false, 'high');
        return { exportCanvas, width, height };
    }, [getCanvasDimensions, renderPipeline]);

    const handleImportPublication = useCallback(async () => {
        if (!images.length || typeof onImportToPublication !== 'function') return;
        const rendered = renderFinalCanvas();
        if (!rendered) return;

        const { exportCanvas, width, height } = rendered;
        const socialImages = await buildSocialImages(exportCanvas, activeFormat);
        const blob = await canvasToBlob(exportCanvas, 'image/png');
        onImportToPublication({
            source: 'vibefx-layout',
            name: exportName,
            mimeType: 'image/png',
            width,
            height,
            dataUrl: exportCanvas.toDataURL('image/png'),
            blob,
            socialImages,
            format: activeFormat,
            template: activeTemplate,
            imagesCount: images.length,
            settings: {
                view,
                overlayMode,
                padding,
                gap,
                radius,
                layoutBgColor,
                layoutBgBlur,
                layoutBgTexture,
                layoutTextures: layoutTextures.map(texture => ({
                    id: texture.id,
                    src: texture.src,
                    name: texture.name,
                })),
                activeTextureId,
                layoutTextureOpacity,
                layoutBgGradient,
                layoutSmoothBlur,
                texts,
                assets,
                slotConfigs,
                filters,
                fusionConfig,
            },
            createdAt: new Date().toISOString(),
        });
    }, [
        activeFormat,
        activeTemplate,
        activeTextureId,
        assets,
        exportName,
        filters,
        fusionConfig,
        gap,
        images.length,
        layoutBgBlur,
        layoutBgColor,
        layoutBgGradient,
        layoutBgTexture,
        layoutSmoothBlur,
        layoutTextureOpacity,
        layoutTextures,
        onImportToPublication,
        overlayMode,
        padding,
        radius,
        renderFinalCanvas,
        slotConfigs,
        texts,
        view,
    ]);

    const resetImages = () => {
        // Ne pas vider le tableau images pour garder l'image à l'écran
        // setImages([]); 
        setOverlayImage(null);
        setTexts([]);
        setLayoutTextures([]);
        setActiveTextureId(null);
        setLayoutTextureOpacity(70);
        setActiveTextId(null);
        setFilters({ brightness: 100, contrast: 100, saturation: 100, sepia: 0, blur: 0, grain: 0, vignette: 0, tintColor: '#ffffff', tintIntensity: 0 });

        // Réinitialiser les sélections de presets
        setActiveCategory(null);
        setSelectedBrand(null);

        // Réinitialiser le crop
        setCropPos({ x: 0, y: 0 });
        setCropScale(1.0);
        setIsCropping(false);
        setCropRatio('original');

        // Réinitialiser Fusion
        setFusionConfig({
            colors: ['#6366f1', '#a855f7', '#ec4899', '#f43f5e'],
            noise: 40,
            maskShape: 'blob1',
            imageScale: 100,
            imagePos: { x: 0, y: 0 },
            blendMode: 'normal'
        });
    };

    const isDraggable = (view === 'fusion') || (view === 'studio' && isCropping) || (view === 'layout');

    const handleAssetImport = useCallback((imageUrl, type) => {
        // Build a list of URLs to try in order of priority
        const urlsToTry = [];

        // 1. If it's already a local /api/ URL, try it first
        if (imageUrl.startsWith('/api/')) {
            urlsToTry.push(imageUrl);
        }

        // 2. If it's a CDN URL, proxy it through our server
        if (imageUrl.includes('cdn.midjourney.com') || imageUrl.includes('midjourney.com')) {
            urlsToTry.push(`/api/proxy-image?url=${encodeURIComponent(imageUrl)}`);
            // Also try .png variant if URL ends with .webp
            if (imageUrl.includes('.webp')) {
                urlsToTry.push(`/api/proxy-image?url=${encodeURIComponent(imageUrl.replace('.webp', '.png'))}`);
            }
        }

        // 3. If we have the raw URL and it's not already queued
        if (!imageUrl.startsWith('/api/') && !imageUrl.includes('midjourney.com')) {
            urlsToTry.push(imageUrl);
        }

        let currentIndex = 0;

        const tryNext = () => {
            if (currentIndex >= urlsToTry.length) {
                console.error("All import URLs failed for:", imageUrl);
                alert("L'image n'a pas pu être importée. Essayez de rafraîchir la page.");
                return;
            }

            const url = urlsToTry[currentIndex];
            currentIndex++;

            const img = new window.Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                if (type === 'background') {
                    setImages([img]);
                    setView('studio');
                } else if (type === 'overlay') {
                    setOverlayImage(img);
                    setView('fusion');
                } else if (type === 'slot') {
                    setImages(prev => [...prev, img]);
                    setView('layout');
                } else if (type === 'texture') {
                    const textureId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                    setLayoutTextures(prev => [
                        ...prev,
                        {
                            id: textureId,
                            image: img,
                            src: img.src,
                            name: `Texture ${prev.length + 1}`,
                        },
                    ]);
                    setActiveTextureId(textureId);
                    setActiveAccordion('texture');
                    setView('layout');
                }
            };
            img.onerror = () => {
                console.warn(`Import attempt failed (${currentIndex}/${urlsToTry.length}):`, url);
                tryNext();
            };

            // Add cache-buster to avoid stale CORS cache
            const separator = url.includes('?') ? '&' : '?';
            img.src = `${url}${separator}vibe_cache=${Date.now()}`;
        };

        tryNext();
    }, [setImages, setView, setOverlayImage, setLayoutTextures, setActiveTextureId, setActiveAccordion]);

    // --- COMPARE MODAL RENDERING ---
    useEffect(() => {
        if (isCompareModalOpen && modalBeforeRef.current && modalAfterRef.current && canvasRef.current && images.length > 0) {
            const { width, height } = getCanvasDimensions();

            // AFTER: Copy current canvas
            modalAfterRef.current.width = width;
            modalAfterRef.current.height = height;
            const ctxA = modalAfterRef.current.getContext('2d');
            ctxA.drawImage(canvasRef.current, 0, 0);

            // BEFORE: Draw original first image at its native resolution to avoid stretching
            const img = images[0];
            modalBeforeRef.current.width = img.width;
            modalBeforeRef.current.height = img.height;
            const ctxB = modalBeforeRef.current.getContext('2d');
            ctxB.drawImage(img, 0, 0);
        }
    }, [isCompareModalOpen, images, getCanvasDimensions]);

    const activeConfig = selectedSlotIndex !== null ? (slotConfigs[selectedSlotIndex] || { zoom: 1, x: 0, y: 0, border: 0, blur: 0 }) : null;

    if (view === 'video') {
        return <VideoApp onBack={() => setView('studio')} />;
    }

    return (
        <div className={`min-h-screen flex flex-col h-screen overflow-hidden font-sans transition-colors duration-300 ${isDarkMode ? 'bg-black text-gray-300 selection:bg-indigo-900 selection:text-white' : 'bg-gray-50 text-gray-900 selection:bg-indigo-200 selection:text-indigo-900'}`}>
            <Header
                isDarkMode={isDarkMode}
                setIsDarkMode={setIsDarkMode}
                view={view}
                setView={setView}
                hasImages={images.length > 0}
                onReset={resetImages}
                onExport={handleDownload}
                onImportPublication={typeof onImportToPublication === 'function' ? handleImportPublication : null}
                onOpenPublications={onOpenPublications}
            />

            <main className="flex-1 w-full flex overflow-hidden bg-grid-pattern">
                {view === 'library' ? (
                    <AssetLibrary
                        isDarkMode={isDarkMode}
                        onUseAsset={handleAssetImport}
                    />
                ) : (
                    <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
                        {/* CANVAS AREA */}
                        <CanvasWorkspace
                            isDarkMode={isDarkMode}
                            isDraggable={isDraggable}
                            canvasContainerRef={canvasContainerRef}
                            canvasRef={canvasRef}
                            images={images}
                            view={view}
                            isProcessing={isProcessing}
                            loadingStatus={loadingStatus}
                            loadingProgress={loadingProgress}
                            onOpenLibrarySelector={() => {
                                setLibraryModalTarget('foreground');
                                setIsLibraryModalOpen(true);
                            }}
                            handlePointerDown={handlePointerDown}
                            handlePointerMove={handlePointerMove}
                            handlePointerUp={handlePointerUp}
                            handleImageUpload={handleImageUpload}
                            handleFullscreen={handleFullscreen}
                            onCompareOpen={() => setIsCompareModalOpen(true)}
                            onInstaPreview={() => { setInstaPreviewUrl(canvasRef.current.toDataURL()); setIsInstaPreviewOpen(true); }}
                            selectedSlotIndex={selectedSlotIndex}
                            activeTextId={activeTextId}
                            activeTemplate={activeTemplate}
                            isDraggingText={isDraggingText}
                            isCropping={isCropping}
                            setImages={setImages}
                            fusionConfig={fusionConfig}
                            selectedImgIndex={selectedImgIndex}
                            setSelectedImgIndex={setSelectedImgIndex}
                            activeFormat={activeFormat}
                            showGuidelines={showGuidelines}
                        />

                        {/* SIDEBAR */}
                        <div className={`lg:col-span-4 flex flex-col h-full border-l backdrop-blur-md overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-black/80 border-neutral-800' : 'bg-white border-gray-200'}`}>

                            {/* VIEW: STUDIO */}
                            {view === 'studio' && (
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 relative">
                                    <StylePanel
                                        isDarkMode={isDarkMode}
                                        activeCategory={activeCategory}
                                        setActiveCategory={setActiveCategory}
                                        filters={filters}
                                        setFilters={setFilters}
                                        images={images}
                                    />
                                </div>
                            )}

                            {view === 'fusion' && (
                                <FusionPanel
                                    isDarkMode={isDarkMode}
                                    config={fusionConfig}
                                    setConfig={setFusionConfig}
                                    activeFormat={activeFormat}
                                    setActiveFormat={setActiveFormat}
                                    images={images}
                                    onOpenLibrarySelector={() => {
                                        setLibraryModalTarget('background');
                                        setIsLibraryModalOpen(true);
                                    }}
                                    selectedImgIndex={selectedImgIndex}
                                    setSelectedImgIndex={setSelectedImgIndex}
                                />
                            )}

                            {/* VIEW: LAYOUT */}
                            {view === 'layout' && (
                                <LayoutSidebar
                                    images={images}
                                    isDarkMode={isDarkMode}
                                    selectedSlotIndex={selectedSlotIndex}
                                    setSelectedSlotIndex={setSelectedSlotIndex}
                                    activeConfig={activeConfig}
                                    updateSlotConfig={updateSlotConfig}
                                    activeFormat={activeFormat}
                                    setActiveFormat={setActiveFormat}
                                    activeTemplate={activeTemplate}
                                    setActiveTemplate={setActiveTemplate}
                                    setActiveTextId={setActiveTextId}
                                    overlayMode={overlayMode}
                                    setOverlayMode={setOverlayMode}
                                    activeAccordion={activeAccordion}
                                    setActiveAccordion={setActiveAccordion}
                                    addText={addText}
                                    addAsset={addAsset}
                                    currentText={currentText}
                                    currentAsset={currentAsset}
                                    updateActiveText={updateActiveText}
                                    deleteActiveText={deleteActiveText}
                                    setActiveAssetId={setActiveAssetId}
                                    deleteActiveAsset={deleteActiveAsset}
                                    activeAssetId={activeAssetId}
                                    setAssets={setAssets}
                                    assets={assets}
                                    padding={padding}
                                    setPadding={setPadding}
                                    gap={gap}
                                    setGap={setGap}
                                    radius={radius}
                                    setRadius={setRadius}
                                    layoutBgBlur={layoutBgBlur}
                                    setLayoutBgBlur={setLayoutBgBlur}
                                    layoutBgColor={layoutBgColor}
                                    setLayoutBgColor={setLayoutBgColor}
                                    layoutBgTexture={layoutBgTexture}
                                    setLayoutBgTexture={setLayoutBgTexture}
                                    layoutTextures={layoutTextures}
                                    activeTextureId={activeTextureId}
                                    setActiveTextureId={setActiveTextureId}
                                    setLayoutTextures={setLayoutTextures}
                                    layoutTextureOpacity={layoutTextureOpacity}
                                    setLayoutTextureOpacity={setLayoutTextureOpacity}
                                    layoutSmoothBlur={layoutSmoothBlur}
                                    setLayoutSmoothBlur={setLayoutSmoothBlur}
                                    showGuidelines={showGuidelines}
                                    setShowGuidelines={setShowGuidelines}
                                />
                            )}

                            {/* VIEW: VISION PRO */}
                            {view === 'vision-pro' && (
                                <VisionPanel
                                    isDarkMode={isDarkMode}
                                    selectedBrand={selectedBrand}
                                    setSelectedBrand={setSelectedBrand}
                                    images={images}
                                    filters={filters}
                                    setFilters={setFilters}
                                />
                            )}
                        </div>
                    </div>
                )}


                {/* MODALS */}
                <CompareModal
                    isDarkMode={isDarkMode}
                    isOpen={isCompareModalOpen}
                    onClose={() => setIsCompareModalOpen(false)}
                    modalBeforeRef={modalBeforeRef}
                    modalAfterRef={modalAfterRef}
                />
                <InstaPreviewModal
                    isDarkMode={isDarkMode}
                    isOpen={isInstaPreviewOpen}
                    previewUrl={instaPreviewUrl}
                    onClose={() => setIsInstaPreviewOpen(false)}
                    activeFormat={activeFormat}
                />
                <AssetLibraryModal
                    isDarkMode={isDarkMode}
                    isOpen={isLibraryModalOpen}
                    onClose={() => setIsLibraryModalOpen(false)}
                    onSelect={async (asset) => {
                        if (!asset || !asset.src) return;

                        try {
                            const response = await fetch(asset.src);
                            const blob = await response.blob();
                            const blobUrl = URL.createObjectURL(blob);

                            const img = new Image();
                            img.onload = () => {
                                // URL.revokeObjectURL(blobUrl);
                                if (libraryModalTarget === 'foreground') {
                                    setImages(prev => [...prev, img]);
                                } else if (libraryModalTarget === 'background') {
                                    setFusionConfig(prev => ({ ...prev, bgMode: 'image', bgImage: img }));
                                }
                            };
                            img.onerror = () => {
                                // URL.revokeObjectURL(blobUrl);
                                console.error("Canvas image load failed");
                            };
                            img.src = blobUrl;

                        } catch (e) {
                            console.error("Fetch proxy fallback:", e);
                            const img = new Image();
                            img.crossOrigin = "anonymous";
                            img.onload = () => {
                                if (libraryModalTarget === 'foreground') {
                                    setImages(prev => [...prev, img]);
                                } else if (libraryModalTarget === 'background') {
                                    setFusionConfig(prev => ({ ...prev, bgMode: 'image', bgImage: img }));
                                }
                            };
                            img.src = asset.src;
                        }
                    }}
                />
                <ExportModal
                    isDarkMode={isDarkMode}
                    isOpen={isExportModalOpen}
                    onClose={() => setIsExportModalOpen(false)}
                    exportName={exportName}
                    setExportName={setExportName}
                    exportFormat={exportFormat}
                    setExportFormat={setExportFormat}
                    exportQuality={exportQuality}
                    setExportQuality={setExportQuality}
                    estimatedSize={estimatedSize}
                    onExport={performExport}
                />
            </main>
        </div>
    );
}

export default App;
