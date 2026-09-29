/**
 * Unit economics model.
 *
 * PS 26229 requires "a short unit-economics assessment comparing the
 * collector's existing earnings with the potential earnings through the
 * proposed platform and explaining how the platform can sustain its
 * operations."
 *
 * ---------------------------------------------------------------------------
 * ⚠️  EVERY INPUT BELOW IS A MODELLING ASSUMPTION, NOT A MEASUREMENT.
 * ---------------------------------------------------------------------------
 * None of these figures came from a survey, a dataset, or a published table.
 * They are plausible values chosen to make the mechanism legible, and they are
 * labelled as such everywhere they surface.
 *
 * `confidence` on each assumption says how much weight it can bear:
 *   'literature'  — consistent with published informal-sector research
 *   'plausible'   — reasoned from trade structure, not measured
 *   'guess'       — genuinely uncertain, needs field data before it is quoted
 *
 * Replace these with the numbers from FIELD-RESEARCH.md. Until then, present
 * outputs as RANGES and say "modelled, field research pending". A judge can
 * argue with an assumption — that is what assumptions are for. A judge cannot
 * argue with a number you present as fact and cannot source.
 * ---------------------------------------------------------------------------
 */

export type Confidence = 'literature' | 'plausible' | 'guess';

export interface Assumption<T = number> {
  value: T;
  /** Low/high bound for sensitivity analysis. */
  range: [T, T];
  unit: string;
  confidence: Confidence;
  note: string;
}

/* -------------------------------------------------------------- assumptions */

export const ASSUMPTIONS = {
  /** How much material one collector gathers in a working day. */
  dailyVolumeKg: {
    value: 12,
    range: [6, 25],
    unit: 'kg/day',
    confidence: 'plausible',
    note: 'E-WASTE ONLY, not general scrap. A collector may move far more paper and metal; electronics are a small, irregular share of the day.',
  } as Assumption,

  /** Working days per month. */
  workingDays: {
    value: 25,
    range: [22, 28],
    unit: 'days/month',
    confidence: 'plausible',
    note: 'Six days a week, allowing for weather and festivals.',
  } as Assumption,

  /**
   * What the nearest aggregator pays, as a fraction of the district median.
   * This margin is the whole reason the platform can pay more — the
   * aggregator's cut is what gets redistributed.
   */
  aggregatorRateFactor: {
    value: 0.78,
    range: [0.68, 0.88],
    unit: '× district median',
    confidence: 'plausible',
    note: 'The aggregator margin. The single most important number here, and the least certain.',
  } as Assumption,

  /** What a licensed recycler pays, as a fraction of the district median. */
  formalRateFactor: {
    value: 1.12,
    range: [1.02, 1.25],
    unit: '× district median',
    confidence: 'plausible',
    note: 'Licensed recyclers buy at or above median because volume and traceability are worth something.',
  } as Assumption,

  /** Cost to move a load across town when the buyer does not collect. */
  transportPerKm: {
    value: 12,
    range: [6, 20],
    unit: '₹/km',
    confidence: 'guess',
    note: 'Shared tempo or auto. Highly local. Ask the collectors directly.',
  } as Assumption,

  /** Typical one-way distance to a licensed recycler vs the local aggregator. */
  formalDistanceKm: {
    value: 8,
    range: [3, 18],
    unit: 'km',
    confidence: 'guess',
    note: 'Licensed facilities cluster in industrial areas, further than the neighbourhood buyer.',
  } as Assumption,

  aggregatorDistanceKm: {
    value: 2,
    range: [0.5, 4],
    unit: 'km',
    confidence: 'plausible',
    note: 'The local buyer is, by definition, local.',
  } as Assumption,

  /** Share of loads a licensed recycler collects themselves. */
  pickupShare: {
    value: 0.5,
    range: [0.2, 0.8],
    unit: 'fraction of loads',
    confidence: 'guess',
    note: 'Pickup removes transport cost entirely. Depends on lot size and recycler capacity.',
  } as Assumption,

  /**
   * Blended district median across a realistic material mix.
   * ⚠️ This is the figure most in need of real data — it drives everything.
   */
  blendedMedianRate: {
    value: 42,
    range: [24, 68],
    unit: '₹/kg',
    confidence: 'guess',
    note: 'Weighted for a REALISTIC mix: mostly mixed e-waste, plastics and ferrous, with cable or PCB only occasionally. An earlier value of Rs 62 assumed far too much high-value material and produced daily earnings several times what the literature reports.',
  } as Assumption,

  /** EPR certificate value attributable to traceable material. */
  eprRatePerKg: {
    value: 8,
    range: [3, 22],
    unit: '₹/kg',
    confidence: 'guess',
    note: 'Market-determined and volatile. Blended across categories.',
  } as Assumption,

  /** Share of EPR value proposed to reach the collector. */
  eprCollectorShare: {
    value: 0.4,
    range: [0.2, 0.5],
    unit: 'fraction',
    confidence: 'plausible',
    note: 'A proposed split, not an existing entitlement. The recycler carries processing cost and filing risk.',
  } as Assumption,
} as const;

