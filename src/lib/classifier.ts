/**
 * On-device material classification (TF.js).
 *
 * This is the PRIMARY classification path and it runs entirely in the browser,
 * so it works with the network off. The Claude vision route (api/classify) is
 * an optional online enhancement, never a dependency.
 *
 * ---------------------------------------------------------------------------
 * HOW TO PLUG IN THE TRAINED MODEL
 * ---------------------------------------------------------------------------
 * 1. Gather images per category (target ≥30 each; more is better). Shoot them
 *    in real conditions — dim light, cluttered piles, wet ground. A model
 *    trained on clean studio shots collapses in a scrap yard.
 * 2. Train at teachablemachine.withgoogle.com (Image Project → Standard).
 *    Use EXACTLY the class names in CLASS_ORDER below, in that order.
 * 3. Export → TensorFlow.js → Download → unzip into `public/model/` so you have
 *    `public/model/model.json` and the `*.bin` weight shards.
 * 4. Reload. `loadModel()` finds it automatically. No code change needed.
 * ---------------------------------------------------------------------------
 *
 * HONESTY CONTRACT: when no model is present, this returns `null` — it does
 * NOT guess. A fabricated prediction shown to a collector as "AI says copper"
 * would be actively harmful: they could accept a wrong price because of it.
 * The UI treats null as "choose it yourself", which is a perfectly good
 * experience and an honest one.
 */

import type * as TF from '@tensorflow/tfjs';
import type { MaterialCategoryId } from './materials';

/**
 * Class order MUST match the Teachable Machine training order exactly.
 * TF.js returns a bare probability vector with no labels attached, so this
 * array is the only thing mapping index → meaning. Getting it out of order
 * silently mislabels everything.
 */
export const CLASS_ORDER: MaterialCategoryId[] = [
  'pcb_populated',
  'pcb_bare',
  'cables',
  'crt',
  'lcd_panel',
  'battery_liion',
  'battery_lead_acid',
  'motors_magnets',
  'plastics_mixed',
  'aluminium',
  'ferrous',
  'ewaste_mixed',
];

const MODEL_URL = '/model/model.json';
const INPUT_SIZE = 224; // Teachable Machine's standard image size.

export interface Prediction {
  category: MaterialCategoryId;
  confidence: number;
  /** Full distribution, for the "not right?" alternatives list. */
  all: Array<{ category: MaterialCategoryId; confidence: number }>;
  source: 'on-device';
}

export type ModelStatus =
  | { state: 'unchecked' }
  | { state: 'loading' }
  | { state: 'ready' }
  | { state: 'absent'; reason: string }
  | { state: 'error'; reason: string };

let status: ModelStatus = { state: 'unchecked' };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let model: any = null;
let loadPromise: Promise<ModelStatus> | null = null;

export function getModelStatus(): ModelStatus {
  return status;
}

/**
 * Load the model once. Safe to call repeatedly.
 * TF.js is ~1 MB gzipped, so it is imported dynamically — it must not sit in
 * the initial bundle that a collector downloads over 2G.
 */
export async function loadModel(): Promise<ModelStatus> {
  if (status.state === 'ready' || status.state === 'absent') return status;
  if (loadPromise) return loadPromise;

  status = { state: 'loading' };

  loadPromise = (async (): Promise<ModelStatus> => {
    try {
      // Check the model exists before pulling in the (large) TF.js runtime.
      const head = await fetch(MODEL_URL, { method: 'HEAD' });
      if (!head.ok) {
        status = {
          state: 'absent',
          reason: 'No trained model in /public/model. Manual category selection only.',
        };
        return status;
      }

      const tf = await import('@tensorflow/tfjs');
      // Teachable Machine exports a LayersModel.
      model = await tf.loadLayersModel(MODEL_URL);

      // Warm up with a dummy pass so the first real capture is not slow — on a
      // low-end phone the first inference can otherwise take several seconds.
      const warm = tf.zeros([1, INPUT_SIZE, INPUT_SIZE, 3]);
      const out = model.predict(warm) as { dispose: () => void };
      out.dispose();
      warm.dispose();

      status = { state: 'ready' };
      return status;
    } catch (err) {
      status = {
        state: 'error',
        reason: err instanceof Error ? err.message : 'Unknown model load failure',
      };
      return status;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/**
 * Classify a captured image.
 * Returns null when no model is available — the caller must handle that as
 * "ask the user", not as an error state.
 */
export async function classify(imgEl: HTMLImageElement): Promise<Prediction | null> {
  const s = await loadModel();
  if (s.state !== 'ready' || !model) return null;

  try {
    const tf = await import('@tensorflow/tfjs');

    // tf.tidy disposes intermediate tensors. Without it, repeated captures
    // leak GPU memory and the app dies after a dozen photos — exactly the kind
    // of bug that only shows up during a long demo.
    //
    // Only the PREPROCESSING runs inside tidy. `predict` is called outside so
    // the output tensor survives to be read, and we dispose it explicitly.
    const input = tf.tidy(() =>
      tf.browser
        .fromPixels(imgEl)
        .resizeBilinear([INPUT_SIZE, INPUT_SIZE])
        .toFloat()
        // Teachable Machine normalises to [-1, 1].
        .div(127.5)
        .sub(1)
        .expandDims(0),
    );

    const logits = model.predict(input) as TF.Tensor;
    const probs = Array.from(await logits.data()) as number[];

    input.dispose();
    logits.dispose();

    const all = probs
      .map((confidence, i) => ({ category: CLASS_ORDER[i], confidence }))
      .filter((p) => p.category !== undefined)
      .sort((a, b) => b.confidence - a.confidence);

    if (!all.length) return null;

    return {
      category: all[0].category,
      confidence: all[0].confidence,
      all: all.slice(0, 4),
      source: 'on-device',
    };
  } catch (err) {
    console.warn('[kc] classification failed', err);
    return null;
  }
}

/**
 * Confidence floor for showing a suggestion at all.
 *
 * Set deliberately high. A wrong suggestion is worse than no suggestion here:
 * a collector who trusts "AI says aluminium" on a copper lot loses real money.
 * Below this threshold we stay silent and let them choose.
 */
export const SUGGESTION_THRESHOLD = 0.6;

export function shouldShowSuggestion(p: Prediction | null): boolean {
  return !!p && p.confidence >= SUGGESTION_THRESHOLD;
}
