// ============================================================
// BugBuddy Context Provider
// ============================================================

import React, { createContext, useContext } from 'react';
import { useBugBuddyState, BugBuddyState } from '../hooks/useBugBuddyState';

const BugBuddyContext = createContext<BugBuddyState | null>(null);

interface BugBuddyProviderProps {
  children: React.ReactNode;
}

export function BugBuddyProvider({ children }: BugBuddyProviderProps) {
  const state = useBugBuddyState();

  return (
    <BugBuddyContext.Provider value={state}>
      {children}
    </BugBuddyContext.Provider>
  );
}

export function useBugBuddy(): BugBuddyState {
  const context = useContext(BugBuddyContext);
  
  if (!context) {
    throw new Error('useBugBuddy must be used within a BugBuddyProvider');
  }
  
  return context;
}

// Re-export types for convenience
export type { BugBuddyState };
