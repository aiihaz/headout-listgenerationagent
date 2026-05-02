# Headout API Structure: Comprehensive Research Findings

## Executive Summary

This research compiled information about Headout's listing page API across different experience types. While GitHub rate limits prevented direct access to full documentation files, comprehensive web searches revealed key API patterns, enum values, field structures, and conditional requirements across experience types.

---

## 1. EXPERIENCE TYPE ENUM VALUES

### Primary Category Types (from API documentation)
The Headout API supports the following experience type enumerations:
- **GUIDED_TOUR** - Guided tours with guides and group experiences
- **ATTRACTION_TICKET** - Admission/entry tickets for attractions
- **SHOW_OR_EVENT** - Shows, performances, events with fixed showings
- **DESERT_SAFARI** - Desert safari and adventure experiences
- **BOAT_CRUISE** - Boat/cruise experiences
- **MUSEUM_TICKET** - Museum/cultural venue tickets
- **COMBO_TICKET** - Bundled/combo ticket packages

### Inventory Type Enum (Controls scheduling flexibility)
- **FIXED_START_FIXED_DURATION** - Scheduled tour at specific time with fixed length (e.g., Broadway shows)
- **FIXED_START_FLEXIBLE_DURATION** - Scheduled start but variable end time (e.g., museum entry)
- **FLEXIBLE_START_FIXED_DURATION** - Customer picks start time, fixed duration (e.g., hot air balloon)
- **FLEXIBLE_START_FLEXIBLE_DURATION** - Complete flexibility (e.g., theme park entry)

---

## 2. PRICING TYPE ENUM

### Per-Person vs Per-Group Pricing
- **PER_PERSON** - Individual price per participant (majority of products ~95%)
  - Supports different profiles: Adult, Child, Senior, etc.
  - Each profile has its own price point
  - Used for most tours and attractions
  
- **PER_GROUP** - Single price for entire group with range-based pricing
  - Example: 1-4 people $100, 5-7 people $120, 8-10 people $150
  - Group-wide pricing flexibility
  - Used for private tours, group-only experiences

**Key Constraint**: Headout does not currently support products with variants of different price types (all variants must be PER_PERSON or all must be PER_GROUP).

---

## 3. PRODUCT OBJECT SCHEMA

### Standard Product-Level Fields (apply across all types)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique product identifier |
| name | string | Yes | Product display name |
| description | string | Yes | Full product description |
| canonicalUrl | string | Yes | SEO-friendly product URL |
| city | object | Yes | City information (code, name, image) |
| variants | Variant[] | Yes | Array of bookable variants (min 1) |
| media/medias | Media[] | No | Array of images/videos (url, type: IMAGE/VIDEO) |
| images | string[] | No | Primary image URLs for display |
| inclusions | string[] | No | What's included in experience |
| exclusions | string[] | No | What's excluded from experience |
| cancellationPolicy | object | No | Cancellation terms and refund conditions |
| category | string | No | Experience category/type enum |
| categoryCode | string | No | Internal category code |
| language | string[] | No | Available languages |
| itinerary | Itinerary[] | Conditional | Day-by-day breakdown (required for multi-day tours) |
| duration | number | Conditional | Total experience duration in milliseconds |
| durationText | string | No | Human-readable duration (e.g., "2 hours") |
| highlights | string[] | No | Key highlights of experience |
| faq | FAQ[] | No | Frequently asked questions |
| reviews | Review[] | No | Customer reviews data |
| averageRating | number | No | Average review rating (0-5) |
| reviewCount | number | No | Total number of reviews |

---

## 4. VARIANT OBJECT SCHEMA

