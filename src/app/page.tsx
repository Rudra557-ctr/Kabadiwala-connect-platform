import Link from 'next/link';
import { ArrowRight, ShieldCheck, Recycle, Landmark, Camera } from 'lucide-react';
import { AppPhone } from '@/components/landing/AppPhone';
import { TamperDemo } from '@/components/landing/TamperDemo';
import { CRITICAL_MINERALS, ELEMENT_LABELS } from '@/lib/materials';

/**
 * Public landing page.
 *
 * Direction C from the design review: hard vertical split, product on the left,
 * Instrument Serif headline. Built from the approved mockup at
 * ~/.gstack/projects/Kabadiwalaconnect/designs/showcase-hero-20260929/
 *
 * Structure follows WEBSITE-PLAN.md §6. Each section has exactly one job.
 */
export default function LandingPage() {
  // lang="en" on the container: the root <html> is lang="mr" for the app, but
  // this page is English. Without it a screen reader reads English prose with a
  // Marathi voice, and the Devanagari face bleeds onto Latin text.
  return (
    <div className="site" lang="en" data-surface="collector">
      <a href="#main" className="skip">
        Skip to content
      </a>

      <SiteHeader />

      <main id="main">
        <Hero />
        <Problem />
        <HowItWorks />
        <Handover />
        <Minerals />
        <ForRecyclers />
        <HonestStatus />
      </main>

      <SiteFooter />
    </div>
  );
}

/* ------------------------------------------------------------------ header */

function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-20 px-6 py-6 md:px-10">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 font-bold tracking-tight text-white">
          <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-white/20 text-sm">
            ♻
          </span>
          Kabadiwala Connect
        </span>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------- hero */

