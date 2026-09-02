"""The orchestration layer — the actual middleware.

Order of operations matters here and mirrors the brief:

    1. validate strictly            -> 4xx, nothing downstream runs
    2. decide if we should ask back -> NEEDS_CLARIFICATION, still nothing downstream
    3. only then call the AI        -> and cache the result against the context
    4. page the stored result       -> pagination applied above the threshold
"""

from __future__ import annotations

import math
import time
from datetime import datetime, timezone
from uuid import uuid4

from app.core import messages
from app.core.config import settings
from app.core.errors import ApiError, ErrorCode
from app.db import repository
from app.schemas.requests import InsightRequest
from app.schemas.responses import (
    ClarificationReason,
    ClarificationResponse,
    Insight,
    InsightData,
    Pagination,
    ResponseMeta,
    SuccessResponse,
)
from app.services import ai_client, clarification, text
from app.services.validation import validate_request


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def _elapsed_ms(started: float) -> int:
    return max(0, round((time.perf_counter() - started) * 1000))


def _plan_pagination(
    *, total_items: int, requested_page: int, requested_page_size: int
) -> tuple[int, int, Pagination]:
    """Work out the slice to read and the metadata describing it.

    Result sets at or below the threshold come back whole, with `paginated`
    false, so small answers do not make the client render paging controls
    it does not need.
    """
    if total_items <= settings.pagination_threshold:
        if requested_page > 1:
            raise ApiError(
                ErrorCode.PAGE_OUT_OF_RANGE,
                "Requested page is beyond the end of the result set",
                details={"requestedPage": requested_page, "totalPages": 1},
            )
        return (
            0,
            max(total_items, 1),
            Pagination(
                page=1,
                page_size=total_items,
                total_items=total_items,
                total_pages=1,
                has_next_page=False,
                has_previous_page=False,
                paginated=False,
            ),
        )

    total_pages = max(1, math.ceil(total_items / requested_page_size))
    if requested_page > total_pages:
        raise ApiError(
            ErrorCode.PAGE_OUT_OF_RANGE,
            "Requested page is beyond the end of the result set",
            details={"requestedPage": requested_page, "totalPages": total_pages},
        )

    return (
        (requested_page - 1) * requested_page_size,
        requested_page_size,
        Pagination(
            page=requested_page,
            page_size=requested_page_size,
            total_items=total_items,
            total_pages=total_pages,
            has_next_page=requested_page < total_pages,
            has_previous_page=requested_page > 1,
            paginated=True,
        ),
    )


def _build_success(
    *,
    context_id: str,
    prompt: str,
    language: str,
    conversation: repository.StoredConversation,
    page: int,
    page_size: int,
    cached: bool,
    started: float,
) -> SuccessResponse:
    offset, limit, pagination = _plan_pagination(
        total_items=conversation.total_items,
        requested_page=page,
        requested_page_size=page_size,
    )
    rows, _ = repository.fetch_page(context_id, offset=offset, limit=limit)
    topic = text.extract_topic(prompt)

    return SuccessResponse(
        context_id=context_id,
        target_language=language,
        prompt=prompt,
        data=InsightData(
            topic=topic,
            summary=messages.summary(language, conversation.total_items, topic),
            insights=[Insight.model_validate(row) for row in rows],
            pagination=pagination,
        ),
        meta=ResponseMeta(
            generated_at=conversation.updated_at,
            model=ai_client.MODEL_NAME,
            cached=cached,
            processing_time_ms=_elapsed_ms(started),
            turn_count=conversation.turn_count,
        ),
    )


def submit_prompt(request: InsightRequest) -> SuccessResponse | ClarificationResponse:
    """Handle one POST. Raises ApiError for anything the client got wrong."""
    started = time.perf_counter()

    validated = validate_request(request.prompt, request.target_language)
    prompt, language = validated.prompt, validated.language

    # A client-supplied contextId is adopted as-is so a conversation can be
    # continued; an absent one starts a new conversation.
    context_id = str(request.context_id) if request.context_id else str(uuid4())
    existing = repository.get_conversation(context_id)

    decision = clarification.assess(prompt, language)
    if decision.needed:
        # Short-circuit: the AI service is never called.
        return ClarificationResponse(
            context_id=context_id,
            target_language=language,
            prompt=prompt,
            message=messages.clarification_message(language),
            reasons=[
                ClarificationReason(code=reason.code, message=reason.message)
                for reason in decision.reasons
            ],
            suggestions=messages.suggestions(language),
            meta=ResponseMeta(
                generated_at=_now_iso(),
                model=ai_client.MODEL_NAME,
                cached=False,
                processing_time_ms=_elapsed_ms(started),
                turn_count=(existing.turn_count + 1) if existing else 1,
            ),
        )

    fingerprint = ai_client.prompt_fingerprint(prompt, language)
    cached = existing is not None and existing.prompt_hash == fingerprint

    if cached:
        conversation = existing
    else:
        insights = ai_client.generate(prompt, language)
        conversation = repository.save_generation(
            context_id=context_id,
            prompt=prompt,
            prompt_hash=fingerprint,
            target_language=language,
            insights=insights,
        )

    return _build_success(
        context_id=context_id,
        prompt=prompt,
        language=language,
        conversation=conversation,
        page=request.page,
        page_size=request.page_size,
        cached=cached,
        started=started,
    )


def get_page(context_id: str, *, page: int, page_size: int) -> SuccessResponse:
    """Read a further page of an existing conversation. No generation happens."""
    started = time.perf_counter()

    conversation = repository.get_conversation(context_id)
    if conversation is None:
        raise ApiError(
            ErrorCode.CONTEXT_NOT_FOUND,
            "No results are stored for this context",
            status_code=404,
            details={"contextId": context_id},
        )

    return _build_success(
        context_id=context_id,
        prompt=conversation.prompt,
        language=conversation.target_language,
        conversation=conversation,
        page=page,
        page_size=page_size,
        cached=True,
        started=started,
    )
