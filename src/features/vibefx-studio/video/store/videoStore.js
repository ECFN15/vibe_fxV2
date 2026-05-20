import { create } from 'zustand';

const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Snapshot keys for undo/redo
const SNAPSHOT_KEYS = ['clips', 'transitions', 'transitionItems', 'textOverlays', 'audioTracks', 'selectedClipId', 'selectedTextId', 'selectedTransitionId', 'sequencePreset'];

const useVideoStore = create((set, get) => ({
    // === PROJECT ===
    projectName: 'Untitled',
    setProjectName: (name) => set({ projectName: name }),

    // === CLIPS ===
    clips: [],
    selectedClipId: null,
    setSelectedClipId: (id) => set({ selectedClipId: id }),

    addClip: (clipData) => {
        const state = get();
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

    updateClip: (id, updates) => set((s) => {
        const clips = s.clips.map(c => c.id === id ? { ...c, ...updates } : c);
        const totalDuration = computeTotalDuration(clips, s.transitions);
        return { clips, totalDuration, currentTime: clamp(s.currentTime, 0, totalDuration) };
    }),

    splitClip: (id, atTime) => {
        const state = get();
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
        pushHistory(state);
        const duration = Math.max(0.1, transition.duration || transition.defaultDuration || 0.5);
        const startTime = Math.max(0, transition.startTime ?? state.currentTime ?? 0);
        const id = transition.id || uid();
        set((s) => ({
            transitionItems: [...s.transitionItems, {
                id,
                type: transition.type,
                name: transition.name || transition.type || 'Transition',
                icon: transition.icon || '*',
                category: transition.category || 'basic',
                startTime,
                endTime: startTime + duration,
                duration,
            }],
            selectedTransitionId: id,
        }));
    },

    updateTransitionItem: (id, updates) => set((s) => ({
        transitionItems: s.transitionItems.map((item) => {
            if (item.id !== id) return item;
            const next = { ...item, ...updates };
            const maxEnd = Math.max(0.1, s.totalDuration || 0.1);
            const startTime = clamp(next.startTime || 0, 0, Math.max(0, maxEnd - 0.1));
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
            return { ...next, startTime, endTime, duration };
        }),
    })),

    removeTransitionItem: (id) => {
        const state = get();
        pushHistory(state);
        set((s) => ({
            transitionItems: s.transitionItems.filter(item => item.id !== id),
            selectedTransitionId: s.selectedTransitionId === id ? null : s.selectedTransitionId,
        }));
    },

    removeTransition: (fromId, toId) => {
        const state = get();
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
    addAudioTrack: (track) => {
        const state = get();
        pushHistory(state);
        set((s) => ({
            audioTracks: [...s.audioTracks, {
                id: uid(),
                name: track.name || 'Audio',
                url: track.url,
                file: track.file || null,
                volume: 100,
                startTime: track.startTime || 0,
                duration: track.duration || 10,
                endTime: (track.startTime || 0) + (track.duration || 10),
                ...track,
                id: track.id || uid(),
            }]
        }));
    },
    removeAudioTrack: (id) => {
        const state = get();
        pushHistory(state);
        set((s) => ({ audioTracks: s.audioTracks.filter(t => t.id !== id) }));
    },
    updateAudioTrack: (id, updates) => set((s) => ({
        audioTracks: s.audioTracks.map((track) => {
            if (track.id !== id) return track;
            const next = { ...track, ...updates };
            const maxEnd = Math.max(0.1, s.totalDuration || 0.1);
            const startTime = clamp(next.startTime || 0, 0, Math.max(0, maxEnd - 0.1));
            const endTime = Math.min(maxEnd, Math.max(startTime + 0.1, next.endTime || startTime + (next.duration || 0.1)));
            return { ...next, startTime, endTime, duration: Math.max(0.1, endTime - startTime) };
        })
    })),

    // === TEXT OVERLAYS ===
    textOverlays: [],
    selectedTextId: null,
    setSelectedTextId: (id) => set({ selectedTextId: id }),

    addTextOverlay: (text) => {
        const state = get();
        pushHistory(state);
        const id = uid();
        set((s) => ({
            textOverlays: [...s.textOverlays, {
                id,
                content: text.content || 'Your Text',
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
        pushHistory(state);
        set((s) => ({
            textOverlays: s.textOverlays.filter(t => t.id !== id),
            selectedTextId: s.selectedTextId === id ? null : s.selectedTextId,
        }));
    },
    updateTextOverlay: (id, updates) => set((s) => ({
        textOverlays: s.textOverlays.map((text) => {
            if (text.id !== id) return text;
            const next = { ...text, ...updates };
            const maxEnd = Math.max(0.1, s.totalDuration || 0.1);
            const startTime = clamp(next.startTime || 0, 0, Math.max(0, maxEnd - 0.1));
            const endTime = Math.min(maxEnd, Math.max(startTime + 0.1, next.endTime || startTime + 0.1));
            return { ...next, startTime, endTime };
        })
    })),

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
    _historyIndex: -1,
    _maxHistory: 50,

    undo: () => {
        const s = get();
        if (s._historyIndex < 0 || s._history.length === 0) return;
        const snapshot = s._history[s._historyIndex];
        set({
            ...snapshot,
            _historyIndex: s._historyIndex - 1,
            totalDuration: computeTotalDuration(snapshot.clips, snapshot.transitions),
        });
    },

    redo: () => {
        const s = get();
        if (s._historyIndex >= s._history.length - 2) return;
        const snapshot = s._history[s._historyIndex + 2];
        if (!snapshot) return;
        set({
            ...snapshot,
            _historyIndex: s._historyIndex + 1,
            totalDuration: computeTotalDuration(snapshot.clips, snapshot.transitions),
        });
    },

    canUndo: () => get()._historyIndex >= 0,
    canRedo: () => get()._historyIndex < get()._history.length - 2,
}));

function pushHistory(state) {
    const snapshot = {};
    SNAPSHOT_KEYS.forEach(key => { snapshot[key] = state[key]; });
    const history = state._history.slice(0, state._historyIndex + 1);
    history.push(snapshot);
    if (history.length > state._maxHistory) history.shift();
    useVideoStore.setState({
        _history: history,
        _historyIndex: history.length - 1,
    });
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
