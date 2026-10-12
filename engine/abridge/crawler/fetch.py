import asyncio
import ipaddress
import socket
import time
from urllib.parse import urljoin, urlsplit
from urllib.robotparser import RobotFileParser

import httpx
import trafilatura

from abridge.memory.store import Record

USER_AGENT = (
    "AbridgePublicSources/0.1 (+https://github.com/NisargOza/Abridge; public-program-research)"
)
MAX_BYTES = 2_000_000


class CrawlError(Exception):
    pass


class Crawler:
    def __init__(self, client: httpx.AsyncClient, domains: set[str]) -> None:
        self.client = client
        self.domains = domains
        self.last_request: dict[str, float] = {}
        self.robots: dict[str, RobotFileParser] = {}

    def check_url(self, url: str) -> str:
        parsed = urlsplit(url)
        host = parsed.hostname or ""
        if (
            parsed.scheme != "https"
            or host not in self.domains
            or parsed.port not in {None, 443}
            or parsed.username
            or parsed.password
            or parsed.query
            or parsed.fragment
        ):
            raise CrawlError("URL is not a curated, allowlisted HTTPS source.")
        return host

    async def request(self, url: str) -> tuple[int, str, str | None]:
        host = self.check_url(url)
        await asyncio.sleep(max(0, 1 - (time.monotonic() - self.last_request.get(host, 0))))
        self.last_request[host] = time.monotonic()
        async with self.client.stream(
            "GET", url, headers={"User-Agent": USER_AGENT}, follow_redirects=False
        ) as response:
            body = bytearray()
            async for chunk in response.aiter_bytes():
                body.extend(chunk)
                if len(body) > MAX_BYTES:
                    raise CrawlError("Source exceeds the response-size limit.")
            return (
                response.status_code,
                body.decode("utf-8", errors="replace"),
                response.headers.get("location"),
            )

    async def robots_allowed(self, url: str) -> bool:
        host = self.check_url(url)
        if host not in self.robots:
            robot_url = f"https://{host}/robots.txt"
            status, text, _ = await self.request(robot_url)
            robot = RobotFileParser(robot_url)
            if status == 404:
                robot.parse([])
            elif status == 200:
                robot.parse(text.splitlines())
            else:
                raise CrawlError("robots.txt could not be verified; skipping source.")
            self.robots[host] = robot
        return self.robots[host].can_fetch(USER_AGENT, url)

    async def fetch(self, url: str, jurisdiction: str, rule_year: str | None = None) -> Record:
        original_url = url
        for _ in range(6):
            self.check_url(url)
            if not await self.robots_allowed(url):
                raise CrawlError("robots.txt disallows this source.")
            status, html, location = await self.request(url)
            if status in {301, 302, 303, 307, 308} and location:
                url = urljoin(url, location)
                self.check_url(url)
                continue
            if status != 200:
                raise CrawlError(f"Source returned HTTP {status}.")
            text = trafilatura.extract(html, include_comments=False, include_tables=True)
            if not text:
                raise CrawlError("Source contained no extractable text.")
            metadata = trafilatura.extract_metadata(html)
            title = (
                metadata.title
                if metadata and metadata.title
                else urlsplit(url).hostname or "Public source"
            )
            return Record(
                source_url=original_url,
                source_title=title,
                text=text[:200000],
                jurisdiction=jurisdiction,
                rule_year=rule_year,
            )
        raise CrawlError("Too many redirects.")


async def verify_public_dns(domains: set[str]) -> None:
    loop = asyncio.get_running_loop()
    for domain in domains:
        try:
            addresses = await asyncio.wait_for(
                loop.getaddrinfo(domain, 443, type=socket.SOCK_STREAM), timeout=10
            )
        except (OSError, TimeoutError) as exc:
            raise CrawlError("Public-source DNS could not be verified.") from exc
        if not addresses or any(
            not ipaddress.ip_address(address[4][0]).is_global for address in addresses
        ):
            raise CrawlError("A source domain resolves to a non-public address.")
