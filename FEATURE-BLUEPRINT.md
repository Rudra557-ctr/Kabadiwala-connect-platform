# Kabadiwala Connect — Feature Blueprint (SIH 2026, PS 26229)

## Context

**Problem statement:** PS 26229, Ministry of Mines / JNARDDC, Software, Clean & Green Technology.

India's e-waste is collected almost entirely by informal scrap collectors who sit *outside* the EPR framework created by the E-Waste (Management) Rules, 2022. The result is backyard processing — open cable burning, acid leaching of PCBs, manual desoldering — which recovers a little copper and gold while destroying lithium, cobalt, neodymium, tantalum, gallium and indium, and poisoning the workers doing it.

The gap the PS names is **not primarily technological — it is informational and institutional.** A collector does not know the fair price, does not know which nearby recycler is authorized, has no way to complete a compliant handover, and gets no record of the transaction. So the informal route stays more attractive.

**Therefore the product's job is one sentence:** make the formal recycling route the *more profitable and more convenient* choice for a collector who may not read, may not have signal, and is using a ₹6,000 Android phone. Every feature below is judged against that sentence. Anything that adds compliance burden without adding rupees is cut.

**Who this document is for:** the build team. It is a feature map and architecture decision record, not an implementation plan — no code is written in this pass.

**Stack (decided):**
- **Collector app** — Native Kotlin + Jetpack Compose, minSdk 23 (Android 6), target <20 MB APK
- **Backend** — FastAPI + PostgreSQL + PostGIS + Redis; S3/MinIO for images
- **Recycler portal** — Next.js web (desktop-first: recyclers have laptops) + a thin Kotlin recycler app for QR scanning in the yard
- **ML** — PyTorch → TFLite INT8 on-device; LightGBM / statsmodels server-side

---

## 1. The scoring reality (read this first)

SIH is not won on feature count. It is won on four things, in this order:

1. **Literal PS coverage.** Every bullet in the PS maps to a demonstrable feature. Section 2 is that traceability matrix. Missing bullets are the #1 elimination cause.
2. **The dataset story.** This PS is unusually explicit about datasets and says teams must show how data is *generated, validated, updated and used* — "rather than treating the dataset as a static database." Most teams ship a static seed CSV and lose here. Section 6 is our answer.
3. **Alignment with the sponsoring body.** The sponsor is the **Ministry of Mines / JNARDDC** — not a pollution board. They care about **critical mineral recovery**, not waste tonnage. Section 5.1 makes that our headline metric.
4. **Evidence it touched reality.** The PS mandates field research with ≥2 working collectors and a live usability demo. Section 9.

---

## 2. Tier 0 — Mandatory (PS requirement → feature traceability)

Non-negotiable. If a demo skips one of these, it reads as incomplete.

