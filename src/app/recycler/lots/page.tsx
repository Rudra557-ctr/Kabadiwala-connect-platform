'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ChevronLeft,
  Check,
  X,
  MessageSquareReply,
  MapPin,
  Truck,
  Loader2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { ulid } from 'ulid';
import { db, enqueue, type Lot, type Offer } from '@/lib/db';
import { getMaterial } from '@/lib/materials';
import { computeFairBand } from '@/lib/pricing';
import { distanceKm, DEMO_CITY } from '@/lib/seed';
import { MATERIAL_GLYPH } from '@/components/glyphs';
import { TrustScore } from '@/components/TrustScore';
import { CountUp } from '@/components/motion';
import { t as translate } from '@/lib/i18n';

/**
 * Open lots — the recycler's buying desk.
 *
 * PS requirement: accept / counter-offer / reject inbound lots.
 *
 * A counter is the case that matters. Published rates are a starting point;
 * real buyers adjust for contamination, moisture, or the particular mix in
 * front of them. Capturing the REASON alongside the number is what stops a
 * counter reading as arbitrary haggling to the collector — and the reason
 * text feeds back into the price dataset as signal about why a lot priced
 * below band.
 */
export default function OpenLotsPage() {
  const lots = useLiveQuery(() => db().lots.where('status').equals('listed').toArray(), [], []);
  const recyclers = useLiveQuery(() => db().recyclers.toArray(), [], []);
  const offers = useLiveQuery(() => db().offers.toArray(), [], []);
  const collectors = useLiveQuery(() => db().collectors.toArray(), [], []);
  const pricePoints = useLiveQuery(() => db().pricePoints.toArray(), [], []);

  const me = useMemo(
    () => (recyclers ?? []).find((r) => r.tier === 'authorized_recycler') ?? null,
    [recyclers],
  );

  const scoreByCollector = useMemo(
    () => Object.fromEntries((collectors ?? []).map((c) => [c.id, c.reliabilityScore])),
    [collectors],
  );

  const myOfferByLot = useMemo(
    () =>
      Object.fromEntries(
        (offers ?? []).filter((o) => o.recyclerId === me?.id).map((o) => [o.lotId, o]),
      ),
    [offers, me?.id],
  );

  // Only lots this facility can actually process.
  const relevant = useMemo(() => {
    if (!me) return [];
    return (lots ?? [])
      .filter((l) => me.materialsAccepted.includes(l.category))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [lots, me]);

  if (!me) {
    return (
      <main className="px-4 pt-10 text-center">
        <p className="muted">Loading facility…</p>
      </main>
    );
  }

  return (
    <main className="px-4 pb-12 pt-5">
      <header className="mb-5 flex items-start gap-2">
        <Link href="/recycler" aria-label="Back" className="tap-ghost h-11 w-11 !px-0">
          <ChevronLeft size={22} aria-hidden />
        </Link>
        <div>
          <h1 className="text-2xl display">Open lots</h1>
          <p className="muted text-sm">
            {relevant.length} lot{relevant.length === 1 ? '' : 's'} matching what you accept
          </p>
        </div>
      </header>

      {relevant.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center">
          <span
            aria-hidden
            className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl"
          >
            📭
          </span>
          <p className="font-bold">No open lots right now</p>
          <p className="muted mt-1 max-w-xs text-sm">
            Collectors&apos; listed lots matching your accepted materials appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {relevant.map((lot, i) => (
            <LotCard
              key={lot.id}
              lot={lot}
              index={i}
              myRate={me.offeredRates[lot.category] ?? 0}
              recyclerId={me.id}
              pickupAvailable={me.pickupAvailable}
              existingOffer={myOfferByLot[lot.id]}
              score={scoreByCollector[lot.collectorId]}
              band={pricePoints ? computeFairBand(pricePoints, lot.category, DEMO_CITY.name) : null}
            />
          ))}
        </ul>
      )}
    </main>
  );
}

