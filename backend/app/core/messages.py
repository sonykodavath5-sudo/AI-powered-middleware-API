"""User-facing copy, kept out of the business logic.

Clarification prompts come back in the language the caller asked for, since
that is the one language we already know they read. Error messages stay in
English on purpose: they are developer-facing and pair with a stable code.
"""

from __future__ import annotations

from app.core.config import settings

CLARIFICATION_MESSAGES: dict[str, str] = {
    "en": "Please provide more details",
    "es": "Por favor, proporcione más detalles",
    "fr": "Veuillez fournir plus de détails",
    "de": "Bitte geben Sie weitere Details an",
}

CLARIFICATION_REASONS: dict[str, dict[str, str]] = {
    "PROMPT_TOO_SHORT": {
        "en": "The prompt is shorter than {min_length} characters.",
        "es": "La consulta tiene menos de {min_length} caracteres.",
        "fr": "La requête compte moins de {min_length} caractères.",
        "de": "Die Anfrage ist kürzer als {min_length} Zeichen.",
    },
    "PROMPT_TOO_VAGUE": {
        "en": "The prompt needs at least {min_words} meaningful words to work with.",
        "es": "La consulta necesita al menos {min_words} palabras con contenido.",
        "fr": "La requête doit contenir au moins {min_words} mots porteurs de sens.",
        "de": "Die Anfrage benötigt mindestens {min_words} aussagekräftige Wörter.",
    },
    "PROMPT_LACKS_SUBJECT": {
        "en": "The prompt does not name a subject to analyse.",
        "es": "La consulta no indica ningún tema que analizar.",
        "fr": "La requête n'indique aucun sujet à analyser.",
        "de": "Die Anfrage nennt kein Thema, das analysiert werden kann.",
    },
    "PROMPT_NOT_MEANINGFUL": {
        "en": "The prompt contains no readable words.",
        "es": "La consulta no contiene palabras legibles.",
        "fr": "La requête ne contient aucun mot lisible.",
        "de": "Die Anfrage enthält keine lesbaren Wörter.",
    },
}

SUGGESTIONS: dict[str, list[str]] = {
    "en": [
        "Name the product, team or metric you want analysed.",
        "Say what time period matters — last week, last quarter, year to date.",
        "Tell us what decision the answer should support.",
    ],
    "es": [
        "Indique el producto, equipo o métrica que quiere analizar.",
        "Precise el periodo relevante: la última semana, el último trimestre, el año en curso.",
        "Explique qué decisión debería respaldar la respuesta.",
    ],
    "fr": [
        "Nommez le produit, l'équipe ou l'indicateur à analyser.",
        "Précisez la période concernée : la semaine dernière, le dernier trimestre, l'année en cours.",
        "Indiquez la décision que la réponse doit éclairer.",
    ],
    "de": [
        "Nennen Sie das Produkt, Team oder die Kennzahl, die analysiert werden soll.",
        "Geben Sie den relevanten Zeitraum an: letzte Woche, letztes Quartal, laufendes Jahr.",
        "Beschreiben Sie, welche Entscheidung die Antwort stützen soll.",
    ],
}

SUMMARY_TEMPLATES: dict[str, str] = {
    "en": "Found {count} insights for “{topic}”.",
    "es": "Se encontraron {count} conclusiones sobre «{topic}».",
    "fr": "{count} analyses trouvées pour « {topic} ».",
    "de": "{count} Erkenntnisse zu „{topic}“ gefunden.",
}


def _pick(catalog: dict[str, str], language: str) -> str:
    return catalog.get(language) or catalog[settings.default_language]


def clarification_message(language: str) -> str:
    return _pick(CLARIFICATION_MESSAGES, language)


def clarification_reason(code: str, language: str, **fmt: object) -> str:
    catalog = CLARIFICATION_REASONS.get(code)
    if not catalog:
        return code
    return _pick(catalog, language).format(**fmt)


def suggestions(language: str) -> list[str]:
    return SUGGESTIONS.get(language) or SUGGESTIONS[settings.default_language]


def summary(language: str, count: int, topic: str) -> str:
    return _pick(SUMMARY_TEMPLATES, language).format(count=count, topic=topic)
