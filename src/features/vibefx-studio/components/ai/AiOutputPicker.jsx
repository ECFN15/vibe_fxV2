import React, { useState } from 'react';
import { Check, Clipboard, ExternalLink, Send } from 'lucide-react';
import { copyStudioAiOutput, getOutputText } from '../../ai/studioAiAdapters';

export default function AiOutputPicker({ action, output, onApply }) {
  const [message, setMessage] = useState('');
  const text = getOutputText(output);
  if (!text) {
    return (
      <section className="vf-ai-output" data-testid="studio-ai-output-empty">
        <header>Sortie</header>
        <p>Aucune sortie encore. Les medias reels restent bloques tant que les policies production ne sont pas validees.</p>
      </section>
    );
  }

  return (
    <section className="vf-ai-output" data-testid="studio-ai-output">
      <header>Sortie reutilisable</header>
      <pre>{text}</pre>
      <div className="vf-ai-output__actions">
        <button
          type="button"
          onClick={() => {
            const result = onApply?.();
            setMessage(result?.message || 'Sortie appliquee.');
          }}
        >
          <Send size={12} />
          {action?.intent === 'send_to_publication' ? 'Envoyer vers publication' : 'Appliquer au canvas'}
        </button>
        <button
          type="button"
          onClick={async () => {
            const copied = await copyStudioAiOutput(output);
            setMessage(copied ? 'Copie dans le presse-papiers.' : 'Copie indisponible.');
          }}
        >
          <Clipboard size={12} />
          Copier
        </button>
        <button type="button" disabled>
          <ExternalLink size={12} />
          Ajouter variante
        </button>
      </div>
      {message && (
        <p className="vf-ai-output__message">
          <Check size={12} />
          {message}
        </p>
      )}
    </section>
  );
}

