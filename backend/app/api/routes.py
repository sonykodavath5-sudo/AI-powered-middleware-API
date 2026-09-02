"""HTTP layer.

Routes stay thin on purpose: parse, delegate, return. Every decision worth
testing lives in `services`, which is why the test suite can cover the
rules without going through HTTP at all.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query, status

from app import __version__
from app.core.config import settings
from app.db import repository
from app.schemas.requests import InsightRequest
from app.schemas.responses import (
    ErrorResponse,
    HealthResponse,
    InsightEnvelope,
    SuccessResponse,
)
from app.services import insight_service

router = APIRouter()

_ERROR_RESPONSES = {
    400: {"model": ErrorResponse, "description": "Validation failed"},
    404: {"model": ErrorResponse, "description": "Unknown context"},
}


@router.post(
    "/insights",
    response_model=InsightEnvelope,
    responses=_ERROR_RESPONSES,
    summary="Submit a prompt",
    description=(
        "Validates the request, decides whether clarification is needed, and only "
        "then calls the AI service. Returns either SUCCESS with a page of insights "
        "or NEEDS_CLARIFICATION, both with HTTP 200."
    ),
)
def create_insights(payload: InsightRequest):
    return insight_service.submit_prompt(payload)


@router.get(
    "/insights/{context_id}",
    response_model=SuccessResponse,
    responses=_ERROR_RESPONSES,
    summary="Read another page of an existing result set",
    description=(
        "Pages through insights already generated for a context. No prompt is "
        "re-evaluated and the AI service is not called again."
    ),
)
def read_insights_page(
    context_id: UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(
        default=settings.default_page_size,
        ge=1,
        le=settings.max_page_size,
        alias="pageSize",
    ),
):
    return insight_service.get_page(str(context_id), page=page, page_size=page_size)


@router.delete(
    "/insights/{context_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Discard a stored conversation",
)
def delete_context(context_id: UUID) -> None:
    repository.delete_conversation(str(context_id))


@router.get("/languages", summary="Languages this service accepts")
def list_languages() -> dict[str, list[str] | str]:
    return {
        "supported": list(settings.supported_languages),
        "default": settings.default_language,
    }


@router.get("/health", response_model=HealthResponse, summary="Liveness probe")
def health() -> HealthResponse:
    return HealthResponse(
        version=__version__,
        supported_languages=list(settings.supported_languages),
    )
