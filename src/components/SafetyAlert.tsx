'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle, Info, Volume2 } from 'lucide-react';
import { clsx } from 'clsx';
import { getMaterial, type MaterialCategoryId } from '@/lib/materials';
import { useApp } from '@/lib/app-context';

/**
 * Contextual safety guidance.
 *
 * The design decision that matters here is WHEN this appears: the instant the
 * material is identified, while it is still in the collector's hands — not
 * filed under a "Safety" tab that nobody with a day's work ahead of them will
 * ever open.
 *
 * PS 26229 asks for "pictorial and/or audio-based safety guidance on hazardous
 * practices". So the warning is a pictogram plus speech, with the text as the
 * least important of the three channels.
 *
 * The second design decision is framing. Every warning pairs the hazard with
 * the ECONOMIC reason not to do the dangerous thing ("stripped copper sells
 * for more than burnt copper"). Telling someone their livelihood is unsafe
 * rarely changes behaviour; telling them it is costing them money does.
 */
export function SafetyAlert({
  category,
  autoSpeak = false,
  compact = false,
}: {
  category: MaterialCategoryId;
  /** Speak the warning once on mount. Used at the moment of identification. */
  autoSpeak?: boolean;
  compact?: boolean;
}) {
  const { t, sayText } = useApp();
  const material = getMaterial(category);
  const { level, warningKey } = material.safety;
  const spokenFor = useRef<string | null>(null);

  const warning = t(warningKey);
  const why = t(material.whyFormalKey);

  useEffect(() => {
    if (!autoSpeak) return;
    if (level === 'none') return;
    // Guard against re-speaking on every re-render — React 19 StrictMode
    // double-invokes effects in dev, and hearing the warning twice is jarring.
    if (spokenFor.current === category) return;
    spokenFor.current = category;
    sayText(warning);
  }, [autoSpeak, category, level, warning, sayText]);

  if (level === 'none' && compact) return null;

  const isHigh = level === 'high';

  return (
    <div
      role={isHigh ? 'alert' : undefined}
      className={clsx(
        'rounded-2xl border p-4',
        isHigh
          ? 'border-red-300 bg-red-50 text-red-950'
          : level === 'caution'
            ? 'border-amber-300 bg-amber-50 text-amber-950'
            : 'border-slate-200 bg-slate-50 text-slate-900',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={clsx(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            isHigh ? 'bg-red-600 text-white' : level === 'caution' ? 'bg-amber-500 text-white' : 'bg-slate-300',
          )}
        >
          {level === 'none' ? <Info size={22} /> : <AlertTriangle size={22} />}
        </span>

        <div className="min-w-0 flex-1">
          <p className={clsx('font-bold leading-snug', isHigh ? 'text-base' : 'text-sm')}>
            {warning}
          </p>

          {!compact && why && (
            <p className="mt-2 text-sm leading-snug opacity-90">{why}</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => sayText(compact ? warning : `${warning} ${why}`)}
          aria-label={t('action.listen')}
          className={clsx(
            'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition active:scale-95',
            isHigh ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700',
          )}
        >
          <Volume2 size={20} aria-hidden />
        </button>
      </div>
    </div>
  );
}
