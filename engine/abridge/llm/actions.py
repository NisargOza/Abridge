"""AI selects evidence; code resolves source text and explicit dates. No private storage."""

import json
import re
from datetime import date

from abridge.llm.client import LocalAIError, generate, numeric_tokens
from abridge.models import (
    ActionExtraction,
    ConversationDraft,
    ConversationInput,
    VerifiedAction,
)

MONTHS = (
    "January February March April May June July August September October November December"
).split()
MONTH_DATE = re.compile(r"\b(" + "|".join(MONTHS) + r")\s+(\d{1,2}),?\s+(\d{4})\b", re.IGNORECASE)
ISO_DATE = re.compile(r"\b\d{4}-\d{2}-\d{2}\b")
NEGATED_REQUEST = re.compile(
    r"\b(?:do not|don['’]t|must not|mustn['’]t|should not|shouldn['’]t|never|"
    r"cannot|can['’]t)\s+(?:(?:need|have)\s+to\s+|(?:ever|also|directly)\s+)?"
    r"(?:submit|provide|bring|send|upload|return|complete|renew|recertify|call|contact|pay|attend)\b|"
    r"\b(?:not required|not necessary|no longer required|no need to|cancelled|canceled)\b",
    re.IGNORECASE,
)
REQUEST = re.compile(
    r"\b(?:must|please|required|need to|needs to|you should|you are asked to)\b|"
    r"^\s*(?:[-•*]\s*)?(?:submit|provide|bring|send|upload|return|complete|renew|"
    r"recertify|call|contact|pay|attend|schedule)\b",
    re.IGNORECASE,
)
KINDS = {
    "documents": r"\b(?:submit|provide|bring|send|upload|return|complete|renew|recertify)\b",
    "appointment": r"\b(?:appointment|interview|attend|scheduled)\b",
    "contact": r"\b(?:call|contact|speak|reply|respond)\b",
    "payment": r"\b(?:pay|payment is due|remit)\b",
}


def evidence_units(original: str) -> list[str]:
    # Keep exact source slices, including conditions. A model can choose IDs, never
    # manufacture quotations. Split on sentence ends, not on wrapped PDF text lines.
    return [part.strip() for part in re.split(r"(?<=[.!?])\s+", original) if part.strip()]


def explicit_date(text: str) -> str | None:
    """Never infer years, relative deadlines, numeric US/UK dates, or multiple dates."""
    dates: list[date] = []
    matches = list(MONTH_DATE.finditer(text))
    for match in matches:
        month = next(i for i, name in enumerate(MONTHS, 1) if name.lower() == match[1].lower())
        try:
            dates.append(date(int(match[3]), month, int(match[2])))
        except ValueError:
            return None
    for match in ISO_DATE.finditer(text):
        try:
            dates.append(date.fromisoformat(match.group()))
        except ValueError:
            return None
    # A sentence with relative timing or a range needs human interpretation even
    # when it also mentions a fully specified date.
    if re.search(r"\b(?:within|business days?|days? after|days? from|between)\b", text, re.I):
        return None
    if len(dates) != 1:
        return None
    return dates[0].isoformat()


async def extract_actions(original: str) -> list[VerifiedAction]:
    units = evidence_units(original)
    output = await generate(
        "actions",
        json.dumps({"sentences": [{"id": i, "text": text} for i, text in enumerate(units)]}),
        ActionExtraction,
        max_tokens=1400,
    )
    verified: list[VerifiedAction] = []
    seen: set[tuple[str, tuple[int, ...]]] = set()
    for task in output.tasks:
        ids = tuple(dict.fromkeys(task.evidence_ids))
        if any(i < 0 or i >= len(units) for i in ids):
            raise LocalAIError("An action could not be matched to the original. Read the notice.")
        key = (task.kind, ids)
        if key in seen:
            continue
        seen.add(key)
        evidence = [units[i] for i in ids]
        primary = evidence[0]
        if (
            NEGATED_REQUEST.search(primary)
            or not re.search(KINDS[task.kind], primary, re.I)
            or not (
                REQUEST.search(primary)
                or (
                    task.kind == "appointment"
                    and re.search(
                        r"\b(?:is|was|has been) scheduled|appointment is|interview is",
                        primary,
                        re.I,
                    )
                )
                or (task.kind == "payment" and re.search(r"payment is due", primary, re.I))
            )
        ):
            raise LocalAIError(
                "A suggested task was not a clear request. Check the original or ask its sender."
            )
        deadline_text: str | None = None
        calendar_date: str | None = None
        if task.deadline_evidence_id is not None:
            if task.deadline_evidence_id not in ids:
                raise LocalAIError("A date had no supporting action evidence. Check the notice.")
            deadline_text = units[task.deadline_evidence_id]
            calendar_date = explicit_date(deadline_text)
        elif task.kind == "appointment" and re.search(
            r"\bscheduled (?:for|on)\b|\b(?:appointment|interview) is on\b", primary, re.I
        ):
            # A model sometimes identifies the appointment but omits its date ID.
            # Resolve only explicit scheduling wording in that same source sentence.
            calendar_date = explicit_date(primary)
            if calendar_date:
                deadline_text = primary
        verified.append(
            VerifiedAction(
                kind=task.kind,
                evidence=evidence,
                deadline_text=deadline_text,
                calendar_date=calendar_date,
            )
        )
    return verified


async def prepare_conversation(data: ConversationInput) -> ConversationDraft:
    output = await generate(
        "conversation", data.model_dump_json(), ConversationDraft, max_tokens=1100
    )
    reference = data.source_text + "\n" + data.situation
    allowed_numbers = set(numeric_tokens(reference))
    questions: list[str] = []
    for question in output.questions:
        question = question.strip()
        if (
            len(question) > 450
            or not question.endswith("?")
            or not re.match(
                r"^(?:what|how|where|when|who|which|why|can|could|would|is|are|do|does|will)\b",
                question,
                re.I,
            )
            or re.search(r"https?://|www\.|\S+@\S+", question)
            or not set(numeric_tokens(question)).issubset(allowed_numbers)
            or re.search(
                r"\b(?:guaranteed|automatically approved|I qualify|I am eligible)\b", question, re.I
            )
            or re.search(r"\b(?:if|because|since) I\b", question, re.I)
            or re.search(
                r"\b(?:when|how soon)\b[^?]*\b(?:will|does|is)\b"
                r"[^?]*\b(?:close[ds]?|terminate[ds]?|denied|approved|stopped)\b",
                question,
                re.I,
            )
        ):
            raise LocalAIError("The questions could not be checked. Try again or use the original.")
        # Month names are also factual details; reject invented dates with no digits.
        for month in MONTHS:
            if re.search(rf"\b{month}\b", question, re.I) and not re.search(
                rf"\b{month}\b", reference, re.I
            ):
                raise LocalAIError("The questions added an unsupported date. Try again.")
        if question not in questions:
            questions.append(question)
    if len(questions) < 2:
        raise LocalAIError("Too few useful questions were returned. Try again.")
    return ConversationDraft(questions=questions)
