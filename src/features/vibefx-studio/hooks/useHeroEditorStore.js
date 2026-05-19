import { create } from 'zustand';

// Charger initialement depuis le LocalStorage
const getInitialElements = () => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('vibe_hero_positions');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error('Erreur lecture localStorage', e);
    }
  }
  
  // Par défaut (Vibe_OS v2 Technical Identity)
  return [
    {
      id: 'metadata_top',
      type: 'text',
      content: '// SYSTEM INITIALIZED : VIBE_OS v2.0',
      x: 50,
      y: 25,
      width: 300,
      height: 20,
      style: {
        fontSize: 12,
        fontWeight: 400,
        fontFamily: 'monospace',
        color: '#6366f1',
        textAlign: 'center',
        letterSpacing: '0.1em',
        textTransform: 'uppercase'
      }
    },
    {
      id: 'title',
      type: 'text',
      content: 'VIBE.FX',
      x: 50,
      y: 40,
      width: 800,
      height: 140,
      style: {
        fontSize: 140,
        fontWeight: 900,
        fontFamily: '"Inter", sans-serif',
        color: '#e5e5e5',
        textAlign: 'center',
        letterSpacing: '-0.06em',
      }
    },
    {
      id: 'subtitle',
      type: 'text',
      content: 'Technical Precision. Absolute Control.',
      x: 50,
      y: 55,
      width: 600,
      height: 40,
      style: {
        fontSize: 20,
        fontWeight: 300,
        fontFamily: '"Inter", sans-serif',
        color: '#737373',
        textAlign: 'center',
        letterSpacing: '0.05em',
      }
    },
    {
      id: 'button',
      type: 'button',
      content: "LAUNCH COCKPIT",
      x: 50,
      y: 70,
      width: 200,
      height: 50,
      style: {
        fontSize: 12,
        fontWeight: 600,
        fontFamily: 'monospace',
        color: '#e5e5e5',
        background: 'transparent',
        border: '1px solid #6366f1',
        borderRadius: '0px',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }
    }
  ];
};

const initialElements = getInitialElements();

export const useHeroEditorStore = create((set, get) => ({
  isEditMode: false,
  elements: initialElements,
  selectedElementId: null,
  draggedElementId: null,
  isResizing: null,
  guides: { x: [], y: [] },
  history: [initialElements],
  historyIndex: 0,

  setEditMode: (mode) => set({ isEditMode: mode, selectedElementId: null }),
  setSelectedElement: (id) => set({ selectedElementId: id }),
  setDraggedElement: (id) => set({ draggedElementId: id }),
  setIsResizing: (resizeData) => set({ isResizing: resizeData }),
  setGuides: (guides) => set({ guides }),

  // Actions d'édition
  updateElement: (id, updates) => {
    set((state) => {
      const newElements = state.elements.map(el => 
        el.id === id ? { ...el, ...updates } : el
      );
      return { elements: newElements };
    });
  },

  updateElementStyle: (id, styleUpdates) => {
    set((state) => {
      const newElements = state.elements.map(el => 
        el.id === id ? { ...el, style: { ...el.style, ...styleUpdates } } : el
      );
      return { elements: newElements };
    });
  },

  addElement: (element) => {
    set((state) => {
      const newElement = {
        ...element,
        id: `el_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      };
      const newElements = [...state.elements, newElement];
      return { elements: newElements, selectedElementId: newElement.id };
    });
    get().saveHistory();
  },

  removeElement: (id) => {
    set((state) => {
      const newElements = state.elements.filter(el => el.id !== id);
      return { 
        elements: newElements, 
        selectedElementId: state.selectedElementId === id ? null : state.selectedElementId 
      };
    });
    get().saveHistory();
  },

  // Undo / Redo
  saveHistory: () => {
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push([...state.elements]);
      // Limit history size to 20
      if (newHistory.length > 20) newHistory.shift();
      return { history: newHistory, historyIndex: newHistory.length - 1 };
    });
  },

  undo: () => {
    set((state) => {
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1;
        return { elements: [...state.history[newIndex]], historyIndex: newIndex };
      }
      return state;
    });
  },

  redo: () => {
    set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1;
        return { elements: [...state.history[newIndex]], historyIndex: newIndex };
      }
      return state;
    });
  }
}));