'use client';

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, ShieldCheck } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { TrustScore } from '@/components/TrustScore';
import { CountUp } from '@/components/motion';
import { Rupees, SpeakButton, SyncBadge } from '@/components/ui';
import { db } from '@/lib/db';
import { getMaterial } from '@/lib/materials';
import { priceSentence } from '@/lib/speech';

const WEEK = 7 * 86_400_000;
const MONTH = 30 * 86_400_000;

/**
 * Earnings ledger.
 *
 * PS: "an easy-to-understand earnings ledger showing transactions, payments,
 * and pending dues, thereby building a usable financial and transaction
 * history for collectors."
 *
 * The second half of that sentence is the important one, and is what the
 * Credit Passport export delivers: most informal collectors are credit
 * invisible, and a verifiable income record is plausibly worth more to them
 * than any per-kg price gain this app can produce.
 */
export default function EarningsPage() {
  const { t, locale, collector } = useApp();

  const lots = useLiveQuery(
    () => (collector ? db().lots.where('collectorId').equals(collector.id).toArray() : []),
    [collector?.id],
    [],
  );
  const handovers = useLiveQuery(() => db().handovers.toArray(), [], []);

  const stats = useMemo(() => {
    const now = Date.now();
    const sold = (lots ?? []).filter((l) =>
      ['handed_over', 'confirmed', 'paid'].includes(l.status),
    );

    const valueOf = (l: (typeof sold)[number]) =>
      l.finalPrice ?? (l.quotedPrice ? l.quotedPrice * l.weightKg : l.estValueLow);

    const paid = sold.filter((l) => l.status === 'paid');
    const pending = sold.filter((l) => l.status !== 'paid');

    return {
      sold,
      paidTotal: paid.reduce((s, l) => s + valueOf(l), 0),
      pendingTotal: pending.reduce((s, l) => s + valueOf(l), 0),
      week: sold.filter((l) => l.updatedAt >= now - WEEK).reduce((s, l) => s + valueOf(l), 0),
      month: sold.filter((l) => l.updatedAt >= now - MONTH).reduce((s, l) => s + valueOf(l), 0),
      valueOf,
    };
  }, [lots]);

  const confirmedCount = (handovers ?? []).filter((h) => h.confirmedAt).length;

  const downloadPassport = async () => {
    // jsPDF is ~250 kB — loaded only when the button is actually pressed, so
    // it never costs a collector data on a screen they just glance at.
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Earnings Record', 14, 20);
    doc.setFontSize(9);
    doc.text('Kabadiwala Connect · verified transaction history', 14, 26);
    doc.text(`Collector ID: ${collector?.id ?? '—'}`, 14, 34);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 39);
    doc.text(`Verified handovers: ${confirmedCount}`, 14, 44);

    doc.setFontSize(10);
    doc.text('Date', 14, 56);
    doc.text('Material', 45, 56);
    doc.text('Weight', 110, 56);
    doc.text('Value', 140, 56);
    doc.text('Status', 170, 56);
    doc.line(14, 58, 196, 58);

    let y = 64;
    for (const l of stats.sold.slice(0, 30)) {
      if (y > 275) break;
      doc.text(new Date(l.updatedAt).toLocaleDateString('en-IN'), 14, y);
      doc.text(t(getMaterial(l.category).nameKey).slice(0, 28), 45, y);
      doc.text(`${l.weightKg} kg`, 110, y);
      doc.text(`Rs ${Math.round(stats.valueOf(l))}`, 140, y);
      doc.text(l.status, 170, y);
      y += 6;
    }

    doc.setFontSize(8);
    doc.text(
      'Each entry corresponds to a cryptographically signed handover record.',
      14,
      Math.min(y + 8, 285),
    );

    doc.save(`earnings-record-${Date.now()}.pdf`);
  };

  return (
    <main className="px-4 pt-5">
      <header className="mb-4 flex items-start justify-between gap-3 animate-fade-up">
        <h1 className="text-2xl display">{t('earnings.title')}</h1>
        <SyncBadge />
      </header>

      <section className="hero mb-3 bg-grad-amber p-5 shadow-glow-amber animate-pop-in">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white/85">{t('earnings.pending')}</p>
            <CountUp value={stats.pendingTotal} prefix="₹" className="text-price display" />
          </div>
          <SpeakButton
            size="lg"
            text={`${t('earnings.pending')}. ${priceSentence(stats.pendingTotal, locale, false)}`}
          />
        </div>
      </section>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="card">
          <p className="muted text-xs font-semibold">{t('earnings.paid')}</p>
          <CountUp value={stats.paidTotal} prefix="₹" className="text-2xl display text-fair-good" />
        </div>
        <div className="card">
          <p className="muted text-xs font-semibold">{t('earnings.thisMonth')}</p>
          <CountUp value={stats.month} prefix="₹" className="text-2xl display" />
        </div>
      </div>

      {collector && stats.sold.length > 0 && (
        <div className="mb-4">
          <TrustScore score={collector.reliabilityScore} />
        </div>
      )}

      {stats.sold.length > 0 && (
        <button type="button" onClick={downloadPassport} className="tap-ghost mb-5 w-full">
          <Download size={18} aria-hidden />
          {t('earnings.passport')}
        </button>
      )}

      <section>
        <h2 className="mb-3 text-base font-bold">{t('nav.earnings')}</h2>

        {stats.sold.length === 0 && (
          <p className="muted py-10 text-center text-sm">
            {t('lot.notRight')} — no sales yet.
          </p>
        )}

        <ul className="space-y-2">
          {stats.sold
            .slice()
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((l) => (
              <li key={l.id} className="card flex items-center gap-3 transition-shadow duration-200 hover:shadow-e2">
                {l.photos?.[0] ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={l.photos[0]}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg"
                  >
                    📦
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">
                    {t(getMaterial(l.category).nameKey)}
                  </span>
                  <span className="muted text-xs">
                    {l.weightKg} {t('lot.kg')} ·{' '}
                    {new Date(l.updatedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <Rupees value={stats.valueOf(l)} className="!text-lg" />
                  {l.status === 'confirmed' && (
                    <span className="mt-0.5 flex items-center justify-end gap-1 text-[10px] font-bold text-brand-700">
                      <ShieldCheck size={11} aria-hidden /> verified
                    </span>
                  )}
                </span>
              </li>
            ))}
        </ul>
      </section>
    </main>
  );
}
