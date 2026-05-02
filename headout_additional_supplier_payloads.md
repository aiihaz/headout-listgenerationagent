# Headout Content Agent: Additional Supplier Payload Templates

## Cross-Region, Cross-Type Coverage

This document extends the Desert Adventures LLC payload (Dubai / TOUR) to cover:

| # | Supplier | City | tourType | flowType | inventoryType | Key Complexity |
|---|---|---|---|---|---|---|
| 2 | Canal Boats Amsterdam | Amsterdam | TOUR | NORMAL | FIXED_START_FIXED_DURATION | PER_GROUP pricing, multiple languages |
| 3 | Musée du Louvre | Paris | ATTRACTION | NORMAL | FLEXIBLE_START_FLEXIBLE_DURATION | Timed entry, free days, age-free pricing |
| 4 | Broadway Production LLC | New York | EVENT | SVG | FIXED_START_FIXED_DURATION | Seat map, tiered pricing, strict cancellation |
| 5 | Roma Experience | Rome | TOUR | NORMAL | FIXED_START_FIXED_DURATION | ALL_CUSTOMER userFields, multi-language variants |
| 6 | Singapore Flyer | Singapore | ATTRACTION | NORMAL | FLEXIBLE_START_FLEXIBLE_DURATION | Mixed inventory types across variants |
| 7 | Bosphorus Cruise Co. | Istanbul | TOUR | NORMAL | FIXED_START_FIXED_DURATION | PER_GROUP + PER_PERSON mixed, meal option |
| 8 | Sagrada Família | Barcelona | ATTRACTION | NORMAL | FIXED_START_FLEXIBLE_DURATION | Fixed entry windows, tower access variants |
| 9 | Tokyo Sky Tree | Tokyo | ATTRACTION | NORMAL | FLEXIBLE_START_FLEXIBLE_DURATION | Multi-floor variants, seasonal pricing |
| 10 | Cape Town Shark Dive | Cape Town | TOUR | NORMAL | FIXED_START_FIXED_DURATION | Weather-dependent, medical waiver, age min |
| 11 | NYC Helicopter Tours | New York | TOUR | NORMAL | FLEXIBLE_START_FIXED_DURATION | Flexible departure, weight limits, private option |

---

---

## SUPPLIER 2: Canal Boats Amsterdam — Amsterdam Canal Cruise

### Raw Supplier Input (Summary)

```
Supplier: Canal Boats Amsterdam BV
City: Amsterdam, Netherlands
Type: 1-Hour Canal Cruise

DEPARTURES: Every 30 minutes, 10:00 AM – 10:00 PM daily
DURATION: 1 hour (60 minutes)
BOAT CAPACITY: 70 seats per boat
PRICING MODEL: PER_PERSON (not per group)
LANGUAGES: Guided audio tour in: EN, DE, FR, NL, ES, IT, ZH, JA (8 languages — via headphone system)
ROUTE: Departing from Anne Frank House dock, passes Rijksmuseum, Skinny Bridge, Jordaan
INCLUSIONS: Complimentary glass of wine or soft drink
HOTEL PICKUP: No — fixed departure point
CANCELLATION: Free cancellation >1hr before departure
CHILD: Under 4 free; 4–12 at child rate
ACCESSIBILITY: Wheelchair accessible boats available (limited spots)
```

### Design Decisions

- **tourType: `TOUR`** — Narrated cruise with fixed route = TOUR not ATTRACTION
- **flowType: `NORMAL`** — No seat map, no combo
- **inventoryType: `FIXED_START_FIXED_DURATION`** — Fixed departure every 30 min, 1hr duration
- **1 variant** — All languages via audio system (no guide), so no language-based variant split
- **Wheelchair accessible** → `importantInformation` item + `userField` for accessibility needs

### Condensed API Payload

