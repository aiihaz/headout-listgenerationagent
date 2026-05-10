import json
from pathlib import Path
from typing import List, Optional

from openai import OpenAI

from agents.llm_client import call_json, get_model
from models.intake import IntakeResult
from models.listing import ListingOutput
from models.review import ReviewOutput
from models.serper import SerperContext

_PROMPT_PATH = Path(__file__).parent.parent / "agent_prompt_review.md"
_SYSTEM_PROMPT = _PROMPT_PATH.read_text()

def run(
    intake: IntakeResult,
    merged_listing: ListingOutput,
    client: OpenAI,
    is_regen_pass: bool = False,
    serper_context: Optional[SerperContext] = None,
    scope: Optional[List[str]] = None,
) -> ReviewOutput:
    user_content = _build_prompt(intake, merged_listing, is_regen_pass, serper_context, scope)
    raw = _call_with_retry(user_content, client)
    result = ReviewOutput.model_validate(raw)
    if is_regen_pass:
        result.review.escalate_to_human = True
        if not result.review.escalation_reason:
            result.review.escalation_reason = (
                "Second review pass: regeneration was attempted once and quality issues persist. "
                "Human review required before publish."
            )
    return result


def _extract_scoped(listing_dict: dict, scope: List[str]) -> dict:
    """Return a new dict containing only the subtrees at the given dot-notation paths."""
    result: dict = {}
    for path in scope:
        parts = path.split('.')
        src = listing_dict
        dst = result
        for i, part in enumerate(parts):
            if not isinstance(src, dict) or part not in src:
                break
            if i == len(parts) - 1:
                dst[part] = src[part]
            else:
                if part not in dst:
                    dst[part] = {}
                dst = dst[part]
                src = src[part]
    return result


def _build_prompt(
    intake: IntakeResult,
    listing: ListingOutput,
    is_regen: bool,
    serper_context: Optional[SerperContext] = None,
    scope: Optional[List[str]] = None,
) -> str:
    listing_dict = listing.model_dump()
    if is_regen:
        listing_dict["review_pass_number"] = 2

    scope_note = ""
    if scope:
        listing_dict = _extract_scoped(listing_dict, scope)
        scope_note = (
            f"\n\n---\n\n## Scoped Re-Review\n"
            f"This is a targeted re-review after associate-triggered regeneration. "
            f"ONLY evaluate the following fields: {scope}. "
            f"Do NOT raise blockers or warnings for any field not in this list. "
            f"Only the shown sections were regenerated; all other fields are unchanged and pre-approved."
        )

    serper_section = ""
    if serper_context and not serper_context.skipped and serper_context.organic:
        primary_keyword = serper_context.organic[0].title
        serper_section = f"\n\n---\n\n## SEO Context (for Layer 3 check 9)\nPrimary keyword signal from top organic result: \"{primary_keyword}\""
    elif serper_context and serper_context.skipped:
        serper_section = "\n\n---\n\n## SEO Context\nSerper research was skipped — omit Layer 3 check 9."

    return f"""## Intake Agent Output (ground truth)
{json.dumps(intake.model_dump(by_alias=True), indent=2)}

---

## Content Generator Output
{json.dumps(listing_dict, indent=2)}{serper_section}{scope_note}"""


def _call_with_retry(user_content: str, client: OpenAI) -> dict:
    for attempt in range(2):
        try:
            return call_json(
                client=client,
                model=get_model("REVIEW"),
                system_prompt=_SYSTEM_PROMPT,
                user_content=user_content,
                temperature=0,
            )
        except (json.JSONDecodeError, Exception) as exc:
            if attempt == 1:
                raise RuntimeError(f"Review Agent failed after 2 attempts: {exc}") from exc
            user_content = user_content + "\n\nIMPORTANT: Return valid JSON only."
    return {}
