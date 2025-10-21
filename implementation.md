# Context Translator - Implementation Plan

## Implementation Philosophy

**Core Principles:**
- Build vertically: Complete one feature end-to-end before moving to the next
- Test early and often: Write tests alongside implementation
- Fail fast: Validate each component before building on top of it
- Keep it simple: Favor clarity over cleverness
- Continuous validation: Run linters, type checkers, and tests after each task

**Quality Gates:**
Each task includes validation steps to ensure quality before proceeding.

---

## Phase 1: Project Foundation & Backend Core

### Task 1.1: Project Structure Setup
**Objective:** Create the basic project directory structure and configuration files

**Steps:**
1. Create directory structure:
   ```
   context-translator/
   ├── backend/
   │   ├── app/
   │   └── tests/
   ├── frontend/
   │   └── src/
   └── cache/
   ```
2. Create Python package files:
   - `backend/__init__.py` (empty, marks as package)
   - `backend/app/__init__.py` (empty, marks as package)
   - `backend/tests/__init__.py` (empty, for test discovery)
3. Initialize git repository
4. Create `.gitignore` (exclude `cache/`, `__pycache__/`, `.pytest_cache/`, `venv/`, `*.pyc`, `.mypy_cache/`, `frontend/dist/`)
5. Create `backend/requirements.txt` with initial dependencies:
   - fastapi
   - uvicorn[standard]
   - httpx
   - pydantic
   - pyyaml
   - aiosqlite (async SQLite)
   - pytest
   - pytest-asyncio
   - pytest-cov
   - ruff (linter/formatter)
   - mypy (type checker)
6. Create `backend/requirements-dev.txt` for development tools (can be empty if all in main requirements)
7. Create `config.yaml` with minimal configuration

**Validation:**
- [x] Directory structure matches specification
- [x] All `__init__.py` files created
- [x] Git initialized successfully
- [x] Requirements files are parseable
- [x] `.gitignore` includes all necessary patterns

---

### Task 1.2: Development Environment Setup
**Objective:** Establish Python environment using miniconda and install dependencies

**Steps:**
1. Activate miniconda environment: `conda activate ai312`
2. Verify Python version: `python --version` (should be 3.12.x)
3. Install dependencies: `pip install -r backend/requirements.txt -r backend/requirements-dev.txt`
4. Create `backend/pyproject.toml` for tool configuration:
   - ruff configuration (line length, rules)
   - mypy configuration (strict mode)
   - pytest configuration

**Validation:**
- [x] Environment activates: `conda activate ai312`
- [x] Python 3.12.x confirmed
- [x] All packages install successfully
- [x] `ruff --version` works
- [x] `mypy --version` works
- [x] `pytest --version` works

**Note:** All subsequent Python commands assume `conda activate ai312` has been run first.

---

### Task 1.3: Configuration Module
**Objective:** Implement configuration loading from YAML file

**Implementation:**
1. Create `backend/app/config.py`:
   - Define `Config` dataclass with all settings including:
     - Server (host, port)
     - LLM (provider, endpoint, timeout, model_name)
     - Cache (path, ttl_days, max_size_mb)
     - Translation (max_text_length, context_window_chars, supported_languages)
   - Implement `load_config(path: str) -> Config`
   - Handle missing file with sensible defaults
   - Validate required fields
2. Populate `config.yaml` with complete settings from requirements:
   ```yaml
   llm:
     primary:
       provider: lmstudio
       endpoint: http://localhost:1234/v1/chat/completions
       timeout: 30
       model_name: gemma-2-27b-it  # ADD THIS
   ```

**Validation:**
- [x] `ruff check backend/app/config.py` passes
- [x] `mypy backend/app/config.py` passes (strict mode)
- [x] Manual test: Load config successfully
- [x] Manual test: Handle missing config file gracefully
- [x] Manual test: Validate all config sections parse correctly
- [x] Verify model_name is loaded and accessible

---

### Task 1.4: Pydantic Models
**Objective:** Define request/response models for API

**Implementation:**
1. Create `backend/app/models.py`:
   - `TranslationRequest` (text, source_lang, target_lang, context optional)
   - `TranslationResponse` (translation, cached boolean)
   - `HealthResponse` (status, llm_available)
   - `LanguageListResponse` (languages list)
2. Add validation:
   - Text length limits
   - Language code format
   - Non-empty fields

**Validation:**
- [x] `ruff check backend/app/models.py` passes
- [x] `mypy backend/app/models.py` passes
- [x] Create unit test `backend/tests/test_models.py`:
  - Valid request models parse correctly
  - Invalid requests raise ValidationError
  - Test length limits
  - Test optional fields
- [x] `pytest backend/tests/test_models.py -v` passes

---

### Task 1.5: Prompt Templates Module
**Objective:** Implement prompt generation for LLM requests

**Implementation:**
1. Create `backend/app/prompts.py`:
   - `SYSTEM_PROMPT` constant (from requirements)
   - `build_user_prompt(text: str, source_lang: str, target_lang: str, context: str | None) -> str`
   - `build_messages(...)` for OpenAI-compatible format
2. Include validation logic:
   - Strip excessive whitespace
   - Limit context length if provided
   - Format language names consistently

**Validation:**
- [x] `ruff check backend/app/prompts.py` passes
- [x] `mypy backend/app/prompts.py` passes
- [x] Create unit test `backend/tests/test_prompts.py`:
  - Test prompt without context
  - Test prompt with context
  - Test context truncation
  - Verify message structure
- [x] `pytest backend/tests/test_prompts.py -v` passes

---

### Task 1.6: Cache Implementation
**Objective:** Build async SQLite-based translation cache

**Implementation:**
1. Create `backend/app/cache.py`:
   - `TranslationCache` class using `aiosqlite`
   - `async __init__(db_path: str)`:
     - Create cache directory if it doesn't exist
     - Initialize async SQLite connection
     - Enable WAL mode for better concurrent access
   - `async _create_schema()` - create translations table:
     - Columns: hash (TEXT PRIMARY KEY), text (TEXT), source_lang (TEXT), target_lang (TEXT), translation (TEXT), timestamp (INTEGER)
     - Index on hash for lookups (PRIMARY KEY provides this)
     - Index on timestamp for efficient TTL cleanup
   - `_generate_key(text, source_lang, target_lang, context_text) -> str`:
     - Hash includes actual context text (not just boolean) for better cache granularity
     - Use SHA256 of `f"{text}|{source_lang}|{target_lang}|{context_text or ''}"`
   - `async get(key: str) -> str | None` - retrieve cached translation
   - `async set(key: str, text: str, source_lang: str, target_lang: str, translation: str)` - store translation
   - `async clear_expired(ttl_days: int)` - remove old entries (uses timestamp index)
   - `async get_size() -> int` - get cache database file size in bytes
   - `async close()` - cleanup connection
