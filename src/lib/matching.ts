/**
 * Recycler matching and ranking.
 *
 * PS requirement: "identify and rank suitable authorized recyclers for a
 * collector's lot" using location, material category, offered rate, pickup
 * availability and authorization status.
 *
 * The ranking optimises for NET RUPEES IN THE COLLECTOR'S HAND, not headline
 * rate. A recycler paying ₹10/kg more but 18 km away, with no pickup, on a
 * 40 kg lot, leaves the collector worse off once transport is paid. Ranking by
 * advertised rate alone would systematically mislead exactly the people this
 * product exists to protect.
 */

import type { Lot, Recycler } from './db';
import type { MaterialCategoryId } from './materials';
import { distanceKm } from './seed';

/**
 * Rough transport cost for a collector hauling a lot by cycle-cart, auto or
 * tempo. Deliberately simple and deliberately visible in the UI.
 *
 * ⚠️ Replace with a figure from the §8 field research — ask the two collectors
 * what they actually pay to move 50 kg across town. This placeholder is a
 * modelling assumption, not a measurement, and it should not survive contact
 * with real data.
 */
export const TRANSPORT_RUPEES_PER_KM = 12;
export const TRANSPORT_FREE_RADIUS_KM = 2;

export interface RankedRecycler {
  recycler: Recycler;
  distanceKm: number;
  /** Advertised rate for this lot's category. */
  ratePerKg: number;
  grossValue: number;
  transportCost: number;
  /** What the collector actually keeps. This is the number the UI leads with. */
  netValue: number;
  score: number;
  /** Reasons, as i18n-able tokens, shown as chips under each result. */
  flags: Array<
    'expired' | 'unverified' | 'pickup' | 'far' | 'best_rate' | 'aggregator' | 'out_of_area'
  >;
  eligible: boolean;
}

export interface MatchOptions {
  lotWeightKg: number;
  category: MaterialCategoryId;
  from: { lat: number; lng: number };
  /** Hide ineligible recyclers entirely rather than ranking them low. */
  hideIneligible?: boolean;
}

export function rankRecyclers(recyclers: Recycler[], opts: MatchOptions): RankedRecycler[] {
  const { lotWeightKg, category, from } = opts;
  const now = Date.now();

  const rows: RankedRecycler[] = recyclers
    .filter((r) => r.materialsAccepted.includes(category))
    .map((r) => {
      const d = distanceKm(from, r);
      const rate = r.offeredRates[category] ?? 0;
      const gross = rate * lotWeightKg;

      // Pickup means the recycler absorbs transport — a large real-world
      // difference that advertised rates hide completely.
      const billableKm = r.pickupAvailable ? 0 : Math.max(0, d - TRANSPORT_FREE_RADIUS_KM);
      const transport = Math.round(billableKm * TRANSPORT_RUPEES_PER_KM);
      const net = Math.round(gross - transport);

      const expired =
        r.authorizationStatus === 'expired' ||
        (r.authorizationExpiry > 0 && r.authorizationExpiry < now);
      const outOfArea = d > r.serviceAreaKm;

      const flags: RankedRecycler['flags'] = [];
      if (expired) flags.push('expired');
      // Distinct from 'expired': the facility is legitimate, just outside its
      // stated service area for this lot. The UI must say which it is.
      if (outOfArea && !expired) flags.push('out_of_area');
      if (r.authorizationStatus === 'unverified') flags.push('unverified');
      if (r.tier === 'aggregator') flags.push('aggregator');
      if (r.pickupAvailable) flags.push('pickup');
      if (d > 15) flags.push('far');

      // An expired authorization is a hard stop, not a soft penalty. Routing a
      // collector to a lapsed facility would defeat the entire purpose of the
      // platform and could expose them to a non-compliant handover.
      const eligible = !expired && !outOfArea;

      // Score is net value with a modest convenience bonus for pickup and a
      // mild distance penalty, so two similar offers break toward the easier one.
      let score = net;
      if (r.pickupAvailable) score += 0.03 * gross;
      score -= d * 2;
      if (r.tier === 'authorized_recycler') score += 0.05 * gross; // traceable + EPR-eligible
      if (!eligible) score = -Infinity;

      return {
        recycler: r,
        distanceKm: d,
        ratePerKg: rate,
        grossValue: Math.round(gross),
        transportCost: transport,
        netValue: net,
        score,
        flags,
        eligible,
      };
    });

  const eligibleRows = rows.filter((r) => r.eligible);
  if (eligibleRows.length) {
    const best = eligibleRows.reduce((a, b) => (b.ratePerKg > a.ratePerKg ? b : a));
    best.flags.push('best_rate');
  }

  const sorted = rows.sort((a, b) => b.score - a.score);
  return opts.hideIneligible ? sorted.filter((r) => r.eligible) : sorted;
}

/** Convenience for the lot screen: the single best net offer. */
export function bestOffer(recyclers: Recycler[], opts: MatchOptions): RankedRecycler | null {
  const ranked = rankRecyclers(recyclers, { ...opts, hideIneligible: true });
  return ranked[0] ?? null;
}

/**
 * The unit-economics comparison, computed live rather than asserted on a slide:
 * what the nearest aggregator would pay vs the best authorized recycler.
 *
 * This is the PS's "short unit-economics assessment" as a running feature.
 */
export interface EconomicsComparison {
  aggregatorNet: number;
  formalNet: number;
  gain: number;
  gainPct: number;
  aggregator?: RankedRecycler;
  formal?: RankedRecycler;
}

export function compareRoutes(recyclers: Recycler[], opts: MatchOptions): EconomicsComparison {
  const ranked = rankRecyclers(recyclers, opts);

  const aggregators = ranked
    .filter((r) => r.recycler.tier === 'aggregator')
    .sort((a, b) => a.distanceKm - b.distanceKm);
  // The realistic counterfactual is the nearest aggregator — that is who the
  // collector sells to today, not the best-priced one they never found.
  const aggregator = aggregators[0];

  const formal = ranked.filter((r) => r.recycler.tier === 'authorized_recycler' && r.eligible)[0];

  const aggregatorNet = aggregator?.netValue ?? 0;
  const formalNet = formal?.netValue ?? 0;
  const gain = formalNet - aggregatorNet;

  return {
    aggregatorNet,
    formalNet,
    gain,
    gainPct: aggregatorNet > 0 ? (gain / aggregatorNet) * 100 : 0,
    aggregator,
    formal,
  };
}

export function lotFrom(lot: Lot): { lat: number; lng: number } | null {
  return lot.lat != null && lot.lng != null ? { lat: lot.lat, lng: lot.lng } : null;
}
