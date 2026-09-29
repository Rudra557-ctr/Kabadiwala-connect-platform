/**
 * Offline-first local store (IndexedDB via Dexie).
 *
 * ARCHITECTURAL RULE: the UI reads and writes ONLY this local database, never
 * the network. Sync (sync.ts) moves data between here and Supabase in the
 * background. Nothing in the collector flow may await a network call.
 *
 * This is the inversion that makes airplane-mode work, and it only holds if it
 * is respected from the first commit — retrofitting it later is a rewrite.
 *
 * Two different consistency rules apply, deliberately:
 *   - `lots`, `pricePoints`, `recyclers` are CACHES. Server wins on conflict.
 *   - `handovers` and `outbox` are APPEND-ONLY EVENT LOGS. Never overwritten,
 *     never reordered. A handover is a signed fact about the world; it cannot
 *     be "updated" by a later sync without destroying its evidentiary value.
 */

import Dexie, { type Table } from 'dexie';
import type { MaterialCategoryId } from './materials';

export type LotStatus =
  | 'draft'
  | 'listed'
  | 'offered'
  | 'handed_over'
  | 'confirmed'
  | 'paid';

export type SyncState = 'local' | 'pending' | 'synced' | 'conflict';

export interface Lot {
  /** ULID, generated on-device. No server round-trip needed to create a lot. */
  id: string;
  collectorId: string;
  category: MaterialCategoryId;
  subCategory?: string;
  description?: string;
  /** Data URLs while offline; swapped for Supabase Storage URLs after sync. */
  photos: string[];
  /** SHA-256 of each photo, computed at capture. Binds photos to the signature. */
  photoHashes: string[];
  weightKg: number;
  condition?: string;
  sourceType?: string;
  estValueLow: number;
  estValueHigh: number;
  quotedPrice?: number;
  finalPrice?: number;
  recyclerId?: string;
  lat?: number;
  lng?: number;
  status: LotStatus;
  createdAt: number;
  updatedAt: number;
  sync: SyncState;
  /** Offline ML prediction kept alongside the human's choice — this pair IS the training signal. */
  aiPredicted?: MaterialCategoryId;
  aiConfidence?: number;
}

export interface Handover {
  id: string;
  lotId: string;
  reference: string;
  weightKg: number;
  photoHashes: string[];
  lat?: number;
  lng?: number;
  timestamp: number;
  /** Base64 ECDSA P-256 signatures. See crypto.ts. */
  collectorSig: string;
  collectorPubKey: string;
  recyclerSig?: string;
  recyclerPubKey?: string;
  recyclerId?: string;
  /** Recycler's weighbridge reading. The delta feeds the reliability score. */
  actualWeightKg?: number;
  confirmedAt?: number;
  sync: SyncState;
}

export interface PricePoint {
  id: string;
  category: MaterialCategoryId;
  location: string;
  recordedAt: number;
  buyingPrice: number;
  quotedPrice?: number;
  unit: 'kg' | 'piece';
  recyclerId?: string;
  /** 'recycler' = published rate, 'transaction' = what actually got paid. */
  source: 'recycler' | 'transaction' | 'seed';
}

export interface Recycler {
  id: string;
  name: string;
  facilityLocation: string;
  lat: number;
  lng: number;
  materialsAccepted: MaterialCategoryId[];
  authorizationNo: string;
  /** Epoch ms. Drives the expired-authorization flag a judge can spot-check. */
  authorizationExpiry: number;
  authorizationStatus: 'valid' | 'expired' | 'suspended' | 'unverified';
  contactPhone?: string;
  offeredRates: Partial<Record<MaterialCategoryId, number>>;
  pickupAvailable: boolean;
  serviceAreaKm: number;
  /** collector -> aggregator -> recycler. Modelling the middle tier matters. */
  tier: 'aggregator' | 'authorized_recycler';
}

export interface MlSample {
  id: string;
  lotId: string;
  photoHash: string;
  predictedClass?: MaterialCategoryId;
  confidence?: number;
  /** Written when a recycler confirms the real category at handover. */
  confirmedClass?: MaterialCategoryId;
  confirmedBy?: string;
  usedInTraining: boolean;
  createdAt: number;
  sync: SyncState;
}

