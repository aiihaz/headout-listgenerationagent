import uuid
from typing import Any, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from backend.dependencies import get_current_user
from backend.services import pipeline_service, supabase_service

router = APIRouter(tags=["runs"])


class CreateRunRequest(BaseModel):
    supplier_input: str


class CreateRunResponse(BaseModel):
    run_id: str
    status: str


class PatchFieldsRequest(BaseModel):
    field_path: str
    resolved_value: Any


class RegenerateRequest(BaseModel):
    section: str
    fix_instruction: str


@router.post("/runs", response_model=CreateRunResponse, status_code=201)
async def create_run(
    body: CreateRunRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
) -> CreateRunResponse:
    run_id = str(uuid.uuid4())
    row: dict[str, Any] = {
        "id": run_id,
        "supplier_input": body.supplier_input,
        "status": "pending",
    }
    if user.get("id"):
        row["created_by"] = user["id"]
    await supabase_service.insert_run(row)
    background_tasks.add_task(pipeline_service.launch_pipeline, run_id, body.supplier_input)
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


@router.post("/runs/{run_id}/regenerate")
async def regenerate_section(
    run_id: str,
    body: RegenerateRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    run = await supabase_service.get_run_with_artifacts(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    background_tasks.add_task(
        pipeline_service.launch_regeneration,
        run_id,
        body.section,
        body.fix_instruction,
    )
    return {"run_id": run_id, "status": "regeneration_in_progress", "section": body.section}


@router.post("/runs/{run_id}/images")
async def upload_image(
    run_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    run = await supabase_service.get_run_with_artifacts(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    content = await file.read()
    url = await pipeline_service.save_image(
        run_id,
        file.filename or "image",
        content,
        file.content_type or "application/octet-stream",
    )
    return {"run_id": run_id, "filename": file.filename, "url": url}
