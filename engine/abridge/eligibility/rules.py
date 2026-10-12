from datetime import date
from decimal import ROUND_CEILING, Decimal

from abridge.eligibility.poverty import poverty_guideline
from abridge.models import Household, ProgramResult, Screening, Source, Status

SOURCES = {
    "lifeline": Source(
        id="usac-lifeline-2026",
        source_url="https://www.lifelinesupport.org/how-to-qualify/",
        source_title="USAC · Lifeline income qualification",
        fetched_at="2026-10-12",
        rule_year="2026",
        effective_from="2026-01-01",
        effective_to="2026-12-31",
    ),
    "school": Source(
        id="usda-meals-2026",
        source_url="https://www.govinfo.gov/content/pkg/FR-2026-04-09/pdf/2026-06842.pdf",
        source_title="USDA · School meal income guidelines",
        fetched_at="2026-10-12",
        rule_year="2026–2027",
        effective_from="2026-07-01",
        effective_to="2027-06-30",
    ),
    "wic": Source(
        id="usda-wic-2026",
        source_url="https://www.govinfo.gov/content/pkg/FR-2026-04-29/pdf/2026-08323.pdf",
        source_title="USDA · WIC income guidelines",
        fetched_at="2026-10-12",
        rule_year="2026–2027",
        effective_from="2026-07-01",
        effective_to="2027-06-30",
    ),
    "snap": Source(
        id="usda-snap",
        source_url="https://www.fns.usda.gov/snap/recipient/eligibility",
        source_title="USDA · SNAP eligibility",
        fetched_at="2026-10-12",
        rule_year="Information only",
        effective_from="2026-10-01",
        effective_to="2027-09-30",
    ),
    "medicaid": Source(
        id="cms-medicaid",
        source_url="https://www.medicaid.gov/medicaid/eligibility-policy",
        source_title="CMS · Medicaid eligibility",
        fetched_at="2026-10-12",
        rule_year="Information only",
        effective_from="2026-01-01",
        effective_to="2026-12-31",
    ),
}


def ceiling(value: Decimal) -> int:
    return int(value.to_integral_value(rounding=ROUND_CEILING))


