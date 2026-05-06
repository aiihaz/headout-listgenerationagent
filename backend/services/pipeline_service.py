"""
Async bridge between FastAPI and the synchronous orchestrator.

Pattern:
  launch_pipeline / launch_regeneration run the sync orchestrator in a
  ThreadPoolExecutor thread, communicate state transitions back via a
  thread-safe Queue, and drain that queue in the event loop — writing
  each status update to Supabase without blocking the event loop.
"""

import asyncio
import json
import os
import queue
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Optional

from openai import OpenAI

from backend.config import settings
from backend.services import supabase_service

_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="pipeline")

LISTINGS_DIR = Path("listings")


def _apply_openai_model_settings() -> None:
    for name in (
        "OPENAI_MODEL",
        "OPENAI_INTAKE_MODEL",
        "OPENAI_CONTENT_MODEL",
        "OPENAI_REVIEW_MODEL",
    ):
        value = getattr(settings, name, None)
        if value:
            os.environ[name] = value


# ---------------------------------------------------------------------------
# Full pipeline
# ---------------------------------------------------------------------------

def _sync_pipeline(
    run_id: str,
    supplier_input: str,
    status_q: "queue.Queue[Optional[tuple]]",
) -> None:
    """Runs in a ThreadPoolExecutor thread. Never awaits anything."""
    _apply_openai_model_settings()
    import orchestrator

    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    def on_status(state: str, error: Optional[str] = None, flag_count: Optional[int] = None) -> None:
        status_q.put((state, error, flag_count))

    try:
        orchestrator.run(
            supplier_input,
            client,
            run_id=run_id,
            status_callback=on_status,
            serper_api_key=settings.SERPER_API_KEY,
        )
    except Exception as exc:
        status_q.put(("generation_blocked", str(exc), None))
    finally:
        status_q.put(None)  # sentinel — drain loop exits on None


_TERMINAL_STATES = frozenset({
    "ready_for_publish", "escalated_to_human",
    "generation_blocked", "intake_failed",
})


async def _drain_status(run_id: str, status_q: "queue.Queue[Optional[tuple]]") -> None:
    """Runs in the event loop. Drains the queue and writes each status to Supabase."""
    loop = asyncio.get_running_loop()
    while True:
        item = await loop.run_in_executor(None, status_q.get)
        if item is None:
            break
        state, error, flag_count = item
        await supabase_service.update_run_status(run_id, state, error, flag_count)


async def _drain_status_hold_terminal(
    run_id: str, status_q: "queue.Queue[Optional[tuple]]"
) -> "Optional[tuple]":
    """Like _drain_status but holds the terminal status (not written to DB yet) and returns it.
    Used by launch_regeneration so artifacts are persisted before the frontend sees the final state."""
    loop = asyncio.get_running_loop()
    held: "Optional[tuple]" = None
    while True:
        item = await loop.run_in_executor(None, status_q.get)
        if item is None:
            break
        state, error, flag_count = item
        if state in _TERMINAL_STATES:
            held = item  # write after _persist_artifacts
        else:
            await supabase_service.update_run_status(run_id, state, error, flag_count)
    return held


_ARTIFACT_FILES = {
    "intake": "intake.json",
    "listing": "listing.json",
    "serper_context": "serper_context.json",
    "merged_listing": "merged_listing.json",
    "review": "review.json",
    "escalation_record": "escalation_record.json",
    "supplier_email_draft": "supplier_email_draft.json",
}


async def _persist_artifacts(run_id: str) -> None:
    """After pipeline completes, push filesystem artifacts to Supabase run_artifacts."""
    run_dir = LISTINGS_DIR / run_id
    for artifact_type, filename in _ARTIFACT_FILES.items():
        stem = filename.replace(".json", "")
        v2_path = run_dir / f"{stem}_v2.json"
        path = v2_path if v2_path.exists() else run_dir / filename
        if not path.exists():
            continue
        try:
            payload = json.loads(path.read_text())
            await supabase_service.write_artifact(run_id, artifact_type, payload)
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning("artifact persist failed %s/%s: %s", run_id, filename, exc)


async def launch_pipeline(run_id: str, supplier_input: str) -> None:
    """Entry point called from FastAPI BackgroundTasks."""
    status_q: queue.Queue = queue.Queue()
    loop = asyncio.get_running_loop()

    pipeline_future = loop.run_in_executor(
        _executor, _sync_pipeline, run_id, supplier_input, status_q
    )
    await asyncio.gather(pipeline_future, _drain_status(run_id, status_q))
    await _persist_artifacts(run_id)
    await _update_experience_name_from_intake(run_id)


async def _update_experience_name_from_intake(run_id: str) -> None:
    """Read productName from the intake artifact and update the run record."""
    intake_path = LISTINGS_DIR / run_id / "intake.json"
    if not intake_path.exists():
        return
    try:
        intake_data = json.loads(intake_path.read_text())
        product_name = intake_data.get("payload", {}).get("productName")
        if product_name:
            await supabase_service.update_experience_name(run_id, product_name)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("experience_name update failed for %s: %s", run_id, exc)


