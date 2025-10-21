# Context Translator

A bookmarklet-based translation tool that provides inline word/phrase translation on any webpage, similar to Readlang.com. Runs locally with a Python backend communicating with LLM inference servers (LMStudio or llama-server).

## Features

- **Bookmarklet-based**: Single-click activation on any webpage
- **Inline Translation**: Translate words and phrases directly on the page
- **Context-aware**: Optional context mode for more accurate translations
- **Local & Private**: All processing happens locally, no external services
- **Intelligent Caching**: SQLite-based cache with TTL and LRU eviction
- **Multiple Display Modes**: Tooltip, popover, or inline display
- **LLM-powered**: Uses local LLM for high-quality translations

## Requirements

- Python 3.12+ (developed and tested with Python 3.12.x)
- Node.js 18+ (for frontend build tools)
- Modern browser (Chrome or Firefox, latest 2 versions)
- LLM server (LMStudio or llama.cpp server) running locally

## Quick Start

### 1. Install Backend

```bash
cd context-translator

# Install Python dependencies
pip install -r backend/requirements.txt

# Start the backend server
cd backend
python -m uvicorn app.main:app --host localhost --port 8080
```

### 2. Configure LLM Server

Edit `config.yaml` to match your LLM server setup:

```yaml
llm:
  primary:
    provider: lmstudio
    endpoint: http://localhost:1234/v1/chat/completions
    model_name: gemma-2-27b-it
    timeout: 30
```

### 3. Install Bookmarklet

Frontend implementation coming in Phase 2. See [implementation.md](implementation.md:1) for the complete development plan.

## Project Structure

```
context-translator/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application
│   │   ├── config.py        # Configuration loading
│   │   ├── models.py        # Pydantic models
│   │   ├── cache.py         # SQLite caching
│   │   ├── llm_client.py    # LLM provider abstraction
│   │   └── prompts.py       # LLM prompt templates
│   ├── tests/               # Unit and integration tests
│   ├── requirements.txt     # Python dependencies
│   └── pyproject.toml       # Tool configuration
├── frontend/                # Bookmarklet code (Phase 2)
├── config.yaml              # Server configuration
└── README.md
```

## API Endpoints

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "llm_checked": false
}
```

### `GET /languages`
Get list of supported languages.

**Response:**
```json
{
  "languages": ["English", "German", "French", "Spanish", "Italian", ...]
}
```

### `POST /translate`
Translate text.

**Request:**
```json
{
  "text": "Haus",
  "source_lang": "German",
  "target_lang": "English",
  "context": "Das Haus ist groß" // optional
}
```

**Response:**
```json
{
  "translation": "house",
  "cached": false
}
```

## Configuration

Edit `config.yaml` to customize:

- Server host and port
- LLM provider settings (primary and fallback)
- Cache settings (path, TTL, max size)
- Translation settings (max length, context window, supported languages)

See [config.yaml](config.yaml:1) for full configuration options.

## Development

### Running Tests

```bash
cd backend
pytest tests/ -v --cov=app --cov-report=term-missing
```

### Code Quality

```bash
# Linting
ruff check backend/

# Type checking
mypy backend/app/

# Format code
ruff format backend/
```

## Implementation Status

- ✅ Phase 1: Backend Core (COMPLETED)
  - ✅ Project structure and configuration
  - ✅ Configuration module with validation
  - ✅ Pydantic models for API
  - ✅ LLM prompt templates
  - ✅ Async SQLite caching with WAL mode
  - ✅ LLM client with retry logic
  - ✅ FastAPI application with CORS
  - ✅ Comprehensive unit tests

- ⏳ Phase 2: Frontend (PENDING)
  - Bookmarklet implementation
  - Floating toolbar UI
  - Translation interaction
  - Settings persistence

- ⏳ Phase 3: Enhanced Features (PENDING)
  - Multiple display modes
  - llama.cpp server support
  - Rate limiting
  - Advanced error handling

See [implementation.md](implementation.md:1) for the complete development roadmap.

## License

MIT License (to be added)

## Contributing

This project follows a strict test-driven development approach. All contributions must include:
- Comprehensive unit tests
- Type annotations
- Documentation
- Code passing all linters and type checkers

See [implementation.md](implementation.md:1) for detailed development guidelines.