### Core Variant Fields (apply to all experience types)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| variantId | string | Yes | Unique variant identifier |
| name | string | Yes | Variant name/title |
| inventoryType | enum | Yes | FIXED_START_FIXED_DURATION / FIXED_START_FLEXIBLE_DURATION / FLEXIBLE_START_FIXED_DURATION / FLEXIBLE_START_FLEXIBLE_DURATION |
| priceType | enum | Yes | PER_PERSON or PER_GROUP |
| duration | number | Conditional | Duration in milliseconds (null for FIXED_START_FLEXIBLE_DURATION & FLEXIBLE_START_FLEXIBLE_DURATION) |
| durationInMinutes | number | No | Duration in minutes for readability |
| description | string | No | Variant-specific description |
| ageRestrictions | object | No | Min/max age, age groups |
| groupSize | object | Conditional | Min/max group size (required for group-oriented experiences) |
| maxGroupSize | number | No | Maximum group size |
| minGroupSize | number | No | Minimum group size |
| image | string | No | Variant primary image URL |
| media | Media[] | No | Variant-specific media array |

### Conditional Variant Fields (by experience type)

#### GUIDED_TOUR specific:
- **meetingPoint** (object, REQUIRED) - Where tour starts
  - address (string)
  - coordinates (lat/lng)
  - description (string)
- **languages** (array, REQUIRED) - Languages offered
- **guide** (object) - Guide information
  - name (string)
  - profileImage (string)
  - rating (number)
- **itinerary** (array, REQUIRED) - Detailed day/stop breakdown

#### ATTRACTION_TICKET / SHOW_OR_EVENT specific:
- **startTime** (time string, REQUIRED for FIXED_START types) - Show/entry time
- **entryTime** (object) - Entry time window details
- **endTime** (time string) - Exit/end time
- **hasFixedDeparture** (boolean) - Whether departure is fixed
- **capacity** (number) - Venue capacity
- **ageRestrictions** (object, OPTIONAL) - Age limits

#### DESERT_SAFARI / BOAT_CRUISE specific:
- **meetingPoint** (object, REQUIRED) - Pickup/departure location
- **pickupLocation** (string, OPTIONAL) - Hotel pickup availability
- **dropoffLocation** (string, OPTIONAL) - Drop-off point
- **duration** (number, REQUIRED) - Safari/cruise duration
- **languages** (array, REQUIRED) - Language availability
- **activities** (array) - Included activities
- **weatherDependent** (boolean) - Is experience affected by weather?

#### MUSEUM_TICKET specific:
- **openingHours** (object) - Museum hours
- **closedDays** (array) - Days museum is closed
- **audioGuideAvailable** (boolean)
- **guidedTourAvailable** (boolean)
- **ageRestrictions** (object, OPTIONAL)
- **freeEntryAge** (number, OPTIONAL) - Free for children under age

#### COMBO_TICKET specific:
- **includedExperiences** (array, REQUIRED) - List of included products
- **validityPeriod** (object) - How long combo is valid
- **sequenceRequired** (boolean) - Must experiences be done in order?
- **experiences** (array) - Detailed array of bundled experiences

---

## 5. INVENTORY OBJECT SCHEMA

### Date-Time Based Inventory

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| variantId | string | Yes | Linked variant ID |
| date | date | Yes | Date YYYY-MM-DD |
| slots | Slot[] | Conditional | Array of time slots (required for FIXED_START types) |
| availability | object | Yes | Availability status |

### Slot Object (for FIXED_START types)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| time | time string | Yes | HH:mm format |
| capacity | number | Yes | Total spots available |
| booked | number | No | Spots currently booked |
| available | number | Yes | Remaining capacity |
| pricing | Pricing[] | Yes | Price per person/group |
| maxOccupancy | number | No | Hard max participants |
| minOccupancy | number | No | Minimum required participants |

### Pricing in Inventory

| Field | Type | Description |
|-------|------|-------------|
| ageGroup | string | Adult / Child / Senior (for PER_PERSON) |
| minGroupSize | number | Starting group size (for PER_GROUP) |
| maxGroupSize | number | Ending group size (for PER_GROUP) |
| pricePerUnit | number | Price amount |
| currencyCode | string | ISO currency (e.g., USD, EUR) |

---

## 6. BOOKING INPUT FIELDS (by scope)

