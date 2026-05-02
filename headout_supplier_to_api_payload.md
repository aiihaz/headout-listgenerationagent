# Headout Content Agent: Supplier Data → API Payload Design

## Overview

This document defines the **complete transformation logic** from raw supplier data into a publish-ready Headout API payload. It covers:

1. **Field mapping table** — every supplier field → which API field it maps to
2. **Agent-generated content** — what the AI writes (name, description, highlights, etc.)
3. **Design decisions** — how ambiguous supplier data is resolved
4. **Ambiguity flags** — what the agent must surface for human review
5. **Full annotated JSON payload** — the exact structure that would be submitted

---

## SUPPLIER 1: Desert Adventures LLC — Dubai

### Raw Supplier Input (Summary)

```
Supplier: Desert Adventures LLC
Location: Dubai, UAE
Experience Type: Evening Desert Safari

ACTIVITIES:
- Dune bashing (4x4 vehicles)
- Camel riding
- Sandboarding
- Henna painting
- Falconry / falcon photo opportunity
- BBQ dinner (buffet)
- Belly dance performance
- Fire show
- Shisha (hookah)
- Photographer on-site

LOGISTICS:
- Departures: 4:00 PM and 4:30 PM daily
- Duration: ~6 hours (return to hotels by ~10:00 PM)
- Capacity: 40 pax per vehicle convoy
- Hotel pickup: Yes — 15 hotels in Dubai Marina + JBR area

CANCELLATION POLICY:
- >24 hours before: Full refund
- 24–48 hours before: 50% refund
- <24 hours: No refund

MEAL:
- Standard: BBQ buffet (non-vegetarian)
- Vegetarian: Available on request

PRICING:
- Not provided by supplier
- GYG competitor listing: from $42 AED equivalent

GUIDE LANGUAGE: Not specified
AGE RESTRICTIONS: Not specified
PRIVATE OPTION: Not mentioned
CHILD PRICING: Not specified
```

---

## SECTION 1: Transformation Decision Map

### 1.1 Experience Type Classification

| Supplier Signal | Agent Decision | Reasoning |
|---|---|---|
| "Desert safari", dune bashing, camel ride | `tourType: "TOUR"` | Desert safaris with guide, transport, and itinerary = TOUR (confirmed from live data) |
| Fixed 4pm / 4:30pm departures | `flowType: "NORMAL"` | Not a seat map (SVG) or bundled combo |
| 2 fixed daily departure times | `inventoryType: "FIXED_START_FIXED_DURATION"` | Customer picks a date + one of the fixed time slots |
| ~6 hours duration | `duration: 21600000` | 6 × 60 × 60 × 1000 = 21,600,000 ms |
| 40 pax per convoy | `maxPax: 40` per variant-tour |
| Hotel pickup from 15 hotels | `hasHotelPickup: true` (product level) |
| BBQ + activity | Single variant (not multi-day, not language-split) |
| Vegetarian available | → `userField` (meal preference) — see 1.4 |

### 1.2 Variant Strategy

**Decision: 1 variant with a meal preference userField (not 2 variants)**

Rationale: Creating 2 variants (BBQ / Vegetarian) would fragment availability and require double inventory management. A `userField` for meal preference is the correct pattern — it captures the preference per booking without splitting capacity pools.

If supplier later introduces price differential for vegetarian → upgrade to 2 variants.

### 1.3 Departure Slot Strategy

**Decision: 2 time slots within the single variant**

Both 4:00 PM and 4:30 PM departures run daily. These are modeled as two `startTime` slots on the same day in the inventory calendar — not 2 separate variants. The customer picks date → then sees "4:00 PM" or "4:30 PM" options.

```
slots: [
  { startTime: "16:00", label: "4:00 PM Departure" },
  { startTime: "16:30", label: "4:30 PM Departure" }
]
```

### 1.4 userField Strategy

Based on live observations: Desert safari products use `PRIMARY_CUSTOMER` scope for contact info + hotel pickup field. Meal preference is added as a `Custom` type field.

```
userFields:
  PRIMARY_CUSTOMER:
    - Full Name    (type: TEXT)
    - Email        (type: EMAIL)
    - Phone        (type: PHONE_NUMBER)
    - Hotel Name & Room Number  (type: Custom) ← hasHotelPickup
    - Meal Preference           (type: Custom) ← vegetarian option
```

