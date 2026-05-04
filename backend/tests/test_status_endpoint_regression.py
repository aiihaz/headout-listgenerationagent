"""
Regression: ISSUE-001 — /status endpoint returns 404 when supplier_name not in DB schema
Found by /qa on 2026-05-04
Report: .gstack/qa-reports/qa-report-localhost-5173-2026-05-04.md

Root cause: get_run_status selected supplier_name which does not exist in the
Supabase runs schema (42703 column not found). The except block returned None
instead of falling back, so every /status poll during ProcessingScreen returned
HTTP 404. Fix: select only id, status, error_message — the three fields the
frontend actually uses.
"""

import pytest
from unittest.mock import MagicMock, patch, AsyncMock


@pytest.mark.asyncio
async def test_get_run_status_succeeds_without_supplier_name_column():
    """
    get_run_status must return status data even when supplier_name is absent
    from the DB schema. Previously it would raise a Supabase 42703 error and
    return None, causing a 404.
    """
    from backend.services.supabase_service import get_run_status

    fake_row = {
        "id": "run-001",
        "status": "escalated_to_human",
        "error_message": None,
    }

    mock_response = MagicMock()
    mock_response.data = fake_row

    mock_query = MagicMock()
    mock_query.select.return_value = mock_query
    mock_query.eq.return_value = mock_query
    mock_query.single.return_value = mock_query
    mock_query.execute.return_value = mock_response

    mock_client = MagicMock()
    mock_client.table.return_value = mock_query

    with patch("backend.services.supabase_service._get_client", return_value=mock_client):
        result = await get_run_status("run-001")

    assert result is not None, "get_run_status returned None — status endpoint would 404"
    assert result["status"] == "escalated_to_human"
    assert result["id"] == "run-001"

    # Confirm supplier_name is NOT in the select call
    mock_query.select.assert_called_once()
    select_args = mock_query.select.call_args[0][0]
    assert "supplier_name" not in select_args, (
        f"supplier_name must not be selected (column does not exist in DB). "
        f"Got: {select_args}"
    )


@pytest.mark.asyncio
async def test_get_run_status_returns_none_for_missing_run():
    """get_run_status must return None (not raise) when the run does not exist."""
    from backend.services.supabase_service import get_run_status

    mock_response = MagicMock()
    mock_response.data = None

    mock_query = MagicMock()
    mock_query.select.return_value = mock_query
    mock_query.eq.return_value = mock_query
    mock_query.single.return_value = mock_query
    mock_query.execute.return_value = mock_response

    mock_client = MagicMock()
    mock_client.table.return_value = mock_query

    with patch("backend.services.supabase_service._get_client", return_value=mock_client):
        result = await get_run_status("nonexistent-run")

    assert result is None
