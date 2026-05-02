from typing import Optional
from pydantic import BaseModel, Field


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


class FAQ(BaseModel):
    question: str
    answer: str


class SEO(BaseModel):
    title: str
    meta_description: str
    tags: list[str]


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


class Variant(BaseModel):
    name: str
    name_ab_variant: str
    tagline: str
    description: str
    key_differentiators: list[str]
    upsell_hook: Optional[str] = None


class ABTestPlan(BaseModel):
    priority_test: str
    hypothesis: str
    metric_to_watch: str


class CopyQualityScore(BaseModel):
    title: str
    description: str
    highlights: str
    faqs: str
    seo: str


class PublishVerdict(BaseModel):
    ready: bool
    confidence: str
    blockers: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    copy_quality_score: CopyQualityScore


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
