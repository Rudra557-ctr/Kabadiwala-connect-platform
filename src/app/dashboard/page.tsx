'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Database,
  Info,
  ShieldCheck,
  Recycle,
  Scale,
} from 'lucide-react';
import { db } from '@/lib/db';
import { CountUp } from '@/components/motion';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { aggregateEpr, COLLECTOR_SHARE, EPR_RATE_PER_KG } from '@/lib/epr';
import {
  CRITICAL_MINERALS,
  ELEMENT_LABELS,
  estimateRecoverable,
  getMaterial,
  type MaterialCategoryId,
  type RecoverableElement,
} from '@/lib/materials';

/**
 * Ministry / ULB dashboard — the closing slide of the pitch.
 *
 * WHY THIS IS THE CLOSING SLIDE:
 * The sponsoring body is the Ministry of Mines (JNARDDC), not a pollution
 * control board. Their mandate is mineral security. The PS text itself names
 * lithium, cobalt, neodymium, tantalum, gallium and indium — every one of them
 * on India's critical minerals list — and points out they are LOST in backyard
 * processing.
 *
 * So the headline metric here is not tonnes of waste collected. It is
 * ESTIMATED CRITICAL MINERAL CONTENT routed into formal recovery instead of
 * being burnt or acid-leached away. That is the sponsor's actual problem.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ HONESTY CONSTRAINT, ENFORCED IN THE UI BELOW
 * ---------------------------------------------------------------------------
 * These are ESTIMATES derived from per-category composition ranges, applied to
 * verified handover weights. They are NOT assay results and NOT recovery
 * yields — actual recovery depends on the recycler's process efficiency.
 *
 * The UI therefore always shows a RANGE, always says "estimated content", and
 * never says "recovered". A Ministry of Mines panel knows these numbers better
 * than we do, and inflated precision would cost more credibility than the
 * feature gains.
 * ---------------------------------------------------------------------------
 */
