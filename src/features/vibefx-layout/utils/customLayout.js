const MIN_ZONE_SIZE = 0.08;
const DEFAULT_GAP = 0.02;
const GRID_STEP = 0.02;
const MIN_AREA_RETENTION = 0.45;
const SAME_ROW_OVERLAP_RATIO = 0.6;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const clampCustomZone = (zone) => {
  const w = clamp(Number(zone.w) || MIN_ZONE_SIZE, MIN_ZONE_SIZE, 1);
  const h = clamp(Number(zone.h) || MIN_ZONE_SIZE, MIN_ZONE_SIZE, 1);
  return {
    ...zone,
    w,
    h,
    x: clamp(Number(zone.x) || 0, 0, 1 - w),
    y: clamp(Number(zone.y) || 0, 0, 1 - h),
  };
};

const zonesOverlap = (a, b, gap = DEFAULT_GAP / 2) => (
  a.x < b.x + b.w + gap
  && a.x + a.w + gap > b.x
  && a.y < b.y + b.h + gap
  && a.y + a.h + gap > b.y
);

const overlapsAnyZone = (zone, placedZones) => (
  placedZones.some((placedZone) => zonesOverlap(zone, placedZone, 0))
);

const scorePlacement = (candidate, original) => {
  const distance = Math.abs(candidate.x - original.x) + Math.abs(candidate.y - original.y);
  const areaLoss = Math.max(0, (original.w * original.h) - (candidate.w * candidate.h));
  return distance + (areaLoss * 1.4);
};

const getVerticalOverlapRatio = (a, b) => {
  const overlap = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return overlap / Math.min(a.h, b.h);
};

const isSameRowNeighbor = (zone, activeZone) => (
  activeZone
  && getVerticalOverlapRatio(zone, activeZone) >= SAME_ROW_OVERLAP_RATIO
);

const hasUsefulArea = (candidate, original) => (
  (candidate.w * candidate.h) >= (original.w * original.h * MIN_AREA_RETENTION)
);

const buildPlacementCandidates = (zone, activeZone) => {
  const baseZone = clampCustomZone(zone);
  const candidates = [baseZone];
  const sameRowNeighbor = isSameRowNeighbor(baseZone, activeZone);

  if (activeZone) {
    const rightX = activeZone.x + activeZone.w + DEFAULT_GAP;
    const rightW = 1 - rightX;
    if (rightW >= MIN_ZONE_SIZE) {
      candidates.push(clampCustomZone({
        ...zone,
        x: rightX,
        y: baseZone.y,
        w: Math.min(baseZone.w, rightW),
      }));
    }

    const leftW = activeZone.x - DEFAULT_GAP;
    if (leftW >= MIN_ZONE_SIZE) {
      const w = Math.min(baseZone.w, leftW);
      candidates.push(clampCustomZone({
        ...zone,
        x: Math.max(0, activeZone.x - DEFAULT_GAP - w),
        y: baseZone.y,
        w,
      }));
    }

    if (sameRowNeighbor) {
      return candidates;
    }

    const belowY = activeZone.y + activeZone.h + DEFAULT_GAP;
    const belowH = 1 - belowY;
    if (belowH >= MIN_ZONE_SIZE) {
      candidates.push(clampCustomZone({
        ...zone,
        x: baseZone.x,
        y: belowY,
        h: Math.min(baseZone.h, belowH),
      }));
    }

    const aboveH = activeZone.y - DEFAULT_GAP;
    if (aboveH >= MIN_ZONE_SIZE) {
      const h = Math.min(baseZone.h, aboveH);
      candidates.push(clampCustomZone({
        ...zone,
        x: baseZone.x,
        y: Math.max(0, activeZone.y - DEFAULT_GAP - h),
        h,
      }));
    }
  }

  for (let y = 0; y <= 1 - baseZone.h + 0.001; y += GRID_STEP) {
    for (let x = 0; x <= 1 - baseZone.w + 0.001; x += GRID_STEP) {
      candidates.push(clampCustomZone({ ...zone, x, y, w: baseZone.w, h: baseZone.h }));
    }
  }

  return candidates;
};

const findBestPlacement = (zone, placedZones, activeZone) => {
  const original = clampCustomZone(zone);
  const validCandidates = buildPlacementCandidates(zone, activeZone)
    .filter((candidate) => hasUsefulArea(candidate, original))
    .filter((candidate) => !overlapsAnyZone(candidate, placedZones))
    .sort((a, b) => scorePlacement(a, original) - scorePlacement(b, original));

  return validCandidates[0] || null;
};

export const normalizeCustomZones = (zones, activeZoneId = null) => {
  const normalized = (zones || []).map(clampCustomZone);
  const activeZone = normalized.find((zone) => zone.id === activeZoneId);
  if (!activeZone) return normalized;

  const placedZones = [activeZone];
  normalized
    .filter((zone) => zone.id !== activeZoneId)
    .forEach((zone) => {
      const placedZone = findBestPlacement(zone, placedZones, activeZone);
      if (placedZone) placedZones.push(placedZone);
    });

  const placedById = new Map(placedZones.map((zone) => [zone.id, zone]));
  return normalized
    .map((zone) => placedById.get(zone.id))
    .filter(Boolean);
};

export const createCustomZone = (shape, index, position = null) => {
  const w = clamp(Number(shape?.w) || 0.24, MIN_ZONE_SIZE, 1);
  const h = clamp(Number(shape?.h) || 0.2, MIN_ZONE_SIZE, 1);
  const x = clamp(position?.x ?? 0.5 - (w / 2), 0, 1 - w);
  const y = clamp(position?.y ?? 0.5 - (h / 2), 0, 1 - h);
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    id: `custom-${shape?.id || 'zone'}-${suffix}`,
    label: shape?.label || `Zone ${index + 1}`,
    x,
    y,
    w,
    h,
    imageIndex: index,
  };
};

export const updateCustomTemplateZones = (template, zones) => ({
  ...template,
  slots: zones.length,
  customLayout: {
    version: template.customLayout?.version || 1,
    presetId: template.customLayout?.presetId || 'manual',
    ...template.customLayout,
    zones,
  },
});
