import tempfile
import time
from pathlib import Path

import pytest

from app.cache import TranslationCache


@pytest.fixture
async def cache():
    with tempfile.TemporaryDirectory() as tmpdir:
        cache_path = Path(tmpdir) / "test.db"
        c = TranslationCache(str(cache_path))
        await c.initialize()
        yield c
        await c.close()


@pytest.mark.asyncio
async def test_cache_initialization_creates_directory():
    with tempfile.TemporaryDirectory() as tmpdir:
        cache_path = Path(tmpdir) / "subdir" / "test.db"
        c = TranslationCache(str(cache_path))
        await c.initialize()

        assert cache_path.parent.exists()

        await c.close()


@pytest.mark.asyncio
async def test_cache_set_and_get(cache):
    key = cache.generate_key("Hello", "English", "German", None)
    await cache.set(key, "Hello", "English", "German", "Hallo")

    result = await cache.get(key)
    assert result == "Hallo"


@pytest.mark.asyncio
async def test_cache_miss_returns_none(cache):
    result = await cache.get("nonexistent_key")
    assert result is None


@pytest.mark.asyncio
async def test_cache_key_generation_is_consistent(cache):
    key1 = cache.generate_key("Hello", "English", "German", None)
    key2 = cache.generate_key("Hello", "English", "German", None)
    assert key1 == key2


@pytest.mark.asyncio
async def test_cache_key_includes_context(cache):
    key1 = cache.generate_key("Bank", "German", "English", "Ich sitze auf der Bank")
    key2 = cache.generate_key("Bank", "German", "English", "Die Bank ist geschlossen")
    assert key1 != key2


@pytest.mark.asyncio
async def test_cache_key_different_for_no_context(cache):
    key1 = cache.generate_key("Bank", "German", "English", None)
    key2 = cache.generate_key("Bank", "German", "English", "")
    assert key1 == key2


@pytest.mark.asyncio
async def test_cache_clear_expired(cache):
    old_key = cache.generate_key("Old", "English", "German", None)
    new_key = cache.generate_key("New", "English", "German", None)

    await cache.set(old_key, "Old", "English", "German", "Alt")

    if cache.db:
        await cache.db.execute(
            "UPDATE translations SET timestamp = ? WHERE hash = ?",
            (int(time.time()) - 31 * 24 * 60 * 60, old_key),
        )
        await cache.db.commit()

    await cache.set(new_key, "New", "English", "German", "Neu")

    await cache.clear_expired(30)

    old_result = await cache.get(old_key)
    new_result = await cache.get(new_key)

    assert old_result is None
    assert new_result == "Neu"


@pytest.mark.asyncio
async def test_cache_get_size(cache):
    await cache.set(
        cache.generate_key("Test", "English", "German", None),
        "Test",
        "English",
        "German",
        "Test",
    )

    size = await cache.get_size()
    assert size > 0


@pytest.mark.asyncio
async def test_cache_or_replace_updates_existing(cache):
    key = cache.generate_key("Hello", "English", "German", None)

    await cache.set(key, "Hello", "English", "German", "Hallo")
    await cache.set(key, "Hello", "English", "German", "Guten Tag")

    result = await cache.get(key)
    assert result == "Guten Tag"
