'use client';

import { useState } from 'react';
import { RotateCcw, Loader2 } from 'lucide-react';

/**
 * Demo reset.
 *
 * Wipes the local database and re-seeds on reload. Exists because clearing
 * IndexedDB by hand through DevTools is fiddly, easy to do on the wrong
 * origin, and a terrible thing to be attempting five minutes before a demo.
 *
 * Deliberately NOT shown in production builds — a collector must never be one
 * mis-tap away from destroying their earnings history.
 */
export function DemoReset() {
  const [busy, setBusy] = useState(false);

  if (process.env.NODE_ENV === 'production') return null;

  const reset = async () => {
    setBusy(true);
    try {
      // Close Dexie's open connection first, or the delete request blocks
      // and silently never completes.
      const { db } = await import('@/lib/db');
      try {
        db().close();
      } catch {
        /* not open yet — fine */
      }

      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('kabadiwala-connect');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
        setTimeout(resolve, 1500);
      });

      try {
        localStorage.clear();
      } catch {
        /* storage blocked — nothing to clear */
      }

      location.href = '/collector';
    } catch {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={reset}
      disabled={busy}
      title="Wipe local data and re-seed (dev only)"
      className="fixed bottom-24 right-3 z-30 inline-flex h-11 items-center gap-1.5 rounded-full
                 bg-slate-900/85 px-3 text-[11px] font-bold text-white shadow-e3 backdrop-blur
                 transition active:scale-95 hover:bg-slate-900 disabled:opacity-60"
    >
      {busy ? (
        <Loader2 size={14} className="animate-spin" aria-hidden />
      ) : (
        <RotateCcw size={14} aria-hidden />
      )}
      Reset demo
    </button>
  );
}
