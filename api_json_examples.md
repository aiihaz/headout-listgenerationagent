# Headout API JSON Schema Examples

These are representative JSON structures based on documented Headout API patterns. Actual field names and nesting may vary; consult official documentation for exact current schema.

---

## Example 1: GUIDED_TOUR Product Response

```json
{
  "id": "tour_paris_123",
  "name": "Paris City Tour: Eiffel Tower & Louvre",
  "description": "Experience the magic of Paris with our expert guides...",
  "canonicalUrl": "https://www.headout.com/paris-city-tour-eiffel-louvre",
  "category": "GUIDED_TOUR",
  "categoryCode": "GUIDED_TOUR",
  "city": {
    "code": "paris",
    "name": "Paris",
    "image": "https://cdn.headout.com/cities/paris.jpg"
  },
  "languages": ["English", "French", "Spanish"],
  "itinerary": [
    {
      "day": 1,
      "title": "Eiffel Tower & Seine River",
      "description": "Start at the iconic Eiffel Tower...",
      "stops": [
        {
          "name": "Eiffel Tower",
          "duration": "2 hours",
          "included": true
        },
        {
          "name": "Seine River Cruise",
          "duration": "1 hour",
          "included": true
        }
      ]
    },
    {
      "day": 2,
      "title": "Louvre Museum",
      "description": "Explore the world's largest art museum...",
      "stops": [
        {
          "name": "Louvre Museum",
          "duration": "3 hours",
          "included": true
        }
      ]
    }
  ],
  "inclusions": [
    "Expert English/French speaking guide",
    "2 days of guided tours",
    "Eiffel Tower entry ticket",
    "Louvre Museum entry ticket",
    "Seine river cruise",
    "Hotel pickup and dropoff (if selected)",
    "Lunch on Day 1 (not included for some variants)"
  ],
  "exclusions": [
    "Personal expenses",
    "Meals not mentioned in inclusions",
    "Travel insurance",
    "Items of personal nature"
  ],
  "cancellationPolicy": {
    "type": "STANDARD",
    "description": "Free cancellation up to 24 hours before tour",
    "refundPercentage": 100,
    "refundBeforeHours": 24
  },
  "media": [
    {
      "url": "https://cdn.headout.com/tour/paris/main.jpg",
      "type": "IMAGE",
      "alt": "Eiffel Tower at sunset",
      "order": 1
    },
    {
      "url": "https://cdn.headout.com/tour/paris/louvre.jpg",
      "type": "IMAGE",
      "alt": "Louvre Museum entrance",
      "order": 2
    },
    {
      "url": "https://cdn.headout.com/tour/paris/highlight.mp4",
      "type": "VIDEO",
      "caption": "Tour highlights video",
      "order": 3
    }
  ],
  "highlights": [
    "Visit the iconic Eiffel Tower",
    "Explore the Louvre Museum",
    "Cruise the Seine River",
    "Professional English/French guide",
    "Small group experience (max 12 people)"
  ],
  "averageRating": 4.7,
  "reviewCount": 1242,
  "variants": [
    {
      "variantId": "var_paris_std_001",
      "name": "Standard Tour - With Hotel Pickup",
      "description": "2-day guided tour with hotel pickup included",
      "inventoryType": "FIXED_START_FIXED_DURATION",
      "priceType": "PER_PERSON",
      "duration": 172800000,
      "durationInMinutes": 2880,
      "durationText": "2 days",
      "meetingPoint": {
        "name": "Eiffel Tower Main Entrance",
        "address": "5 Avenue Anatole France, 75007 Paris, France",
        "coordinates": {
          "latitude": 48.858370,
          "longitude": 2.294694
        },
        "description": "Meet your guide at the main entrance of Eiffel Tower",
        "instructions": "Look for the tour guide holding a red Headout flag"
      },
      "languages": ["English", "French"],
      "guide": {
        "name": "Jean Dupont",
        "profileImage": "https://cdn.headout.com/guides/jean.jpg",
        "rating": 4.9,
        "yearsExperience": 8,
        "about": "Paris native, art historian with 8 years guiding experience"
      },
      "groupSize": {
        "minGroupSize": 2,
        "maxGroupSize": 12,
        "optimalSize": 8
      },
      "ageRestrictions": {
        "minAge": null,
        "maxAge": null,
        "restrictedAges": null,
        "childrenAllowed": true
      },
      "media": [
        {
          "url": "https://cdn.headout.com/variant/paris/standard.jpg",
          "type": "IMAGE",
          "order": 1
        }
      ],
      "pricing": [
        {
          "ageGroup": "ADULT",
          "minAge": 13,
          "pricePerUnit": 189.99,
          "currencyCode": "USD"
        },
        {
          "ageGroup": "CHILD",
          "minAge": 5,
          "maxAge": 12,
          "pricePerUnit": 129.99,
          "currencyCode": "USD"
        },
        {
          "ageGroup": "INFANT",
          "minAge": 0,
          "maxAge": 4,
          "pricePerUnit": 0,
          "currencyCode": "USD",
          "note": "Infants free if not requiring seat"
        }
      ],
      "inputFields": [
        {
          "name": "language",
          "type": "enum",
          "scope": "PRIMARY_CUSTOMER",
          "required": true,
          "options": ["English", "French"],
          "label": "Which language do you prefer?"
        },
        {
          "name": "hotelPickup",
          "type": "boolean",
          "scope": "VARIANT",
          "required": false,
          "label": "Do you need hotel pickup?"
        },
        {
          "name": "hotelName",
          "type": "text",
          "scope": "VARIANT",
          "required": false,
          "conditional": "hotelPickup == true",
          "label": "Hotel name (if pickup required)"
        },
        {
          "name": "roomNumber",
          "type": "text",
          "scope": "VARIANT",
          "required": false,
          "conditional": "hotelPickup == true",
          "label": "Room number"
        },
        {
          "name": "specialRequests",
          "type": "text",
          "scope": "PRIMARY_CUSTOMER",
          "required": false,
          "label": "Any special requests (accessibility, dietary needs)?",
          "maxLength": 500
        }
      ]
    },
    {
      "variantId": "var_paris_premium_001",
      "name": "Premium Tour - Without Hotel Pickup",
      "description": "2-day guided tour, self-arranged transport",
      "inventoryType": "FIXED_START_FIXED_DURATION",
      "priceType": "PER_PERSON",
      "duration": 172800000,
      "meetingPoint": {
        "name": "Eiffel Tower Main Entrance",
        "address": "5 Avenue Anatole France, 75007 Paris, France",
        "coordinates": {
          "latitude": 48.858370,
          "longitude": 2.294694
        }
      },
      "languages": ["English", "French"],
      "guide": {
        "name": "Marie Laurent",
        "profileImage": "https://cdn.headout.com/guides/marie.jpg",
        "rating": 4.8,
        "yearsExperience": 10
      },
      "groupSize": {
        "minGroupSize": 1,
        "maxGroupSize": 8
      },
      "pricing": [
        {
          "ageGroup": "ADULT",
          "pricePerUnit": 149.99,
          "currencyCode": "USD"
        },
        {
          "ageGroup": "CHILD",
          "minAge": 5,
          "maxAge": 12,
          "pricePerUnit": 99.99,
          "currencyCode": "USD"
        }
      ],
      "inputFields": [
        {
          "name": "language",
          "type": "enum",
          "scope": "PRIMARY_CUSTOMER",
          "required": true,
          "options": ["English", "French"]
        },
        {
          "name": "specialRequests",
          "type": "text",
          "scope": "PRIMARY_CUSTOMER",
          "required": false
        }
      ]
    }
  ]
}
```

