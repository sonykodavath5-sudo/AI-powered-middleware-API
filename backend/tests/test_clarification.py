"""Prompts that are valid but not answerable yet."""

from __future__ import annotations

import pytest

from tests.conftest import API


def _submit(client, prompt: str, language: str = "en"):
    return client.post(
        f"{API}/insights", json={"prompt": prompt, "targetLanguage": language}
    )


@pytest.mark.parametrize("prompt", ["hi", "abc", "?!", "  ok  "])
def test_short_prompts_need_clarification(client, prompt):
    response = _submit(client, prompt)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "NEEDS_CLARIFICATION"
    assert body["message"] == "Please provide more details"
    codes = {reason["code"] for reason in body["reasons"]}
    assert "PROMPT_TOO_SHORT" in codes


@pytest.mark.parametrize(
    "prompt",
    ["tell me more please", "what about it", "can you help me with this"],
)
def test_prompts_without_a_subject_need_clarification(client, prompt):
    body = _submit(client, prompt).json()
    assert body["status"] == "NEEDS_CLARIFICATION"
    codes = {reason["code"] for reason in body["reasons"]}
    assert "PROMPT_LACKS_SUBJECT" in codes


def test_single_word_prompt_is_too_vague(client):
    body = _submit(client, "revenue").json()
    assert body["status"] == "NEEDS_CLARIFICATION"
    codes = {reason["code"] for reason in body["reasons"]}
    assert "PROMPT_TOO_VAGUE" in codes


def test_clarification_carries_suggestions_and_context(client):
    body = _submit(client, "hi").json()
    assert body["contextId"]
    assert len(body["suggestions"]) >= 1
    assert body["meta"]["cached"] is False


def test_clarification_is_localised(client):
    body = _submit(client, "hi", language="de").json()
    assert body["status"] == "NEEDS_CLARIFICATION"
    assert body["message"] == "Bitte geben Sie weitere Details an"
    assert "Zeichen" in body["reasons"][0]["message"]


def test_clarification_does_not_store_a_result_set(client):
    """Nothing went downstream, so there is nothing to page through."""
    body = _submit(client, "hi").json()
    follow_up = client.get(f"{API}/insights/{body['contextId']}")
    assert follow_up.status_code == 404
    assert follow_up.json()["error"] == "CONTEXT_NOT_FOUND"
