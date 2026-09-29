# Kabadiwala Connect — Integrated Website + Backend Plan (v1)

> Status: **v1 draft, entering design review.** Pass scores and resolved
> decisions are appended by `/plan-design-review`.

## Context

Today Kabadiwala Connect is a browser-only app. Every lot, handover and price
sits in IndexedDB on **one device**. There is no server, no accounts, and no way
for two phones to see the same transaction. That caps the product at a
single-device demo and makes "syncs when online" a claim we cannot back.

This plan turns it into **one website on one domain with one database**:

- a **public landing page** anyone can read without signing in,
- the **collector app**, **recycler portal** and **ministry dashboard** behind
  auth on the same site,
- a **Supabase backend** holding the shared data.

**The constraint that governs every decision below:** offline-first must
survive. The signed handover that verifies with no network is this project's
strongest differentiator. A naive "move the data to a server" rewrite destroys
it. So the architecture is **local-first with server sync** — the UI still reads
and writes IndexedDB, and sync moves data in the background. The server is added
*underneath*, never in front.

**Audiences:**
| Who | Enters at | Needs |
|---|---|---|
| Collector | `/app` after sign-in | Marathi, low-literacy, works with no signal |
| Recycler | `/recycler` | English, dense, business register |
| Ministry / judge | `/` then `/dashboard` | Understand the problem in 90 seconds, then see proof |

---

## What already exists (reuse, do not rebuild)

| Asset | Where | Status |
|---|---|---|
| Emerald `#0D7C55` / amber `#D9881F` tokens | `tailwind.config.ts` | Keep |
| Warm-vs-cool surface theming | `src/app/globals.css` | Keep |
| Offline store + outbox pattern | `src/lib/db.ts` | Keep, add sync |
| Signed handover (ECDSA P-256) | `src/lib/crypto.ts` | Keep unchanged |
| Pricing, matching, EPR, materials logic | `src/lib/*.ts` | Keep, becomes server-shared |
| 12 working screens | `src/app/**` | Keep, re-home under new routes |
| Hero mockups (3 directions) | `~/.gstack/projects/Kabadiwalaconnect/designs/showcase-hero-20260929/` | Feed the landing page |

**No DESIGN.md exists.** Flagged in Pass 5.

---

## 1. Route structure

```
PUBLIC (no auth)
  /                     landing — problem, product, proof
  /how-it-works         the collector's four steps
  /for-recyclers        the buy-side pitch
  /dashboard            ministry view (read-only, public by design)
  /login                role-aware sign-in

AUTHED — collector (role: collector)
  /app                  home: price board + new lot
  /app/prices           full price board
  /app/lot/new          lot builder
  /app/lot/[id]         offers, recycler match, handover QR
  /app/earnings         ledger + credit passport
  /app/safety           safety reference

AUTHED — recycler (role: recycler)
  /recycler             queue
  /recycler/lots        buying desk
  /recycler/rates       published rates
  /recycler/scan        QR verify + countersign
```

**Why `/dashboard` is public:** it holds no personal data, and a judge
should be able to open it from the landing page without an account. That is the
whole point of the ministry view.

---

## 2. Architecture

```
   Browser (one Next.js app)
   ┌──────────────────────────────────────────┐
   │  UI  ──reads/writes──►  IndexedDB (Dexie) │   ← never awaits network
   │                              │            │
   │                           outbox          │
   └──────────────────────────────┼────────────┘
                                  │ background sync
                                  ▼
                        Supabase (Postgres + RLS)
                        auth · storage · realtime
```

**Rule, restated because it is the one that gets broken:** no UI path may await a
network call. Every mutation writes locally and enqueues. Sync drains the queue.
This is what makes airplane mode work, and it is already how `db.ts` is built.

**Stack:** Next.js 15 (App Router), Supabase JS client, Dexie for the local
mirror, Tailwind. Deployed on Vercel; two environment variables.

---

## 3. Data model (Postgres, mirroring the local schema)

The eight IndexedDB tables map to Postgres with the same shape, so sync is a
field-for-field copy rather than a translation.

| Table | Key columns | RLS |
|---|---|---|
| `collectors` | pseudonymous id, language, area, reliability | own row only |
| `recyclers` | name, location, authorization no + expiry, rates, tier | public read, own write |
| `materials` | category catalogue | public read |
| `lots` | ULID, collector, category, weight, photos, status | own rows; listed lots readable by recyclers |
| `offers` | lot, recycler, rate, status, reason | lot owner + offering recycler |
| `handovers` | lot, reference, weights, gps, **both signatures** | both parties |
| `price_points` | category, location, price, source | public read |
| `ml_samples` | image ref, predicted, confirmed | own rows |