```json
{
  "name": "Amsterdam Canal Cruise — 1 Hour Scenic Tour from Anne Frank House",
  "tourType": "TOUR",
  "flowType": "NORMAL",
  "hasHotelPickup": false,
  "city": { "code": "AMSTERDAM", "name": "Amsterdam" },

  "highlights": [
    "Cruise Amsterdam's iconic UNESCO-listed canal ring for 1 hour",
    "Pass landmarks: Rijksmuseum, Anne Frank House, Skinny Bridge, Jordaan",
    "Audio guide in 8 languages via personal headphone system",
    "Complimentary glass of wine or soft drink included",
    "Wheelchair accessible boats available",
    "Departs every 30 minutes — no waiting around"
  ],

  "inclusions": [
    "1-hour scenic canal cruise",
    "Audio guide in English, German, French, Dutch, Spanish, Italian, Mandarin, Japanese",
    "Complimentary glass of wine or soft drink per person",
    "Wheelchair accessible boat option (subject to availability)"
  ],

  "exclusions": [
    "Hotel pickup/drop-off",
    "Additional food and drinks",
    "Gratuities"
  ],

  "cancellationPolicy": {
    "hasFreeCancellation": true,
    "type": "FULL",
    "cutoffHours": 1
    // Very short window — 1hr is rare but reflects fast-turnover cruise operations
  },

  "variants": [
    {
      "name": "Canal Cruise — Economy Seat",

      "listingPrice": {
        "type": "PER_PERSON",
        "originalPrice": { "currency": "EUR", "value": 18.00 },
        "finalPrice": { "currency": "EUR", "value": 18.00 }
      },

      "paxTypes": [
        { "type": "ADULT", "ageRange": { "min": 13, "max": 99 }, "price": { "currency": "EUR", "value": 18.00 } },
        { "type": "CHILD", "ageRange": { "min": 4, "max": 12 }, "price": { "currency": "EUR", "value": 10.00 } },
        { "type": "INFANT", "ageRange": { "min": 0, "max": 3 }, "price": { "currency": "EUR", "value": 0.00 } }
      ],

      "tours": [
        {
          "inventoryType": "FIXED_START_FIXED_DURATION",
          "duration": 3600000,
          // 1 hour = 3,600,000 ms

          "maxPax": 70,
          "minPax": 1,

          "startTimes": [
            "10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30",
            "14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30",
            "18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30","22:00"
          ],
          // Every 30 minutes 10:00–22:00 (last departure 22:00 returns 23:00)

          "operatingDays": ["MON","TUE","WED","THU","FRI","SAT","SUN"],

          "meetingPoint": {
            "type": "FIXED_LOCATION",
            "name": "Canal Boats Amsterdam — Prinsengracht Dock",
            "address": "Prinsengracht 263, 1016 GV Amsterdam (near Anne Frank House)",
            "coordinates": { "lat": 52.3752, "lng": 4.8840 }
          },

          "languages": ["en","de","fr","nl","es","it","zh","ja"],
          // All delivered via audio headphone system — no live guide language variants needed

          "userFields": [
            {
              "level": "PRIMARY_CUSTOMER",
              "type": { "displayName": "Email" },
              "dataType": "EMAIL",
              "label": "Email Address",
              "required": true
            },
            {
              "level": "PRIMARY_CUSTOMER",
              "type": { "displayName": "Custom" },
              "dataType": null,
              "label": "Accessibility Requirements",
              "placeholder": "e.g. Wheelchair, mobility aid — we will reserve an accessible boat",
              "required": false
            }
            // Note: Short cruise (1hr, daily, casual) — minimal user fields needed
            // No hotel pickup field (pickup=false), no meal field
          ]
        }
      ]
    }
  ],

  // ⚠ AMBIGUITY FLAGS:
  // 1. Peak season (summer) pricing — supplier may have dynamic pricing — confirm
  // 2. Exact accessible boat slot count not provided — flag for operations team
  // 3. Last departure time not confirmed as 10:00 PM — verify with supplier
}
```

---

## SUPPLIER 3: Musée du Louvre — Paris Museum Ticket

### Raw Supplier Input (Summary)

```
Supplier: Réunion des Musées Nationaux (Louvre operator)
City: Paris, France
Type: Skip-the-line Museum Entry Ticket

ENTRY: Flexible entry — visit anytime during opening hours
OPENING HOURS: 9:00 AM – 6:00 PM (9:00 PM on Wed/Fri)
CLOSED: Tuesdays, January 1, May 1, December 25
DURATION: Visitor-defined (avg 3 hours)
CAPACITY: Timed entry windows every 30 min (controlled by museum)
PRICING: PER_PERSON; free for EU residents under 26
INCLUSIONS: Permanent collection access; special exhibitions extra
LANGUAGE: No live guide — self-guided; audio guide app available separately
HOTEL PICKUP: No
CANCELLATION: Non-refundable (standard museum ticket policy)
AGE: Free for under 18 (worldwide); free for EU residents 18–25
```

### Design Decisions

- **tourType: `ATTRACTION`** — Pure ticket access, no guide, no itinerary
- **flowType: `NORMAL`**
- **inventoryType: `FIXED_START_FLEXIBLE_DURATION`** — Entry at a fixed window time, but visitor stays as long as they want
- **Variants**: 2 variants — Standard vs. With Audio Guide (common upsell pattern)
- **Free pricing for under 18** → child price = 0, infant price = 0
- **Closed Tuesdays** → `operatingDays` excludes TUE; `blackoutDates` includes Jan 1, May 1, Dec 25

### Condensed API Payload

