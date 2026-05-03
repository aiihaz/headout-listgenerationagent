"""
Deterministic JSON-LD generator. No LLM. Reads intake payload, maps verified
fields to schema.org TourActivity + FAQPage + BreadcrumbList. Null fields are
omitted entirely — never placeholdered.
"""

from typing import Any, Optional

from models.intake import IntakeResult


def run(intake: IntakeResult) -> dict:
    payload = intake.payload
    graph = []

    tour = _build_tour_activity(payload)
    if tour:
        graph.append(tour)

    faq_page = _build_faq_page(payload)
    if faq_page:
        graph.append(faq_page)

    breadcrumb = _build_breadcrumb(payload)
    if breadcrumb:
        graph.append(breadcrumb)

    return {"@context": "https://schema.org", "@graph": graph}


def _build_tour_activity(p: dict) -> Optional[dict]:
    node: dict[str, Any] = {"@type": "TourActivity"}

    _set(node, "name", p.get("productName"))
    _set(node, "description", p.get("description_summary") or p.get("headline") or p.get("description"))

    # Prefer human-readable durationText; fall back to converting ms
    duration = p.get("durationText") or _ms_to_iso8601(p.get("duration_ms") or p.get("duration"))
    _set(node, "duration", duration)

    if p.get("weatherDependent"):
        node["additionalProperty"] = {"@type": "PropertyValue", "name": "weatherDependent", "value": True}

    location = _build_location(p.get("location") or {})
    if location:
        node["location"] = location

    node["provider"] = {"@type": "Organization", "name": "Headout", "url": "https://www.headout.com"}

    offers = _build_offers(p)
    if offers:
        node["offers"] = offers

    images = p.get("images") or []
    if images:
        node["image"] = images if len(images) > 1 else images[0]

    hours = _build_opening_hours(p.get("startTimes") or [])
    if hours:
        node["openingHoursSpecification"] = hours

    _set(node, "maximumAttendeeCapacity", p.get("maxGroupSize"))

    category = p.get("category") or p.get("tourType")
    _set(node, "touristType", category)

    return node if len(node) > 2 else None


def _city_name(city_field) -> Optional[str]:
    """city is either a flat string or {code, name} object."""
    if isinstance(city_field, dict):
        return city_field.get("name") or city_field.get("code")
    return city_field or None


def _build_location(loc: dict) -> Optional[dict]:
    if not loc:
        return None
    node: dict[str, Any] = {"@type": "Place"}
    _set(node, "name", loc.get("venue_name") or loc.get("name") or loc.get("city"))
    address: dict[str, Any] = {"@type": "PostalAddress"}
    _set(address, "addressLocality", loc.get("city"))
    _set(address, "addressCountry", loc.get("country"))
    if len(address) > 1:
        node["address"] = address
    coords = loc.get("coordinates") or {}
    geo: dict[str, Any] = {"@type": "GeoCoordinates"}
    _set(geo, "latitude", coords.get("latitude") or loc.get("lat"))
    _set(geo, "longitude", coords.get("longitude") or loc.get("lng"))
    if len(geo) > 1:
        node["geo"] = geo
    return node if len(node) > 1 else None


def _build_offers(p: dict) -> Optional[dict]:
    # New schema: variants[*].pricing[{ageGroup, pricePerUnit (dollars), currencyCode}]
    # Old schema fallback: basePrice in cents
    price = None
    currency = "USD"

    variants = p.get("variants") or []
    if variants:
        pricing = variants[0].get("pricing") or []
        adult = next((x for x in pricing if x.get("ageGroup") == "ADULT"), pricing[0] if pricing else None)
        if adult:
            price = adult.get("pricePerUnit")
            currency = adult.get("currencyCode") or currency

    if price is None:
        # fallback: old cents-based fields
        raw = p.get("adult_price") or p.get("basePrice")
        if raw is not None:
            price = round(raw / 100, 2)
        currency = p.get("price_currency") or p.get("currency") or currency

    offers: dict[str, Any] = {"@type": "Offer", "priceCurrency": currency}
    offers["price"] = price if price is not None else "Contact for pricing"

    cancellation = p.get("cancellationPolicy") or {}
    if cancellation.get("type") in ("REFUND_BEFORE_CUTOFF", "STANDARD"):
        cutoff = cancellation.get("cutoffHours") or cancellation.get("refundBeforeHours") or 24
        pct = cancellation.get("refundPercentage", 100)
        offers["priceSpecification"] = {
            "@type": "PriceSpecification",
            "description": f"{pct}% refund if cancelled {cutoff}+ hours before start",
        }

    return offers


def _build_opening_hours(start_times: list) -> Optional[list]:
    if not start_times:
        return None
    return [
        {"@type": "OpeningHoursSpecification", "opens": t, "closes": "23:59"}
        for t in start_times
        if isinstance(t, str)
    ]


def _build_faq_page(p: dict) -> Optional[dict]:
    faqs = p.get("faqs") or []
    if not faqs:
        return None
    entities = []
    for faq in faqs:
        if not isinstance(faq, dict):
            continue
        q = faq.get("question") or faq.get("q")
        a = faq.get("answer") or faq.get("a")
        if q and a:
            entities.append({
                "@type": "Question",
                "name": q,
                "acceptedAnswer": {"@type": "Answer", "text": a},
            })
    if not entities:
        return None
    return {"@type": "FAQPage", "mainEntity": entities}


def _build_breadcrumb(p: dict) -> Optional[dict]:
    city = _city_name(p.get("city")) or (p.get("location") or {}).get("city")
    name = p.get("productName") or p.get("tour_name")
    category = p.get("category") or p.get("tourType")

    items = [{"@type": "ListItem", "position": 1, "name": "Headout", "item": "https://www.headout.com"}]
    pos = 2
    if city:
        items.append({"@type": "ListItem", "position": pos, "name": city,
                      "item": f"https://www.headout.com/{city.lower().replace(' ', '-')}"})
        pos += 1
    if category:
        items.append({"@type": "ListItem", "position": pos, "name": str(category).title(), "item": ""})
        pos += 1
    if name:
        items.append({"@type": "ListItem", "position": pos, "name": name})

    return {"@type": "BreadcrumbList", "itemListElement": items}


def _ms_to_iso8601(ms: Optional[int]) -> Optional[str]:
    if ms is None:
        return None
    total_seconds = int(ms) // 1000
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    if hours and minutes:
        return f"PT{hours}H{minutes}M"
    if hours:
        return f"PT{hours}H"
    if minutes:
        return f"PT{minutes}M"
    return f"PT{total_seconds}S"


def _set(node: dict, key: str, value: Any) -> None:
    if value is not None:
        node[key] = value