**Photos** go to Supabase Storage; the database keeps the URL and the SHA-256
hash. The hash is what the signature binds to, so compression must happen
before hashing — already true in `image.ts`.

**Server-side signature re-verification.** A Postgres function re-checks each
handover signature on insert. Without it, "tamper-evident" only holds on the
device that made the record.

---

## 4. Auth — different per role, on purpose

| Role | Method | Why |
|---|---|---|
| **Collector** | Supabase **anonymous sign-in** + device keypair, optional phone later | The PS says "avoid collecting unnecessary personal information". A collector gets a durable account with **no phone, no email, no name**. Phone OTP also costs SMS credits we do not have. |
| **Recycler** | Email + password | A registered business filing EPR returns. Email is normal and expected. |
| **Ministry** | None | Read-only aggregate view, no personal data. |

This is a design decision, not a shortcut: anonymous-by-default is the strongest
possible answer to the PS's data-minimization requirement, and it is defensible
in front of a judge who asks about privacy.

**Upgrade path:** anonymous accounts can be linked to a phone number later
without losing history, which is exactly what a collector applying for credit
would need.

---

## 5. Sync design

| Concern | Decision |
|---|---|
| Direction | Outbox → server on reconnect; server → local on pull |
| Conflict: prices, recyclers | Server wins (they are caches) |
| Conflict: handovers | **Append-only, never overwritten.** A signed handover is a fact; a later sync cannot rewrite it |
| Idempotency | Every outbox entry carries an `opId`; the server dedupes on it, so replay is always safe |
| Ordering | Monotonic sequence per device; replayed in order |
| Visible state | "3 lots waiting to send" as a count and icon — never a bare spinner |

**Why visible sync state matters:** a collector who cannot see that their
morning's work is safely stored will not trust the app enough to use it offline,
and offline is where they live.

---

## 6. Landing page (public)

Single scrolling page. Sections, each with one job:

```
1  HERO              product + one headline + one CTA
2  THE PROBLEM       three facts, not a card grid
3  HOW IT WORKS      collector's four steps, real screenshots
4  THE HANDOVER      interactive: edit a weight, watch the signature fail
5  CRITICAL MINERALS live counters from the real database
6  FOR RECYCLERS     cooler surface, business register
7  HONEST STATUS     what is real vs. assumed
8  TRY IT            live app, repo, team
```

**§4 is the page's one interactive moment.** A visitor edits the weight on a
mock receipt and watches verification fail in the browser. It makes the
technical claim testable rather than asserted.

**§7 exists on purpose.** A table of what is genuinely real (cryptography,
offline behaviour, the maths) versus what is still assumed (prices, recycler
records, EPR rates). A judge who discovers invented numbers themselves
distrusts everything; a judge who is told upfront trusts the rest.

**Visual direction:** three hero variants are built and rendered as real HTML —
see Approved Mockups. Two typefaces max, no `system-ui`. Devanagari face
required: the page quotes Marathi UI copy.

---

## 7. Build sequence

| Phase | Work | Gate |
|---|---|---|
| **1** | Supabase project, schema, RLS policies, seed | Tables exist, policies tested |
| **2** | Auth: anonymous collector, email recycler, role routing | Two roles reach their own surfaces |
| **3** | Sync: outbox drain, pull, conflict rules, idempotency | Two browsers see the same lot |
| **4** | Re-home existing screens under `/app` and `/recycler` | All 12 screens work signed-in |
| **5** | Landing page from approved hero direction | Public page live |
| **6** | Photo upload to Storage, server-side signature check | Handover verifies server-side |
| **7** | Deploy, two-phone QR test over HTTPS | Scan reconciles across devices |

**Phase 3 is the risky one.** Everything else is assembly; sync is where
correctness bugs hide.

---

## 8. Account durability (resolved: D5)

Anonymous accounts live in browser storage. Cleared storage, a lost phone, or a
new device destroys the account **and every earning with it** — which would make
the Credit Passport worthless, since its whole value is proving income over time.

**Decision: anonymous by default, recovery prompted once there is something to lose.**

