'use client';

import { useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { LOCALES, type Locale } from '@/lib/i18n';
import { speak } from '@/lib/speech';
import { useApp } from '@/lib/app-context';

/**
 * First-run language selection.
 *
 * This is the first screen a collector ever sees, and it is the screen that
 * decides whether they can use the app at all. Three rules:
 *
 *  1. Each option is written ONLY in its own script. "Marathi" in Latin script
 *     is useless to someone who reads only Devanagari; "मराठी" is not.
 *  2. Tapping an option speaks its own name in its own language before
 *     committing, so a non-reader can identify it by ear.
 *  3. There is no "skip" and no English default. The language decision is made
 *     before any other text is shown.
 *
 * The greeting is spoken automatically on mount where the browser allows it.
 * Many mobile browsers block speech before a user gesture, so this is
 * best-effort — the per-option speaker buttons are the reliable path.
 */
export function LanguagePicker({ onPick }: { onPick?: (l: Locale) => void }) {
  const { setLocale } = useApp();

  useEffect(() => {
    // Best-effort: may be blocked by autoplay policy until the first tap.
    void speak('भाषा निवडा. Language.', 'mr', { rate: 0.85 });
  }, []);

  const choose = (l: Locale) => {
    setLocale(l);
    onPick?.(l);
  };

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-10">
      <div className="mb-9 text-center animate-fade-up">
        {/* Intentionally icon-led: the mark reads before any of the words do. */}
        <div
          aria-hidden
          className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[1.75rem]
                     bg-grad-brand text-5xl text-white shadow-glow-brand animate-pop-in"
        >
          <span className="absolute inset-0 animate-pulse-ring rounded-[1.75rem] bg-brand-400/30" />
          <span className="relative">♻</span>
        </div>
        <h1 className="text-3xl display">भाषा निवडा</h1>
        <p className="muted mt-1.5 text-base">भाषा चुनें · Choose language</p>
      </div>

      <ul className="space-y-3">
        {LOCALES.map((l, i) => (
          <li key={l.code} className="stagger" style={{ '--i': i } as React.CSSProperties}>
            <div className="flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => choose(l.code)}
                className="card-interactive flex flex-1 items-center justify-between text-left"
              >
                <span className="text-2xl font-bold">{l.nativeLabel}</span>
                <span className="muted text-sm">{l.label}</span>
              </button>

              {/* Hear the language named in that language before committing. */}
              <button
                type="button"
                aria-label={`Listen: ${l.label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  void speak(l.nativeLabel, l.code, { rate: 0.85 });
                }}
                className="inline-flex w-14 shrink-0 items-center justify-center rounded-2xl bg-grad-brand text-white shadow-glow-brand transition-transform duration-150 active:scale-95"
              >
                <Volume2 size={22} aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <p className="muted mt-8 text-center text-xs">
        तुम्ही नंतर भाषा बदलू शकता · You can change this later
      </p>
    </main>
  );
}
