import json
import os
import re
from pathlib import Path
from typing import TypeVar
from urllib.parse import urlsplit

import httpx
from pydantic import BaseModel, ValidationError

from abridge.models import Rewrite

T = TypeVar("T", bound=BaseModel)
PROMPTS = Path(__file__).with_name("prompts")


class LocalAIError(Exception):
    pass


def base_url() -> str:
    value = os.environ.get("LLM_BASE_URL", "http://127.0.0.1:8080")
    url = urlsplit(value)
    if (
        url.scheme != "http"
        or url.hostname != "127.0.0.1"
        or url.username
        or url.password
        or url.query
        or url.fragment
    ):
        raise LocalAIError("The AI endpoint must be plain HTTP on 127.0.0.1.")
    return value.rstrip("/")


async def available() -> bool:
    try:
        async with httpx.AsyncClient(timeout=2, trust_env=False) as client:
            r = await client.get(base_url() + "/health")
            return r.status_code == 200
    except (httpx.HTTPError, LocalAIError):
        return False


async def generate[T: BaseModel](prompt_name: str, payload: str, schema: type[T]) -> T:
    prompt = (PROMPTS / f"{prompt_name}.txt").read_text()
    try:
        async with httpx.AsyncClient(timeout=120, trust_env=False) as client:
            response = await client.post(
                base_url() + "/v1/chat/completions",
                json={
                    "messages": [
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": payload},
                    ],
                    "temperature": 0,
                    "max_tokens": 3500,
                    "response_format": {
                        "type": "json_schema",
                        "json_schema": {
                            "name": schema.__name__,
                            "strict": True,
                            "schema": schema.model_json_schema(),
                        },
                    },
                    "chat_template_kwargs": {"enable_thinking": False},
                },
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            return schema.model_validate_json(content)
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError, ValidationError) as exc:
        raise LocalAIError("Local AI is unavailable or returned an invalid response.") from exc


NUMBER_PATTERN = r"[$€£]?[+-]?\d+(?:[,.]\d+)*(?:[/-]\d+)*(?:%|:\d{2})?"


def numeric_tokens(text: str) -> list[str]:
    return re.findall(NUMBER_PATTERN, text)


def anchors(text: str) -> list[str]:
    return re.findall(
        NUMBER_PATTERN + r"|[<>≤≥]|"
        r"\b(?:if|unless|only|must|before|after|until|not|no|never|cannot|"
        r"without|except|may|might|can|could|will|should|shall|required|percent|"
        r"january|february|march|april|june|july|august|"
        r"september|october|november|december)\b",
        text.lower(),
    )


def validate_rewrite(original: str, rewrite: Rewrite) -> None:
    # Fail closed on changed/missing amounts, dates, conditions. Never silently accept a
    # bad rewrite.
    original_anchors = anchors(original)
    rewritten_anchors = anchors(rewrite.plain_language)
    if sorted(original_anchors) != sorted(rewritten_anchors):
        raise LocalAIError(
            "The rewrite did not preserve all numbers and conditions. Keep using the original."
        )
    if re.search(r"https?://|www\.", rewrite.plain_language + json.dumps(rewrite.action_items)):
        raise LocalAIError("The rewrite included a link. Keep using the original.")
