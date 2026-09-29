'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeftRight, Check, X } from 'lucide-react';
import { clsx } from 'clsx';

type Role = {
  href: string;
  title: string;
  native: string;
  desc: string;
  accent: string;
};

const ROLES: Role[] = [
  {
    href: '/collector',
    title: 'Collector',
    native: 'कबाडीवाला',
    desc: 'Photograph lots, see fair prices, sell to licensed recyclers',
    accent: 'bg-grad-brand',
  },
  {
    href: '/recycler',
    title: 'Recycler',
    native: 'रिसायकलर',
    desc: 'Buy lots, publish rates, verify handovers, file EPR records',
    accent: 'bg-grad-teal',
  },
  {
    href: '/dashboard',
    title: 'Ministry / ULB',
    native: 'शासन',
    desc: 'Formalization, traceable tonnage, critical minerals recovered',
    accent: 'bg-grad-slate',
  },
];

/**
 * Role switcher.
 *
 * Once you enter a surface there was no way back to the role picker without
 * editing the URL — which is fine for a developer and useless for anyone
 * demoing the product. During a pitch you move between collector, recycler and
 * ministry constantly, and fumbling the address bar mid-demo looks bad.
 *
 * Rendered through a portal: headers carry entrance animations, and an
 * ancestor with a transform becomes the containing block for `position:
 * fixed`, which would clip this off-screen.
 */
export function RoleSwitcher({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const currentHref =
    ROLES.find((r) => pathname.startsWith(r.href))?.href ?? '/collector';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="Switch role"
        className={clsx(
          'inline-flex min-h-touch items-center gap-1.5 border px-3 py-1.5 text-xs font-bold',
          'transition-all duration-150 active:scale-95',
          className,
        )}
        style={{
          borderColor: 'rgb(var(--border))',
          backgroundColor: 'rgb(var(--card))',
          borderRadius: 'calc(var(--radius) - 0.3rem)',
        }}
      >
        <ArrowLeftRight size={14} aria-hidden className="muted" />
        Switch
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Choose role"
            className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm sm:items-center"
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <div className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-e4 animate-slide-up sm:animate-pop-in">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="eyebrow">Kabadiwala Connect</p>
                  <h2 className="text-lg display text-slate-900">Choose role</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition active:scale-95 hover:bg-slate-100"
                >
                  <X size={20} aria-hidden />
                </button>
              </div>

              <ul className="space-y-2.5">
                {ROLES.map((r, i) => {
                  const active = r.href === currentHref;
                  return (
                    <li key={r.href} className="stagger" style={{ '--i': i } as React.CSSProperties}>
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          router.push(r.href);
                        }}
                        className={clsx(
                          'flex w-full items-start gap-3 rounded-2xl border p-4 text-left',
                          'shadow-e1 transition-all duration-200',
                          'hover:-translate-y-px hover:shadow-e3 active:translate-y-0 active:scale-[0.99]',
                          active ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white',
                        )}
                      >
                        <span
                          aria-hidden
                          className={clsx('mt-0.5 h-10 w-1.5 shrink-0 rounded-full', r.accent)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-bold text-slate-900">{r.title}</span>
                            <span className="text-sm text-slate-500">{r.native}</span>
                            {active && (
                              <Check size={15} className="ml-auto text-brand-600" aria-hidden />
                            )}
                          </span>
                          <span className="mt-0.5 block text-xs leading-snug text-slate-500">
                            {r.desc}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
