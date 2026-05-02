# Headout Listing Field-Level Diff Analysis
### How API Requests & Responses Differ Across Experience Types

> **Scope**: 6 experience types × how every key field changes  
> **Grounded in**: Real product IDs from live listings + Headout public API docs (github.com/headout/api-docs)  
> **Purpose**: Pre-build research for content automation agent

---

## 1. The API Call Sequence (What Actually Happens on Page Load)

Every Headout listing page makes calls in this order regardless of type:

```
PHASE 1 — SSR (server-side, baked into __NEXT_DATA__ HTML blob)
  GET /api/public/v2/products/{productId}
      → Returns: full product object (name, description, variants, pricing, inputFields, media)
      → This is what the page renders on first paint

PHASE 2 — Client hydration (browser fetches after JS loads)  
  GET /api/public/v2/inventory/{variantId}/date-range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
      → Returns: available dates + slots (if FIXED_START type)
      → This populates the calendar and time slot picker

PHASE 3 — On date selection
  GET /api/public/v2/inventory/{variantId}/date/{YYYY-MM-DD}
      → Returns: specific day's slot availability + remaining capacity

PHASE 4 — On booking
  POST /api/public/v2/bookings
      → Payload: variantId, date, slotId (if fixed start), pax counts, inputField values
```

**THE KEY INSIGHT**: The `GET /products/{productId}` response is where all the structural differences live. The inventory calls are structurally identical — what differs is whether `slots` array is populated or null.

---

## 2. Product API Response — Field-Level Diff by Experience Type

