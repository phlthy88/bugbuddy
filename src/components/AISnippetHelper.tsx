// ============================================================
// AI Snippet Helper Component - GitHub Copilot Style
// ============================================================

import { useState, useCallback } from 'react';
import { useBugBuddy } from '../context/BugBuddyContext';
import { Button, Card, CardHeader } from './UI';
import { generateCodeSnippet } from '../services/ai';
import { copyToClipboard } from '../utils';

interface AISnippetHelperProps {
  onInsertSnippet?: (snippet: string) => void;
}

export function AISnippetHelper({ onInsertSnippet }: AISnippetHelperProps) {
  const { pushToast } = useBugBuddy();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSnippet, setGeneratedSnippet] = useState<{
    snippet: string;
    explanation: string;
    confidence: number;
  } | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      pushToast({
        title: 'Empty prompt',
        message: 'Please describe what code you need',
        tone: 'yellow'
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateCodeSnippet(prompt, 'java', prompt);
      setGeneratedSnippet(result);
      pushToast({
        title: 'Snippet generated',
        message: `AI generated code with ${Math.round(result.confidence * 100)}% confidence`,
        tone: 'green'
      });
    } catch (error) {
      pushToast({
        title: 'Generation failed',
        message: 'Could not generate code snippet',
        tone: 'red'
      });
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, pushToast]);

  const handleCopySnippet = useCallback(async () => {
    if (!generatedSnippet) return;

    const success = await copyToClipboard(generatedSnippet.snippet);
    pushToast({
      title: success ? 'Copied' : 'Copy failed',
      message: success ? 'Code snippet copied to clipboard' : 'Clipboard access blocked',
      tone: success ? 'green' : 'red'
    });
  }, [generatedSnippet, pushToast]);

  const handleInsertSnippet = useCallback(() => {
    if (!generatedSnippet || !onInsertSnippet) return;

    onInsertSnippet(generatedSnippet.snippet);
    pushToast({
      title: 'Inserted',
      message: 'Code snippet inserted into editor',
      tone: 'green'
    });
  }, [generatedSnippet, onInsertSnippet, pushToast]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleGenerate();
    }
  }, [handleGenerate]);

  return (
    <Card>
      <CardHeader
        title="AI Snippet Helper"
        description="GitHub Copilot-style code generation for Java fixes"
      />

      <div className="mt-4 space-y-4">
        {/* Prompt Input */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Describe what you need
          </label>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., 'null-safe method call', 'try-catch for file operations', 'stream filter and map'..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500/60 transition-colors resize-none"
              rows={3}
            />
            <div className="absolute bottom-2 right-2 text-xs text-slate-500">
              Ctrl+Enter to generate
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          variant="primary"
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full justify-center"
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Generating with AI...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span>✨</span>
              Generate Snippet
            </span>
          )}
        </Button>

        {/* Generated Snippet */}
        {generatedSnippet && (
          <div className="space-y-3">
            {/* Confidence Indicator */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">Confidence:</span>
              <div className="flex-1 bg-slate-800 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-yellow-500 to-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${generatedSnippet.confidence * 100}%` }}
                />
              </div>
              <span className="text-slate-300 font-mono">
                {Math.round(generatedSnippet.confidence * 100)}%
              </span>
            </div>

            {/* Explanation */}
            <div className="text-sm text-slate-300 bg-slate-800/50 rounded-lg p-3">
              {generatedSnippet.explanation}
            </div>

            {/* Code Snippet */}
            <div className="relative">
              <pre className="overflow-auto rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-200 font-mono max-h-64">
                <code>{generatedSnippet.snippet}</code>
              </pre>

              {/* Action Buttons */}
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  onClick={handleCopySnippet}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded transition-colors"
                  title="Copy to clipboard"
                >
                  📋
                </button>
                {onInsertSnippet && (
                  <button
                    onClick={handleInsertSnippet}
                    className="px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white text-xs rounded transition-colors"
                    title="Insert into editor"
                  >
                    ↗
                  </button>
                )}
              </div>
            </div>

            {/* Regenerate Option */}
            <div className="text-center">
              <button
                onClick={() => setGeneratedSnippet(null)}
                className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
              >
                Clear and try different prompt
              </button>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="text-xs text-slate-500 bg-slate-800/30 rounded-lg p-3">
          <strong>Tips:</strong>
          <ul className="mt-1 space-y-1 ml-4">
            <li>• Be specific: "null-safe string comparison" vs "fix null pointer"</li>
            <li>• Include context: "Spring Boot controller exception handling"</li>
            <li>• Mention patterns: "builder pattern for object creation"</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}