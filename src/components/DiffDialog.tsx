// ============================================================
// Diff Dialog Component
// ============================================================

import React, { useState, useEffect } from 'react';

interface DiffDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  oldCode: string;
  newCode: string;
  title?: string;
}

export function DiffDialog({ isOpen, onClose, onConfirm, oldCode, newCode, title = "Apply Code Changes" }: DiffDialogProps) {
  const [activeTab, setActiveTab] = useState<'diff' | 'old' | 'new'>('diff');

  useEffect(() => {
    if (isOpen) {
      setActiveTab('diff');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const createDiffView = (oldText: string, newText: string) => {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');

    const maxLines = Math.max(oldLines.length, newLines.length);
    const diffLines: JSX.Element[] = [];

    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';
      const lineNum = i + 1;

      if (oldLine !== newLine) {
        if (oldLine && !newLine) {
          // Line removed
          diffLines.push(
            <div key={i} className="flex text-red-400 bg-red-950/20">
              <span className="w-12 text-right pr-2 text-slate-500 select-none">{lineNum}</span>
              <span className="w-12 text-right pr-2 text-slate-500 select-none">-</span>
              <span className="flex-1 font-mono text-sm"> {oldLine}</span>
            </div>
          );
        } else if (!oldLine && newLine) {
          // Line added
          diffLines.push(
            <div key={i} className="flex text-green-400 bg-green-950/20">
              <span className="w-12 text-right pr-2 text-slate-500 select-none">{lineNum}</span>
              <span className="w-12 text-right pr-2 text-slate-500 select-none">+</span>
              <span className="flex-1 font-mono text-sm"> {newLine}</span>
            </div>
          );
        } else {
          // Line changed - show both
          diffLines.push(
            <div key={`${i}-old`} className="flex text-red-400 bg-red-950/20">
              <span className="w-12 text-right pr-2 text-slate-500 select-none">{lineNum}</span>
              <span className="w-12 text-right pr-2 text-slate-500 select-none">-</span>
              <span className="flex-1 font-mono text-sm"> {oldLine}</span>
            </div>
          );
          diffLines.push(
            <div key={`${i}-new`} className="flex text-green-400 bg-green-950/20">
              <span className="w-12 text-right pr-2 text-slate-500 select-none">+</span>
              <span className="flex-1 font-mono text-sm"> {newLine}</span>
            </div>
          );
        }
      } else if (oldLine) {
        // Unchanged line
        diffLines.push(
          <div key={i} className="flex text-slate-300">
            <span className="w-12 text-right pr-2 text-slate-500 select-none">{lineNum}</span>
            <span className="w-12 text-right pr-2 text-slate-500 select-none"> </span>
            <span className="flex-1 font-mono text-sm"> {oldLine}</span>
          </div>
        );
      }
    }

    return diffLines;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onKeyDown={handleKeyDown}>
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-200">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 py-2 border-b border-slate-700">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('diff')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                activeTab === 'diff'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Diff View
            </button>
            <button
              onClick={() => setActiveTab('old')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                activeTab === 'old'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Original
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                activeTab === 'new'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Modified
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950">
          {activeTab === 'diff' && (
            <div className="font-mono text-sm leading-relaxed">
              {createDiffView(oldCode, newCode)}
            </div>
          )}
          {activeTab === 'old' && (
            <pre className="text-slate-300 font-mono text-sm whitespace-pre-wrap p-4 bg-slate-900 rounded border">
              {oldCode}
            </pre>
          )}
          {activeTab === 'new' && (
            <pre className="text-slate-300 font-mono text-sm whitespace-pre-wrap p-4 bg-slate-900 rounded border">
              {newCode}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {activeTab === 'diff' && 'Green lines are additions, red lines are removals'}
            {activeTab === 'old' && 'Original code'}
            {activeTab === 'new' && 'Modified code'}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
            >
              Cancel (Esc)
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded transition-colors font-medium"
            >
              Apply Changes (Ctrl+Enter)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}