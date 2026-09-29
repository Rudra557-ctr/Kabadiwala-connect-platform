'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Loader2,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';
import { ulid } from 'ulid';
import { useApp } from '@/lib/app-context';
import { Rupees } from '@/components/ui';
import { db, enqueue } from '@/lib/db';
import {
  countersign,
  fromQrString,
  verifyHandover,
  type HandoverPayload,
} from '@/lib/crypto';
import { getMaterial } from '@/lib/materials';

type Phase =
  | { k: 'scanning' }
  | { k: 'verifying' }
  | { k: 'invalid'; reason: string }
  | { k: 'valid'; payload: HandoverPayload; signature: string }
  | { k: 'confirmed'; reference: string };

const READER_ID = 'kc-qr-reader';

/**
 * Recycler yard scanner.
 *
 * The critical property: signature verification is a pure local computation
 * (Web Crypto over the QR contents). No server is contacted, so this works in
 * a shed with no signal — which is where scrap actually changes hands.
 *
 * A failed verification is shown as a hard, unmissable STOP. If the signature
 * does not check out, the record in front of the recycler has been altered,
 * and accepting it would put a non-compliant lot into their EPR chain.
 */
export default function RecyclerScanPage() {
  const { t, online, refreshPending } = useApp();
  const [phase, setPhase] = useState<Phase>({ k: 'scanning' });
  const [actualWeight, setActualWeight] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);
  const handledRef = useRef(false);

  const stopScanner = useCallback(async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (!s) return;
    try {
      await s.stop();
      await s.clear();
    } catch {
      /* already stopped */
    }
  }, []);

  const handleScan = useCallback(
    async (raw: string) => {
      if (handledRef.current) return;
      handledRef.current = true;
      await stopScanner();
      setPhase({ k: 'verifying' });

      const env = fromQrString(raw);
      if (!env) {
        setPhase({ k: 'invalid', reason: 'This is not a Kabadiwala handover code.' });
        return;
      }

      const ok = await verifyHandover(env.p, env.s);
      if (!ok) {
        setPhase({ k: 'invalid', reason: t('handover.signatureBad') });
        return;
      }

      setActualWeight(env.p.w);
      setPhase({ k: 'valid', payload: env.p, signature: env.s });
    },
    [stopScanner, t],
  );

  // Start the camera. html5-qrcode is imported dynamically — it touches
  // navigator.mediaDevices at module scope, which breaks SSR.
  useEffect(() => {
    if (phase.k !== 'scanning') return;
    let cancelled = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;

        const scanner = new Html5Qrcode(READER_ID, { verbose: false });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded: string) => void handleScan(decoded),
          () => {
            /* per-frame decode misses are normal; ignore */
          },
        );
      } catch (err) {
        if (cancelled) return;
        console.error('[kc] camera start failed', err);
        setPhase({
          k: 'invalid',
          reason:
            'Camera unavailable. Check permissions, and note the camera needs HTTPS or localhost.',
        });
      }
    })();

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [phase.k, handleScan, stopScanner]);

  const confirm = async () => {
    if (phase.k !== 'valid' || saving) return;
    setSaving(true);
    try {
      const { signature: recyclerSig, publicKeyB64 } = await countersign(
        phase.payload,
        phase.signature,
      );

      const existing = await db().handovers.where('lotId').equals(phase.payload.l).first();
      const now = Date.now();

      if (existing) {
        await db().handovers.update(existing.id, {
          recyclerSig,
          recyclerPubKey: publicKeyB64,
          actualWeightKg: actualWeight ?? phase.payload.w,
          confirmedAt: now,
        });
      } else {
        // The recycler's device may never have seen this lot — it arrived
        // entirely via the QR. Materialise the record from the payload alone.
        await db().handovers.put({
          id: ulid(),
          lotId: phase.payload.l,
          reference: phase.payload.r,
          weightKg: phase.payload.w,
          photoHashes: phase.payload.h,
          lat: phase.payload.g?.[0],
          lng: phase.payload.g?.[1],
          timestamp: phase.payload.t,
          collectorSig: phase.signature,
          collectorPubKey: phase.payload.k,
          recyclerSig,
          recyclerPubKey: publicKeyB64,
          actualWeightKg: actualWeight ?? phase.payload.w,
          confirmedAt: now,
          sync: 'local',
        });
      }

      await db().lots.update(phase.payload.l, { status: 'confirmed', updatedAt: now });

      await enqueue(
        'handover.confirm',
        { lotId: phase.payload.l, reference: phase.payload.r, actualWeightKg: actualWeight },
        `handover.confirm:${phase.payload.r}`,
      );
      refreshPending();

      setPhase({ k: 'confirmed', reference: phase.payload.r });
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    handledRef.current = false;
    setActualWeight(null);
    setPhase({ k: 'scanning' });
  };

  return (
    <main className="px-4 pt-5">
      <header className="mb-4 flex items-center gap-2">
        <Link href="/recycler" aria-label={t('action.back')} className="tap-ghost h-11 w-11 !px-0">
          <ChevronLeft size={22} aria-hidden />
        </Link>
        <h1 className="text-lg font-extrabold">{t('action.scanQr')}</h1>
        {!online && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
            <WifiOff size={13} aria-hidden /> offline
          </span>
        )}
      </header>

      {/* The reader element must stay mounted while scanning. */}
      <div
        id={READER_ID}
        className={phase.k === 'scanning' ? 'overflow-hidden rounded-2xl' : 'hidden'}
      />

      {phase.k === 'scanning' && (
        <p className="muted mt-4 flex items-center justify-center gap-2 text-sm">
          <ScanLine size={16} aria-hidden />
          Point at the collector&apos;s code
        </p>
      )}

      {phase.k === 'verifying' && (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 size={36} className="animate-spin text-brand-600" aria-hidden />
          <p className="muted text-sm">Checking signature…</p>
        </div>
      )}

      {phase.k === 'invalid' && (
        <div className="hero bg-[linear-gradient(145deg,#c2321f_0%,#8a2115_100%)] p-4 shadow-e4 animate-pop-in" role="alert">
          <div className="flex items-start gap-3">
            <ShieldAlert size={26} className="shrink-0" aria-hidden />
            <div>
              <p className="font-bold">{t('handover.signatureBad')}</p>
              <p className="mt-1 text-sm opacity-90">{phase.reason}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={reset}
            className="tap mt-4 w-full bg-white/20 text-white hover:bg-white/30"
          >
            {t('action.scanQr')}
          </button>
        </div>
      )}

      {phase.k === 'valid' && (
        <VerifiedPanel
          payload={phase.payload}
          actualWeight={actualWeight}
          setActualWeight={setActualWeight}
          onConfirm={confirm}
          saving={saving}
          onRescan={reset}
        />
      )}

      {phase.k === 'confirmed' && (
        <div className="hero bg-grad-brand p-6 text-center shadow-glow-brand animate-pop-in">
          <span className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-white/30" />
            <ShieldCheck size={44} aria-hidden />
          </span>
          <p className="mt-4 text-xl display">{t('handover.verified')}</p>
          <p className="mt-1 font-mono text-2xl display tracking-[0.15em]">{phase.reference}</p>
          <p className="mt-2 text-xs text-white/80">
            Countersigned{online ? ' · syncing' : ' · will sync when online'}
          </p>
          <button
            type="button"
            onClick={reset}
            className="tap mt-5 w-full bg-white/20 text-white hover:bg-white/30"
          >
            {t('action.scanQr')}
          </button>
        </div>
      )}
    </main>
  );
}