| Stage | Behaviour |
|---|---|
| Sign-up | Anonymous. No phone, no email, no name. First lot in under 90 seconds |
| After first **confirmed, paid** handover | One prompt, spoken in the collector's language: add a phone number or save a recovery code |
| Dismissed | Re-prompt after the next paid handover, then stop asking. Never block the app |
| Recovery | Phone OTP, or a 12-word code shown as large digits and read aloud |

Privacy where it costs nothing; durability at the moment it starts to matter.
The upgrade links to the existing anonymous account, so no history is lost.

---

## 9. Interaction states (Pass 2 fix)

Every state describes what the user **sees**, not what the backend does.

| Surface | Loading | Empty | Error | Success | Partial / offline |
|---|---|---|---|---|---|
| Collector home | Skeleton rows shaped like price cards | **Never empty** — price board seeds on first load (D8) | Cached prices + "showing saved rates" chip | Prices with trend arrows | Cached prices, offline chip |
| Price board | Skeleton rows | Indicative catalogue range, labelled "estimate only" | Last-known prices + timestamp | Live band + sample count | Stale badge with age |
| Lot builder | Camera opening spinner | n/a | Photo failed: retry, or continue without photo | Value band + spoken total | Saves locally, "will send" chip |
| Offers on a lot | Skeleton cards | Spoken "no offers yet, recyclers will reply soon" + ranked list below | Retry inline, list stays | Offer cards, best first | Locally queued acceptance |
| Earnings ledger | Skeleton rows | Coin illustration + spoken "sell your first lot" | Cached totals, sync warning | Counting figures | Pending count visible |
| Recycler queue | Skeleton rows | "Nothing waiting — every lot verified" | Retry, cached queue | Grouped by day | Offline badge on scan |
| Ministry dashboard | Skeleton stat tiles | "No verified handovers yet" + what would populate it | Last snapshot + as-of time | Counters animate | As-of timestamp |
| Handover QR | Generating spinner | n/a | Signing failed: retry, never a silent failure | QR + reference + signed badge | **Works fully offline** |
| Sync | — | — | Failed items stay queued, count visible, manual retry | "All sent" | "3 waiting to send" with icon |

**Empty states are features.** Every one above has warmth, a primary action, and
a spoken equivalent. None says "No items found".

---

## 10. User journey (Pass 3 fix)

### Collector, first run (D8)

| Step | Does | Feels | Plan supports it with |
|---|---|---|---|
| 1 | Opens link | Suspicious. Another app wanting my details | Anonymous sign-in. Nothing asked for |
| 2 | Picks Marathi by tapping | Relief — it speaks my language | Flags + audio, no text to read first |
| 3 | Sees today's prices | **Useful before I did anything** | Price board seeded, spoken |
| 4 | Photographs a lot | Curious, slightly testing it | Instant value band, not a single number |
| 5 | Sees a low-offer warning | Surprised it took my side | Spoken warning before accepting |
| 6 | Hands over, gets a receipt | First real proof it works | Signed QR, works with no signal |
| 7 | After payment, asked to secure account | Willing — now there is money here | Recovery prompt lands after value exists, not before |

**Time horizons.** 5 seconds: it speaks my language. 5 minutes: it told me I was
being underpaid. 5 years: it can prove what I earn.

### Landing-page visitor
Curiosity → recognition of the problem → scepticism → **§4 tamper demo answers
the scepticism** → confidence → §7 honesty converts confidence into trust.

---

## 11. Design system (Pass 5 fix)

No `DESIGN.md` exists. This section is the interim contract; run
`/design-consultation` to formalise it.

| Token | Value |
|---|---|
| Brand | emerald `#0D7C55`, deep `#0A4E39` |
| Accent | amber `#D9881F` — **one accent only** |
| Collector surface | warm paper `#FAF9F6`, radius `1.125rem` |
| Business surface | cool `#F6F8FA`, radius `0.875rem` |
| Landing surface | warm paper, matching the collector side |
| Type scale | 12 / 14 / 16 / 20 / 28 / 40 / 64 |
| Spacing | 4 / 8 / 12 / 16 / 24 / 40 / 64 |
| Body minimum | 16px, contrast ≥ 4.5:1 |

**Typefaces — two maximum, never `system-ui`:** a display face for headlines
(chosen with the hero direction), a text face for body, and **Noto Sans
Devanagari** loaded for every surface that renders Marathi or Hindi.