```json
{
  "name": "Louvre Museum Skip-the-Line Ticket — Paris",
  "tourType": "ATTRACTION",
  "flowType": "NORMAL",
  "hasHotelPickup": false,
  "city": { "code": "PARIS", "name": "Paris" },

  "highlights": [
    "Skip the long queues with a timed entry ticket to the Louvre",
    "Explore the world's largest art museum at your own pace",
    "See the Mona Lisa, Venus de Milo, and Winged Victory of Samothrace",
    "Over 35,000 works spanning 9,000 years of art history",
    "Free entry for visitors under 18 worldwide",
    "Extended hours on Wednesdays and Fridays until 9:00 PM"
  ],

  "inclusions": [
    "Timed skip-the-line entry ticket to the Louvre",
    "Access to all permanent collection galleries",
    "Museum map and self-guided suggested routes"
  ],

  "exclusions": [
    "Temporary and special exhibitions (ticketed separately)",
    "Audio guide (available as optional add-on variant)",
    "Guided tour",
    "Food and drinks (café available inside)",
    "Coat/bag check fees"
  ],

  "cancellationPolicy": {
    "hasFreeCancellation": false,
    "type": "NON_REFUNDABLE",
    "cutoffHours": 0
    // Standard for museum tickets — confirmed from live Louvre data
  },

  "variants": [
    {
      "name": "Louvre Timed Entry — Standard Ticket",

      "listingPrice": {
        "type": "PER_PERSON",
        "originalPrice": { "currency": "EUR", "value": 22.00 },
        "finalPrice": { "currency": "EUR", "value": 22.00 }
      },

      "paxTypes": [
        { "type": "ADULT", "ageRange": { "min": 18, "max": 99 }, "price": { "currency": "EUR", "value": 22.00 } },
        { "type": "YOUTH", "ageRange": { "min": 0, "max": 17 }, "price": { "currency": "EUR", "value": 0.00 } }
        // Free for ALL visitors under 18 worldwide — confirmed from museum policy
      ],

      "tours": [
        {
          "inventoryType": "FIXED_START_FLEXIBLE_DURATION",
          // Customer selects a 30-min entry window; stays as long as they wish

          "duration": null,
          // Null = flexible; visitor self-determines

          "maxPax": 300,
          // Approximate per-slot cap (museums use controlled entry)

          "startTimes": [
            "09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30",
            "13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00"
            // Last entry 17:00 (museum closes 18:00, need 1hr inside minimum)
          ],

          "extendedStartTimes": {
            "days": ["WED","FRI"],
            "additionalSlots": ["17:30","18:00","18:30","19:00","19:30","20:00"]
          },
          // Wed/Fri extended to 21:00 — last entry 20:00

          "operatingDays": ["MON","WED","THU","FRI","SAT","SUN"],
          // CLOSED TUESDAYS

          "blackoutDates": ["01-01","05-01","12-25"],
          // Jan 1, May Day, Christmas

          "meetingPoint": {
            "type": "FIXED_LOCATION",
            "name": "Louvre Museum — Pyramid Entrance",
            "address": "Rue de Rivoli, 75001 Paris, France",
            "coordinates": { "lat": 48.8606, "lng": 2.3376 }
          },

          "userFields": [
            {
              "level": "PRIMARY_CUSTOMER",
              "type": { "displayName": "Email" },
              "dataType": "EMAIL",
              "label": "Email Address",
              "required": true
            },
            {
              "level": "ALL_CUSTOMER",
              "type": { "displayName": "Full Name" },
              "dataType": "TEXT",
              "label": "Full Name",
              "required": true
              // ↑ Louvre requires name on ticket for each visitor (confirmed from live data:
              //   e-26634 uses ALL_CUSTOMER scope for Louvre)
            }
          ]
        }
      ]
    },

    {
      "name": "Louvre Timed Entry — Ticket + Official Audio Guide App",

      "listingPrice": {
        "type": "PER_PERSON",
        "originalPrice": { "currency": "EUR", "value": 28.00 },
        "finalPrice": { "currency": "EUR", "value": 28.00 }
        // +€6 for audio guide app access code
      },

      "paxTypes": [
        { "type": "ADULT", "ageRange": { "min": 18, "max": 99 }, "price": { "currency": "EUR", "value": 28.00 } },
        { "type": "YOUTH", "ageRange": { "min": 0, "max": 17 }, "price": { "currency": "EUR", "value": 6.00 } }
        // Youth: entry free + audio guide only
      ],

      "tours": [
        {
          "inventoryType": "FIXED_START_FLEXIBLE_DURATION",
          "duration": null,
          "maxPax": 300,
          "operatingDays": ["MON","WED","THU","FRI","SAT","SUN"],
          "blackoutDates": ["01-01","05-01","12-25"],
          // (same as standard variant — shared calendar)

          "userFields": [
            {
              "level": "PRIMARY_CUSTOMER",
              "type": { "displayName": "Email" },
              "dataType": "EMAIL",
              "label": "Email Address (audio guide code will be sent here)",
              "required": true
            },
            {
              "level": "ALL_CUSTOMER",
              "type": { "displayName": "Full Name" },
              "dataType": "TEXT",
              "label": "Full Name",
              "required": true
            }
          ]
        }
      ]
    }
  ]

  // ⚠ AMBIGUITY FLAGS:
  // 1. EU resident 18–25 free policy — cannot verify residency at booking; noted in FAQs only
  // 2. Max pax per slot (300) is estimated — verify with Louvre operations
  // 3. Seasonal hours (summer vs. winter) not specified — flag for operational calendar
}
```

---

## SUPPLIER 4: Broadway Show — NYC (SVG / Seat Map Flow)

### Raw Supplier Input (Summary)

```
Supplier: Broadway Production Services LLC
City: New York, USA
Type: Musical Theater — "Phantom" (hypothetical)
Venue: Majestic Theatre, 247 W 44th St, New York

SHOW TIMES:
  - Tue/Thu/Fri: 7:00 PM
  - Wed/Sat: 2:00 PM and 8:00 PM
  - Sun: 3:00 PM
  - Monday: Dark (no show)

SEATING TIERS:
  - Orchestra Front (rows A–H): $185/seat
  - Orchestra Rear (rows I–T): $135/seat
  - Mezzanine (rows A–E): $115/seat
  - Rear Mezzanine (rows F–K): $89/seat

CANCELLATION: Non-refundable (industry standard for Broadway)
DURATION: ~2.5 hours (including 15-min intermission)
AGE: Not suitable for children under 6
ACCESSIBILITY: Wheelchair spaces available in Orchestra
```

### Design Decisions

