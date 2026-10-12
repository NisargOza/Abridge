from decimal import ROUND_HALF_UP, Decimal, localcontext

from abridge.models import BudgetInput, BudgetResult, Debt, PayoffPoint, Strategy


def cents(value: float) -> int:
    return int((Decimal(str(value)) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def simulate(debts: list[Debt], extra: int, method: str, affordable: bool) -> Strategy:
    active = [d for d in debts if cents(d.balance) > 0]
    ordered = sorted(
        active, key=lambda d: (-d.apr, d.id) if method == "avalanche" else (d.balance, d.id)
    )
    balances = {d.id: cents(d.balance) for d in active}
    payment_pool = sum(cents(d.minimum_payment) for d in active) + extra
    points = [PayoffPoint(month=0, balance=sum(balances.values()) / 100)]
    interest_total = paid = 0
    months: int | None = 0 if not active else None
    note = "Fixed APR, monthly interest, fixed payment pool, no new charges or fees."
    if active and not affordable:
        return Strategy(
            name=method,
            months=None,
            interest=0,
            total_paid=0,
            order=[d.name for d in ordered],
            timeline=points,
            note="Your budget does not cover the listed minimums. This payoff plan is not funded.",
        )
    if active and payment_pool == 0:
        return Strategy(
            name=method,
            months=None,
            interest=0,
            total_paid=0,
            order=[d.name for d in ordered],
            timeline=points,
            note="Add a payment before estimating payoff.",
        )
    for month in range(1, 601) if active else []:
        for d in active:
            # The documented bounds permit large non-amortizing balances over 600 months.
            # Keep decimal precision sufficient for the entire supported range.
            with localcontext() as context:
                context.prec = 60
                interest = int(
                    (Decimal(balances[d.id]) * Decimal(str(d.apr)) / 1200).quantize(
                        Decimal("1"), rounding=ROUND_HALF_UP
                    )
                )
            balances[d.id] += interest
            interest_total += interest
        available = payment_pool
        for d in active:
            payment = min(cents(d.minimum_payment), balances[d.id], available)
            balances[d.id] -= payment
            available -= payment
            paid += payment
        for d in ordered:
            payment = min(balances[d.id], available)
            balances[d.id] -= payment
            available -= payment
            paid += payment
        remaining = sum(balances.values())
        if month <= 12 or month % 12 == 0 or remaining == 0:
            points.append(PayoffPoint(month=month, balance=remaining / 100))
        if remaining == 0:
            months = month
            break
    if months is None:
        note = (
            "Not paid off within 50 years at this payment. Interest shown covers "
            "that simulation period. Consider asking creditors about hardship "
            "options."
        )
    return Strategy(
        name=method,
        months=months,
        interest=interest_total / 100,
        total_paid=paid / 100,
        order=[d.name for d in ordered],
        timeline=points,
        note=note,
    )


def plan(data: BudgetInput) -> BudgetResult:
    essentials = sum(cents(v) for v in data.expenses.model_dump().values())
    minimums = sum(cents(d.minimum_payment) for d in data.debts if cents(d.balance) > 0)
    remaining = cents(data.monthly_take_home) - essentials - minimums
    extra = min(cents(data.extra_payment), max(0, remaining))
    notes = [
        "Protect housing, food, health, and utilities first.",
        "These are educational estimates. Actual lender interest and fees may differ.",
    ]
    if remaining < 0:
        notes.append(
            "Your listed costs are higher than take-home income. A hardship plan "
            "or benefits may help; extra debt payments are set to $0."
        )
    if extra < cents(data.extra_payment):
        notes.append(
            "The extra payment was limited to the money left after essentials and minimums."
        )
    return BudgetResult(
        essentials=essentials / 100,
        minimum_payments=minimums / 100,
        remaining=remaining / 100,
        funded_extra=extra / 100,
        funding_gap=max(0, -remaining) / 100,
        dti_percentage=round(minimums / cents(data.monthly_gross_income) * 100, 1)
        if cents(data.monthly_gross_income)
        else None,
        strategies=[
            simulate(data.debts, extra, method, remaining >= 0)
            for method in ["avalanche", "snowball"]
        ],
        notes=notes,
    )
