import logging
import os
import sys
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Annotated, Any, cast

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse

from .cache import TranslationCache
from .config import Config, load_config
from .llm_client import FallbackLLMClient, LLMClient, OpenAICompatibleClient
from .models import (
    ErrorResponse,
    HealthResponse,
    LanguageListResponse,
    TranslationRequest,
    TranslationResponse,
)
from .validation import sanitize_translation_request


def setup_logging() -> None:
    """Configure application logging with console and file handlers."""
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.handlers.clear()

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_formatter = logging.Formatter(log_format)
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)

    log_dir = Path("logs")
    if log_dir.exists() or os.getenv("ENABLE_FILE_LOGGING") == "true":
        log_dir.mkdir(exist_ok=True)
        file_handler = RotatingFileHandler(
            log_dir / "context_translator.log",
            maxBytes=10 * 1024 * 1024,
            backupCount=5,
        )
        file_handler.setLevel(log_level)
        file_formatter = logging.Formatter(log_format)
        file_handler.setFormatter(file_formatter)
        root_logger.addHandler(file_handler)


setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    app.state.config = load_config("config.yaml")
    logger.info("Configuration loaded successfully")

    app.state.cache = TranslationCache(
        app.state.config.cache.path, app.state.config.cache.max_size_mb
    )
    await app.state.cache.initialize()
    logger.info(f"Cache initialized at {app.state.config.cache.path}")

    await app.state.cache.clear_expired(app.state.config.cache.ttl_days)

    primary_client = OpenAICompatibleClient(
        endpoint=app.state.config.llm.primary.endpoint,
        timeout=app.state.config.llm.primary.timeout,
        model=app.state.config.llm.primary.model_name,
    )
    logger.info(f"Primary LLM client initialized for {app.state.config.llm.primary.provider}")

    fallback_client: LLMClient | None = None
    if app.state.config.llm.fallback:
        fallback_client = OpenAICompatibleClient(
            endpoint=app.state.config.llm.fallback.endpoint,
            timeout=app.state.config.llm.fallback.timeout,
            model=app.state.config.llm.fallback.model_name,
        )
        logger.info(
            f"Fallback LLM client initialized for {app.state.config.llm.fallback.provider}"
        )

    app.state.llm_client = FallbackLLMClient(primary_client, fallback_client)

    yield

    await app.state.cache.close()
    logger.info("Cache closed")


app = FastAPI(title="Context Translator API", version="0.1.0", lifespan=lifespan)


def get_config(request: Request) -> Config:
    """Dependency to get the config from app state."""
    return cast(Config, request.app.state.config)


def get_cache(request: Request) -> TranslationCache:
    """Dependency to get the cache from app state."""
    return cast(TranslationCache, request.app.state.cache)


def get_llm_client(request: Request) -> LLMClient:
    """Dependency to get the LLM client from app state."""
    return cast(LLMClient, request.app.state.llm_client)


@app.middleware("http")
async def localhost_only_middleware(request: Request, call_next: Any) -> Any:
    """Ensure requests only come from localhost for security."""
    host = request.headers.get("host", "").split(":")[0]
    if host and host not in ("localhost", "127.0.0.1", "::1", "testserver"):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"error": "Access denied", "details": "API only accessible from localhost"},
        )
    return await call_next(request)


@app.exception_handler(Exception)
async def global_exception_handler(request: Any, exc: Exception) -> JSONResponse:
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error="Internal server error", details="An unexpected error occurred"
        ).model_dump(),
    )


@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Check",
    description="Check if the translation service is running and healthy",
    tags=["System"],
    response_description="Service health status"
)
def health_check() -> HealthResponse:
    return HealthResponse(status="healthy", llm_checked=False)


@app.get(
    "/languages",
    response_model=LanguageListResponse,
    summary="Get Supported Languages",
    description="Retrieve the list of languages supported for translation",
    tags=["Translation"],
    response_description="List of supported language names"
)
def get_languages(
    config: Annotated[Config, Depends(get_config)]
) -> LanguageListResponse:
    return LanguageListResponse(languages=config.translation.supported_languages)