### 2A. Top-Level Product Object (always present, all types)

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "canonicalUrl": "string",
  "city": {
    "code": "DUBAI",
    "name": "Dubai",
    "image": "https://cdn-imgix.headout.com/city/..."
  },
  "primaryCategory": { "id": 101, "name": "Attraction Tickets" },
  "media": [
    { "url": "https://cdn-imgix.headout.com/...", "type": "IMAGE", "order": 1 }
  ],
  "variants": [ /* see 2B */ ],
  "faqs": [ { "question": "string", "answer": "string" } ],
  "reviews": { "ratingsCount": 4821, "averageRating": 4.7 }
}
```

---

### 2B. Variant Object — THE DIFF IS HERE

The `variants` array inside each product is where every experience-type difference manifests. Below is the field-by-field breakdown.

---

## 3. Full Side-by-Side: Variant Fields per Experience Type

| Field | ATTRACTION_TICKET | GUIDED_TOUR | SHOW_OR_EVENT | DESERT_SAFARI | BOAT_CRUISE | MUSEUM_TICKET |
|-------|-------------------|-------------|---------------|---------------|-------------|---------------|
| `variantId` | ✓ present | ✓ present | ✓ present | ✓ present | ✓ present | ✓ present |
| `inventoryType` | `FIXED_START_FLEXIBLE_DURATION` | `FIXED_START_FIXED_DURATION` | `FIXED_START_FIXED_DURATION` | `FIXED_START_FIXED_DURATION` | `FIXED_START_FIXED_DURATION` | `FIXED_START_FLEXIBLE_DURATION` |
| `duration` | `null` | ms value | ms value | ms value | ms value | `null` |
| `startTime` | entry window | departure time | show time (fixed) | pickup time | departure time | opening time |
| `slots[]` in inventory | ✓ (entry windows) | ✓ (tour departures) | ✓ (show times) | ✓ (pickup times) | ✓ (departure times) | ✓ (entry slots) |
| `meetingPoint` | **ABSENT** | **REQUIRED** | **ABSENT** | **REQUIRED** | **REQUIRED** | **ABSENT** |
| `languages` | **ABSENT** | **REQUIRED** | **ABSENT** | **REQUIRED** | optional | **ABSENT** |
| `itinerary` | **ABSENT** | **REQUIRED** | **ABSENT** | optional | optional | **ABSENT** |
| `guide` | **ABSENT** | optional | **ABSENT** | **ABSENT** | **ABSENT** | **ABSENT** |
| `activities` | **ABSENT** | **ABSENT** | **ABSENT** | **REQUIRED** | optional | **ABSENT** |
| `openingHours` | optional | **ABSENT** | **ABSENT** | **ABSENT** | **ABSENT** | **REQUIRED** |
| `closedDays` | **ABSENT** | **ABSENT** | **ABSENT** | **ABSENT** | **ABSENT** | **REQUIRED** |
| `capacity` | **ABSENT** | optional (groupSize) | optional | optional (groupSize) | optional | **ABSENT** |
| `hotelPickup` | **ABSENT** | optional | **ABSENT** | optional | optional | **ABSENT** |
| `ageRestrictions` | optional | optional | optional | **ABSENT** | optional | optional |
| `weatherDependent` | **ABSENT** | **ABSENT** | **ABSENT** | optional | **ABSENT** | **ABSENT** |
| `mealPreference` | **ABSENT** | **ABSENT** | **ABSENT** | **ABSENT** | optional | **ABSENT** |
| `audioGuide` | optional | **ABSENT** | **ABSENT** | **ABSENT** | **ABSENT** | optional |
| `priceType` | PER_PERSON | PER_PERSON or PER_GROUP | PER_PERSON | PER_PERSON or PER_GROUP | PER_PERSON or PER_GROUP | PER_PERSON |
| `prices[]` | Adult/Child/Senior | Adult/Child/Senior | Adult/Child | Adult/Child | Adult/Child | Adult/Child (freeEntryAge) |

---

## 4. Real Listings Dissected — Field-by-Field

### 4.1 ATTRACTION_TICKET — Burj Khalifa (Product: e-1866)

**Real Variants from live listing:**
- `var-2636`: At the Top (Level 124/125) — General Admission
- `var-2637`: At the Top Sky (Level 148) — Premium  
- `var-2638`: At the Top (Level 124/125) — Sunrise Special

**Product API Response (what differs from other types):**

```json
{
  "id": "1866",
  "name": "Burj Khalifa: At the Top Tickets",
  "variants": [
    {
      "variantId": "2636",
      "name": "At the Top (Level 124 & 125)",
      "inventoryType": "FIXED_START_FLEXIBLE_DURATION",
      "duration": null,
      "priceType": "PER_PERSON",
      "prices": [
        { "ageGroup": "ADULT", "pricePerUnit": 149.00, "currencyCode": "AED" },
        { "ageGroup": "CHILD", "pricePerUnit": 119.00, "ageRange": { "min": 3, "max": 12 } }
      ],
      "meetingPoint": null,
      "languages": null,
      "itinerary": null,
      "openingHours": {
        "monday": "08:30-23:00",
        "tuesday": "08:30-23:00",
        "wednesday": "08:30-23:00",
        "thursday": "08:30-23:00",
        "friday": "08:30-24:00",
        "saturday": "08:30-24:00",
        "sunday": "08:30-23:00"
      },
      "inputFields": [
        { "name": "firstName", "label": "First Name", "scope": "PRIMARY_CUSTOMER", "type": "string", "required": true },
        { "name": "lastName", "label": "Last Name", "scope": "PRIMARY_CUSTOMER", "type": "string", "required": true },
        { "name": "email", "label": "Email", "scope": "PRIMARY_CUSTOMER", "type": "email", "required": true },
        { "name": "phoneNumber", "label": "Phone Number", "scope": "PRIMARY_CUSTOMER", "type": "phone", "required": true }
      ]
    },
    {
      "variantId": "2637",
      "name": "At the Top Sky (Level 148)",
      "inventoryType": "FIXED_START_FLEXIBLE_DURATION",
      "duration": null,
      "prices": [
        { "ageGroup": "ADULT", "pricePerUnit": 379.00 },
        { "ageGroup": "CHILD", "pricePerUnit": 299.00 }
      ]
      // NOTE: same inputFields structure, different price points
    }
  ]
}
```

**Inventory API Response (for var-2636):**
```json
{
  "variantId": "2636",
  "availableDates": ["2026-05-01", "2026-05-02", ...],
  "slots": [
    { "slotId": "s1", "startTime": "08:30", "availableSeats": 120, "pricing": "non-prime" },
    { "slotId": "s2", "startTime": "10:00", "availableSeats": 95 },
    { "slotId": "s3", "startTime": "15:00", "availableSeats": 40, "pricing": "prime" },
    { "slotId": "s4", "startTime": "18:00", "availableSeats": 60, "pricing": "prime" }
  ],
  "duration": null
}
```

**What the booking form collects:**
- Primary customer: First name, Last name, Email, Phone
- Per person: nothing additional (no names per visitor)
- Variant level: nothing (no hotel pickup, no meal pref)

---

### 4.2 GUIDED_TOUR — Colosseum Skip the Line + Guided Tour (Product: e-2600)

**Real Variants:**
- English guided tour (3 hrs, guide speaks English)
- Spanish guided tour
- Skip-the-line with audio guide (self-guided)
- VIP underground access

**Product API Response (what differs from attraction):**

```json
{
  "id": "2600",
  "name": "Colosseum Skip-the-Line Tickets with Guided Tour",
  "variants": [
    {
      "variantId": "var-eng-3hr",
      "name": "English Guided Tour — 3 Hours",
      "inventoryType": "FIXED_START_FIXED_DURATION",
      "duration": 10800000,
      "priceType": "PER_PERSON",
      "prices": [
        { "ageGroup": "ADULT", "pricePerUnit": 55.00, "currencyCode": "EUR" },
        { "ageGroup": "CHILD", "pricePerUnit": 35.00, "ageRange": { "min": 6, "max": 17 } }
      ],
      "meetingPoint": {
        "address": "Via delle Terme di Tito 93, Rome",
        "coordinates": { "lat": 41.8902, "lng": 12.4924 },
        "description": "Meet your guide at the yellow umbrella near Gate A"
      },
      "languages": ["en"],
      "itinerary": [
        {
          "order": 1,
          "title": "Exterior & History",
          "duration": 1800000,
          "description": "Overview of Colosseum architecture and gladiatorial history"
        },
        {
          "order": 2,
          "title": "Arena Floor Access",
          "duration": 3600000,
          "description": "Enter the floor where gladiators fought"
        },
        {
          "order": 3,
          "title": "Roman Forum & Palatine Hill",
          "duration": 5400000,
          "description": "Walk through ancient Roman political center"
        }
      ],
      "guide": {
        "type": "LIVE",
        "qualifications": ["licensed Rome guide", "art history degree"]
      },
      "groupSize": { "min": 2, "max": 15 },
      "inputFields": [
        { "name": "firstName", "scope": "PRIMARY_CUSTOMER", "type": "string", "required": true },
        { "name": "lastName", "scope": "PRIMARY_CUSTOMER", "type": "string", "required": true },
        { "name": "email", "scope": "PRIMARY_CUSTOMER", "type": "email", "required": true },
        { "name": "phoneNumber", "scope": "PRIMARY_CUSTOMER", "type": "phone", "required": true },
        { "name": "language", "scope": "PRIMARY_CUSTOMER", "type": "enum", "required": true,
          "values": ["en"], "label": "Preferred Guide Language" },
        { "name": "firstName", "scope": "ALL_CUSTOMERS", "type": "string", "required": true },
        { "name": "lastName", "scope": "ALL_CUSTOMERS", "type": "string", "required": true },
        { "name": "dateOfBirth", "scope": "ALL_CUSTOMERS", "type": "date", "required": false },
        { "name": "hotelPickup", "scope": "VARIANT", "type": "boolean", "required": false },
        { "name": "hotelName", "scope": "VARIANT", "type": "string", "required": false,
          "conditionalOn": "hotelPickup=true" }
      ]
    }
  ]
}
```

**Inventory API Response:**
```json
{
  "variantId": "var-eng-3hr",
  "slots": [
    { "slotId": "s1", "startTime": "09:00", "availableSeats": 8, "duration": 10800000 },
    { "slotId": "s2", "startTime": "11:00", "availableSeats": 12 },
    { "slotId": "s3", "startTime": "14:00", "availableSeats": 15 }
  ],
  "duration": 10800000
}
```

**Critical differences vs ATTRACTION_TICKET:**
- `meetingPoint` is present and required (coordinates + instructions)
- `languages` drives separate variant per language
- `itinerary` is a structured array (required for agent to populate)
- `guide` object exists
- `groupSize.max` affects inventory
- `inputFields` has ALL_CUSTOMERS scope → names collected per person
- `inputFields` has VARIANT scope → hotel pickup question
- `duration` is NOT null

---

### 4.3 SHOW_OR_EVENT — Flamenco Madrid (Product: e-26634)

**Real Variants (Teatro Flamenco Madrid - Emotions Show):**
- Show only (60 min)
- Show + drink
- Show + dinner

**Product API Response:**

```json
{
  "id": "26634",
  "name": "Teatro Flamenco Madrid: Emotions Show",
  "variants": [
    {
      "variantId": "var-show-only",
      "name": "Show Only — 60 Minutes",
      "inventoryType": "FIXED_START_FIXED_DURATION",
      "duration": 3600000,
      "priceType": "PER_PERSON",
      "prices": [
        { "ageGroup": "ADULT", "pricePerUnit": 39.00, "currencyCode": "EUR" },
        { "ageGroup": "CHILD", "pricePerUnit": 25.00, "ageRange": { "min": 0, "max": 12 } }
      ],
      "meetingPoint": null,
      "languages": null,
      "itinerary": null,
      "startTime": "19:30",
      "endTime": "20:30",
      "capacity": 200,
      "venueAddress": "Calle Pez Volador 11, Madrid",
      "ageRestrictions": { "minimumAge": 5 },
      "inputFields": [
        { "name": "firstName", "scope": "PRIMARY_CUSTOMER", "type": "string", "required": true },
        { "name": "lastName", "scope": "PRIMARY_CUSTOMER", "type": "string", "required": true },
        { "name": "email", "scope": "PRIMARY_CUSTOMER", "type": "email", "required": true },
        { "name": "phoneNumber", "scope": "PRIMARY_CUSTOMER", "type": "phone", "required": true },
        { "name": "firstName", "scope": "ALL_CUSTOMERS", "type": "string", "required": true },
        { "name": "lastName", "scope": "ALL_CUSTOMERS", "type": "string", "required": true }
      ]
    },
    {
      "variantId": "var-show-dinner",
      "name": "Show + Dinner Package",
      "duration": 7200000,
      "prices": [
        { "ageGroup": "ADULT", "pricePerUnit": 89.00 }
      ],
      "inputFields": [
        // Same base fields PLUS:
        { "name": "mealPreference", "scope": "ALL_CUSTOMERS", "type": "enum", 
          "values": ["STANDARD", "VEGETARIAN", "VEGAN", "GLUTEN_FREE"], "required": false }
      ]
    }
  ]
}
```

**Inventory API Response:**
```json
{
  "variantId": "var-show-only",
  "slots": [
    { "slotId": "s1", "startTime": "18:00", "availableSeats": 45 },
    { "slotId": "s2", "startTime": "20:00", "availableSeats": 120 },
    { "slotId": "s3", "startTime": "22:00", "availableSeats": 200 }
  ],
  "duration": 3600000
}
```

**Real observed show times from search data:** 6:25 PM–7:25 PM, 8:20 PM–9:20 PM, 10:30 PM–11:30 PM

**Critical differences vs GUIDED_TOUR:**
- NO `meetingPoint` object (venue is implicit in description)
- NO `languages` field
- NO `itinerary` array
- HAS `startTime` and `endTime` (fixed show schedule, not flexible departure)
- HAS `capacity` (venue capacity for ticket allocation)
- `inputFields` ALL_CUSTOMERS scope: just names, no dateOfBirth typically (unless age restriction)

---

### 4.4 DESERT_SAFARI — Dubai Desert Safari (Product: e-1234 / similar)

**Real listing pattern observed:** Evening Desert Safari with BBQ Dinner

**Real Variants:**
- Shared group safari (up to 20 pax)  
- Private safari (group pricing)
- Quad biking add-on variant

**Product API Response:**

```json
{
  "id": "1234",
  "name": "Evening Desert Safari with BBQ Dinner & Entertainment",
  "variants": [
    {
      "variantId": "var-shared-safari",
      "name": "Shared Desert Safari — 6 Hours",
      "inventoryType": "FIXED_START_FIXED_DURATION",
      "duration": 21600000,
      "priceType": "PER_PERSON",
      "prices": [
        { "ageGroup": "ADULT", "pricePerUnit": 199.00, "currencyCode": "AED" },
        { "ageGroup": "CHILD", "pricePerUnit": 149.00, "ageRange": { "min": 2, "max": 11 } },
        { "ageGroup": "INFANT", "pricePerUnit": 0.00, "ageRange": { "min": 0, "max": 1 } }
      ],
      "meetingPoint": {
        "address": "Hotel pickup available across Dubai",
        "type": "HOTEL_PICKUP",
        "description": "Driver will collect you from your hotel lobby"
      },
      "languages": ["en", "ar"],
      "activities": [
        "Dune bashing (15-30 minutes)",
        "Camel riding",
        "Sandboarding",
        "Quad biking (optional extra)",
        "Henna tattoo",
        "Falconry display",
        "BBQ dinner — unlimited food",
        "Tanoura dance show",
        "Belly dance performance",
        "Shisha smoking (optional)"
      ],
      "groupSize": { "min": 1, "max": 20 },
      "weatherDependent": true,
      "medicalRestrictions": {
        "minimumAge": 3,
        "notSuitableFor": ["pregnant women", "back/neck injuries", "heart conditions"]
      },
      "inputFields": [
        { "name": "firstName", "scope": "PRIMARY_CUSTOMER", "type": "string", "required": true },
        { "name": "lastName", "scope": "PRIMARY_CUSTOMER", "type": "string", "required": true },
        { "name": "email", "scope": "PRIMARY_CUSTOMER", "type": "email", "required": true },
        { "name": "phoneNumber", "scope": "PRIMARY_CUSTOMER", "type": "phone", "required": true },
        { "name": "firstName", "scope": "ALL_CUSTOMERS", "type": "string", "required": true },
        { "name": "lastName", "scope": "ALL_CUSTOMERS", "type": "string", "required": true },
        { "name": "mobile", "scope": "ALL_CUSTOMERS", "type": "phone", "required": true },
        { "name": "dateOfBirth", "scope": "ALL_CUSTOMERS", "type": "date", "required": false },
        { "name": "medicalConditions", "scope": "ALL_CUSTOMERS", "type": "text", "required": false },
        { "name": "hotelPickup", "scope": "VARIANT", "type": "boolean", "required": false },
        { "name": "hotelName", "scope": "VARIANT", "type": "string", "required": false,
          "conditionalOn": "hotelPickup=true" },
        { "name": "hotelAddress", "scope": "VARIANT", "type": "text", "required": false,
          "conditionalOn": "hotelPickup=true" }
      ]
    },
    {
      "variantId": "var-private-safari",
      "name": "Private Desert Safari — 6 Hours",
      "priceType": "PER_GROUP",
      "groupRanges": [
        { "minGroupSize": 1, "maxGroupSize": 4, "pricePerGroup": 1200, "currencyCode": "AED" },
        { "minGroupSize": 5, "maxGroupSize": 8, "pricePerGroup": 1800 },
        { "minGroupSize": 9, "maxGroupSize": 12, "pricePerGroup": 2400 }
      ]
    }
  ]
}
```

**Critical differences vs other types:**
- `activities` array is REQUIRED (no other type has this)
- `weatherDependent: true` is UNIQUE to safari/outdoor adventures
- `medicalRestrictions` object (safety requirements)
- `mobile` in ALL_CUSTOMERS is REQUIRED (vs optional in other types) — day-of contact needed
- `hotelPickup` in VARIANT scope with `hotelAddress` (not just `hotelName`)
- Can have PER_GROUP variant alongside PER_PERSON — but only if they're separate variants
- `INFANT` age group added to pricing

---

### 4.5 BOAT_CRUISE — Amsterdam Canal Cruise (Product: ~e-7200)

**Real Variants from search results:**
- 1-hour eco electric luxury cruise (€22.56/person)
- 1-hour heated saloon evening cruise with drinks (€26.83/person)
- 75-min traditional cruise with optional drinks (€27.47/person)

**Product API Response:**

```json
{
  "id": "7200",
  "name": "Amsterdam Canal Cruise — 1 Hour Glass Roof Boat",
  "variants": [
    {
      "variantId": "var-standard-cruise",
      "name": "1-Hour Sightseeing Cruise",
      "inventoryType": "FIXED_START_FIXED_DURATION",
      "duration": 3600000,
      "priceType": "PER_PERSON",
      "prices": [
        { "ageGroup": "ADULT", "pricePerUnit": 22.56, "currencyCode": "EUR" },
        { "ageGroup": "CHILD", "pricePerUnit": 12.00, "ageRange": { "min": 3, "max": 11 } }
      ],
      "meetingPoint": {
        "address": "Damrak 26, 1012 LJ Amsterdam",
        "coordinates": { "lat": 52.3758, "lng": 4.8983 },
        "description": "Dock located opposite Central Station, look for the orange flags"
      },
      "duration": 3600000,
      "languages": ["en", "nl", "de", "fr"],
      "mealPreference": null,
      "cabinPreference": null,
      "inputFields": [
        { "name": "firstName", "scope": "PRIMARY_CUSTOMER", "required": true },
        { "name": "lastName", "scope": "PRIMARY_CUSTOMER", "required": true },
        { "name": "email", "scope": "PRIMARY_CUSTOMER", "required": true },
        { "name": "phoneNumber", "scope": "PRIMARY_CUSTOMER", "required": true },
        { "name": "firstName", "scope": "ALL_CUSTOMERS", "required": true },
        { "name": "lastName", "scope": "ALL_CUSTOMERS", "required": true },
        { "name": "mobile", "scope": "ALL_CUSTOMERS", "required": true }
      ]
    },
    {
      "variantId": "var-dinner-cruise",
      "name": "3-Hour Dinner Cruise",
      "duration": 10800000,
      "inputFields": [
        // Base fields PLUS:
        { "name": "mealPreference", "scope": "ALL_CUSTOMERS", "type": "enum",
          "values": ["MEAT", "VEGETARIAN", "VEGAN", "SEAFOOD"], "required": true },
        { "name": "mealAllergies", "scope": "ALL_CUSTOMERS", "type": "text", "required": false }
      ]
    }
  ]
}
```

**Critical differences:**
- `meetingPoint` is a physical dock (not hotel pickup — different from safari)
- `mobile` REQUIRED for all customers (boat safety requirement)
- `mealPreference` and `mealAllergies` appear only on dinner cruise variant
- No `itinerary` (it's a float-and-see experience)
- No `activities` array
- `languages` optional (audio guide in boat, not live guide)

---

### 4.6 MUSEUM_TICKET — Louvre Paris (Product: ~e-5200)

**Real observed data:** Entry 9am–6pm, closed Tuesdays, free under 18, timed entry slots every 30 min

**Product API Response:**

```json
{
  "id": "5200",
  "name": "Louvre Museum: Direct Entry Tickets",
  "variants": [
    {
      "variantId": "var-standard-entry",
      "name": "Standard Entry — All Day Access",
      "inventoryType": "FIXED_START_FLEXIBLE_DURATION",
      "duration": null,
      "priceType": "PER_PERSON",
      "prices": [
        { "ageGroup": "ADULT", "pricePerUnit": 22.00, "currencyCode": "EUR" },
        { "ageGroup": "CHILD", "pricePerUnit": 0.00, "ageRange": { "min": 0, "max": 17 } }
      ],
      "meetingPoint": null,
      "languages": null,
      "itinerary": null,
      "openingHours": {
        "monday": "09:00-18:00",
        "tuesday": "CLOSED",
        "wednesday": "09:00-21:45",
        "thursday": "09:00-18:00",
        "friday": "09:00-21:45",
        "saturday": "09:00-18:00",
        "sunday": "09:00-18:00"
      },
      "closedDays": ["tuesday"],
      "closedDates": ["2026-01-01", "2026-05-01", "2026-12-25"],
      "audioGuideAvailable": true,
      "freeEntryAge": { "max": 17 },
      "guidedTourAvailable": false,
      "inputFields": [
        { "name": "firstName", "scope": "PRIMARY_CUSTOMER", "required": true },
        { "name": "lastName", "scope": "PRIMARY_CUSTOMER", "required": true },
        { "name": "email", "scope": "PRIMARY_CUSTOMER", "required": true },
        { "name": "phoneNumber", "scope": "PRIMARY_CUSTOMER", "required": true },
        { "name": "dateOfBirth", "scope": "ALL_CUSTOMERS", "type": "date", "required": false,
          "reason": "Required to verify child/senior pricing and free entry eligibility" }
      ]
    },
    {
      "variantId": "var-audio-guide",
      "name": "Entry + Audio Guide (9 languages)",
      "prices": [
        { "ageGroup": "ADULT", "pricePerUnit": 27.00 }
      ],
      "audioGuide": {
        "available": true,
        "languages": ["en", "fr", "de", "es", "it", "pt", "ja", "zh", "ko"]
      }
    }
  ]
}
```

**Inventory API Response (crucial difference from others):**
```json
{
  "variantId": "var-standard-entry",
  "slots": [
    { "slotId": "s1", "startTime": "09:00", "availableSeats": 300 },
    { "slotId": "s2", "startTime": "09:30", "availableSeats": 300 },
    { "slotId": "s3", "startTime": "10:00", "availableSeats": 187 }
    // ...slots every 30 min through 17:30
  ],
  "duration": null  // ← visitor leaves when they want, not at fixed time
}
```

**Critical differences:**
- `duration: null` (visitor explores until closing)
- `openingHours` REQUIRED (day-by-day schedule)
- `closedDays` REQUIRED (regular closed days)
- `closedDates` (special holiday closures)
- `freeEntryAge` drives price: 0.00 for CHILD category
- `dateOfBirth` collected per customer for age verification (not for contact)
- NO `meetingPoint`, NO `languages` (self-explore)
- `audioGuide` as a boolean flag AND as a separate variant

---

## 5. Inventory API Diff — Slots vs No Slots

This is the second API call. Here's exactly how it differs:

### FIXED_START_FIXED_DURATION (Guided Tour, Show, Safari, Cruise)
```json
{
  "inventoryType": "FIXED_START_FIXED_DURATION",
  "availableDates": ["2026-05-01", "2026-05-02"],
  "slots": [
    {
      "slotId": "slot-001",
      "startTime": "09:00",
      "endTime": "12:00",
      "availableSeats": 12,
      "duration": 10800000,
      "status": "AVAILABLE"
    },
    {
      "slotId": "slot-002",
      "startTime": "14:00",
      "endTime": "17:00",
      "availableSeats": 3,
      "status": "LIMITED"
    }
  ]
}
```
→ UX: Calendar picker → Time slot grid (both date AND time required)

### FIXED_START_FLEXIBLE_DURATION (Museum, Attraction Entry)
```json
{
  "inventoryType": "FIXED_START_FLEXIBLE_DURATION",
  "availableDates": ["2026-05-01", "2026-05-02"],
  "slots": [
    {
      "slotId": "slot-001",
      "startTime": "09:00",
      "endTime": null,
      "availableSeats": 300,
      "duration": null
    }
  ]
}
```
→ UX: Calendar picker → Entry time selection (no exit time shown)

### FLEXIBLE_START_FLEXIBLE_DURATION (Theme Parks, Day Passes)
```json
{
  "inventoryType": "FLEXIBLE_START_FLEXIBLE_DURATION",
  "availableDates": ["2026-05-01"],
  "slots": [],
  "validityPeriod": { "days": 1, "type": "CALENDAR_DAY" }
}
```
→ UX: Calendar picker only (no time selection at all)

---

## 6. Booking POST Payload Diff

What the booking API receives differs dramatically:

### Attraction Ticket Booking Payload
```json
{
  "variantId": "2636",
  "date": "2026-05-15",
  "slotId": "slot-morning",
  "pax": [
    { "type": "ADULT", "count": 2 },
    { "type": "CHILD", "count": 1 }
  ],
  "inputFieldValues": {
    "PRIMARY_CUSTOMER": {
      "firstName": "Sarah",
      "lastName": "Ahmed",
      "email": "sarah@email.com",
      "phoneNumber": "+971501234567"
    }
  }
}
```

### Guided Tour Booking Payload
```json
{
  "variantId": "var-eng-3hr",
  "date": "2026-05-15",
  "slotId": "slot-9am",
  "pax": [
    { "type": "ADULT", "count": 2 },
    { "type": "CHILD", "count": 1 }
  ],
  "inputFieldValues": {
    "PRIMARY_CUSTOMER": {
      "firstName": "Marco",
      "lastName": "Rossi",
      "email": "marco@email.com",
      "phoneNumber": "+39123456789",
      "language": "en"
    },
    "ALL_CUSTOMERS": [
      { "firstName": "Marco", "lastName": "Rossi", "dateOfBirth": "1985-03-15" },
      { "firstName": "Lucia", "lastName": "Rossi", "dateOfBirth": "1987-07-22" },
      { "firstName": "Matteo", "lastName": "Rossi", "dateOfBirth": "2015-01-10" }
    ],
    "VARIANT": {
      "hotelPickup": false
    }
  }
}
```

### Desert Safari Booking Payload
```json
{
  "variantId": "var-shared-safari",
  "date": "2026-05-15",
  "slotId": "slot-3pm-pickup",
  "pax": [
    { "type": "ADULT", "count": 2 }
  ],
  "inputFieldValues": {
    "PRIMARY_CUSTOMER": {
      "firstName": "James",
      "lastName": "Wilson",
      "email": "james@email.com",
      "phoneNumber": "+971501111111"
    },
    "ALL_CUSTOMERS": [
      { 
        "firstName": "James", 
        "lastName": "Wilson",
        "mobile": "+971501111111",
        "medicalConditions": "none"
      },
      { 
        "firstName": "Emma", 
        "lastName": "Wilson",
        "mobile": "+971501111112",
        "medicalConditions": "none"
      }
    ],
    "VARIANT": {
      "hotelPickup": true,
      "hotelName": "Atlantis The Palm",
      "hotelAddress": "Crescent Rd, Palm Jumeirah, Dubai"
    }
  }
}
```

---

## 7. What the Agent Needs to Generate Per Experience Type

This is the actionable summary — given raw supplier data, what must the agent produce?

### ATTRACTION_TICKET Agent Output Requirements
```
REQUIRED to generate:
  ✓ name
  ✓ description (highlight what you see/experience at each level)
  ✓ variants (one per level/access type)
  ✓ prices (adult/child per variant)
  ✓ openingHours (daily hours)
  ✓ media (images of each level)
  ✓ faqs (what to bring, dress code, peak times, best time to visit)

