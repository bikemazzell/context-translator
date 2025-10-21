#!/home/v/miniconda3/envs/ai312/bin/python3
"""
Native messaging host for Context Translator Firefox extension.
Communicates with the extension via stdin/stdout using JSON messages.
"""

import sys
import json
import struct
import asyncio
import logging
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.cache import TranslationCache
from app.config import load_config
from app.llm_client import OpenAICompatibleClient

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    filename="/tmp/context-translator-host.log"
)

logger = logging.getLogger(__name__)


class NativeMessagingHost:
    def __init__(self):
        self.config = None
        self.cache = None
        self.llm_client = None

    async def initialize(self):
        """Initialize backend components"""
        try:
            config_path = Path(__file__).parent.parent.parent / "backend" / "config.yaml"
            self.config = load_config(str(config_path))
            logger.info("Configuration loaded")

            self.cache = TranslationCache(self.config.cache.path)
            await self.cache.initialize()
            logger.info(f"Cache initialized at {self.config.cache.path}")

            await self.cache.clear_expired(self.config.cache.ttl_days)

            self.llm_client = OpenAICompatibleClient(
                endpoint=self.config.llm.primary.endpoint,
                timeout=self.config.llm.primary.timeout,
                model=self.config.llm.primary.model_name,
            )
            logger.info(f"LLM client initialized for {self.config.llm.primary.provider}")

        except Exception as e:
            logger.error(f"Initialization failed: {e}", exc_info=True)
            raise

    async def handle_message(self, message):
        """Handle incoming message from extension"""
        action = message.get("action")
        payload = message.get("payload", {})

        logger.info(f"Handling action: {action}")

        try:
            if action == "translate":
                result = await self.handle_translate(payload)
            elif action == "getLanguages":
                result = await self.handle_get_languages()
            elif action == "health":
                result = await self.handle_health()
            elif action == "clearCache":
                result = await self.handle_clear_cache()
            else:
                return {"error": f"Unknown action: {action}"}

            return {"result": result}

        except Exception as e:
            logger.error(f"Error handling {action}: {e}", exc_info=True)
            return {"error": str(e)}

    async def handle_translate(self, payload):
        """Handle translation request"""
        text = payload.get("text")
        source_lang = payload.get("source_lang")
        target_lang = payload.get("target_lang")
        context = payload.get("context")
        use_cache = payload.get("use_cache", True)

        if not text or not source_lang or not target_lang:
            raise ValueError("Missing required fields: text, source_lang, target_lang")

        # Check cache if enabled
        cache_key = self.cache._generate_key(text, source_lang, target_lang, context)
        if use_cache:
            cached_translation = await self.cache.get(cache_key)
            if cached_translation:
                logger.info(f"Translation: {source_lang} -> {target_lang} (cached)")
                return {"translation": cached_translation, "cached": True}

        # Translate using LLM
        translation = await self.llm_client.translate(
            text, source_lang, target_lang, context
        )

        # Store in cache if enabled
        if use_cache:
            await self.cache.set(
                cache_key, text, source_lang, target_lang, translation
            )

        logger.info(f"Translation: {source_lang} -> {target_lang} (new)")
        return {"translation": translation, "cached": False}

    async def handle_get_languages(self):
        """Get supported languages"""
        return {"languages": self.config.translation.supported_languages}

    async def handle_health(self):
        """Health check"""
        return {"status": "healthy", "llm_checked": False}

    async def handle_clear_cache(self):
        """Clear translation cache"""
        await self.cache.clear()
        logger.info("Cache cleared")
        return {"status": "cleared"}

    def read_message(self):
        """Read a message from stdin"""
        # Read the message length (first 4 bytes)
        raw_length = sys.stdin.buffer.read(4)
        if not raw_length:
            return None

        message_length = struct.unpack("=I", raw_length)[0]

        # Read the JSON message
        message_data = sys.stdin.buffer.read(message_length).decode("utf-8")
        return json.loads(message_data)

    def send_message(self, message):
        """Send a message to stdout"""
        encoded_message = json.dumps(message).encode("utf-8")
        message_length = struct.pack("=I", len(encoded_message))

        sys.stdout.buffer.write(message_length)
        sys.stdout.buffer.write(encoded_message)
        sys.stdout.buffer.flush()

    async def run(self):
        """Main loop - read messages and respond"""
        logger.info("Native messaging host starting")

        try:
            await self.initialize()
            logger.info("Initialization complete, ready to receive messages")

            while True:
                message = self.read_message()
                if message is None:
                    logger.info("No more messages, exiting")
                    break

                logger.info(f"Received message: {message}")
                response = await self.handle_message(message)
                self.send_message(response)

        except Exception as e:
            logger.error(f"Fatal error: {e}", exc_info=True)
            self.send_message({"error": f"Fatal error: {str(e)}"})
        finally:
            if self.cache:
                await self.cache.close()
            logger.info("Native messaging host stopped")


def main():
    logger.info("Starting Context Translator native messaging host")
    host = NativeMessagingHost()
    asyncio.run(host.run())


if __name__ == "__main__":
    main()