---

## Example 2: SHOW_OR_EVENT Product Response

```json
{
  "id": "show_hamilton_nyc_001",
  "name": "Hamilton - The Musical at Richard Rodgers Theatre",
  "description": "Experience the groundbreaking hip-hop musical that took Broadway by storm...",
  "canonicalUrl": "https://www.headout.com/broadway-hamilton-musical",
  "category": "SHOW_OR_EVENT",
  "city": {
    "code": "new_york",
    "name": "New York City",
    "image": "https://cdn.headout.com/cities/nyc.jpg"
  },
  "inclusions": [
    "Admission to Hamilton musical",
    "Access to Richard Rodgers Theatre"
  ],
  "exclusions": [
    "Food and beverages",
    "Parking",
    "Travel insurance"
  ],
  "cancellationPolicy": {
    "type": "STRICT",
    "description": "Non-refundable tickets",
    "refundPercentage": 0
  },
  "media": [
    {
      "url": "https://cdn.headout.com/shows/hamilton.jpg",
      "type": "IMAGE",
      "order": 1
    }
  ],
  "averageRating": 4.8,
  "reviewCount": 3421,
  "variants": [
    {
      "variantId": "var_hamilton_orchestra_001",
      "name": "Orchestra Seating",
      "description": "Premium seating in the orchestra section",
      "inventoryType": "FIXED_START_FIXED_DURATION",
      "priceType": "PER_PERSON",
      "duration": 10800000,
      "durationText": "3 hours",
      "startTime": "19:30",
      "endTime": "22:30",
      "hasFixedDeparture": true,
      "capacity": 1300,
      "ageRestrictions": {
        "minAge": null,
        "maxAge": null,
        "childrenAllowed": true,
        "note": "Children under 6 not recommended"
      },
      "pricing": [
        {
          "ageGroup": "ADULT",
          "pricePerUnit": 179.99,
          "currencyCode": "USD"
        },
        {
          "ageGroup": "CHILD",
          "minAge": 6,
          "maxAge": 17,
          "pricePerUnit": 119.99,
          "currencyCode": "USD"
        }
      ],
      "inputFields": [
        {
          "name": "firstName",
          "type": "text",
          "scope": "ALL_CUSTOMERS",
          "required": true,
          "label": "First name"
        },
        {
          "name": "lastName",
          "type": "text",
          "scope": "ALL_CUSTOMERS",
          "required": true,
          "label": "Last name"
        },
        {
          "name": "email",
          "type": "email",
          "scope": "ALL_CUSTOMERS",
          "required": false,
          "label": "Email for digital tickets"
        },
        {
          "name": "dateOfBirth",
          "type": "date",
          "scope": "ALL_CUSTOMERS",
          "required": false,
          "label": "Date of birth (for age verification if needed)"
        }
      ]
    },
    {
      "variantId": "var_hamilton_mezzanine_001",
      "name": "Mezzanine Seating",
      "inventoryType": "FIXED_START_FIXED_DURATION",
      "priceType": "PER_PERSON",
      "startTime": "19:30",
      "capacity": 450,
      "pricing": [
        {
          "ageGroup": "ADULT",
          "pricePerUnit": 129.99,
          "currencyCode": "USD"
        },
        {
          "ageGroup": "CHILD",
          "minAge": 6,
          "pricePerUnit": 79.99,
          "currencyCode": "USD"
        }
      ]
    }
  ]
}
```

