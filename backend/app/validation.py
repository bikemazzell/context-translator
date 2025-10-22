"""Input validation and sanitization utilities."""

import logging
import re

logger = logging.getLogger(__name__)

MAX_TEXT_LENGTH = 5000
MAX_CONTEXT_LENGTH = 1000


def sanitize_text_input(text: str, max_length: int = MAX_TEXT_LENGTH) -> str:
    """
    Sanitize text input by removing control characters and normalizing whitespace.

    Args:
        text: The input text to sanitize
        max_length: Maximum allowed length after sanitization

    Returns:
        Sanitized text string

    Raises:
        ValueError: If text is empty after sanitization or exceeds max_length
    """
    if not text or not isinstance(text, str):
        raise ValueError("Text must be a non-empty string")

    cleaned = "".join(ch for ch in text if ch.isprintable() or ch in "\n\t")

    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = cleaned.strip()

    if not cleaned:
        raise ValueError("Text is empty after sanitization")

    if len(cleaned) > max_length:
        raise ValueError(f"Text exceeds maximum length of {max_length} characters")

    return cleaned


def sanitize_context_input(context: str | None) -> str | None:
    """
    Sanitize optional context input.

    Args:
        context: Optional context text

    Returns:
        Sanitized context or None
    """
    if context is None or not context.strip():
        return None

    try:
        return sanitize_text_input(context, max_length=MAX_CONTEXT_LENGTH)
    except ValueError:
        logger.warning("Context sanitization failed, ignoring context")
        return None


def validate_language_code(lang_code: str, supported_languages: list[str]) -> None:
    """
    Validate language code against supported languages.

    Args:
        lang_code: Language code or name to validate
        supported_languages: List of supported language codes/names

    Raises:
        ValueError: If language code is invalid or not supported
    """
    if not lang_code or not isinstance(lang_code, str):
        raise ValueError("Language code must be a non-empty string")

    lang_code_clean = lang_code.strip()

    if not re.match(r"^[a-zA-Z][\w\s-]*$", lang_code_clean):
        raise ValueError(f"Invalid language code format: {lang_code}")

    if lang_code not in supported_languages:
        raise ValueError(
            f"Unsupported language: {lang_code}. "
            f"Supported languages: {', '.join(supported_languages)}"
        )


def sanitize_translation_request(
    text: str,
    source_lang: str,
    target_lang: str,
    context: str | None,
    supported_languages: list[str],
    max_text_length: int,
) -> tuple[str, str, str, str | None]:
    """
    Sanitize and validate all translation request parameters.

    Args:
        text: Text to translate
        source_lang: Source language code
        target_lang: Target language code
        context: Optional context
        supported_languages: List of supported languages
        max_text_length: Maximum text length

    Returns:
        Tuple of (sanitized_text, source_lang, target_lang, sanitized_context)

    Raises:
        ValueError: If any validation fails
    """
    sanitized_text = sanitize_text_input(text, max_length=max_text_length)
    sanitized_context = sanitize_context_input(context)

    validate_language_code(source_lang, supported_languages)
    validate_language_code(target_lang, supported_languages)

    if source_lang == target_lang:
        raise ValueError("Source and target languages must be different")

    return sanitized_text, source_lang, target_lang, sanitized_context
