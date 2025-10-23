# Changelog

All notable changes to Context Translator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.2] - 2025-01-22

### Changed
- Removed all inline CSS from HTML files for better code organization
- Updated packaging scripts to match current extension structure
- Improved CI/CD workflow with test execution and package validation
- Enhanced README with architecture diagram and comprehensive documentation

### Added
- Release preparation script for version synchronization
- Automated package structure validation in CI/CD
- Version badges to README

## [1.0.1] - 2025-01-21

### Fixed
- Various bug fixes and stability improvements
- UI improvements and CSS refinements

## [1.0.0] - 2025-01-20

### Added
- Initial stable release
- Context-aware translation using local LLM models
- Direct communication with OpenAI-compatible LLM servers
- IndexedDB-based translation cache
- Support for multiple LLM providers (LMStudio, Ollama, etc.)
- Dark mode support with auto-detection
- Inline and tooltip display modes
- Configurable context window for translation
- Keyboard shortcut (Ctrl+Alt+C) for quick toggle
- Comprehensive test suite
- Firefox Manifest V3 architecture

### Security
- Localhost-only connections for privacy
- All data processing happens locally

---

## Version Links

- [Unreleased]: https://github.com/bikemazzell/context-translator/compare/v1.0.2...HEAD
- [1.0.2]: https://github.com/bikemazzell/context-translator/releases/tag/v1.0.2
- [1.0.1]: https://github.com/bikemazzell/context-translator/releases/tag/v1.0.1
- [1.0.0]: https://github.com/bikemazzell/context-translator/releases/tag/v1.0.0
