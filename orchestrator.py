"""
Pipeline orchestrator: runs Intake → Content Generator + Template Engine → Review,
with targeted regeneration on fail and escalation on second fail.

Artifacts saved per run to listings/{run_id}/:
  intake.json, listing.json, verified_json_ld.json,
  merged_listing.json, review.json, [merged_listing_v2.json], [escalation_record.json]
"""

import json
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Optional

from agents import (
    content_generator,
    duplicate_detector,
    email_generator,
    intake_agent,
    review_agent,
    serper_agent,
    template_engine,
)
from models.intake import IntakeResult
from models.listing import ListingOutput
from models.review import ReviewOutput
from models.serper import SerperContext

LISTINGS_DIR = Path("listings")


class PipelineState(str, Enum):
    PENDING = "pending"
    INTAKE_IN_PROGRESS = "intake_in_progress"
    INTAKE_COMPLETE = "intake_complete"
    GENERATION_IN_PROGRESS = "generation_in_progress"
    GENERATION_COMPLETE = "generation_complete"
    REVIEW_IN_PROGRESS = "review_in_progress"
    READY_FOR_PUBLISH = "ready_for_publish"
    REGENERATION_IN_PROGRESS = "regeneration_in_progress"
    ESCALATED_TO_HUMAN = "escalated_to_human"
    SERPER_IN_PROGRESS = "serper_in_progress"
    SERPER_COMPLETE = "serper_complete"
    SERPER_SKIPPED = "serper_skipped"
    INTAKE_FAILED = "intake_failed"
    GENERATION_BLOCKED = "generation_blocked"


@dataclass
class PipelineRun:
    run_id: str
    state: PipelineState = PipelineState.PENDING
    intake: Optional[IntakeResult] = None
    listing: Optional[ListingOutput] = None
    json_ld: Optional[dict] = None
    merged_listing: Optional[ListingOutput] = None
    review: Optional[ReviewOutput] = None
    serper_context: Optional[SerperContext] = None
    duplicates: list[dict] = field(default_factory=list)
    supplier_email_draft: Optional[str] = None
    error: Optional[str] = None
    started_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    finished_at: Optional[str] = None


@dataclass
class PipelineResult:
    run_id: str
    state: PipelineState
    intake: Optional[IntakeResult]
    merged_listing: Optional[ListingOutput]
    review: Optional[ReviewOutput]
    duplicates: list[dict]
    supplier_email_draft: Optional[str]
    error: Optional[str]


StatusCallback = Callable[[str, Optional[str], Optional[int]], None]


def _notify(
    state: PipelineState,
    callback: Optional[StatusCallback],
    error: Optional[str] = None,
    flag_count: Optional[int] = None,
) -> None:
    if callback:
        callback(state.value, error, flag_count)


