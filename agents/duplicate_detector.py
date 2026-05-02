"""
Checks for duplicate listings among previously generated runs stored in listings/.
Uses string similarity on title + location — no external index required.
Covers the user's ask: detect duplicates within our own generated listings.
"""

import json
from difflib import SequenceMatcher
from pathlib import Path

_LISTINGS_DIR = Path(__file__).parent.parent / "listings"
SIMILARITY_THRESHOLD = 0.82


def check(payload: dict) -> list[dict]:
    """
    Returns a list of potential duplicates. Each entry has:
      - listing_id: the run ID of the existing listing
      - similarity: 0.0–1.0
      - title: existing listing title
    """
    candidate_title = _fingerprint(payload)
    if not candidate_title:
        return []

    duplicates = []
    for run_dir in _LISTINGS_DIR.glob("*/"):
        merged_path = run_dir / "merged_listing.json"
        if not merged_path.exists():
            continue
        try:
            existing = json.loads(merged_path.read_text())
            existing_payload = existing.get("intake_payload", {})
            existing_title = _fingerprint(existing_payload)
            if not existing_title:
                continue
            score = SequenceMatcher(None, candidate_title, existing_title).ratio()
            if score >= SIMILARITY_THRESHOLD:
                duplicates.append({
                    "listing_id": run_dir.name,
                    "similarity": round(score, 3),
                    "title": existing_payload.get("productName") or existing_payload.get("tour_name", ""),
                    "location": (existing_payload.get("location") or {}).get("city", ""),
                })
        except (json.JSONDecodeError, OSError):
            continue

    return sorted(duplicates, key=lambda x: x["similarity"], reverse=True)


def _fingerprint(payload: dict) -> str:
    name = (payload.get("productName") or payload.get("tour_name") or "").lower().strip()
    city = ((payload.get("location") or {}).get("city") or "").lower().strip()
    return f"{name} {city}"
