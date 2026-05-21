const VIEW_LABELS = Object.freeze({
  studio: 'Studio',
  fusion: 'Fusion',
  layout: 'Layout',
  library: 'Library',
  'vision-pro': 'Vision',
  video: 'Video',
});

export function createClientRequestId(actionId) {
  const randomId = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 10);
  return `${Date.now()}_${actionId}_${randomId}`;
}

export function getViewLabel(view) {
  return VIEW_LABELS[view] || view || 'Studio';
}

export function buildContextChips(context = {}) {
  const chips = [
    { id: 'view', label: getViewLabel(context.view), tone: 'info' },
  ];
  if (context.hasImage) chips.push({ id: 'image', label: 'Image source', tone: 'success' });
  else chips.push({ id: 'no-image', label: 'Aucune image', tone: 'warning' });
  if (context.activeFormat?.label) chips.push({ id: 'format', label: context.activeFormat.label, tone: 'neutral' });
  if (context.imageCount > 1) chips.push({ id: 'images', label: `${context.imageCount} images`, tone: 'neutral' });
  if (context.videoClipCount > 0) chips.push({ id: 'video', label: `${context.videoClipCount} clips`, tone: 'success' });
  if (context.canvasReady) chips.push({ id: 'canvas', label: 'Canvas', tone: 'success' });
  if (context.timelineReady) chips.push({ id: 'timeline', label: 'Timeline', tone: 'success' });
  return chips;
}

export function buildStudioAiPayload({ action, prompt, context, options }) {
  const feature = action.featureOverride || action.feature;
  return {
    feature,
    prompt: String(prompt || '').trim(),
    clientRequestId: createClientRequestId(action.id),
    context: {
      studioView: context?.view || 'studio',
      format: context?.activeFormat?.id || null,
      aspectRatio: context?.activeFormat?.ratio || null,
      imageCount: context?.imageCount || 0,
      durationSeconds: Number(options?.durationSeconds || 0) || null,
      outputIntent: action.intent,
      requestedFeature: action.feature,
      quality: options?.quality || action.quality || 'draft',
    },
  };
}

export function getPolicyLabel(action) {
  if (action.productionBlocked) return 'Dry-run policy';
  if (action.featureOverride) return `${action.featureOverride} mock`;
  return action.feature;
}

