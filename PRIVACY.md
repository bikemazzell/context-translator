# Privacy Policy for Context Translator

**Last Updated**: 2025-01-24

## Overview

Context Translator is a browser extension that respects your privacy. This document explains what data is collected, how it's used, and your rights.

## Data Collection

### What We Collect

**Local Data Only**:
- Selected text you choose to translate
- Translation cache stored in your browser's IndexedDB
- Extension settings (language preferences, LLM endpoint configuration)
- Usage logs (stored locally, never transmitted)

### What We DO NOT Collect

- ❌ No personal information
- ❌ No browsing history
- ❌ No data is sent to our servers (we don't have servers)
- ❌ No analytics or tracking
- ❌ No cookies
- ❌ No third-party integrations (except your configured LLM server)

## Data Usage

### How Your Data Is Used

1. **Translations**: Text you select is sent **only** to the LLM server you configure
2. **Caching**: Translations are cached locally to improve performance
3. **Settings**: Stored locally to remember your preferences

### LLM Server Communication

- Text is sent to the LLM endpoint **you** configure (default: localhost:1234)
- We recommend using a local LLM server for maximum privacy
- If you use a remote LLM service, their privacy policy applies to data sent to them
- No data is sent to us or any third party

## Data Storage

### Local Storage Only

All data is stored locally in your browser using:
- **IndexedDB**: Translation cache (max 10,000 entries, 30-day TTL)
- **browser.storage.local**: Extension settings

### Data Security

- Cache entries are protected with HMAC integrity verification
- SHA-256 hashing for cache keys
- No encryption is applied (data is local to your device)

## Data Sharing

### We Never Share Your Data

- ✅ Zero data sharing with third parties
- ✅ Zero data collection by us
- ✅ Zero telemetry or analytics
- ✅ All processing happens on your device and your configured LLM server

## Your Rights

### You Control Your Data

- **Access**: All data is in your browser's storage (accessible via browser dev tools)
- **Delete**: Clear cache via extension popup or browser storage
- **Export**: You can export settings (feature planned)
- **Control**: Configure which LLM server receives your text

### Uninstallation

When you uninstall the extension:
- All cached translations are automatically deleted
- All settings are automatically deleted
- No data remains

## Third-Party LLM Services

### Your Responsibility

If you configure a remote LLM server (e.g., OpenAI, Anthropic, local LLM):
- You are responsible for understanding their privacy policy
- Your text will be sent to that server for translation
- We recommend using a local LLM server for maximum privacy

### Recommended: Local LLM

We strongly recommend running a local LLM server (e.g., Ollama, LM Studio) to ensure:
- Complete data privacy (nothing leaves your machine)
- No API costs
- No internet dependency

## Updates to This Policy

We may update this privacy policy to reflect:
- Changes in data practices
- Legal requirements
- User feedback

Updates will be posted with a new "Last Updated" date.

## Contact

### Developer Information

- **Developer**: Vincent (v)
- **Source Code**: https://github.com/anthropics/context-translator
- **Issues**: https://github.com/anthropics/context-translator/issues

### Questions

For questions about this privacy policy, please:
1. Open an issue on GitHub
2. Review the source code (it's all open!)

## Compliance

### Mozilla Add-on Policies

This extension complies with:
- Mozilla Add-on Policies
- No data collection beyond what's necessary for functionality
- Transparent about all data usage
- Users control their data

## Summary

**TL;DR**:
- ✅ No tracking, no analytics, no data collection
- ✅ Everything stays on your device + your LLM server
- ✅ Open source - verify for yourself
- ✅ You control all your data
- ✅ Delete everything by uninstalling

Your privacy is our top priority. That's why we built this extension to be completely local-first with zero telemetry.
