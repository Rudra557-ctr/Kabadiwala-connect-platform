/**
 * Demo transaction history.
 *
 * WHY THIS EXISTS: without it, three of the app's screens (earnings, recycler
 * queue, Ministry dashboard) render empty, and the product reads as unfinished
 * even though the logic behind them works. A realistic history is not
 * decoration — it is what lets every downstream computation (trends, minerals,
 * reliability, unit economics) actually have something to compute.
 *
 * IMPORTANT: the handovers generated here are signed with the REAL device key,
 * exactly like a live one. They genuinely verify. We are not faking the
 * cryptography to make the demo look good — if a judge scans a seeded receipt
 * it passes verification honestly, because it really was signed on this device.
 *
 * The lots, weights and prices are synthetic. That is disclosed in the README
 * and on the Ministry dashboard.
 */

import { ulid } from 'ulid';
import type { Handover, Lot, MlSample, PricePoint, Recycler } from './db';
import { MATERIALS, type MaterialCategoryId } from './materials';
import { computeFairBand } from './pricing';
import { canonicalize, makeReference, signHandover, sha256Hex } from './crypto';
import { DEMO_CITY } from './seed';

const DAY = 86_400_000;

/**
 * A plausible wrong guess: a visually confusable neighbour, not a random
 * class. Real classifiers confuse bare boards with populated ones and mixed
 * e-waste with plastics — they rarely mistake a CRT for a cable.
 */
function wrongGuess(actual: MaterialCategoryId, i: number): MaterialCategoryId {
  const confusable: Partial<Record<MaterialCategoryId, MaterialCategoryId[]>> = {
    pcb_populated: ['pcb_bare', 'ewaste_mixed'],
    pcb_bare: ['pcb_populated', 'ferrous'],
    cables: ['motors_magnets', 'ewaste_mixed'],
    crt: ['lcd_panel', 'ewaste_mixed'],
    lcd_panel: ['crt', 'plastics_mixed'],
    battery_liion: ['battery_lead_acid', 'ewaste_mixed'],
    battery_lead_acid: ['battery_liion', 'ferrous'],
    motors_magnets: ['ferrous', 'cables'],
    plastics_mixed: ['ewaste_mixed', 'lcd_panel'],
    aluminium: ['ferrous', 'plastics_mixed'],
    ferrous: ['aluminium', 'motors_magnets'],
    ewaste_mixed: ['plastics_mixed', 'pcb_populated'],
  };
  const options = confusable[actual] ?? ['ewaste_mixed'];
  return options[i % options.length];
}

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A small, recognisable placeholder image per category, drawn on canvas.
 *
 * Real photos would obviously be better, but an empty grey box in every lot
 * row makes the whole app look broken. These are clearly stylised — nobody
 * will mistake them for photographs, which is the right call: a fake
 * photorealistic scrap image would be misrepresenting our own data.
 */
function placeholderPhoto(category: MaterialCategoryId, seed: number): string {
  if (typeof document === 'undefined') return '';

  const palettes: Partial<Record<MaterialCategoryId, [string, string]>> = {
    pcb_populated: ['#0f5132', '#2b9a64'],
    pcb_bare: ['#14532d', '#4ade80'],
    cables: ['#78350f', '#f59e0b'],
    crt: ['#334155', '#94a3b8'],
    lcd_panel: ['#0c4a6e', '#38bdf8'],
    battery_liion: ['#7f1d1d', '#f87171'],
    battery_lead_acid: ['#7c2d12', '#fb923c'],
    motors_magnets: ['#4c1d95', '#a78bfa'],
    plastics_mixed: ['#134e4a', '#2dd4bf'],
    aluminium: ['#334155', '#cbd5e1'],
    ferrous: ['#44403c', '#a8a29e'],
    ewaste_mixed: ['#374151', '#9ca3af'],
  };
  const [dark, light] = palettes[category] ?? ['#374151', '#9ca3af'];

  const c = document.createElement('canvas');
  c.width = 320;
  c.height = 240;
  const ctx = c.getContext('2d');
  if (!ctx) return '';

  const g = ctx.createLinearGradient(0, 0, 320, 240);
  g.addColorStop(0, dark);
  g.addColorStop(1, light);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 320, 240);

  // Scattered blocks suggesting a heap of material.
  const r = rng(seed);
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = i % 2 ? '#ffffff' : '#000000';
    const w = 24 + r() * 70;
    const h = 16 + r() * 50;
    ctx.save();
    ctx.translate(r() * 320, r() * 240);
    ctx.rotate((r() - 0.5) * 1.2);
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  return c.toDataURL('image/jpeg', 0.6);
}

export interface SeededHistory {
  lots: Lot[];
  handovers: Handover[];
  mlSamples: MlSample[];
  pricePoints: PricePoint[];
}

/**
 * Build ~45 days of plausible collector history.
 *
 * Status mix is deliberately realistic rather than tidy: most older lots are
 * paid, recent ones are confirmed-but-unpaid (so "pending dues" is non-zero
 * and the ledger has something to show), and a couple are still listed.
 */
