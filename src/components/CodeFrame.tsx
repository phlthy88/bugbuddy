// ============================================================
// CodeFrame Component - Displays code with syntax highlighting
// ============================================================

import { useMemo } from 'react';
import { Card, CardHeader } from './UI';
import { splitLines } from '../utils';

function sliceCodeFrame(code: string, lineNumber: number | null, radius = 3) {
  const lines = splitLines(code);
  if (!lineNumber || !Number.isFinite(lineNumber) || lineNumber < 1) {
    return { start: 1, end: Math.min(lines.length, 10), lines };
  }
  const start = Math.max(1, lineNumber - radius);
  const end = Math.min(lines.length, lineNumber + radius);
  return { start, end, lines };
}

interface CodeFrameProps {
  code: string;
  focusLine?: number | null;
  fileLabel?: string;
  className?: string;
}

export function CodeFrame({ code, focusLine, fileLabel, className }: CodeFrameProps) {
  const { start, end, lines } = useMemo(
    () => sliceCodeFrame(code, focusLine ?? null, 4),
    [code, focusLine]
  );

  const maxLineNumber = end;
  const lineNumberWidth = String(maxLineNumber).length;

  return (
    <Card className={className}>
      <CardHeader
        title="Code Frame"
        description={`${fileLabel || 'Code snippet'}${
          focusLine ? ` • focus line ${focusLine}` : ''
        }`}
      />
      <div className="mt-3 overflow-auto rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
        <pre className="text-xs text-slate-200">
          <code>
            {lines.slice(start - 1, end).map((line, index) => {
              const lineNumber = start + index;
              const isFocus = focusLine && lineNumber === focusLine;
              return (
                <div
                  key={lineNumber}
                  className={`grid grid-cols-[auto,1fr] gap-3 px-2 py-0.5 rounded-lg ${
                    isFocus ? 'bg-rose-500/15 border border-rose-600/30' : ''
                  }`}
                >
                  <span className="select-none text-slate-500" style={{ width: `${lineNumberWidth}ch` }}>
                    {String(lineNumber).padStart(lineNumberWidth, ' ')}
                  </span>
                  <span className="whitespace-pre-wrap break-words">{line || ' '}</span>
                </div>
              );
            })}
          </code>
        </pre>
      </div>
    </Card>
  );
}