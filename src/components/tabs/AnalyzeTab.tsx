// ============================================================
// Analyze Tab Component
// ============================================================

import { useCallback, useState } from 'react';
import { useBugBuddy } from '../../context/BugBuddyContext';
import {
  Button,
  Card,
  CardHeader,
  Input,
  Pill,
  Select,
  Textarea,
  EmptyState,
} from '../UI';
import { CodeFrame } from '../CodeFrame';
import { FindingCard } from '../FindingCard';
import { SmartPaste } from '../SmartPaste';
import { ProjectManager } from '../ProjectManager';
import { FileTree } from '../FileTree';
import { FOCUS_OPTIONS } from '../../constants';
import { FocusMode, ProjectFile, FileSelection, FileTreeNode } from '../../types';
import { buildFileTree, getSelectedFiles } from '../../utils/fileTree';

export function AnalyzeTab() {
  const {
    projectFiles,
    setProjectFiles,
    fileTree,
    setFileTree,
    fileSelection,
    setFileSelection,
    showFileSelector,
    setShowFileSelector
  } = useBugBuddy();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <InputsPanel
        projectFiles={projectFiles}
        setProjectFiles={setProjectFiles}
        fileTree={fileTree}
        setFileTree={setFileTree}
        fileSelection={fileSelection}
        setFileSelection={setFileSelection}
        showFileSelector={showFileSelector}
        setShowFileSelector={setShowFileSelector}
      />
      <ResultsPanel />
    </div>
  );
}

// ============================================================
// Inputs Panel
// ============================================================

interface InputsPanelProps {
  projectFiles: ProjectFile[];
  setProjectFiles: (files: ProjectFile[]) => void;
  fileTree: readonly FileTreeNode[];
  setFileTree: (tree: readonly FileTreeNode[]) => void;
  fileSelection: FileSelection;
  setFileSelection: (selection: FileSelection) => void;
  showFileSelector: boolean;
  setShowFileSelector: (show: boolean) => void;
}

