/**
 * Material catalogue — the spine of the app.
 *
 * Every category named in PS 26229 appears here, each carrying:
 *   - a low-literacy presentation (icon, colour, vernacular names)
 *   - a safety profile (drives the contextual spoken warnings)
 *   - a recoverable-content profile (drives the Ministry critical-minerals view)
 *
 * ---------------------------------------------------------------------------
 * ⚠️  SOURCING NOTE — READ BEFORE THE PITCH
 * ---------------------------------------------------------------------------
 * The `recoverable` figures below are ORDER-OF-MAGNITUDE ESTIMATES drawn from
 * the general range reported in e-waste characterisation literature. They are
 * NOT assay results and they are NOT yet individually cited.
 *
 * Composition varies enormously by device age, brand and chemistry — an LFP
 * battery contains no cobalt at all while an older LCO cell is ~15% cobalt, and
 * that single fact swings the number by two orders of magnitude.
 *
 * Before any number from this file goes in front of a judge:
 *   1. replace each range with a cited figure (see `source` field), and
 *   2. keep presenting them as ranges with stated uncertainty.
 *
 * The dashboard must say "estimated recoverable content", never "recovered".
 * Overstating precision here is the fastest way to lose credibility with a
 * Ministry of Mines panel who will know these numbers better than we do.
 * ---------------------------------------------------------------------------
 */

export type MaterialCategoryId =
  | 'pcb_populated'
  | 'pcb_bare'
  | 'cables'
  | 'crt'
  | 'lcd_panel'
  | 'battery_liion'
  | 'battery_lead_acid'
  | 'motors_magnets'
  | 'plastics_mixed'
  | 'aluminium'
  | 'ferrous'
  | 'ewaste_mixed';

/** Elements we track. The first six are on India's critical minerals list. */
export type RecoverableElement =
  | 'lithium'
  | 'cobalt'
  | 'neodymium'
  | 'tantalum'
  | 'gallium'
  | 'indium'
  | 'copper'
  | 'gold'
  | 'silver'
  | 'aluminium'
  | 'lead';

export const CRITICAL_MINERALS: RecoverableElement[] = [
  'lithium',
  'cobalt',
  'neodymium',
  'tantalum',
  'gallium',
  'indium',
];

/** Grams of element per kilogram of material, as a low–high range. */
export interface RecoverableContent {
  element: RecoverableElement;
  gPerKgLow: number;
  gPerKgHigh: number;
  /** Where this range came from. 'unverified-estimate' MUST be replaced before the pitch. */
  source: 'unverified-estimate' | string;
}

export type HazardLevel = 'none' | 'caution' | 'high';

export interface SafetyProfile {
  level: HazardLevel;
  /** i18n keys, resolved at render/speech time. */
  warningKey: string;
  /** Pictogram id in /public/safety/. */
  pictogram: string;
}

export interface MaterialCategory {
  id: MaterialCategoryId;
  /** i18n key for the display name. */
  nameKey: string;
  /** Lucide icon name, used consistently across every surface. */
  icon: string;
  /** Tailwind colour class for the category tile. */
  tint: string;
  subCategories: string[];
  /** Typical buying range in ₹/kg — seeds the price board before real data exists. */
  indicativePriceLow: number;
  indicativePriceHigh: number;
  unit: 'kg' | 'piece';
  safety: SafetyProfile;
  recoverable: RecoverableContent[];
  /** Shown to the collector as the reason not to burn or acid-leach this. */
  whyFormalKey: string;
}

const est = (
  element: RecoverableElement,
  gPerKgLow: number,
  gPerKgHigh: number,
): RecoverableContent => ({
  element,
  gPerKgLow,
  gPerKgHigh,
  source: 'unverified-estimate',
});

