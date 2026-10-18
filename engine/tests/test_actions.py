import json
from pathlib import Path

import httpx
import pytest
import respx
from fastapi.testclient import TestClient

from abridge.api.main import app
from abridge.llm.actions import evidence_units, explicit_date, extract_actions, prepare_conversation
from abridge.models import ConversationInput

client = TestClient(app, base_url="http://127.0.0.1")
NOTICE = (
    "You must submit proof of income before November 18, 2026. "
    "If the documents are not received by the deadline, your request may be closed. "
    "Your interview is scheduled for November 20, 2026. "
    "Bring a photo ID. "
    "Your outstanding balance is $275.50. "
    "Sending documents does not mean approval."
)
EXTRACTION = {
    "tasks": [
        {"kind": "documents", "evidence_ids": [0, 1], "deadline_evidence_id": 0},
        {"kind": "appointment", "evidence_ids": [2, 3], "deadline_evidence_id": 2},
    ]
}


def response(value: object) -> dict[str, object]:
    return {"choices": [{"message": {"content": json.dumps(value)}}]}


def test_action_api_resolves_only_original_evidence_dates_and_local_boundary() -> None:
    with respx.mock() as mock:
        route = mock.post("http://127.0.0.1:8080/v1/chat/completions").respond(
            200, json=response(EXTRACTION)
        )
        result = client.post("/api/actions", json={"text": NOTICE})
        output = result.json()
        assert result.status_code == 200 and output["mode"] == "local_ai"
        assert output["tasks"][0]["evidence"] == evidence_units(NOTICE)[:2]
        assert output["tasks"][0]["calendar_date"] == "2026-11-18"
        assert output["tasks"][1]["calendar_date"] == "2026-11-20"
        assert result.headers["cache-control"] == "no-store"
        body = json.loads(route.calls[0].request.content)
        assert "untrusted" in body["messages"][0]["content"]
        assert json.loads(body["messages"][1]["content"])["sentences"][4]["text"] == (
            "Your outstanding balance is $275.50."
        )
        assert body["max_tokens"] == 1400


@pytest.mark.parametrize(
    "task",
    [
        {"kind": "documents", "evidence_ids": [-1], "deadline_evidence_id": None},
        {"kind": "documents", "evidence_ids": [99], "deadline_evidence_id": None},
        {"kind": "documents", "evidence_ids": [0], "deadline_evidence_id": 2},
        {"kind": "payment", "evidence_ids": [4], "deadline_evidence_id": None},
        {"kind": "contact", "evidence_ids": [5], "deadline_evidence_id": None},
    ],
)
def test_bad_evidence_or_balance_as_payment_fails_closed(task: dict[str, object]) -> None:
    with respx.mock() as mock:
        mock.post("http://127.0.0.1:8080/v1/chat/completions").respond(
            200, json=response({"tasks": [task]})
        )
        result = client.post("/api/actions", json={"text": NOTICE}).json()
    assert result["mode"] == "unavailable" and result["tasks"] == []


@pytest.mark.parametrize(
    "notice",
    [
        "You must not submit original documents.",
        "You don’t need to submit original documents.",
        "You shouldn’t send original documents.",
        "You do not need to pay the outstanding balance.",
        "There is no need to submit a new form.",
        "A payment is not required at this time.",
    ],
)
def test_negative_instruction_cannot_become_a_task(notice: str) -> None:
    with respx.mock() as mock:
        mock.post("http://127.0.0.1:8080/v1/chat/completions").respond(
            200,
            json=response(
                {
                    "tasks": [
                        {"kind": "documents", "evidence_ids": [0], "deadline_evidence_id": None}
                    ]
                }
            ),
        )
        assert client.post("/api/actions", json={"text": notice}).json()["tasks"] == []


@pytest.mark.parametrize(
    "text,expected",
    [
        ("Send proof before November 18, 2026.", "2026-11-18"),
        ("Your appointment is on 2026-11-20.", "2026-11-20"),
        ("Call by November 18.", None),
        ("Reply within 10 days of receiving this letter.", None),
        ("Call by 11/12/2026.", None),
        ("Come on February 30, 2026.", None),
        ("Between November 18, 2026 and November 20, 2026.", None),
        ("Reply within 10 days after November 18, 2026.", None),
    ],
)
def test_only_unambiguous_explicit_dates_are_calendar_candidates(
    text: str, expected: str | None
) -> None:
    assert explicit_date(text) == expected


