from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.db import database
from app.main import app
from app.services import ai_client

API = "/api/v1"


@pytest.fixture(autouse=True)
def isolated_db(tmp_path):
    """Every test gets a fresh database file."""
    original = database.current_path()
    database.configure(tmp_path / "test.db")
    database.init_db()
    yield
    database.configure(original)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def _find_prompt(predicate, label: str) -> str:
    """Search for a prompt whose (deterministic) result set fits a shape."""
    for index in range(500):
        prompt = f"analyse subscription revenue for cohort {index}"
        if predicate(len(ai_client.generate(prompt, "en"))):
            return prompt
    raise AssertionError(f"no prompt produced a {label} result set")


@pytest.fixture(scope="session")
def large_prompt() -> str:
    """A prompt that yields more than one page (> 10 insights)."""
    return _find_prompt(lambda count: count > 10, "paginated")


@pytest.fixture(scope="session")
def small_prompt() -> str:
    """A prompt that fits in a single page (<= 10 insights)."""
    return _find_prompt(lambda count: count <= 10, "single-page")
