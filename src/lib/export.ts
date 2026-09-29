/**
 * Compliance export — transfer records for EPR filing.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ SCHEMA CAVEAT — READ BEFORE CLAIMING ANYTHING IN THE PITCH
 * ---------------------------------------------------------------------------
 * This is a STRUCTURED TRANSFER RECORD containing the fields the E-Waste
 * (Management) Rules, 2022 require a recycler to be able to evidence. It is
 * NOT verified against the CPCB EPR portal's import schema, and this app does
 * NOT file anything with CPCB.
 *
 * Say exactly that: "we produce a complete, verifiable transfer record and
 * export it in a mappable format; wiring it to the CPCB portal is the next
 * step." Claiming "auto-files with CPCB" would be false and trivially checked.
 *
 * The column set is deliberately versioned so it can be re-pointed at the real
 * schema without touching the rest of the app.
 * ---------------------------------------------------------------------------
 */

import type { Handover, Lot, Recycler, Collector } from './db';
import { getMaterial } from './materials';
import { estimateEpr } from './epr';

export const TRANSFER_SCHEMA_VERSION = 'kc-transfer-v1';

export interface TransferRecord {
  schema: string;
  reference: string;
  lotId: string;
  /** Pseudonymous. No name, no phone — data minimisation by design. */
  collectorId: string;
  materialCategory: string;
  materialDescription: string;
  declaredWeightKg: number;
  actualWeightKg: number | null;
  weightVariancePct: number | null;
  collectionLat: number | null;
  collectionLng: number | null;
  collectedAt: string;
  confirmedAt: string | null;
  recyclerId: string;
  recyclerName: string;
  recyclerAuthorizationNo: string;
  recyclerAuthorizationExpiry: string;
  photoHashes: string;
  collectorSignature: string;
  recyclerSignature: string;
  signatureVerifiable: 'yes' | 'unconfirmed';
  estimatedEprValueInr: number;
  transactionStatus: string;
}

export function buildTransferRecords(
  handovers: Handover[],
  lots: Record<string, Lot>,
  recyclers: Record<string, Recycler>,
  _collectors?: Record<string, Collector>,
): TransferRecord[] {
  const out: TransferRecord[] = [];

  for (const h of handovers) {
    const lot = lots[h.lotId];
    if (!lot) continue;
    const rec = h.recyclerId ? recyclers[h.recyclerId] : undefined;
    const material = getMaterial(lot.category);

    const actual = h.actualWeightKg ?? null;
    const variance =
      actual != null && h.weightKg > 0
        ? Number((((actual - h.weightKg) / h.weightKg) * 100).toFixed(2))
        : null;

    const epr = estimateEpr(lot.category, actual ?? h.weightKg, {
      authorizedRecycler: rec?.tier === 'authorized_recycler',
      traceableHandover: true,
    });

    out.push({
      schema: TRANSFER_SCHEMA_VERSION,
      reference: h.reference,
      lotId: h.lotId,
      collectorId: lot.collectorId,
      materialCategory: lot.category,
      materialDescription: material.nameKey.replace('material.', ''),
      declaredWeightKg: h.weightKg,
      actualWeightKg: actual,
      weightVariancePct: variance,
      collectionLat: h.lat ?? null,
      collectionLng: h.lng ?? null,
      collectedAt: new Date(h.timestamp).toISOString(),
      confirmedAt: h.confirmedAt ? new Date(h.confirmedAt).toISOString() : null,
      recyclerId: h.recyclerId ?? '',
      recyclerName: rec?.name ?? '',
      recyclerAuthorizationNo: rec?.authorizationNo ?? '',
      recyclerAuthorizationExpiry: rec?.authorizationExpiry
        ? new Date(rec.authorizationExpiry).toISOString().slice(0, 10)
        : '',
      photoHashes: h.photoHashes.join('|'),
      collectorSignature: h.collectorSig,
      recyclerSignature: h.recyclerSig ?? '',
      // Honest: we state that a signature is PRESENT and re-verifiable, not
      // that this export re-ran the verification.
      signatureVerifiable: h.recyclerSig ? 'yes' : 'unconfirmed',
      estimatedEprValueInr: epr.totalValue,
      transactionStatus: lot.status,
    });
  }

  return out;
}

/** RFC 4180 quoting — signatures are base64 and can contain commas. */
function csvCell(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(records: TransferRecord[]): string {
  if (!records.length) return '';
  const cols = Object.keys(records[0]) as Array<keyof TransferRecord>;
  const head = cols.join(',');
  const rows = records.map((r) => cols.map((c) => csvCell(r[c])).join(','));
  return [head, ...rows].join('\n');
}

/** Triggers a browser download. Client-only. */
export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on the next tick; revoking synchronously can cancel the download
  // in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
