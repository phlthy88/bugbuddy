// ============================================================
// Debugger Tab Component
// ============================================================

import { useCallback, useEffect } from 'react';
import { useBugBuddy } from '../../context/BugBuddyContext';
import { Button, Card, CardHeader, EmptyState } from '../UI';
import { Hypothesis } from '../../types';
import { LSPPanel } from '../LSPPanel';
import { HypothesisBoard } from '../HypothesisBoard';
import { PlanPanel } from '../PlanItemList';
import { RUBBER_DUCK_QUESTIONS } from '../../constants';

export function DebuggerTab() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <LeftColumn />
      <RightColumn />
    </div>
  );
}

// ============================================================
// Left Column
// ============================================================

function LeftColumn() {
  const {
    code,
    diagnostics,
    loadingLSP,
    runLSPDiagnostics,
    planItems,
    togglePlanItem,
    removePlanItem,
    addPlanItem,
    generatePlan,
    clearPlan,
    hypotheses,
    setHypotheses: originalSetHypotheses,
  } = useBugBuddy();

  const setHypotheses = useCallback((hypotheses: readonly Hypothesis[]) => {
    originalSetHypotheses([...hypotheses]);
  }, [originalSetHypotheses]);

  // Real-time diagnostics - run automatically when code changes significantly
  useEffect(() => {
    if (!code.trim()) return;

    // Debounce diagnostics to avoid excessive API calls
    const timeoutId = setTimeout(() => {
      // Only run if we don't already have recent diagnostics and code is substantial
      if (diagnostics.length === 0 && code.length > 50) {
        runLSPDiagnostics();
      }
    }, 2000); // 2 second delay

    return () => clearTimeout(timeoutId);
  }, [code, diagnostics.length, runLSPDiagnostics]);

  const handleAddPlanItem = useCallback(() => {
    const text = prompt('Add a plan step:');
    if (text) addPlanItem(text);
  }, [addPlanItem]);

  return (
    <div className="space-y-6">
      {/* LSP / Code Intelligence */}
      <Card>
        <CardHeader
          title="Code Intelligence"
          description="AI diagnostics powered by Gemini via OpenRouter - configure API key in Settings."
          action={
            <Button
              variant="secondary"
              onClick={runLSPDiagnostics}
              disabled={loadingLSP || !code.trim()}
              loading={loadingLSP}
            >
              {loadingLSP ? 'Analyzing...' : 'Re-analyze'}
            </Button>
          }
        />

        <div className="mt-4">
          {diagnostics.length > 0 ? (
            <LSPPanel diagnostics={diagnostics} loading={loadingLSP} />
          ) : (
            <EmptyState message='No diagnostics yet. Diagnostics will run automatically as you type, or click "Re-analyze" to scan now.' />
          )}
        </div>
      </Card>

      {/* Fix Plan */}
      <PlanPanel
        items={planItems}
        onToggle={togglePlanItem}
        onRemove={removePlanItem}
        onAdd={handleAddPlanItem}
        onGenerate={generatePlan}
        onClear={clearPlan}
      />

      {/* Hypothesis Board */}
      <HypothesisBoard hypotheses={hypotheses} setHypotheses={setHypotheses} />
    </div>
  );
}

// ============================================================
// Right Column - Rubber Duck Mode
// ============================================================

function RightColumn() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Rubber Duck Mode"
          description="Answer these to unlock the fix."
        />

        <div className="mt-4 grid gap-3">
          {RUBBER_DUCK_QUESTIONS.map((item, index) => (
            <RubberDuckQuestion
              key={index}
              question={item.question}
              hint={item.hint}
            />
          ))}
        </div>
      </Card>

      {/* Debugging Tips */}
      <Card>
        <CardHeader
          title="Debugging Checklist"
          description="Common things to verify"
        />

        <div className="mt-4 space-y-2">
          {DEBUGGING_CHECKLIST.map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-2 text-sm text-slate-300"
            >
              <span className="text-sky-400">•</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// Rubber Duck Question Card
// ============================================================

interface RubberDuckQuestionProps {
  question: string;
  hint: string;
}

function RubberDuckQuestion({ question, hint }: RubberDuckQuestionProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-3">
      <div className="text-sm font-semibold text-slate-100">{question}</div>
      <div className="mt-1 text-xs text-slate-400">{hint}</div>
    </div>
  );
}

// ============================================================
// Debugging Checklist Data
// ============================================================

const DEBUGGING_CHECKLIST = [
  'Have you checked the exact line number in the stack trace?',
  'Did you verify all method parameters for null?',
  'Are there any unchecked type casts?',
  'Is the exception from your code or a library?',
  'Have you looked at the "Caused by" chain?',
  'Can you reproduce it with a minimal test case?',
  'Are thread safety assumptions correct?',
  'Have you checked environment-specific configs?',
] as const;
