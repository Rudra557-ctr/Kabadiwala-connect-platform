/**
 * Price discovery and the Fair Price Index.
 *
 * The PS frames the core problem as informational: collectors "may not know the
 * prevailing fair price". A price list alone does not fix that — a collector
 * standing in a yard with an offer in front of them needs to know one thing:
 * *is this number good or not?* So every function here returns a JUDGEMENT
 * (low / fair / good), not just a number.
 *
 * Honesty about the model: with hackathon-scale data this is a robust median
 * over recent comparable transactions, not a forecast. It is labelled as such
 * in the UI. A SARIMAX badge on 40 data points would be a lie, and a Ministry
 * panel would see through it immediately.
 */

import type { MaterialCategoryId } from './materials';
import { getMaterial } from './materials';
import type { PricePoint } from './db';

export type FairVerdict = 'low' | 'fair' | 'good';
export type Trend = 'up' | 'down' | 'flat';

export interface FairBand {
  low: number;
  mid: number;
  high: number;
  /** How many observations backed this. Shown to the user — thin data is disclosed. */
  sampleSize: number;
  /** false when we fell back to the catalogue's indicative range. */
  dataBacked: boolean;
}

const DAY = 86_400_000;

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function quantile(xs: number[], q: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return s[base + 1] !== undefined ? s[base] + rest * (s[base + 1] - s[base]) : s[base];
}

/**
 * Discard obvious data-entry noise before computing the band, using the IQR
 * rule. Without this, one collector fat-fingering ₹5000/kg for plastic drags
 * the "fair price" for their whole district — and the feature that was meant
 * to protect people ends up misleading them.
 */
export function rejectOutliers(values: number[]): number[] {
  if (values.length < 4) return values;
  const q1 = quantile(values, 0.25);
  const q3 = quantile(values, 0.75);
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  const kept = values.filter((v) => v >= lo && v <= hi);
  return kept.length ? kept : values;
}

/**
 * Fair band for a category in a location.
 * Falls back to the catalogue's indicative range when we lack real data —
 * and flags that it did, rather than pretending.
 */
export function computeFairBand(
  points: PricePoint[],
  category: MaterialCategoryId,
  location?: string,
  windowDays = 30,
): FairBand {
  const since = Date.now() - windowDays * DAY;

  let scoped = points.filter((p) => p.category === category && p.recordedAt >= since);
  if (location) {
    const local = scoped.filter((p) => p.location === location);
    // Only narrow to the location if doing so leaves enough signal to trust.
    if (local.length >= 4) scoped = local;
  }

  const values = rejectOutliers(scoped.map((p) => p.buyingPrice).filter((v) => v > 0));

  if (values.length < 3) {
    const m = getMaterial(category);
    return {
      low: m.indicativePriceLow,
      mid: (m.indicativePriceLow + m.indicativePriceHigh) / 2,
      high: m.indicativePriceHigh,
      sampleSize: values.length,
      dataBacked: false,
    };
  }

  return {
    low: Math.round(quantile(values, 0.25)),
    mid: Math.round(median(values)),
    high: Math.round(quantile(values, 0.75)),
    sampleSize: values.length,
    dataBacked: true,
  };
}

/**
 * The judgement a collector actually needs. Deliberately generous at the
 * boundary: we call something 'low' only when it is clearly below the band,
 * because crying wolf on a fair offer destroys trust in the warning, and the
 * warning is the whole point.
 */
export function judgeOffer(offer: number, band: FairBand): FairVerdict {
  if (offer < band.low * 0.95) return 'low';
  if (offer >= band.mid) return 'good';
  return 'fair';
}

/** Value estimate for a lot, as a range. Never a single fake-precise number. */
export function estimateLotValue(
  band: FairBand,
  weightKg: number,
): { low: number; high: number; mid: number } {
  return {
    low: Math.round(band.low * weightKg),
    mid: Math.round(band.mid * weightKg),
    high: Math.round(band.high * weightKg),
  };
}

/**
 * Trend over the window. Compares the recent half against the older half.
 * Requires a 3% move to call a direction — below that it is noise, and an
 * arrow that flickers daily teaches people to ignore arrows.
 */
export function computeTrend(
  points: PricePoint[],
  category: MaterialCategoryId,
  windowDays = 14,
): { trend: Trend; changePct: number } {
  const now = Date.now();
  const since = now - windowDays * DAY;
  const mid = now - (windowDays / 2) * DAY;

  const scoped = points.filter((p) => p.category === category && p.recordedAt >= since);
  const older = rejectOutliers(scoped.filter((p) => p.recordedAt < mid).map((p) => p.buyingPrice));
  const recent = rejectOutliers(scoped.filter((p) => p.recordedAt >= mid).map((p) => p.buyingPrice));

  if (older.length < 2 || recent.length < 2) return { trend: 'flat', changePct: 0 };

  const a = median(older);
  const b = median(recent);
  if (a === 0) return { trend: 'flat', changePct: 0 };

  const changePct = ((b - a) / a) * 100;
  if (changePct > 3) return { trend: 'up', changePct };
  if (changePct < -3) return { trend: 'down', changePct };
  return { trend: 'flat', changePct };
}

/** Daily series for the sparkline. */
export function dailySeries(
  points: PricePoint[],
  category: MaterialCategoryId,
  days = 30,
): Array<{ date: string; price: number }> {
  const now = Date.now();
  const out: Array<{ date: string; price: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = now - i * DAY;
    const dayEnd = dayStart + DAY;
    const vals = points
      .filter((p) => p.category === category && p.recordedAt >= dayStart && p.recordedAt < dayEnd)
      .map((p) => p.buyingPrice);
    const m = vals.length ? median(rejectOutliers(vals)) : out.at(-1)?.price ?? 0;
    out.push({ date: new Date(dayStart).toISOString().slice(0, 10), price: Math.round(m) });
  }
  return out;
}

/**
 * Anomaly score for a completed transaction — the PS's "abnormal or
 * inconsistent transaction values". Robust z-score (median/MAD) rather than
 * mean/stdev, because the mean is exactly what outliers corrupt.
 */
export function anomalyScore(value: number, comparables: number[]): number {
  if (comparables.length < 5) return 0;
  const med = median(comparables);
  const mad = median(comparables.map((v) => Math.abs(v - med)));
  if (mad === 0) return 0;
  // 0.6745 scales MAD to be comparable with a standard deviation.
  return Math.abs((0.6745 * (value - med)) / mad);
}

export function isAnomalous(value: number, comparables: number[]): boolean {
  return anomalyScore(value, comparables) > 3.5;
}

export const VERDICT_COLOR: Record<FairVerdict, string> = {
  low: 'text-fair-low',
  fair: 'text-fair-ok',
  good: 'text-fair-good',
};

export const VERDICT_BG: Record<FairVerdict, string> = {
  low: 'bg-fair-low',
  fair: 'bg-fair-ok',
  good: 'bg-fair-good',
};
