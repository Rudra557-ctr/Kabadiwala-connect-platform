'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { Camera, TrendingDown, TrendingUp, Minus, ChevronRight, Wallet } from 'lucide-react';
import { clsx } from 'clsx';
import { useApp } from '@/lib/app-context';
import { LanguagePicker } from '@/components/LanguagePicker';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { Rupees, SpeakButton, SyncBadge } from '@/components/ui';
import { CountUp, PulseRing, Reveal, SkeletonRows } from '@/components/motion';
import { MATERIAL_GLYPH } from '@/components/glyphs';
import { db } from '@/lib/db';
import { MATERIALS } from '@/lib/materials';
import { computeFairBand, computeTrend } from '@/lib/pricing';
import { priceSentence } from '@/lib/speech';
import { DEMO_CITY } from '@/lib/seed';

const LANG_CHOSEN_KEY = 'kc.languageChosen';

export default function CollectorHome() {
  const { t, locale, ready, collector } = useApp();
  const [langChosen, setLangChosen] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setLangChosen(localStorage.getItem(LANG_CHOSEN_KEY) === '1');
    } catch {
      setLangChosen(false);
    }
  }, []);

  const pricePoints = useLiveQuery(() => db().pricePoints.toArray(), [], []);
  const lots = useLiveQuery(
    () => (collector ? db().lots.where('collectorId').equals(collector.id).toArray() : []),
    [collector?.id],
    [],
  );

  // Top four categories by value — the ones worth leading with on the home
  // screen. Recomputed from the same price dataset the price board reads.
  const highlights = useMemo(() => {
    if (!pricePoints?.length) return [];
    return MATERIALS.slice(0, 12)
      .map((m) => {
        const band = computeFairBand(pricePoints, m.id, DEMO_CITY.name);
        const { trend } = computeTrend(pricePoints, m.id);
        return { material: m, band, trend };
      })
      .sort((a, b) => b.band.mid - a.band.mid)
      .slice(0, 4);
  }, [pricePoints]);

  const pendingEarnings = useMemo(
    () =>
      (lots ?? [])
        .filter((l) => l.status === 'confirmed')
        .reduce((sum, l) => sum + (l.finalPrice ?? 0), 0),
    [lots],
  );

  if (langChosen === null || !ready) {
    return (
      <main className="px-4 pt-5">
        <div className="mb-5 h-8 w-48 skeleton" />
        <div className="mb-5 h-28 w-full skeleton rounded-3xl" />
        <SkeletonRows rows={4} />
      </main>
    );
  }

  if (!langChosen) {
    return (
      <LanguagePicker
        onPick={() => {
          try {
            localStorage.setItem(LANG_CHOSEN_KEY, '1');
          } catch {
            /* ignore */
          }
          setLangChosen(true);
        }}
      />
    );
  }

  return (
    <main className="px-4 pt-5">
      <header className="mb-5 flex items-start justify-between gap-3 animate-fade-up">
        <div>
          <h1 className="text-2xl display">{t('app.name')}</h1>
          <p className="muted text-sm">{DEMO_CITY.name}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <SyncBadge />
          <div className="flex items-center gap-1.5">
            <LanguageSwitcher />
            <RoleSwitcher />
          </div>
        </div>
      </header>

      {/* Primary action. Oversized on purpose — creating a lot is the only
          thing most collectors will ever do on this screen. The pulse ring
          draws the eye to it without needing a word of instruction. */}
      <Link
        href="/collector/lot/new"
        className="hero mb-5 flex w-full items-center gap-4 bg-grad-brand p-5 shadow-glow-brand
                   transition-transform duration-200 active:scale-[0.98] animate-pop-in"
      >
        <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20">
          <PulseRing className="bg-white/30" />
          <Camera size={32} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xl display leading-tight">{t('lot.title')}</span>
          <span className="block text-sm text-white/85">{t('lot.whatIsIt')}</span>
        </span>
        <ChevronRight size={26} aria-hidden className="shrink-0 opacity-80" />
      </Link>

      {pendingEarnings > 0 && (
        <Link
          href="/collector/earnings"
          className="card-interactive mb-5 flex items-center gap-4 animate-fade-up"
        >
          {/* Colour lives in the chip, not the whole card. One saturated block
              per screen — the camera action above is that block. */}
          <span
            aria-hidden
            className="chip-icon h-12 w-12 bg-amber-100 text-amber-700"
          >
            <Wallet size={24} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="muted block text-xs font-bold uppercase tracking-wider">
              {t('earnings.pending')}
            </span>
            <CountUp
              value={pendingEarnings}
              prefix="₹"
              className="text-3xl display text-amber-700"
            />
          </span>
          <ChevronRight size={22} aria-hidden className="muted shrink-0" />
        </Link>
      )}

      <section aria-labelledby="rates-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="rates-heading" className="text-base font-bold">
            {t('price.title')}
          </h2>
          <Link href="/collector/prices" className="text-sm font-semibold text-brand-700">
            {t('action.next')} →
          </Link>
        </div>

        <ul className="space-y-2">
          {highlights.map(({ material, band, trend }, i) => {
            const TrendIcon =
              trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
            const trendClass =
              trend === 'up'
                ? 'text-fair-good'
                : trend === 'down'
                  ? 'text-fair-low'
                  : 'muted';

            // What gets SPOKEN is the material name plus the price as a
            // sentence — not the on-screen string, which is abbreviated.
            const spoken = `${t(material.nameKey)}. ${priceSentence(band.mid, locale)}`;

            return (
              <li key={material.id} className="stagger" style={{ '--i': i } as React.CSSProperties}>
                <div className="card flex items-center gap-3">
                <span
                  aria-hidden
                  className={clsx(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl',
                    material.tint,
                  )}
                >
                  {MATERIAL_GLYPH[material.id]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{t(material.nameKey)}</span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <Rupees value={band.mid} />
                    <span className="muted text-xs font-semibold">{t('price.perKg')}</span>
                    <TrendIcon size={16} className={trendClass} aria-hidden />
                  </span>
                  {!band.dataBacked && (
                    // Disclosed, not hidden: this figure is the catalogue
                    // range, not observed market data.
                    <span className="muted mt-0.5 block text-[10px]">
                      {t('price.estimateOnly')}
                    </span>
                  )}
                </span>
                <SpeakButton text={spoken} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
