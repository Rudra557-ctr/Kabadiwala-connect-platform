'use client';

import { Volume2, WifiOff, RefreshCw, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { useApp } from '@/lib/app-context';

/**
 * Speak button. Appears on every screen that shows information a collector
 * needs but may not be able to read — which, in this app, is most of them.
 *
 * It is an icon button with an accessible label rather than a labelled button,
 * because a text label would be the very thing our user cannot read. The
 * speaker glyph is near-universally understood.
 */
export function SpeakButton({
  text,
  className,
  size = 'md',
}: {
  text: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const { sayText, t } = useApp();
  const dim = size === 'lg' ? 'h-14 w-14' : size === 'sm' ? 'h-10 w-10' : 'h-12 w-12';
  const icon = size === 'lg' ? 26 : size === 'sm' ? 18 : 22;

  return (
    <button
      type="button"
      onClick={() => sayText(text)}
      aria-label={t('action.listen')}
      className={clsx(
        dim,
        'inline-flex shrink-0 items-center justify-center rounded-full',
        'bg-brand-600 text-white shadow-sm transition active:scale-95 hover:bg-brand-700',
        className,
      )}
    >
      <Volume2 size={icon} aria-hidden />
    </button>
  );
}

/**
 * Sync status. Deliberately a count with an icon, never a bare spinner.
 *
 * A collector who cannot verify that their morning's work is safely stored
 * will not trust the app enough to use it offline — and offline is where they
 * live. "3 waiting" is a promise the UI can keep; a spinner is not.
 */
export function SyncBadge() {
  const { online, pending, t } = useApp();

  if (!online) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
        <WifiOff size={14} aria-hidden />
        {pending > 0 ? `${pending} ${t('sync.pending')}` : t('sync.offline')}
      </span>
    );
  }

  if (pending > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-900">
        <RefreshCw size={14} className="animate-spin" aria-hidden />
        {pending} {t('sync.pending')}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
      <Check size={14} aria-hidden />
      {t('sync.done')}
    </span>
  );
}

/** Money, formatted the Indian way (lakh/crore grouping). */
export function Rupees({
  value,
  className,
  size = 'md',
}: {
  value: number;
  className?: string;
  size?: 'md' | 'lg' | 'xl';
}) {
  const cls =
    size === 'xl' ? 'text-price-lg' : size === 'lg' ? 'text-price' : 'text-2xl font-extrabold';
  return (
    <span className={clsx(cls, 'tabular-nums', className)}>
      ₹{Math.round(value).toLocaleString('en-IN')}
    </span>
  );
}

/**
 * Range display. Used everywhere a value is an estimate.
 * Showing a band rather than a fake-precise point is a deliberate honesty
 * choice — and it is also what a real trader would quote.
 */
export function RupeeRange({ low, high }: { low: number; high: number }) {
  return (
    <span className="tabular-nums text-2xl font-extrabold">
      ₹{Math.round(low).toLocaleString('en-IN')}
      <span className="muted mx-1 text-lg font-semibold">–</span>
      ₹{Math.round(high).toLocaleString('en-IN')}
    </span>
  );
}

export function Chip({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info';
}) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-700',
    good: 'bg-emerald-100 text-emerald-800',
    warn: 'bg-amber-100 text-amber-900',
    bad: 'bg-red-100 text-red-800',
    info: 'bg-sky-100 text-sky-800',
  } as const;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
