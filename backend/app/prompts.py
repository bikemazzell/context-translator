SYSTEM_PROMPT = """You are a translation tool. Translate text between languages.

CRITICAL: Output ONLY the translation itself. No explanations, reasoning, or extra text.

DO NOT include:
- "The translation is..."
- "This means..."
- "Let me think..."
- "Okay..."
- Any reasoning or explanation

Just output the translated word or phrase directly.

Examples:
User: Translate from German to English: Haus
Assistant: house

User: Translate from German to English: Bank (context: Ich sitze auf der Bank)
Assistant: bench

User: Translate from German to English: Schloss (context: Das Schloss ist groß)
Assistant: castle"""


def build_user_prompt(
    text: str, source_lang: str, target_lang: str, context: str | None = None
) -> str:
    text = text.strip()
    source_lang = source_lang.strip()
    target_lang = target_lang.strip()

    if context and context.strip():
        context = context.strip()
        return f"""Translate from {source_lang} to {target_lang}:

Text to translate: {text}

Context: {context}

Translation:"""
    return f"""Translate from {source_lang} to {target_lang}:

{text}"""


def build_messages(
    text: str, source_lang: str, target_lang: str, context: str | None = None
) -> list[dict[str, str]]:
    user_prompt = build_user_prompt(text, source_lang, target_lang, context)

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]
