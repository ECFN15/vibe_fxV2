import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Icons from "lucide-react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, functions, storage } from "../../lib/firebase.js";
import VibeFxLayout from "../vibefx-layout";

const SOCIAL_FORMATS = [
  { id: "portrait", label: "Portrait", hint: "Post 4:5", width: 1080, height: 1350, ratio: 4 / 5, publishKind: "feed", icon: "Smartphone" },
  { id: "square", label: "Carre", hint: "Post 1:1", width: 1080, height: 1080, ratio: 1, publishKind: "feed", icon: "Square" },
  { id: "story-reel", label: "Story / Reel", hint: "9:16", width: 1080, height: 1920, ratio: 9 / 16, publishKind: "story", supportsReel: true, icon: "PanelTop" },
  { id: "pano2", label: "Pano x2", hint: "2 slides 4:5", width: 2160, height: 1350, ratio: 8 / 5, publishKind: "carousel", slices: 2, icon: "Columns2" },
  { id: "pano3", label: "Pano x3", hint: "3 slides 4:5", width: 3240, height: 1350, ratio: 12 / 5, publishKind: "carousel", slices: 3, icon: "Columns3" },
];

const LAYOUT_TEMPLATES = [
  { id: "standard", label: "Standard", slots: 1, icon: "Box" },
  { id: "polaroid", label: "Polaroid", slots: 1, icon: "StickyNote" },
  { id: "pip", label: "Image dans l'image", slots: 2, icon: "Layers" },
  { id: "split", label: "Double", slots: 2, icon: "SplitSquareVertical" },
  { id: "filmstrip", label: "Pellicule", slots: 3, icon: "Rows3" },
  { id: "mosaic", label: "Mosaique", slots: 3, icon: "LayoutTemplate" },
  { id: "grid4", label: "Grille", slots: 4, icon: "Grid2X2" },
  { id: "cinema", label: "Cinema", slots: 1, icon: "Maximize" },
];

const DEFAULT_TEXT = {
  id: "brand",
  label: "Signature",
  value: "Les Jardins de Chawi",
  x: 50,
  y: 87,
  size: 42,
  weight: 700,
  color: "#fff8e7",
  align: "center",
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_CAPTION_LENGTH = 2200;
const MAX_HASHTAGS = 30;
const MAX_MENTIONS = 20;

const slugify = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const formatDate = (value) => {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Brouillon";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function getSlots(templateId, width, height, padding, gap, overlayMode = "landscape") {
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const halfW = (innerW - gap) / 2;
  const halfH = (innerH - gap) / 2;
  const thirdH = (innerH - gap * 2) / 3;
  const thirdW = (innerW - gap * 2) / 3;

  if (templateId === "polaroid") {
    const bottom = Math.max(110, height * 0.12);
    return [{ x: padding, y: padding, w: innerW, h: innerH - bottom }];
  }

  if (templateId === "pip") {
    const overlayRatio = overlayMode === "square" ? 1 : overlayMode === "adaptive" ? 4 / 5 : 3 / 2;
    let overlayW = innerW * (overlayMode === "square" ? 0.46 : 0.62);
    let overlayH = overlayW / overlayRatio;
    if (overlayH > innerH * 0.56) {
      overlayH = innerH * 0.56;
      overlayW = overlayH * overlayRatio;
    }
    return [
      { x: padding, y: padding, w: innerW, h: innerH },
      { x: padding + innerW * 0.08, y: padding + innerH * 0.18, w: overlayW, h: overlayH },
    ];
  }

  if (templateId === "split") {
    return [
      { x: padding, y: padding, w: halfW, h: innerH },
      { x: padding + halfW + gap, y: padding, w: halfW, h: innerH },
    ];
  }

  if (templateId === "filmstrip") {
    return [
      { x: padding, y: padding, w: innerW, h: thirdH },
      { x: padding, y: padding + thirdH + gap, w: innerW, h: thirdH },
      { x: padding, y: padding + (thirdH + gap) * 2, w: innerW, h: thirdH },
    ];
  }

  if (templateId === "mosaic") {
    return [
      { x: padding, y: padding, w: halfW, h: innerH },
      { x: padding + halfW + gap, y: padding, w: halfW, h: halfH },
      { x: padding + halfW + gap, y: padding + halfH + gap, w: halfW, h: halfH },
    ];
  }

  if (templateId === "grid4") {
    return [
      { x: padding, y: padding, w: halfW, h: halfH },
      { x: padding + halfW + gap, y: padding, w: halfW, h: halfH },
      { x: padding, y: padding + halfH + gap, w: halfW, h: halfH },
      { x: padding + halfW + gap, y: padding + halfH + gap, w: halfW, h: halfH },
    ];
  }

  if (templateId === "cinema") {
    const bar = Math.max(76, height * 0.07);
    return [{ x: padding, y: padding + bar, w: innerW, h: innerH - bar * 2 }];
  }

  if (templateId === "standard" && width > height * 1.4) {
    return [{ x: padding, y: padding, w: innerW, h: innerH }];
  }

  return [{ x: padding, y: padding, w: innerW, h: innerH }];
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCover(ctx, image, rect, config, radius) {
  if (!image?.element) return;
  const img = image.element;
  const zoom = config?.zoom || 1;
  const offsetX = config?.x || 0;
  const offsetY = config?.y || 0;
  const imageRatio = img.naturalWidth / img.naturalHeight;
  const rectRatio = rect.w / rect.h;
  let dw = rect.w;
  let dh = rect.h;
  if (rectRatio > imageRatio) {
    dh = rect.w / imageRatio;
  } else {
    dw = rect.h * imageRatio;
  }
  dw *= zoom;
  dh *= zoom;
  const dx = rect.x + (rect.w - dw) / 2 + (offsetX / 100) * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + (offsetY / 100) * rect.h;

  ctx.save();
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, radius);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  if (config?.border) {
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = config.border;
    roundRect(ctx, rect.x + config.border / 2, rect.y + config.border / 2, rect.w - config.border, rect.h - config.border, radius);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCanvas({
  canvas,
  images,
  format,
  template,
  slotConfigs,
  textLayers,
  background,
  overlayMode,
  padding,
  gap,
  radius,
  selectedSlot,
  preview,
}) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = format.width;
  canvas.height = format.height;

  ctx.clearRect(0, 0, format.width, format.height);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, format.width, format.height);

  if (images[0]?.element) {
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.filter = "blur(80px) brightness(0.72) saturate(1.1)";
    drawCover(ctx, images[0], { x: -80, y: -80, w: format.width + 160, h: format.height + 160 }, {}, 0);
    ctx.restore();
  }

  const slots = getSlots(template.id, format.width, format.height, padding, gap, overlayMode);
  slots.forEach((slot, index) => {
    const image = images[index] || images[0];
    if (image) {
      drawCover(ctx, image, slot, slotConfigs[index], radius);
    } else {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.setLineDash([18, 18]);
      ctx.lineWidth = 4;
      roundRect(ctx, slot.x, slot.y, slot.w, slot.h, radius);
      ctx.stroke();
      ctx.restore();
    }
  });

  if (template.id === "polaroid") {
    const bottom = Math.max(110, format.height * 0.12);
    ctx.fillStyle = "#f8f4eb";
    ctx.fillRect(0, format.height - bottom, format.width, bottom);
  }

  if (template.id === "cinema") {
    const bar = Math.max(76, format.height * 0.07);
    ctx.fillStyle = "rgba(0,0,0,0.9)";
    ctx.fillRect(0, 0, format.width, bar);
    ctx.fillRect(0, format.height - bar, format.width, bar);
  }

  textLayers.forEach((layer) => {
    ctx.save();
    ctx.font = `${layer.weight || 700} ${layer.size || 42}px ${layer.font || "Georgia, serif"}`;
    ctx.fillStyle = layer.color || "#fff8e7";
    ctx.textAlign = layer.align || "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.36)";
    ctx.shadowBlur = 18;
    ctx.fillText(layer.value || "", (layer.x / 100) * format.width, (layer.y / 100) * format.height);
    ctx.restore();
  });

  if (preview && (format.id === "pano2" || format.id === "pano3")) {
    const slices = format.slices || 2;
    ctx.save();
    ctx.strokeStyle = "rgba(255,72,72,0.86)";
    ctx.setLineDash([24, 18]);
    ctx.lineWidth = 4;
    for (let i = 1; i < slices; i += 1) {
      const x = (format.width / slices) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, format.height);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (preview && selectedSlot !== null && slots[selectedSlot]) {
    const slot = slots[selectedSlot];
    ctx.save();
    ctx.strokeStyle = "#a6ff6a";
    ctx.lineWidth = 5;
    roundRect(ctx, slot.x + 2, slot.y + 2, slot.w - 4, slot.h - 4, radius);
    ctx.stroke();
    ctx.restore();
  }
}

function canvasToBlob(canvas, type = "image/jpeg", quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Impossible de generer l'image."));
    }, type, quality);
  });
}

async function fileToImage(file) {
  const src = URL.createObjectURL(file);
  const element = new Image();
  element.decoding = "async";
  element.src = src;
  await element.decode();
  return {
    id: makeId(),
    name: file.name,
    file,
    src,
    element,
  };
}

async function urlToImage(url, name = "image distante") {
  const element = new Image();
  element.crossOrigin = "anonymous";
  element.decoding = "async";
  element.src = url;
  await element.decode();
  return {
    id: makeId(),
    name,
    src: url,
    element,
  };
}

function countMatches(text, regex) {
  return (String(text || "").match(regex) || []).length;
}

