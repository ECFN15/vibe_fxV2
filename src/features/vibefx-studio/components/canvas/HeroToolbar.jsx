import React, { useState } from 'react';
import { useHeroEditorStore } from '../../hooks/useHeroEditorStore';

const HeroToolbar = ({ containerRef }) => {
  const { isEditMode, selectedElementId, elements, updateElementStyle, updateElement, removeElement } = useHeroEditorStore();
  const [isEditingText, setIsEditingText] = useState(false);

  if (!isEditMode || !selectedElementId) return null;

  const selectedElement = elements.find(el => el.id === selectedElementId);
  if (!selectedElement) return null;

  // Positionner la toolbar juste au-dessus de l'élément sélectionné
  const elementX = selectedElement.x;
  const elementY = selectedElement.y;
  
  // On place la toolbar en haut de l'écran, centrée (Canva style)
  // ou flottante au dessus de l'élément (Figma style)
  // Optons pour une toolbar flottante en haut de l'écran

  return (
    <div style={{
      position: 'fixed',
      top: '40px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '8px 20px',
      backgroundColor: '#0a0a0a',
      border: '1px solid #171717',
      color: '#e5e5e5',
      zIndex: 10005,
      fontFamily: 'monospace',
      fontSize: '11px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.8)'
    }}>
      <div style={{ fontWeight: 'bold', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20.4281L3 14L12 7.57187L21 14L12 20.4281Z"/>
          <path d="M12 12.8563L3 6.42813L12 0L21 6.42813L12 12.8563Z"/>
        </svg>
        <span>{selectedElement.type}</span>
      </div>
      
      <div style={{ width: '1px', height: '20px', backgroundColor: '#262626' }} />

      {selectedElement.type === 'text' && (
        <>
          <select 
            value={selectedElement.style.fontFamily || ''} 
            onChange={(e) => updateElementStyle(selectedElement.id, { fontFamily: e.target.value })}
            style={{ padding: '4px 8px', background: 'transparent', color: '#e5e5e5', border: '1px solid #262626', outline: 'none', cursor: 'pointer' }}
          >
            <option value='"Inter", sans-serif' style={{background:'#0a0a0a'}}>Inter</option>
            <option value='"Archivo Black", sans-serif' style={{background:'#0a0a0a'}}>Archivo Black</option>
            <option value='monospace' style={{background:'#0a0a0a'}}>Monospace</option>
          </select>

          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #262626' }}>
            <button 
              onClick={() => updateElementStyle(selectedElement.id, { fontSize: Math.max(8, (selectedElement.style.fontSize || 16) - 2) })}
              style={{ padding: '4px 8px', background: 'transparent', color: '#737373', border: 'none', borderRight: '1px solid #262626', cursor: 'pointer' }}
            >
              -
            </button>
            <span style={{ padding: '4px 8px', width: '30px', textAlign: 'center', color: '#e5e5e5' }}>
              {Math.round(selectedElement.style.fontSize || 16)}
            </span>
            <button 
              onClick={() => updateElementStyle(selectedElement.id, { fontSize: (selectedElement.style.fontSize || 16) + 2 })}
              style={{ padding: '4px 8px', background: 'transparent', color: '#737373', border: 'none', borderLeft: '1px solid #262626', cursor: 'pointer' }}
            >
              +
            </button>
          </div>

          <input 
            type="color" 
            value={selectedElement.style.color || '#ffffff'}
            onChange={(e) => updateElementStyle(selectedElement.id, { color: e.target.value })}
            style={{ width: '24px', height: '24px', padding: '0', border: '1px solid #262626', cursor: 'pointer', background: 'transparent' }}
            title="Color"
          />

          <select 
            value={selectedElement.style.fontWeight || 400} 
            onChange={(e) => updateElementStyle(selectedElement.id, { fontWeight: parseInt(e.target.value) })}
            style={{ padding: '4px 8px', background: 'transparent', color: '#e5e5e5', border: '1px solid #262626', outline: 'none', cursor: 'pointer' }}
          >
            <option value={300} style={{background:'#0a0a0a'}}>Light</option>
            <option value={400} style={{background:'#0a0a0a'}}>Regular</option>
            <option value={600} style={{background:'#0a0a0a'}}>Semi-Bold</option>
            <option value={900} style={{background:'#0a0a0a'}}>Black</option>
          </select>
        </>
      )}

      {selectedElement.type === 'button' && (
        <>
          <input 
            type="text" 
            value={selectedElement.content}
            onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
            style={{ padding: '4px 8px', background: 'transparent', color: '#e5e5e5', border: '1px solid #262626', outline: 'none', width: '150px' }}
            placeholder="Action Text"
          />
        </>
      )}

      <div style={{ width: '1px', height: '20px', backgroundColor: '#262626' }} />

      <button 
        onClick={() => removeElement(selectedElement.id)}
        style={{ padding: '4px 8px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.8 }}
        title="Supprimer (Suppr)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18"></path>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  );
};

export default HeroToolbar;