"""Structured error contract.

Every failure leaving this service — raised by us, raised by FastAPI's
request validation, or entirely unexpected — is serialised into the same
envelope so the client only ever writes one error branch:

    {"error": "INVALID_LANGUAGE", "message": "...", "details": {...}}
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class ErrorCode:
    """Machine-readable codes. The client switches on these, not on prose."""

    MISSING_PROMPT = "MISSING_PROMPT"
    INVALID_PROMPT = "INVALID_PROMPT"
    PROMPT_TOO_LONG = "PROMPT_TOO_LONG"
    MISSING_LANGUAGE = "MISSING_LANGUAGE"
    INVALID_LANGUAGE = "INVALID_LANGUAGE"
    INVALID_CONTEXT_ID = "INVALID_CONTEXT_ID"
    CONTEXT_NOT_FOUND = "CONTEXT_NOT_FOUND"
    INVALID_PAGINATION = "INVALID_PAGINATION"
    PAGE_OUT_OF_RANGE = "PAGE_OUT_OF_RANGE"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    METHOD_NOT_ALLOWED = "METHOD_NOT_ALLOWED"
    INTERNAL_ERROR = "INTERNAL_ERROR"


class ApiError(Exception):
    """An error we raise deliberately, carrying its own HTTP status."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}

    def to_payload(self) -> dict[str, Any]:
        payload: dict[str, Any] = {"error": self.code, "message": self.message}
        if self.details:
            payload["details"] = self.details
        return payload


# --------------------------------------------------------------------------
# Mapping FastAPI/Pydantic validation failures onto our own codes.
# --------------------------------------------------------------------------

_FIELD_ALIASES = {"target_language": "targetLanguage", "context_id": "contextId",
                  "page_size": "pageSize"}

_MISSING_FIELD_CODES = {
    "prompt": ErrorCode.MISSING_PROMPT,
    "targetLanguage": ErrorCode.MISSING_LANGUAGE,
}

_INVALID_FIELD_CODES = {
    "prompt": ErrorCode.INVALID_PROMPT,
    "targetLanguage": ErrorCode.INVALID_LANGUAGE,
    "contextId": ErrorCode.INVALID_CONTEXT_ID,
    "page": ErrorCode.INVALID_PAGINATION,
    "pageSize": ErrorCode.INVALID_PAGINATION,
}


def _field_name(location: tuple[Any, ...]) -> str:
    # ("body", "target_language") -> "targetLanguage"
    parts = [str(p) for p in location if p not in ("body", "query", "path")]
    name = parts[-1] if parts else "request"
    return _FIELD_ALIASES.get(name, name)


def _translate_validation_error(exc: RequestValidationError) -> ApiError:
    raw_errors = exc.errors()
    fields = [
        {
            "field": _field_name(err.get("loc", ())),
            "issue": err.get("msg", "Invalid value"),
            "type": err.get("type", "value_error"),
        }
        for err in raw_errors
    ]

    first = raw_errors[0] if raw_errors else {}
    field = _field_name(first.get("loc", ()))
    is_missing = str(first.get("type", "")).startswith("missing")

    code = (
        _MISSING_FIELD_CODES.get(field, ErrorCode.VALIDATION_ERROR)
        if is_missing
        else _INVALID_FIELD_CODES.get(field, ErrorCode.VALIDATION_ERROR)
    )
    message = (
        f"'{field}' is required"
        if is_missing
        else f"'{field}' is invalid: {first.get('msg', 'Invalid value')}"
    )
    return ApiError(code, message, status_code=400, details={"fields": fields})


def register_exception_handlers(app: FastAPI) -> None:
    """Attach the handlers that guarantee the error envelope."""

    @app.exception_handler(ApiError)
    async def _handle_api_error(_: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=exc.to_payload())

    @app.exception_handler(RequestValidationError)
    async def _handle_validation_error(
        _: Request, exc: RequestValidationError
    ) -> JSONResponse:
        api_error = _translate_validation_error(exc)
        return JSONResponse(
            status_code=api_error.status_code, content=api_error.to_payload()
        )

    @app.exception_handler(StarletteHTTPException)
    async def _handle_http_error(
        _: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        code = {
            404: ErrorCode.NOT_FOUND,
            405: ErrorCode.METHOD_NOT_ALLOWED,
        }.get(exc.status_code, ErrorCode.VALIDATION_ERROR)
        if exc.status_code >= 500:
            code = ErrorCode.INTERNAL_ERROR
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": code, "message": str(exc.detail)},
        )

    @app.exception_handler(Exception)
    async def _handle_unexpected(_: Request, exc: Exception) -> JSONResponse:
        # Never leak internals to the client; the stack trace goes to the log.
        logger.exception("Unhandled error while processing request", exc_info=exc)
        return JSONResponse(
            status_code=500,
            content={
                "error": ErrorCode.INTERNAL_ERROR,
                "message": "An unexpected error occurred while processing the request",
            },
        )
