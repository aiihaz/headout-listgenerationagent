import json
from pathlib import Path

from google import genai
from google.genai import types

from models.intake import IntakeResult
from models.listing import ContentGeneratorError, ListingOutput

_PROMPT_PATH = Path(__file__).parent.parent / "agent_prompt_content_generator.md"
_SYSTEM_PROMPT = _PROMPT_PATH.read_text()

MODEL = "gemini-2.5-flash"
TEMPERATURE = 0.7
TEMPERATURE_REGEN = 0.3


def run(intake: IntakeResult, client: genai.Client) -> ListingOutput:
    user_content = json.dumps(
        intake.model_dump(by_alias=True), indent=2, ensure_ascii=False
    )
    raw = _call_with_retry(user_content, client, TEMPERATURE)
    _check_hard_stop(raw)
    return ListingOutput.model_validate(raw)


def run_targeted_regen(
    intake: IntakeResult,
    previous_listing: ListingOutput,
    regeneration_scope: list[str],
    fix_instructions: list[dict],
    client: genai.Client,
) -> ListingOutput:
    regen_prompt = _build_regen_prompt(intake, previous_listing, regeneration_scope, fix_instructions)
    raw = _call_with_retry(regen_prompt, client, TEMPERATURE_REGEN)
    _check_hard_stop(raw)
    merged = _merge_regen(previous_listing, raw, regeneration_scope)
    return merged


def _build_regen_prompt(
    intake: IntakeResult,
    previous: ListingOutput,
    scope: list[str],
    blockers: list[dict],
) -> str:
    fix_lines = "\n".join(
        f"Field: {b['field']}\nProblem: {b['found']}\nInstruction: {b['fix_instruction']}"
        for b in blockers
    )
    return f"""You are the Headout Content Generation Agent operating in TARGETED REGENERATION MODE.

Rewrite ONLY the fields listed below. Do not change anything else.

## Intake Data (unchanged)
{json.dumps(intake.model_dump(by_alias=True), indent=2)}

## Previous Full Output (do not modify fields not listed below)
{json.dumps(previous.model_dump(), indent=2)}

## Fields to Regenerate
{json.dumps(scope, indent=2)}

## Fix Instructions
{fix_lines}

Return a JSON object containing ONLY the regenerated fields at their original paths."""


def _merge_regen(previous: ListingOutput, regen_raw: dict, scope: list[str]) -> ListingOutput:
    base = previous.model_dump()
    for field_path in scope:
        parts = field_path.split(".")
        regen_val = regen_raw
        base_target = base
        try:
            for part in parts[:-1]:
                if part.isdigit():
                    regen_val = regen_val[int(part)]
                    base_target = base_target[int(part)]
                else:
                    regen_val = regen_val[part]
                    base_target = base_target[part]
            last = parts[-1]
            if last.isdigit():
                base_target[int(last)] = regen_val[int(last)]
            else:
                base_target[last] = regen_val[last]
        except (KeyError, IndexError, TypeError):
            pass
    return ListingOutput.model_validate(base)


def _check_hard_stop(raw: dict) -> None:
    if raw.get("error") is True:
        raise RuntimeError(
            f"Content Generator hard stop: {raw.get('reason')} — missing: {raw.get('missing')}"
        )


def _call_with_retry(user_content: str, client: genai.Client, temperature: float) -> dict:
    for attempt in range(2):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=user_content,
                config=types.GenerateContentConfig(
                    system_instruction=_SYSTEM_PROMPT,
                    temperature=temperature,
                    response_mime_type="application/json",
                ),
            )
            return json.loads(response.text)
        except (json.JSONDecodeError, Exception) as exc:
            if attempt == 1:
                raise RuntimeError(f"Content Generator failed after 2 attempts: {exc}") from exc
            user_content = (
                user_content
                + "\n\nIMPORTANT: Return valid JSON only. No markdown fences."
            )
    return {}
