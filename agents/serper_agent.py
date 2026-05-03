import json
from typing import Optional

import httpx
from openai import OpenAI

from agents.llm_client import call_json, get_model
from models.intake import IntakeResult
from models.serper import SerperContext, SerperOrganic

_SERPER_URL = "https://google.serper.dev/search"
_TIMEOUT = 10.0

_QUERY_SYSTEM = (
    "You are a search query specialist. Given structured tour/experience data, "
    "output a single Google search query (10 words max) that would return the most "
    "relevant competitor listings and FAQ results for this experience. "
    "Return JSON: {\"query\": \"<search query>\"}"
)


def run(intake: IntakeResult, client: OpenAI, api_key: str) -> SerperContext:
    if not api_key or not api_key.strip():
        return SerperContext(skipped=True, reason="SERPER_API_KEY not configured")

    try:
        query = _generate_query(intake, client)
    except Exception as exc:
        return SerperContext(skipped=True, reason=f"query generation failed: {exc}")

    return _fetch_serper(query, api_key)


def _generate_query(intake: IntakeResult, client: OpenAI) -> str:
    payload_summary = json.dumps(intake.payload, ensure_ascii=False)[:1500]
    result = call_json(
        client=client,
        model=get_model("SERPER"),
        system_prompt=_QUERY_SYSTEM,
        user_content=f"Experience data:\n{payload_summary}",
        temperature=0,
    )
    return result["query"]


def _fetch_serper(query: str, api_key: str) -> SerperContext:
    try:
        response = httpx.post(
            _SERPER_URL,
            headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
            json={"q": query, "num": 5},
            timeout=_TIMEOUT,
        )
    except httpx.TimeoutException:
        return SerperContext(skipped=True, reason="Serper request timed out")
    except Exception as exc:
        return SerperContext(skipped=True, reason=f"Serper request failed: {exc}")

    if response.status_code == 401:
        return SerperContext(skipped=True, reason="Serper API key invalid (401)")
    if response.status_code == 429:
        return SerperContext(skipped=True, reason="Serper rate limit exceeded (429)")
    if not response.is_success:
        return SerperContext(skipped=True, reason=f"Serper returned HTTP {response.status_code}")

    try:
        data = response.json()
    except Exception:
        return SerperContext(skipped=True, reason="Serper response was not valid JSON")

    organic = [
        SerperOrganic(
            title=item.get("title", ""),
            snippet=item.get("snippet", ""),
            link=item.get("link", ""),
        )
        for item in data.get("organic", [])
    ]

    paa = [item.get("question", "") for item in data.get("peopleAlsoAsk", []) if item.get("question")]

    related_searches = [
        item.get("query", "")
        for item in data.get("relatedSearches", [])
        if item.get("query")
    ]

    return SerperContext(
        skipped=False,
        query=query,
        organic=organic,
        paa=paa,
        related_searches=related_searches,
    )