/* ----------------------------------------------------------------- the model */

export interface RouteEarnings {
  grossPerDay: number;
  transportPerDay: number;
  netPerDay: number;
  netPerMonth: number;
}

export interface EconomicsResult {
  informal: RouteEarnings;
  formal: RouteEarnings;
  /** EPR bonus is additive and only exists on the formal route. */
  eprBonusPerDay: number;
  formalWithEprPerDay: number;
  gainPerDay: number;
  gainPerMonth: number;
  gainPct: number;
}

type Pick = 'value' | 'low' | 'high';

function pick(a: Assumption, which: Pick): number {
  return which === 'value' ? a.value : which === 'low' ? a.range[0] : a.range[1];
}

/**
 * Run the model.
 *
 * `scenario` selects which end of each assumption range to use, which is how
 * the sensitivity band is produced. 'low' is deliberately pessimistic for the
 * platform (small aggregator margin, long distance, expensive transport) and
 * 'high' optimistic — so the reported range is genuinely a range, not a
 * flattering point estimate with error bars drawn around it.
 */
export function runModel(scenario: Pick = 'value'): EconomicsResult {
  const A = ASSUMPTIONS;

  // Pessimistic for the platform means: aggregator pays WELL (small margin to
  // redistribute), formal pays badly, transport is dear, distance is long.
  const inv = (p: Pick): Pick => (p === 'low' ? 'high' : p === 'high' ? 'low' : 'value');

  const kg = pick(A.dailyVolumeKg, scenario);
  const days = pick(A.workingDays, 'value');
  const median = pick(A.blendedMedianRate, scenario);

  const aggFactor = pick(A.aggregatorRateFactor, inv(scenario));
  const formFactor = pick(A.formalRateFactor, scenario);

  const transportRate = pick(A.transportPerKm, inv(scenario));
  const formalKm = pick(A.formalDistanceKm, inv(scenario));
  const aggKm = pick(A.aggregatorDistanceKm, 'value');
  const pickup = pick(A.pickupShare, scenario);

  // Informal route: local buyer, short trip, no pickup.
  const informalGross = kg * median * aggFactor;
  const informalTransport = aggKm * transportRate;
  const informalNet = informalGross - informalTransport;

  // Formal route: better rate, longer trip, but the recycler collects some of
  // the time — which is a real and often-ignored part of the comparison.
  const formalGross = kg * median * formFactor;
  const formalTransport = formalKm * transportRate * (1 - pickup);
  const formalNet = formalGross - formalTransport;

  const eprBonus = kg * pick(A.eprRatePerKg, scenario) * pick(A.eprCollectorShare, scenario);
  const formalWithEpr = formalNet + eprBonus;

  const gain = formalWithEpr - informalNet;

  return {
    informal: {
      grossPerDay: Math.round(informalGross),
      transportPerDay: Math.round(informalTransport),
      netPerDay: Math.round(informalNet),
      netPerMonth: Math.round(informalNet * days),
    },
    formal: {
      grossPerDay: Math.round(formalGross),
      transportPerDay: Math.round(formalTransport),
      netPerDay: Math.round(formalNet),
      netPerMonth: Math.round(formalNet * days),
    },
    eprBonusPerDay: Math.round(eprBonus),
    formalWithEprPerDay: Math.round(formalWithEpr),
    gainPerDay: Math.round(gain),
    gainPerMonth: Math.round(gain * days),
    gainPct: informalNet > 0 ? (gain / informalNet) * 100 : 0,
  };
}

/** The honest headline: a band, never a point. */
export function earningsBand(): {
  informalPerDay: [number, number];
  formalPerDay: [number, number];
  gainPct: [number, number];
} {
  const lo = runModel('low');
  const hi = runModel('high');
  return {
    informalPerDay: [lo.informal.netPerDay, hi.informal.netPerDay],
    formalPerDay: [lo.formalWithEprPerDay, hi.formalWithEprPerDay],
    gainPct: [Math.round(lo.gainPct), Math.round(hi.gainPct)],
  };
}