def run(
    supplier_text: str,
    client: Any,
    run_id: Optional[str] = None,
    status_callback: Optional[StatusCallback] = None,
    serper_api_key: str = "",
) -> PipelineResult:
    if run_id is None:
        run_id = str(uuid.uuid4())[:8]
    ctx = PipelineRun(run_id=run_id)
    run_dir = LISTINGS_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    ctx.state = PipelineState.INTAKE_IN_PROGRESS
    _notify(ctx.state, status_callback)

    # Step 2 — Intake Agent
    try:
        ctx.intake = intake_agent.run(supplier_text, client)
        ctx.state = PipelineState.INTAKE_COMPLETE
        _notify(ctx.state, status_callback)
        _save(run_dir / "intake.json", ctx.intake.model_dump(by_alias=True))
    except Exception as exc:
        ctx.state = PipelineState.INTAKE_FAILED
        ctx.error = str(exc)
        _notify(ctx.state, status_callback, ctx.error)
        return _result(ctx)

    # Duplicate check on structured payload
    ctx.duplicates = duplicate_detector.check(ctx.intake.payload)

    # Supplier clarification email draft
    ctx.supplier_email_draft = email_generator.draft_clarification_email(
        ctx.intake.meta.supplier, ctx.intake.ambiguity_flags
    )

    # Step 2.5 — Serper SEO research (graceful degrade: never blocks pipeline)
    ctx.state = PipelineState.SERPER_IN_PROGRESS
    _notify(ctx.state, status_callback)
    ctx.serper_context = serper_agent.run(ctx.intake, client, serper_api_key)
    ctx.state = PipelineState.SERPER_SKIPPED if ctx.serper_context.skipped else PipelineState.SERPER_COMPLETE
    _notify(ctx.state, status_callback)
    _save(run_dir / "serper_context.json", ctx.serper_context.model_dump())

    # Step 3 — Content Generator + Template Engine in parallel
    ctx.state = PipelineState.GENERATION_IN_PROGRESS
    _notify(ctx.state, status_callback)
    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            gen_future = pool.submit(content_generator.run, ctx.intake, client, ctx.serper_context)
            te_future = pool.submit(template_engine.run, ctx.intake)
            listing_raw = gen_future.result()
            json_ld = te_future.result()
        ctx.json_ld = json_ld
        ctx.listing = listing_raw
        ctx.state = PipelineState.GENERATION_COMPLETE
        _notify(ctx.state, status_callback)
        _save(run_dir / "listing.json", listing_raw.model_dump())
        _save(run_dir / "verified_json_ld.json", json_ld)
    except RuntimeError as exc:
        ctx.state = PipelineState.GENERATION_BLOCKED
        ctx.error = str(exc)
        _notify(ctx.state, status_callback, ctx.error)
        return _result(ctx)

    # Merge: inject JSON-LD into listing structured_data + build canonical strategy
    ctx.merged_listing = _merge(ctx.listing, ctx.json_ld)
    _save(run_dir / "merged_listing.json", _merged_to_dict(ctx.merged_listing, ctx.intake))

    # Step 4 — Review Agent (first pass)
    ctx.state = PipelineState.REVIEW_IN_PROGRESS
    _notify(ctx.state, status_callback)
    try:
        ctx.review = review_agent.run(ctx.intake, ctx.merged_listing, client, is_regen_pass=False, serper_context=ctx.serper_context)
        _save(run_dir / "review.json", ctx.review.model_dump())
    except Exception as exc:
        ctx.error = str(exc)
        _notify(PipelineState.GENERATION_BLOCKED, status_callback, ctx.error)
        return _result(ctx)

    verdict = ctx.review.review.overall

    if verdict in ("pass", "conditional_pass"):
        ctx.state = PipelineState.READY_FOR_PUBLISH
        ctx.finished_at = datetime.now(timezone.utc).isoformat()
        _notify(ctx.state, status_callback, flag_count=len(ctx.review.review.warnings))
        _save_final(run_dir, ctx)
        return _result(ctx)

    # FAIL path — split blockers by action_required
    all_blockers = ctx.review.review.blockers
    regen_blockers = [b for b in all_blockers if b.action_required == "regenerate"]
    associate_blockers = [b for b in all_blockers if b.action_required == "associate_action"]

    # If every blocker is for the associate to resolve (no content to regenerate), surface to review
    if not regen_blockers:
        ctx.state = PipelineState.READY_FOR_PUBLISH
        ctx.finished_at = datetime.now(timezone.utc).isoformat()
        _notify(ctx.state, status_callback, flag_count=len(associate_blockers))
        _save_final(run_dir, ctx)
        return _result(ctx)

    # Always attempt regen when there are regenerate blockers — even if escalate_to_human is true.
    # escalate_to_human on a first pass reflects Review Agent uncertainty, not a blocker the regen
    # can't fix. The second pass will escalate if regen didn't resolve the issues.
    ctx.state = PipelineState.REGENERATION_IN_PROGRESS
    _notify(ctx.state, status_callback)
    blockers = [b.model_dump() for b in regen_blockers]
    scope = [b.field for b in regen_blockers]

    try:
        regen_listing = content_generator.run_targeted_regen(
            ctx.intake, ctx.merged_listing, scope, blockers, client,
            serper_context=ctx.serper_context,
        )
        ctx.merged_listing = _merge(regen_listing, ctx.json_ld)
        _save(run_dir / "merged_listing_v2.json", _merged_to_dict(ctx.merged_listing, ctx.intake))
    except Exception as exc:
        ctx.state = PipelineState.ESCALATED_TO_HUMAN
        ctx.error = str(exc)
        _notify(ctx.state, status_callback, ctx.error)
        _save_escalation(run_dir, ctx)
        return _result(ctx)

    # Second review pass
    try:
        ctx.review = review_agent.run(ctx.intake, ctx.merged_listing, client, is_regen_pass=True, serper_context=ctx.serper_context)
        _save(run_dir / "review_v2.json", ctx.review.model_dump())
    except Exception as exc:
        ctx.state = PipelineState.ESCALATED_TO_HUMAN
        ctx.error = str(exc)
        _notify(ctx.state, status_callback, ctx.error)
        _save_escalation(run_dir, ctx)
        return _result(ctx)

    post_regen_regen = [b for b in ctx.review.review.blockers if b.action_required == "regenerate"]
    if ctx.review.review.overall in ("pass", "conditional_pass") or not post_regen_regen:
        ctx.state = PipelineState.READY_FOR_PUBLISH
        final_flag_count = len(ctx.review.review.warnings)
    else:
        ctx.state = PipelineState.ESCALATED_TO_HUMAN
        final_flag_count = len(ctx.review.review.blockers)
        _save_escalation(run_dir, ctx)

    _notify(ctx.state, status_callback, flag_count=final_flag_count)
    ctx.finished_at = datetime.now(timezone.utc).isoformat()
    _save_final(run_dir, ctx)
    return _result(ctx)


