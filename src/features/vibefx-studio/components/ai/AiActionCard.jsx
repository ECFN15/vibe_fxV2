import React from 'react';
import { Clock3, LockKeyhole, Sparkles } from 'lucide-react';

export default function AiActionCard({ action, active, disabledReason, onSelect }) {
  return (
    <button
      type="button"
      data-testid={`studio-ai-action-${action.id}`}
      data-active={active ? 'true' : 'false'}
      className="vf-ai-action-card"
      onClick={() => onSelect(action)}
      title={disabledReason || action.label}
    >
      <span className="vf-ai-action-card__top">
        <span className="vf-ai-action-card__agent">
          <Sparkles size={11} />
          {action.agent}
        </span>
        {action.productionBlocked && (
          <span className="vf-ai-pill" data-tone="warning">
            <LockKeyhole size={10} />
            beta
          </span>
        )}
      </span>
      <strong>{action.label}</strong>
      <span className="vf-ai-action-card__meta">
        <span>{action.output}</span>
        <span>
          <Clock3 size={10} />
          {action.duration}
        </span>
      </span>
      <span className="vf-ai-action-card__cost">{action.credits} credits estimes</span>
      {disabledReason && <span className="vf-ai-action-card__warning">{disabledReason}</span>}
      {action.warning && <span className="vf-ai-action-card__warning">{action.warning}</span>}
    </button>
  );
}

