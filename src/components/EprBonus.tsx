'use client';

import { Award, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { useApp } from '@/lib/app-context';
import { Rupees, SpeakButton } from './ui';
import { CountUp } from './motion';
import { estimateEpr, type EprEstimate } from '@/lib/epr';
import type { RankedRecycler } from '@/lib/matching';
import type { MaterialCategoryId } from '@/lib/materials';
import { priceSentence } from '@/lib/speech';

/**
 * EPR bonus line.
 *
 * The argument this makes, in one screen: the SAME material sold to an
 * unverified aggregator earns nothing extra, but sold to a licensed recycler
 * through a signed handover it carries recyclable-certificate value — and a
 * share of that can come back to the collector.
 *
 * That is the answer to "why should I bother with the formal route?", stated
 * in rupees rather than in compliance language.
 *
 * The assumed certificate rate is printed on screen deliberately. It is a
 * modelling assumption, not a market quote, and hiding that would be the kind
 * of overclaim that costs credibility with a Ministry panel.
 */
export function EprBonus({
  category,
  weightKg,
  recycler,
  compact = false,
}: {
  category: MaterialCategoryId;
  weightKg: number;
  recycler: RankedRecycler;
  compact?: boolean;
}) {
  const { t, locale } = useApp();

  const epr: EprEstimate = estimateEpr(category, weightKg, {
    authorizedRecycler:
      recycler.recycler.tier === 'authorized_recycler' && recycler.eligible,
    // Every handover through this app is signed, so traceability holds
    // whenever the buyer is a licensed recycler.
    traceableHandover: true,
  });

  if (!epr.eligible) {
    if (compact) return null;
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <p className="muted flex items-start gap-2 text-xs leading-snug">
          <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
          {t('epr.notEligible')}
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-800">
        <Award size={11} aria-hidden />+₹{epr.collectorBonus} {t('epr.bonus')}
      </span>
    );
  }

  const total = recycler.netValue + epr.collectorBonus;

  return (
    <div className="card border-amber-200 bg-amber-50/60 animate-pop-in">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="chip-icon h-11 w-11 bg-amber-500 text-white"
        >
          <Award size={22} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-amber-800">{t('epr.title')}</p>

          <div className="mt-1 flex items-baseline gap-2">
            <CountUp value={epr.collectorBonus} prefix="+₹" className="text-3xl display text-amber-800" />
            <span className="text-xs font-bold text-amber-700">{t('epr.bonus')}</span>
          </div>

          {/* The total is what the collector actually cares about. */}
          <div className="mt-2 flex items-baseline gap-2 border-t border-amber-200 pt-2">
            <span className="text-xs font-bold text-amber-700">{t('epr.withBonus')}</span>
            <Rupees value={total} className="!text-xl !text-amber-900" />
          </div>

          <p className="mt-2 text-xs leading-snug text-amber-900/80">{t('epr.why')}</p>

          {/* Assumption stated on screen, not buried in a footnote. */}
          <p className="mt-1.5 text-[10px] leading-snug text-amber-700/75">
            {t('epr.assumption', { rate: epr.ratePerKg })}
          </p>
        </div>

        <SpeakButton
          size="sm"
          text={`${t('epr.bonus')} ${priceSentence(epr.collectorBonus, locale, false)}. ${t('epr.why')}`}
        />
      </div>
    </div>
  );
}
