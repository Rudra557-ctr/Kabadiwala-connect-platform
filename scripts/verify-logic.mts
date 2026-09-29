/**
 * Logic verification for the parts that are easy to get quietly wrong.
 *
 * Run:  npm run verify
 *
 * These are not unit tests for their own sake. Each one guards a claim we will
 * make to judges, and each guards a failure mode that would hurt a real
 * collector:
 *   - an outlier must not poison the "fair price" other people rely on
 *   - thin data must be disclosed, never silently presented as market data
 *   - the underpricing alert must not cry wolf, or people learn to ignore it
 *   - a tampered handover must fail verification
 */

import {
  rejectOutliers,
  computeFairBand,
  judgeOffer,
  anomalyScore,
  isAnomalous,
  computeTrend,
} from '../src/lib/pricing';
import type { PricePoint } from '../src/lib/db';
import { estimateCriticalMinerals, MATERIALS, CRITICAL_MINERALS } from '../src/lib/materials';
import { rankRecyclers, compareRoutes } from '../src/lib/matching';
import { missingTranslations } from '../src/lib/i18n';
import { estimateEpr, COLLECTOR_SHARE } from '../src/lib/epr';
import { seedRecyclers, seedPricePoints, DEMO_CITY } from '../src/lib/seed';

let failures = 0;
function check(label: string, pass: boolean, detail = '') {
  if (!pass) failures++;
  console.log(`${pass ? '  ok  ' : ' FAIL '} ${label}${detail ? '  ' + detail : ''}`);
}

const mk = (p: number, daysAgo = 1): PricePoint => ({
  id: Math.random().toString(36).slice(2),
  category: 'cables',
  location: 'Nagpur',
  recordedAt: Date.now() - daysAgo * 86_400_000,
  buyingPrice: p,
  unit: 'kg',
  source: 'transaction',
});

console.log('\n— price integrity —');

const clean = [300, 310, 305, 295, 315, 302];
const withTypo = [...clean, 5000];
check('₹5000 fat-finger rejected as outlier', !rejectOutliers(withTypo).includes(5000));

const bandClean = computeFairBand(clean.map((p) => mk(p)), 'cables', 'Nagpur');
const bandTypo = computeFairBand(withTypo.map((p) => mk(p)), 'cables', 'Nagpur');
const drift = Math.abs(bandTypo.mid - bandClean.mid);
check('fair band stable despite outlier', drift < 15, `drift ₹${drift}`);

const thin = computeFairBand([mk(300)], 'cables', 'Nagpur');
check('thin data disclosed (dataBacked=false)', !thin.dataBacked);

console.log('\n— offer verdicts —');

const band = { low: 280, mid: 305, high: 320, sampleSize: 20, dataBacked: true };
check('clear underpay flagged low', judgeOffer(200, band) === 'low');
check('in-band offer reads fair', judgeOffer(295, band) === 'fair');
check('at/above median reads good', judgeOffer(315, band) === 'good');
// Trust preservation: a warning that fires on a nearly-fair offer trains
// people to ignore every warning, including the one that matters.
check('no false alarm just under band low', judgeOffer(279, band) !== 'low', '₹279 vs low ₹280');

console.log('\n— anomaly detection —');

const comps = [300, 305, 310, 295, 302, 308, 299, 301];
check('normal value not anomalous', !isAnomalous(304, comps));
check('2x value flagged anomalous', isAnomalous(650, comps), `score ${anomalyScore(650, comps).toFixed(1)}`);
check('too little data → no false positive', !isAnomalous(650, [300, 305]));

console.log('\n— trend —');

const rising: PricePoint[] = [];
for (let d = 13; d >= 0; d--) for (let i = 0; i < 3; i++) rising.push(mk(250 + (13 - d) * 6, d));
check('rising series detected as up', computeTrend(rising, 'cables').trend === 'up');
const flat: PricePoint[] = [];
for (let d = 13; d >= 0; d--) for (let i = 0; i < 3; i++) flat.push(mk(300 + (i - 1), d));
check('flat series not called a trend', computeTrend(flat, 'cables').trend === 'flat');

console.log('\n— recycler matching —');

const recyclers = seedRecyclers();
const ranked = rankRecyclers(recyclers, {
  lotWeightKg: 50,
  category: 'cables',
  from: { lat: DEMO_CITY.lat, lng: DEMO_CITY.lng },
});
check('some recyclers matched', ranked.length > 0, `${ranked.length} found`);

