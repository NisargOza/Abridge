import argparse
import asyncio
from pathlib import Path

import httpx
import yaml
from pydantic import Field

from abridge.crawler.fetch import Crawler, CrawlError, verify_public_dns
from abridge.memory.store import Memory
from abridge.models import Boundary


class Seed(Boundary):
    url: str
    jurisdiction: str
    rule_year: str | None = None


class Seeds(Boundary):
    allowed_domains: list[str] = Field(min_length=1)
    seeds: list[Seed]


async def crawl(path: Path) -> None:
    config = Seeds.model_validate(yaml.safe_load(path.read_text()))
    domains = set(config.allowed_domains)
    verified_domains: set[str] = set()
    for domain in sorted(domains):
        try:
            await verify_public_dns({domain})
            verified_domains.add(domain)
        except CrawlError as exc:
            print(f"Skipped public domain {domain}: {exc}")
    memory = Memory()
    async with httpx.AsyncClient(timeout=20, trust_env=False) as client:
        crawler = Crawler(client, verified_domains)
        for seed in config.seeds:
            try:
                record = await crawler.fetch(seed.url, seed.jurisdiction, seed.rule_year)
                memory.ingest(record)
                print(f"Updated public source: {record.source_title}")
            except (CrawlError, httpx.HTTPError) as exc:
                print(f"Skipped {seed.url}: {exc}")
    print("Public knowledge updated. Deterministic rules require separate review and golden tests.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seeds", type=Path, default=Path(__file__).with_name("seeds.yaml"))
    args = parser.parse_args()
    asyncio.run(crawl(args.seeds))


if __name__ == "__main__":
    main()
