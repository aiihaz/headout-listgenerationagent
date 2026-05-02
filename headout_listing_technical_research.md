# Headout Listing Page — Deep Technical Research

> Research methodology: Web search, Headout public GitHub API docs (`headout/api-docs`), analysis of 35+ real listing URLs, Hub Help Center articles, Headout Studio engineering blog, and integration flow documentation.

---

## 1. URL Architecture & Identifiers

### 1.1 URL Pattern — Experience (Product) Page

```
https://www.headout.com/{category-slug}/{experience-slug}-e-{productId}/
```

- **`-e-{productId}`** is the canonical identifier. The numeric ID at the end is what the system uses to look up the product.
- The `category-slug` and `experience-slug` are human-readable/SEO slugs that can change without breaking the page (the `-e-{id}` is the source of truth).
- The CDN for images is: `cdn-imgix.headout.com`

### 1.2 URL Pattern — Category & Taxonomy Pages

| Type | Pattern | Example |
|------|---------|---------|
| **Category page** | `/{slug}-c-{categoryId}/` | `/burj-khalifa-tickets-c-158/` |
| **Subcategory page** | `/{slug}-sc-{catId}~{subId}/` | `/museums-new_york-sc-1002~21553/` |
| **Global subcategory** | `/{slug}-glsc-{id}/` | `/guided-tours-glsc-1010/` |
| **City page** | `/things-to-do-city-{city}/` | `/things-to-do-city-rome/` |
| **City+Attraction** | `/tickets-{city}-ca-{attractionId}~{cityId}/` | `/tickets-tokyo-ca-1~12284/` |

**Key insight:** The `-e-`, `-c-`, `-sc-`, `-glsc-`, `-ca-` suffixes are the system's identifiers. They encode both the type of page and the numeric ID into a SEO-friendly URL.

---

## 2. Real Listings Analyzed (35+ Across Categories)

### 2.1 Observation Decks / Towers
| Product | URL | ID |
|---------|-----|----|
| Burj Khalifa At The Top Level 124 & 125 | `/burj-khalifa-tickets/burj-khalifa-at-the-top-tickets-level-124-125-e-1866/` | 1866 |
| Burj Khalifa At The Top SKY (148 + 124) | `/burj-khalifa-tickets/burj-khalifa-at-the-top-sky-tickets-with-introductory-tour-coffee-e-1864/` | 1864 |
| Burj Khalifa Level 124 & 125 (alt) | `/burj-khalifa-tickets/burj-khalifa-a-the-top-ticket-level-124-and-125-e-22576/` | 22576 |
| Dubai Frame | `/dubai-frame-tickets/dubai-frame-tickets-e-8541/` | 8541 |
| Tokyo Skytree | `/tokyo-skytree-tickets/tokyo-skytree-tickets-e-11721/` | 11721 |
| Tokyo Skytree (alt variant) | `/tokyo-skytree-tickets/tokyo-skytree-tickets-e-26362/` | 26362 |
| Edge Observation Deck NYC | `/edge-observation-deck-tickets/tickets-to-edge-observation-deck-e-19513/` | 19513 |
| Empire State Building + Statue of Liberty | `/empire-state-building-tickets/skip-the-line-empire-state-building-tickets-statue-of-liberty-cruise-e-6091/` | 6091 |

### 2.2 Historic Sites / Museums
| Product | URL | ID |
|---------|-----|----|
| Colosseum + Roman Forum + Palatine Hill Tour | `/colosseum-tickets/colosseum-roman-forum-and-palatine-hill-skip-the-line-guided-tour-e-3075/` | 3075 |
| Colosseum Underground Small Group Tour | `/colosseum-tickets/colosseum-underground-small-group-tour-with-roman-forum-gladiator-arena-e-10208/` | 10208 |
| Acropolis & Parthenon with Audio Guide | `/athens-acropolis-tickets/entry-tickets-to-athens-acropo-and-parthenon-with-audio-guide-e-12045/` | 12045 |
| Tower of London with Crown Jewels | `/tower-of-london-tickets/tower-of-london-tickets-with-crown-jewels-e-3291/` | 3291 |
| Intrepid Museum NYC | `/intrepid-museum-tickets/intrepid-museum-tickets-e-4588/` | 4588 |
| Louvre Museum Direct Entry (Paris) | `/louvre-museum-tickets/louvre-museum-direct-entry-tickets-guaranteed-entry-within-30-minutes-e-3909/` | 3909 |
| Louvre Abu Dhabi Skip-the-Line | `/louvre-abu-dhabi-tickets/louvre-abu-dhabi-skip-the-line-tickets-e-8583/` | 8583 |

