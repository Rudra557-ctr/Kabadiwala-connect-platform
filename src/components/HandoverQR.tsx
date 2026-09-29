'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Loader2, ShieldCheck, WifiOff } from 'lucide-react';
import QRCode from 'qrcode';
import { ulid } from 'ulid';
import { useApp } from '@/lib/app-context';
import { Rupees, SpeakButton } from './ui';
import { db, enqueue, type Handover, type Lot } from '@/lib/db';
import { makeReference, signHandover, toQrString, type HandoverPayload } from '@/lib/crypto';
import type { RankedRecycler } from '@/lib/matching';
import { getMaterial } from '@/lib/materials';
import { priceSentence } from '@/lib/speech';

/**
 * The signed handover receipt.
 *
 * EVERYTHING on this screen happens on-device with no network call:
 *   - the reference is generated locally
 *   - the payload is signed by the device key (crypto.ts)
 *   - the QR is rendered locally
 *   - the record is written to IndexedDB and queued in the outbox
 *
 * That is the point. A scrap yard has no signal, and a handover that cannot
 * complete offline simply will not happen — the collector will fall back to
 * the informal buyer, which is the exact outcome this product exists to
 * prevent. The recycler's device verifies the signature offline too.
 */
export function HandoverQR({
  lot,
  recycler,
  onBack,
}: {
  lot: Lot;
  recycler: RankedRecycler;
  onBack: () => void;
}) {
  const { t, locale, sayText, online, refreshPending } = useApp();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const created = useRef(false);

  useEffect(() => {
    // Guard against React 19 StrictMode double-invoking this effect, which
    // would otherwise mint two handovers for one lot.
    if (created.current) return;
    created.current = true;

    (async () => {
      try {
        const ref = makeReference();

        const payloadBase: Omit<HandoverPayload, 'k'> = {
          v: 1,
          l: lot.id,
          r: ref,
          w: lot.weightKg,
          // Truncated to 16 chars: enough to bind the photo to the record,
          // short enough to keep the QR scannable on a cheap camera.
          h: lot.photoHashes.map((x) => x.slice(0, 16)),
          t: Date.now(),
          g:
            lot.lat != null && lot.lng != null
              ? [Number(lot.lat.toFixed(5)), Number(lot.lng.toFixed(5))]
              : undefined,
        };

        const { payload, signature } = await signHandover(payloadBase);
        const qrString = toQrString(payload, signature);

        const handover: Handover = {
          id: ulid(),
          lotId: lot.id,
          reference: ref,
          weightKg: lot.weightKg,
          photoHashes: payload.h,
          lat: lot.lat,
          lng: lot.lng,
          timestamp: payload.t,
          collectorSig: signature,
          collectorPubKey: payload.k,
          recyclerId: recycler.recycler.id,
          sync: 'local',
        };

        // Append-only: a handover is a signed fact, never updated in place.
        await db().handovers.put(handover);
        await db().lots.update(lot.id, {
          status: 'handed_over',
          recyclerId: recycler.recycler.id,
          quotedPrice: recycler.ratePerKg,
          updatedAt: Date.now(),
        });
        await enqueue('handover.create', { id: handover.id }, `handover.create:${handover.id}`);
        refreshPending();

        // Medium error correction: tolerates a scuffed screen in a dim yard
        // without inflating the QR version beyond what a cheap camera reads.
        const url = await QRCode.toDataURL(qrString, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 512,
        });

        setReference(ref);
        setQrDataUrl(url);
      } catch (err) {
        console.error('[kc] handover creation failed', err);
        setError(err instanceof Error ? err.message : 'Could not create handover');
      }
    })();
  }, [lot, recycler, refreshPending]);

  const material = getMaterial(lot.category);

  return (
    <main className="px-4 pt-5">
      <header className="mb-4 flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label={t('action.back')} className="tap-ghost h-11 w-11 !px-0">
          <ChevronLeft size={22} aria-hidden />
        </button>
        <h1 className="text-lg font-extrabold">{t('handover.title')}</h1>
      </header>

      {error && (
        <div className="card border-red-300 bg-red-50 text-red-900" role="alert">
          {error}
        </div>
      )}

      {!qrDataUrl && !error && (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 size={36} className="animate-spin text-brand-600" aria-hidden />
        </div>
      )}

      {qrDataUrl && reference && (
        <>
          <section className="card mb-4 text-center animate-pop-in">
            <p className="muted mb-3 text-sm font-semibold">{t('handover.showToRecycler')}</p>

            {/* White background is not decorative — QR scanners need the
                light-module contrast, so this must not follow dark mode. */}
            <div className="mx-auto w-fit rounded-2xl bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt={`Handover code ${reference}`} className="h-56 w-56" />
            </div>

            <p className="mt-4 select-all font-mono text-3xl display tracking-[0.15em]">
              {reference}
            </p>

            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1.5">
              <ShieldCheck size={15} className="text-brand-700" aria-hidden />
              <span className="text-xs font-bold text-brand-800">Signed on this device</span>
            </div>
          </section>

          <section className="card mb-4">
            <Row label={t('lot.title')} value={t(material.nameKey)} />
            <Row label={t('lot.howMuch')} value={`${lot.weightKg} ${t('lot.kg')}`} />
            <Row label={t('recycler.offers')} value={`₹${recycler.ratePerKg}/${t('lot.kg')}`} />
            <div className="mt-2 flex items-center justify-between border-t pt-2" style={{ borderColor: 'rgb(var(--border))' }}>
              <span className="text-sm font-bold">{t('earnings.total')}</span>
              <span className="flex items-center gap-2">
                <Rupees value={recycler.netValue} />
                <SpeakButton size="sm" text={priceSentence(recycler.netValue, locale, false)} />
              </span>
            </div>
          </section>

          {/* The offline claim, stated on screen. During the demo this badge is
              visible while the device is in airplane mode. */}
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-amber-50 p-3 text-amber-900">
            <WifiOff size={16} aria-hidden />
            <span className="text-xs font-semibold">
              {t('handover.worksOffline')}
              {!online && ` · ${t('sync.offline')}`}
            </span>
          </div>
        </>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="muted text-sm">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}
