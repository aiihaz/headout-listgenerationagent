from typing import Any, Optional
from pydantic import BaseModel, Field, field_validator


def _coerce_str_to_list(v: Any) -> Any:
    """LLMs occasionally return a bare string instead of a one-item list."""
    if isinstance(v, str):
        return [v]
    return v


class TitleField(BaseModel):
    primary: str
    ab_variant: str


class ShortDescription(BaseModel):
    primary: str
    ab_variant: str


class DescriptionSection(BaseModel):
    header: str
    body: str


class FullDescription(BaseModel):
    section_1: DescriptionSection
    section_2: DescriptionSection
    section_3: DescriptionSection
    section_4: DescriptionSection


class Description(BaseModel):
    short: ShortDescription
    full: FullDescription


class KnowBeforeYouGo(BaseModel):
    what_to_bring: list[str] = Field(default_factory=list)
    whats_not_allowed: list[str] = Field(default_factory=list)
    accessibility: str = ""
    additional: list[str] = Field(default_factory=list)

    @field_validator("what_to_bring", "whats_not_allowed", "additional", mode="before")
    @classmethod
    def coerce_to_list(cls, v: Any) -> Any:
        return _coerce_str_to_list(v)


class FAQ(BaseModel):
    question: str
    answer: str
    paa_source: Optional[str] = None


class SEO(BaseModel):
    title: str
    meta_description: str
    tags: list[str]

    @field_validator("tags", mode="before")
    @classmethod
    def coerce_to_list(cls, v: Any) -> Any:
        return _coerce_str_to_list(v)


class Listing(BaseModel):
    title: TitleField
    tagline: str
    description: Description
    highlights: list[str]
    inclusions: list[str]
    exclusions: list[str]
    important_information: list[str] = Field(default_factory=list)
    know_before_you_go: KnowBeforeYouGo = Field(default_factory=KnowBeforeYouGo)
    faqs: list[FAQ]
    seo: SEO

    @field_validator("highlights", "inclusions", "exclusions", "important_information", mode="before")
    @classmethod
    def coerce_to_list(cls, v: Any) -> Any:
        return _coerce_str_to_list(v)


class Variant(BaseModel):
    name: str
    name_ab_variant: str
    tagline: str
    description: str
    key_differentiators: list[str]
    upsell_hook: Optional[str] = None

    @field_validator("key_differentiators", mode="before")
    @classmethod
    def coerce_to_list(cls, v: Any) -> Any:
        return _coerce_str_to_list(v)


class ABTestPlan(BaseModel):
    priority_test: str
    hypothesis: str
    metric_to_watch: str


class CopyQualityScore(BaseModel):
    title: str = ""
    description: str = ""
    highlights: str = ""
    faqs: str = ""
    seo: str = ""


class PublishVerdict(BaseModel):
    ready: bool
    confidence: str
    blockers: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    copy_quality_score: CopyQualityScore = Field(default_factory=CopyQualityScore)

    @field_validator("blockers", "warnings", mode="before")
    @classmethod
    def coerce_to_list(cls, v: Any) -> Any:
        return _coerce_str_to_list(v)


class VariantCanonical(BaseModel):
    variant_name: str
    canonical: str


class CanonicalStrategy(BaseModel):
    variant_canonicals: list[VariantCanonical] = Field(default_factory=list)


class StructuredDataBlock(BaseModel):
    json_ld: Optional[dict] = None
    canonical_strategy: CanonicalStrategy = Field(default_factory=CanonicalStrategy)


class ListingOutput(BaseModel):
    listing: Listing
    variants: list[Variant]
    ab_test_plan: ABTestPlan
    publish_verdict: PublishVerdict
    structured_data: StructuredDataBlock = Field(default_factory=StructuredDataBlock)


class ContentGeneratorError(BaseModel):
    error: bool = True
    reason: str
    missing: list[str] = Field(default_factory=list)