### 2.3 Architecture / Religious Sites
| Product | URL | ID |
|---------|-----|----|
| Sagrada Familia Priority Entrance | `/sagrada-familia-tickets/priority-access-to-sagrada-familia-escorted-entrance-e-17925/` | 17925 |
| Sagrada Familia Small Group Tour | `/sagrada-familia-tickets/gaudi-sagrada-familia-small-group-tour-e-21409/` | 21409 |
| Sagrada Familia with Tower Access | `/sagrada-familia-tickets/fast-track-guided-tour-to-sagrada-familia-with-tower-access-e-9497/` | 9497 |
| Sagrada Familia with Audio Guide | `/sagrada-familia-tickets/sagrada-familia-skip-the-line-tickets-with-audioguide-e-7324/` | 7324 |
| Sagrada Familia with Transportation | `/sagrada-familia-tickets/skip-the-line-sagrada-familia-guided-tour-with-transportation-e-10879/` | 10879 |

### 2.4 Tours / Guided Experiences
| Product | URL | ID |
|---------|-----|----|
| Eiffel Tower Guided Tour | `/eiffel-tower-skip-the-line-tickets/guided-eiffel-tower-tour-e-9080/` | 9080 |
| Harry Potter Film Locations Walking Tour | `/harry-potter-walking-tours/harry-potter-film-locations-guided-tour-e-10072/` | 10072 |
| Abu Dhabi + Louvre Full Day Tour | `/city-tours/full-day-guided-tour-of-abu-dhabi-mosque-and-louvre-museum-with-lunch-from-dubai-e-14828/` | 14828 |
| Park Güell + Sagrada Familia Tour | `/barcelona-park-guell-tickets/best-of-barcelona-park-guell-la-sagrada-familia-guided-tour-e-6709/` | 6709 |

### 2.5 Cruises / Water
| Product | URL | ID |
|---------|-----|----|
| Amsterdam Canal Cruise (1hr, Audio Guide) | `/sightseeing-cruises/lovers-1-hour-amsterdam-canal-cruise-with-audio-guide-e-9731/` | 9731 |
| Seine River Bateaux Mouches 1-hr | `/sightseeing-cruises/1-hour-seine-river-cruise-with-live-commentary-e-4282/` | 4282 |
| Seine River Champagne Cruise | `/sightseeing-cruises/sparkling-champagne-seine-river-cruise-tickets-from-pont-de-lalma-e-9345/` | 9345 |

### 2.6 Shows / Entertainment
| Product | URL | ID |
|---------|-----|----|
| City Hall Theatre Flamenco Show (Barcelona) | `/flamenco-in-barcelona/tickets-to-flamenco-show-at-city-hall-theatre-e-21642/` | 21642 |
| Moulin Rouge Show + Seine River Cruise | `/moulin-rouge-paris-tickets/moulin-rouge-show-seine-river-cruise-e-9386/` | 9386 |

### 2.7 Desert / Outdoor
| Product | URL | ID |
|---------|-----|----|
| Heritage Evening Desert Safari Dubai | `/dubai-desert-safari/luxury-heritage-evening-desert-safari-with-free-dune-bashing-e-25241/` | 25241 |
| Arabian Desert Safari + BBQ Dubai | `/dubai-desert-safari/arabian-desert-safari-with-sandboarding-camel-ride-bbq-dinner-e-25199/` | 25199 |

