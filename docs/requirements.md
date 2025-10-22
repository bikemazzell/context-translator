# Context Translator Requirements

## Project Overview
A Firefox extension for context-aware translation that provides inline word/phrase translation on any webpage, similar to Readlang.com. Runs locally with a Python backend communicating with LLM inference servers (LMStudio or llama-server).

**Requirements:**
- Python 3.12+ (developed and tested with Python 3.12.x)
- Firefox Developer Edition or Nightly (for unsigned extensions)
- LLM server (LMStudio or llama.cpp server) running locally

## Core Functionality

### 1. Extension Behavior
- Browser extension activation via toolbar icon or keyboard shortcut
- Content script injects translation functionality into web pages
- Creates floating toolbar for configuration
- Works on any rendered HTML content (static or SPA)
- Native messaging with Python backend (no HTTP, no CORS issues)

### 2. Floating Toolbar
**Persistent Settings (localStorage):**
- Source language selector (manual selection)
- Target language selector (manual selection)
- Toggle: Translation ON/OFF
- Context mode toggle: Use surrounding text for better translation accuracy
- Display mode selector: Tooltip | Popover | Inline (above word)

**Visual Design:**
- Minimal, non-intrusive floating bar
- Draggable/repositionable
- Collapsible to icon when not in use

### 3. Translation Interaction
**When Toggle ON:**
- Single-click on word: Translate that word
- Click-drag selection: Translate entire phrase as single unit
- Display translation according to selected display mode:
  - **Tooltip**: Small hover-style popup above word
  - **Popover**: Larger popup with additional info
  - **Inline**: Insert translation directly above word in page flow

**When Toggle OFF:**
- Normal page interaction behavior preserved

**Context Mode:**
- When enabled: Send surrounding sentence/paragraph to LLM for contextual translation
- When disabled: Send only selected word/phrase

### 4. Translation Display
- Position translation visually above/near selected text
- Auto-dismiss on click elsewhere or after timeout
- Clean, readable typography
- Distinguish translation visually from page content

## Backend Architecture

### 1. Python Service (FastAPI)
**Endpoints:**
- `POST /translate` - Accept translation requests
  - Request body: `{text, source_lang, target_lang, context?}`
  - Response: `{translation, cached}`
- `GET /health` - Service health check
- `GET /languages` - Return supported language list

**Configuration:**
- LLM provider selection: LMStudio (OpenAI-compatible) or llama-server
- Configurable endpoint URL (default: `http://localhost:1234/v1/chat/completions`)
- Fallback provider support

### 2. LLM Integration

#### Prompt Templates

**System Prompt (OpenAI-compatible API):**
```
You are a precise translation tool. Your only task is to translate text between languages.

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
Output: a lock
```

**User Prompt Template (Without Context):**
```
Translate from {source_lang} to {target_lang}:

{text}
```

**User Prompt Template (With Context):**
```
Translate from {source_lang} to {target_lang}:

Text to translate: {text}

Context: {context}

Translation:
```

**Example API Request (OpenAI-compatible):**
```json
{
  "model": "gemma-3-27b-it",
  "messages": [
    {
      "role": "system",
      "content": "[System prompt as above]"
    },
    {
      "role": "user",
      "content": "Translate from German to English:\n\nText to translate: Fenster\n\nContext: Das Fenster ist offen.\n\nTranslation:"
    }
  ],
  "temperature": 0.3,
  "max_tokens": 100,
  "stop": ["\n\n", "Input:", "Translate"]
}
```

**Response Parsing:**
- Extract `choices[0].message.content`
- Strip whitespace and common artifacts
- Validate output length (should be similar magnitude to input)
- Reject responses with explanatory text patterns:
  - "The translation is..."
  - "This means..."
  - "Explanation:"
  - Responses in quotes unless input was quoted

