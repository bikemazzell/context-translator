from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

import app.main
from app.cache import TranslationCache
from app.config import _get_default_config
from app.llm_client import OpenAICompatibleClient


@pytest.fixture
def mock_config():
    return _get_default_config()


@pytest.fixture
def mock_cache():
    cache = MagicMock(spec=TranslationCache)
    cache._generate_key = MagicMock(return_value="test_key")
    cache.get = AsyncMock(return_value=None)
    cache.set = AsyncMock(return_value=None)
    return cache


@pytest.fixture
def mock_llm():
    return MagicMock(spec=OpenAICompatibleClient)


@pytest.fixture
def client(mock_config, mock_cache, mock_llm):
    app.main.config = mock_config
    app.main.cache = mock_cache
    app.main.llm_client = mock_llm
    return TestClient(app.main.app)


@pytest.fixture
def mock_llm_response():
    return {"choices": [{"message": {"content": "Hallo"}}]}


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "llm_checked" in data


def test_languages_endpoint(client):
    response = client.get("/languages")
    assert response.status_code == 200
    data = response.json()
    assert "languages" in data
    assert isinstance(data["languages"], list)
    assert len(data["languages"]) > 0


@pytest.mark.asyncio
async def test_translate_endpoint_success(client, mock_llm):
    mock_llm.translate = AsyncMock(return_value="Hallo")

    response = client.post(
        "/translate",
        json={
            "text": "Hello",
            "source_lang": "English",
            "target_lang": "German"
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["translation"] == "Hallo"
    assert isinstance(data["cached"], bool)


@pytest.mark.asyncio
async def test_translate_endpoint_with_context(client, mock_llm):
    mock_llm.translate = AsyncMock(return_value="bench")

    response = client.post(
        "/translate",
        json={
            "text": "Bank",
            "source_lang": "German",
            "target_lang": "English",
            "context": "Ich sitze auf der Bank"
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["translation"] == "bench"


def test_translate_endpoint_missing_fields(client):
    response = client.post(
        "/translate",
        json={"text": "Hello"}
    )

    assert response.status_code == 422


def test_translate_endpoint_empty_text(client):
    response = client.post(
        "/translate",
        json={
            "text": "",
            "source_lang": "English",
            "target_lang": "German"
        }
    )

    assert response.status_code == 422


def test_translate_endpoint_text_too_long(client):
    long_text = "a" * 501
    response = client.post(
        "/translate",
        json={
            "text": long_text,
            "source_lang": "English",
            "target_lang": "German"
        }
    )

    assert response.status_code == 422


def test_translate_endpoint_invalid_language(client):
    response = client.post(
        "/translate",
        json={
            "text": "Hello",
            "source_lang": "InvalidLanguage",
            "target_lang": "German"
        }
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_translate_caching(client, mock_llm, mock_cache):
    mock_llm.translate = AsyncMock(return_value="Hallo")

    mock_cache.get.side_effect = [None, "Hallo"]

    response1 = client.post(
        "/translate",
        json={
            "text": "Hello",
            "source_lang": "English",
            "target_lang": "German"
        }
    )

    response2 = client.post(
        "/translate",
        json={
            "text": "Hello",
            "source_lang": "English",
            "target_lang": "German"
        }
    )

    assert response1.status_code == 200
    assert response2.status_code == 200

    assert response1.json()["cached"] is False
    assert response2.json()["cached"] is True


@pytest.mark.asyncio
async def test_translate_endpoint_llm_value_error(client, mock_llm):
    mock_llm.translate = AsyncMock(side_effect=ValueError("LLM server error: 500"))

    response = client.post(
        "/translate",
        json={
            "text": "Hello",
            "source_lang": "English",
            "target_lang": "German"
        }
    )

    assert response.status_code == 500
    data = response.json()
    assert data["detail"]["error"] == "Translation failed"


@pytest.mark.asyncio
async def test_translate_endpoint_llm_connection_error(client, mock_llm):
    import httpx
    mock_llm.translate = AsyncMock(side_effect=httpx.ConnectError("Connection refused"))

    response = client.post(
        "/translate",
        json={
            "text": "Hello",
            "source_lang": "English",
            "target_lang": "German"
        }
    )

    assert response.status_code == 503
    data = response.json()
    assert data["detail"]["error"] == "Translation server is not responding"
