# Changelog

All notable changes to Context Translator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive API documentation with OpenAPI/Swagger
- Production-safe logging utility inline in background script
- Semantic versioning documentation (`VERSIONING.md`)
- `/cache/clear` endpoint for clearing translation cache

### Changed
- **BREAKING:** Replaced native messaging with direct HTTP communication
  - Extension now communicates directly with FastAPI backend via localhost:8080
  - Removed native messaging host and all related files
  - Simplified architecture: no more stdio protocol or native messaging manifests
  - Better debugging with standard HTTP request/response visibility
- Consolidated cache locations to single directory
- Improved configuration default handling
- Message handler now uses map pattern for better maintainability
- Extracted magic numbers to named constants in LLM client
- Backend startup script now launches FastAPI with uvicorn instead of native host

### Removed
- Native messaging infrastructure (host script, manifest, installation script)
- `nativeMessaging` permission from extension manifest

### Fixed
- Inconsistent cache paths resolved to absolute paths
- Logger loading issues in Firefox background scripts (moved to inline definition)

## [1.0.0] - 2025-10-21

### Added
- Initial stable release
- Context-aware translation using local LLM models
- Native messaging architecture between Firefox extension and Python backend
- SQLite-based translation cache with TTL and LRU eviction
- FastAPI backend with async support
- Support for multiple LLM providers (LMStudio, llama-server)
- Automatic fallback to secondary LLM if primary fails
- Input validation and sanitization
- Dark mode support with auto-detection
- Inline and tooltip display modes
- Configurable context window for translation
- Keyboard shortcut (Ctrl+Alt+C) for quick toggle
- Comprehensive test suite with 81% coverage
- Type safety with mypy strict mode
- Code quality enforcement with ruff

### Security
- Localhost-only middleware for API access
- Input sanitization to prevent injection attacks
- All dependencies pinned to exact versions

## [0.1.0] - 2025-10-15

### Added
- Initial prototype
- Basic translation functionality
- Firefox extension scaffold

---

## Version Links

- [Unreleased]: https://github.com/yourusername/context-translator/compare/v1.0.0...HEAD
- [1.0.0]: https://github.com/yourusername/context-translator/releases/tag/v1.0.0
- [0.1.0]: https://github.com/yourusername/context-translator/releases/tag/v0.1.0
