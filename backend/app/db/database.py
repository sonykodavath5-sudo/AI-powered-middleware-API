"""SQLite connection handling.

The brief says dummy data in local storage or a DB, so this uses the
standard library's sqlite3 rather than pulling in an ORM. Connections are
short-lived and opened per unit of work, which keeps the threading story
simple under Uvicorn's worker threads.
"""

from __future__ import annotations

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from app.core.config import settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS conversations (
    context_id      TEXT PRIMARY KEY,
    prompt          TEXT NOT NULL,
    prompt_hash     TEXT NOT NULL,
    target_language TEXT NOT NULL,
    total_items     INTEGER NOT NULL,
    turn_count      INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS insights (
    context_id TEXT NOT NULL,
    position   INTEGER NOT NULL,
    payload    TEXT NOT NULL,
    PRIMARY KEY (context_id, position),
    FOREIGN KEY (context_id) REFERENCES conversations(context_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_insights_context ON insights(context_id, position);
"""

_db_path: Path = settings.database_path


def configure(path: Path) -> None:
    """Point the module at a different file. Used by the test suite."""
    global _db_path
    _db_path = path


def current_path() -> Path:
    return _db_path


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    _db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(_db_path, timeout=10.0)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def init_db() -> None:
    """Create the schema. Safe to call on every startup."""
    _db_path.parent.mkdir(parents=True, exist_ok=True)
    with connect() as connection:
        connection.executescript(SCHEMA)
