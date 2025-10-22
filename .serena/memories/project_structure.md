# Project Structure

## Root Directory Layout

```
context-translator/
├── backend/              # Python backend application
├── extension/            # Firefox extension
├── scripts/              # Build and utility scripts
├── docs/                 # Documentation
├── dist/                 # Build output (generated)
├── cache/                # SQLite database storage (generated)
├── .serena/              # Serena agent memory files
├── .claude/              # Claude Code configuration
├── .git/                 # Git repository
├── config.yaml           # Backend configuration
├── README.md             # Project documentation
└── .gitignore           # Git ignore patterns
```

## Backend Directory (`backend/`)

```
backend/
├── app/                  # Main application package
│   ├── __init__.py
│   ├── main.py           # FastAPI application, endpoints, lifespan
│   ├── config.py         # Configuration management (reads config.yaml)
│   ├── models.py         # Pydantic models for API requests/responses
│   ├── cache.py          # TranslationCache class (SQLite async operations)
│   ├── llm_client.py     # LLM client with fallback support
│   ├── prompts.py        # Translation prompt templates
│   └── validation.py     # Input sanitization and validation
├── tests/                # Test suite
│   ├── __init__.py
│   ├── conftest.py       # Pytest fixtures
│   ├── test_cache.py     # Cache unit tests
│   ├── test_config.py    # Configuration tests
│   ├── test_llm_client.py # LLM client tests
│   ├── test_models.py    # Model validation tests
│   ├── test_prompts.py   # Prompt generation tests
│   ├── test_lifespan.py  # App lifecycle tests
│   ├── test_integration.py # Integration tests
│   └── test_llm_integration.py # LLM integration tests
├── cache/                # SQLite database location (generated)
├── requirements.txt      # Python dependencies (pinned versions)
├── pyproject.toml        # Ruff, mypy, pytest configuration
└── mypy.ini              # Mypy type checker configuration
```

## Extension Directory (`extension/`)

```
extension/
├── manifest.json         # Extension manifest (Manifest V2)
├── background/           # Background scripts
│   └── background.js     # Extension lifecycle management
├── content/              # Content scripts (injected into pages)
│   ├── translator.js     # Main translation logic
│   └── translator.css    # Translation UI styles
├── popup/                # Extension popup UI
│   ├── popup.html        # Popup interface
│   ├── popup.js          # Popup logic
│   └── popup.css         # Popup styles
├── icons/                # Extension icons
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── native-host/          # Native messaging Python backend
    ├── context_translator_host.py # Native messaging host script
    └── context_translator_host.json # Native host manifest
```

## Scripts Directory (`scripts/`)

```
scripts/
├── package-extension.sh  # Packages extension as .xpi file
│                         # - Creates native host manifest with correct paths
│                         # - Zips extension files
│                         # - Signs and packages for distribution
└── start-backend.sh      # Starts native messaging host for testing
                          # - Validates Python environment
                          # - Checks dependencies
                          # - Starts host in native messaging mode
```

## Documentation Directory (`docs/`)

```
docs/
├── INSTALLATION.md       # Detailed installation guide
├── implementation.md     # Technical implementation details
├── requirements.md       # Original requirements specification
└── code-analysis.md      # Code quality analysis and improvements
```

## Key Files

### Configuration Files

- **`config.yaml`**: Backend configuration
  - LLM endpoints (primary/fallback)
  - Cache settings (path, TTL, size limits)
  - Translation settings (max length, context window, languages)
  - Server settings (host, port)

- **`backend/pyproject.toml`**: Python tool configuration
  - Ruff linter/formatter settings
  - Mypy type checker settings
  - Pytest test runner settings

- **`backend/mypy.ini`**: Mypy-specific configuration
  - Strict mode enabled
  - Per-module overrides

- **`backend/requirements.txt`**: Python dependencies with pinned versions

- **`extension/manifest.json`**: Firefox extension configuration
  - Permissions (nativeMessaging, activeTab, storage)
  - Content scripts injection rules
  - Background scripts
  - Browser action (toolbar button)
  - Keyboard shortcuts

### Generated Directories

- **`dist/`**: Build output from `package-extension.sh`
  - Contains `.xpi` file for Firefox installation
  - Native host manifest with resolved paths

- **`cache/`**: SQLite database storage
  - `translations.db`: Cached translations
  - Created automatically by backend on first run

- **`backend/__pycache__/`**, **`.pytest_cache/`**, **`.mypy_cache/`**, **`.ruff_cache/`**: 
  - Tool cache directories (generated, gitignored)

## Important Entry Points

### Backend
- **`backend/app/main.py`**: FastAPI application
  - Main endpoints: `/health`, `/translate`, `/languages`
  - Dependency injection setup
  - Middleware configuration
  - Lifespan management

### Extension
- **`extension/content/translator.js`**: Core translation logic
  - Click event handling
  - Translation display (inline/tooltip)
  - Context extraction
  - State management

- **`extension/background/background.js`**: Extension lifecycle
  - Native messaging communication
  - Message routing
  - Settings persistence

- **`extension/native-host/context_translator_host.py`**: Native messaging host
  - Stdin/stdout message protocol
  - Length-prefixed JSON messages
  - Integration with backend logic

## Module Dependencies

### Backend Internal Dependencies
```
main.py
├── config.py (load configuration)
├── cache.py (translation caching)
├── llm_client.py (LLM API calls)
│   └── prompts.py (prompt templates)
├── models.py (request/response models)
└── validation.py (input sanitization)
```

### Extension Communication Flow
```
Content Script (translator.js)
    ↓ (DOM event)
    ↓
Background Script (background.js)
    ↓ (native messaging)
    ↓
Native Host (context_translator_host.py)
    ↓ (stdin/stdout)
    ↓
Backend (main.py)
    ↓ (HTTP)
    ↓
LLM Server (external)
```

## Code Organization Patterns

### Backend
- **Async-first**: All I/O operations use async/await
- **Dependency injection**: FastAPI dependencies for config, cache, LLM client
- **Single responsibility**: Each module handles one concern
- **Type safety**: Pydantic models for all data structures

### Extension
- **Event-driven**: Message passing between components
- **Stateful**: Settings stored in browser.storage.local
- **Modular**: Separate concerns (content, background, popup)
- **Native integration**: Direct Python backend communication

## Testing Organization

Tests mirror the `app/` structure:
- One test file per application module
- `conftest.py` for shared fixtures
- Integration tests marked with `@pytest.mark.integration`
- 80%+ code coverage target
