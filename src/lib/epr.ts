/**
 * EPR credit bridge — the economic argument for formalising.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS THE STRATEGIC CENTREPIECE
 * ---------------------------------------------------------------------------
 * Under the E-Waste (Management) Rules, 2022, registered recyclers generate
 * EPR certificates when they process material, and producers buy those
 * certificates to meet their recycling obligations. That value is real.
 *
 * Informal collectors currently capture NONE of it — not because anyone
 * excludes them, but because their material arrives with no traceable
 * provenance, so it cannot be counted toward anyone's EPR target.
 *
 * Our signed handover record (crypto.ts) IS that provenance. Material handed
 * over through the platform to an authorised recycler is documented: weight,
 * time, GPS, photographs, both signatures. That makes it countable.
 *
 * So the platform can argue for a share of that certificate value flowing back
 * to the collector — and this module makes that share visible as a distinct
 * line on top of the scrap price.
 *
 * This is what makes the problem statement's central demand literally true:
 * "make the formal recycling channel an economically attractive and convenient
 * option for informal collectors rather than creating an additional compliance
 * burden."
 *
 * ---------------------------------------------------------------------------
 * ⚠️ HONESTY CONSTRAINTS — READ BEFORE QUOTING ANY NUMBER
 * ---------------------------------------------------------------------------
 * 1. EPR certificate prices are MARKET-DETERMINED and volatile. They vary by
 *    category, by year, and with how tight producer obligations are. The rates
 *    below are modelling assumptions, NOT quoted market prices.
 *
 * 2. The collector's share is a PROPOSED mechanism, not an existing
 *    entitlement. No rule today obliges a recycler to pass EPR value back to a
 *    collector. We are proposing a model in which traceability makes that
 *    commercially rational — because the recycler cannot claim the certificate
 *    without the documented chain of custody that the collector provides.
 *
 * 3. Present every figure as "estimated" and "indicative", with the assumed
 *    certificate rate stated on screen. A Ministry of Mines panel will know
 *    this market better than we do, and an unsourced precise number costs more
 *    credibility than the feature gains.
 *
 * Say it out loud in the pitch: "these are modelled at an assumed rate of
 * ₹X/kg; the mechanism is what we are demonstrating, not the price."
 * ---------------------------------------------------------------------------
 */

import type { MaterialCategoryId } from './materials';

/**
 * Assumed EPR certificate value in ₹ per kg of material processed.
 *
 * ⚠️ MODELLING ASSUMPTIONS — replace with sourced figures before the pitch.
 * Higher for categories where formal recovery is hardest and informal
 * processing is most damaging (batteries, CRTs), because that is broadly where
 * obligation pressure and therefore certificate value concentrate.
 */
export const EPR_RATE_PER_KG: Record<MaterialCategoryId, number> = {
  pcb_populated: 12,
  pcb_bare: 8,
  cables: 6,
  crt: 14,
  lcd_panel: 12,
  battery_liion: 22,
  battery_lead_acid: 10,
  motors_magnets: 7,
  plastics_mixed: 5,
  aluminium: 4,
  ferrous: 3,
  ewaste_mixed: 8,
};

/**
 * Proposed share of certificate value passed back to the collector.
 *
 * Not 100%: the recycler carries the processing cost, the compliance filing,
 * and the certificate risk. A model that assumed the collector takes all of it
 * would be obviously unworkable and would undermine the credibility of the
 * whole proposal. 40% is a defensible split that still materially changes the
 * collector's economics.
 */
export const COLLECTOR_SHARE = 0.4;

/** Platform's facilitation fee, charged to the RECYCLER side only. */
export const PLATFORM_SHARE = 0.05;

export interface EprEstimate {
  /** Total certificate value this lot could generate. */
  totalValue: number;
  /** Share proposed to reach the collector. */
  collectorBonus: number;
  /** Platform facilitation fee (recycler side). */
  platformFee: number;
  /** ₹/kg assumption used, surfaced in the UI for transparency. */
  ratePerKg: number;
  /** False when the lot cannot generate a certificate — see reason. */
  eligible: boolean;
  reason?: 'not_authorized' | 'not_traceable';
}

/**
 * Estimate EPR value for a lot.
 *
 * Eligibility is the whole point: only material going to an AUTHORISED
 * recycler with a signed, traceable handover can support a certificate claim.
 * A sale to an unverified aggregator generates nothing — and showing that zero
 * next to the authorised option is the clearest possible statement of why
 * traceability pays.
 */
export function estimateEpr(
  category: MaterialCategoryId,
  weightKg: number,
  opts: { authorizedRecycler: boolean; traceableHandover: boolean },
): EprEstimate {
  const ratePerKg = EPR_RATE_PER_KG[category] ?? 0;
  const totalValue = ratePerKg * weightKg;

  if (!opts.authorizedRecycler) {
    return {
      totalValue: 0,
      collectorBonus: 0,
      platformFee: 0,
      ratePerKg,
      eligible: false,
      reason: 'not_authorized',
    };
  }

  if (!opts.traceableHandover) {
    return {
      totalValue: 0,
      collectorBonus: 0,
      platformFee: 0,
      ratePerKg,
      eligible: false,
      reason: 'not_traceable',
    };
  }

  return {
    totalValue: Math.round(totalValue),
    collectorBonus: Math.round(totalValue * COLLECTOR_SHARE),
    platformFee: Math.round(totalValue * PLATFORM_SHARE),
    ratePerKg,
    eligible: true,
  };
}

/** Aggregate EPR value across confirmed handovers — for the Ministry view. */
export function aggregateEpr(
  lots: Array<{ category: MaterialCategoryId; weightKg: number }>,
): { totalValue: number; collectorShare: number; totalKg: number } {
  let totalValue = 0;
  let totalKg = 0;
  for (const l of lots) {
    totalValue += (EPR_RATE_PER_KG[l.category] ?? 0) * l.weightKg;
    totalKg += l.weightKg;
  }
  return {
    totalValue: Math.round(totalValue),
    collectorShare: Math.round(totalValue * COLLECTOR_SHARE),
    totalKg,
  };
}
