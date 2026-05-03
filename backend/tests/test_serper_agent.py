"""
Serper agent tests. No real API calls made — all network is mocked.

Invariants tested:
  1. Blank API key → skipped (no HTTP call)
  2. Timeout → skipped
  3. HTTP 401 → skipped
  4. HTTP 429 → skipped
  5. Bad JSON response → skipped
  6. Successful response → PAA parsed correctly
  7. Pipeline continues when serper skipped (orchestrator integration)
  8. Content generator output format unchanged when serper skipped
  9. Review agent runs 8-check Layer 3 when serper_context.skipped is True
"""

import json
from unittest.mock import MagicMock, patch

import httpx
import pytest

from agents import serper_agent
from models.intake import IntakeResult
from models.serper import SerperContext


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_intake() -> IntakeResult:
    return IntakeResult.model_validate({
        "_meta": {
            "supplier": "Test Supplier",
            "generated_at": "2026-01-01T00:00:00Z",
            "confidence": "HIGH",
            "publish_blocked": False,
        },
        "payload": {"productName": "Burj Khalifa At the Top", "city": "Dubai"},
        "_sources": {},
    })


def _make_httpx_response(status_code: int, body: dict) -> httpx.Response:
    return httpx.Response(status_code, json=body)


# ---------------------------------------------------------------------------
# Test 1: blank key → skipped immediately, no HTTP call
# ---------------------------------------------------------------------------

def test_serper_skips_on_blank_key():
    client = MagicMock()
    result = serper_agent.run(_make_intake(), client, api_key="")
    assert result.skipped is True
    assert "not configured" in result.reason.lower()


# ---------------------------------------------------------------------------
# Test 2: timeout → skipped
# ---------------------------------------------------------------------------

def test_serper_skips_on_timeout():
    client = MagicMock()
    # Mock LLM query generation to succeed
    with patch("agents.serper_agent._generate_query", return_value="burj khalifa at the top dubai"):
        with patch("httpx.post", side_effect=httpx.TimeoutException("timed out")):
            result = serper_agent.run(_make_intake(), client, api_key="fake-key")
    assert result.skipped is True
    assert "timed out" in result.reason.lower()


# ---------------------------------------------------------------------------
# Test 3: HTTP 401 → skipped
# ---------------------------------------------------------------------------

def test_serper_skips_on_401():
    client = MagicMock()
    mock_response = httpx.Response(401, json={"message": "Unauthorized"})
    with patch("agents.serper_agent._generate_query", return_value="test query"):
        with patch("httpx.post", return_value=mock_response):
            result = serper_agent.run(_make_intake(), client, api_key="bad-key")
    assert result.skipped is True
    assert "401" in result.reason


# ---------------------------------------------------------------------------
# Test 4: HTTP 429 → skipped
# ---------------------------------------------------------------------------

def test_serper_skips_on_429():
    client = MagicMock()
    mock_response = httpx.Response(429, json={"message": "Too Many Requests"})
    with patch("agents.serper_agent._generate_query", return_value="test query"):
        with patch("httpx.post", return_value=mock_response):
            result = serper_agent.run(_make_intake(), client, api_key="real-key")
    assert result.skipped is True
    assert "429" in result.reason


# ---------------------------------------------------------------------------
# Test 5: Bad JSON response → skipped
# ---------------------------------------------------------------------------

def test_serper_skips_on_bad_json():
    client = MagicMock()
    # Build a response that returns non-JSON text
    mock_response = httpx.Response(200, text="not json at all {{{{")
    with patch("agents.serper_agent._generate_query", return_value="test query"):
        with patch("httpx.post", return_value=mock_response):
            result = serper_agent.run(_make_intake(), client, api_key="real-key")
    assert result.skipped is True
    assert "json" in result.reason.lower()


# ---------------------------------------------------------------------------
# Test 6: Successful response → PAA parsed correctly
# ---------------------------------------------------------------------------

def test_serper_parses_paa_correctly():
    client = MagicMock()
    serper_payload = {
        "organic": [
            {"title": "Burj Khalifa Tickets 2024", "snippet": "Book now", "link": "https://example.com"},
        ],
        "peopleAlsoAsk": [
            {"question": "How tall is the Burj Khalifa?"},
            {"question": "Can you go to the top of Burj Khalifa?"},
        ],
        "relatedSearches": [
            {"query": "burj-khalifa-observation-deck"},
            {"query": "dubai-tower-tickets"},
        ],
    }
    mock_response = httpx.Response(200, json=serper_payload)
    with patch("agents.serper_agent._generate_query", return_value="burj khalifa dubai"):
        with patch("httpx.post", return_value=mock_response):
            result = serper_agent.run(_make_intake(), client, api_key="real-key")

    assert result.skipped is False
    assert len(result.paa) == 2
    assert "How tall is the Burj Khalifa?" in result.paa
    assert len(result.organic) == 1
    assert result.organic[0].title == "Burj Khalifa Tickets 2024"
    assert len(result.related_searches) == 2


# ---------------------------------------------------------------------------
# Test 7: Pipeline continues when serper skipped (serper_context passed through)
# ---------------------------------------------------------------------------

