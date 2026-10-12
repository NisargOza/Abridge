import hashlib
import re
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from pydantic import Field

from abridge.models import Boundary

DB_PATH = Path(__file__).resolve().parents[3] / "data" / "abridge.db"


class Record(Boundary):
    source_url: str
    source_title: str
    text: str = Field(min_length=1, max_length=200000)
    jurisdiction: str
    fetched_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    rule_year: str | None = None
    effective_from: str | None = None
    effective_to: str | None = None


class Hit(Record):
    id: str
    content_hash: str


class Memory:
    def __init__(self, path: Path = DB_PATH) -> None:
        self.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript("""
                        CREATE TABLE IF NOT EXISTS sources (id TEXT PRIMARY KEY, source_url
            TEXT UNIQUE NOT NULL, source_title TEXT NOT NULL, text TEXT NOT NULL, jurisdiction
            TEXT NOT NULL, fetched_at TEXT NOT NULL, content_hash TEXT NOT NULL, rule_year
            TEXT, effective_from TEXT, effective_to TEXT);
            CREATE VIRTUAL TABLE IF NOT EXISTS chunks USING fts5(source_id UNINDEXED, text);
            """)

    def connect(self) -> sqlite3.Connection:
        db = sqlite3.connect(self.path)
        db.row_factory = sqlite3.Row
        return db

    def ingest(self, record: Record) -> None:
        source_id = hashlib.sha256(record.source_url.encode()).hexdigest()[:16]
        content_hash = hashlib.sha256(record.text.encode()).hexdigest()
        with self.connect() as db:
            db.execute(
                "INSERT OR REPLACE INTO sources VALUES (?,?,?,?,?,?,?,?,?,?)",
                (
                    source_id,
                    record.source_url,
                    record.source_title,
                    record.text,
                    record.jurisdiction,
                    record.fetched_at,
                    content_hash,
                    record.rule_year,
                    record.effective_from,
                    record.effective_to,
                ),
            )
            db.execute("DELETE FROM chunks WHERE source_id = ?", (source_id,))
            for start in range(0, len(record.text), 1200):
                db.execute(
                    "INSERT INTO chunks VALUES (?,?)",
                    (source_id, record.text[start : start + 1500]),
                )

    def search(self, query: str, limit: int = 5) -> list[Hit]:
        tokens = re.findall(r"[A-Za-z0-9]+", query)[:12]
        if not tokens:
            return []
        fts_query = " OR ".join(f'"{token}"' for token in tokens)
        with self.connect() as db:
            rows = db.execute(
                (
                    "SELECT s.*, c.text AS excerpt FROM chunks c JOIN sources s ON "
                    "s.id=c.source_id WHERE chunks MATCH ? ORDER BY bm25(chunks) LIMIT ?"
                ),
                (fts_query, min(max(limit, 1), 10)),
            ).fetchall()
        hits = []
        for row in rows:
            value = dict(row)
            value["text"] = value.pop("excerpt")
            hits.append(Hit.model_validate(value))
        return hits
