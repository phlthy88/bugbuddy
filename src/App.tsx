// ============================================================
// BugBuddy - Refactored Main Application
// ============================================================

import React, { useCallback, useState } from 'react';
import { BugBuddyProvider, useBugBuddy } from './context/BugBuddyContext';
import { Button, Pill, ConfirmDialog } from './components/UI';
import { Toasts } from './components/Toasts';
import { AnalyzeTab } from './components/tabs/AnalyzeTab';
import { DebuggerTab } from './components/tabs/DebuggerTab';
import { TerminalTab } from './components/tabs/TerminalTab';
import { ResolverTab } from './components/tabs/ResolverTab';
import { HistoryTab } from './components/tabs/HistoryTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { TABS, TabId } from './types';
import { cx, copyToClipboard, formatKVPairs, nowISO } from './utils';

// ============================================================
// Header Component
// ============================================================

function Header() {
  const {
    tab,
    setTab,
    analysis,
    planProgress,
    history,
    severityCounts,
    isAnalysisStale,
    loadSample,
    saveSnapshot,
    runHeuristicAnalysis,
    pushToast,
    code,
    trace,
    env,
  } = useBugBuddy();

  const [confirmReset, setConfirmReset] = useState(false);

  const handleCopyReport = useCallback(async () => {
    const findings = analysis?.findings ?? [];
    const markdown = [
      '# BugBuddy Report',
      `Generated: ${nowISO()}`,
      '',
      '## Environment',
      '```',
      formatKVPairs(env),
      '```',
      '',
      '## Stack trace',
      '```',
      trace,
      '```',
      '',
      '## Findings',
      findings
        .map((f) => `- [${f.severity}] ${f.title}: ${f.summary}`)
        .join('\n'),
      '',
      '## Code',
      '```java',
      code,
      '```',
    ].join('\n');

    const success = await copyToClipboard(markdown);
    pushToast({
      tone: success ? 'green' : 'red',
      title: success ? 'Copied' : 'Copy failed',
      message: success
        ? 'Markdown report copied to clipboard.'
        : 'Clipboard access was blocked by the browser.',
    });
  }, [analysis, code, trace, env, pushToast]);

  const handleReset = useCallback(() => {
    localStorage.clear();
    window.location.reload();
  }, []);

  const tabCounts: Record<TabId, number | null> = {
    analyze: analysis?.findings?.length ?? null,
    debugger: null,
    terminal: null,
    resolver: planProgress.total > 0 ? planProgress.done : null,
    history: history.length || null,
    settings: null,
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/70 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        {/* Logo / Brand */}
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 shadow-soft text-2xl"
              role="img"
              aria-label="BugBuddy logo"
            >
              🐞
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold tracking-tight">
                BugBuddy
              </h1>
              <p className="truncate text-xs text-slate-400">
                Java analyzer • debugger coach • resolver (offline-friendly)
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="secondary"
            onClick={loadSample}
            title="Load a demo bug"
          >
            Load sample
          </Button>
          <Button
            variant="secondary"
            onClick={saveSnapshot}
            title="Save the current state to history"
          >
            Save snapshot
          </Button>
          <Button
            variant="secondary"
            onClick={handleCopyReport}
            title="Copy a Markdown debugging report"
          >
            Copy report
          </Button>
          <Button
            variant="primary"
            onClick={runHeuristicAnalysis}
            title="Run the heuristic analyzer"
          >
            Analyze (Local)
          </Button>
          <Button
            variant="danger"
            onClick={() => setConfirmReset(true)}
            title="Reset everything (clears local storage)"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <nav className="mx-auto max-w-7xl px-4 pb-3" aria-label="Main navigation">
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cx(
                'rounded-xl px-3 py-2 text-sm font-semibold transition capitalize',
                tab === t
                  ? 'bg-sky-500 text-slate-950'
                  : 'bg-slate-900/30 text-slate-200 hover:bg-slate-900'
              )}
              aria-current={tab === t ? 'page' : undefined}
            >
              {t}
              {tabCounts[t] != null && (
                <span className="ml-2 text-xs opacity-80">
                  {t === 'resolver'
                    ? `(${planProgress.done}/${planProgress.total})`
                    : `(${tabCounts[t]})`}
                </span>
              )}
            </button>
          ))}

          {/* Status Pills */}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Pill tone={severityCounts.error ? 'red' : 'slate'}>
              Errors: {severityCounts.error}
            </Pill>
            <Pill tone={severityCounts.warn ? 'yellow' : 'slate'}>
              Warnings: {severityCounts.warn}
            </Pill>
            <Pill tone="blue">Info: {severityCounts.info}</Pill>
            {isAnalysisStale && (
              <Pill tone="yellow">Inputs changed — re-run analysis</Pill>
            )}
          </div>
        </div>
      </nav>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmReset}
        title="Reset BugBuddy"
        message="This will clear all code, traces, plans, and history. This action cannot be undone."
        confirmLabel="Reset Everything"
        variant="danger"
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />
    </header>
  );
}

// ============================================================
// Main Content Router
// ============================================================

function MainContent() {
  const { tab } = useBugBuddy();

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      {tab === 'analyze' && <AnalyzeTab />}
      {tab === 'debugger' && <DebuggerTab />}
      {tab === 'terminal' && <TerminalTab />}
      {tab === 'resolver' && <ResolverTab />}
      {tab === 'history' && <HistoryTab />}
      {tab === 'settings' && <SettingsTab />}
    </main>
  );
}

// ============================================================
// Footer Component
// ============================================================

function Footer() {
  return (
    <footer className="mx-auto max-w-7xl px-4 pb-6">
      <div className="border-t border-slate-800 pt-6 text-sm text-slate-400">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-slate-300">BugBuddy</span> —
            friendly Java bug analysis & debugging workflow.
          </div>
          <div className="text-xs">
            Heuristics only • No code execution • Stored locally
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============================================================
// Toast Container
// ============================================================

function ToastContainer() {
  const { toasts, dismissToast } = useBugBuddy();
  return <Toasts toasts={toasts} onDismiss={dismissToast} />;
}

// ============================================================
// App Shell (Inside Provider)
// ============================================================

function AppShell() {
  return (
    <div className="min-h-screen font-sans">
      <div className="grid-bg min-h-screen flex flex-col">
        <Header />
        <div className="flex-1">
          <MainContent />
        </div>
        <Footer />
        <ToastContainer />
      </div>
    </div>
  );
}

// ============================================================
// Error Boundary
// ============================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('BugBuddy Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen grid-bg flex items-center justify-center p-4">
          <div className="max-w-md rounded-2xl border border-red-800 bg-slate-950 p-6 text-center">
            <div className="text-4xl mb-4">💥</div>
            <h1 className="text-xl font-bold text-red-400 mb-2">
              BugBuddy Crashed
            </h1>
            <p className="text-sm text-slate-400 mb-4">
              Ironic, isn't it? The bug debugger has a bug.
            </p>
            <pre className="mb-4 overflow-auto rounded-xl bg-slate-900 p-3 text-xs text-red-300 text-left">
              {this.state.error?.message}
            </pre>
            <Button
              variant="primary"
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
            >
              Reset & Reload
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================
// Main App Export
// ============================================================

export default function App() {
  return (
    <ErrorBoundary>
      <BugBuddyProvider>
        <AppShell />
      </BugBuddyProvider>
    </ErrorBoundary>
  );
}
