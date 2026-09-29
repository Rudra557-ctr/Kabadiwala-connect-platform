# Kabadiwala Connect

**SIH 2026 · PS 26229 · Ministry of Mines (JNARDDC) · Clean & Green Technology**

Bringing the informal e-waste collector into the formal recycling chain — with a fair price, a safe
handover, and a record that proves it happened.

An installable, offline-first PWA in Marathi, Hindi and English.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

No Supabase or API keys are needed to run the demo — everything seeds locally into IndexedDB.

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run verify` | **Logic checks** — pricing, anomaly detection, matching, minerals |

### Routes

| Route | Who it's for |
|---|---|
| `/collector` | The PWA — mobile-first, the primary surface |
| `/recycler` · `/recycler/scan` | Yard: verify and countersign handovers |
| `/dashboard` | Ministry / ULB: critical minerals and formalization |

> **Camera and QR scanning need HTTPS or `localhost`.** Testing on a phone over LAN IP will
> silently fail to open the camera. Deploy to Vercel (free HTTPS) and test there.

---

## What is built

**Core loop — end to end, works offline:**
lot capture → category → weight → fair-price band → ranked recyclers → **signed handover QR** →
recycler scans, verifies offline, countersigns → ledger updates.

- **Offline-first** — every write goes to IndexedDB + an outbox. No UI path awaits the network.
- **Signed handovers** — ECDSA P-256 via Web Crypto. Verified *offline* on the recycler's device.
  Verified round-trip, including tamper rejection: `npm run verify`.
- **Fair Price Index** — rolling median with IQR outlier rejection; red/amber/green verdict.
- **Recycler ranking** — by **net value after transport**, not headline rate. Expired
  authorizations are hard-excluded.
- **Live unit economics** — authorized recycler vs nearest aggregator, computed per lot.
- **Contextual safety** — spoken warning fires the moment a material is identified.
- **Critical minerals dashboard** — estimated lithium/cobalt/neodymium/tantalum/gallium/indium
  diverted from backyard processing.
- **Credit Passport** — signed earnings history as PDF.
- **Marathi default**, Hindi, English, with TTS and an explicit fallback chain.

---

## ⚠️ Before you show this to judges

These are known, deliberate gaps. Each is cheap to close and expensive to be caught on.

1. **Recycler data is synthetic.** `src/lib/seed.ts` uses fictional names ("Authorized Unit A") and
   **fake authorization numbers**. This is intentional — inventing registrations for real firms
   would misrepresent them. **Replace with the real MPCB/CPCB authorized recycler list**, and say
   on the slide which records are real.

2. **Composition figures are uncited estimates.** 20 ranges in `src/lib/materials.ts` are marked
   `'unverified-estimate'`. `npm run verify` prints the count. Cite them or do not quote them. A
   Ministry of Mines panel will know these numbers better than we do.

3. **No trained ML model yet.** `public/model/` is empty, so classification is disabled and the app
   asks the user to pick — honestly, with no fake prediction. To enable:
   - Train at [teachablemachine.withgoogle.com](https://teachablemachine.withgoogle.com) (Image
     Project → Standard), using **exactly** the class names and order in `CLASS_ORDER`
     (`src/lib/classifier.ts`).
   - Export → TensorFlow.js → unzip into `public/model/` (`model.json` + `.bin` shards).
   - Reload. No code change needed.
   - Shoot training images in **real conditions** — dim light, cluttered piles, wet ground. A model
     trained on clean studio shots collapses in a scrap yard.

4. **Transport cost is a placeholder.** `TRANSPORT_RUPEES_PER_KM` in `src/lib/matching.ts` is a
   modelling assumption. Replace it with what your two field collectors actually pay.

5. **Baseline earnings must come from field research.** The "+43% vs aggregator" figure the demo
   shows is an artifact of synthetic seed data, **not a finding**. Do not present it as one.

6. **Marathi TTS may be absent** on entry-level Android. The fallback chain (mr → hi → en-IN) is
   implemented in `src/lib/speech.ts`, but bundling pre-recorded Marathi clips is the reliable fix.
   Test on the actual demo phone.

7. **Icons are placeholders.** `public/icons/` holds a generated ring mark.

8. **Supabase sync is not wired.** The outbox accumulates correctly and the schema is designed for
   it, but nothing drains the queue yet. The demo does not need it; a "syncs to server" claim does.

---

## Architecture

```
src/
  app/
    collector/        PWA: home, prices, lot builder, lot detail, earnings, safety
    recycler/         inbound feed + offline QR scanner
    dashboard/        Ministry / ULB view
  components/         AppProvider (locale, identity, sync), UI, SafetyAlert, HandoverQR
  lib/
    db.ts             Dexie/IndexedDB + outbox. THE UI READS AND WRITES ONLY THIS.
    crypto.ts         ECDSA P-256 signing, QR envelope, offline verification
    materials.ts      Category catalogue, safety profiles, composition ranges
    pricing.ts        Fair band, outlier rejection, trend, anomaly detection
    matching.ts       Recycler ranking by net value; unit-economics comparison
    classifier.ts     TF.js on-device inference (returns null when no model)
    i18n.ts           mr / hi / en dictionaries
    speech.ts         TTS with explicit fallback chain
    seed.ts           SYNTHETIC demo data
public/sw.js          Hand-written service worker
```

**The one architectural rule:** the UI never awaits the network. Every mutation goes to IndexedDB
and an outbox entry; sync moves data in the background. This is what makes airplane mode work, and
it only holds if it is respected everywhere.

---

## The offline test (run before every demo)

1. Load the app while online; let it cache.
2. Real airplane mode on a real phone — not just DevTools throttling.
3. Create a lot with a photo, get an estimate, generate the handover QR. **All must succeed.**
4. Second device, also offline: scan, verify signature, countersign.
5. Restore network; confirm both sync with no duplicates.

---

## Still to do

Tracked in `48-HOUR-PLAN` (`~/.claude/plans/`) and `FEATURE-BLUEPRINT.md`.

- Supabase sync drain + schema migration
- Trained TF.js model + model card
- Claude vision "enhanced accuracy" online path
- Pre-recorded Marathi audio clips
- Real MPCB/CPCB recycler data
- **Field research with ≥2 collectors — a graded PS deliverable**
