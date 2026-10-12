import pytest
from pydantic import ValidationError

from abridge.budget.planner import cents, plan
from abridge.models import BudgetInput, Debt, Expenses


def test_zero_interest_exact_payoff_and_dti() -> None:
    result = plan(
        BudgetInput(
            monthly_take_home=1000,
            monthly_gross_income=2000,
            expenses=Expenses(housing=500),
            debts=[Debt(id="a", name="Bill", balance=1000, apr=0, minimum_payment=100)],
            extra_payment=150,
        )
    )
    assert result.remaining == 400 and result.funded_extra == 150
    assert result.dti_percentage == 5
    assert result.strategies[0].months == 4
    assert result.strategies[0].total_paid == 1000
    assert result.strategies[0].interest == 0
    assert result.strategies[0].timeline[-1].balance == 0


def test_interest_monthly_known_value() -> None:
    result = plan(
        BudgetInput(
            monthly_take_home=1000,
            monthly_gross_income=1000,
            debts=[Debt(id="a", name="Loan", balance=1000, apr=12, minimum_payment=1010)],
        )
    )
    # Not funded at 1000 take-home; no false payoff claim.
    assert result.strategies[0].months is None
    result = plan(
        BudgetInput(
            monthly_take_home=1100,
            monthly_gross_income=1100,
            debts=[Debt(id="a", name="Loan", balance=1000, apr=12, minimum_payment=1010)],
        )
    )
    assert result.strategies[0].months == 1
    assert result.strategies[0].interest == 10
    assert result.strategies[0].total_paid == 1010


def test_funding_gap_and_extra_clamp() -> None:
    result = plan(
        BudgetInput(
            monthly_take_home=800,
            monthly_gross_income=0,
            expenses=Expenses(housing=750),
            debts=[Debt(id="a", name="Card", balance=500, apr=10, minimum_payment=100)],
            extra_payment=100,
        )
    )
    assert result.funding_gap == 50 and result.funded_extra == 0
    assert result.dti_percentage is None
    assert result.strategies[0].months is None


def test_avalanche_and_snowball_release_paid_minimums() -> None:
    debts = [
        Debt(id="a", name="Large high rate", balance=3000, apr=25, minimum_payment=90),
        Debt(id="b", name="Small no interest", balance=500, apr=0, minimum_payment=25),
    ]
    result = plan(
        BudgetInput(
            monthly_take_home=3000, monthly_gross_income=4000, debts=debts, extra_payment=200
        )
    )
    avalanche, snowball = result.strategies
    assert avalanche.order[0] == "Large high rate"
    assert snowball.order[0] == "Small no interest"
    assert avalanche.interest < snowball.interest
    for s in result.strategies:
        assert s.months is not None and s.months < 20
        assert s.total_paid == pytest.approx(3500 + s.interest)
        assert s.timeline[-1].balance == 0


def test_no_debts_and_nonamortizing() -> None:
    result = plan(BudgetInput(monthly_take_home=1000, monthly_gross_income=0))
    assert result.strategies[0].months == 0
    result = plan(
        BudgetInput(
            monthly_take_home=1000,
            monthly_gross_income=1000,
            debts=[Debt(id="a", name="Card", balance=1000, apr=100, minimum_payment=1)],
        )
    )
    assert result.strategies[0].months is None
    assert "50 years" in result.strategies[0].note


def test_cent_rounding_and_duplicate_debt_validation() -> None:
    assert cents(1.005) == 101
    debt = Debt(id="same", name="Bill", balance=100, apr=0, minimum_payment=20)
    with pytest.raises(ValidationError):
        BudgetInput(monthly_take_home=1000, monthly_gross_income=1000, debts=[debt, debt])


def test_maximum_supported_nonamortizing_input_stays_bounded() -> None:
    result = plan(
        BudgetInput(
            monthly_take_home=1000,
            monthly_gross_income=1000,
            debts=[
                Debt(id="max", name="Stress test", balance=10_000_000, apr=100, minimum_payment=1)
            ],
        )
    )
    assert result.strategies[0].months is None
    assert len(result.strategies[0].timeline) <= 63
    assert result.strategies[0].interest > 0