function InputsPanel({
  projectFiles,
  setProjectFiles,
  fileTree,
  setFileTree,
  fileSelection,
  setFileSelection,
  showFileSelector,
  setShowFileSelector
}: InputsPanelProps) {
  const {
    code,
    setCode,
    trace,
    setTrace,
    env,
    updateEnv,
    focus,
    setFocus,
    pushToast,
    runHeuristicAnalysis,
  } = useBugBuddy();

  const [inputMethod, setInputMethod] = useState<'manual' | 'github' | 'upload'>('manual');

  // Handle successful file import
  const handleFileImport = useCallback((files: ProjectFile[]) => {
    setProjectFiles(files);

    // Build file tree
    const codebaseFiles = files.map(f => ({
      path: f.path,
      content: f.content,
      size: f.size,
      language: f.language
    }));

    console.log('Building file tree from files:', codebaseFiles.map(f => f.path));
    const tree = buildFileTree(codebaseFiles);
    console.log('Built file tree:', tree);

    setFileTree(tree);

    // Auto-expand first level and select all supported files
    const expandedPaths: string[] = [];
    const selectedPaths: string[] = [];

    function processTree(nodes: readonly FileTreeNode[]) {
      for (const node of nodes) {
        if (node.type === 'directory') {
          expandedPaths.push(node.path);
          if (node.children) {
            processTree(node.children);
          }
        } else if (node.type === 'file' && node.isSupported) {
          selectedPaths.push(node.path);
        }
      }
    }
    processTree(tree);

    setFileSelection({
      selectedPaths,
      expandedPaths
    });

    // Show file selector
    setShowFileSelector(true);

    pushToast({
      title: 'Files Imported Successfully',
      message: `${files.length} files imported. Select which files to analyze.`,
      tone: 'green'
    });
  }, [pushToast]);

  // Handle file analysis
  const handleAnalyzeSelected = useCallback(async () => {
    if (projectFiles.length === 0) return;

    const selectedFiles = getSelectedFiles(fileTree, fileSelection.selectedPaths, projectFiles.map(f => ({
      path: f.path,
      content: f.content,
      size: f.size,
      language: f.language
    })));

    if (selectedFiles.length === 0) {
      pushToast({
        title: 'No Files Selected',
        message: 'Please select at least one file to analyze.',
        tone: 'yellow'
      });
      return;
    }

    // Combine selected files into code string
    const combinedCode = selectedFiles
      .map(file => `// ===== ${file.path} =====\n${file.content}`)
      .join('\n\n');

    setCode(combinedCode);
    setShowFileSelector(false);

    pushToast({
      title: 'Starting Analysis',
      message: `Analyzing ${selectedFiles.length} selected files...`,
      tone: 'blue'
    });

    try {
      await runHeuristicAnalysis();
      pushToast({
        title: 'Analysis Complete',
        message: 'Codebase analysis finished. Check the results.',
        tone: 'green'
      });
    } catch (error) {
      pushToast({
        title: 'Analysis Failed',
        message: 'Could not complete analysis. Please check your inputs.',
        tone: 'yellow'
      });
    }
  }, [projectFiles, fileTree, fileSelection, pushToast, setCode, runHeuristicAnalysis]);

  const handleSmartPaste = useCallback(
    (result: { code?: string; trace?: string }) => {
      if (result.code) setCode(result.code);
      if (result.trace) setTrace(result.trace);
    },
    [setCode, setTrace]
  );






  return (
    <div className="space-y-6">
      {/* Input Method Selector */}
      <Card>
        <CardHeader
          title="Input Method"
          description="Choose how to provide your code for analysis."
        />

        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'manual', label: 'Manual Input', icon: '✏️' },
              { id: 'github', label: 'GitHub Repo', icon: '🐙' },
              { id: 'upload', label: 'Upload Files', icon: '📁' },
            ].map(method => (
              <button
                key={method.id}
                onClick={() => setInputMethod(method.id as typeof inputMethod)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  inputMethod === method.id
                    ? 'bg-sky-500 text-slate-950'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {method.icon} {method.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Input Content */}
      {inputMethod === 'manual' && (
        <Card>
          <CardHeader
            title="Manual Input"
            description="Paste code + stack trace. BugBuddy uses safe client-side heuristics."
            action={
              <div className="flex flex-wrap items-center gap-2">
              <SmartPaste
                onResult={handleSmartPaste}
              />
                <div className="w-full sm:w-40">
                  <Select
                    value={focus}
                    onChange={(v) => setFocus(v as FocusMode)}
                    options={FOCUS_OPTIONS}
                  />
                </div>
              </div>
            }
          />

        <div className="mt-4 space-y-4">
          {/* Environment inputs */}
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Java version"
              value={env.javaVersion}
              onChange={(v) => updateEnv({ javaVersion: v })}
              placeholder="e.g., 17, 21"
            />
            <Input
              label="Build tool"
              value={env.buildTool}
              onChange={(v) => updateEnv({ buildTool: v })}
              placeholder="Maven / Gradle"
            />
          </div>

          <Textarea
            label="Stack trace / error"
            helper="Tip: include the FIRST failure, not only the last"
            value={trace}
            onChange={setTrace}
            placeholder="Paste your stack trace here…"
            rows={10}
            mono
          />

          <Textarea
            label="Java code (snippet)"
            helper="Tip: include the method + callers around the failing line"
            value={code}
            onChange={setCode}
            placeholder="Paste the relevant code here…"
            rows={14}
            mono
          />

          <Textarea
            label="Notes (optional)"
            value={env.notes}
            onChange={(v) => updateEnv({ notes: v })}
            placeholder="Constraints, what you already tried..."
            rows={3}
          />
        </div>
      </Card>
      )}



      {(inputMethod === 'github' || inputMethod === 'upload') && (
        <ProjectManager
          files={projectFiles}
          onSetFiles={handleFileImport}
          onSelectFile={(content) => setCode(content)}
          onToast={(msg, tone) => {
            pushToast({
              title: tone === 'green' ? 'Success' : tone === 'yellow' ? 'Warning' : 'Error',
              message: msg,
              tone
            });
          }}
        />
      )}

      {/* File Selector */}
      {showFileSelector && projectFiles.length > 0 && (
        <Card>
          <CardHeader
            title="Select Files to Analyze"
            description="Choose which files from the imported codebase you want to analyze."
            action={
              <Button variant="secondary" onClick={() => setShowFileSelector(false)}>
                Cancel
              </Button>
            }
          />

          <div className="mt-4">
            <FileTree
              nodes={fileTree}
              selection={fileSelection}
              onSelectionChange={setFileSelection}
            />

            <div className="mt-4 flex justify-end">
              <Button
                variant="primary"
                onClick={handleAnalyzeSelected}
              >
                Analyze Selected Files ({fileSelection.selectedPaths.length})
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// Results Panel
// ============================================================

function ResultsPanel() {
  const {
    analysis,
    traceInfo,
    code,
    focusLine,
    bugFamily,
    loadingAI,
    runHeuristicAnalysis,
    runAIAnalysis,
    clearAnalysis,
    addFindingToPlan,
  } = useBugBuddy();

  return (
    <div className="space-y-6">
      {/* Stack Trace Analysis */}
      <Card>
        <CardHeader
          title="Parsed stack trace"
          description="Exception analysis + first frame focus."
          action={
            <div className="flex flex-wrap gap-2">
              {traceInfo.exceptionClass ? (
                <Pill tone="red">{traceInfo.exceptionClass}</Pill>
              ) : (
                <Pill tone="yellow">No exception detected</Pill>
              )}
              {traceInfo.primaryFrame && (
                <Pill tone="slate">
                  {traceInfo.primaryFrame.file}:
                  {traceInfo.primaryFrame.line ?? '?'}
                </Pill>
              )}
            </div>
          }
        />

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <InfoCard label="Message">
            {traceInfo.message || (
              <span className="text-slate-500">(none)</span>
            )}
          </InfoCard>
          <InfoCard label="Bug family">{bugFamily}</InfoCard>
        </div>

        <div className="mt-4">
          <CodeFrame
            code={code}
            focusLine={focusLine}
            fileLabel={
              traceInfo.primaryFrame ? traceInfo.primaryFrame.file : ''
            }
          />
        </div>
      </Card>

      {/* Findings */}
      <Card>
        <CardHeader
          title="Findings"
          description="Heuristic hints & AI Suspects."
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={clearAnalysis}>
                Clear
              </Button>
              <Button variant="secondary" onClick={runHeuristicAnalysis}>
                Heuristic
              </Button>
               <Button
                 variant="primary"
                 onClick={runAIAnalysis}
                 disabled={loadingAI}
                 loading={loadingAI}
               >
                 {loadingAI ? 'Thinking...' : 'AI Code Analyzer'}
               </Button>
            </div>
          }
        />

        <div className="mt-4">
          {!analysis ? (
            <EmptyState
              message='Click "Analyze" to generate suspects and a plan.'
            />
          ) : (
            <div className="space-y-4">
              {analysis.isAiGenerated && (
                <div className="text-xs text-sky-400 mb-2">
                  ✨ AI Generated Analysis
                </div>
              )}
              {analysis.findings.map((finding) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  onAddToPlan={addFindingToPlan}
                />
              ))}
              {analysis.findings.length === 0 && (
                <EmptyState message="No findings detected. Try adding more context or a different stack trace." />
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// Info Card Helper
// ============================================================

interface InfoCardProps {
  label: string;
  children: React.ReactNode;
}

function InfoCard({ label, children }: InfoCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm text-slate-200">{children}</div>
    </div>
  );
}
