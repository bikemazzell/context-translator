# Technology Stack

## Backend (Python 3.12+)

### Core Framework
- **FastAPI 0.115.5** - Modern async web framework
- **uvicorn[standard] 0.32.1** - ASGI server
- **Pydantic 2.10.3** - Data validation and settings

### HTTP & Async
- **httpx 0.27.2** - Async HTTP client for LLM API calls
- **aiosqlite 0.20.0** - Async SQLite database access

### Configuration
- **pyyaml 6.0.2** - YAML configuration parsing
- Configuration file: `config.yaml` at project root

### Testing
- **pytest 8.3.4** - Testing framework
- **pytest-asyncio 0.24.0** - Async test support
- **pytest-cov 6.0.0** - Code coverage reporting

### Code Quality
- **ruff 0.8.4** - Fast Python linter and formatter
- **mypy 1.13.0** - Static type checker (strict mode enabled)
- **types-pyyaml 6.0.12.20240917** - Type stubs for PyYAML

## Frontend (JavaScript)

### Firefox Extension
- **WebExtensions API** - Firefox extension framework
- **Native Messaging API** - Communication with Python backend
- Vanilla JavaScript (no frameworks)
- CSS with dark mode support

### Manifest
- Currently: Manifest V2
- Note: Future migration to Manifest V3 will be needed

## Database
- **SQLite** via aiosqlite
- Location: `./cache/translations.db`
- Schema versioning with SCHEMA_VERSION constant
- LRU eviction when cache exceeds max_size_mb

## LLM Integration
- OpenAI-compatible API interface
- Primary: LMStudio (default port 1234)
- Fallback: llama-server (port 8080)
- Tested models: Gemma 3 12B/27B, Llama 3.1 8B, Mistral 7B, Qwen 2.5

## Development Tools
- Git for version control
- Bash scripts for packaging and testing
- pytest for comprehensive test coverage
- mypy with strict mode for type safety
- ruff for fast linting with extensive rule sets

## Python Environment
- Conda environment: ai312
- Target version: Python 3.12
- UTF-8 encoding throughout
