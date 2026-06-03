import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BatteryMedium,
  Bookmark,
  Camera,
  ChevronLeft,
  CircleHelp,
  Download,
  Heart,
  LayoutTemplate,
  MessageCircle,
  MoreHorizontal,
  PlayCircle,
  Send,
  Wifi,
  X,
} from 'lucide-react';

import CanvasWorkspace from './components/canvas/CanvasWorkspace';
import LayoutSidebar from './components/sidebar/LayoutSidebar';
import LayoutDemoOverlay from './components/tutorial/LayoutDemoOverlay';
import LayoutTutorialOverlay from './components/tutorial/LayoutTutorialOverlay';
import { FORMATS, TEMPLATES } from './data/constants';
import useCanvasEvents from './hooks/useCanvasEvents';
import useCanvasRenderer from './hooks/useCanvasRenderer';
import useImageUpload from './hooks/useImageUpload';
import useLayoutHelpers from './hooks/useLayoutHelpers';
import { createCustomZone, normalizeCustomZones, updateCustomTemplateZones } from './utils/customLayout';

const DEFAULT_TEXT = {
  id: 1,
  content: 'Vibe_fx Studio',
  x: 0.5,
  y: 0.85,
  font: 'Inter',
  bold: true,
  italic: false,
  color: '#ffffff',
  tracking: 0,
  opacity: 100,
  rotate: 0,
  blend: 'source-over',
};

const DEFAULT_SMOOTH_BLUR = {
  enabled: false,
  direction: 'down',
  height: 54,
  precision: 35,
  blur: 64,
  preset: 'linear',
  easeType: 'in',
  reverse: false,
};

const DEMO_IMAGE_URL = '/assets/vibefx/demo-astronaut.png';
const DEMO_TEXT_ID = 'vibefx-demo-title';

const DEMO_SCRIPT = [
  {
    id: 'import',
    title: 'Je charge l image cobaye',
    body: 'La demo importe automatiquement l image placee dans imagevibefx. Rien a cliquer ici : regardez simplement le canvas se remplir.',
    cursor: { x: 31, y: 55 },
    bubble: { x: 24, y: 27 },
    duration: 2600,
  },
  {
    id: 'format',
    title: 'Premier choix : le format',
    body: 'Le format fixe la sortie finale. Pour Instagram, Portrait donne une bonne surface verticale sans passer en plein ecran Story.',
    cursor: { x: 72, y: 25 },
    bubble: { x: 52, y: 22 },
    duration: 2800,
  },
  {
    id: 'model',
    title: 'Le modele change le chemin',
    body: 'Je passe en Pic-in-Pic : le panneau revele alors Style Overlay. Certaines options apparaissent seulement apres ce choix.',
    cursor: { x: 82, y: 39 },
    bubble: { x: 52, y: 34 },
    duration: 3200,
  },
  {
    id: 'image-zone',
    title: 'Clic sur une zone image',
    body: 'La zone selectionnee ouvre Zoom, Position X/Y, Bordure et Flou. Ces reglages touchent uniquement cette zone du modele.',
    cursor: { x: 43, y: 49 },
    bubble: { x: 15, y: 37 },
    duration: 3400,
  },
  {
    id: 'text-create',
    title: 'Creation d une zone de texte',
    body: 'J ouvre Textes & Boutons et je cree un titre. Le texte peut ensuite etre modifie dans le panneau ou attrape directement sur le canvas.',
    cursor: { x: 84, y: 62 },
    bubble: { x: 50, y: 55 },
    duration: 3600,
  },
  {
    id: 'text-move',
    title: 'La souris deplace le texte',
    body: 'Le curseur glisse le titre vers le bas. Pendant un vrai drag, les guides aident a aligner centre, bords et autres textes.',
    cursor: { x: 44, y: 66 },
    bubble: { x: 17, y: 56 },
    duration: 3600,
  },
  {
    id: 'text-bubble',
    title: 'Style Bulle lisible',
    body: 'Une bulle de fond rend le texte lisible meme sur une photo chargee. Couleur texte, couleur fond, padding, radius et glow se reglent ici.',
    cursor: { x: 86, y: 57 },
    bubble: { x: 52, y: 48 },
    duration: 3600,
  },
  {
    id: 'text-tech',
    title: 'Style Tech Corners',
    body: 'Le meme texte peut basculer vers un rendu plus graphique. Certains styles revelent leurs propres controles, comme la taille des coins.',
    cursor: { x: 86, y: 57 },
    bubble: { x: 53, y: 42 },
    duration: 3300,
  },
  {
    id: 'geometry',
    title: 'Geometrie : marges et rythme',
    body: 'Je passe en Mosaique pour montrer Gap, Padding et Radius. Si un modele a une seule zone, certaines commandes se cachent logiquement.',
    cursor: { x: 84, y: 80 },
    bubble: { x: 49, y: 62 },
    duration: 3600,
  },
  {
    id: 'background',
    title: 'Fond global et matiere',
    body: 'Fond Global controle le flou arriere-plan, le grain, la couleur, les guides pano et le Flou Lisse Pro pour donner de la profondeur.',
    cursor: { x: 84, y: 88 },
    bubble: { x: 48, y: 58 },
    duration: 3600,
  },
  {
    id: 'pano',
    title: 'Test carrousel panoramique',
    body: 'En Pano x2, les guides rouges montrent les coupes. A l import, le studio prepare aussi les slides sociaux decoupes.',
    cursor: { x: 90, y: 25 },
    bubble: { x: 52, y: 22 },
    duration: 3400,
  },
  {
    id: 'finish',
    title: 'Fin de demo',
    body: 'La scene reste en place pour continuer a tester. Stopper garde le rendu actuel, Restaurer revient a l etat avant la demo.',
    cursor: { x: 93, y: 12 },
    bubble: { x: 50, y: 20 },
    duration: 4600,
  },
];

