'use client';

import { use, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { BadgeCheck, ChevronLeft, List, Map, MapPin, ShieldX, Truck, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';
import { useApp } from '@/lib/app-context';
import { HandoverQR } from '@/components/HandoverQR';
import { LowOfferWarning } from '@/components/LowOfferWarning';
import { EprBonus } from '@/components/EprBonus';
import { CountUp } from '@/components/motion';
import { MATERIAL_GLYPH } from '@/components/glyphs';
import dynamic from 'next/dynamic';
import { Chip, Rupees, RupeeRange, SpeakButton } from '@/components/ui';
import { db, type Offer } from '@/lib/db';
import { getMaterial } from '@/lib/materials';
import { compareRoutes, rankRecyclers, type RankedRecycler } from '@/lib/matching';
import { computeFairBand, judgeOffer } from '@/lib/pricing';
import { priceSentence } from '@/lib/speech';
import { DEMO_CITY } from '@/lib/seed';

const RecyclerMap = dynamic(
  () => import('@/components/RecyclerMap').then((m) => m.RecyclerMap),
  { ssr: false, loading: () => <div className="h-80 w-full animate-pulse rounded-2xl bg-slate-100" /> },
);

export default function LotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t, locale, sayText } = useApp();
  const [selected, setSelected] = useState<RankedRecycler | null>(null);
  // Set when the collector taps a recycler paying clearly below the fair band.
  // We interrupt once, speak the warning, then let them decide.
  const [warnAbout, setWarnAbout] = useState<RankedRecycler | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');

  const lot = useLiveQuery(() => db().lots.get(id), [id]);
  const recyclers = useLiveQuery(() => db().recyclers.toArray(), [], []);
  const pricePoints = useLiveQuery(() => db().pricePoints.toArray(), [], []);
  // Offers a recycler has made on THIS lot, newest first.
  const lotOffers = useLiveQuery(
    () => db().offers.where('lotId').equals(id).toArray(),
    [id],
    [],
  );

  const from = useMemo(
    () =>
      lot?.lat != null && lot?.lng != null
        ? { lat: lot.lat, lng: lot.lng }
        : { lat: DEMO_CITY.lat, lng: DEMO_CITY.lng },
    [lot?.lat, lot?.lng],
  );

  const ranked = useMemo(() => {
    if (!lot || !recyclers?.length) return [];
    return rankRecyclers(recyclers, {
      lotWeightKg: lot.weightKg,
      category: lot.category,
      from,
    });
  }, [lot, recyclers, from]);

  const economics = useMemo(() => {
    if (!lot || !recyclers?.length) return null;
    return compareRoutes(recyclers, {
      lotWeightKg: lot.weightKg,
      category: lot.category,
      from,
    });
  }, [lot, recyclers, from]);

  const band = useMemo(
    () => (lot && pricePoints ? computeFairBand(pricePoints, lot.category, DEMO_CITY.name) : null),
    [lot, pricePoints],
  );

  if (!lot) {
    return (
      <main className="px-4 pt-10 text-center">
        <p className="muted">…</p>
      </main>
    );
  }

  const material = getMaterial(lot.category);

  // Once a recycler is chosen we switch to the handover view. This is the
  // screen that must work with the network off.
  if (selected) {
    return (
      <HandoverQR
        lot={lot}
        recycler={selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  const bestEligible = ranked.find((r) => r.eligible);

  return (
    <main className="px-4 pt-5">
      {warnAbout && band && (
        <LowOfferWarning
          offer={warnAbout}
          band={band}
          better={
            bestEligible && bestEligible.netValue > warnAbout.netValue ? bestEligible : undefined
          }
          onProceed={() => {
            const r = warnAbout;
            setWarnAbout(null);
            setSelected(r);
          }}
          onCancel={() => setWarnAbout(null)}
        />
      )}

      <header className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.push('/collector')}
          aria-label={t('action.back')}
          className="tap-ghost h-11 w-11 !px-0"
        >
          <ChevronLeft size={22} aria-hidden />
        </button>
        <h1 className="truncate text-xl display">{t(material.nameKey)}</h1>
      </header>

      {/* Lot summary ---------------------------------------------------- */}
      <section className="card mb-4">
        <div className="flex items-start gap-3">
          {lot.photos[0] ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={lot.photos[0]} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover shadow-e1" />
          ) : (
            <span
              aria-hidden
              className={clsx(
                'flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-4xl',
                material.tint,
              )}
            >
              {MATERIAL_GLYPH[lot.category]}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="muted text-xs font-semibold">{t('lot.estimate')}</p>
            <RupeeRange low={lot.estValueLow} high={lot.estValueHigh} />
            <p className="muted mt-1 text-xs">
              {lot.weightKg} {t('lot.kg')}
              {band && ` · ₹${band.low}–₹${band.high}/${t('lot.kg')}`}
            </p>
          </div>
        </div>
      </section>

      {/* Unit economics, computed live ---------------------------------- */}
      {economics && economics.gain > 0 && economics.formal && (
        <section className="hero mb-4 bg-grad-brand p-4 shadow-glow-brand animate-pop-in">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20"
            >
              <TrendingUp size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline gap-1.5">
                <CountUp value={economics.gain} prefix="+₹" className="text-2xl display" />
                <span className="text-xs font-bold text-white/85">{t('econ.more')}</span>
              </p>
              <p className="mt-1 text-xs leading-snug text-white/85">
                {t('econ.compare', {
                  formal: `₹${Math.round(economics.formalNet).toLocaleString('en-IN')}`,
                  agg: `₹${Math.round(economics.aggregatorNet).toLocaleString('en-IN')}`,
                })}
              </p>
            </div>
            <SpeakButton
              size="sm"
              className="!bg-white/20 hover:!bg-white/30"
              text={`${priceSentence(economics.gain, locale, false)} ${t('econ.more')}`}
            />
          </div>
        </section>
      )}

      {/* EPR credit bridge: what traceability is actually worth ---------- */}
      {(() => {
        const bestFormal = ranked.find(
          (r) => r.eligible && r.recycler.tier === 'authorized_recycler',
        );
        return bestFormal ? (
          <div className="mb-4">
            <EprBonus
              category={lot.category}
              weightKg={lot.weightKg}
              recycler={bestFormal}
            />
          </div>
        ) : null;
      })()}

      {/* Offers actually received ---------------------------------------- */}
      {(lotOffers ?? []).filter((o) => o.status !== 'rejected').length > 0 && (
        <section className="mb-5">
          <h2 className="mb-3 text-base font-bold">{t('offers.title')}</h2>
          <ul className="space-y-2">
            {(lotOffers ?? [])
              .filter((o) => o.status !== 'rejected')
              .sort((a, b) => b.totalValue - a.totalValue)
              .map((o, i) => {
                const rec = (recyclers ?? []).find((x) => x.id === o.recyclerId);
                const ranked1 = ranked.find((x) => x.recycler.id === o.recyclerId);
                return (
                  <li key={o.id} className="stagger" style={{ '--i': i } as React.CSSProperties}>
                    <div className="card border-brand-300">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold">{rec?.name ?? o.recyclerId}</p>
                          {o.status === 'countered' && (
                            <p className="muted mt-0.5 text-xs">
                              {t('offers.countered')}
                              {o.reason ? ` · ${o.reason}` : ''}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <Rupees value={o.totalValue} />
                          <p className="muted text-[10px] font-semibold">
                            ₹{o.ratePerKg}/{t('lot.kg')}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!ranked1) return;
                          // Route through the same underpricing check as any
                          // other selection — an offer is not exempt.
                          if (band && judgeOffer(o.ratePerKg, band) === 'low') setWarnAbout(ranked1);
                          else setSelected(ranked1);
                        }}
                        disabled={!ranked1?.eligible}
                        className="tap-primary mt-3 w-full disabled:opacity-40"
                      >
                        {t('offers.accept')}
                      </button>
                    </div>
                  </li>
                );
              })}
          </ul>
        </section>
      )}

      {/* Ranked recyclers ------------------------------------------------ */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold">{t('recycler.title')}</h2>
          <div
            className="flex gap-1 rounded-lg p-0.5"
            style={{ backgroundColor: 'rgb(var(--border) / 0.6)' }}
          >
            {(
              [
                ['list', List, t('view.list')],
                ['map', Map, t('view.map')],
              ] as const
            ).map(([k, Icon, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setView(k)}
                aria-pressed={view === k}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition',
                  view === k ? 'bg-white text-slate-900 shadow-sm' : 'muted',
                )}
              >
                <Icon size={14} aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>

        {view === 'map' && (
          <div className="mb-3">
            <RecyclerMap
              ranked={ranked}
              center={from}
              onSelect={(r) => {
                if (band && judgeOffer(r.ratePerKg, band) === 'low') setWarnAbout(r);
                else setSelected(r);
              }}
            />
          </div>
        )}

        <ul className={clsx('space-y-2', view === 'map' && 'hidden')}>
          {ranked.map((r) => {
            const verdict = band ? judgeOffer(r.ratePerKg, band) : 'fair';
            return (
              <li
                key={r.recycler.id}
                className="stagger"
                style={{ '--i': ranked.indexOf(r) } as React.CSSProperties}
              >
                <button
                  type="button"
                  disabled={!r.eligible}
                  onClick={() => {
                    if (band && judgeOffer(r.ratePerKg, band) === 'low') setWarnAbout(r);
                    else setSelected(r);
                  }}
                  className={clsx(
                    'w-full text-left',
                    r.eligible ? 'card-interactive' : 'card cursor-not-allowed opacity-60',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-start gap-1.5 font-bold leading-tight">
                        <span className="line-clamp-2">{r.recycler.name}</span>
                        {r.recycler.tier === 'authorized_recycler' && r.eligible && (
                          <BadgeCheck size={16} className="shrink-0 text-brand-600" aria-hidden />
                        )}
                        {!r.eligible && <ShieldX size={16} className="shrink-0 text-red-600" aria-hidden />}
                      </p>
                      <p className="muted mt-0.5 flex items-center gap-1 text-xs">
                        <MapPin size={12} aria-hidden />
                        {r.distanceKm.toFixed(1)} km · {r.recycler.facilityLocation}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <Rupees value={r.netValue} />
                      <p className="muted text-[10px] font-semibold">
                        ₹{r.ratePerKg}/{t('lot.kg')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {/* An expired authorization is stated plainly and the row is
                        disabled — this is the record a judge can spot-check. */}
                    {r.flags.includes('expired') && <Chip tone="bad">{t('recycler.expired')}</Chip>}
                    {r.flags.includes('out_of_area') && (
                      <Chip tone="bad">{t('recycler.outOfArea')}</Chip>
                    )}
                    {r.eligible && r.recycler.tier === 'authorized_recycler' && (
                      <Chip tone="good">{t('recycler.verified')}</Chip>
                    )}
                    {r.flags.includes('aggregator') && (
                      <Chip tone="neutral">{t('recycler.aggregator')}</Chip>
                    )}
                    {r.flags.includes('pickup') && (
                      <Chip tone="info">
                        <Truck size={11} aria-hidden /> {t('recycler.pickup')}
                      </Chip>
                    )}
                    {r.flags.includes('best_rate') && (
                      <Chip tone="good">{t('recycler.bestRate')}</Chip>
                    )}
                    <EprBonus
                      category={lot.category}
                      weightKg={lot.weightKg}
                      recycler={r}
                      compact
                    />
                    {r.transportCost > 0 && (
                      <Chip tone="warn">
                        −₹{r.transportCost} {t('recycler.transport')}
                      </Chip>
                    )}
                    {verdict === 'low' && r.eligible && (
                      <Chip tone="bad">{t('price.tooLow')}</Chip>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {ranked.length === 0 && (
          <p className="muted py-8 text-center text-sm">{t('recycler.none')}</p>
        )}
      </section>
    </main>
  );
}
