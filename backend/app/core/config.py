"""Central configuration.

Everything tunable lives here so the validation rules, the clarification
heuristics and the pagination policy have exactly one source of truth.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _csv_env(name: str, default: tuple[str, ...]) -> tuple[str, ...]:
    raw = os.getenv(name)
    if not raw:
        return default
    return tuple(part.strip() for part in raw.split(",") if part.strip())


@dataclass(frozen=True)
class Settings:
    app_name: str = "AI Insights Middleware"
    api_prefix: str = "/api/v1"

    # --- language policy -------------------------------------------------
    supported_languages: tuple[str, ...] = ("en", "es", "fr", "de")
    default_language: str = "en"

    # --- prompt policy ---------------------------------------------------
    # A prompt shorter than this never reaches the downstream AI service.
    min_prompt_length: int = 5
    max_prompt_length: int = 2000
    # "Clearly lacks context" -> fewer than this many meaningful words.
    min_prompt_words: int = 2

    # --- pagination policy ----------------------------------------------
    default_page_size: int = 10
    max_page_size: int = 50
    # Result sets at or below this size are returned as a single page.
    pagination_threshold: int = 10

    # --- infrastructure --------------------------------------------------
    database_path: Path = BASE_DIR / "data" / "middleware.db"
    seed_path: Path = BASE_DIR / "data" / "insight_templates.json"
    cors_origins: tuple[str, ...] = (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Settings singleton, with a few env overrides for local runs."""
    database_path = os.getenv("MIDDLEWARE_DB_PATH")
    return Settings(
        supported_languages=_csv_env(
            "MIDDLEWARE_SUPPORTED_LANGUAGES", Settings.supported_languages
        ),
        cors_origins=_csv_env("MIDDLEWARE_CORS_ORIGINS", Settings.cors_origins),
        database_path=Path(database_path) if database_path else Settings.database_path,
    )


settings = get_settings()
