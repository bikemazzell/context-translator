# Context Translator - Implementation Plan

**⚠️ DEPRECATED:** This document describes the original bookmarklet-based implementation plan. The project has since evolved to use a Firefox extension architecture with native messaging. See [../README.md](../README.md) for current architecture.

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
       model_name: gemma-3-27b-it  # ADD THIS
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

---

## Phase 5: Firefox Extension - Cleanup & Enhancement

### Task 5.1: Code Cleanup - Remove Debug Logging
**Objective:** Remove all debug console.log statements and cleanup code

**Steps:**
1. Remove all `console.log()` and `console.error()` debugging statements
2. Keep only critical error logging (console.error for actual errors)
3. Remove unused code and commented-out sections
4. Remove test/temporary code

**Files to clean:**
- `extension/content/translator.js`
- `extension/background/background.js`
- `extension/popup/popup.js`

**Validation:**
- [ ] No console.log statements in production code
- [ ] Only console.error for actual error conditions
- [ ] Code is clean and readable
- [ ] Extension still functions correctly after cleanup
- [ ] Test on real website (e.g., tagesschau.de)

---

### Task 5.2: Settings Architecture - Dark Mode Support
**Objective:** Add dark mode detection and styling support

**Implementation:**
1. Add `darkMode` setting (auto-detect from browser/page, with manual override)
2. Detect system dark mode: `window.matchMedia('(prefers-color-scheme: dark)')`
3. Update inline translation colors for dark mode:
   - Light mode: `background: #e8f4f8`, `color: #01579b`, `border: #0288d1`
   - Dark mode: `background: #1a2332`, `color: #64b5f6`, `border: #42a5f5`
4. Update toolbar colors for dark mode
5. Add setting to toolbar for manual override (Auto / Light / Dark)

**Validation:**
- [ ] Dark mode auto-detects correctly
- [ ] Inline translations visible in both modes
- [ ] Toolbar visible in both modes
- [ ] Manual override works
- [ ] Settings persist across reloads
- [ ] Test on light and dark websites

---

### Task 5.3: Enhanced Toolbar - Settings UI
**Objective:** Build comprehensive settings panel in toolbar

**Current Toolbar:** Basic "Click any word to translate" message with close button

**New Toolbar Design:**
```
┌─────────────────────────────────────┐
│ Context Translator              [×] │
├─────────────────────────────────────┤
│ From: [German ▼]  To: [English ▼]  │
│ □ Context Mode  □ Dark Mode         │
│ Display: ○ Inline  ○ Tooltip        │
│ [Clear Translations]                │
└─────────────────────────────────────┘
```

**Implementation:**
1. Expand toolbar HTML structure in `translator.js`:
   - Language dropdowns (source/target)
   - Context mode checkbox
   - Dark mode checkbox (Auto/Light/Dark selector)
   - Display mode radio buttons (Inline/Tooltip)
   - Clear translations button
2. Wire up event handlers:
   - Language changes → update settings → save
   - Context toggle → update settings
   - Dark mode → update settings → refresh styles
   - Display mode → update settings
   - Clear button → remove all inline translations
3. Load settings on initialization
4. Populate language dropdowns from backend
5. Apply settings immediately when changed

**Validation:**
- [ ] All controls render correctly
- [ ] Language dropdowns populated from backend
- [ ] All settings persist across reloads
- [ ] Changes apply immediately
- [ ] Clear button removes all translations
- [ ] Toolbar styling matches dark/light mode
- [ ] Test on multiple pages

---

### Task 5.4: Settings Persistence & Loading
**Objective:** Properly persist and load all settings

**Implementation:**
1. Update settings object in `translator.js`:
   ```javascript
   let settings = {
     sourceLang: 'German',
     targetLang: 'English',
     contextMode: false,
     contextWindowChars: 200,
     displayMode: 'inline', // 'inline' or 'tooltip'
     darkMode: 'auto', // 'auto', 'light', or 'dark'
     enabled: false
   };
   ```
2. Load settings from browser.storage.local on init
3. Save settings on every change
4. Don't force override settings on every load (bug fix)
5. Merge stored settings with defaults (preserve new defaults)

**Validation:**
- [ ] Settings load from storage on page load
- [ ] Settings persist across browser restart
- [ ] New settings get default values
- [ ] Old settings are preserved
- [ ] Test: Change setting → reload page → verify persisted

---

### Task 5.5: Display Mode - Tooltip Implementation
**Objective:** Implement tooltip display mode properly with !important styles

**Current State:** Tooltip code exists but isn't used (inline is default)

**Implementation:**
1. Fix `showTooltipTranslation()` function:
   - Use `position: fixed !important`
   - Add dark mode color support
   - Ensure z-index is highest
   - Add !important to all critical styles
2. Update `showTranslation()` to respect `settings.displayMode`
3. Auto-dismiss on scroll (reposition if needed)
4. Make tooltip clickable to dismiss

**Validation:**
- [ ] Switch to tooltip mode in settings
- [ ] Tooltips appear above clicked word
- [ ] Tooltips visible in light and dark modes
- [ ] Tooltips don't interfere with page
- [ ] Auto-dismiss works correctly
- [ ] Test on scrollable pages

---

### Task 5.6: Context Mode - Implementation
**Objective:** Implement context extraction and display

**Implementation:**
1. Enable context extraction when `settings.contextMode` is true
2. Extract surrounding text (already implemented in `extractContext()`)
3. Visual indicator when context mode is active:
   - Add small badge to inline translation: "📄" or "context"
   - Tooltip shows context was used
4. Clear context when requested (cache is still per-word, context is per-request)

**Validation:**
- [ ] Enable context mode in toolbar
- [ ] Translations include context
- [ ] Visual indicator shows context was used
- [ ] Compare translations with/without context
- [ ] Test on ambiguous words (e.g., "Bank" in different contexts)

---

### Task 5.7: Clear Translations Feature
**Objective:** Implement clear all translations button

**Implementation:**
1. Add "Clear Translations" button to toolbar
2. Implement `clearAllTranslations()` function:
   - Remove all inline translation elements from DOM
   - Clear `inlineTranslations` array
   - Remove any active tooltips
3. Add confirmation if many translations exist (>5)
4. Visual feedback (toast: "Translations cleared")

**Validation:**
- [ ] Button appears in toolbar
- [ ] Click clears all inline translations
- [ ] Confirmation appears for many translations
- [ ] Toast confirms action
- [ ] Page returns to clean state
- [ ] Test with 10+ translations

---

### Task 5.8: Error Handling - User-Friendly Messages
**Objective:** Improve error messages and handling

**Current Issues:**
- Backend errors show technical details
- Network failures unclear
- No retry mechanism

**Implementation:**
1. Update error messages in `translate()`:
   - "Translation service unavailable" → "Cannot connect. Is the backend running?"
   - "Request failed" → "Translation failed. Please try again."
   - Timeout → "Request timed out. Try a shorter text."