No `ALL_CUSTOMER` fields — supplier didn't request per-person data (e.g., no passports, no per-pax names for camel rides).

### 1.5 Cancellation Policy Mapping

| Supplier Policy | Headout Field |
|---|---|
| >24hr: full refund | `hasFreeCancellation: true` |
| 24–48hr: 50% refund | `cancellationPolicy.type: "PARTIAL"` |
| <24hr: no refund | `cancellationPolicy.cutoffHours: 24` |

### 1.6 Pricing Strategy

**⚠ AMBIGUITY FLAG — Pricing not provided by supplier**

Agent-recommended pricing:
- Adult: $55 USD (Headout typically prices 10–30% above GYG baseline of $42)
- Child (3–12): $35 USD (estimated — REQUIRES supplier confirmation)
- Infant (0–2): Free (standard industry practice)

**Human review required before go-live.**

---

## SECTION 2: Agent-Generated Content

The agent writes all customer-facing copy from the supplier activity list + standard desert safari conventions.

### 2.1 Product Name

```
Evening Desert Safari with Dune Bashing, Camel Ride & BBQ Dinner in Dubai
```

**Naming formula:** `[Time of day] + [Experience Type] + [Top 3 Activities] + [Location]`
**Character count:** 72 (Headout recommended: <80)

### 2.2 Short Description (for listing card)

```
Escape the city for an unforgettable desert adventure. Ride over golden 
dunes in a 4x4, try sandboarding, meet a falcon, and feast on a BBQ 
buffet under the stars — complete with belly dancing and fire shows.
```

### 2.3 Full Description

```
Experience the magic of the Arabian desert on this action-packed evening 
safari departing from your Dubai Marina or JBR hotel.

Your adventure begins with a thrilling dune bashing session — buckle up 
as your expert driver navigates the towering sand dunes in a powerful 4x4. 
Once in the heart of the desert, slow down and soak in the landscape with 
a serene camel ride at sunset.

Try your hand at sandboarding down the slopes, get a beautiful henna 
design painted on your hand, and capture a once-in-a-lifetime photo with 
a majestic Arabian falcon.

As the sun sets and the desert cools, settle into a traditional Bedouin-
style camp for a lavish BBQ dinner buffet. Watch as talented performers 
take the stage — a mesmerizing belly dance followed by a breathtaking 
fire show. Round off the evening with shisha under a canopy of stars.

Hotel pickup and drop-off from Dubai Marina and JBR hotels is included. 
Vegetarian meals are available on request.
```

### 2.4 Highlights (bulleted, max 6)

```
- Thrilling dune bashing in a 4x4 across the Arabian desert
- Sunset camel ride and sandboarding experience
- Photo opportunity with a trained Arabian falcon
- Lavish BBQ dinner buffet under the stars
- Live entertainment: belly dancing and fire show
- Hotel pickup and drop-off from Dubai Marina & JBR included
```

### 2.5 Inclusions

```
- Hotel pickup and drop-off (Dubai Marina & JBR area hotels)
- Dune bashing in a 4x4 vehicle
- Camel riding
- Sandboarding
- Henna painting
- Falcon photo opportunity
- On-site professional photographer
- BBQ buffet dinner (vegetarian option available on request)
- Belly dance and fire show performances
- Shisha (hookah)
- Mineral water and soft drinks
```

### 2.6 Exclusions

```
- Alcoholic beverages
- Gratuities / tips for guides and drivers (optional but appreciated)
- Personal travel insurance
- Any activities not mentioned in the inclusions
- Hotel pickup from areas outside Dubai Marina and JBR
```

### 2.7 Important Information / Know Before You Go

```
- Wear comfortable, light clothing; long sleeves recommended for sun protection
- Closed-toe shoes advised for sandboarding
- Guests with back problems, heart conditions, or pregnancy should avoid dune bashing
- Vegetarian meal must be requested at time of booking
- Photo opportunities are included but professional photo packages may cost extra
- Shisha consumption is at the guest's discretion; not suitable for children
- The camp location is in the desert — mobile network may be limited
```

### 2.8 FAQs