function buildChecker({ caption, format, exportSize, textLayers }) {
  const hashtags = countMatches(caption, /(^|\s)#[\p{L}\p{N}_]+/gu);
  const mentions = countMatches(caption, /(^|\s)@[\p{L}\p{N}_.]+/gu);
  const issues = [];
  const warnings = [];

  if (format.publishKind === "feed" && format.ratio < 4 / 5) issues.push("Le format feed doit rester entre 4:5 et 1.91:1.");
  if (format.publishKind === "story" && format.width !== 1080 && format.height !== 1920) issues.push("La story doit etre en 1080 x 1920.");
  if (format.publishKind === "reel") warnings.push("Le visuel est exporte en 9:16, mais l'API Reels demande une video. Pour l'instant, publie-le comme Story ou transforme-le en MP4.");
  if (caption.length > MAX_CAPTION_LENGTH) issues.push("La description depasse 2200 caracteres.");
  if (hashtags > MAX_HASHTAGS) issues.push("Instagram limite les hashtags a 30.");
  if (mentions > MAX_MENTIONS) issues.push("Instagram limite les mentions a 20.");
  if (exportSize && exportSize > MAX_IMAGE_BYTES) issues.push("Le JPEG depasse 8 MB, il faut baisser la qualite ou simplifier le visuel.");

  textLayers.forEach((layer) => {
    if (format.publishKind === "story" && (layer.y < 10 || layer.y > 88)) {
      warnings.push(`Le texte "${layer.label}" est proche d'une zone UI Story.`);
    }
    if (format.publishKind === "feed" && layer.y > 94) {
      warnings.push(`Le texte "${layer.label}" risque d'etre coupe en preview feed.`);
    }
  });

  if (!caption.trim()) warnings.push("Aucune description n'est prevue pour Instagram/Facebook.");
  if (hashtags < 3) warnings.push("Ajoute 3 a 8 hashtags utiles pour donner du contexte.");

  return {
    score: Math.max(0, 100 - issues.length * 28 - warnings.length * 8),
    issues,
    warnings,
    hashtags,
    mentions,
  };
}

function getCanonicalFormat(input) {
  const incoming = input || {};
  const alias = incoming.id === "story" || incoming.id === "reel" ? "story-reel" : incoming.id;
  const found = SOCIAL_FORMATS.find((item) => item.id === alias) || SOCIAL_FORMATS[0];
  return { ...found, publishKind: incoming.publishKind || (incoming.id === "reel" ? "reel" : found.publishKind) };
}

function getCanonicalTemplate(input) {
  const alias = input?.id === "minimal" ? "standard" : input?.id;
  return LAYOUT_TEMPLATES.find((item) => item.id === alias) || LAYOUT_TEMPLATES[0];
}

function normalizeVibeFxDraft(payload) {
  const formatMap = {
    "insta-port": "portrait",
    "insta-sq": "square",
    story: "story-reel",
    "pano-2": "pano2",
    "pano-3": "pano3",
  };
  const format = getCanonicalFormat({
    id: formatMap[payload?.format?.id] || payload?.format?.id,
    publishKind: payload?.format?.id === "story" ? "story" : undefined,
  });
  const template = getCanonicalTemplate({ id: payload?.template?.id });
  const socialImages = payload?.socialImages?.length
    ? payload.socialImages
    : [{ url: payload?.dataUrl, blob: payload?.blob, width: payload?.width || format.width, height: payload?.height || format.height, index: 0 }];

  return {
    renderId: makeId(),
    image: payload?.dataUrl,
    imageBlob: payload?.blob,
    socialImages,
    format: {
      id: format.id,
      label: format.label,
      width: format.width,
      height: format.height,
      publishKind: format.publishKind,
      slices: format.slices || 1,
      supportsReel: Boolean(format.supportsReel),
    },
    template: { id: template.id, label: template.label },
    layoutDraft: {
      source: "vibefx",
      sourceFormat: cleanVibeFormat(payload?.format),
      sourceTemplate: cleanVibeTemplate(payload?.template),
      settings: {
        overlayMode: String(payload?.settings?.overlayMode || "landscape"),
        padding: toFiniteNumber(payload?.settings?.padding, 44),
        gap: toFiniteNumber(payload?.settings?.gap, 16),
        radius: toFiniteNumber(payload?.settings?.radius, 0),
        layoutBgColor: String(payload?.settings?.layoutBgColor || "#111111"),
        layoutBgBlur: toFiniteNumber(payload?.settings?.layoutBgBlur),
        layoutBgTexture: String(payload?.settings?.layoutBgTexture || "none"),
        layoutSmoothBlur: Boolean(payload?.settings?.layoutSmoothBlur),
        imagesCount: toFiniteNumber(payload?.imagesCount),
      },
      textLayers: (payload?.settings?.texts || []).map((text) => {
        const clean = cleanTextLayer(text);
        return {
          ...clean,
          x: Math.round(clean.x * 100),
          y: Math.round(clean.y * 100),
        };
      }),
      slotConfigs: cleanSlotConfigs(payload?.settings?.slotConfigs),
    },
  };
}

function getIcon(icon, fallback = Icons.Square) {
  return Icons[icon] || fallback;
}

function getCanvasMaxWidth(format) {
  if (format.id === "story-reel") return "360px";
  if (format.id === "square") return "520px";
  if (format.id === "pano2") return "780px";
  if (format.id === "pano3") return "920px";
  return "460px";
}

function defaultSlotConfig(config = {}) {
  return { zoom: 1, x: 0, y: 0, border: 0, blur: 0, ...config };
}

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cleanVibeFormat(format = {}) {
  return {
    id: String(format.id || ""),
    label: String(format.label || ""),
    width: toFiniteNumber(format.w || format.width),
    height: toFiniteNumber(format.h || format.height),
    ratio: toFiniteNumber(format.ratio),
  };
}

function cleanVibeTemplate(template = {}) {
  return {
    id: String(template.id || ""),
    label: String(template.label || ""),
    slots: toFiniteNumber(template.slots, 1),
  };
}

function cleanTextLayer(text = {}) {
  return {
    id: String(text.id || makeId()),
    label: String(text.content || text.label || "Texte"),
    value: String(text.content || text.value || ""),
    x: toFiniteNumber(text.x, 0.5),
    y: toFiniteNumber(text.y, 0.5),
    size: toFiniteNumber(text.size, 42),
    weight: toFiniteNumber(text.weight, 700),
    color: String(text.color || "#ffffff"),
    align: String(text.align || "center"),
    font: String(text.font || "Georgia, serif"),
  };
}

function cleanSlotConfigs(configs = {}) {
  return Object.fromEntries(
    Object.entries(configs || {}).map(([key, config]) => [
      key,
      {
        zoom: toFiniteNumber(config?.zoom, 1),
        x: toFiniteNumber(config?.x),
        y: toFiniteNumber(config?.y),
        border: toFiniteNumber(config?.border),
        blur: toFiniteNumber(config?.blur),
      },
    ])
  );
}

function cleanPublicationLayoutDraft(layoutDraft = {}) {
  const settings = layoutDraft.settings || {};
  return {
    source: String(layoutDraft.source || "publication"),
    sourceFormat: cleanVibeFormat(layoutDraft.sourceFormat || {}),
    sourceTemplate: cleanVibeTemplate(layoutDraft.sourceTemplate || {}),
    settings: {
      overlayMode: String(settings.overlayMode || layoutDraft.overlayMode || "landscape"),
      padding: toFiniteNumber(settings.padding ?? layoutDraft.padding, 44),
      gap: toFiniteNumber(settings.gap ?? layoutDraft.gap, 16),
      radius: toFiniteNumber(settings.radius ?? layoutDraft.radius, 0),
      background: String(settings.background || layoutDraft.background || settings.layoutBgColor || "#111111"),
      layoutBgColor: String(settings.layoutBgColor || layoutDraft.background || "#111111"),
      layoutBgBlur: toFiniteNumber(settings.layoutBgBlur),
      layoutBgTexture: String(settings.layoutBgTexture || "none"),
      layoutSmoothBlur: Boolean(settings.layoutSmoothBlur),
      imagesCount: toFiniteNumber(settings.imagesCount),
    },
    textLayers: (layoutDraft.textLayers || []).map(cleanTextLayer),
    slotConfigs: cleanSlotConfigs(layoutDraft.slotConfigs || settings.slotConfigs),
  };
}

function getCanvasPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const source = event.touches?.[0] || event.changedTouches?.[0] || event;
  return {
    x: ((source.clientX - rect.left) / rect.width) * canvas.width,
    y: ((source.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function findTextAtPoint(point, textLayers, format, canvas) {
  const ctx = canvas.getContext("2d");
  return [...textLayers].reverse().find((layer) => {
    ctx.font = `${layer.weight || 700} ${layer.size || 42}px ${layer.font || "Georgia, serif"}`;
    const width = Math.max(120, ctx.measureText(layer.value || "").width + 42);
    const height = (layer.size || 42) * 1.65;
    const cx = (layer.x / 100) * format.width;
    const cy = (layer.y / 100) * format.height;
    return point.x >= cx - width / 2 && point.x <= cx + width / 2 && point.y >= cy - height / 2 && point.y <= cy + height / 2;
  }) || null;
}

function createRenderCanvas(state, preview = false) {
  const canvas = document.createElement("canvas");
  drawCanvas({
    canvas,
    images: state.images,
    format: state.format,
    template: state.template,
    slotConfigs: state.slotConfigs,
    textLayers: state.textLayers,
    background: state.background,
    overlayMode: state.overlayMode,
    padding: state.padding,
    gap: state.gap,
    radius: state.radius,
    selectedSlot: preview ? state.selectedSlot : null,
    preview,
  });
  return canvas;
}

async function createLayoutPayload(state) {
  const finalCanvas = createRenderCanvas(state, false);
  const imageBlob = await canvasToBlob(finalCanvas, "image/jpeg", 0.92);
  const image = finalCanvas.toDataURL("image/jpeg", 0.92);
  const socialImages = [];

  if (state.format.slices) {
    const sliceWidth = finalCanvas.width / state.format.slices;
    for (let index = 0; index < state.format.slices; index += 1) {
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = sliceWidth;
      sliceCanvas.height = finalCanvas.height;
      const sliceCtx = sliceCanvas.getContext("2d");
      sliceCtx.drawImage(finalCanvas, index * sliceWidth, 0, sliceWidth, finalCanvas.height, 0, 0, sliceWidth, finalCanvas.height);
      const blob = await canvasToBlob(sliceCanvas, "image/jpeg", 0.92);
      socialImages.push({
        url: sliceCanvas.toDataURL("image/jpeg", 0.92),
        blob,
        width: sliceCanvas.width,
        height: sliceCanvas.height,
        index,
      });
    }
  } else {
    socialImages.push({ url: image, blob: imageBlob, width: finalCanvas.width, height: finalCanvas.height, index: 0 });
  }

  return {
    renderId: makeId(),
    image,
    imageBlob,
    socialImages,
    format: {
      id: state.format.id,
      label: state.format.label,
      width: state.format.width,
      height: state.format.height,
      publishKind: state.format.publishKind,
      slices: state.format.slices || 1,
      supportsReel: Boolean(state.format.supportsReel),
    },
    template: { id: state.template.id, label: state.template.label },
    layoutDraft: {
      images: state.images.map((image) => ({ id: image.id, name: image.name, src: image.src })),
      textLayers: state.textLayers,
      slotConfigs: state.slotConfigs,
      padding: state.padding,
      gap: state.gap,
      radius: state.radius,
      background: state.background,
      overlayMode: state.overlayMode,
    },
  };
}

function downloadCanvas(canvas, filename) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 5000);
  }, "image/jpeg", 0.92);
}