---

## Example 3: ATTRACTION_TICKET Product Response

```json
{
  "id": "ticket_louvre_001",
  "name": "Louvre Museum Entry Ticket",
  "description": "Visit the world's largest art museum and home to the Mona Lisa...",
  "canonicalUrl": "https://www.headout.com/louvre-museum-entry-ticket",
  "category": "ATTRACTION_TICKET",
  "city": {
    "code": "paris",
    "name": "Paris",
    "image": "https://cdn.headout.com/cities/paris.jpg"
  },
  "inclusions": [
    "Entry to Louvre Museum",
    "Access to all galleries",
    "Audio guide (if selected)"
  ],
  "exclusions": [
    "Guided tours (additional cost)",
    "Photography in certain galleries",
    "Meals and beverages"
  ],
  "media": [
    {
      "url": "https://cdn.headout.com/attractions/louvre.jpg",
      "type": "IMAGE",
      "order": 1
    }
  ],
  "averageRating": 4.6,
  "reviewCount": 5621,
  "variants": [
    {
      "variantId": "var_louvre_standard_001",
      "name": "Museum Entry - Standard Access",
      "description": "General admission to all galleries",
      "inventoryType": "FIXED_START_FLEXIBLE_DURATION",
      "priceType": "PER_PERSON",
      "duration": null,
      "durationText": "Valid for entire opening hours",
      "openingHours": {
        "monday": "CLOSED",
        "tuesday": "09:00-21:45",
        "wednesday": "09:00-21:45",
        "thursday": "09:00-21:45",
        "friday": "09:00-21:45",
        "saturday": "09:00-21:45",
        "sunday": "09:00-19:45"
      },
      "closedDays": ["Monday", "January 1", "May 1", "December 25"],
      "audioGuideAvailable": true,
      "guidedTourAvailable": true,
      "ageRestrictions": {
        "freeEntryAge": 18,
        "note": "Free for EU citizens under 18"
      },
      "pricing": [
        {
          "ageGroup": "ADULT",
          "minAge": 18,
          "pricePerUnit": 17.00,
          "currencyCode": "EUR"
        },
        {
          "ageGroup": "YOUTH",
          "minAge": 12,
          "maxAge": 17,
          "pricePerUnit": 8.50,
          "currencyCode": "EUR"
        },
        {
          "ageGroup": "CHILD",
          "minAge": 0,
          "maxAge": 11,
          "pricePerUnit": 0,
          "currencyCode": "EUR",
          "note": "Free for children under 12"
        }
      ],
      "inputFields": [
        {
          "name": "firstName",
          "type": "text",
          "scope": "PRIMARY_CUSTOMER",
          "required": true,
          "label": "Your first name"
        },
        {
          "name": "lastName",
          "type": "text",
          "scope": "PRIMARY_CUSTOMER",
          "required": true,
          "label": "Your last name"
        },
        {
          "name": "email",
          "type": "email",
          "scope": "PRIMARY_CUSTOMER",
          "required": true,
          "label": "Email address"
        },
        {
          "name": "dateOfBirth",
          "type": "date",
          "scope": "ALL_CUSTOMERS",
          "required": false,
          "label": "Date of birth (for age-based free entry verification)"
        },
        {
          "name": "audioGuide",
          "type": "enum",
          "scope": "VARIANT",
          "required": false,
          "options": ["None", "English", "French", "German", "Spanish"],
          "label": "Do you want an audio guide?"
        }
      ]
    }
  ]
}
```

