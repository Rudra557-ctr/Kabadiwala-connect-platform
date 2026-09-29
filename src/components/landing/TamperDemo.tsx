'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { signHandover, verifyHandover, makeReference, type HandoverPayload } from '@/lib/crypto';

/**
 * The page's one interactive proof.
 *
 * This runs the REAL signing code from src/lib/crypto.ts — the same ECDSA
 * P-256 path the app uses for an actual handover. Nothing here is simulated.
 * A visitor edits the weight and the signature genuinely stops verifying,
 * because the bytes no longer match what was signed.
 *
 * That distinction matters: a mocked demo proves nothing, and anyone who opens
 * devtools can tell the difference.
 *
 * ACCESSIBILITY (D7): the proof has to be reachable without a mouse.
 *  - a real <label> + number input, so tab-and-type works
 *  - the verdict is announced via aria-live, debounced so a screen reader is
 *    not read a new result on every keystroke
 *  - the visual state never carries meaning by colour alone; an icon and words
 *    carry it too
 */
type Status = 'init' | 'signing' | 'valid' | 'tampered' | 'unsupported';

const ORIGINAL_WEIGHT = 47.5;

export function TamperDemo() {
  const inputId = useId();
  const [status, setStatus] = useState<Status>('init');
  const [weight, setWeight] = useState(ORIGINAL_WEIGHT);
  const [reference, setReference] = useState('KC-000-000');
  const signedRef = useRef<{ payload: HandoverPayload; signature: string } | null>(null);
  // Announcement is debounced separately from the visual state so typing "9"
  // then "5" does not fire two screen-reader interruptions.
  const [announcement, setAnnouncement] = useState('');

  // Sign once on mount, with the original weight.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === 'undefined' || !window.crypto?.subtle) {
        setStatus('unsupported');
        return;
      }
      setStatus('signing');
      try {
        const ref = makeReference();
        const signed = await signHandover({
          v: 1,
          l: '01KC0LANDINGDEMO0000000000',
          r: ref,
          w: ORIGINAL_WEIGHT,
          h: ['a1b2c3d4e5f60718'],
          t: Date.now(),
          g: [21.1458, 79.0882],
        });
        if (cancelled) return;
        signedRef.current = signed;
        setReference(ref);
        setStatus('valid');
      } catch {
        if (!cancelled) setStatus('unsupported');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-verify whenever the weight changes.
  useEffect(() => {
    const signed = signedRef.current;
    if (!signed || status === 'init' || status === 'signing' || status === 'unsupported') return;

    let cancelled = false;
    const id = setTimeout(() => {
      (async () => {
        // Verify the CLAIMED payload (with the edited weight) against the
        // signature made over the original. This is exactly what the recycler's
        // phone does when it scans a QR code.
        const claimed: HandoverPayload = { ...signed.payload, w: weight };
        const ok = await verifyHandover(claimed, signed.signature);
        if (cancelled) return;
        setStatus(ok ? 'valid' : 'tampered');
        setAnnouncement(
          ok
            ? `Signature valid. Weight ${weight} kilograms matches the signed record.`
            : `Signature no longer matches. The record claims ${weight} kilograms but was signed for ${ORIGINAL_WEIGHT}. A recycler would reject this handover.`,
        );
      })();
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [weight, status]);

  const tampered = status === 'tampered';
  const busy = status === 'init' || status === 'signing';

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center">
      {/* The receipt ------------------------------------------------------ */}
      <div
        className={`rounded-2xl border-2 p-5 transition-colors duration-300 ${
          tampered ? 'border-[#C2321F] bg-[#FDF3F1]' : 'border-[#D6F5E3] bg-white'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5A5F63]">
              Handover receipt
            </p>
            <p className="mt-1 font-mono text-xl font-bold tracking-[0.1em] text-[#1A1C1E]">
              {reference}
            </p>
          </div>
          <span
            className={`grid h-11 w-11 place-items-center rounded-xl text-white ${
              tampered ? 'bg-[#C2321F]' : 'bg-[#0D7C55]'
            }`}
          >
            {busy ? (
              <Loader2 size={20} className="animate-spin" aria-hidden />
            ) : tampered ? (
              <ShieldAlert size={22} aria-hidden />
            ) : (
              <ShieldCheck size={22} aria-hidden />
            )}
          </span>
        </div>

        <dl className="mt-4 space-y-1.5 text-sm">
          <Row label="Material" value="Wire / cable" />
          <Row label="Weight" value={`${weight} kg`} emphasised={tampered} />
          <Row label="Collected at" value="21.1458, 79.0882" />
          <Row label="Photo hash" value="a1b2c3d4…" mono />
        </dl>

        <div className="mt-4 border-t border-dashed pt-3" style={{ borderColor: tampered ? '#E8C0B8' : '#D6F5E3' }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5A5F63]">
            Signature
          </p>
          <p
            className={`mt-1 break-all font-mono text-[10px] leading-relaxed ${
              tampered ? 'text-[#C2321F] line-through' : 'text-[#0A4E39]'
            }`}
          >
            {signedRef.current?.signature.slice(0, 64) ?? '—'}…
          </p>
        </div>
      </div>

      {/* The control ------------------------------------------------------ */}
      <div>
        <label htmlFor={inputId} className="block text-sm font-bold text-[#1A1C1E]">
          Change the weight on the receipt
        </label>
        <p className="mt-1 text-sm leading-relaxed text-[#5A5F63]">
          This is the oldest trick in the scrap trade: alter the number after the
          fact. Type any weight and watch what happens.
        </p>

        <div className="mt-3 flex items-center gap-3">
          <input
            id={inputId}
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            max="9999"
            value={weight}
            disabled={busy || status === 'unsupported'}
            onChange={(e) => setWeight(Number(e.target.value) || 0)}
            className="w-32 rounded-xl border-2 border-[#E2DFD6] bg-white px-3 py-2.5 text-lg font-bold tabular-nums text-[#1A1C1E] focus-visible:border-[#0D7C55]"
          />
          <span className="text-sm font-semibold text-[#5A5F63]">kg</span>
          {weight !== ORIGINAL_WEIGHT && (
            <button
              type="button"
              onClick={() => setWeight(ORIGINAL_WEIGHT)}
              className="text-sm font-bold text-[#0D7C55] underline underline-offset-2"
            >
              Reset
            </button>
          )}
        </div>

        {/* Verdict. Icon + words carry the meaning, not colour alone. */}
        <div
          className={`mt-4 flex items-start gap-2.5 rounded-xl p-3.5 ${
            tampered ? 'bg-[#FDF3F1] text-[#8A2115]' : 'bg-[#EEFBF4] text-[#0A4E39]'
          }`}
        >
          {tampered ? (
            <ShieldAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
          ) : (
            <ShieldCheck size={18} className="mt-0.5 shrink-0" aria-hidden />
          )}
          <p className="text-sm font-semibold leading-snug">
            {status === 'unsupported'
              ? 'This browser cannot run Web Crypto, so the live check is unavailable. The app verifies handovers using ECDSA P-256 signatures.'
              : busy
                ? 'Signing the receipt on this device…'
                : tampered
                  ? `Signature no longer matches. A recycler scanning this would see a red STOP and refuse the handover.`
                  : 'Signature valid. This is the original signed record.'}
          </p>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[#5A5F63]">
          Running the same ECDSA P-256 code the app uses. Nothing here is
          simulated — the signature really is being re-checked in your browser,
          with no server involved. That is why it works in a scrap yard with no
          signal.
        </p>

        {/* Announced to screen readers, invisible on screen. */}
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  emphasised,
}: {
  label: string;
  value: string;
  mono?: boolean;
  emphasised?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[#5A5F63]">{label}</dt>
      <dd
        className={`font-bold ${mono ? 'font-mono text-xs' : ''} ${
          emphasised ? 'text-[#C2321F]' : 'text-[#1A1C1E]'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
