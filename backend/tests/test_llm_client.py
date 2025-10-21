from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.llm_client import OpenAICompatibleClient


@pytest.fixture
def client():
    return OpenAICompatibleClient(
        endpoint="http://localhost:1234/v1/chat/completions", timeout=30, model="test-model"
    )


@pytest.mark.asyncio
async def test_translate_successful(client):
    mock_response = {
        "choices": [{"message": {"content": "Hallo"}}]
    }

    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.return_value = AsyncMock(
            status_code=200,
            json=lambda: mock_response,
            raise_for_status=lambda: None
        )

        result = await client.translate("Hello", "English", "German")
        assert result == "Hallo"


@pytest.mark.asyncio
async def test_translate_with_context(client):
    mock_response = {
        "choices": [{"message": {"content": "bench"}}]
    }

    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.return_value = AsyncMock(
            status_code=200,
            json=lambda: mock_response,
            raise_for_status=lambda: None
        )

        result = await client.translate(
            "Bank", "German", "English", "Ich sitze auf der Bank"
        )
        assert result == "bench"


@pytest.mark.asyncio
async def test_translate_removes_quotes(client):
    mock_response = {
        "choices": [{"message": {"content": '"Hallo"'}}]
    }

    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.return_value = AsyncMock(
            status_code=200,
            json=lambda: mock_response,
            raise_for_status=lambda: None
        )

        result = await client.translate("Hello", "English", "German")
        assert result == "Hallo"


@pytest.mark.asyncio
async def test_translate_preserves_quotes_if_original_has_them(client):
    mock_response = {
        "choices": [{"message": {"content": '"Hallo"'}}]
    }

    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.return_value = AsyncMock(
            status_code=200,
            json=lambda: mock_response,
            raise_for_status=lambda: None
        )

        result = await client.translate('"Hello"', "English", "German")
        assert result == '"Hallo"'


@pytest.mark.asyncio
async def test_translate_cleans_explanation(client):
    mock_response = {
        "choices": [{"message": {"content": "house\n\nThe translation is correct."}}]
    }

    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.return_value = AsyncMock(
            status_code=200,
            json=lambda: mock_response,
            raise_for_status=lambda: None
        )

        result = await client.translate("Haus", "German", "English")
        assert result == "house"


@pytest.mark.asyncio
async def test_translate_empty_response_raises_error(client):
    mock_response = {
        "choices": [{"message": {"content": ""}}]
    }

    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.return_value = AsyncMock(
            status_code=200,
            json=lambda: mock_response,
            raise_for_status=lambda: None
        )

        with pytest.raises(ValueError, match="Empty response"):
            await client.translate("Hello", "English", "German")


@pytest.mark.asyncio
async def test_translate_http_error(client):
    with patch("httpx.AsyncClient.post") as mock_post:
        from unittest.mock import MagicMock
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Server error"
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Server error", request=MagicMock(), response=mock_response
        )
        mock_post.return_value = mock_response

        with pytest.raises(ValueError, match="LLM server error"):
            await client.translate("Hello", "English", "German")


@pytest.mark.asyncio
async def test_translate_invalid_response_format(client):
    mock_response = {"invalid": "format"}

    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.return_value = AsyncMock(
            status_code=200,
            json=lambda: mock_response,
            raise_for_status=lambda: None
        )

        with pytest.raises(ValueError, match="Invalid response from LLM"):
            await client.translate("Hello", "English", "German")


@pytest.mark.asyncio
async def test_translate_timeout_retries(client):
    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.side_effect = httpx.TimeoutException("Timeout")

        with pytest.raises(ValueError, match="Translation failed after 3 attempts"):
            await client.translate("Hello", "English", "German")

        assert mock_post.call_count == 3
