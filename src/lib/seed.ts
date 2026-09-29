/**
 * Demo seed data — Nagpur (JNARDDC's home city, and Marathi-speaking).
 *
 * ---------------------------------------------------------------------------
 * ⚠️  THIS DATA IS SYNTHETIC. IT IS NOT A REAL RECYCLER REGISTRY.
 * ---------------------------------------------------------------------------
 * Facility names below are deliberately generic and fictional ("Unit A",
 * "Facility B"). They are NOT real companies, and the authorization numbers
 * are NOT real CPCB/MPCB registrations.
 *
 * This is a conscious choice, not laziness:
 *   - attaching invented authorization numbers to real company names would
 *     misrepresent those businesses' regulatory status, and
 *   - a judge who recognises a local firm and checks the number would find it
 *     fabricated, which destroys the credibility of everything else on screen.
 *
 * BEFORE THE DEMO: replace this with the genuine MPCB/CPCB authorized e-waste
 * recycler list for Maharashtra (see 48-HOUR-PLAN §8/§14). Say plainly on the
 * slide which recycler records are real and which are synthetic. "We seeded
 * synthetic recyclers pending the MPCB list" is a fine answer; being caught
 * with fake registrations is not.
 * ---------------------------------------------------------------------------
 */

import type { PricePoint, Recycler } from './db';
import { MATERIALS, type MaterialCategoryId } from './materials';

export const DEMO_CITY = { name: 'Nagpur', lat: 21.1458, lng: 79.0882 };

/** Deterministic PRNG so the demo looks identical on every reload and device. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(26229); // the problem statement id, for luck

const AREAS = [
  'Kalamna',
  'Hingna MIDC',
  'Butibori',
  'Kamptee Road',
  'Wadi',
  'Nari Road',
  'Pardi',
  'Mankapur',
  'Sitabuldi',
  'Ganeshpeth',
];

function jitter(base: number, km: number): number {
  // ~0.009 degrees per km.
  return base + (rnd() - 0.5) * 2 * km * 0.009;
}

export function seedRecyclers(): Recycler[] {
  const now = Date.now();
  const YEAR = 365 * 86_400_000;
  const all = MATERIALS.map((m) => m.id);

  const out: Recycler[] = [];

  // Four authorized recyclers — the formal tier.
  const authorized: Array<{
    name: string;
    accepts: MaterialCategoryId[];
    expiryDays: number;
    pickup: boolean;
    premium: number;
  }> = [
    { name: 'Authorized E-Waste Unit A', accepts: all, expiryDays: 400, pickup: true, premium: 1.12 },
    {
      name: 'Authorized Recycling Facility B',
      accepts: ['pcb_populated', 'pcb_bare', 'cables', 'motors_magnets', 'aluminium', 'ferrous'],
      expiryDays: 220,
      pickup: true,
      premium: 1.18,
    },
    {
      name: 'Authorized Battery Recycler C',
      accepts: ['battery_liion', 'battery_lead_acid'],
      expiryDays: 600,
      pickup: true,
      premium: 1.25,
    },
    {
      // Deliberately EXPIRED — this is the record a judge can spot-check live,
      // and the app must visibly refuse to recommend it.
      name: 'Authorized Unit D (lapsed)',
      accepts: ['crt', 'lcd_panel', 'plastics_mixed'],
      expiryDays: -45,
      pickup: false,
      premium: 1.05,
    },
  ];

  authorized.forEach((a, i) => {
    const rates: Partial<Record<MaterialCategoryId, number>> = {};
    for (const cat of a.accepts) {
      const m = MATERIALS.find((x) => x.id === cat)!;
      const mid = (m.indicativePriceLow + m.indicativePriceHigh) / 2;
      rates[cat] = Math.round(mid * a.premium * (0.95 + rnd() * 0.1));
    }
    out.push({
      id: `rec-auth-${i + 1}`,
      name: a.name,
      facilityLocation: `${AREAS[i % AREAS.length]}, Nagpur`,
      lat: jitter(DEMO_CITY.lat, 14),
      lng: jitter(DEMO_CITY.lng, 14),
      materialsAccepted: a.accepts,
      authorizationNo: `MH/EW/${2024 + (i % 2)}/${1000 + i * 137}`,
      authorizationExpiry: now + a.expiryDays * 86_400_000,
      authorizationStatus: a.expiryDays > 0 ? 'valid' : 'expired',
      contactPhone: `+91 9${(700000000 + i * 1234567).toString().slice(0, 9)}`,
      offeredRates: rates,
      pickupAvailable: a.pickup,
      serviceAreaKm: 25 + i * 5,
      tier: 'authorized_recycler',
    });
  });

  // Aggregators — the middle tier the PS names and most solutions omit.
  // They pay LESS (that margin is the collector's loss), accept everything,
  // and are unverified. Modelling them honestly is what makes the
  // unit-economics comparison meaningful rather than rhetorical.
  for (let i = 0; i < 8; i++) {
    const rates: Partial<Record<MaterialCategoryId, number>> = {};
    for (const m of MATERIALS) {
      const mid = (m.indicativePriceLow + m.indicativePriceHigh) / 2;
      rates[m.id] = Math.round(mid * (0.72 + rnd() * 0.12));
    }
    out.push({
      id: `rec-agg-${i + 1}`,
      name: `Local Aggregator ${String.fromCharCode(65 + i)}`,
      facilityLocation: `${AREAS[(i + 3) % AREAS.length]}, Nagpur`,
      lat: jitter(DEMO_CITY.lat, 8),
      lng: jitter(DEMO_CITY.lng, 8),
      materialsAccepted: MATERIALS.map((m) => m.id),
      authorizationNo: '—',
      authorizationExpiry: 0,
      authorizationStatus: 'unverified',
      contactPhone: undefined,
      offeredRates: rates,
      pickupAvailable: false,
      serviceAreaKm: 6,
      tier: 'aggregator',
    });
  }

  return out;
}

/**
 * ~45 days of price history as a bounded random walk per category.
 * Enough shape for trends and sparklines to be real computations rather than
 * decorative curves — the chart is reading the same dataset the price board is.
 */
