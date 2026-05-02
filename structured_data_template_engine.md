# Structured Data Template Engine
## Role: Deterministic Code Step (No LLM) | Runs in Parallel with Content Generator

---

## Purpose

The Structured Data Template Engine maps verified fields from the Intake Agent output to schema.org JSON-LD without any LLM involvement. It is deterministic, fast, and never hallucinates because it only emits what the intake data contains.

The Content Generator also produces a `structured_data` block — that output is used for SEO strategy fields (canonical instructions, AI visibility notes, internal linking). The Template Engine output takes precedence for the actual `@graph` JSON-LD that is served to Google. The Review Agent validates the final merged structured data block.

---

## When It Runs

The Template Engine runs **in parallel** with the Content Generator, immediately after the Intake Agent completes. It does not wait for copy to be written. Its output is injected into the pipeline as a verified JSON-LD block.

```
Intake Agent output
       │
       ├──► Content Generator (LLM)
       │
       └──► Template Engine (deterministic code)  ◄─── runs here
                     │
                     ▼
              verified_json_ld.json
```

---

## Input

The complete Intake Agent JSON output. Required fields consumed:

| Intake Field | Used in Schema Type |
|---|---|
| `tour_name` | TourActivity.name |
| `description_summary` | TourActivity.description |
| `duration_ms` | TourActivity.duration (ISO 8601) |
| `adult_price`, `price_currency` | TourActivity.offers |
| `has_free_cancellation`, `cutoff_hours` | TourActivity.offers.priceSpecification |
| `location.city`, `location.country` | TourActivity.location |
| `location.lat`, `location.lng` | TourActivity.location.geo |
| `provider_name` | TourActivity.provider |
| `images[]` | TourActivity.image[] |
| `start_times[]` | TourActivity.openingHoursSpecification |
| `max_pax` | TourActivity.maximumAttendeeCapacity |
| `inventory_type` | TourActivity.isAccessibleForFree (FLEXIBLE vs FIXED) |
| `category` | TourActivity.touristType |
| `faqs[]` | FAQPage.mainEntity[] |
| `breadcrumb_path[]` | BreadcrumbList.itemListElement[] |

---

## Output

A single `verified_json_ld.json` file. Always uses `@graph` to combine all three schema types.

### Full Output Template

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TourActivity",
      "name": "{{tour_name}}",
      "description": "{{description_summary}}",
      "duration": "{{duration_iso8601}}",
      "provider": {
        "@type": "Organization",
        "name": "Headout",
        "url": "https://www.headout.com"
      },
      "location": {
        "@type": "Place",
        "name": "{{location.venue_name | location.city}}",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "{{location.city}}",
          "addressCountry": "{{location.country_code}}"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": "{{location.lat}}",
          "longitude": "{{location.lng}}"
        }
      },
      "offers": "{{offers_block}}",
      "image": "{{image_array}}",
      "maximumAttendeeCapacity": "{{max_pax | omit if null}}",
      "touristType": "{{tourist_type_block | omit if null}}",
      "openingHoursSpecification": "{{opening_hours_block | omit if start_times empty}}"
    },
    {
      "@type": "FAQPage",
      "mainEntity": "{{faq_entity_array}}"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": "{{breadcrumb_array}}"
    }
  ]
}
```

---

## Field Mapping Rules

### 1. `duration` — ISO 8601 Conversion

Input: `duration_ms` (integer, milliseconds)

```
IF duration_ms is null:
    OMIT the duration field entirely — do not emit "PT0S" or a placeholder

IF duration_ms is present:
    hours = floor(duration_ms / 3_600_000)
    minutes = floor((duration_ms % 3_600_000) / 60_000)
    
    IF minutes == 0:
        duration = "PT{hours}H"
    ELSE:
        duration = "PT{hours}H{minutes}M"

Examples:
    21_600_000 ms → "PT6H"
    5_400_000 ms  → "PT1H30M"
    7_200_000 ms  → "PT2H"
```

### 2. `offers` Block

Input: `adult_price`, `price_currency`, `has_free_cancellation`, `cutoff_hours`, `adult_price.status`

```
IF adult_price.status == "blocked" OR adult_price is null:
    offers = {
        "@type": "Offer",
        "availability": "https://schema.org/InStock",
        "seller": { "@type": "Organization", "name": "Headout" },
        "description": "Pricing available on Headout.com"
    }
    NOTE: Do not emit price or priceCurrency — Google will not penalize absent price,
          but will penalize incorrect price

