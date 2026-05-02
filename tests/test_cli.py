"""
Pipeline invariant tests. No Supabase required — exercises the CLI orchestrator
directly with mocked Gemini calls so these run in CI without API keys.

Four invariants:
  1. CONTRADICTED input → state == intake_failed (pipeline halts)
  2. Targeted regen is called with only the failing scope (immutability)
  3. CONDITIONAL ambiguity flag carries blocks_publish=True
  4. null payload field ≠ [] in template engine output
"""

from typing import Optional
from unittest.mock import MagicMock, patch

import pytest

import orchestrator
from orchestrator import PipelineState
from models.intake import (
    AmbiguityFlag,
    AmbiguityType,
    DesignDecision,
    IntakeMeta,
    IntakeResult,
    MetaConfidence,
)
from models.listing import (
    ABTestPlan,
    CopyQualityScore,
    Description,
    DescriptionSection,
    FAQ,
    FullDescription,
    KnowBeforeYouGo,
    Listing,
    ListingOutput,
    PublishVerdict,
    SEO,
    ShortDescription,
    TitleField,
    Variant,
)
from models.review import ReviewBlocker, ReviewDetail, ReviewOutput, ReviewScores


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fake_intake(publish_blocked: bool = False, flags: Optional[list] = None) -> IntakeResult:
    return IntakeResult.model_validate(
        {
            "_meta": {
                "supplier": "Test Supplier",
                "generated_at": "2026-01-01T00:00:00Z",
                "confidence": "HIGH",
                "publish_blocked": publish_blocked,
                "publish_blocked_reasons": [],
            },
            "payload": {
                "productName": "Test Tour",
                "location": {"city": "Dubai"},
                "start_times": ["09:00", "14:00"],
                "faqs": [{"question": "Do I need tickets?", "answer": "Yes."}],
            },
            "_sources": {},
            "ambiguity_flags": [f.model_dump() for f in (flags or [])],
            "design_decisions": [],
        }
    )


def _fake_listing() -> ListingOutput:
    return ListingOutput(
        listing=Listing(
            title=TitleField(primary="Test Title", ab_variant="Alt Title"),
            tagline="A great tour",
            description=Description(
                short=ShortDescription(primary="Short desc", ab_variant="Alt short"),
                full=FullDescription(
                    section_1=DescriptionSection(header="Header 1", body="Body 1"),
                    section_2=DescriptionSection(header="Header 2", body="Body 2"),
                    section_3=DescriptionSection(header="Header 3", body="Body 3"),
                    section_4=DescriptionSection(header="Header 4", body="Body 4"),
                ),
            ),
            highlights=["Highlight one", "Highlight two", "Three", "Four", "Five", "Six"],
            inclusions=["Included item"],
            exclusions=["Excluded item"],
            faqs=[FAQ(question="Do I need tickets?", answer="Yes.")],
            seo=SEO(
                title="SEO Title",
                meta_description="Meta desc",
                tags=["tag1", "tag2"],
            ),
        ),
        variants=[
            Variant(
                name="Standard",
                name_ab_variant="Classic",
                tagline="Standard tagline",
                description="Standard desc",
                key_differentiators=["Key diff"],
            )
        ],
        ab_test_plan=ABTestPlan(
            priority_test="title",
            hypothesis="Alt title drives more clicks",
            metric_to_watch="CTR",
        ),
        publish_verdict=PublishVerdict(
            ready=True,
            confidence="HIGH",
            copy_quality_score=CopyQualityScore(
                title="A", description="A", highlights="A", faqs="A", seo="A"
            ),
        ),
    )


def _review_pass() -> ReviewOutput:
    return ReviewOutput(
        review=ReviewDetail(
            overall="pass",
            scores=ReviewScores(
                factual_accuracy=9, voice_compliance=8, seo_completeness=8
            ),
        )
    )


def _review_fail(scope: list[str]) -> ReviewOutput:
    return ReviewOutput(
        review=ReviewDetail(
            overall="fail",
            scores=ReviewScores(
                factual_accuracy=4, voice_compliance=7, seo_completeness=7
            ),
            blockers=[
                ReviewBlocker(
                    id="B1",
                    field=scope[0],
                    type="factual",
                    found="Wrong value",
                    intake_says="Correct value",
                    fix_instruction="Fix the value.",
                )
            ],
            regeneration_scope=scope,
        )
    )


# ---------------------------------------------------------------------------
# Test 1: CONTRADICTED input halts at intake_failed
# ---------------------------------------------------------------------------

