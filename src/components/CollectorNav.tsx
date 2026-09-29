'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Camera, IndianRupee, Wallet, ShieldAlert } from 'lucide-react';
import { clsx } from 'clsx';
import { useApp } from '@/lib/app-context';

/**
 * Bottom navigation.
 *
 * Icons carry the meaning; the label is a secondary cue for readers. Labels
 * are kept because partial literacy is common — many collectors read a little
 * — but nothing here depends on reading them.
 */
export function CollectorNav() {
  const pathname = usePathname();
  const { t } = useApp();
  // Hidden until a language is chosen. Offering navigation on the first-run
  // picker lets a user skip past the one decision the whole app depends on.
  const [langChosen, setLangChosen] = useState(false);

  useEffect(() => {
    const read = () => {
      try {
        setLangChosen(localStorage.getItem('kc.languageChosen') === '1');
      } catch {
        setLangChosen(true); // storage blocked: don't trap the user
      }
    };
    read();
    // The picker writes the flag without navigating, so poll briefly to pick
    // it up rather than requiring a route change.
    const id = setInterval(read, 400);
    return () => clearInterval(id);
  }, []);

  const items = [
    { href: '/collector', icon: Home, label: t('nav.home') },
    { href: '/collector/prices', icon: IndianRupee, label: t('nav.prices') },
    { href: '/collector/lot/new', icon: Camera, label: t('nav.newLot'), primary: true },
    { href: '/collector/earnings', icon: Wallet, label: t('nav.earnings') },
    { href: '/collector/safety', icon: ShieldAlert, label: t('nav.safety') },
  ];

  if (!langChosen) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t shadow-e4 backdrop-blur-xl"
      style={{
        backgroundColor: 'rgb(var(--card) / 0.88)',
        borderColor: 'rgb(var(--border))',
        // Keeps the bar clear of the iOS home indicator / Android gesture bar.
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <ul className="mx-auto flex max-w-md items-end justify-around px-2 py-2">
        {items.map(({ href, icon: Icon, label, primary }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'flex min-h-touch min-w-touch flex-col items-center justify-center gap-1 rounded-xl px-2 py-1',
                  primary && 'relative -mt-5',
                )}
              >
                <span
                  className={clsx(
                    'inline-flex items-center justify-center rounded-full',
                    'transition-all duration-200 ease-out',
                    primary
                      ? 'h-14 w-14 bg-grad-brand text-white shadow-glow-brand active:scale-95'
                      : active
                        ? 'h-9 w-9 bg-brand-100 text-brand-700 scale-110'
                        : 'h-9 w-9 muted',
                  )}
                >
                  <Icon size={primary ? 26 : 20} aria-hidden />
                </span>
                <span
                  className={clsx(
                    'text-[10px] font-semibold leading-tight',
                    active ? 'text-brand-700' : 'muted',
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