```
Q: Is hotel pickup included?
A: Yes — we offer complimentary pickup and drop-off from all major hotels 
in the Dubai Marina and JBR (Jumeirah Beach Residence) areas. Please 
provide your hotel name and room number at booking. Pickup times vary 
by hotel location and will be confirmed by your guide.

Q: What time does the safari start and end?
A: Departures are available at 4:00 PM and 4:30 PM daily. The safari 
lasts approximately 6 hours, returning you to your hotel by around 
10:00 PM to 10:30 PM.

Q: Is a vegetarian meal available?
A: Yes — a vegetarian meal option is available on request. Please select 
"Vegetarian" in the meal preference field at time of booking so we can 
prepare accordingly.

Q: Is dune bashing safe?
A: Dune bashing is conducted by professional drivers in well-maintained 
4x4 vehicles. It involves sudden movements and inclines — guests with 
back problems, heart conditions, recent surgery, or pregnancy are advised 
to skip this activity and enjoy the camp experience instead.

Q: Is this suitable for children?
A: Yes, the safari is family-friendly. Children under 3 are generally 
admitted free. Please note that dune bashing may not be suitable for 
very young children or those with motion sensitivity. Child pricing 
applies to ages 3–12.

Q: What should I wear?
A: Light, comfortable clothing is recommended. Avoid white or very pale 
clothing as sand can stain. Closed-toe shoes are advised for 
sandboarding. A light jacket or layer is useful as desert evenings 
can be cool.

Q: What is the cancellation policy?
A: Cancellations made more than 24 hours before the tour start time 
receive a full refund. Cancellations within 24–48 hours receive a 
50% refund. No refund is available for cancellations within 24 hours 
of the tour.
```

---

## SECTION 3: Full Annotated API Payload

The following is the complete product object that would be submitted to create this listing. Fields are annotated with their source.

