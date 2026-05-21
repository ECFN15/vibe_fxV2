import { useCallback, useMemo, useState } from 'react';
import { buildStudioAiPayload } from './studioAiPayloads';
import { createStudioAiJob, getStudioAiRuntimeState } from './studioAiClient';

const INITIAL_TRACE = Object.freeze([
  { id: 'draft', label: 'Draft', status: 'current' },
  { id: 'estimate', label: 'Estimate', status: 'pending' },
  { id: 'queued', label: 'Queued', status: 'pending' },
  { id: 'running', label: 'Running', status: 'pending' },
  { id: 'succeeded', label: 'Succeeded', status: 'pending' },
  { id: 'failed', label: 'Failed', status: 'pending' },
  { id: 'refunded', label: 'Refunded', status: 'pending' },
]);

function markTrace(status) {
  const order = INITIAL_TRACE.map(step => step.id);
  const activeIndex = order.indexOf(status);
  return INITIAL_TRACE.map((step, index) => {
    if (step.id === status) return { ...step, status: 'current' };
    if (activeIndex > index && !['failed', 'refunded'].includes(step.id)) return { ...step, status: 'done' };
    return { ...step, status: 'pending' };
  });
}

function normalizeAiJobError(error, action) {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '');
  if (code.includes('insufficient') || /insufficient|credit/i.test(message)) {
    return 'Credits insuffisants. Aucun job media ne demarre sans reserve serveur.';
  }
  if (code.includes('permission') || /policy|disabled|productionallowed/i.test(message)) {
    return action?.productionBlocked
      ? 'Provider bloque par policy productionAllowed=false. Aucun appel media reel n est lance.'
      : 'Policy IA desactivee cote serveur pour cette feature.';
  }
  if (code.includes('app-check')) {
    return 'App Check requis en production. Relance apres verification de l environnement.';
  }
  return message || 'Job IA impossible. Si des credits ont ete reserves, la release serveur les rendra disponibles.';
}

export function useStudioAiState({ context, onJobComplete }) {
  const [prompt, setPrompt] = useState('');
  const [selectedAction, setSelectedAction] = useState(null);
  const [quality, setQuality] = useState('draft');
  const [durationSeconds, setDurationSeconds] = useState(8);
  const [job, setJob] = useState({
    status: 'draft',
    trace: markTrace('draft'),
    error: '',
    output: null,
    meta: null,
  });

  const runtime = useMemo(() => getStudioAiRuntimeState(), []);

  const selectAction = useCallback((action) => {
    setSelectedAction(action);
    setPrompt(action.examplePrompt || '');
    setJob({
      status: 'draft',
      trace: markTrace('draft'),
      error: '',
      output: null,
      meta: null,
    });
  }, []);

  const runAction = useCallback(async () => {
    const action = selectedAction;
    const cleanPrompt = prompt.trim();
    if (!action) {
      setJob(current => ({ ...current, status: 'failed', trace: markTrace('failed'), error: 'Choisis une action IA.' }));
      return null;
    }
    if (!cleanPrompt) {
      setJob(current => ({ ...current, status: 'failed', trace: markTrace('failed'), error: 'Prompt requis.' }));
      return null;
    }
    if (action.requiresImage && !context?.hasImage) {
      setJob(current => ({ ...current, status: 'failed', trace: markTrace('failed'), error: 'Image source requise pour cette action.' }));
      return null;
    }
    if (action.requiresVideo && !context?.hasVideo) {
      setJob(current => ({ ...current, status: 'failed', trace: markTrace('failed'), error: 'Video source requise pour cette action.' }));
      return null;
    }

    const payload = buildStudioAiPayload({
      action,
      prompt: cleanPrompt,
      context,
      options: { quality, durationSeconds },
    });

    setJob({
      status: 'estimate',
      trace: markTrace('estimate'),
      error: '',
      output: null,
      meta: { feature: payload.feature, requestedFeature: action.feature },
    });

    try {
      setJob(current => ({ ...current, status: 'queued', trace: markTrace('queued') }));
      setJob(current => ({ ...current, status: 'running', trace: markTrace('running') }));
      const result = await createStudioAiJob(payload);
      const nextJob = {
        status: result?.status || 'succeeded',
        trace: markTrace(result?.status || 'succeeded'),
        error: '',
        output: result?.output || null,
        meta: {
          jobId: result?.jobId || null,
          creditsCharged: result?.creditsCharged || action.credits,
          provider: result?.provider || 'policy',
          model: result?.model || 'server-selected',
          feature: payload.feature,
          requestedFeature: action.feature,
        },
      };
      setJob(nextJob);
      onJobComplete?.({ action, result, payload });
      return result;
    } catch (error) {
      const message = normalizeAiJobError(error, action);
      const failedJob = {
        status: 'failed',
        trace: markTrace('failed'),
        error: message,
        output: null,
        meta: {
          feature: payload.feature,
          requestedFeature: action.feature,
          provider: action.productionBlocked ? 'blocked-by-policy' : 'server-selected',
          model: action.productionBlocked ? 'productionAllowed=false' : 'policy',
          creditsCharged: action.credits,
        },
      };
      setJob(failedJob);
      return null;
    }
  }, [context, durationSeconds, onJobComplete, prompt, quality, selectedAction]);

  return {
    prompt,
    setPrompt,
    selectedAction,
    selectAction,
    quality,
    setQuality,
    durationSeconds,
    setDurationSeconds,
    job,
    runAction,
    runtime,
  };
}
