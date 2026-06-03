import { TRANSITIONS } from '../engine/VideoEngine';

const DEFAULT_FILTERS = { brightness: 100, contrast: 100, saturation: 100, temperature: 0, vignette: 0, grain: 0 };

export const QUICK_TOOL_TRANSFER_TYPE = 'application/x-vibecut-tool';

export const QUICK_TOOL_GROUPS = [
    {
        id: 'effects',
        label: 'Effets',
        accent: 'cyan',
        tools: [
            {
                id: 'effect-cyberpunk',
                type: 'effect',
                label: 'Cyberpunk',
                detail: 'Contraste + neon',
                filters: { brightness: 95, contrast: 130, saturation: 130, temperature: -20, vignette: 25, grain: 5 },
            },
            {
                id: 'effect-soft-dream',
                type: 'effect',
                label: 'Soft Dream',
                detail: 'Glow propre',
                filters: { brightness: 108, contrast: 85, saturation: 90, temperature: 10, vignette: 5, grain: 0 },
            },
            {
                id: 'effect-mono-grain',
                type: 'effect',
                label: 'Mono Grain',
                detail: 'Noir/blanc texture',
                filters: { brightness: 100, contrast: 115, saturation: 0, temperature: 0, vignette: 20, grain: 15 },
            },
        ],
    },
    {
        id: 'text',
        label: 'Texte',
        accent: 'amber',
        tools: [
            {
                id: 'text-title',
                type: 'text',
                label: 'Titre',
                detail: 'Intro impact',
                text: { content: 'TITRE VIBE', fontSize: 72, bold: true, color: '#ffffff', animation: 'scale', animationOut: 'fade' },
            },
            {
                id: 'text-caption',
                type: 'text',
                label: 'Caption',
                detail: 'Sous-titre court',
                text: { content: 'Caption rapide', fontSize: 42, bold: true, color: '#f8fafc', y: 0.78, animation: 'slide-up', animationOut: 'fade' },
            },
            {
                id: 'text-label',
                type: 'text',
                label: 'Label',
                detail: 'Callout timeline',
                text: { content: 'CUT POINT', fontSize: 34, bold: true, color: '#fbbf24', x: 0.24, y: 0.22, animation: 'blur-in', animationOut: 'fade' },
            },
        ],
    },
    {
        id: 'animations',
        label: 'Animations',
        accent: 'purple',
        tools: [
            makeTransitionTool('flash', 'Flash', 'Impact lumineux'),
            makeTransitionTool('glitch', 'Glitch', 'Accident digital'),
            makeTransitionTool('slide-up', 'Slide Up', 'Mouvement vertical'),
            makeTransitionTool('cross-blur', 'Cross Blur', 'Flou de passage'),
            makeTransitionTool('whip-pan', 'Whip Pan', 'Passage rapide'),
            makeTransitionTool('scanline-sweep', 'Scanline', 'Balayage cyber'),
        ],
    },
    {
        id: 'volets',
        label: 'Volets',
        accent: 'purple',
        tools: [
            makeSequenceTool('intro-neon-doors', 'Intro portes', 'Ouverture neon + titre', 'intro', {
                content: 'NOUVEAU DROP',
                fontSize: 78,
                bold: true,
                color: '#f8f7ff',
                y: 0.5,
                animation: 'neon-scan',
                animationOut: 'fade',
            }),
            makeSequenceTool('intro-title-scan', 'Intro scan', 'Titre scanne au debut', 'intro', {
                content: 'VIBE START',
                fontSize: 72,
                bold: true,
                color: '#00e5ff',
                y: 0.46,
                animation: 'tracking-in',
                animationOut: 'wipe-out',
            }),
            makeSequenceTool('outro-neon-close', 'Outro close', 'Fermeture lumineuse', 'outro', {
                content: 'A SUIVRE',
                fontSize: 70,
                bold: true,
                color: '#f8f7ff',
                y: 0.5,
                animation: 'reveal-up',
                animationOut: 'glitch-out',
            }),
            makeSequenceTool('outro-signal-collapse', 'Outro signal', 'Collapse final', 'outro', {
                content: 'FIN DE SEQUENCE',
                fontSize: 58,
                bold: true,
                color: '#9b5cff',
                y: 0.48,
                animation: 'wipe-mask',
                animationOut: 'fade',
            }),
        ],
    },
];

export function getQuickToolById(toolId) {
    return QUICK_TOOL_GROUPS.flatMap(group => group.tools).find(tool => tool.id === toolId) || null;
}

export function getQuickToolPayload(tool) {
    return JSON.stringify({ id: tool.id, type: tool.type });
}

export function getQuickToolSequenceSlot(tool = {}) {
    if (tool.type !== 'sequence') return null;
    if (tool.placement === 'intro' || tool.placement === 'outro') return tool.placement;
    if (String(tool.transitionId || '').startsWith('intro-')) return 'intro';
    if (String(tool.transitionId || '').startsWith('outro-')) return 'outro';
    return null;
}

export function parseQuickToolPayload(rawPayload) {
    try {
        const payload = JSON.parse(rawPayload);
        return getQuickToolById(payload?.id);
    } catch {
        return null;
    }
}