export const MATERIALS: MaterialCategory[] = [
  {
    id: 'pcb_populated',
    nameKey: 'material.pcb_populated',
    icon: 'CircuitBoard',
    tint: 'bg-emerald-100 text-emerald-900',
    subCategories: ['motherboard', 'ram_card', 'graphics_card', 'phone_board', 'tv_board'],
    indicativePriceLow: 180,
    indicativePriceHigh: 650,
    unit: 'kg',
    safety: {
      level: 'high',
      warningKey: 'safety.pcb',
      pictogram: 'no-acid',
    },
    recoverable: [
      est('copper', 120, 250),
      est('gold', 0.15, 0.5),
      est('silver', 0.8, 2.0),
      est('tantalum', 0.4, 2.0),
      est('gallium', 0.005, 0.05),
    ],
    whyFormalKey: 'why.pcb',
  },
  {
    id: 'pcb_bare',
    nameKey: 'material.pcb_bare',
    icon: 'Square',
    tint: 'bg-emerald-50 text-emerald-900',
    subCategories: ['stripped_board'],
    indicativePriceLow: 40,
    indicativePriceHigh: 120,
    unit: 'kg',
    safety: { level: 'caution', warningKey: 'safety.pcb_bare', pictogram: 'no-burn' },
    recoverable: [est('copper', 60, 140)],
    whyFormalKey: 'why.pcb_bare',
  },
  {
    id: 'cables',
    nameKey: 'material.cables',
    icon: 'Cable',
    tint: 'bg-amber-100 text-amber-900',
    subCategories: ['copper_wire', 'aluminium_wire', 'data_cable', 'armoured_cable'],
    indicativePriceLow: 120,
    indicativePriceHigh: 480,
    unit: 'kg',
    safety: {
      level: 'high',
      // The single most important message in the product: burning is the
      // default informal practice and it is both the most dangerous and the
      // most value-destroying thing a collector can do.
      warningKey: 'safety.cables_no_burn',
      pictogram: 'no-burn',
    },
    recoverable: [est('copper', 350, 600), est('aluminium', 50, 300)],
    whyFormalKey: 'why.cables',
  },
  {
    id: 'crt',
    nameKey: 'material.crt',
    icon: 'Tv',
    tint: 'bg-slate-200 text-slate-900',
    subCategories: ['tv_crt', 'monitor_crt'],
    indicativePriceLow: 5,
    indicativePriceHigh: 20,
    unit: 'kg',
    safety: {
      level: 'high',
      warningKey: 'safety.crt',
      pictogram: 'implosion',
    },
    recoverable: [est('lead', 80, 250), est('copper', 10, 40)],
    whyFormalKey: 'why.crt',
  },
  {
    id: 'lcd_panel',
    nameKey: 'material.lcd_panel',
    icon: 'Monitor',
    tint: 'bg-sky-100 text-sky-900',
    subCategories: ['lcd_tv', 'lcd_monitor', 'laptop_panel'],
    indicativePriceLow: 15,
    indicativePriceHigh: 60,
    unit: 'kg',
    safety: { level: 'caution', warningKey: 'safety.lcd', pictogram: 'mercury' },
    recoverable: [est('indium', 0.05, 0.3), est('copper', 5, 25)],
    whyFormalKey: 'why.lcd',
  },
  {
    id: 'battery_liion',
    nameKey: 'material.battery_liion',
    icon: 'BatteryWarning',
    tint: 'bg-red-100 text-red-900',
    subCategories: ['phone_battery', 'laptop_pack', 'powerbank', 'ev_cell'],
    indicativePriceLow: 60,
    indicativePriceHigh: 220,
    unit: 'kg',
    safety: {
      level: 'high',
      warningKey: 'safety.liion',
      pictogram: 'no-puncture',
    },
    // ⚠️ Cobalt swings from ~0 (LFP) to ~150 g/kg (LCO). The range is honest
    // but wide; sub-category chemistry detection would narrow it and is a
    // roadmap item, not a 48-hour one.
    recoverable: [
      est('lithium', 15, 45),
      est('cobalt', 0, 150),
      est('copper', 60, 110),
    ],
    whyFormalKey: 'why.liion',
  },
  {
    id: 'battery_lead_acid',
    nameKey: 'material.battery_lead_acid',
    icon: 'BatteryFull',
    tint: 'bg-orange-100 text-orange-900',
    subCategories: ['car_battery', 'inverter_battery', 'ups_battery'],
    indicativePriceLow: 70,
    indicativePriceHigh: 130,
    unit: 'kg',
    safety: { level: 'high', warningKey: 'safety.lead_acid', pictogram: 'corrosive' },
    recoverable: [est('lead', 550, 700)],
    whyFormalKey: 'why.lead_acid',
  },
  {
    id: 'motors_magnets',
    nameKey: 'material.motors_magnets',
    icon: 'Fan',
    tint: 'bg-violet-100 text-violet-900',
    subCategories: ['hdd_magnet', 'speaker_magnet', 'bldc_motor', 'ac_motor'],
    indicativePriceLow: 45,
    indicativePriceHigh: 140,
    unit: 'kg',
    safety: { level: 'caution', warningKey: 'safety.motors', pictogram: 'pinch' },
    // NdFeB magnets are ~30% neodymium but are a small fraction of assembly mass.
    recoverable: [est('neodymium', 2, 30), est('copper', 100, 250)],
    whyFormalKey: 'why.motors',
  },
  {
    id: 'plastics_mixed',
    nameKey: 'material.plastics_mixed',
    icon: 'Package',
    tint: 'bg-teal-100 text-teal-900',
    subCategories: ['abs', 'hips', 'pc_blend', 'unsorted'],
    indicativePriceLow: 8,
    indicativePriceHigh: 35,
    unit: 'kg',
    safety: { level: 'caution', warningKey: 'safety.plastics', pictogram: 'no-burn' },
    recoverable: [],
    whyFormalKey: 'why.plastics',
  },
  {
    id: 'aluminium',
    nameKey: 'material.aluminium',
    icon: 'Layers',
    tint: 'bg-zinc-200 text-zinc-900',
    subCategories: ['heat_sink', 'casing', 'extrusion'],
    indicativePriceLow: 110,
    indicativePriceHigh: 175,
    unit: 'kg',
    safety: { level: 'none', warningKey: 'safety.generic', pictogram: 'gloves' },
    recoverable: [est('aluminium', 850, 980)],
    whyFormalKey: 'why.aluminium',
  },
  {
    id: 'ferrous',
    nameKey: 'material.ferrous',
    icon: 'Magnet',
    tint: 'bg-stone-200 text-stone-900',
    subCategories: ['chassis', 'screws_mixed', 'transformer_core'],
    indicativePriceLow: 20,
    indicativePriceHigh: 40,
    unit: 'kg',
    safety: { level: 'none', warningKey: 'safety.generic', pictogram: 'gloves' },
    recoverable: [],
    whyFormalKey: 'why.ferrous',
  },
  {
    id: 'ewaste_mixed',
    nameKey: 'material.ewaste_mixed',
    icon: 'Boxes',
    tint: 'bg-neutral-200 text-neutral-900',
    subCategories: ['unsorted_lot'],
    indicativePriceLow: 20,
    indicativePriceHigh: 90,
    unit: 'kg',
    safety: { level: 'caution', warningKey: 'safety.mixed', pictogram: 'gloves' },
    recoverable: [est('copper', 20, 80)],
    whyFormalKey: 'why.mixed',
  },
];