**Temperature & Parameters:**
- Temperature: 0.3 (low for consistency, not 0 to allow natural phrasing)
- Max tokens: 100 (sufficient for phrases, prevents runaway generation)
- Stop sequences: `["\n\n", "Input:", "Translate"]` (prevent continuation)
- Top-p: 0.9 (optional, for more focused output)

#### Prompt Engineering Considerations

**Handling Ambiguity:**
- Without context: Provide most common/general translation
- With context: Use surrounding text to disambiguate
- Multi-meaning words (e.g., German "Schloss" = castle/lock): Context is critical

**Edge Cases:**
- **Proper nouns**: Leave untranslated unless standard translation exists (e.g., "Deutschland" → "Germany")
- **Mixed languages**: Translate only the target language portion
- **Numbers/dates**: Preserve formatting
- **Technical terms**: Prefer standard industry translations
- **Idioms**: Translate meaning, not literal words (with context)

**Quality Control:**
- If LLM returns explanation despite prompt, apply regex filter:
  - Remove everything before first actual word
  - Remove sentences containing "is", "means", "translates to"
- If output is empty or suspiciously long (>3x input), mark as error and don't cache

**Model-Specific Adjustments:**
The prompt template should work with:
- Gemma 2/3 (Google)
- Llama 3+ (Meta)
- Mistral/Mixtral
- Qwen models

For models with weaker instruction-following, consider:
- Adding few-shot examples directly in user prompt
- More explicit formatting: "Translation: {text} = "
- Stricter stop sequences

**API Support:**
- Primary: OpenAI-compatible API (`/v1/chat/completions`)
- Secondary: llama.cpp server API (`/completion` endpoint with adapted prompt)
- Configurable provider switching

### 3. Caching System
**Implementation:**
- Simple disk-based cache (SQLite with async support via aiosqlite)
- Cache key: SHA256 hash of `(text, source_lang, target_lang, context_text)`
  - Includes actual context text, not just a boolean flag
  - This provides better cache granularity: same word with different contexts = different cache entries
  - Empty string for context_text when context mode is disabled
- Cache value: `{translation, timestamp, original metadata}`
- TTL for cache entries (configurable, default: 30 days)
- Cache size limit with LRU eviction
- WAL mode enabled for better concurrent access

**Structure:**
```
cache/
  translations.db  (SQLite preferred for simplicity)
```

### 4. Error Handling
**Toast Notifications (frontend):**
- LLM server unreachable: "Translation service unavailable"
- Translation failure: "Translation failed, please retry"
- Invalid language selection: "Please select both languages"
- Network timeout: "Request timed out"

**Graceful Degradation:**
- Cache-first strategy when available
- Clear error messages
- Retry mechanism (3 attempts with exponential backoff)

## Technical Implementation

### Frontend (Firefox Extension)
**Technology:**
- Vanilla JavaScript (no frameworks for minimal footprint)
- browser.storage.local for settings persistence
- Event delegation for click handling
- Native messaging API for backend communication

**Browser Support:**
- Firefox Developer Edition or Nightly (unsigned extension support)

### Backend (Python)
**Technology Stack:**
- FastAPI (web framework)
- uvicorn (ASGI server)
- httpx (async HTTP client for LLM requests)
- SQLite (caching)
- pydantic (request/response validation)

