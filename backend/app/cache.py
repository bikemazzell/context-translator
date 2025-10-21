import hashlib
import logging
import time
from pathlib import Path

import aiosqlite

logger = logging.getLogger(__name__)

SCHEMA_VERSION = 1


class TranslationCache:
    def __init__(self, db_path: str) -> None:
        self.db_path = db_path
        self.db: aiosqlite.Connection | None = None

    async def initialize(self) -> None:
        cache_dir = Path(self.db_path).parent
        cache_dir.mkdir(parents=True, exist_ok=True)

        self.db = await aiosqlite.connect(self.db_path)

        await self.db.execute("PRAGMA journal_mode=WAL")

        await self._create_schema()
        await self._check_schema_version()

    async def _create_schema(self) -> None:
        if self.db is None:
            msg = "Database not initialized"
            raise RuntimeError(msg)

        await self.db.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY
            )
            """
        )

        await self.db.execute(
            """
            CREATE TABLE IF NOT EXISTS translations (
                hash TEXT PRIMARY KEY,
                text TEXT NOT NULL,
                source_lang TEXT NOT NULL,
                target_lang TEXT NOT NULL,
                translation TEXT NOT NULL,
                timestamp INTEGER NOT NULL
            )
            """
        )

        await self.db.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_timestamp ON translations(timestamp)
            """
        )

        await self.db.commit()

    async def _check_schema_version(self) -> None:
        if self.db is None:
            msg = "Database not initialized"
            raise RuntimeError(msg)

        cursor = await self.db.execute("SELECT version FROM schema_version")
        row = await cursor.fetchone()

        if row is None:
            await self.db.execute(
                "INSERT INTO schema_version (version) VALUES (?)", (SCHEMA_VERSION,)
            )
            await self.db.commit()
            logger.info(f"Initialized cache schema version {SCHEMA_VERSION}")
        elif row[0] != SCHEMA_VERSION:
            logger.warning(
                f"Schema version mismatch: expected {SCHEMA_VERSION}, got {row[0]}. "
                "Consider clearing cache."
            )

    def _generate_key(
        self, text: str, source_lang: str, target_lang: str, context_text: str | None
    ) -> str:
        context = context_text or ""
        key_string = f"{text}|{source_lang}|{target_lang}|{context}"
        return hashlib.sha256(key_string.encode()).hexdigest()

    async def get(self, key: str) -> str | None:
        if self.db is None:
            msg = "Database not initialized"
            raise RuntimeError(msg)

        cursor = await self.db.execute(
            "SELECT translation FROM translations WHERE hash = ?", (key,)
        )
        row = await cursor.fetchone()

        if row:
            logger.debug(f"Cache hit for key: {key[:8]}...")
            return str(row[0])

        logger.debug(f"Cache miss for key: {key[:8]}...")
        return None

    async def set(
        self,
        key: str,
        text: str,
        source_lang: str,
        target_lang: str,
        translation: str,
    ) -> None:
        if self.db is None:
            msg = "Database not initialized"
            raise RuntimeError(msg)

        timestamp = int(time.time())

        await self.db.execute(
            """
            INSERT OR REPLACE INTO translations
            (hash, text, source_lang, target_lang, translation, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (key, text, source_lang, target_lang, translation, timestamp),
        )
        await self.db.commit()

        logger.debug(f"Cached translation for key: {key[:8]}...")

    async def clear_expired(self, ttl_days: int) -> None:
        if self.db is None:
            msg = "Database not initialized"
            raise RuntimeError(msg)

        cutoff_time = int(time.time()) - (ttl_days * 24 * 60 * 60)

        cursor = await self.db.execute(
            "DELETE FROM translations WHERE timestamp < ?", (cutoff_time,)
        )
        await self.db.commit()

        deleted_count = cursor.rowcount
        if deleted_count > 0:
            logger.info(f"Deleted {deleted_count} expired cache entries")

    async def get_size(self) -> int:
        db_file = Path(self.db_path)
        if db_file.exists():
            return db_file.stat().st_size
        return 0

    async def close(self) -> None:
        if self.db:
            await self.db.close()
            self.db = None
