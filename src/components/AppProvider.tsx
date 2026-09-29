'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ulid } from 'ulid';
import { AppCtx, type AppState } from '@/lib/app-context';
import { db, type Collector } from '@/lib/db';
import { DEFAULT_LOCALE, t as translate, type Locale } from '@/lib/i18n';
import { seedPricePoints, seedRecyclers } from '@/lib/seed';
import { computeReliability, seedTransactionHistory } from '@/lib/seed-transactions';
import { speak as speakRaw, stopSpeaking } from '@/lib/speech';

const LOCALE_KEY = 'kc.locale';
const COLLECTOR_KEY = 'kc.collectorId';

export function AppProvider({
  children,
  /**
   * Pin the locale for business-facing surfaces (recycler, dashboard). Those
   * users are literate staff filing EPR returns — the low-literacy constraints
   * that shape the collector app do not apply, and inheriting the collector's
   * Marathi would be worse UX, not more inclusive.
   */
  forceLocale,
}: {
  children: ReactNode;
  forceLocale?: Locale;
}) {
  const [ready, setReady] = useState(false);
  const [locale, setLocaleState] = useState<Locale>(forceLocale ?? DEFAULT_LOCALE);
  const [collector, setCollector] = useState<Collector | null>(null);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  // --- bootstrap ------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // localStorage can throw in private mode or with site data blocked, and
      // a crash here would take down the whole app before it renders.
      try {
        const saved = localStorage.getItem(LOCALE_KEY) as Locale | null;
        if (saved && !forceLocale) setLocaleState(saved);
      } catch {
        /* falls back to Marathi */
      }

      const database = db();

      // Seed reference data once. These are caches, so re-seeding on a fresh
      // device is correct; we only skip when data is already present.
      let recyclers = await database.recyclers.toArray();
      if (recyclers.length === 0) {
        recyclers = seedRecyclers();
        await database.recyclers.bulkPut(recyclers);
        await database.pricePoints.bulkPut(seedPricePoints(recyclers));
      }

      // Pseudonymous local identity. No phone, no name, no Aadhaar — the PS
      // explicitly asks us to avoid unnecessary personal data, so the default
      // profile carries nothing that could identify a person.
      let id: string | null = null;
      try {
        id = localStorage.getItem(COLLECTOR_KEY);
      } catch {
        /* ignore */
      }

      let record = id ? await database.collectors.get(id) : undefined;
      if (!record) {
        const newId = id ?? `col-${ulid()}`;
        record = {
          id: newId,
          preferredLanguage: DEFAULT_LOCALE,
          reliabilityScore: 100,
          createdAt: Date.now(),
        };
        await database.collectors.put(record);
        try {
          localStorage.setItem(COLLECTOR_KEY, newId);
        } catch {
          /* ignore */
        }
      }

      // Transaction history. Without it the earnings, recycler and Ministry
      // screens all render empty and the product reads as broken. Seeded once
      // per device; real lots the user creates simply add to it.
      //
      // Runs AFTER `ready` is signalled below would be nicer for first paint,
      // but the ledger screens need it present, so we accept ~200ms here.
      if ((await database.lots.count()) === 0) {
        const pricePoints = await database.pricePoints.toArray();
        const history = await seedTransactionHistory(record.id, recyclers, pricePoints);
        await database.lots.bulkPut(history.lots);
        await database.handovers.bulkPut(history.handovers);
        await database.mlSamples.bulkPut(history.mlSamples);
        await database.pricePoints.bulkPut(history.pricePoints);

        const score = computeReliability(history.handovers);
        await database.collectors.update(record.id, { reliabilityScore: score });
        record = { ...record, reliabilityScore: score };
      }

      if (cancelled) return;
      setCollector(record);
      setPending(await database.outbox.count());
      setReady(true);
    })().catch((err) => {
      // Never leave the user on a blank screen. Log and render anyway.
      console.error('[kc] bootstrap failed', err);
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [forceLocale]);

  // --- connectivity ---------------------------------------------------------
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  // --- service worker -------------------------------------------------------
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // NOT in development. The SW caches /_next/static/ cache-first, which is
    // right in production (hashed, immutable) but poisonous in dev, where Next
    // regenerates those chunks on every edit — you end up debugging a stale
    // bundle and concluding your code change did nothing.
    //
    // If a dev SW is already installed from an earlier session, tear it down
    // rather than just skipping registration.
    if (process.env.NODE_ENV !== 'production') {
      void navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => void r.unregister()))
        .catch(() => undefined);
      return;
    }

    // Registered after load so it never competes with first paint.
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[kc] service worker registration failed', err);
      });
    };
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  const setLocale = useCallback(
    (l: Locale) => {
      setLocaleState(l);
      try {
        localStorage.setItem(LOCALE_KEY, l);
      } catch {
        /* ignore */
      }
      document.documentElement.lang = l;
      if (collector) {
        void db().collectors.update(collector.id, { preferredLanguage: l });
      }
    },
    [collector],
  );

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );

  const say = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      void speakRaw(translate(locale, key, vars), locale);
    },
    [locale],
  );

  const sayText = useCallback(
    (text: string) => {
      void speakRaw(text, locale);
    },
    [locale],
  );

  const refreshPending = useCallback(() => {
    void db()
      .outbox.count()
      .then(setPending)
      .catch(() => undefined);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      ready,
      locale,
      setLocale,
      t,
      say,
      sayText,
      stop: stopSpeaking,
      collector,
      online,
      pending,
      refreshPending,
    }),
    [ready, locale, setLocale, t, say, sayText, collector, online, pending, refreshPending],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