---

## Example 4: DESERT_SAFARI Product Response

```json
{
  "id": "safari_dubai_001",
  "name": "Dubai Desert Safari with Dinner and Shows",
  "description": "Experience the magic of the Arabian desert...",
  "canonicalUrl": "https://www.headout.com/dubai-desert-safari",
  "category": "DESERT_SAFARI",
  "city": {
    "code": "dubai",
    "name": "Dubai",
    "image": "https://cdn.headout.com/cities/dubai.jpg"
  },
  "languages": ["English", "Hindi", "French"],
  "inclusions": [
    "Hotel pickup and dropoff",
    "4x4 vehicle desert safari",
    "Camel ride",
    "BBQ dinner",
    "Cultural shows (belly dance, fire show)",
    "Henna tattoo"
  ],
  "exclusions": [
    "Personal expenses",
    "Alcoholic beverages (available for purchase)",
    "Photography permits"
  ],
  "cancellationPolicy": {
    "type": "STANDARD",
    "refundPercentage": 100,
    "refundBeforeHours": 24
  },
  "media": [
    {
      "url": "https://cdn.headout.com/safari/dubai/main.jpg",
      "type": "IMAGE",
      "order": 1
    }
  ],
  "highlights": [
    "See golden sand dunes",
    "Thrilling 4x4 vehicle ride",
    "Camel trekking experience",
    "Authentic Arabian BBQ dinner",
    "Live cultural entertainment",
    "Henna painting"
  ],
  "averageRating": 4.5,
  "reviewCount": 2103,
  "variants": [
    {
      "variantId": "var_safari_evening_001",
      "name": "Evening Safari - With Hotel Pickup",
      "description": "Evening desert safari with hotel pickup included",
      "inventoryType": "FIXED_START_FIXED_DURATION",
      "priceType": "PER_PERSON",
      "duration": 28800000,
      "durationText": "8 hours",
      "startTime": "16:00",
      "endTime": "00:00",
      "meetingPoint": {
        "name": "Various Hotel Pickup Locations",
        "address": "Multiple hotels in Dubai",
        "description": "Hotel pickup from your accommodation",
        "coordinates": {
          "latitude": 25.1972,
          "longitude": 55.2744
        }
      },
      "languages": ["English", "Hindi"],
      "activities": [
        "4x4 Dune Bashing",
        "Camel Riding",
        "Sandboarding (optional)",
        "Sunset viewing",
        "BBQ Dinner",
        "Belly Dance Show",
        "Fire Show",
        "Henna Tattoo"
      ],
      "groupSize": {
        "minGroupSize": 1,
        "maxGroupSize": 50,
        "optimalSize": 15
      },
      "weatherDependent": true,
      "weatherNote": "Safari may be cancelled in extreme weather conditions with full refund",
      "ageRestrictions": {
        "minAge": 5,
        "maxAge": null,
        "note": "Children 5-12 must be accompanied by adult"
      },
      "pricing": [
        {
          "ageGroup": "ADULT",
          "minAge": 13,
          "pricePerUnit": 89.99,
          "currencyCode": "USD"
        },
        {
          "ageGroup": "CHILD",
          "minAge": 5,
          "maxAge": 12,
          "pricePerUnit": 59.99,
          "currencyCode": "USD"
        },
        {
          "ageGroup": "INFANT",
          "minAge": 0,
          "maxAge": 4,
          "pricePerUnit": 0,
          "currencyCode": "USD"
        }
      ],
      "inputFields": [
        {
          "name": "firstName",
          "type": "text",
          "scope": "PRIMARY_CUSTOMER",
          "required": true
        },
        {
          "name": "lastName",
          "type": "text",
          "scope": "PRIMARY_CUSTOMER",
          "required": true
        },
        {
          "name": "email",
          "type": "email",
          "scope": "PRIMARY_CUSTOMER",
          "required": true
        },
        {
          "name": "mobile",
          "type": "phone",
          "scope": "ALL_CUSTOMERS",
          "required": true,
          "label": "Mobile number for day-of communication"
        },
        {
          "name": "dateOfBirth",
          "type": "date",
          "scope": "ALL_CUSTOMERS",
          "required": false
        },
        {
          "name": "nationality",
          "type": "text",
          "scope": "PRIMARY_CUSTOMER",
          "required": false
        },
        {
          "name": "medicalConditions",
          "type": "text",
          "scope": "ALL_CUSTOMERS",
          "required": false,
          "label": "Any medical conditions we should know about? (e.g., back pain, pregnancy)"
        },
        {
          "name": "hotelPickup",
          "type": "boolean",
          "scope": "VARIANT",
          "required": true,
          "label": "Confirm hotel pickup"
        },
        {
          "name": "hotelName",
          "type": "text",
          "scope": "VARIANT",
          "required": true,
          "conditional": "hotelPickup == true",
          "label": "Hotel name"
        },
        {
          "name": "mealPreference",
          "type": "enum",
          "scope": "ALL_CUSTOMERS",
          "required": false,
          "options": ["Regular", "Vegetarian", "Vegan"],
          "label": "Meal preference"
        }
      ]
    }
  ]
}
```

