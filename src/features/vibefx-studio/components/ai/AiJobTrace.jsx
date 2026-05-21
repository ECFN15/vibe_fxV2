import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, CircleDot, RotateCcw } from 'lucide-react';

function StepIcon({ status }) {
  if (status === 'done') return <CheckCircle2 size={11} />;
  if (status === 'current') return <CircleDot size={11} />;
  return <RotateCcw size={11} />;
}

export default function AiJobTrace({ job }) {
  const meta = job?.meta || {};
  return (
    <section className="vf-ai-trace" data-testid="studio-ai-job-trace" data-status={job.status}>
      <header>
        <span>
          <Activity size={13} />
          Job trace
        </span>
        <strong>{job.status}</strong>
      </header>
      <div className="vf-ai-trace__steps">
        {(job.trace || []).map(step => (
          <div key={step.id} className="vf-ai-trace__step" data-step-state={step.status}>
            <StepIcon status={step.status} />
            <span>{step.label}</span>
          </div>
        ))}
      </div>
      <div className="vf-ai-trace__meta">
        <span>Feature</span><b>{meta.feature || 'draft'}</b>
        <span>Provider</span><b>{meta.provider || 'server policy'}</b>
        <span>Modele</span><b>{meta.model || 'server-selected'}</b>
        <span>Credits</span><b>{meta.creditsCharged ?? 'estime'}</b>
      </div>
      {job.error && (
        <p className="vf-ai-trace__error" data-testid="studio-ai-error">
          <AlertTriangle size={12} />
          {job.error}
        </p>
      )}
    </section>
  );
}

