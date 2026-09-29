'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ArrowRight, Volume2 } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { Rupees } from './ui';
import type { FairBand } from '@/lib/pricing';
import type { RankedRecycler } from '@/lib/matching';
import { priceSentence, rangeSentence } from '@/lib/speech';

/**
 * Underpricing warning — the PS's core problem, made actionable.
 *
 * The problem statement says collectors "may not know the prevailing fair
 * price". Knowing it a day later is useless. The moment that matters is the
 * one before they accept a bad offer, so this interrupts the sale and SPEAKS
 * the warning, because the person who most needs it cannot read it.
 *
 * Two deliberate design choices:
 *
 *  1. It does NOT block the sale. The collector may have good reasons we
 *     cannot see — a standing relationship, a debt, needing cash today. An app
 *     that refuses to let someone sell their own material would be paternalistic
 *     and they would stop using it. We inform, they decide.
 *
 * Rendered through a portal to <body>. It is correctly positioned today, but
 * only because no ancestor happens to carry a transform — and any element with
 * a transform becomes the containing block for `position: fixed` descendants.
 * Adding an entrance animation to a parent would clip this off-screen with no
 * warning. The portal makes that impossible.
 *
 *  2. It only fires on a CLEAR shortfall (see judgeOffer's 5% margin). A
 *     warning that fires on a nearly-fair offer teaches people to dismiss
 *     warnings, which destroys the value of the one that really matters.
 */
export function LowOfferWarning({
  offer,
  band,
  better,
  onProceed,
  onCancel,
}: {
  offer: RankedRecycler;
  band: FairBand;
  /** Best eligible alternative, if one exists. */
  better?: RankedRecycler;
  onProceed: () => void;
  onCancel: () => void;
}) {
  const { t, locale, sayText } = useApp();
  const spoken = useRef(false);
  // Portals need a DOM target, absent during SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const gain = better ? better.netValue - offer.netValue : 0;

  useEffect(() => {
    if (spoken.current) return;
    spoken.current = true;
    // Speak the warning, the fair range, and — if there is one — how much
    // more the better option pays. Money is the part that lands.
    const parts = [t('price.tooLow'), rangeSentence(band.low, band.high, locale)];
    if (better && gain > 0) {
      parts.push(`${priceSentence(gain, locale, false)} ${t('econ.more')}`);
    }
    sayText(parts.join('. '));
  }, [t, locale, sayText, band, better, gain]);

  if (!mounted) return null;

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="low-offer-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white"
          >
            <AlertTriangle size={26} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="low-offer-title" className="text-lg font-extrabold leading-tight text-red-700">
              {t('price.tooLow')}
            </h2>
            <p className="muted mt-1 text-sm">{offer.recycler.name}</p>
          </div>
          <button
            type="button"
            onClick={() => sayText(`${t('price.tooLow')}. ${rangeSentence(band.low, band.high, locale)}`)}
            aria-label={t('action.listen')}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-600 text-white transition active:scale-95"
          >
            <Volume2 size={22} aria-hidden />
          </button>
        </div>

        {/* Offered vs fair, side by side. The comparison is the message. */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-red-50 p-3 text-center">
            <p className="text-xs font-bold text-red-700">{t('price.yourOffer')}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-red-700">
              ₹{offer.ratePerKg}
            </p>
            <p className="text-[10px] font-semibold text-red-600">{t('price.perKg')}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-3 text-center">
            <p className="text-xs font-bold text-emerald-800">{t('price.fairBand')}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-emerald-800">
              ₹{band.low}–{band.high}
            </p>
            <p className="text-[10px] font-semibold text-emerald-700">{t('price.perKg')}</p>
          </div>
        </div>

        {better && gain > 0 && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-brand-300 bg-brand-50 p-3 text-left transition active:scale-[0.99]"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-brand-900">
                {better.recycler.name}
              </span>
              <span className="block text-xs text-brand-700">
                +<Rupees value={gain} className="!text-xs !font-extrabold" /> {t('econ.more')}
              </span>
            </span>
            <ArrowRight size={18} className="shrink-0 text-brand-700" aria-hidden />
          </button>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {/* Safer choice gets visual priority; selling anyway stays available. */}
          <button type="button" onClick={onCancel} className="tap-primary w-full">
            {t('action.back')}
          </button>
          <button type="button" onClick={onProceed} className="tap-ghost w-full !text-sm muted">
            {t('action.sellAnyway')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
