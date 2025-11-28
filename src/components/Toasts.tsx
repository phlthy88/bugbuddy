// ============================================================
// Toasts Component - Notification system
// ============================================================

import { cx } from '../utils';

interface Toast {
  id: string;
  tone: 'green' | 'red' | 'yellow' | 'blue' | 'slate';
  title: string;
  message: string;
}

interface Toast {
  id: string;
  tone: 'green' | 'red' | 'yellow' | 'blue' | 'slate';
  title: string;
  message: string;
}

interface ToastsProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function Toasts({ toasts, onDismiss }: ToastsProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[min(92vw,420px)] flex-col gap-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={cx(
            'rounded-2xl border p-3 shadow-soft backdrop-blur',
            toast.tone === 'green'
              ? 'border-emerald-800/60 bg-emerald-950/70'
              : toast.tone === 'red'
              ? 'border-rose-800/60 bg-rose-950/70'
              : toast.tone === 'yellow'
              ? 'border-amber-800/60 bg-amber-950/70'
              : 'border-slate-800 bg-slate-950/70'
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="text-sm font-semibold">{toast.title}</div>
              {toast.message && (
                <div className="mt-1 text-sm text-slate-200/90">{toast.message}</div>
              )}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="rounded-lg border border-slate-800 bg-slate-900/40 px-2 py-1 text-xs text-slate-200 hover:bg-slate-900"
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}