2. Schema with version tracking and WAL mode:
   ```sql
   -- Enable WAL mode for better concurrent access
   PRAGMA journal_mode=WAL;

   -- Schema version table for future migrations
   CREATE TABLE IF NOT EXISTS schema_version (
     version INTEGER PRIMARY KEY
   );
   INSERT OR IGNORE INTO schema_version (version) VALUES (1);

   -- Translations table
   CREATE TABLE IF NOT EXISTS translations (
     hash TEXT PRIMARY KEY,
     text TEXT NOT NULL,
     source_lang TEXT NOT NULL,
     target_lang TEXT NOT NULL,
     translation TEXT NOT NULL,
     timestamp INTEGER NOT NULL
   );
   CREATE INDEX IF NOT EXISTS idx_timestamp ON translations(timestamp);
   ```
3. Directory creation:
   ```python
   import os
   from pathlib import Path

   # Ensure cache directory exists
   cache_dir = Path(db_path).parent
   cache_dir.mkdir(parents=True, exist_ok=True)
   ```
4. Cache version handling:
   - Check schema_version on init
   - If version mismatch, log warning and clear cache (safe to delete)
   - Document that cache can always be safely deleted
5. Use async context manager pattern

**Validation:**
- [x] `ruff check backend/app/cache.py` passes
- [x] `mypy backend/app/cache.py` passes
- [x] Create unit test `backend/tests/test_cache.py`:
  - Test cache initialization creates schema
  - Test cache directory creation (non-existent path)
  - Test WAL mode is enabled
  - Test async set/get round trip
  - Test cache miss returns None
  - Test key generation is consistent
  - Test key generation includes context text
  - Test expired entry cleanup
  - Test cache size calculation
  - Test proper connection cleanup
  - Test schema version checking
- [x] `pytest backend/tests/test_cache.py -v` passes
- [x] Manual test: Inspect SQLite file with `sqlite3`:
  - Verify indexes exist: `.schema translations`
  - Verify WAL mode: `PRAGMA journal_mode;` should return `wal`
  - Check for WAL files: `translations.db-wal`, `translations.db-shm`

---

### Task 1.7: LLM Client - Base Structure
**Objective:** Create abstraction layer for LLM providers

**Implementation:**
1. Create `backend/app/llm_client.py`:
   - Abstract base class `LLMClient` with `translate()` method
   - `OpenAICompatibleClient` implementation:
     - `__init__(endpoint: str, timeout: int, model: str)`
     - `async translate(text, source_lang, target_lang, context) -> str`
     - POST to `/v1/chat/completions`
     - Parse response
     - Handle HTTP errors
   - `_clean_response(text: str) -> str` - strip artifacts, validate
2. Use httpx for async HTTP requests
3. Implement retry logic with exponential backoff

**Validation:**
- [x] `ruff check backend/app/llm_client.py` passes
- [x] `mypy backend/app/llm_client.py` passes
- [x] Create unit test `backend/tests/test_llm_client.py`:
  - Mock httpx responses
  - Test successful translation
  - Test HTTP error handling
  - Test timeout handling
  - Test response cleaning (remove explanations)
  - Test retry mechanism
- [x] `pytest backend/tests/test_llm_client.py -v --cov=backend/app/llm_client.py` passes (>80% coverage)

---

### Task 1.8: LLM Client - Response Cleaning
**Objective:** Implement robust response parsing and validation

**Implementation:**
1. Enhance `_clean_response(response_text: str, original_text: str)` in `llm_client.py`:
   - Strip leading/trailing whitespace
   - Remove quotes if they weren't in original text
   - Detect and remove explanation patterns (regex-based):
     - Lines containing "translation is", "this means", "translates to" (case insensitive)
     - Lines starting with "Explanation:", "Note:", "Translation:"
   - Validate length (not >3x original input length, not empty)
   - For multi-sentence responses:
     - Keep full response if it's a natural phrase translation
     - Only trim if response contains meta-commentary
     - Use simple heuristic: if contains "is", "means", "refers to" → extract first part before these words
   - Return cleaned translation or raise ValueError if invalid
2. Add logging (INFO level) when aggressive cleaning is applied
3. Pass original text to cleaning function for context

**Validation:**
- [x] `ruff check backend/app/llm_client.py` passes
- [x] `mypy backend/app/llm_client.py` passes
- [x] Extend `backend/tests/test_llm_client.py`:
  - Test cleaning quoted responses
  - Test removing explanation text patterns
  - Test preserving valid multi-word translations
  - Test validation errors for bad responses (empty, too long)
  - Test logging when cleaning applied
- [x] `pytest backend/tests/test_llm_client.py -v` passes

**Note:** Conservative cleaning is better than aggressive - if uncertain, keep the text.

---

### Task 1.9: FastAPI Application Setup
**Objective:** Create basic FastAPI app with health endpoint

