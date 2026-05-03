from typing import Optional
from pydantic import BaseModel, Field


class ReviewScores(BaseModel):
    factual_accuracy: int
    voice_compliance: int
    seo_completeness: int


class ReviewBlocker(BaseModel):
    id: str
    field: str
    type: str
    action_required: Optional[str] = "regenerate"  # "regenerate" | "associate_action"
    found: str
    intake_says: str
    severity: str = "blocker"
    fix_instruction: str


class ReviewWarning(BaseModel):
    id: str
    field: str
    issue: str
    suggestion: str


class ReviewDetail(BaseModel):
    overall: str
    scores: ReviewScores
    blockers: list[ReviewBlocker] = Field(default_factory=list)
    warnings: list[ReviewWarning] = Field(default_factory=list)
    escalate_to_human: bool = False
    escalation_reason: Optional[str] = None
    regeneration_scope: list[str] = Field(default_factory=list)


class ReviewOutput(BaseModel):
    review: ReviewDetail
