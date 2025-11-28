// ============================================================
// Custom Hooks for BugBuddy
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { safeJsonParse } from '../utils';

/**
 * Local storage state hook with automatic persistence
 * Includes error handling and type safety
 */
export function useLocalStorageState<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  // Initialize state from localStorage or fallback
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const raw = localStorage.getItem(key);
      if (key === 'bugbuddy_openrouter_key') {
        console.log(`useLocalStorageState - Initializing key "${key}":`, raw ? `${raw.substring(0, 10)}...` : 'null');
      }
      if (raw === null) return initialValue;
      return safeJsonParse(raw, initialValue);
    } catch {
      console.warn(`Failed to read localStorage key "${key}"`, );
      return initialValue;
    }
  });

  // Persist to localStorage on change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(key, JSON.stringify(state));
      if (key === 'bugbuddy_openrouter_key') {
        console.log(`useLocalStorageState - Saved key "${key}":`, typeof state === 'string' && state ? `${state.substring(0, 10)}... (${state.length} chars)` : 'empty');
      }
    } catch (error) {
      console.warn(`Failed to write localStorage key "${key}"`, error);
    }
  }, [key, state]);

  // Reset function to clear this specific key
  const reset = useCallback(() => {
    localStorage.removeItem(key);
    setState(initialValue);
  }, [key, initialValue]);

  return [state, setState, reset];
}

/**
 * Toast notification hook with auto-dismiss
 */
export interface ToastData {
  id: string;
  tone: 'green' | 'red' | 'yellow' | 'blue' | 'slate';
  title: string;
  message: string;
}

export function useToasts(maxToasts = 4, autoDismissMs = 5000) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const push = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    setToasts((prev) => [{ id, ...toast }, ...prev].slice(0, maxToasts));

    // Auto-dismiss after delay
    if (autoDismissMs > 0) {
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timersRef.current.delete(id);
      }, autoDismissMs);
      
      timersRef.current.set(id, timer);
    }

    return id;
  }, [maxToasts, autoDismissMs]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const clear = useCallback(() => {
    setToasts([]);
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  return { toasts, push, dismiss, clear };
}

/**
 * Debounced value hook
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Previous value hook
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
}

/**
 * Stable callback reference hook
 */
export function useStableCallback<T extends (...args: unknown[]) => unknown>(
  callback: T
): T {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  return useCallback(
    ((...args) => callbackRef.current(...args)) as T,
    []
  );
}

/**
 * Media query hook
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Keyboard shortcut hook
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}
): void {
  const { ctrl = false, shift = false, alt = false } = options;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === key.toLowerCase() &&
        event.ctrlKey === ctrl &&
        event.shiftKey === shift &&
        event.altKey === alt
      ) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, ctrl, shift, alt, callback]);
}

/**
 * Confirmation dialog hook (replaces window.confirm)
 */
export function useConfirm() {
  const [state, setState] = useState<{
    isOpen: boolean;
    message: string;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    message: '',
    resolve: null,
  });

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ isOpen: true, message, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState({ isOpen: false, message: '', resolve: null });
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState({ isOpen: false, message: '', resolve: null });
  }, [state.resolve]);

  return {
    isOpen: state.isOpen,
    message: state.message,
    confirm,
    handleConfirm,
    handleCancel,
  };
}
