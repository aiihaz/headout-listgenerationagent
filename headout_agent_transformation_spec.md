# Headout Content Agent — Transformation Specification

## Purpose

This spec defines the **deterministic rules** an AI content agent follows when converting raw supplier data into a Headout-ready API payload. It is the operational rulebook built from:
- Headout live API observations (11 real products across 3 tourTypes, 3 flowTypes, 4 inventoryTypes)
- Field diff analysis across 6 experience categories
- 7 complete supplier payload examples (Desert Safari, Canal Cruise, Museum Ticket, Broadway, Colosseum, Bosphorus, Helicopter)

---

## STEP 1: Classify the Experience

### 1A. Determine `tourType` (ONLY 3 valid values)

| If the supplier offers... | Set `tourType` to |
|---|---|
| Pure entry ticket with no guide (museum, monument, theme park) | `"ATTRACTION"` |
| Time-bounded scheduled event (concert, theater, sports game) | `"EVENT"` |
| Anything with a guide, route, activities, transport | `"TOUR"` |

**Decision tree:**

```
Does the experience have a live guide OR structured itinerary?
  YES → "TOUR"
  NO  → Is it a live performance/event with a fixed showtime?
          YES → "EVENT"
          NO  → "ATTRACTION"
```

**⚠ Common mistakes to avoid:**
- Desert safaris = `TOUR` (not ATTRACTION — they have guides)
- Museum with a guided tour add-on = still `ATTRACTION` at product level; guided tour is a variant
- Comedy show, belly dance performance standalone = `EVENT`

---

### 1B. Determine `flowType`

| Signal | `flowType` |
|---|---|
| Venue has a physical seat map (theater, stadium, F1, concert) | `"SVG"` |
| This listing bundles 2+ independently bookable products | `"COMBO"` |
| Everything else | `"NORMAL"` |

---

### 1C. Determine `inventoryType`

This is the most consequential classification — it determines the entire booking UX.

```
Does the supplier offer fixed departure times (e.g. "4pm, 4:30pm", "9am, 11am, 2pm")?
  YES → Does the experience have a fixed duration?
          YES → "FIXED_START_FIXED_DURATION"      ← most common for tours
          NO  → "FIXED_START_FLEXIBLE_DURATION"   ← museum timed entry, open-ended visit
  NO  → Does the experience have a fixed duration?
          YES → "FLEXIBLE_START_FIXED_DURATION"   ← helicopter, hot air balloon
          NO  → "FLEXIBLE_START_FLEXIBLE_DURATION" ← day passes, theme parks
```

**Duration conversion:** supplier hours → milliseconds
- 1 hour = 3,600,000 ms
- 2 hours = 7,200,000 ms
- 2.5 hours = 9,000,000 ms
- 3 hours = 10,800,000 ms
- 6 hours = 21,600,000 ms
- Flexible / visitor-defined = `null`

---

## STEP 2: Determine Variant Structure

### When to create MULTIPLE variants:

| Condition | Add a variant per... |
|---|---|
| Different guide languages (with live guide) | Language |
| Different seating tiers (SVG flow) | Seating zone |
| Shared vs. private/charter option | Access type |
| Meaningfully different inclusions at different price | Package tier |
| Arena floor / tower access as premium upgrade | Add-on level |

### When NOT to create multiple variants (use userFields instead):

| Condition | Handle with... |
|---|---|
| Meal preference (vegetarian/non-veg) | Custom userField with dropdown |
| Hotel/pickup address | Custom userField |
| Audio guide (no live guide, just headphones) | Include in one variant; all languages in `languages[]` |
| Child vs. adult pricing | `paxTypes[]` array, not variants |

### Variant naming formula:

```
[Descriptive label] — [Language / Tier / Access Type]

Examples:
  "Shared Evening Desert Safari"
  "Colosseum Guided Tour — English"
  "Orchestra Front (Rows A–H) — Best View"
  "Private Bosphorus Boat Charter — Up to 12 Guests"
  "Louvre Timed Entry — Ticket + Audio Guide"
```

---

## STEP 3: Determine Pricing Model

### `listingPrice.type`

| Supplier says... | Use |
|---|---|
| Price per person / per ticket | `"PER_PERSON"` |
| Hire the whole boat/vehicle/helicopter | `"PER_GROUP"` |
| Group pricing (e.g. "4 for the price of 3") | `"PER_GROUP"` with `groupSize` |

### `paxTypes[]` — Age Bands

Always define at minimum: ADULT. Add others if supplier specifies or industry standard applies.

