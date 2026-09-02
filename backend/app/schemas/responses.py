"""Response contract.

Two shapes come back with a 200: SUCCESS and NEEDS_CLARIFICATION. They
share a `status` discriminator so the client can switch on one field.
Anything else is a 4xx/5xx using the error envelope in `core.errors`.

Field names are snake_case in Python and camelCase on the wire — the alias
generator handles the translation in both directions.
"""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, extra="forbid"
    )


class Insight(CamelModel):
    id: str
    title: str
    content: str
    category: str
    category_label: str
    tags: list[str]
    source: str
    segment: str | None = None
    confidence: float
    language: str
    created_at: str


class Pagination(CamelModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int
    has_next_page: bool
    has_previous_page: bool
    # False when the whole result set fitted in one page and no paging was
    # applied — the client uses this to hide its pagination controls.
    paginated: bool


class ResponseMeta(CamelModel):
    generated_at: str
    model: str
    cached: bool
    processing_time_ms: int
    turn_count: int


class InsightData(CamelModel):
    topic: str
    summary: str
    insights: list[Insight]
    pagination: Pagination


class SuccessResponse(CamelModel):
    status: Literal["SUCCESS"] = "SUCCESS"
    context_id: str
    target_language: str
    prompt: str
    data: InsightData
    meta: ResponseMeta


class ClarificationReason(CamelModel):
    code: str
    message: str


class ClarificationResponse(CamelModel):
    status: Literal["NEEDS_CLARIFICATION"] = "NEEDS_CLARIFICATION"
    context_id: str
    target_language: str
    prompt: str
    message: str
    reasons: list[ClarificationReason]
    suggestions: list[str]
    meta: ResponseMeta


# The client discriminates on `status`; so does the OpenAPI schema.
InsightEnvelope = Annotated[
    SuccessResponse | ClarificationResponse, Field(discriminator="status")
]


class ErrorResponse(CamelModel):
    """Documented here so it shows up in the generated OpenAPI schema."""

    error: str
    message: str
    details: dict | None = None


class HealthResponse(CamelModel):
    status: Literal["ok"] = "ok"
    version: str
    supported_languages: list[str]
