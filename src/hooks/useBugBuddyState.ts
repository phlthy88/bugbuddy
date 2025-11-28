// ============================================================
// BugBuddy Application State Hook
// ============================================================

import { useCallback, useMemo } from 'react';
import { useLocalStorageState, useToasts } from './index';
import {
  AnalysisResult,
  CodebaseAnalysis,
  Diagnostic,
  Env,
  FileSelection,
  FileTreeNode,
  Finding,
  FocusMode,
  Hypothesis,
  PlanItem,
  ProjectFile,
  Snapshot,
  TabId,
  TraceInfo,
} from '../types';
import { simpleHash, uid } from '../utils';
import { SAMPLE_DATA, DEFAULT_ENV } from '../constants';
import {
  generateDebugPlan,
  parseStackTrace,
  scanJavaHeuristics,
  findLineNumberFromTrace,
  guessBugFamily,
} from '../services/heuristics';
import { analyzeWithGemini, getLSPDiagnostics } from '../services/ai';

// Storage keys
const STORAGE_KEYS = {
  tab: 'bugbuddy_tab',
  code: 'bugbuddy_code',
  trace: 'bugbuddy_trace',
  env: 'bugbuddy_env',
  analysis: 'bugbuddy_analysis',
  plan: 'bugbuddy_plan',
  hypotheses: 'bugbuddy_hypotheses',
  history: 'bugbuddy_history',
  focus: 'bugbuddy_focus',
  importedAnalysis: 'bugbuddy_imported_analysis',
  fileTree: 'bugbuddy_file_tree',
  fileSelection: 'bugbuddy_file_selection',
  showFileSelector: 'bugbuddy_show_file_selector',
} as const;

// Max history entries
const MAX_HISTORY = 12;