**Landing page inherits the collector's warm surface**, not the business one —
the site argues for the collector, so it should feel like their side of the
product.

---

## 12. Responsive & accessibility (Pass 6 fix)

### Viewports — intentional per breakpoint, not "stacked"

| | 375px | 768px | 1280px+ |
|---|---|---|---|
| Hero | Headline above product image, CTA full-width | Headline over image, CTA inline | Side-by-side asymmetric |
| §2 facts | Stacked, number at 40px | Stacked, number at 56px | Stacked full-width, number at 64px (D6) |
| §3 steps | Vertical scroll, one step per card | Two up | Horizontal scroll-linked sequence |
| §4 demo | Receipt above controls, input full-width | Side-by-side | Side-by-side, receipt larger |
| §5 minerals | One counter per row | Two columns | Six across |
| App screens | Single column, bottom nav | Single column, wider gutters | Centred, max 448px — phone layout preserved |
| Recycler | Single column | Two-column stats | Two-column stats, wider rows |

### Accessibility — specified, therefore buildable

- **§4 tamper demo (D7):** a real `<label>` + number input, reachable by tab.
  Result announced through `aria-live="polite"`, debounced so it fires on commit
  rather than every keystroke.
- **Touch targets** 44px minimum everywhere; the app already enforces 48dp.
- **Contrast** ≥ 4.5:1 body, ≥ 3:1 large text. Amber on white fails at body
  size — **use `amber-700` for text, reserve `amber-500` for fills**.
- **Live counters** (§5) carry `aria-live="off"` with a static accessible
  total, so a screen reader is not read a ticking number.
- **Landmarks:** `header` / `nav` / `main` / `footer` on every page; skip link
  first in tab order.
- **Focus** visible everywhere, 2.5px outline, never `outline: none`.
- **Motion:** every animation collapses under `prefers-reduced-motion`.
- **Language:** `lang` attribute switches with locale, so screen readers use the
  right voice for Devanagari.

---

## 13. Unresolved decisions (Pass 7)

| Decision | If deferred |
|---|---|
| Which display typeface | Implementer reaches for `system-ui`, the "gave up on typography" signal |
| Recycler onboarding: self-serve or admin-approved? | Anyone registers as a licensed recycler, and the authorisation badge becomes meaningless |
| Does `/dashboard` show real or demo data before launch? | A judge sees zeros and assumes nothing works |
| Photo retention period | Storage grows unbounded; no answer for a privacy question |
| What happens to a lot with no offers after N days? | Lots accumulate forever in the recycler queue |

First two should be resolved before implementation; the rest can follow.

---

## NOT in scope

| Deferred | Why |
|---|---|
| Realtime subscriptions | Polling on reconnect is enough for the demo; realtime adds failure modes |
| Phone OTP for collectors | Costs SMS credits; anonymous auth covers the demo and is better for privacy |
| Multi-tenant recycler orgs | One facility per account is sufficient at this stage |
| Server-side ML inference | On-device TF.js stays the primary path; a server model breaks offline |
| i18n on the landing page | Judges and partners read English; the app itself stays Marathi-first |
| Dark mode on the landing page | The app has it; the landing page has one controlled viewing context |
| Analytics | No decision changes based on it before the deadline |

---

## Approved Mockups

Built as real HTML, not AI images — the winning variant's code lifts straight
into the build. Source HTML sits beside each PNG.

| Screen | Mockup | Direction | Notes |
|--------|--------|-----------|-------|
| Landing hero A | `/Users/riyanshukumar/.gstack/projects/Kabadiwalaconnect/designs/showcase-hero-20260929/variant-A.png` | Editorial, warm paper, Fraunces serif, headline-left | Calmest; problem stated plainly |
| Landing hero B | `/Users/riyanshukumar/.gstack/projects/Kabadiwalaconnect/designs/showcase-hero-20260929/variant-B.png` | Full-bleed emerald poster, Bricolage Grotesque, stat row | Loudest; stat row must not become a feature grid |
| Landing hero C | `/Users/riyanshukumar/.gstack/projects/Kabadiwalaconnect/designs/showcase-hero-20260929/variant-C.png` | Hard vertical split, Instrument Serif, product left | Most premium; product-forward |

**Direction not yet chosen** — comparison board at the URL in the review output.
Whichever wins sets the display typeface, closing unresolved decision #1.