---

## Example 5: COMBO_TICKET Product Response

```json
{
  "id": "combo_nyc_pass_001",
  "name": "NYC 7-Day Pass - Multiple Attractions",
  "description": "Get access to top NYC attractions with this comprehensive pass...",
  "canonicalUrl": "https://www.headout.com/nyc-7-day-pass",
  "category": "COMBO_TICKET",
  "city": {
    "code": "new_york",
    "name": "New York City",
    "image": "https://cdn.headout.com/cities/nyc.jpg"
  },
  "inclusions": [
    "Empire State Building entry",
    "The Metropolitan Museum of Art entry",
    "American Museum of Natural History entry",
    "Statue of Liberty & Ellis Island tour",
    "High Line guided tour",
    "10% discount at partner museums"
  ],
  "exclusions": [
    "Food and beverages",
    "Parking",
    "Hotel transportation"
  ],
  "cancellationPolicy": {
    "type": "FLEXIBLE",
    "refundPercentage": 50,
    "refundBeforeHours": 48
  },
  "media": [
    {
      "url": "https://cdn.headout.com/combo/nyc_pass.jpg",
      "type": "IMAGE",
      "order": 1
    }
  ],
  "averageRating": 4.4,
  "reviewCount": 876,
  "variants": [
    {
      "variantId": "var_combo_7day_001",
      "name": "7-Day Pass (Consecutive Days)",
      "description": "Valid for 7 consecutive calendar days from purchase",
      "inventoryType": "FLEXIBLE_START_FLEXIBLE_DURATION",
      "priceType": "PER_PERSON",
      "duration": null,
      "durationText": "7 consecutive days",
      "includedExperiences": [
        {
          "productId": "attraction_empire_001",
          "name": "Empire State Building",
          "type": "ATTRACTION_TICKET",
          "value": 39.99
        },
        {
          "productId": "attraction_met_001",
          "name": "The Metropolitan Museum of Art",
          "type": "MUSEUM_TICKET",
          "value": 29.00
        },
        {
          "productId": "tour_statue_001",
          "name": "Statue of Liberty & Ellis Island",
          "type": "GUIDED_TOUR",
          "value": 79.99
        }
      ],
      "validityPeriod": {
        "type": "CONSECUTIVE_DAYS",
        "days": 7,
        "startDate": "DATE_OF_ACTIVATION",
        "note": "Valid from date of first use"
      },
      "sequenceRequired": false,
      "pricing": [
        {
          "ageGroup": "ADULT",
          "minAge": 13,
          "pricePerUnit": 249.99,
          "currencyCode": "USD",
          "savingsAmount": 179.97,
          "originalValue": 429.96
        },
        {
          "ageGroup": "CHILD",
          "minAge": 5,
          "maxAge": 12,
          "pricePerUnit": 149.99,
          "currencyCode": "USD"
        }
      ],
      "inputFields": [
        {
          "name": "firstName",
          "type": "text",
          "scope": "PRIMARY_CUSTOMER",
          "required": true
        },
        {
          "name": "lastName",
          "type": "text",
          "scope": "PRIMARY_CUSTOMER",
          "required": true
        },
        {
          "name": "email",
          "type": "email",
          "scope": "PRIMARY_CUSTOMER",
          "required": true
        },
        {
          "name": "dateOfBirth",
          "type": "date",
          "scope": "ALL_CUSTOMERS",
          "required": false,
          "label": "Age verification for some attractions"
        },
        {
          "name": "language_statue_tour",
          "type": "enum",
          "scope": "PRIMARY_CUSTOMER",
          "required": false,
          "options": ["English", "Spanish", "French"],
          "conditional": "includedExperiences contains statue_tour",
          "label": "Preferred language for Statue of Liberty tour"
        }
      ]
    }
  ]
}
```

