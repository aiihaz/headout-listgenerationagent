import asyncio
import json
import logging
from pathlib import Path
from typing import Any, Optional

from backend.config import settings

logger = logging.getLogger(__name__)

LISTINGS_DIR = Path("listings")


def _get_client():
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        return None
    from supabase import create_client
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


async def supabase_write_with_retry(
    table: str,
    data: dict,
    match: Optional[dict] = None,
    operation: str = "insert",
    attempts: int = 3,
) -> bool:
    client = _get_client()
    if client is None:
        _filesystem_fallback(table, data, match)
        return True

    for attempt in range(attempts):
        try:
            if operation == "insert":
                client.table(table).insert(data).execute()
            elif operation == "update" and match:
                q = client.table(table).update(data)
                for k, v in match.items():
                    q = q.eq(k, v)
                q.execute()
            elif operation == "upsert":
                client.table(table).upsert(data, on_conflict="run_id,type").execute()
            return True
        except Exception as exc:
            if attempt == attempts - 1:
                logger.error("Supabase write failed after %d attempts: %s", attempts, exc)
                _filesystem_fallback(table, data, match)
                return False
            await asyncio.sleep(1.5 ** attempt)

    return False


async def insert_run(run_data: dict) -> None:
    await supabase_write_with_retry("runs", run_data, operation="insert")


async def update_run_status(
    run_id: str, status: str, error: Optional[str] = None, flag_count: Optional[int] = None
) -> None:
    update: dict[str, Any] = {"status": status}
    if error:
        update["error_message"] = error
    if flag_count is not None:
        update["flag_count"] = flag_count
    await supabase_write_with_retry(
        "runs", update, match={"id": run_id}, operation="update"
    )


async def write_artifact(run_id: str, artifact_type: str, payload: dict) -> None:
    data = {"run_id": run_id, "type": artifact_type, "payload": payload}
    await supabase_write_with_retry("run_artifacts", data, operation="upsert")


async def get_run_status(run_id: str) -> Optional[dict[str, Any]]:
    client = _get_client()
    if client is None:
        runs = _filesystem_list_runs(limit=500)
        return next((r for r in runs if r.get("id") == run_id), None)
    try:
        resp = (
            client.table("runs")
            .select("id,status,error_message")
            .eq("id", run_id)
            .single()
            .execute()
        )
        return dict(resp.data) if resp.data else None
    except Exception as exc:
        logger.error("get_run_status failed for %s: %s", run_id, exc)
        return None


async def get_run_with_artifacts(run_id: str) -> Optional[dict[str, Any]]:
    client = _get_client()
    if client is None:
        return _filesystem_get_run(run_id)

    try:
        run_resp = (
            client.table("runs").select("*").eq("id", run_id).single().execute()
        )
        if not run_resp.data:
            return None

        artifacts_resp = (
            client.table("run_artifacts")
            .select("type,payload")
            .eq("run_id", run_id)
            .execute()
        )
        run = dict(run_resp.data)
        run["artifacts"] = {
            row["type"]: row["payload"] for row in (artifacts_resp.data or [])
        }
        return run
    except Exception as exc:
        logger.error("get_run_with_artifacts failed for %s: %s", run_id, exc)
        return _filesystem_get_run(run_id)


async def list_runs(limit: int = 50) -> list[dict[str, Any]]:
    client = _get_client()
    if client is None:
        return _filesystem_list_runs(limit)

    try:
        resp = (
            client.table("runs")
            .select("id,status,supplier_input,experience_name,created_at,updated_at,error_message,flag_count")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return resp.data or []
    except Exception as exc:
        logger.error("list_runs failed: %s", exc)
        return _filesystem_list_runs(limit)


async def resolve_field(
    run_id: str, field_path: str, resolved_value: Any
) -> bool:
    # Validates run exists; full field resolution wired in Phase 2
    client = _get_client()
    if client is None:
        return True

    try:
        resp = (
            client.table("runs").select("id").eq("id", run_id).single().execute()
        )
        return bool(resp.data)
    except Exception:
        return False


def _filesystem_list_runs(limit: int) -> list[dict[str, Any]]:
    if not LISTINGS_DIR.exists():
        return []
    runs = []
    for run_dir in sorted(LISTINGS_DIR.iterdir(), reverse=True):
        if not run_dir.is_dir():
            continue
        run: dict[str, Any] = {"id": run_dir.name, "status": "unknown"}
        runs_write = run_dir / "runs_write.json"
        if runs_write.exists():
            try:
                data = json.loads(runs_write.read_text())
                run.update(data)
            except Exception:
                pass
        intake = run_dir / "intake.json"
        if intake.exists():
            try:
                intake_data = json.loads(intake.read_text())
                supplier = intake_data.get("_meta", {}).get("supplier", "")
                run["supplier_name"] = supplier
            except Exception:
                pass
        runs.append(run)
        if len(runs) >= limit:
            break
    return runs


def _filesystem_fallback(
    table: str, data: dict, match: Optional[dict]
) -> None:
    run_id = (
        data.get("id")
        or (match or {}).get("id")
        or data.get("run_id", "unknown")
    )
    run_dir = LISTINGS_DIR / str(run_id)
    run_dir.mkdir(parents=True, exist_ok=True)
    path = run_dir / f"{table}_write.json"
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False))


def _filesystem_get_run(run_id: str) -> Optional[dict[str, Any]]:
    run_dir = LISTINGS_DIR / run_id
    if not run_dir.exists():
        return None

    result: dict[str, Any] = {"run_id": run_id, "status": "unknown", "artifacts": {}}
    for artifact_file in sorted(run_dir.glob("*.json")):
        name = artifact_file.stem
        try:
            result["artifacts"][name] = json.loads(artifact_file.read_text())
        except Exception:
            pass

    return result if result["artifacts"] else None
