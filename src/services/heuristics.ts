// ============================================================
// Heuristics Service - Java Bug Analysis & Debugging
// ============================================================

import { AnalysisResult, Env, Finding, TraceInfo, CodebaseFile } from '../types';
import { uid, formatKVPairs, nowISO, splitLines } from '../utils';


// ---------------------------
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// ---------------------------
function humanConfidence(x: number) {
  const p = Math.round(clamp(x, 0, 1) * 100);
  if (p >= 85) return { label: 'High', pct: p };
  if (p >= 60) return { label: 'Medium', pct: p };
  if (p >= 35) return { label: 'Low', pct: p };
  return { label: 'Very low', pct: p };
}


// ---------------------------
function parseStackTrace(trace: string): TraceInfo {
  const out: any = {
    raw: trace || '',
    exceptionClass: '',
    message: '',
    frames: [],
    primaryFrame: null,
  };
  const t = (trace || '').trim();
  if (!t) return out;

  const lines = splitLines(trace).map(l => l.trimEnd());

  // Try to find exception line
  for (const line of lines) {
    const l = line.trim();
    if (!l) continue;
    // Common: "Exception in thread \"main\" java.lang.NullPointerException: msg"
    const m1 = l.match(/(?:Exception in thread\s+"[^"]+"\s+)?([\w.$]+(?:Exception|Error))(?:\s*:\s*(.*))?$/);
    if (m1) {
      out.exceptionClass = m1[1] || '';
      out.message = (m1[2] || '').trim();
      break;
    }
  }

  // Parse frames
  for (const line of lines) {
    const m = line.match(/^\s*at\s+([\w.$]+)\.(<init>|[\w$<>]+)\(([^:()]+)(?::(\d+))?\)\s*$/);
    if (!m) continue;
    const cls = m[1];
    const method = m[2];
    const file = m[3];
    const lineNo = m[4] ? Number(m[4]) : null;
    const frame = { cls, method, file, line: lineNo, raw: line.trim() };
    out.frames.push(frame);
    if (!out.primaryFrame && Number.isFinite(lineNo)) out.primaryFrame = frame;
  }

  return out;
}

// ---------------------------
function guessBugFamily({ exceptionClass, message }: TraceInfo, code: string): string {
  const ex = (exceptionClass || '').toLowerCase();
  const msg = (message || '').toLowerCase();
  const c = (code || '').toLowerCase();

  if (ex.includes('nullpointerexception') || msg.includes('null')) return 'NPE / null-state';
  if (ex.includes('indexoutofboundsexception') || msg.includes('index')) return 'Bounds / indexing';
  if (ex.includes('classcastexception')) return 'Type / casting';
  if (ex.includes('concurrentmodificationexception')) return 'Concurrency / mutation';
  if (ex.includes('nosuchmethoderror') || ex.includes('classnotfoundexception') || ex.includes('noclassdeffounderror')) return 'Classpath / dependency mismatch';
  if (ex.includes('outofmemoryerror')) return 'Memory / leaks';
  if (ex.includes('stackoverflowerror')) return 'Recursion / infinite loop';
  if (ex.includes('sql')) return 'Database / JDBC';
  if (ex.includes('illegalargumentexception')) return 'Invalid inputs / contracts';
  if (ex.includes('assertionerror')) return 'Tests / assertions';

  if (c.includes('thread.sleep')) return 'Flaky timing';
  if (c.includes('simpledateformat')) return 'Time / thread-safety';
  if (c.includes('zoneid') || c.includes('timezone') || c.includes('localdate') || c.includes('instant')) return 'Time / timezone';

  return 'General';
}

// ---------------------------
function findLineNumberFromTrace(traceInfo: TraceInfo): number | null {
  if (!traceInfo?.primaryFrame?.line) return null;
  return traceInfo.primaryFrame.line;
}

// ---------------------------
function sliceCodeFrame(code: string, lineNumber: number | null, radius = 3) {
  const lines = splitLines(code);
  if (!lineNumber || !Number.isFinite(lineNumber) || lineNumber < 1) {
    return { start: 1, end: Math.min(lines.length, 10), lines };
  }
  const start = clamp(lineNumber - radius, 1, Math.max(1, lines.length));
  const end = clamp(lineNumber + radius, 1, Math.max(1, lines.length));
  return { start, end, lines };
}

// ---------------------------
function mkFinding({
  title,
  severity,
  confidence,
  summary,
  whyPersistent,
  steps,
  snippet,
  tags = []
}: {
  title: string;
  severity: 'info' | 'warn' | 'error';
  confidence: number;
  summary: string;
  whyPersistent: string;
  steps: string[];
  snippet: string;
  tags?: string[];
}): Finding {
  return {
    id: uid(),
    title,
    severity,
    confidence,
    summary,
    whyPersistent,
    steps,
    snippet,
    tags,
   } as Finding;
}

// ---------------------------
// ---------------------------
function scanCodebaseHeuristics(files: CodebaseFile[], traceInfo: TraceInfo, env: Env): { findings: Finding[]; family: string } {
  // Combine all files for analysis, but keep track of which file each finding comes from
  const combinedCode = files
    .map(file => `// ===== ${file.path} =====\n${file.content}`)
    .join('\n\n');

  const result = scanJavaHeuristics(combinedCode, traceInfo, env);

  // Enhance findings with file information if possible
  const enhancedFindings = result.findings.map(finding => {
    // Try to determine which file this finding relates to
    const fileMatch = finding.snippet.match(/\/\/ ===== (.+?) =====/);
    if (fileMatch) {
      return {
        ...finding,
        title: `${finding.title} (${fileMatch[1]})`
      };
    }
    return finding;
  });

  return {
    findings: enhancedFindings,
    family: result.family
  };
}

// ---------------------------
// ---------------------------
function scanJavaHeuristics(code: string, traceInfo: TraceInfo, env: Env): { findings: Finding[]; family: string } {
  const findings: Finding[] = [];
  const c = code || '';
  const lines = splitLines(c);
  const joined = lines.join('\n');
  const family = guessBugFamily(traceInfo || {}, c);

  // Always add a "How to approach" baseline for persistent bugs.
  findings.push(mkFinding({
    title: 'The Persistent Bug Loop (a.k.a. make it smaller, then make it obvious)',
    severity: 'info',
    confidence: 0.9,
    summary: 'A stubborn bug usually survives because one of these is missing: determinism, observation, or a tight feedback loop.',
    whyPersistent: 'If the failure is flaky, hard to reproduce, or buried under too much code, you can spend hours "fixing symptoms".',
    steps: [
      'Freeze the world: pin inputs, time, randomness, and external services (use fakes/stubs).',
      'Create a tiny reproducer: the smallest method/test that still fails.',
      'Add one high-signal observation at a time (assertions > logs > print).',
      'Write the regression test first, then fix under that test.',
      'Remove debug scaffolding once the test is green.',
    ],
    snippet: `// Quick template for a stubborn bug
// 1) Reproducer
// 2) Observation
// 3) Hypothesis
// 4) One change
// 5) Regression test`,
    tags: ['workflow']
  }));

  // Exception-specific playbooks
  const ex = (traceInfo?.exceptionClass || '').toLowerCase();

  if (ex.includes('nullpointerexception') || family.includes('NPE')) {
    findings.push(mkFinding({
      title: 'NullPointerException playbook: identify the null, not the line',
      severity: 'error',
      confidence: 0.8,
      summary: 'NPE fixes stick when you figure out which reference is null and why it can be null in this code path.',
      whyPersistent: 'People often add a null check "somewhere nearby", but the null originates earlier (bad construction, partial mocks, unexpected empty results).',
      steps: [
        'From the stack trace line, list every dereference on that line (x.y(), x.y, arr[i].z()).',
        'Add a failing assertion right before the dereference: assertNotNull(x) (or Objects.requireNonNull).',
        'Trace the value back to its source: constructor, factory, repository, map lookup, DTO mapping.',
        'Decide the contract: should it be non-null (then fail fast earlier) or nullable (then handle the null explicitly)?',
        'Add a regression test for the null-producing scenario.',
      ],
      snippet: `// Fail fast with context
import static java.util.Objects.requireNonNull;

User user = requireNonNull(repo.find(id), "repo.find(id) returned null for id=" + id);
String name = requireNonNull(user.getName(), "user.name was null for id=" + id);`,
      tags: ['exception', 'npe']
    }));
  }

  if (ex.includes('nosuchmethoderror') || ex.includes('noclassdeffounderror') || ex.includes('classnotfoundexception')) {
    findings.push(mkFinding({
      title: 'Classpath mismatch: the code compiled against a different library than it ran with',
      severity: 'error',
      confidence: 0.78,
      summary: 'These are rarely "code bugs"; they\'re dependency graph bugs.',
      whyPersistent: 'The build can succeed while the runtime classpath differs (shaded jars, old containers, duplicate dependencies, test vs prod classpath).',
      steps: [
        'Print the exact version on the runtime classpath (Gradle/Maven dependency tree).',
        'Search for duplicates: same artifact different versions in the tree.',
        'If this is a server/container: verify what the container provides (Servlet API, Jackson, etc.).',
        'Align versions (dependencyManagement / platforms / BOMs).',
        'Rebuild clean and redeploy from a clean artifact (no stale libs).',
      ],
      snippet: `# Maven
mvn -q dependency:tree -Dincludes=com.fasterxml.jackson

# Gradle
./gradlew dependencies --configuration runtimeClasspath`,
      tags: ['dependencies', 'build']
    }));
  }

  if (ex.includes('concurrentmodificationexception') || family.includes('Concurrency')) {
    findings.push(mkFinding({
      title: 'ConcurrentModificationException: iterate + modify is the smoking gun',
      severity: 'error',
      confidence: 0.72,
      summary: 'You mutated a collection while iterating, or two threads raced a non-thread-safe collection.',
      whyPersistent: 'It may only happen under certain sizes/timings, so it appears "random".',
      steps: [
        'Search for loops over a collection where you also add/remove within the loop.',
        'If single-threaded: use Iterator.remove() or collect changes then apply after.',
        'If multi-threaded: use concurrent collections (ConcurrentHashMap, CopyOnWriteArrayList) or synchronize.',
        'Add a stress test (repeat 1k–10k times) to prove determinism after the fix.',
      ],
      snippet: `// Single-thread safe removal
for (Iterator<Item> it = items.iterator(); it.hasNext();) {
  Item i = it.next();
  if (i.isExpired()) it.remove();
}`,
      tags: ['exception', 'concurrency']
    }));
  }

  if (ex.includes('outofmemoryerror') || family.includes('Memory')) {
    findings.push(mkFinding({
      title: 'OutOfMemoryError: measure first, then fix the retention path',
      severity: 'error',
      confidence: 0.68,
      summary: 'OOM is usually not "need more heap", it\'s "something retains too much".',
      whyPersistent: 'Increasing heap hides the problem until it returns bigger. Leaks often live in caches, static collections, or unclosed resources.',
      steps: [
        'Confirm which memory pool blew up (heap vs metaspace vs direct buffers).',
        'Collect a heap dump at OOM (or with a trigger) and inspect dominators.',
        'Look for unbounded caches, static collections, and listeners not removed.',
        'Fix the retention path; add backpressure/fixed-size cache.',
        'Add a load test to ensure memory stabilizes.',
      ],
      snippet: `# JVM flags (example)
-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=./dumps

# Then inspect with Eclipse MAT / VisualVM`,
      tags: ['performance', 'memory']
    }));
  }

  // Code pattern heuristics
  // 1) String equality with ==
  let stringEqHits = 0;
  for (const line of lines) {
    if (!line.includes('==')) continue;
    const t = line.trim();
    if (t.startsWith('//')) continue;
    const likelyString = t.includes('"') || /\bString\b/.test(t);
    if (likelyString && !t.includes("!=") && !t.includes("===")) {
      // Avoid flagging patterns like a == null too aggressively
      if (/==\s*null\b/.test(t) || /\bnull\s*==/.test(t)) continue;
      stringEqHits++;
    }
  }
  if (stringEqHits > 0) {
    findings.push(mkFinding({
      title: 'Possible String equality bug: using == compares references, not content',
      severity: 'warn',
      confidence: stringEqHits >= 2 ? 0.75 : 0.55,
      summary: `Found ${stringEqHits} line(s) that look like String comparison with ==.`,
      whyPersistent: 'It "works on my machine" when the JVM interns the same string, then fails in production when references differ.',
      steps: [
        'Use "literal".equals(variable) to avoid NPEs.',
        'If case-insensitive: use equalsIgnoreCase.',
        'If you really need reference equality, add a comment explaining why.',
      ],
      snippet: `// Safer comparisons
if ("OK".equals(status)) { ... }
if (Objects.equals(a, b)) { ... }`,
      tags: ['correctness']
    }));
  }

  // 2) Optional.get() without isPresent
  if (joined.includes('Optional') && joined.includes('.get()')) {
    findings.push(mkFinding({
      title: 'Optional.get() can throw: prefer orElseThrow (with message)',
      severity: 'warn',
      confidence: 0.6,
      summary: 'Optional.get() is a common source of NoSuchElementException when assumptions drift.',
      whyPersistent: 'The option becomes empty only in "rare" data paths, then surfaces months later.',
      steps: [
        'Replace get() with orElseThrow(() -> new ...).',
        'Include enough context in the exception message to debug quickly.',
        'If empty is legitimate: use orElse / ifPresent / map / flatMap.',
      ],
      snippet: `User u = repo.find(id)
  .orElseThrow(() -> new IllegalStateException("No user for id=" + id));`,
      tags: ['correctness']
    }));
  }

  // 3) SimpleDateFormat thread safety
  if (/SimpleDateFormat/.test(joined)) {
    const staticSdf = /static\s+.*SimpleDateFormat/.test(joined);
    findings.push(mkFinding({
      title: 'SimpleDateFormat is not thread-safe (and causes "impossible" time bugs)',
      severity: staticSdf ? 'error' : 'warn',
      confidence: staticSdf ? 0.8 : 0.55,
      summary: staticSdf
        ? 'Detected a static SimpleDateFormat — that\'s a classic concurrency bug source.'
        : 'Detected SimpleDateFormat usage — verify it is not shared across threads.',
      whyPersistent: 'Race conditions corrupt internal state, producing sporadic wrong parses/formats.',
      steps: [
        'Prefer java.time (DateTimeFormatter) which is immutable/thread-safe.',
        'If you must use SimpleDateFormat: never share it; create per call or ThreadLocal.',
        'Add a concurrency stress test to prove it is fixed.',
      ],
      snippet: `// java.time replacement (thread-safe)
DateTimeFormatter fmt = DateTimeFormatter.ISO_OFFSET_DATE_TIME;
OffsetDateTime t = OffsetDateTime.parse(input, fmt);`,
      tags: ['time', 'concurrency']
    }));
  }

  // 4) BigDecimal(double)
  if (/new\s+BigDecimal\(\s*\d+\.\d+\s*\)/.test(joined) || /BigDecimal\.valueOf\(\s*\d+\.\d+\s*\)/.test(joined)) {
    findings.push(mkFinding({
      title: 'BigDecimal and floating point: avoid new BigDecimal(double)',
      severity: 'warn',
      confidence: 0.65,
      summary: 'Floating point literals can introduce hidden precision issues.',
      whyPersistent: 'The bug appears only for certain values (rounding boundaries), then returns in financial or aggregation code.',
      steps: [
        'Use BigDecimal.valueOf(double) or new BigDecimal("...") from a string.',
        'Define rounding explicitly via setScale / RoundingMode.',
      ],
      snippet: `BigDecimal a = new BigDecimal("0.1");
BigDecimal b = BigDecimal.valueOf(0.1); // safer than new BigDecimal(0.1)`,
      tags: ['correctness', 'money']
    }));
  }

  // 5) Thread.sleep flakiness
  if (/Thread\.sleep\(/.test(joined)) {
    findings.push(mkFinding({
      title: 'Thread.sleep often causes flaky bugs/tests: synchronize on an event instead',
      severity: 'warn',
      confidence: 0.7,
      summary: 'Sleeping "hopes" the thing finished; it doesn\'t prove it finished.',
      whyPersistent: 'Timing changes between machines/CI loads, turning green tests into random reds.',
      steps: [
        'In tests: wait on a latch, polling with timeout, or a framework await helper.',
        'Prefer deterministic signals (callbacks, futures) over time delays.',
      ],
      snippet: `// In tests: prefer await with timeout
assertTrue(latch.await(2, TimeUnit.SECONDS));`,
      tags: ['tests', 'flaky']
    }));
  }

  // 6) Broad catch
  if (/catch\s*\(\s*(Exception|Throwable)\b/.test(joined)) {
    findings.push(mkFinding({
      title: 'Catching Exception/Throwable can hide the real bug (and make it immortal)',
      severity: 'warn',
      confidence: 0.62,
      summary: 'Broad catches can swallow signals and turn failures into corrupted state.',
      whyPersistent: 'Instead of failing fast where the bug is, the program limps onward and explodes later, far from the cause.',
      steps: [
        'Catch the most specific exception you can.',
        'If you must catch broad: rethrow with context or wrap, and preserve the cause.',
        'Never ignore InterruptedException; restore interrupt status.',
      ],
      snippet: `try {
  ...
} catch (IOException e) {
  throw new UncheckedIOException("Reading config failed", e);
}`,
      tags: ['correctness']
    }));
  }

  // 7) Empty catch blocks
  const emptyCatch = /catch\s*\([^)]*\)\s*\{\s*(?:\/\/.*\s*)?\}/m.test(joined);
  if (emptyCatch) {
    findings.push(mkFinding({
      title: 'Empty catch block: the exception may be the clue you\'re losing',
      severity: 'warn',
      confidence: 0.7,
      summary: 'Swallowing exceptions is a common cause of "it just stops working" bugs.',
      whyPersistent: 'The system proceeds with partial work done; later operations fail in confusing ways.',
      steps: [
        'At least log with context and keep the exception as the cause.',
        'If ignoring is intentional, document the reason and the expected exception.',
      ],
      snippet: `catch (IOException e) {
  logger.warn("Ignoring missing optional file: {}", path, e);
}`,
      tags: ['observability']
    }));
  }

  // 8) Resource leak hints
  const resourceCtor = /(new\s+(FileInputStream|FileOutputStream|FileReader|FileWriter|BufferedReader|BufferedWriter|InputStreamReader|OutputStreamWriter|Socket)\b)/.test(joined);
  const tryWithResources = /try\s*\(\s*.*\)/.test(joined);
  if (resourceCtor && !tryWithResources) {
    findings.push(mkFinding({
      title: 'Possible resource leak: use try-with-resources for streams/readers/sockets',
      severity: 'warn',
      confidence: 0.58,
      summary: 'Detected resource construction without an obvious try-with-resources block.',
      whyPersistent: 'Leaked handles often show up only under load or long runtimes ("too many open files").',
      steps: [
        'Wrap streams/readers/sockets in try-with-resources.',
        'In finally blocks, close quietly only if you must (and still log on close failure if relevant).',
      ],
      snippet: `try (BufferedReader br = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
  return br.readLine();
}`,
      tags: ['resource']
    }));
  }

  // 9) Logging via System.out
  if (/System\.out\.println\(|System\.err\.println\(/.test(joined)) {
    findings.push(mkFinding({
      title: 'System.out.println is a weak debugging tool in production: prefer structured logs',
      severity: 'info',
      confidence: 0.55,
      summary: 'Prints are hard to correlate and often get removed (taking evidence with them).',
      whyPersistent: 'Without stable observations, bugs turn into guesswork.',
      steps: [
        'Use your logger (SLF4J/Logback) with correlation IDs if possible.',
        'Log inputs/outputs at boundaries, not everywhere.',
      ],
      snippet: `logger.info("Processing order id={} userId={}", orderId, userId);`,
      tags: ['observability']
    }));
  }

  // 10) Dependency on time/randomness (extra hint)
  const timeStuff = /(new\s+Date\(|System\.currentTimeMillis\(|Instant\.now\(|LocalDate\.now\(|LocalDateTime\.now\(|Clock\.system)/.test(joined);
  if (timeStuff) {
    findings.push(mkFinding({
      title: 'Time-dependent logic: inject a Clock to make bugs reproducible',
      severity: 'info',
      confidence: 0.55,
      summary: 'Using "now" directly can cause boundary bugs (midnight/timezone/DST) and flakiness.',
      whyPersistent: 'The bug only appears at specific times (DST shift, month end, leap day, different timezone).',
      steps: [
        'Inject java.time.Clock into services that use time.',
        'In tests, use Clock.fixed(...) to freeze time.',
      ],
      snippet: `class BillingService {
  private final Clock clock;
  BillingService(Clock clock) { this.clock = clock; }
  Instant now() { return Instant.now(clock); }
}`,
      tags: ['time', 'tests']
    }));
  }

  // Stack trace: line number vs code length hint
  const lineNo = findLineNumberFromTrace(traceInfo);
  if (lineNo && splitLines(code).length > 0 && lineNo > splitLines(code).length) {
    findings.push(mkFinding({
      title: 'Stack trace line number does not fit pasted code: you may be debugging the wrong build',
      severity: 'warn',
      confidence: 0.75,
      summary: `Trace points to line ${lineNo}, but your pasted snippet has only ${splitLines(code).length} lines.`,
      whyPersistent: 'If you\'re reading a different version than the runtime, every fix will feel "ignored".',
      steps: [
        'Confirm the deployed artifact matches your source checkout/commit.',
        'Rebuild from clean (no stale compiled classes).',
        'Print app version/commit at startup.',
      ],
      snippet: `// At build time, embed the git commit and print it at startup
// e.g., via Maven/Gradle resource filtering`,
      tags: ['build', 'observability']
    }));
  }

  // Add environment note if provided
  const envCount = Object.values(env || {}).filter(v => String(v ?? '').trim() !== '').length;
  if (envCount === 0) {
    findings.push(mkFinding({
      title: 'Add runtime context (it shortens debugging by hours)',
      severity: 'info',
      confidence: 0.7,
      summary: 'Java version, build tool, framework, and how you run it often explain "impossible" bugs.',
      whyPersistent: 'Without environment detail, you can chase code ghosts caused by config, versions, or containers.',
      steps: [
        'Fill in Java version + build tool (Maven/Gradle) + framework (Spring/etc.).',
        'Note where it fails: local, CI, container, production.',
        'If threads involved: include thread count/executor config.',
      ],
      snippet: `// Example: log version + build info once
logger.info("appVersion={} java={} os={}", APP_VERSION, System.getProperty("java.version"), System.getProperty("os.name"));`,
      tags: ['workflow']
    }));
  }

  // Sort by severity then confidence desc
  const sevRank = { error: 0, warn: 1, info: 2 };
  findings.sort((a, b) => {
    const s = (sevRank[a.severity] ?? 9) - (sevRank[b.severity] ?? 9);
    if (s !== 0) return s;
    return (b.confidence ?? 0) - (a.confidence ?? 0);
  });

  return { findings, family };
}

// ---------------------------
function generateDebugPlan(traceInfo: TraceInfo, findings: readonly Finding[]) {
  const ex = traceInfo?.exceptionClass || '';
  const plan = [];

  plan.push({ id: uid(), text: 'Reproduce reliably (same inputs, same environment, same commit).', done: false });
  plan.push({ id: uid(), text: 'Minimize: reduce to smallest failing test/case.', done: false });
  plan.push({ id: uid(), text: 'Add one high-signal assertion/log at the boundary where the bad value first appears.', done: false });

  if (ex) plan.push({ id: uid(), text: `Use the stack trace to inspect the first application frame for: ${ex}`, done: false });

  const top = findings.slice(0, 4);
  for (const f of top) {
    plan.push({ id: uid(), text: `Check: ${f.title}`, done: false });
  }

  plan.push({ id: uid(), text: 'Add/extend a regression test so the bug can\'t sneak back.', done: false });
  plan.push({ id: uid(), text: 'Clean up: remove debug prints and keep only meaningful logs/guards.', done: false });

  return plan;
}

// ---------------------------
function toMarkdownReport({ code, trace, env, analysis, planItems }: {
  code: string;
  trace: string;
  env: Env;
  analysis?: AnalysisResult | null;
  planItems: any[];
}) {
  const traceInfo = analysis?.traceInfo || parseStackTrace(trace);
  const findings = analysis?.findings || [];

  const md = [];
  md.push(`# BugBuddy Report`);
  md.push(`Generated: ${nowISO()}`);
  md.push('');
  md.push('## Environment');
  md.push('```');
  md.push(formatKVPairs(env || {}) || '(not provided)');
  md.push('```');
  md.push('');

  md.push('## Stack trace / error');
  md.push('```');
  md.push((trace || '(none)').trim() || '(none)');
  md.push('```');
  md.push('');

  md.push('## Parsed summary');
  md.push(`- Exception: ${traceInfo.exceptionClass || '(unknown)'}`);
  md.push(`- Message: ${traceInfo.message || '(none)'}`);
  if (traceInfo.primaryFrame) {
    md.push(`- First frame: ${traceInfo.primaryFrame.cls}.${traceInfo.primaryFrame.method} (${traceInfo.primaryFrame.file}:${traceInfo.primaryFrame.line ?? '?'})`);
  }
  md.push('');

  md.push('## Suspects / findings');
  if (findings.length === 0) {
    md.push('- (none)');
  } else {
    for (const f of findings) {
      const conf = humanConfidence(f.confidence).label;
      md.push(`- **[${f.severity.toUpperCase()} | ${conf}] ${f.title}** — ${f.summary}`);
      if (f.steps?.length) {
        md.push('  - Steps:');
        for (const s of f.steps.slice(0, 5)) md.push(`    - ${s}`);
      }
    }
  }
  md.push('');

  md.push('## Fix plan');
  if (!planItems || planItems.length === 0) {
    md.push('- (none)');
  } else {
    planItems.forEach((p, i) => {
      md.push(`${i + 1}. ${p.done ? '[x]' : '[ ]'} ${p.text}`);
    });
  }
  md.push('');

  md.push('## Code (snippet)');
  md.push('```java');
  md.push((code || '').trim() || '// (no code provided)');
  md.push('```');

  return md.join('\n');
}

// ---------------------------
function buildLLMPrompt({ code, trace, env, focus }: {
  code: string;
  trace: string;
  env: Env;
  focus?: string;
}) {
  const envBlock = formatKVPairs(env || {}) || '(not provided)';
  return [
    'You are a senior Java debugging assistant.',
    '',
    'Task:',
    '1) Identify the most probable root cause.',
    '2) Explain how to confirm it (what to log/assert/check).',
    '3) Provide a minimal safe fix, and a regression test idea.',
    '4) Call out any dependency/classpath/version risks in the trace.',
    '',
    `Focus area: ${focus || '(auto)'}`,
    '',
    'Environment:',
    envBlock,
    '',
    'Stack trace / error:',
    '```',
    (trace || '(none)').trim() || '(none)',
    '```',
    '',
    'Code:',
    '```java',
    (code || '').trim() || '// (no code provided)',
    '```',
    '',
    'Constraints:',
    '- Be explicit about assumptions and how to validate them.',
    '- Prefer small, reversible changes.',
  ].join('\n');
}

// ---------------------------
export {
  parseStackTrace,
  guessBugFamily,
  findLineNumberFromTrace,
  sliceCodeFrame,
  scanJavaHeuristics,
  scanCodebaseHeuristics,
  generateDebugPlan,
  toMarkdownReport,
  buildLLMPrompt,
};