**Project Structure:**
```
context-translator/
├── backend/
│   ├── app/
│   │   ├── main.py          (FastAPI app)
│   │   ├── config.py        (Configuration)
│   │   ├── models.py        (Pydantic models)
│   │   ├── cache.py         (Cache implementation)
│   │   ├── llm_client.py    (LLM provider abstraction)
│   │   └── prompts.py       (Prompt templates)
│   ├── tests/
│   │   ├── test_translation.py
│   │   ├── test_cache.py
│   │   └── test_llm_client.py
│   └── requirements.txt
├── extension/
│   ├── manifest.json        (Extension manifest)
│   ├── background/          (Background scripts)
│   ├── content/             (Content scripts)
│   ├── popup/               (Extension popup UI)
│   ├── native-host/         (Native messaging host)
│   └── icons/               (Extension icons)
├── config.yaml              (Server configuration)
└── README.md
``````

## Security Considerations

### 1. Input Validation
- Sanitize all user input before LLM submission
- Validate language codes against allowlist
- Maximum text length limits (prevent abuse)
- Rate limiting per session (prevent LLM overload)

### 2. Injection Protection
- No eval() usage in content scripts
- Sanitize LLM responses before DOM insertion
- Proper extension permissions and CSP compliance

### 3. Local-Only Operation
- No external data transmission (privacy by design)
- CORS configured for localhost only
- No authentication required (localhost assumed trusted)

## Testing Strategy

### 1. Backend Tests
- Unit tests for cache operations
- Integration tests for LLM client (mocked responses)
- End-to-end tests for translation flow
- Error handling scenarios
- Performance tests (cache hit/miss scenarios)

**Coverage Target:** >90%

### 2. Frontend Tests
- Manual testing on sample pages
- Test cases:
  - Single word translation
  - Multi-word phrase translation
  - Settings persistence
  - Display mode switching
  - Context mode impact
  - Error toast display

### 3. Integration Tests
- Full extension → backend → LLM flow
- Cache behavior verification
- Provider failover testing
- Native messaging communication

## Configuration

### Backend Configuration (config.yaml)
```yaml
server:
  host: localhost
  port: 8080

llm:
  primary:
    provider: lmstudio  # or llama-server
    endpoint: http://localhost:1234/v1/chat/completions
    model_name: gemma-3-27b-it
    timeout: 30
  fallback:
    provider: llama-server
    endpoint: http://localhost:8080/completion
    model_name: gemma-3-12b-it
    timeout: 30

cache:
  backend: sqlite
  path: ./cache/translations.db
  ttl_days: 30
  max_size_mb: 100

translation:
  max_text_length: 500
  context_window_chars: 200
  supported_languages:
    - English
    - German
    - French
    - Spanish
    - Italian
    # ... extensible
```

### Extension Configuration (browser.storage.local)
```javascript
{
  sourceLang: "German",
  targetLang: "English",
  enabled: false,
  contextMode: true,
  displayMode: "inline"  // tooltip or inline
}
```

## Performance Requirements
- Translation response time: <2s (including LLM inference)
- Cache lookup: <50ms
- Extension activation: <500ms
- UI interactions: <100ms response

## Future Extensibility
**Designed to support (but not implemented initially):**
- Offline translation models (no LLM server required)
- Translation history/review panel
- Flashcard export for spaced repetition
- Multiple simultaneous language pairs
- Pronunciation audio (TTS integration)

## Success Criteria
1. Extension successfully activates on 95% of tested websites
2. Translation accuracy acceptable for casual learning
3. No noticeable performance impact on target pages
4. Settings persist correctly across sessions
5. Clear error messages for all failure scenarios
6. Cache reduces LLM calls by >70% for repeated content
7. Native messaging communication reliable and performant

## Development Phases

### Phase 1: Core Backend (Week 1)
- FastAPI server setup
- LMStudio API integration
- Basic caching (SQLite)
- Translation endpoint
- Unit tests

### Phase 2: Extension Development (Week 1-2)
- Firefox extension manifest and structure
- Content script injection
- Simple tooltip/inline translation
- Settings toolbar
- browser.storage.local persistence
- Native messaging setup

### Phase 3: Enhanced Features (Week 2)
- Context mode implementation
- Multiple display modes
- llama-server support
- Error handling & toasts

### Phase 4: Polish & Testing (Week 3)
- Integration tests
- Browser compatibility testing
- Performance optimization
- Documentation
- Cache performance tuning

## Deliverables
1. Python backend service with native messaging host
2. Firefox extension (.xpi package)
3. Configuration templates
4. README with setup instructions
5. Test suite with >80% coverage
6. Example LLM prompts for common models
7. Installation scripts for native messaging