- **tourType: `EVENT`** — Live performance, one-time-per-slot, fixed seat
- **flowType: `SVG`** — Seat map booking (confirmed from live F1/entertainment data)
- **inventoryType: `FIXED_START_FIXED_DURATION`** — Exact showtime + 2.5hr duration
- **Variants**: 4 variants (one per seating tier) — each has its own SVG zone and price
- **No `ALL_CUSTOMER` userFields** — Theater tickets don't need per-seat names
- **Non-refundable** — Standard Broadway policy

### Condensed API Payload

```json
{
  "name": "Phantom the Musical — Broadway Tickets at Majestic Theatre, New York",
  "tourType": "EVENT",
  "flowType": "SVG",
  // ↑ Seat map flow — customer sees venue map and picks seats
  "hasHotelPickup": false,
  "city": { "code": "NEW_YORK", "name": "New York" },

  "venue": {
    "name": "Majestic Theatre",
    "address": "247 W 44th St, New York, NY 10036",
    "coordinates": { "lat": 40.7589, "lng": -73.9877 }
  },

  "cancellationPolicy": {
    "hasFreeCancellation": false,
    "type": "NON_REFUNDABLE",
    "cutoffHours": 0
    // Broadway industry standard — no refunds under any circumstances
  },

  "variants": [
    {
      "name": "Orchestra Front (Rows A–H) — Best View",
      "listingPrice": {
        "type": "PER_PERSON",
        "originalPrice": { "currency": "USD", "value": 185.00 },
        "finalPrice": { "currency": "USD", "value": 185.00 }
      },
      "svgZoneId": "ORCHESTRA_FRONT",
      // ↑ SVG flow: maps this variant to zones on the seat map SVG

      "paxTypes": [
        { "type": "ADULT", "ageRange": { "min": 6, "max": 99 }, "price": { "currency": "USD", "value": 185.00 } }
        // Under 6 not permitted — single pax type
      ],

      "tours": [
        {
          "inventoryType": "FIXED_START_FIXED_DURATION",
          "duration": 9000000,
          // 2.5 hours = 9,000,000 ms

          "startTimes": ["19:00"],
          "operatingDays": ["TUE","THU","FRI"],

          "userFields": [
            {
              "level": "PRIMARY_CUSTOMER",
              "type": { "displayName": "Email" },
              "dataType": "EMAIL",
              "label": "Email (tickets will be sent here)",
              "required": true
            }
            // No ALL_CUSTOMER fields — theater doesn't need names per seat
          ]
        },
        {
          "inventoryType": "FIXED_START_FIXED_DURATION",
          "duration": 9000000,
          "startTimes": ["14:00","20:00"],
          "operatingDays": ["WED","SAT"]
          // Matinee + evening on Wed and Sat
        },
        {
          "inventoryType": "FIXED_START_FIXED_DURATION",
          "duration": 9000000,
          "startTimes": ["15:00"],
          "operatingDays": ["SUN"]
        }
      ]
      // Note: Monday = Dark (no tour entry)
    },

    {
      "name": "Orchestra Rear (Rows I–T)",
      "svgZoneId": "ORCHESTRA_REAR",
      "listingPrice": {
        "type": "PER_PERSON",
        "originalPrice": { "currency": "USD", "value": 135.00 },
        "finalPrice": { "currency": "USD", "value": 135.00 }
      }
      // (tours array mirrors Orchestra Front — same showtimes)
    },

    {
      "name": "Mezzanine (Rows A–E)",
      "svgZoneId": "MEZZANINE_FRONT",
      "listingPrice": {
        "type": "PER_PERSON",
        "originalPrice": { "currency": "USD", "value": 115.00 },
        "finalPrice": { "currency": "USD", "value": 115.00 }
      }
    },

    {
      "name": "Rear Mezzanine (Rows F–K) — Best Value",
      "svgZoneId": "MEZZANINE_REAR",
      "listingPrice": {
        "type": "PER_PERSON",
        "originalPrice": { "currency": "USD", "value": 89.00 },
        "finalPrice": { "currency": "USD", "value": 89.00 }
      }
    }
  ]

  // ⚠ AMBIGUITY FLAGS:
  // 1. Exact seat count per zone not provided — required for SVG inventory setup
  // 2. Rush/lottery ticket policy not mentioned — flag for potential future variant
  // 3. Accessibility seat pricing not specified — confirm if standard price applies
  // 4. Season end date not provided — calendar needs closing date
}
```

---

## SUPPLIER 5: Roma Experience — Colosseum Guided Tour

### Raw Supplier Input (Summary)

```
Supplier: Roma Experience SRL
City: Rome, Italy
Type: Colosseum, Roman Forum & Palatine Hill Guided Tour

DEPARTURES: 9:00 AM, 11:00 AM, 2:00 PM, 4:00 PM daily (except Dec 25, Jan 1)
DURATION: 3 hours
GROUP SIZE: Max 15 per guide (small group)
LANGUAGES OFFERED: English, Spanish, French, Italian, German, Mandarin
  → Each language is a SEPARATE tour (separate guide, separate booking)
PRICING: PER_PERSON, same price across all languages
INCLUSIONS: Skip-the-line tickets to Colosseum, Forum, Palatine; expert guide
HOTEL PICKUP: No — meet at Arch of Constantine
CANCELLATION: Free >24 hours; no refund within 24 hours
AGES: Under 18 free entry to the monument (EU residents); guide service charged
ADDITIONAL: Arena floor access available as premium add-on
```

