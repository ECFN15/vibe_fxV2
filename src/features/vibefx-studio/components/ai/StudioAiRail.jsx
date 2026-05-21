import React, { useMemo } from 'react';
import { Sparkles, X } from 'lucide-react';
import AiActionCard from './AiActionCard';
import AiCreditMeter from './AiCreditMeter';
import AiJobTrace from './AiJobTrace';
import AiOutputPicker from './AiOutputPicker';
import AiPromptComposer from './AiPromptComposer';
import { getStudioAiActions, getStudioAiAgentName } from '../../ai/studioAiActions';
import { applyStudioAiOutput } from '../../ai/studioAiAdapters';
import { buildContextChips, getPolicyLabel, getViewLabel } from '../../ai/studioAiPayloads';
import { useStudioAiState } from '../../ai/studioAiState';

function getDisabledReason(action, context) {
  if (action.requiresImage && !context.hasImage) return 'Image requise';
  if (action.requiresVideo && !context.hasVideo) return 'Video requise';
  return '';
}

export default function StudioAiRail({
  open,
  onClose,
  view,
  context,
  mutators,
}) {
  const actions = useMemo(() => getStudioAiActions(view), [view]);
  const agentName = getStudioAiAgentName(view);
  const chips = useMemo(() => buildContextChips(context), [context]);
  const ai = useStudioAiState({ context });
  const selectedStateAction = ai.selectedAction;
  const selectAction = ai.selectAction;
  const selectedAction = selectedStateAction || actions[0];
  const busy = ['estimate', 'queued', 'running'].includes(ai.job.status);

  React.useEffect(() => {
    if (actions[0] && (!selectedStateAction || !actions.some(action => action.id === selectedStateAction?.id))) {
      selectAction(actions[0]);
    }
  }, [actions, selectedStateAction, selectAction]);

  const estimatedCredits = selectedAction?.credits || 0;
  const runtimeWarning = ai.runtime.ready ? '' : ai.runtime.reason;

  const handleApply = () => applyStudioAiOutput({
    output: ai.job.output,
    action: selectedAction,
    mutators,
  });

  return (
    <aside
      className="vf-ai-rail"
      data-open={open ? 'true' : 'false'}
      data-testid="studio-ai-rail"
      aria-hidden={!open}
    >
      <div className="vf-ai-rail__panel">
        <header className="vf-ai-rail__header">
          <div>
            <p>Agent IA</p>
            <h2>
              <Sparkles size={15} />
              {agentName}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer le rail IA">
            <X size={15} />
          </button>
        </header>

        <div className="vf-ai-context">
          <span className="vf-ai-pill" data-tone="info">{getViewLabel(view)}</span>
          {chips.map(chip => (
            <span key={chip.id} className="vf-ai-pill" data-tone={chip.tone}>{chip.label}</span>
          ))}
        </div>

        <AiCreditMeter runtime={ai.runtime} estimatedCredits={estimatedCredits} />
        {runtimeWarning && <p className="vf-ai-runtime-warning">{runtimeWarning}</p>}

        <section className="vf-ai-section">
          <div className="vf-ai-section__title">
            <span>Actions contextuelles</span>
            <b>{actions.length}</b>
          </div>
          <div className="vf-ai-actions">
            {actions.map(action => (
              <AiActionCard
                key={action.id}
                action={action}
                active={selectedAction?.id === action.id}
                disabledReason={getDisabledReason(action, context)}
                onSelect={ai.selectAction}
              />
            ))}
          </div>
        </section>

        <section className="vf-ai-estimate" data-testid="studio-ai-estimate">
          <div>
            <span>Cout estime</span>
            <strong>{estimatedCredits} credits</strong>
          </div>
          <div>
            <span>Policy</span>
            <strong>{getPolicyLabel(selectedAction || {})}</strong>
          </div>
          <div>
            <span>Sortie</span>
            <strong>{selectedAction?.output || 'Canvas'}</strong>
          </div>
        </section>

        <AiPromptComposer
          prompt={ai.prompt}
          setPrompt={ai.setPrompt}
          selectedAction={selectedAction}
          quality={ai.quality}
          setQuality={ai.setQuality}
          durationSeconds={ai.durationSeconds}
          setDurationSeconds={ai.setDurationSeconds}
          onRun={ai.runAction}
          busy={busy}
        />

        <AiJobTrace job={ai.job} />
        <AiOutputPicker action={selectedAction} output={ai.job.output} onApply={handleApply} />
      </div>
    </aside>
  );
}
