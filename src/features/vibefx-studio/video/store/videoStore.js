import { create } from 'zustand';
import { buildTimelineModel, clampVolumePercent, findTransitionItemOverlap, getDefaultTracks, getTrackForItemType, isTrackLocked as isTimelineTrackLocked } from '../model/timelineModel';

const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Snapshot keys for undo/redo
const SNAPSHOT_KEYS = ['clips', 'transitions', 'transitionItems', 'textOverlays', 'audioTracks', 'tracks', 'selectedClipId', 'selectedTextId', 'selectedTransitionId', 'selectedAudioTrackId', 'sequencePreset'];

const useVideoStore = create((set, get) => ({
    // === PROJECT ===
    projectName: 'Untitled',
    setProjectName: (name) => set({ projectName: name }),

    // === CANONICAL TIMELINE MODEL ===
    tracks: getDefaultTracks(),
    setTrackState: (id, updates) => set((s) => ({
        tracks: s.tracks.map(track => track.id === id ? { ...track, ...updates } : track),
    })),
    getTimelineModel: () => {
        const s = get();
        return buildTimelineModel({
            clips: s.clips,
            transitions: s.transitions,
            transitionItems: s.transitionItems,
            textOverlays: s.textOverlays,
            audioTracks: s.audioTracks,
            tracks: s.tracks,
            totalDuration: s.totalDuration,
        });
    },
    updateTimelineItem: (id, updates, options = {}) => {
        const state = get();
        const timelineItem = state.getTimelineModel().items.find(item => item.id === id);
        if (!timelineItem) return;
        if (isTimelineTrackLocked(state.tracks, timelineItem.trackId)) return;

        if (options.history) pushHistory(state);

        const normalizedUpdates = {
            ...updates,
            ...normalizeTimelineItemUpdates(timelineItem, updates, state.totalDuration),
        };

        if (timelineItem.type === 'transition') {
            get().updateTransitionItem(id, normalizedUpdates);
            return;
        }
        if (timelineItem.type === 'text') {
            get().updateTextOverlay(id, normalizedUpdates);
            return;
        }
        if (timelineItem.type === 'audio') {
            get().updateAudioTrack(id, normalizedUpdates);
            return;
        }
        if (timelineItem.type === 'video') {
            get().updateClip(id, pickClipTimelineUpdates(normalizedUpdates));
        }
    },
    snapEnabled: false,
    setSnapEnabled: (snapEnabled) => set({ snapEnabled }),
    beginHistoryTransaction: (label = 'timeline-edit') => {
        const state = get();
        if (state._historyTransaction) return;
        pushHistory(state, { force: true });
        set({ _historyTransaction: { label, startedAt: Date.now() } });
    },
    commitHistoryTransaction: () => set({ _historyTransaction: null }),

    // === CLIPS ===
    clips: [],
    selectedClipId: null,
    setSelectedClipId: (id) => set({ selectedClipId: id }),

    addClip: (clipData) => {
        const state = get();
        if (isTimelineTrackLocked(state.tracks, 'video-main')) return;
        pushHistory(state);
        set((s) => {
            const newClip = {
                id: clipData.id || uid(),
                name: clipData.name || 'Clip',
                file: clipData.file,
                url: clipData.url,
                duration: clipData.duration || 0,
                originalDuration: clipData.duration || 0,
                trimStart: 0,
                trimEnd: clipData.duration || 0,
                thumbnails: clipData.thumbnails || [],
                speed: 1,
                volume: 100,
                filters: { brightness: 100, contrast: 100, saturation: 100, temperature: 0, vignette: 0, grain: 0 },
            };
            const clips = [...s.clips, newClip];
            const totalDuration = computeTotalDuration(clips, s.transitions);
            return { clips, totalDuration, currentTime: clamp(s.currentTime, 0, totalDuration) };
        });
    },

    removeClip: (id) => {
        const state = get();
        if (isTimelineTrackLocked(state.tracks, 'video-main')) return;
        pushHistory(state);
        set((s) => {
            const clips = s.clips.filter(c => c.id !== id);
            const transitions = { ...s.transitions };
            Object.keys(transitions).forEach(key => {
                const [fromId, toId] = key.split('->');
                if (!clips.find(c => c.id === fromId) || !clips.find(c => c.id === toId)) {
                    delete transitions[key];
                }
            });
            const totalDuration = computeTotalDuration(clips, transitions);
            return {
                clips,
                transitions,
                totalDuration,
                currentTime: clamp(s.currentTime, 0, totalDuration),
                selectedClipId: s.selectedClipId === id ? null : s.selectedClipId,
            };
        });
    },

    reorderClips: (fromIndex, toIndex) => {
        const state = get();
        if (isTimelineTrackLocked(state.tracks, 'video-main')) return;
        pushHistory(state);
        set((s) => {
            const cutTransitions = s.clips.slice(0, -1).map((clip, index) => (
                s.transitions[`${clip.id}->${s.clips[index + 1].id}`] || null
            ));
            const clips = [...s.clips];
            const [moved] = clips.splice(fromIndex, 1);
            clips.splice(toIndex, 0, moved);
            const transitions = Object.fromEntries(
                cutTransitions
                    .map((transition, index) => {
                        if (!transition || !clips[index + 1]) return null;
                        return [`${clips[index].id}->${clips[index + 1].id}`, transition];
                    })
                    .filter(Boolean)
            );
            const totalDuration = computeTotalDuration(clips, transitions);
            return { clips, transitions, totalDuration, currentTime: clamp(s.currentTime, 0, totalDuration) };
        });
    },

    updateClip: (id, updates, options = {}) => {
        const state = get();
        if (isTimelineTrackLocked(state.tracks, 'video-main')) return;
        if (options.history) pushHistory(state);
        set((s) => {
        const normalizedUpdates = Object.prototype.hasOwnProperty.call(updates, 'volume')
            ? { ...updates, volume: clampVolumePercent(updates.volume) }
            : updates;
        const clips = s.clips.map(c => c.id === id ? { ...c, ...normalizedUpdates } : c);
        const totalDuration = computeTotalDuration(clips, s.transitions);
        return { clips, totalDuration, currentTime: clamp(s.currentTime, 0, totalDuration) };
        });
    },

    splitClip: (id, atTime) => {
        const state = get();
        if (isTimelineTrackLocked(state.tracks, 'video-main')) return;
        pushHistory(state);
        set((s) => {
            const idx = s.clips.findIndex(c => c.id === id);
            if (idx === -1) return s;
            const clip = s.clips[idx];
            if (atTime <= clip.trimStart || atTime >= clip.trimEnd) return s;

            const clipBId = uid();
            const clipA = { ...clip, trimEnd: atTime };
            const clipB = { ...clip, id: clipBId, name: clip.name + ' (2)', trimStart: atTime };

            const clips = [...s.clips];
            clips.splice(idx, 1, clipA, clipB);

            const transitions = { ...s.transitions };
            if (idx < s.clips.length - 1) {
                const nextClip = s.clips[idx + 1];
                const oldKey = `${id}->${nextClip.id}`;
                if (transitions[oldKey]) {
                    transitions[`${clipBId}->${nextClip.id}`] = transitions[oldKey];
                    delete transitions[oldKey];
                }
            }

            const totalDuration = computeTotalDuration(clips, transitions);
            return {
                clips,
                transitions,
                totalDuration,
                currentTime: clamp(s.currentTime, 0, totalDuration),
                selectedClipId: clipBId,
            };
        });
    },

    // === TRANSITIONS (between adjacent clips) ===
    transitions: {},
    transitionItems: [],
    selectedTransitionId: null,
    setSelectedTransitionId: (id) => set({ selectedTransitionId: id }),

    setTransition: (fromId, toId, transition) => {
        const state = get();
        if (isTimelineTrackLocked(state.tracks, getTrackForItemType('transition'))) return;
        pushHistory(state);
        set((s) => {
            const key = `${fromId}->${toId}`;
            const transitions = { ...s.transitions, [key]: transition };
            const totalDuration = computeTotalDuration(s.clips, transitions);
            return { transitions, totalDuration, currentTime: clamp(s.currentTime, 0, totalDuration) };
        });
    },

    addTransitionItem: (transition) => {
        const state = get();
        const trackId = transition.trackId || getTrackForItemType('transition');
        if (isTimelineTrackLocked(state.tracks, trackId)) return;
        const duration = Math.max(0.1, transition.duration || transition.defaultDuration || 0.5);
        const maxEnd = Math.max(0.1, state.totalDuration || 0.1);
        const startTime = clamp(transition.startTime ?? state.currentTime ?? 0, 0, Math.max(0, maxEnd - duration));
        const id = transition.id || uid();
        const nextItem = {
            id,
            type: transition.type,
            start: startTime,
            trackId,
            fromItemId: transition.fromItemId || null,
            toItemId: transition.toItemId || null,
            params: transition.params || {},
            name: transition.name || transition.type || 'Transition',
            icon: transition.icon || '*',
            category: transition.category || 'basic',
            startTime,
            endTime: startTime + duration,
            duration,
        };
        if (findTransitionItemOverlap([...state.transitionItems, nextItem], state.totalDuration)) return;
        pushHistory(state);
        set((s) => ({
            transitionItems: [...s.transitionItems, nextItem],
            selectedTransitionId: id,
        }));
    },

    updateTransitionItem: (id, updates, options = {}) => {
        const state = get();
        const target = state.transitionItems.find(item => item.id === id);
        if (!target) return;
        if (isTimelineTrackLocked(state.tracks, target.trackId || getTrackForItemType('transition'))) return;
        const nextTransitionItems = state.transitionItems.map((item) => {
            if (item.id !== id) return item;
            const next = { ...item, ...updates };
            const maxEnd = Math.max(0.1, state.totalDuration || 0.1);
            const requestedStart = Object.prototype.hasOwnProperty.call(updates, 'start') || Object.prototype.hasOwnProperty.call(updates, 'startTime')
                ? (updates.start ?? updates.startTime)
                : (next.start ?? next.startTime);
            const startTime = clamp(requestedStart || 0, 0, Math.max(0, maxEnd - 0.1));
            let endTime = next.endTime;
            let duration = next.duration;

            if (Object.prototype.hasOwnProperty.call(updates, 'duration') && !Object.prototype.hasOwnProperty.call(updates, 'endTime')) {
                duration = Math.max(0.1, updates.duration || 0.1);
                endTime = startTime + duration;
            } else {
                endTime = Math.max(startTime + 0.1, endTime || startTime + (duration || 0.5));
                duration = Math.max(0.1, endTime - startTime);
            }

            endTime = Math.min(maxEnd, endTime);
            duration = Math.max(0.1, endTime - startTime);
            return {
                ...next,
                start: startTime,
                startTime,
                endTime,
                duration,
                trackId: next.trackId || getTrackForItemType('transition'),
                fromItemId: next.fromItemId || null,
                toItemId: next.toItemId || null,
                params: next.params || {},
            };
        });
        if (findTransitionItemOverlap(nextTransitionItems, state.totalDuration)) return;
        if (options.history) pushHistory(state);
        set({ transitionItems: nextTransitionItems });
    },

    removeTransitionItem: (id) => {
        const state = get();
        const target = state.transitionItems.find(item => item.id === id);
        if (target && isTimelineTrackLocked(state.tracks, target.trackId || getTrackForItemType('transition'))) return;
        pushHistory(state);
        set((s) => ({
            transitionItems: s.transitionItems.filter(item => item.id !== id),
            selectedTransitionId: s.selectedTransitionId === id ? null : s.selectedTransitionId,
        }));
    },

    removeTransition: (fromId, toId) => {
        const state = get();
        if (isTimelineTrackLocked(state.tracks, getTrackForItemType('transition'))) return;
        pushHistory(state);
        set((s) => {
            const key = `${fromId}->${toId}`;
            const transitions = { ...s.transitions };
            delete transitions[key];
            const totalDuration = computeTotalDuration(s.clips, transitions);
            return { transitions, totalDuration, currentTime: clamp(s.currentTime, 0, totalDuration) };
        });
    },

    // === AUDIO TRACKS ===
    audioTracks: [],
    selectedAudioTrackId: null,
    setSelectedAudioTrackId: (id) => set({ selectedAudioTrackId: id }),
    addAudioTrack: (track) => {
        const state = get();
        const trackId = track.trackId || getTrackForItemType('audio');
        if (isTimelineTrackLocked(state.tracks, trackId)) return;
        pushHistory(state);
        const id = track.id || uid();
        set((s) => ({
            audioTracks: [...s.audioTracks, {
                id,
                name: track.name || 'Audio',
                url: track.url,
                file: track.file || null,
                volume: 100,
                trackId,
                startTime: track.startTime || 0,
                duration: track.duration || 10,
                endTime: (track.startTime || 0) + (track.duration || 10),
                ...track,
                id,
                volume: clampVolumePercent(track.volume ?? 100),
            }],
            selectedAudioTrackId: id,
        }));
    },
    removeAudioTrack: (id) => {
        const state = get();
        const target = state.audioTracks.find(track => track.id === id);
        if (target && isTimelineTrackLocked(state.tracks, target.trackId || getTrackForItemType('audio'))) return;
        pushHistory(state);
        set((s) => ({
            audioTracks: s.audioTracks.filter(t => t.id !== id),
            selectedAudioTrackId: s.selectedAudioTrackId === id ? null : s.selectedAudioTrackId,
        }));
    },
    updateAudioTrack: (id, updates, options = {}) => {
        const state = get();
        const target = state.audioTracks.find(track => track.id === id);
        if (target && isTimelineTrackLocked(state.tracks, target.trackId || getTrackForItemType('audio'))) return;
        if (options.history) pushHistory(state);
        set((s) => ({
        audioTracks: s.audioTracks.map((track) => {
            if (track.id !== id) return track;
            const next = { ...track, ...updates };
            const maxEnd = Math.max(0.1, s.totalDuration || 0.1);
            const startTime = clamp(next.startTime || 0, 0, Math.max(0, maxEnd - 0.1));
            const endTime = Math.min(maxEnd, Math.max(startTime + 0.1, next.endTime || startTime + (next.duration || 0.1)));
            return { ...next, startTime, endTime, duration: Math.max(0.1, endTime - startTime), volume: clampVolumePercent(next.volume ?? 100) };
        })
        }));
    },

    // === TEXT OVERLAYS ===
    textOverlays: [],
    selectedTextId: null,
    setSelectedTextId: (id) => set({ selectedTextId: id }),

    addTextOverlay: (text) => {
        const state = get();
        const trackId = text.trackId || getTrackForItemType('text');
        if (isTimelineTrackLocked(state.tracks, trackId)) return;
        pushHistory(state);
        const id = uid();
        set((s) => ({
            textOverlays: [...s.textOverlays, {
                id,
                content: text.content || 'Your Text',
                trackId,
                startTime: text.startTime || 0,
                endTime: text.endTime || 3,
                x: 0.5, y: 0.5,
                font: 'Inter',
                fontSize: 48,
                color: '#ffffff',
                bold: true,
                italic: false,
                animation: 'fade',
                animationOut: 'fade',
                ...text,
                id,
            }],
            selectedTextId: id,
        }));
    },
    removeTextOverlay: (id) => {
        const state = get();
        const target = state.textOverlays.find(text => text.id === id);
        if (target && isTimelineTrackLocked(state.tracks, target.trackId || getTrackForItemType('text'))) return;
        pushHistory(state);
        set((s) => ({
            textOverlays: s.textOverlays.filter(t => t.id !== id),
            selectedTextId: s.selectedTextId === id ? null : s.selectedTextId,
        }));
    },
    updateTextOverlay: (id, updates, options = {}) => {
        const state = get();
        const target = state.textOverlays.find(text => text.id === id);
        if (target && isTimelineTrackLocked(state.tracks, target.trackId || getTrackForItemType('text'))) return;
        if (options.history) pushHistory(state);
        set((s) => ({
        textOverlays: s.textOverlays.map((text) => {
            if (text.id !== id) return text;
            const next = { ...text, ...updates };
            const maxEnd = Math.max(0.1, s.totalDuration || 0.1);
            const startTime = clamp(next.startTime || 0, 0, Math.max(0, maxEnd - 0.1));
            const endTime = Math.min(maxEnd, Math.max(startTime + 0.1, next.endTime || startTime + 0.1));
            return { ...next, startTime, endTime };
        })
        }));
    },

    // === PLAYBACK ===
    isPlaying: false,
    currentTime: 0,
    totalDuration: 0,
    playbackSpeed: 1,

    setIsPlaying: (v) => set({ isPlaying: v }),
    setCurrentTime: (t) => set((s) => ({ currentTime: clamp(t, 0, s.totalDuration || 0) })),
    setPlaybackSpeed: (s) => set({ playbackSpeed: s }),

    play: () => set({ isPlaying: true }),
    pause: () => set({ isPlaying: false }),
    togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
    seekTo: (time) => set((s) => ({ currentTime: clamp(time, 0, s.totalDuration || 0) })),

    // === TIMELINE ===
    zoom: 1,
    scrollX: 0,
    setZoom: (z) => set({ zoom: Math.max(0.03, Math.min(10, z)) }),
    setScrollX: (x) => set({ scrollX: x }),

    // === EXPORT ===
    previewCanvas: null,
    setPreviewCanvas: (canvas) => set({ previewCanvas: canvas }),
    previewEngine: null,
    setPreviewEngine: (engine) => set({ previewEngine: engine }),
    sequencePreset: 'youtube',
    setSequencePreset: (p) => set({ sequencePreset: p, exportPreset: p }),
    exportFormat: 'mp4',
    exportPreset: 'youtube',
    exportProgress: 0,
    isExporting: false,
    setExportFormat: (f) => set({ exportFormat: f }),
    setExportPreset: (p) => set({ exportPreset: p, sequencePreset: p }),
    setExportProgress: (p) => set({ exportProgress: p }),
    setIsExporting: (v) => set({ isExporting: v }),

    // === ACTIVE PANEL ===
    activePanel: null,
    setActivePanel: (p) => set((s) => ({ activePanel: s.activePanel === p ? null : p })),

    // === UNDO / REDO ===
    _history: [],
    _future: [],
    _historyIndex: -1,
    _maxHistory: 50,
    _historyTransaction: null,

    undo: () => {
        const s = get();
        if (s._history.length === 0) return;
        const snapshot = s._history[s._history.length - 1];
        const history = s._history.slice(0, -1);
        const future = [createSnapshot(s), ...s._future].slice(0, s._maxHistory);
        set({
            ...snapshot,
            _history: history,
            _future: future,
            _historyIndex: history.length - 1,
            _historyTransaction: null,
            totalDuration: computeTotalDuration(snapshot.clips, snapshot.transitions),
        });
    },

    redo: () => {
        const s = get();
        if (s._future.length === 0) return;
        const snapshot = s._future[0];
        if (!snapshot) return;
        const history = [...s._history, createSnapshot(s)].slice(-s._maxHistory);
        set({
            ...snapshot,
            _history: history,
            _future: s._future.slice(1),
            _historyIndex: history.length - 1,
            _historyTransaction: null,
            totalDuration: computeTotalDuration(snapshot.clips, snapshot.transitions),
        });
    },

    canUndo: () => get()._history.length > 0,
    canRedo: () => get()._future.length > 0,
}));