### Design Decisions

- **tourType: `TOUR`** — Guided experience with route and expert commentary
- **6 variants** — one per language (confirmed from live data: language variants are standard)
- **`ALL_CUSTOMER` userFields** — Supplier requires all guest names for skip-the-line ticket issuance (confirmed this is the real pattern from live observations of e-9179)
- **Arena floor add-on** → separate "Arena Floor Access" variant at premium price
- **Child pricing**: Free monument entry but guide service fee applies → child price = guide fee only

### Condensed API Payload

```json
{
  "name": "Colosseum Skip-the-Line Tour with Roman Forum & Palatine Hill — Rome",
  "tourType": "TOUR",
  "flowType": "NORMAL",
  "hasHotelPickup": false,
  "city": { "code": "ROME", "name": "Rome" },

  "highlights": [
    "Skip the line at the Colosseum with a pre-booked skip-the-line ticket",
    "Small group of max 15 — personal attention from your expert guide",
    "Explore the Roman Forum, Palatine Hill, and the Colosseum in one tour",
    "Stand where gladiators fought — vivid storytelling brings ancient Rome to life",
    "Available in 6 languages: English, Spanish, French, Italian, German, Mandarin",
    "Meet at the Arch of Constantine — no hotel pickup, but easy to find"
  ],

  "inclusions": [
    "Expert licensed guide for 3 hours",
    "Skip-the-line entry to the Colosseum",
    "Entry to Roman Forum and Palatine Hill",
    "Small group (max 15 people)"
  ],

  "exclusions": [
    "Hotel pickup/drop-off",
    "Food and drinks",
    "Gratuities (optional)",
    "Arena Floor Access (available as separate upgrade)"
  ],

  "cancellationPolicy": {
    "hasFreeCancellation": true,
    "type": "FULL",
    "cutoffHours": 24
  },

  "variants": [
    // Pattern: one variant per language — shown for English; others mirror
    {
      "name": "Colosseum Guided Tour — English",

      "listingPrice": {
        "type": "PER_PERSON",
        "originalPrice": { "currency": "EUR", "value": 54.00 },
        "finalPrice": { "currency": "EUR", "value": 54.00 }
      },

      "paxTypes": [
        { "type": "ADULT", "ageRange": { "min": 18, "max": 99 }, "price": { "currency": "EUR", "value": 54.00 } },
        { "type": "YOUTH", "ageRange": { "min": 6, "max": 17 }, "price": { "currency": "EUR", "value": 32.00 } },
        // ↑ Guide service fee for youth (monument entry separately handled/free for EU)
        // ⚠ AMBIGUITY: Youth price not specified by supplier — estimate
        { "type": "CHILD", "ageRange": { "min": 0, "max": 5 }, "price": { "currency": "EUR", "value": 0.00 } }
      ],

      "tours": [
        {
          "inventoryType": "FIXED_START_FIXED_DURATION",
          "duration": 10800000,
          // 3 hours = 10,800,000 ms

          "maxPax": 15,
          // Small group confirmed
          "minPax": 1,

          "startTimes": ["09:00","11:00","14:00","16:00"],
          "operatingDays": ["MON","TUE","WED","THU","FRI","SAT","SUN"],
          "blackoutDates": ["12-25","01-01"],

          "meetingPoint": {
            "type": "FIXED_LOCATION",
            "name": "Arch of Constantine",
            "address": "Via Sacra, 00186 Rome RM, Italy (beside Colosseum)",
            "coordinates": { "lat": 41.8893, "lng": 12.4914 }
          },

          "languages": ["en"],
          // This variant = English guide only

          "userFields": [
            {
              "level": "PRIMARY_CUSTOMER",
              "type": { "displayName": "Email" },
              "dataType": "EMAIL",
              "label": "Email Address",
              "required": true
            },
            {
              "level": "PRIMARY_CUSTOMER",
              "type": { "displayName": "Phone Number" },
              "dataType": "PHONE_NUMBER",
              "label": "Contact Phone",
              "required": true
            },
            {
              "level": "ALL_CUSTOMER",
              "type": { "displayName": "Full Name" },
              "dataType": "TEXT",
              "label": "Full Name",
              "placeholder": "As on passport — required for skip-the-line ticket",
              "required": true
              // ↑ CONFIRMED from live data (e-9179): Colosseum tours use ALL_CUSTOMER
              //   full name for each ticket holder
            },
            {
              "level": "ALL_CUSTOMER",
              "type": { "displayName": "Date of Birth" },
              "dataType": "DATE",
              "label": "Date of Birth",
              "placeholder": "DD/MM/YYYY — required to verify youth/child pricing",
              "required": true
            }
          ]
        }
      ]
    },

    {
      "name": "Colosseum Guided Tour — Spanish",
      // (mirrors English — only languages field changes)
      "tours": [{ "languages": ["es"] /* rest identical */ }]
    },
    {
      "name": "Colosseum Guided Tour — French",
      "tours": [{ "languages": ["fr"] }]
    },
    {
      "name": "Colosseum Guided Tour — Italian",
      "tours": [{ "languages": ["it"] }]
    },
    {
      "name": "Colosseum Guided Tour — German",
      "tours": [{ "languages": ["de"] }]
    },
    {
      "name": "Colosseum Guided Tour — Mandarin",
      "tours": [{ "languages": ["zh"] }]
    },

    // PREMIUM VARIANT — Arena Floor Access
    {
      "name": "Colosseum Guided Tour + Arena Floor Access — English",

      "listingPrice": {
        "type": "PER_PERSON",
        "originalPrice": { "currency": "EUR", "value": 79.00 },
        "finalPrice": { "currency": "EUR", "value": 79.00 }
        // +€25 for Arena Floor access
      },

      "tours": [
        {
          "inventoryType": "FIXED_START_FIXED_DURATION",
          "duration": 10800000,
          "maxPax": 15,
          "startTimes": ["09:00","11:00","14:00"],
          // ↑ ⚠ AMBIGUITY: Arena floor may not be available at 4pm — confirm with supplier
          "operatingDays": ["MON","TUE","WED","THU","FRI","SAT","SUN"],
          "languages": ["en"],
          "userFields": [/* same as standard */]
        }
      ]
    }
  ]
}
```

