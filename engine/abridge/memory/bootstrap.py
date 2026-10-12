from abridge.memory.store import Memory, Record

PUBLIC_EXCERPTS = [
    Record(
        source_url="https://www.lifelinesupport.org/how-to-qualify/",
        source_title="USAC · Lifeline qualification",
        text=(
            "You can get Lifeline if your income is at 135% or less than the 2026 "
            "Federal Poverty Guidelines. The guideline is based on your household "
            "size and state. You may be asked to show proof of income when you "
            "apply for Lifeline."
        ),
        jurisdiction="US",
        fetched_at="2026-10-12",
        rule_year="2026",
        effective_from="2026-01-01",
        effective_to="2026-12-31",
    ),
    Record(
        source_url="https://www.fna.usda.gov/schoolmeals/income-eligibility-guidelines",
        source_title="USDA · School meals",
        text=(
            "The Income Eligibility Guidelines are used to determine eligibility "
            "for free and reduced price meals. They are effective from July 1 "
            "through June 30 every year. Ask your school about the application and "
            "participating programs."
        ),
        jurisdiction="US",
        fetched_at="2026-10-12",
        rule_year="2026–2027",
        effective_from="2026-07-01",
        effective_to="2027-06-30",
    ),
]


def main() -> None:
    memory = Memory()
    for record in PUBLIC_EXCERPTS:
        memory.ingest(record)
    print("Installed reviewed public-source excerpts. No user data is stored.")


if __name__ == "__main__":
    main()
