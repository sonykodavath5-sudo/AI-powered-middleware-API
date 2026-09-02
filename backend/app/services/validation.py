"""Domain validation.

Pydantic has already guaranteed the request is structurally sound by the
time anything here runs. This layer enforces the rules that deserve their
own error code, and returns the cleaned-up values the rest of the service
should use.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.core.config import settings
from app.core.errors import ApiError, ErrorCode

# ISO 639-1: exactly two letters. Case is normalised, nothing else is accepted.
_LANGUAGE_RE = re.compile(r"^[A-Za-z]{2}$")


@dataclass(frozen=True)
class ValidatedPrompt:
    prompt: str
    language: str


def validate_language(raw: str) -> str:
    language = raw.strip()

    if not language:
        raise ApiError(
            ErrorCode.MISSING_LANGUAGE,
            "Target language is required",
            details={"supportedLanguages": list(settings.supported_languages)},
        )

    if not _LANGUAGE_RE.match(language):
        raise ApiError(
            ErrorCode.INVALID_LANGUAGE,
            "Target language must be a two-letter ISO 639-1 code",
            details={
                "received": raw,
                "supportedLanguages": list(settings.supported_languages),
            },
        )

    language = language.lower()
    if language not in settings.supported_languages:
        raise ApiError(
            ErrorCode.INVALID_LANGUAGE,
            "Target language is not supported",
            details={
                "received": language,
                "supportedLanguages": list(settings.supported_languages),
            },
        )

    return language


def validate_prompt(raw: str) -> str:
    prompt = raw.strip()

    if not prompt:
        raise ApiError(
            ErrorCode.INVALID_PROMPT,
            "Prompt must not be empty",
        )

    if len(prompt) > settings.max_prompt_length:
        raise ApiError(
            ErrorCode.PROMPT_TOO_LONG,
            f"Prompt must be {settings.max_prompt_length} characters or fewer",
            details={
                "length": len(prompt),
                "maxLength": settings.max_prompt_length,
            },
        )

    return prompt


def validate_request(prompt: str, target_language: str) -> ValidatedPrompt:
    """Language first: an unsupported language makes the prompt moot."""
    language = validate_language(target_language)
    return ValidatedPrompt(prompt=validate_prompt(prompt), language=language)