export default function PublicationsManager() {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("dashboard");
  const [draft, setDraft] = useState(null);
  const [selectedPublication, setSelectedPublication] = useState(null);

  const loadPublications = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(query(collection(db, "publications"), orderBy("updatedAt", "desc")));
      setPublications(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    } catch (error) {
      console.error("Publications load error:", error);
      setPublications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPublications();
  }, [loadPublications]);

  const handleImport = (payload) => {
    setDraft(normalizeVibeFxDraft(payload));
    setSelectedPublication(null);
    setMode("publish");
  };

  const handleSelectPublication = (publication) => {
    setSelectedPublication(publication);
    setDraft(null);
  };

  const handleDelete = async (publication) => {
    if (!window.confirm(`Supprimer "${publication.title || "cette publication"}" ?`)) return;
    await deleteDoc(doc(db, "publications", publication.id));
    if (selectedPublication?.id === publication.id) setSelectedPublication(null);
    await loadPublications();
  };

  const handleSetHomeFeature = async (publicationId) => {
    const updates = publications
      .filter((item) => item.featured || item.id === publicationId)
      .map((item) => updateDoc(doc(db, "publications", item.id), {
        featured: item.id === publicationId,
        updatedAt: serverTimestamp(),
      }));

    await Promise.all(updates);
    setSelectedPublication((current) => current ? { ...current, featured: current.id === publicationId } : current);
    await loadPublications();
  };

  return (
    <div className={`pub-manager vfx-mode ${mode === "layout" ? "is-layout" : "is-publish"}`}>
      {mode === "layout" ? (
        <div className="pub-layout-fullscreen">
          <VibeFxLayout
            publicationsCount={publications.length}
            onOpenPublications={() => setMode("dashboard")}
            onImportToPublication={handleImport}
          />
        </div>
      ) : (
        <PublicationComposer
          draft={draft}
          publication={selectedPublication}
          publications={publications}
          loading={loading}
          onBackToLayout={() => setMode("layout")}
          onSelectPublication={handleSelectPublication}
          onDeletePublication={handleDelete}
          onSetHomeFeature={handleSetHomeFeature}
          onSaved={(publication) => {
            setSelectedPublication(publication);
            setDraft(null);
          }}
        />
      )}
    </div>
  );
}

