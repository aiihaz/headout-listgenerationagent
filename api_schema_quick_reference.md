# Headout API Schema: Quick Reference Guide

## 1. Experience Type Summary Table

| Type | Inventory Model | Primary Use Case | Key Fields | Booking Complexity |
|------|-----------------|------------------|-----------|-------------------|
| **GUIDED_TOUR** | FIXED_START_FIXED_DURATION or FLEXIBLE_START_FIXED_DURATION | Group tours with guides | meetingPoint (REQ), languages (REQ), itinerary (REQ), guide, groupSize | HIGH |
| **ATTRACTION_TICKET** | FIXED_START_FLEXIBLE_DURATION or FLEXIBLE_START_FLEXIBLE_DURATION | Museum/attraction entry | ageRestrictions (OPT), openingHours (OPT), audioGuide (OPT) | LOW |
| **SHOW_OR_EVENT** | FIXED_START_FIXED_DURATION | Performances/events | startTime (REQ), capacity (OPT), ageRestrictions (OPT), endTime (OPT) | LOW-MEDIUM |
| **DESERT_SAFARI** | FIXED_START_FIXED_DURATION | Adventure activities | meetingPoint (REQ), languages (REQ), activities (REQ), weatherDependent (OPT) | MEDIUM-HIGH |
| **BOAT_CRUISE** | FIXED_START_FIXED_DURATION | Cruise experiences | meetingPoint (REQ), duration (REQ), mealPreference (OPT), cabinPreference (OPT) | MEDIUM |
| **MUSEUM_TICKET** | FIXED_START_FLEXIBLE_DURATION | Museum/cultural access | openingHours (REQ), closedDays (REQ), audioGuide (OPT), freeEntryAge (OPT) | LOW |
| **COMBO_TICKET** | Mixed (per included experience) | Bundled experiences | includedExperiences (REQ), validityPeriod (REQ), sequenceRequired (OPT) | MEDIUM-HIGH |

---

## 2. Inventory Type Matrix

| Inventory Type | Use Case Examples | Customer Chooses | startTime Field | duration Field | slots Array | Booking UX |
|---|---|---|---|---|---|---|
| **FIXED_START_FIXED_DURATION** | Broadway shows, timed museum entry, tours at 2:00 PM | Date + Time slot | REQUIRED | REQUIRED (not null) | YES | Date picker → Time slot picker |
| **FIXED_START_FLEXIBLE_DURATION** | Museums (enter at 9am, explore til close), all-day pass | Date only (opening time) | REQUIRED | null (variable) | NO | Date picker only |
| **FLEXIBLE_START_FIXED_DURATION** | Hot air balloon rides (pick time, 2hr flight), private tours | Date + preferred start time | null (customer picks) | REQUIRED | YES (availableTimes) | Date picker → Time picker from available |
| **FLEXIBLE_START_FLEXIBLE_DURATION** | Theme parks, day tickets, 14-day validity | None (valid for period) | null | null | NO | Date picker with calendar span |

---

## 3. Mandatory vs Conditional Fields

### Always Present (Core Product Fields)
```
✓ id (string)
✓ name (string)
✓ description (string)
✓ canonicalUrl (string)
✓ city (object with code, name, image)
✓ variants (array, min 1)
```

### Conditional by Experience Type

#### GUIDED_TOUR (7 conditional fields)
```
REQUIRED:
  - meetingPoint (address, coordinates, description)
  - languages (array of language codes)
  - itinerary (array of day breakdowns)

OPTIONAL:
  - guide (name, profileImage, rating)
  - groupSize (min/max)
  - hotelPickup (boolean)
  - specialRequests (input field collection)
```

#### ATTRACTION_TICKET (4 conditional fields)
```
OPTIONAL:
  - ageRestrictions (min/max age, free-entry age)
  - openingHours (daily hours)
  - audioGuideAvailable (boolean)
  - guidedTourAvailable (boolean)
```

#### SHOW_OR_EVENT (5 conditional fields)
```
REQUIRED:
  - startTime (performance/screening time)

OPTIONAL:
  - endTime (show end time)
  - capacity (venue capacity)
  - ageRestrictions (age limits for content)
  - hasFixedDeparture (boolean)
```