export function seedPricePoints(recyclers: Recycler[], days = 45): PricePoint[] {
  const out: PricePoint[] = [];
  const now = Date.now();
  const DAY = 86_400_000;

  for (const m of MATERIALS) {
    const mid = (m.indicativePriceLow + m.indicativePriceHigh) / 2;
    let level = mid;
    // Per-category drift. This has to be large enough to actually CROSS the
    // 3% trend threshold in pricing.ts over a 7-day half-window, or every
    // category reads "flat" and the trend feature looks broken when it is in
    // fact working correctly. Real scrap prices move this much and more —
    // copper commonly swings 5-10% in a month with LME.
    const drift = (rnd() - 0.5) * 0.013;

    for (let d = days - 1; d >= 0; d--) {
      const ts = now - d * DAY;
      level = level * (1 + drift + (rnd() - 0.5) * 0.03);
      // Wider clamp so a genuine trend can run for several weeks instead of
      // flattening against the bound halfway through the window.
      level = Math.min(m.indicativePriceHigh * 1.3, Math.max(m.indicativePriceLow * 0.7, level));

      // 2-4 observations a day, from different buyers.
      const n = 2 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) {
        const r = recyclers[Math.floor(rnd() * recyclers.length)];
        if (!r.materialsAccepted.includes(m.id)) continue;
        const tierFactor = r.tier === 'authorized_recycler' ? 1.0 : 0.8;
        out.push({
          id: `pp-${m.id}-${d}-${k}`,
          category: m.id,
          location: DEMO_CITY.name,
          recordedAt: ts + Math.floor(rnd() * DAY),
          buyingPrice: Math.round(level * tierFactor * (0.96 + rnd() * 0.08)),
          unit: m.unit,
          recyclerId: r.id,
          source: d === 0 ? 'recycler' : 'transaction',
        });
      }
    }
  }

  return out;
}

/** Haversine distance in km — used for recycler ranking. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(la1) * Math.cos(la2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
