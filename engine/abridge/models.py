from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Money = Annotated[float, Field(ge=0, le=10_000_000, allow_inf_nan=False)]
State = Literal[
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DE",
    "DC",
    "FL",
    "GA",
    "HI",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "KY",
    "LA",
    "ME",
    "MD",
    "MA",
    "MI",
    "MN",
    "MS",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "NC",
    "ND",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VT",
    "VA",
    "WA",
    "WV",
    "WI",
    "WY",
    "PR",
    "GU",
    "VI",
    "AS",
    "MP",
]


class Boundary(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Household(Boundary):
    state: State
    household_size: int = Field(ge=1, le=20)
    monthly_gross_income: Money
    household_confirmed: bool | None = None
    lifeline_already_received: bool | None = None
    school_participating: bool | None = None
    wic_category: bool | None = None


class Status(StrEnum):
    ELIGIBLE = "likely_eligible"
    INELIGIBLE = "likely_ineligible"
    MORE = "needs_more_information"


class Source(Boundary):
    id: str
    source_url: str
    source_title: str
    fetched_at: str
    jurisdiction: str = "US"
    rule_year: str
    effective_from: str
    effective_to: str


class ProgramResult(Boundary):
    id: str
    name: str
    category: str
    status: Status
    scope: str
    reason: str
    missing: list[str]
    next_step: str
    application_url: str
    source: Source
    income_limit_monthly: float | None = None
    modeled: bool = False


class Screening(Boundary):
    programs: list[ProgramResult]
    annual_poverty_guideline: int | None
    poverty_percentage: float | None
    rule_year: int = 2026
    disclaimer: str = (
        "This is an estimate, not legal, tax, or financial advice. The agency "
        "makes the final decision."
    )


class Debt(Boundary):
    id: str = Field(min_length=1, max_length=60)
    name: str = Field(min_length=1, max_length=80)
    balance: Money
    apr: float = Field(ge=0, le=100, allow_inf_nan=False)
    minimum_payment: Money


class Expenses(Boundary):
    housing: Money = 0
    utilities: Money = 0
    food: Money = 0
    transport: Money = 0
    health: Money = 0
    other: Money = 0


class BudgetInput(Boundary):
    monthly_take_home: Money
    monthly_gross_income: Money
    expenses: Expenses = Field(default_factory=Expenses)
    debts: list[Debt] = Field(default_factory=list, max_length=20)
    extra_payment: Money = 0

    @model_validator(mode="after")
    def unique_debts(self) -> "BudgetInput":
        if len({debt.id for debt in self.debts}) != len(self.debts):
            raise ValueError("Each debt must have a unique ID.")
        return self


class PayoffPoint(Boundary):
    month: int
    balance: float


class Strategy(Boundary):
    name: str
    months: int | None
    interest: float
    total_paid: float
    order: list[str]
    timeline: list[PayoffPoint]
    note: str


class BudgetResult(Boundary):
    essentials: float
    minimum_payments: float
    remaining: float
    funded_extra: float
    funding_gap: float
    dti_percentage: float | None
    dti_label: str = (
        "Listed monthly debt payments ÷ gross monthly income. Housing debt is "
        "included only if listed as a debt."
    )
    strategies: list[Strategy]
    notes: list[str]


class DocumentInput(Boundary):
    text: str = Field(min_length=20, max_length=18000)


class Rewrite(Boundary):
    title: str = Field(min_length=1, max_length=120)
    plain_language: str = Field(min_length=1, max_length=20000)
    action_items: list[str] = Field(max_length=8)


class DocumentResult(Boundary):
    mode: Literal["local_ai", "original_only"]
    rewrite: Rewrite | None
    original: str
    message: str


ActionKind = Literal["documents", "appointment", "contact", "payment"]


class SuggestedAction(Boundary):
    kind: ActionKind
    evidence_ids: list[int] = Field(min_length=1, max_length=3)
    deadline_evidence_id: int | None


class ActionExtraction(Boundary):
    tasks: list[SuggestedAction] = Field(max_length=8)


class VerifiedAction(Boundary):
    kind: ActionKind
    evidence: list[str]
    deadline_text: str | None
    calendar_date: str | None


class ActionResult(Boundary):
    mode: Literal["local_ai", "unavailable"]
    tasks: list[VerifiedAction]
    message: str


class ConversationInput(Boundary):
    source_text: str = Field(min_length=1, max_length=18000)
    situation: str = Field(max_length=1000, default="")
    audience: Literal["sender", "navigator"] = "sender"


class ConversationDraft(Boundary):
    questions: list[str] = Field(min_length=2, max_length=5)


class ConversationResult(Boundary):
    draft: ConversationDraft


class ExplanationInput(Boundary):
    household: Household


class CitedExplanation(Boundary):
    source_id: str
    excerpt: str = Field(min_length=1, max_length=800)
    explanation: str = Field(min_length=1, max_length=1000)


class Explanation(Boundary):
    items: list[CitedExplanation] = Field(max_length=5)


class ExplainedSource(CitedExplanation):
    source_url: str
    source_title: str


class ExplanationResult(Boundary):
    items: list[ExplainedSource]
