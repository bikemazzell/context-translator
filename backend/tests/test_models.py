import pytest
from pydantic import ValidationError

from app.models import (
    ErrorResponse,
    HealthResponse,
    LanguageListResponse,
    TranslationRequest,
    TranslationResponse,
)


def test_translation_request_valid():
    req = TranslationRequest(
        text="Hello", source_lang="English", target_lang="German", context=None
    )
    assert req.text == "Hello"
    assert req.source_lang == "English"
    assert req.target_lang == "German"
    assert req.context is None


def test_translation_request_strips_whitespace():
    req = TranslationRequest(
        text="  Hello  ", source_lang="  English  ", target_lang="  German  "
    )
    assert req.text == "Hello"
    assert req.source_lang == "English"
    assert req.target_lang == "German"


def test_translation_request_strips_context():
    req = TranslationRequest(
        text="Hello",
        source_lang="English",
        target_lang="German",
        context="  Some context  ",
    )
    assert req.context == "Some context"


def test_translation_request_empty_text():
    with pytest.raises(ValidationError):
        TranslationRequest(text="", source_lang="English", target_lang="German")


def test_translation_request_text_too_long():
    long_text = "a" * 501
    with pytest.raises(ValidationError):
        TranslationRequest(text=long_text, source_lang="English", target_lang="German")


def test_translation_response():
    resp = TranslationResponse(translation="Hallo", cached=True)
    assert resp.translation == "Hallo"
    assert resp.cached is True


def test_health_response():
    resp = HealthResponse(status="healthy")
    assert resp.status == "healthy"
    assert resp.llm_checked is False


def test_language_list_response():
    resp = LanguageListResponse(languages=["English", "German"])
    assert len(resp.languages) == 2
    assert "English" in resp.languages


def test_error_response():
    resp = ErrorResponse(error="Test error", details="Test details")
    assert resp.error == "Test error"
    assert resp.details == "Test details"
