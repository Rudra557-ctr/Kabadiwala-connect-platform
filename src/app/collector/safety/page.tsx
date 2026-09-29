'use client';

import { useApp } from '@/lib/app-context';
import { SafetyAlert } from '@/components/SafetyAlert';
import { MATERIALS } from '@/lib/materials';
import { MATERIAL_GLYPH } from '@/components/glyphs';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

/**
 * Safety reference.
 *
 * This page exists because the PS asks for it, but it is deliberately NOT the
 * primary safety surface — the contextual warning in the Lot Builder is, since
 * it fires while the material is in the collector's hands. A reference page
 * that a busy person must remember to open changes very little behaviour on
 * its own.
 *
 * Ordered by hazard so the things that can kill you are at the top.
 */
export default function SafetyPage() {
  const { t } = useApp();

  const ordered = [...MATERIALS].sort((a, b) => {
    const rank = { high: 0, caution: 1, none: 2 } as const;
    return rank[a.safety.level] - rank[b.safety.level];
  });

  return (
    <main className="px-4 pt-5">
      <header className="mb-4 flex items-start justify-between gap-3 animate-fade-up">
        <h1 className="text-2xl display">{t('safety.title')}</h1>
        <LanguageSwitcher />
      </header>

      <ul className="space-y-3">
        {ordered.map((m, i) => (
          <li key={m.id} className="stagger" style={{ '--i': i } as React.CSSProperties}>
            <p className="mb-1.5 flex items-center gap-2 text-sm font-bold">
              <span aria-hidden className="text-lg">
                {MATERIAL_GLYPH[m.id]}
              </span>
              {t(m.nameKey)}
            </p>
            <SafetyAlert category={m.id} />
          </li>
        ))}
      </ul>
    </main>
  );
}
