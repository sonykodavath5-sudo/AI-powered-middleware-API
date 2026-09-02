"""Stand-in for the downstream AI service.

There is no LLM here — the brief asks for dummy data — but this module is
shaped like the real client would be: it takes a prompt and a language and
hands back a list of insights. Swapping it for a real provider means
rewriting `generate` and nothing else.

Output is deterministic for a given (prompt, language) pair. The same
question always produces the same insights, which makes the API testable
and makes the frontend's caching behaviour easy to reason about.
"""

from __future__ import annotations

import hashlib
import json
import random
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Any

from app.core.config import settings
from app.services import text

# Extra dimensions used to differentiate insights once the template list is
# exhausted, so a 25-item result set does not read as the same 14 lines twice.
SEGMENTS: dict[str, list[str]] = {
    "en": ["enterprise accounts", "self-serve users", "mobile sessions",
           "new signups", "the EMEA region", "trial accounts", "the support queue"],
    "es": ["cuentas enterprise", "usuarios self-service", "sesiones móviles",
           "registros nuevos", "la región EMEA", "cuentas de prueba",
           "la cola de soporte"],
    "fr": ["comptes entreprise", "utilisateurs en libre-service", "sessions mobiles",
           "nouvelles inscriptions", "la région EMEA", "comptes d'essai",
           "la file d'attente du support"],
    "de": ["Enterprise-Konten", "Self-Service-Nutzer", "mobile Sitzungen",
           "Neuanmeldungen", "die EMEA-Region", "Testkonten",
           "die Support-Warteschlange"],
}

MODEL_NAME = "mock-insight-engine-v1"

# How many insights a single prompt can produce. The upper end sits well
# above the pagination threshold so paging is easy to exercise.
MIN_RESULTS = 4
MAX_RESULTS = 28


@lru_cache(maxsize=1)
def _catalog() -> dict[str, Any]:
    with settings.seed_path.open(encoding="utf-8") as handle:
        return json.load(handle)


def prompt_fingerprint(prompt: str, language: str) -> str:
    """Stable hash of a question. Used both as a seed and as a cache key."""
    payload = f"{text.normalize(prompt)}|{language}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _rng(fingerprint: str) -> random.Random:
    return random.Random(int(fingerprint[:16], 16))


def _localized(entry: dict[str, Any], language: str) -> dict[str, str]:
    translations = entry["translations"]
    return translations.get(language) or translations[settings.default_language]


def _category_label(category: str, language: str) -> str:
    labels = _catalog()["categoryLabels"].get(category, {})
    return labels.get(language) or labels.get(settings.default_language) or category


def generate(prompt: str, language: str) -> list[dict[str, Any]]:
    """Produce the full insight set for a prompt. Never partial, never paged."""
    fingerprint = prompt_fingerprint(prompt, language)
    rng = _rng(fingerprint)

    templates = _catalog()["templates"]
    segments = SEGMENTS.get(language) or SEGMENTS[settings.default_language]
    base_topic = text.extract_topic(prompt)

    count = rng.randint(MIN_RESULTS, MAX_RESULTS)
    order = list(range(len(templates)))
    rng.shuffle(order)

    now = datetime.now(timezone.utc)
    insights: list[dict[str, Any]] = []

    for index in range(count):
        template = templates[order[index % len(templates)]]
        copy = _localized(template, language)

        # First pass through the templates talks about the topic itself;
        # later passes narrow it to a segment.
        pass_number = index // len(templates)
        segment = segments[index % len(segments)]
        topic = base_topic if pass_number == 0 else f"{base_topic} ({segment})"

        low, high = template["valueRange"]
        value = rng.randint(low, high)
        window = rng.choice(template["windowValues"])
        fields = {"topic": topic, "value": value, "window": window}

        insights.append(
            {
                "id": f"ins_{index:03d}_{template['key']}",
                "title": copy["title"].format(**fields),
                "content": copy["content"].format(**fields),
                "category": template["category"],
                "categoryLabel": _category_label(template["category"], language),
                "tags": list(template["tags"]),
                "source": template["source"],
                "segment": segment if pass_number > 0 else None,
                "confidence": round(rng.uniform(0.55, 0.98), 2),
                "language": language,
                "createdAt": (
                    now - timedelta(minutes=rng.randint(0, 60 * 24 * 21))
                ).isoformat(timespec="seconds"),
            }
        )

    return insights
