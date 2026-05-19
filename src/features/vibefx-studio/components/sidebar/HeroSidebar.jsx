import React from 'react';
import { useHeroEditorStore } from '../../hooks/useHeroEditorStore';

const HeroSidebar = () => {
  const { isEditMode, setEditMode, addElement, historyIndex, history, undo, redo, elements } = useHeroEditorStore();

  if (!isEditMode) return null;

  const handleAddText = (type) => {
    let newElement = {
      type: 'text',
      x: 50,
      y: 50,
      width: 400,
      height: 60,
    };

    if (type === 'title') {
      newElement.content = 'Nouveau Titre';
      newElement.style = {
        fontSize: 80,
        fontWeight: 900,
        fontFamily: '"Archivo Black", sans-serif',
        color: '#ffffff',
        textAlign: 'center',
        textShadow: '0 0 20px rgba(0,0,0,0.5)',
      };
    } else {
      newElement.content = 'Ajouter un sous-titre ou un paragraphe ici.';
      newElement.style = {
        fontSize: 24,
        fontWeight: 400,
        fontFamily: '"Inter", sans-serif',
        color: '#ffffff',
        textAlign: 'center',
      };
    }

    addElement(newElement);
  };

  const handleAddButton = () => {
    addElement({
      type: 'button',
      content: 'Nouveau Bouton',
      x: 50,
      y: 60,
      width: 200,
      height: 50,
      style: {
        fontSize: 16,
        fontWeight: 700,
        fontFamily: '"Neue Montreal", sans-serif',
        color: '#ffffff',
        background: '#3b82f6',
        borderRadius: '8px',
        textAlign: 'center',
      }
    });
  };

  const saveConfig = () => {
    localStorage.setItem('vibe_hero_positions', JSON.stringify(elements));
    alert('Configuration sauvegardée !');
  };

  const resetConfig = () => {
    if (window.confirm('Réinitialiser la configuration ?')) {
      localStorage.removeItem('vibe_hero_positions');
      window.location.reload();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      width: '280px',
      backgroundColor: '#0a0a0a',
      borderRight: '1px solid #171717',
      color: '#e5e5e5',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"Inter", sans-serif',
      boxShadow: '4px 0 20px rgba(0,0,0,0.8)'
    }}>
      {/* Header */}
      <div style={{ padding: '20px', borderBottom: '1px solid #171717', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '11px', fontWeight: 600, margin: 0, color: '#6366f1', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cockpit Editor</h2>
        <button 
          onClick={() => setEditMode(false)}
          style={{ background: 'transparent', border: 'none', color: '#737373', cursor: 'pointer', fontSize: '18px' }}
        >
          ×
        </button>
      </div>

      {/* Undo / Redo */}
      <div style={{ display: 'flex', borderBottom: '1px solid #171717' }}>
        <button 
          onClick={undo} 
          disabled={historyIndex <= 0}
          style={{ flex: 1, padding: '10px', background: 'transparent', border: 'none', borderRight: '1px solid #171717', color: historyIndex <= 0 ? '#262626' : '#737373', cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer', fontSize: '10px', textTransform: 'uppercase', fontFamily: 'monospace' }}
        >
          ↩ Undo
        </button>
        <button 
          onClick={redo} 
          disabled={historyIndex >= history.length - 1}
          style={{ flex: 1, padding: '10px', background: 'transparent', border: 'none', color: historyIndex >= history.length - 1 ? '#262626' : '#737373', cursor: historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer', fontSize: '10px', textTransform: 'uppercase', fontFamily: 'monospace' }}
        >
          Redo ↪
        </button>
      </div>

      {/* Elements Panel */}
      <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
        <h3 style={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', color: '#737373', letterSpacing: '0.1em', marginBottom: '15px' }}>ADD NODES</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => handleAddText('title')} style={sidebarButtonStyle}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'monospace' }}>T1</span>
            Header Node
          </button>
          
          <button onClick={() => handleAddText('subtitle')} style={sidebarButtonStyle}>
            <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>T2</span>
            Text Node
          </button>
          
          <button onClick={handleAddButton} style={sidebarButtonStyle}>
            <div style={{ width: '14px', height: '10px', border: '1px solid #6366f1' }} />
            Action Node
          </button>
        </div>

        <h3 style={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', color: '#737373', letterSpacing: '0.1em', marginTop: '30px', marginBottom: '15px' }}>LAYERS ({elements.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {elements.map((el, i) => (
            <div key={el.id} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid #171717', fontSize: '11px', display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px', color: '#e5e5e5' }}>
                {el.type === 'text' ? el.content : `BTN: ${el.content}`}
              </span>
              <span style={{ color: '#6366f1' }}>{el.type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div style={{ padding: '20px', borderTop: '1px solid #171717', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button onClick={saveConfig} style={{ ...actionButtonStyle, background: '#6366f1', color: '#fff', border: 'none' }}>
          SAVE CONFIG
        </button>
        <button onClick={resetConfig} style={{ ...actionButtonStyle, background: 'transparent', border: '1px solid #ef4444', color: '#ef4444' }}>
          SYSTEM RESET
        </button>
      </div>
    </div>
  );
};

const sidebarButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 16px',
  background: 'transparent',
  border: '1px solid #171717',
  color: '#e5e5e5',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'border-color 0.2s',
  fontSize: '11px',
  fontFamily: 'monospace',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

const actionButtonStyle = {
  padding: '12px',
  color: '#e5e5e5',
  fontWeight: '600',
  cursor: 'pointer',
  textAlign: 'center',
  textTransform: 'uppercase',
  fontSize: '10px',
  letterSpacing: '0.1em',
  fontFamily: 'monospace'
};

export default HeroSidebar;