const canvasToBlob = (canvas, mimeType = 'image/png', quality = 0.92) =>
  new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });

const serializeSlotConfigs = (configs) => Object.fromEntries(
  Object.entries(configs || {}).map(([slotId, config]) => {
    const serializableConfig = { ...(config || {}) };
    delete serializableConfig.image;
    return [slotId, serializableConfig];
  })
);

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

export default function VibeFxLayout({ onImportToPublication, onOpenPublications }) {
  const [images, setImages] = useState([]);
  const [activeFormat, setActiveFormat] = useState(FORMATS[0]);
  const [activeTemplate, setActiveTemplate] = useState(TEMPLATES[0]);
  const [overlayMode, setOverlayMode] = useState('landscape');
  const [activeAccordion, setActiveAccordion] = useState('texts');
  const [texts, setTexts] = useState([DEFAULT_TEXT]);
  const [assets, setAssets] = useState([]);
  const [activeTextId, setActiveTextId] = useState(null);
  const [activeAssetId, setActiveAssetId] = useState(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(null);
  const [slotConfigs, setSlotConfigs] = useState({});
  const [customEditMode, setCustomEditMode] = useState(false);
  const [padding, setPadding] = useState(40);
  const [gap, setGap] = useState(20);
  const [radius, setRadius] = useState(0);
  const [layoutBgColor, setLayoutBgColor] = useState('#000000');
  const [layoutBgBlur, setLayoutBgBlur] = useState(true);
  const [layoutBgTexture, setLayoutBgTexture] = useState(15);
  const [layoutSmoothBlur, setLayoutSmoothBlur] = useState(DEFAULT_SMOOTH_BLUR);
  const [showGuidelines, setShowGuidelines] = useState(true);
  const [selectedImgIndex, setSelectedImgIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [isDraggingAsset, setIsDraggingAsset] = useState(false);
  const [activeGuides, setActiveGuides] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [exportName, setExportName] = useState('vibefx-layout');
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [demoStepIndex, setDemoStepIndex] = useState(0);
  const [instagramPreview, setInstagramPreview] = useState(null);
  const [comparePreview, setComparePreview] = useState(null);

  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const bgCanvasRef = useRef(null);
  const slotRects = useRef([]);
  const requestRef = useRef();
  const lastMousePos = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const textMetrics = useRef({ w: 0, h: 0 });
  const demoSnapshotRef = useRef(null);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Caveat:wght@400;700&family=Courier+Prime:wght@400;700&family=Inter:wght@300;400;600;800&family=Lato:wght@300;400;700&family=Montserrat:wght@300;400;600;800&family=Oswald:wght@400;600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const loadDemoImages = useCallback(async () => {
    const loaders = [0, 1, 2].map(() => new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = DEMO_IMAGE_URL;
    }));
    const loaded = await Promise.all(loaders);
    return loaded.filter(Boolean);
  }, []);

  const handleStopDemo = useCallback(() => {
    setIsDemoRunning(false);
    setDemoStepIndex(0);
    setIsProcessing(false);
    setLoadingProgress(0);
  }, []);

  const handleRestoreDemo = useCallback(() => {
    const snapshot = demoSnapshotRef.current;
    if (!snapshot) {
      handleStopDemo();
      return;
    }

    setImages(snapshot.images);
    setActiveFormat(snapshot.activeFormat);
    setActiveTemplate(snapshot.activeTemplate);
    setOverlayMode(snapshot.overlayMode);
    setActiveAccordion(snapshot.activeAccordion);
    setTexts(snapshot.texts);
    setAssets(snapshot.assets);
    setActiveTextId(snapshot.activeTextId);
    setActiveAssetId(snapshot.activeAssetId);
    setSelectedSlotIndex(snapshot.selectedSlotIndex);
    setSlotConfigs(snapshot.slotConfigs);
    setCustomEditMode(snapshot.customEditMode);
    setPadding(snapshot.padding);
    setGap(snapshot.gap);
    setRadius(snapshot.radius);
    setLayoutBgColor(snapshot.layoutBgColor);
    setLayoutBgBlur(snapshot.layoutBgBlur);
    setLayoutBgTexture(snapshot.layoutBgTexture);
    setLayoutSmoothBlur(snapshot.layoutSmoothBlur);
    setShowGuidelines(snapshot.showGuidelines);
    setExportName(snapshot.exportName);
    handleStopDemo();
  }, [handleStopDemo]);

  const handleStartDemo = useCallback(() => {
    demoSnapshotRef.current = {
      images: [...images],
      activeFormat,
      activeTemplate,
      overlayMode,
      activeAccordion,
      texts: texts.map((text) => ({ ...text })),
      assets: assets.map((asset) => ({ ...asset })),
      activeTextId,
      activeAssetId,
      selectedSlotIndex,
      slotConfigs: { ...slotConfigs },
      customEditMode,
      padding,
      gap,
      radius,
      layoutBgColor,
      layoutBgBlur,
      layoutBgTexture,
      layoutSmoothBlur: { ...layoutSmoothBlur },
      showGuidelines,
      exportName,
    };
    setIsTutorialOpen(false);
    setIsDemoRunning(true);
    setDemoStepIndex(0);
  }, [
    activeAccordion,
    activeAssetId,
    activeFormat,
    activeTemplate,
    customEditMode,
    activeTextId,
    assets,
    exportName,
    gap,
    images,
    layoutBgBlur,
    layoutBgColor,
    layoutBgTexture,
    layoutSmoothBlur,
    overlayMode,
    padding,
    radius,
    selectedSlotIndex,
    showGuidelines,
    slotConfigs,
    texts,
  ]);

  useEffect(() => {
    if (!isDemoRunning) return undefined;
    const step = DEMO_SCRIPT[demoStepIndex];
    if (!step) {
      const timer = window.setTimeout(() => {
        handleStopDemo();
      }, 0);
      return () => window.clearTimeout(timer);
    }

    let active = true;
    const applyStep = async () => {
      const portrait = FORMATS.find((format) => format.id === 'insta-port') || FORMATS[0];
      const pano = FORMATS.find((format) => format.id === 'pano-2') || portrait;
      const minimal = TEMPLATES.find((template) => template.id === 'minimal') || TEMPLATES[0];
      const pip = TEMPLATES.find((template) => template.id === 'pip') || minimal;
      const mosaic = TEMPLATES.find((template) => template.id === 'mosaic') || minimal;

      if (step.id === 'import') {
        setIsProcessing(true);
        setLoadingProgress(18);
        setSelectedSlotIndex(null);
        setActiveTextId(null);
        setActiveAccordion(null);
        setExportName('demo-vibefx-astronaut');
        const demoImages = await loadDemoImages();
        if (!active) return;
        if (demoImages.length) setImages(demoImages);
        setLoadingProgress(100);
        setIsProcessing(false);
      }

      if (step.id === 'format') {
        setActiveFormat(portrait);
        setActiveTemplate(minimal);
        setPadding(44);
        setGap(20);
        setRadius(18);
        setLayoutBgBlur(true);
        setLayoutBgTexture(12);
        setLayoutSmoothBlur(DEFAULT_SMOOTH_BLUR);
        setTexts([]);
        setActiveAccordion(null);
        setSelectedSlotIndex(null);
      }

      if (step.id === 'model') {
        setActiveTemplate(pip);
        setOverlayMode('landscape');
        setPadding(54);
        setRadius(34);
        setSelectedSlotIndex(null);
        setActiveAccordion(null);
      }

      if (step.id === 'image-zone') {
        setSelectedSlotIndex(1);
        setActiveTextId(null);
        setSlotConfigs({
          0: { zoom: 1.08, x: -6, y: 0, border: 0, blur: 0 },
          1: { zoom: 1.72, x: 10, y: -5, border: 8, blur: 0 },
        });
      }

      if (step.id === 'text-create') {
        setSelectedSlotIndex(null);
        setActiveAccordion('texts');
        setTexts([{
          id: DEMO_TEXT_ID,
          content: 'ORBIT GARDEN',
          x: 0.5,
          y: 0.52,
          font: '"Playfair Display"',
          bold: true,
          italic: false,
          color: '#ffffff',
          tracking: 3,
          opacity: 100,
          rotate: 0,
          blend: 'source-over',
          scale: 128,
          bgStyle: 'none',
          bgColor: '#000000',
          bgOpacity: 80,
          padding: 16,
          shadowBlur: 14,
        }]);
        setActiveTextId(DEMO_TEXT_ID);
      }

      if (step.id === 'text-move') {
        setActiveAccordion('texts');
        setActiveTextId(DEMO_TEXT_ID);
        setTexts((prev) => prev.map((text) => (
          text.id === DEMO_TEXT_ID
            ? { ...text, x: 0.52, y: 0.74, scale: 142, rotate: -4, tracking: 2 }
            : text
        )));
      }

      if (step.id === 'text-bubble') {
        setActiveAccordion('texts');
        setActiveTextId(DEMO_TEXT_ID);
        setTexts((prev) => prev.map((text) => (
          text.id === DEMO_TEXT_ID
            ? {
              ...text,
              content: 'POST DE TEST',
              bgStyle: 'rounded',
              bgColor: '#f4f0e7',
              bgOpacity: 94,
              borderRadius: 30,
              color: '#151515',
              padding: 24,
              shadowBlur: 8,
              rotate: -2,
            }
            : text
        )));
      }

      if (step.id === 'text-tech') {
        setActiveAccordion('texts');
        setActiveTextId(DEMO_TEXT_ID);
        setTexts((prev) => prev.map((text) => (
          text.id === DEMO_TEXT_ID
            ? {
              ...text,
              content: 'VIBE FX',
              bgStyle: 'tech',
              bgColor: '#111827',
              bgOpacity: 88,
              color: '#f8f8ff',
              cornerSize: 20,
              padding: 28,
              rotate: 3,
              shadowBlur: 16,
            }
            : text
        )));
      }

      if (step.id === 'geometry') {
        setActiveTemplate(mosaic);
        setActiveAccordion('geometry');
        setSelectedSlotIndex(null);
        setPadding(62);
        setGap(28);
        setRadius(42);
        setSlotConfigs({
          0: { zoom: 1.18, x: -10, y: 0, border: 0, blur: 0 },
          1: { zoom: 1.55, x: 12, y: -6, border: 0, blur: 0 },
          2: { zoom: 1.35, x: -2, y: 14, border: 0, blur: 0 },
        });
      }

      if (step.id === 'background') {
        setActiveAccordion('background');
        setLayoutBgBlur(true);
        setLayoutBgColor('#09090b');
        setLayoutBgTexture(32);
        setLayoutSmoothBlur({
          enabled: true,
          direction: 'down',
          height: 58,
          precision: 24,
          blur: 54,
          preset: 'expo',
          easeType: 'out',
          reverse: false,
        });
      }

      if (step.id === 'pano') {
        setActiveFormat(pano);
        setActiveTemplate(mosaic);
        setActiveAccordion('background');
        setShowGuidelines(true);
        setPadding(72);
        setGap(30);
      }

      if (step.id === 'finish') {
        setSelectedSlotIndex(null);
        setActiveTextId(DEMO_TEXT_ID);
        setActiveAccordion('texts');
      }
    };

    applyStep();
    const isLastStep = demoStepIndex >= DEMO_SCRIPT.length - 1;
    const timer = isLastStep ? null : window.setTimeout(() => {
      if (!active) return;
      setDemoStepIndex((index) => index + 1);
    }, step.duration);

    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [demoStepIndex, handleStopDemo, isDemoRunning, loadDemoImages]);

  const {
    addText,
    addAsset,
    updateActiveText,
    deleteActiveText,
    updateSlotConfig,
    currentText,
    currentAsset,
    deleteActiveAsset,
  } = useLayoutHelpers({
    texts,
    setTexts,
    assets,
    setAssets,
    activeTextId,
    setActiveTextId,
    activeAssetId,
    setActiveAssetId,
    selectedSlotIndex,
    setSelectedSlotIndex,
    slotConfigs,
    setSlotConfigs,
    images,
    setImages,
  });

  const { getCanvasDimensions, renderPipeline } = useCanvasRenderer({
    canvasRef,
    images,
    view: 'layout',
    activeFormat,
    activeTemplate,
    overlayMode,
    padding,
    gap,
    radius,
    layoutBgColor,
    layoutBgBlur,
    layoutBgTexture,
    layoutSmoothBlur,
    selectedSlotIndex,
    slotConfigs,
    slotRects,
    bgCanvasRef,
    texts,
    assets,
    activeTextId,
    activeAssetId,
    isDraggingText,
    activeGuides,
    cropRatio: 'original',
    cropPos: { x: 0, y: 0 },
    cropScale: 1,
    isCropping: false,
    filters: {},
    selectedImgIndex,
    isDragging,
    requestRef,
  });

  const { handlePointerDown, handlePointerMove, handlePointerUp } = useCanvasEvents({
    canvasRef,
    view: 'layout',
    images,
    texts,
    setTexts,
    assets,
    setAssets,
    activeTextId,
    setActiveTextId,
    activeAssetId,
    setActiveAssetId,
    selectedSlotIndex,
    setSelectedSlotIndex,
    slotRects,
    isDragging,
    setIsDragging,
    isDraggingText,
    setIsDraggingText,
    isDraggingAsset,
    setIsDraggingAsset,
    activeGuides,
    setActiveGuides,
    lastMousePos,
    dragOffset,
    textMetrics,
    isCropping: false,
    setCropPos: () => {},
    selectedImgIndex,
    setSelectedImgIndex,
  });

  const { handleImageUpload } = useImageUpload({
    images,
    setImages,
    view: 'layout',
    setView: () => {},
    setIsProcessing,
    setLoadingProgress,
    setExportName,
  });

  const handleFullscreen = () => {
    if (canvasRef.current?.requestFullscreen) canvasRef.current.requestFullscreen();
  };

  const handleUpdateCustomZone = useCallback((zoneId, patch) => {
    if (!zoneId) return;
    setActiveTemplate((previousTemplate) => {
      if (previousTemplate.id !== 'custom') return previousTemplate;
      const homePatch = {
        ...('x' in patch ? { homeX: patch.x } : {}),
        ...('y' in patch ? { homeY: patch.y } : {}),
        ...('w' in patch ? { homeW: patch.w } : {}),
        ...('h' in patch ? { homeH: patch.h } : {}),
      };
      const zones = (previousTemplate.customLayout?.zones || []).map((zone) => (
        zone.id === zoneId ? { ...zone, ...patch, ...homePatch, hidden: false } : zone
      ));
      return updateCustomTemplateZones(
        previousTemplate,
        normalizeCustomZones(zones, zoneId)
      );
    });
  }, []);

  const handleDeleteCustomZone = useCallback((zoneId) => {
    if (!zoneId) return;
    setActiveTemplate((previousTemplate) => {
      if (previousTemplate.id !== 'custom') return previousTemplate;
      const zones = (previousTemplate.customLayout?.zones || []).filter((zone) => zone.id !== zoneId);
      return updateCustomTemplateZones(previousTemplate, zones);
    });
    setSelectedSlotIndex((current) => (current === zoneId ? null : current));
    setSlotConfigs((previousConfigs) => {
      const nextConfigs = { ...previousConfigs };
      delete nextConfigs[zoneId];
      return nextConfigs;
    });
  }, []);

  const handleAddCustomZone = useCallback((shape, position = null) => {
    const zoneIndex = activeTemplate.customLayout?.zones?.length || 0;
    const createdZone = createCustomZone(shape, zoneIndex, position);
    const nextZone = {
      ...createdZone,
      homeX: createdZone.x,
      homeY: createdZone.y,
      homeW: createdZone.w,
      homeH: createdZone.h,
    };
    setActiveTemplate((previousTemplate) => {
      if (previousTemplate.id !== 'custom') return previousTemplate;
      const zones = [
        ...(previousTemplate.customLayout?.zones || []),
        nextZone,
      ];
      return updateCustomTemplateZones(
        {
          ...previousTemplate,
          customLayout: {
            ...previousTemplate.customLayout,
            presetId: 'manual',
          },
        },
        normalizeCustomZones(zones, nextZone.id)
      );
    });
    setCustomEditMode(true);
    setSelectedSlotIndex(nextZone.id);
    setActiveTextId(null);
  }, [activeTemplate.customLayout?.zones?.length]);

  const renderFinalCanvas = useCallback(() => {
    const { width, height } = getCanvasDimensions();
    if (!width || !height) return null;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    renderPipeline(exportCanvas, width, height, false, 'high');
    return { exportCanvas, width, height };
  }, [getCanvasDimensions, renderPipeline]);

  const handleImport = useCallback(async () => {
    if (!images.length || typeof onImportToPublication !== 'function') return;
    const rendered = renderFinalCanvas();
    if (!rendered) return;

    const { exportCanvas, width, height } = rendered;
    const socialImages = await buildSocialImages(exportCanvas, activeFormat);
    const blob = await canvasToBlob(exportCanvas, 'image/png');
    const payload = {
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
        overlayMode,
        padding,
        gap,
        radius,
        layoutBgColor,
        layoutBgBlur,
        layoutBgTexture,
        layoutSmoothBlur,
        texts,
        assets,
        slotConfigs: serializeSlotConfigs(slotConfigs),
      },
      createdAt: new Date().toISOString(),
    };
    onImportToPublication(payload);
  }, [
    activeFormat,
    activeTemplate,
    assets,
    exportName,
    gap,
    images.length,
    layoutBgBlur,
    layoutBgColor,
    layoutBgTexture,
    layoutSmoothBlur,
    onImportToPublication,
    overlayMode,
    padding,
    radius,
    renderFinalCanvas,
    slotConfigs,
    texts,
  ]);

  const handleDownloadPreview = useCallback(() => {
    const rendered = renderFinalCanvas();
    if (!rendered) return;
    const link = document.createElement('a');
    link.download = `${exportName || 'vibefx-layout'}.png`;
    link.href = rendered.exportCanvas.toDataURL('image/png');
    link.click();
  }, [exportName, renderFinalCanvas]);

  const handleOpenInstaPreview = useCallback(async () => {
    if (!images.length) return;
    const rendered = renderFinalCanvas();
    if (!rendered) return;
    const socialImages = await buildSocialImages(rendered.exportCanvas, activeFormat);
    setInstagramPreview({
      imageUrl: rendered.exportCanvas.toDataURL('image/png'),
      socialImages,
      format: activeFormat,
      title: exportName || 'Preview layout',
    });
  }, [activeFormat, exportName, images.length, renderFinalCanvas]);

  const handleOpenCompare = useCallback(() => {
    if (!images.length) return;
    const rendered = renderFinalCanvas();
    if (!rendered) return;
    const sourceImage = images[selectedImgIndex] || images[0];
    setComparePreview({
      beforeUrl: sourceImage?.src,
      afterUrl: rendered.exportCanvas.toDataURL('image/png'),
      format: activeFormat,
      sourceLabel: sourceImage?.name || `Image source ${Math.min(selectedImgIndex + 1, images.length)}`,
    });
  }, [activeFormat, images, renderFinalCanvas, selectedImgIndex]);

  const activeConfig = selectedSlotIndex !== null
    ? (slotConfigs[selectedSlotIndex] || { zoom: 1, x: 0, y: 0, border: 0, blur: 0 })
    : null;

  return (
    <section className="vibefx-app-root vibefx-layout-root min-h-screen flex flex-col h-screen overflow-hidden font-sans transition-colors duration-300 bg-black text-gray-300 selection:bg-indigo-900 selection:text-white">
      <LayoutTutorialOverlay open={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} onStartDemo={handleStartDemo} />
      <LayoutDemoOverlay
        running={isDemoRunning}
        step={DEMO_SCRIPT[demoStepIndex]}
        stepIndex={demoStepIndex}
        totalSteps={DEMO_SCRIPT.length}
        onStop={handleStopDemo}
        onRestore={handleRestoreDemo}
      />
      {comparePreview ? (
        <VibeFxCompareModal
          preview={comparePreview}
          onClose={() => setComparePreview(null)}
        />
      ) : null}
      {instagramPreview ? (
        <VibeFxInstagramPreviewModal
          preview={instagramPreview}
          onClose={() => setInstagramPreview(null)}
        />
      ) : null}
      <header className="vibefx-layout-header border-b backdrop-blur-md sticky top-0 z-20 shrink-0 transition-colors duration-300 border-neutral-800 bg-black/90">
        <div className="vibefx-layout-header-inner max-w-[1920px] mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="vibefx-layout-brand flex items-center gap-4 min-w-[150px]">
            <div className="w-8 h-8 bg-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.3)]">
              <Camera size={16} className="text-white" />
            </div>
            <h1 className="text-lg font-mono font-bold tracking-tighter uppercase hidden sm:block">Vibe<span className="text-indigo-500">_OS</span></h1>
          </div>

          <div className="vibefx-layout-nav flex h-full items-center justify-center gap-3 min-w-0">
            <button type="button" onClick={onOpenPublications} className="flex items-center gap-2 text-[10px] uppercase font-mono tracking-widest px-3 py-1.5 transition-colors duration-200 border border-indigo-500/35 text-indigo-300 hover:text-white hover:bg-indigo-950/30">
              <ChevronLeft size={14} />
              <span>Retour publications</span>
            </button>
            <div className="h-full flex items-center gap-2 px-5 text-[10px] uppercase font-mono tracking-widest border-b-2 border-indigo-500 text-indigo-400 bg-indigo-500/5">
              <LayoutTemplate size={14} />
              <span className="hidden sm:inline">Mise en page</span>
            </div>
          </div>

          <div className="vibefx-layout-header-actions flex gap-4 min-w-[150px] justify-end items-center">
            <button type="button" onClick={() => setIsTutorialOpen(true)} className="flex items-center gap-2 text-[10px] uppercase font-mono tracking-widest px-3 py-1.5 transition-colors duration-200 border border-neutral-800 text-neutral-400 hover:text-indigo-300 hover:border-indigo-500/50 hover:bg-indigo-950/20" aria-label="Ouvrir le tutoriel complet de mise en page">
              <CircleHelp size={14} />
              <span className="hidden sm:inline">Tutoriel</span>
            </button>
            <button type="button" onClick={handleStartDemo} disabled={isDemoRunning} className="flex items-center gap-2 text-[10px] uppercase font-mono tracking-widest px-3 py-1.5 transition-colors duration-200 border border-indigo-500/35 text-indigo-300 hover:text-white hover:bg-indigo-950/30 disabled:opacity-40" aria-label="Lancer la demonstration automatique">
              <PlayCircle size={14} />
              <span className="hidden sm:inline">Demo live</span>
            </button>
            <button type="button" disabled={!images.length} onClick={() => setImages([])} className="hidden sm:block text-[10px] uppercase font-mono tracking-widest px-3 py-1 transition-colors duration-200 disabled:opacity-30 border border-transparent hover:border-red-900/50 text-neutral-500 hover:text-red-400 hover:bg-red-950/20">Reinitialiser</button>
            <button type="button" onClick={handleImport} disabled={!images.length || typeof onImportToPublication !== 'function'} className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-1.5 text-xs font-mono font-medium hover:bg-indigo-500 transition shadow-[0_0_20px_rgba(79,70,229,0.4)] disabled:opacity-50 disabled:shadow-none uppercase tracking-wide clip-path-polygon">
              <Send size={14} />
              <span className="hidden sm:inline">Importer</span>
            </button>
          </div>
        </div>
      </header>

      <div className="vibefx-layout-main flex-1 w-full grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        <CanvasWorkspace
          isDarkMode
          isDraggable
          canvasContainerRef={canvasContainerRef}
          canvasRef={canvasRef}
          images={images}
          view="layout"
          isProcessing={isProcessing}
          loadingStatus="Import des images"
          loadingProgress={loadingProgress}
          onOpenLibrarySelector={() => {}}
          handlePointerDown={handlePointerDown}
          handlePointerMove={handlePointerMove}
          handlePointerUp={handlePointerUp}
          handleImageUpload={handleImageUpload}
          handleFullscreen={handleFullscreen}
          onCompareOpen={handleOpenCompare}
          onInstaPreview={handleOpenInstaPreview}
          selectedSlotIndex={selectedSlotIndex}
          activeTextId={activeTextId}
          activeTemplate={activeTemplate}
          isDraggingText={isDraggingText}
          isCropping={false}
          setImages={setImages}
          selectedImgIndex={selectedImgIndex}
          setSelectedImgIndex={setSelectedImgIndex}
          activeFormat={activeFormat}
          showGuidelines={showGuidelines}
          customEditMode={customEditMode}
          onAddCustomZone={handleAddCustomZone}
        />

        <aside className="vibefx-layout-sidebar lg:col-span-4 flex flex-col h-full border-l backdrop-blur-md overflow-hidden transition-colors duration-300 bg-black/80 border-neutral-800">
          <div className="vibefx-layout-sidebar-head flex items-center justify-between gap-3 px-5 py-3 border-b border-neutral-800 bg-black/80">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-widest text-indigo-400">Vibe_fx Layout</p>
              <span className="text-[10px] font-mono text-neutral-500">{images.length} image(s)</span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleDownloadPreview} disabled={!images.length} className="flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-mono uppercase border border-neutral-800 text-neutral-400 hover:text-white hover:border-indigo-500 disabled:opacity-30">
                <Download size={14} />
                PNG
              </button>
              <button type="button" onClick={handleImport} disabled={!images.length || typeof onImportToPublication !== 'function'} className="flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-mono uppercase border border-indigo-500/50 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white disabled:opacity-30">
                <Send size={14} />
                Importer
              </button>
            </div>
          </div>

          <LayoutSidebar
            images={images}
            setImages={setImages}
            isDarkMode
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
            setTexts={setTexts}
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
            layoutSmoothBlur={layoutSmoothBlur}
            setLayoutSmoothBlur={setLayoutSmoothBlur}
            showGuidelines={showGuidelines}
            setShowGuidelines={setShowGuidelines}
            customEditMode={customEditMode}
            setCustomEditMode={setCustomEditMode}
            onUpdateCustomZone={handleUpdateCustomZone}
            onDeleteCustomZone={handleDeleteCustomZone}
          />
        </aside>
      </div>
    </section>
  );
}