#### DESERT_SAFARI (7 conditional fields)
```
REQUIRED:
  - meetingPoint (pickup location)
  - languages (guide languages)
  - activities (included activities array)

OPTIONAL:
  - duration (safari duration)
  - weatherDependent (boolean)
  - groupSize (group constraints)
  - medicalRestrictions (age/health requirements)
```

#### BOAT_CRUISE (6 conditional fields)
```
REQUIRED:
  - meetingPoint (port of departure)
  - duration (cruise duration)

OPTIONAL:
  - languages (guide/staff languages)
  - mealPreference (dietary options)
  - cabinPreference (room type selection)
  - passportRequired (boolean)
```

#### MUSEUM_TICKET (5 conditional fields)
```
REQUIRED:
  - openingHours (daily schedule)
  - closedDays (closure days)

OPTIONAL:
  - audioGuideAvailable (boolean)
  - guidedTourAvailable (boolean)
  - freeEntryAge (age limit for free admission)
```

#### COMBO_TICKET (3 conditional fields)
```
REQUIRED:
  - includedExperiences (array of product references)
  - validityPeriod (how long combo is valid)

OPTIONAL:
  - sequenceRequired (must be done in order?)
```

---

## 4. Booking Input Fields by Scope & Type

### GUIDED_TOUR Booking Fields
```
PRIMARY_CUSTOMER (mandatory):
  ✓ firstName
  ✓ lastName
  ✓ email
  ✓ phoneNumber
  + language (REQUIRED - which guide language)
  + specialRequests (OPTIONAL - accessibility needs)

ALL_CUSTOMERS (for each person):
  ✓ firstName
  ✓ lastName
  + mobile (OPTIONAL - day-of contact)
  + dateOfBirth (OPTIONAL - age requirements)
  + nationality (OPTIONAL - some tours require)

VARIANT (collected once):
  + hotelPickup (OPTIONAL - if available)
  + hotelName (CONDITIONAL on hotelPickup=true)
  + roomNumber (CONDITIONAL on hotelPickup=true)
```

### ATTRACTION_TICKET / MUSEUM_TICKET Booking Fields
```
PRIMARY_CUSTOMER (mandatory):
  ✓ firstName
  ✓ lastName
  ✓ email
  ✓ phoneNumber
  + specialAccessNeeds (OPTIONAL)

ALL_CUSTOMERS (minimal):
  + dateOfBirth (OPTIONAL - for age-based free entry)

VARIANT:
  (none typically)
```

### SHOW_OR_EVENT Booking Fields
```
PRIMARY_CUSTOMER (mandatory):
  ✓ firstName
  ✓ lastName
  ✓ email
  ✓ phoneNumber
  + dateOfBirth (OPTIONAL - for age-restricted shows)

ALL_CUSTOMERS (for each attendee):
  ✓ firstName
  ✓ lastName
  + email (OPTIONAL - for digital ticket delivery)
  + dateOfBirth (OPTIONAL - age restrictions)

VARIANT:
  (none typically)
```

### DESERT_SAFARI Booking Fields
```
PRIMARY_CUSTOMER (mandatory):
  ✓ firstName
  ✓ lastName
  ✓ email
  ✓ phoneNumber
  + nationality (OPTIONAL)
  + passport (OPTIONAL)

ALL_CUSTOMERS (for each person):
  ✓ firstName
  ✓ lastName
  ✓ mobile (REQUIRED)
  + dateOfBirth (OPTIONAL - age restrictions)
  + medicalConditions (OPTIONAL)
  + passportNumber (OPTIONAL - some safaris require ID)

VARIANT (collected once):
  + hotelPickup (OPTIONAL)
  + hotelAddress (CONDITIONAL on hotelPickup=true)
```

### BOAT_CRUISE Booking Fields
```
PRIMARY_CUSTOMER (mandatory):
  ✓ firstName
  ✓ lastName
  ✓ email
  ✓ phoneNumber
  + dateOfBirth (OPTIONAL - life jacket sizing)

ALL_CUSTOMERS (for each person):
  ✓ firstName
  ✓ lastName
  ✓ mobile (REQUIRED)
  + dateOfBirth (OPTIONAL)
  + passport (OPTIONAL - some cruises require ID)
  + medicalConditions (OPTIONAL)
  + mealAllergies (OPTIONAL)

VARIANT (collected once):
  + mealPreference (OPTIONAL - dietary selections)
  + cabinPreference (OPTIONAL)
```