def _merge(listing: ListingOutput, json_ld: dict) -> ListingOutput:
    data = listing.model_dump()
    if "structured_data" not in data:
        data["structured_data"] = {}

    # Rebuild FAQPage from listing FAQs so JSON-LD stays in sync with generated copy.
    # Template engine runs on intake FAQs; content generator may add/change FAQs.
    merged_json_ld = dict(json_ld) if json_ld else {}
    listing_faqs = (data.get("listing") or {}).get("faqs") or []
    if listing_faqs:
        faq_entities = [
            {
                "@type": "Question",
                "name": f.get("question") or f.get("q", ""),
                "acceptedAnswer": {"@type": "Answer", "text": f.get("answer") or f.get("a", "")},
            }
            for f in listing_faqs
            if (f.get("question") or f.get("q")) and (f.get("answer") or f.get("a"))
        ]
        graph = merged_json_ld.get("@graph") or []
        # Replace existing FAQPage node; insert one if absent.
        new_graph = [n for n in graph if n.get("@type") != "FAQPage"]
        if faq_entities:
            new_graph.append({"@type": "FAQPage", "mainEntity": faq_entities})
        merged_json_ld["@graph"] = new_graph

    data["structured_data"]["json_ld"] = merged_json_ld

    # Build canonical strategy from variants
    variants = data.get("variants") or []
    canonicals = []
    for i, v in enumerate(variants):
        canonicals.append({
            "variant_name": v.get("name", f"Variant {i + 1}"),
            "canonical": "self-canonical" if i == 0 else "canonical-to-primary",
        })
    data["structured_data"]["canonical_strategy"] = {"variant_canonicals": canonicals}
    return ListingOutput.model_validate(data)


def _merged_to_dict(listing: ListingOutput, intake: IntakeResult) -> dict:
    d = listing.model_dump()
    d["intake_payload"] = intake.payload
    return d


def _save(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False))


def _save_final(run_dir: Path, ctx: PipelineRun) -> None:
    pass


def _save_escalation(run_dir: Path, ctx: PipelineRun) -> None:
    record = {
        "run_id": ctx.run_id,
        "trigger": ctx.state.value,
        "error": ctx.error,
        "escalated_at": datetime.now(timezone.utc).isoformat(),
        "review": ctx.review.model_dump() if ctx.review else None,
    }
    _save(run_dir / "escalation_record.json", record)


def _result(ctx: PipelineRun) -> PipelineResult:
    return PipelineResult(
        run_id=ctx.run_id,
        state=ctx.state,
        intake=ctx.intake,
        merged_listing=ctx.merged_listing,
        review=ctx.review,
        duplicates=ctx.duplicates,
        supplier_email_draft=ctx.supplier_email_draft,
        error=ctx.error,
    )
