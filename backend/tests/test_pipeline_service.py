"""
Backend pipeline service tests. No Supabase or OpenAI API keys required.

Three invariants:
  1. Any exception in orchestrator.run → status "generation_blocked" pushed to queue
  2. supabase_write_with_retry retries on transient failures and succeeds on 3rd attempt
  3. escalation_record.json is written when review fails twice
"""

import json
import queue
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.services import supabase_service
from backend.services.pipeline_service import _sync_pipeline


# ---------------------------------------------------------------------------
# Test 1: Orchestrator exception → generation_blocked
# ---------------------------------------------------------------------------

def test_pipeline_blocked_on_orchestrator_exception():
    status_q: queue.Queue = queue.Queue()

    with (
        patch("backend.services.pipeline_service.OpenAI") as mock_openai,
        patch("orchestrator.run", side_effect=RuntimeError("OpenAI API timeout")),
    ):
        mock_openai.return_value = MagicMock()
        _sync_pipeline("run-abc", "some supplier text", status_q)

    collected = []
    while not status_q.empty():
        collected.append(status_q.get_nowait())

    assert ("generation_blocked", "OpenAI API timeout") in collected
    assert collected[-1] is None  # sentinel always pushed in finally block


# ---------------------------------------------------------------------------
# Test 2: Supabase write retries 3 times on transient failure
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_supabase_write_retries_on_transient_failure():
    attempts = []

    def execute_side_effect():
        attempts.append(1)
        if len(attempts) < 3:
            raise Exception("Connection reset by peer")
        # 3rd call succeeds (returns None implicitly)

    mock_client = MagicMock()
    mock_client.table.return_value.insert.return_value.execute.side_effect = execute_side_effect

    with (
        patch.object(supabase_service, "_get_client", return_value=mock_client),
        patch("asyncio.sleep", new=AsyncMock()),
    ):
        result = await supabase_service.supabase_write_with_retry(
            "runs", {"id": "test-run"}, operation="insert"
        )

    assert result is True
    assert len(attempts) == 3


# ---------------------------------------------------------------------------
# Test 3: escalation_record.json written on second review fail
# ---------------------------------------------------------------------------

def test_escalation_record_written_on_double_review_fail():
    import orchestrator
    from orchestrator import PipelineState
    from tests.test_cli import _fake_intake, _fake_listing, _review_fail

    client = MagicMock()

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        with (
            patch.object(orchestrator, "LISTINGS_DIR", tmp_path),
            patch("agents.intake_agent.run", return_value=_fake_intake()),
            patch("agents.duplicate_detector.check", return_value=[]),
            patch("agents.email_generator.draft_clarification_email", return_value=""),
            patch("agents.content_generator.run", return_value=_fake_listing()),
            patch("agents.template_engine.run", return_value={"@context": "https://schema.org", "@graph": []}),
            patch(
                "agents.review_agent.run",
                side_effect=[
                    _review_fail(["listing.title.primary"]),
                    _review_fail(["listing.title.primary"]),
                ],
            ),
            patch("agents.content_generator.run_targeted_regen", return_value=_fake_listing()),
        ):
            result = orchestrator.run("valid supplier text", client)

        assert result.state == PipelineState.ESCALATED_TO_HUMAN

        escalation_files = list(tmp_path.rglob("escalation_record.json"))
        assert len(escalation_files) == 1

        record = json.loads(escalation_files[0].read_text())
        assert record["trigger"] == "escalated_to_human"
        assert record["run_id"] == result.run_id