---

## SUPPLIER 6: Bosphorus Cruise Co. — Istanbul

### Raw Supplier Input (Summary)

```
Supplier: Bosphorus Cruise Co.
City: Istanbul, Turkey
Type: 2-Hour Bosphorus Cruise with Lunch OR Dinner

DEPARTURES:
  - Lunch cruise: 12:30 PM daily
  - Dinner cruise: 7:00 PM daily
DURATION: 2 hours
BOAT CAPACITY: 
  - Shared cruise: 100 pax → PER_PERSON pricing
  - Private boat charter: 12 pax max → PER_GROUP pricing
ROUTE: Eminönü dock → passes under Bosphorus Bridge → returns
INCLUSIONS (Shared): 3-course meal, 1 welcome drink, live Turkish music
INCLUSIONS (Private): Full catering service, dedicated host, custom menu option
HOTEL PICKUP: Yes — Istanbul Old Town, Taksim, Sultanahmet hotels
CANCELLATION: Free >48hr; No refund within 48hr
MEAL: Turkish cuisine standard; vegetarian on request
LANGUAGES: English and Turkish (live guide on shared cruise)
```

### Design Decisions

- **2 variants**: Shared (PER_PERSON) + Private Charter (PER_GROUP) — confirmed this is valid from live data
- **tourType: `TOUR`** — Narrated route with live guide, not pure transport
- **2 tours per variant**: Lunch + Dinner departures
- **hasHotelPickup: true** — hotel pickup from 3 areas

```json
{
  "name": "Bosphorus Cruise Istanbul — 2-Hour Scenic Cruise with Meal & Live Music",
  "tourType": "TOUR",
  "flowType": "NORMAL",
  "hasHotelPickup": true,
  "city": { "code": "ISTANBUL", "name": "Istanbul" },

  "cancellationPolicy": {
    "hasFreeCancellation": true,
    "type": "FULL",
    "cutoffHours": 48
  },

  "variants": [
    {
      "name": "Shared Bosphorus Cruise — With 3-Course Meal",

      "listingPrice": {
        "type": "PER_PERSON",
        "originalPrice": { "currency": "USD", "value": 65.00 },
        "finalPrice": { "currency": "USD", "value": 65.00 }
      },

      "paxTypes": [
        { "type": "ADULT", "ageRange": { "min": 12, "max": 99 }, "price": { "currency": "USD", "value": 65.00 } },
        { "type": "CHILD", "ageRange": { "min": 3, "max": 11 }, "price": { "currency": "USD", "value": 35.00 } },
        { "type": "INFANT", "ageRange": { "min": 0, "max": 2 }, "price": { "currency": "USD", "value": 0.00 } }
      ],

      "tours": [
        {
          "inventoryType": "FIXED_START_FIXED_DURATION",
          "duration": 7200000,
          // 2 hours = 7,200,000 ms

          "maxPax": 100,
          "startTimes": ["12:30","19:00"],
          // Both lunch and dinner departures in same tour object
          "operatingDays": ["MON","TUE","WED","THU","FRI","SAT","SUN"],

          "meetingPoint": {
            "type": "HOTEL_PICKUP",
            "description": "Pickup from hotels in Old Town, Taksim, and Sultanahmet. Confirm hotel at booking."
          },

          "languages": ["en","tr"],

          "userFields": [
            {
              "level": "PRIMARY_CUSTOMER",
              "type": { "displayName": "Full Name" },
              "dataType": "TEXT",
              "label": "Lead Guest Name",
              "required": true
            },
            {
              "level": "PRIMARY_CUSTOMER",
              "type": { "displayName": "Phone Number" },
              "dataType": "PHONE_NUMBER",
              "label": "Contact Number",
              "required": true
            },
            {
              "level": "PRIMARY_CUSTOMER",
              "type": { "displayName": "Custom" },
              "dataType": null,
              "label": "Hotel Name & Room Number",
              "placeholder": "e.g. Hotel Sultanahmet Palace, Room 203",
              "required": true
            },
            {
              "level": "PRIMARY_CUSTOMER",
              "type": { "displayName": "Custom" },
              "dataType": null,
              "label": "Meal Preference",
              "options": ["Standard Turkish Menu", "Vegetarian Menu"],
              "required": true
            }
          ]
        }
      ]
    },

    {
      "name": "Private Bosphorus Boat Charter — Up to 12 Guests",

      "listingPrice": {
        "type": "PER_GROUP",
        "groupSize": 12,
        "originalPrice": { "currency": "USD", "value": 650.00 },
        "finalPrice": { "currency": "USD", "value": 650.00 }
        // ↑ PER_GROUP confirmed from live data pattern (e.g. Singapore Flyer VIP)
        // One price for the whole boat regardless of headcount
      },

      "tours": [
        {
          "inventoryType": "FIXED_START_FIXED_DURATION",
          "duration": 7200000,
          "maxPax": 12,
          "minPax": 1,
          "startTimes": ["12:30","19:00"],
          "operatingDays": ["MON","TUE","WED","THU","FRI","SAT","SUN"],

          "userFields": [
            {
              "level": "PRIMARY_CUSTOMER",
              "type": { "displayName": "Full Name" },
              "dataType": "TEXT",
              "label": "Group Organizer Name",
              "required": true
            },
            {
              "level": "PRIMARY_CUSTOMER",
              "type": { "displayName": "Phone Number" },
              "dataType": "PHONE_NUMBER",
              "label": "Contact Number",
              "required": true
            },
            {
              "level": "PRIMARY_CUSTOMER",
              "type": { "displayName": "Custom" },
              "dataType": null,
              "label": "Hotel Name & Address (for pickup)",
              "required": true
            },
            {
              "level": "PRIMARY_CUSTOMER",
              "type": { "displayName": "Custom" },
              "dataType": null,
              "label": "Number of Guests in Group",
              "placeholder": "1–12 guests",
              "required": true
            },
            {
              "level": "PRIMARY_CUSTOMER",
              "type": { "displayName": "Custom" },
              "dataType": null,
              "label": "Meal Preference",
              "options": ["Standard Catering", "Vegetarian", "Custom Menu (contact us)"],
              "required": true
            }
          ]
        }
      ]
    }
  ]
}
```

