import json
from collections.abc import Mapping
from pathlib import Path

import httpx
import pytest
import respx
from fastapi.testclient import TestClient

from abridge.api.main import app
from abridge.llm.client import LocalAIError, base_url, validate_rewrite
from abridge.memory.store import Memory, Record
from abridge.models import Rewrite

client = TestClient(app, base_url="http://127.0.0.1")


def response(value: Mapping[str, object]) -> dict[str, object]:
    return {"choices": [{"message": {"content": json.dumps(value)}}]}


def test_real_api_screen_budget_and_input_privacy() -> None:
    result = client.post(
        "/api/screen", json={"state": "NY", "household_size": 3, "monthly_gross_income": 2400}
    )
    assert result.status_code == 200
    assert all(p["status"] == "needs_more_information" for p in result.json()["programs"])
    assert result.headers["cache-control"] == "no-store"
    assert (
        client.post(
            "/api/budget", json={"monthly_take_home": 1000, "monthly_gross_income": 1200}
        ).json()["remaining"]
        == 1000
    )
    invalid = client.post(
        "/api/screen",
        json={"state": "NY", "household_size": 3, "monthly_gross_income": "private_invalid_input"},
    )
    assert invalid.status_code == 422 and "private_invalid_input" not in invalid.text


def test_origin_host_mime_and_payload_limits() -> None:
    assert client.get("/api/health", headers={"origin": "https://evil.example"}).status_code == 403
    assert client.get("/api/health", headers={"host": "evil.example"}).status_code == 403
    assert (
        client.post(
            "/api/screen", content="income=20", headers={"content-type": "text/plain"}
        ).status_code
        == 415
    )
    assert (
        client.post(
            "/api/document", content=b"x" * 100001, headers={"content-type": "application/json"}
        ).status_code
        == 413
    )
    assert (
        client.post("/api/screen", json={}, headers={"sec-fetch-site": "cross-site"}).status_code
        == 403
    )
    cors = client.options(
        "/api/screen",
        headers={"origin": "http://127.0.0.1:5173", "access-control-request-method": "POST"},
    )
    assert cors.headers["access-control-allow-origin"] == "http://127.0.0.1:5173"


def test_only_loopback_llm_config(monkeypatch: pytest.MonkeyPatch) -> None:
    for url in [
        "https://127.0.0.1:8080",
        "http://localhost:8080",
        "http://127.0.0.1.evil.example:8080",
        "https://cloud.example",
        "http://user:pass@127.0.0.1:8080",
    ]:
        monkeypatch.setenv("LLM_BASE_URL", url)
        with pytest.raises(LocalAIError):
            base_url()


def test_llm_schema_prompt_and_document_preservation() -> None:
    text = "You must pay $500 before October 31, 2026. If you do not reply, the case may close."
    rewrite = {
        "title": "Your notice",
        "plain_language": text,
        "action_items": ["Pay $500 before October 31, 2026."],
    }
    with respx.mock() as mock:
        route = mock.post("http://127.0.0.1:8080/v1/chat/completions").respond(
            200, json=response(rewrite)
        )
        result = client.post("/api/document", json={"text": text})
        assert result.json()["mode"] == "local_ai"
        body = json.loads(route.calls[0].request.content)
        assert body["response_format"]["type"] == "json_schema"
        assert "untrusted" in body["messages"][0]["content"]
        assert body["messages"][1]["content"] == text
        assert "api_key" not in body


@pytest.mark.parametrize(
    "changed",
    [
        "You must pay $600 before October 31, 2026. If you do not reply, the case may close.",
        "You must pay $500 before October 31, 2026. If you do reply, the case may close.",
    ],
)
def test_changed_facts_fail_closed(changed: str) -> None:
    original = "You must pay $500 before October 31, 2026. If you do not reply, the case may close."
    with pytest.raises(LocalAIError):
        validate_rewrite(original, Rewrite(title="Notice", plain_language=changed, action_items=[]))


def test_llm_offline_and_malformed_fallback() -> None:
    with respx.mock() as mock:
        route = mock.post("http://127.0.0.1:8080/v1/chat/completions")
        route.side_effect = httpx.ConnectError("offline")
        r = client.post("/api/document", json={"text": "A letter with important information."})
        assert r.status_code == 200 and r.json()["rewrite"] is None
        route.side_effect = None
        route.respond(
            200,
            json=response(
                {
                    "title": "Wrong",
                    "plain_language": "Hello",
                    "action_items": [],
                    "eligibility": "approved",
                }
            ),
        )
        assert (
            client.post(
                "/api/document", json={"text": "A letter with important information."}
            ).json()["mode"]
            == "original_only"
        )


