// ============================================================
// BugBuddy Type Definitions
// ============================================================

// Tab navigation
export const TABS = ['analyze', 'debugger', 'terminal', 'resolver', 'history', 'settings'] as const;
export type TabId = (typeof TABS)[number];

// Severity levels
export const SEVERITIES = ['error', 'warn', 'info'] as const;
export type Severity = (typeof SEVERITIES)[number];

// Toast tones
export const TOAST_TONES = ['green', 'red', 'yellow', 'blue', 'slate'] as const;
export type ToastTone = (typeof TOAST_TONES)[number];

// Focus modes for analysis
export const FOCUS_MODES = ['auto', 'npe', 'deps', 'concurrency', 'perf', 'tests'] as const;
export type FocusMode = (typeof FOCUS_MODES)[number];

// Environment configuration
export interface Env {
  readonly javaVersion: string;
  readonly buildTool: string;
  readonly framework: string;
  readonly runtime: string;
  readonly notes: string;
  [key: string]: unknown;
}

// Stack trace frame
export interface StackFrame {
  readonly cls: string;
  readonly method: string;
  readonly file: string;
  readonly line: number | null;
  readonly raw: string;
}

// Parsed trace information
export interface TraceInfo {
  readonly raw: string;
  readonly exceptionClass: string;
  readonly message: string;
  readonly frames: readonly StackFrame[];
  readonly primaryFrame: StackFrame | null;
}

// Analysis finding
export interface Finding {
  readonly id: string;
  readonly severity: Severity;
  readonly title: string;
  readonly summary: string;
  readonly confidence: number;
  readonly whyPersistent: string;
  readonly steps: readonly string[];
  readonly snippet: string;
  readonly tags: readonly string[];
}

// Full analysis result
export interface AnalysisResult {
  readonly inputsHash: string;
  readonly createdAt: number;
  readonly family: string;
  readonly traceInfo: TraceInfo;
  readonly findings: readonly Finding[];
  readonly debugPlan: readonly PlanItem[];
  readonly isAiGenerated: boolean;
}

// Plan item for fix workflow
export interface PlanItem {
  readonly id: string;
  readonly text: string;
  readonly done: boolean;
}

// Hypothesis for debugging
export interface Hypothesis {
  readonly id: string;
  readonly text: string;
  readonly status: 'untested' | 'confirmed' | 'disproven';
  readonly notes: string;
}

// Snapshot for history
export interface Snapshot {
  readonly id: string;
  readonly savedAt: number;
  readonly title: string;
  readonly inputsHash: string;
  readonly env: Env;
  readonly trace: string;
  readonly code: string;
  readonly planItems: readonly PlanItem[];
  readonly hypotheses: readonly Hypothesis[];
  readonly analysis: AnalysisResult | null;
}

// Toast notification
export interface Toast {
  readonly id: string;
  readonly tone: ToastTone;
  readonly title: string;
  readonly message: string;
}

// LSP Diagnostic
export interface Diagnostic {
  readonly line: number;
  readonly column: number;
  readonly severity: Severity;
  readonly message: string;
  readonly code?: string;
  readonly source?: string;
}

// Application state
export interface AppState {
  readonly tab: TabId;
  readonly code: string;
  readonly trace: string;
  readonly env: Env;
  readonly focus: FocusMode;
  readonly analysis: AnalysisResult | null;
  readonly planItems: readonly PlanItem[];
  readonly hypotheses: readonly Hypothesis[];
  readonly history: readonly Snapshot[];
  readonly diagnostics: readonly Diagnostic[];
}

// Loading states
export interface LoadingState {
  readonly lsp: boolean;
  readonly ai: boolean;
  readonly analysis: boolean;
  readonly import: boolean;
}

// Smart paste result
export interface SmartPasteResult {
  readonly code?: string;
  readonly trace?: string;
}

// Project file for terminal/project management
export interface ProjectFile {
  readonly path: string;
  readonly content: string;
  readonly language?: string;
  readonly size: number;
}

// Terminal line types
export interface TerminalLine {
  readonly id: string;
  readonly type: 'input' | 'output' | 'error' | 'system';
  readonly content: string;
  readonly action?: {
    readonly label: string;
    readonly onClick: () => void;
  };
}

// GitHub integration types
export interface GitHubRepo {
  readonly id: number;
  readonly name: string;
  readonly full_name: string;
  readonly description: string | null;
  readonly private: boolean;
  readonly html_url: string;
  readonly default_branch: string;
  readonly language: string | null;
  readonly updated_at: string;
  readonly owner: {
    readonly login: string;
    readonly id: number;
    readonly avatar_url: string;
    readonly html_url: string;
  };
}

export interface GitHubBranch {
  readonly name: string;
  readonly commit: {
    readonly sha: string;
    readonly url: string;
  };
  readonly protected: boolean;
}

export interface GitHubFile {
  readonly name: string;
  readonly path: string;
  readonly type: 'file' | 'dir';
  readonly size: number;
  readonly download_url: string | null;
  readonly url: string;
}

export interface CodebaseFile {
  readonly path: string;
  readonly content: string;
  readonly size: number;
  readonly language?: string;
}

export interface CodebaseAnalysis {
  readonly files: readonly CodebaseFile[];
  readonly totalSize: number;
  readonly supportedFiles: number;
  readonly ignoredFiles: string[];
}

export interface FileTreeNode {
  readonly name: string;
  readonly path: string;
  readonly type: 'file' | 'directory';
  readonly children?: readonly FileTreeNode[];
  readonly size?: number;
  readonly language?: string;
  readonly isSupported?: boolean;
}

export interface FileSelection {
  readonly selectedPaths: readonly string[];
  readonly expandedPaths: readonly string[];
}