---

## SUPPLIER 7: NYC Helicopter Tours — Flexible Departure

### Raw Supplier Input (Summary)

```
Supplier: NYC Skyline Helicopters Inc.
City: New York, USA
Type: Manhattan Helicopter Tour — 15-minute flight

DEPARTURE: Customer chooses arrival time; flights depart as soon as helicopter is ready
DURATION: 15 minutes flight time (fixed)
CAPACITY: 6 pax per helicopter (private per group)
PRICING: PER_PERSON — shared seats available
         PER_GROUP — full helicopter private charter
DEPARTURES: 9:00 AM – 7:00 PM daily (last flight 7:00 PM)
WEIGHT LIMIT: Max 300 lbs (136 kg) per passenger
LOCATION: Downtown Manhattan Heliport (VIP Terminal)
HOTEL PICKUP: No
CANCELLATION: Free >24hrs; No refund <24hrs (weather cancellations fully refunded)
AGE: Must be 2+ to fly; under 18 must be with adult
```

### Design Decisions

- **tourType: `TOUR`** — Guided aerial tour with pilot narration
- **inventoryType: `FLEXIBLE_START_FIXED_DURATION`** — Customer arrives, next available flight takes off; duration fixed at 15min
- **2 variants**: Shared seat (PER_PERSON) + Private charter (PER_GROUP)
- **Weight limit** → Custom userField (PER_PERSON) — medical/safety disclosure requirement
- **Weather cancellation** → noted in cancellation policy + FAQs

