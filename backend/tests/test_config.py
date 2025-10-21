import tempfile
from pathlib import Path

import pytest
import yaml

from app.config import _get_default_config, load_config


def test_load_default_config_when_file_missing():
    config = load_config("nonexistent.yaml")
    assert config.server.host == "localhost"
    assert config.server.port == 8080
    assert config.llm.primary.provider == "lmstudio"


def test_load_config_from_file():
    config_data = {
        "server": {"host": "0.0.0.0", "port": 9000},
        "llm": {
            "primary": {
                "provider": "lmstudio",
                "endpoint": "http://localhost:1234/v1/chat/completions",
                "model_name": "test-model",
                "timeout": 60,
            }
        },
        "cache": {
            "backend": "sqlite",
            "path": "./test_cache.db",
            "ttl_days": 15,
            "max_size_mb": 50,
        },
        "translation": {
            "max_text_length": 1000,
            "context_window_chars": 300,
            "supported_languages": ["English", "German"],
        },
    }

    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
        yaml.dump(config_data, f)
        temp_path = f.name

    try:
        config = load_config(temp_path)
        assert config.server.host == "0.0.0.0"
        assert config.server.port == 9000
        assert config.llm.primary.model_name == "test-model"
        assert config.cache.ttl_days == 15
        assert config.translation.max_text_length == 1000
    finally:
        Path(temp_path).unlink()


def test_config_validation_invalid_port():
    config = _get_default_config()
    config.server.port = -1

    with pytest.raises(ValueError, match="Invalid port number"):
        config.validate()


def test_config_validation_invalid_timeout():
    config = _get_default_config()
    config.llm.primary.timeout = 0

    with pytest.raises(ValueError, match="Invalid timeout"):
        config.validate()


def test_config_validation_invalid_ttl():
    config = _get_default_config()
    config.cache.ttl_days = 0

    with pytest.raises(ValueError, match="Invalid TTL"):
        config.validate()


def test_config_validation_valid():
    config = _get_default_config()
    config.validate()