```json
{
  // ─────────────────────────────────────────────
  // PRODUCT-LEVEL FIELDS
  // ─────────────────────────────────────────────

  "id": null,
  // ↑ Assigned by Headout on creation; null on POST

  "name": "Evening Desert Safari with Dune Bashing, Camel Ride & BBQ Dinner in Dubai",
  // ↑ AGENT-GENERATED — formula: [time-of-day] + [type] + [top activities] + [city]

  "description": "Experience the magic of the Arabian desert on this action-packed evening safari departing from your Dubai Marina or JBR hotel...",
  // ↑ AGENT-GENERATED — see Section 2.3 for full text

  "tourType": "TOUR",
  // ↑ AGENT-CLASSIFIED — confirmed from live data: desert safaris = TOUR (not ATTRACTION/EVENT)
  
  "flowType": "NORMAL",
  // ↑ AGENT-CLASSIFIED — not seat-map (SVG), not bundled (COMBO); straight single-product booking

  "hasHotelPickup": true,
  // ↑ FROM SUPPLIER — "Hotel pickup: Yes — 15 hotels in Dubai Marina + JBR"

  "city": {
    "code": "DUBAI",
    "name": "Dubai"
  },
  // ↑ FROM SUPPLIER — location: Dubai, UAE

  "canonicalUrl": "/dubai/evening-desert-safari-dune-bashing-camel-ride-bbq-dinner-e-{ID}/",
  // ↑ SYSTEM-GENERATED — Headout slugifies the name + appends e-{ID}

  "primaryCategory": {
    "id": null,
    "name": "Desert Safari",
    "slug": "desert-safari"
  },
  // ↑ AGENT-CLASSIFIED — matches Headout's category taxonomy for Dubai desert experiences

  "subCategory": {
    "id": null,
    "name": "Evening Safari",
    "slug": "evening-safari"
  },

  "highlights": [
    "Thrilling dune bashing in a 4x4 across the Arabian desert",
    "Sunset camel ride and sandboarding experience",
    "Photo opportunity with a trained Arabian falcon",
    "Lavish BBQ dinner buffet under the stars",
    "Live entertainment: belly dancing and fire show",
    "Hotel pickup and drop-off from Dubai Marina & JBR included"
  ],
  // ↑ AGENT-GENERATED — extracted from supplier activity list, rewritten for customer appeal

  "inclusions": [
    "Hotel pickup and drop-off (Dubai Marina & JBR area hotels)",
    "Dune bashing in a 4x4 vehicle",
    "Camel riding",
    "Sandboarding",
    "Henna painting",
    "Falcon photo opportunity",
    "On-site professional photographer",
    "BBQ buffet dinner (vegetarian option available on request)",
    "Belly dance and fire show performances",
    "Shisha (hookah)",
    "Mineral water and soft drinks"
  ],
  // ↑ AGENT-GENERATED — derived from supplier activity list + standard industry inclusions

  "exclusions": [
    "Alcoholic beverages",
    "Gratuities / tips for guides and drivers",
    "Personal travel insurance",
    "Hotel pickup from areas outside Dubai Marina and JBR"
  ],
  // ↑ AGENT-GENERATED — standard desert safari exclusions + inferred from supplier scope

  "importantInformation": [
    "Wear comfortable, light clothing; long sleeves recommended for sun protection",
    "Guests with back problems, heart conditions, or pregnancy should avoid dune bashing",
    "Vegetarian meal must be requested at time of booking",
    "Closed-toe shoes advised for sandboarding"
  ],
  // ↑ AGENT-GENERATED — standard safety + operational info for this activity type

  "faqs": [
    {
      "question": "Is hotel pickup included?",
      "answer": "Yes — we offer complimentary pickup and drop-off from all major hotels in the Dubai Marina and JBR areas. Please provide your hotel name and room number at booking."
    },
    {
      "question": "What time does the safari start and end?",
      "answer": "Departures are at 4:00 PM and 4:30 PM daily. The safari lasts approximately 6 hours, returning you to your hotel by around 10:00 PM–10:30 PM."
    },
    {
      "question": "Is a vegetarian meal available?",
      "answer": "Yes — select 'Vegetarian' in the meal preference field at booking. Non-vegetarian BBQ is served by default."
    },
    {
      "question": "Is dune bashing safe?",
      "answer": "Dune bashing is led by professional drivers. Guests with back problems, heart conditions, recent surgery, or pregnancy are advised to skip this activity."
    },
    {
      "question": "Is this suitable for children?",
      "answer": "Yes, the safari is family-friendly. Children under 3 are generally admitted free. Dune bashing may not be suitable for very young children."
    },
    {
      "question": "What should I wear?",
      "answer": "Light, comfortable clothing. Avoid white. Closed-toe shoes recommended. Bring a light jacket for the cool desert evening."
    },
    {
      "question": "What is the cancellation policy?",
      "answer": "Full refund if cancelled >24 hours before. 50% refund if cancelled 24–48 hours before. No refund within 24 hours of tour."
    }
  ],
  // ↑ AGENT-GENERATED — see Section 2.8 for full versions

  "cancellationPolicy": {
    "hasFreeCancellation": true,
    "type": "PARTIAL",
    "cutoffHours": 24,
    "refundPercentages": [
      { "hoursBeforeStart": 48, "refundPercent": 100 },
      { "hoursBeforeStart": 24, "refundPercent": 50 },
      { "hoursBeforeStart": 0, "refundPercent": 0 }
    ]
  },
  // ↑ FROM SUPPLIER — "24hr full refund / 24–48hr 50% refund / <24hr no refund"
  // hasFreeCancellation: true because >24hr window exists for full refund

  // ─────────────────────────────────────────────
  // VARIANTS ARRAY
  // 1 variant: "Shared Evening Desert Safari"
  // (Private not mentioned by supplier)
  // ─────────────────────────────────────────────

  "variants": [
    {
      "id": null,
      // ↑ Assigned on creation

      "name": "Shared Evening Desert Safari",
      // ↑ AGENT-GENERATED — "Shared" distinguishes from private (which may be added later)

      "description": "Join a group desert safari departing from your Dubai Marina or JBR hotel. Includes all activities and BBQ dinner.",
      // ↑ AGENT-GENERATED

      "listingPrice": {
        "type": "PER_PERSON",
        "originalPrice": {
          "currency": "USD",
          "value": 55.00
        },
        "finalPrice": {
          "currency": "USD",
          "value": 55.00
        }
      },
      // ↑ ⚠ AMBIGUITY FLAG — Price NOT provided by supplier.
      //   Agent-suggested: $55 USD adult (based on GYG ~$42 + Headout premium)
      //   REQUIRES supplier confirmation before go-live.
      //   Child/infant pricing also TBD — see paxTypes below.

      "paxTypes": [
        {
          "type": "ADULT",
          "label": "Adult",
          "ageRange": { "min": 13, "max": 99 },
          "price": { "currency": "USD", "value": 55.00 }
        },
        {
          "type": "CHILD",
          "label": "Child",
          "ageRange": { "min": 3, "max": 12 },
          "price": { "currency": "USD", "value": 35.00 }
          // ↑ ⚠ AMBIGUITY FLAG — Child price not provided by supplier.
          //   Estimated at ~64% of adult rate (standard for this category).
          //   REQUIRES supplier confirmation.
        },
        {
          "type": "INFANT",
          "label": "Infant",
          "ageRange": { "min": 0, "max": 2 },
          "price": { "currency": "USD", "value": 0.00 }
          // ↑ AGENT-INFERRED — Industry standard: under 3 free on laps.
          //   Confirm with supplier.
        }
      ],

      "tours": [
        {
          // ─────────────────────────────────────
          // TOUR-LEVEL (the bookable unit)
          // ─────────────────────────────────────

          "inventoryType": "FIXED_START_FIXED_DURATION",
          // ↑ FROM SUPPLIER — two fixed departure times (4pm, 4:30pm) + fixed 6hr duration

          "duration": 21600000,
          // ↑ FROM SUPPLIER — ~6 hours = 6 × 3,600,000 ms = 21,600,000 ms

          "maxPax": 40,
          // ↑ FROM SUPPLIER — "capacity: 40 pax per trip"

          "minPax": 1,
          // ↑ AGENT-INFERRED — shared safari; no minimum mentioned → 1

          "startTimes": ["16:00", "16:30"],
          // ↑ FROM SUPPLIER — "Departures: 4:00 PM and 4:30 PM daily"
          // These appear as time slot options after the customer selects a date.

          "operatingDays": ["MON","TUE","WED","THU","FRI","SAT","SUN"],
          // ↑ FROM SUPPLIER — "daily"

          "meetingPoint": {
            "type": "HOTEL_PICKUP",
            "description": "Your guide will pick you up from your hotel lobby. Exact pickup time will be confirmed 24 hours before the tour. Pickup available from Dubai Marina and JBR area hotels.",
            "coordinates": null
            // ↑ FROM SUPPLIER — hotel pickup; no single meeting point
            // Coordinates null since pickup varies by hotel
          },

          "languages": ["en"],
          // ↑ ⚠ AMBIGUITY FLAG — Guide language NOT specified by supplier.
          //   Defaulting to English (most common for Dubai tourist safaris).
          //   Arabic also likely available — REQUIRES supplier confirmation.

          // ─────────────────────────────────────
          // USER FIELDS (booking input fields)
          // Based on: hasHotelPickup=true + vegetarian option
          // Confirmed pattern from live desert safari products
          // ─────────────────────────────────────

          "userFields": [
            {
              "level": "PRIMARY_CUSTOMER",
              "type": {
                "displayName": "Full Name"
              },
              "dataType": "TEXT",
              "label": "Lead Traveller Full Name",
              "placeholder": "As it appears on your passport",
              "required": true
            },
            {
              "level": "PRIMARY_CUSTOMER",
              "type": {
                "displayName": "Email"
              },
              "dataType": "EMAIL",
              "label": "Email Address",
              "placeholder": "For booking confirmation",
              "required": true
            },
            {
              "level": "PRIMARY_CUSTOMER",
              "type": {
                "displayName": "Phone Number"
              },
              "dataType": "PHONE_NUMBER",
              "label": "Contact Phone Number",
              "placeholder": "Including country code (e.g. +971 50 123 4567)",
              "required": true
            },
            {
              "level": "PRIMARY_CUSTOMER",
              "type": {
                "displayName": "Custom"
              },
              "dataType": null,
              // ↑ Confirmed from live data: Custom fields have dataType: null
              "label": "Hotel Name & Room Number",
              "placeholder": "e.g. Marriott JBR, Room 408",
              "required": true
              // ↑ FROM SUPPLIER — hotel pickup requires address/room for driver
            },
            {
              "level": "PRIMARY_CUSTOMER",
              "type": {
                "displayName": "Custom"
              },
              "dataType": null,
              "label": "Meal Preference",
              "placeholder": "Standard (BBQ) or Vegetarian",
              "options": ["Standard (BBQ)", "Vegetarian"],
              "required": true
              // ↑ FROM SUPPLIER — "Vegetarian: Available on request"
              // Design decision: userField dropdown vs. separate variant
              // → userField chosen to avoid splitting capacity pool
            }
          ]
        }
      ]
    }
  ],

  // ─────────────────────────────────────────────
  // MEDIA (images — placeholders)
  // ─────────────────────────────────────────────

  "images": [
    {
      "url": "TBD — dune bashing hero image",
      "altText": "4x4 vehicle cresting a sand dune at sunset in Dubai desert",
      "isPrimary": true
    },
    {
      "url": "TBD — camel ride at sunset",
      "altText": "Guests on camel ride at sunset in Arabian desert"
    },
    {
      "url": "TBD — BBQ camp at night",
      "altText": "Bedouin-style desert camp with BBQ dinner setup and fire show"
    },
    {
      "url": "TBD — belly dance performer",
      "altText": "Traditional belly dancer performing at desert camp"
    },
    {
      "url": "TBD — falcon photo",
      "altText": "Guest posing with Arabian falcon in the desert"
    }
  ],
  // ↑ ⚠ AMBIGUITY FLAG — No images provided by supplier.
  //   Agent recommends 5+ images. Sources: supplier-provided stock, licensed desert safari images.
  //   Primary image must show dune bashing or landscape for CTR.

  // ─────────────────────────────────────────────
  // SEO / TAGS
  // ─────────────────────────────────────────────

  "tags": [
    "desert safari",
    "dune bashing",
    "camel ride",
    "BBQ dinner",
    "Dubai activities",
    "evening tour",
    "sandboarding",
    "belly dance",
    "family-friendly",
    "hotel pickup"
  ],
  // ↑ AGENT-GENERATED — keyword-rich tags for search discoverability

  "seoTitle": "Evening Desert Safari Dubai — Dune Bashing, Camel Ride & BBQ Dinner",
  "seoDescription": "Book an evening desert safari in Dubai with dune bashing, camel rides, sandboarding, henna, BBQ dinner, belly dance, and fire show. Hotel pickup from Dubai Marina & JBR included."
  // ↑ AGENT-GENERATED — SEO-optimized; includes primary keywords + differentiators
}
```