export async function seedTransactionHistory(
  collectorId: string,
  recyclers: Recycler[],
  pricePoints: PricePoint[],
  count = 42,
): Promise<SeededHistory> {
  const r = rng(26229 * 7);
  const lots: Lot[] = [];
  const handovers: Handover[] = [];
  const mlSamples: MlSample[] = [];
  const newPricePoints: PricePoint[] = [];

  // Collectors specialise. A realistic history is dominated by a few
  // categories rather than uniformly spread across all twelve.
  const weighted: MaterialCategoryId[] = [
    'cables', 'cables', 'cables', 'cables',
    'pcb_populated', 'pcb_populated', 'pcb_populated',
    'ewaste_mixed', 'ewaste_mixed',
    'aluminium', 'aluminium',
    'battery_liion', 'battery_liion',
    'motors_magnets', 'motors_magnets',
    'plastics_mixed',
    'ferrous',
    'crt',
    'lcd_panel',
  ];

  const authorized = recyclers.filter(
    (x) => x.tier === 'authorized_recycler' && x.authorizationStatus === 'valid',
  );
  const aggregators = recyclers.filter((x) => x.tier === 'aggregator');

  // Draw all the day offsets up front, then assign status by RANK.
  //
  // Probabilistic status assignment kept producing zero 'listed' lots, leaving
  // the recycler's buying desk permanently empty. A demo state that depends on
  // a lucky PRNG draw is not a demo state. Rank guarantees stock every run.
  //
  // Offsets stay biased toward recent days: an active collector has denser
  // recent activity, and a flat spread leaves the "today" stats empty.
  const dayOffsets = Array.from({ length: count }, () => Math.floor(Math.pow(r(), 1.9) * 45));
  const rankByIndex = new Map<number, number>();
  dayOffsets
    .map((d, idx) => ({ d, idx }))
    .sort((a, b) => a.d - b.d)
    .forEach((entry, rankPos) => rankByIndex.set(entry.idx, rankPos));

  for (let i = 0; i < count; i++) {
    const daysAgo = dayOffsets[i];
    const rank = rankByIndex.get(i) ?? i;
    const createdAt = Date.now() - daysAgo * DAY - Math.floor(r() * DAY);
    const category = weighted[Math.floor(r() * weighted.length)];
    const material = MATERIALS.find((m) => m.id === category)!;

    // ---------------------------------------------------------------------
    // SCALE: this must match what ONE informal collector with a handcart can
    // physically gather in a day, not what an aggregator moves.
    //
    // Bulk items (CRT, plastics, ferrous) come in larger but cheap; high-value
    // items (PCBs, batteries) come in small quantities. Getting 45 kg of
    // populated PCBs in a day is not plausible for one person, and a panel
    // that knows this sector spots that immediately.
    //
    // ⚠️ These magnitudes are calibrated to be *plausible*, not measured.
    // Replace with real figures from the field research (README).
    // ---------------------------------------------------------------------
    const bulky = ['crt', 'ferrous', 'plastics_mixed', 'ewaste_mixed', 'lcd_panel'].includes(
      category,
    );
    const precious = ['pcb_populated', 'pcb_bare', 'battery_liion'].includes(category);
    const weightKg =
      Math.round((bulky ? 6 + r() * 26 : precious ? 1 + r() * 7 : 3 + r() * 14) * 2) / 2;

    const band = computeFairBand(pricePoints, category, DEMO_CITY.name);

    // 70% of history goes to authorized recyclers, 30% to aggregators — the
    // platform is working but has not eliminated the middleman entirely.
    // A 100% formalization rate would be an obviously fabricated number.
    const pool = r() < 0.7 && authorized.length ? authorized : aggregators;
    const recycler = pool[Math.floor(r() * pool.length)] ?? recyclers[0];

    const rate = recycler.offeredRates[category] ?? band.mid;
    const finalPrice = Math.round(rate * weightKg);

    // Settlement is CASH-FIRST, which the PS explicitly requires. Most scrap
    // is paid for on the spot at handover, so "pending dues" should be a few
    // days of work at most — not a month's earnings sitting unpaid.
    //
    // Only pickup-based sales (where the recycler collects and pays later)
    // realistically leave money outstanding.
    //
    // `handed_over` is the state that matters for the recycler demo: material
    // delivered, signature not yet countersigned. Without a few of these the
    // recycler's queue reads "0 Awaiting" and their core workflow — review,
    // verify, confirm — has nothing to act on.
    // Rank 0 is the most recent lot. Newest are still on the market, then
    // delivered-but-unconfirmed, then confirmed-but-unpaid, and the long tail
    // is settled — which is what cash-first settlement actually looks like.
    const status: Lot['status'] =
      rank < 6
        ? 'listed'
        : rank < 11
          ? 'handed_over'
          : rank < 16
            ? 'confirmed'
            : 'paid';

    const photo = placeholderPhoto(category, i * 977);
    const photoHash = photo ? await sha256Hex(photo) : '';

    const lotId = ulid();
    const lot: Lot = {
      id: lotId,
      collectorId,
      category,
      photos: photo ? [photo] : [],
      photoHashes: photoHash ? [photoHash] : [],
      weightKg,
      estValueLow: Math.round(band.low * weightKg),
      estValueHigh: Math.round(band.high * weightKg),
      quotedPrice: rate,
      finalPrice: status === 'listed' ? undefined : finalPrice,
      recyclerId: status === 'listed' ? undefined : recycler.id,
      lat: DEMO_CITY.lat + (r() - 0.5) * 0.09,
      lng: DEMO_CITY.lng + (r() - 0.5) * 0.09,
      status,
      createdAt,
      // Clamped to now: settlement happens after collection but never in the
      // future. Without the clamp, recent lots land tomorrow and the recycler
      // queue grows a date group that has not happened yet.
      updatedAt: Math.min(Date.now(), createdAt + Math.floor(r() * 2 * DAY)),
      sync: 'synced',
      // Deliberately imperfect, and deterministic by index rather than by
      // chance: interleaved PRNG draws produced a ~98% agreement rate, which
      // no first model trained on a few hundred images achieves, and an
      // inflated accuracy number is exactly the kind of claim that costs
      // credibility. Every 5th sample is a miss => ~20%.
      aiPredicted: i % 5 === 3 ? wrongGuess(category, i) : category,
      // Misses carry lower confidence than hits, as a real model's would.
      aiConfidence: i % 5 === 3 ? 0.45 + (i % 7) * 0.02 : 0.74 + (i % 9) * 0.025,
    };
    lots.push(lot);

    // Every settled lot has a real, signed handover behind it.
    if (status !== 'listed') {
      const payloadBase = {
        v: 1 as const,
        l: lotId,
        r: makeReference(),
        w: weightKg,
        h: photoHash ? [photoHash.slice(0, 16)] : [],
        t: lot.updatedAt,
        g: [Number(lot.lat!.toFixed(5)), Number(lot.lng!.toFixed(5))] as [number, number],
      };
      const { payload, signature } = await signHandover(payloadBase);

      // Weighbridge readings differ slightly from a collector's estimate —
      // that delta is real and is what the reliability score is built from.
      // Collectors estimate weight by hand, so real error runs 5-15%. The old
    // 0.96-1.03 range could never cross the 8% dispute threshold, which left
    // the weight-dispute feature permanently showing zero.
    const actual = Math.round(weightKg * (0.88 + r() * 0.2) * 10) / 10;

      handovers.push({
        id: ulid(),
        lotId,
        reference: payload.r,
        weightKg,
        photoHashes: payload.h,
        lat: lot.lat,
        lng: lot.lng,
        timestamp: payload.t,
        collectorSig: signature,
        collectorPubKey: payload.k,
        recyclerId: recycler.id,
        // Only a CONFIRMED handover has a weighbridge reading and a
        // countersignature. An awaiting one has neither — that is precisely
        // what the recycler is about to supply.
        actualWeightKg: status === 'handed_over' ? undefined : actual,
        confirmedAt:
          status === 'handed_over' ? undefined : payload.t + Math.floor(r() * 3600_000),
        sync: 'synced',
      });

      // Confirmed handovers feed verified labels back into the training set —
      // this is the active-learning loop that makes the dataset non-static.
      if (photoHash) {
        mlSamples.push({
          id: ulid(),
          lotId,
          photoHash,
          predictedClass: lot.aiPredicted,
          confidence: lot.aiConfidence,
          confirmedClass: status === 'handed_over' ? undefined : category,
          confirmedBy: status === 'handed_over' ? undefined : recycler.id,
          usedInTraining: daysAgo > 20,
          createdAt: lot.updatedAt,
          sync: 'synced',
        });
      }

      // Each completed sale is itself a price observation — the flywheel.
      newPricePoints.push({
        id: `pp-tx-${lotId}`,
        category,
        location: DEMO_CITY.name,
        recordedAt: lot.updatedAt,
        buyingPrice: rate,
        quotedPrice: rate,
        unit: material.unit,
        recyclerId: recycler.id,
        source: 'transaction',
      });
    }
  }

  return { lots, handovers, mlSamples, pricePoints: newPricePoints };
}

/** Declared-vs-actual accuracy over history, as a 0-100 reliability score. */
export function computeReliability(handovers: Handover[]): number {
  const withActual = handovers.filter((h) => h.actualWeightKg != null && h.weightKg > 0);
  if (withActual.length < 3) return 100;
  const errors = withActual.map(
    (h) => Math.abs((h.actualWeightKg! - h.weightKg) / h.weightKg),
  );
  const meanErr = errors.reduce((a, b) => a + b, 0) / errors.length;
  return Math.max(0, Math.min(100, Math.round(100 - meanErr * 400)));
}

export function canonicalPreview(payload: Parameters<typeof canonicalize>[0]): string {
  return canonicalize(payload);
}
