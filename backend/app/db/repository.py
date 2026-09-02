"""Persistence for generated conversations and their insights.

Insights are stored once per conversation and then paged out of the
database. That is what makes pagination genuinely server-side: page 3 is a
LIMIT/OFFSET read, not a slice of something we re-generated in memory.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from app.db.database import connect


@dataclass(frozen=True)
class StoredConversation:
    context_id: str
    prompt: str
    prompt_hash: str
    target_language: str
    total_items: int
    turn_count: int
    created_at: str
    updated_at: str


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def get_conversation(context_id: str) -> StoredConversation | None:
    with connect() as connection:
        row = connection.execute(
            "SELECT * FROM conversations WHERE context_id = ?", (context_id,)
        ).fetchone()
    if row is None:
        return None
    return StoredConversation(
        context_id=row["context_id"],
        prompt=row["prompt"],
        prompt_hash=row["prompt_hash"],
        target_language=row["target_language"],
        total_items=row["total_items"],
        turn_count=row["turn_count"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def save_generation(
    *,
    context_id: str,
    prompt: str,
    prompt_hash: str,
    target_language: str,
    insights: list[dict[str, Any]],
) -> StoredConversation:
    """Write a conversation and its insights, replacing anything already there."""
    now = _now()
    with connect() as connection:
        existing = connection.execute(
            "SELECT created_at, turn_count FROM conversations WHERE context_id = ?",
            (context_id,),
        ).fetchone()

        created_at = existing["created_at"] if existing else now
        turn_count = (existing["turn_count"] + 1) if existing else 1

        connection.execute("DELETE FROM insights WHERE context_id = ?", (context_id,))
        connection.execute(
            """
            INSERT INTO conversations
                (context_id, prompt, prompt_hash, target_language,
                 total_items, turn_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(context_id) DO UPDATE SET
                prompt          = excluded.prompt,
                prompt_hash     = excluded.prompt_hash,
                target_language = excluded.target_language,
                total_items     = excluded.total_items,
                turn_count      = excluded.turn_count,
                updated_at      = excluded.updated_at
            """,
            (
                context_id,
                prompt,
                prompt_hash,
                target_language,
                len(insights),
                turn_count,
                created_at,
                now,
            ),
        )
        connection.executemany(
            "INSERT INTO insights (context_id, position, payload) VALUES (?, ?, ?)",
            [
                (context_id, position, json.dumps(insight, ensure_ascii=False))
                for position, insight in enumerate(insights)
            ],
        )

    return StoredConversation(
        context_id=context_id,
        prompt=prompt,
        prompt_hash=prompt_hash,
        target_language=target_language,
        total_items=len(insights),
        turn_count=turn_count,
        created_at=created_at,
        updated_at=now,
    )


def fetch_page(
    context_id: str, *, offset: int, limit: int
) -> tuple[list[dict[str, Any]], int]:
    """Return one page of insights plus the total count for the conversation."""
    with connect() as connection:
        total = connection.execute(
            "SELECT COUNT(*) AS total FROM insights WHERE context_id = ?",
            (context_id,),
        ).fetchone()["total"]
        rows = connection.execute(
            """
            SELECT payload FROM insights
            WHERE context_id = ?
            ORDER BY position
            LIMIT ? OFFSET ?
            """,
            (context_id, limit, offset),
        ).fetchall()
    return [json.loads(row["payload"]) for row in rows], total


def delete_conversation(context_id: str) -> bool:
    with connect() as connection:
        connection.execute("DELETE FROM insights WHERE context_id = ?", (context_id,))
        removed = connection.execute(
            "DELETE FROM conversations WHERE context_id = ?", (context_id,)
        ).rowcount
    return removed > 0