function LotCard({
  lot,
  index,
  myRate,
  recyclerId,
  pickupAvailable,
  existingOffer,
  score,
  band,
}: {
  lot: Lot;
  index: number;
  myRate: number;
  recyclerId: string;
  pickupAvailable: boolean;
  existingOffer?: Offer;
  score?: number;
  band: ReturnType<typeof computeFairBand> | null;
}) {
  const [mode, setMode] = useState<'idle' | 'counter'>('idle');
  const [counterRate, setCounterRate] = useState(myRate);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const material = getMaterial(lot.category);
  const dist =
    lot.lat != null && lot.lng != null
      ? distanceKm({ lat: lot.lat, lng: lot.lng }, DEMO_CITY)
      : null;

  const respond = async (
    status: Offer['status'],
    ratePerKg: number,
    withReason?: string,
    pickup = false,
  ) => {
    if (busy) return;
    setBusy(true);
    try {
      const offer: Offer = {
        id: existingOffer?.id ?? ulid(),
        lotId: lot.id,
        recyclerId,
        ratePerKg,
        totalValue: Math.round(ratePerKg * lot.weightKg),
        status,
        reason: withReason,
        pickupOffered: pickup,
        createdAt: existingOffer?.createdAt ?? Date.now(),
        respondedAt: Date.now(),
        sync: 'local',
      };
      await db().offers.put(offer);

      // An offer is a price signal even before it is accepted — it tells the
      // dataset what this material is worth to a real buyer today.
      if (status !== 'rejected') {
        await db().pricePoints.put({
          id: `pp-offer-${offer.id}`,
          category: lot.category,
          location: DEMO_CITY.name,
          recordedAt: Date.now(),
          buyingPrice: ratePerKg,
          quotedPrice: ratePerKg,
          unit: material.unit,
          recyclerId,
          source: 'recycler',
        });
      }

      await enqueue('offer.respond', { id: offer.id, status }, `offer:${offer.id}:${status}`);
      setMode('idle');
    } finally {
      setBusy(false);
    }
  };

  const REASONS = ['Contamination', 'High moisture', 'Mixed grade', 'Low market demand'];

  const verdict =
    band && counterRate
      ? counterRate < band.low * 0.95
        ? 'below'
        : counterRate >= band.mid
          ? 'good'
          : 'within'
      : null;

  return (
    <li className="card stagger" style={{ '--i': index } as React.CSSProperties}>
      <div className="flex items-start gap-3">
        {lot.photos?.[0] ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={lot.photos[0]} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
        ) : (
          <span
            aria-hidden
            className={clsx(
              'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl',
              material.tint,
            )}
          >
            {MATERIAL_GLYPH[lot.category]}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{translate('en', material.nameKey)}</p>
          <p className="muted mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            <span className="font-semibold tnum">{lot.weightKg} kg</span>
            {dist != null && (
              <span className="inline-flex items-center gap-0.5">
                <MapPin size={10} aria-hidden />
                {dist.toFixed(1)} km
              </span>
            )}
            {score != null && <TrustScore score={score} compact />}
          </p>
          {band && (
            <p className="muted mt-1 text-[11px]">
              district ₹{band.low}–{band.high}/kg
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <CountUp value={myRate * lot.weightKg} prefix="₹" className="text-lg display" />
          <p className="muted text-[10px] font-semibold">₹{myRate}/kg</p>
        </div>
      </div>

      {/* Already responded ------------------------------------------------ */}
      {existingOffer && mode === 'idle' && (
        <div
          className={clsx(
            'mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold',
            existingOffer.status === 'rejected'
              ? 'bg-red-50 text-red-700'
              : existingOffer.status === 'countered'
                ? 'bg-amber-50 text-amber-800'
                : 'bg-brand-50 text-brand-800',
          )}
        >
          {existingOffer.status === 'rejected' ? (
            <>
              <X size={13} aria-hidden /> Rejected
            </>
          ) : existingOffer.status === 'countered' ? (
            <>
              <MessageSquareReply size={13} aria-hidden /> Countered at ₹
              {existingOffer.ratePerKg}/kg
              {existingOffer.reason && ` · ${existingOffer.reason}`}
            </>
          ) : (
            <>
              <Check size={13} aria-hidden /> Offered ₹{existingOffer.totalValue}
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setCounterRate(existingOffer.ratePerKg);
              setMode('counter');
            }}
            className="ml-auto underline"
          >
            change
          </button>
        </div>
      )}

      {/* Actions ---------------------------------------------------------- */}
      {!existingOffer && mode === 'idle' && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={busy || !myRate}
            onClick={() => respond('accepted', myRate, undefined, pickupAvailable)}
            className="tap-primary !px-2 text-sm disabled:opacity-40"
          >
            {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Check size={15} aria-hidden />}
            Accept
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setCounterRate(myRate);
              setMode('counter');
            }}
            className="tap-ghost !px-2 text-sm"
          >
            <MessageSquareReply size={15} aria-hidden />
            Counter
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => respond('rejected', 0)}
            className="tap-ghost !px-2 text-sm text-red-600"
          >
            <X size={15} aria-hidden />
            Reject
          </button>
        </div>
      )}

      {/* Counter form ----------------------------------------------------- */}
      {mode === 'counter' && (
        <div className="mt-3 rounded-2xl border p-3" style={{ borderColor: 'rgb(var(--border))' }}>
          <label className="block">
            <span className="muted text-xs font-semibold">Your rate (₹/kg)</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={counterRate || ''}
              onChange={(e) => setCounterRate(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-xl border px-3 py-2.5 text-center text-lg font-bold tnum"
              style={{
                borderColor: 'rgb(var(--border))',
                backgroundColor: 'rgb(var(--card))',
                color: 'rgb(var(--fg))',
              }}
            />
          </label>

          {/* Tell the recycler how their counter will land with the collector.
              A below-band counter triggers an underpricing warning on their
              phone, and they should know that before sending it. */}
          {verdict && (
            <p
              className={clsx(
                'mt-1.5 text-xs font-semibold',
                verdict === 'below'
                  ? 'text-fair-low'
                  : verdict === 'good'
                    ? 'text-fair-good'
                    : 'muted',
              )}
            >
              {verdict === 'below'
                ? 'Below district band — the collector will see an underpricing warning'
                : verdict === 'good'
                  ? 'At or above district median'
                  : 'Within district band'}
              {' · '}₹{Math.round(counterRate * lot.weightKg)} total
            </p>
          )}

          <p className="muted mt-3 text-xs font-semibold">Reason (shown to collector)</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(reason === r ? '' : r)}
                className={clsx(
                  'rounded-full border px-2.5 py-1 text-xs font-semibold transition',
                  reason === r
                    ? 'border-brand-600 bg-brand-50 text-brand-800'
                    : 'muted',
                )}
                style={reason === r ? undefined : { borderColor: 'rgb(var(--border))' }}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setMode('idle')}
              className="tap-ghost flex-1 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || !counterRate}
              onClick={() => respond('countered', counterRate, reason || undefined, pickupAvailable)}
              className="tap-primary flex-1 text-sm disabled:opacity-40"
            >
              {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
              Send counter
            </button>
          </div>

          {pickupAvailable && (
            <p className="muted mt-2 flex items-center gap-1 text-[11px]">
              <Truck size={11} aria-hidden />
              Free pickup included — shown to the collector as net of transport
            </p>
          )}
        </div>
      )}
    </li>
  );
}