**Implementation:**
1. Create `backend/app/main.py`:
   - Initialize FastAPI app
   - Load configuration
   - Initialize cache
   - Initialize LLM client
   - CORS middleware configuration:
     ```python
     from fastapi.middleware.cors import CORSMiddleware
     app.add_middleware(
         CORSMiddleware,
         allow_origins=["*"],  # Allow all origins - safe because we bind to localhost
         allow_credentials=False,  # Don't allow credentials to prevent CSRF
         allow_methods=["GET", "POST"],
         allow_headers=["Content-Type"],
     )
     ```
     - Rationale: Bookmarklet runs from various page origins (http://, https://, file://)
     - Security: Service binds only to localhost, inaccessible from network
     - No credentials needed, so CSRF risk is minimal
2. Implement `GET /health`:
   - Quick LLM endpoint check:
     - Try simple HTTP GET/HEAD to base LLM endpoint URL
     - Use 2s timeout to avoid hanging
     - Don't send actual translation request (too slow for health check)
     - Alternative: Skip LLM check entirely, just return service status
     - Recommended: Return `{"status": "healthy", "llm_checked": false}`
   - Return status and optionally LLM availability boolean
   - Never fail health check even if LLM unavailable (degraded state is acceptable)
   - Health check is for service availability, not LLM availability
3. Add startup/shutdown events for resource management
4. Configure uvicorn to run on port 8080 (matches config.yaml)

**Validation:**
- [x] `ruff check backend/app/main.py` passes
- [x] `mypy backend/app/main.py` passes
- [x] Start server: `uvicorn backend.app.main:app --reload --host localhost --port 8080`
- [x] Server starts without errors on port 8080
- [x] `curl http://localhost:8080/health` returns valid JSON
- [x] Check CORS headers: `curl -v -H "Origin: https://example.com" http://localhost:8080/health`
- [x] Verify Access-Control-Allow-Origin: * in response

---

### Task 1.10: Translation Endpoint - Core Logic
**Objective:** Implement the main translation endpoint

**Implementation:**
1. Add `POST /translate` to `backend/app/main.py`:
   - Accept `TranslationRequest` body
   - Generate cache key
   - Check cache first
   - If cache miss:
     - Call LLM client
     - Store in cache
     - Return result
   - Return `TranslationResponse` with cached flag
2. Add error handling:
   - LLM unreachable → 503
   - Invalid request → 422
   - Translation failure → 500
3. Add request logging

**Validation:**
- [x] `ruff check backend/app/main.py` passes
- [x] `mypy backend/app/main.py` passes
- [x] Manual test with curl (requires running LLM server):
  ```bash
  curl -X POST http://localhost:8080/translate \
    -H "Content-Type: application/json" \
    -d '{"text": "Haus", "source_lang": "German", "target_lang": "English"}'
  ```
- [x] Verify cache hit on second identical request
- [x] Test error cases (invalid JSON, missing fields)

---

### Task 1.11: Languages Endpoint
**Objective:** Provide list of supported languages

**Implementation:**
1. Add `GET /languages` to `backend/app/main.py`:
   - Read supported languages from config
   - Return `LanguageListResponse`
2. Load from config or provide hardcoded fallback list

**Validation:**
- [x] `ruff check backend/app/main.py` passes
- [x] `mypy backend/app/main.py` passes
- [x] `curl http://localhost:8080/languages` returns language list
- [x] Verify JSON structure matches spec

---

### Task 1.12: LLM Prompt Testing (Real LLM)
**Objective:** Validate prompts with real LLM before writing integration tests

**Prerequisites:** LMStudio or llama-server running with a model loaded

**Rationale:** Test with real LLM first to ensure prompts work correctly, then use insights to create realistic mocks for integration tests.

**Steps:**
1. Start LLM server (LMStudio or llama-server)
2. Configure `config.yaml` with correct endpoint
3. Start FastAPI server
4. Test various translation scenarios:
   - Single word: "Haus" (German → English)
   - Phrase: "Guten Morgen" (German → English)
   - With context: "Bank" with "Ich sitze auf der Bank"
   - Ambiguous word: "Schloss" with different contexts
   - Reverse direction: "house" (English → German)
5. Verify responses are clean (no explanations)
6. Document any prompt adjustments needed

**Validation:**
- [ ] Single words translate correctly
- [ ] Phrases translate naturally
- [ ] Context improves ambiguous translations
- [ ] No explanation text in responses (if present, adjust prompts or cleaning logic)
- [ ] Response time <2s for most requests
- [ ] Cache improves subsequent request times to <50ms
- [ ] Document actual LLM response patterns (for mock creation)

**Note:** Use findings from this task to create realistic mocks in Task 1.13.

---

### Task 1.13: Integration Tests - Backend
**Objective:** Create end-to-end tests for backend with realistic mocks

**Implementation:**
1. Create `backend/tests/test_integration.py`:
   - Use TestClient from fastapi.testclient
   - Mock LLM responses based on patterns observed in Task 1.12
   - Test full translation flow
   - Test cache behavior across requests
   - Test error scenarios
   - Test health endpoint
   - Test languages endpoint
2. Use pytest fixtures for test client and mock LLM
3. Create realistic mock responses that mimic actual LLM behavior

**Validation:**
- [x] `ruff check backend/tests/test_integration.py` passes
- [x] `mypy backend/tests/test_integration.py` passes
- [x] `pytest backend/tests/ -v --cov=backend/app --cov-report=term-missing` passes
- [x] Coverage >80% for all modules
- [x] All tests pass consistently
- [x] Mocks accurately represent real LLM behavior

---

### Task 1.14: Backend Documentation
**Objective:** Document backend API and setup

**Implementation:**
1. Create `backend/README.md`:
   - Installation instructions
   - Configuration guide
   - API documentation (endpoints, request/response examples)
   - Running tests
   - Development workflow
2. Add docstrings to all public functions
3. Add inline comments for complex logic only

**Validation:**
- [x] Follow installation steps on fresh clone
- [x] All commands work as documented
- [x] API examples are accurate
- [x] `ruff check backend/` passes (checks docstring coverage)

---

## Phase 2: Frontend - Bookmarklet & Basic Translation

### Task 2.1: Frontend Project Structure
**Objective:** Set up frontend development environment

**Steps:**
1. Create directory structure:
   ```
   frontend/
   ├── src/
   │   ├── bookmarklet.js
   │   ├── injected.js
   │   ├── toolbar.js
   │   ├── translator.js
   │   ├── config.js
   │   └── styles.css
   ├── dist/
   ├── package.json
   └── build.sh
   ```
2. Create `package.json` with minimal dependencies:
   ```json
   {
     "name": "context-translator-frontend",
     "version": "0.1.0",
     "devDependencies": {
       "terser": "^5.0.0",
       "eslint": "^8.0.0"
     },
     "scripts": {
       "build": "./build.sh",
       "lint": "eslint src/"
     }
   }
   ```
3. Create `build.sh` script to concatenate and minify:
   - Concatenate all source files
   - Minify with terser
   - Generate bookmarklet.txt
4. Install Node.js dependencies: `npm install`
5. Optional: Create `.eslintrc.json` for code quality

**Validation:**
- [ ] Directory structure created
- [ ] `npm install` succeeds
- [ ] Build script is executable: `chmod +x build.sh`
- [ ] `npm run lint` works (even if no files yet)

---

### Task 2.2: Configuration Constants
**Objective:** Create centralized configuration for frontend

**Implementation:**
1. Create `frontend/src/config.js`:
   ```javascript
   const CONFIG = {
     BACKEND_URL: 'http://localhost:8080',
     STORAGE_KEY: 'context-translator-settings',
     DEFAULT_SETTINGS: {
       sourceLang: 'German',
       targetLang: 'English',
       translationEnabled: false,
       contextMode: false,
       displayMode: 'tooltip'
     },
     REQUEST_TIMEOUT: 5000,
     TOAST_DURATION: 3000
   };
   ```
2. Export for use in other modules

**Validation:**
- [ ] `npm run lint` passes
- [ ] Constants are clearly named
- [ ] Backend URL matches server port (8080)

---

### Task 2.3: Injected Script - Foundation
**Objective:** Create the core injection script that runs on target pages

**Implementation:**
1. Create `frontend/src/injected.js`:
   - IIFE wrapper to avoid global pollution
   - Check if already injected (prevent double-injection)
   - Create namespace object: `window.ContextTranslator`
   - Initialize configuration from localStorage
   - Log initialization status (console.info, not console.log)
   - Handle CSP violations gracefully:
     - Wrap injection in try-catch
     - If script injection fails, show user-friendly error
     - Detect CSP via error message patterns
2. Add cleanup function to remove injection

**Validation:**
- [ ] `npm run lint` passes
- [ ] Test injection on simple HTML page
- [ ] Verify no console errors
- [ ] Verify namespace exists: `window.ContextTranslator`
- [ ] Test double-injection prevention
- [ ] Test on page with strict CSP (e.g., GitHub) - should fail gracefully with message

---

### Task 2.4: Settings Storage
**Objective:** Implement localStorage persistence for user settings

**Implementation:**
1. Create `frontend/src/settings.js` (separate module):
   - Import CONFIG constants
   - `Settings` object with defaults from CONFIG:
     ```javascript
     {
       sourceLang: "German",
       targetLang: "English",
       translationEnabled: false,
       contextMode: false,
       displayMode: "tooltip"
     }
     ```
   - `loadSettings()` from localStorage
   - `saveSettings(settings)` to localStorage
   - `getSettings()` accessor
   - `updateSetting(key, value)` with validation
2. Use key: `context-translator-settings`

**Validation:**
- [ ] ESLint passes (or manual review)
- [ ] Test in browser console:
  - Save settings
  - Reload page
  - Verify settings persist
  - Verify defaults work when localStorage empty
- [ ] Verify settings validation (reject invalid modes)

---

### Task 2.5: Toolbar UI - HTML Structure
**Objective:** Create floating toolbar DOM structure

**Implementation:**
1. Create `frontend/src/toolbar.js`:
   - Create Shadow DOM for isolation
   - Build toolbar HTML structure:
     - Language selectors (from: and to:)
     - Toggle switch (ON/OFF)
     - Settings button (collapsed view)
     - Context mode toggle
     - Display mode selector
   - Make draggable
   - Collapsible to icon
2. Inject toolbar into page

**Validation:**
- [ ] ESLint passes
- [ ] Test on sample page:
  - Toolbar appears
  - Toolbar is draggable
  - Toolbar doesn't interfere with page layout
  - Shadow DOM isolation works (page CSS doesn't affect toolbar)
- [ ] Test on multiple websites (Wikipedia, GitHub, news site)

---

### Task 2.6: Toolbar UI - Styling
**Objective:** Style the toolbar for minimal, professional appearance

**Implementation:**
1. Create `frontend/src/styles.css`:
   - Minimal design, neutral colors
   - Fixed positioning
   - Z-index high enough to appear above content
   - Responsive sizing
   - Smooth transitions for collapse/expand
   - Hover states
   - Accessible focus indicators
2. Inject styles into Shadow DOM

**Validation:**
- [ ] Manual visual review on test pages
- [ ] Test collapsed and expanded states
- [ ] Test on light and dark websites
- [ ] Verify readability
- [ ] Test accessibility (keyboard navigation)
- [ ] Verify no visual conflicts with host pages

---

### Task 2.7: Toolbar - Language Population
**Objective:** Fetch and populate language selectors from backend

**Implementation:**
1. Extend `frontend/src/toolbar.js`:
   - Fetch languages from `GET /languages` on initialization
   - Populate `<select>` dropdowns
   - Set selected values from settings
   - Handle fetch errors gracefully (use hardcoded fallback list)
2. Add loading state during fetch

**Validation:**
- [ ] ESLint passes
- [ ] Test with backend running:
  - Languages populate correctly
  - Previously selected languages are pre-selected
- [ ] Test with backend offline:
  - Fallback list loads
  - No console errors
  - Toolbar still functional

---

### Task 2.8: Toolbar - Event Handlers
**Objective:** Wire up toolbar controls to settings

**Implementation:**
1. Extend `frontend/src/toolbar.js`:
   - Language selector change events → update settings
   - Toggle switch → enable/disable translation mode
   - Context mode toggle → update settings
   - Display mode selector → update settings
   - Collapse/expand button
2. Update UI to reflect current state on load
3. Add visual feedback (toggle switch animation, etc.)

**Validation:**
- [ ] ESLint passes
- [ ] Test all controls:
  - Language changes save to localStorage
  - Toggle switch works visually
  - Settings persist after reload
  - UI reflects loaded settings correctly
- [ ] Check browser console for errors

---

### Task 2.9: Translation Request Handler
**Objective:** Implement API communication with backend

**Implementation:**
1. Create `frontend/src/translator.js`:
   - Import CONFIG for BACKEND_URL and REQUEST_TIMEOUT
   - `async translateText(text, context = null) -> string`:
     - Get settings (source/target lang, context mode)
     - Build request body
     - Implement timeout using AbortController:
       ```javascript
       const controller = new AbortController();
       const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);
       try {
         const response = await fetch(url, {
           signal: controller.signal,
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(requestBody)
         });
         clearTimeout(timeoutId);
         // ... handle response
       } catch (error) {
         clearTimeout(timeoutId);
         if (error.name === 'AbortError') {
           throw new Error('Request timed out');
         }
         throw error;
       }
       ```
     - Parse response
     - Handle errors
     - Return translation
   - `handleError(error)` → show toast notification with user-friendly message
   - Debounce rapid requests (300ms minimum between requests):
     ```javascript
     let lastRequestTime = 0;
     const DEBOUNCE_MS = 300;
     // Check if enough time has passed since last request
     ```

**Validation:**
- [ ] `npm run lint` passes
- [ ] Test with backend running:
  - Translation request from console works
  - Verify correct request format
  - Verify response parsing
- [ ] Test error handling:
  - Backend offline → "Cannot connect to translation server"
  - Network timeout (wait 5s) → "Request timed out"
  - Invalid response → appropriate error
  - Rapid requests → debouncing works
- [ ] Verify error toasts appear with clear messages
- [ ] Test AbortController cleanup (no memory leaks)

---

### Task 2.10: Toast Notifications
**Objective:** Implement error/info toast messages

**Implementation:**
1. Extend `frontend/src/injected.js`:
   - `showToast(message, type = "error", duration = 3000)`
   - Create toast element in Shadow DOM
   - Position at top-center
   - Fade in/out animation
   - Auto-dismiss after duration
   - Stack multiple toasts if needed
2. Style toasts (error red, info blue, success green)

**Validation:**
- [ ] ESLint passes
- [ ] Test toast display:
  - Call from console
  - Verify fade in/out
  - Test multiple simultaneous toasts
  - Verify auto-dismiss timing
- [ ] Test on different pages (ensure consistent positioning)

---

### Task 2.11: Click Handler - Word Selection
**Objective:** Capture clicks on words when translation mode enabled

**Implementation:**
1. Extend `frontend/src/injected.js`:
   - Add global click event listener
   - When translation enabled:
     - Capture clicked element
     - Extract text content
     - Ignore clicks on toolbar
     - Ignore clicks on non-text elements
   - When translation disabled:
     - Pass through to normal behavior
2. Handle edge cases (links, buttons, inputs)

**Validation:**
- [ ] ESLint passes
- [ ] Test click capture:
  - Enable translation mode
  - Click on text → logs selected text
  - Click on toolbar → no capture
  - Click on link → doesn't navigate (when enabled)
  - Disable mode → links work normally
- [ ] Test on various HTML elements (p, div, span, li, td)

---

### Task 2.12: Text Selection - Single Word
**Objective:** Extract individual words from clicked elements

**Implementation:**
1. Extend click handler in `injected.js`:
   - Get clicked text node
   - Identify word boundaries (spaces, punctuation)
   - Extract single word at click position
   - Handle multi-language word boundaries
2. Store selected word and position for display

**Validation:**
- [ ] ESLint passes
- [ ] Test word extraction:
  - Click middle of word → extracts full word
  - Click between words → extracts nearest word
  - Test punctuation (don't include in word)
  - Test hyphenated words
- [ ] Test on different languages (German, French, Spanish)

---

### Task 2.13: Text Selection - Multi-Word Phrases
**Objective:** Support click-drag to select phrases

**Implementation:**
1. Extend selection logic in `injected.js`:
   - Detect user selection (window.getSelection())
   - If selection exists and non-empty → use full selection
   - If no selection → fall back to single word
   - Trim whitespace from selection
2. Clear selection after capturing (optional UX choice)

**Validation:**
- [ ] ESLint passes
- [ ] Test phrase selection:
  - Click-drag across multiple words → captures phrase
  - Click without drag → captures single word
  - Empty selection → no action
- [ ] Test edge cases:
  - Selection spanning multiple elements
  - Selection including newlines

---

### Task 2.14: Context Extraction
**Objective:** Extract surrounding text when context mode enabled

**Implementation:**
1. Create context extraction function in `injected.js`:
   - `extractContext(element, selectedText, windowSize = 200) -> string`:
     - Algorithm:
       ```javascript
       // 1. Get the text node containing the selected text
       let textNode = element;
       while (textNode && textNode.nodeType !== Node.TEXT_NODE) {
         textNode = textNode.firstChild;
       }

       // 2. Get parent block element's full text (p, div, td, li, etc.)
       let container = element.closest('p, div, td, li, article, section');
       if (!container) container = element.parentElement;
       let fullText = container.innerText || container.textContent;

       // 3. Find selected text position in full text
       let textIndex = fullText.indexOf(selectedText);
       if (textIndex === -1) {
         // Fallback: just return surrounding text
         return fullText.slice(0, windowSize);
       }

       // 4. Extract context window around the selected text
       let startOffset = Math.max(0, textIndex - windowSize / 2);
       let endOffset = Math.min(fullText.length, textIndex + selectedText.length + windowSize / 2);

       // 5. Expand to sentence boundaries if possible
       // Look for sentence endings: . ! ? (followed by space or end)
       let contextText = fullText.slice(startOffset, endOffset);

       // Try to start at sentence beginning
       let sentenceStart = contextText.search(/[.!?]\s+/);
       if (sentenceStart !== -1 && sentenceStart < windowSize / 4) {
         contextText = contextText.slice(sentenceStart + 2);
       }

       // Try to end at sentence ending
       let sentenceEnd = contextText.lastIndexOf('. ');
       if (sentenceEnd === -1) sentenceEnd = contextText.lastIndexOf('! ');
       if (sentenceEnd === -1) sentenceEnd = contextText.lastIndexOf('? ');
       if (sentenceEnd !== -1 && sentenceEnd > contextText.length * 0.75) {
         contextText = contextText.slice(0, sentenceEnd + 1);
       }

       return contextText.trim();
       ```
     - Respect `CONFIG.CONTEXT_WINDOW_CHARS` (default 200)
     - Handle edge cases: selected text not found, very short paragraphs
   - Return empty string if context mode disabled

**Validation:**
- [ ] `npm run lint` passes
- [ ] Test context extraction:
  - Enable context mode
  - Select word in middle of paragraph → verify ~200 chars around it
  - Select word at start of paragraph → verify context includes following text
  - Select word at end of paragraph → verify context includes preceding text
  - Test with short paragraphs (<200 chars) → return full paragraph
  - Test with long paragraphs → verify window size respected
  - Test sentence boundary detection works (ends at period when possible)
  - Test when selected text appears multiple times → uses correct instance
- [ ] Disable context mode → no context sent (empty string)

---

### Task 2.15: Translation Display - Tooltip Mode
**Objective:** Show translation in tooltip above selected text

**Implementation:**
1. Create display function in `injected.js`:
   - `showTranslation(translation, element, position)`:
     - Create tooltip element (in Shadow DOM)
     - Position above clicked word/phrase
     - Fade in animation
     - Auto-dismiss on:
       - Click elsewhere
       - After 5s timeout
       - ESC key
   - Calculate position to stay in viewport
2. Style tooltip (subtle shadow, readable font)

**Validation:**
- [ ] ESLint passes
- [ ] Test tooltip display:
  - Translation appears above word
  - Doesn't overflow viewport (repositions if needed)
  - Auto-dismisses correctly
  - Multiple tooltips don't stack
- [ ] Test on various page layouts (scrolled, narrow viewport)

---

### Task 2.16: Integration - Click to Translate Flow
**Objective:** Connect all components for working translation

**Implementation:**
1. Wire together in `injected.js`:
   - Click handler → extract word/phrase
   - Extract context if enabled
   - Call `translateText()`
   - On success: show translation in tooltip
   - On error: show error toast
2. Add loading indicator during translation

**Validation:**
- [ ] ESLint passes
- [ ] End-to-end test (with backend running):
  - Enable translation mode
  - Click word → translation appears
  - Verify cache (second click instant)
  - Click phrase → phrase translates
  - Test with context enabled vs. disabled
- [ ] Test error cases:
  - Backend offline → error toast
  - Invalid language combo → error message
- [ ] Test loading indicator appears for slow translations

---

### Task 2.17: Bookmarklet Creation
**Objective:** Create the actual bookmarklet code

**Implementation:**
1. Create `frontend/src/bookmarklet.js`:
   - Check if already loaded
   - If not, inject `injected.js` script
   - Pass current page URL (optional, for future features)
   - Show initialization toast
2. Wrap in `javascript:` URI format
3. Minify code
4. Create user-friendly install page (simple HTML)

**Validation:**
- [ ] ESLint on source (pre-minification)
- [ ] Test bookmarklet:
  - Drag to bookmarks bar
  - Click on test page
  - Verify injection works
  - Verify script loads only once
- [ ] Test on multiple pages
- [ ] Test in Chrome and Firefox

---

### Task 2.18: Build Process
**Objective:** Automate bundling and minification

**Implementation:**
1. Create `frontend/build.sh`:
   ```bash
   #!/bin/bash
   # Concatenate source files in DEPENDENCY ORDER (critical!)
   # Order matters: dependencies must be loaded before dependents
   #
   # Dependency graph:
   # config.js (no dependencies)
   #   └── settings.js (depends on CONFIG)
   #   └── translator.js (depends on CONFIG)
   #   └── toolbar.js (depends on CONFIG, settings)
   #   └── injected.js (depends on all above - orchestrates everything)
   #       └── bookmarklet.js (depends on injected.js - entry point)

   cat src/config.js \
       src/settings.js \
       src/translator.js \
       src/toolbar.js \
       src/injected.js \
       src/bookmarklet.js \
       > dist/bundle.js

   # Minify with terser
   npx terser dist/bundle.js -c -m -o dist/bundle.min.js

   # Create bookmarklet (wrap in javascript: URI and URL encode)
   # Save to dist/bookmarklet.txt

   # Generate install.html with instructions for both browsers
   ```
2. Create `dist/install.html`:
   - Clear instructions for Chrome (drag to bookmarks bar)
   - Clear instructions for Firefox (add bookmark, edit URL)
   - Copy-to-clipboard button for bookmarklet code
   - Troubleshooting section
3. Make build script executable: `chmod +x frontend/build.sh`

**Validation:**
- [ ] Run `cd frontend && npm run build`
- [ ] Verify `dist/bookmarklet.txt` created
- [ ] Verify minified code works (test bookmarklet)
- [ ] Verify `dist/install.html` renders correctly
- [ ] Test installation instructions in both Chrome and Firefox
- [ ] Compare file size (should be <50KB unminified, <20KB minified)

---

### Task 2.19: Frontend Testing - Manual QA
**Objective:** Comprehensive manual testing on real websites

**Test Sites:**
1. Wikipedia (German article)
2. News site (e.g., Deutsche Welle)
3. GitHub README
4. Blog post
5. Complex SPA (if applicable)

**Test Cases:**
- [ ] Bookmarklet injection works
- [ ] Toolbar appears and is functional
- [ ] Settings persist across pages
- [ ] Single word translation works
- [ ] Phrase translation works
- [ ] Context mode improves translations
- [ ] All display modes work (tooltip only so far)
- [ ] Error handling (disconnect backend, test)
- [ ] No console errors
- [ ] No visual conflicts with page
- [ ] Performance acceptable (<100ms UI response)

**Document Issues:**
- Create issue list for any bugs found
- Prioritize by severity

---

## Phase 3: Enhanced Features

### Task 3.1: Display Mode - Popover
**Objective:** Implement popover display mode with additional info

**Implementation:**
1. Extend display logic in `injected.js`:
   - Create popover element (larger than tooltip)
   - Show translation prominently
   - Add source text reference
   - Add close button
   - Position near selection (not necessarily above)
   - Persist until manually dismissed
2. Style popover with card design

**Validation:**
- [ ] ESLint passes
- [ ] Switch to popover mode in settings
- [ ] Test popover display:
  - Appears near selection
  - Shows translation clearly
  - Close button works
  - Only one popover at a time
  - Repositions if outside viewport
- [ ] Compare with tooltip mode for UX

---

### Task 3.2: Display Mode - Inline
**Objective:** Insert translation directly into page DOM

**Implementation:**
1. Extend display logic in `injected.js`:
   - Insert translation as new element above/before selected text
   - Style distinctly (different color, italic, smaller)
   - Make dismissible (click to remove)
   - Don't modify original DOM structure destructively
2. Handle edge cases (tables, lists, complex layouts)

**Validation:**
- [ ] ESLint passes
- [ ] Switch to inline mode in settings
- [ ] Test inline display:
  - Translation inserts correctly
  - Doesn't break page layout
  - Removable by clicking
  - Works in various HTML contexts (p, div, li, td)
- [ ] Verify original content unchanged

---

### Task 3.3: LLM Provider - llama.cpp Server Support
**Objective:** Add support for llama.cpp server as alternative to LMStudio

**Implementation:**
1. Extend `backend/app/llm_client.py`:
   - Create `LlamaCppClient` class
   - Implement `/completion` endpoint format (different from OpenAI)
   - Adapt prompt format (llama.cpp expects different structure)
   - Handle response format differences
2. Update config to support provider selection
3. Add provider factory function

**Validation:**
- [ ] `ruff check backend/app/llm_client.py` passes
- [ ] `mypy backend/app/llm_client.py` passes
- [ ] Update tests for new client
- [ ] Manual test with llama.cpp server (if available)
- [ ] Verify fallback works (LMStudio → llama.cpp)

---

### Task 3.4: Cache Management - Cleanup Task
**Objective:** Implement automatic cache cleanup

**Implementation:**
1. Extend `backend/app/cache.py`:
   - Add `cleanup_old_entries(ttl_days: int)` method
   - Add `enforce_size_limit(max_mb: int)` with LRU eviction
2. Add scheduled cleanup in `main.py`:
   - Run on startup
   - Optional: periodic background task (using BackgroundTasks)

**Validation:**
- [ ] `ruff check backend/app/cache.py` passes
- [ ] `mypy backend/app/cache.py` passes
- [ ] Update `test_cache.py`:
  - Test TTL cleanup
  - Test size limit enforcement
  - Test LRU eviction order
- [ ] `pytest backend/tests/test_cache.py -v` passes
- [ ] Manual test: Verify old entries removed after TTL

---

### Task 3.5: Rate Limiting
**Objective:** Prevent LLM overload from rapid requests

**Implementation:**
1. Add rate limiting to `backend/app/main.py`:
   - Use simple in-memory rate limiter
   - Limit: 30 requests per minute per session
   - Return 429 if exceeded
2. Optional: Use slowapi library for more robust limiting

**Validation:**
- [ ] `ruff check backend/app/main.py` passes
- [ ] `mypy backend/app/main.py` passes
- [ ] Create test for rate limiting:
  - Rapid-fire requests
  - Verify 429 response
  - Verify limit resets
- [ ] Test doesn't interfere with normal usage

---

### Task 3.6: Logging Infrastructure
**Objective:** Add proper logging for debugging and monitoring

**Implementation:**
1. Add logging to all backend modules:
   - Use Python `logging` module
   - Configure in `main.py`:
     ```python
     import logging
     logging.basicConfig(
         level=logging.INFO,
         format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
     )
     ```
   - Log levels: DEBUG for development, INFO for production
2. Log important events with privacy considerations:
   - Translation requests: `logger.info("Translation: %s -> %s", source_lang, target_lang)`
   - **DO NOT log actual text content** (privacy concern, even for local-only service)
   - Cache hits/misses: `logger.debug("Cache hit for key: %s", key[:8])`
   - LLM requests and latency: `logger.info("LLM request took %.2fs", duration)`
   - Errors and exceptions: `logger.error("Translation failed", exc_info=True)`
   - Configuration loading: `logger.info("Loaded config from %s", config_path)`
3. Use appropriate log levels:
   - DEBUG: Cache operations, detailed flow
   - INFO: Requests, configuration, startup/shutdown
   - WARNING: Degraded operation (LLM unavailable but cached)
   - ERROR: Failures that affect functionality
   - CRITICAL: Service cannot start

**Validation:**
- [ ] `ruff check backend/app/*.py` passes
- [ ] Start server and verify logs appear
- [ ] Test different log levels with environment variable
- [ ] **Verify NO sensitive data logged** (no translation text, no context)
- [ ] Check log format is readable and parseable
- [ ] Test error logging includes stack traces

---

### Task 3.7: Configuration Validation
**Objective:** Validate configuration at startup

**Implementation:**
1. Extend `backend/app/config.py`:
   - Add `validate()` method to Config class
   - Check required fields present
   - Validate URLs are well-formed
   - Validate numeric ranges (timeouts, limits)
   - Fail fast on invalid config
2. Call validation in `main.py` startup

**Validation:**
- [ ] `ruff check backend/app/config.py` passes
- [ ] `mypy backend/app/config.py` passes
- [ ] Test with invalid config:
  - Missing required field → clear error
  - Invalid URL → clear error
  - Invalid number → clear error
- [ ] Verify server won't start with bad config

---

### Task 3.8: Error Response Standardization
**Objective:** Consistent error response format across API with user-friendly messages

**Implementation:**
1. Create error response model in `models.py`:
   - `ErrorResponse` with message, code, details (optional)
2. Update all error handlers in `main.py`:
   - Use consistent JSON format
   - Appropriate HTTP status codes
   - User-friendly, actionable error messages
3. Error message guidelines:
   - Be specific about what went wrong
   - Suggest how to fix it when possible
   - Avoid technical jargon for user-facing errors
   - Include technical details in optional `details` field for debugging
4. Example error messages:
   - 400 Bad Request: `{"error": "Invalid request format", "details": "Missing required field: text"}`
   - 422 Validation Error: `{"error": "Text is too long", "details": "Maximum length is 500 characters, received 1024"}`
   - 429 Rate Limit: `{"error": "Too many requests", "details": "Please wait 30 seconds before trying again"}`
   - 500 Server Error: `{"error": "Translation failed", "details": "Could not process translation. Please try again."}`
   - 503 Service Unavailable: `{"error": "Translation server is not responding", "details": "Is LMStudio running on localhost:1234?"}`
5. Add global exception handler with fallback message

**Validation:**
- [ ] `ruff check backend/app/*.py` passes
- [ ] `mypy backend/app/*.py` passes
- [ ] Test all error scenarios with user-friendly messages:
  - 400: Bad request → clear, actionable
  - 422: Validation error → explains what's invalid
  - 429: Rate limit → tells user how long to wait
  - 500: Server error → doesn't expose internals
  - 503: Service unavailable → suggests checking LLM server
- [ ] Verify frontend displays error messages clearly
- [ ] Test that technical details are logged but not shown to user

---

## Phase 4: Testing, Documentation & Deployment

### Task 4.1: Backend Test Coverage Analysis
**Objective:** Ensure comprehensive test coverage

**Steps:**
1. Run coverage report: `pytest --cov=backend/app --cov-report=html`
2. Review HTML report, identify untested code paths
3. Add tests for uncovered branches
4. Focus on error handling and edge cases
5. Achieve >85% coverage

**Validation:**
- [ ] `pytest --cov=backend/app --cov-report=term-missing` shows >85%
- [ ] All critical paths tested
- [ ] All error handlers tested
- [ ] Edge cases covered

---

### Task 4.2: Frontend Code Quality
**Objective:** Ensure frontend code quality and consistency

**Steps:**
1. Run ESLint on all frontend code (or manual review if no ESLint)
2. Check for:
   - Consistent code style
   - No console.log in production code
   - Proper error handling
   - No hardcoded values
   - Comments for complex logic
3. Refactor any problematic code

**Validation:**
- [ ] ESLint passes with no warnings (or manual review complete)
- [ ] Code is readable and maintainable
- [ ] No obvious bugs or security issues

---

### Task 4.3: Security Review
**Objective:** Review for security vulnerabilities

**Review Checklist:**
1. Input validation:
   - [ ] All user input sanitized before LLM
   - [ ] Text length limits enforced
   - [ ] Language codes validated
2. XSS prevention:
   - [ ] LLM responses sanitized before DOM insertion
   - [ ] No innerHTML with user content
   - [ ] Shadow DOM isolation effective
3. CORS:
   - [ ] Only localhost allowed
   - [ ] No overly permissive headers
4. Dependencies:
   - [ ] Run `pip check` for backend
   - [ ] Check for known vulnerabilities
5. Local operation:
   - [ ] No external data transmission
   - [ ] No API keys in code

**Validation:**
- [ ] All checklist items reviewed
- [ ] Any issues found are addressed
- [ ] Document security assumptions (local-only operation)

---

### Task 4.4: Performance Optimization
**Objective:** Optimize for speed and efficiency

**Optimization Areas:**
1. Backend:
   - [ ] Add database indexes (already done for cache)
   - [ ] Optimize cache queries
   - [ ] Tune LLM request parameters
   - [ ] Profile slow endpoints
2. Frontend:
   - [ ] Minimize bookmarklet size
   - [ ] Debounce rapid clicks
   - [ ] Lazy-load resources
   - [ ] Optimize DOM operations

**Validation:**
- [ ] Backend response time <2s (with LLM)
- [ ] Cache lookup <50ms
- [ ] Frontend UI response <100ms
- [ ] Bookmarklet size <25KB minified
- [ ] No memory leaks (test with many translations)

---

### Task 4.5: User Documentation
**Objective:** Create comprehensive user guide

**Implementation:**
1. Create `docs/USER_GUIDE.md`:
   - Installation (backend + bookmarklet)
   - Configuration guide
   - Usage instructions
   - Screenshots/GIFs of workflow
   - Troubleshooting section
   - FAQ
2. Create quick start guide in main `README.md`

**Validation:**
- [ ] Follow user guide steps on fresh system
- [ ] Verify all instructions accurate
- [ ] Screenshots/GIFs are clear
- [ ] Troubleshooting covers common issues

---

### Task 4.6: Developer Documentation
**Objective:** Document architecture and development workflow

**Implementation:**
1. Create `docs/ARCHITECTURE.md`:
   - System overview diagram
   - Component descriptions
   - Data flow diagrams
   - Technology choices and rationale
2. Create `docs/DEVELOPMENT.md`:
   - Development setup
   - Running tests
   - Code style guide
   - Contribution guidelines
   - Release process
3. Update code comments and docstrings

**Validation:**
- [ ] Architecture doc accurately reflects implementation
- [ ] Development doc is complete and accurate
- [ ] All public APIs have docstrings
- [ ] Diagrams are clear (can use ASCII or tools like Mermaid)

---

### Task 4.7: Deployment Guide
**Objective:** Document production deployment

**Implementation:**
1. Create `docs/DEPLOYMENT.md`:
   - Prerequisites (Python version, LLM server)
   - Installation steps
   - Configuration for production
   - Running as system service (systemd example)
   - Monitoring and logging
   - Backup and recovery (cache)
   - Updating/upgrading
2. Create example systemd service file

**Validation:**
- [ ] Follow deployment guide on test system
- [ ] Verify service starts on boot
- [ ] Verify logging works
- [ ] Test backup/restore of cache

---

### Task 4.8: LLM Model Testing
**Objective:** Test with multiple LLM models and document results

**Models to Test:**
1. Gemma 2 27B
2. Llama 3.1 8B
3. Mistral 7B
4. Qwen 2.5

**For Each Model:**
- [ ] Test translation accuracy
- [ ] Test response format compliance (no explanations)
- [ ] Measure response time
- [ ] Test context mode effectiveness
- [ ] Document any required prompt adjustments

**Documentation:**
1. Create `docs/MODEL_RECOMMENDATIONS.md`:
   - Test results per model
   - Recommended models
   - Model-specific configurations
   - Performance vs. quality trade-offs

---

### Task 4.9: Browser Compatibility Testing
**Objective:** Ensure bookmarklet works in target browsers

**Test in Chrome:**
- [ ] Bookmarklet installation
- [ ] All features functional
- [ ] No console errors
- [ ] Shadow DOM works
- [ ] Settings persistence
- [ ] Test on 5+ different websites

**Test in Firefox:**
- [ ] Bookmarklet installation
- [ ] All features functional
- [ ] No console errors
- [ ] Shadow DOM works
- [ ] Settings persistence
- [ ] Test on 5+ different websites

**Document Issues:**
- Note any browser-specific quirks
- Add workarounds if needed
- Update documentation with browser notes

---

### Task 4.10: Integration Testing - Full Stack
**Objective:** Comprehensive end-to-end testing

**Test Scenarios:**
1. [ ] Fresh installation on new machine
2. [ ] Backend startup and health check
3. [ ] Bookmarklet installation
4. [ ] First translation (cache miss)
5. [ ] Repeat translation (cache hit)
6. [ ] Change languages
7. [ ] Toggle context mode
8. [ ] Switch display modes
9. [ ] Error recovery (stop backend, restart)
10. [ ] Long session (50+ translations)
11. [ ] Cache persistence across restarts
12. [ ] Multiple browser tabs

**Validation:**
- [ ] All scenarios pass
- [ ] No memory leaks
- [ ] No data loss
- [ ] Performance acceptable throughout

---

### Task 4.11: Prompt Engineering Refinement
**Objective:** Fine-tune prompts based on testing results

**Steps:**
1. Review translation quality from testing
2. Identify common failure patterns:
   - Explanations still appearing?
   - Incorrect translations?
   - Context not helping?
3. Adjust prompt templates in `prompts.py`
4. Test adjustments with multiple models
5. Document final prompt versions

**Validation:**
- [ ] Translation accuracy improved
- [ ] Fewer explanation artifacts
- [ ] Context mode provides measurable benefit
- [ ] Prompts work across tested models

---

### Task 4.12: Error Message Refinement
**Objective:** Ensure all error messages are helpful

**Review Areas:**
1. Backend error responses
2. Frontend toast messages
3. Log messages

**For Each Error:**
- [ ] Message is clear and actionable
- [ ] No technical jargon (for user-facing messages)
- [ ] Suggests solution when possible
- [ ] Consistent tone and format

**Validation:**
- [ ] Trigger each error condition
- [ ] Verify message appears correctly
- [ ] Verify message is helpful

---

### Task 4.13: Configuration Examples
**Objective:** Provide example configurations for common scenarios

**Create Examples:**
1. `config.examples/lmstudio.yaml` - LMStudio setup
2. `config.examples/llama-server.yaml` - llama.cpp server setup
3. `config.examples/minimal.yaml` - Minimal config with defaults
4. `config.examples/production.yaml` - Production-ready config

**Validation:**
- [ ] Each example config is valid
- [ ] Test each configuration
- [ ] Document what each example is for

---

### Task 4.14: Release Preparation
**Objective:** Prepare for initial release

**Steps:**
1. Version numbering:
   - Set version to 0.1.0 (initial release)
   - Add version to backend (in `__init__.py` or `main.py`)
2. Create `CHANGELOG.md`:
   - Document all features
   - Note any known limitations
3. Update README.md:
   - Project description
   - Features list
   - Quick start
   - Link to documentation
   - License information
4. Choose and add LICENSE file (e.g., MIT)
5. Final code cleanup:
   - Remove debug code
   - Remove unused imports
   - Fix any TODO comments

**Validation:**
- [ ] Version set in code
- [ ] CHANGELOG complete
- [ ] README comprehensive
- [ ] LICENSE added
- [ ] No debug code remains
- [ ] `ruff check` passes on all code
- [ ] `mypy` passes on all backend code

---

### Task 4.15: Final Validation
**Objective:** Complete pre-release checklist

**Checklist:**
- [ ] All tests pass: `pytest backend/tests/ -v`
- [ ] Code coverage >85%
- [ ] All linters pass: `ruff check backend/`
- [ ] Type checking passes: `mypy backend/app/`
- [ ] Bookmarklet builds successfully
- [ ] Documentation complete and accurate
- [ ] Examples tested
- [ ] Manual QA on Chrome and Firefox
- [ ] No known critical bugs
- [ ] Installation guide tested on fresh system

**Final Steps:**
1. Tag release in git: `v0.1.0`
2. Create release notes
3. Archive distribution files

---

## Post-Release Maintenance

### Ongoing Tasks
1. **Bug Fixes:**
   - Track issues in GitHub Issues (or equivalent)
   - Prioritize by severity
   - Fix and test
   - Release patch versions

2. **Feature Enhancements:**
   - Collect user feedback
   - Prioritize features
   - Follow implementation plan for new features
   - Maintain backward compatibility

3. **Dependency Updates:**
   - Monthly: Check for security updates
   - Quarterly: Update all dependencies
   - Test after updates

4. **Documentation Maintenance:**
   - Keep docs in sync with code
   - Add FAQ entries from user questions
   - Update screenshots if UI changes

---

## Success Metrics

**Quality Metrics:**
- Code coverage >85%
- Zero critical bugs at release
- All linters and type checkers pass
- Documentation completeness >95%

**Performance Metrics:**
- Translation response <2s (95th percentile)
- Cache hit latency <50ms
- UI response <100ms
- Bookmarklet size <25KB

**Functionality Metrics:**
- Works on >95% of tested websites
- Translation accuracy acceptable for learning (subjective)
- Settings persist correctly 100% of time
- No data loss from cache

**User Experience Metrics:**
- Installation takes <10 minutes (documented)
- First translation works without troubleshooting
- Error messages are clear and actionable
- No visual conflicts with host pages

---

## Notes

**Flexibility:**
This plan is a guide, not a rigid contract. Adapt as needed based on:
- Issues discovered during implementation
- Better approaches identified
- User feedback
- Time constraints

**Iterative Approach:**
Don't aim for perfection in first pass. Get each component working, then refine.

**Documentation as You Go:**
Don't leave documentation for the end. Document decisions and approaches as you implement.

**Testing Culture:**
Write tests alongside code, not after. Tests are documentation of expected behavior.

**Code Quality:**
Run linters and type checkers frequently. Fix issues immediately while context is fresh.
