# Context Translator - Manifest V3 Edition

**Zero-backend, modular Firefox extension for context-aware translation using local LLM.**

## Overview

This is a complete rewrite of Context Translator using Manifest V3 architecture. The extension eliminates the need for a Python backend by communicating directly with LLM servers (LMStudio, llama.cpp, Ollama) via HTTP.

### Key Features

- **Zero Backend**: No Python/FastAPI required - direct HTTP to LLM
- **Unlimited Cache**: IndexedDB with TTL expiration and LRU eviction
- **Translation Merging**: Click adjacent words to merge translations
- **Light/Dark Mode**: Automatic theme detection with manual override
- **Modular Architecture**: Clean separation of concerns, all files <300 lines
- **ES6 Modules**: Modern JavaScript throughout

## Architecture

```
extension/
├── manifest.json              # Firefox MV3 manifest
├── background/                # Background/Event page
│   ├── service-worker.js      # Entry point
│   ├── cache-manager.js       # IndexedDB cache
│   ├── llm-client.js          # HTTP client for LLM
│   ├── prompt-builder.js      # Prompt construction
│   ├── response-cleaner.js    # Response parsing
│   └── message-handler.js     # Message routing
├── content/                   # Content scripts
│   ├── loader.js              # ES6 module loader
│   ├── main.js                # Orchestration
│   ├── handlers/              # Event handlers
│   │   ├── click-handler.js   # Click events
│   │   └── text-extraction.js # DOM text extraction
│   ├── ui/                    # UI components
│   │   ├── toolbar.js         # Settings toolbar
│   │   ├── inline-translation.js # Inline display
│   │   ├── tooltip.js         # Tooltip display
│   │   └── toast.js           # Notifications
│   └── styles/                # CSS modules
│       ├── toolbar.css
│       ├── translations.css
│       └── animations.css
├── shared/                    # Shared utilities
│   ├── config.js              # Configuration constants
│   ├── logger.js              # Debug logging
│   ├── utils.js               # Helper functions
│   └── settings-manager.js    # Settings persistence
├── popup/                     # Browser action popup
│   ├── popup.html
│   └── popup.js
└── icons/                     # Extension icons
    ├── icon-48.png
    └── icon-96.png
```

## Installation

### Prerequisites

- Firefox 109.0 or later
- Local LLM server running (LMStudio, llama.cpp, or Ollama)

### Steps

1. **Start your LLM server**
   ```bash
   # LMStudio: Start server in LMStudio app (default: localhost:1234)
   # llama.cpp:
   ./server -m your-model.gguf --host 127.0.0.1 --port 1234
   # Ollama:
   ollama serve
   ```

2. **Load extension in Firefox**
   - Open `about:debugging` in Firefox
   - Click "This Firefox" → "Load Temporary Add-on"
   - Navigate to this directory and select `manifest.json`

3. **Configure LLM endpoint (if needed)**
   - Click extension icon in toolbar
   - Click "Toggle Translator"
   - In toolbar, set LLM Host and Port (default: localhost:1234)

## Usage

### Activating the Translator

1. Click the extension icon in Firefox toolbar
2. Click "Toggle Translator" button
3. Toolbar appears on the webpage

### Translating Text

**Single Word**: Click any word to translate it

**Selected Text**: Select multiple words and click to translate the phrase

**Display Modes**:
- **Inline**: Translation appears above the word (supports merging)
- **Tooltip**: Translation appears in a popup

### Translation Merging (Inline Mode)

1. Click a word to translate it
2. Click an adjacent word
3. Translations automatically merge into a single phrase
4. Click merged translation to remove it

### Settings

- **From/To**: Source and target languages
- **Display**: Inline or tooltip mode
- **Use Cache**: Enable/disable translation caching
- **Clear Cache**: Remove all cached translations
- **LLM Host/Port**: LLM server connection
- **Dark Mode**: Toggle dark/light theme

## Technical Details

### Cache System

- **Storage**: IndexedDB (unlimited storage)
- **TTL**: 7 days (configurable in config.js)
- **LRU**: 10,000 entries max (configurable)
- **Key**: Hash of text + source + target + context

### LLM Communication

- **Protocol**: Direct HTTP fetch to LLM server
- **Format**: OpenAI-compatible API
- **Retry**: Exponential backoff (3 retries)
- **Timeout**: 30 seconds per request

### Translation Merging Logic

1. Detects adjacent `ct-word-wrapper` elements
2. Scans left and right for existing translations
3. Merges if same parent element and <20 words total
4. Combines translation texts with spaces
5. Displays merged translation above first word

### Settings Persistence

- **Storage**: browser.storage.local
- **Synced**: Across all tabs
- **Default**: Loaded from shared/config.js

## Development

### File Organization

- **Background**: No DOM access, handles API calls and cache
- **Content**: Full DOM access, handles UI and user interaction
- **Shared**: Utilities used by both background and content scripts
- **Popup**: Simple toggle UI

### ES6 Module Loading

Content scripts can't use `type="module"` directly in Firefox MV3, so we use a loader pattern:

1. `content/loader.js` is injected as a regular script
2. It dynamically imports `content/main.js` as an ES6 module
3. All other modules are imported via standard ES6 `import`

### Code Style

- ES6+ features (async/await, arrow functions, destructuring)
- No comments except for JSDoc
- Functional patterns preferred
- Each file <300 lines
- Clear separation of concerns

## Configuration

Edit `shared/config.js` to change defaults:

```javascript
export const CONFIG = {
  llm: {
    baseUrl: 'http://localhost:1234',  // LLM server
    model: 'local-model',               // Model identifier
    temperature: 0.1,                   // Generation temperature
    contextWindow: 500                  // Context chars
  },
  cache: {
    ttl: 7 * 24 * 60 * 60 * 1000,      // 7 days
    maxEntries: 10000                   // LRU limit
  },
  ui: {
    maxMergeWords: 20,                  // Merge limit
    toastDuration: 3000                 // Toast display time
  }
};
```

## Troubleshooting

### Extension won't load
- Check Firefox version (109.0+)
- Check browser console for errors
- Validate manifest.json: `python3 -m json.tool manifest.json`

### Translations fail
- Verify LLM server is running: `curl http://localhost:1234/v1/models`
- Check host/port settings in toolbar
- Check browser console for error messages
- Verify CORS is allowed (extensions bypass CORS automatically)

### Cache not working
- Check storage permission in manifest
- Open `about:debugging` → Storage → IndexedDB
- Verify "translation_cache" database exists

### Merging not working
- Ensure display mode is set to "Inline"
- Words must be adjacent (same parent element)
- Check for console errors

## Statistics

- **Total Files**: 25
- **Total Lines**: 2,595
- **Background**: ~750 lines
- **Content**: ~955 lines
- **Shared**: ~350 lines
- **CSS**: ~200 lines

## License

Same as parent project.

## Migration from MV2

See `docs/MV3-MIGRATION-PLAN.md` for full details on the migration from the original MV2 extension with Python backend.

Key changes:
- Removed: Python backend, FastAPI, native messaging
- Added: Direct LLM HTTP client, IndexedDB cache, ES6 modules
- Improved: Modular architecture, separation of concerns, testability