---

## 5. Variant Field Presence Matrix

| Field | Guided Tour | Attraction | Show | Safari | Cruise | Museum | Combo |
|-------|-------------|-----------|------|--------|--------|--------|-------|
| meetingPoint | REQ | - | - | REQ | REQ | - | - |
| languages | REQ | - | OPT | REQ | OPT | - | - |
| itinerary | REQ | - | - | OPT | OPT | - | - |
| guide | OPT | - | - | - | - | - | - |
| activities | OPT | - | - | REQ | OPT | - | - |
| groupSize | OPT | - | - | OPT | OPT | - | - |
| startTime | OPT | OPT | REQ | OPT | OPT | OPT | - |
| endTime | - | - | OPT | - | - | - | - |
| capacity | - | - | OPT | - | - | - | - |
| hotelPickup | OPT | - | - | OPT | OPT | - | - |
| openingHours | - | OPT | - | - | - | REQ | - |
| closedDays | - | OPT | - | - | - | REQ | - |
| audioGuide | - | OPT | - | - | - | OPT | - |
| ageRestrictions | OPT | OPT | OPT | - | OPT | OPT | - |
| weatherDependent | - | - | - | OPT | - | - | - |
| includedExperiences | - | - | - | - | - | - | REQ |
| validityPeriod | - | - | - | - | - | - | REQ |

Legend: REQ = Required | OPT = Optional | - = Not applicable

---

## 6. Pricing Model Breakdown

### PER_PERSON (95% of products)
**When used**: Majority of tours, attractions, shows

**Structure**:
```
prices: [
  {
    ageGroup: "ADULT",
    pricePerUnit: 89.99,
    currencyCode: "USD"
  },
  {
    ageGroup: "CHILD", 
    pricePerUnit: 49.99,
    ageRange: {min: 0, max: 12},
    currencyCode: "USD"
  },
  {
    ageGroup: "SENIOR",
    pricePerUnit: 69.99,
    ageRange: {min: 65},
    currencyCode: "USD"
  }
]
```

**Use cases**:
- Guided tours (pay per person)
- Museums (different rates for children/seniors)
- Theme park tickets (adult vs child pricing)
- Shows (tiered seating prices per person)

### PER_GROUP (5% of products)
**When used**: Private tours, group packages, charter experiences

**Structure**:
```
groupRanges: [
  {
    minGroupSize: 1,
    maxGroupSize: 4,
    pricePerGroup: 100,
    currencyCode: "USD"
  },
  {
    minGroupSize: 5,
    maxGroupSize: 7,
    pricePerGroup: 120,
    currencyCode: "USD"
  },
  {
    minGroupSize: 8,
    maxGroupSize: 10,
    pricePerGroup: 150,
    currencyCode: "USD"
  }
]
```

**Use cases**:
- Private guide hire (set price for group of X)
- Boat charter (per boat, not per person)
- Exclusive event booking (fixed group rate)
- Group tour packages (fixed price per group size tier)

**Constraint**: All variants of a product must use same pricing type (no mixing).

---

## 7. Media Schema

All experience types support media arrays:

```
media: [
  {
    url: "https://cdn.headout.com/image.jpg",
    type: "IMAGE",
    caption: "Beach view at sunset",
    alt: "Sandy beach with palm trees at sunset",
    order: 1
  },
  {
    url: "https://cdn.headout.com/video.mp4",
    type: "VIDEO",
    caption: "Tour highlight video",
    order: 2
  }
]
```

**Types**: IMAGE, VIDEO, PDF

---

## 8. Duration Handling by Inventory Type

| Inventory Type | Duration Field | Value | Example |
|---|---|---|---|
| FIXED_START_FIXED_DURATION | duration | number (milliseconds) | 7200000 (2 hours) |
| FIXED_START_FLEXIBLE_DURATION | duration | null | Customer explores until closing |
| FLEXIBLE_START_FIXED_DURATION | duration | number (milliseconds) | 3600000 (1 hour) |
| FLEXIBLE_START_FLEXIBLE_DURATION | duration | null | Valid for 14 days |

---

## 9. API Response Differences Summary

