"""Requests that should never reach the AI service."""

from __future__ import annotations

import pytest

from tests.conftest import API


def test_health(client):
    response = client.get(f"{API}/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_missing_prompt(client):
    response = client.post(f"{API}/insights", json={"targetLanguage": "en"})
    assert response.status_code == 400
    body = response.json()
    assert body["error"] == "MISSING_PROMPT"
    assert "message" in body


def test_empty_prompt(client):
    response = client.post(
        f"{API}/insights", json={"prompt": "   ", "targetLanguage": "en"}
    )
    assert response.status_code == 400
    assert response.json()["error"] == "INVALID_PROMPT"


def test_missing_language(client):
    response = client.post(f"{API}/insights", json={"prompt": "analyse churn drivers"})
    assert response.status_code == 400
    assert response.json()["error"] == "MISSING_LANGUAGE"


@pytest.mark.parametrize("language", ["zz", "jp", "kl"])
def test_unsupported_language(client, language):
    response = client.post(
        f"{API}/insights",
        json={"prompt": "analyse churn drivers", "targetLanguage": language},
    )
    assert response.status_code == 400
    body = response.json()
    assert body["error"] == "INVALID_LANGUAGE"
    assert body["message"] == "Target language is not supported"
    assert "en" in body["details"]["supportedLanguages"]


@pytest.mark.parametrize("language", ["english", "e", "en-US", "12"])
def test_malformed_language(client, language):
    response = client.post(
        f"{API}/insights",
        json={"prompt": "analyse churn drivers", "targetLanguage": language},
    )
    assert response.status_code == 400
    assert response.json()["error"] == "INVALID_LANGUAGE"


def test_language_case_is_normalised(client):
    response = client.post(
        f"{API}/insights",
        json={"prompt": "analyse churn drivers by segment", "targetLanguage": "DE"},
    )
    assert response.status_code == 200
    assert response.json()["targetLanguage"] == "de"


def test_language_is_checked_before_the_prompt(client):
    """An unsupported language wins even when the prompt is also unusable."""
    response = client.post(
        f"{API}/insights", json={"prompt": "", "targetLanguage": "zz"}
    )
    assert response.json()["error"] == "INVALID_LANGUAGE"


def test_unknown_field_is_rejected(client):
    response = client.post(
        f"{API}/insights",
        json={
            "prompt": "analyse churn drivers",
            "targetLanguage": "en",
            "temperature": 0.7,
        },
    )
    assert response.status_code == 400
    assert response.json()["error"] == "VALIDATION_ERROR"


def test_invalid_context_id(client):
    response = client.post(
        f"{API}/insights",
        json={
            "prompt": "analyse churn drivers",
            "targetLanguage": "en",
            "contextId": "not-a-uuid",
        },
    )
    assert response.status_code == 400
    assert response.json()["error"] == "INVALID_CONTEXT_ID"


@pytest.mark.parametrize("page_size", [0, -3, 5000])
def test_invalid_page_size(client, page_size):
    response = client.post(
        f"{API}/insights",
        json={
            "prompt": "analyse churn drivers",
            "targetLanguage": "en",
            "pageSize": page_size,
        },
    )
    assert response.status_code == 400
    assert response.json()["error"] == "INVALID_PAGINATION"


def test_prompt_too_long(client):
    response = client.post(
        f"{API}/insights",
        json={"prompt": "a" * 2001, "targetLanguage": "en"},
    )
    assert response.status_code == 400
    assert response.json()["error"] == "PROMPT_TOO_LONG"
