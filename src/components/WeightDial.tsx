'use client';

import { Minus, Plus } from 'lucide-react';
import type { MaterialCategoryId } from '@/lib/materials';
import { useApp } from '@/lib/app-context';
import { SpeakButton } from './ui';

/**
 * Weight entry for low-literacy users.
 *
 * A bare <input type="number"> is a bad fit here: it demands keyboard
 * confidence, the Android numeric keyboard covers half the screen, and a
 * mistyped digit becomes a tenfold pricing error that the collector cannot
 * easily spot.
 *
 * So: large +/- steppers, a row of common preset weights, and a very large
 * readout that can be checked at a glance. Digits are used freely — numerals
 * are widely recognised even among adults who cannot read words.
 *
 * The number input remains underneath for anyone who prefers it, and it is the
 * accessible control that screen readers get.
 */
export function WeightDial({
  value,
  onChange,
  unit,
  category,
}: {
  value: number;
  onChange: (v: number) => void;
  unit: string;
  /** Drives sensible presets — see PRESETS below. */
  category?: MaterialCategoryId;
}) {
  const { locale, t } = useApp();

  const clamp = (v: number) => Math.max(0, Math.min(5000, Math.round(v * 10) / 10));
  // Step scales with magnitude: 0.5 kg precision matters for a bag of PCBs,
  // it is meaningless for a 300 kg load of CRTs.
  const step = value >= 100 ? 10 : value >= 20 ? 5 : value >= 5 ? 1 : 0.5;

  // Presets must match what this material actually comes in. Offering 100 kg
  // for lithium batteries is noise: nobody hand-collects 100 kg of cells, and
  // a wrong tap is a tenfold pricing error. Bulky material gets bulky presets.
  const presets = category ? PRESETS[category] : PRESETS.default;

  const spoken =
    locale === 'en' ? `${value} kilograms` : `${value} ${unit}`;

  return (
    <div>
      <div className="card flex items-center justify-between gap-3 py-6">
        <button
          type="button"
          aria-label="Decrease weight"
          onClick={() => onChange(clamp(value - step))}
          disabled={value <= 0}
          className="tap-ghost h-16 w-16 !px-0 text-2xl disabled:opacity-30"
        >
          <Minus size={28} aria-hidden />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-price-lg tabular-nums">{value}</span>
            <span className="muted text-xl font-bold">{unit}</span>
          </div>
        </div>

        <button
          type="button"
          aria-label="Increase weight"
          onClick={() => onChange(clamp(value + step))}
          className="tap-ghost h-16 w-16 !px-0 text-2xl"
        >
          <Plus size={28} aria-hidden />
        </button>
      </div>

      <div className="mt-3 flex items-start gap-2">
        {/* Fixed 5-column grid instead of flex-wrap: wrapping left an orphan
            button on a second row and shoved the speaker button off-centre. */}
        <div className="grid flex-1 grid-cols-5 gap-2">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className="tap-ghost h-11 !min-w-0 !px-1 text-base tabular-nums"
            >
              {p}
            </button>
          ))}
        </div>
        <SpeakButton text={spoken} />
      </div>

      {/* Accessible fallback and the path for anyone who just wants to type. */}
      <label className="mt-4 block">
        <span className="sr-only">{t('lot.howMuch')}</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          max={5000}
          step={0.1}
          value={value || ''}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          placeholder="0"
          className="w-full rounded-xl border px-4 py-3 text-center text-lg tabular-nums"
          style={{
            borderColor: 'rgb(var(--border))',
            backgroundColor: 'rgb(var(--card))',
            color: 'rgb(var(--fg))',
          }}
        />
      </label>
    </div>
  );
}

/**
 * Per-material quick weights, in kg.
 * High-value dense material (PCBs, lithium cells) arrives in small amounts;
 * bulky low-value material (CRT, plastics, ferrous) arrives by the sackful.
 */
const PRESETS: Record<MaterialCategoryId | 'default', number[]> = {
  pcb_populated: [0.5, 1, 2, 5, 10],
  pcb_bare: [0.5, 1, 2, 5, 10],
  battery_liion: [0.5, 1, 2, 3, 5],
  cables: [1, 2, 5, 10, 20],
  motors_magnets: [1, 2, 5, 10, 20],
  aluminium: [1, 5, 10, 20, 40],
  lcd_panel: [5, 10, 20, 30, 50],
  battery_lead_acid: [5, 10, 15, 25, 40],
  crt: [5, 10, 20, 40, 60],
  plastics_mixed: [5, 10, 20, 40, 60],
  ferrous: [5, 10, 25, 50, 80],
  ewaste_mixed: [5, 10, 20, 40, 60],
  default: [1, 5, 10, 25, 50],
};