export function useBugBuddyState() {
  // Core state
  const [tab, setTab] = useLocalStorageState<TabId>(STORAGE_KEYS.tab, 'analyze');
  const [code, setCode] = useLocalStorageState<string>(STORAGE_KEYS.code, SAMPLE_DATA.code);
  const [trace, setTrace] = useLocalStorageState<string>(STORAGE_KEYS.trace, SAMPLE_DATA.trace);
  const [env, setEnv] = useLocalStorageState<Env>(STORAGE_KEYS.env, DEFAULT_ENV);
  const [focus, setFocus] = useLocalStorageState<FocusMode>(STORAGE_KEYS.focus, 'auto');

  // Analysis state
  const [analysis, setAnalysis] = useLocalStorageState<AnalysisResult | null>(
    STORAGE_KEYS.analysis,
    null
  );
  const [planItems, setPlanItems] = useLocalStorageState<PlanItem[]>(STORAGE_KEYS.plan, []);
  const [hypotheses, setHypotheses] = useLocalStorageState<Hypothesis[]>(
    STORAGE_KEYS.hypotheses,
    []
  );
  const [history, setHistory] = useLocalStorageState<Snapshot[]>(STORAGE_KEYS.history, []);

  // Upload state
  const [importedAnalysis, setImportedAnalysis] = useLocalStorageState<CodebaseAnalysis | null>(
    STORAGE_KEYS.importedAnalysis,
    null
  );
  const [fileTree, setFileTree] = useLocalStorageState<readonly FileTreeNode[]>(
    STORAGE_KEYS.fileTree,
    []
  );
  const [fileSelection, setFileSelection] = useLocalStorageState<FileSelection>(
    STORAGE_KEYS.fileSelection,
    { selectedPaths: [], expandedPaths: [] }
  );
  const [showFileSelector, setShowFileSelector] = useLocalStorageState<boolean>(
    STORAGE_KEYS.showFileSelector,
    false
  );

  // Project files (shared between tabs)
  const [projectFiles, setProjectFiles] = useLocalStorageState<ProjectFile[]>(
    'bugbuddy_project_files',
    []
  );

  // Transient state (not persisted)
  const [diagnostics, setDiagnostics] = useLocalStorageState<Diagnostic[]>('bugbuddy_diagnostics', []);
  const [loadingLSP, setLoadingLSP] = useLocalStorageState('bugbuddy_loading_lsp', false);
  const [loadingAI, setLoadingAI] = useLocalStorageState('bugbuddy_loading_ai', false);
  const [loadingImport, setLoadingImport] = useLocalStorageState('bugbuddy_loading_import', false);

  // API keys (persisted)
  const [openRouterKey, setOpenRouterKey] = useLocalStorageState('bugbuddy_openrouter_key', '');

  // Toast notifications
  const toasts = useToasts(4, 5000);

  // Derived state
  const inputsHash = useMemo(
    () => simpleHash(`${code}||${trace}||${JSON.stringify(env)}||${focus}`),
    [code, trace, env, focus]
  );

  const traceInfo = useMemo<TraceInfo>(
    () => analysis?.traceInfo ?? parseStackTrace(trace),
    [analysis, trace]
  );

  const focusLine = useMemo(() => findLineNumberFromTrace(traceInfo), [traceInfo]);

  const isAnalysisStale = useMemo(
    () => analysis?.inputsHash != null && analysis.inputsHash !== inputsHash,
    [analysis, inputsHash]
  );

  const severityCounts = useMemo(() => {
    const counts = { error: 0, warn: 0, info: 0 };
    for (const finding of analysis?.findings ?? []) {
      if (finding.severity in counts) {
        counts[finding.severity]++;
      }
    }
    return counts;
  }, [analysis]);

  const planProgress = useMemo(() => {
    const total = planItems.length;
    const done = planItems.filter((p) => p.done).length;
    return { total, done, percent: total > 0 ? (done / total) * 100 : 0 };
  }, [planItems]);

  // Actions
  const runHeuristicAnalysis = useCallback(() => {
    const parsedTrace = parseStackTrace(trace);
    const { findings, family } = scanJavaHeuristics(code, parsedTrace, env);
    const debugPlan = generateDebugPlan(parsedTrace, findings);

    const result: AnalysisResult = {
      inputsHash,
      createdAt: Date.now(),
      family,
      traceInfo: parsedTrace,
      findings,
      debugPlan,
      isAiGenerated: false,
    };

    setAnalysis(result);
    toasts.push({
      tone: 'green',
      title: 'Analysis complete',
      message: `Found ${findings.length} hint(s). Bug family: ${family}.`,
    });
  }, [code, trace, env, inputsHash, setAnalysis, toasts]);

  const runAIAnalysis = useCallback(async () => {
    console.log('runAIAnalysis - Starting AI analysis with key:', openRouterKey ? `${openRouterKey.substring(0, 10)}... (${openRouterKey.length} chars)` : 'no key');
    console.log('runAIAnalysis - Key starts with sk-or-v1-:', openRouterKey?.startsWith('sk-or-v1-'));
    setLoadingAI(true);

    try {
      const parsedTrace = parseStackTrace(trace);
      const { findings, family, isAiGenerated } = await analyzeWithGemini(code, trace, env, openRouterKey);
      const debugPlan = generateDebugPlan(parsedTrace, findings);

      const result: AnalysisResult = {
        inputsHash,
        createdAt: Date.now(),
        family,
        traceInfo: parsedTrace,
        findings,
        debugPlan,
        isAiGenerated,
      };

      setAnalysis(result);
      toasts.push({
        tone: isAiGenerated ? 'green' : 'blue',
        title: isAiGenerated ? 'AI Analysis Complete' : 'Heuristic Analysis Complete',
        message: isAiGenerated
          ? `Gemini found ${findings.length} insights.`
          : `Heuristics found ${findings.length} insights (no API key configured).`,
      });
    } catch (error) {
      toasts.push({
        tone: 'red',
        title: 'AI Analysis Failed',
        message: String(error),
      });
    } finally {
      setLoadingAI(false);
    }
  }, [code, trace, env, inputsHash, openRouterKey, setAnalysis, setLoadingAI, toasts]);

  const runLSPDiagnostics = useCallback(async () => {
    if (!code.trim()) return;

    setLoadingLSP(true);
    
    try {
      const diags = await getLSPDiagnostics(code, openRouterKey);
      setDiagnostics(diags);

      if (diags.length > 0) {
        toasts.push({
          tone: 'blue',
          title: 'Diagnostics Ready',
          message: `Found ${diags.length} issues in code.`,
        });
      } else {
        toasts.push({
          tone: 'green',
          title: 'Clean Code',
          message: 'No issues found by AI LSP.',
        });
      }
    } catch (error) {
      toasts.push({
        tone: 'red',
        title: 'LSP Failed',
        message: String(error),
      });
    } finally {
      setLoadingLSP(false);
    }
  }, [code, setDiagnostics, setLoadingLSP, toasts]);

  const loadSample = useCallback(() => {
    setCode(SAMPLE_DATA.code);
    setTrace(SAMPLE_DATA.trace);
    setEnv((prev) => ({ ...prev, ...SAMPLE_DATA.env }));
    toasts.push({
      tone: 'blue',
      title: 'Sample loaded',
      message: 'Loaded a stubborn example (NPE + String ==). Run analysis.',
    });
  }, [setCode, setTrace, setEnv, toasts]);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
  }, [setAnalysis]);

  // Plan management
  const addFindingToPlan = useCallback(
    (finding: Finding) => {
      const steps = (finding.steps ?? []).slice(0, 3).map((text) => ({
        id: uid(),
        text,
        done: false,
      }));

      if (steps.length === 0) {
        toasts.push({
          tone: 'yellow',
          title: 'Nothing to add',
          message: 'This finding has no steps to add to the plan.',
        });
        return;
      }

      setPlanItems((prev) => [...steps, ...prev]);
      toasts.push({
        tone: 'green',
        title: 'Added to plan',
        message: `Added ${steps.length} step(s) from: ${finding.title}`,
      });
    },
    [setPlanItems, toasts]
  );

  const generatePlan = useCallback(() => {
    const parsedTrace = analysis?.traceInfo ?? parseStackTrace(trace);
    const findings = analysis?.findings ?? [];
    const plan = generateDebugPlan(parsedTrace, findings);
    setPlanItems(plan);
    toasts.push({
      tone: 'green',
      title: 'Plan generated',
      message: 'Fix plan generated from current analysis.',
    });
  }, [analysis, trace, setPlanItems, toasts]);

  const togglePlanItem = useCallback(
    (id: string) => {
      setPlanItems((prev) => prev.map((p) => (p.id === id ? { ...p, done: !p.done } : p)));
    },
    [setPlanItems]
  );

  const addPlanItem = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      setPlanItems((prev) => [{ id: uid(), text: text.trim(), done: false }, ...prev]);
    },
    [setPlanItems]
  );

  const removePlanItem = useCallback(
    (id: string) => {
      setPlanItems((prev) => prev.filter((p) => p.id !== id));
    },
    [setPlanItems]
  );

  const clearPlan = useCallback(() => {
    setPlanItems([]);
  }, [setPlanItems]);

  // Snapshot management
  const saveSnapshot = useCallback(() => {
    const parsedTrace = analysis?.traceInfo ?? parseStackTrace(trace);
    const title = parsedTrace.exceptionClass ?? 'Snapshot';

    const snapshot: Snapshot = {
      id: uid(),
      savedAt: Date.now(),
      title,
      inputsHash,
      env,
      trace,
      code,
      planItems,
      hypotheses,
      analysis,
    };

    setHistory((prev) => [snapshot, ...prev].slice(0, MAX_HISTORY));
    toasts.push({
      tone: 'green',
      title: 'Snapshot saved',
      message: 'Saved to local history (in this browser).',
    });
  }, [
    analysis,
    trace,
    inputsHash,
    env,
    code,
    planItems,
    hypotheses,
    setHistory,
    toasts,
  ]);

  const loadSnapshot = useCallback(
    (id: string) => {
      const snapshot = history.find((h) => h.id === id);
      if (!snapshot) return;

      setCode(snapshot.code ?? '');
      setTrace(snapshot.trace ?? '');
      setEnv(snapshot.env ?? env);
      setPlanItems([...snapshot.planItems]);
      setHypotheses([...snapshot.hypotheses]);
      setAnalysis(snapshot.analysis ?? null);
      setTab('analyze');

      toasts.push({
        tone: 'blue',
        title: 'Snapshot loaded',
        message: snapshot.title ?? 'Loaded snapshot.',
      });
    },
    [history, env, setCode, setTrace, setEnv, setPlanItems, setHypotheses, setAnalysis, setTab, toasts]
  );

  const deleteSnapshot = useCallback(
    (id: string) => {
      setHistory((prev) => prev.filter((h) => h.id !== id));
    },
    [setHistory]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  // Env updater
  const updateEnv = useCallback(
    (updates: Partial<Env>) => {
      setEnv((prev) => ({ ...prev, ...updates }));
    },
    [setEnv]
  );

  // Get bug family for display
  const bugFamily = useMemo(
    () => analysis?.family ?? guessBugFamily(traceInfo, code),
    [analysis, traceInfo, code]
  );

  return {
    // State
    tab,
    code,
    trace,
    env,
    focus,
    analysis,
    planItems,
    hypotheses,
    history,
    diagnostics,
    loadingLSP,
    loadingAI,
    loadingImport,
    importedAnalysis,
     fileTree,
     fileSelection,
     showFileSelector,
     projectFiles,
     openRouterKey,
    toasts: toasts.toasts,

    // Derived
    inputsHash,
    traceInfo,
    focusLine,
    isAnalysisStale,
    severityCounts,
    planProgress,
    bugFamily,

    // Actions
    setTab,
    setCode,
    setTrace,
    setFocus,
    updateEnv,
    setHypotheses,
    setImportedAnalysis,
    setFileTree,
     setFileSelection,
     setShowFileSelector,
     setProjectFiles,
     setOpenRouterKey,

    // Analysis
    runHeuristicAnalysis,
    runAIAnalysis,
    runLSPDiagnostics,
    setLoadingImport,
    loadSample,
    clearAnalysis,

    // Plan
    addFindingToPlan,
    generatePlan,
    togglePlanItem,
    addPlanItem,
    removePlanItem,
    clearPlan,

    // Snapshots
    saveSnapshot,
    loadSnapshot,
    deleteSnapshot,
    clearHistory,

    // Toast
    pushToast: toasts.push,
    dismissToast: toasts.dismiss,
  };
}

export type BugBuddyState = ReturnType<typeof useBugBuddyState>;