| Situation | Standard age bands |
|---|---|
| Adventure activity (safari, helicopter) | ADULT (13+), CHILD (3–12), INFANT (0–2) free |
| Museum / attraction | ADULT (18+), YOUTH (0–17) free, or as specified |
| Guided tour with monument ticket | ADULT (18+), YOUTH (6–17) guide-fee only, CHILD (0–5) free |
| Theater / show | ADULT only (or min age as floor) |
| Cruise | ADULT (12+), CHILD (3–11), INFANT (0–2) free |

**⚠ Always flag child/infant pricing if supplier did not provide it explicitly.**

---

## STEP 4: Map `userFields`

### Level selection rules:

| Level | When to use |
|---|---|
| `PRIMARY_CUSTOMER` | Contact info (email, phone) — always here; hotel pickup address; meal preference |
| `ALL_CUSTOMER` | When each individual in the booking needs to provide data (name for tickets, weight for safety, passport for international tours) |
| `VARIANT` | Rare — when a choice applies to the whole booking but isn't per-person |

### Standard userField set by experience:

**Minimum for all bookings:**
```
PRIMARY_CUSTOMER: Email (required)
```

**Add for hotel pickup (`hasHotelPickup: true`):**
```
PRIMARY_CUSTOMER: Phone Number (required)
PRIMARY_CUSTOMER: Hotel Name & Room Number — type.displayName: "Custom", dataType: null (required)
```

**Add for guided tours:**
```
PRIMARY_CUSTOMER: Full Name (required)
PRIMARY_CUSTOMER: Phone Number (required)
```

**Add for skip-the-line tickets (name on ticket):**
```
ALL_CUSTOMER: Full Name — type.displayName: "Full Name", dataType: "TEXT" (required)
```

**Add for safety-critical activities (helicopter, diving, adventure):**
```
ALL_CUSTOMER: [Weight / Medical Disclosure] — type.displayName: "Custom", dataType: null (required)
```

**Add for meal preference:**
```
PRIMARY_CUSTOMER: Meal Preference — type.displayName: "Custom", dataType: null
  options: ["Standard", "Vegetarian"] (required)
```

**Custom field pattern (confirmed from live data):**
```json
{
  "level": "PRIMARY_CUSTOMER",
  "type": { "displayName": "Custom" },
  "dataType": null,
  "label": "Hotel Name & Room Number",
  "placeholder": "e.g. Marriott JBR, Room 408",
  "required": true
}
```

---

## STEP 5: Map the Cancellation Policy

```
Supplier says ">Xhr: full refund" → hasFreeCancellation: true, cutoffHours: X
Supplier says "no refund at any time" → hasFreeCancellation: false, type: "NON_REFUNDABLE"
Supplier says "partial refund between X and Y hours" → type: "PARTIAL", refundPercentages: [...]
Weather cancellation → add notes field; do NOT change cutoffHours
```

**`hasFreeCancellation: true` badge is shown when `cutoffHours >= 1` and refund is 100%.**

Common cutoff hours: 1 (cruise), 24 (most tours), 48 (cruises, charters), 0 (theater, museums).

---

## STEP 6: Generate Content

### Product Name Formula
```
[Modifier] [Landmark/Activity] [Type] — [City]
[Time-of-day] [Type] with [Activity1], [Activity2] & [Activity3] in [City]

Max 80 characters.

Examples:
  "Evening Desert Safari with Dune Bashing, Camel Ride & BBQ Dinner in Dubai"
  "Colosseum Skip-the-Line Tour with Roman Forum & Palatine Hill — Rome"
  "Manhattan Helicopter Tour — 15-Minute New York City Skyline Flight"
```

### Description Structure (always 3–5 paragraphs)
1. **Hook**: What is this and why is it special? (2–3 sentences)
2. **Experience flow**: Walk the customer through what happens, in order
3. **The wow moment**: Best highlight with sensory detail
4. **Logistics**: Where it starts, how long, what's included, pickup
5. **Close**: Call to action or final differentiator

### Highlights Formula (always exactly 6 bullets, each 8–12 words)
- Lead with most exciting activity
- Include a logistics benefit (hotel pickup, skip-the-line)
- Include a differentiator (small group, free drink, etc.)
- End with a social proof or convenience point

### Inclusions vs. Exclusions
- Inclusions: everything that's in the price (transport, food, tickets, guide)
- Exclusions: what customers commonly expect but is NOT included (alcohol, gratuities, hotel pickup if not offered, insurance)
- Never leave exclusions empty — at minimum list gratuities and insurance

### FAQ minimum: 7 questions, always include:
1. Is [key logistical detail, e.g. hotel pickup] included?
2. What time does it start/end?
3. [Most common concern for the experience type — e.g. "Is dune bashing safe?" / "Is vegetarian available?"]
4. Is this suitable for children?
5. What should I wear/bring?
6. What is the cancellation policy?
7. [Experience-specific question — e.g. "Will I see the Mona Lisa?" / "Are seats assigned?"]

