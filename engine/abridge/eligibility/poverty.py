import json
from pathlib import Path
from typing import TypedDict, cast


class Region(TypedDict):
    base: int
    increment: int


class Guidelines(TypedDict):
    year: int
    verified_at: str
    source_url: str
    regions: dict[str, Region]


DATA = cast(Guidelines, json.loads(Path(__file__).with_name("poverty_2026.json").read_text()))
TERRITORIES = {"PR", "GU", "VI", "AS", "MP"}


def poverty_guideline(state: str, size: int) -> int | None:
    if not 1 <= size <= 20:
        raise ValueError("Household size must be between 1 and 20.")
    if state in TERRITORIES:
        return None
    region = DATA["regions"].get(state, DATA["regions"]["US"])
    return region["base"] + (size - 1) * region["increment"]
