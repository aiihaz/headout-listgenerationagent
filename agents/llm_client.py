import json
import os
from typing import Any, Optional

from openai import OpenAI


DEFAULT_MODEL = "gpt-4o-mini"


def get_model(agent_name: str) -> str:
    return (
        os.getenv(f"OPENAI_{agent_name}_MODEL")
        or os.getenv("OPENAI_MODEL")
        or DEFAULT_MODEL
    )


def call_json(
    *,
    client: OpenAI,
    model: str,
    system_prompt: str,
    user_content: str,
    temperature: Optional[float] = None,
) -> dict[str, Any]:
    kwargs: dict[str, Any] = {
        "model": model,
        "input": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        "text": {"format": {"type": "json_object"}},
        "store": False,
    }

    if model.startswith("gpt-5"):
        kwargs["reasoning"] = {"effort": "low"}
    elif temperature is not None:
        kwargs["temperature"] = temperature

    response = client.responses.create(**kwargs)
    return json.loads(response.output_text)