```json
{
  "name": "Manhattan Helicopter Tour — 15-Minute New York City Skyline Flight",
  "tourType": "TOUR",
  "flowType": "NORMAL",
  "hasHotelPickup": false,
  "city": { "code": "NEW_YORK", "name": "New York" },

  "highlights": [
    "Soar over Manhattan and see NYC from the air in just 15 minutes",
    "Iconic views: Empire State Building, Statue of Liberty, Central Park, Brooklyn Bridge",
    "No fixed departure time — arrive and fly when the helicopter is ready",
    "Option to book a shared seat or a private helicopter (up to 6 guests)",
    "Pilot provides live narration throughout the flight",
    "Departs from Downtown Manhattan Heliport — easy access from lower Manhattan"
  ],

  "cancellationPolicy": {
    "hasFreeCancellation": true,
    "type": "FULL",
    "cutoffHours": 24,
    "notes": "Full refund for cancellations due to weather, regardless of timing"
  },

  "variants": [
    {
      "name": "Shared Helicopter Seat — Manhattan Skyline Tour",

      "listingPrice": {
        "type": "PER_PERSON",
        "originalPrice": { "currency": "USD", "value": 219.00 },
        "finalPrice": { "currency": "USD", "value": 219.00 }
      },

      "paxTypes": [
        { "type": "ADULT", "ageRange": { "min": 2, "max": 99 }, "price": { "currency": "USD", "value": 219.00 } }
        // No child discount — same pricing for all ages 2+
        // Under 2 cannot fly
      ],

      "tours": [
        {
          "inventoryType": "FLEXIBLE_START_FIXED_DURATION",
          // Customer arrives, boards next available flight
          // Duration fixed: 15 min

          "duration": 900000,
          // 15 minutes = 900,000 ms

          "maxPax": 6,
          "minPax": 1,

          "operatingHours": {
            "open": "09:00",
            "close": "19:00",
            "lastEntry": "19:00"
          },
          // No fixed slots — just operating window

          "operatingDays": ["MON","TUE","WED","THU","FRI","SAT","SUN"],

          "meetingPoint": {
            "type": "FIXED_LOCATION",
            "name": "Downtown Manhattan Heliport — VIP Terminal",
            "address": "6 East River Piers, New York, NY 10004",
            "coordinates": { "lat": 40.7013, "lng": -74.0124 }
          },

          "languages": ["en"],

          "userFields": [
            {
              "level": "PRIMARY_CUSTOMER",
              "type": { "displayName": "Email" },
              "dataType": "EMAIL",
              "label": "Email Address",
              "required": true
            },
            {
              "level": "PRIMARY_CUSTOMER",
              "type": { "displayName": "Phone Number" },
              "dataType": "PHONE_NUMBER",
              "label": "Contact Number",
              "required": true
            },
            {
              "level": "ALL_CUSTOMER",
              "type": { "displayName": "Full Name" },
              "dataType": "TEXT",
              "label": "Passenger Full Name",
              "required": true
            },
            {
              "level": "ALL_CUSTOMER",
              "type": { "displayName": "Custom" },
              "dataType": null,
              "label": "Passenger Weight (lbs)",
              "placeholder": "e.g. 180 — required for weight & balance (FAA regulation)",
              "required": true
              // ↑ FAA regulation requires weight disclosure for helicopter flights
              // Max 300 lbs (136 kg) per passenger
            }
          ]
        }
      ]
    },

    {
      "name": "Private Helicopter Charter — Full Aircraft (Up to 6 Guests)",

      "listingPrice": {
        "type": "PER_GROUP",
        "groupSize": 6,
        "originalPrice": { "currency": "USD", "value": 1199.00 },
        "finalPrice": { "currency": "USD", "value": 1199.00 }
        // Full helicopter price regardless of headcount
      },

      "tours": [
        {
          "inventoryType": "FLEXIBLE_START_FIXED_DURATION",
          "duration": 900000,
          "maxPax": 6,
          "minPax": 1,
          "operatingDays": ["MON","TUE","WED","THU","FRI","SAT","SUN"],

          "userFields": [
            {
              "level": "PRIMARY_CUSTOMER",
              "type": { "displayName": "Full Name" },
              "dataType": "TEXT",
              "label": "Group Organizer Name",
              "required": true
            },
            {
              "level": "PRIMARY_CUSTOMER",
              "type": { "displayName": "Phone Number" },
              "dataType": "PHONE_NUMBER",
              "required": true
            },
            {
              "level": "ALL_CUSTOMER",
              "type": { "displayName": "Full Name" },
              "dataType": "TEXT",
              "label": "Passenger Name",
              "required": true
            },
            {
              "level": "ALL_CUSTOMER",
              "type": { "displayName": "Custom" },
              "dataType": null,
              "label": "Passenger Weight (lbs)",
              "required": true
            }
          ]
        }
      ]
    }
  ]

  // ⚠ AMBIGUITY FLAGS:
  // 1. Exact pricing not provided by supplier — all prices estimated
  // 2. Weather policy: "fully refunded" — needs definition (who declares weather cancellation?)
  // 3. Group organizer must be on the flight — confirm or clarify in T&Cs
}
```

---

## Cross-Supplier Pattern Summary

| Pattern | Suppliers | Key Implementation |
|---|---|---|
| **PER_GROUP pricing** | Bosphorus Charter, NYC Helicopter Private | `listingPrice.type: "PER_GROUP"`, `groupSize: N` |
| **PER_PERSON pricing** | All others | `listingPrice.type: "PER_PERSON"` |
| **Language variants** | Colosseum (Roma Experience) | 1 variant per language; same tour structure |
| **Audio language (no variant split)** | Amsterdam Canal | Multiple languages in `languages[]` array; 1 variant |
| **SVG / seat map** | Broadway show | `flowType: "SVG"`, `svgZoneId` per variant |
| **ALL_CUSTOMER userFields** | Colosseum, NYC Helicopter | Names/data needed per passenger |
| **PRIMARY_CUSTOMER only** | Desert Safari, Bosphorus, Amsterdam | Only lead traveler data needed |
| **Custom userField (hotel pickup)** | Desert Safari, Bosphorus, Dubai tour | `type.displayName: "Custom"`, `dataType: null` |
| **Custom userField (meal pref)** | Desert Safari, Bosphorus | Dropdown in Custom field |
| **Custom userField (weight/medical)** | NYC Helicopter | Safety disclosure via Custom field |
| **Non-refundable** | Broadway, Louvre | `hasFreeCancellation: false`, `type: "NON_REFUNDABLE"` |
| **Free cancellation 24hr** | Desert Safari, Colosseum, Helicopter | `hasFreeCancellation: true`, `cutoffHours: 24` |
| **Free cancellation 48hr** | Bosphorus | `cutoffHours: 48` |
| **Flexible inventory** | Louvre, NYC Helicopter (shared) | `FLEXIBLE_START_FIXED_DURATION` or `FIXED_START_FLEXIBLE_DURATION` |
| **Mixed inventory per variant** | (Singapore Flyer pattern) | Standard = FLEXIBLE, VIP = FIXED |
| **Multiple departures** | Desert Safari (2 slots), Colosseum (4 slots), Amsterdam (25 slots) | `startTimes: [array]` |
| **Blackout dates** | Louvre, Colosseum | `blackoutDates: ["MM-DD"]` |
| **Operating days exclusion** | Louvre (closed Tue), Broadway (closed Mon) | Omit day from `operatingDays[]` |