# ---------------------------------------------------------------------------
# Targeted regeneration (associate clicks Regenerate on a specific field)
# ---------------------------------------------------------------------------

def _sync_regeneration(
    run_id: str,
    section: str,
    fix_instruction: str,
    status_q: "queue.Queue[Optional[tuple]]",
) -> None:
    """Runs in a ThreadPoolExecutor thread. Loads artifacts, regens one section, re-reviews."""
    _apply_openai_model_settings()
    from agents import content_generator, review_agent
    from models.intake import IntakeResult
    from models.listing import ListingOutput
    from models.serper import SerperContext
    from orchestrator import _merge, _merged_to_dict, _save, _save_escalation, PipelineRun, PipelineState

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    run_dir = LISTINGS_DIR / run_id

    try:
        status_q.put(("regeneration_in_progress", None, None))

        # Load intake
        intake_path = run_dir / "intake.json"
        if not intake_path.exists():
            raise FileNotFoundError(f"intake.json not found for run {run_id}")
        intake = IntakeResult.model_validate(json.loads(intake_path.read_text()))

        # Load most recent merged listing
        for candidate in ("merged_listing_v2.json", "merged_listing.json"):
            p = run_dir / candidate
            if p.exists():
                merged_data = json.loads(p.read_text())
                break
        else:
            raise FileNotFoundError(f"No merged_listing found for run {run_id}")

        previous_listing = ListingOutput.model_validate(merged_data)
        existing_json_ld = merged_data.get("structured_data", {}).get("json_ld", {})

        # Load serper context if available (best-effort)
        serper_context = None
        serper_path = run_dir / "serper_context.json"
        if serper_path.exists():
            try:
                serper_context = SerperContext.model_validate(json.loads(serper_path.read_text()))
            except Exception:
                pass

        scope = [section]
        blockers = [
            {
                "field": section,
                "found": "Associate requested manual regeneration",
                "fix_instruction": fix_instruction,
            }
        ]

        regen_listing = content_generator.run_targeted_regen(
            intake, previous_listing, scope, blockers, client,
            serper_context=serper_context,
        )
        new_merged = _merge(regen_listing, existing_json_ld)

        _save(run_dir / "merged_listing_v2.json", _merged_to_dict(new_merged, intake))

        # Re-run review on the updated listing
        review_result = review_agent.run(intake, new_merged, client, is_regen_pass=True, serper_context=serper_context)
        _save(run_dir / "review_v2.json", review_result.model_dump())

        if review_result.review.overall in ("pass", "conditional_pass"):
            status_q.put(("ready_for_publish", None, 0))
        else:
            # Second failure after associate-initiated regen — escalate
            ctx = PipelineRun(run_id=run_id, state=PipelineState.ESCALATED_TO_HUMAN)
            ctx.review = review_result  # type: ignore[assignment]
            _save_escalation(run_dir, ctx)
            status_q.put(("escalated_to_human", None, len(review_result.review.blockers)))

    except Exception as exc:
        status_q.put(("generation_blocked", str(exc), None))
    finally:
        status_q.put(None)


async def launch_regeneration(
    run_id: str,
    section: str,
    fix_instruction: str,
) -> None:
    """Entry point for associate-triggered targeted section regen.

    Artifacts are persisted BEFORE the terminal status is written to Supabase so
    the frontend always fetches up-to-date artifacts when it detects the terminal state.
    """
    status_q: queue.Queue = queue.Queue()
    loop = asyncio.get_running_loop()

    held_status: list = [None]

    async def drain_and_hold() -> None:
        held_status[0] = await _drain_status_hold_terminal(run_id, status_q)

    pipeline_future = loop.run_in_executor(
        _executor, _sync_regeneration, run_id, section, fix_instruction, status_q
    )
    await asyncio.gather(pipeline_future, drain_and_hold())
    await _persist_artifacts(run_id)
    # Write terminal status only after artifacts are safely in Supabase
    if held_status[0] is not None:
        state, error, flag_count = held_status[0]
        await supabase_service.update_run_status(run_id, state, error, flag_count)


# ---------------------------------------------------------------------------
# Image upload persistence
# ---------------------------------------------------------------------------

async def save_image(run_id: str, filename: str, content: bytes, content_type: str) -> str:
    """Persists an uploaded image. Supabase Storage if configured, filesystem fallback."""
    client = supabase_service._get_client()

    if client:
        try:
            path = f"{run_id}/{filename}"
            client.storage.from_("run-images").upload(
                path, content, file_options={"content-type": content_type}
            )
            url = client.storage.from_("run-images").get_public_url(path)
            await supabase_service.supabase_write_with_retry(
                "run_images",
                {"run_id": run_id, "filename": filename, "storage_path": path, "url": url},
                operation="insert",
            )
            return url
        except Exception:
            pass  # fall through to filesystem

    # Filesystem fallback
    img_dir = LISTINGS_DIR / run_id / "images"
    img_dir.mkdir(parents=True, exist_ok=True)
    (img_dir / filename).write_bytes(content)
    return f"/listings/{run_id}/images/{filename}"