---

## SECTION 4: Inventory Calendar API Payload

This is what the calendar/availability API would receive when supplier sets up inventory for a given date range.

```json
{
  "tourGroupId": "{ASSIGNED_ID}",
  "tourId": "{ASSIGNED_TOUR_ID}",
  
  "availability": {
    "type": "RECURRING",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    
    "slots": [
      {
        "startTime": "16:00",
        "localStartTimestamp": "2024-01-01T16:00:00+04:00",
        "remainingInventory": 40,
        "maxPax": 40,
        "status": "AVAILABLE",
        "duration": 21600000
      },
      {
        "startTime": "16:30",
        "localStartTimestamp": "2024-01-01T16:30:00+04:00",
        "remainingInventory": 40,
        "maxPax": 40,
        "status": "AVAILABLE",
        "duration": 21600000
      }
    ],
    
    "blackoutDates": [],
    // ↑ ⚠ AMBIGUITY FLAG — No blackout dates provided by supplier.
    //   Common desert safari blackout: Ramadan fasting hours (partial blackout).
    //   Sandstorm closure policy: unclear. REQUIRES supplier confirmation.
    
    "timezone": "Asia/Dubai"
    // ↑ AGENT-INFERRED — Dubai is UTC+4, no daylight saving
  }
}
```

