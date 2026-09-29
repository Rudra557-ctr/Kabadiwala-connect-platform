/**
 * On-device image handling.
 *
 * Two constraints drive everything here:
 *  1. Collectors are on metered, slow connections. A 4 MB phone photo is a
 *     meaningful cost to them, so we downscale and re-encode BEFORE the photo
 *     ever enters the outbox.
 *  2. Photos are evidence. Their hash goes into the signed handover record, so
 *     compression must happen before hashing — otherwise the hash would not
 *     match the bytes we actually transmit.
 */

/** Long edge in px. Enough for a recycler to identify material, small enough to sync on 2G. */
const MAX_EDGE = 1024;
const JPEG_QUALITY = 0.72;

export interface CapturedPhoto {
  dataUrl: string;
  width: number;
  height: number;
  approxBytes: number;
}

/**
 * Downscale and re-encode a captured File to a JPEG data URL.
 * Data URLs (not blob URLs) because they survive IndexedDB round-trips and a
 * page reload — a blob URL would be dead after the app is reopened offline.
 */
export function compressImage(file: File): Promise<CapturedPhoto> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Could not read the photo'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode the photo'));
      img.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);

        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        resolve({
          dataUrl,
          width: w,
          height: h,
          // base64 is ~4/3 of the byte length.
          approxBytes: Math.round(((dataUrl.length - 'data:image/jpeg;base64,'.length) * 3) / 4),
        });
      };
      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/** Load a data URL into an <img> so TF.js can read pixels from it. */
export function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = dataUrl;
  });
}

/**
 * Best-effort GPS. Never blocks the flow — a collector in a covered market may
 * have no fix at all, and refusing to create a lot without coordinates would
 * make the app useless exactly where it is most needed.
 */
export function getPosition(timeoutMs = 6000): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    let settled = false;
    const done = (v: { lat: number; lng: number } | null) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    navigator.geolocation.getCurrentPosition(
      (pos) => done({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => done(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
    setTimeout(() => done(null), timeoutMs + 500);
  });
}
