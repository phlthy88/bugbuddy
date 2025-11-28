// ============================================================
// Resolver Tab Component
// ============================================================

import { useCallback } from 'react';
import { useBugBuddy } from '../../context/BugBuddyContext';
import { Button, Card, CardHeader, EmptyState, Progress } from '../UI';
import { PlanItemList } from '../PlanItemList';
import { AISnippetHelper } from '../AISnippetHelper';
import { CODE_SNIPPETS } from '../../constants';
import { copyToClipboard } from '../../utils';

export function ResolverTab() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ResolverPlanView />
      <QuickSnippets />
    </div>
  );
}

// ============================================================
// Resolver Plan View
// ============================================================

function ResolverPlanView() {
  const { planItems, planProgress, togglePlanItem, removePlanItem } =
    useBugBuddy();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Resolver View" />

        <div className="mt-4">
          {planItems.length === 0 ? (
            <EmptyState message="No plan steps yet. Generate a plan from the Debugger tab." />
          ) : (
            <>
              <Progress value={planProgress.done} max={planProgress.total} />
              <div className="mt-3">
                <PlanItemList
                  items={planItems}
                  onToggle={togglePlanItem}
                  onRemove={removePlanItem}
                  variant="detailed"
                  showActions={false}
                />
              </div>

              {/* Completion message */}
              {planProgress.done === planProgress.total &&
                planProgress.total > 0 && (
                  <div className="mt-4 rounded-xl border border-emerald-800/50 bg-emerald-950/30 p-4 text-center">
                    <div className="text-2xl mb-2">🎉</div>
                    <div className="text-sm font-semibold text-emerald-200">
                      All steps completed!
                    </div>
                    <div className="mt-1 text-xs text-emerald-400">
                      Time to test your fix and celebrate.
                    </div>
                  </div>
                )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// Quick Snippets Panel
// ============================================================

function QuickSnippets() {
  const { pushToast, code, setCode } = useBugBuddy();

  const handleCopy = useCallback(
    async (title: string, code: string) => {
      const success = await copyToClipboard(code);
      pushToast({
        tone: success ? 'green' : 'red',
        title: success ? 'Copied' : 'Copy failed',
        message: success ? `${title} snippet copied.` : 'Clipboard blocked.',
      });
    },
    [pushToast]
  );

  const handleInsertSnippet = useCallback((snippet: string) => {
    // Insert at cursor position or append to code
    const newCode = code + (code.endsWith('\n') ? '' : '\n') + snippet;
    setCode(newCode);
  }, [code, setCode]);

  return (
    <div className="space-y-6">
      {/* AI Snippet Helper */}
      <AISnippetHelper onInsertSnippet={handleInsertSnippet} />

      <Card>
        <CardHeader
          title="Quick Snippets"
          description="Common patterns for fixing Java bugs"
        />

        <div className="mt-4 space-y-3">
          {CODE_SNIPPETS.map((snippet, index) => (
            <SnippetCard
              key={index}
              title={snippet.title}
              code={snippet.code}
              onCopy={() => handleCopy(snippet.title, snippet.code)}
            />
          ))}
        </div>
      </Card>

      {/* Additional Resources */}
      <Card>
        <CardHeader
          title="Resources"
          description="External references for common issues"
        />

        <div className="mt-4 space-y-2">
          {RESOURCES.map((resource, index) => (
            <a
              key={index}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/20 p-3 text-sm text-slate-300 hover:bg-slate-800/50 hover:text-sky-300 transition-colors"
            >
              <span className="text-sky-400">{resource.icon}</span>
              <span>{resource.title}</span>
              <span className="ml-auto text-slate-500">↗</span>
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// Snippet Card
// ============================================================

interface SnippetCardProps {
  title: string;
  code: string;
  onCopy: () => void;
}

function SnippetCard({ title, code, onCopy }: SnippetCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-100">{title}</div>
        <Button variant="secondary" size="sm" onClick={onCopy}>
          Copy
        </Button>
      </div>
      <pre className="mt-2 overflow-auto rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-200 font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ============================================================
// Resources Data
// ============================================================

const RESOURCES = [
  {
    icon: '📚',
    title: 'Java NullPointerException Guide',
    url: 'https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/NullPointerException.html',
  },
  {
    icon: '🔍',
    title: 'Effective Java - Exception Handling',
    url: 'https://www.oracle.com/technical-resources/articles/java/effective-exceptions.html',
  },
  {
    icon: '🛠️',
    title: 'IntelliJ Debugging Guide',
    url: 'https://www.jetbrains.com/help/idea/debugging-code.html',
  },
  {
    icon: '📖',
    title: 'Stack Overflow - Common Java Errors',
    url: 'https://stackoverflow.com/questions/tagged/java+exception',
  },
] as const;