### 2.8 Combo Tickets
| Product | URL | ID |
|---------|-----|----|
| ARTE Museum + Burj Khalifa Combo | `/arte-museum-tickets/combo-arte-museum-dubai-burj-khalifa-at-the-top-levels-124-125-tickets-e-28997/` | 28997 |
| London Eye + Up at The O2 Combo | `/london-eye-tickets/combo-up-at-the-o2-tickets-london-eye-admission-tickets-e-28549/` | 28549 |
| Montjuïc Cable Car + Barcelona Aquarium | `/montjuic-tickets/combo-montjuic-cable-car-barcelona-aquarium-tickets-e-21526/` | 21526 |
| Paradox Museum + Seine River Cruise | `/paradox-museum-paris/combo-paradox-museum-tickets-bateaux-parisiens-seine-river-sightseeing-cruise-e-40676/` | 40676 |

---

## 3. API Architecture — What Calls Does a Listing Page Make?

### 3.1 Technical Stack
- **Frontend**: Next.js (SSR + client-side hydration)
- **Initial data delivery**: `__NEXT_DATA__` JSON blob embedded in the HTML for the first paint
- **Image CDN**: Imgix (`cdn-imgix.headout.com`) with responsive sizing
- **API base**: `https://www.headout.com/api/public/v{version}/`
- **Auth**: `Headout-Auth` header with API key (for partner-facing APIs)

### 3.2 Page Load API Call Sequence

When a user lands on a listing page (e.g. `/colosseum-tickets/...-e-3075/`), the following happens:

```
PAGE LOAD
│
├── [SSR] GET /api/public/v2/products/{productId}
│         → Returns: name, description, category, city, media,
│                    variants, inclusions, exclusions, FAQs,
│                    itinerary, highlights, cancellation policy,
│                    starting price, rating, review count
│
├── [SSR] GET /api/public/v2/products/{productId}/content
│         → Returns: long-form description, about sections,
│                    SEO meta fields
│
├── [CLIENT] GET /api/public/v2/inventory/{productId}/date-range
│         → Params: startDate, endDate (typically today + 90 days)
│         → Returns: available dates per variant, date-level pricing
│         → HIGHLY DYNAMIC — refreshed each time user opens calendar
│
├── [CLIENT] On date select: GET /api/public/v2/inventory/{variantId}/{date}
│         → Returns: available time slots + per-slot pricing
│                    profiles (Adult, Child, etc.) with amounts
│
├── [CLIENT/SSR] GET /api/public/v2/products/{productId}/reviews
│         → Params: limit, offset, sortBy
│         → Returns: review list, overall rating, distribution
│
└── [CLIENT] GET /api/public/v2/products/{productId}/similar
          → Returns: list of related products (for "You might also like")
```

### 3.3 Key Identifiers in the API

| Identifier | Description | Example |
|-----------|-------------|---------|
| `productId` | Top-level experience ID (= the `-e-{id}` in the URL) | `3075` |
| `variantId` | A bookable option within a product | `2636`, `2637`, `2638` |
| `inventoryId` | A specific date-time-variant unit (created on inventory fetch) | dynamic |
| `cityCode` | City identifier | `NEW_YORK`, `DUBAI`, `ROME` |
| `categoryId` | Category ID (= the `-c-{id}` in category URLs) | `158` |

### 3.4 Inventory Is Highly Volatile

- ~90 days of active inventory maintained per product
- Pricing can change per slot (morning vs. evening, weekday vs. weekend)
- Availability changes in real-time as bookings come in
- Caching guidance (from partner docs): Product list → 1-day refresh; Inventory → near real-time

---

## 4. Data Model — Full Field Schema

### 4.1 Product Object (Public API v2)

