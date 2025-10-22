# Content Scripts

**Purpose:** Inject translation UI and handle user interactions

## Structure

### ui/
- **toolbar.js** - Floating toolbar with settings controls
- **inline-translation.js** - Inline translation display with merging
- **tooltip.js** - Tooltip translation display
- **toast.js** - Toast notification system

### handlers/
- **text-extraction.js** - Extract words/phrases and context from DOM
- **click-handler.js** - Handle click events for translation

### styles/
- **toolbar.css** - Toolbar styling (light/dark modes)
- **translations.css** - Translation display styling
- **animations.css** - Fade-in, slide-in animations

## Module Loading Order

Content scripts load in dependency order (specified in manifest.json):
1. shared/config.js
2. shared/utils.js
3. shared/logger.js
4. content/handlers/text-extraction.js
5. content/handlers/click-handler.js
6. content/ui/toast.js
7. content/ui/tooltip.js
8. content/ui/inline-translation.js
9. content/ui/toolbar.js
10. content/main.js (orchestration)

## Responsibilities

1. Render toolbar and handle settings changes
2. Capture user clicks on text
3. Extract words/phrases with context
4. Send translation requests to background
5. Display translations (inline or tooltip)
6. Merge adjacent translations
7. Show error toasts when needed
