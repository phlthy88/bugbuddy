// ============================================================
// LSPPanel Component - Language Server Protocol diagnostics
// ============================================================

import { Card, CardHeader, Pill } from './UI';
import { Diagnostic } from '../types';

interface LSPPanelProps {
  diagnostics: Diagnostic[];
  loading: boolean;
}

export function LSPPanel({ diagnostics, loading }: LSPPanelProps) {
  const hasAIAnalysis = diagnostics.some(d => d.source === 'gemini-lsp');
  const hasHeuristicAnalysis = diagnostics.some(d => d.source === 'heuristic');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-400 bg-red-950/30 border-red-800/50';
      case 'warn': return 'text-yellow-400 bg-yellow-950/30 border-yellow-800/50';
      case 'info': return 'text-blue-400 bg-blue-950/30 border-blue-800/50';
      default: return 'text-slate-400 bg-slate-950/30 border-slate-800/50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return '🚨';
      case 'warn': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '🔍';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="LSP Diagnostics"
          description={
            hasAIAnalysis
              ? "AI-powered analysis with Gemini"
              : hasHeuristicAnalysis
              ? "Basic heuristic analysis (configure API key for AI)"
              : "Code analysis and suggestions"
          }
        />

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-slate-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <span>Analyzing code with AI...</span>
            </div>
          </div>
        ) : diagnostics.some(d => d.source === 'heuristic') ? (
          <div className="text-center py-6">
            <div className="text-2xl mb-2">🔍</div>
            <div className="text-slate-300 font-medium">Basic Analysis Complete</div>
            <div className="text-slate-500 text-sm mt-1">
              For AI-powered diagnostics, add an OpenRouter API key in{' '}
              <a href="#settings" className="text-sky-400 hover:text-sky-300 underline">
                Settings → AI Analysis
              </a>
            </div>
            <div className="text-xs text-slate-600 mt-2">
              Currently using heuristic analysis
            </div>
          </div>
        ) : (
          <div>
            {diagnostics.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-2xl mb-2">✅</div>
                <div className="text-slate-300 font-medium">No issues found</div>
                <div className="text-slate-500 text-sm mt-1">Your code looks clean!</div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-400">
                    Found {diagnostics.length} issue{diagnostics.length !== 1 ? 's' : ''}
                  </div>
                  <div className="flex gap-2">
                    <Pill tone="red">{diagnostics.filter(d => d.severity === 'error').length} errors</Pill>
                    <Pill tone="yellow">{diagnostics.filter(d => d.severity === 'warn').length} warnings</Pill>
                    <Pill tone="blue">{diagnostics.filter(d => d.severity === 'info').length} info</Pill>
                  </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {diagnostics.map((diag, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border ${getSeverityColor(diag.severity)}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-lg mt-0.5">
                          {getSeverityIcon(diag.severity)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-200 mb-1">
                            {diag.message}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>Line {diag.line}{diag.column > 1 ? `, Col ${diag.column}` : ''}</span>
                            {diag.code && (
                              <>
                                <span>•</span>
                                <code className="bg-slate-800/50 px-1.5 py-0.5 rounded text-xs font-mono">
                                  {diag.code}
                                </code>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Quick Tips */}
      {!loading && diagnostics.length > 0 && (
        <Card>
          <CardHeader
            title="Quick Fixes"
            description="Common solutions for these issues"
          />
          <div className="space-y-2 text-sm text-slate-300">
            {diagnostics.some(d => d.code === 'STRING_COMPARISON') && (
              <div className="p-3 bg-slate-800/30 rounded-lg">
                <div className="font-medium text-yellow-400 mb-1">String Comparison</div>
                <div>Replace <code className="bg-slate-700 px-1 rounded">str1 == str2</code> with <code className="bg-slate-700 px-1 rounded">str1.equals(str2)</code></div>
              </div>
            )}
            {diagnostics.some(d => d.code === 'NULL_POINTER_RISK') && (
              <div className="p-3 bg-slate-800/30 rounded-lg">
                <div className="font-medium text-yellow-400 mb-1">Null Safety</div>
                <div>Use <code className="bg-slate-700 px-1 rounded">Objects.equals(str1, str2)</code> or add null checks</div>
              </div>
            )}
            {diagnostics.some(d => d.code === 'RESOURCE_LEAK') && (
              <div className="p-3 bg-slate-800/30 rounded-lg">
                <div className="font-medium text-yellow-400 mb-1">Resource Management</div>
                <div>Use try-with-resources: <code className="bg-slate-700 px-1 rounded">try (FileInputStream fis = new FileInputStream(file))</code></div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}