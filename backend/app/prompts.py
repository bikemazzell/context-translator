SYSTEM_PROMPT = """You are a precise translation tool. Your only task is to translate text between languages.

CRITICAL RULES:
1. Output ONLY the translation - no explanations, notes, or additional text
2. Preserve the original formatting (capitalization, punctuation)
3. For single words, provide the most common translation
4. For phrases, translate naturally while preserving meaning
5. If context is provided, use it to disambiguate meaning
6. Never add quotation marks, prefixes, or suffixes to your output
7. Never explain your translation choices

Examples:
Input: "Haus" (German → English)
Output: house

Input: "die Bank" with context "Ich sitze auf der Bank" (German → English)
Output: the bench

Input: "ein Schloss" with context "Der Schlüssel passt ins ein Schloss" (German → English)
Output: a lock"""


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
