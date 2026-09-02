"""The gate that decides whether a prompt is worth sending downstream.

This runs before anything touches the AI service. A prompt that is too
short, or that never names a subject, comes straight back to the user as
NEEDS_CLARIFICATION — no downstream call, no cost, no latency.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.core.config import settings
from app.core import messages
from app.services import text


@dataclass(frozen=True)
class Reason:
    code: str
    message: str


@dataclass(frozen=True)
class Decision:
    needed: bool
    reasons: list[Reason] = field(default_factory=list)


def assess(prompt: str, language: str) -> Decision:
    """Judge a prompt that has already passed hard validation."""
    trimmed = prompt.strip()
    tokens = text.tokenize(trimmed)
    subjects = text.meaningful_tokens(trimmed)
    reasons: list[Reason] = []

    def add(code: str, **fmt: object) -> None:
        reasons.append(Reason(code, messages.clarification_reason(code, language, **fmt)))

    if len(trimmed) < settings.min_prompt_length:
        add("PROMPT_TOO_SHORT", min_length=settings.min_prompt_length)

    if not tokens:
        # Something like "???" or "12 34" — nothing to work with at all.
        add("PROMPT_NOT_MEANINGFUL")
    elif len(tokens) < settings.min_prompt_words:
        add("PROMPT_TOO_VAGUE", min_words=settings.min_prompt_words)
    elif not subjects:
        # All stop-words: "tell me more", "what about it", "sag mir mehr".
        add("PROMPT_LACKS_SUBJECT")

    return Decision(needed=bool(reasons), reasons=reasons)
