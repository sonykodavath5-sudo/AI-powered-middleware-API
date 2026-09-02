"""Successful generation, caching and pagination."""

from __future__ import annotations

import pytest

from tests.conftest import API


def _submit(client, prompt: str, **extra):
    payload = {"prompt": prompt, "targetLanguage": "en"}
    payload.update(extra)
    return client.post(f"{API}/insights", json=payload)


def test_successful_response_shape(client):
    body = _submit(client, "analyse churn drivers for enterprise accounts").json()

    assert body["status"] == "SUCCESS"
    assert body["contextId"]
    assert body["targetLanguage"] == "en"

    insights = body["data"]["insights"]
    assert insights, "expected at least one insight"

    first = insights[0]
    for field in (
        "id", "title", "content", "category", "categoryLabel",
        "tags", "source", "confidence", "language", "createdAt",
    ):
        assert field in first
    assert first["language"] == "en"
    assert 0 < first["confidence"] <= 1


def test_generation_is_deterministic(client):
    prompt = "analyse churn drivers for enterprise accounts"
    first = _submit(client, prompt).json()
    second = _submit(client, prompt).json()

    # Different conversations, identical content.
    assert first["contextId"] != second["contextId"]
    assert first["data"]["pagination"]["totalItems"] == second["data"]["pagination"]["totalItems"]
    assert [i["title"] for i in first["data"]["insights"]] == [
        i["title"] for i in second["data"]["insights"]
    ]


@pytest.mark.parametrize("language", ["en", "es", "fr", "de"])
def test_insights_come_back_in_the_requested_language(client, language):
    response = client.post(
        f"{API}/insights",
        json={
            "prompt": "analyse churn drivers for enterprise accounts",
            "targetLanguage": language,
        },
    )
    body = response.json()
    assert body["targetLanguage"] == language
    assert all(i["language"] == language for i in body["data"]["insights"])


def test_reusing_a_context_serves_from_cache(client):
    prompt = "analyse churn drivers for enterprise accounts"
    first = _submit(client, prompt).json()
    assert first["meta"]["cached"] is False

    second = _submit(client, prompt, contextId=first["contextId"]).json()
    assert second["contextId"] == first["contextId"]
    assert second["meta"]["cached"] is True


def test_changing_the_prompt_regenerates_the_context(client):
    first = _submit(client, "analyse churn drivers for enterprise accounts").json()
    second = _submit(
        client, "analyse latency across the checkout flow", contextId=first["contextId"]
    ).json()

    assert second["contextId"] == first["contextId"]
    assert second["meta"]["cached"] is False
    assert second["meta"]["turnCount"] == 2


# --------------------------------------------------------------------------
# Pagination
# --------------------------------------------------------------------------

def test_small_result_sets_are_not_paginated(client, small_prompt):
    pagination = _submit(client, small_prompt).json()["data"]["pagination"]
    assert pagination["totalItems"] <= 10
    assert pagination["paginated"] is False
    assert pagination["totalPages"] == 1
    assert pagination["hasNextPage"] is False


def test_large_result_sets_are_paginated(client, large_prompt):
    body = _submit(client, large_prompt).json()
    pagination = body["data"]["pagination"]

    assert pagination["totalItems"] > 10
    assert pagination["paginated"] is True
    assert pagination["page"] == 1
    assert pagination["pageSize"] == 10
    assert pagination["hasNextPage"] is True
    assert pagination["hasPreviousPage"] is False
    assert len(body["data"]["insights"]) == 10


def test_second_page_continues_the_same_result_set(client, large_prompt):
    first = _submit(client, large_prompt).json()
    context_id = first["contextId"]

    second = client.get(f"{API}/insights/{context_id}", params={"page": 2}).json()

    assert second["data"]["pagination"]["page"] == 2
    assert second["data"]["pagination"]["hasPreviousPage"] is True
    assert second["data"]["pagination"]["totalItems"] == first["data"]["pagination"]["totalItems"]

    first_ids = {i["id"] for i in first["data"]["insights"]}
    second_ids = {i["id"] for i in second["data"]["insights"]}
    assert not (first_ids & second_ids), "pages must not overlap"


def test_walking_every_page_returns_each_insight_once(client, large_prompt):
    first = _submit(client, large_prompt).json()
    context_id = first["contextId"]
    total_pages = first["data"]["pagination"]["totalPages"]

    seen: list[str] = [i["id"] for i in first["data"]["insights"]]
    for page in range(2, total_pages + 1):
        body = client.get(f"{API}/insights/{context_id}", params={"page": page}).json()
        seen.extend(i["id"] for i in body["data"]["insights"])

    assert len(seen) == first["data"]["pagination"]["totalItems"]
    assert len(set(seen)) == len(seen)


def test_custom_page_size(client, large_prompt):
    body = _submit(client, large_prompt, pageSize=5).json()
    pagination = body["data"]["pagination"]
    assert pagination["pageSize"] == 5
    assert len(body["data"]["insights"]) == 5


def test_page_beyond_the_end_is_rejected(client, large_prompt):
    first = _submit(client, large_prompt).json()
    context_id = first["contextId"]
    beyond = first["data"]["pagination"]["totalPages"] + 1

    response = client.get(f"{API}/insights/{context_id}", params={"page": beyond})
    assert response.status_code == 400
    assert response.json()["error"] == "PAGE_OUT_OF_RANGE"


def test_unknown_context_returns_404(client):
    response = client.get(f"{API}/insights/11111111-2222-3333-4444-555555555555")
    assert response.status_code == 404
    assert response.json()["error"] == "CONTEXT_NOT_FOUND"


def test_paging_does_not_call_the_ai_service_again(client, large_prompt, monkeypatch):
    context_id = _submit(client, large_prompt).json()["contextId"]

    from app.services import ai_client

    def _fail(*_args, **_kwargs):
        raise AssertionError("the AI service must not be called when paging")

    monkeypatch.setattr(ai_client, "generate", _fail)

    response = client.get(f"{API}/insights/{context_id}", params={"page": 2})
    assert response.status_code == 200


def test_context_can_be_deleted(client, large_prompt):
    context_id = _submit(client, large_prompt).json()["contextId"]

    assert client.delete(f"{API}/insights/{context_id}").status_code == 204
    assert client.get(f"{API}/insights/{context_id}").status_code == 404