---

## Example 6: Booking Request Payload (GUIDED_TOUR)

```json
{
  "variantId": "var_paris_std_001",
  "selectedDate": "2026-06-15",
  "numberOfTravelers": 4,
  "primaryCustomer": {
    "firstName": "John",
    "lastName": "Smith",
    "email": "john@example.com",
    "phoneNumber": "+1-555-123-4567",
    "language": "English",
    "specialRequests": "We have one member with mobility constraints, please arrange accessible transportation",
    "hotelPickup": true,
    "hotelName": "Le Marais Hotel",
    "roomNumber": "305"
  },
  "allCustomers": [
    {
      "firstName": "John",
      "lastName": "Smith",
      "dateOfBirth": "1985-03-20",
      "mobile": "+1-555-123-4567",
      "nationality": "United States"
    },
    {
      "firstName": "Jane",
      "lastName": "Smith",
      "dateOfBirth": "1987-07-15",
      "mobile": "+1-555-123-4567",
      "nationality": "United States"
    },
    {
      "firstName": "Tom",
      "lastName": "Johnson",
      "dateOfBirth": "2012-11-22",
      "mobile": "+1-555-987-6543",
      "nationality": "United States"
    },
    {
      "firstName": "Sarah",
      "lastName": "Johnson",
      "dateOfBirth": "1960-05-10",
      "mobile": "+1-555-987-6543",
      "nationality": "United States"
    }
  ],
  "totalPrice": {
    "currency": "USD",
    "amount": 879.96,
    "breakdown": {
      "adultPrice": 189.99,
      "adultCount": 3,
      "adultSubtotal": 569.97,
      "childPrice": 129.99,
      "childCount": 1,
      "childSubtotal": 129.99,
      "fees": 60.00,
      "taxes": 20.00
    }
  }
}
```

