'use client';

/**
 * App context and the useApp hook, kept SEPARATE from AppProvider.tsx.
 *
 * Why the split: a file that exports both a React component and a non-component
 * (a hook, a constant) cannot be hot-updated by Fast Refresh. Next.js falls
 * back to a FULL PAGE RELOAD on every edit, which during development looks
 * like the screen rendering and then snapping back to its initial state —
 * and it wipes any in-page state you were in the middle of testing.
 *
 * Keeping the hook here means AppProvider.tsx exports only a component, so
 * edits hot-update in place.
 */

import { createContext, useContext } from 'react';
import type { Collector } from './db';
import type { Locale } from './i18n';

export interface AppState {
  ready: boolean;
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Speak a translation key in the current locale. */
  say: (key: string, vars?: Record<string, string | number>) => void;
  /** Speak a literal string (already-composed prices, etc). */
  sayText: (text: string) => void;
  stop: () => void;
  collector: Collector | null;
  online: boolean;
  pending: number;
  refreshPending: () => void;
}

export const AppCtx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
