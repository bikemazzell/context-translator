# Changelog

All notable changes to Context Translator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.15] - 2025-10-27

### Fixed
- Fixed packaging script missing lib/, controllers/, core/, and services/ directories
- Fixed response cleaner incorrectly filtering valid translations containing "this is"
- Fixed inline translations extending beyond viewport boundaries
- Fixed translations constrained to word width instead of using full viewport

### Changed
- Dynamic version display in popup (reads from manifest)
- Response cleaner patterns now only match at line start (more precise filtering)
- Inline translations now wrap text with proper word-breaking and hyphens
- Translation positioning intelligently adjusts to stay within viewport (20px margins)

## [1.0.14] - 2025-10-26


### Added
- **Chrome/Chromium browser support** via webextension-polyfill
  - Automatic polyfill loading for Chrome browsers
  - Service worker wrapper for cross-browser compatibility
  - Content script polyfill integration
- Automated version bumping scripts (npm run version:major/minor/patch)
- Firefox automatic update mechanism via updates.json
- HMAC integrity verification for cache entries to prevent tampering
- Privacy policy (PRIVACY.md) with comprehensive data handling disclosure
- Developer information in manifest.json
- Custom error classes (TranslationError, NetworkError, ValidationError, CacheError)
- Global error boundary for unhandled errors
- Request deduplication to prevent duplicate LLM API calls
- Memory cleanup on page navigation (beforeunload/pagehide listeners)
- eslint-plugin-unused-imports for code quality

### Changed
- Migrated service-worker to dependency injection pattern
- Refactored long functions for better maintainability
- Standardized error messages with structured error classes
- Moved magic numbers to CONFIG for consistency
- Updated deprecated singleton exports with warnings
- Enhanced error context with translation details, endpoints, and retry counts

### Fixed
- Fixed 2 skipped tests in cache-manager.test.js
- All 1,044 tests now passing with 0 skipped
- 0 ESLint errors with strict linting rules

### Security
- ✅ All critical security issues resolved
- ✅ XSS protection with input validation
- ✅ Cache integrity verification with HMAC-SHA256
- ✅ Secure hashing (SHA-256) for cache keys
- ✅ Content script exclusions for sensitive sites
- ✅ Endpoint validation with security warnings
- ✅ Message sender validation to prevent cross-extension attacks
- ✅ Rate limiting with smart auto-detection (local vs remote)

### Documentation
- Created comprehensive ARCHITECTURE-CURRENT.md with module dependencies
- Added WORK-COMPLETED-SUMMARY.md documenting all improvements
- Updated all JSDoc comments for clarity
- Documented DI migration strategy

## [1.0.5] - 2025-10-23

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

- [Unreleased]: https://github.com/bikemazzell/context-translator/compare/v1.0.15...HEAD
- [1.0.15]: https://github.com/bikemazzell/context-translator/releases/tag/v1.0.15
- [1.0.14]: https://github.com/bikemazzell/context-translator/releases/tag/v1.0.14
- [1.0.13]: https://github.com/bikemazzell/context-translator/releases/tag/v1.0.13
- [1.0.12]: https://github.com/bikemazzell/context-translator/releases/tag/v1.0.12
- [1.0.11]: https://github.com/bikemazzell/context-translator/releases/tag/v1.0.11
- [1.0.10]: https://github.com/bikemazzell/context-translator/releases/tag/v1.0.10
- [1.0.9]: https://github.com/bikemazzell/context-translator/releases/tag/v1.0.9
- [1.0.8]: https://github.com/bikemazzell/context-translator/releases/tag/v1.0.8
- [1.0.7]: https://github.com/bikemazzell/context-translator/releases/tag/v1.0.7
- [1.0.6]: https://github.com/bikemazzell/context-translator/releases/tag/v1.0.6
- [1.0.5]: https://github.com/bikemazzell/context-translator/releases/tag/v1.0.5
- [1.0.4]: https://github.com/bikemazzell/context-translator/releases/tag/v1.0.4
- [1.0.3]: https://github.com/bikemazzell/context-translator/releases/tag/v1.0.3
- [1.0.2]: https://github.com/bikemazzell/context-translator/releases/tag/v1.0.2
- [1.0.1]: https://github.com/bikemazzell/context-translator/releases/tag/v1.0.1
- [1.0.0]: https://github.com/bikemazzell/context-translator/releases/tag/v1.0.0