def screen(h: Household, today: date | None = None) -> Screening:
    today = today or date.today()
    guideline = poverty_guideline(h.state, h.household_size)
    programs: list[ProgramResult] = []
    specs = [
        (
            "lifeline",
            "Lifeline",
            "Phone & internet",
            "Federal income route",
            "https://www.lifelinesupport.org/get-started/",
        ),
        (
            "school",
            "School meals",
            "Food",
            "Federal free / reduced-price income route",
            "https://www.fns.usda.gov/nslp",
        ),
        (
            "wic",
            "WIC",
            "Food & family",
            "Information only · state and clinic review",
            "https://www.fns.usda.gov/wic/program-contacts",
        ),
        (
            "snap",
            "SNAP",
            "Food",
            "Information only · not calculated",
            "https://www.fns.usda.gov/snap/state-directory",
        ),
        (
            "medicaid",
            "Medicaid",
            "Health",
            "Information only · not calculated",
            "https://www.healthcare.gov/medicaid-chip/getting-medicaid-chip/",
        ),
    ]
    for key, name, category, scope, url in specs:
        source = SOURCES[key]
        status = Status.MORE
        missing: list[str] = []
        limit: float | None = None
        reason = "We need more information."
        modeled = key in {"lifeline", "school"}
        next_step = "Contact the program to check the rules and apply."
        valid = (
            date.fromisoformat(source.effective_from)
            <= today
            <= date.fromisoformat(source.effective_to)
        )
        if guideline is None:
            missing = ["Territory-specific program rules"]
            reason = (
                "HHS does not publish a guideline for this territory. Check with your local agency."
            )
        elif not valid:
            missing = ["A verified source for the current rule period"]
            reason = "These stored rules are outside their effective dates. An update is needed."
        elif key == "lifeline":
            limit = ceiling(Decimal(guideline) * Decimal("1.35")) / 12
            missing = []
            if h.household_confirmed is not True:
                missing.append("Confirm that everyone counted shares income and expenses")
            if h.lifeline_already_received is None:
                missing.append("Whether this household already gets Lifeline")
            if missing:
                reason = "Confirm the Lifeline household rules to finish this income check."
            elif h.lifeline_already_received:
                status = Status.INELIGIBLE
                reason = "A household may get only one Lifeline discount."
            elif h.monthly_gross_income <= limit:
                status = Status.ELIGIBLE
                reason = "Your reported income is within the federal Lifeline income limit."
            else:
                status = Status.INELIGIBLE
                reason = (
                    "Your reported income is above this income route. You may still "
                    "qualify through a participating benefit or survivor rules."
                )
            next_step = (
                "Bring proof of income. The program checks household rules and "
                "documents. California, Oregon, and Texas use state application paths."
            )
        elif key == "school":
            # USDA monthly thresholds round the annual threshold up, then divide and round up.
            free = ceiling(Decimal(ceiling(Decimal(guideline) * Decimal("1.30"))) / 12)
            reduced = ceiling(Decimal(ceiling(Decimal(guideline) * Decimal("1.85"))) / 12)
            limit = float(reduced)
            if h.household_confirmed is not True:
                missing.append(
                    "Confirm that the income and household count cover the whole economic household"
                )
            if h.school_participating is None:
                missing.append("Whether a child attends a school in the federal meal program")
            if missing:
                reason = "We need the school and household details to finish the income check."
            elif not h.school_participating:
                status = Status.INELIGIBLE
                reason = "This route requires a child at a participating school."
            elif h.monthly_gross_income <= reduced:
                status = Status.ELIGIBLE
                tier = "free" if h.monthly_gross_income <= free else "reduced-price"
                reason = f"Your reported income falls within the {tier} school meal limit."
            else:
                status = Status.INELIGIBLE
                reason = (
                    "Your reported income is above the federal income route. Your school "
                    "or state may offer meals through another route."
                )
            next_step = (
                "Ask your school for a meal application. Also ask about meals offered "
                "to all students and direct certification."
            )
        elif key == "wic":
            reason = (
                "WIC helps eligible pregnant, postpartum or breastfeeding people, "
                "infants, and children under 5. A clinic checks nutrition risk and "
                "state rules."
            )
            missing = [
                "Clinic nutrition-risk assessment",
                "State income rules and WIC household count",
            ]
            if h.wic_category is None:
                missing.insert(0, "Whether someone is in a WIC category")
            elif not h.wic_category:
                reason = (
                    "You reported no one in a WIC category. "
                    "Ask the clinic if your situation changes."
                )
            next_step = (
                "Contact your state WIC office. Being on SNAP, Medicaid, or TANF may "
                "satisfy the income requirement."
            )
        elif key == "snap":
            reason = (
                "SNAP can help with groceries. Gross income alone cannot determine "
                "your eligibility."
            )
            missing = [
                "Food-purchasing household",
                "Income deductions and resources",
                "Age, disability, student and work-rule details",
                "State and immigration rules",
            ]
        else:
            reason = (
                "Medicaid rules depend on your state, age, household, income type, and other facts."
            )
            missing = [
                "Age and coverage category",
                "MAGI / tax household",
                "State, residency and immigration rules",
            ]
        programs.append(
            ProgramResult(
                id=key,
                name=name,
                category=category,
                status=status,
                scope=scope,
                reason=reason,
                missing=missing,
                next_step=next_step,
                application_url=url,
                source=source,
                income_limit_monthly=limit,
                modeled=modeled,
            )
        )
    return Screening(
        programs=programs,
        annual_poverty_guideline=guideline,
        poverty_percentage=round(h.monthly_gross_income * 1200 / guideline, 1)
        if guideline
        else None,
    )