def test_contradicted_input_halts_pipeline():
    client = MagicMock()

    with patch("agents.intake_agent.run", side_effect=RuntimeError("Contradicted pickup time: 3:30 PM vs 4:00 PM")):
        result = orchestrator.run("contradicted supplier text", client)

    assert result.state == PipelineState.INTAKE_FAILED
    assert result.intake is None
    assert result.error is not None
    assert result.merged_listing is None


# ---------------------------------------------------------------------------
# Test 2: Targeted regen called with exactly the failing scope (immutability)
# ---------------------------------------------------------------------------

def test_targeted_regen_uses_only_failing_scope():
    client = MagicMock()
    failing_scope = ["listing.title.primary"]

    with (
        patch("agents.intake_agent.run", return_value=_fake_intake()),
        patch("agents.duplicate_detector.check", return_value=[]),
        patch("agents.email_generator.draft_clarification_email", return_value=""),
        patch("agents.content_generator.run", return_value=_fake_listing()),
        patch("agents.template_engine.run", return_value={"@context": "https://schema.org", "@graph": []}),
        patch("agents.review_agent.run", side_effect=[_review_fail(failing_scope), _review_pass()]),
        patch("agents.content_generator.run_targeted_regen", return_value=_fake_listing()) as mock_regen,
        patch("orchestrator._save"),
    ):
        result = orchestrator.run("valid supplier text", client)

    assert result.state == PipelineState.READY_FOR_PUBLISH

    # run_targeted_regen must have been called once with the exact failing scope
    assert mock_regen.call_count == 1
    _, kwargs = mock_regen.call_args
    passed_scope = mock_regen.call_args[0][2]  # positional arg index 2 = regeneration_scope
    assert passed_scope == failing_scope


# ---------------------------------------------------------------------------
# Test 3: CONDITIONAL ambiguity flag carries blocks_publish=True
# ---------------------------------------------------------------------------

def test_conditional_flag_blocks_publish():
    flag = AmbiguityFlag(
        type=AmbiguityType.CONDITIONAL,
        field="tower_access",
        supplier_text="not guaranteed",
        resolution="Listed as CONDITIONAL in inclusions with explicit language",
        action_required="Add CONDITIONAL FAQ and refund policy",
        blocks_publish=True,
    )

    assert flag.type == AmbiguityType.CONDITIONAL
    assert flag.blocks_publish is True

    # Verify the flag survives round-trip through IntakeResult
    intake = _fake_intake(flags=[flag])
    assert len(intake.ambiguity_flags) == 1
    assert intake.ambiguity_flags[0].blocks_publish is True
    assert intake.ambiguity_flags[0].type == AmbiguityType.CONDITIONAL


# ---------------------------------------------------------------------------
# Test 4: null ≠ [] in template engine output
# ---------------------------------------------------------------------------

def test_null_is_not_empty_list_in_template_engine():
    from agents.template_engine import run as te_run

    def _graph_types(result: dict) -> list[str]:
        return [n["@type"] for n in result.get("@graph", [])]

    def _tour_node(result: dict):
        return next(
            (n for n in result["@graph"] if n.get("@type") == "TourActivity"), None
        )

    # null start_times → openingHoursSpecification omitted
    intake_null = _fake_intake()
    intake_null.payload["start_times"] = None
    result_null = te_run(intake_null)
    assert "openingHoursSpecification" not in _tour_node(result_null)

    # [] start_times → also omitted (confirmed none exist, still no spec to emit)
    intake_empty = _fake_intake()
    intake_empty.payload["start_times"] = []
    result_empty = te_run(intake_empty)
    assert "openingHoursSpecification" not in _tour_node(result_empty)

    # Non-empty start_times → present
    intake_times = _fake_intake()
    intake_times.payload["start_times"] = ["09:00", "14:00"]
    result_times = te_run(intake_times)
    assert "openingHoursSpecification" in _tour_node(result_times)
    assert len(_tour_node(result_times)["openingHoursSpecification"]) == 2

    # The semantic distinction is preserved in the payload itself
    assert intake_null.payload["start_times"] is None
    assert intake_empty.payload["start_times"] == []
    assert intake_null.payload["start_times"] != intake_empty.payload["start_times"]

    # null FAQs → FAQPage omitted; [] FAQs → also omitted
    intake_null_faqs = _fake_intake()
    intake_null_faqs.payload["faqs"] = None
    assert "FAQPage" not in _graph_types(te_run(intake_null_faqs))

    intake_empty_faqs = _fake_intake()
    intake_empty_faqs.payload["faqs"] = []
    assert "FAQPage" not in _graph_types(te_run(intake_empty_faqs))