def test_explanations_map_only_real_source_ids(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    memory = Memory(tmp_path / "memory.db")
    memory.ingest(
        Record(
            source_url="https://www.lifelinesupport.org/how-to-qualify/",
            source_title="USAC",
            text="Lifeline can help with phone costs.",
            jurisdiction="US",
        )
    )
    hit = memory.search("Lifeline")[0]
    monkeypatch.setattr("abridge.api.main.Memory", lambda: memory)
    household = {
        "state": "NY",
        "household_size": 1,
        "monthly_gross_income": 1000,
        "household_confirmed": True,
        "lifeline_already_received": False,
    }
    with respx.mock() as mock:
        route = mock.post("http://127.0.0.1:8080/v1/chat/completions").respond(
            200,
            json=response(
                {
                    "items": [
                        {
                            "source_id": hit.id,
                            "excerpt": "Lifeline can help with phone costs.",
                            "explanation": "Lifeline offers phone support.",
                        }
                    ]
                }
            ),
        )
        result = client.post("/api/explain", json={"household": household})
        assert result.status_code == 200
        assert result.json()["items"][0]["source_url"] == hit.source_url
        body = json.loads(route.calls[0].request.content)
        assert "1000" not in body["messages"][1]["content"]
        route.respond(
            200,
            json=response(
                {
                    "items": [
                        {"source_id": "invented", "excerpt": "Lifeline", "explanation": "Approved."}
                    ]
                }
            ),
        )
        assert client.post("/api/explain", json={"household": household}).status_code == 503


@pytest.mark.llm
@pytest.mark.asyncio
async def test_real_llm_smoke() -> None:
    from abridge.llm.client import generate

    original = "Your appointment is on October 31, 2026. Bring this letter and a photo ID."
    output = await generate("document", original, Rewrite)
    validate_rewrite(original, output)


@pytest.mark.parametrize("change", ["November", "$600", "will"])
def test_month_money_and_certainty_are_preserved(change: str) -> None:
    original = "Payment may arrive on October 31, 2026. Your amount is $500."
    changed = (
        original.replace("October", change)
        if change == "November"
        else original.replace("$500", change)
        if change.startswith("$")
        else original.replace("may", change)
    )
    with pytest.raises(LocalAIError):
        validate_rewrite(original, Rewrite(title="Notice", plain_language=changed, action_items=[]))


def test_source_chunks_are_deduplicated_and_numeric_substrings_rejected(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    memory = Memory(tmp_path / "memory.db")
    text = "Lifeline support follows the 135% income guideline. " * 90
    memory.ingest(
        Record(
            source_url="https://www.lifelinesupport.org/how-to-qualify/",
            source_title="USAC",
            text=text,
            jurisdiction="US",
        )
    )
    hit = memory.search("Lifeline")[0]
    monkeypatch.setattr("abridge.api.main.Memory", lambda: memory)
    household = {
        "state": "NY",
        "household_size": 1,
        "monthly_gross_income": 1000,
        "household_confirmed": True,
        "lifeline_already_received": False,
    }
    with respx.mock() as mock:
        route = mock.post("http://127.0.0.1:8080/v1/chat/completions").respond(
            200,
            json=response(
                {
                    "items": [
                        {
                            "source_id": hit.id,
                            "excerpt": "Lifeline support follows the 135% income guideline.",
                            "explanation": "Lifeline may help with phone costs.",
                        }
                    ]
                }
            ),
        )
        assert client.post("/api/explain", json={"household": household}).status_code == 200
        payload = json.loads(json.loads(route.calls[0].request.content)["messages"][1]["content"])
        assert len(payload) == 1
        route.respond(
            200,
            json=response(
                {
                    "items": [
                        {
                            "source_id": hit.id,
                            "excerpt": "Lifeline support follows the 135% income guideline.",
                            "explanation": "Get 3 dollars.",
                        }
                    ]
                }
            ),
        )
        assert client.post("/api/explain", json={"household": household}).status_code == 503
