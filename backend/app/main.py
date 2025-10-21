import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .cache import TranslationCache
from .config import Config, load_config
from .llm_client import OpenAICompatibleClient
from .models import (
    ErrorResponse,
    HealthResponse,
    LanguageListResponse,
    TranslationRequest,
    TranslationResponse,
)

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

config: Config
cache: TranslationCache
llm_client: OpenAICompatibleClient


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    global config, cache, llm_client

    config = load_config("config.yaml")
    logger.info("Configuration loaded successfully")

    cache = TranslationCache(config.cache.path)
    await cache.initialize()
    logger.info(f"Cache initialized at {config.cache.path}")

    await cache.clear_expired(config.cache.ttl_days)

    llm_client = OpenAICompatibleClient(
        endpoint=config.llm.primary.endpoint,
        timeout=config.llm.primary.timeout,
        model=config.llm.primary.model_name,
    )
    logger.info(f"LLM client initialized for {config.llm.primary.provider}")

    yield

    await cache.close()
    logger.info("Cache closed")


app = FastAPI(title="Context Translator API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Any, exc: Exception) -> JSONResponse:
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error="Internal server error", details="An unexpected error occurred"
        ).model_dump(),
    )


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(status="healthy", llm_checked=False)


@app.get("/languages", response_model=LanguageListResponse)
async def get_languages() -> LanguageListResponse:
    return LanguageListResponse(languages=config.translation.supported_languages)


@app.post("/translate", response_model=TranslationResponse)
async def translate(request: TranslationRequest) -> TranslationResponse:
    if len(request.text) > config.translation.max_text_length:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=ErrorResponse(
                error="Text is too long",
                details=f"Maximum length is {config.translation.max_text_length} characters, "
                f"received {len(request.text)}",
            ).model_dump(),
        )

    if request.source_lang not in config.translation.supported_languages:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=ErrorResponse(
                error="Invalid source language",
                details=f"'{request.source_lang}' is not in supported languages",
            ).model_dump(),
        )

    if request.target_lang not in config.translation.supported_languages:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=ErrorResponse(
                error="Invalid target language",
                details=f"'{request.target_lang}' is not in supported languages",
            ).model_dump(),
        )

    cache_key = cache._generate_key(
        request.text, request.source_lang, request.target_lang, request.context
    )

    cached_translation = await cache.get(cache_key)
    if cached_translation:
        logger.info(f"Translation: {request.source_lang} -> {request.target_lang} (cached)")
        return TranslationResponse(translation=cached_translation, cached=True)

    try:
        translation = await llm_client.translate(
            request.text, request.source_lang, request.target_lang, request.context
        )

        await cache.set(
            cache_key,
            request.text,
            request.source_lang,
            request.target_lang,
            translation,
        )

        logger.info(f"Translation: {request.source_lang} -> {request.target_lang} (new)")
        return TranslationResponse(translation=translation, cached=False)

    except ValueError as e:
        logger.error(f"Translation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error="Translation failed", details="Could not process translation. Please try again."
            ).model_dump(),
        ) from e
    except Exception as e:
        logger.error(f"Unexpected error during translation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=ErrorResponse(
                error="Translation server is not responding",
                details=f"Is {config.llm.primary.provider} running on {config.llm.primary.endpoint}?",
            ).model_dump(),
        ) from e


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