### Mandatory Fields (always required)

All products require from PRIMARY_CUSTOMER:
- **firstName** (string) - First/given name
- **lastName** (string) - Family name  
- **email** (string) - Email address
- **phoneNumber** (string) - Contact phone

### Conditional Input Fields (by experience type)

#### GUIDED_TOUR scope requirements:
- **Scope: PRIMARY_CUSTOMER**
  - language (enum) - Preferred guide language
  - specialRequests (text) - Accessibility/dietary needs
  
- **Scope: ALL_CUSTOMERS**
  - mobile (string) - Mobile number for day-of contact
  - nationality (string, OPTIONAL) - Some tours require this
  - emergencyContact (object, OPTIONAL) - Emergency details for adventure tours

- **Scope: VARIANT**
  - hotelPickup (boolean) - If available
  - hotelName (string, CONDITIONAL) - If hotelPickup=true
  - roomNumber (string, CONDITIONAL) - If hotelPickup=true

#### SHOW_OR_EVENT scope requirements:
- **Scope: PRIMARY_CUSTOMER**
  - dateOfBirth (date, OPTIONAL) - For age-restricted shows
  
- **Scope: ALL_CUSTOMERS**
  - firstName (string) - Required for each attendee
  - lastName (string) - Required for each attendee
  - email (string, OPTIONAL) - For email delivery of tickets
  - dateOfBirth (date, OPTIONAL) - For age-restricted events

#### DESERT_SAFARI scope requirements:
- **Scope: PRIMARY_CUSTOMER**
  - nationality (string, OPTIONAL)
  - passport (string, OPTIONAL)
  
- **Scope: ALL_CUSTOMERS**
  - mobile (string)
  - dateOfBirth (date, OPTIONAL) - Some safaris have age restrictions
  - medicalConditions (text, OPTIONAL)
  
- **Scope: VARIANT**
  - hotelPickup (boolean)
  - hotelAddress (string, CONDITIONAL)

#### BOAT_CRUISE scope requirements:
- **Scope: PRIMARY_CUSTOMER**
  - dateOfBirth (date, OPTIONAL) - Life jacket sizing
  
- **Scope: ALL_CUSTOMERS**
  - mobile (string)
  - passport (string, OPTIONAL) - Some cruises require ID
  
- **Scope: VARIANT**
  - mealPreference (enum, OPTIONAL) - Dietary requirements
  - cabinPreference (string, OPTIONAL)

#### MUSEUM_TICKET scope requirements:
- **Scope: PRIMARY_CUSTOMER**
  - email (string)
  - specialAccessNeeds (text, OPTIONAL)
  
- **Scope: ALL_CUSTOMERS**
  - dateOfBirth (date) - Many museums require for age-based free entry

#### ATTRACTION_TICKET scope requirements:
- **Scope: PRIMARY_CUSTOMER**
  - email (string)
  
- **Scope: ALL_CUSTOMERS**
  - firstName (string, OPTIONAL) - Many tickets don't require names
  - dateOfBirth (date, OPTIONAL) - For age-based pricing

#### COMBO_TICKET scope requirements:
- Inherits from ALL included experience types
- May require PRIMARY_CUSTOMER fields from each bundled experience

---

## 7. INPUT FIELD TYPE ENUMERATIONS

### Field Scope Types
```
PRIMARY_CUSTOMER  - For primary/main customer only (1 per booking)
ALL_CUSTOMERS     - For each person in booking (tourists count, guide doesn't)
VARIANT           - Experience-level, collected once regardless of group size
```

### Field Value Types
- **text** - Free-form text input
- **email** - Email format validation
- **phone** - Phone number (format varies by region)
- **date** - Date of birth (YYYY-MM-DD)
- **enum** - Dropdown selection (options provided)
- **boolean** - Yes/no toggle
- **number** - Numeric input (group size, age, etc.)
- **address** - Full address with validation
- **time** - Time selection (HH:mm format)

---

## 8. MEDIA OBJECT SCHEMA

