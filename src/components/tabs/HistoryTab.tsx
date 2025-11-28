// ============================================================
// History Tab Component
// ============================================================

import { useCallback, useState } from 'react';
import { useBugBuddy } from '../../context/BugBuddyContext';
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ConfirmDialog,
  Pill,
} from '../UI';
import { Snapshot } from '../../types';
import { formatTimestamp, truncate } from '../../utils';

export function HistoryTab() {
  const { history, loadSnapshot, deleteSnapshot, clearHistory } = useBugBuddy();
  const [confirmClear, setConfirmClear] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleClearHistory = useCallback(() => {
    clearHistory();
    setConfirmClear(false);
  }, [clearHistory]);

  const handleDeleteSnapshot = useCallback(() => {
    if (deleteTarget) {
      deleteSnapshot(deleteTarget);
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteSnapshot]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader
            title="History"
            description={`${history.length} snapshot${history.length !== 1 ? 's' : ''} saved locally`}
            action={
              history.length > 0 ? (
                <Button
                  variant="secondary"
                  onClick={() => setConfirmClear(true)}
                >
                  Clear history
                </Button>
              ) : undefined
            }
          />

          <div className="mt-4 space-y-3">
            {history.length === 0 ? (
              <EmptyState
                message="No snapshots yet. Save your debugging state to come back to it later."
              />
            ) : (
              history.map((snapshot) => (
                <SnapshotCard
                  key={snapshot.id}
                  snapshot={snapshot}
                  onLoad={() => loadSnapshot(snapshot.id)}
                  onDelete={() => setDeleteTarget(snapshot.id)}
                />
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Info Panel */}
      <div className="space-y-6">
        <Card>
          <CardHeader
            title="About Snapshots"
            description="How history works in BugBuddy"
          />

          <div className="mt-4 space-y-4 text-sm text-slate-300">
            <p>
              Snapshots save your current debugging state including code, stack
              trace, environment settings, hypotheses, and fix plan.
            </p>

            <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-3">
              <div className="font-semibold text-slate-100 mb-2">
                What&apos;s saved:
              </div>
              <ul className="space-y-1 text-slate-400">
                <li>• Code snippet</li>
                <li>• Stack trace</li>
                <li>• Environment settings</li>
                <li>• Analysis results</li>
                <li>• Fix plan items</li>
                <li>• Hypotheses</li>
              </ul>
            </div>

            <div className="rounded-xl border border-amber-800/30 bg-amber-950/20 p-3">
              <div className="font-semibold text-amber-200 mb-1">
                ⚠️ Local Storage Only
              </div>
              <p className="text-amber-300/80 text-xs">
                Snapshots are stored in your browser&apos;s local storage. They
                won&apos;t sync across devices and will be lost if you clear
                browser data.
              </p>
            </div>
          </div>
        </Card>

        {/* Storage Stats */}
        <Card>
          <CardHeader title="Storage" />

          <div className="mt-4">
            <StorageStats />
          </div>
        </Card>
      </div>

      {/* Clear History Confirmation */}
      <ConfirmDialog
        isOpen={confirmClear}
        title="Clear All History"
        message="This will permanently delete all saved snapshots. This action cannot be undone."
        confirmLabel="Clear All"
        variant="danger"
        onConfirm={handleClearHistory}
        onCancel={() => setConfirmClear(false)}
      />

      {/* Delete Snapshot Confirmation */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Snapshot"
        message="Are you sure you want to delete this snapshot?"
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteSnapshot}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ============================================================
// Snapshot Card
// ============================================================

interface SnapshotCardProps {
  snapshot: Snapshot;
  onLoad: () => void;
  onDelete: () => void;
}

function SnapshotCard({ snapshot, onLoad, onDelete }: SnapshotCardProps) {
  const findingsCount = snapshot.analysis?.findings?.length ?? 0;
  const planCount = snapshot.planItems?.length ?? 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">📸</span>
            <h4 className="truncate text-sm font-semibold text-slate-100">
              {snapshot.title || 'Snapshot'}
            </h4>
          </div>

          <div className="mt-2 text-xs text-slate-400">
            Saved: {formatTimestamp(snapshot.savedAt)}
          </div>

          {/* Metadata pills */}
          <div className="mt-2 flex flex-wrap gap-1">
            {snapshot.env?.javaVersion && (
              <Pill tone="slate">Java {snapshot.env.javaVersion}</Pill>
            )}
            {findingsCount > 0 && (
              <Pill tone="blue">{findingsCount} findings</Pill>
            )}
            {planCount > 0 && <Pill tone="green">{planCount} plan items</Pill>}
          </div>

          {/* Code preview */}
          {snapshot.code && (
            <div className="mt-2 rounded-lg bg-slate-900/50 p-2 text-xs font-mono text-slate-500 overflow-hidden">
              {truncate(snapshot.code.split('\n')[0] || '', 50)}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button variant="primary" size="sm" onClick={onLoad}>
            Load
          </Button>
          <Button variant="danger" size="sm" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Storage Stats
// ============================================================

function StorageStats() {
  const getStorageSize = () => {
    try {
      let total = 0;
      for (const key in localStorage) {
        if (key.startsWith('bugbuddy_')) {
          total += localStorage.getItem(key)?.length || 0;
        }
      }
      return total;
    } catch {
      return 0;
    }
  };

  const bytes = getStorageSize();
  const kb = (bytes / 1024).toFixed(1);
  const maxKb = 5120; // ~5MB typical localStorage limit
  const percent = Math.min((bytes / 1024 / maxKb) * 100, 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">BugBuddy Storage</span>
        <span className="text-slate-200">{kb} KB</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-sky-500 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="text-xs text-slate-500">
        {percent.toFixed(1)}% of estimated browser limit (~5MB)
      </div>
    </div>
  );
}