IF adult_price is present and not blocked:
    base_offer = {
        "@type": "Offer",
        "price": adult_price.value,
        "priceCurrency": price_currency,
        "availability": "https://schema.org/InStock",
        "url": "https://www.headout.com/{{tour_slug}}/",
        "seller": { "@type": "Organization", "name": "Headout" }
    }
    
    IF has_free_cancellation == true:
        base_offer["priceSpecification"] = {
            "@type": "UnitPriceSpecification",
            "description": "Free cancellation up to {{cutoff_hours}} hours before start"
        }
    
    offers = base_offer
```

### 3. `image` Array

Input: `images[]` (array of URL strings)

```
IF images is empty or null:
    OMIT image field — do not emit placeholder URLs

IF images has items:
    image = [
        { "@type": "ImageObject", "url": images[0] },
        { "@type": "ImageObject", "url": images[1] },
        ... (all images, max 5)
    ]
    
    IF images has only 1 item:
        image = { "@type": "ImageObject", "url": images[0] }
        (single object, not array — schema.org prefers array but single is valid)
```

### 4. `openingHoursSpecification` Block

Input: `start_times[]` (array of "HH:MM" strings), `days_of_week[]` (if present)

```
IF start_times is empty or null:
    OMIT this field

IF start_times is present:
    FOR EACH time in start_times:
        {
            "@type": "OpeningHoursSpecification",
            "opens": "{{time}}",
            "closes": "{{time + duration | omit closes if duration_ms is null}}",
            "dayOfWeek": "{{days_of_week | default: all 7 days if not specified}}"
        }

Days of week mapping:
    "monday"    → "https://schema.org/Monday"
    "tuesday"   → "https://schema.org/Tuesday"
    "wednesday" → "https://schema.org/Wednesday"
    "thursday"  → "https://schema.org/Thursday"
    "friday"    → "https://schema.org/Friday"
    "saturday"  → "https://schema.org/Saturday"
    "sunday"    → "https://schema.org/Sunday"
```

### 5. `touristType` Block

Input: `category`, `experience_type`

```
IF experience_type == "ATTRACTION":
    OMIT touristType — attractions serve everyone

IF experience_type == "TOUR" and category is present:
    category_map = {
        "family":       "Family",
        "adventure":    "Thrill-Seeker",
        "culture":      "Cultural Tourist",
        "food":         "Food Enthusiast",
        "history":      "History Buff",
        "luxury":       "Luxury Traveler"
    }
    
    touristType = {
        "@type": "Audience",
        "audienceType": category_map[category] | category (raw, if not in map)
    }
```

### 6. FAQPage `mainEntity` Array

Input: `faqs[]` from Intake Agent (if present) OR `listing.faqs[]` from Content Generator output

Priority: use Content Generator FAQs if available (they are customer-phrased); fall back to intake FAQs.

```
FOR EACH faq in source_faqs:
    {
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.answer
        }
    }

Validation:
    IF faq_entity_array is empty:
        EMIT schema_error: "FAQPage has no questions — FAQPage type must be removed from @graph to avoid invalid schema"
        REMOVE FAQPage from @graph
```

### 7. BreadcrumbList

Input: `breadcrumb_path[]` from intake, OR constructed from `location.city`, `category`

```
IF breadcrumb_path is provided in intake:
    Use exactly as specified

IF breadcrumb_path is null:
    Construct default 4-level path:
    [
        { position: 1, name: "Headout",        url: "https://www.headout.com/" },
        { position: 2, name: "{city}",          url: "https://www.headout.com/{city_slug}/" },
        { position: 3, name: "{category}",      url: "https://www.headout.com/{city_slug}/{category_slug}/" },
        { position: 4, name: "{tour_name}",     url: "https://www.headout.com/{tour_slug}/" }
    ]

    Slug construction:
        city_slug     = lowercase(city).replace(" ", "-")
        category_slug = lowercase(category).replace(" ", "-")
        tour_slug     = lowercase(tour_name).replace(" ", "-").truncate(60)

