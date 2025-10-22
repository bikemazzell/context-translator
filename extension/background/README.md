# Background Event Page

**Purpose:** Handle LLM communication, caching, and message routing

## Modules

- **service-worker.js** - Entry point, initialization, lifecycle
- **llm-client.js** - Direct HTTP communication with LLM server
- **cache-manager.js** - IndexedDB translation cache with TTL
- **prompt-builder.js** - Generate prompts for LLM
- **response-cleaner.js** - Parse and clean LLM responses
- **message-handler.js** - Route messages from content scripts

## Responsibilities

1. Maintain persistent connection to IndexedDB cache
2. Send HTTP requests to LLM server
3. Process and clean LLM responses
4. Respond to content script translation requests
5. Manage cache lifecycle (TTL, eviction)

## Architecture Notes

- Uses Firefox Event Pages (non-persistent background script)
- All modules export functions/classes
- service-worker.js imports and orchestrates all modules
