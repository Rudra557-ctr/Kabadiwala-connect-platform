'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, Check, Loader2, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { clsx } from 'clsx';
import { ulid } from 'ulid';
import { db, enqueue } from '@/lib/db';
import { MATERIALS, type MaterialCategoryId } from '@/lib/materials';
import { computeFairBand, computeTrend } from '@/lib/pricing';
import { DEMO_CITY } from '@/lib/seed';
import { MATERIAL_GLYPH } from '@/components/glyphs';
import { t as translate } from '@/lib/i18n';

/**
 * Rate publishing.
 *
 * This is the recycler's half of price discovery, and it closes the loop the
 * PS describes: the rate published here is what the collector's price board
 * reads. Change a number on this screen and it moves on their phone.
 *
 * Every row shows the district band alongside the recycler's own rate, so
 * they can see where they sit against the market. That transparency cuts both
 * ways deliberately — a recycler who is underpaying can see it, and one who is
 * competitive can prove it.
 */
export default function RatesPage() {
  const recyclers = useLiveQuery(() => db().recyclers.toArray(), [], []);
  const pricePoints = useLiveQuery(() => db().pricePoints.toArray(), [], []);

  // Demo stands in as the first authorised recycler. A real deployment would
  // scope this to the signed-in facility.
  const me = useMemo(
    () => (recyclers ?? []).find((r) => r.tier === 'authorized_recycler') ?? null,
    [recyclers],
  );

  const [draft, setDraft] = useState<Partial<Record<MaterialCategoryId, number>>>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (me) setDraft({ ...me.offeredRates });
  }, [me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const bands = useMemo(() => {
    const out: Partial<Record<MaterialCategoryId, ReturnType<typeof computeFairBand>>> = {};
    if (!pricePoints?.length) return out;
    for (const m of MATERIALS) out[m.id] = computeFairBand(pricePoints, m.id, DEMO_CITY.name);
    return out;
  }, [pricePoints]);

  const dirty = useMemo(() => {
    if (!me) return false;
    return MATERIALS.some((m) => (draft[m.id] ?? 0) !== (me.offeredRates[m.id] ?? 0));
  }, [draft, me]);

  const save = async () => {
    if (!me || saving) return;
    setSaving(true);
    try {
      await db().recyclers.update(me.id, { offeredRates: draft });

      // Each published rate is also a price observation. This is what makes
      // the dataset live rather than static — the price board recomputes from
      // these the moment they land.
      const now = Date.now();
      const points = MATERIALS.filter((m) => draft[m.id]).map((m) => ({
        id: `pp-pub-${me.id}-${m.id}-${now}`,
        category: m.id,
        location: DEMO_CITY.name,
        recordedAt: now,
        buyingPrice: draft[m.id]!,
        unit: m.unit,
        recyclerId: me.id,
        source: 'recycler' as const,
      }));
      if (points.length) await db().pricePoints.bulkPut(points);

      await enqueue('rates.publish', { recyclerId: me.id, rates: draft }, `rates:${ulid()}`);
      setSavedAt(now);
    } finally {
      setSaving(false);
    }
  };

  if (!me) {
    return (
      <main className="px-4 pt-10 text-center">
        <p className="muted">Loading facility…</p>
      </main>
    );
  }

  return (
    <main className="px-4 pb-32 pt-5">
      <header className="mb-5 flex items-start gap-2">
        <Link href="/recycler" aria-label="Back" className="tap-ghost h-11 w-11 !px-0">
          <ChevronLeft size={22} aria-hidden />
        </Link>
        <div>
          <h1 className="text-2xl display">Published rates</h1>
          <p className="muted text-sm">
            {me.name} · these appear on collectors&apos; price boards
          </p>
        </div>
      </header>

      <ul className="space-y-2">
        {MATERIALS.map((m, i) => {
          const band = bands[m.id];
          const mine = draft[m.id] ?? 0;
          const accepted = me.materialsAccepted.includes(m.id);

          // Where this rate sits against the district band.
          const position =
            !band || !mine
              ? 'none'
              : mine >= band.high
                ? 'above'
                : mine >= band.low
                  ? 'within'
                  : 'below';

          const trend = pricePoints ? computeTrend(pricePoints, m.id).trend : 'flat';
          const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

          return (
            <li
              key={m.id}
              className={clsx('card stagger', !accepted && 'opacity-55')}
              style={{ '--i': i } as React.CSSProperties}
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={clsx(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-2xl',
                    m.tint,
                  )}
                >
                  {MATERIAL_GLYPH[m.id]}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{translate('en', m.nameKey)}</p>
                  <p className="muted flex items-center gap-1.5 text-xs">
                    {band ? (
                      <>
                        district ₹{band.low}–{band.high}
                        <TrendIcon
                          size={12}
                          aria-hidden
                          className={
                            trend === 'up'
                              ? 'text-fair-good'
                              : trend === 'down'
                                ? 'text-fair-low'
                                : 'muted'
                          }
                        />
                      </>
                    ) : (
                      'no market data'
                    )}
                  </p>
                </div>

                <label className="shrink-0">
                  <span className="sr-only">Rate for {translate('en', m.nameKey)}</span>
                  <span className="flex items-center gap-1 rounded-xl border px-2"
                    style={{ borderColor: 'rgb(var(--border))' }}
                  >
                    <span className="muted text-sm">₹</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={5000}
                      disabled={!accepted}
                      value={draft[m.id] ?? ''}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [m.id]: Number(e.target.value) || 0 }))
                      }
                      className="w-20 bg-transparent py-2.5 text-right text-base font-bold tnum outline-none"
                      style={{ color: 'rgb(var(--fg))' }}
                    />
                  </span>
                </label>
              </div>

              {accepted && position !== 'none' && (
                <p
                  className={clsx(
                    'mt-2 text-xs font-semibold',
                    position === 'above'
                      ? 'text-fair-good'
                      : position === 'within'
                        ? 'muted'
                        : 'text-fair-low',
                  )}
                >
                  {position === 'above'
                    ? 'Above district range — you will rank first for this material'
                    : position === 'within'
                      ? 'Within district range'
                      : 'Below district range — collectors will see an underpricing warning'}
                </p>
              )}

              {!accepted && (
                <p className="muted mt-2 text-xs">Not accepted at this facility</p>
              )}
            </li>
          );
        })}
      </ul>

      {/* Sticky save bar — the page is long and the action must stay reachable. */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t p-3 backdrop-blur-xl"
        style={{
          backgroundColor: 'rgb(var(--card) / 0.9)',
          borderColor: 'rgb(var(--border))',
          paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))',
        }}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <p className="muted min-w-0 flex-1 text-xs">
            {savedAt && !dirty
              ? `Published ${new Date(savedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
              : dirty
                ? 'Unpublished changes'
                : 'No changes'}
          </p>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="tap-primary shrink-0 disabled:opacity-40"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" aria-hidden />
            ) : (
              <Check size={18} aria-hidden />
            )}
            Publish rates
          </button>
        </div>
      </div>
    </main>
  );
}
