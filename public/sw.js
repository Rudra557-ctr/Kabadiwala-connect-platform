/**
 * Service worker — hand-written rather than generated.
 *
 * Why not next-pwa/Serwist: a build plugin is another moving part that can
 * break at hour 40, and the caching policy here is small enough to read in one
 * screen. When the entire demo hinges on offline behaviour, being able to
 * reason about the exact cache rules is worth more than the convenience.
 *
 * Strategy:
 *   - App shell + static assets: cache-first (instant, works offline).
 *   - Next.js build assets (/_next/static): cache-first, immutable by hash.
 *   - Navigations: network-first with a cache fallback, so a fresh deploy is
 *     picked up when online but the app still opens with no signal.
 *   - API/Supabase calls: never cached. Sync owns that; a stale cached price
 *     masquerading as live would be worse than showing nothing.
 */

const VERSION = 'kc-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const STATIC_CACHE = `${VERSION}-static`;

// Kept deliberately small. Every route is reachable from these.
const SHELL_ASSETS = ['/', '/collector', '/recycler', '/dashboard', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // addAll is atomic: one 404 fails the whole install. Add individually so
      // a single missing route cannot leave the user with no service worker.
      await Promise.all(
        SHELL_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/safety/') ||
    url.pathname.startsWith('/audio/') ||
    url.pathname.startsWith('/model/')
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never cache cross-origin API traffic (Supabase, Anthropic). Let it fail
  // honestly when offline — the outbox in the app handles retry.
  if (url.origin !== self.location.origin) return;

  // Never cache our own API routes.
  if (url.pathname.startsWith('/api/')) return;

  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, res.clone());
          }
          return res;
        } catch {
          return new Response('', { status: 504, statusText: 'Offline' });
        }
      })(),
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res.ok) {
            const cache = await caches.open(SHELL_CACHE);
            cache.put(request, res.clone());
          }
          return res;
        } catch {
          // Offline: serve this route if we have it, else the collector shell.
          const cached = await caches.match(request);
          if (cached) return cached;
          const shell =
            (await caches.match('/collector')) || (await caches.match('/'));
          if (shell) return shell;
          return new Response(
            '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
              '<body style="font-family:system-ui;padding:2rem">' +
              '<h1>No network</h1><p>Open the app once while connected to install it.</p>',
            { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
          );
        }
      })(),
    );
  }
});

// Lets the page trigger an immediate update instead of waiting for a reload.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