function pushHistory(state, options = {}) {
    if (state._historyTransaction && !options.force) return;
    const history = [...state._history, createSnapshot(state)].slice(-state._maxHistory);
    useVideoStore.setState({
        _history: history,
        _historyIndex: history.length - 1,
        _future: [],
    });
}

function createSnapshot(state) {
    const snapshot = {};
    SNAPSHOT_KEYS.forEach(key => { snapshot[key] = state[key]; });
    return snapshot;
}

function normalizeTimelineItemUpdates(item, updates = {}, totalDuration = 0) {
    const currentStart = Number.isFinite(Number(item.start)) ? Number(item.start) : 0;
    const currentDuration = Number.isFinite(Number(item.duration)) ? Math.max(0.1, Number(item.duration)) : 0.1;
    const maxEnd = Math.max(0.1, totalDuration || currentStart + currentDuration);
    const requestedStart = Object.prototype.hasOwnProperty.call(updates, 'start') || Object.prototype.hasOwnProperty.call(updates, 'startTime')
        ? (updates.start ?? updates.startTime)
        : currentStart;
    let startTime = clamp(Number(requestedStart) || 0, 0, Math.max(0, maxEnd - 0.1));
    let duration = currentDuration;

    if (Object.prototype.hasOwnProperty.call(updates, 'duration')) {
        duration = Math.max(0.1, Number(updates.duration) || 0.1);
    } else if (Object.prototype.hasOwnProperty.call(updates, 'endTime')) {
        duration = Math.max(0.1, (Number(updates.endTime) || startTime + currentDuration) - startTime);
    }

    let endTime = Object.prototype.hasOwnProperty.call(updates, 'endTime')
        ? Number(updates.endTime)
        : startTime + duration;
    if (!Number.isFinite(endTime)) endTime = startTime + duration;
    endTime = clamp(endTime, startTime + 0.1, maxEnd);
    duration = Math.max(0.1, endTime - startTime);
    startTime = Math.max(0, Math.min(startTime, Math.max(0, maxEnd - duration)));

    return {
        start: startTime,
        startTime,
        endTime,
        duration,
    };
}

function pickClipTimelineUpdates(updates = {}) {
    const allowedKeys = ['trimStart', 'trimEnd', 'speed', 'volume', 'filters', 'trackId'];
    return Object.fromEntries(
        allowedKeys
            .filter(key => Object.prototype.hasOwnProperty.call(updates, key))
            .map(key => [key, updates[key]])
    );
}

function computeTotalDuration(clips, transitions = {}) {
    if (clips.length === 0) return 0;
    let total = 0;
    clips.forEach((clip, i) => {
        const clipDur = (clip.trimEnd - clip.trimStart) / (clip.speed || 1);
        total += clipDur;
        if (i < clips.length - 1) {
            const key = `${clip.id}->${clips[i + 1].id}`;
            const tr = transitions[key];
            if (tr) total -= tr.duration || 0;
        }
    });
    return Math.max(0, total);
}

export default useVideoStore;
