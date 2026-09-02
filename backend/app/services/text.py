"""Small text helpers shared by the clarification gate and the mock AI.

Both need the same notion of "a word that actually carries meaning", so it
lives in one place. The stop-word list covers the four supported languages
plus the filler people type at a chat box ("hi", "please", "tell me").
"""

from __future__ import annotations

import re
import unicodedata

# Unicode-aware word matcher: letters and digits, no punctuation.
_WORD_RE = re.compile(r"[^\W_]+", re.UNICODE)

STOPWORDS: frozenset[str] = frozenset(
    {
        # English
        "a", "an", "and", "are", "as", "at", "be", "but", "by", "can", "could",
        "did", "do", "does", "for", "from", "get", "give", "had", "has", "have",
        "he", "her", "him", "his", "how", "i", "if", "in", "is", "it", "its",
        "me", "more", "my", "of", "on", "or", "our", "please", "she", "should",
        "so", "some", "tell", "that", "the", "their", "them", "then", "there",
        "these", "they", "this", "to", "us", "want", "was", "we", "were", "what",
        "when", "where", "which", "who", "why", "will", "with", "would", "you",
        "your", "hi", "hey", "hello", "thanks", "thank", "ok", "okay", "yes",
        "no", "just", "about", "any", "all", "much", "many", "need", "know",
        # English filler and request verbs — people type these around the
        # actual subject, so they never count as the subject themselves.
        "help", "show", "explain", "find", "look", "see", "make", "let",
        "use", "using", "via", "into", "across", "than", "also", "very",
        "really", "something", "anything", "thing", "things", "stuff",
        "analyse", "analyze", "summarise", "summarize", "report", "again",
        # Spanish
        "de", "la", "el", "los", "las", "un", "una", "unos", "unas", "y", "o",
        "que", "en", "por", "para", "con", "sin", "del", "al", "se", "es",
        "son", "como", "más", "mas", "sobre", "dime", "hola", "gracias",
        "quiero", "puedes", "favor",
        # French
        "le", "les", "des", "du", "une", "et", "ou", "que", "qui", "dans",
        "pour", "avec", "sans", "sur", "est", "sont", "plus", "je", "tu", "il",
        "elle", "nous", "vous", "ils", "elles", "ce", "cette", "bonjour",
        "merci", "veux", "peux", "dis", "moi",
        # German
        "der", "die", "das", "den", "dem", "des", "ein", "eine", "einen",
        "und", "oder", "aber", "mit", "ohne", "für", "fur", "auf", "ist",
        "sind", "war", "ich", "du", "er", "sie", "wir", "ihr", "mir", "mich",
        "was", "wie", "wer", "wo", "hallo", "danke", "bitte", "mehr", "sag",
        "zeig", "über", "uber", "von", "zu", "im",
    }
)


def normalize(text: str) -> str:
    """Collapse whitespace and case so the same question hashes the same way."""
    return " ".join(text.strip().lower().split())


def tokenize(text: str) -> list[str]:
    return _WORD_RE.findall(text.lower())


def meaningful_tokens(text: str, *, min_length: int = 3) -> list[str]:
    """Words that could plausibly be the subject of a question."""
    return [
        token
        for token in tokenize(text)
        if token not in STOPWORDS and len(token) >= min_length
    ]


def _title_case(word: str) -> str:
    # str.title() mangles accented characters less predictably than this.
    return word[:1].upper() + word[1:]


def extract_topic(prompt: str, *, max_words: int = 3, fallback: str = "your request") -> str:
    """Best guess at what the prompt is about, used to fill in insight text."""
    words = meaningful_tokens(prompt)[:max_words]
    if not words:
        words = tokenize(prompt)[:max_words]
    if not words:
        return fallback
    return " ".join(_title_case(word) for word in words)


def strip_accents(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch))
