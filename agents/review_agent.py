import json
from pathlib import Path

from google import genai
from google.genai import types

from models.intake import IntakeResult
from models.listing import ListingOutput
from models.review import ReviewOutput

_PROMPT_PATH = Path(__file__).parent.parent / "agent_prompt_review.md"
_SYSTEM_PROMPT = _PROMPT_PATH.read_text()

MODEL = "gemini-2.5-flash"


def run(
    intake: IntakeResult,
    merged_listing: ListingOutput,
    client: genai.Client,
    is_regen_pass: bool = False,
) -> ReviewOutput:
    user_content = _build_prompt(intake, merged_listing, is_regen_pass)
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


def _build_prompt(intake: IntakeResult, listing: ListingOutput, is_regen: bool) -> str:
    regen_note = "\n\n**NOTE: This is the second review pass. A targeted regeneration was already attempted.**\n" if is_regen else ""
    return f"""## Intake Agent Output (ground truth)
{json.dumps(intake.model_dump(by_alias=True), indent=2)}

---

## Content Generator Output
{json.dumps(listing.model_dump(), indent=2)}{regen_note}"""


def _call_with_retry(user_content: str, client: genai.Client) -> dict:
    for attempt in range(2):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=user_content,
                config=types.GenerateContentConfig(
                    system_instruction=_SYSTEM_PROMPT,
                    temperature=0,
                    response_mime_type="application/json",
                ),
            )
            return json.loads(response.text)
        except (json.JSONDecodeError, Exception) as exc:
            if attempt == 1:
                raise RuntimeError(f"Review Agent failed after 2 attempts: {exc}") from exc
            user_content = user_content + "\n\nIMPORTANT: Return valid JSON only."
    return {}
