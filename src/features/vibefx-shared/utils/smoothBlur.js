export const SMOOTH_BLUR_LIMITS = {
  height: { min: 0, max: 100 },
  precision: { min: 5, max: 30 },
  blur: { min: 0, max: 200 },
};

export const DEFAULT_SMOOTH_BLUR_CONFIG = {
  enabled: false,
  direction: 'down',
  height: 54,
  precision: 18,
  blur: 64,
  easeType: 'in',
  preset: 'linear',
  reverse: false,
};

export const SMOOTH_BLUR_DIRECTIONS = ['up', 'down', 'right', 'left'];
export const SMOOTH_BLUR_EASE_TYPES = ['in', 'out', 'inOut'];
export const SMOOTH_BLUR_PRESETS = ['linear', 'sine', 'quad', 'cubic', 'quart', 'quint', 'expo', 'circ'];

export const SMOOTH_BLUR_LOOK_PRESETS = [
  {
    id: 'soft-bottom',
    label: 'Bas doux',
    description: 'Adoucit le bas pour une legende sans masquer la photo.',
    config: { direction: 'down', height: 54, precision: 18, blur: 54, easeType: 'out', preset: 'sine', reverse: false },
  },
  {
    id: 'story-clean',
    label: 'Story clean',
    description: 'Bande haute propre pour story ou reel.',
    config: { direction: 'up', height: 48, precision: 18, blur: 46, easeType: 'out', preset: 'quad', reverse: false },
  },
  {
    id: 'caption-pro',
    label: 'Caption pro',
    description: 'Zone basse lisible sur photo detaillee.',
    config: { direction: 'down', height: 62, precision: 20, blur: 68, easeType: 'inOut', preset: 'sine', reverse: false },
  },
  {
    id: 'feed-luxe',
    label: 'Feed luxe',
    description: 'Effet discret qui garde l image tres nette.',
    config: { direction: 'down', height: 42, precision: 16, blur: 38, easeType: 'out', preset: 'cubic', reverse: false },
  },
  {
    id: 'bande-gauche',
    label: 'Bande gauche',
    description: 'Flou lateral pour titre ou prix aligne a gauche.',
    config: { direction: 'left', height: 46, precision: 18, blur: 44, easeType: 'out', preset: 'sine', reverse: false },
  },
  {
    id: 'bande-droite',
    label: 'Bande droite',
    description: 'Flou lateral pour texte court a droite.',
    config: { direction: 'right', height: 46, precision: 18, blur: 44, easeType: 'out', preset: 'sine', reverse: false },
  },
  {
    id: 'cine-bas',
    label: 'Cine bas',
    description: 'Ambiance plus marquee pour couverture ou miniature.',
    config: { direction: 'down', height: 70, precision: 24, blur: 82, easeType: 'inOut', preset: 'quad', reverse: false },
  },
  {
    id: 'airy-top',
    label: 'Airy top',
    description: 'Voile leger sur ciel, mur clair ou fond uniforme.',
    config: { direction: 'up', height: 38, precision: 15, blur: 34, easeType: 'out', preset: 'sine', reverse: false },
  },
  {
    id: 'social-punch',
    label: 'Social punch',
    description: 'Flou visible mais propre pour texte tres lisible.',
    config: { direction: 'down', height: 56, precision: 20, blur: 72, easeType: 'out', preset: 'quart', reverse: false },
  },
];

const easingFns = {
  linear: (t) => t,
  sine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  quad: (t) => t * t,
  cubic: (t) => t * t * t,
  quart: (t) => t * t * t * t,
  quint: (t) => t * t * t * t * t,
  expo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  circ: (t) => 1 - Math.sqrt(Math.max(0, 1 - t * t)),
};

