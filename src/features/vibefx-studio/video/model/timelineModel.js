const DEFAULT_TRACKS = [
    { id: 'video-main', type: 'video', name: 'Video', locked: false, muted: false, visible: true, order: 10 },
    { id: 'transition-main', type: 'transition', name: 'Effets', locked: false, muted: false, visible: true, order: 20 },
    { id: 'text-main', type: 'text', name: 'Texte', locked: false, muted: false, visible: true, order: 30 },
    { id: 'audio-main', type: 'audio', name: 'Audio clips', locked: false, muted: false, visible: true, order: 40 },
    { id: 'music-main', type: 'audio', name: 'Musique', locked: false, muted: false, visible: true, order: 50 },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finiteNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
export const DEFAULT_SNAP_THRESHOLD_SECONDS = 0.08;

export function clampVolumePercent(volume = 100) {
    return clamp(finiteNumber(volume, 100), 0, 100);
}

export function getDefaultTracks() {
    return DEFAULT_TRACKS.map(track => ({ ...track }));
}

export function getTrackById(tracks = [], id) {
    return tracks.find(track => track.id === id) || DEFAULT_TRACKS.find(track => track.id === id) || null;
}

export function isTrackVisible(tracks = [], id) {
    return getTrackById(tracks, id)?.visible !== false;
}

export function isTrackMuted(tracks = [], id) {
    return getTrackById(tracks, id)?.muted === true;
}

export function isTrackLocked(tracks = [], id) {
    return getTrackById(tracks, id)?.locked === true;
}

export function getTrackForItemType(type) {
    if (type === 'transition') return 'transition-main';
    if (type === 'text') return 'text-main';
    if (type === 'audio') return 'music-main';
    if (type === 'effect') return 'transition-main';
    return 'video-main';
}

export function normalizeTransitionItem(item = {}, totalDuration = 0) {
    const start = finiteNumber(item.start ?? item.startTime, 0);
    const rawDuration = finiteNumber(item.duration ?? ((item.endTime ?? 0) - start), 0.5);
    const duration = clamp(rawDuration, 0.1, Math.max(0.1, totalDuration || rawDuration || 0.1));
    const maxStart = Math.max(0, (totalDuration || start + duration) - duration);
    const normalizedStart = clamp(start, 0, maxStart);

    return {
        id: item.id,
        type: item.type || 'fade',
        start: normalizedStart,
        duration,
        fromItemId: item.fromItemId || null,
        toItemId: item.toItemId || null,
        trackId: item.trackId || getTrackForItemType('transition'),
        params: item.params || {},
        name: item.name || item.type || 'Transition',
        icon: item.icon || '*',
        category: item.category || 'basic',
        source: item,
    };
}

export function normalizeTransitionItems(transitionItems = [], totalDuration = 0) {
    return transitionItems
        .filter(item => item?.id && item?.type)
        .map(item => normalizeTransitionItem(item, totalDuration))
        .sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
}

export function resolveTimelineTransitions({ clips = [], transitions = {}, transitionItems = [], totalDuration = 0 } = {}) {
    const resolved = [];
    let cursor = 0;

    clips.forEach((clip, index) => {
        const speed = finiteNumber(clip.speed, 1) || 1;
        const trimStart = finiteNumber(clip.trimStart, 0);
        const trimEnd = finiteNumber(clip.trimEnd, clip.duration || 0);
        const duration = Math.max(0, (trimEnd - trimStart) / speed);
        const nextClip = clips[index + 1];
        const key = nextClip ? `${clip.id}->${nextClip.id}` : '';
        const transition = key ? transitions[key] : null;
        const transitionDuration = transition ? Math.max(0.1, finiteNumber(transition.duration, 0.5)) : 0;

        if (transition && nextClip) {
            resolved.push(normalizeTransitionItem({
                id: transition.id || `cut-${clip.id}-${nextClip.id}`,
                type: transition.type || 'crossfade',
                start: cursor + Math.max(0, duration - transitionDuration),
                duration: transitionDuration,
                fromItemId: clip.id,
                toItemId: nextClip.id,
                trackId: transition.trackId || getTrackForItemType('transition'),
                params: {
                    ...(transition.params || {}),
                    legacyKey: key,
                    placement: 'cut',
                },
                name: transition.name || transition.type || 'Transition',
                icon: transition.icon || '*',
                category: transition.category || 'basic',
            }, totalDuration));
        }

        cursor += duration - transitionDuration;
    });

    normalizeTransitionItems(transitionItems, totalDuration).forEach((item) => {
        resolved.push({
            ...item,
            params: {
                ...(item.params || {}),
                placement: item.params?.placement || 'free',
            },
        });
    });

    return resolved.sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
}

export function resolveActiveTransition(transitionItems = [], globalTime = 0, totalDuration = 0) {
    const time = finiteNumber(globalTime, 0);
    return normalizeTransitionItems(transitionItems, totalDuration)
        .filter(item => time >= item.start && time <= item.start + item.duration)
        .at(-1) || null;
}

export function buildTimelineSnapPoints({
    clips = [],
    transitions = {},
    totalDuration = 0,
    currentTime = 0,
} = {}) {
    const points = new Map();
    const addPoint = (time, type = 'marker', label = '') => {
        const normalized = finiteNumber(time, 0);
        if (normalized < -0.001 || normalized > totalDuration + 0.001) return;
        const key = normalized.toFixed(3);
        if (!points.has(key)) {
            points.set(key, {
                time: Math.max(0, Math.min(totalDuration, normalized)),
                type,
                label: label || `${normalized.toFixed(2)}s`,
            });
        }
    };

    addPoint(0, 'start', 'Timeline start');
    if (totalDuration > 0) addPoint(totalDuration, 'end', 'Timeline end');
    if (currentTime > 0 && currentTime < totalDuration) addPoint(currentTime, 'playhead', 'Playhead');

    let cursor = 0;
    clips.forEach((clip, index) => {
        const speed = finiteNumber(clip.speed, 1) || 1;
        const trimStart = finiteNumber(clip.trimStart, 0);
        const trimEnd = finiteNumber(clip.trimEnd, clip.duration || 0);
        const duration = Math.max(0, (trimEnd - trimStart) / speed);
        const clipLabel = clip.name || `Clip ${index + 1}`;

        addPoint(cursor, 'clip-start', `${clipLabel} in`);
        addPoint(cursor + duration, 'clip-end', `${clipLabel} out`);

        const nextClip = clips[index + 1];
        const transition = nextClip ? transitions[`${clip.id}->${nextClip.id}`] : null;
        cursor += duration - (transition ? finiteNumber(transition.duration, 0) : 0);
    });

    for (let second = 1; second < totalDuration; second += 1) {
        addPoint(second, 'second', `${second}s`);
    }

    return [...points.values()].sort((a, b) => a.time - b.time);
}

export function snapTimeToPoints(time, points = [], threshold = DEFAULT_SNAP_THRESHOLD_SECONDS) {
    const normalized = finiteNumber(time, 0);
    let best = null;

    points.forEach((point) => {
        const distance = Math.abs(point.time - normalized);
        if (distance > threshold) return;
        if (!best || distance < best.distance) {
            best = { ...point, distance };
        }
    });

    if (!best) {
        return { time: normalized, snapped: false, point: null, delta: 0 };
    }

    return {
        time: best.time,
        snapped: true,
        point: best,
        delta: best.time - normalized,
    };
}

export function snapTimelineRange({
    start = 0,
    end = 0,
    mode = 'move',
    points = [],
    threshold = DEFAULT_SNAP_THRESHOLD_SECONDS,
    totalDuration = 0,
    minDuration = 0.1,
} = {}) {
    const safeStart = finiteNumber(start, 0);
    const safeEnd = Math.max(safeStart + minDuration, finiteNumber(end, safeStart + minDuration));
    const maxEnd = Math.max(minDuration, totalDuration || safeEnd);
    const duration = Math.max(minDuration, safeEnd - safeStart);

    if (mode === 'resize-left') {
        const snapped = snapTimeToPoints(safeStart, points, threshold);
        const nextStart = clamp(snapped.time, 0, safeEnd - minDuration);
        return { start: nextStart, end: safeEnd, snap: snapped.snapped ? snapped : null };
    }

    if (mode === 'resize-right') {
        const snapped = snapTimeToPoints(safeEnd, points, threshold);
        const nextEnd = clamp(snapped.time, safeStart + minDuration, maxEnd);
        return { start: safeStart, end: nextEnd, snap: snapped.snapped ? snapped : null };
    }

    const snappedStart = snapTimeToPoints(safeStart, points, threshold);
    const snappedEnd = snapTimeToPoints(safeEnd, points, threshold);
    const chosen = snappedStart.snapped && snappedEnd.snapped
        ? (snappedStart.distance <= snappedEnd.distance ? snappedStart : snappedEnd)
        : (snappedStart.snapped ? snappedStart : snappedEnd);
    const delta = chosen.snapped ? chosen.delta : 0;
    const nextStart = clamp(safeStart + delta, 0, Math.max(0, maxEnd - duration));

    return {
        start: nextStart,
        end: nextStart + duration,
        snap: chosen.snapped ? chosen : null,
    };
}

export function buildTimelineModel({
    clips = [],
    transitions = {},
    transitionItems = [],
    textOverlays = [],
    audioTracks = [],
    tracks = getDefaultTracks(),
    totalDuration = 0,
} = {}) {
    const normalizedTracks = tracks.length ? tracks.map(track => ({
        locked: false,
        muted: false,
        visible: true,
        order: 0,
        ...track,
    })) : getDefaultTracks();

    const items = [];
    let cursor = 0;

    clips.forEach((clip, index) => {
        const speed = finiteNumber(clip.speed, 1) || 1;
        const trimStart = finiteNumber(clip.trimStart, 0);
        const trimEnd = finiteNumber(clip.trimEnd, clip.duration || 0);
        const duration = Math.max(0, (trimEnd - trimStart) / speed);

        items.push({
            id: clip.id,
            trackId: clip.trackId || 'video-main',
            type: 'video',
            sourceId: clip.id,
            start: cursor,
            duration,
            trimStart,
            trimEnd,
            zIndex: index,
            params: { speed, volume: clampVolumePercent(clip.volume), filters: clip.filters || {} },
            source: clip,
        });

        const nextClip = clips[index + 1];
        const transition = nextClip ? transitions[`${clip.id}->${nextClip.id}`] : null;
        cursor += duration - (transition ? finiteNumber(transition.duration, 0) : 0);
    });

    resolveTimelineTransitions({ clips, transitions, transitionItems, totalDuration }).forEach(item => {
        const placement = item.params?.placement || 'free';
        items.push({
            id: item.id,
            trackId: item.trackId,
            type: 'transition',
            sourceId: item.id,
            start: item.start,
            duration: item.duration,
            trimStart: 0,
            trimEnd: item.duration,
            zIndex: 0,
            params: {
                transitionType: item.type,
                fromItemId: item.fromItemId,
                toItemId: item.toItemId,
                editable: placement !== 'cut',
                ...item.params,
            },
            source: item.source,
        });
    });

    textOverlays.forEach((text, index) => {
        const start = finiteNumber(text.startTime, 0);
        const end = finiteNumber(text.endTime, start + 0.1);
        items.push({
            id: text.id,
            trackId: text.trackId || 'text-main',
            type: 'text',
            sourceId: text.id,
            start,
            duration: Math.max(0.1, end - start),
            trimStart: 0,
            trimEnd: Math.max(0.1, end - start),
            zIndex: index,
            params: { content: text.content, x: text.x, y: text.y },
            source: text,
        });
    });

    audioTracks.forEach((track, index) => {
        const start = finiteNumber(track.startTime, 0);
        const end = finiteNumber(track.endTime, start + finiteNumber(track.duration, 0.1));
        items.push({
            id: track.id,
            trackId: track.trackId || 'music-main',
            type: 'audio',
            sourceId: track.id,
            start,
            duration: Math.max(0.1, end - start),
            trimStart: 0,
            trimEnd: Math.max(0.1, end - start),
            zIndex: index,
            params: { volume: clampVolumePercent(track.volume), rightsStatus: track.rightsStatus },
            source: track,
        });
    });

    return {
        tracks: normalizedTracks.sort((a, b) => a.order - b.order),
        items: items.sort((a, b) => a.start - b.start || a.zIndex - b.zIndex),
    };
}

function timelineItemToRenderSource(item) {
    const source = item.source || {};
    const startTime = item.start;
    const endTime = item.start + item.duration;
    return {
        ...source,
        id: item.id,
        trackId: item.trackId,
        type: item.type,
        mediaType: source.type,
        start: startTime,
        startTime,
        endTime,
        duration: item.duration,
        trimStart: item.trimStart,
        trimEnd: item.trimEnd,
        zIndex: item.zIndex,
        volume: item.params?.volume ?? source.volume,
        params: item.params || {},
    };
}

export function resolveTimelineRenderPlan({
    clips = [],
    transitions = {},
    transitionItems = [],
    textOverlays = [],
    audioTracks = [],
    tracks = getDefaultTracks(),
    totalDuration = 0,
} = {}) {
    const model = buildTimelineModel({
        clips,
        transitions,
        transitionItems,
        textOverlays,
        audioTracks,
        tracks,
        totalDuration,
    });
    const itemsForTrack = (type, trackId) => (
        model.items
            .filter(item => item.type === type && item.trackId === trackId)
            .map(timelineItemToRenderSource)
    );
    const videoClips = isTrackVisible(tracks, 'video-main') ? itemsForTrack('video', 'video-main') : [];
    const timelineTransitions = isTrackVisible(tracks, 'transition-main') ? itemsForTrack('transition', 'transition-main') : [];
    const editableTimelineTransitions = timelineTransitions.filter(item => item.params?.placement !== 'cut');
    const textItems = isTrackVisible(tracks, 'text-main') ? itemsForTrack('text', 'text-main') : [];
    const musicItems = isTrackVisible(tracks, 'music-main') && !isTrackMuted(tracks, 'music-main')
        ? itemsForTrack('audio', 'music-main')
        : [];
    const allTransitions = isTrackVisible(tracks, 'transition-main')
        ? resolveTimelineTransitions({ clips, transitions, transitionItems, totalDuration })
        : [];
    const playbackClips = isTrackMuted(tracks, 'audio-main')
        ? videoClips.map(clip => ({ ...clip, volume: 0 }))
        : videoClips;

    return {
        model,
        clips: videoClips,
        playbackClips,
        transitions,
        transitionItems: editableTimelineTransitions,
        allTransitions,
        textOverlays: textItems,
        audioTracks: musicItems,
        hasVisibleVideo: videoClips.length > 0,
        hasVisibleContent: videoClips.length > 0 || textItems.length > 0,
    };
}

function getItemEnd(item = {}) {
    const start = finiteNumber(item.start ?? item.startTime, 0);
    const duration = finiteNumber(item.duration ?? ((item.endTime ?? 0) - start), 0);
    return start + duration;
}

function hasClipAtTime(clips = [], time = 0) {
    return clips.some((clip) => {
        const start = finiteNumber(clip.start ?? clip.startTime, 0);
        const end = getItemEnd(clip);
        return time >= start - 0.001 && time <= end + 0.001;
    });
}

export function findTimelineItemOverlap(items = [], { tolerance = 0.001 } = {}) {
    const ranges = items
        .map((item) => {
            const start = finiteNumber(item.start ?? item.startTime, 0);
            const duration = finiteNumber(item.duration ?? ((item.endTime ?? 0) - start), 0);
            return {
                id: item.id,
                trackId: item.trackId || getTrackForItemType(item.type),
                start,
                end: start + duration,
                item,
            };
        })
        .filter(range => range.id && range.trackId && range.end > range.start)
        .sort((a, b) => a.trackId.localeCompare(b.trackId) || a.start - b.start || a.end - b.end);

    for (let index = 0; index < ranges.length - 1; index += 1) {
        const current = ranges[index];
        const next = ranges[index + 1];
        if (current.trackId !== next.trackId) continue;
        if (next.start < current.end - tolerance) {
            return {
                trackId: current.trackId,
                current: current.item,
                next: next.item,
                overlap: current.end - next.start,
            };
        }
    }

    return null;
}

export function findTransitionItemOverlap(transitionItems = [], totalDuration = 0, options = {}) {
    const editableTransitions = normalizeTransitionItems(transitionItems, totalDuration)
        .filter(item => item.params?.placement !== 'cut');
    return findTimelineItemOverlap(editableTransitions, options);
}

export function validateTimelineRenderPlan({ plan = null, totalDuration = 0, frameDuration = 1 / 30 } = {}) {
    const errors = [];
    const warnings = [];
    const duration = finiteNumber(totalDuration, 0);
    const tolerance = Math.max(0.001, finiteNumber(frameDuration, 1 / 30) * 0.5);
    const clips = [...(plan?.clips || [])].sort((a, b) => (
        finiteNumber(a.start ?? a.startTime, 0) - finiteNumber(b.start ?? b.startTime, 0)
    ));
    const transitions = plan?.transitions || {};

    if (!clips.length) {
        errors.push('Aucun clip video visible: export noir probable.');
    }

    clips.forEach((clip, index) => {
        const label = clip.name || clip.id || `clip-${index + 1}`;
        const start = finiteNumber(clip.start ?? clip.startTime, NaN);
        const itemDuration = finiteNumber(clip.duration, NaN);
        const end = start + itemDuration;
        const trimStart = finiteNumber(clip.trimStart, 0);
        const trimEnd = finiteNumber(clip.trimEnd, trimStart);

        if (!clip.url) errors.push(`Clip video sans URL: ${label}.`);
        if (!Number.isFinite(start) || start < -tolerance) errors.push(`Start video invalide: ${label}.`);
        if (!Number.isFinite(itemDuration) || itemDuration <= 0) errors.push(`Duree video invalide: ${label}.`);
        if (trimEnd <= trimStart) errors.push(`Trim video invalide: ${label}.`);
        if (duration > 0 && start >= duration - tolerance) errors.push(`Clip video hors timeline: ${label}.`);
        if (duration > 0 && end > duration + tolerance) warnings.push(`Clip video coupe par la duree timeline: ${label}.`);
    });

    if (clips.length > 0) {
        const firstStart = finiteNumber(clips[0].start ?? clips[0].startTime, 0);
        if (firstStart > tolerance) errors.push(`Trou video avant le premier clip: ${firstStart.toFixed(2)}s.`);

        for (let index = 0; index < clips.length - 1; index += 1) {
            const current = clips[index];
            const next = clips[index + 1];
            const currentEnd = getItemEnd(current);
            const nextStart = finiteNumber(next.start ?? next.startTime, 0);
            const gap = nextStart - currentEnd;
            const overlap = currentEnd - nextStart;
            const transition = transitions[`${current.id}->${next.id}`];
            const transitionDuration = finiteNumber(transition?.duration, 0);

            if (gap > tolerance) {
                errors.push(`Trou video entre ${current.name || current.id} et ${next.name || next.id}: ${gap.toFixed(2)}s.`);
            }
            if (overlap > tolerance && overlap > transitionDuration + tolerance) {
                errors.push(`Overlap video non couvert entre ${current.name || current.id} et ${next.name || next.id}: ${overlap.toFixed(2)}s.`);
            }
            if (transition && Math.abs(overlap - transitionDuration) > Math.max(0.05, tolerance * 2)) {
                warnings.push(`Overlap transition different de sa duree entre ${current.name || current.id} et ${next.name || next.id}.`);
            }
        }
    }

    const editableTransitionOverlap = findTransitionItemOverlap(plan?.transitionItems || [], duration, { tolerance });
    if (editableTransitionOverlap) {
        const first = editableTransitionOverlap.current?.name || editableTransitionOverlap.current?.id || 'transition';
        const second = editableTransitionOverlap.next?.name || editableTransitionOverlap.next?.id || 'transition';
        errors.push(`Overlap transition sur ${editableTransitionOverlap.trackId}: ${first} / ${second}.`);
    }

    (plan?.allTransitions || plan?.transitionItems || []).forEach((transition) => {
        const start = finiteNumber(transition.start ?? transition.startTime, 0);
        const durationValue = finiteNumber(transition.duration ?? ((transition.endTime ?? 0) - start), 0);
        const end = start + durationValue;
        const label = transition.name || transition.id || transition.type || 'transition';
        if (durationValue <= 0) errors.push(`Duree transition invalide: ${label}.`);
        if (start < -tolerance || end > duration + tolerance) errors.push(`Transition hors timeline: ${label}.`);
        if (clips.length > 0 && !hasClipAtTime(clips, start + durationValue / 2)) {
            warnings.push(`Transition sans clip actif a son timestamp: ${label}.`);
        }
    });

    (plan?.audioTracks || []).forEach((track) => {
        const start = finiteNumber(track.start ?? track.startTime, 0);
        const end = getItemEnd(track);
        const label = track.name || track.id || 'audio';
        if (!track.url) errors.push(`Piste audio sans URL: ${label}.`);
        if (end <= start) errors.push(`Duree audio invalide: ${label}.`);
        if (duration > 0 && start >= duration - tolerance) errors.push(`Piste audio hors timeline: ${label}.`);
        if (duration > 0 && end > duration + tolerance) warnings.push(`Piste audio tronquee a l'export: ${label}.`);
    });

    return { errors, warnings };
}

export function buildExportFrameSchedule({ totalDuration = 0, fps = 30 } = {}) {
    const duration = finiteNumber(totalDuration, 0);
    const normalizedFps = finiteNumber(fps, 0);
    const frameDuration = normalizedFps > 0 ? 1 / normalizedFps : 0;
    const rawFrames = duration > 0 && normalizedFps > 0
        ? Math.ceil(Math.max(0, duration * normalizedFps - 1e-9))
        : 0;
    const totalFrames = rawFrames > 0 ? Math.max(1, rawFrames) : 0;
    const lastFrameTime = totalFrames > 0 ? Math.min(duration, (totalFrames - 1) * frameDuration) : 0;

    return {
        totalDuration: duration,
        fps: normalizedFps,
        frameDuration,
        totalFrames,
        expectedDuration: totalFrames * frameDuration,
        lastFrameTime,
    };
}

export function validateExportTimeline({ clips = [], audioTracks = [], transitionItems = [], totalDuration = 0, fps = 30, mimeType = '' } = {}) {
    const errors = [];
    const warnings = [];
    const normalizedFps = finiteNumber(fps, 0);
    const normalizedDuration = finiteNumber(totalDuration, 0);
    const frameSchedule = buildExportFrameSchedule({ totalDuration, fps });

    if (!clips.length) errors.push('Ajoutez au moins un clip video avant export.');
    if (!normalizedDuration || normalizedDuration <= 0) errors.push('La duree de timeline est invalide.');
    if (!normalizedFps || normalizedFps < 12 || normalizedFps > 60) errors.push(`FPS invalide: ${fps}.`);
    if (!mimeType) errors.push('Aucun codec MediaRecorder compatible trouve.');
    if (normalizedDuration > 0 && normalizedFps > 0 && frameSchedule.totalFrames <= 0) errors.push('Plan de frames export invalide.');
    if (frameSchedule.totalFrames > 36_000) warnings.push('Export navigateur long: risque memoire/performance eleve.');

    clips.forEach((clip) => {
        const speed = finiteNumber(clip.speed, 1);
        const trimStart = finiteNumber(clip.trimStart, 0);
        const trimEnd = finiteNumber(clip.trimEnd, clip.duration || 0);
        const volume = finiteNumber(clip.volume, 100);
        if (speed <= 0 || speed > 4) errors.push(`Vitesse invalide sur ${clip.name || clip.id}.`);
        if (trimEnd <= trimStart) errors.push(`Trim invalide sur ${clip.name || clip.id}.`);
        if (volume < 0 || volume > 100) warnings.push(`Volume clip borne automatiquement: ${clip.name || clip.id}.`);
    });

    audioTracks.forEach((track) => {
        const start = finiteNumber(track.startTime, 0);
        const end = finiteNumber(track.endTime, start + finiteNumber(track.duration, 0));
        const volume = finiteNumber(track.volume, 100);
        if (!track.url) errors.push(`Piste audio sans URL: ${track.name || track.id}.`);
        if (end <= start) errors.push(`Duree audio invalide: ${track.name || track.id}.`);
        if (volume < 0 || volume > 100) warnings.push(`Volume audio borne automatiquement: ${track.name || track.id}.`);
    });

    normalizeTransitionItems(transitionItems, normalizedDuration).forEach((transition) => {
        if (transition.start + transition.duration > normalizedDuration + 0.001) {
            errors.push(`Transition hors timeline: ${transition.name}.`);
        }
    });

    return { errors, warnings };
}
