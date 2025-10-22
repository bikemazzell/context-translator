# Context Translator

A Firefox extension for context-aware translation using local LLM models. Translate words and phrases directly on web pages with intelligent context understanding.

## Features

- **Context-Aware Translation:** Send surrounding text to improve translation accuracy
- **Inline & Tooltip Display:** Choose how translations appear on the page
- **Dark Mode Support:** Auto-detects and adapts to your browser theme
- **Persistent Settings:** All preferences saved across browser sessions
- **Keyboard Shortcuts:** Quick toggle with `Ctrl+Alt+C`
- **Smart Caching:** Fast repeated lookups with SQLite cache
- **Privacy-First:** All processing happens locally on your machine
- **Simple Architecture:** Direct HTTP communication from extension to local backend

## Architecture

```
┌─────────────────┐
│ Firefox Browser │
│  ┌───────────┐  │
│  │ Extension │  │
│  └─────┬─────┘  │
└────────┼────────┘
         │ HTTP (localhost:8080)
         ▼
┌─────────────────┐
│ FastAPI Backend │
│  ┌───────────┐  │
│  │   Cache   │  │
│  │ (SQLite)  │  │
│  └───────────┘  │
└────────┬────────┘
         │ HTTP API
         ▼
┌─────────────────┐
│   LLM Server    │
│ (LMStudio, etc) │
└─────────────────┘
```

## Quick Start

### Prerequisites

- **Firefox Developer Edition or Nightly** (for unsigned extensions)
- **Python 3.12+** with `aiosqlite` and `httpx`
- **LLM Server** (LMStudio, llama.cpp, or any OpenAI-compatible API)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd context-translator
   ```

2. **Install Python dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Start the backend:**
   ```bash
   ./scripts/start-backend.sh
   ```

4. **Start your LLM server** (e.g., LMStudio on port 1234)

5. **Package the extension:**
   ```bash
   ./scripts/package-extension.sh
   ```

6. **Install in Firefox:**
   - Set `xpinstall.signatures.required = false` in `about:config`
   - Open `about:addons` → gear icon → "Install Add-on From File"
   - Select `dist/context-translator.xpi`

For detailed installation instructions, see [docs/INSTALLATION.md](docs/INSTALLATION.md).

## Usage

1. **Activate the translator:** Click the extension icon or press `Ctrl+Alt+C`
2. **Configure languages:** Select source and target languages in the toolbar
3. **Translate text:** Click any word on the page
4. **Adjust settings:** Use the toolbar to customize display mode, context, and more

### Keyboard Shortcuts

- `Ctrl+Alt+C` - Toggle translator on/off

### Display Modes

- **Inline:** Translation appears directly above the clicked word
- **Tooltip:** Translation appears in a floating box

### Settings

- **Context Mode:** Include surrounding text for better translation accuracy
- **Context Window:** Number of characters around the word to include (default: 200)
- **Use Cache:** Enable caching for faster repeated lookups
- **Dark Mode:** Auto-detect or manually set light/dark theme
- **Server Configuration:** Customize backend host and port

## Development

### Project Structure

```
context-translator/
├── backend/                # FastAPI backend
│   ├── app/                # Application code
│   ├── tests/              # Backend tests
│   └── requirements.txt    # Python dependencies
├── extension/              # Firefox extension
│   ├── manifest.json
│   ├── background/         # Background scripts
│   ├── content/            # Content scripts (main translator)
│   ├── popup/              # Extension popup UI
│   └── icons/              # Extension icons
├── scripts/                # Build and utility scripts
│   ├── package-extension.sh    # Package extension as .xpi
│   └── start-backend.sh        # Start backend server
├── docs/                   # Documentation
│   ├── INSTALLATION.md     # Installation guide
│   ├── implementation.md   # Implementation plan
│   └── requirements.md     # Requirements specification
├── dist/                   # Build output (generated)
└── config.yaml             # Backend configuration
```

### Building from Source

```bash
# Package the extension
./scripts/package-extension.sh

# Test backend manually
./scripts/start-backend.sh
```

### Testing

The extension can be tested in two ways:

1. **Temporary Installation** (for development):
   - Navigate to `about:debugging`
   - Click "Load Temporary Add-on"
   - Select `extension/manifest.json`
   - Extension unloads when Firefox closes

2. **Permanent Installation** (for testing):
   - Package with `./scripts/package-extension.sh`
   - Install via `about:addons` as described above
   - Extension persists across browser restarts

## Documentation

- [Installation Guide](docs/INSTALLATION.md) - Complete setup instructions
- [Implementation Plan](docs/implementation.md) - Technical implementation details
- [Requirements Specification](docs/requirements.md) - Original requirements and specifications

## Configuration

### Backend Configuration (`config.yaml`)

```yaml
llm:
  primary:
    provider: lmstudio
    endpoint: http://localhost:1234/v1/chat/completions
    timeout: 30
    model_name: gemma-3-27b-it

cache:
  path: ./cache/translations.db
  ttl_days: 30
  max_size_mb: 100
```

### Extension Settings

All extension settings are configurable via the toolbar:
- Source and target languages
- Display mode (inline/tooltip)
- Context mode and window size
- Cache preferences
- Server connection details

Settings persist across browser sessions automatically.

## Troubleshooting

### Extension won't install
- Ensure you're using Firefox Developer Edition or Nightly
- Check `xpinstall.signatures.required` is set to `false` in `about:config`

### Backend won't start
- Ensure Python 3.12+ is installed
- Install dependencies: `cd backend && pip install -r requirements.txt`
- Check that port 8080 is not already in use

### Translations don't work
- Ensure LLM server is running (test: `curl http://localhost:1234/v1/models`)
- Check browser console for errors (F12 → Console)
- Verify server settings in extension toolbar

For more troubleshooting, see [docs/INSTALLATION.md](docs/INSTALLATION.md#troubleshooting).

## Performance

- **Translation Speed:** 1-2 seconds with LLM (first request), <50ms with cache
- **Package Size:** 20KB
- **Memory Usage:** Minimal (<10MB)
- **Cache Size:** Configurable (default: 100MB max)

## Privacy & Security

- **100% Local:** All processing happens on your machine
- **No External Requests:** Extension only communicates with localhost backend
- **No Data Collection:** No analytics, tracking, or telemetry
- **Cache Privacy:** Translations stored locally in SQLite database
- **Localhost Only:** Backend API restricted to localhost connections only

## Tested Models

The extension works with any OpenAI-compatible LLM server. Tested models include:
- Gemma 2 9B / 27B (recommended)
- Llama 3.1 8B
- Mistral 7B
- Qwen 2.5

## Known Limitations

- **Unsigned Extension:** Requires Firefox Developer/Nightly Edition for permanent installation
- **Local Only:** Backend must run on the same machine as the browser
- **Single Browser:** Only supports Firefox (Chrome would need different approach)
- **LLM Required:** Requires a running LLM server for translations

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[To be added - specify your license here]

## Acknowledgments

- Built with Firefox WebExtensions API
- FastAPI backend with asyncio and aiosqlite
- Designed for local LLM inference
- Localhost-only architecture for privacy and security

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check [INSTALLATION.md](docs/INSTALLATION.md) for troubleshooting
- Review [implementation.md](docs/implementation.md) for technical details

