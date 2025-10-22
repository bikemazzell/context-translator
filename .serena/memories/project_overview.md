# Project Overview: Context Translator

## Purpose
Context Translator is a Firefox extension for context-aware translation using local LLM models. It allows users to translate words and phrases directly on web pages with intelligent context understanding, prioritizing privacy by processing everything locally.

## Key Features
- Context-aware translation with adjustable context window
- Inline & tooltip display modes
- Smart caching with SQLite (sub-50ms cached lookups)
- Native messaging between Firefox extension and Python backend
- Privacy-first: 100% local processing, no external requests
- Dark mode support with auto-detection
- Keyboard shortcuts (Ctrl+Alt+C)

## Architecture
The project follows a three-tier architecture:

1. **Firefox Extension** (JavaScript)
   - Content scripts inject translation UI into web pages
   - Background scripts manage extension lifecycle
   - Popup provides settings interface
   - Communicates with backend via native messaging (stdin/stdout)

2. **Python Backend** (FastAPI + Native Messaging)
   - Native messaging host receives requests from extension
   - FastAPI application manages translation logic
   - SQLite cache for fast repeated lookups
   - Dependency injection pattern for clean architecture

3. **LLM Server** (External)
   - OpenAI-compatible API (LMStudio, llama.cpp, etc.)
   - Runs locally on user's machine
   - Supports various models (Gemma, Llama, Mistral, etc.)

## Communication Flow
```
Firefox Extension → Native Messaging (stdin/stdout) → Python Backend → HTTP API → LLM Server
```

## Target Environment
- Firefox Developer Edition or Nightly (for unsigned extensions)
- Python 3.12+ with async support
- Linux development environment
- Local LLM server (port 1234 by default)

## Status
- Version: 1.0.0
- Status: Active Development
- All 65 tests passing, 80% code coverage
- mypy --strict passing
