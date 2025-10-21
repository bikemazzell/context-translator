from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

# Constants
MAX_PORT_NUMBER = 65535


@dataclass
class ServerConfig:
    host: str = "localhost"
    port: int = 8080


@dataclass
class LLMProviderConfig:
    provider: str
    endpoint: str
    model_name: str
    timeout: int = 30


@dataclass
class LLMConfig:
    primary: LLMProviderConfig
    fallback: LLMProviderConfig | None = None


@dataclass
class CacheConfig:
    backend: str = "sqlite"
    path: str = "./cache/translations.db"
    ttl_days: int = 30
    max_size_mb: int = 100


@dataclass
class TranslationConfig:
    max_text_length: int = 500
    context_window_chars: int = 200
    supported_languages: list[str] = field(
        default_factory=lambda: [
            "English",
            "German",
            "French",
            "Spanish",
            "Italian",
        ]
    )


@dataclass
class Config:
    server: ServerConfig
    llm: LLMConfig
    cache: CacheConfig
    translation: TranslationConfig

    def validate(self) -> None:
        if self.server.port < 1 or self.server.port > MAX_PORT_NUMBER:
            msg = f"Invalid port number: {self.server.port}"
            raise ValueError(msg)

        if self.llm.primary.timeout < 1:
            msg = f"Invalid timeout: {self.llm.primary.timeout}"
            raise ValueError(msg)

        if self.cache.ttl_days < 1:
            msg = f"Invalid TTL: {self.cache.ttl_days}"
            raise ValueError(msg)

        if self.cache.max_size_mb < 1:
            msg = f"Invalid cache size: {self.cache.max_size_mb}"
            raise ValueError(msg)

        if self.translation.max_text_length < 1:
            msg = f"Invalid max text length: {self.translation.max_text_length}"
            raise ValueError(msg)

        if self.translation.context_window_chars < 1:
            msg = f"Invalid context window: {self.translation.context_window_chars}"
            raise ValueError(
                msg
            )


def load_config(path: str = "config.yaml") -> Config:
    config_path = Path(path)

    if not config_path.exists():
        return _get_default_config()

    try:
        with config_path.open() as f:
            data = yaml.safe_load(f)
    except Exception as e:
        msg = f"Failed to load config from {path}: {e}"
        raise ValueError(msg) from e

    if data is None:
        return _get_default_config()

    try:
        config = _parse_config(data)
        config.validate()
        return config
    except Exception as e:
        msg = f"Invalid configuration: {e}"
        raise ValueError(msg) from e


def _parse_config(data: dict[str, Any]) -> Config:
    server_data = data.get("server", {})
    server = ServerConfig(
        host=server_data.get("host", "localhost"), port=server_data.get("port", 8080)
    )

    llm_data = data.get("llm", {})
    primary_data = llm_data.get("primary", {})
    primary = LLMProviderConfig(
        provider=primary_data.get("provider", "lmstudio"),
        endpoint=primary_data.get("endpoint", "http://localhost:1234/v1/chat/completions"),
        model_name=primary_data.get("model_name", "gemma-2-27b-it"),
        timeout=primary_data.get("timeout", 30),
    )

    fallback = None
    if "fallback" in llm_data:
        fallback_data = llm_data["fallback"]
        fallback = LLMProviderConfig(
            provider=fallback_data.get("provider", "llama-server"),
            endpoint=fallback_data.get("endpoint", "http://localhost:8080/completion"),
            model_name=fallback_data.get("model_name", "gemma-2-27b-it"),
            timeout=fallback_data.get("timeout", 30),
        )

    llm = LLMConfig(primary=primary, fallback=fallback)

    cache_data = data.get("cache", {})
    cache = CacheConfig(
        backend=cache_data.get("backend", "sqlite"),
        path=cache_data.get("path", "./cache/translations.db"),
        ttl_days=cache_data.get("ttl_days", 30),
        max_size_mb=cache_data.get("max_size_mb", 100),
    )

    translation_data = data.get("translation", {})
    translation = TranslationConfig(
        max_text_length=translation_data.get("max_text_length", 500),
        context_window_chars=translation_data.get("context_window_chars", 200),
        supported_languages=translation_data.get(
            "supported_languages", ["English", "German", "French", "Spanish", "Italian"]
        ),
    )

    return Config(server=server, llm=llm, cache=cache, translation=translation)


def _get_default_config() -> Config:
    return Config(
        server=ServerConfig(),
        llm=LLMConfig(
            primary=LLMProviderConfig(
                provider="lmstudio",
                endpoint="http://localhost:1234/v1/chat/completions",
                model_name="gemma-2-27b-it",
                timeout=30,
            )
        ),
        cache=CacheConfig(),
        translation=TranslationConfig(),
    )