### Minimal Response (ATTRACTION_TICKET)
```json
{
  "id": "123",
  "name": "Louvre Museum Entry",
  "description": "...",
  "city": {...},
  "variants": [
    {
      "variantId": "var1",
      "inventoryType": "FIXED_START_FLEXIBLE_DURATION",
      "priceType": "PER_PERSON",
      "openingHours": {"monday": "9am-5pm"},
      "prices": [{"ageGroup": "ADULT", "price": 20}]
    }
  ]
}
```

### Complex Response (GUIDED_TOUR)
```json
{
  "id": "456",
  "name": "Paris City Tour",
  "description": "...",
  "city": {...},
  "variants": [
    {
      "variantId": "var1",
      "inventoryType": "FIXED_START_FIXED_DURATION",
      "priceType": "PER_PERSON",
      "duration": 14400000,
      "meetingPoint": {
        "address": "Eiffel Tower",
        "coordinates": {lat: 48.86, lng: 2.29}
      },
      "languages": ["en", "fr"],
      "itinerary": [
        {"day": 1, "stops": ["Eiffel Tower", "Louvre"]},
        {"day": 2, "stops": ["Versailles"]}
      ],
      "guide": {...},
      "groupSize": {"min": 2, "max": 12},
      "prices": [{"ageGroup": "ADULT", "price": 120}],
      "inputFields": [
        {"name": "language", "scope": "PRIMARY_CUSTOMER", "type": "enum"},
        {"name": "hotelPickup", "scope": "VARIANT", "type": "boolean"}
      ]
    }
  ]
}
```

---

## 10. Quick Decision Tree

**Choose inventory type based on**:

1. Does experience have fixed departure time?
   - **YES**: FIXED_START (Show, scheduled tour at 2pm)
   - **NO**: FLEXIBLE_START (theme park, day ticket)

2. Does customer exit at fixed time?
   - **YES**: FIXED_DURATION (2-hour boat ride)
   - **NO**: FLEXIBLE_DURATION (museum, explore anytime)

3. Combining above:
   - FIXED_START + FIXED_DURATION → FIXED_START_FIXED_DURATION (Broadway show)
   - FIXED_START + FLEXIBLE_DURATION → FIXED_START_FLEXIBLE_DURATION (museum opening at 9am)
   - FLEXIBLE_START + FIXED_DURATION → FLEXIBLE_START_FIXED_DURATION (hot air balloon 2-hour ride)
   - FLEXIBLE_START + FLEXIBLE_DURATION → FLEXIBLE_START_FLEXIBLE_DURATION (theme park day pass)

---

## 11. Common Pitfalls & Gotchas

1. **Duration is null for flexible-duration types**
   - Don't assume duration always exists
   - Check `inventoryType` first to determine if duration will be populated

2. **Can't mix pricing types across variants**
   - All variants must be PER_PERSON or all PER_GROUP
   - Design product structure accordingly

3. **meetingPoint is REQUIRED for tours but not attractions**
   - Different experience types have different mandatory fields
   - Check experience type before requiring field

4. **Input fields are variant-specific**
   - Different variants of same product may have different input requirements
   - Variants determine which fields to collect

5. **groupSize constraints affect inventory**
   - If minGroupSize=2, can't book for 1 person
   - Check inventory after selecting group size

6. **Slots array only exists for FIXED_START types**
   - FLEXIBLE_START types don't have pre-defined time slots
   - Build different UX for different inventory types

7. **ageRestrictions can affect both pricing and capacity**
   - Child pricing != child capacity
   - A 3-year-old might price as child but not allowed due to safety

8. **itinerary is required for multi-day tours**
   - Must be present for any experience > 1 day
   - Absence indicates single-day experience

---

## 12. Field Type Reference

| Type | Example | Validation |
|------|---------|-----------|
| **enum** | "ADULT", "CHILD" | Specific allowed values only |
| **string** | "Eiffel Tower Tour" | Any text |
| **number** | 89.99 | Numeric value |
| **date** | "2026-05-15" | YYYY-MM-DD format |
| **time** | "14:30" | HH:mm 24-hour format |
| **boolean** | true / false | true or false only |
| **array** | ["en", "fr"] | Ordered list of items |
| **object** | {lat: 48.86, lng: 2.29} | Key-value pairs |
| **null** | null | Explicitly missing/not applicable |

---

Generated: 2026-05-01
