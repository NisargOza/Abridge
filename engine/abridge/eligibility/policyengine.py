"Offline rule audit; never infer benefit eligibility from default household facts."

from importlib.metadata import version
from typing import Any

from policyengine_us import Simulation

PINNED_VERSION = "2.40.1"


def audited_poverty_guideline(state: str, size: int, year: int = 2026) -> int:
    if version("policyengine-us") != PINNED_VERSION:
        raise ValueError("PolicyEngine version changed. Re-run the rule audit before using it.")
    if state not in {"NY", "AK", "HI"} or not 1 <= size <= 20 or year != 2026:
        raise ValueError("This audit supports only the three 2026 HHS region representatives.")
    period = str(year)
    people = {f"person_{i}": {"age": {period: 30}} for i in range(size)}
    situation: dict[str, Any] = {
        "people": people,
        "spm_units": {"unit": {"members": list(people)}},
        "households": {"household": {"members": list(people), "state_name": {period: state}}},
    }
    simulation = Simulation(situation=situation)
    return int(simulation.calculate("spm_unit_fpg", year)[0])


def main() -> None:
    from abridge.eligibility.poverty import poverty_guideline

    for state in ("NY", "AK", "HI"):
        for size in (1, 4, 8, 9):
            actual = audited_poverty_guideline(state, size)
            expected = poverty_guideline(state, size)
            if actual != expected:
                raise ValueError(f"Rule audit failed for {state}, household {size}.")
    print("PolicyEngine 2.40.1 matches all 12 HHS 2026 regional goldens.")
    print("SNAP/Medicaid/WIC benefit calculations are not enabled in Abridge.")


if __name__ == "__main__":
    main()
