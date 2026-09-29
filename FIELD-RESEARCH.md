# Field Research — interview record

**Status: ⬜ NOT YET CONDUCTED.** This is a blank template. Nothing below is
filled in, and nothing in it may be presented as findings until it is.

PS 26229 requires field research with **at least two working scrap collectors
or aggregators**. It is a graded deliverable. It is also the only thing that
converts the invented numbers in `src/lib/economics.ts` and
`src/lib/materials.ts` into sourced ones.

**Time needed: about 20 minutes per call.** Two calls closes the requirement.

---

## How to find them

- Search maps for **"kabadiwala near me"**, **"scrap dealer Nagpur"**, **"भंगार दुकान"**
- Ask at a local recycling or e-waste collection point
- Many are on WhatsApp — a voice note works if a call feels awkward

## Before you start

- Say who you are and why: *"I'm a student building an app to help scrap
  collectors get fair prices. Can I ask five questions? It takes ten minutes."*
- **Ask permission to record**, and say the recording is for a college project
- **Do not record names, phone numbers, or addresses.** Use "Collector A" and
  "Collector B". The problem statement explicitly asks for data minimisation,
  and you get no benefit from identifying anyone
- Offer to show them the app afterwards. Several will be curious, and their
  reaction is worth more than the answers

---

## Interview 1 — Collector A

**Date:** ⬜
**Location (area only, not address):** ⬜
**Role:** ⬜ collector / ⬜ aggregator / ⬜ both
**Recorded with consent:** ⬜ yes / ⬜ no

### Q1 — Prices paid, ₹ per kg

The single most valuable answer. Get real numbers, not ranges, if you can.

| Material | ₹/kg they PAY | ₹/kg they SELL at | Notes |
|---|---|---|---|
| Copper wire / cable | ⬜ | ⬜ | |
| Circuit boards (PCB) | ⬜ | ⬜ | |
| Lithium batteries | ⬜ | ⬜ | |
| Lead-acid batteries | ⬜ | ⬜ | |
| Aluminium | ⬜ | ⬜ | |
| Iron / ferrous | ⬜ | ⬜ | |
| Mixed e-waste | ⬜ | ⬜ | |
| Old TV / CRT | ⬜ | ⬜ | |

*Replaces:* `materials.ts` → `indicativePriceLow/High` for all 12 categories.

### Q2 — Volume and earnings

- How many kg do you handle in a normal day? **⬜**
- How many days a week do you work? **⬜**
- What do you earn on a normal day, after costs? **⬜**
- Best day / worst day? **⬜ / ⬜**

*Replaces:* `economics.ts` → `dailyVolumeKg`, `workingDays`, and validates the
whole earnings model.

### Q3 — Who they sell to

- Who do you sell to now? **⬜**
- How far away are they? **⬜ km**
- Do they come to you, or do you go to them? **⬜**
- What does it cost to move a load there? **⬜ ₹**
- Have you ever sold to a licensed recycler? **⬜** Why / why not? **⬜**

*Replaces:* `economics.ts` → `transportPerKm`, `aggregatorDistanceKm`,
`pickupShare`. Also tells you whether the formal route is even reachable.

### Q4 — Price knowledge

- How do you know today's rate? **⬜**
- Has a buyer ever paid you less than you expected? **⬜**
- Would you travel further for a better price? How much further? **⬜**

*This tests the core premise.* If they already know prices and are satisfied,
the product's central assumption is weaker than we think — and you need to know
that before a judge asks.

### Q5 — Phone and literacy

- What phone do you use? **⬜**
- Do you use WhatsApp? **⬜**
- Can you read Marathi? **⬜** Hindi? **⬜** English? **⬜**
- Do you use voice messages more than typing? **⬜**

*Validates:* offline-first, Marathi-first, and the voice-led interface. If they
read fine, the low-literacy design is over-engineered — also worth knowing.

### Q6 — Safety (observational)

- Do you strip cable, or burn it? **⬜**
- Have you or anyone you know been hurt handling batteries or CRTs? **⬜**
- Do you use gloves? **⬜**

*Validates:* the contextual safety warnings, and whether the economic framing
("burning destroys the gold") actually lands.

### Reaction to the app

Show them the price board and the lot flow.

- First reaction: **⬜**
- What confused them: **⬜**
- What they liked: **⬜**
- Would they use it? Why / why not: **⬜**

**This is the usability demonstration the PS asks for.** Record it if they agree.

---

## Interview 2 — Collector B

*(Duplicate the whole block above. A second voice matters: one person's prices
could be an outlier, and two lets you say "consistent across both" or "they
disagreed, here's why", which is a stronger finding either way.)*

**Date:** ⬜
**Location (area only):** ⬜
**Role:** ⬜ collector / ⬜ aggregator / ⬜ both

⬜ *Repeat Q1–Q6 and the reaction section.*

---

## Synthesis — fill in after both calls

### Prices — what goes into the app

| Material | A | B | Value to use | Confidence |
|---|---|---|---|---|
| Copper wire | ⬜ | ⬜ | ⬜ | ⬜ |
| PCB | ⬜ | ⬜ | ⬜ | ⬜ |
| Li-ion | ⬜ | ⬜ | ⬜ | ⬜ |
| … | | | | |

If A and B differ by more than about 20%, **do not average them** — find out
why. Different material grades, different sub-markets, or one of them is being
underpaid. Any of those is a more interesting finding than the average.

### Earnings baseline

- Daily earnings, A: **⬜** · B: **⬜**
- Use in the model: **⬜ – ⬜ ₹/day**
- Monthly: **⬜ – ⬜ ₹**

### What surprised you

⬜ *Write this while it is fresh. The unexpected answer is usually the most
valuable thing in the whole exercise, and it is the part a judge will remember.*

### What this changes in the product

⬜ *Be honest, including if it weakens an assumption. "We learned collectors
already know prices, so we shifted emphasis to traceability" is a stronger
statement than pretending the research confirmed everything.*

---

## After the calls — update these

| File | What to change |
|---|---|
| `src/lib/materials.ts` | `indicativePriceLow/High` for every category |
| `src/lib/economics.ts` | `dailyVolumeKg`, `workingDays`, `transportPerKm`, `blendedMedianRate`, distances, `pickupShare` — and raise each `confidence` from `guess` to `literature` |
| `src/lib/matching.ts` | `TRANSPORT_RUPEES_PER_KM` |
| This file | Mark status ✅ CONDUCTED with both dates |

Then re-run `npm run verify` — the guess count should drop.

---

## Consent and privacy

- Verbal consent, recorded at the start of the call, is enough for a student project
- **No names, numbers or addresses in this file or anywhere in the repo**
- If you record video of them using the app, ask separately — that is a
  different permission from an interview
- Offer to delete anything they later object to, and mean it
