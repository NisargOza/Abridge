import json
import os
import re
from collections import Counter
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


async def generate[T: BaseModel](
    prompt_name: str, payload: str, schema: type[T], *, max_tokens: int = 3500
) -> T:
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
                    "max_tokens": max_tokens,
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
        NUMBER_PATTERN + r"|[<>≤≥]|\b\w+n['’]t\b|"
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
    receipt_deadline = (
        r"\b(?:receiv(?:e[ds]?|ing)|arriv(?:e[ds]?|ing))\b"
        r"[^.!?]{0,120}\b(?:by|before|until)\b"
    )
    if re.search(receipt_deadline, original, re.IGNORECASE) and not re.search(
        receipt_deadline, rewrite.plain_language, re.IGNORECASE
    ):
        raise LocalAIError("The rewrite changed a receipt deadline. Keep using the original.")
    if re.search(r"https?://|www\.", rewrite.plain_language + json.dumps(rewrite.action_items)):
        raise LocalAIError("The rewrite included a link. Keep using the original.")


def copies_formal_wording(original: str, rewritten: str) -> bool:
    if " ".join(original.split()).casefold() != " ".join(rewritten.split()).casefold():
        return False
    return bool(
        re.search(
            r"\b(?:documentation|constitute|pursuant|hereby|substantiating)\b|associated with",
            original,
            re.IGNORECASE,
        )
    )


async def rewrite_document(original: str) -> Rewrite:
    rewrite = await generate("document", original, Rewrite)
    problem: str | None = None
    try:
        validate_rewrite(original, rewrite)
    except LocalAIError as error:
        problem = str(error)
    if problem is None and copies_formal_wording(original, rewrite.plain_language):
        problem = "Formal wording was copied unchanged. Rewrite it using common words."
    if problem is not None:
        original_counts = Counter(anchors(original))
        rewritten_counts = Counter(anchors(rewrite.plain_language))
        differences = [
            {
                "token": token,
                "original_count": original_counts[token],
                "rewrite_count": rewritten_counts[token],
            }
            for token in sorted(original_counts.keys() | rewritten_counts.keys())
            if original_counts[token] != rewritten_counts[token]
        ]
        payload = json.dumps(
            {
                "original_document": original,
                "previous_rewrite": rewrite.model_dump(),
                "validation_problem": problem,
                "protected_token_differences": differences,
            }
        )
        rewrite = await generate("document_repair", payload, Rewrite)
        validate_rewrite(original, rewrite)
        if copies_formal_wording(original, rewrite.plain_language):
            raise LocalAIError("The AI did not simplify this wording. Keep using the original.")
    return rewrite