function LayoutStudio({ publicationsCount, onImport, onOpenPublications }) {
  const [format, setFormat] = useState(SOCIAL_FORMATS[0]);
  const [template, setTemplate] = useState(LAYOUT_TEMPLATES[0]);
  const [images, setImages] = useState([]);
  const [slotConfigs, setSlotConfigs] = useState({});
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [textLayers, setTextLayers] = useState([DEFAULT_TEXT]);
  const [activeTextId, setActiveTextId] = useState(DEFAULT_TEXT.id);
  const [padding, setPadding] = useState(44);
  const [gap, setGap] = useState(18);
  const [radius, setRadius] = useState(0);
  const [background, setBackground] = useState("#111710");
  const [overlayMode, setOverlayMode] = useState("landscape");
  const [activeAccordion, setActiveAccordion] = useState("texts");
  const [showGuidelines, setShowGuidelines] = useState(true);
  const [dragging, setDragging] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [message, setMessage] = useState("");
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const activeText = textLayers.find((layer) => layer.id === activeTextId) || null;
  const activeSlotConfig = selectedSlot !== null ? defaultSlotConfig(slotConfigs[selectedSlot]) : null;

  const studioState = useMemo(
    () => ({
      images,
      format,
      template,
      slotConfigs,
      textLayers,
      background,
      overlayMode,
      padding,
      gap,
      radius,
      selectedSlot,
    }),
    [background, format, gap, images, overlayMode, padding, radius, selectedSlot, slotConfigs, template, textLayers]
  );

  const renderPreview = useCallback(() => {
    drawCanvas({
      canvas: canvasRef.current,
      images,
      format,
      template,
      slotConfigs,
      textLayers,
      background,
      overlayMode,
      padding,
      gap,
      radius,
      selectedSlot,
      preview: true,
    });
  }, [background, format, gap, images, overlayMode, padding, radius, selectedSlot, slotConfigs, template, textLayers]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  const handleImages = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const loaded = await Promise.all(files.map(fileToImage));
    setImages((current) => [...current, ...loaded].slice(0, 8));
    setMessage("");
    event.target.value = "";
  };

  const updateSlot = (key, value) => {
    if (selectedSlot === null) return;
    setSlotConfigs((current) => ({
      ...current,
      [selectedSlot]: { ...defaultSlotConfig(current[selectedSlot]), [key]: value },
    }));
  };

  const updateText = (patch) => {
    setTextLayers((current) => current.map((layer) => (layer.id === activeTextId ? { ...layer, ...patch } : layer)));
  };

  const addText = () => {
    const layer = { ...DEFAULT_TEXT, id: makeId(), label: "Texte", value: "Nouveau texte", x: 50, y: 50, size: 38 };
    setTextLayers((current) => [...current, layer]);
    setActiveTextId(layer.id);
    setSelectedSlot(null);
    setActiveAccordion("texts");
  };

  const removeActiveText = () => {
    if (!activeText || textLayers.length <= 1) return;
    const next = textLayers.filter((layer) => layer.id !== activeText.id);
    setTextLayers(next);
    setActiveTextId(next[0]?.id || null);
  };

  const handleCanvasPointerDown = (event) => {
    if (!canvasRef.current || !images.length) return;
    event.preventDefault();
    const point = getCanvasPoint(event, canvasRef.current);
    const textHit = findTextAtPoint(point, textLayers, format, canvasRef.current);
    if (textHit) {
      setActiveTextId(textHit.id);
      setSelectedSlot(null);
      setActiveAccordion("texts");
      setDragging({ type: "text", id: textHit.id });
      event.currentTarget.setPointerCapture?.(event.pointerId);
      return;
    }

    const slots = getSlots(template.id, format.width, format.height, padding, gap, overlayMode);
    const slotIndex = slots.findIndex((slot) => point.x >= slot.x && point.x <= slot.x + slot.w && point.y >= slot.y && point.y <= slot.y + slot.h);
    if (slotIndex >= 0) {
      setSelectedSlot(slotIndex);
      setActiveAccordion("geometry");
      setDragging({ type: "slot", index: slotIndex, start: point, initial: defaultSlotConfig(slotConfigs[slotIndex]) });
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
  };

  const handleCanvasPointerMove = (event) => {
    if (!dragging || !canvasRef.current) return;
    event.preventDefault();
    const point = getCanvasPoint(event, canvasRef.current);
    if (dragging.type === "text") {
      setTextLayers((current) =>
        current.map((layer) =>
          layer.id === dragging.id
            ? { ...layer, x: clamp((point.x / format.width) * 100, 0, 100), y: clamp((point.y / format.height) * 100, 0, 100) }
            : layer
        )
      );
      return;
    }

    const slots = getSlots(template.id, format.width, format.height, padding, gap, overlayMode);
    const slot = slots[dragging.index];
    if (!slot) return;
    const nextX = clamp(dragging.initial.x + ((point.x - dragging.start.x) / slot.w) * 100, -100, 100);
    const nextY = clamp(dragging.initial.y + ((point.y - dragging.start.y) / slot.h) * 100, -100, 100);
    setSlotConfigs((current) => ({
      ...current,
      [dragging.index]: { ...defaultSlotConfig(current[dragging.index]), x: nextX, y: nextY },
    }));
  };

  const handleCanvasPointerUp = (event) => {
    if (dragging) event.currentTarget.releasePointerCapture?.(event.pointerId);
    setDragging(null);
  };

  const handleImport = async () => {
    if (!images.length) {
      setMessage("Ajoute au moins une image avant d'importer vers la publication.");
      return;
    }
    const payload = await createLayoutPayload(studioState);
    onImport(payload);
  };

  const handleExport = () => {
    if (!images.length) return;
    const canvas = createRenderCanvas(studioState, false);
    downloadCanvas(canvas, `jardins-de-chawi-${format.id}.jpg`);
  };

  const openPreview = () => {
    if (!images.length || !canvasRef.current) return;
    setPreviewUrl(canvasRef.current.toDataURL("image/jpeg", 0.92));
    setPreviewOpen(true);
  };

  const canvasStyle = {
    aspectRatio: `${format.width} / ${format.height}`,
    maxWidth: getCanvasMaxWidth(format),
  };

  return (
    <div className="vfx-page">
      <header className="vfx-topbar">
        <div className="vfx-brand">
          <span className="vfx-brand-mark"><Icons.Camera size={18} /></span>
          <strong>VIBE_OS</strong>
          <i />
          <small>SYSTEME_SOCIAL</small>
        </div>
        <nav className="vfx-nav">
          <button type="button"><Icons.Zap size={14} /> Studio</button>
          <button type="button"><Icons.Layers3 size={14} /> Fusion</button>
          <button type="button" className="active"><Icons.LayoutTemplate size={14} /> Mise en page</button>
          <button type="button" onClick={onOpenPublications}><Icons.Newspaper size={14} /> Publications <span>{publicationsCount}</span></button>
        </nav>
        <div className="vfx-actions">
          <button type="button" className="ghost" onClick={() => window.location.reload()}>Reinitialiser</button>
          <button type="button" className="violet" onClick={handleImport}><Icons.Upload size={16} /> Importer vers publication</button>
        </div>
      </header>

      <div className="vfx-shell">
        <main className="vfx-canvas-zone">
          <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
          <div className="vfx-tool-float left">
            <button type="button" title="Preview Instagram" onClick={openPreview}><Icons.Smartphone size={16} /></button>
            <button type="button" title="Exporter JPEG" onClick={handleExport}><Icons.Download size={16} /></button>
          </div>
          <button type="button" className="vfx-fullscreen" title="Preview Instagram" onClick={openPreview}><Icons.Maximize size={18} /></button>
          {images.length ? <div className="vfx-hint">Cliquez sur une image ou un texte pour l'ajuster</div> : null}
          {message ? <div className="vfx-message">{message}</div> : null}

          <div className="vfx-canvas-center">
            {!images.length ? (
              <button type="button" className="vfx-upload-empty" onClick={() => fileInputRef.current?.click()}>
                <Icons.UploadCloud size={44} />
                <strong>Importer les visuels source</strong>
                <span>JPG, PNG ou WebP. Le rendu final suit les dimensions Instagram.</span>
              </button>
            ) : null}
            <canvas
              ref={canvasRef}
              className={`vfx-canvas ${images.length ? "visible" : ""}`}
              style={canvasStyle}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerLeave={handleCanvasPointerUp}
            />
            {images.length && showGuidelines && format.slices ? (
              <div className={`vfx-pano-guides ${format.id}`} style={canvasStyle} aria-hidden="true">
                {Array.from({ length: format.slices - 1 }).map((_, index) => <i key={index} />)}
              </div>
            ) : null}
          </div>

          <div className="vfx-thumbs">
            {images.map((image, index) => (
              <button key={image.id} type="button" className={selectedSlot === index ? "active" : ""} onClick={() => setSelectedSlot(index)}>
                <img src={image.src} alt="" />
                <span>{index + 1}</span>
                <b
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    setImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
                  }}
                >
                  <Icons.X size={12} />
                </b>
              </button>
            ))}
            <label className="vfx-mini-upload">
              PC
              <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleImages} />
            </label>
          </div>
        </main>

        <aside className="vfx-sidebar">
          <VfxSidebarTitle icon="Smartphone" label="Format" />
          <div className="vfx-format-grid">
            {SOCIAL_FORMATS.map((item) => {
              const Icon = getIcon(item.icon, Icons.Smartphone);
              return (
                <button key={item.id} type="button" className={format.id === item.id ? "active" : ""} onClick={() => setFormat(item)}>
                  <span className="format-shape" style={{ aspectRatio: item.ratio }}><Icon size={16} /></span>
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </button>
              );
            })}
          </div>

          <VfxSidebarTitle icon="LayoutTemplate" label="Modeles" />
          <div className="vfx-template-grid">
            {LAYOUT_TEMPLATES.map((item) => {
              const Icon = getIcon(item.icon, Icons.Box);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={template.id === item.id ? "active" : ""}
                  onClick={() => {
                    setTemplate(item);
                    setSelectedSlot(null);
                    setActiveTextId(null);
                  }}
                >
                  <Icon size={18} />
                  <span><strong>{item.label}</strong><small>{item.slots} zone(s)</small></span>
                </button>
              );
            })}
          </div>

          {template.id === "pip" ? (
            <div className="vfx-overlay-box">
              <h4>Superposition de style</h4>
              {[
                { id: "square", label: "Carre (1:1)", icon: "Square" },
                { id: "landscape", label: "Paysage (3:2)", icon: "RectangleHorizontal" },
                { id: "adaptive", label: "Adaptatif (Auto)", icon: "Sparkles" },
              ].map((mode) => {
                const Icon = getIcon(mode.icon, Icons.Square);
                return (
                  <button key={mode.id} type="button" className={overlayMode === mode.id ? "active" : ""} onClick={() => setOverlayMode(mode.id)}>
                    <Icon size={14} /> {mode.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {selectedSlot !== null && activeSlotConfig ? (
            <VfxAccordion icon="MousePointer2" title={`Zone ${selectedSlot + 1}`} active defaultOpen>
              <VfxRange label="Zoom" value={activeSlotConfig.zoom} min={1} max={4} step={0.05} onChange={(value) => updateSlot("zoom", value)} />
              <VfxRange label="Position X" value={activeSlotConfig.x} min={-100} max={100} step={1} onChange={(value) => updateSlot("x", value)} />
              <VfxRange label="Position Y" value={activeSlotConfig.y} min={-100} max={100} step={1} onChange={(value) => updateSlot("y", value)} />
              <VfxRange label="Bordure" value={activeSlotConfig.border} min={0} max={24} step={1} onChange={(value) => updateSlot("border", value)} />
              <VfxRange label="Flou" value={activeSlotConfig.blur} min={0} max={50} step={1} onChange={(value) => updateSlot("blur", value)} />
            </VfxAccordion>
          ) : null}

          <VfxAccordion icon="Type" title="Textes et boutons" active={activeAccordion === "texts"} onToggle={() => setActiveAccordion(activeAccordion === "texts" ? null : "texts")}>
            <div className="vfx-row-actions">
              <button type="button" onClick={addText}><Icons.Plus size={14} /> Nouveau texte</button>
              <button type="button" disabled={!activeText || textLayers.length <= 1} onClick={removeActiveText}><Icons.Trash2 size={14} /></button>
            </div>
            <div className="vfx-text-list">
              {textLayers.map((layer) => (
                <button key={layer.id} type="button" className={layer.id === activeTextId ? "active" : ""} onClick={() => setActiveTextId(layer.id)}>
                  <Icons.Type size={13} /> {layer.label}
                </button>
              ))}
            </div>
            {activeText ? (
              <>
                <label className="vfx-field"><span>Texte actif</span><input value={activeText.value} onChange={(event) => updateText({ value: event.target.value })} /></label>
                <VfxRange label="Taille" value={activeText.size} min={16} max={128} step={1} onChange={(value) => updateText({ size: value })} />
                <VfxRange label="Position X" value={activeText.x} min={0} max={100} step={1} onChange={(value) => updateText({ x: value })} />
                <VfxRange label="Position Y" value={activeText.y} min={0} max={100} step={1} onChange={(value) => updateText({ y: value })} />
                <label className="vfx-field compact"><span>Couleur</span><input type="color" value={activeText.color} onChange={(event) => updateText({ color: event.target.value })} /></label>
              </>
            ) : (
              <div className="vfx-empty-control"><Icons.Type size={28} />Selectionnez un texte sur la toile ou creez-en un nouveau.</div>
            )}
          </VfxAccordion>

          <VfxAccordion icon="Scaling" title="Geometrie et marges" active={activeAccordion === "geometry"} onToggle={() => setActiveAccordion(activeAccordion === "geometry" ? null : "geometry")}>
            <VfxRange label="Marge" value={padding} min={0} max={180} step={2} onChange={setPadding} />
            <VfxRange label="Gouttiere" value={gap} min={0} max={90} step={1} onChange={setGap} />
            <VfxRange label="Arrondi" value={radius} min={0} max={90} step={1} onChange={setRadius} />
          </VfxAccordion>

          <VfxAccordion icon="Palette" title="Fond global" active={activeAccordion === "background"} onToggle={() => setActiveAccordion(activeAccordion === "background" ? null : "background")}>
            <label className="vfx-field compact"><span>Fond</span><input type="color" value={background} onChange={(event) => setBackground(event.target.value)} /></label>
            <label className="vfx-check"><input type="checkbox" checked={showGuidelines} onChange={(event) => setShowGuidelines(event.target.checked)} /> Guides pano</label>
          </VfxAccordion>
        </aside>
      </div>

      {previewOpen ? (
        <InstagramPreviewModal imageUrl={previewUrl} format={format} caption="" title="Preview layout" onClose={() => setPreviewOpen(false)} />
      ) : null}
    </div>
  );
}

function VfxSidebarTitle({ icon, label }) {
  const Icon = getIcon(icon, Icons.Settings2);
  return <h3 className="vfx-side-title"><Icon size={14} /> {label}</h3>;
}

function VfxAccordion({ icon, title, children, active, onToggle }) {
  const Icon = getIcon(icon, Icons.Settings2);
  return (
    <section className={`vfx-accordion ${active ? "open" : ""}`}>
      <button type="button" className="vfx-accordion-head" onClick={onToggle}>
        <span><Icon size={16} /> {title}</span>
        <Icons.ChevronDown size={16} />
      </button>
      <div className="vfx-accordion-body"><div>{children}</div></div>
    </section>
  );
}

function VfxRange({ label, value, min, max, step, onChange }) {
  const display = typeof value === "number" ? value.toFixed(step < 1 ? 2 : 0) : value;
  return (
    <label className="vfx-range">
      <span>{label}<strong>{display}</strong></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function getFunctionErrorMessage(error) {
  const code = error?.code || "unknown";
  const message = error?.message || "Erreur inconnue";
  const details = error?.details ? ` Details: ${JSON.stringify(error.details)}` : "";
  return `${code}: ${message}${details}`;
}

function PublicationComposer({ draft, publication, publications, loading, onBackToLayout, onSelectPublication, onDeletePublication, onSetHomeFeature, onSaved }) {
  const initialFormat = getCanonicalFormat(draft?.format || publication?.format);
  const [title, setTitle] = useState(publication?.title || "");
  const [excerpt, setExcerpt] = useState(publication?.excerpt || "");
  const [content, setContent] = useState(publication?.content || "");
  const [caption, setCaption] = useState(publication?.caption || "");
  const [tags, setTags] = useState((publication?.tags || []).join(", "));
  const [featured, setFeatured] = useState(Boolean(publication?.featured));
  const [publishKind, setPublishKind] = useState(publication?.format?.publishKind || draft?.format?.publishKind || initialFormat.publishKind);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [featureSaving, setFeatureSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [metaOAuth, setMetaOAuth] = useState({ status: "loading" });
  const [oauthBusy, setOauthBusy] = useState(false);

  const visualUrl = draft?.image || publication?.image || "";
  const socialImages = draft?.socialImages?.length ? draft.socialImages : publication?.socialImages || (visualUrl ? [{ url: visualUrl, index: 0, width: initialFormat.width, height: initialFormat.height }] : []);
  const format = { ...initialFormat, publishKind, slices: initialFormat.slices || socialImages.length || 1 };
  const textLayers = draft?.layoutDraft?.textLayers || publication?.layoutDraft?.textLayers || [DEFAULT_TEXT];
  const exportSize = draft?.imageBlob?.size || null;
  const checker = useMemo(() => buildChecker({ caption, format, exportSize, textLayers }), [caption, exportSize, format, textLayers]);
  const stats = useMemo(() => {
    const drafts = publications.filter((item) => item.status !== "published").length;
    const published = publications.filter((item) => item.status === "published").length;
    const synced = publications.filter((item) => item.platformStatus?.instagram?.status === "published").length;
    return { drafts, published, synced };
  }, [publications]);

  const loadMetaOAuthStatus = useCallback(async () => {
    try {
      const callable = httpsCallable(functions, "getMetaOAuthStatus");
      const result = await callable();
      setMetaOAuth(result.data || { status: "not_connected" });
    } catch (error) {
      console.error("Meta OAuth status error:", error);
      setMetaOAuth({ status: "error", lastError: getFunctionErrorMessage(error) });
    }
  }, []);

  useEffect(() => {
    loadMetaOAuthStatus();
  }, [loadMetaOAuthStatus]);

  const openMetaOAuthConnect = async () => {
    setOauthBusy(true);
    setMessage("");
    try {
      const callable = httpsCallable(functions, "createMetaOAuthConnectUrl");
      const result = await callable();
      const url = result.data?.url;
      if (!url) throw new Error("URL OAuth Meta manquante.");
      window.open(url, "meta-oauth", "width=720,height=820,noopener,noreferrer");
      setMessage("Fenetre Meta ouverte. Termine la connexion puis actualise le statut OAuth.");
      window.setTimeout(loadMetaOAuthStatus, 4500);
    } catch (error) {
      console.error("Meta OAuth connect error:", error);
      setMessage(`Connexion OAuth impossible: ${getFunctionErrorMessage(error)}`);
    } finally {
      setOauthBusy(false);
    }
  };

  const metaOAuthLabel = metaOAuth?.connected
    ? `OAuth connecte: ${metaOAuth.pageName || metaOAuth.pageId} -> @${metaOAuth.igUsername || metaOAuth.igUserId}`
    : metaOAuth?.status === "loading"
      ? "Verification de la connexion OAuth Meta..."
      : metaOAuth?.status === "error"
        ? `OAuth erreur: ${metaOAuth.lastError || "statut indisponible"}`
        : "OAuth Meta non connecte.";

  const uploadBlob = async (blob, path) => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob, { contentType: blob.type || "image/jpeg" });
    return getDownloadURL(storageRef);
  };

  const resolveAssets = async (publicationId) => {
    if (!draft?.imageBlob) {
      if (publication?.image) {
        return {
          imageUrl: publication.image,
          socialImages: publication.socialImages || [{ url: publication.image, width: format.width, height: format.height, index: 0 }],
        };
      }
      throw new Error("Importe d'abord un visuel depuis la page Mise en page.");
    }

    const basePath = `publications/${publicationId}/${Date.now()}`;
    const imageUrl = await uploadBlob(draft.imageBlob, `${basePath}-cover.jpg`);
    const uploadedSocialImages = [];
    for (const item of socialImages) {
      const blob = item.blob || draft.imageBlob;
      const url = item.blob ? await uploadBlob(blob, `${basePath}-slide-${(item.index || 0) + 1}.jpg`) : imageUrl;
      uploadedSocialImages.push({ url, width: item.width || format.width, height: item.height || format.height, index: item.index || 0 });
    }
    return { imageUrl, socialImages: uploadedSocialImages };
  };

  const buildData = (status, payload) => ({
    title: title.trim() || "Publication sans titre",
    slug: slugify(title || "publication"),
    excerpt: excerpt.trim(),
    content: content.trim(),
    caption: caption.trim(),
    tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    featured,
    status,
    publishedAt: status === "published" ? serverTimestamp() : publication?.publishedAt || null,
    image: payload.imageUrl,
    socialImages: payload.socialImages,
    format: {
      id: initialFormat.id,
      label: initialFormat.label,
      width: initialFormat.width,
      height: initialFormat.height,
      publishKind,
      slices: initialFormat.slices || payload.socialImages.length || 1,
      supportsReel: Boolean(initialFormat.supportsReel),
    },
    template: draft?.template || publication?.template || { id: "standard", label: "Standard" },
    checker,
    layoutDraft: cleanPublicationLayoutDraft(draft?.layoutDraft || publication?.layoutDraft || {}),
    platformStatus: publication?.platformStatus || {},
    updatedAt: serverTimestamp(),
  });

  const savePublication = async (status = "draft") => {
    setSaving(true);
    setMessage("");
    try {
      const publicationRef = publication?.id ? doc(db, "publications", publication.id) : doc(collection(db, "publications"));
      const payload = await resolveAssets(publicationRef.id);
      const data = buildData(status, payload);
      if (publication?.id) {
        await updateDoc(publicationRef, data);
      } else {
        await setDoc(publicationRef, { ...data, createdAt: serverTimestamp() });
      }
      if (data.featured) {
        await onSetHomeFeature(publicationRef.id);
      }
      const saved = { ...publication, ...data, id: publicationRef.id, image: payload.imageUrl, socialImages: payload.socialImages };
      onSaved(saved);
      setMessage(status === "published" ? "Publication visible sur le site." : "Brouillon enregistre.");
      return saved;
    } catch (error) {
      console.error("Publication save error:", error);
      const storageHint = error.code === "storage/unauthorized" ? " Les regles Firebase Storage doivent etre deployees pour autoriser /publications." : "";
      setMessage(`Erreur: ${error.message}.${storageHint}`);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const setHomeFeature = async (publicationId) => {
    setFeatureSaving(true);
    setMessage("");
    try {
      await onSetHomeFeature(publicationId || null);
      setMessage(publicationId ? "Publication mise en avant sur l'accueil." : "Mise en avant retiree de l'accueil.");
    } catch (error) {
      console.error("Home feature update error:", error);
      setMessage(`Erreur: ${error.message}`);
    } finally {
      setFeatureSaving(false);
    }
  };

  const publishToMeta = async () => {
    const saved = await savePublication("published");
    if (!saved?.id) return;
    setSyncing(true);
    setMessage("");
    try {
      const callable = httpsCallable(functions, "publishPublicationToMeta");
      const result = await callable({ publicationId: saved.id, targets: { instagram: true, facebook: true } });
      setMessage(`Synchronisation manuelle terminee: ${JSON.stringify(result.data)}`);
    } catch (error) {
      console.error("Meta publish error:", error);
      setMessage(`Publication reseaux manuelle en attente: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const publishToConnectedMeta = async () => {
    const saved = await savePublication("published");
    if (!saved?.id) return;
    setSyncing(true);
    setMessage("");
    try {
      const callable = httpsCallable(functions, "publishPublicationToConnectedMeta");
      const result = await callable({ publicationId: saved.id, targets: { instagram: true, facebook: true } });
      setMessage(`Synchronisation OAuth terminee: ${JSON.stringify(result.data)}`);
      await loadMetaOAuthStatus();
    } catch (error) {
      console.error("Meta OAuth publish error:", error);
      setMessage(`Publication OAuth en attente: ${getFunctionErrorMessage(error)}`);
    } finally {
      setSyncing(false);
    }
  };

  if (!visualUrl) {
    return (
      <PublicationDashboard
        stats={stats}
        publications={publications}
        loading={loading}
        selectedId={publication?.id}
        onBackToLayout={onBackToLayout}
        onSelectPublication={onSelectPublication}
        onDeletePublication={onDeletePublication}
        onSetHomeFeature={setHomeFeature}
        featureSaving={featureSaving}
        message={message}
      />
    );
  }

  return (
    <div className="pub-final-page">
      <header className="pub-final-top">
        <div>
          <span>Publication</span>
          <h2>{publication?.id ? "Finaliser la publication" : "Description et preview finale"}</h2>
          <p>Le visuel vient de la page Mise en page. Ici on gere le texte, la publication site, la preview Instagram et l'envoi reseaux.</p>
        </div>
        <div className="pub-final-actions">
          <button type="button" className="pub-ghost" onClick={onBackToLayout}><Icons.LayoutTemplate size={15} /> Ouvrir mise en page</button>
          <button type="button" className="pub-secondary" disabled={saving} onClick={() => savePublication("draft")}>{saving ? <span className="mini-spinner" /> : <Icons.Save size={15} />} Brouillon</button>
          <button type="button" className="pub-primary" disabled={saving} onClick={() => savePublication("published")}>{saving ? <span className="mini-spinner" /> : <Icons.Globe2 size={15} />} Publier site</button>
          <button type="button" className="pub-primary purple" disabled={saving || syncing} onClick={publishToMeta}>{syncing ? <span className="mini-spinner" /> : <Icons.Send size={15} />} Site + reseaux</button>
          <button type="button" className="pub-secondary" disabled={oauthBusy} onClick={openMetaOAuthConnect}>{oauthBusy ? <span className="mini-spinner" /> : <Icons.Link size={15} />} Connecter OAuth</button>
          <button type="button" className="pub-ghost" disabled={oauthBusy} onClick={loadMetaOAuthStatus}><Icons.RefreshCw size={15} /> Statut OAuth</button>
          <button type="button" className="pub-primary purple oauth" disabled={saving || syncing || !metaOAuth?.connected} onClick={publishToConnectedMeta}>{syncing ? <span className="mini-spinner" /> : <Icons.Send size={15} />} Site + reseaux OAuth</button>
        </div>
      </header>

      {message ? <div className="pub-message final">{message}</div> : null}
      <div className="pub-message final oauth-status">{metaOAuthLabel}</div>

      <section className="pub-final-stagebar" aria-label="Progression publication">
        <article className="done"><Icons.Check size={15} /><span>Visuel importe</span></article>
        <article className="active"><Icons.PencilLine size={15} /><span>Description & site</span></article>
        <article><Icons.Smartphone size={15} /><span>Preview & reseaux</span></article>
      </section>

      {!visualUrl ? (
        <section className="pub-dashboard-strip">
          <article><strong>{stats.drafts}</strong><span>Brouillons</span></article>
          <article><strong>{stats.published}</strong><span>Publiees site</span></article>
          <article><strong>{stats.synced}</strong><span>Synchronisees Insta</span></article>
          <button type="button" onClick={onBackToLayout}>
            <Icons.LayoutTemplate size={18} />
            <span>Créer une mise en page</span>
          </button>
        </section>
      ) : null}

      <div className="pub-final-grid">
        <aside className="pub-final-list">
          <PublicationList
            publications={publications}
            loading={loading}
            selectedId={publication?.id}
            onSelect={onSelectPublication}
            onDelete={onDeletePublication}
          />
        </aside>

        <section className="pub-final-form">
          {!visualUrl ? (
            <div className="pub-import-needed">
              <Icons.LayoutTemplate size={44} />
              <strong>Importe d'abord depuis la page Mise en page</strong>
              <button type="button" className="pub-primary" onClick={onBackToLayout}>Ouvrir la mise en page</button>
            </div>
          ) : (
            <>
              <div className="pub-final-card visual">
                <img src={visualUrl} alt="" />
                <div>
                  <span className="pub-final-card-kicker">Visuel source</span>
                  <strong>{initialFormat.label}</strong>
                  <span>{initialFormat.width} x {initialFormat.height}px</span>
                  <em>{socialImages.length} slide{socialImages.length > 1 ? "s" : ""} pour la publication</em>
                </div>
              </div>

              <div className="pub-final-card pub-final-copy">
                <div className="pub-final-card-title">
                  <span className="pub-final-card-kicker">Texte publication</span>
                  <h3>Legende, site et contexte.</h3>
                </div>
                <label className="pub-field"><span>Titre site</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex : Amenagement naturel en Normandie" /></label>
                <label className="pub-field"><span>Resume accueil</span><textarea rows={2} value={excerpt} onChange={(event) => setExcerpt(event.target.value)} /></label>
                <label className="pub-field featured"><span>Description Instagram / Facebook</span><textarea rows={7} value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Texte du post, hashtags, appel a l'action..." /></label>
                <label className="pub-field"><span>Contenu page detail</span><textarea rows={5} value={content} onChange={(event) => setContent(event.target.value)} /></label>
                <label className="pub-field"><span>Tags</span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="jardin, paysagisme, normandie" /></label>
                <div className="pub-final-card-title compact">
                  <span className="pub-final-card-kicker">Destination</span>
                </div>
                <label className="pub-checkline"><input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} /> Mettre en avant sur l'accueil</label>
                {initialFormat.supportsReel ? (
                  <div className="pub-kind-switch">
                    <span>Destination Instagram</span>
                    <button type="button" className={publishKind === "story" ? "active" : ""} onClick={() => setPublishKind("story")}>Story</button>
                    <button type="button" className={publishKind === "reel" ? "active" : ""} onClick={() => setPublishKind("reel")}>Reel</button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </section>

        <aside className="pub-final-preview">
          <InstagramPhonePreview imageUrl={visualUrl} socialImages={socialImages} format={format} caption={caption} title={title} />
          <div className={`checker-score ${checker.score >= 80 ? "good" : checker.score >= 55 ? "warn" : "bad"}`}>
            <strong>{checker.score}</strong>
            <span>Score preview</span>
          </div>
          <div className="checker-meta">
            <span>{caption.length}/{MAX_CAPTION_LENGTH} caracteres</span>
            <span>{checker.hashtags}/{MAX_HASHTAGS} hashtags</span>
            <span>{exportSize ? `${(exportSize / 1024 / 1024).toFixed(2)} MB` : "Image distante"}</span>
          </div>
          {[...checker.issues, ...checker.warnings].length ? (
            <ul className="checker-list">
              {checker.issues.map((item) => <li className="issue" key={item}>{item}</li>)}
              {checker.warnings.map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : (
            <p className="checker-ok">Le visuel est propre pour la publication.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function PublicationDashboard({ stats, publications, loading, selectedId, onBackToLayout, onSelectPublication, onDeletePublication, onSetHomeFeature, featureSaving, message }) {
  const latest = publications.slice(0, 6);
  const queued = publications.filter((item) => item.status !== "published").slice(0, 3);
  const published = publications.filter((item) => item.status === "published");
  const currentFeatured = published.find((item) => item.featured);

  return (
    <div className="pub-hub">
      <section className="pub-hub-hero">
        <div className="pub-hub-copy">
          <span className="pub-hub-kicker">Publications</span>
          <h2>Dashboard publications</h2>
          <p>Un poste de controle clair pour preparer les visuels, reprendre les brouillons et envoyer le contenu vers le site, Instagram et Facebook.</p>
        </div>
        <button type="button" className="pub-hub-primary" onClick={onBackToLayout}>
          <span>Creer une mise en page</span>
          <i><Icons.ArrowUpRight size={17} /></i>
        </button>
      </section>

      {message ? <div className="pub-message final">{message}</div> : null}

      <section className="pub-hub-stats" aria-label="Etat des publications">
        <article>
          <Icons.FilePenLine size={18} />
          <strong>{stats.drafts}</strong>
          <span>Brouillons actifs</span>
        </article>
        <article>
          <Icons.Globe2 size={18} />
          <strong>{stats.published}</strong>
          <span>Publiees site</span>
        </article>
        <article>
          <Icons.Send size={18} />
          <strong>{stats.synced}</strong>
          <span>Synchronisees Insta</span>
        </article>
      </section>

      <section className="pub-hub-grid">
        <article className="pub-hub-card pub-hub-create">
          <div>
            <span className="pub-hub-card-kicker">Flux conseille</span>
            <h3>Mise en page d'abord, description ensuite.</h3>
            <p>Le studio Vibe_fx reste plein ecran pour travailler le visuel sans compression. Une fois importe, cette page devient l'espace de finalisation texte et preview Instagram.</p>
          </div>
          <div className="pub-hub-steps">
            <span><b>01</b> Composer le visuel</span>
            <span><b>02</b> Importer vers publication</span>
            <span><b>03</b> Verifier la preview mobile</span>
          </div>
          <button type="button" className="pub-hub-secondary" onClick={onBackToLayout}>
            <Icons.LayoutTemplate size={16} />
            Ouvrir la mise en page
          </button>
        </article>

        <aside className="pub-hub-card pub-hub-recent">
          <div className="pub-hub-card-head">
            <div>
              <span className="pub-hub-card-kicker">File recente</span>
              <h3>Derniers contenus</h3>
            </div>
            <small>{latest.length} element(s)</small>
          </div>
          <div className="pub-feature-strip">
            <span className="pub-feature-strip-kicker">Mise en avant accueil</span>
            {currentFeatured ? (
              <div className="pub-feature-current">
                {currentFeatured.image ? <img src={currentFeatured.image} alt="" /> : <span className="pub-row-fallback"><Icons.Image size={18} /></span>}
                <span>
                  <strong>{currentFeatured.title || "Sans titre"}</strong>
                  <small>Publiee - {formatDate(currentFeatured.publishedAt || currentFeatured.updatedAt)}</small>
                </span>
                <button type="button" className="pub-feature-remove" disabled={featureSaving} onClick={() => onSetHomeFeature(null)}>
                  Retirer
                </button>
              </div>
            ) : (
              <div className="pub-feature-empty">
                <strong>Aucune publication mise en avant</strong>
                <small>Utilise le bouton Accueil sur une publication publiee.</small>
              </div>
            )}
          </div>
          <div className="pub-hub-list">
            <PublicationList
              publications={latest}
              loading={loading}
              selectedId={selectedId}
              onSelect={onSelectPublication}
              onDelete={onDeletePublication}
              onSetHomeFeature={onSetHomeFeature}
              featureSaving={featureSaving}
            />
          </div>
        </aside>

        <article className="pub-hub-card pub-hub-queue">
          <span className="pub-hub-card-kicker">A finaliser</span>
          <h3>Brouillons en attente</h3>
          {queued.length ? (
            <div className="pub-hub-mini-list">
              {queued.map((item) => (
                <button type="button" key={item.id} onClick={() => onSelectPublication(item)}>
                  {item.image ? <img src={item.image} alt="" /> : <Icons.Image size={16} />}
                  <span>{item.title || "Sans titre"}</span>
                </button>
              ))}
            </div>
          ) : (
            <p>Aucun brouillon en attente. Lance une mise en page pour creer la prochaine publication.</p>
          )}
        </article>

        <article className="pub-hub-card pub-hub-checks">
          <span className="pub-hub-card-kicker">Checker</span>
          <h3>Avant publication</h3>
          <ul>
            <li>Format Instagram verifie dans la preview iPhone.</li>
            <li>Description et hashtags ajustes apres l'import.</li>
            <li>Publication site separee de la synchronisation Meta.</li>
          </ul>
        </article>
      </section>
    </div>
  );
}

function PublicationList({ publications, loading, selectedId, onSelect, onDelete, onSetHomeFeature, featureSaving }) {
  if (loading) return <div className="pub-empty"><div className="admin-login-spinner" />Chargement...</div>;
  if (!publications.length) {
    return (
      <div className="pub-empty">
        <Icons.Newspaper size={30} />
        <p>Aucune publication pour le moment.</p>
      </div>
    );
  }

  return publications.map((publication) => (
    <div key={publication.id} className={`pub-row-wrap ${selectedId === publication.id ? "active" : ""}`}>
      <button type="button" className="pub-row" onClick={() => onSelect(publication)}>
        {publication.image ? <img src={publication.image} alt="" /> : <span className="pub-row-fallback"><Icons.Image size={18} /></span>}
        <span>
          <strong>{publication.title || "Sans titre"}</strong>
          <small>{publication.status === "published" ? "Publiee" : "Brouillon"} - {formatDate(publication.publishedAt || publication.updatedAt)}</small>
        </span>
        <i>{publication.format?.label || "Format"}</i>
      </button>
      {onSetHomeFeature ? (
        <button
          type="button"
          className={`pub-row-feature ${publication.featured ? "active" : ""}`}
          disabled={featureSaving || publication.status !== "published"}
          title={publication.status === "published" ? (publication.featured ? "Retirer de l'accueil" : "Mettre sur l'accueil") : "Publie d'abord cette publication"}
          onClick={() => onSetHomeFeature(publication.featured ? null : publication.id)}
        >
          <Icons.Pin size={13} />
          <span>{publication.featured ? "Retirer" : "Accueil"}</span>
        </button>
      ) : null}
      <button type="button" className="pub-row-delete" onClick={() => onDelete(publication)}>
        <Icons.Trash2 size={13} />
        <span>Supprimer</span>
      </button>
    </div>
  ));
}

function InstagramPhonePreview({ imageUrl, socialImages, format, caption, title }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const slides = socialImages?.length ? socialImages.map((item) => item.url || item) : imageUrl ? [imageUrl] : [];
  const activeSlide = slides[Math.min(activeIndex, Math.max(slides.length - 1, 0))] || imageUrl;
  const isStoryLike = format.publishKind === "story" || format.publishKind === "reel";

  return (
    <div className="phone-frame pub-phone-inline">
      <div className="phone-speaker" />
      <div className="phone-screen">
        <div className="phone-status"><span>9:41</span><span><Icons.Wifi size={13} /><Icons.BatteryMedium size={15} /></span></div>
        {isStoryLike ? (
          <div className="story-preview">
            {activeSlide ? <img src={activeSlide} alt="" /> : <div className="phone-empty-media" />}
            <div className="story-bars"><i /></div>
            <div className="story-head"><span>jardinsdechawi</span><small>2h</small><Icons.MoreHorizontal size={18} /></div>
            <div className="story-bottom"><span>Envoyer un message</span><Icons.Heart size={24} /><Icons.Send size={24} /></div>
          </div>
        ) : (
          <div className="feed-preview">
            <header><Icons.ChevronLeft size={24} /><strong>Publications</strong><Icons.MoreHorizontal size={18} /></header>
            <div className="post-head">
              <span className="avatar">JC</span>
              <div><strong>jardinsdechawi</strong><small>Les Jardins de Chawi - Original</small></div>
            </div>
            <div className="post-media" style={{ aspectRatio: "4 / 5" }}>
              {activeSlide ? <img src={activeSlide} alt="" /> : <div className="phone-empty-media" />}
              {slides.length > 1 ? (
                <div className="post-nav">
                  {slides.map((_, index) => (
                    <button key={index} type="button" className={activeIndex === index ? "active" : ""} onClick={() => setActiveIndex(index)} />
                  ))}
                </div>
              ) : null}
            </div>
            <div className="post-actions"><Icons.Heart size={24} /><Icons.MessageCircle size={24} /><Icons.Send size={24} /><Icons.Bookmark size={24} /></div>
            <p><strong>jardinsdechawi</strong> {caption || title || "Nouvelle publication."}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LegacyPublicationsManager() {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const loadPublications = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(query(collection(db, "publications"), orderBy("updatedAt", "desc")));
      setPublications(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    } catch (error) {
      console.error("Publications load error:", error);
      setPublications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPublications();
  }, [loadPublications]);

  const stats = useMemo(() => {
    const draft = publications.filter((item) => item.status !== "published").length;
    const published = publications.filter((item) => item.status === "published").length;
    const synced = publications.filter((item) => item.platformStatus?.instagram?.status === "published").length;
    return { draft, published, synced };
  }, [publications]);

  const handleDelete = async (publication) => {
    if (!window.confirm(`Supprimer "${publication.title || "cette publication"}" ?`)) return;
    await deleteDoc(doc(db, "publications", publication.id));
    if (selected?.id === publication.id) setSelected(null);
    await loadPublications();
  };

  return (
    <div className="pub-manager">
      <div className="pub-header">
        <div>
          <span className="pub-eyebrow">Studio social</span>
          <h2>Publications site, Instagram et Facebook</h2>
          <p>Composez les visuels, controlez la preview mobile et publiez depuis un seul flux.</p>
        </div>
        <button className="pub-primary" onClick={() => setSelected({})}>
          <Icons.Plus size={17} />
          Nouvelle publication
        </button>
      </div>

      <div className="pub-stats">
        <article><strong>{stats.draft}</strong><span>Brouillons</span></article>
        <article><strong>{stats.published}</strong><span>Publiees site</span></article>
        <article><strong>{stats.synced}</strong><span>Synchronisees Insta</span></article>
      </div>

      <div className="pub-layout">
        <aside className="pub-list">
          {loading ? (
            <div className="pub-empty"><div className="admin-login-spinner" />Chargement...</div>
          ) : publications.length ? (
            publications.map((publication) => (
              <button
                key={publication.id}
                className={`pub-row ${selected?.id === publication.id ? "active" : ""}`}
                onClick={() => setSelected(publication)}
              >
                {publication.image ? <img src={publication.image} alt="" /> : <span className="pub-row-fallback"><Icons.Image size={18} /></span>}
                <span>
                  <strong>{publication.title || "Sans titre"}</strong>
                  <small>{publication.status === "published" ? "Publiee" : "Brouillon"} - {formatDate(publication.publishedAt || publication.updatedAt)}</small>
                </span>
                <i>{publication.format?.label || "Format"}</i>
              </button>
            ))
          ) : (
            <div className="pub-empty">
              <Icons.Newspaper size={30} />
              <p>Aucune publication pour le moment.</p>
            </div>
          )}
        </aside>

        <section className="pub-workbench">
          {selected ? (
            <PublicationEditor
              key={selected.id || "new"}
              publication={selected}
              onSaved={setSelected}
              onDelete={handleDelete}
            />
          ) : (
            <div className="pub-welcome">
              <Icons.LayoutDashboard size={42} />
              <h3>Choisissez une publication ou creez un nouveau visuel.</h3>
              <p>Le module reprend la logique de mise en page Vibe_fx avec les formats utiles a Instagram.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function PublicationEditor({ publication, onSaved, onDelete }) {
  const initialFormat = SOCIAL_FORMATS.find((item) => item.id === publication.format?.id) || SOCIAL_FORMATS[0];
  const initialTemplate = LAYOUT_TEMPLATES.find((item) => item.id === publication.template?.id) || LAYOUT_TEMPLATES[0];
  const [title, setTitle] = useState(publication.title || "");
  const [excerpt, setExcerpt] = useState(publication.excerpt || "");
  const [content, setContent] = useState(publication.content || "");
  const [caption, setCaption] = useState(publication.caption || "");
  const [tags, setTags] = useState((publication.tags || []).join(", "));
  const [featured, setFeatured] = useState(Boolean(publication.featured));
  const [format, setFormat] = useState(initialFormat);
  const [template, setTemplate] = useState(initialTemplate);
  const [images, setImages] = useState([]);
  const [textLayers, setTextLayers] = useState(publication.layoutDraft?.textLayers || [DEFAULT_TEXT]);
  const [activeTextId, setActiveTextId] = useState(textLayers[0]?.id || null);
  const [slotConfigs, setSlotConfigs] = useState(publication.layoutDraft?.slotConfigs || {});
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [padding, setPadding] = useState(publication.layoutDraft?.padding || 44);
  const [gap, setGap] = useState(publication.layoutDraft?.gap || 18);
  const [radius, setRadius] = useState(publication.layoutDraft?.radius || 0);
  const [background, setBackground] = useState(publication.layoutDraft?.background || "#111710");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(publication.image || null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [exportSize, setExportSize] = useState(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const checker = useMemo(
    () => buildChecker({ caption, format, exportSize, textLayers }),
    [caption, exportSize, format, textLayers]
  );

  const activeText = textLayers.find((layer) => layer.id === activeTextId) || null;
  const activeSlotConfig = selectedSlot !== null ? slotConfigs[selectedSlot] || { zoom: 1, x: 0, y: 0, border: 0 } : null;

  const renderPreview = useCallback(() => {
    drawCanvas({
      canvas: canvasRef.current,
      images,
      format,
      template,
      slotConfigs,
      textLayers,
      background,
      padding,
      gap,
      radius,
      selectedSlot,
      preview: true,
    });
  }, [background, format, gap, images, padding, radius, selectedSlot, slotConfigs, template, textLayers]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  useEffect(() => {
    let alive = true;
    if (!publication.image || images.length) return undefined;
    urlToImage(publication.image, publication.title || "publication")
      .then((image) => {
        if (alive) setImages([image]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [images.length, publication.image, publication.title]);

  useEffect(() => {
    if (!canvasRef.current || !images.length) return;
    const timer = window.setTimeout(async () => {
      try {
        const blob = await canvasToBlob(canvasRef.current, "image/jpeg", 0.9);
        setExportSize(blob.size);
      } catch {
        setExportSize(null);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [caption, format, images, renderPreview, template, textLayers]);

  const handleImages = async (event) => {
    const files = Array.from(event.target.files || []);
    const loaded = await Promise.all(files.map(fileToImage));
    setImages((current) => [...current, ...loaded].slice(0, 8));
    event.target.value = "";
  };

  const updateText = (patch) => {
    setTextLayers((current) =>
      current.map((layer) => (layer.id === activeTextId ? { ...layer, ...patch } : layer))
    );
  };

  const updateSlot = (key, value) => {
    if (selectedSlot === null) return;
    setSlotConfigs((current) => ({
      ...current,
      [selectedSlot]: {
        zoom: 1,
        x: 0,
        y: 0,
        border: 0,
        ...(current[selectedSlot] || {}),
        [key]: value,
      },
    }));
  };

  const createRenderCanvas = () => {
    const canvas = document.createElement("canvas");
    drawCanvas({
      canvas,
      images,
      format,
      template,
      slotConfigs,
      textLayers,
      background,
      padding,
      gap,
      radius,
      selectedSlot: null,
      preview: false,
    });
    return canvas;
  };

  const uploadBlob = async (blob, path) => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob, { contentType: blob.type || "image/jpeg" });
    return getDownloadURL(storageRef);
  };

  const exportPayload = async (publicationId) => {
    const finalCanvas = createRenderCanvas();
    const fullBlob = await canvasToBlob(finalCanvas, "image/jpeg", 0.92);
    const basePath = `publications/${publicationId}/${Date.now()}`;
    const imageUrl = await uploadBlob(fullBlob, `${basePath}-cover.jpg`);
    const socialImages = [];

    if (format.slices) {
      const sliceWidth = finalCanvas.width / format.slices;
      for (let index = 0; index < format.slices; index += 1) {
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = sliceWidth;
        sliceCanvas.height = finalCanvas.height;
        const sliceCtx = sliceCanvas.getContext("2d");
        sliceCtx.drawImage(finalCanvas, index * sliceWidth, 0, sliceWidth, finalCanvas.height, 0, 0, sliceWidth, finalCanvas.height);
        const sliceBlob = await canvasToBlob(sliceCanvas, "image/jpeg", 0.92);
        const url = await uploadBlob(sliceBlob, `${basePath}-slide-${index + 1}.jpg`);
        socialImages.push({ url, width: sliceCanvas.width, height: sliceCanvas.height, index });
      }
    } else {
      socialImages.push({ url: imageUrl, width: finalCanvas.width, height: finalCanvas.height, index: 0 });
    }

    return { imageUrl, socialImages, fullBlob };
  };

  const buildData = (status, payload) => ({
    title: title.trim() || "Publication sans titre",
    slug: slugify(title || "publication"),
    excerpt: excerpt.trim(),
    content: content.trim(),
    caption: caption.trim(),
    tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    featured,
    status,
    publishedAt: status === "published" ? serverTimestamp() : publication.publishedAt || null,
    image: payload.imageUrl,
    socialImages: payload.socialImages,
    format: {
      id: format.id,
      label: format.label,
      width: format.width,
      height: format.height,
      publishKind: format.publishKind,
      slices: format.slices || 1,
    },
    template: { id: template.id, label: template.label },
    checker,
    layoutDraft: {
      textLayers,
      slotConfigs,
      padding,
      gap,
      radius,
      background,
    },
    updatedAt: serverTimestamp(),
  });

  const savePublication = async (status = "draft") => {
    if (!images.length) {
      setMessage("Ajoute au moins une image avant d'enregistrer.");
      return null;
    }

    setSaving(true);
    setMessage("");
    try {
      const id = publication.id || doc(collection(db, "publications")).id;
      const payload = await exportPayload(id);
      const data = buildData(status, payload);
      if (publication.id) {
        await updateDoc(doc(db, "publications", publication.id), data);
        const saved = { ...publication, ...data, id: publication.id, image: payload.imageUrl, socialImages: payload.socialImages };
        onSaved(saved);
        setPreviewUrl(payload.imageUrl);
        setMessage(status === "published" ? "Publication visible sur le site." : "Brouillon enregistre.");
        return saved;
      }

      data.createdAt = serverTimestamp();
      const createdRef = await addDoc(collection(db, "publications"), data);
      const saved = { ...data, id: createdRef.id, image: payload.imageUrl, socialImages: payload.socialImages };
      onSaved(saved);
      setPreviewUrl(payload.imageUrl);
      setMessage(status === "published" ? "Publication creee et visible sur le site." : "Brouillon cree.");
      return saved;
    } catch (error) {
      console.error("Publication save error:", error);
      setMessage(`Erreur: ${error.message}`);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const publishToMeta = async () => {
    const saved = await savePublication("published");
    if (!saved?.id) return;
    setSyncing(true);
    setMessage("");
    try {
      const callable = httpsCallable(functions, "publishPublicationToMeta");
      const result = await callable({
        publicationId: saved.id,
        targets: { instagram: true, facebook: true },
      });
      setMessage(`Synchronisation terminee: ${JSON.stringify(result.data)}`);
    } catch (error) {
      console.error("Meta publish error:", error);
      setMessage(`Publication reseaux en attente: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const openPreview = () => {
    if (canvasRef.current) setPreviewUrl(canvasRef.current.toDataURL("image/jpeg", 0.92));
    setPreviewOpen(true);
  };

  const downloadExport = async () => {
    if (!images.length) return;
    const canvas = createRenderCanvas();
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${slugify(title || "publication") || "publication"}.jpg`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 5000);
  };

  return (
    <div className="pub-editor">
      <div className="pub-editor-top">
        <div>
          <h3>{publication.id ? "Modifier la publication" : "Nouvelle publication"}</h3>
          <p>Dimensions Instagram: portrait 1080x1350, carre 1080x1080, story/reel 1080x1920.</p>
        </div>
        <div className="pub-editor-actions">
          {publication.id ? (
            <button className="pub-ghost danger" onClick={() => onDelete(publication)}><Icons.Trash2 size={15} /> Supprimer</button>
          ) : null}
          <button className="pub-ghost" onClick={downloadExport}><Icons.Download size={15} /> Export</button>
          <button className="pub-ghost" onClick={openPreview}><Icons.Smartphone size={15} /> Preview</button>
          <button className="pub-secondary" disabled={saving} onClick={() => savePublication("draft")}>
            {saving ? <span className="mini-spinner" /> : <Icons.Save size={15} />} Brouillon
          </button>
          <button className="pub-primary" disabled={saving} onClick={() => savePublication("published")}>
            {saving ? <span className="mini-spinner" /> : <Icons.Globe2 size={15} />} Publier site
          </button>
          <button className="pub-primary purple" disabled={saving || syncing} onClick={publishToMeta}>
            {syncing ? <span className="mini-spinner" /> : <Icons.Send size={15} />} Site + reseaux
          </button>
        </div>
      </div>

      {message ? <div className="pub-message">{message}</div> : null}

      <div className="pub-studio">
        <div className="pub-canvas-zone">
          <div className="pub-canvas-toolbar">
            <button onClick={() => fileInputRef.current?.click()}><Icons.ImagePlus size={15} /> Ajouter images</button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleImages} />
            <button onClick={() => setSelectedSlot(selectedSlot === null ? 0 : null)}>
              <Icons.MousePointer2 size={15} /> {selectedSlot === null ? "Ajuster image" : "Fermer ajustement"}
            </button>
            <button onClick={() => {
              const layer = { ...DEFAULT_TEXT, id: makeId(), label: "Texte", value: "Nouveau texte", y: 50 };
              setTextLayers((current) => [...current, layer]);
              setActiveTextId(layer.id);
            }}>
              <Icons.Type size={15} /> Nouveau texte
            </button>
          </div>

          <div className="pub-canvas-frame">
            {!images.length ? (
              <button className="pub-upload-empty" onClick={() => fileInputRef.current?.click()}>
                <Icons.UploadCloud size={42} />
                <strong>Importer les visuels source</strong>
                <span>JPG, PNG ou WebP. Le rendu final sera exporte en JPEG pour Instagram.</span>
              </button>
            ) : null}
            <canvas
              ref={canvasRef}
              className={images.length ? "pub-canvas visible" : "pub-canvas"}
              style={{ aspectRatio: `${format.width} / ${format.height}` }}
            />
            {(format.id === "pano2" || format.id === "pano3") && images.length ? (
              <div className={`pub-pano-guides ${format.id}`} aria-hidden="true">
                {Array.from({ length: format.slices - 1 }).map((_, index) => <i key={index} />)}
              </div>
            ) : null}
          </div>

          <div className="pub-thumbs">
            {images.map((image, index) => (
              <button key={image.id} className={selectedSlot === index ? "active" : ""} onClick={() => setSelectedSlot(index)}>
                <img src={image.src} alt="" />
                <span>{index + 1}</span>
              </button>
            ))}
          </div>
        </div>

        <aside className="pub-controls">
          <Panel title="Format" icon="Smartphone">
            <div className="format-grid">
              {SOCIAL_FORMATS.map((item) => {
                const Icon = Icons[item.icon] || Icons.Smartphone;
                return (
                  <button key={item.id} className={format.id === item.id ? "active" : ""} onClick={() => setFormat(item)}>
                    <Icon size={18} />
                    <strong>{item.label}</strong>
                    <span>{item.hint}</span>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel title="Modeles" icon="LayoutTemplate">
            <div className="template-grid">
              {LAYOUT_TEMPLATES.map((item) => {
                const Icon = Icons[item.icon] || Icons.Box;
                return (
                  <button key={item.id} className={template.id === item.id ? "active" : ""} onClick={() => setTemplate(item)}>
                    <Icon size={17} />
                    <span><strong>{item.label}</strong><small>{item.slots} zone(s)</small></span>
                  </button>
                );
              })}
            </div>
          </Panel>

          {activeSlotConfig ? (
            <Panel title={`Image zone ${selectedSlot + 1}`} icon="SlidersHorizontal">
              <RangeControl label="Zoom" value={activeSlotConfig.zoom || 1} min={1} max={4} step={0.05} onChange={(v) => updateSlot("zoom", v)} />
              <RangeControl label="Position X" value={activeSlotConfig.x || 0} min={-100} max={100} step={1} onChange={(v) => updateSlot("x", v)} />
              <RangeControl label="Position Y" value={activeSlotConfig.y || 0} min={-100} max={100} step={1} onChange={(v) => updateSlot("y", v)} />
              <RangeControl label="Bordure" value={activeSlotConfig.border || 0} min={0} max={28} step={1} onChange={(v) => updateSlot("border", v)} />
            </Panel>
          ) : null}

          <Panel title="Description" icon="Captions">
            <label className="pub-field"><span>Titre site</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Amenagement d'un jardin naturel" /></label>
            <label className="pub-field"><span>Resume site</span><textarea rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} /></label>
            <label className="pub-field"><span>Description Instagram / Facebook</span><textarea rows={5} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Texte du post, hashtags, appel a l'action..." /></label>
            <label className="pub-field"><span>Contenu page detail</span><textarea rows={5} value={content} onChange={(e) => setContent(e.target.value)} /></label>
            <label className="pub-field"><span>Tags</span><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="jardin, paysagisme, normandie" /></label>
            <label className="pub-checkline"><input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> Mettre en avant sur l'accueil</label>
          </Panel>

          <Panel title="Textes et fond" icon="Type">
            <div className="text-layer-list">
              {textLayers.map((layer) => (
                <button key={layer.id} className={layer.id === activeTextId ? "active" : ""} onClick={() => setActiveTextId(layer.id)}>
                  <Icons.Type size={13} /> {layer.label}
                </button>
              ))}
            </div>
            {activeText ? (
              <>
                <label className="pub-field"><span>Texte actif</span><input value={activeText.value} onChange={(e) => updateText({ value: e.target.value })} /></label>
                <RangeControl label="Taille" value={activeText.size} min={18} max={120} step={1} onChange={(v) => updateText({ size: v })} />
                <RangeControl label="Position X" value={activeText.x} min={0} max={100} step={1} onChange={(v) => updateText({ x: v })} />
                <RangeControl label="Position Y" value={activeText.y} min={0} max={100} step={1} onChange={(v) => updateText({ y: v })} />
                <label className="pub-field compact"><span>Couleur</span><input type="color" value={activeText.color} onChange={(e) => updateText({ color: e.target.value })} /></label>
              </>
            ) : null}
            <RangeControl label="Marge" value={padding} min={0} max={180} step={2} onChange={setPadding} />
            <RangeControl label="Gouttiere" value={gap} min={0} max={80} step={1} onChange={setGap} />
            <RangeControl label="Arrondi" value={radius} min={0} max={80} step={1} onChange={setRadius} />
            <label className="pub-field compact"><span>Fond</span><input type="color" value={background} onChange={(e) => setBackground(e.target.value)} /></label>
          </Panel>

          <Panel title="Checker Instagram" icon="ShieldCheck">
            <div className={`checker-score ${checker.score >= 80 ? "good" : checker.score >= 55 ? "warn" : "bad"}`}>
              <strong>{checker.score}</strong>
              <span>Score preview</span>
            </div>
            <div className="checker-meta">
              <span>{caption.length}/{MAX_CAPTION_LENGTH} caracteres</span>
              <span>{checker.hashtags}/{MAX_HASHTAGS} hashtags</span>
              <span>{exportSize ? `${(exportSize / 1024 / 1024).toFixed(2)} MB` : "Poids calcule..."}</span>
            </div>
            {[...checker.issues, ...checker.warnings].length ? (
              <ul className="checker-list">
                {checker.issues.map((item) => <li className="issue" key={item}>{item}</li>)}
                {checker.warnings.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : (
              <p className="checker-ok">Le visuel est propre pour la publication.</p>
            )}
          </Panel>
        </aside>
      </div>

      {previewOpen ? (
        <InstagramPreviewModal
          imageUrl={previewUrl}
          format={format}
          caption={caption}
          title={title}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </div>
  );
}

function Panel({ title, icon, children }) {
  const Icon = Icons[icon] || Icons.Settings2;
  return (
    <section className="pub-panel">
      <h4><Icon size={15} /> {title}</h4>
      {children}
    </section>
  );
}

function RangeControl({ label, value, min, max, step, onChange }) {
  return (
    <label className="range-control">
      <span>{label}<strong>{typeof value === "number" ? value.toFixed(step < 1 ? 2 : 0) : value}</strong></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function InstagramPreviewModal({ imageUrl, format, caption, title, onClose }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const slices = format.slices || 1;
  const isStoryLike = format.publishKind === "story" || format.publishKind === "reel";

  return (
    <div className="insta-modal" onClick={onClose}>
      <button className="insta-close" onClick={onClose}><Icons.X size={20} /></button>
      <div className="phone-frame" onClick={(event) => event.stopPropagation()}>
        <div className="phone-speaker" />
        <div className="phone-screen">
          <div className="phone-status"><span>9:41</span><span><Icons.Wifi size={13} /><Icons.BatteryMedium size={15} /></span></div>
          {isStoryLike ? (
            <div className="story-preview">
              <img src={imageUrl} alt="" />
              <div className="story-bars"><i /></div>
              <div className="story-head"><span>jardinsdechawi</span><small>2h</small><Icons.MoreHorizontal size={18} /></div>
              <div className="story-bottom"><span>Envoyer un message</span><Icons.Heart size={24} /><Icons.Send size={24} /></div>
            </div>
          ) : (
            <div className="feed-preview">
              <header><Icons.ChevronLeft size={24} /><strong>Publications</strong><Icons.MoreHorizontal size={18} /></header>
              <div className="post-head">
                <span className="avatar">JC</span>
                <div><strong>jardinsdechawi</strong><small>Les Jardins de Chawi - Original</small></div>
              </div>
              <div className="post-media" style={{ aspectRatio: format.slices ? "4 / 5" : `${format.width} / ${format.height}` }}>
                {format.slices ? (
                  <img
                    src={imageUrl}
                    alt=""
                    style={{
                      width: `${slices * 100}%`,
                      maxWidth: "none",
                      height: "100%",
                      objectFit: "cover",
                      transform: `translateX(-${activeIndex * (100 / slices)}%)`,
                    }}
                  />
                ) : (
                  <img src={imageUrl} alt="" />
                )}
                {format.slices ? (
                  <div className="post-nav">
                    {Array.from({ length: slices }).map((_, index) => (
                      <button key={index} className={activeIndex === index ? "active" : ""} onClick={() => setActiveIndex(index)} />
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="post-actions"><Icons.Heart size={24} /><Icons.MessageCircle size={24} /><Icons.Send size={24} /><Icons.Bookmark size={24} /></div>
              <p><strong>jardinsdechawi</strong> {caption || title || "Nouvelle publication."}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