---

## SECTION 5: Booking POST Payload (What Headout Sends When Customer Books)

```json
{
  "variantId": "{ASSIGNED_VARIANT_ID}",
  "tourId": "{ASSIGNED_TOUR_ID}",
  "startDate": "2024-03-15",
  "startTime": "16:00",
  
  "paxDetails": [
    { "type": "ADULT", "count": 2 },
    { "type": "CHILD", "count": 1 },
    { "type": "INFANT", "count": 0 }
  ],
  
  "totalPrice": {
    "currency": "USD",
    "value": 145.00
    // 2 × $55 (adult) + 1 × $35 (child)
  },
  
  "userFieldValues": {
    "primary_customer": {
      "Full Name": "Sarah Johnson",
      "Email": "sarah.j@email.com",
      "Phone Number": "+44 7700 900123",
      "Hotel Name & Room Number": "The Address Beach Resort, Room 1205",
      "Meal Preference": "Standard (BBQ)"
      // OR: "Vegetarian" if selected
    }
  },
  
  "cancellationPolicy": {
    "cutoffTimestamp": "2024-03-14T16:00:00+04:00",
    "refundOnCancellation": {
      "before48h": { "currency": "USD", "value": 145.00 },
      "before24h": { "currency": "USD", "value": 72.50 },
      "after24h": { "currency": "USD", "value": 0.00 }
    }
  }
}
```