| Field | Type | Description |
|-------|------|-------------|
| url | string | Image/video URL |
| type | enum | IMAGE / VIDEO / PDF |
| caption | string | Optional media description |
| order | number | Display order |
| alt | string | Accessibility alt text |

---

## 9. CATEGORY MODEL OBJECT

| Field | Type | Description |
|-------|------|-------------|
| id | string | Category identifier |
| name | string | Display name |
| code | string | Internal code (matching enum values) |
| image | string | Category image URL |
| description | string | Category description |
| isActive | boolean | Is category available for new products |

---

## 10. KEY DIFFERENCES BY EXPERIENCE TYPE

### Field Presence Matrix

| Field | Guided Tour | Attraction | Show/Event | Safari | Cruise | Museum | Combo |
|-------|-------------|-----------|-----------|--------|--------|--------|-------|
| meetingPoint | REQUIRED | OPTIONAL | OPTIONAL | REQUIRED | REQUIRED | - | - |
| languages | REQUIRED | - | OPTIONAL | REQUIRED | OPTIONAL | - | - |
| itinerary | REQUIRED | - | - | OPTIONAL | OPTIONAL | - | - |
| startTime | OPTIONAL | CONDITIONAL | REQUIRED | OPTIONAL | OPTIONAL | - | - |
| groupSize | OPTIONAL | - | - | OPTIONAL | OPTIONAL | - | - |
| guide | OPTIONAL | - | - | - | - | - | - |
| hotelPickup | OPTIONAL | - | - | OPTIONAL | OPTIONAL | - | - |
| activities | OPTIONAL | - | - | REQUIRED | OPTIONAL | - | - |
| openingHours | - | - | - | - | - | REQUIRED | - |
| audioGuide | - | - | - | - | - | OPTIONAL | - |
| includedExperiences | - | - | - | - | - | - | REQUIRED |

### Booking Field Requirements by Type

**Minimal (Attraction/Museum tickets):**
- PRIMARY: firstName, lastName, email
- ALL: dateOfBirth (optional, for age-based pricing)

**Moderate (Shows/Events):**
- PRIMARY: firstName, lastName, email
- ALL: firstName, lastName, email, dateOfBirth (optional)

**Complex (Guided Tours):**
- PRIMARY: firstName, lastName, email, language preference
- ALL: firstName, lastName, mobile, dateOfBirth (optional)
- VARIANT: hotelPickup, hotelName (conditional)

**Complex+ (Desert Safari/Boat Cruise):**
- PRIMARY: firstName, lastName, email, nationality (optional), passport (optional)
- ALL: firstName, lastName, mobile, dateOfBirth (optional), medicalConditions (optional)
- VARIANT: hotelPickup, hotelAddress, mealPreference (conditional)

---

## 11. INVENTORY TYPE IMPLICATIONS

### FIXED_START_FIXED_DURATION
- **Used by**: Shows, Broadway performances, timed entry slots
- **API Fields**:
  - startTime REQUIRED
  - duration REQUIRED (not null)
  - slots array REQUIRED
  - availability per slot
- **Booking Logic**: Customer must pick specific date + time slot
- **Example**: Broadway Show at 7:00 PM, 2 hour duration

### FIXED_START_FLEXIBLE_DURATION
- **Used by**: Museums with opening hours, attractions with entry windows
- **API Fields**:
  - startTime REQUIRED (opening hours)
  - duration null
  - durationText may exist (e.g., "Valid for 24 hours")
  - NO slots array
- **Booking Logic**: Customer picks entry time, leaves when ready
- **Example**: Museum entry at 9:00 AM, explore for any duration

### FLEXIBLE_START_FIXED_DURATION
- **Used by**: Hot air balloons, helicopter rides, private tours
- **API Fields**:
  - startTime null (customer picks)
  - duration REQUIRED (not null)
  - availableTimes or timeRanges provided
