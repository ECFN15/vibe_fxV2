import React from 'react';
import { Play, SlidersHorizontal } from 'lucide-react';

export default function AiPromptComposer({
  prompt,
  setPrompt,
  selectedAction,
  quality,
  setQuality,
  durationSeconds,
  setDurationSeconds,
  onRun,
  busy,
}) {
  const durations = selectedAction?.videoDurations || [4, 6, 8];
  const isVideoAction = selectedAction?.type === 'video';

  return (
    <form
      className="vf-ai-composer"
      data-testid="studio-ai-prompt-form"
      onSubmit={(event) => {
        event.preventDefault();
        onRun();
      }}
    >
      <label className="vf-ai-label" htmlFor="studio-ai-prompt">Prompt</label>
      <textarea
        id="studio-ai-prompt"
        data-testid="studio-ai-prompt"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="Decris le resultat attendu..."
        rows={4}
      />

      <div className="vf-ai-options">
        <label>
          <span>
            <SlidersHorizontal size={11} />
            Qualite
          </span>
          <select value={quality} onChange={(event) => setQuality(event.target.value)}>
            <option value="draft">Draft</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
          </select>
        </label>
        {isVideoAction && (
          <label>
            <span>Duree</span>
            <select value={durationSeconds} onChange={(event) => setDurationSeconds(Number(event.target.value))}>
              {durations.map(duration => (
                <option key={duration} value={duration}>{duration}s</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <button
        type="submit"
        data-testid="studio-ai-run"
        disabled={busy || !selectedAction}
        className="vf-ai-run"
      >
        <Play size={13} />
        {busy ? 'Execution...' : 'Lancer via Functions'}
      </button>
    </form>
  );
}

