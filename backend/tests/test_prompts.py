from app.prompts import SYSTEM_PROMPT, build_messages, build_user_prompt


def test_build_user_prompt_without_context():
    prompt = build_user_prompt("Haus", "German", "English")
    assert "Translate from German to English:" in prompt
    assert "Haus" in prompt
    assert "Context:" not in prompt


def test_build_user_prompt_with_context():
    prompt = build_user_prompt("Bank", "German", "English", "Ich sitze auf der Bank")
    assert "Translate from German to English:" in prompt
    assert "Text to translate: Bank" in prompt
    assert "Context: Ich sitze auf der Bank" in prompt
    assert "Translation:" in prompt


def test_build_user_prompt_strips_whitespace():
    prompt = build_user_prompt("  Haus  ", "  German  ", "  English  ", "  context  ")
    assert "Haus" in prompt
    assert "context" in prompt


def test_build_user_prompt_ignores_empty_context():
    prompt = build_user_prompt("Haus", "German", "English", "   ")
    assert "Context:" not in prompt


def test_build_messages_structure():
    messages = build_messages("Haus", "German", "English")
    assert len(messages) == 2
    assert messages[0]["role"] == "system"
    assert messages[0]["content"] == SYSTEM_PROMPT
    assert messages[1]["role"] == "user"
    assert "German" in messages[1]["content"]
    assert "English" in messages[1]["content"]


def test_build_messages_with_context():
    messages = build_messages("Bank", "German", "English", "Ich sitze auf der Bank")
    assert len(messages) == 2
    assert "Context: Ich sitze auf der Bank" in messages[1]["content"]


def test_system_prompt_contains_rules():
    assert "CRITICAL RULES:" in SYSTEM_PROMPT
    assert "Output ONLY the translation" in SYSTEM_PROMPT
    assert "Examples:" in SYSTEM_PROMPT
