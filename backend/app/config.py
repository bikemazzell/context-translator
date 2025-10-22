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
    config_path = Path(path).resolve()

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
        config = _parse_config(data, config_dir=config_path.parent)
        config.validate()
        return config
    except Exception as e:
        msg = f"Invalid configuration: {e}"
        raise ValueError(msg) from e


def _parse_config(data: dict[str, Any], config_dir: Path | None = None) -> Config:
    # Defaults - single source of truth
    DEFAULT_CACHE_BACKEND = "sqlite"
    DEFAULT_CACHE_PATH = "./cache/translations.db"
    DEFAULT_CACHE_TTL = 30
    DEFAULT_CACHE_SIZE = 100
    DEFAULT_MAX_TEXT_LENGTH = 500
    DEFAULT_CONTEXT_WINDOW = 200
    DEFAULT_LANGUAGES = ["English", "German", "French", "Spanish", "Italian"]

    # Server config - let dataclass defaults handle it
    server_data = data.get("server", {})
    server = ServerConfig(**server_data)

    # LLM config
    llm_data = data.get("llm", {})
    if "primary" not in llm_data:
        # No LLM config - use defaults
        primary = LLMProviderConfig(
            provider="lmstudio",
            endpoint="http://localhost:1234/v1/chat/completions",
            model_name="gemma-3-27b-it",
            timeout=30,
        )
    else:
        primary_data = llm_data["primary"]
        primary = LLMProviderConfig(
            provider=primary_data.get("provider", "lmstudio"),
            endpoint=primary_data.get("endpoint", "http://localhost:1234/v1/chat/completions"),
            model_name=primary_data.get("model_name", "gemma-3-27b-it"),
            timeout=primary_data.get("timeout", 30),
        )

    fallback = None
    if "fallback" in llm_data:
        fallback_data = llm_data["fallback"]
        fallback = LLMProviderConfig(
            provider=fallback_data.get("provider", "llama-server"),
            endpoint=fallback_data.get("endpoint", "http://localhost:8080/completion"),
            model_name=fallback_data.get("model_name", "gemma-3-12b-it"),
            timeout=fallback_data.get("timeout", 30),
        )

    llm = LLMConfig(primary=primary, fallback=fallback)

    # Cache config
    cache_data = data.get("cache", {})
    cache_path = cache_data.get("path", DEFAULT_CACHE_PATH)

    # Resolve relative paths to absolute paths relative to config file location
    if config_dir is not None:
        cache_path_obj = Path(cache_path)
        if not cache_path_obj.is_absolute():
            cache_path = str((config_dir / cache_path).resolve())

    cache = CacheConfig(
        backend=cache_data.get("backend", DEFAULT_CACHE_BACKEND),
        path=cache_path,
        ttl_days=cache_data.get("ttl_days", DEFAULT_CACHE_TTL),
        max_size_mb=cache_data.get("max_size_mb", DEFAULT_CACHE_SIZE),
    )

    # Translation config
    translation_data = data.get("translation", {})
    translation = TranslationConfig(
        max_text_length=translation_data.get("max_text_length", DEFAULT_MAX_TEXT_LENGTH),
        context_window_chars=translation_data.get("context_window_chars", DEFAULT_CONTEXT_WINDOW),
        supported_languages=translation_data.get("supported_languages", DEFAULT_LANGUAGES.copy()),
    )

    return Config(server=server, llm=llm, cache=cache, translation=translation)


def _get_default_config() -> Config:
    return Config(
        server=ServerConfig(),
        llm=LLMConfig(
            primary=LLMProviderConfig(
                provider="lmstudio",
                endpoint="http://localhost:1234/v1/chat/completions",
                model_name="gemma-3-27b-it",
                timeout=30,
            )
        ),
        cache=CacheConfig(),
        translation=TranslationConfig(),
    )
