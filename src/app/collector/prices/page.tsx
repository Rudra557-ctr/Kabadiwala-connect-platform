'use client';

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';
import { useApp } from '@/lib/app-context';
import { Rupees, SpeakButton } from '@/components/ui';
import { MATERIAL_GLYPH } from '@/components/glyphs';
import { db } from '@/lib/db';
import { MATERIALS, type MaterialCategoryId } from '@/lib/materials';
import { computeFairBand, computeTrend, dailySeries } from '@/lib/pricing';
import { priceSentence, rangeSentence } from '@/lib/speech';
import { DEMO_CITY } from '@/lib/seed';

/**
 * The price board.
 *
 * PS asks for "current buying rates for different material categories and
 * locations through a simple price board, including spoken price information
 * and basic price trends."
 *
 * Trend is shown as an ARROW plus colour before it is shown as a percentage —
 * direction is the part that reads without literacy. The sparkline is drawn
 * from the same dataset the band is computed from, so it is a real reading of
 * the data rather than decoration.
 */
export default function PricesPage() {
  const { t, locale } = useApp();
  const [open, setOpen] = useState<MaterialCategoryId | null>(null);
  const pricePoints = useLiveQuery(() => db().pricePoints.toArray(), [], []);

  const rows = useMemo(() => {
    if (!pricePoints?.length) return [];
    return MATERIALS.map((m) => ({
      material: m,
      band: computeFairBand(pricePoints, m.id, DEMO_CITY.name),
      ...computeTrend(pricePoints, m.id),
      series: dailySeries(pricePoints, m.id, 21),
    })).sort((a, b) => b.band.mid - a.band.mid);
  }, [pricePoints]);

  return (
    <main className="px-4 pt-5">
      <header className="mb-4 animate-fade-up">
        <h1 className="text-2xl display">{t('price.title')}</h1>
        <p className="muted text-sm">
          {DEMO_CITY.name} ·{' '}
          {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </p>
      </header>

      <ul className="space-y-2">
        {rows.map(({ material, band, trend, changePct, series }) => {
          const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
          const trendClass =
            trend === 'up' ? 'text-fair-good' : trend === 'down' ? 'text-fair-low' : 'muted';
          const isOpen = open === material.id;

          const spoken = [
            t(material.nameKey),
            priceSentence(band.mid, locale),
            trend === 'up'
              ? t('price.trendUp')
              : trend === 'down'
                ? t('price.trendDown')
                : t('price.trendFlat'),
          ].join('. ');

          return (
            <li
              key={material.id}
              className="card stagger"
              style={{ '--i': rows.indexOf(rows.find((x) => x.material.id === material.id)!) } as React.CSSProperties}
            >
              {/* The speaker is a SIBLING of the expand button, never a child.
                  A <button> inside a <button> is invalid HTML — React reports
                  a hydration error — and it also meant tapping the speaker
                  toggled the row open, which is not what anyone wants. */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : material.id)}
                  aria-expanded={isOpen}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span
                    aria-hidden
                    className={clsx(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl',
                      material.tint,
                    )}
                  >
                    {MATERIAL_GLYPH[material.id]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{t(material.nameKey)}</span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <Rupees value={band.mid} />
                      <span className="muted text-xs font-semibold">{t('price.perKg')}</span>
                    </span>
                  </span>

                  <span
                    className={clsx(
                      'flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-bold',
                      trend === 'up'
                        ? 'bg-brand-100 text-brand-700'
                        : trend === 'down'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    <TrendIcon size={14} aria-hidden />
                    {trend !== 'flat' && (
                      <span className="tnum">
                        {changePct > 0 ? '+' : ''}
                        {changePct.toFixed(0)}%
                      </span>
                    )}
                  </span>
                </button>

                <SpeakButton text={spoken} />
              </div>

              {isOpen && (
                <div className="mt-3 border-t pt-3" style={{ borderColor: 'rgb(var(--border))' }}>
                  <div className="flex items-center justify-between">
                    <span className="muted text-xs font-semibold">{t('price.fairBand')}</span>
                    <span className="text-sm font-bold tabular-nums">
                      ₹{band.low} – ₹{band.high}
                    </span>
                  </div>

                  <Sparkline series={series} />

                  <p className="muted mt-2 text-[11px]">
                    {band.dataBacked
                      ? t('price.observations', { n: band.sampleSize })
                      : t('price.estimateOnly')}
                  </p>

                  <div className="mt-2 flex justify-end">
                    <SpeakButton
                      size="sm"
                      text={`${t('price.fairBand')}. ${rangeSentence(band.low, band.high, locale)}`}
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="muted mt-6 text-center text-[11px]">
        {t('price.source')}
      </p>
    </main>
  );
}

/**
 * Inline SVG sparkline — no chart library on the collector's critical path.
 * Recharts is ~90 kB; this is 20 lines and renders identically on a 2015 phone.
 */
function Sparkline({ series }: { series: Array<{ date: string; price: number }> }) {
  const values = series.map((s) => s.price).filter((v) => v > 0);
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 100;
  const h = 28;

  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const rising = values[values.length - 1] >= values[0];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="mt-2 h-10 w-full"
      role="img"
      aria-label={`Price trend over ${values.length} days`}
    >
      <polyline
        points={pts}
        fill="none"
        stroke={rising ? '#16a34a' : '#dc2626'}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