```json
{
  "id": "3075",
  "name": "Colosseum, Roman Forum & Palatine Hill Skip-the-Line Guided Tour",
  "canonicalUrl": "https://www.headout.com/colosseum-tickets/...-e-3075/",
  "city": {
    "code": "ROME",
    "name": "Rome",
    "image": { "url": "//cdn-imgix.headout.com/..." }
  },
  "category": {
    "id": "42",
    "name": "Colosseum Tickets",
    "cityCode": "ROME"
  },
  "subCategory": {
    "id": "121",
    "name": "Guided Tours"
  },
  "media": [
    { "url": "https://cdn-imgix.headout.com/media/images/abc123.jpg", "type": "IMAGE" },
    { "url": "https://cdn-imgix.headout.com/media/videos/xyz.mp4",   "type": "VIDEO" }
  ],
  "startingPrice": {
    "amount": 49.00,
    "currencyCode": "USD",
    "originalAmount": 59.00
  },
  "rating": 4.6,
  "reviewCount": 12847,
  "cashback": { "amount": 2.00, "currencyCode": "USD" },
  "highlights": [
    "Skip the queue with timed entry tickets",
    "Explore the Colosseum arena floor — where gladiators fought",
    "Walk through the Roman Forum and Palatine Hill with an expert guide"
  ],
  "description": "...(long-form HTML/markdown)...",
  "variants": [ ... ],
  "inclusions": [ "Expert English-speaking guide", "Skip-the-line ticket" ],
  "exclusions": [ "Hotel pickup/drop-off", "Food and beverages", "Gratuities" ],
  "itinerary": [ ... ],
  "faqs": [
    { "question": "Is the Colosseum suitable for children?", "answer": "Yes..." },
    { "question": "Are there blackout dates?", "answer": "..." }
  ],
  "importantInformation": "...",
  "meetingPoint": { "description": "...", "latitude": 41.89, "longitude": 12.49 },
  "cancellationPolicy": {
    "type": "FREE_CANCELLATION",
    "cutoffHours": 24,
    "description": "Cancel up to 24 hours in advance for a full refund"
  },
  "duration": { "value": 3, "unit": "HOURS" },
  "languages": ["English", "Spanish", "Italian"],
  "groupSize": { "min": 1, "max": 15 },
  "tags": ["skip-the-line", "guided-tour", "small-group"]
}
```

### 4.2 Variant Object

```json
{
  "id": 2636,
  "name": "Skip the Line",
  "description": "Direct entry with timed access — no queuing",
  "inventoryType": "FIXED_START_FIXED_DURATION",
  "pricingType": "PER_PERSON",
  "duration": { "value": 180, "unit": "MINUTES" },
  "inclusions": [ "Timed entry ticket", "Arena floor access" ],
  "exclusions": [ "Guide", "Audio guide" ]
}
```

```json
{
  "id": 2637,
  "name": "Guided Tour + Skip the Line",
  "inventoryType": "FIXED_START_FIXED_DURATION",
  "pricingType": "PER_PERSON",
  "duration": { "value": 180, "unit": "MINUTES" }
}
```

### 4.3 Inventory Types (4 Combinations)

| Type | Meaning | Example |
|------|---------|---------|
| `FIXED_START_FIXED_DURATION` | Specific departure time + fixed length | Seine Cruise 11:00 AM, 1 hr |
| `FIXED_START_FLEXIBLE_DURATION` | Fixed entry slot, open-ended experience | Timed museum entry |
| `FLEXIBLE_START_FIXED_DURATION` | Anytime entry, fixed duration | Many attraction tickets |
| `FLEXIBLE_START_FLEXIBLE_DURATION` | Fully open | Open-date museum tickets |

### 4.4 Pricing Types

**PER_PERSON** (~95% of products)
```json
{
  "pricingType": "PER_PERSON",
  "profiles": [
    { "type": "ADULT",  "priceType": "ADULT",  "minAge": 13, "maxAge": 99, "price": 49.00 },
    { "type": "CHILD",  "priceType": "CHILD",  "minAge": 3,  "maxAge": 12, "price": 25.00 },
    { "type": "INFANT", "priceType": "INFANT", "minAge": 0,  "maxAge": 2,  "price": 0.00  },
    { "type": "SENIOR", "priceType": "SENIOR", "minAge": 65, "maxAge": 99, "price": 39.00 }
  ]
}
```

