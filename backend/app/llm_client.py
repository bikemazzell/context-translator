import asyncio
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

                    return self._clean_response(translation_text, text)

            except httpx.TimeoutException as e:
                last_error = e
                logger.warning(f"Attempt {attempt + 1}/{max_retries}: Request timeout")
                if attempt < max_retries - 1:
                    await self._exponential_backoff(attempt)
            except httpx.HTTPStatusError as e:
                last_error = e
                logger.error(f"HTTP error {e.response.status_code}: {e.response.text}")
                msg = f"LLM server error: {e.response.status_code}"
                raise ValueError(msg) from e
            except (KeyError, IndexError) as e:
                last_error = e
                logger.error(f"Invalid response format: {e}")
                msg = "Invalid response from LLM"
                raise ValueError(msg) from e
            except Exception as e:
                last_error = e
                logger.error(f"Unexpected error: {e}")
                raise

        msg = f"Translation failed after {max_retries} attempts"
        raise ValueError(msg) from last_error

    async def _exponential_backoff(self, attempt: int) -> None:
        wait_time = min(2**attempt, 8)
        await asyncio.sleep(wait_time)

    def _clean_response(self, response_text: str, original_text: str) -> str:
        cleaned = response_text.strip()

        if not cleaned:
            msg = "Empty response from LLM"
            raise ValueError(msg)

        if len(cleaned) > len(original_text) * 3:
            logger.warning(f"Response unusually long: {len(cleaned)} vs {len(original_text)}")

        cleaned = re.sub(r'<think>.*?</think>', '', cleaned, flags=re.DOTALL | re.IGNORECASE)
        cleaned = re.sub(r'<think>.*', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'</?[a-zA-Z][^>]*>', '', cleaned)
        cleaned = cleaned.strip()

        if not cleaned:
            msg = "Empty response after removing thinking tags"
            raise ValueError(msg)

        verbose_prefixes = [
            r'^(?:okay|alright|sure|well|let me|i will|i\'ll)[,\s]',
        ]

        for prefix_pattern in verbose_prefixes:
            if re.search(prefix_pattern, cleaned, re.IGNORECASE):
                logger.info("Detected verbose prefix, extracting translation from quotes")
                match = re.search(r'["\']([^"\']+)["\']', cleaned)
                if match:
                    potential = match.group(1).strip()
                    if potential and len(potential) <= len(original_text) * 2:
                        cleaned = potential
                        logger.info(f"Extracted from quotes: {cleaned}")
                        break

        original_has_quotes = original_text.startswith('"') and original_text.endswith('"')
        has_added_quotes = (
            (cleaned.startswith('"') and cleaned.endswith('"'))
            or (cleaned.startswith("'") and cleaned.endswith("'"))
        )
        if not original_has_quotes and has_added_quotes:
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
            for raw_line in lines:
                line = raw_line.strip()
                if line and not any(re.search(p, line) for p in explanation_patterns):
                    cleaned = line
                    break

        cleaned = cleaned.strip()

        if not cleaned:
            msg = "Response cleaning resulted in empty translation"
            raise ValueError(msg)

        return cleaned
