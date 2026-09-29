'use client';

import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';

/**
 * Animated number.
 *
 * A figure that counts up reads as *earned* rather than merely printed, and it
 * draws the eye to the one number on screen that matters. For a user who
 * cannot read the label next to it, that pull is doing real work.
 *
 * Uses requestAnimationFrame with an ease-out curve, and snaps straight to the
 * final value when the user prefers reduced motion — a moving number is
 * genuinely unpleasant for some vestibular conditions.
 */
export function CountUp({
  value,
  duration = 700,
  prefix = '',
  suffix = '',
  className,
  decimals = 0,
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const from = fromRef.current;
    const delta = value - from;

    if (reduce || delta === 0 || duration <= 0) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      // easeOutExpo — fast start, gentle settle.
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setDisplay(from + delta * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = value;
    };
  }, [value, duration]);

  const shown =
    decimals > 0
      ? display.toFixed(decimals)
      : Math.round(display).toLocaleString('en-IN');

  return (
    <span className={clsx('tnum', className)}>
      {prefix}
      {shown}
      {suffix}
    </span>
  );
}

/**
 * Reveals children with a staggered fade-up once they scroll into view.
 * Falls back to showing everything immediately if IntersectionObserver is
 * missing — content must never be hidden by a failed enhancement.
 */
export function Reveal({
  children,
  index = 0,
  className,
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
}) {
  return (
    <div className={clsx('stagger', className)} style={{ '--i': index } as React.CSSProperties}>
      {children}
    </div>
  );
}

/** Loading placeholder shaped like the content it replaces. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} aria-hidden />;
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card flex items-center gap-3">
          <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-8 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * Attention ring — a soft expanding pulse behind an element.
 * Used sparingly, on the single thing we want tapped next.
 */
export function PulseRing({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx(
        'pointer-events-none absolute inset-0 animate-pulse-ring rounded-full',
        className,
      )}
    />
  );
}