// Must be tested on a category the EXPIRED facility actually accepts, or the
// check passes vacuously. The seed's lapsed unit takes crt/lcd/plastics only.
const crtRanked = rankRecyclers(recyclers, {
  lotWeightKg: 50,
  category: 'crt',
  from: { lat: DEMO_CITY.lat, lng: DEMO_CITY.lng },
});
const expiredShown = crtRanked.filter((r) => r.flags.includes('expired'));
check('an expired facility is actually present to test', expiredShown.length > 0, `${expiredShown.length} found`);
check(
  'expired authorization never eligible',
  expiredShown.length > 0 && expiredShown.every((r) => !r.eligible),
);
check(
  'expired facility never ranked first',
  crtRanked.length === 0 || !crtRanked[0].flags.includes('expired'),
);

const eligible = ranked.filter((r) => r.eligible);
check('top result is eligible', eligible.length === 0 || ranked[0].eligible);
check(
  'ranking respects net value over headline rate',
  eligible.length < 2 || eligible[0].netValue >= eligible[eligible.length - 1].netValue,
);

const econ = compareRoutes(recyclers, {
  lotWeightKg: 50,
  category: 'cables',
  from: { lat: DEMO_CITY.lat, lng: DEMO_CITY.lng },
});
check(
  'formal route beats nearest aggregator',
  econ.gain > 0,
  `+₹${econ.gain} (${econ.gainPct.toFixed(0)}%)`,
);

console.log('\n— EPR credit bridge —');

// The entire argument rests on this asymmetry: traceable + licensed earns
// certificate value, everything else earns nothing.
const eprFormal = estimateEpr('battery_liion', 10, {
  authorizedRecycler: true,
  traceableHandover: true,
});
const eprAgg = estimateEpr('battery_liion', 10, {
  authorizedRecycler: false,
  traceableHandover: true,
});
const eprUntraced = estimateEpr('battery_liion', 10, {
  authorizedRecycler: true,
  traceableHandover: false,
});

check('licensed + traceable earns EPR value', eprFormal.collectorBonus > 0, `₹${eprFormal.collectorBonus}`);
check('aggregator earns nothing', eprAgg.collectorBonus === 0 && eprAgg.reason === 'not_authorized');
check('untraceable handover earns nothing', eprUntraced.collectorBonus === 0 && eprUntraced.reason === 'not_traceable');
check(
  'collector share matches the stated split',
  Math.abs(eprFormal.collectorBonus - eprFormal.totalValue * COLLECTOR_SHARE) < 1,
  `${Math.round(COLLECTOR_SHARE * 100)}%`,
);
check('rate is disclosed for the UI to print', eprFormal.ratePerKg > 0, `₹${eprFormal.ratePerKg}/kg`);

console.log('\n— translations —');

// English leaking into a Marathi screen is the first thing a judge testing
// "is this really usable in Marathi?" will find.
for (const loc of ['mr', 'hi'] as const) {
  const missing = missingTranslations(loc);
  check(`${loc} dictionary complete`, missing.length === 0, missing.slice(0, 5).join(', '));
}

console.log('\n— critical minerals —');

const liion = estimateCriticalMinerals('battery_liion', 10);
check('Li-ion reports lithium', liion.some((r) => r.element === 'lithium'));
check(
  'ranges are ranges, not fake precision',
  liion.every((r) => r.gramsHigh >= r.gramsLow),
);
const tracked = new Set(MATERIALS.flatMap((m) => m.recoverable.map((r) => r.element)));
const covered = CRITICAL_MINERALS.filter((c) => tracked.has(c));
check('all 6 critical minerals appear somewhere', covered.length === 6, covered.join(', '));

const unverified = MATERIALS.flatMap((m) => m.recoverable).filter(
  (r) => r.source === 'unverified-estimate',
).length;
console.log(`\n  NOTE: ${unverified} composition figures are still 'unverified-estimate'.`);
console.log('  Cite these before quoting any number to judges (materials.ts header).');

console.log(
  failures === 0
    ? '\n✓ all logic checks passed\n'
    : `\n✗ ${failures} check(s) failed\n`,
);
process.exit(failures === 0 ? 0 : 1);