export default function DashboardPage() {
  const handovers = useLiveQuery(() => db().handovers.toArray(), [], []);
  const lots = useLiveQuery(() => db().lots.toArray(), [], []);
  const recyclers = useLiveQuery(() => db().recyclers.toArray(), [], []);

  const data = useMemo(() => {
    const lotsById = Object.fromEntries((lots ?? []).map((l) => [l.id, l]));
    const confirmed = (handovers ?? []).filter((h) => h.confirmedAt);

    const authorized = new Set(
      (recyclers ?? []).filter((r) => r.tier === 'authorized_recycler').map((r) => r.id),
    );

    let traceableKg = 0;
    const minerals: Record<string, { low: number; high: number }> = {};

    for (const h of confirmed) {
      const lot = lotsById[h.lotId];
      if (!lot) continue;
      const kg = h.actualWeightKg ?? h.weightKg;
      traceableKg += kg;

      for (const r of estimateRecoverable(lot.category, kg)) {
        const cur = minerals[r.element] ?? { low: 0, high: 0 };
        minerals[r.element] = {
          low: cur.low + r.gramsLow,
          high: cur.high + r.gramsHigh,
        };
      }
    }

    const toFormal = confirmed.filter((h) => h.recyclerId && authorized.has(h.recyclerId)).length;

    // EPR value only accrues where material reached a LICENSED recycler with
    // a traceable handover. Counting aggregator sales here would overstate the
    // benefit and misrepresent how the mechanism works.
    const eprLots: Array<{ category: MaterialCategoryId; weightKg: number }> = [];
    for (const h of confirmed) {
      if (!h.recyclerId || !authorized.has(h.recyclerId)) continue;
      const lot = lotsById[h.lotId];
      if (!lot) continue;
      eprLots.push({ category: lot.category, weightKg: h.actualWeightKg ?? h.weightKg });
    }

    const epr = aggregateEpr(eprLots);

    return {
      epr,
      confirmedCount: confirmed.length,
      totalLots: (lots ?? []).length,
      traceableKg,
      minerals,
      formalizationPct: confirmed.length ? (toFormal / confirmed.length) * 100 : 0,
      validRecyclers: (recyclers ?? []).filter((r) => r.authorizationStatus === 'valid').length,
    };
  }, [handovers, lots, recyclers]);

  const criticalRows = CRITICAL_MINERALS.map((el) => ({
    element: el,
    ...(data.minerals[el] ?? { low: 0, high: 0 }),
  })).filter((r) => r.high > 0);

  const otherRows = (Object.keys(data.minerals) as RecoverableElement[])
    .filter((el) => !CRITICAL_MINERALS.includes(el))
    .map((el) => ({ element: el, ...data.minerals[el] }))
    .sort((a, b) => b.high - a.high);

  return (
    <main className="px-4 pb-12 pt-5">
      <header className="mb-6 flex items-start gap-2">
        <Link href="/" aria-label="Back" className="tap-ghost h-11 w-11 !px-0">
          <ChevronLeft size={22} aria-hidden />
        </Link>
        <div className="animate-fade-up">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">
            Ministry of Mines · JNARDDC
          </p>
          <h1 className="text-3xl display">Recovery &amp; Formalization</h1>
          <p className="muted text-sm">Nagpur district · live from platform transactions</p>
        </div>
        <div className="ml-auto">
          <RoleSwitcher />
        </div>
      </header>

      <Link
        href="/dashboard/datasets"
        className="mb-5 flex items-center gap-3 rounded-2xl border border-brand-300 bg-brand-50 p-4 transition hover:border-brand-400 active:scale-[0.99]"
      >
        <Database size={20} className="shrink-0 text-brand-700" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-brand-900">Dataset provenance</span>
          <span className="block text-xs text-brand-700">
            How each dataset is generated, validated and used — plus the active learning loop
          </span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-brand-700" aria-hidden />
      </Link>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={ShieldCheck} label="Verified handovers" value={data.confirmedCount.toString()} />
        <Stat icon={Scale} label="Traceable material" value={`${data.traceableKg.toFixed(0)} kg`} />
        <Stat
          icon={Recycle}
          label="To authorized recyclers"
          value={`${data.formalizationPct.toFixed(0)}%`}
        />
        <Stat icon={ShieldCheck} label="Valid authorizations" value={data.validRecyclers.toString()} />
      </div>

      {/* EPR credit bridge — the economic mechanism, at district scale. */}
      {data.epr.totalValue > 0 && (
        <section className="hero mb-4 bg-grad-amber p-5 shadow-e4 animate-fade-up">
          <h2 className="flex items-center gap-2 text-xl display">
            <Award size={22} aria-hidden />
            EPR value unlocked by traceability
          </h2>
          <p className="mt-1 text-sm text-white/85">
            Material delivered to licensed recyclers with a signed, documented handover — and
            therefore countable toward producer EPR obligations.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/80">Certificate value</p>
              <CountUp
                value={data.epr.totalValue}
                prefix="₹"
                className="mt-1 block text-2xl display"
              />
              <p className="text-[10px] text-white/70">across {data.epr.totalKg.toFixed(0)} kg</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/80">
                Collector share ({Math.round(COLLECTOR_SHARE * 100)}%)
              </p>
              <CountUp
                value={data.epr.collectorShare}
                prefix="₹"
                className="mt-1 block text-2xl display"
              />
              <p className="text-[10px] text-white/70">
                informal collectors capture today: ₹0
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-white/15 p-3 text-white backdrop-blur-sm">
            <Info size={15} className="mt-0.5 shrink-0" aria-hidden />
            <p className="text-xs leading-snug">
              <strong>Proposed mechanism, modelled figures.</strong> EPR certificate prices are
              market-determined and volatile; these use assumed rates of ₹
              {Math.min(...Object.values(EPR_RATE_PER_KG))}–
              {Math.max(...Object.values(EPR_RATE_PER_KG))}/kg by category. No rule today obliges a
              recycler to share certificate value with a collector — we argue traceability makes it
              commercially rational, since the chain of custody is what makes the claim possible.
            </p>
          </div>
        </section>
      )}

      {/* The headline section. */}
      <section className="card mb-4">
        <h2 className="text-lg font-bold">Critical minerals diverted from backyard processing</h2>
        <p className="muted mt-1 text-sm">
          Estimated content in material routed to authorized recovery instead of open burning or
          acid leaching.
        </p>

        {criticalRows.length === 0 ? (
          <p className="muted py-8 text-center text-sm">
            No verified handovers yet. Complete a handover to populate this view.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {criticalRows.map((r) => (
              <li key={r.element}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{ELEMENT_LABELS[r.element]}</span>
                  <span className="tabular-nums text-sm font-bold">
                    {fmtGrams(r.low)} – {fmtGrams(r.high)}
                  </span>
                </div>
                <RangeBar low={r.low} high={r.high} max={Math.max(...criticalRows.map((x) => x.high))} />
              </li>
            ))}
          </ul>
        )}

        {/* The disclaimer is part of the feature, not fine print bolted on. */}
        <div className="mt-5 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-amber-900">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
          <p className="text-xs leading-snug">
            <strong>Estimated content, not recovered yield.</strong> Figures apply per-category
            composition ranges to verified handover weights. Actual recovery depends on recycler
            process efficiency. Composition ranges are order-of-magnitude estimates pending citation
            — see <code>src/lib/materials.ts</code>.
          </p>
        </div>
      </section>

      {otherRows.length > 0 && (
        <section className="card">
          <h2 className="text-base font-bold">Other recoverable content</h2>
          <ul className="mt-3 space-y-2">
            {otherRows.map((r) => (
              <li key={r.element} className="flex items-baseline justify-between">
                <span className="text-sm">{ELEMENT_LABELS[r.element]}</span>
                <span className="tabular-nums text-sm font-semibold">
                  {fmtGrams(r.low)} – {fmtGrams(r.high)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function fmtGrams(g: number): string {
  if (g >= 1000) return `${(g / 1000).toFixed(2)} kg`;
  if (g >= 1) return `${g.toFixed(1)} g`;
  return `${(g * 1000).toFixed(0)} mg`;
}

function RangeBar({ low, high, max }: { low: number; high: number; max: number }) {
  const l = max > 0 ? (low / max) * 100 : 0;
  const h = max > 0 ? (high / max) * 100 : 0;
  return (
    <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
      {/* The bar shows the uncertainty band itself — a single bar would imply a
          precision these numbers do not have. */}
      <div
        className="h-full rounded-full bg-grad-brand transition-all duration-700 ease-out"
        style={{ marginLeft: `${l}%`, width: `${Math.max(1, h - l)}%` }}
      />
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
}) {
  return (
    <div className="card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-e3">
      <span
        aria-hidden
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700"
      >
        <Icon size={18} />
      </span>
      <p className="mt-2 text-2xl display tnum">{value}</p>
      <p className="muted text-xs font-semibold leading-tight">{label}</p>
    </div>
  );
}