Output format:
    itemListElement: [
        {
            "@type": "ListItem",
            "position": 1,
            "name": "Headout",
            "item": "https://www.headout.com/"
        },
        ...
    ]
```

### 8. `maximumAttendeeCapacity`

Input: `max_pax`

```
IF max_pax is null:
    OMIT field

IF max_pax is present:
    "maximumAttendeeCapacity": max_pax  (integer, not string)
```

---

## Omission Policy

The Template Engine follows a strict omit-rather-than-invent policy. If intake data for a field is null, absent, or blocked:
- The field is **omitted** from the output
- A **machine-readable omission log** is attached as a metadata sidecar (see below)
- No placeholder text, no "TBD", no invented values

This is the critical difference between the Template Engine and the Content Generator. The Content Generator hedges with copy ("subject to availability"); the Template Engine omits the schema field entirely.

---

## Metadata Sidecar

The Template Engine emits a `verified_json_ld_meta.json` alongside the main output. The Review Agent reads this to understand what was intentionally omitted.

```json
{
  "generated_at": "ISO 8601 timestamp",
  "intake_version": "string — intake agent run ID",
  "schema_types_emitted": ["TourActivity", "FAQPage", "BreadcrumbList"],
  "omitted_fields": [
    {
      "field": "TourActivity.duration",
      "reason": "duration_ms is null in intake",
      "intake_value": null
    },
    {
      "field": "TourActivity.offers.price",
      "reason": "adult_price.status is blocked",
      "intake_value": "blocked"
    }
  ],
  "faq_count": 6,
  "breadcrumb_depth": 4,
  "warnings": [
    "string — any non-fatal issues encountered during templating"
  ]
}
```

---

## Validation Before Emit

Run these checks before writing output. If any **fatal** check fails, emit an error and halt.

| Check | Level | Rule |
|---|---|---|
| `@graph` has TourActivity | Fatal | TourActivity is required — no output without it |
| TourActivity.name is non-empty | Fatal | Cannot emit unnamed schema |
| TourActivity.description is non-empty | Fatal | Cannot emit schema with no description |
| FAQPage has ≥ 1 question | Warning | If 0 questions, remove FAQPage from @graph and log warning |
| BreadcrumbList has ≥ 2 items | Warning | Single-item breadcrumb is useless — log and omit if only 1 |
| price is a number, not a string | Fatal | `"price": "45"` invalidates the schema — must be `"price": 45` |
| duration follows ISO 8601 | Fatal | Malformed duration string breaks Google parsing |
| All URLs are absolute (https://) | Fatal | Relative URLs are invalid in structured data |
| lat/lng are numbers within valid range | Warning | Lat: -90 to 90, Lng: -180 to 180 |

---

## Output Files

| File | Contents |
|---|---|
| `verified_json_ld.json` | The clean `@graph` JSON-LD block to inject into `<script type="application/ld+json">` |
| `verified_json_ld_meta.json` | Metadata sidecar with omissions log and validation notes |

---

## What the Template Engine Does NOT Do

- Does not write copy (no natural language generation)
- Does not call any LLM API
- Does not pull data from external sources (no live pricing lookups)
- Does not override the Content Generator's canonical strategy or AI visibility fields — those stay in the Content Generator's `structured_data` block
- Does not validate that FAQ answers are high quality — the Review Agent owns that check
- Does not merge with the Content Generator's `structured_data.json_ld` — the orchestrator handles the merge (see Pipeline Orchestration Spec)

---

## Implementation Notes

**Language**: Any — Python, Node.js, Go. This is a data transformation, not a service.

**Runtime**: Target < 200ms per listing. No network calls needed.

**Caching**: Cache the output per `intake_version` ID. If the intake agent output hasn't changed, do not regenerate.

**Test inputs to cover**:
1. `duration_ms: null` — duration omitted, no crash
2. `adult_price.status: "blocked"` — offers block with no price
3. `start_times: []` — openingHoursSpecification omitted
4. `images: []` — image omitted
5. `faqs: []` — FAQPage removed from @graph, warning logged
6. `breadcrumb_path: null` — default 4-level path constructed
7. `max_pax: null` — maximumAttendeeCapacity omitted
8. Full intake with all fields present — complete @graph with all three types