function Hero() {
  return (
    <section className="grid min-h-[100svh] lg:grid-cols-[0.92fr_1.08fr]">
      {/* Product panel. Dark — every light child sets its own colour. */}
      <div className="relative grid place-items-center overflow-hidden bg-gradient-to-b from-[#0A4E39] to-[#0D7C55] px-6 py-24 lg:py-0">
        <div
          aria-hidden
          className="absolute inset-0 opacity-100"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,.08) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        />
        <AppPhone className="relative z-10" />
      </div>

      {/* Argument panel */}
      <div className="flex flex-col justify-center px-6 py-16 md:px-12 lg:px-16 lg:py-0">
        <p className="mb-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.19em] text-[#9E4E15]">
          SIH 2026 · PS 26229
          <span aria-hidden className="h-px flex-1 bg-[#E2DFD6]" />
        </p>

        <h1 className="max-w-[16ch] text-[clamp(2.4rem,5.2vw,4rem)] leading-[1.04]">
          India&apos;s e-waste is collected by people the system{' '}
          <em className="not-italic text-[#0D7C55] [font-style:italic]">cannot see.</em>
        </h1>

        <p className="mt-6 max-w-[44ch] text-lg leading-relaxed text-[#5A5F63]">
          Kabadiwala Connect makes the formal recycling route the better-paying
          one — a fair price spoken in Marathi, and a handover receipt that two
          phones can verify with no signal.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/collector"
            className="inline-flex min-h-[3rem] items-center gap-2 rounded-xl bg-[#1A1C1E] px-6 font-bold text-white transition hover:bg-[#000] active:scale-[0.98]"
          >
            Open the live app
            <ArrowRight size={17} aria-hidden />
          </Link>
          <a
            href="#handover"
            className="inline-flex min-h-[3rem] items-center rounded-xl border-[1.5px] border-[#E2DFD6] px-5 font-semibold text-[#1A1C1E] transition hover:bg-black/[0.03]"
          >
            How the receipt works
          </a>
        </div>

        <p className="mt-10 max-w-[40ch] border-t border-[#E2DFD6] pt-5 text-sm leading-relaxed text-[#5A5F63]">
          Built for a ₹6,000 Android phone with no network. Marathi first, Hindi
          and English after.
        </p>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- problem */

/**
 * Three facts as STACKED FULL-WIDTH statements (design review D6).
 *
 * Not a three-column grid. Three things side by side with an icon above each
 * is the single most recognisable AI-generated layout, and it turns an argument
 * into a feature list. Stacked, each fact gets the full width and a number at
 * display size, so it reads as a case being made.
 */
function Problem() {
  const facts = [
    {
      stat: 'Most',
      unit: 'of India’s e-waste',
      line: 'moves through informal collectors — who sit entirely outside the EPR framework the 2022 Rules created.',
    },
    {
      stat: '6',
      unit: 'critical minerals',
      line: 'lithium, cobalt, neodymium, tantalum, gallium and indium — destroyed by open burning and acid leaching.',
    },
    {
      stat: '₹0',
      unit: 'of certificate value',
      line: 'reaches the collector today, because material with no traceable origin cannot be counted toward anyone’s obligation.',
    },
  ];

  return (
    <section className="bg-[#FAF9F6] px-6 py-24 md:px-12 lg:px-16" aria-labelledby="problem-h">
      <h2 id="problem-h" className="sr-only">
        The problem
      </h2>
      <ul className="mx-auto max-w-5xl">
        {facts.map((f, i) => (
          <li
            key={f.stat}
            className={`grid gap-4 py-10 md:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] md:gap-10 ${
              i > 0 ? 'border-t border-[#E2DFD6]' : ''
            }`}
          >
            <p className="display-face text-[clamp(2.8rem,7vw,4rem)] leading-none text-[#0D7C55]">
              {f.stat}
            </p>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#9E4E15]">
                {f.unit}
              </p>
              <p className="mt-2 max-w-[52ch] text-xl leading-relaxed text-[#1A1C1E]">{f.line}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------ how it works */

function HowItWorks() {
  const steps = [
    { n: '01', t: 'Photograph the lot', d: 'Category suggested on-device. Weight by dial or voice. No typing required.' },
    { n: '02', t: 'See the fair price', d: 'A range, not a fake-precise number — and a spoken warning if the offer is below the district band.' },
    { n: '03', t: 'Pick a licensed recycler', d: 'Ranked by what actually reaches the collector after transport. Expired authorisations are excluded.' },
    { n: '04', t: 'Hand over, signed', d: 'A receipt both phones verify with no network. Photos, weight, time and GPS bound to one signature.' },
  ];

  return (
    <section className="bg-white px-6 py-24 md:px-12 lg:px-16" aria-labelledby="how-h">
      <div className="mx-auto max-w-5xl">
        <h2 id="how-h" className="max-w-[18ch] text-[clamp(2rem,3.6vw,2.9rem)] leading-tight">
          What a collector actually does
        </h2>
        <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-[#E2DFD6] md:grid-cols-2">
          {steps.map((s) => (
            <li key={s.n} className="bg-white p-7">
              <p className="display-face text-2xl text-[#9E4E15]">{s.n}</p>
              <h3 className="mt-2 text-lg font-bold text-[#1A1C1E]">{s.t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[#5A5F63]">{s.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- handover */

function Handover() {
  return (
    <section
      id="handover"
      className="bg-[#FAF9F6] px-6 py-24 md:px-12 lg:px-16"
      aria-labelledby="handover-h"
    >
      <div className="mx-auto max-w-5xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.19em] text-[#9E4E15]">
          Try it yourself
        </p>
        <h2
          id="handover-h"
          className="mt-3 max-w-[20ch] text-[clamp(2rem,3.6vw,2.9rem)] leading-tight"
        >
          A receipt that cannot be quietly edited
        </h2>
        <p className="mt-4 max-w-[56ch] text-lg leading-relaxed text-[#5A5F63]">
          Scrap yards rarely have signal, so a handover has to complete offline or
          it does not happen at all. Both phones sign the record, and either one
          can check it without a server.
        </p>

        <div className="mt-12">
          <TamperDemo />
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- minerals */

function Minerals() {
  return (
    <section
      className="relative overflow-hidden bg-gradient-to-br from-[#0A4E39] to-[#093F30] px-6 py-24 text-white md:px-12 lg:px-16"
      aria-labelledby="min-h"
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />
      <div className="relative mx-auto max-w-5xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.19em] text-[#EBBF6A]">
          Ministry of Mines · JNARDDC
        </p>
        <h2 id="min-h" className="mt-3 max-w-[20ch] text-[clamp(2rem,3.6vw,2.9rem)] leading-tight">
          The minerals that burning destroys
        </h2>
        <p className="mt-4 max-w-[56ch] text-lg leading-relaxed text-white/80">
          Every traceable handover is material that reached a licensed recycler
          instead of an open fire. The dashboard reports estimated recoverable
          content by district.
        </p>

        <ul className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/15 md:grid-cols-3 lg:grid-cols-6">
          {CRITICAL_MINERALS.map((m) => (
            <li key={m} className="bg-[#0A4E39] p-5 text-center">
              <p className="display-face text-xl text-[#EBBF6A]">{ELEMENT_LABELS[m]}</p>
            </li>
          ))}
        </ul>

        <Link
          href="/dashboard"
          className="mt-10 inline-flex min-h-[3rem] items-center gap-2 rounded-xl bg-white px-6 font-bold text-[#0A4E39] transition hover:bg-white/90 active:scale-[0.98]"
        >
          <Landmark size={17} aria-hidden />
          Open the ministry dashboard
        </Link>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- for recyclers */

function ForRecyclers() {
  return (
    <section
      data-surface="business"
      className="bg-[#F6F8FA] px-6 py-24 md:px-12 lg:px-16"
      aria-labelledby="rec-h"
    >
      <div className="mx-auto max-w-5xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.19em] text-[#505E74]">
          For licensed recyclers
        </p>
        <h2 id="rec-h" className="mt-3 max-w-[22ch] text-[clamp(2rem,3.6vw,2.9rem)] leading-tight">
          Documented supply, and the paperwork that goes with it
        </h2>

        <dl className="mt-10 grid gap-8 md:grid-cols-3">
          {[
            ['Publish your rates', 'What you set here is what collectors see on their price board.'],
            ['Buy from the queue', 'Accept, counter with a reason, or reject. Weight disputes surfaced automatically.'],
            ['Export transfer records', 'Reference, weights, GPS, authorisation number and both signatures, ready for EPR filing.'],
          ].map(([t, d]) => (
            <div key={t}>
              <dt className="text-base font-bold text-[#1C2028]">{t}</dt>
              <dd className="mt-1.5 text-[15px] leading-relaxed text-[#505E74]">{d}</dd>
            </div>
          ))}
        </dl>

        <Link
          href="/recycler"
          className="mt-10 inline-flex min-h-[3rem] items-center gap-2 rounded-xl bg-[#1C2028] px-6 font-bold text-white transition hover:bg-black active:scale-[0.98]"
        >
          <Recycle size={17} aria-hidden />
          Open the recycler portal
        </Link>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- honest status */

/**
 * Deliberate and unusual: state plainly which numbers are real and which are
 * placeholders. A judge who discovers invented data themselves distrusts
 * everything on the page; one who is told upfront trusts the rest.
 */
function HonestStatus() {
  const rows: [string, 'real' | 'assumed', string][] = [
    ['Handover signatures', 'real', 'Genuine ECDSA P-256. Tamper rejection verified.'],
    ['Offline behaviour', 'real', 'Full core loop works with no network.'],
    ['Pricing & anomaly maths', 'real', 'Outlier rejection and robust z-scores, tested.'],
    ['Material prices', 'assumed', 'Placeholder figures pending field research.'],
    ['Recycler records', 'assumed', 'Synthetic names and authorisation numbers.'],
    ['EPR certificate rates', 'assumed', 'Modelling assumption, stated on screen.'],
    ['Mineral content', 'assumed', 'Order-of-magnitude estimates, pending citation.'],
  ];

  return (
    <section className="bg-white px-6 py-24 md:px-12 lg:px-16" aria-labelledby="status-h">
      <div className="mx-auto max-w-4xl">
        <h2 id="status-h" className="max-w-[20ch] text-[clamp(2rem,3.6vw,2.9rem)] leading-tight">
          What is real, and what is still a placeholder
        </h2>
        <p className="mt-4 max-w-[56ch] text-lg leading-relaxed text-[#5A5F63]">
          The machine is real. Some of the fuel is not yet. Field research with
          working collectors replaces the assumed figures below.
        </p>

        <ul className="mt-10 divide-y divide-[#E2DFD6] border-y border-[#E2DFD6]">
          {rows.map(([what, kind, note]) => (
            <li key={what} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-4">
              <span className="w-56 font-bold text-[#1A1C1E]">{what}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  kind === 'real' ? 'bg-[#D6F5E3] text-[#0A4E39]' : 'bg-[#F9EDD0] text-[#9E4E15]'
                }`}
              >
                {kind === 'real' ? 'Real' : 'Assumed'}
              </span>
              <span className="min-w-[14rem] flex-1 text-[15px] text-[#5A5F63]">{note}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ footer */

function SiteFooter() {
  return (
    <footer className="bg-[#1A1C1E] px-6 py-16 text-white md:px-12 lg:px-16">
      <div className="mx-auto flex max-w-5xl flex-wrap items-start justify-between gap-8">
        <div>
          <span className="inline-flex items-center gap-2 font-bold">
            <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-white/15 text-sm">
              ♻
            </span>
            Kabadiwala Connect
          </span>
          <p className="mt-3 max-w-[40ch] text-sm leading-relaxed text-white/60">
            Smart India Hackathon 2026 · Problem Statement 26229 · Ministry of
            Mines, JNARDDC.
          </p>
        </div>

        <nav aria-label="Product surfaces" className="flex flex-wrap gap-6 text-sm font-semibold">
          <Link href="/collector" className="inline-flex items-center gap-1.5 hover:text-[#EBBF6A]">
            <Camera size={15} aria-hidden /> Collector app
          </Link>
          <Link href="/recycler" className="inline-flex items-center gap-1.5 hover:text-[#EBBF6A]">
            <Recycle size={15} aria-hidden /> Recycler portal
          </Link>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 hover:text-[#EBBF6A]">
            <Landmark size={15} aria-hidden /> Ministry dashboard
          </Link>
        </nav>
      </div>

      <p className="mx-auto mt-12 flex max-w-5xl items-center gap-2 border-t border-white/10 pt-6 text-xs text-white/45">
        <ShieldCheck size={14} aria-hidden />
        Handover receipts are signed on-device and verify offline.
      </p>
    </footer>
  );
}
