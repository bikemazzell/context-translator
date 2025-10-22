import httpx
import pytest

from app.llm_client import OpenAICompatibleClient


@pytest.fixture
def llm_endpoint():
    return "http://localhost:1234/v1/chat/completions"


@pytest.fixture
def llm_model():
    return "gemma-3-27b-it"


@pytest.fixture
def client(llm_endpoint, llm_model):
    return OpenAICompatibleClient(endpoint=llm_endpoint, timeout=30, model=llm_model)


@pytest.mark.asyncio
@pytest.mark.integration
async def test_llm_server_is_available(llm_endpoint):
    """Test that LM Studio server is running and responding"""
    try:
        async with httpx.AsyncClient(timeout=5) as http_client:
            response = await http_client.get("http://localhost:1234/v1/models")
            assert response.status_code == 200
            data = response.json()
            assert "data" in data
            assert len(data["data"]) > 0
    except httpx.ConnectError:
        pytest.skip("LM Studio server not running on localhost:1234")


@pytest.mark.asyncio
@pytest.mark.integration
async def test_translate_simple_word(client):
    """Test translating a simple German word to English"""
    try:
        translation = await client.translate("Haus", "German", "English")

        assert translation is not None
        assert len(translation) > 0
        assert translation.lower() in ["house", "home", "building"]
    except Exception as e:
        if "Connection" in str(e) or "refused" in str(e):
            pytest.skip(f"LM Studio not available: {e}")
        raise


@pytest.mark.asyncio
@pytest.mark.integration
async def test_translate_with_context_bank(client):
    """Test context-aware translation: Bank (bench vs financial institution)"""
    try:
        translation_bench = await client.translate(
            "Bank", "German", "English", "Ich sitze auf der Bank"
        )

        assert translation_bench is not None
        assert "bench" in translation_bench.lower()

        translation_financial = await client.translate(
            "Bank", "German", "English", "Die Bank ist geschlossen"
        )

        assert translation_financial is not None
        assert "bank" in translation_financial.lower()

    except Exception as e:
        if "Connection" in str(e) or "refused" in str(e):
            pytest.skip(f"LM Studio not available: {e}")
        raise


@pytest.mark.asyncio
@pytest.mark.integration
async def test_translate_with_context_schloss(client):
    """Test context-aware translation: Schloss (castle vs lock)"""
    try:
        translation_castle = await client.translate(
            "Schloss", "German", "English", "Das Schloss ist groß"
        )

        assert translation_castle is not None
        assert "castle" in translation_castle.lower() or "palace" in translation_castle.lower()

        translation_lock = await client.translate(
            "Schloss", "German", "English", "Der Schlüssel passt ins Schloss"
        )

        assert translation_lock is not None
        assert "lock" in translation_lock.lower()

    except Exception as e:
        if "Connection" in str(e) or "refused" in str(e):
            pytest.skip(f"LM Studio not available: {e}")
        raise


@pytest.mark.asyncio
@pytest.mark.integration
async def test_translate_phrase(client):
    """Test translating a short phrase"""
    try:
        translation = await client.translate(
            "Guten Tag", "German", "English"
        )

        assert translation is not None
        assert len(translation) > 0
        assert any(word in translation.lower() for word in ["good", "hello", "day"])

    except Exception as e:
        if "Connection" in str(e) or "refused" in str(e):
            pytest.skip(f"LM Studio not available: {e}")
        raise


@pytest.mark.asyncio
@pytest.mark.integration
async def test_response_cleaning(client):
    """Test that LLM responses are properly cleaned of explanations"""
    try:
        translation = await client.translate("Hund", "German", "English")

        assert translation is not None
        assert "dog" in translation.lower()
        assert "the translation" not in translation.lower()
        assert "this means" not in translation.lower()
        assert "refers to" not in translation.lower()

    except Exception as e:
        if "Connection" in str(e) or "refused" in str(e):
            pytest.skip(f"LM Studio not available: {e}")
        raise


@pytest.mark.asyncio
@pytest.mark.integration
async def test_multiple_languages(client):
    """Test translating between different language pairs"""
    test_cases = [
        ("maison", "French", "English", "house"),
        ("casa", "Spanish", "English", "house"),
        ("hello", "English", "German", ["hallo", "guten tag"]),
    ]

    try:
        for text, source, target, expected in test_cases:
            translation = await client.translate(text, source, target)

            assert translation is not None
            if isinstance(expected, list):
                assert any(exp in translation.lower() for exp in expected)
            else:
                assert expected in translation.lower()

    except Exception as e:
        if "Connection" in str(e) or "refused" in str(e):
            pytest.skip(f"LM Studio not available: {e}")
        raise