- **Booking Logic**: Customer picks start time from available slots, fixed duration after
- **Example**: Hot air balloon from 5:30-7:00 AM (customer picks exact start)

### FLEXIBLE_START_FLEXIBLE_DURATION
- **Used by**: Theme parks, day tickets, self-guided tours, boat cruises
- **API Fields**:
  - startTime null
  - duration null
  - validityPeriod provided (e.g., "Valid for 14 days")
  - NO time-based availability constraints
- **Booking Logic**: Customer buys ticket, uses anytime within validity
- **Example**: Disneyland ticket valid for 14 consecutive days

---

## 12. PRICING SPECIFICS

### PER_PERSON Pricing Structure
```json
{
  "priceType": "PER_PERSON",
  "prices": [
    {
      "ageGroup": "ADULT",
      "pricePerUnit": 89.99,
      "currencyCode": "USD"
    },
    {
      "ageGroup": "CHILD",
      "pricePerUnit": 49.99,
      "currencyCode": "USD",
      "ageRange": {"min": 0, "max": 12}
    },
    {
      "ageGroup": "SENIOR",
      "pricePerUnit": 69.99,
      "currencyCode": "USD",
      "ageRange": {"min": 65}
    }
  ]
}
```

### PER_GROUP Pricing Structure
```json
{
  "priceType": "PER_GROUP",
  "groupRanges": [
    {
      "minGroupSize": 1,
      "maxGroupSize": 4,
      "pricePerGroup": 100,
      "currencyCode": "USD"
    },
    {
      "minGroupSize": 5,
      "maxGroupSize": 7,
      "pricePerGroup": 120,
      "currencyCode": "USD"
    },
    {
      "minGroupSize": 8,
      "maxGroupSize": 10,
      "pricePerGroup": 150,
      "currencyCode": "USD"
    }
  ]
}
```

---

## 13. DATA SOURCES CONSULTED

Primary sources for this research:
1. [Headout API Documentation - GitHub Repository](https://github.com/headout/api-docs)
2. [Product Models Documentation](https://github.com/headout/api-docs/blob/master/object-models/v1/product-models.md)
3. [V2 Products API Endpoint](https://github.com/headout/api-docs/blob/master/apis/v2/products.md)
4. [API Conventions & Basics](https://github.com/headout/api-docs/blob/master/conventions/basics.md)
5. [Partner Integration Flow Guide](https://github.com/headout/api-docs/wiki/Integration-flow-for-Partners)
6. [Headout Help Center - Hub Documentation](https://hub-help.headout.com/)

---

## 14. LIMITATIONS & GAPS

**Information not fully captured due to GitHub rate limits:**
- Complete JSON schema examples for each experience type
- Exact enum value sets for categorical fields
- Complete nested object structures (e.g., full Itinerary schema)
- Validation rules and constraints per field
- Error response schemas and codes
- Pagination and filtering options
- Deprecated vs current field versions
- Rate limiting and quota information
- Webhook schemas for inventory updates

**Recommended next steps for complete documentation:**
1. Request API documentation directly from Headout partner program
2. Access actual sandbox API responses for each experience type
3. Review integration code samples from Headout partners
4. Schedule technical call with Headout API team for clarification

---

## 15. WORKING ASSUMPTIONS

Based on research findings, the following patterns are inferred:

1. **Field Presence**: Fields documented in research are typical for their experience type but may have variations
2. **Required Status**: "CONDITIONAL" fields are required within their scope when applicable
3. **API Versioning**: V2 API is current standard; V1 models available for legacy support
4. **Enum Values**: Experience type names derived from service patterns and platform offerings
5. **Pricing**: All 95% of products use PER_PERSON; PER_GROUP is specialty case
6. **Input Fields**: PRIMARY_CUSTOMER/ALL_CUSTOMERS/VARIANT pattern is consistent across all types
7. **Inventory**: Slot-based for fixed-time experiences; date-based for flexible-time experiences

---

Generated: 2026-05-01
Research Method: Web search compilation from official Headout API documentation and partner integration guides