@app.post(
    "/translate",
    response_model=TranslationResponse,
    summary="Translate Text",
    description="""Translate text from source language to target language using local LLM.
    
    Supports context-aware translation by including surrounding text for better accuracy.
    Results are automatically cached to improve performance for repeated translations.
    
    **Features:**
    - Context-aware translation
    - Automatic caching with TTL
    - Input validation and sanitization
    - Support for multiple languages
    """,
    tags=["Translation"],
    response_description="Translated text with cache status",
    responses={
        422: {
            "description": "Invalid input (empty text, unsupported language, text too long)",
            "model": ErrorResponse
        },
        500: {
            "description": "Translation processing failed",
            "model": ErrorResponse
        },
        503: {
            "description": "LLM server is not responding",
            "model": ErrorResponse
        }
    }
)
async def translate(
    request: TranslationRequest,
    config: Annotated[Config, Depends(get_config)],
    cache: Annotated[TranslationCache, Depends(get_cache)],
    llm_client: Annotated[LLMClient, Depends(get_llm_client)],
) -> TranslationResponse:
    try:
        sanitized_text, source_lang, target_lang, sanitized_context = (
            sanitize_translation_request(
                request.text,
                request.source_lang,
                request.target_lang,
                request.context,
                config.translation.supported_languages,
                config.translation.max_text_length,
            )
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=ErrorResponse(
                error="Invalid input",
                details=str(e),
            ).model_dump(),
        ) from e

    cache_key = cache.generate_key(
        sanitized_text, source_lang, target_lang, sanitized_context
    )

    cached_translation = await cache.get(cache_key)
    if cached_translation:
        logger.info(f"Translation: {source_lang} -> {target_lang} (cached)")
        return TranslationResponse(translation=cached_translation, cached=True)

    try:
        translation = await llm_client.translate(
            sanitized_text, source_lang, target_lang, sanitized_context
        )

        await cache.set(
            cache_key,
            sanitized_text,
            source_lang,
            target_lang,
            translation,
        )

        logger.info(f"Translation: {source_lang} -> {target_lang} (new)")
        return TranslationResponse(translation=translation, cached=False)

    except ValueError as e:
        logger.error(f"Translation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="Translation failed",
                details="Could not process translation. Please try again.",
            ).model_dump(),
        ) from e
    except Exception as e:
        logger.error(f"Unexpected error during translation: {e}", exc_info=True)
        provider = config.llm.primary.provider
        endpoint = config.llm.primary.endpoint
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=ErrorResponse(
                error="Translation server is not responding",
                details=f"Is {provider} running on {endpoint}?",
            ).model_dump(),
        ) from e


@app.post(
    "/cache/clear",
    summary="Clear Translation Cache",
    description="Clear all cached translations from the database",
    tags=["System"],
    response_description="Cache clear status"
)
async def clear_cache(
    cache: Annotated[TranslationCache, Depends(get_cache)]
) -> dict[str, str]:
    """Clear all cached translations."""
    await cache.clear()
    logger.info("Cache cleared via API")
    return {"status": "cleared"}


if __name__ == "__main__":
    import os

    import uvicorn

    cert_file = "certs/cert.pem"
    key_file = "certs/key.pem"

    use_https = os.path.exists(cert_file) and os.path.exists(key_file)

    if use_https:
        logger.info("Starting server with HTTPS (certificates found)")
        uvicorn.run(
            app,
            host="localhost",
            port=8080,
            ssl_keyfile=key_file,
            ssl_certfile=cert_file,
        )
    else:
        logger.info("Starting server with HTTP (no certificates found)")
        logger.info("To enable HTTPS, run: ./generate-cert.sh")
        uvicorn.run(app, host="localhost", port=8080)
