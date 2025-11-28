// ============================================================
// Plan Item List - Shared Component
// ============================================================

import { useCallback, useId } from 'react';
import { PlanItem } from '../types';
import { Button, Progress, EmptyState, Card, CardHeader } from './UI';
import { cx } from '../utils';

interface PlanItemListProps {
  items: readonly PlanItem[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd?: () => void;
  onGenerate?: () => void;
  onClear?: () => void;
  variant?: 'compact' | 'detailed';
  showActions?: boolean;
  emptyMessage?: string;
}

export function PlanItemList({
  items,
  onToggle,
  onRemove,
  onAdd,
  onGenerate,
  onClear,
  variant = 'compact',
  showActions = true,
  emptyMessage = 'No plan steps yet.',
}: PlanItemListProps) {
  const doneCount = items.filter((p) => p.done).length;

  if (items.length === 0) {
    return (
      <EmptyState
        message={emptyMessage}
        action={
          showActions && onGenerate ? (
            <Button variant="secondary" onClick={onGenerate}>
              Generate Plan
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <Progress value={doneCount} max={items.length} />

      <div className="space-y-2">
        {items.map((item) => (
          <PlanItemRow
            key={item.id}
            item={item}
            onToggle={onToggle}
            onRemove={onRemove}
            variant={variant}
          />
        ))}
      </div>

      {showActions && (
        <div className="flex flex-wrap gap-2 pt-2">
          {onAdd && (
            <Button variant="secondary" onClick={onAdd}>
              Add step
            </Button>
          )}
          {onClear && items.length > 0 && (
            <Button variant="subtle" onClick={onClear}>
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Individual Plan Item Row
// ============================================================

interface PlanItemRowProps {
  item: PlanItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  variant: 'compact' | 'detailed';
}

function PlanItemRow({ item, onToggle, onRemove, variant }: PlanItemRowProps) {
  const checkboxId = useId();

  const handleToggle = useCallback(() => {
    onToggle(item.id);
  }, [item.id, onToggle]);

  const handleRemove = useCallback(() => {
    onRemove(item.id);
  }, [item.id, onRemove]);

  if (variant === 'detailed') {
    return (
      <div
        className={cx(
          'rounded-xl border p-3 transition-colors',
          item.done
            ? 'border-emerald-800/40 bg-emerald-950/20'
            : 'border-slate-800 bg-slate-950/50'
        )}
      >
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id={checkboxId}
            checked={item.done}
            onChange={handleToggle}
            className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500/50"
            aria-label={`Mark "${item.text}" as ${item.done ? 'incomplete' : 'complete'}`}
          />
          <label
            htmlFor={checkboxId}
            className={cx(
              'flex-1 cursor-pointer text-sm font-semibold',
              item.done ? 'text-emerald-200 line-through' : 'text-slate-100'
            )}
          >
            {item.text}
          </label>
        </div>
      </div>
    );
  }

  // Compact variant
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <input
        type="checkbox"
        id={checkboxId}
        checked={item.done}
        onChange={handleToggle}
        className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500/50"
        aria-label={`Mark "${item.text}" as ${item.done ? 'incomplete' : 'complete'}`}
      />
      <label
        htmlFor={checkboxId}
        className={cx(
          'flex-1 cursor-pointer text-sm',
          item.done ? 'text-slate-400 line-through' : 'text-slate-200'
        )}
      >
        {item.text}
      </label>
      <Button
        variant="subtle"
        size="sm"
        onClick={handleRemove}
        title="Remove step"
        aria-label={`Remove "${item.text}"`}
      >
        ✕
      </Button>
    </div>
  );
}

// ============================================================
// Plan Panel - Full card with header
// ============================================================

interface PlanPanelProps {
  title?: string;
  description?: string;
  items: readonly PlanItem[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  onGenerate: () => void;
  onClear: () => void;
  variant?: 'compact' | 'detailed';
}

export function PlanPanel({
  title = 'Active Fix Plan',
  description,
  items,
  onToggle,
  onRemove,
  onAdd,
  onGenerate,
  onClear,
  variant = 'compact',
}: PlanPanelProps) {
  return (
    <Card>
      <CardHeader
        title={title}
        description={description}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onGenerate}>
              Generate
            </Button>
            <Button variant="secondary" onClick={onClear}>
              Clear
            </Button>
          </div>
        }
      />

      <div className="mt-4">
        <PlanItemList
          items={items}
          onToggle={onToggle}
          onRemove={onRemove}
          onAdd={onAdd}
          variant={variant}
          showActions={true}
          emptyMessage='No plan yet. Use "Generate" or add steps from findings.'
        />
      </div>
    </Card>
  );
}