/**
 * A recycler's response to a listed lot.
 *
 * The PS asks for "accept / counter-offer / reject". A counter is the
 * interesting case and the one real yards actually use: the published rate is
 * a starting point, and the buyer adjusts for contamination, moisture, or the
 * particular mix in front of them. Capturing the REASON makes the counter
 * legible to the collector instead of feeling arbitrary, and it feeds the
 * price dataset.
 */
export type OfferStatus = 'pending' | 'accepted' | 'countered' | 'rejected' | 'withdrawn';

export interface Offer {
  id: string;
  lotId: string;
  recyclerId: string;
  /** Rate the recycler is offering, ₹/kg. */
  ratePerKg: number;
  /** Total at that rate for the lot's declared weight. */
  totalValue: number;
  status: OfferStatus;
  /** Why the rate differs from the published one — shown to the collector. */
  reason?: string;
  /** Recycler will collect rather than the collector delivering. */
  pickupOffered: boolean;
  pickupWindow?: string;
  createdAt: number;
  respondedAt?: number;
  sync: SyncState;
}

export type OutboxOp =
  | 'lot.create'
  | 'lot.update'
  | 'handover.create'
  | 'handover.confirm'
  | 'price.report'
  | 'mlsample.create'
  | 'mlsample.confirm'
  | 'offer.create'
  | 'offer.respond'
  | 'rates.publish';

export interface OutboxEntry {
  /** Auto-increment preserves causal order on replay. */
  seq?: number;
  /** Idempotency key — the server dedupes on this, so replay is always safe. */
  opId: string;
  op: OutboxOp;
  payload: unknown;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export interface Collector {
  id: string;
  preferredLanguage: string;
  operatingArea?: string;
  /** Phone is stored locally only; never synced. Data minimisation by design. */
  phoneLocal?: string;
  reliabilityScore: number;
  createdAt: number;
}

/**
 * Device signing keys. IndexedDB can persist a non-extractable CryptoKey via
 * structured clone, so the private key is never exposed to JS at all — it can
 * be used to sign but never read out. See crypto.ts.
 */
export interface DeviceKey {
  id: 'device';
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicKeyB64: string;
  createdAt: number;
}

class KabadiwalaDB extends Dexie {
  lots!: Table<Lot, string>;
  handovers!: Table<Handover, string>;
  pricePoints!: Table<PricePoint, string>;
  recyclers!: Table<Recycler, string>;
  mlSamples!: Table<MlSample, string>;
  outbox!: Table<OutboxEntry, number>;
  collectors!: Table<Collector, string>;
  deviceKeys!: Table<DeviceKey, string>;
  offers!: Table<Offer, string>;

  constructor() {
    super('kabadiwala-connect');
    this.version(1).stores({
      lots: 'id, collectorId, category, status, createdAt, sync',
      handovers: 'id, lotId, reference, timestamp, sync',
      pricePoints: 'id, category, location, recordedAt, source',
      recyclers: 'id, authorizationStatus, tier',
      mlSamples: 'id, lotId, confirmedClass, usedInTraining, sync',
      outbox: '++seq, opId, op, createdAt',
      collectors: 'id',
      deviceKeys: 'id',
    });

    // v2 adds the offer/counter-offer flow. Dexie migrates in place; existing
    // lots and handovers are untouched.
    this.version(2).stores({
      offers: 'id, lotId, recyclerId, status, createdAt',
    });
  }
}

/**
 * Dexie touches IndexedDB at construction, which does not exist during SSR.
 * Lazy singleton keeps this import safe in server components.
 */
let _db: KabadiwalaDB | null = null;

export function db(): KabadiwalaDB {
  if (typeof window === 'undefined') {
    throw new Error('db() is client-only — call it inside a useEffect or event handler.');
  }
  if (!_db) _db = new KabadiwalaDB();
  return _db;
}

/** Queue a mutation for background sync. Every write path goes through here. */
export async function enqueue(op: OutboxOp, payload: unknown, opId: string): Promise<void> {
  await db().outbox.add({
    opId,
    op,
    payload,
    createdAt: Date.now(),
    attempts: 0,
  });
}

/** Count of unsent operations — drives the "3 lots waiting to send" indicator. */
export async function pendingCount(): Promise<number> {
  return db().outbox.count();
}