| # | PS requirement | Feature | Notes |
|---|---|---|---|
| T0-1 | Photograph, categorize, create digital lots | **Lot Builder** — camera → on-device AI category suggestion → confirm by icon → weight → instant value estimate | Categories: CRT, LCD/LED panel, PCB (populated/bare), cables, Li-ion battery, lead-acid battery, motors & magnet assemblies, mixed plastics, aluminium, ferrous, mixed e-waste |
| T0-2 | Approximate weight entry | **Weight input** — big numeric dial, voice entry, Bluetooth scale, OCR-from-scale-photo | See T2-4 |
| T0-3 | Instant value estimate | **Fair-price engine** — returns a *band* (low / fair / high) not a single number, with confidence | Band, not point estimate — honesty is a feature |
| T0-4 | Price discovery + historical price dataset | **Price Board** — rates by category × location × date, unit, market range, recycler-offered rate | Table-stakes; see T0-10 for the voice layer |
| T0-5 | Price trends | **Trend chips** — 7/30-day ↑↓ arrow + sparkline per category | Deliberately non-numeric: arrow + colour reads without literacy |
| T0-6 | Material & transaction dataset, traceable collection→recycling | **Lot lifecycle ledger** — lot ID, category, description, photo ref, weight, est. value, quoted price, final value, timestamps, collection location, recycler, status | Backing store for T0-8 |
| T0-7 | Authorized recycler dataset + ranking | **Recycler Directory** — name, facility location, materials accepted, authorization no. & status, contact, offered rates, pickup availability, service area | Seeded from CPCB/SPCB authorized-recycler lists; see T3-2 for verification |
| T0-8 | Verifiable digital handover record | **Handover Receipt** — photos, weight, timestamp, GPS, unique reference, recycler confirmation | Cryptographically signed; see T2-1 |
| T0-9 | Recycler matching | **Match & Rank** — PostGIS distance + material fit + net rate after transport + pickup availability + authorization validity | Rule-based ranker v1, learning-to-rank v2 |
| T0-10 | Spoken price information | **Bolo Bhav** — every price screen has a speaker button; speaks the rate in the chosen language | See §4 on the TTS/pre-recorded-audio decision |
| T0-11 | Earnings ledger | **Kamai Ledger** — paid / pending / total, visual (coin stacks + colour), weekly & monthly rollup | Foundation for T3-4 |
| T0-12 | Pictorial + audio safety guidance | **Surakshit Kaam** — illustrated cards + audio: never burn cables, never puncture/heat Li-ion, CRT implosion & lead risk, acid handling, PPE | Also surfaced contextually — see T3-5 |
| T0-13 | Marathi + Hindi minimum, low-literacy UI | **Vernacular zero-text UI** — icon + colour + audio throughout; Marathi, Hindi, English at launch | §4 is the full UX doctrine |
| T0-14 | Offline-first, core tasks offline | **Offline-first architecture** — Room/SQLite + outbox sync queue; every core action completes offline | §3 |
| T0-15 | Entry-level Android, small app, low memory | **Low-end budget** — <20 MB APK, Android 6+, works in 1 GB RAM; measured and published | §7 |
| T0-16 | Cash allowed, digital payment optional | **Cash-first settlement** — cash is the default path; UPI is an optional toggle, never a gate | Explicitly never required to use the app |
| T0-17 | AI/ML: classification, valuation, matching, anomaly detection | Four models | §5 |
| T0-18 | Recycler-side interface | **Recycler portal + yard app** | §2.1 |

### 2.1 Recycler / aggregator side (Tier 0)

Judges routinely find this half missing. It is half the product.

- **Inbound lot feed** — incoming lots with photos, declared weight, distance, collector reliability score
- **Accept / counter-offer / reject**, with the counter-offer reason captured (feeds the price dataset)
- **QR scan to confirm handover** — closes the traceability loop; works offline in the yard
- **Actual vs declared weight** — weighbridge entry; the delta feeds T3-3 and the collector trust score
- **Rate publishing** — recycler sets and updates their own buying rates per material; this is the live source for the Price Board
- **Pickup scheduling** — accept pickup requests, assign a van
- **EPR compliance export** — structured transfer record per lot, exportable for EPR filing
  - ⚠️ *Verify before building:* the exact CPCB EPR-portal field schema and whether bulk import is supported. Build the export as a mapped, versioned schema so it can be re-pointed without rework. Do not claim "auto-files with CPCB" in the pitch unless the API is confirmed.
- **Three-tier chain modelling** — collector → **aggregator (kabadi shop)** → authorized recycler. The PS says "recycler/aggregator" throughout. Most teams model only two tiers and can't explain where the margin actually leaks. Modelling the middle tier is a credibility marker *and* is what makes the unit-economics slide honest.

---

## 3. Tier 1 — Basic / table stakes

Not in the PS, but their absence makes the build look like a prototype.