---

## Example 7: Inventory Response (Date-based slots)

```json
{
  "variantId": "var_paris_std_001",
  "date": "2026-06-15",
  "available": true,
  "slots": [
    {
      "time": "09:00",
      "capacity": 12,
      "booked": 3,
      "available": 9,
      "maxOccupancy": 12,
      "minOccupancy": 2,
      "pricing": [
        {
          "ageGroup": "ADULT",
          "pricePerUnit": 189.99,
          "currencyCode": "USD"
        },
        {
          "ageGroup": "CHILD",
          "pricePerUnit": 129.99,
          "currencyCode": "USD"
        }
      ]
    },
    {
      "time": "14:00",
      "capacity": 12,
      "booked": 8,
      "available": 4,
      "maxOccupancy": 12,
      "minOccupancy": 2,
      "pricing": [
        {
          "ageGroup": "ADULT",
          "pricePerUnit": 189.99,
          "currencyCode": "USD"
        }
      ]
    },
    {
      "time": "16:00",
      "capacity": 12,
      "booked": 0,
      "available": 12,
      "pricing": [
        {
          "ageGroup": "ADULT",
          "pricePerUnit": 199.99,
          "currencyCode": "USD",
          "surgePrice": true,
          "note": "Premium time slot"
        }
      ]
    }
  ]
}
```

---

## Example 8: Error Response

```json
{
  "error": {
    "code": "INVENTORY_UNAVAILABLE",
    "message": "Selected date and time slot are not available",
    "details": {
      "variantId": "var_paris_std_001",
      "date": "2026-06-15",
      "requestedSlot": "09:00",
      "reason": "Minimum group size requirement (2) not met",
      "suggestion": "Please select a different time slot or add more travelers"
    }
  }
}
```

---

Generated: 2026-05-01
Note: These examples are representative structures based on documented API patterns. Actual current implementations may vary. Always consult the official Headout API documentation for exact current schemas.