def test_unknown_timing_remains_unknown_and_duplicate_tasks_are_removed() -> None:
    notice = "Please provide proof of income within 10 days of receiving this notice."
    task = {"kind": "documents", "evidence_ids": [0], "deadline_evidence_id": 0}
    with respx.mock() as mock:
        mock.post("http://127.0.0.1:8080/v1/chat/completions").respond(
            200, json=response({"tasks": [task, task]})
        )
        output = client.post("/api/actions", json={"text": notice}).json()
    assert len(output["tasks"]) == 1
    assert output["tasks"][0]["deadline_text"] == notice
    assert output["tasks"][0]["calendar_date"] is None


def test_negative_precondition_does_not_hide_a_positive_request() -> None:
    notice = "If you do not have a pay stub, please provide a signed income statement."
    with respx.mock() as mock:
        mock.post("http://127.0.0.1:8080/v1/chat/completions").respond(
            200,
            json=response(
                {
                    "tasks": [
                        {"kind": "documents", "evidence_ids": [0], "deadline_evidence_id": None}
                    ]
                }
            ),
        )
        output = client.post("/api/actions", json={"text": notice}).json()
    assert output["mode"] == "local_ai" and output["tasks"][0]["evidence"] == [notice]


def test_cancelled_appointment_is_not_a_task() -> None:
    with respx.mock() as mock:
        mock.post("http://127.0.0.1:8080/v1/chat/completions").respond(
            200,
            json=response(
                {
                    "tasks": [
                        {"kind": "appointment", "evidence_ids": [0], "deadline_evidence_id": None}
                    ]
                }
            ),
        )
        output = client.post(
            "/api/actions", json={"text": "Your appointment is canceled. No action is required."}
        ).json()
    assert output["mode"] == "unavailable" and output["tasks"] == []


def test_offline_and_no_action_are_distinct_and_never_persist_input(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.chdir(tmp_path)
    with respx.mock() as mock:
        route = mock.post("http://127.0.0.1:8080/v1/chat/completions")
        route.side_effect = httpx.ConnectError("offline")
        output = client.post("/api/actions", json={"text": NOTICE}).json()
        assert output["mode"] == "unavailable" and output["tasks"] == []
        route.side_effect = None
        route.respond(200, json=response({"tasks": []}))
        output = client.post(
            "/api/actions", json={"text": "Your request is still being reviewed."}
        ).json()
        assert output["mode"] == "local_ai" and output["tasks"] == []
    assert list(tmp_path.iterdir()) == []


def test_questions_use_only_selected_evidence_and_user_barriers() -> None:
    questions = [
        "What other proof of income could I provide if I have no pay stub?",
        "How can I submit documents outside office hours?",
        "How can I confirm my documents arrive before the deadline?",
    ]
    with respx.mock() as mock:
        route = mock.post("http://127.0.0.1:8080/v1/chat/completions").respond(
            200, json=response({"questions": questions})
        )
        output = client.post(
            "/api/conversation",
            json={
                "source_text": evidence_units(NOTICE)[0],
                "situation": "I work during office hours and have no pay stub.",
                "audience": "sender",
            },
        )
        assert output.status_code == 200 and output.json()["draft"]["questions"] == questions
        payload = json.loads(route.calls[0].request.content)
        assert "$275" not in payload["messages"][1]["content"]
        assert "untrusted" in payload["messages"][0]["content"]


@pytest.mark.parametrize(
    "bad",
    [
        "You are approved for support.",
        "Can I receive $500 tomorrow?",
        "Could I use https://fake.example to submit?",
        "Can I send documents in December?",
        "Since I qualify, what happens next?",
        "Can I contact caseworker@example.com?",
    ],
)
def test_questions_with_inventions_or_instructions_are_rejected(bad: str) -> None:
    with respx.mock() as mock:
        mock.post("http://127.0.0.1:8080/v1/chat/completions").respond(
            200, json=response({"questions": [bad, "How can I get help?"]})
        )
        output = client.post("/api/conversation", json={"source_text": NOTICE})
        assert output.status_code == 503


def test_sensitive_invalid_input_is_not_echoed() -> None:
    output = client.post(
        "/api/conversation", json={"source_text": "secret", "audience": "private_value"}
    )
    assert (
        output.status_code == 422
        and "private_value" not in output.text
        and "secret" not in output.text
    )


@pytest.mark.llm
@pytest.mark.asyncio
async def test_real_model_action_and_barrier_questions() -> None:
    output = await extract_actions(NOTICE)
    assert {task.kind for task in output} >= {"documents", "appointment"}
    assert all(quote in NOTICE for task in output for quote in task.evidence)
    assert not any(task.kind == "payment" for task in output)
    draft = await prepare_conversation(
        ConversationInput(
            source_text="\n".join(output[0].evidence),
            situation="I work until 6 and do not have a recent pay stub.",
        )
    )
    assert len(draft.questions) >= 2
    assert any(
        relevant in " ".join(draft.questions).lower()
        for relevant in ["hours", "stub", "proof", "work"]
    )
