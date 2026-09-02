"""Application entry point.

Run it with:  uvicorn app.main:app --reload  (from the backend/ directory)
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app import __version__
from app.api.routes import router
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.db.database import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_db()
    logging.getLogger(__name__).info(
        "%s %s ready — languages: %s",
        settings.app_name,
        __version__,
        ", ".join(settings.supported_languages),
    )
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=__version__,
        description=(
            "Middleware between a frontend client and an AI service. It validates "
            "requests, gates prompts that need clarification, and paginates results."
        ),
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)
    app.include_router(router, prefix=settings.api_prefix)

    @app.get("/", include_in_schema=False)
    def root() -> RedirectResponse:
        return RedirectResponse(url="/docs")

    return app


app = create_app()