const cssDirection = {
  up: 'to top',
  down: 'to bottom',
  right: 'to right',
  left: 'to left',
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toFiniteNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeId = (value, allowed, fallback) => (
  allowed.includes(value) ? value : fallback
);

export const normalizeSmoothBlurConfig = (config = {}, options = {}) => {
  const fallback = {
    ...DEFAULT_SMOOTH_BLUR_CONFIG,
    enabled: options.enabledDefault ?? DEFAULT_SMOOTH_BLUR_CONFIG.enabled,
  };
  const source = { ...fallback, ...(config || {}) };

  return {
    enabled: Boolean(source.enabled),
    direction: normalizeId(source.direction, SMOOTH_BLUR_DIRECTIONS, fallback.direction),
    height: Math.round(clamp(
      toFiniteNumber(source.height, fallback.height),
      SMOOTH_BLUR_LIMITS.height.min,
      SMOOTH_BLUR_LIMITS.height.max
    )),
    precision: Math.round(clamp(
      toFiniteNumber(source.precision, fallback.precision),
      SMOOTH_BLUR_LIMITS.precision.min,
      SMOOTH_BLUR_LIMITS.precision.max
    )),
    blur: Math.round(clamp(
      toFiniteNumber(source.blur, fallback.blur),
      SMOOTH_BLUR_LIMITS.blur.min,
      SMOOTH_BLUR_LIMITS.blur.max
    )),
    easeType: normalizeId(source.easeType, SMOOTH_BLUR_EASE_TYPES, fallback.easeType),
    preset: normalizeId(source.preset, SMOOTH_BLUR_PRESETS, fallback.preset),
    reverse: Boolean(source.reverse),
  };
};

const randomBetween = (random, min, max) => min + (random() * (max - min));

const jitterNumber = (value, amount, random) => Math.round(value + randomBetween(random, -amount, amount));

export const createRandomSmoothBlurConfig = (random = Math.random) => {
  const safeRandom = typeof random === 'function' ? random : Math.random;
  const preset = SMOOTH_BLUR_LOOK_PRESETS[
    Math.floor(safeRandom() * SMOOTH_BLUR_LOOK_PRESETS.length)
  ] || SMOOTH_BLUR_LOOK_PRESETS[0];

  return normalizeSmoothBlurConfig({
    ...preset.config,
    enabled: true,
    height: jitterNumber(preset.config.height, 7, safeRandom),
    precision: jitterNumber(preset.config.precision, 2, safeRandom),
    blur: jitterNumber(preset.config.blur, 10, safeRandom),
  }, { enabledDefault: true });
};

export const createDisabledSmoothBlurConfig = () => ({
  ...DEFAULT_SMOOTH_BLUR_CONFIG,
  enabled: false,
  height: 0,
  blur: 0,
});

export const createSmoothBlurEase = (config = {}) => {
  const normalized = normalizeSmoothBlurConfig(config, { enabledDefault: true });
  const baseEase = easingFns[normalized.preset] || easingFns.linear;

  return (rawProgress) => {
    const t = clamp(toFiniteNumber(rawProgress, 0), 0, 1);
    let value = t;

    if (normalized.preset !== 'linear') {
      if (normalized.easeType === 'in') value = baseEase(t);
      if (normalized.easeType === 'out') value = 1 - baseEase(1 - t);
      if (normalized.easeType === 'inOut') {
        value = t < 0.5
          ? baseEase(t * 2) / 2
          : 1 - baseEase((1 - t) * 2) / 2;
      }
    }

    return normalized.reverse ? 1 - value : value;
  };
};

const getLayerStops = (index, precision, heightRatio) => {
  const step = 1 / precision;
  const p1 = Math.max(0, index * step - 2 * step) * heightRatio;
  const p2 = Math.max(0, index * step) * heightRatio;
  let p3 = Math.min(1, index * step + step) * heightRatio;
  let p4 = Math.min(1, index * step + 3 * step) * heightRatio;

  if (index === precision - 1) {
    p3 = heightRatio;
    p4 = 1;
  }

  const s1 = clamp(p1, 0, 1);
  const s2 = clamp(Math.max(s1, p2), 0, 1);
  const s3 = clamp(Math.max(s2, p3), 0, 1);
  const s4 = clamp(Math.max(s3, p4), 0, 1);

  return [s1, s2, s3, s4];
};

export const resolveSmoothBlurLayers = (config = {}) => {
  const normalized = normalizeSmoothBlurConfig(config, { enabledDefault: true });
  if (normalized.blur <= 0 || normalized.height <= 0) {
    return [];
  }

  const ease = createSmoothBlurEase(normalized);
  const heightRatio = normalized.height / 100;

  return Array.from({ length: normalized.precision }, (_, index) => {
    const progress = normalized.precision === 1 ? 1 : index / (normalized.precision - 1);
    const blur = clamp(ease(progress), 0, 1) * normalized.blur;
    const stops = getLayerStops(index, normalized.precision, heightRatio);

    return {
      blur,
      stops,
      direction: normalized.direction,
      cssMask: `linear-gradient(${cssDirection[normalized.direction]}, rgba(0,0,0,0) ${stops[0] * 100}%, rgba(0,0,0,1) ${stops[1] * 100}%, rgba(0,0,0,1) ${stops[2] * 100}%, rgba(0,0,0,0) ${stops[3] * 100}%)`,
    };
  });
};

export const getSmoothBlurGradientLine = (direction, width, height) => {
  if (direction === 'up') return { x0: 0, y0: height, x1: 0, y1: 0 };
  if (direction === 'left') return { x0: width, y0: 0, x1: 0, y1: 0 };
  if (direction === 'right') return { x0: 0, y0: 0, x1: width, y1: 0 };
  return { x0: 0, y0: 0, x1: 0, y1: height };
};

const addSafeColorStop = (gradient, stop, color, previousStop) => {
  const safeStop = clamp(Math.max(stop, previousStop + 0.00001), 0, 1);
  gradient.addColorStop(safeStop, color);
  return safeStop;
};

export const applySmoothBlurToCanvas = (ctx, width, height, config = {}) => {
  if (!ctx || !width || !height) return { applied: false, layers: 0 };

  const normalized = normalizeSmoothBlurConfig(config);
  if (!normalized.enabled) return { applied: false, layers: 0 };

  const layers = resolveSmoothBlurLayers(normalized);
  if (layers.length === 0) return { applied: false, layers: 0 };

  const ownerDocument = ctx.canvas?.ownerDocument || document;
  const baseCanvas = ownerDocument.createElement('canvas');
  baseCanvas.width = width;
  baseCanvas.height = height;
  baseCanvas.getContext('2d').drawImage(ctx.canvas, 0, 0);

  const { x0, y0, x1, y1 } = getSmoothBlurGradientLine(normalized.direction, width, height);
  let drawnLayers = 0;

  layers.forEach((layer) => {
    if (layer.blur <= 0) return;

    const layerCanvas = ownerDocument.createElement('canvas');
    layerCanvas.width = width;
    layerCanvas.height = height;
    const layerCtx = layerCanvas.getContext('2d');

    layerCtx.filter = `blur(${layer.blur.toFixed(2)}px)`;
    layerCtx.drawImage(baseCanvas, 0, 0);
    layerCtx.filter = 'none';

    layerCtx.globalCompositeOperation = 'destination-in';
    const gradient = layerCtx.createLinearGradient(x0, y0, x1, y1);
    let previousStop = -0.00001;
    previousStop = addSafeColorStop(gradient, layer.stops[0], 'rgba(0,0,0,0)', previousStop);
    previousStop = addSafeColorStop(gradient, layer.stops[1], 'rgba(0,0,0,1)', previousStop);
    previousStop = addSafeColorStop(gradient, layer.stops[2], 'rgba(0,0,0,1)', previousStop);
    addSafeColorStop(gradient, layer.stops[3], 'rgba(0,0,0,0)', previousStop);

    layerCtx.fillStyle = gradient;
    layerCtx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(layerCanvas, 0, 0);
    drawnLayers += 1;
  });

  return { applied: drawnLayers > 0, layers: drawnLayers };
};