- **Low-friction onboarding** — phone + OTP, 4-digit PIN, language picked *by flag/audio before any text appears*. No email. No Aadhaar. Target: usable in under 90 seconds.
- **Minimal collector profile** — pseudonymous collector ID, preferred language, operating area, transaction & earnings history. The PS says "avoid collecting unnecessary personal information" — we make data minimization an explicit, demoable design choice (§8).
- **Notifications** — offer accepted, pickup scheduled, payment released. Push (FCM) with **SMS fallback**, because push is unreliable on low-end devices with aggressive battery killers.
- **Search, filter, lot history**
- **Dispute flow** — weight mismatch with photo evidence from both ends. Real yards argue about weight constantly; a product without this reads as never having met a scrap dealer.
- **Admin / operations console** — recycler onboarding & verification, price moderation, abuse handling
- **Seeded demo mode** — a realistic pre-populated dataset so the live demo survives a dead venue Wi-Fi. This is a hackathon necessity, not a nicety.

---

## 4. UX doctrine — low-literacy and voice (this is the product, not a skin)

Treat this as an architectural constraint, not a translation pass.

- **Zero-text-dependency rule.** Every actionable element carries icon + colour + audio. Text is an *aid*, never the sole carrier of meaning. Numbers stay as large digits (digits are widely recognized even by non-readers) with coin/note imagery alongside.
- **Speaker button on every screen.** One tap reads the screen aloud.
- **Bolo Mode (voice-first navigation)** — the whole core flow drivable by speech: *"तांबे का भाव बताओ"* → speaks today's copper rate. *"नया लॉट"* → opens the camera.
- **Speech stack — decide early, this is the highest-risk UX dependency:**
  - **TTS:** Android `TextToSpeech` reliably ships `hi-IN` on most devices; **Marathi (`mr-IN`) TTS availability is device-dependent and often absent on entry-level phones.** Do not assume it.
  - **Decision:** ship a bundled library of **pre-recorded audio clips** (numerals 0–99, material names, ~40 UI phrases, safety scripts) recorded by native Hindi and Marathi speakers, composed at runtime for prices ("तांबे — बावन्न रुपये किलो"). Use system TTS only as an enhancement where present. Costs ~2–3 MB compressed and removes the single biggest device-fragmentation risk.
  - **ASR:** Android `SpeechRecognizer` covers hi-IN and mr-IN on many devices but needs network. Evaluate **AI4Bharat IndicASR** and **Vosk** for an offline small-vocabulary command grammar — we only need ~30 commands, so a constrained grammar beats general ASR on both accuracy and size. *Verify Marathi offline model availability before committing.*
- **Test with real non-readers.** The ≥2 collectors in §9 must complete the core task unaided. Record it — that video *is* the usability demonstration the PS requires.

---

## 5. Tier 2 — Advanced

### 5.1 Critical-minerals recovery accounting ⭐ *highest-leverage alignment feature*
The sponsor is the **Ministry of Mines**. They are not primarily a waste agency — they care about **critical mineral security** (lithium, cobalt, neodymium, tantalum, gallium, indium all appear in the PS text and on India's critical-minerals list). No other team will lean into this.

Build a composition model: per material category, an estimated recoverable-content profile (g/kg) from published e-waste characterization literature. Then:
- **Collector-facing:** *"This PCB lot likely holds ~₹X of gold and tantalum that burning destroys."* — converts the safety message from a scold into an economic argument, which is the only kind that changes behaviour.
- **Ministry-facing dashboard:** cumulative **kg of each critical mineral diverted from backyard processing into formal recovery**, by district and by month.

That dashboard is the pitch's closing slide. It speaks the sponsor's language.
⚠️ Composition figures must be cited to sources with stated ranges and uncertainty — present them as estimates, never as assay results.

### 5.2 Verifiable, offline-capable handover (T2-1)
Not "blockchain." Something better-justified and actually buildable:
- Collector device holds a hardware-backed keypair (**Android Keystore, ECDSA P-256** — broadly available from API 23; Ed25519 in Keystore is API 33+, so P-256 is the correct choice for Android 6 support).
- Handover payload — lot ID, weight, timestamp, geohash, SHA-256 hashes of the photos, recycler ID — is **signed by the collector and countersigned by the recycler**, producing a tamper-evident chain per lot.
- **Offline peer handover:** the signed payload (~300–500 bytes) fits comfortably in a QR code, so the recycler's yard app can **verify the signature fully offline** and countersign. Photos transfer later via sync (they don't fit in a QR). Both devices reconcile with the server whenever either gets signal.
- Optional: publish a daily Merkle root of all handovers to a public ledger for third-party auditability. Mention as an extension; do not build first.