2. Remove error toasts (they're distracting)
3. Show errors only for critical failures
4. Cache errors temporarily to avoid repeated failures

**Validation:**
- [ ] Stop backend → clear error message
- [ ] Network timeout → appropriate message
- [ ] Invalid response → helpful message
- [ ] Errors don't spam user
- [ ] Test all error conditions

---

### Task 5.9: Code Refactoring - Modular Structure
**Objective:** Organize code into logical modules

**Current Structure:** Everything in one large `translator.js` file

**Proposed Structure:**
```
extension/content/
├── translator.js (main entry point, orchestration)
├── settings.js (settings management)
├── toolbar.js (toolbar UI and events)
├── display.js (inline/tooltip display logic)
├── api.js (backend communication)
└── utils.js (helpers, context extraction)
```

**Alternative (simpler):** Keep single file but organize with clear sections:
```javascript
// ============================================
// CONFIGURATION & STATE
// ============================================

// ============================================
// SETTINGS MANAGEMENT
// ============================================

// ============================================
// TOOLBAR UI
// ============================================

// ============================================
// TRANSLATION DISPLAY
// ============================================

// ============================================
// API COMMUNICATION
// ============================================

// ============================================
// EVENT HANDLERS
// ============================================

// ============================================
// INITIALIZATION
// ============================================
```

**Decision:** Use single-file with clear sections (simpler for extension, no module loading)

**Validation:**
- [ ] Code organized into logical sections
- [ ] Each section has clear purpose
- [ ] Functions grouped by responsibility
- [ ] Comments mark section boundaries
- [ ] Extension still works after refactoring

---

### Task 5.10: Performance Optimization
**Objective:** Optimize for speed and reduce overhead

**Optimizations:**
1. Debounce click handler (prevent rapid clicks)
2. Cache language list (don't fetch on every page load)
3. Lazy-create toolbar (only when activated)
4. Remove unused code paths
5. Minimize DOM operations
6. Use event delegation where possible

**Validation:**
- [ ] Click response <100ms
- [ ] No UI lag when clicking rapidly
- [ ] Memory usage stable (test with 50+ translations)
- [ ] No memory leaks (check DevTools Memory profiler)
- [ ] Extension doesn't slow down page load

---

### Task 5.11: Visual Polish - Animations & Transitions
**Objective:** Add subtle animations for better UX

**Enhancements:**
1. Fade-in animation for inline translations (already exists)
2. Smooth toolbar expand/collapse (if we add collapse feature)
3. Hover effects on interactive elements
4. Loading indicator for slow translations
5. Success feedback for settings changes

**Validation:**
- [ ] Animations smooth (60fps)
- [ ] No animation jank
- [ ] Animations feel professional
- [ ] Reduced motion preference respected
- [ ] Test on slower devices

---

### Task 5.12: Testing - Manual QA Checklist
**Objective:** Comprehensive testing of final extension

**Test Matrix:**

**Browser:** Firefox
**Sites:** Wikipedia DE, tagesschau.de, GitHub, Reddit

**Test Cases:**
- [ ] Install extension
- [ ] Open popup, click "Toggle Translator"
- [ ] Toolbar appears
- [ ] Change source language to German
- [ ] Change target language to English
- [ ] Click word → inline translation appears
- [ ] Enable context mode → translation changes
- [ ] Switch to tooltip mode → tooltips appear
- [ ] Enable dark mode → colors invert
- [ ] Clear translations → all removed
- [ ] Disable translator → click handler removed
- [ ] Re-enable → works again
- [ ] Reload page → settings persist
- [ ] Test with 20+ translations
- [ ] Test on dark mode website
- [ ] Test on light mode website
- [ ] Check console for errors
- [ ] Check memory usage

---

### Task 5.13: Documentation - Extension Usage
**Objective:** Document the Firefox extension

**Create:** `extension/README.md`

**Contents:**
1. Installation instructions
2. Usage guide
3. Settings explanation
4. Troubleshooting
5. Development guide

**Validation:**
- [ ] Follow installation steps on clean Firefox
- [ ] Verify all instructions accurate
- [ ] Screenshots/GIFs included
- [ ] Troubleshooting covers common issues

---

### Task 5.14: Final Cleanup - Remove Bookmarklet Code
**Objective:** Clean up unused bookmarklet code

**Decision Point:** Keep or remove frontend/ directory?
- **Keep:** Bookmarklet still useful for other browsers
- **Remove:** Extension is better, simpler to maintain

**Recommendation:** Keep but mark as deprecated/alternative

**Steps:**
1. Add note to `frontend/README.md` recommending extension
2. Keep bookmarklet for Chrome/other browsers
3. Update main README.md to mention both approaches

**Validation:**
- [ ] Documentation updated
- [ ] Both approaches work
- [ ] Clear guidance on which to use

---

## Quality Checklist for Phase 5

**Before Completion:**
- [ ] No console.log in production code
- [ ] All settings work and persist
- [ ] Dark mode works correctly
- [ ] Both display modes work
- [ ] Context mode works
- [ ] Error handling is user-friendly
- [ ] Code is well-organized
- [ ] Performance is good
- [ ] Manual QA passed
- [ ] Documentation complete

**Success Criteria:**
- Extension works on 95% of websites
- Settings persist 100% of time
- UI responds <100ms
- No console errors
- Dark mode auto-detects correctly
- Translations visible in all modes

---

## Phase 6: Extension Packaging & Distribution

### Task 6.1: Research Extension Packaging Requirements
**Objective:** Understand Firefox extension packaging for local installation

**Key Findings from Research:**

1. **File Format:**
   - Firefox extensions are packaged as `.xpi` files (ZIP files with .xpi extension)
   - Must be a ZIP of the extension's files themselves, not of the directory containing them
   - Structure: manifest.json at root, all other files in proper relative paths

2. **Local Installation Options:**
   - **Temporary Installation:** `about:debugging` → Load Temporary Add-on (current method)
     - Issue: Extensions unload when Firefox closes
   - **Permanent Local Installation (Unsigned):**
     - Set `xpinstall.signatures.required` to `false` in `about:config`
     - Use Firefox Nightly or Developer Edition
     - Package as .xpi and install via "Install Add-on From File" in `about:addons`

3. **Requirements for Local Installation:**
   - Must have add-on ID in `browser_specific_settings` (✓ already have: `context-translator@localhost`)
   - No signing required if using Developer/Nightly edition with config changes
   - Persistent installation requires proper add-on ID for data persistence

4. **Files to Include:**
   - manifest.json (required)
   - All JavaScript, CSS, HTML files
   - Icons
   - Native messaging host manifest and script
   - Exclude: .git, development files, node_modules, tests, etc.

5. **Packaging Tools:**
   - `web-ext build` (recommended by Mozilla, auto-excludes unwanted files)
   - Manual ZIP creation (simpler, more control)

**Decision:** Use simple ZIP-based packaging script for maximum control and simplicity

**Validation:**
- [x] Researched Firefox extension packaging
- [x] Understood unsigned extension installation
- [x] Identified required files
- [x] Chosen packaging approach

---

### Task 6.2: Extension Packaging Plan
**Objective:** Create detailed plan for packaging the extension

**Packaging Approach:**

1. **Create Package Script (`package-extension.sh`):**
   - Validates manifest.json exists and is valid
   - Creates clean build directory
   - Copies only necessary extension files
   - Creates .xpi file (ZIP archive)
   - Validates package structure
   - Provides installation instructions

2. **Files to Include in Package:**
   ```
   context-translator.xpi
   ├── manifest.json
   ├── icons/
   │   ├── icon-48.png
   │   └── icon-96.png
   ├── background/
   │   └── background.js
   ├── content/
   │   ├── translator.js
   │   └── translator.css
   ├── popup/
   │   ├── popup.html
   │   └── popup.js
   └── native-host/
       ├── context_translator_host.py
       └── context_translator_host.json
   ```

3. **Files to Exclude:**
   - .git directory
   - Development files
   - Documentation (README, etc.)
   - Backend code (separate installation)
   - Frontend/bookmarklet code
   - Tests
   - Temporary files

4. **Installation Process:**
   - User runs packaging script
   - Gets .xpi file and installation instructions
   - Follows browser-specific steps

5. **Installation Instructions (Per Browser):**

   **Firefox Developer/Nightly Edition:**
   - Set `xpinstall.signatures.required = false` in `about:config`
   - Open `about:addons`
   - Click gear icon → "Install Add-on From File"
   - Select `context-translator.xpi`
   - Extension persists across restarts

   **Firefox Release Edition:**
   - Cannot install unsigned extensions permanently
   - Must use temporary installation via `about:debugging`
   - OR submit to Mozilla Add-ons (requires review)

6. **Native Messaging Host Installation:**
   - Packaging script also handles native host setup
   - Copies manifest to `~/.mozilla/native-messaging-hosts/`
   - Ensures Python script is executable
   - Validates paths in manifest

**Script Features:**
- Error checking at each step
- Validation of manifest.json
- Automatic version detection
- Clean output with progress indicators
- Final instructions for user
- Idempotent (can run multiple times)

**Validation:**
- [ ] Plan documented
- [ ] All required files identified
- [ ] Exclusion list complete
- [ ] Installation steps clear
- [ ] Script features defined

---

### Task 6.3: Create Packaging Script
**Objective:** Implement automated packaging script

**Implementation:**

1. Create `package-extension.sh` in project root:
   ```bash
   #!/bin/bash
   # Context Translator - Extension Packaging Script
   # Creates installable .xpi package for Firefox

   set -e  # Exit on error

   # Colors for output
   GREEN='\033[0;32m'
   BLUE='\033[0;34m'
   RED='\033[0;31m'
   NC='\033[0m' # No Color

   # Configuration
   EXTENSION_DIR="extension"
   BUILD_DIR="dist"
   PACKAGE_NAME="context-translator.xpi"
   NATIVE_HOST_DIR="$HOME/.mozilla/native-messaging-hosts"

   # Functions
   print_step() {
       echo -e "${BLUE}==>${NC} $1"
   }

   print_success() {
       echo -e "${GREEN}✓${NC} $1"
   }

   print_error() {
       echo -e "${RED}✗${NC} $1"
   }

   # Main packaging logic
   # 1. Validate manifest.json
   # 2. Create build directory
   # 3. Copy extension files
   # 4. Create ZIP archive
   # 5. Rename to .xpi
   # 6. Setup native messaging host
   # 7. Print installation instructions
   ```

2. Script validates:
   - manifest.json exists and is valid JSON
   - Required files present (background.js, content scripts, etc.)
   - Icons exist
   - Python script exists and is executable

3. Script creates:
   - Clean build directory
   - Proper file structure
   - .xpi package
   - Native messaging host setup

4. Script outputs:
   - Progress messages
   - Success confirmation
   - Installation instructions
   - Troubleshooting tips

**Validation:**
- [ ] Script created
- [ ] Executable permissions set: `chmod +x package-extension.sh`
- [ ] Script runs without errors
- [ ] Creates valid .xpi file
- [ ] Output is clear and helpful

---

### Task 6.4: Test Package Creation
**Objective:** Verify packaging script works correctly

**Test Steps:**

1. **Clean Test:**
   - Remove any existing dist/ directory
   - Run packaging script: `./package-extension.sh`
   - Verify .xpi created
   - Check file size (should be reasonable, <1MB)

2. **Structure Validation:**
   - Unzip .xpi to temporary directory
   - Verify all required files present
   - Check manifest.json at root level
   - Verify no excluded files (e.g., .git)

3. **Native Host Setup:**
   - Check if manifest copied to `~/.mozilla/native-messaging-hosts/`
   - Verify Python script path is correct
   - Confirm script is executable

4. **Package Integrity:**
   - Verify .xpi is valid ZIP: `unzip -t dist/context-translator.xpi`
   - Check for any corruption
   - Verify file permissions

**Validation:**
- [ ] .xpi file created successfully
- [ ] File structure correct
- [ ] Native host manifest installed
- [ ] Package is valid ZIP
- [ ] No errors during creation

---

### Task 6.5: Test Installation - Firefox Developer Edition
**Objective:** Test actual installation in Firefox

**Prerequisites:**
- Firefox Developer Edition or Nightly installed
- Backend server configured and tested

**Test Steps:**

1. **Configure Firefox:**
   - Open `about:config`
   - Search for `xpinstall.signatures.required`
   - Set to `false`
   - Restart Firefox

2. **Install Extension:**
   - Open `about:addons`
   - Click gear icon (⚙️)
   - Select "Install Add-on From File..."
   - Navigate to `dist/context-translator.xpi`
   - Click "Open"
   - Accept installation prompt

3. **Verify Installation:**
   - Extension appears in add-ons list
   - Icon appears in toolbar
   - Click icon → popup appears
   - Click "Toggle Translator" → toolbar appears on page

4. **Test Functionality:**
   - Navigate to test page (e.g., tagesschau.de)
   - Toggle translator on
   - Click word → translation appears
   - Verify settings persist after reload
   - Test all features from manual QA checklist

5. **Test Persistence:**
   - Restart Firefox
   - Verify extension still installed
   - Verify settings preserved
   - Test functionality again

**Validation:**
- [ ] Extension installs successfully
- [ ] All features work
- [ ] Settings persist across browser restart
- [ ] Native messaging works
- [ ] No console errors

---

### Task 6.6: Create Installation Guide
**Objective:** Write comprehensive installation instructions

**Create:** `INSTALLATION.md` in project root

**Contents:**

1. **Prerequisites:**
   - Firefox Developer Edition or Nightly (for unsigned extension)
   - Python 3.12+ with conda environment
   - LLM server (LMStudio, llama.cpp, etc.)

2. **Backend Setup:**
   - Install Python dependencies
   - Configure config.yaml
   - Start backend server
   - Verify health endpoint

3. **Extension Installation:**
   - Run packaging script
   - Configure Firefox
   - Install extension
   - Verify installation

4. **Native Messaging Setup:**
   - Automatic via packaging script
   - Manual steps if needed
   - Troubleshooting

5. **First Use:**
   - Configure languages
   - Test translation
   - Adjust settings

6. **Troubleshooting:**
   - Extension won't install → check Firefox version, config
   - Native messaging fails → check paths, permissions
   - Translations don't work → check backend, logs
   - Settings don't persist → check add-on ID

7. **Updating:**
   - How to update extension
   - How to update backend
   - Preserving settings

**Validation:**
- [ ] Installation guide complete
- [ ] All steps accurate
- [ ] Screenshots included
- [ ] Troubleshooting comprehensive
- [ ] Follow guide on fresh system

---

### Task 6.7: Update Main README
**Objective:** Update project README with extension information

**Updates to README.md:**

1. **Project Description:**
   - Mention Firefox extension
   - Note bookmarklet as alternative
   - Highlight native messaging approach

2. **Features:**
   - Context-aware translation
   - Inline and tooltip display modes
   - Dark mode support
   - Settings persistence
   - Keyboard shortcuts

3. **Installation:**
   - Link to INSTALLATION.md
   - Quick start section
   - System requirements

4. **Architecture:**
   - Brief overview
   - Firefox extension + Native messaging + Python backend + LLM
   - Diagram (optional)

5. **Development:**
   - How to contribute
   - How to build from source
   - How to run tests

6. **License:**
   - Add license information

**Validation:**
- [ ] README updated
- [ ] All sections accurate
- [ ] Links work
- [ ] Clear and professional

---

### Task 6.8: Create Release Checklist
**Objective:** Document release process

**Create:** `RELEASE.md` with checklist:

1. **Pre-Release:**
   - [ ] All tests pass
   - [ ] Code cleanup complete
   - [ ] Documentation up to date
   - [ ] Manual QA passed
   - [ ] Version number updated

2. **Package:**
   - [ ] Run packaging script
   - [ ] Verify .xpi created
   - [ ] Test installation
   - [ ] Verify all features work

3. **Documentation:**
   - [ ] Installation guide tested
   - [ ] README accurate
   - [ ] Troubleshooting complete
   - [ ] Screenshots current

4. **Release:**
   - [ ] Tag version in git
   - [ ] Create release notes
   - [ ] Archive .xpi file
   - [ ] Update CHANGELOG

5. **Post-Release:**
   - [ ] Monitor for issues
   - [ ] Respond to feedback
   - [ ] Plan next iteration

**Validation:**
- [ ] Release checklist complete
- [ ] Process documented
- [ ] All steps clear

---

### Task 6.9: Final Testing - Complete Workflow
**Objective:** End-to-end test of complete installation and usage

**Test Scenario: New User Installation**

1. **Fresh System Setup:**
   - Clean Firefox Developer Edition
   - No existing extension or backend
   - Follow INSTALLATION.md exactly

2. **Backend Setup:**
   - Clone repository
   - Install dependencies
   - Configure backend
   - Start server
   - Test health endpoint

3. **Extension Installation:**
   - Run packaging script
   - Configure Firefox
   - Install extension
   - Verify installation

4. **First Translation:**
   - Navigate to test page
   - Toggle translator
   - Configure languages
   - Translate word
   - Verify result

5. **Feature Testing:**
   - Test all display modes
   - Test context mode
   - Test dark mode
   - Test settings persistence
   - Test keyboard shortcuts
   - Test error handling

6. **Long-Term Use:**
   - Restart browser
   - Test on multiple sites
   - Test with 50+ translations
   - Monitor performance
   - Check for issues

**Validation:**
- [ ] Complete workflow successful
- [ ] Installation takes <15 minutes
- [ ] All features work
- [ ] No errors encountered
- [ ] Documentation accurate

---

## Phase 6 Completion Checklist

**Packaging:**
- [ ] Packaging script created and tested
- [ ] .xpi file generates correctly
- [ ] Native messaging host setup works
- [ ] Package structure validated

**Installation:**
- [ ] Installation guide complete
- [ ] Tested on Firefox Developer Edition
- [ ] Tested on Firefox Nightly
- [ ] Troubleshooting comprehensive

**Documentation:**
- [ ] INSTALLATION.md complete
- [ ] README.md updated
- [ ] RELEASE.md created
- [ ] All documentation accurate

**Testing:**
- [ ] Package creation tested
- [ ] Installation tested
- [ ] Full workflow tested
- [ ] No critical issues

**Success Criteria:**
- Extension packages successfully
- Installs in <5 minutes
- All features work after installation
- Settings persist across restarts
- Documentation is complete and accurate

---

## Phase 7: Advanced Translation Features

### Task 7.1: Adjacent Translation Merging - Analysis & Design
**Objective:** Design system to merge adjacent translated words into single cohesive display

**Problem Analysis:**

From the screenshot, we see multiple separate translation boxes for adjacent words:
```
[always] [still] [mu] [together]
```

This creates visual clutter and makes it harder to read the combined translation. The desired behavior is:
```
[always still mu together]
```

**Key Requirements:**

1. **Adjacency Detection:**
   - Words are considered adjacent if their DOM wrappers are next to each other
   - No intervening text nodes or elements between them
   - Same parent container

2. **Merging Scope:**
   - ONLY merge if words are physically adjacent in the DOM
   - Do NOT merge if words are separated (even by a single space or element)
   - Preserve individual word boundaries for later un-merging

3. **User Interaction:**
   - When user clicks on a new word adjacent to existing translation(s), merge them
   - When user clicks on a word not adjacent, create separate translation
   - Clicking on merged translation should remove the entire merged group

4. **Technical Challenges:**
   - Detecting true adjacency in DOM (not just visual proximity)
   - Maintaining original word data for each component
   - Handling different display modes (inline vs tooltip)
   - Updating wrapper structure when merging
   - Performance with many translations

**Design Approach:**

**Option A: Merge Wrappers (Recommended)**
- Keep individual word wrappers for original text
- Create a single shared translation element spanning all wrappers
- Track merged groups in data structure
- Pros: Maintains word boundaries, easier to un-merge
- Cons: More complex DOM manipulation

**Option B: Single Mega-Wrapper**
- Combine all adjacent words into one wrapper
- Single translation element
- Pros: Simpler DOM structure
- Cons: Loses individual word boundaries, harder to un-merge

**Decision:** Use Option A (Merge Wrappers)

**Data Structure:**

```javascript
// Enhanced tracking structure
let translationGroups = [
  {
    id: 'group-1',
    translations: [
      { wrapper: elem1, text: 'Haus', translation: 'house' },
      { wrapper: elem2, text: 'und', translation: 'and' },
      { wrapper: elem3, text: 'Garten', translation: 'garden' }
    ],
    merged: true,
    displayElement: sharedTranslationElement,
    startWrapper: elem1,  // First wrapper in group
    endWrapper: elem3     // Last wrapper in group
  }
];
```

**Algorithm:**

1. **On New Translation Request:**
   ```
   a. Get clicked word position/wrapper
   b. Check if adjacent to existing translation(s)
   c. If adjacent:
      - Determine merge direction (left, right, or both)
      - Combine translation texts
      - Create/update shared display element
      - Update tracking structure
   d. If not adjacent:
      - Create new independent translation
   ```

2. **Adjacency Detection:**
   ```javascript
   function areAdjacentWrappers(wrapper1, wrapper2) {
     // Check if wrappers are direct siblings
     if (wrapper1.nextSibling === wrapper2) return 'right';
     if (wrapper1.previousSibling === wrapper2) return 'left';

     // Check if only whitespace between them
     let node = wrapper1.nextSibling;
     while (node && node !== wrapper2) {
       if (node.nodeType === Node.TEXT_NODE) {
         if (node.textContent.trim() !== '') return false;
       } else if (node.nodeType === Node.ELEMENT_NODE) {
         return false;
       }
       node = node.nextSibling;
     }
     return node === wrapper2 ? 'right' : false;
   }
   ```

3. **Merging Strategy:**
   ```
   - Find all adjacent translated words in sequence
   - Combine their translations with spaces: "house and garden"
   - Position merged display above the first word wrapper
   - Span visually across all wrappers (using CSS positioning)
   - Store reference to all component translations
   ```

**Validation:**
- [ ] Design documented
- [ ] Algorithm clearly defined
- [ ] Edge cases identified
- [ ] Data structure specified
- [ ] Performance considerations noted

---

### Task 7.2: Implement Adjacency Detection
**Objective:** Create robust system to detect adjacent translated words

**Implementation:**

1. Create adjacency detection function in `translator.js`:

```javascript
function findAdjacentTranslations(newWrapper) {
  const adjacent = {
    left: [],
    right: []
  };

  // Check left side
  let current = newWrapper.previousSibling;
  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE &&
        current.classList &&
        current.classList.contains('ct-word-wrapper')) {
      // Found adjacent wrapper
      const translation = inlineTranslations.find(t => t.wrapper === current);
      if (translation) {
        adjacent.left.unshift(translation);  // Add to front
        current = current.previousSibling;
        continue;
      }
    } else if (current.nodeType === Node.TEXT_NODE) {
      // Check if it's just whitespace
      if (current.textContent.trim() !== '') {
        break;  // Non-empty text node, not adjacent
      }
    } else {
      break;  // Other element, not adjacent
    }
    current = current.previousSibling;
  }

  // Check right side
  current = newWrapper.nextSibling;
  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE &&
        current.classList &&
        current.classList.contains('ct-word-wrapper')) {
      const translation = inlineTranslations.find(t => t.wrapper === current);
      if (translation) {
        adjacent.right.push(translation);
        current = current.nextSibling;
        continue;
      }
    } else if (current.nodeType === Node.TEXT_NODE) {
      if (current.textContent.trim() !== '') {
        break;
      }
    } else {
      break;
    }
    current = current.nextSibling;
  }

  return adjacent;
}
```

2. Add helper to check if translation is already part of merged group:

```javascript
function findTranslationGroup(wrapper) {
  return inlineTranslations.find(t =>
    t.wrapper === wrapper ||
    (t.mergedWrappers && t.mergedWrappers.includes(wrapper))
  );
}
```

**Validation:**
- [ ] Function correctly identifies adjacent wrappers
- [ ] Handles whitespace-only text nodes correctly
- [ ] Stops at non-wrapper elements
- [ ] Returns correct left and right arrays
- [ ] Test with various DOM structures:
  - Direct siblings
  - Separated by whitespace
  - Separated by other elements
  - At start/end of parent
- [ ] Performance acceptable (O(n) where n is nearby elements)

---

### Task 7.3: Implement Translation Merging Logic
**Objective:** Merge adjacent translations into unified display

**Implementation:**

1. Create merge function:

```javascript
function mergeTranslations(centerTranslation, leftTranslations, rightTranslations) {
  const allTranslations = [...leftTranslations, centerTranslation, ...rightTranslations];

  // Remove existing individual translation displays
  allTranslations.forEach(t => {
    if (t.element && t.element.parentElement) {
      t.element.parentElement.removeChild(t.element);
    }
  });

  // Combine translation texts
  const mergedText = allTranslations
    .map(t => t.translation)
    .join(' ');

  // Get the first and last wrappers for positioning
  const firstWrapper = allTranslations[0].wrapper;
  const lastWrapper = allTranslations[allTranslations.length - 1].wrapper;

  // Create merged translation display
  const isDark = getDarkMode();
  const bgColor = isDark ? '#1a2332' : '#e8f4f8';
  const textColor = isDark ? '#64b5f6' : '#01579b';
  const borderColor = isDark ? '#42a5f5' : '#0288d1';

  const mergedElement = document.createElement('span');
  mergedElement.className = 'ct-inline-translation ct-merged-translation';
  mergedElement.style.cssText = `
    position: absolute !important;
    left: 0 !important;
    bottom: 100% !important;
    margin-bottom: 4px !important;
    background: ${bgColor} !important;
    border: 2px solid ${borderColor} !important;
    border-radius: 4px !important;
    padding: 6px 10px !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    font-size: 14px !important;
    color: ${textColor} !important;
    cursor: pointer !important;
    animation: ct-inline-in 0.2s ease-out !important;
    z-index: 2147483646 !important;
    white-space: nowrap !important;
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
    pointer-events: auto !important;
  `;

  const text = document.createElement('span');
  text.textContent = mergedText;
  text.style.cssText = `
    font-weight: 600 !important;
    font-size: 14px !important;
    color: ${textColor} !important;
  `;
  mergedElement.appendChild(text);

  // Add click handler to remove entire merged group
  mergedElement.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    removeMergedTranslation(mergedData);
  });

  // Attach to first wrapper
  firstWrapper.appendChild(mergedElement);

  // Calculate width to span all wrappers
  const firstRect = firstWrapper.getBoundingClientRect();
  const lastRect = lastWrapper.getBoundingClientRect();
  const totalWidth = lastRect.right - firstRect.left;

  // Update merged element to span properly (optional visual enhancement)
  // mergedElement.style.minWidth = `${totalWidth}px`;

  // Create merged data structure
  const mergedData = {
    wrapper: firstWrapper,  // Primary wrapper
    element: mergedElement,
    translation: mergedText,
    merged: true,
    components: allTranslations.map(t => ({
      wrapper: t.wrapper,
      text: t.text,
      translation: t.translation
    })),
    mergedWrappers: allTranslations.map(t => t.wrapper)
  };

  // Remove individual translations from tracking array
  allTranslations.forEach(t => {
    const index = inlineTranslations.indexOf(t);
    if (index > -1) {
      inlineTranslations.splice(index, 1);
    }
  });

  // Add merged translation to tracking
  inlineTranslations.push(mergedData);

  return mergedData;
}
```

2. Create function to remove merged translation:

```javascript
function removeMergedTranslation(mergedData) {
  if (mergedData.element && mergedData.element.parentElement) {
    mergedData.element.parentElement.removeChild(mergedData.element);
  }

  // Unwrap all component wrappers
  mergedData.mergedWrappers.forEach(wrapper => {
    if (wrapper && wrapper.parentNode) {
      const parent = wrapper.parentNode;
      while (wrapper.firstChild) {
        const child = wrapper.firstChild;
        parent.insertBefore(child, wrapper);
      }
      parent.removeChild(wrapper);
    }
  });

  // Remove from tracking
  const index = inlineTranslations.indexOf(mergedData);
  if (index > -1) {
    inlineTranslations.splice(index, 1);
  }
}
```

**Validation:**
- [ ] Merged translation displays correctly
- [ ] Spans all adjacent words visually
- [ ] Combined text is properly formatted
- [ ] Click handler removes entire merged group
- [ ] All wrappers properly unwrapped on removal
- [ ] Tracking array updated correctly
- [ ] Test with 2, 3, 5, 10+ adjacent words
- [ ] Visual appearance is clean and professional
- [ ] Dark mode works correctly

---

### Task 7.4: Integrate Merging into Translation Flow
**Objective:** Update main translation logic to detect and merge adjacent translations

**Implementation:**

1. Update the translation request handler:

```javascript
async function handleWordClick(text, wordRange) {
  // ... existing translation request code ...

  // After getting translation, check for adjacent translations
  const wrapper = /* newly created wrapper */;
  const adjacent = findAdjacentTranslations(wrapper);

  if (adjacent.left.length > 0 || adjacent.right.length > 0) {
    // Create new translation data for current word
    const currentTranslation = {
      wrapper: wrapper,
      element: null,  // Will be created by merge
      text: text,
      translation: translation
    };

    // Merge with adjacent translations
    mergeTranslations(currentTranslation, adjacent.left, adjacent.right);
  } else {
    // No adjacent translations, create standalone
    showInlineTranslation(translation, cached, wordRange);
  }
}
```

2. Update `showInlineTranslation` to support merge-aware creation:

```javascript
function showInlineTranslation(translation, cached, wordRange, checkMerge = true) {
  // ... existing wrapper creation code ...

  if (checkMerge) {
    const adjacent = findAdjacentTranslations(wrapper);
    if (adjacent.left.length > 0 || adjacent.right.length > 0) {
      // This translation should be merged
      const currentTranslation = {
        wrapper: wrapper,
        element: null,
        text: /* extracted text */,
        translation: translation
      };
      mergeTranslations(currentTranslation, adjacent.left, adjacent.right);
      return;
    }
  }

  // ... continue with normal inline translation creation ...
}
```

**Validation:**
- [ ] New translations detect adjacent ones
- [ ] Automatic merging occurs when appropriate
- [ ] Non-adjacent translations remain separate
- [ ] Existing translation flow not broken
- [ ] Test sequence:
  - Translate word A
  - Translate adjacent word B → merges
  - Translate adjacent word C → merges all three
  - Translate non-adjacent word D → separate
  - Translate word E adjacent to D → merges D and E, A-B-C stays separate
- [ ] No performance degradation

---

### Task 7.5: Handle Edge Cases
**Objective:** Ensure merging works correctly in all scenarios

**Edge Cases to Handle:**

1. **Re-translating merged group:**
   - If user clicks on word already in merged group
   - Should remove entire merged group, or ignore?
   - **Decision:** Clicking on merged translation removes entire group

2. **Merging across different parents:**
   - Words in different <p> or <div> elements
   - Should NOT merge
   - **Validation:** Check same parent before merging

3. **Mixed display modes:**
   - User has inline mode on, translates words, then switches to tooltip
   - Should clear existing translations (already implemented)
   - Merging only applies to inline mode
   - **Validation:** Disable merging for tooltip mode

4. **Very long merged translations:**
   - 10+ adjacent words creating very wide translation
   - May overflow screen width
   - **Solution:** Add max-width and text wrapping

5. **Clicking on merged translation:**
   - Should remove entire merged group
   - **Implementation:** Already in removeMergedTranslation

6. **Clear All Translations:**
   - Should remove merged translations correctly
   - **Validation:** Update clearAllTranslations to handle merged flag

**Implementation:**

```javascript
function mergeTranslations(centerTranslation, leftTranslations, rightTranslations) {
  // Add parent check
  const allTranslations = [...leftTranslations, centerTranslation, ...rightTranslations];
  const firstParent = allTranslations[0].wrapper.parentElement;

  // Verify all wrappers have same parent
  const sameParent = allTranslations.every(t =>
    t.wrapper.parentElement === firstParent
  );

  if (!sameParent) {
    // Don't merge across different parents
    return showInlineTranslation(
      centerTranslation.translation,
      false,
      null,
      false  // Don't check merge again
    );
  }

  // ... rest of merge logic ...

  // Add max-width for long translations
  mergedElement.style.maxWidth = '80vw';
  mergedElement.style.whiteSpace = 'normal';
  mergedElement.style.wordBreak = 'break-word';
}
```

**Validation:**
- [ ] Merging blocked across different parents
- [ ] Only inline mode uses merging
- [ ] Tooltip mode unaffected
- [ ] Long translations wrap properly
- [ ] Clear all removes merged translations
- [ ] Re-clicking translated word removes group
- [ ] Test all edge cases:
  - Words in different paragraphs
  - Words in table cells
  - Words in list items
  - Very long sequences (20+ words)
  - Mixed translated/untranslated words

---

### Task 7.6: Visual Enhancements for Merged Translations
**Objective:** Make merged translations visually distinguishable and polished

**Implementation:**

1. Add visual indicator for merged translations:

```javascript
// Add subtle indicator that this is a merged translation
if (allTranslations.length > 1) {
  mergedElement.style.borderLeft = `4px solid ${borderColor}`;

  // Optional: Add word count badge
  const badge = document.createElement('span');
  badge.textContent = `${allTranslations.length}`;
  badge.style.cssText = `
    display: inline-block !important;
    background: ${borderColor} !important;
    color: white !important;
    border-radius: 10px !important;
    padding: 2px 6px !important;
    font-size: 10px !important;
    margin-left: 6px !important;
    font-weight: bold !important;
  `;
  mergedElement.appendChild(badge);
}
```

2. Add hover effect:

```javascript
mergedElement.addEventListener('mouseenter', () => {
  mergedElement.style.transform = 'translateY(-2px)';
  mergedElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
});

mergedElement.addEventListener('mouseleave', () => {
  mergedElement.style.transform = 'translateY(0)';
  mergedElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
});
```

3. Add smooth transition:

```javascript
mergedElement.style.transition = 'all 0.2s ease-out';
```

**Validation:**
- [ ] Merged translations visually distinct
- [ ] Hover effects smooth and professional
- [ ] Badge displays correct word count
- [ ] Transitions don't interfere with functionality
- [ ] Dark mode styling correct
- [ ] Visual hierarchy clear

---

### Task 7.7: Performance Optimization
**Objective:** Ensure merging doesn't degrade performance

**Optimizations:**

1. **Cache adjacency checks:**
```javascript
// Store last adjacency check to avoid repeated DOM traversal
let adjacencyCache = new WeakMap();

function findAdjacentTranslations(newWrapper) {
  const cached = adjacencyCache.get(newWrapper);
  if (cached && Date.now() - cached.timestamp < 1000) {
    return cached.result;
  }

  const result = /* ... perform adjacency check ... */;

  adjacencyCache.set(newWrapper, {
    result: result,
    timestamp: Date.now()
  });

  return result;
}
```

2. **Limit merge depth:**
```javascript
const MAX_MERGE_WORDS = 20;  // Don't merge more than 20 words

function mergeTranslations(centerTranslation, leftTranslations, rightTranslations) {
  const allTranslations = [...leftTranslations, centerTranslation, ...rightTranslations];

  if (allTranslations.length > MAX_MERGE_WORDS) {
    // Too many words, don't merge
    return showInlineTranslation(centerTranslation.translation, false, null, false);
  }

  // ... rest of merge logic ...
}
```

3. **Batch DOM updates:**
```javascript
// Use DocumentFragment for multiple DOM operations
function removeMergedTranslation(mergedData) {
  const fragment = document.createDocumentFragment();

  mergedData.mergedWrappers.forEach(wrapper => {
    if (wrapper && wrapper.parentNode) {
      while (wrapper.firstChild) {
        fragment.appendChild(wrapper.firstChild);
      }
    }
  });

  // Single DOM update
  const parent = mergedData.mergedWrappers[0].parentNode;
  parent.insertBefore(fragment, mergedData.mergedWrappers[0]);

  // Then remove wrappers
  mergedData.mergedWrappers.forEach(w => w.remove());
}
```

**Validation:**
- [ ] Adjacency check cached appropriately
- [ ] Merge limit prevents excessive merging
- [ ] DOM operations batched
- [ ] Performance metrics:
  - Creating merged translation <50ms
  - Removing merged translation <30ms
  - No memory leaks with many merge/unmerge cycles
- [ ] Test with 100+ translations on page
- [ ] Test rapid clicking (10 words in 2 seconds)

---

### Task 7.8: Update Clear Translations for Merged Groups
**Objective:** Ensure clearAllTranslations handles merged translations correctly

**Implementation:**

```javascript
function clearAllTranslations() {
  // Clear the tracking array first
  inlineTranslations = [];

  // Method 1: Remove all wrapper elements from DOM
  const wrappers = document.querySelectorAll('.ct-word-wrapper');
  wrappers.forEach(wrapper => {
    try {
      const parent = wrapper.parentNode;
      if (parent) {
        // Move all children (except translation elements) back to parent
        while (wrapper.firstChild) {
          const child = wrapper.firstChild;
          if (child.classList &&
              (child.classList.contains('ct-inline-translation') ||
               child.classList.contains('ct-merged-translation'))) {
            // Remove translation element
            wrapper.removeChild(child);
          } else {
            // Move original word back
            parent.insertBefore(child, wrapper);
          }
        }
        // Remove the empty wrapper
        parent.removeChild(wrapper);
      }
    } catch (error) {
      console.error('[ContextTranslator] Error removing wrapper:', error);
    }
  });

  // Method 2: Remove any orphaned inline translation elements (including merged)
  const inlineElements = document.querySelectorAll('.ct-inline-translation, .ct-merged-translation');
  inlineElements.forEach(element => {
    try {
      if (element.parentElement) {
        element.parentElement.removeChild(element);
      }
    } catch (error) {
      console.error('[ContextTranslator] Error removing inline element:', error);
    }
  });

  // Remove any active tooltips
  removeTooltip();
}
```

**Validation:**
- [ ] Merged translations removed correctly
- [ ] All wrappers unwrapped
- [ ] No orphaned elements remain
- [ ] Test with mix of individual and merged translations
- [ ] Verify page returns to clean state

---

### Task 7.9: Testing - Comprehensive QA
**Objective:** Thorough testing of adjacent translation merging

**Test Scenarios:**

1. **Basic Merging:**
   - [ ] Translate word A
   - [ ] Translate adjacent word B (should merge)
   - [ ] Verify single merged display shows "A B"

2. **Sequential Building:**
   - [ ] Translate word A
   - [ ] Translate adjacent word B (merges to "A B")
   - [ ] Translate adjacent word C (merges to "A B C")
   - [ ] Translate adjacent word D (merges to "A B C D")
   - [ ] Verify single display spans all four words

3. **Non-Adjacent:**
   - [ ] Translate word A
   - [ ] Translate word B (not adjacent)
   - [ ] Verify two separate displays

4. **Bidirectional Merging:**
   - [ ] Translate word B
   - [ ] Translate word A (to the left) → merges
   - [ ] Translate word C (to the right) → merges all three

5. **Gap Preservation:**
   - [ ] Translate words "always" and "together"
   - [ ] Translate word "still" (between them)
   - [ ] Verify all three merge into one

6. **Different Paragraphs:**
   - [ ] Translate last word of paragraph 1
   - [ ] Translate first word of paragraph 2
   - [ ] Verify NO merge (different parents)

7. **Removal:**
   - [ ] Create merged translation of A+B+C
   - [ ] Click on merged translation
   - [ ] Verify all three wrappers removed

8. **Clear All:**
   - [ ] Create multiple merged and individual translations
   - [ ] Click "Clear Translations"
   - [ ] Verify all removed

9. **Long Sequences:**
   - [ ] Translate 10 adjacent words
   - [ ] Verify single merged display
   - [ ] Verify proper wrapping/styling

10. **Mode Switching:**
    - [ ] Create merged translations in inline mode
    - [ ] Switch to tooltip mode
    - [ ] Verify merged translations cleared
    - [ ] Verify tooltip mode works normally

**Performance Testing:**
- [ ] Create 50+ adjacent translated words
- [ ] Verify merge performance acceptable
- [ ] Check memory usage
- [ ] Verify no memory leaks

**Visual Testing:**
- [ ] Merged translations align properly above words
- [ ] Styling consistent in light and dark modes
- [ ] Hover effects work smoothly
- [ ] Badge (if added) displays correctly
- [ ] Long translations wrap appropriately

**Edge Cases:**
- [ ] Re-translating word in merged group
- [ ] Translating untranslated word between merged groups
- [ ] Very long translations (100+ characters)
- [ ] Rapid clicking multiple adjacent words
- [ ] Browser window resize with merged translations visible

---

### Task 7.10: Documentation Updates
**Objective:** Document the adjacent translation merging feature

**Updates Required:**

1. **User-Facing Documentation (INSTALLATION.md):**
   - Add section on translation merging
   - Explain how adjacent words are automatically merged
   - Note that clicking merged translation removes all

2. **Code Comments:**
   - Add detailed comments to merging functions
   - Document data structure for merged translations
   - Explain adjacency detection algorithm

3. **README.md:**
   - Add to features list: "Automatic merging of adjacent translations"

**Validation:**
- [ ] Documentation clear and accurate
- [ ] Examples provided
- [ ] Code comments comprehensive

---

## Phase 7 Completion Checklist

**Implementation:**
- [ ] Adjacency detection implemented and tested
- [ ] Translation merging logic complete
- [ ] Integration with main translation flow working
- [ ] Edge cases handled correctly
- [ ] Visual enhancements applied
- [ ] Performance optimized

**Testing:**
- [ ] All test scenarios passed
- [ ] Performance benchmarks met
- [ ] No regressions in existing functionality
- [ ] Cross-browser compatibility verified

**Quality:**
- [ ] Code follows project standards
- [ ] Comments and documentation complete
- [ ] No console errors or warnings
- [ ] Memory usage acceptable

**User Experience:**
- [ ] Merging happens automatically and smoothly
- [ ] Visual presentation clear and professional
- [ ] Removal of merged translations intuitive
- [ ] No confusing behavior or edge cases

**Success Criteria:**
- Adjacent translated words merge automatically
- Merged translations span 2-20+ words seamlessly
- Visual clutter reduced significantly
- Performance impact <5ms per merge operation
- User can easily remove merged translation groups
- Works reliably across different page structures

---

## Phase 6: Architecture Simplification - HTTP Refactor

**Objective:** Remove native messaging complexity and use direct HTTP communication

**Rationale:**
- Native messaging host duplicates ALL logic from FastAPI backend (191 lines)
- Requires complex manifest installation in Firefox profile
- stdio communication is opaque for debugging
- HTTP is simpler, debugger-friendly, and equally secure for localhost
- Single source of truth (FastAPI backend only)

### Task 6.1: Analysis & Planning
**Objective:** Document current state and refactor plan

**Current Architecture:**
```
Extension → Native Messaging (stdio) → Native Host (Python) → Backend modules
```

**New Architecture:**
```
Extension → HTTP (fetch) → FastAPI Backend → Backend modules
```

**Files to Remove:**
- extension/native-host/context_translator_host.py (191 lines - duplicate logic)
- extension/native-host/context_translator_host.json
- scripts/install-native-host.sh
- ~/.mozilla/native-messaging-hosts/context_translator_host.json (installed file)

**Files to Modify:**
- extension/background/background.js (replace native messaging with fetch)
- extension/manifest.json (remove nativeMessaging permission)
- scripts/start-backend.sh (start FastAPI instead of native host)

**Security Analysis:**
- ✅ Content scripts still access DOM/text on all websites (unchanged)
- ✅ Content → Background uses browser.runtime.sendMessage (not subject to CORS)
- ✅ Background → Backend uses fetch() from extension context (bypasses CORS)
- ✅ Extension has <all_urls> permission
- ✅ Backend has localhost-only middleware
- ✅ No additional attack surface vs native messaging

**Validation:**
- [x] Architecture documented
- [x] Security analysis complete
- [x] No CORS issues identified
- [x] Simpler than native messaging

---

### Task 6.2: Update Background Script - HTTP Communication
**Objective:** Replace native messaging with HTTP fetch calls

**Implementation:**
1. Update `extension/background/background.js`:
   - Remove native messaging connection code:
     - `ensureNativeConnection()` function
     - `sendNativeMessage()` function
     - `nativePort` variable
     - `pendingRequests` Map
   - Add HTTP fetch helpers:
     ```javascript
     const BACKEND_URL = 'http://localhost:8080';
     
     async function fetchBackend(endpoint, options = {}) {
       const url = `${BACKEND_URL}${endpoint}`;
       const response = await fetch(url, {
         ...options,
         headers: {
           'Content-Type': 'application/json',
           ...options.headers
         }
       });
       
       if (!response.ok) {
         throw new Error(`HTTP ${response.status}: ${response.statusText}`);
       }
       
       return await response.json();
     }
     ```
   - Update message handlers to use HTTP:
     ```javascript
     async function handleTranslateRequest(data) {
       logger.info("[Background] Sending translation request");
       const result = await fetchBackend('/translate', {
         method: 'POST',
         body: JSON.stringify({
           text: data.text,
           source_lang: data.source_lang,
           target_lang: data.target_lang,
           context: data.context || null,
           use_cache: data.use_cache !== false
         })
       });
       return result;
     }
     
     async function handleGetLanguagesRequest() {
       const result = await fetchBackend('/languages', {
         method: 'GET'
       });
       return result;
     }
     
     async function handleHealthCheckRequest() {
       try {
         const result = await fetchBackend('/health', {
           method: 'GET'
         });
         return result;
       } catch (error) {
         return { status: 'unhealthy', error: error.message };
       }
     }
     
     async function handleClearCacheRequest() {
       const result = await fetchBackend('/cache/clear', {
         method: 'POST'
       });
       return result;
     }
     ```

**Validation:**
- [ ] `node --check extension/background/background.js` passes
- [ ] No native messaging code remains
- [ ] All handlers use HTTP
- [ ] Error handling preserves user experience

---

### Task 6.3: Update Manifest - Remove Native Messaging
**Objective:** Remove nativeMessaging permission from manifest

**Implementation:**
1. Update `extension/manifest.json`:
   ```json
   "permissions": [
     "storage",
     "activeTab",
     "<all_urls>"
   ]
   ```
   (Remove "nativeMessaging")

**Validation:**
- [ ] Manifest parses correctly
- [ ] No nativeMessaging permission
- [ ] <all_urls> permission present (needed for fetch)

---

### Task 6.4: Update Backend Endpoints
**Objective:** Ensure backend endpoints match extension expectations

**Implementation:**
1. Verify `backend/app/main.py` endpoints:
   - `GET /health` → returns `{"status": "healthy", "llm_checked": false}`
   - `GET /languages` → returns `{"languages": [...]}`
   - `POST /translate` → accepts request, returns `{"translation": "...", "cached": true/false}`
   - `POST /cache/clear` → clears cache, returns `{"status": "cleared"}`

2. Add `/cache/clear` endpoint if missing:
   ```python
   @app.post("/cache/clear")
   async def clear_cache():
       await cache.clear()
       return {"status": "cleared"}
   ```

**Validation:**
- [ ] All endpoints exist
- [ ] Response formats match expectations
- [ ] Backend starts without errors
- [ ] `curl http://localhost:8080/health` works

---

### Task 6.5: Update Start Script
**Objective:** Start FastAPI backend instead of native host

**Implementation:**
1. Update `scripts/start-backend.sh`:
   - Remove native host startup
   - Add FastAPI startup with uvicorn:
     ```bash
     echo "==> Starting FastAPI backend..."
     cd "$PROJECT_ROOT/backend"
     uvicorn app.main:app --host localhost --port 8080 --log-level info
     ```

**Validation:**
- [ ] Script runs without errors
- [ ] FastAPI starts on port 8080
- [ ] Health check responds: `curl http://localhost:8080/health`
- [ ] Backend logs show startup

---

### Task 6.6: Remove Native Messaging Files
**Objective:** Clean up all native messaging related files

**Implementation:**
1. Remove files:
   ```bash
   rm extension/native-host/context_translator_host.py
   rm extension/native-host/context_translator_host.json
   rm scripts/install-native-host.sh
   rm ~/.mozilla/native-messaging-hosts/context_translator_host.json
   rmdir extension/native-host  # if empty
   ```

2. Update .gitignore if needed

**Validation:**
- [ ] Files removed from filesystem
- [ ] Files removed from git tracking
- [ ] No broken references in code
- [ ] Project structure clean

---

### Task 6.7: Integration Testing - Full Flow
**Objective:** Test complete translation flow end-to-end

**Test Scenarios:**
1. Backend startup:
   - [ ] `./scripts/start-backend.sh` starts FastAPI
   - [ ] Health endpoint responds
   - [ ] Languages endpoint returns list

2. Extension loading:
   - [ ] Reload extension in Firefox
   - [ ] No console errors in background script
   - [ ] Extension icon shows active

3. Translation flow:
   - [ ] Toggle extension with Ctrl+Alt+C
   - [ ] Toolbar appears with language dropdowns populated
   - [ ] Click word on page
   - [ ] Translation appears inline
   - [ ] Check browser console - no errors
   - [ ] Check backend logs - request logged

4. Cache verification:
   - [ ] Translate same word twice
   - [ ] Second translation is instant (cached)
   - [ ] Backend logs show cache hit

5. Error handling:
   - [ ] Stop backend
   - [ ] Try translation
   - [ ] User sees helpful error message
   - [ ] Restart backend
   - [ ] Translation works again

**Validation:**
- [ ] All test scenarios pass
- [ ] No console errors
- [ ] No backend errors
- [ ] Performance acceptable
- [ ] User experience smooth

---

### Task 6.8: Update Documentation
**Objective:** Update docs to reflect HTTP architecture

**Files to Update:**
1. `README.md`:
   - Remove native messaging installation steps
   - Simplify setup to: "Run FastAPI backend, load extension"
   - Update architecture description

2. `CHANGELOG.md`:
   - Add under "Changed":
     - "Simplified architecture: replaced native messaging with direct HTTP"
     - "Removed 200+ lines of duplicate code"
     - "Improved debugging with standard HTTP requests"

3. Remove references to native messaging from any other docs

**Validation:**
- [ ] Documentation accurate
- [ ] Setup steps tested
- [ ] No outdated references

---

### Task 6.9: Final Validation & Testing
**Objective:** Comprehensive validation of refactored system

**Backend Tests:**
- [ ] `cd backend && pytest -v`
- [ ] `ruff check backend/app`
- [ ] `mypy backend/app`
- [ ] All tests pass

**Extension Testing:**
- [ ] Reload extension in Firefox
- [ ] Test on 3+ different websites
- [ ] Test all features:
  - [ ] Word translation
  - [ ] Phrase translation
  - [ ] Context mode
  - [ ] Cache functionality
  - [ ] Settings persistence
  - [ ] Dark mode
  - [ ] Display modes (inline/tooltip)

**Performance:**
- [ ] Translation request <2s
- [ ] Cache hit <100ms
- [ ] No memory leaks
- [ ] Backend stable

**Clean State:**
- [ ] No debug code
- [ ] No native messaging references
- [ ] Git status clean (only intended changes)

---

### Task 6.10: Mark Complete
**Objective:** Document completion of HTTP refactor

**Results:**
- Architecture simplified from native messaging to HTTP
- Removed 200+ lines of duplicate code
- Improved debugging with standard HTTP/network tab
- Maintained all functionality
- No security degradation
- Simpler setup (no manifest installation)

**Files Changed:**
- ✓ extension/background/background.js (simplified)
- ✓ extension/manifest.json (removed permission)
- ✓ scripts/start-backend.sh (use uvicorn)
- ✓ backend/app/main.py (verified endpoints)

**Files Removed:**
- ✓ extension/native-host/context_translator_host.py
- ✓ extension/native-host/context_translator_host.json
- ✓ scripts/install-native-host.sh

**Status:** [COMPLETE]

---
