'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  IndianRupee,
  Inbox as InboxIcon,
  Download,
  ScanLine,
  ShieldCheck,
  Clock,
  Scale,
  MapPin,
  Inbox,
  AlertTriangle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Chip, Rupees, SyncBadge } from '@/components/ui';
import { TrustScore } from '@/components/TrustScore';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { CountUp } from '@/components/motion';
import { MATERIAL_GLYPH } from '@/components/glyphs';
import { buildTransferRecords, toCsv, downloadFile } from '@/lib/export';
import { db, type Handover } from '@/lib/db';
import { getMaterial } from '@/lib/materials';
import { t as translate } from '@/lib/i18n';

type Tab = 'awaiting' | 'confirmed';

/**
 * Recycler hub.
 *
 * Deliberately English, not the collector's Marathi. A recycler is a
 * registered business with literate staff filing EPR returns — the
 * low-literacy constraints that shape the collector app do not apply here, and
 * forcing them to read Marathi they may not use would be worse UX, not better.
 *
 * Scanning is the primary action and sits above everything: in the yard the
 * recycler's hands are busy and a lorry is waiting. The queue below is review.
 */
export default function RecyclerHome() {
  const [tab, setTab] = useState<Tab>('awaiting');

  const handovers = useLiveQuery(() => db().handovers.toArray(), [], []);
  const lots = useLiveQuery(() => db().lots.toArray(), [], []);
  const collectors = useLiveQuery(() => db().collectors.toArray(), [], []);
  const recyclers = useLiveQuery(() => db().recyclers.toArray(), [], []);

  const scoreByCollector = useMemo(
    () => Object.fromEntries((collectors ?? []).map((c) => [c.id, c.reliabilityScore])),
    [collectors],
  );

  const lotsById = useMemo(() => Object.fromEntries((lots ?? []).map((l) => [l.id, l])), [lots]);

  const { awaiting, confirmed, todayKg, discrepancies } = useMemo(() => {
    const all = [...(handovers ?? [])].sort((a, b) => b.timestamp - a.timestamp);
    const startOfDay = new Date().setHours(0, 0, 0, 0);
    return {
      awaiting: all.filter((h) => !h.confirmedAt),
      confirmed: all.filter((h) => h.confirmedAt),
      todayKg: all
        .filter((h) => h.confirmedAt && h.confirmedAt >= startOfDay)
        .reduce((s, h) => s + (h.actualWeightKg ?? h.weightKg), 0),
      // Weight disputes are the single most common friction in a real yard.
      // Surfacing the count gives the operator something actionable.
      discrepancies: all.filter(
        (h) =>
          h.actualWeightKg != null &&
          h.weightKg > 0 &&
          Math.abs((h.actualWeightKg - h.weightKg) / h.weightKg) > 0.08,
      ).length,
    };
  }, [handovers]);

  const rows = tab === 'awaiting' ? awaiting : confirmed;

  const exportTransfers = () => {
    const recyclerMap = Object.fromEntries((recyclers ?? []).map((r) => [r.id, r]));
    const records = buildTransferRecords(confirmed, lotsById, recyclerMap);
    if (!records.length) return;
    downloadFile(
      `transfer-records-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(records),
      'text/csv;charset=utf-8',
    );
  };

  return (
    <main className="px-4 pb-12 pt-5">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">Recycler</h1>
          <p className="muted text-sm">Inbound lots and handover confirmation</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <SyncBadge />
          <RoleSwitcher />
        </div>
      </header>

      <Link
        href="/recycler/scan"
        className="hero mb-5 flex w-full items-center gap-4 bg-grad-teal p-5 shadow-e4
                   transition-transform duration-200 active:scale-[0.98] animate-pop-in"
      >
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20">
          <ScanLine size={32} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xl display leading-tight">Scan handover code</span>
          <span className="block text-sm text-white/85">
            Verify signature and countersign — works offline
          </span>
        </span>
      </Link>

      {/* Buying desk + compliance. The PS asks for rate publishing, offer
          handling and a documented transfer record; these are those. */}
      <div className="mb-5 grid grid-cols-3 gap-2">
        <Link
          href="/recycler/lots"
          className="card-interactive flex flex-col items-center gap-1.5 py-3 text-center"
        >
          <InboxIcon size={20} className="text-sky-700" aria-hidden />
          <span className="text-xs font-bold leading-tight">Open lots</span>
        </Link>
        <Link
          href="/recycler/rates"
          className="card-interactive flex flex-col items-center gap-1.5 py-3 text-center"
        >
          <IndianRupee size={20} className="text-brand-700" aria-hidden />
          <span className="text-xs font-bold leading-tight">My rates</span>
        </Link>
        <button
          type="button"
          onClick={exportTransfers}
          disabled={confirmed.length === 0}
          className="card-interactive flex flex-col items-center gap-1.5 py-3 text-center disabled:opacity-40"
        >
          <Download size={20} className="text-violet-700" aria-hidden />
          <span className="text-xs font-bold leading-tight">EPR export</span>
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Clock} label="Awaiting" value={awaiting.length} tone={awaiting.length ? 'warn' : undefined} />
        <Stat icon={ShieldCheck} label="Confirmed" value={confirmed.length} />
        <Stat icon={Scale} label="Confirmed today" value={`${todayKg.toFixed(0)} kg`} />
        <Stat
          icon={AlertTriangle}
          label="Weight disputes"
          value={discrepancies}
          tone={discrepancies ? 'warn' : undefined}
        />
      </div>

      {/* Tabs. Awaiting is default because it is the only one with work in it. */}
      <div
        role="tablist"
        aria-label="Handover queue"
        className="mb-4 flex gap-1 rounded-xl p-1"
        style={{ backgroundColor: 'rgb(var(--border) / 0.5)' }}
      >
        {(
          [
            ['awaiting', 'Awaiting', awaiting.length],
            ['confirmed', 'Confirmed', confirmed.length],
          ] as const
        ).map(([key, label, n]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={clsx(
              'flex-1 rounded-lg px-3 py-2 text-sm font-bold transition',
              tab === key ? 'bg-white text-slate-900 shadow-sm' : 'muted',
            )}
          >
            {label}
            <span className="ml-1.5 tabular-nums opacity-60">{n}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <GroupedList rows={rows} lotsById={lotsById} scoreByCollector={scoreByCollector} />
      )}
    </main>
  );
}

/** Groups by day so a busy queue stays scannable instead of a wall of rows. */
function GroupedList({
  rows,
  lotsById,
  scoreByCollector,
}: {
  rows: Handover[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lotsById: Record<string, any>;
  scoreByCollector: Record<string, number>;
}) {
  const groups = useMemo(() => {
    const out = new Map<string, Handover[]>();
    for (const h of rows) {
      const key = new Date(h.timestamp).toDateString();
      const list = out.get(key);
      if (list) list.push(h);
      else out.set(key, [h]);
    }
    return [...out.entries()];
  }, [rows]);

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86_400_000).toDateString();

  return (
    <div className="space-y-5">
      {groups.map(([day, items]) => {
        const label =
          day === today
            ? 'Today'
            : day === yesterday
              ? 'Yesterday'
              : new Date(day).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                });
        const dayKg = items.reduce((s, h) => s + (h.actualWeightKg ?? h.weightKg), 0);

        return (
          <section key={day}>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider muted">{label}</h3>
              <span className="muted text-xs tabular-nums">{dayKg.toFixed(1)} kg</span>
            </div>
            <ul className="space-y-2">
              {items.map((h) => (
                <HandoverRow
                  key={h.id}
                  h={h}
                  lot={lotsById[h.lotId]}
                  score={scoreByCollector[lotsById[h.lotId]?.collectorId]}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function HandoverRow({
  h,
  lot,
  score,
}: {
  h: Handover;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lot: any;
  /** Collector accuracy — a trust signal the recycler needs before accepting. */
  score?: number;
}) {
  const material = lot ? getMaterial(lot.category) : null;
  const weight = h.actualWeightKg ?? h.weightKg;
  const value = lot?.quotedPrice ? lot.quotedPrice * weight : null;

  const delta =
    h.actualWeightKg != null && h.weightKg > 0
      ? (h.actualWeightKg - h.weightKg) / h.weightKg
      : 0;
  const flagged = Math.abs(delta) > 0.08;

  return (
    <li className="card transition-shadow duration-200 hover:shadow-e2">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={clsx(
            'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg',
            material?.tint ?? 'bg-slate-100',
          )}
        >
          {MATERIAL_GLYPH[lot?.category as keyof typeof MATERIAL_GLYPH] ?? '📦'}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate font-bold leading-tight">
            {material ? translate('en', material.nameKey) : 'Lot'}
          </p>
          <p className="muted mt-0.5 flex items-center gap-2 font-mono text-xs tracking-wide">
            {h.reference}
            {score != null && <TrustScore score={score} compact />}
          </p>
          <p className="muted mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            <span className="tabular-nums">{weight} kg</span>
            {h.actualWeightKg != null && h.actualWeightKg !== h.weightKg && (
              <span className="tabular-nums opacity-70">declared {h.weightKg}</span>
            )}
            {h.lat != null && (
              <span className="inline-flex items-center gap-0.5">
                <MapPin size={10} aria-hidden />
                {h.lat.toFixed(3)}, {h.lng?.toFixed(3)}
              </span>
            )}
          </p>
        </div>

        <div className="shrink-0 text-right">
          {value != null && <Rupees value={value} className="!text-lg" />}
          <div className="mt-1 flex flex-col items-end gap-1">
            {h.confirmedAt ? (
              <Chip tone="good">
                <ShieldCheck size={11} aria-hidden /> Confirmed
              </Chip>
            ) : (
              <Chip tone="warn">
                <Clock size={11} aria-hidden /> Awaiting
              </Chip>
            )}
            {flagged && (
              <Chip tone="bad">
                {delta > 0 ? '+' : ''}
                {(delta * 100).toFixed(0)}% weight
              </Chip>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="card flex flex-col items-center py-12 text-center">
      <span
        aria-hidden
        className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100"
      >
        {tab === 'awaiting' ? (
          <Inbox size={26} className="text-slate-400" />
        ) : (
          <ShieldCheck size={26} className="text-slate-400" />
        )}
      </span>
      <p className="font-bold">
        {tab === 'awaiting' ? 'Nothing waiting' : 'No confirmed handovers yet'}
      </p>
      <p className="muted mt-1 max-w-xs text-sm">
        {tab === 'awaiting'
          ? 'Every delivered lot has been verified and countersigned.'
          : 'Scan a collector’s handover code to verify and countersign it.'}
      </p>
      {tab === 'confirmed' && (
        <Link href="/recycler/scan" className="tap-primary mt-4">
          <ScanLine size={18} aria-hidden />
          Scan code
        </Link>
      )}
    </div>
  );
}

const GLYPH = {
  pcb_populated: '▤',
  pcb_bare: '▢',
  cables: '〰',
  crt: '📺',
  lcd_panel: '▭',
  battery_liion: '🔋',
  battery_lead_acid: '🪫',
  motors_magnets: '⚙',
  plastics_mixed: '🧴',
  aluminium: '▨',
  ferrous: '🧲',
  ewaste_mixed: '📦',
} as const;

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock;
  label: string;
  value: number | string;
  tone?: 'warn';
}) {
  return (
    <div
      className={clsx(
        'card transition-shadow duration-200 hover:shadow-e2',
        tone === 'warn' && 'border-amber-300 bg-amber-50',
      )}
    >
      <span
        aria-hidden
        className={clsx(
          'inline-flex h-9 w-9 items-center justify-center rounded-xl',
          tone === 'warn' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500',
        )}
      >
        <Icon size={18} />
      </span>
      <p className="mt-2 text-2xl display tnum">
        {typeof value === 'number' ? <CountUp value={value} /> : value}
      </p>
      <p className="muted text-xs font-semibold leading-tight">{label}</p>
    </div>
  );
}
