'use client';

import { Gauge } from 'lucide-react';
import { clsx } from 'clsx';
import { useApp } from '@/lib/app-context';
import { SpeakButton } from './ui';

/**
 * Collector accuracy score.
 *
 * Computed from declared weight vs the recycler's weighbridge reading over
 * history (computeReliability in seed-transactions.ts). It was already being
 * calculated and stored but never shown to anyone — so it did no work.
 *
 * Two audiences, one number:
 *   - the RECYCLER sees it as a trust signal on inbound lots
 *   - the COLLECTOR sees it with a plain-language explanation of how to
 *     improve it, because a score you cannot act on is just a judgement
 *
 * Framed as "accuracy", not "rating". A collector whose scale is old is not a
 * bad person, and a score that reads as a character verdict would push people
 * off the platform rather than toward better weighing.
 */
export function TrustScore({ score, compact = false }: { score: number; compact?: boolean }) {
  const { t } = useApp();

  const band = score >= 90 ? 'good' : score >= 70 ? 'ok' : 'poor';
  const message = t(`trust.${band}`);

  const tone = {
    good: { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'bg-emerald-500' },
    ok: { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', bar: 'bg-amber-500' },
    poor: { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', bar: 'bg-red-500' },
  }[band];

  if (compact) {
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
          tone.bg,
          tone.text,
        )}
      >
        <Gauge size={11} aria-hidden />
        {score}%
      </span>
    );
  }

  return (
    <div className={clsx('rounded-2xl border p-4', tone.bg, tone.border)}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', tone.text)}
        >
          <Gauge size={24} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className={clsx('text-2xl font-extrabold tabular-nums', tone.text)}>{score}%</span>
            <span className="muted text-sm font-semibold">{t('trust.title')}</span>
          </div>

          {/* The bar is the part that reads without literacy. */}
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/10">
            <div
              className={clsx('h-full rounded-full transition-all', tone.bar)}
              style={{ width: `${Math.max(3, Math.min(100, score))}%` }}
            />
          </div>

          <p className={clsx('mt-2 text-sm leading-snug', tone.text)}>{message}</p>
          <p className="muted mt-1 text-xs">{t('trust.help')}</p>
        </div>

        <SpeakButton size="sm" text={`${t('trust.title')} ${score}%. ${message}`} />
      </div>
    </div>
  );
}