/* ------------------------------------------------------ platform sustainability */

/**
 * How the platform pays for itself.
 *
 * Design rule: the collector is NEVER charged. Charging someone to see a fair
 * price rebuilds the exact barrier this product exists to remove, and it would
 * be indefensible in front of the panel.
 */
export const REVENUE_MODEL = {
  collectorFee: {
    value: 0,
    note: 'Never. Charging for price access recreates the barrier the product removes.',
  },
  recyclerTakeRate: {
    value: 0.02,
    range: [0.01, 0.03],
    note: 'On brokered lots, charged to the buy side only.',
  },
  eprFacilitationFee: {
    value: 0.05,
    range: [0.03, 0.08],
    note: 'Share of certificate value, for producing the traceable chain of custody that makes the claim possible.',
  },
  dataSubscription: {
    note: 'Anonymised district price and volume intelligence, sold to producers and PROs. Not modelled — no basis to size it.',
  },
  govLicensing: {
    note: 'ULB/SPCB dashboard licensing. Not modelled.',
  },
} as const;

/** Monthly platform revenue from one active collector, at modelled rates. */
export function revenuePerCollectorPerMonth(scenario: Pick = 'value'): number {
  const m = runModel(scenario);
  const takeRate = REVENUE_MODEL.recyclerTakeRate.value;
  const eprFee = REVENUE_MODEL.eprFacilitationFee.value;
  const days = ASSUMPTIONS.workingDays.value;

  const gmv = m.formal.grossPerDay * days;
  const eprPool = (m.eprBonusPerDay / ASSUMPTIONS.eprCollectorShare.value) * days;

  return Math.round(gmv * takeRate + eprPool * eprFee);
}

/**
 * Minimum lot size at which the formal route beats the informal one.
 *
 * THE MOST IMPORTANT OUTPUT IN THIS FILE. The model shows that below a certain
 * weight, travelling to a licensed recycler LOSES money — transport eats the
 * better rate. A collector with 3 kg is entirely rational to sell to the local
 * aggregator, and any pitch claiming "formal always pays more" is wrong.
 *
 * This is the quantified argument for lot pooling (FEATURE-BLUEPRINT.md §5.6):
 * combining lots is not a convenience feature, it is what makes the formal
 * route viable for small collectors at all.
 *
 * Returns null when the formal route wins at any size (pickup offered, or the
 * facility is close).
 */
export function breakEvenLotKg(scenario: Pick = 'value'): number | null {
  const A = ASSUMPTIONS;
  const inv = (p: Pick): Pick => (p === 'low' ? 'high' : p === 'high' ? 'low' : 'value');

  const median = pick(A.blendedMedianRate, scenario);
  const aggFactor = pick(A.aggregatorRateFactor, inv(scenario));
  const formFactor = pick(A.formalRateFactor, scenario);
  const eprPerKg = pick(A.eprRatePerKg, scenario) * pick(A.eprCollectorShare, scenario);

  const transportRate = pick(A.transportPerKm, inv(scenario));
  const formalKm = pick(A.formalDistanceKm, inv(scenario));
  const aggKm = pick(A.aggregatorDistanceKm, 'value');
  const pickup = pick(A.pickupShare, scenario);

  // Per-kg advantage of going formal, before transport.
  const perKgGain = median * (formFactor - aggFactor) + eprPerKg;
  // Extra transport the formal route costs, independent of weight.
  const extraTransport = formalKm * transportRate * (1 - pickup) - aggKm * transportRate;

  if (perKgGain <= 0) return null;
  if (extraTransport <= 0) return 0; // formal is cheaper to reach; always wins
  return Math.ceil((extraTransport / perKgGain) * 10) / 10;
}

/** Every assumption, for rendering a "what we assumed" table beside any figure. */
export function assumptionTable() {
  return Object.entries(ASSUMPTIONS).map(([key, a]) => ({
    key,
    value: a.value,
    range: a.range,
    unit: a.unit,
    confidence: a.confidence,
    note: a.note,
  }));
}

/** Count of assumptions still resting on a guess — surfaced by npm run verify. */
export function guessCount(): number {
  return Object.values(ASSUMPTIONS).filter((a) => a.confidence === 'guess').length;
}