function VerifiedPanel({
  payload,
  actualWeight,
  setActualWeight,
  onConfirm,
  saving,
  onRescan,
}: {
  payload: HandoverPayload;
  actualWeight: number | null;
  setActualWeight: (v: number) => void;
  onConfirm: () => void;
  saving: boolean;
  onRescan: () => void;
}) {
  const { t } = useApp();
  const declared = payload.w;
  const actual = actualWeight ?? declared;
  const delta = actual - declared;
  const deltaPct = declared > 0 ? (delta / declared) * 100 : 0;

  return (
    <>
      <div className="hero bg-grad-brand p-4 shadow-glow-brand animate-pop-in" role="status">
        <div className="flex items-start gap-3">
          <ShieldCheck size={26} className="shrink-0" aria-hidden />
          <div>
            <p className="font-bold">{t('handover.signatureOk')}</p>
            <p className="mt-1 font-mono text-xl display tracking-[0.12em]">{payload.r}</p>
          </div>
        </div>
      </div>

      <div className="card mt-4">
        <div className="flex items-center justify-between py-1">
          <span className="muted text-sm">Declared weight</span>
          <span className="font-bold tabular-nums">{declared} kg</span>
        </div>

        {/* Weighbridge entry. The delta feeds the collector reliability score
            and is the honest basis for any dispute. */}
        <label className="mt-3 block">
          <span className="muted text-sm">Actual weight (weighbridge)</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.1}
            value={actualWeight ?? ''}
            onChange={(e) => setActualWeight(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border px-4 py-3 text-center text-lg tabular-nums"
            style={{
              borderColor: 'rgb(var(--border))',
              backgroundColor: 'rgb(var(--card))',
              color: 'rgb(var(--fg))',
            }}
          />
        </label>

        {Math.abs(deltaPct) > 5 && (
          <p className="mt-2 text-xs font-semibold text-amber-700">
            {delta > 0 ? '+' : ''}
            {delta.toFixed(1)} kg ({deltaPct.toFixed(0)}%) vs declared
          </p>
        )}

        {payload.g && (
          <p className="muted mt-3 text-xs">
            Collected at {payload.g[0].toFixed(4)}, {payload.g[1].toFixed(4)}
          </p>
        )}
        <p className="muted text-xs">
          {payload.h.length} photo hash{payload.h.length === 1 ? '' : 'es'} bound to this record
        </p>
      </div>

      <button type="button" onClick={onConfirm} disabled={saving} className="tap-primary mt-4 w-full disabled:opacity-60">
        {saving ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <ShieldCheck size={20} aria-hidden />}
        {t('action.confirm')}
      </button>
      <button type="button" onClick={onRescan} className="tap-ghost mt-2 w-full">
        {t('action.cancel')}
      </button>
    </>
  );
}
