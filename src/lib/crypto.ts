/**
 * Tamper-evident handover receipts — the technical centrepiece.
 *
 * WHAT THIS BUYS US (and why it is not blockchain theatre):
 * A scrap yard usually has no signal. If a handover cannot complete offline,
 * it will not happen — the collector will just sell informally as before. So
 * both devices must be able to complete and VERIFY a transaction with the
 * network off, and reconcile later.
 *
 * Mechanism:
 *   1. Each device generates a non-extractable ECDSA P-256 keypair on first run.
 *   2. The collector signs a compact handover payload.
 *   3. The payload + signature + public key go into a QR code (~400-600 bytes,
 *      comfortably inside QR capacity).
 *   4. The recycler's device verifies the signature OFFLINE, then countersigns.
 *   5. Both sync later; the server reconciles and can re-verify independently.
 *
 * P-256 rather than Ed25519: P-256 is universally available in Web Crypto,
 * and it is also what Android Keystore supports from API 23 — which keeps the
 * door open for the Capacitor APK wrap without changing the crypto.
 *
 * TRUST BOUNDARY — be honest about this if a judge asks:
 * This proves a record was created by a specific device and has not been
 * altered since. It does NOT by itself prove the device belongs to a
 * particular person — that binding comes from account registration on the
 * server. It is tamper-evidence, not identity proof. Claiming more would be
 * overselling it.
 */

import { db, type DeviceKey } from './db';

const ALGO = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const SIGN_ALGO = { name: 'ECDSA', hash: 'SHA-256' } as const;

// --- encoding helpers -------------------------------------------------------

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export async function sha256Hex(data: ArrayBuffer | string): Promise<string> {
  const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Hash a captured photo so the signature binds to the image bytes. */
export async function hashPhoto(dataUrl: string): Promise<string> {
  const base64 = dataUrl.split(',')[1] ?? dataUrl;
  return sha256Hex(b64ToBuf(base64));
}

// --- device key management --------------------------------------------------

/**
 * Get this device's keypair, generating it on first run.
 * `extractable: false` means the private key can sign but can never be read
 * out of the browser — not by our code, not by anything.
 */
export async function getDeviceKey(): Promise<DeviceKey> {
  const existing = await db().deviceKeys.get('device');
  if (existing) return existing;

  const pair = (await crypto.subtle.generateKey(ALGO, false, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;

  // The public key must be extractable to travel in the QR code.
  const pubRaw = await crypto.subtle.exportKey('raw', pair.publicKey);

  const record: DeviceKey = {
    id: 'device',
    privateKey: pair.privateKey,
    publicKey: pair.publicKey,
    publicKeyB64: bufToB64(pubRaw),
    createdAt: Date.now(),
  };
  await db().deviceKeys.put(record);
  return record;
}

// --- handover payload -------------------------------------------------------

/**
 * Compact field names are deliberate: this has to fit in a QR code that a
 * cheap phone camera can read in a dim scrap yard. Verbose JSON pushes the QR
 * to a higher version with denser modules and the scan rate drops sharply.
 */
export interface HandoverPayload {
  v: 1;
  /** lot id (ULID) */
  l: string;
  /** human-readable reference */
  r: string;
  /** weight kg */
  w: number;
  /** photo hashes, truncated to 16 hex chars — enough to bind, short enough to fit */
  h: string[];
  /** unix ms */
  t: number;
  /** [lat, lng] to 5dp (~1m precision) */
  g?: [number, number];
  /** collector public key, base64 */
  k: string;
}

/**
 * Deterministic serialisation. Both signer and verifier MUST produce the exact
 * same bytes, so key order is fixed here rather than left to JSON.stringify's
 * insertion order. This is the classic canonicalisation bug — fixing the order
 * explicitly is cheap insurance.
 */
export function canonicalize(p: HandoverPayload): string {
  return JSON.stringify([p.v, p.l, p.r, p.w, p.h, p.t, p.g ?? null, p.k]);
}

export async function signHandover(
  payload: Omit<HandoverPayload, 'k'>,
): Promise<{ payload: HandoverPayload; signature: string }> {
  const key = await getDeviceKey();
  const full: HandoverPayload = { ...payload, k: key.publicKeyB64 };
  const bytes = new TextEncoder().encode(canonicalize(full));
  const sig = await crypto.subtle.sign(SIGN_ALGO, key.privateKey, bytes);
  return { payload: full, signature: bufToB64(sig) };
}

/**
 * Verify a handover signature. Runs entirely offline — this is the function
 * that makes the airplane-mode demo work.
 */
export async function verifyHandover(
  payload: HandoverPayload,
  signature: string,
  publicKeyB64?: string,
): Promise<boolean> {
  try {
    const rawKey = b64ToBuf(publicKeyB64 ?? payload.k);
    const pubKey = await crypto.subtle.importKey('raw', rawKey, ALGO, false, ['verify']);
    const bytes = new TextEncoder().encode(canonicalize(payload));
    return await crypto.subtle.verify(SIGN_ALGO, pubKey, b64ToBuf(signature), bytes);
  } catch {
    // A malformed key or signature is a failed verification, not a crash.
    // The recycler UI shows "signature does not match — do not accept".
    return false;
  }
}

/** Recycler countersignature over the collector's signature — chains the two. */
export async function countersign(
  payload: HandoverPayload,
  collectorSig: string,
): Promise<{ signature: string; publicKeyB64: string }> {
  const key = await getDeviceKey();
  const bytes = new TextEncoder().encode(canonicalize(payload) + '|' + collectorSig);
  const sig = await crypto.subtle.sign(SIGN_ALGO, key.privateKey, bytes);
  return { signature: bufToB64(sig), publicKeyB64: key.publicKeyB64 };
}

export async function verifyCountersign(
  payload: HandoverPayload,
  collectorSig: string,
  recyclerSig: string,
  recyclerPubKeyB64: string,
): Promise<boolean> {
  try {
    const pubKey = await crypto.subtle.importKey(
      'raw',
      b64ToBuf(recyclerPubKeyB64),
      ALGO,
      false,
      ['verify'],
    );
    const bytes = new TextEncoder().encode(canonicalize(payload) + '|' + collectorSig);
    return await crypto.subtle.verify(SIGN_ALGO, pubKey, b64ToBuf(recyclerSig), bytes);
  } catch {
    return false;
  }
}

// --- QR transport -----------------------------------------------------------

export interface QrEnvelope {
  p: HandoverPayload;
  s: string;
}

export function toQrString(payload: HandoverPayload, signature: string): string {
  return JSON.stringify({ p: payload, s: signature } satisfies QrEnvelope);
}

export function fromQrString(raw: string): QrEnvelope | null {
  try {
    const parsed = JSON.parse(raw) as QrEnvelope;
    if (parsed?.p?.v !== 1 || typeof parsed.s !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Short human-readable reference, spoken aloud and printed on the receipt.
 * Ambiguous characters (O/0, I/1) are excluded — this gets read over a phone
 * in a noisy yard, and "KC-4B7-K2M" has to survive that.
 */
export function makeReference(): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const pick = (n: number) =>
    Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  return `KC-${pick(3)}-${pick(3)}`;
}
