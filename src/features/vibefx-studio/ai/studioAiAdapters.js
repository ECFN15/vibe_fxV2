function createTextItem(content, index = 0) {
  return {
    id: Date.now(),
    content,
    x: 0.5,
    y: Math.min(0.82, 0.38 + index * 0.08),
    font: 'Inter',
    bold: true,
    italic: false,
    color: '#ffffff',
    tracking: 0,
    rotate: 0,
    blend: 'source-over',
    opacity: 100,
    bgStyle: 'solid',
    bgColor: '#000000',
    bgOpacity: 74,
    padding: 14,
  };
}

export function getOutputText(output) {
  return String(output?.text || output?.output?.text || '').trim();
}

export function applyStudioAiOutput({ output, action, mutators = {} }) {
  const text = getOutputText(output);
  if (!text) {
    return { ok: false, message: 'Aucune sortie texte exploitable.' };
  }

  if (action?.intent === 'send_to_publication' && typeof mutators.onSendToPublication === 'function') {
    mutators.onSendToPublication(text);
    return { ok: true, message: 'Texte pret pour la publication.' };
  }

  if (typeof mutators.setTexts === 'function') {
    mutators.setTexts((current = []) => {
      const nextText = createTextItem(text, current.length);
      mutators.setActiveTextId?.(nextText.id);
      return [...current, nextText];
    });
    mutators.setView?.('layout');
    return { ok: true, message: 'Texte ajoute au canvas Layout.' };
  }

  return { ok: false, message: 'Action de sortie indisponible dans cette vue.' };
}

export async function copyStudioAiOutput(output) {
  const text = getOutputText(output);
  if (!text || !navigator?.clipboard) return false;
  await navigator.clipboard.writeText(text);
  return true;
}