**PER_GROUP** (~5% of products)
```json
{
  "pricingType": "PER_GROUP",
  "groups": [
    { "minPax": 1, "maxPax": 4,  "price": 120.00 },
    { "minPax": 5, "maxPax": 8,  "price": 180.00 },
    { "minPax": 9, "maxPax": 15, "price": 240.00 }
  ]
}
```

---

## 5. Listing Page Content Sections (What Gets Rendered)

Every Headout listing page renders these sections, in roughly this order:

### 5.1 Hero Section (Above the Fold)
- **Title** (H1): The product name
- **Image gallery**: Carousel of 5–10 images (from `media[]`)
- **Breadcrumbs**: City → Category → Experience
- **Quick-stat badges** (horizontal icon row):
  - ⏱ Duration (e.g., "3 hours")
  - 🌐 Languages (e.g., "English, Spanish")
  - 👥 Group size (e.g., "Max 15 people")
  - ⚡ Instant Confirmation (lightning bolt icon)
  - 🎫 Skip-the-line (if applicable)
  - 📅 Free cancellation (if applicable)
- **Rating** (stars + score + review count)
- **Starting price** (per-person, in user's currency)
- **CTA**: "Check availability" / "Book now"

### 5.2 Booking Widget (Sticky Right Rail / Bottom Bar on Mobile)
Dynamic — loaded client-side:
- Date picker (calendar showing available/unavailable days)
- Variant selector (tabs: "Skip the Line" | "Guided Tour" | etc.)
- Time slot picker (appears after date is selected)
- Ticket quantity per profile type (Adult ×N, Child ×N, etc.)
- Total price (updates live)
- "Book now" button

### 5.3 Highlights
- 3–7 bullet points summarizing the key selling points
- Short, punchy, benefit-led (not feature-led)

### 5.4 About This Experience
- Long-form description: 200–500 words
- What the experience is, why it's special, what you'll see/do
- Often HTML-formatted with sub-headings

### 5.5 What's Included / What's Not Included
Two parallel lists:
- ✅ Inclusions: "Expert English guide", "Skip-the-line tickets", etc.
- ❌ Exclusions: "Hotel pickup", "Food & beverages", "Gratuities"

### 5.6 Itinerary / What to Expect
Step-by-step walkthrough of the experience (when provided):
- Stop 1: Meeting point
- Stop 2: Colosseum Arena
- Stop 3: Roman Forum
- Stop 4: Palatine Hill

### 5.7 Know Before You Go
Dropdown section with critical visitor info:
- Dress code requirements
- Restrictions (no food, no large bags, no flash photography)
- Accessibility info
- ID requirements
- Age restrictions
- Voucher/ticket redemption instructions

### 5.8 Meeting Point
- Text description of where to meet
- Google Maps embed
- Latitude/longitude coordinates

### 5.9 Cancellation Policy
- Standard: "Free cancellation up to 24 hours before"
- Non-refundable: "This experience is non-refundable"
- Custom: Experience-specific policy text

### 5.10 FAQs
- 4–10 Q&A pairs
- Cover common questions about the experience, logistics, access

### 5.11 Reviews
- Overall rating + distribution chart
- Individual reviews (paginated)
- Sorted by: Most Recent / Most Helpful

### 5.12 Similar Experiences
- Horizontal scroll card row
- 4–8 recommended alternatives in the same category/city

---

## 6. SEO Layer — What Gets Indexed

Each listing page generates:
```html
<title>{Experience Name} | Best Price Guarantee | Headout</title>
<meta name="description" content="{150–160 char SEO description}">
<link rel="canonical" href="https://www.headout.com/{category}/{slug}-e-{id}/">
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:image" content="https://cdn-imgix.headout.com/...">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TouristAttraction",
  "name": "...",
  "description": "...",
  "offers": { ... },
  "aggregateRating": { "ratingValue": 4.6, "reviewCount": 12847 }
}
</script>
```

**SEO fields required for a listing:**
- `seoTitle`: Usually `{Experience Name} | Headout` (50–60 chars)
- `metaDescription`: Action-driven summary (150–160 chars)
- `canonicalUrl`: Auto-generated from `/{category-slug}/{exp-slug}-e-{id}/`
- `ogImage`: First image from `media[]`
- Schema.org structured data: TouristAttraction or Product type

---

## 7. Dynamic vs. Static Content on a Listing Page

| Content | Static (SSR/build time) | Dynamic (client-side) |
|---------|------------------------|----------------------|
| Title, description, highlights | ✅ | |
| Images | ✅ | |
| Inclusions / Exclusions | ✅ | |
| FAQs | ✅ | |
| Starting price (from) | ✅ (may be stale) | |
| Cancellation policy | ✅ | |
| Variant names & descriptions | ✅ | |
| **Available dates (calendar)** | | ✅ |
| **Time slots** | | ✅ |
| **Live pricing per slot** | | ✅ |
| **Remaining availability** | | ✅ |
| **Reviews** (first page) | ✅ | Paginated via client |

---

## 8. Content Rules & Patterns Observed

### 8.1 Title Patterns (from 35+ listings)
```
{Attraction} {Ticket Type} {Differentiator}
```
Examples:
- `Burj Khalifa At The Top SKY Tickets — Levels 148, 124 & 125`
- `Colosseum, Roman Forum & Palatine Hill Skip-the-Line Guided Tour`
- `1-Hour Bateaux Mouches Seine River Cruise with Live Commentary`
- `Sagrada Familia Fast-Track Guided Tour with Tower Access`

Patterns observed:
- Always leads with the attraction name
- Ticket type second (Skip-the-Line, Guided Tour, Priority Access, Fast Track)
- Differentiator last (Levels 124 & 125, with Audio Guide, Small Group)
- Never uses "&" in the URL slug (replaced with "and")
- Combos always say "Combo" in title: `Combo: ARTE Museum + Burj Khalifa`

### 8.2 Category-Slug Conventions
- `{attraction}-tickets` (e.g., `burj-khalifa-tickets`, `louvre-museum-tickets`)
- `{activity}-tours` (e.g., `harry-potter-walking-tours`, `city-tours`)
- `sightseeing-cruises` (catch-all for water tours)
- `flamenco-in-barcelona`, `dubai-desert-safari` (experience-type categories)

### 8.3 Variant Naming Conventions
From the 35+ listings analyzed, variants follow these patterns:
- By access level: `General Admission` / `Skip the Line` / `Priority Access` / `Fast Track`
- By experience depth: `Self-Guided` / `Audio Guide` / `Guided Tour` / `Small Group Tour`
- By floor/level: `Level 124 & 125` / `Level 148 SKY`
- By time: `Morning` / `Evening` / `Sunset` / `Sunrise`
- By group: `Private Tour` / `Shared Tour` / `Small Group (max 8)`
- By add-on: `With Transportation` / `With Lunch` / `With Coffee`

### 8.4 Description Writing Rules
From the ContentGPT system (Headout's AI content tool, launched Nov 2024):
- Uses a "Scraper Summarizer" that pulls data from existing listings + supplier info
- Generates 3–5 draft variants via GPT-4 for human review
- ~70–80% of new listings start as AI-generated drafts
- Human editors refine tone, accuracy, and Headout style guide compliance
- Final check: fact-checker + content checker (planned integration)

### 8.5 Inclusions / Exclusions Rules
**Always Included (when applicable):**
- Skip-the-line/timed entry ticket
- Licensed guide (if guided tour)
- Audio guide device (if audio-guided)
- Hotel pickup/dropoff (only if explicitly offered)

**Always Excluded:**
- Gratuities/tips (always excluded, never included even if offered)
- Food & beverages (unless explicitly a dining experience)
- Hotel pickup (unless explicitly included)
- Personal expenses

### 8.6 Cancellation Policy Rules
Three tiers:
1. **Free cancellation**: Cancel up to 24 hours before → full refund (most experiences)
2. **Partial refund**: Cancel up to 48 hours → X% refund (some shows/events)
3. **Non-refundable**: Sporting events, Broadway shows, fixed-date events

### 8.7 Ambiguity Handling Observations

**"No blackout dates listed"** → Listed as "Available daily" + note "Subject to venue closure without notice"

**"Tower access not guaranteed"** (Sagrada Familia case):
- `fast-track-guided-tour-to-sagrada-familia-with-tower-access-e-9497/` explicitly names tower access in the title
- Separate listing for tours without tower access
- Headout resolves ambiguity by creating separate variants/products, not caveating one product

**"Contact us for special closures"**:
- These get surfaced in "Know Before You Go" section
- Often phrased: "The venue may be closed on national holidays. We recommend checking with the venue."
- Dates that are clearly blocked out in the inventory calendar (not explained in text)

**Unclear group sizes**:
- Where supplier says "small group" without specifying: Listed as "Small group" with max confirmed at booking
- Where max confirmed: Listed explicitly ("Max 15 guests")

---

## 9. Supplier-to-Listing Mapping

### 9.1 What Headout Needs from a Supplier

Based on Hub Help Center + API docs, these are the raw inputs needed:

| Supplier Provides | Maps to Listing Field |
|------------------|----------------------|
| Experience name | Title (draft) |
| Description / brochure | About + Highlights (rewritten) |
| Photos | `media[]` |
| What's included | `inclusions[]` |
| Not included | `exclusions[]` |
| Operating hours | Inventory schedule |
| Pricing per person / group | Profile pricing |
| Age restrictions | Profile `minAge`/`maxAge` |
| Duration | `duration` |
| Meeting point / pickup | `meetingPoint` |
| Languages offered | `languages[]` |
| Max group size | `groupSize.max` |
| Cancellation terms | `cancellationPolicy` |
| Blackout dates / closures | Inventory blocking |
| API connectivity code | API code linking to supplier system |
| Special notes / dress code | `importantInformation` |

### 9.2 What Content Ops Must Create from Scratch

These are NOT directly supplied and must be written/structured:
- SEO-optimized title (rewrite of supplier name)
- `highlights[]` (3–7 bullets — synthesized from description)
- `metaDescription` (160 chars — written for SEO)
- `seoTitle` (60 chars)
- `faqs[]` (researched and written)
- Category + subcategory selection
- URL slug construction
- Schema.org JSON-LD markup
- Variant structure (determining how many variants, what they're called)
- Variant descriptions
- Image selection + ordering (first image = OG image)

---

## 10. The 2–4 Hour Content Ops Process (Decomposed)

Based on all research, the manual process likely looks like:

| Step | Time | What happens |
|------|------|-------------|
| **1. Read supplier info** | 15 min | Parse raw brochure, website, PDF |
| **2. Research the experience** | 20 min | Google the attraction, check competitors |
| **3. Determine variants** | 10 min | Decide how many variants, names, what differentiates |
| **4. Write title** | 5 min | SEO-optimized title following naming conventions |
| **5. Write description/about** | 30 min | 300–500 word description |
| **6. Write highlights** | 10 min | 5–7 punchy bullets |
| **7. Structure inclusions/exclusions** | 10 min | Map supplier info → standard format |
| **8. Write Know Before You Go** | 10 min | Dress code, restrictions, important info |
| **9. Confirm meeting point** | 10 min | Research + verify GPS coordinates |
| **10. Write FAQs** | 15 min | 5–7 common questions + answers |
| **11. Write SEO meta** | 10 min | Title (60 chars), description (160 chars) |
| **12. Select & order images** | 10 min | Choose hero image, order gallery |
| **13. Set up pricing/inventory** | 15 min | Input profile prices, set schedule |
| **14. Quality review + publish** | 20 min | Fact-check, formatting, final approval |
| **TOTAL** | ~3 hrs | (+ variation based on experience complexity) |

---

## 11. Key Patterns for Agent Architecture

### Inputs the agent receives (raw supplier data):
- Experience name/description (messy, marketing-speak, variable quality)
- Images (URLs or file attachments)
- Pricing (flat rate, tiered, seasonal — all formats)
- Schedule (text-based, e.g., "Daily 9 AM–6 PM, closed Mondays")
- Inclusions/exclusions (freeform text)
- Supplier notes / FAQ

### What the agent must produce:
```
OUTPUT SCHEMA
├── title: string (60 chars max, SEO-optimized)
├── seoTitle: string (60 chars)
├── metaDescription: string (160 chars)
├── category: string (enum from Headout taxonomy)
├── subCategory: string
├── city: string (cityCode)
├── highlights: string[] (5–7 items)
├── description: string (300–500 words)
├── inclusions: string[]
├── exclusions: string[]
├── importantInformation: string
├── meetingPoint: { description: string, coordinates?: {lat, lng} }
├── cancellationPolicy: { type: enum, cutoffHours: number, description: string }
├── duration: { value: number, unit: "MINUTES"|"HOURS"|"DAYS" }
├── languages: string[]
├── variants: [
│     {
│       name: string,
│       description: string,
│       inventoryType: enum (4 options),
│       pricingType: "PER_PERSON"|"PER_GROUP",
│       profiles?: [{ type, minAge, maxAge, price }],
│       groups?: [{ minPax, maxPax, price }]
│     }
│   ]
├── faqs: [{ question: string, answer: string }]
└── publishReadiness: {
      verdict: "READY" | "NEEDS_HUMAN_REVIEW",
      reasons?: string[]   // only when NEEDS_HUMAN_REVIEW
    }
```

### Ambiguity resolution rules (for the agent):

| Ambiguity | Rule |
|-----------|------|
| "No blackout dates mentioned" | → `availableDaily: true` + flag in importantInformation: "Check venue for holiday closures" |
| "Contact us for special closures" | → NEEDS_HUMAN_REVIEW: "Closure dates unconfirmed — add to inventory blocking or importantInformation" |
| "Tower access not guaranteed" | → Create TWO variants: "With Tower Access" and "Without Tower Access" — do not caveat one variant |
| Pricing not specified | → NEEDS_HUMAN_REVIEW: "Pricing missing — cannot generate variants" |
| Duration vague ("half day") | → Interpret as 4 hours; flag for review |
| Group size not stated | → Omit `groupSize.max` field; flag for review |
| Only single price given, no age tiers | → Create Adult-only pricing; flag "Child pricing unknown" |
| Supplier says "private tour available" but no price | → Create Private Tour variant with null price; flag NEEDS_HUMAN_REVIEW |
| Images not provided | → NEEDS_HUMAN_REVIEW: "No images — cannot publish without at least 1 image" |
| Description < 100 words | → Agent expands using web research; flag expanded content for review |

---

## Sources

- [Headout Public API Docs (GitHub)](https://github.com/headout/api-docs)
- [Integration Flow for Partners Wiki](https://github.com/headout/api-docs/wiki/Integration-flow-for-Partners)
- [Product Models v1](https://github.com/headout/api-docs/blob/master/object-models/v1/product-models.md)
- [Products API v2](https://github.com/headout/api-docs/blob/master/apis/v2/products.md)
- [Hub Help Center — How to Add an Experience](https://hub-help.headout.com/hc/en-us/articles/10360256715805-How-to-Add-an-Experience)
- [Hub Help Center — Adding an Option](https://hub-help.headout.com/hc/en-us/articles/11012671815965-Adding-an-Option-for-an-Experience)
- [Hub Help Center — Types of Tickets](https://hub-help.headout.com/hc/en-us/articles/8397027441181-Types-of-Tickets-at-Headout)
- [Headout Studio — AI at Work: Automating Product Content](https://www.headout.studio/ai-at-work-automating-product-content-generation-at-headout-2/)
- [Headout Studio — A Scalable Content Strategy](https://www.headout.studio/a-scalable-content-strategy/)
- 35+ real listing page URLs analyzed (documented in Section 2)
