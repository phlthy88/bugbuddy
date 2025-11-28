// ============================================================
// SmartPaste Component - Intelligent paste handling
// ============================================================

import { useCallback } from 'react';
import { Button } from './UI';

interface SmartPasteResult {
  code?: string;
  trace?: string;
}

interface SmartPasteResult {
  code?: string;
  trace?: string;
}

interface SmartPasteProps {
  onResult: (result: SmartPasteResult) => void;
  className?: string;
}

export function SmartPaste({ onResult, className }: SmartPasteProps) {
  const handleSmartPaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const result: SmartPasteResult = {};

      // Simple heuristic: if it contains "at " and ".java", it's likely a stack trace
      if (text.includes('at ') && (text.includes('.java') || text.includes('Exception'))) {
        result.trace = text;
      } else if (text.includes('class ') || text.includes('public ') || text.includes('void ')) {
        result.code = text;
      } else {
        // Try to split by common patterns
        const lines = text.split('\n');
        const traceLines = lines.filter(line =>
          line.includes('at ') || line.includes('Exception') || line.includes('Caused by')
        );
        const codeLines = lines.filter(line =>
          line.includes('class ') || line.includes('public ') || line.includes('void ')
        );

        if (traceLines.length > codeLines.length) {
          result.trace = text;
        } else {
          result.code = text;
        }
      }

      onResult(result);
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  }, [onResult]);

  return (
    <Button
      variant="secondary"
      onClick={handleSmartPaste}
      className={className}
      title="Smart paste from clipboard"
    >
      📋 Smart Paste
    </Button>
  );
}