All three pass the AI-slop blacklist: no card grids, no icons in circles, no
centred-everything, no purple gradients, no decorative blobs, no `system-ui`.

**Bug found and fixed during capture:** the phone mockup inherits text colour
from its parent, so on the dark hero (variant B) the entire app screen rendered
white-on-white and was invisible. Fixed with an explicit colour reset in
`_shared.css`. **This will recur in §4 and §6**, which both invert the surface.

---

## Implementation Tasks

Synthesised from this review. Each derives from a specific finding.

- [ ] **T1 (P1, human: ~3h / CC: ~25min)** — auth — Anonymous sign-in + recovery prompt after first paid handover
  - Surfaced by: D5 — anonymous accounts lose all history on device loss, breaking the Credit Passport
  - Files: `src/lib/auth.ts`, `src/components/RecoveryPrompt.tsx`, Supabase auth config
  - Verify: create account, record a paid handover, confirm prompt fires once and is dismissible
- [ ] **T2 (P1, human: ~2d / CC: ~2h)** — sync — Outbox drain, pull, idempotency, append-only handovers
  - Surfaced by: §5 — the phase where correctness bugs hide
  - Files: `src/lib/sync.ts`, `src/lib/db.ts`, Supabase schema + RLS
  - Verify: two browsers, same account, lot created in one appears in the other; replay causes no duplicates
- [ ] **T3 (P1, human: ~4h / CC: ~30min)** — db — Postgres schema mirroring the 8 local tables, with RLS
  - Surfaced by: §3 — sync is a field-for-field copy only if the shapes match
  - Files: `supabase/schema.sql`, `supabase/policies.sql`
  - Verify: a recycler cannot read another collector's unlisted lots
- [ ] **T4 (P1, human: ~30min / CC: ~10min)** — landing — §4 tamper demo as accessible input + live region
  - Surfaced by: D7 — the page's proof moment was keyboard-unreachable
  - Files: `src/app/(marketing)/_components/TamperDemo.tsx`
  - Verify: tab to input, change weight, screen reader announces the failure once
- [ ] **T5 (P1, human: ~2h / CC: ~20min)** — landing — §2 as stacked full-width statements
  - Surfaced by: D6 — three facts default to the AI three-column grid
  - Files: `src/app/(marketing)/_components/ProblemSection.tsx`
  - Verify: no horizontal repetition at any breakpoint
- [ ] **T6 (P1, human: ~3h / CC: ~25min)** — app — Interaction states from the §9 table
  - Surfaced by: Pass 2 scored 3/10 — no states specified anywhere
  - Files: all `src/app/**` route components
  - Verify: throttle to offline and force-empty each list; no "No items found" anywhere
- [ ] **T7 (P2, human: ~2h / CC: ~20min)** — a11y — Landmarks, skip link, focus rings, contrast fixes
  - Surfaced by: Pass 6 scored 2/10 — amber on white fails contrast at body size
  - Files: `src/app/globals.css`, `src/app/layout.tsx`
  - Verify: axe clean; keyboard-only pass through the landing page
- [ ] **T8 (P2, human: ~1h / CC: ~10min)** — db — Server-side signature re-verification on handover insert
  - Surfaced by: §3 — tamper-evidence otherwise holds only on the originating device
  - Files: `supabase/functions/verify_handover.sql`
  - Verify: insert a handover with a mutated weight; the insert is rejected
- [ ] **T9 (P2, human: ~1h / CC: ~15min)** — design — Write DESIGN.md from §11 + the chosen hero
  - Surfaced by: Pass 5 scored 4/10 — no design system is written down
  - Files: `DESIGN.md`
  - Verify: an implementer can pick type sizes without asking
- [ ] **T10 (P3, human: ~2h / CC: ~20min)** — landing — Sections 3, 5, 6, 7, 8
  - Surfaced by: §6 — specified in structure, not yet built
  - Files: `src/app/(marketing)/`
  - Verify: full page reads top to bottom at 375px with no horizontal scroll

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | issues_open | score: 4/10 → 8/10, 4 decisions, 3 mockups |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

**VERDICT:** DESIGN REVIEWED — eng review required before implementation.

**UNRESOLVED DECISIONS:**
- Display typeface — resolved by choosing a hero direction on the comparison board
- Recycler onboarding: self-serve or admin-approved
- Whether `/dashboard` shows real or demo data before launch
- Photo retention period
- What happens to a lot with no offers after N days