---

## SECTION 6: Ambiguity Flags Summary

All items below require human review / supplier clarification before the listing can go live.

| # | Field | Status | Agent Default | Action Required |
|---|---|---|---|---|
| 1 | **Adult Price** | ❌ NOT PROVIDED | $55 USD (est.) | Confirm with supplier |
| 2 | **Child Price** | ❌ NOT PROVIDED | $35 USD (est.) | Confirm with supplier |
| 3 | **Infant Policy** | ❌ NOT PROVIDED | Free (0–2 yrs) | Confirm with supplier |
| 4 | **Guide Language** | ❌ NOT SPECIFIED | English only | Confirm; Arabic likely also available |
| 5 | **Age Restrictions** | ❌ NOT SPECIFIED | None (all ages) | Confirm minimum age for dune bashing |
| 6 | **Hotel List** | ⚠ PARTIAL | "Dubai Marina + JBR" | Provide exact hotel name list for display |
| 7 | **Blackout Dates** | ❌ NOT PROVIDED | None | Confirm Ramadan / sandstorm closure policy |
| 8 | **Images** | ❌ NOT PROVIDED | Placeholder | Supplier to provide 5+ product images |
| 9 | **Private Option** | ❓ UNCLEAR | Not offered | Confirm if private tour can be added as variant |
| 10 | **Shisha for Minors** | ⚠ POLICY NEEDED | Not offered to under-18 | Add explicit age restriction note |

---

## SECTION 7: Agent Decision Log

For auditability, every non-trivial decision is logged here.

| Decision | Alternatives Considered | Reason Chosen |
|---|---|---|
| `tourType: "TOUR"` | ATTRACTION (wrong — no ticket gate), EVENT (wrong — not one-time) | Desert safaris with guided activities confirmed as TOUR in live data |
| 1 variant (not 2) | 2 variants: BBQ / Vegetarian | Vegetarian is preference, not different experience. Splitting variants fragments inventory. |
| Meal preference as userField | Separate variants, or omit | Cleanest UX; collects preference per booking; no inventory impact |
| 2 slots in 1 tour (not 2 tours) | 2 separate tours, 2 separate variants | Same experience, same price, same capacity — only start time differs. Slot model is correct. |
| `hasFreeCancellation: true` | false | >24hr window = full refund = qualifies for free cancellation badge |
| `PRIMARY_CUSTOMER` only (no `ALL_CUSTOMER`) | ALL_CUSTOMER for all names | Supplier didn't request per-pax data; no passport/ID requirement mentioned |
| Price in USD | AED local currency | Headout displays in traveller's local currency; USD is standard input |
| English as default language | Arabic, Hindi | Most common guide language for Dubai tourist products; agent cannot assume without confirmation |

---

## SECTION 8: Supplier-to-API Field Mapping Table

| Supplier Data Field | API Field | Transformation |
|---|---|---|
| "Desert safari" | `tourType: "TOUR"` | Classification |
| "4:00 PM and 4:30 PM daily" | `startTimes: ["16:00","16:30"]`, `operatingDays: [all]` | Time conversion + recurring flag |
| "~6 hours" | `duration: 21600000` | Hours × 3,600,000 ms |
| "40 pax per trip" | `maxPax: 40` | Direct mapping |
| "Hotel pickup: Yes" | `hasHotelPickup: true` + Custom userField | Product flag + booking input |
| "Vegetarian available" | Custom userField with dropdown | Preference capture without variant split |
| ">24hr: full refund" | `hasFreeCancellation: true`, cutoffHours: 24 | Policy mapping |
| "24–48hr: 50% refund" | `cancellationPolicy.refundPercentages[1]` | Partial refund tier |
| Activity list (10 items) | `inclusions[]`, `highlights[]`, `description` | Content generation |
| GYG competitor at $42 | Recommended price: $55 | Headout premium positioning |
| Dubai Marina + JBR hotels | `meetingPoint.type: "HOTEL_PICKUP"` + description | Pickup scope definition |
| Not provided: guide language | `languages: ["en"]` (default) | Agent default + flag |
| Not provided: pricing | Estimated $55/$35/free | Agent estimate + flag |
| Not provided: images | Placeholder entries | Flag for supplier to provide |
