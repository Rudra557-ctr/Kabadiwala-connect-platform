'use client';

import { useEffect, useRef } from 'react';
import { useApp } from '@/lib/app-context';
import type { RankedRecycler } from '@/lib/matching';

/**
 * Recycler map.
 *
 * Distance is the single biggest factor in whether a collector actually goes
 * to a recycler, and "7.6 km" means much less to most people than seeing the
 * pin. For a low-literacy user a map is often the most readable screen in the
 * whole app.
 *
 * Leaflet is loaded dynamically and imperatively rather than through
 * react-leaflet: it touches `window` at module scope (breaking SSR), and the
 * imperative API avoids the React 19 / react-leaflet peer-version friction
 * entirely. One less thing to break at hour 40.
 *
 * Tiles come from OpenStreetMap — no API key, no billing, no rate-limit
 * surprise mid-demo.
 */
export function RecyclerMap({
  ranked,
  center,
  onSelect,
}: {
  ranked: RankedRecycler[];
  center: { lat: number; lng: number };
  onSelect: (r: RankedRecycler) => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const { t } = useApp();

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !elRef.current || mapRef.current) return;

      // Leaflet's CSS must be present or tiles stack in a broken column.
      // Injected once, at use time, so it never costs the collector app.
      const CSS_ID = 'leaflet-css';
      if (!document.getElementById(CSS_ID)) {
        const link = document.createElement('link');
        link.id = CSS_ID;
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      const map = L.map(elRef.current, {
        center: [center.lat, center.lng],
        zoom: 12,
        scrollWheelZoom: false, // would hijack page scroll on mobile
        attributionControl: true,
      });
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap',
      }).addTo(map);

      // The collector's own position.
      L.circleMarker([center.lat, center.lng], {
        radius: 8,
        color: '#1d7c50',
        fillColor: '#1d7c50',
        fillOpacity: 1,
        weight: 3,
      })
        .addTo(map)
        .bindPopup(t('onboard.whereYouWork'));

      const bounds: [number, number][] = [[center.lat, center.lng]];

      for (const r of ranked) {
        // Colour encodes the decision, not the category: green = licensed and
        // usable, grey = aggregator, red = cannot be used.
        const colour = !r.eligible
          ? '#dc2626'
          : r.recycler.tier === 'authorized_recycler'
            ? '#16a34a'
            : '#94a3b8';

        const marker = L.circleMarker([r.recycler.lat, r.recycler.lng], {
          radius: r.eligible ? 9 : 7,
          color: '#ffffff',
          weight: 2,
          fillColor: colour,
          fillOpacity: r.eligible ? 0.95 : 0.55,
        }).addTo(map);

        const reason = r.flags.includes('expired')
          ? t('recycler.expired')
          : r.flags.includes('out_of_area')
            ? t('recycler.outOfArea')
            : '';

        marker.bindPopup(
          `<div style="min-width:170px">
             <strong>${escapeHtml(r.recycler.name)}</strong><br/>
             <span style="font-size:18px;font-weight:800">₹${Math.round(r.netValue)}</span>
             <span style="opacity:.7"> · ₹${r.ratePerKg}/kg</span><br/>
             <span style="opacity:.7">${r.distanceKm.toFixed(1)} km</span>
             ${reason ? `<br/><span style="color:#dc2626;font-weight:700">${escapeHtml(reason)}</span>` : ''}
           </div>`,
        );

        if (r.eligible) marker.on('click', () => onSelect(r));
        bounds.push([r.recycler.lat, r.recycler.lng]);
      }

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
      }

      // Tiles render at the wrong size if the container was laid out after
      // init — a very common Leaflet-in-a-tab bug.
      setTimeout(() => map.invalidateSize(), 120);

      cleanup = () => {
        map.remove();
        mapRef.current = null;
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [ranked, center, onSelect, t]);

  return (
    <div>
      <div
        ref={elRef}
        className="h-80 w-full overflow-hidden rounded-2xl border"
        style={{ borderColor: 'rgb(var(--border))' }}
        role="application"
        aria-label="Map of nearby recyclers"
      />
      <ul className="muted mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
        <Legend colour="#16a34a" label={t('recycler.verified')} />
        <Legend colour="#94a3b8" label={t('recycler.aggregator')} />
        <Legend colour="#dc2626" label={t('recycler.expired')} />
      </ul>
    </div>
  );
}

function Legend({ colour, label }: { colour: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        aria-hidden
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: colour }}
      />
      {label}
    </li>
  );
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}
