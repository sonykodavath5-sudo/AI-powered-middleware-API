"""Request contract.

Pydantic handles shape and type; anything that needs a domain-specific
error code (an empty prompt, an unsupported language) is checked in
`services.validation` so the client gets a code it can branch on rather
than a generic 422.
"""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from app.core.config import settings


class InsightRequest(BaseModel):
    # extra="forbid" is deliberate: a typo'd field name should fail loudly
    # rather than be silently ignored.
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, extra="forbid"
    )

    prompt: str
    target_language: str
    context_id: UUID | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(
        default=settings.default_page_size, ge=1, le=settings.max_page_size
    )