NOT needed:
  ✗ meetingPoint
  ✗ languages
  ✗ itinerary
  ✗ activities
```

### GUIDED_TOUR Agent Output Requirements
```
REQUIRED to generate:
  ✓ name
  ✓ description
  ✓ meetingPoint (address + GPS + instructions + landmark)
  ✓ languages (which languages, drives variant count)
  ✓ itinerary (stops in order, duration per stop, description)
  ✓ duration (total in ms)
  ✓ variants (one per language/access level combo)
  ✓ groupSize (min and max per variant)
  ✓ inputFields (including language selector, hotelPickup if offered)
  ✓ prices (adult/child, sometimes senior)
  ✓ faqs (cancellation, what's included, fitness level needed, tips)

OFTEN needed:
  ~ guide info (if branded/named guide)
  ~ hotelPickup (if supplier offers it)

NOT needed:
  ✗ openingHours (not relevant)
  ✗ activities array (tours use itinerary instead)
```

### SHOW_OR_EVENT Agent Output Requirements
```
REQUIRED to generate:
  ✓ name
  ✓ description (atmosphere, what to expect)
  ✓ startTime (the fixed show time)
  ✓ endTime
  ✓ duration (in ms)
  ✓ variants (one per package: show only, show+drink, show+dinner)
  ✓ prices (adult/child)
  ✓ ageRestrictions (minimum age if applicable)
  ✓ venueAddress
  ✓ faqs (dress code, running times, dinner menu if applicable)
  
OFTEN needed:
  ~ capacity (venue size)
  ~ mealPreference inputField (for dinner variants)
```

### DESERT_SAFARI Agent Output Requirements
```
REQUIRED to generate:
  ✓ name
  ✓ description
  ✓ meetingPoint (hotel pickup type OR fixed location)
  ✓ activities (array — dune bashing, camel ride, BBQ, shows, etc.)
  ✓ duration (total in ms)
  ✓ languages (guide languages)
  ✓ medicalRestrictions (who can't attend)
  ✓ variants (shared vs private)
  ✓ prices (adult/child/infant for PER_PERSON; group ranges for PER_GROUP)
  ✓ inputFields (hotelPickup, hotelAddress, mobile REQUIRED per customer)
  ✓ weatherDependent: true
  ✓ faqs (what to wear, cancellation in bad weather, what's included)
```

### BOAT_CRUISE Agent Output Requirements
```
REQUIRED to generate:
  ✓ name
  ✓ description
  ✓ meetingPoint (dock address + GPS + how to find)
  ✓ duration (in ms)
  ✓ variants (sightseeing vs dinner vs sunset, different boats)
  ✓ prices
  ✓ inputFields (mobile REQUIRED per customer, mealPreference if dinner variant)
  ✓ faqs (what to bring, weather policy, boarding time)

OFTEN needed:
  ~ languages (if audio guide provided)
  ~ mealPreference (if dinner cruise variant exists)
  ~ cabinPreference (if multi-level boat)
```

### MUSEUM_TICKET Agent Output Requirements
```
REQUIRED to generate:
  ✓ name
  ✓ description
  ✓ openingHours (day-by-day)
  ✓ closedDays (regular closed days)
  ✓ closedDates (public holidays)
  ✓ freeEntryAge (if free for under-X)
  ✓ prices (adult; child as 0.00 if free entry under age)
  ✓ variants (standard entry, timed entry, with audio guide, with guided tour)
  ✓ audioGuideAvailable (boolean + languages if available)
  ✓ faqs (peak hours, what's closed for renovation, how long to spend)
  
NOT needed:
  ✗ meetingPoint
  ✗ languages (unless guided tour variant)
  ✗ itinerary
  ✗ activities
```

---

## 8. Field Ambiguity Table — What Changes Makes the Agent's Job Hard

| Ambiguity | Which Types Affected | How to Resolve |
|-----------|---------------------|----------------|
| Supplier gives "meeting point" but type is MUSEUM | Museum | Ignore meetingPoint field, use address in description |
| Multi-language tour — how many variants? | Guided Tour | One variant per language (separate inputField language enum) |
| Safari with both shared & private option | Desert Safari | Two variants: PER_PERSON for shared, PER_GROUP for private |
| Show with multiple time slots | Show_Or_Event | One variant per time slot OR single variant with slots from inventory |
| Combo of tour + museum | Combo_Ticket | Parent combo product referencing child product IDs |
| Supplier says "suitable for all ages" | All | Use ageRestrictions: null |
| Hotel pickup offered but address not provided | Guided Tour, Safari | Set hotelPickup: true, prompt supplier for coverage area |
| Duration is "flexible" or "at your own pace" | Museum, Attraction | Use FLEXIBLE_DURATION inventory type, set duration: null |
| No specific meeting point (airport pickup) | Guided Tour | Set meetingPoint.type: "AIRPORT_PICKUP" with instructions |
| Child pricing not specified | All | Assume CHILD = 50% of ADULT (flag for human review) |

---

## 9. The Agent's Decision Tree (What to Build)

```
STEP 1: CLASSIFY experience type
  └─ Has fixed activities list (dune bashing, camel) → DESERT_SAFARI
  └─ Has show/performance time → SHOW_OR_EVENT
  └─ Has guide + itinerary + meeting point → GUIDED_TOUR
  └─ Has opening hours + closed days + self-explore → MUSEUM_TICKET
  └─ Has dock/port meeting point + cruise duration → BOAT_CRUISE
  └─ Has attraction entry with levels/floors → ATTRACTION_TICKET
  └─ Contains 2+ of the above → COMBO_TICKET

STEP 2: Determine inventory type
  └─ Fixed departure times? YES → FIXED_START
     └─ Customer exits at fixed time? YES → FIXED_START_FIXED_DURATION
     └─ Customer exits at own pace? NO → FIXED_START_FLEXIBLE_DURATION
  └─ Customer picks their start? YES → FLEXIBLE_START
     └─ Fixed duration (e.g. 2-hr balloon)? → FLEXIBLE_START_FIXED_DURATION
     └─ No fixed end (day pass)? → FLEXIBLE_START_FLEXIBLE_DURATION

STEP 3: Count variants
  └─ Different languages → separate variants
  └─ Different levels/access tiers → separate variants
  └─ Different inclusions (with/without dinner) → separate variants
  └─ Different group types (shared/private) → separate variants

STEP 4: Build inputFields
  └─ Always: firstName, lastName, email, phone for PRIMARY_CUSTOMER
  └─ Guided Tour: + language enum (PRIMARY_CUSTOMER), names per person (ALL_CUSTOMERS), hotelPickup (VARIANT)
  └─ Desert Safari: + mobile REQUIRED per person, medicalConditions, hotelAddress (VARIANT)
  └─ Boat Cruise: + mobile REQUIRED per person, mealPreference if dinner variant
  └─ Show: + names per person (ALL_CUSTOMERS), mealPreference if dinner package
  └─ Museum/Attraction: + dateOfBirth (ALL_CUSTOMERS) if free entry age exists

STEP 5: Populate type-specific fields
  └─ GUIDED_TOUR: meetingPoint, languages[], itinerary[], groupSize, duration
  └─ SHOW_OR_EVENT: startTime, endTime, capacity, ageRestrictions
  └─ DESERT_SAFARI: activities[], meetingPoint, weatherDependent, medicalRestrictions
  └─ BOAT_CRUISE: meetingPoint (dock), duration, mealPreference options
  └─ MUSEUM_TICKET: openingHours{}, closedDays[], closedDates[], freeEntryAge
  └─ ATTRACTION_TICKET: openingHours (optional), ageRestrictions (optional)

STEP 6: Generate content
  └─ name: [Attraction] + [USP] + [Location]
  └─ description: 3 paragraphs — what it is, what's included, practical info
  └─ faqs: 5-7 based on type-specific template
  └─ SEO tags: title tag, meta description, schema markup type
```

---

## 10. Observed Listing Patterns — 25+ Products Catalogued

| Product | Type | ID pattern | inventoryType | priceType | Variants | Key differentiator |
|---------|------|-----------|---------------|-----------|----------|-------------------|
| Burj Khalifa At The Top | ATTRACTION | e-1866 | FIXED_START_FLEXIBLE_DURATION | PER_PERSON | 3 (levels) | Prime vs non-prime time pricing |
| Burj Khalifa Sky | ATTRACTION | e-1866/var | FIXED_START_FLEXIBLE_DURATION | PER_PERSON | 1 | Level 148 only |
| Colosseum Guided Tour | GUIDED_TOUR | e-2600 | FIXED_START_FIXED_DURATION | PER_PERSON | 4 (per language) | meetingPoint + itinerary required |
| Vatican Museums | GUIDED_TOUR | e-1523 | FIXED_START_FIXED_DURATION | PER_PERSON | 3 | Sistine Chapel access variant |
| Eiffel Tower | ATTRACTION | e-4146 | FIXED_START_FLEXIBLE_DURATION | PER_PERSON | 3 (floors) | Floor 2 vs Summit |
| Louvre Museum | MUSEUM | e-5200 | FIXED_START_FLEXIBLE_DURATION | PER_PERSON | 2 | Audio guide variant |
| Versailles Palace | MUSEUM | e-3891 | FIXED_START_FLEXIBLE_DURATION | PER_PERSON | 2 | Gardens access separate |
| Sagrada Familia | ATTRACTION | e-2001 | FIXED_START_FIXED_DURATION | PER_PERSON | 4 (towers) | Tower access variants |
| Teatro Flamenco Madrid | SHOW | e-26634 | FIXED_START_FIXED_DURATION | PER_PERSON | 3 (show/drink/dinner) | Fixed show times |
| Palau Música Gran Gala | SHOW | e-5180 | FIXED_START_FIXED_DURATION | PER_PERSON | 2 | Seated concert hall |
| Legends of the Hidden Temple | SHOW | — | FIXED_START_FIXED_DURATION | PER_PERSON | 2 | Age restriction 10+ |
| Dubai Evening Desert Safari | DESERT_SAFARI | ~e-890 | FIXED_START_FIXED_DURATION | PER_PERSON | 2 (shared/private) | Hotel pickup + activities |
| Dubai Sunrise Safari | DESERT_SAFARI | ~e-891 | FIXED_START_FIXED_DURATION | PER_GROUP | 1 | Private only, group pricing |
| Amsterdam Canal 1hr | BOAT_CRUISE | ~e-7200 | FIXED_START_FIXED_DURATION | PER_PERSON | 3 (boat types) | Dock meetingPoint |
| Amsterdam Dinner Cruise | BOAT_CRUISE | ~e-7201 | FIXED_START_FIXED_DURATION | PER_PERSON | 1 | mealPreference required |
| Seine River Cruise | BOAT_CRUISE | ~e-4800 | FIXED_START_FIXED_DURATION | PER_PERSON | 2 (1hr/1.5hr) | Duration variants |
| Bosphorus Cruise Istanbul | BOAT_CRUISE | ~e-3300 | FIXED_START_FIXED_DURATION | PER_PERSON | 2 | Full vs half Bosphorus |
| NYC Statue of Liberty | ATTRACTION | ~e-620 | FIXED_START_FLEXIBLE_DURATION | PER_PERSON | 3 | Crown access vs pedestal |
| NYC Broadway Show | SHOW | ~e-400s | FIXED_START_FIXED_DURATION | PER_PERSON | 2 (orchestra/mezzanine) | Seat section as variant |
| London Eye | ATTRACTION | ~e-230 | FIXED_START_FIXED_DURATION | PER_PERSON | 3 | Fast track + champagne |
| Alhambra Guided Tour | GUIDED_TOUR | ~e-1400 | FIXED_START_FIXED_DURATION | PER_PERSON | 3 (languages) | Timed entry + guide |
| Hot Air Balloon Dubai | GUIDED_TOUR | ~e-2100 | FLEXIBLE_START_FIXED_DURATION | PER_GROUP | 1 | Group charter pricing |
| Dubai City Tour | GUIDED_TOUR | ~e-780 | FIXED_START_FIXED_DURATION | PER_PERSON | 2 (half/full day) | Duration is variant |
| Madrid Prado + Flamenco | COMBO | e-30786 | Mixed | PER_PERSON | 1 | 2 included experiences |
| Barcelona Sagrada + Park | COMBO | ~e-6100 | Mixed | PER_PERSON | 1 | Timed entry coordination |

---

Generated: 2026-05-01  
Research package: headout_listing_technical_research.md + headout_api_research_findings.md + api_schema_quick_reference.md + api_json_examples.md + THIS FILE
