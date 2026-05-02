import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.dependencies import get_current_user
from backend.services import supabase_service

router = APIRouter(tags=["runs"])


class CreateRunRequest(BaseModel):
    supplier_input: str


class CreateRunResponse(BaseModel):
    run_id: str
    status: str


class PatchFieldsRequest(BaseModel):
    field_path: str
    resolved_value: Any


@router.post("/runs", response_model=CreateRunResponse, status_code=201)
async def create_run(
    body: CreateRunRequest,
    user: dict = Depends(get_current_user),
) -> CreateRunResponse:
    run_id = str(uuid.uuid4())
    await supabase_service.insert_run(
        {
            "id": run_id,
            "supplier_input": body.supplier_input,
            "status": "pending",
            "created_by": user["id"],
        }
    )
    return CreateRunResponse(run_id=run_id, status="pending")


@router.get("/runs/{run_id}")
async def get_run(
    run_id: str,
    user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    run = await supabase_service.get_run_with_artifacts(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.patch("/runs/{run_id}/fields")
async def patch_fields(
    run_id: str,
    body: PatchFieldsRequest,
    user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    found = await supabase_service.resolve_field(
        run_id, body.field_path, body.resolved_value
    )
    if not found:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"success": True, "run_id": run_id, "field_path": body.field_path}
