import json
import os
from pathlib import Path

from google import genai
from google.genai import types

from models.intake import IntakeResult

_PROMPT_PATH = Path(__file__).parent.parent / "agent_prompt_supplier_intake.md"
_SYSTEM_PROMPT = _PROMPT_PATH.read_text()

MODEL = "gemini-2.5-flash"


def run(supplier_text: str, client: genai.Client) -> IntakeResult:
    raw = _call_with_retry(supplier_text, client, temperature=0)
    return IntakeResult.model_validate(raw)


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
                raise RuntimeError(f"Intake Agent failed after 2 attempts: {exc}") from exc
            user_content = (
                user_content
                + "\n\nIMPORTANT: Return valid JSON only. No markdown fences. No comments."
            )
    return {}
