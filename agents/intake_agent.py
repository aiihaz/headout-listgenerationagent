import json
from pathlib import Path

from openai import OpenAI

from agents.llm_client import call_json, get_model
from models.intake import IntakeResult

_PROMPT_PATH = Path(__file__).parent.parent / "agent_prompt_supplier_intake.md"
_SYSTEM_PROMPT = _PROMPT_PATH.read_text()

def run(supplier_text: str, client: OpenAI) -> IntakeResult:
    raw = _call_with_retry(supplier_text, client, temperature=0)
    return IntakeResult.model_validate(raw)


def _call_with_retry(user_content: str, client: OpenAI, temperature: float) -> dict:
    for attempt in range(2):
        try:
            return call_json(
                client=client,
                model=get_model("INTAKE"),
                system_prompt=_SYSTEM_PROMPT,
                user_content=user_content,
                temperature=temperature,
            )
        except (json.JSONDecodeError, Exception) as exc:
            if attempt == 1:
                raise RuntimeError(f"Intake Agent failed after 2 attempts: {exc}") from exc
            user_content = (
                user_content
                + "\n\nIMPORTANT: Return valid JSON only. No markdown fences. No comments."
                + " Your response must be under 8000 characters. If the experience is a COMBO_TICKET,"
                + " keep variants flat and limit to the most purchasable combinations only."
                + " Omit design_decisions[] and _sources{} entirely if needed to stay within the limit."
            )
    return {}