**Why this wins:** a yard with no signal is the normal case, and a handover that can't complete offline is a handover that won't happen. Almost no team builds offline *mutual* verification.

### 5.3 Fair Price Index — "Sahi Bhav" (T2-2)
A mandi-style price board that tells the collector how the offer in front of them compares:
- offered price vs district median vs fair band → **red / yellow / green** with a spoken verdict
- anchored to an **external reference** where one exists — scrap copper and aluminium track LME/MCX at a trade discount. Anchoring the band to a public benchmark is how the trade actually reasons about price and demonstrates real domain depth.
- crowd-sourced from every platform transaction → this is the dataset flywheel (§6)

### 5.4 Underpricing alert (T2-3)
Anomaly detection surfaced **to the collector, before they accept**, not buried in an admin report: *"तुम्हाला कमी भाव मिळतोय"* — spoken, with the fair band shown. Same model also flags suspicious transactions for admins (the PS's "abnormal or inconsistent transaction values").

### 5.5 Weight capture without a scale (T2-4)
Many collectors have no calibrated scale. Three graceful fallbacks:
1. **Bluetooth scale** integration where available
2. **OCR of a digital scale display** from a photo — cheap, works with any existing scale, surprisingly robust
3. **Photo-based volumetric estimate** — reference object + bounding box × material density, returned as a range with an explicit confidence band, clearly labelled an assist

### 5.6 Lot pooling / collective bargaining ⭐
Authorized recyclers have minimum-tonnage thresholds that a single collector can never hit — which is *the structural reason* the aggregator middleman exists and extracts margin. Let geographically clustered collectors **combine lots into a pooled consignment** to clear the recycler's MOQ and unlock the bulk rate, with transparent proportional split by weight and material.

This is the single most economically meaningful feature in the document: it attacks the actual cause of low collector earnings rather than just reporting prices.

### 5.7 Pickup route optimization
Recycler sees clustered pending lots on a map and gets an optimized van route (OR-Tools VRP). Lower collection cost per kg → the recycler can afford a higher buying rate → collectors earn more. Closes the economic loop, and it's a clean, demonstrable optimization result.

### 5.8 Collector reliability score
Declared-vs-actual weight accuracy, handover completion rate, no-show rate — computed, shown to the recycler, and **shown to the collector with how to improve it.** Higher score → priority matching and better rates. Makes good behaviour pay.

---

## 6. Tier 3 — Standout / unique (the differentiators)

### 6.1 EPR credit bridge ⭐⭐ *the strategic centrepiece*
Under the 2022 Rules, authorized recyclers generate **EPR certificates** with real market value, and informal collectors currently capture **zero** of it — precisely because their material arrives with no traceable provenance. Our handover record *creates* that provenance.

So: compute the EPR-credit value attributable to each traceable lot and surface it to the collector as a distinct bonus line on top of the scrap rate.

This is the mechanism that makes the PS's central demand — *"make the formal channel economically attractive rather than an additional compliance burden"* — literally true, with a number attached. It is also the platform's own revenue model (§8.2).
⚠️ EPR certificate pricing is market-determined and variable. Model it with a stated assumption and a sensitivity range; never present a single hard number as guaranteed.

### 6.2 Authorization verification with expiry watch
Ingest CPCB and State PCB authorized-recycler lists. Show a **verified badge with authorization number and validity date**, and **auto-flag expired or lapsed authorizations** so a collector is never routed to a recycler whose authorization died last month. Directly implements the PS's "authorization status" requirement in a way a judge can spot-check live. *Verify list availability and format per state; some SPCBs publish only PDFs — plan a parser + manual review queue.*

### 6.3 Kabadiwala Credit Passport ⭐
The PS asks for an earnings ledger "building a usable financial and transaction history." Take that seriously and finish the thought: export a verifiable, signed income history PDF/JSON the collector can present to an NBFC, MFI or insurer.

Most informal collectors are credit-invisible. A verified income record is a genuine asset — potentially worth more to them than any per-kg gain. This is the highest-impact social outcome in the build and is a strong differentiator in judging.
⚠️ Do not claim a lending partnership that does not exist. Frame as "credit-ready export, Account-Aggregator-compatible format."

### 6.4 Contextual safety AI ⭐ *best live-demo moment*
When the classifier sees a **bulging/damaged Li-ion cell**, a **CRT**, or a **populated PCB**, it immediately plays a spoken warning and shows the matching pictogram — at the moment of handling, not in a help menu nobody opens.

Demo: hold a battery up to the phone; the phone speaks a warning in Marathi. That is the 10 seconds a judge remembers.

### 6.5 Non-smartphone reach — SMS / IVR / WhatsApp
The hardest truth about this user base is that some of them do not own a smartphone.
- **SMS price board** — keyword SMS returns today's rates
- **Missed-call IVR** — call, hang up, get a callback that speaks the rates
- **WhatsApp bot** — many collectors who won't install a new app *do* use WhatsApp; send a photo, get a category + price estimate back

Shows the team designed for the actual population rather than the convenient subset. Low build cost, high narrative value.

### 6.6 Peer video tips
30-second clips recorded *by collectors, for collectors*, in local language. Trust in this sector travels through peers, not through institutions. Cheap to build, strong field-research payoff.

### 6.7 Government / ULB dashboard
District-level formalization rate, diverted tonnage, critical minerals recovered (§5.1), EPR compliance, heatmaps of informal-processing hotspots. The buyer-facing surface for CPCB / SPCB / urban local bodies — and the reason this can outlive the hackathon.

---

## 7. AI/ML portfolio

The PS says to apply ML "wherever sufficient training data is available" — an explicit invitation to be honest about limits. Take it. A team that states its data limitations clearly scores better than one that claims 99% accuracy on 200 images.

| Model | Job | Approach | Where it runs |
|---|---|---|---|
| **Material classifier** | Photo → category + sub-category | MobileNetV3-Small / EfficientNet-Lite0, transfer-learned, INT8-quantized TFLite (~3–5 MB) | **On-device** (must work offline) |
| **Hazard detector** | Flag bulging Li-ion, CRT, populated PCB | Additional heads on the same backbone — one model, two outputs | On-device |
| **Price forecaster** | Fair band per category × region × date | LightGBM / SARIMAX on the price dataset + external metal benchmark | Server |
| **Recycler ranker** | Order recyclers for a lot | Rule-based v1 → learning-to-rank (LambdaMART) once acceptance data accumulates | Server |
| **Anomaly detector** | Abnormal transaction values | Isolation Forest + robust z-score per category × region | Server |
| **Weight estimator** | Volumetric assist | Reference-object scaling × material density, wide confidence band | On-device |

**Training data strategy (be explicit about this in the pitch — the PS asks for source, quality, size and limitations):**
1. Bootstrap: ~1,500–3,000 self-captured images from the ≥2 field collectors + public e-waste image datasets + controlled captures in the lab
2. Heavy augmentation for the conditions that actually occur: bad light, motion blur, cluttered piles, rain, dusk
3. **Active learning loop** — low-confidence on-device predictions are queued (with consent) for labelling and feed the next model version
4. **Model card** stating class balance, held-out accuracy per class, known failure modes, and what we *cannot* yet classify

That active-learning loop is what makes the dataset "not static" — which is exactly the criterion the PS sets.

---

## 8. The seven datasets (PS-mandated) + the flywheel

The PS enumerates the datasets; the differentiator is proving they are **generated, validated, updated and used**, not seeded once.

| Dataset | Generated by | Validated by | Consumed by |
|---|---|---|---|
| **Material** | Lot Builder capture | Classifier confidence + recycler confirmation at handover | Classifier training, valuation |
| **Price** | Recycler rate publishing + every completed transaction | Outlier rejection, external benchmark cross-check | Price Board, forecaster, Fair Price Index |
| **Recycler** | Onboarding + CPCB/SPCB list ingestion | Authorization number + expiry verification | Matching, ranking, directory |
| **Transaction** | Lot lifecycle events | Double-entry (collector-declared vs recycler-confirmed) | Ledger, anomaly detection, unit economics |
| **Traceability** | Signed handover receipts | Cryptographic signature chain verification | Compliance export, EPR credit bridge |
| **Collector** | Minimal onboarding + accumulated history | Reliability score | Matching, Credit Passport |
| **ML training** | Active-learning queue + field capture | Human labelling + inter-annotator agreement | All models |

**The flywheel — say this out loud in the pitch:** more transactions → better price data → sharper fair-price bands → collectors trust the platform → more transactions. The dataset is not an input to the product; it is the product's compounding asset. Draw this as one diagram.

**Data governance (also scored):**
- **Data minimization by design** — pseudonymous collector IDs; no Aadhaar; no caste, income or household data. The PS explicitly asks for this, so make it a visible design decision rather than an omission.
- **On-device redaction** — blur faces and vehicle plates in lot photos before upload
- **Audio consent** — consent explained in the user's language, spoken, not a wall of text nobody can read
- **DPDP Act 2023 posture** — purpose limitation, retention policy, deletion on request
- **Anonymized aggregate exports** for research and the government dashboard

---

## 9. Architecture (shape only)

```
Kotlin app (collector)          Kotlin app (recycler yard)      Next.js portal
   Room/SQLite + outbox             QR verify (offline)            recycler + gov
   TFLite classifier                countersign                    dashboards
   TTS + audio clips                                                    │
   Keystore signing                                                     │
        └──────────────── sync (delta, resumable) ────────────────┬─────┘
                                                                  │
                            FastAPI  ·  PostgreSQL + PostGIS  ·  Redis  ·  S3/MinIO
                            ML services: forecaster · ranker · anomaly
```

**Offline-first mechanics (T0-14) — the part teams underestimate:**
- **Outbox pattern** with a monotonic operation log; every mutation is an idempotent, replayable event
- **Client-generated ULIDs** for lot IDs — no server round-trip needed to create a lot
- **Last-writer-wins with server reconciliation** for price cache; **append-only, never overwritten** for handover events
- **Visible, comprehensible sync state** — "3 lots waiting to send" as icons and a count, not a spinner. A collector must be able to trust that offline work is not lost, and must be able to *see* that it isn't.
- **Photo handling** — compress and downscale on-device before queuing; upload on unmetered connection by default

**Low-end device budget (T0-15) — measure and publish these; measured claims beat adjectives:**

| Budget | Target |
|---|---|
| APK (split-per-abi) | < 20 MB |
| minSdk | 23 (Android 6) |
| RAM ceiling | works in 1 GB device |
| Cold start | < 2 s on a 4-year-old entry phone |
| Core flow offline | 100% (lot → estimate → handover) |

---

## 10. Unit economics (PS-mandated deliverable)

The PS requires a short unit-economics assessment. Build it as a **live calculator** in the admin console, sourced from real transaction data, not a static slide — that turns a required deliverable into a demo moment.

**Collector side — where the extra rupees come from.** Present as a per-kg waterfall for a representative material:

| Lever | Source of gain |
|---|---|
| Aggregator margin removed | Direct collector → authorized recycler routing (§2.1 three-tier model) |
| Price transparency | Fair Price Index prevents accepting below-band offers (§5.3) |
| Bulk rate unlocked | Lot pooling clears recycler MOQ (§5.6) |
| Transport cost reduced | Route-optimized pickup (§5.7) |
| EPR credit share | Traceable provenance (§6.1) |

⚠️ Fill every number from the field research in §11 and from published rate data, with sources cited. **Do not invent baseline earnings.** A modest, sourced number is far more persuasive to a judge who knows the sector than an impressive invented one.

**Platform sustainability:**
- Take rate charged to the **recycler side only — never to the collector.** Charging a collector to access a fair price would recreate the exact barrier the PS asks us to remove.
- EPR facilitation fee on brokered credits
- Anonymized market-intelligence subscriptions for producers and PROs
- Government / ULB dashboard licensing

---

## 11. Field deliverables (PS-mandated — schedule these early)

These are *required outcomes*, not extras, and they cannot be manufactured the night before:

- [ ] **Field research with ≥2 working scrap collectors or aggregators** — recorded interviews, current earnings per material, their actual workflow, their phone and their literacy level. Everything in §10 depends on this.
- [ ] **Live usability demonstration** — a collector completing the core task unaided, on video
- [ ] Working collector mobile app
- [ ] Working recycler-side interface
- [ ] The four structured datasets (materials, prices, recyclers, transactions), populated with real field data
- [ ] Unit-economics assessment with cited sources
- [ ] Model card with stated limitations

**Find the collectors in week one.** Every credible number in this document traces back to them.

---

## 12. Build sequencing

**Phase 1 — Spine (prove the loop end to end):** onboarding → Lot Builder → price estimate → recycler match → signed handover → recycler confirm → ledger entry. Offline-first from the first commit; retrofitting offline is a rewrite. Hindi + Marathi from the first screen, for the same reason.

**Phase 2 — Intelligence:** on-device classifier, price forecaster, Fair Price Index, anomaly detection, recycler ranking, safety cards.

**Phase 3 — Differentiators:** critical-minerals accounting (§5.1), EPR credit bridge (§6.1), lot pooling (§5.6), Credit Passport (§6.3), contextual safety AI (§6.4), government dashboard (§6.7).

**Phase 4 — Reach & polish:** SMS/IVR/WhatsApp, route optimization, peer video, performance budget verification, demo mode.

**Cut order if time runs short** (protect PS coverage above all): drop §6.5 reach channels, then §5.7 route optimization, then §6.6 peer video, then §5.5 photo weight estimation. **Never cut anything in Tier 0, the dataset story, or the field research.**

---

## 13. Demo script (build toward this)

1. Collector opens app — **picks Marathi by tapping a flag, having read nothing**
2. Photographs a pile of cables → AI names the category → phone **speaks** the fair rate
3. Holds up a damaged Li-ion cell → phone **speaks a safety warning in Marathi** (§6.4)
4. **Turns on airplane mode** → creates a lot, gets an estimate, generates the handover QR — all offline (§5.2)
5. Recycler's yard phone, **also offline**, scans the QR, verifies the signature, countersigns
6. Both devices come back online → sync → ledger updates → traceability chain visible in the portal
7. Fair Price Index shows the offer was in-band; had it been low, the phone would have warned first (§5.4)
8. Close on the **Ministry of Mines dashboard: kg of lithium, cobalt and tantalum diverted from backyard burning into formal recovery** (§5.1)

Steps 3, 4 and 8 are the memorable ones. Rehearse those.

---

## 14. Open items to verify before committing in the pitch

1. CPCB EPR portal transfer-record schema and whether bulk import exists
2. CPCB / SPCB authorized-recycler list availability and format, per target state (Maharashtra first)
3. Marathi offline ASR model availability (AI4Bharat IndicASR vs Vosk) — the Bolo Mode fallback plan depends on this
4. Marathi TTS presence on entry-level devices — drives how much pre-recorded audio must be bundled (§4)
5. EPR certificate market pricing range and volatility, for §6.1 sensitivity analysis
6. Published e-waste composition figures, with uncertainty ranges, for §5.1
7. Baseline collector earnings per material — **from the §11 field research, not from assumption**