---

## STEP 7: Identify and Flag Ambiguities

Every payload must include an **Ambiguity Flags** section before it is sent for human review. Flag anything where the agent made an assumption.

### Always check for:

| Check | Default if missing | Action |
|---|---|---|
| Pricing (adult) | Estimate from competitor data | ⚠ FLAG — confirm before go-live |
| Child pricing | ~60–65% of adult | ⚠ FLAG |
| Infant policy | Free under 3 | ⚠ FLAG |
| Guide language | English | ⚠ FLAG |
| Blackout dates | None | ⚠ FLAG |
| Hotel list (if pickup=true) | Generic area name | ⚠ FLAG — get exact list |
| Images | Placeholder | ❌ BLOCK GO-LIVE — images required |
| Age restrictions | All ages welcome | ⚠ FLAG |
| Min/max group size | min 1 | ⚠ FLAG if activity type implies restrictions |
| Private tour option | Not offered | ⚠ FLAG |

---

## STEP 8: Validate the Payload

Before submission, run these checks:

```
✓ tourType is one of: ATTRACTION, TOUR, EVENT
✓ flowType is one of: NORMAL, SVG, COMBO
✓ inventoryType is one of: FIXED_START_FIXED_DURATION, FIXED_START_FLEXIBLE_DURATION,
  FLEXIBLE_START_FIXED_DURATION, FLEXIBLE_START_FLEXIBLE_DURATION
✓ duration is in milliseconds (or null if flexible)
✓ At least 1 variant exists
✓ Each variant has at least 1 paxType
✓ listingPrice.type is PER_PERSON or PER_GROUP
✓ If PER_GROUP: groupSize is set
✓ PRIMARY_CUSTOMER email field exists in every tour's userFields
✓ hasHotelPickup:true → Custom userField for hotel name/room exists
✓ operatingDays is an array of valid day codes
✓ startTimes are in 24-hour format ("HH:MM")
✓ All ambiguity flags documented
✓ At least 6 highlights
✓ At least 5 inclusions
✓ At least 3 FAQs (minimum; 7 recommended)
✓ Product name ≤80 characters
✓ Images placeholder noted (block go-live if none)
```

---

## Quick Reference: Experience-Type Defaults

| | Desert Safari | Canal Cruise | Museum Ticket | Theater | Guided Tour | Helicopter |
|---|---|---|---|---|---|---|
| `tourType` | TOUR | TOUR | ATTRACTION | EVENT | TOUR | TOUR |
| `flowType` | NORMAL | NORMAL | NORMAL | SVG | NORMAL | NORMAL |
| `inventoryType` | FIXED+FIXED | FIXED+FIXED | FIXED+FLEX | FIXED+FIXED | FIXED+FIXED | FLEX+FIXED |
| `hasHotelPickup` | true | false | false | false | false | false |
| `userFields` scope | PRIMARY only | PRIMARY only | PRIMARY + ALL | PRIMARY only | PRIMARY + ALL | PRIMARY + ALL |
| Custom field | hotel + meal | accessibility | — | — | — | weight |
| Cancel policy | 24hr full | 1hr full | non-refund | non-refund | 24hr full | 24hr full |
| Pricing model | PER_PERSON | PER_PERSON | PER_PERSON | PER_PERSON | PER_PERSON | PER_PERSON (shared) / PER_GROUP (private) |
| Variants by | — (1 var) | — (1 var) | inclusions tier | seat zone | language | access type |
| Duration null? | No | No | Yes | No | No | No |
| `ALL_CUSTOMER` fields? | No | No | Sometimes | No | Yes (name on ticket) | Yes (weight) |

---

## Error Log: What NOT to Do

Based on research findings — these are confirmed wrong patterns:

| ❌ Wrong | ✓ Correct | Why |
|---|---|---|
| `tourType: "DESERT_SAFARI"` | `tourType: "TOUR"` | Only 3 valid tourType values |
| `userFields[].level: "ALL_CUSTOMERS"` | `"ALL_CUSTOMER"` (no S) | Confirmed from live data |
| `inputFields` | `userFields` | Wrong field name |
| `type: "EXPERIENCE"` or any other tourType | Use only ATTRACTION/TOUR/EVENT | Confirmed 3-value enum |
| `duration: 360` (minutes) | `duration: 21600000` (ms) | Duration is always in milliseconds |
| Splitting vegetarian option into 2 variants | Custom userField dropdown | Fragments inventory unnecessarily |
| Audio guide variants for headphone-delivered tours | Single variant with multiple languages | Language array handles it |
| `hasFreeCancellation: true` on non-refundable products | `hasFreeCancellation: false` | Must match policy exactly |