export function applyQuickToolToTimeline(storeApi, tool, options = {}) {
    if (!storeApi?.getState || !tool) return false;

    const state = storeApi.getState();
    const startTime = clampTime(options.startTime ?? state.currentTime ?? 0, state.totalDuration);

    if (tool.type === 'transition') {
        if (!state.clips.length) {
            state.notifyTimelineEditRejected?.('quick-tool-no-video', 'Importez une video avant de placer une animation.');
            return false;
        }
        state.addTransitionItem({
            type: tool.transitionId,
            name: tool.label,
            icon: tool.icon,
            category: tool.category,
            duration: tool.duration,
            startTime,
        });
        clearSelection(storeApi, 'transition');
        storeApi.getState().setActivePanel?.('transitions');
        return true;
    }

    if (tool.type === 'sequence') {
        if (!state.clips.length) {
            state.notifyTimelineEditRejected?.('quick-tool-no-video', 'Importez une video avant de placer un volet.');
            return false;
        }
        const duration = Math.max(0.5, tool.duration || 1);
        const sequenceSlot = getQuickToolSequenceSlot(tool);
        const placementStart = resolveSequenceStart(sequenceSlot || tool.placement, startTime, duration, state.totalDuration);
        const linkedTextId = sequenceSlot ? `sequence-${sequenceSlot}-text` : null;
        if (sequenceSlot) {
            (state.textOverlays || [])
                .filter(text => text?.params?.sequenceSlot === sequenceSlot)
                .forEach(text => state.removeTextOverlay?.(text.id));
        }
        state.addTransitionItem({
            type: tool.transitionId,
            name: tool.label,
            icon: tool.icon,
            category: tool.category,
            duration,
            startTime: placementStart,
            params: sequenceSlot ? { placement: sequenceSlot, sequenceSlot, singleton: true, linkedTextId } : {},
        });
        if (tool.text) {
            state.addTextOverlay({
                ...tool.text,
                ...(linkedTextId ? { id: linkedTextId, params: { sequenceSlot } } : {}),
                startTime: placementStart,
                endTime: Math.max(placementStart + 0.5, Math.min(placementStart + duration, Math.max(state.totalDuration, placementStart + duration))),
            });
        }
        clearSelection(storeApi, 'transition');
        storeApi.getState().setActivePanel?.(null);
        return true;
    }

    if (tool.type === 'text') {
        const duration = Math.min(3, Math.max(0.8, state.totalDuration || 3));
        state.addTextOverlay({
            ...(tool.text || {}),
            startTime,
            endTime: Math.max(startTime + 0.5, Math.min(startTime + duration, Math.max(state.totalDuration, startTime + duration))),
        });
        clearSelection(storeApi, 'text');
        storeApi.getState().setActivePanel?.('text');
        return true;
    }

    if (tool.type === 'effect') {
        const targetClip = getTargetClipForEffect(state, startTime);
        if (!targetClip) {
            state.notifyTimelineEditRejected?.('quick-tool-no-clip', 'Selectionnez ou importez un clip avant d appliquer un effet.');
            return false;
        }
        state.updateClip(targetClip.id, {
            filters: {
                ...DEFAULT_FILTERS,
                ...(targetClip.filters || {}),
                ...(tool.filters || {}),
            },
        }, { history: true });
        clearSelection(storeApi, 'clip');
        storeApi.getState().setSelectedClipId?.(targetClip.id);
        storeApi.getState().setActivePanel?.('filters');
        return true;
    }

    return false;
}

function makeTransitionTool(transitionId, label, detail) {
    const transition = TRANSITIONS.find(item => item.id === transitionId) || TRANSITIONS[0];
    return {
        id: `animation-${transitionId}`,
        type: 'transition',
        label,
        detail,
        transitionId: transition.id,
        icon: transition.icon,
        category: transition.category,
        duration: transition.defaultDuration || 0.5,
    };
}

function makeSequenceTool(transitionId, label, detail, placement = 'current', text = {}) {
    const transition = TRANSITIONS.find(item => item.id === transitionId) || TRANSITIONS[0];
    return {
        id: `sequence-${transitionId}`,
        type: 'sequence',
        label,
        detail,
        placement,
        transitionId: transition.id,
        icon: transition.icon,
        category: transition.category,
        duration: transition.defaultDuration || 1,
        text,
    };
}

function resolveSequenceStart(placement = 'current', startTime = 0, duration = 1, totalDuration = 0) {
    if (placement === 'intro' || placement === 'start') return 0;
    if (placement === 'outro' || placement === 'end') return Math.max(0, (totalDuration || duration) - duration);
    return clampTime(startTime, Math.max(0, totalDuration - duration));
}

function clampTime(value, totalDuration = 0) {
    const numeric = Number.isFinite(Number(value)) ? Number(value) : 0;
    return Math.max(0, Math.min(Math.max(0, totalDuration || numeric), numeric));
}

function getTargetClipForEffect(state, startTime) {
    const selectedClip = state.clips.find(clip => clip.id === state.selectedClipId);
    if (selectedClip) return selectedClip;

    const videoItem = state.getTimelineModel?.().items
        ?.filter(item => item.type === 'video')
        ?.find(item => startTime >= item.start && startTime <= item.start + item.duration);

    return state.clips.find(clip => clip.id === videoItem?.sourceId) || state.clips[0] || null;
}

function clearSelection(storeApi, keep = '') {
    const nextState = storeApi.getState();
    if (keep !== 'clip') nextState.setSelectedClipId?.(null);
    if (keep !== 'text') nextState.setSelectedTextId?.(null);
    if (keep !== 'transition') nextState.setSelectedTransitionId?.(null);
    if (keep !== 'audio') nextState.setSelectedAudioTrackId?.(null);
}
