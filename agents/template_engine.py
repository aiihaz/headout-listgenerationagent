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

    _set(node, "name", p.get("productName") or p.get("tour_name"))
    _set(node, "description", p.get("description_summary") or p.get("headline"))

    duration = _ms_to_iso8601(p.get("duration_ms"))
    _set(node, "duration", duration)

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

    hours = _build_opening_hours(p.get("start_times") or [])
    if hours:
        node["openingHoursSpecification"] = hours

    _set(node, "maximumAttendeeCapacity", p.get("max_pax"))

    category = p.get("category") or p.get("tourType")
    _set(node, "touristType", category)

    return node if len(node) > 2 else None


def _build_location(loc: dict) -> Optional[dict]:
    if not loc:
        return None
    node: dict[str, Any] = {"@type": "Place"}
    _set(node, "name", loc.get("venue_name") or loc.get("city"))
    address: dict[str, Any] = {"@type": "PostalAddress"}
    _set(address, "addressLocality", loc.get("city"))
    _set(address, "addressCountry", loc.get("country"))
    if len(address) > 1:
        node["address"] = address
    geo: dict[str, Any] = {"@type": "GeoCoordinates"}
    _set(geo, "latitude", loc.get("lat"))
    _set(geo, "longitude", loc.get("lng"))
    if len(geo) > 1:
        node["geo"] = geo
    return node if len(node) > 1 else None


def _build_offers(p: dict) -> Optional[dict]:
    adult_price = p.get("adult_price")
    currency = p.get("price_currency") or p.get("currency") or "USD"
    offers: dict[str, Any] = {"@type": "Offer", "priceCurrency": currency}

    if adult_price is not None:
        offers["price"] = adult_price
    else:
        offers["price"] = "Contact for pricing"

    if p.get("has_free_cancellation"):
        cutoff = p.get("cutoff_hours", 24)
        offers["priceSpecification"] = {
            "@type": "PriceSpecification",
            "description": f"Free cancellation up to {cutoff} hours before start",
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
    city = (p.get("location") or {}).get("city")
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
