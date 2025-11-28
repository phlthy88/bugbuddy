// ============================================================
// BugBuddy Constants
// ============================================================

import { Env, FocusMode } from './types';

/**
 * Sample bug data for demo purposes
 */
export const SAMPLE_DATA = {
  code: `// Sample stubborn bug (NPE)
import java.util.*;

class Demo {
  static String normalize(String s) {
    // Bug: s can be null
    return s.trim().toLowerCase(Locale.ROOT);
  }

  static boolean isOk(String status) {
    // Bug: == compares reference
    return status == "OK";
  }

  public static void main(String[] args) {
    System.out.println(normalize(null));
  }
}`,

  trace: `Exception in thread "main" java.lang.NullPointerException: Cannot invoke "String.trim()" because "s" is null
\tat Demo.normalize(Demo.java:6)
\tat Demo.main(Demo.java:16)`,

  env: {
    javaVersion: '21',
    buildTool: 'Gradle',
    framework: '(none)',
    runtime: 'Local',
  },
} as const;

/**
 * Default environment configuration
 */
export const DEFAULT_ENV: Env = {
  javaVersion: SAMPLE_DATA.env.javaVersion,
  buildTool: SAMPLE_DATA.env.buildTool,
  framework: SAMPLE_DATA.env.framework,
  runtime: SAMPLE_DATA.env.runtime,
  notes: '',
};

/**
 * Focus mode options for analysis
 */
export const FOCUS_OPTIONS: { value: FocusMode; label: string }[] = [
  { value: 'auto', label: 'Focus: Auto-detect' },
  { value: 'npe', label: 'Focus: Nulls / NPE' },
  { value: 'deps', label: 'Focus: Dependencies / classpath' },
  { value: 'concurrency', label: 'Focus: Concurrency' },
  { value: 'perf', label: 'Focus: Performance / memory' },
  { value: 'tests', label: 'Focus: Tests / flakiness' },
];

/**
 * Rubber duck debugging questions
 */
export const RUBBER_DUCK_QUESTIONS = [
  {
    question: 'What is the smallest input that reproduces it?',
    hint: 'Give literal values (IDs, JSON, rows).',
  },
  {
    question: 'What must be true for the failing line to be reached?',
    hint: 'Preconditions, branches, feature flags.',
  },
  {
    question: 'What assumption did the code make that the world violated?',
    hint: 'Nulls, ordering, uniqueness, versions.',
  },
  {
    question: 'Where could you add a single assertion that would catch this earlier?',
    hint: 'Prefer boundaries: parsing, DB results, API contracts.',
  },
] as const;

/**
 * Quick code snippets for resolver tab
 */
export const CODE_SNIPPETS = [
  {
    title: 'Guard clauses',
    code: `if (input == null || input.isBlank()) {
  throw new IllegalArgumentException("input must be provided");
}`,
  },
  {
    title: 'Try-with-resources',
    code: `try (BufferedReader br = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
  return br.lines().toList();
}`,
  },
  {
    title: 'Optional handling',
    code: `return Optional.ofNullable(value)
  .map(String::trim)
  .filter(s -> !s.isEmpty())
  .orElse(defaultValue);`,
  },
  {
    title: 'Null-safe equals',
    code: `// Instead of: str == "OK"
Objects.equals(str, "OK")
// Or:
"OK".equals(str)`,
  },
  {
    title: 'Defensive copy',
    code: `// In constructor
this.items = items == null 
  ? Collections.emptyList() 
  : List.copyOf(items);`,
  },
] as const;

/**
 * Keyboard shortcuts
 */
export const KEYBOARD_SHORTCUTS = {
  analyze: { key: 'Enter', ctrl: true, description: 'Run analysis' },
  save: { key: 's', ctrl: true, description: 'Save snapshot' },
  copy: { key: 'c', ctrl: true, shift: true, description: 'Copy report' },
  reset: { key: 'r', ctrl: true, shift: true, description: 'Reset all' },
} as const;

/**
 * Storage configuration
 */
export const STORAGE_CONFIG = {
  maxHistory: 12,
  maxToasts: 4,
  toastDismissMs: 5000,
  debounceMs: 300,
} as const;

/**
 * Common Java exception families
 */
export const BUG_FAMILIES = {
  npe: 'Null Pointer Exception',
  bounds: 'Index Out of Bounds',
  cast: 'Class Cast Exception',
  concurrent: 'Concurrency Issue',
  io: 'I/O Error',
  memory: 'Memory Issue',
  classpath: 'Classpath / Dependency',
  serialization: 'Serialization Error',
  reflection: 'Reflection Error',
  unknown: 'Unknown',
} as const;