export const MATERIALS_BY_ID: Record<MaterialCategoryId, MaterialCategory> =
  Object.fromEntries(MATERIALS.map((m) => [m.id, m])) as Record<
    MaterialCategoryId,
    MaterialCategory
  >;

export function getMaterial(id: MaterialCategoryId): MaterialCategory {
  const m = MATERIALS_BY_ID[id];
  if (!m) throw new Error(`Unknown material category: ${id}`);
  return m;
}

/**
 * Estimated recoverable mass of one element from a lot, in grams.
 * Returns the midpoint plus the range, because the range is the honest answer
 * and the UI is built to show both.
 */
export function estimateRecoverable(
  categoryId: MaterialCategoryId,
  weightKg: number,
): Array<{ element: RecoverableElement; gramsLow: number; gramsHigh: number; gramsMid: number }> {
  return getMaterial(categoryId).recoverable.map((r) => {
    const gramsLow = r.gPerKgLow * weightKg;
    const gramsHigh = r.gPerKgHigh * weightKg;
    return {
      element: r.element,
      gramsLow,
      gramsHigh,
      gramsMid: (gramsLow + gramsHigh) / 2,
    };
  });
}

/** Critical-minerals-only slice, for the Ministry dashboard. */
export function estimateCriticalMinerals(categoryId: MaterialCategoryId, weightKg: number) {
  return estimateRecoverable(categoryId, weightKg).filter((r) =>
    CRITICAL_MINERALS.includes(r.element),
  );
}

export const ELEMENT_LABELS: Record<RecoverableElement, string> = {
  lithium: 'Lithium',
  cobalt: 'Cobalt',
  neodymium: 'Neodymium',
  tantalum: 'Tantalum',
  gallium: 'Gallium',
  indium: 'Indium',
  copper: 'Copper',
  gold: 'Gold',
  silver: 'Silver',
  aluminium: 'Aluminium',
  lead: 'Lead',
};
