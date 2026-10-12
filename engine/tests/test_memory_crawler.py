from pathlib import Path
from unittest.mock import AsyncMock

import httpx
import pytest
import respx

from abridge.crawler.fetch import Crawler, CrawlError
from abridge.memory.store import Memory, Record


def test_fts_metadata_and_idempotency(tmp_path: Path) -> None:
    memory = Memory(tmp_path / "memory.db")
    record = Record(
        source_url="https://agency.gov/help",
        source_title="Food help",
        text="School meal support for families.",
        jurisdiction="US",
        rule_year="2026",
    )
    memory.ingest(record)
    memory.ingest(record)
    hits = memory.search('school OR " ; DROP TABLE sources;')
    assert hits and hits[0].content_hash and hits[0].fetched_at
    old_id = hits[0].id
    memory.ingest(record.model_copy(update={"text": "Lifeline phone support"}))
    assert memory.search("school") == []
    assert memory.search("Lifeline")[0].id == old_id


@pytest.mark.asyncio
async def test_saved_html_and_robots(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("abridge.crawler.fetch.asyncio.sleep", AsyncMock())
    with respx.mock() as mock:
        mock.get("https://agency.gov/robots.txt").respond(
            200, text="User-agent: *\nDisallow: /private"
        )
        mock.get("https://agency.gov/help").respond(
            200, text=(Path(__file__).parent / "fixtures" / "source.html").read_text()
        )
        async with httpx.AsyncClient() as client:
            crawler = Crawler(client, {"agency.gov"})
            record = await crawler.fetch("https://agency.gov/help", "US", "2026")
            assert "School meals" in record.text
            with pytest.raises(CrawlError, match="disallows"):
                await crawler.fetch("https://agency.gov/private", "US")


@pytest.mark.asyncio
async def test_redirect_escape_size_and_rate_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    sleep = AsyncMock()
    monkeypatch.setattr("abridge.crawler.fetch.asyncio.sleep", sleep)
    with respx.mock() as mock:
        mock.get("https://agency.gov/robots.txt").respond(404)
        mock.get("https://agency.gov/help").respond(
            302, headers={"location": "https://evil.example/"}
        )
        async with httpx.AsyncClient() as client:
            crawler = Crawler(client, {"agency.gov"})
            with pytest.raises(CrawlError, match="allowlisted"):
                await crawler.fetch("https://agency.gov/help", "US")
            assert sleep.call_args_list[-1].args[0] > 0.9
            mock.get("https://agency.gov/huge").respond(200, text="x" * 2_000_001)
            with pytest.raises(CrawlError, match="size"):
                await crawler.request("https://agency.gov/huge")


@pytest.mark.parametrize(
    "url",
    [
        "http://agency.gov/a",
        "https://agency.gov:8000/a",
        "https://agency.gov@evil.example/a",
        "https://127.0.0.1/a",
        "https://agency.gov/a?income=4",
    ],
)
def test_allowlist_rejects_invalid_urls(url: str) -> None:
    with httpx.Client():
        crawler = Crawler(httpx.AsyncClient(), {"agency.gov"})
        with pytest.raises(CrawlError):
            crawler.check_url(url)


def test_delete_obsolete_public_source_removes_fts_chunks(tmp_path: Path) -> None:
    memory = Memory(tmp_path / "memory.db")
    url = "https://agency.gov/obsolete"
    memory.ingest(
        Record(source_url=url, source_title="Old", text="Old program guidance", jurisdiction="US")
    )
    assert memory.search("Old")
    memory.delete_source(url)
    assert memory.search("Old") == []
