from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


class SourceType(str, Enum):
    EXPLICIT = "EXPLICIT"
    INFERRED = "INFERRED"
    DEFAULT = "DEFAULT"
    AGENT_GENERATED = "AGENT-GENERATED"


class AmbiguityType(str, Enum):
    ABSENT = "ABSENT"
    DEFERRED = "DEFERRED"
    CONDITIONAL = "CONDITIONAL"
    INFERRED = "INFERRED"


class MetaConfidence(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class IntakeMeta(BaseModel):
    supplier: str
    generated_at: str
    confidence: MetaConfidence
    publish_blocked: bool
    publish_blocked_reasons: list[str] = Field(default_factory=list)


class AmbiguityFlag(BaseModel):
    type: AmbiguityType
    field: str
    supplier_text: Optional[str] = None
    resolution: str
    action_required: str
    blocks_publish: bool


class DesignDecision(BaseModel):
    decision: str
    alternatives: list[str] = Field(default_factory=list)
    reason: str


class IntakeResult(BaseModel):
    meta: IntakeMeta = Field(alias="_meta")
    payload: dict[str, Any]
    sources: dict[str, str] = Field(alias="_sources", default_factory=dict)
    ambiguity_flags: list[AmbiguityFlag] = Field(default_factory=list)
    design_decisions: list[DesignDecision] = Field(default_factory=list)

    model_config = {"populate_by_name": True}
