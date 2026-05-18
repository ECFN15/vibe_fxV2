import React, { useEffect, useState } from 'react';
import { RotateCcw, Square, X } from 'lucide-react';

export default function LayoutDemoOverlay({
  running,
  step,
  stepIndex,
  totalSteps,
  onStop,
  onRestore,
}) {
  const [typedText, setTypedText] = useState('');

  useEffect(() => {
    if (!running || !step) {
      setTypedText('');
      return undefined;
    }

    setTypedText('');
    let index = 0;
    const fullText = step.body || '';
    const timer = window.setInterval(() => {
      index += 1;
      setTypedText(fullText.slice(0, index));
      if (index >= fullText.length) window.clearInterval(timer);
    }, 18);

    return () => window.clearInterval(timer);
  }, [running, step]);

  if (!running || !step) return null;

  const cursor = step.cursor || { x: 50, y: 50 };
  const bubble = step.bubble || { x: 50, y: 32 };
  const progress = totalSteps > 1 ? ((stepIndex + 1) / totalSteps) * 100 : 100;

  return (
    <div
      className="vibefx-demo-layer"
      aria-live="polite"
      style={{ '--demo-x': `${cursor.x}%`, '--demo-y': `${cursor.y}%` }}
    >
      <div
        className="vibefx-demo-spotlight"
        style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}
      />
      <div
        className="vibefx-demo-cursor"
        style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}
      >
        <div className="vibefx-demo-cursor-dot" />
        <div className="vibefx-demo-cursor-tail" />
      </div>

      <aside
        className="vibefx-demo-bubble"
        style={{ left: `${bubble.x}%`, top: `${bubble.y}%` }}
      >
        <div className="vibefx-demo-bubble-head">
          <span>Demo live {stepIndex + 1}/{totalSteps}</span>
          <button type="button" onClick={onStop} aria-label="Stopper la demo">
            <X size={14} />
          </button>
        </div>
        <h3>{step.title}</h3>
        <p>{typedText}</p>
        <div className="vibefx-demo-progress">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="vibefx-demo-actions">
          <button type="button" onClick={onStop}>
            <Square size={12} /> Stopper
          </button>
          <button type="button" onClick={onRestore}>
            <RotateCcw size={12} /> Restaurer
          </button>
        </div>
      </aside>
    </div>
  );
}
