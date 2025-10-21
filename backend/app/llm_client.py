import logging
import re
from abc import ABC, abstractmethod

import httpx

from .prompts import build_messages

logger = logging.getLogger(__name__)


class LLMClient(ABC):
    @abstractmethod
    async def translate(
        self, text: str, source_lang: str, target_lang: str, context: str | None = None
    ) -> str:
        pass


class OpenAICompatibleClient(LLMClient):
    def __init__(self, endpoint: str, timeout: int, model: str) -> None:
        self.endpoint = endpoint
        self.timeout = timeout
        self.model = model

    async def translate(
        self, text: str, source_lang: str, target_lang: str, context: str | None = None
    ) -> str:
        messages = build_messages(text, source_lang, target_lang, context)

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 100,
            "stop": ["\n\n", "Input:", "Translate"],
        }

        max_retries = 3
        last_error: Exception | None = None

        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(self.endpoint, json=payload)
                    response.raise_for_status()

                    data = response.json()
                    translation_text = data["choices"][0]["message"]["content"]

                    cleaned = self._clean_response(translation_text, text)
                    return cleaned

            except httpx.TimeoutException as e:
                last_error = e
                logger.warning(f"Attempt {attempt + 1}/{max_retries}: Request timeout")
                if attempt < max_retries - 1:
                    await self._exponential_backoff(attempt)
            except httpx.HTTPStatusError as e:
                last_error = e
                logger.error(f"HTTP error {e.response.status_code}: {e.response.text}")
                raise ValueError(f"LLM server error: {e.response.status_code}") from e
            except (KeyError, IndexError) as e:
                last_error = e
                logger.error(f"Invalid response format: {e}")
                raise ValueError("Invalid response from LLM") from e
            except Exception as e:
                last_error = e
                logger.error(f"Unexpected error: {e}")
                raise

        raise ValueError(f"Translation failed after {max_retries} attempts") from last_error

    async def _exponential_backoff(self, attempt: int) -> None:
        import asyncio

        wait_time = min(2**attempt, 8)
        await asyncio.sleep(wait_time)

    def _clean_response(self, response_text: str, original_text: str) -> str:
        cleaned = response_text.strip()

        if not cleaned:
            raise ValueError("Empty response from LLM")

        if len(cleaned) > len(original_text) * 3:
            logger.warning(f"Response unusually long: {len(cleaned)} vs {len(original_text)}")

        original_has_quotes = original_text.startswith('"') and original_text.endswith('"')
        if not original_has_quotes:
            if (cleaned.startswith('"') and cleaned.endswith('"')) or (cleaned.startswith("'") and cleaned.endswith("'")):
                cleaned = cleaned[1:-1].strip()

        explanation_patterns = [
            r"(?i)the translation is",
            r"(?i)this means",
            r"(?i)translates to",
            r"(?i)refers to",
            r"(?i)^explanation:",
            r"(?i)^note:",
            r"(?i)^translation:",
        ]

        for pattern in explanation_patterns:
            if re.search(pattern, cleaned):
                logger.info(f"Detected explanation pattern: {pattern}")

                parts = re.split(r"(?i)\b(is|means|refers to)\b", cleaned, maxsplit=1)
                if parts and len(parts[0]) > 0:
                    potential_translation = parts[0].strip()
                    if len(potential_translation) > 0:
                        cleaned = potential_translation
                        logger.info(f"Extracted translation before explanation: {cleaned}")
                        break

        lines = cleaned.split("\n")
        if len(lines) > 1:
            for line in lines:
                line = line.strip()
                if line and not any(re.search(p, line) for p in explanation_patterns):
                    cleaned = line
                    break

        cleaned = cleaned.strip()

        if not cleaned:
            raise ValueError("Response cleaning resulted in empty translation")

        return cleaned
