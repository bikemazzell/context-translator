import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.mark.asyncio
async def test_lifespan_startup_and_shutdown():
    with tempfile.TemporaryDirectory() as tmpdir:
        config_path = Path(tmpdir) / "test_config.yaml"
        config_content = """
server:
  host: "0.0.0.0"
  port: 8080

llm:
  primary:
    provider: "ollama"
    endpoint: "http://localhost:11434/v1/chat/completions"
    model_name: "llama3.2:3b"
    timeout: 30

cache:
  path: "{cache_path}/translations.db"
  ttl_days: 30
  max_size_mb: 100

translation:
  supported_languages:
    - "English"
    - "German"
  max_text_length: 500
  context_window_chars: 200
"""
        cache_path = Path(tmpdir) / "cache"
        config_content = config_content.format(cache_path=cache_path)
        config_path.write_text(config_content)

        with patch("app.main.load_config") as mock_load_config:
            from app.config import _get_default_config

            test_config = _get_default_config()
            test_config.cache.path = str(cache_path / "test.db")
            mock_load_config.return_value = test_config

            from app.main import app

            with TestClient(app) as client:
                response = client.get("/health")
                assert response.status_code == 200

            mock_load_config.assert_called_once()


@pytest.mark.asyncio
async def test_lifespan_loads_config():
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("app.main.load_config") as mock_load_config:
            from app.config import _get_default_config

            test_config = _get_default_config()
            test_config.cache.path = str(Path(tmpdir) / "test.db")
            mock_load_config.return_value = test_config

            from app.main import app

            with TestClient(app) as client:
                response = client.get("/health")
                assert response.status_code == 200


@pytest.mark.asyncio
async def test_lifespan_initializes_cache():
    with tempfile.TemporaryDirectory() as tmpdir:
        cache_db_path = Path(tmpdir) / "test.db"

        with patch("app.main.load_config") as mock_load_config:
            from app.config import _get_default_config

            test_config = _get_default_config()
            test_config.cache.path = str(cache_db_path)
            mock_load_config.return_value = test_config

            from app.main import app

            with TestClient(app) as client:
                response = client.get("/health")
                assert response.status_code == 200

                assert cache_db_path.exists()


@pytest.mark.asyncio
async def test_lifespan_clears_expired_cache():
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("app.main.load_config") as mock_load_config:
            from app.config import _get_default_config

            test_config = _get_default_config()
            test_config.cache.path = str(Path(tmpdir) / "test.db")
            test_config.cache.ttl_days = 30
            mock_load_config.return_value = test_config

            with patch("app.cache.TranslationCache.clear_expired") as mock_clear:
                mock_clear.return_value = AsyncMock()

                from app.main import app

                with TestClient(app) as client:
                    response = client.get("/health")
                    assert response.status_code == 200
