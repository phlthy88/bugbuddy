// ============================================================
// FindingCard Component - Displays analysis findings
// ============================================================

import { Card } from './UI';
import { Pill, Button } from './UI';
import { Finding } from '../types';

function humanConfidence(x: number) {
  const p = Math.round(Math.max(0, Math.min(1, x)) * 100);
  if (p >= 85) return { label: 'High', pct: p };
  if (p >= 60) return { label: 'Medium', pct: p };
  if (p >= 35) return { label: 'Low', pct: p };
  return { label: 'Very low', pct: p };
}

interface FindingCardProps {
  finding: Finding;
  onAddToPlan?: (finding: Finding) => void;
}

export function FindingCard({ finding, onAddToPlan }: FindingCardProps) {
  const conf = humanConfidence(finding.confidence);

  const getSeverityTone = (severity: string) => {
    switch (severity) {
      case 'error': return 'red';
      case 'warn': return 'yellow';
      default: return 'blue';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'error': return 'High';
      case 'warn': return 'Medium';
      default: return 'Low';
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={getSeverityTone(finding.severity)}>
              {getSeverityLabel(finding.severity)}
            </Pill>
            <div className="truncate text-base font-semibold">{finding.title}</div>
          </div>
          <div className="mt-1 text-sm text-slate-300">{finding.summary}</div>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone="slate">Confidence: {conf.label} ({conf.pct}%)</Pill>
          {onAddToPlan && (
            <Button
              variant="secondary"
              onClick={() => onAddToPlan(finding)}
              title="Add top steps to your fix plan"
            >
              + Plan
            </Button>
          )}
        </div>
      </div>

      {finding.whyPersistent && (
        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/20 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Why this bug persists
          </div>
          <div className="mt-1 text-sm text-slate-200">{finding.whyPersistent}</div>
        </div>
      )}

      {finding.steps?.length ? (
        <div className="mt-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            What to do next
          </div>
          <ul className="mt-2 space-y-2">
            {finding.steps.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-200">
                <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-lg border border-slate-800 bg-slate-900/30 text-xs text-slate-300">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {finding.snippet && (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Snippet
            </div>
          </div>
          <pre className="mt-2 overflow-auto rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-200">
            <code>{finding.snippet}</code>
          </pre>
        </div>
      )}

      {finding.tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {finding.tags.map(tag => (
            <Pill key={tag} tone="slate">
              #{tag}
            </Pill>
          ))}
        </div>
      ) : null}
    </Card>
  );
}