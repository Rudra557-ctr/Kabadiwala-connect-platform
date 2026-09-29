'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { Camera, Check, ChevronLeft, Loader2, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { ulid } from 'ulid';
import { useApp } from '@/lib/app-context';
import { SafetyAlert } from '@/components/SafetyAlert';
import { WeightDial } from '@/components/WeightDial';
import { RupeeRange, SpeakButton } from '@/components/ui';
import { MATERIAL_GLYPH } from '@/components/glyphs';
import { PulseRing } from '@/components/motion';
import { db, enqueue, type Lot } from '@/lib/db';
import { MATERIALS, getMaterial, type MaterialCategoryId } from '@/lib/materials';
import { computeFairBand, estimateLotValue } from '@/lib/pricing';
import { classify, getModelStatus, loadModel, shouldShowSuggestion, type Prediction } from '@/lib/classifier';
import { compressImage, getPosition, loadImageElement } from '@/lib/image';
import { hashPhoto } from '@/lib/crypto';
import { rangeSentence } from '@/lib/speech';
import { DEMO_CITY } from '@/lib/seed';

type Step = 'photo' | 'category' | 'weight' | 'review';

export default function NewLotPage() {
  const router = useRouter();
  const { t, locale, sayText, collector } = useApp();

  const [step, setStep] = useState<Step>('photo');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoHash, setPhotoHash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [category, setCategory] = useState<MaterialCategoryId | null>(null);
  const [weight, setWeight] = useState(0);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const pricePoints = useLiveQuery(() => db().pricePoints.toArray(), [], []);

  // Kick off model loading and a GPS fix as soon as the screen opens, so
  // neither of them is on the critical path when the user is ready to proceed.
  useEffect(() => {
    void loadModel();
    void getPosition().then(setCoords);
  }, []);

  const onCapture = useCallback(
    async (file: File) => {
      setBusy(true);
      try {
        const compressed = await compressImage(file);
        setPhoto(compressed.dataUrl);
        setPhotoHash(await hashPhoto(compressed.dataUrl));

        // Classification is best-effort. A null result is a normal outcome,
        // not a failure — the user simply picks the category themselves.
        const imgEl = await loadImageElement(compressed.dataUrl);
        const pred = await classify(imgEl);
        setPrediction(pred);
        if (shouldShowSuggestion(pred) && pred) setCategory(pred.category);

        setStep('category');
      } catch (err) {
        console.error('[kc] capture failed', err);
        // Still advance: a missing photo must not block creating a lot.
        setStep('category');
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const band = category && pricePoints ? computeFairBand(pricePoints, category, DEMO_CITY.name) : null;
  const value = band && weight > 0 ? estimateLotValue(band, weight) : null;

  const save = async () => {
    if (!category || !collector || saving) return;
    setSaving(true);
    try {
      const id = ulid();
      const now = Date.now();
      const lot: Lot = {
        id,
        collectorId: collector.id,
        category,
        photos: photo ? [photo] : [],
        photoHashes: photoHash ? [photoHash] : [],
        weightKg: weight,
        estValueLow: value?.low ?? 0,
        estValueHigh: value?.high ?? 0,
        lat: coords?.lat,
        lng: coords?.lng,
        status: 'listed',
        createdAt: now,
        updatedAt: now,
        sync: 'local',
        aiPredicted: prediction?.category,
        aiConfidence: prediction?.confidence,
      };

      await db().lots.put(lot);

      // The AI/ML training record. The prediction is stored ALONGSIDE the
      // human's final choice — that pair is the supervised signal, and the
      // recycler's confirmation at handover later writes `confirmedClass`.
      if (photoHash) {
        await db().mlSamples.put({
          id: ulid(),
          lotId: id,
          photoHash,
          predictedClass: prediction?.category,
          confidence: prediction?.confidence,
          usedInTraining: false,
          createdAt: now,
          sync: 'local',
        });
      }

      // Queued, not sent. This is what makes the whole flow work offline.
      await enqueue('lot.create', { id }, `lot.create:${id}`);

      router.push(`/collector/lot/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const modelState = getModelStatus().state;

  return (
    <main className="px-4 pt-5">
      <header className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => (step === 'photo' ? router.back() : setStep(prev(step)))}
          aria-label={t('action.back')}
          className="tap-ghost h-11 w-11 !px-0"
        >
          <ChevronLeft size={22} aria-hidden />
        </button>
        <h1 className="text-lg display">{t('lot.title')}</h1>
        <span className="muted ml-auto text-xs font-bold tnum">
          {(['photo', 'category', 'weight', 'review'] as Step[]).indexOf(step) + 1} / 4
        </span>
      </header>

      {/* Progress reads without literacy: the bar fills as you advance. */}
      <div
        className="mb-5 h-1.5 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: 'rgb(var(--border))' }}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={4}
        aria-valuenow={(['photo', 'category', 'weight', 'review'] as Step[]).indexOf(step) + 1}
      >
        <div
          className="h-full rounded-full bg-grad-brand transition-all duration-500 ease-out"
          style={{
            width: `${((['photo', 'category', 'weight', 'review'] as Step[]).indexOf(step) + 1) * 25}%`,
          }}
        />
      </div>

      {/* ---------------------------------------------------------------- */}
      {step === 'photo' && (
        <section>
          <h2 className="mb-3 text-base font-bold">{t('lot.whatIsIt')}</h2>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            // `capture` opens the rear camera directly on Android rather than a
            // file browser. Far more reliable than getUserMedia across the
            // cheap devices this app targets.
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onCapture(f);
            }}
          />

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="group flex aspect-[4/3] w-full flex-col items-center justify-center gap-4
                       rounded-3xl border-2 border-dashed border-brand-300 bg-brand-50/70
                       text-brand-800 transition-all duration-200 active:scale-[0.98]
                       hover:border-brand-400 hover:bg-brand-50 disabled:opacity-60 animate-pop-in"
          >
            <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-grad-brand text-white shadow-glow-brand">
              {!busy && <PulseRing className="bg-brand-400/40" />}
              {busy ? (
                <Loader2 size={40} className="animate-spin" aria-hidden />
              ) : (
                <Camera size={40} aria-hidden />
              )}
            </span>
            <span className="text-lg display">{t('action.takePhoto')}</span>
          </button>

          <button
            type="button"
            onClick={() => setStep('category')}
            className="muted mt-4 w-full text-center text-sm font-semibold underline"
          >
            {t('lot.notRight')}
          </button>

          {modelState === 'absent' && (
            // Shown in development so the team knows the model slot is empty.
            // Users never see a claim of AI that is not actually running.
            <p className="muted mt-4 text-center text-[11px]">
              No on-device model loaded — manual selection.
            </p>
          )}
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {step === 'category' && (
        <section>
          {photo && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={photo}
              alt=""
              className="mb-4 aspect-[4/3] w-full rounded-2xl object-cover"
            />
          )}

          {shouldShowSuggestion(prediction) && prediction && (
            <div className="card mb-4 border-brand-300 bg-brand-50">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-brand-700" aria-hidden />
                <span className="text-sm font-semibold text-brand-800">{t('lot.aiGuess')}</span>
              </div>
              <p className="mt-1 text-xl font-extrabold text-brand-900">
                {t(getMaterial(prediction.category).nameKey)}
              </p>
              <p className="muted mt-0.5 text-xs">
                {Math.round(prediction.confidence * 100)}% {t('lot.aiConfidence')}
              </p>
            </div>
          )}

          <h2 className="mb-3 text-base font-bold">{t('lot.whatIsIt')}</h2>

          {/* Icon + colour grid. Names are present but not required to choose. */}
          <ul className="grid grid-cols-3 gap-2.5">
            {MATERIALS.map((m, i) => (
              <li key={m.id} className="stagger" style={{ '--i': i } as React.CSSProperties}>
                <button
                  type="button"
                  onClick={() => {
                    setCategory(m.id);
                    setStep('weight');
                  }}
                  className={clsx(
                    'flex h-full w-full flex-col items-center gap-2 rounded-2xl border p-3 text-center',
                    'shadow-e1 transition-all duration-200 ease-out',
                    'hover:-translate-y-0.5 hover:shadow-e3 active:translate-y-0 active:scale-[0.96]',
                    category === m.id
                      ? 'border-brand-600 ring-2 ring-brand-500 ring-offset-1'
                      : 'border-transparent',
                    m.tint,
                  )}
                >
                  <span aria-hidden className="text-3xl leading-none">
                    {MATERIAL_GLYPH[m.id]}
                  </span>
                  <span className="text-[11px] font-bold leading-tight">{t(m.nameKey)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {step === 'weight' && category && (
        <section>
          {/* The safety warning fires HERE — the moment the material is known,
              while it is still in the collector's hands. Not in a help menu. */}
          <SafetyAlert category={category} autoSpeak />

          <h2 className="mb-4 mt-4 text-base font-bold">{t('lot.howMuch')}</h2>
          <WeightDial value={weight} onChange={setWeight} unit={t('lot.kg')} category={category} />

          <button
            type="button"
            disabled={weight <= 0}
            onClick={() => setStep('review')}
            className="tap-primary mt-6 w-full disabled:opacity-40"
          >
            {t('action.continue')}
          </button>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {step === 'review' && category && band && value && (
        <section>
          <div className="card mb-4 animate-pop-in">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="muted text-sm font-semibold">{t('lot.estimate')}</p>
                <RupeeRange low={value.low} high={value.high} />
                <p className="muted mt-1 text-xs">
                  {weight} {t('lot.kg')} · {t(getMaterial(category).nameKey)}
                </p>
              </div>
              <SpeakButton
                size="lg"
                text={`${t(getMaterial(category).nameKey)}. ${rangeSentence(value.low, value.high, locale)}`}
              />
            </div>

            <div className="mt-3 border-t pt-3" style={{ borderColor: 'rgb(var(--border))' }}>
              <p className="muted text-xs">
                {t('price.fairBand')}: ₹{band.low}–₹{band.high} / {t('lot.kg')}
                {!band.dataBacked && ` · ${t('price.estimateOnly')}`}
                {band.dataBacked && ` · ${t('price.observations', { n: band.sampleSize })}`}
              </p>
            </div>
          </div>

          <SafetyAlert category={category} />

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="tap-primary mt-6 w-full disabled:opacity-60"
          >
            {saving ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Check size={20} aria-hidden />}
            {t('action.confirm')}
          </button>

          <p className="muted mt-3 text-center text-xs">{t('lot.savedOffline')}</p>
        </section>
      )}
    </main>
  );
}

function prev(s: Step): Step {
  const order: Step[] = ['photo', 'category', 'weight', 'review'];
  return order[Math.max(0, order.indexOf(s) - 1)];
}

