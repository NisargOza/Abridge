from datetime import date

import pytest

from abridge.eligibility.policyengine import audited_poverty_guideline
from abridge.eligibility.poverty import poverty_guideline
from abridge.eligibility.rules import screen
from abridge.models import Household, Status

TODAY = date(2026, 10, 12)


def household(**changes: object) -> Household:
    return Household.model_validate(
        {
            "state": "NY",
            "household_size": 1,
            "monthly_gross_income": 1000,
            "household_confirmed": True,
            "lifeline_already_received": False,
            "school_participating": True,
            **changes,
        }
    )


@pytest.mark.parametrize(
    "state,size,value",
    [
        ("NY", 1, 15960),
        ("AK", 1, 19950),
        ("HI", 1, 18360),
        ("NY", 4, 33000),
        ("AK", 4, 41250),
        ("HI", 4, 37950),
        ("NY", 8, 55720),
        ("AK", 8, 69650),
        ("HI", 8, 64070),
        ("NY", 9, 61400),
        ("AK", 9, 76750),
        ("HI", 9, 70600),
    ],
)
def test_hhs_and_pinned_policyengine_goldens(state: str, size: int, value: int) -> None:
    assert poverty_guideline(state, size) == value
    assert audited_poverty_guideline(state, size) == value


@pytest.mark.parametrize("state", ["PR", "GU", "VI", "AS", "MP"])
def test_territories_never_assume_mainland_guideline(state: str) -> None:
    result = screen(household(state=state), TODAY)
    assert result.annual_poverty_guideline is None
    assert all(p.status == Status.MORE for p in result.programs)


@pytest.mark.parametrize(
    "state,size,limit",
    [("NY", 1, 21546 / 12), ("AK", 1, 26933 / 12), ("HI", 1, 24786 / 12), ("NY", 4, 44550 / 12)],
)
def test_lifeline_official_rounded_thresholds(state: str, size: int, limit: float) -> None:
    h = household(state=state, household_size=size, monthly_gross_income=limit)
    result = screen(h, TODAY).programs[0]
    assert result.status == Status.ELIGIBLE
    assert result.income_limit_monthly == limit
    assert (
        screen(h.model_copy(update={"monthly_gross_income": limit + 0.01}), TODAY)
        .programs[0]
        .status
        == Status.INELIGIBLE
    )


@pytest.mark.parametrize(
    "income,status,tier",
    [
        (1729, Status.ELIGIBLE, "free"),
        (1730, Status.ELIGIBLE, "reduced-price"),
        (2461, Status.ELIGIBLE, "reduced-price"),
        (2461.01, Status.INELIGIBLE, "above"),
    ],
)
def test_usda_school_monthly_rounding(income: float, status: Status, tier: str) -> None:
    p = screen(household(monthly_gross_income=income), TODAY).programs[1]
    assert p.status == status
    assert tier in p.reason
    assert p.income_limit_monthly == 2461


@pytest.mark.parametrize(
    "change", [{"household_confirmed": None}, {"lifeline_already_received": None}]
)
def test_missing_lifeline_facts_are_not_guessed(change: dict[str, object]) -> None:
    p = screen(household(**change), TODAY).programs[0]
    assert p.status == Status.MORE and p.missing


def test_missing_school_and_already_receiving() -> None:
    assert screen(household(school_participating=None), TODAY).programs[1].status == Status.MORE
    assert (
        screen(household(lifeline_already_received=True), TODAY).programs[0].status
        == Status.INELIGIBLE
    )


def test_unverified_programs_are_not_calculated() -> None:
    for p in screen(household(wic_category=True), TODAY).programs[2:]:
        assert not p.modeled and p.status == Status.MORE
        assert p.income_limit_monthly is None and p.missing


def test_expired_rules_fail_closed() -> None:
    assert all(p.status == Status.MORE for p in screen(household(), date(2028, 1, 1)).programs)