def test_pipeline_continues_when_serper_skipped():
    """orchestrator.run passes serper_context to content_generator even when skipped."""
    import tempfile
    from pathlib import Path
    from unittest.mock import patch as _patch

    from models.listing import ListingOutput, Listing, TitleField, ShortDescription
    from models.listing import FullDescription, DescriptionSection, Description
    from models.listing import FAQ, SEO, ABTestPlan, PublishVerdict, Variant
    from models.review import ReviewOutput

    dummy_listing = ListingOutput(
        listing=Listing(
            title=TitleField(primary="Test", ab_variant="Test B"),
            tagline="tagline",
            description=Description(
                short=ShortDescription(primary="short", ab_variant="short b"),
                full=FullDescription(
                    section_1=DescriptionSection(header="h1", body="b1"),
                    section_2=DescriptionSection(header="h2", body="b2"),
                    section_3=DescriptionSection(header="h3", body="b3"),
                    section_4=DescriptionSection(header="h4", body="b4"),
                ),
            ),
            highlights=["h1"],
            inclusions=["i1"],
            exclusions=["e1"],
            faqs=[FAQ(question="Q?", answer="A " * 40)],
            seo=SEO(title="SEO Title", meta_description="Meta " * 30, tags=["tag-one"] * 8),
        ),
        variants=[Variant(name="V1", name_ab_variant="V1b", tagline="t", description="d", key_differentiators=["k"])],
        ab_test_plan=ABTestPlan(priority_test="title", hypothesis="h", metric_to_watch="ctr"),
        publish_verdict=PublishVerdict(ready=True, confidence="high"),
    )

    dummy_review = ReviewOutput.model_validate({
        "review": {
            "overall": "pass",
            "scores": {"factual_accuracy": 90, "voice_compliance": 90, "seo_completeness": 90},
            "blockers": [],
            "warnings": [],
            "regeneration_scope": [],
            "escalate_to_human": False,
            "escalation_reason": None,
        }
    })

    skipped_ctx = SerperContext(skipped=True, reason="SERPER_API_KEY not configured")

    captured = {}

    def fake_content_generator_run(intake, client, serper_context=None):
        captured["serper_context"] = serper_context
        return dummy_listing

    with tempfile.TemporaryDirectory() as tmpdir:
        with (
            _patch("orchestrator.LISTINGS_DIR", Path(tmpdir)),
            _patch("agents.intake_agent.run", return_value=_make_intake()),
            _patch("agents.serper_agent.run", return_value=skipped_ctx),
            _patch("agents.content_generator.run", side_effect=fake_content_generator_run),
            _patch("agents.template_engine.run", return_value={}),
            _patch("agents.review_agent.run", return_value=dummy_review),
            _patch("agents.duplicate_detector.check", return_value=[]),
            _patch("agents.email_generator.draft_clarification_email", return_value=""),
        ):
            import orchestrator
            orchestrator.run("supplier text", MagicMock(), run_id="test-skip")

    assert captured.get("serper_context") is not None
    assert captured["serper_context"].skipped is True


# ---------------------------------------------------------------------------
# Test 8: Content generator output format unchanged when serper skipped
# ---------------------------------------------------------------------------

def test_content_generator_output_format_unchanged_when_serper_skipped():
    """Passing a skipped SerperContext must not alter the user_content sent to LLM."""
    from agents import content_generator

    skipped_ctx = SerperContext(skipped=True, reason="no key")
    intake = _make_intake()

    captured_content = {}

    def fake_call_json(**kwargs):
        captured_content["user_content"] = kwargs.get("user_content", "")
        return {
            "listing": {
                "title": {"primary": "T", "ab_variant": "T2"},
                "tagline": "tag",
                "description": {
                    "short": {"primary": "s", "ab_variant": "s2"},
                    "full": {
                        "section_1": {"header": "h", "body": "b"},
                        "section_2": {"header": "h", "body": "b"},
                        "section_3": {"header": "h", "body": "b"},
                        "section_4": {"header": "h", "body": "b"},
                    },
                },
                "highlights": ["h"],
                "inclusions": ["i"],
                "exclusions": ["e"],
                "faqs": [{"question": "Q?", "answer": "A " * 40}],
                "seo": {"title": "SEO", "meta_description": "M " * 30, "tags": ["t"] * 8},
            },
            "variants": [{"name": "V", "name_ab_variant": "Vb", "tagline": "t", "description": "d", "key_differentiators": ["k"]}],
            "ab_test_plan": {"priority_test": "title", "hypothesis": "h", "metric_to_watch": "ctr"},
            "publish_verdict": {"ready": True, "confidence": "high"},
        }

    with patch("agents.content_generator.call_json", side_effect=fake_call_json):
        content_generator.run(intake, MagicMock(), serper_context=skipped_ctx)

    assert "SEO Research Context" not in captured_content.get("user_content", "")


# ---------------------------------------------------------------------------
# Test 9: Review agent omits Layer 3 check 9 note when serper_context skipped
# ---------------------------------------------------------------------------

def test_review_agent_runs_8_checks_when_serper_context_skipped():
    """When serper_context.skipped is True, review prompt must NOT include primary keyword signal."""
    from agents import review_agent
    from models.listing import ListingOutput

    skipped_ctx = SerperContext(skipped=True, reason="no key")
    intake = _make_intake()
    listing = MagicMock(spec=ListingOutput)
    listing.model_dump.return_value = {"listing": {}, "variants": [], "ab_test_plan": {}, "publish_verdict": {}, "structured_data": {}}

    captured = {}

    def fake_call_json(**kwargs):
        captured["user_content"] = kwargs.get("user_content", "")
        return {
            "review": {
                "overall": "pass",
                "scores": {"factual_accuracy": 90, "voice_compliance": 90, "seo_completeness": 90},
                "blockers": [],
                "warnings": [],
                "regeneration_scope": [],
                "escalate_to_human": False,
                "escalation_reason": None,
            }
        }

    with patch("agents.review_agent.call_json", side_effect=fake_call_json):
        review_agent.run(intake, listing, MagicMock(), serper_context=skipped_ctx)

    content = captured.get("user_content", "")
    assert "primary keyword signal" not in content
    assert "omit Layer 3 check 9" in content