function VibeFxCompareModal({ preview, onClose }) {
  return (
    <div className="vibefx-preview-layer" onClick={onClose}>
      <button type="button" className="vibefx-preview-close" onClick={onClose} aria-label="Fermer la comparaison"><X size={18} /></button>
      <section className="vibefx-compare-modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <span>Avant / Après</span>
          <strong>{preview.format?.label || 'Rendu layout'}</strong>
        </header>
        <div className="vibefx-compare-grid">
          <article>
            <span>Source</span>
            {preview.beforeUrl ? <img src={preview.beforeUrl} alt={preview.sourceLabel || 'Image source'} /> : <div className="vibefx-preview-empty" />}
          </article>
          <article>
            <span>Rendu Vibe_fx</span>
            {preview.afterUrl ? <img src={preview.afterUrl} alt="Rendu apres modification" /> : <div className="vibefx-preview-empty" />}
          </article>
        </div>
      </section>
    </div>
  );
}

function VibeFxInstagramPreviewModal({ preview, onClose }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const slides = preview.socialImages?.length ? preview.socialImages.map((item) => item.url || item) : [preview.imageUrl].filter(Boolean);
  const activeSlide = slides[Math.min(activeIndex, Math.max(slides.length - 1, 0))] || preview.imageUrl;
  const format = preview.format || {};
  const isStoryLike = format.id === 'story';
  const mediaRatio = format.id === 'pano-2' || format.id === 'pano-3' ? '4 / 5' : `${format.w || 1080} / ${format.h || 1350}`;

  return (
    <div className="vibefx-preview-layer" onClick={onClose}>
      <button type="button" className="vibefx-preview-close" onClick={onClose} aria-label="Fermer la preview Instagram"><X size={18} /></button>
      <div className="vibefx-phone-frame" onClick={(event) => event.stopPropagation()}>
        <div className="vibefx-phone-speaker" />
        <div className="vibefx-phone-screen">
          <div className="vibefx-phone-status"><span>9:41</span><span><Wifi size={13} /><BatteryMedium size={15} /></span></div>
          {isStoryLike ? (
            <div className="vibefx-story-preview">
              {activeSlide ? <img src={activeSlide} alt="" /> : <div className="vibefx-preview-empty" />}
              <div className="vibefx-story-bars"><i /></div>
              <div className="vibefx-story-head"><span>vibefx.studio</span><small>2h</small><MoreHorizontal size={18} /></div>
              <div className="vibefx-story-bottom"><span>Envoyer un message</span><Heart size={24} /><Send size={24} /></div>
            </div>
          ) : (
            <div className="vibefx-feed-preview">
              <header><ChevronLeft size={24} /><strong>Publications</strong><MoreHorizontal size={18} /></header>
              <div className="vibefx-post-head">
                <span className="vibefx-avatar">VF</span>
                <div><strong>vibefx.studio</strong><small>Vibe_fx Studio - Original</small></div>
              </div>
              <div className="vibefx-post-media" style={{ aspectRatio: mediaRatio }}>
                {activeSlide ? <img src={activeSlide} alt="" /> : <div className="vibefx-preview-empty" />}
                {slides.length > 1 ? (
                  <div className="vibefx-post-nav">
                    {slides.map((_, index) => (
                      <button key={index} type="button" className={activeIndex === index ? 'active' : ''} onClick={() => setActiveIndex(index)} />
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="vibefx-post-actions"><Heart size={24} /><MessageCircle size={24} /><Send size={24} /><Bookmark size={24} /></div>
              <p><strong>vibefx.studio</strong> {preview.title || 'Nouvelle publication.'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
