// ============================================================
// Hypothesis Board Component
// ============================================================

import { useCallback, useState } from 'react';
import { Hypothesis } from '../types';
import { Button, Card, CardHeader, EmptyState } from './UI';

interface HypothesisBoardProps {
  hypotheses: readonly Hypothesis[];
  setHypotheses: (hypotheses: readonly Hypothesis[]) => void;
}

export function HypothesisBoard({ hypotheses, setHypotheses }: HypothesisBoardProps) {
  const [newHypothesisText, setNewHypothesisText] = useState('');

  const addHypothesis = useCallback(() => {
    if (!newHypothesisText.trim()) return;

    const newHypothesis: Hypothesis = {
      id: `hyp_${Date.now()}`,
      text: newHypothesisText.trim(),
      status: 'untested',
      notes: '',
    };

    setHypotheses([...hypotheses, newHypothesis]);
    setNewHypothesisText('');
  }, [newHypothesisText, hypotheses, setHypotheses]);

  const updateHypothesis = useCallback((id: string, updates: Partial<Hypothesis>) => {
    setHypotheses(
      hypotheses.map(h => h.id === id ? { ...h, ...updates } : h)
    );
  }, [hypotheses, setHypotheses]);

  const removeHypothesis = useCallback((id: string) => {
    setHypotheses(hypotheses.filter(h => h.id !== id));
  }, [hypotheses, setHypotheses]);

  return (
    <Card>
      <CardHeader
        title="Hypothesis Board"
        description="Track and test your debugging hypotheses."
        action={
          <Button
            variant="secondary"
            onClick={() => setHypotheses([])}
            disabled={hypotheses.length === 0}
          >
            Clear All
          </Button>
        }
      />

      <div className="mt-4 space-y-3">
        {hypotheses.length === 0 ? (
          <EmptyState message="No hypotheses yet. Add one to start tracking your debugging theories." />
        ) : (
          hypotheses.map(hypothesis => (
            <HypothesisItem
              key={hypothesis.id}
              hypothesis={hypothesis}
              onUpdate={updateHypothesis}
              onRemove={removeHypothesis}
            />
          ))
        )}

        {/* Add new hypothesis */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newHypothesisText}
            onChange={(e) => setNewHypothesisText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addHypothesis()}
            placeholder="Enter a hypothesis..."
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <Button
            variant="primary"
            onClick={addHypothesis}
            disabled={!newHypothesisText.trim()}
          >
            Add
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ============================================================
// Individual Hypothesis Item
// ============================================================

interface HypothesisItemProps {
  hypothesis: Hypothesis;
  onUpdate: (id: string, updates: Partial<Hypothesis>) => void;
  onRemove: (id: string) => void;
}

function HypothesisItem({ hypothesis, onUpdate, onRemove }: HypothesisItemProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(hypothesis.text);
  const [editNotes, setEditNotes] = useState(hypothesis.notes);

  const saveEdits = useCallback(() => {
    onUpdate(hypothesis.id, {
      text: editText.trim(),
      notes: editNotes.trim(),
    });
    setEditing(false);
  }, [hypothesis.id, editText, editNotes, onUpdate]);

  const cancelEdits = useCallback(() => {
    setEditText(hypothesis.text);
    setEditNotes(hypothesis.notes);
    setEditing(false);
  }, [hypothesis.text, hypothesis.notes]);

  const statusColors = {
    untested: 'bg-slate-600',
    confirmed: 'bg-green-600',
    disproven: 'bg-red-600',
  };

  if (editing) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
        <div className="space-y-3">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Notes..."
            rows={2}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={cancelEdits}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={saveEdits}>
              Save
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-slate-200 font-medium">{hypothesis.text}</div>
          {hypothesis.notes && (
            <div className="mt-1 text-xs text-slate-400">{hypothesis.notes}</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={hypothesis.status}
            onChange={(e) => onUpdate(hypothesis.id, { status: e.target.value as Hypothesis['status'] })}
            className={`px-2 py-1 text-xs font-medium rounded ${statusColors[hypothesis.status]} text-white border-0 focus:outline-none focus:ring-2 focus:ring-sky-500`}
          >
            <option value="untested">Untested</option>
            <option value="confirmed">Confirmed</option>
            <option value="disproven">Disproven</option>
          </select>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
            className="text-slate-400 hover:text-slate-200"
          >
            ✏️
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(hypothesis.id)}
            className="text-slate-400 hover:text-red-400"
          >
            🗑️
          </Button>
        </div>
      </div>
    </div>
  );
}