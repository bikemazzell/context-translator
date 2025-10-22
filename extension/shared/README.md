# Shared Modules

**Purpose:** Common code used by both background and content scripts

## Modules

- **config.js** - Configuration constants and defaults
- **logger.js** - Debug logging utility
- **utils.js** - Helper functions (text cleaning, DOM helpers)

## Usage

These modules are loaded first in both background and content script contexts, providing a common foundation.

```javascript
import { CONFIG } from '../shared/config.js';
import { logger } from '../shared/logger.js';
import { sanitizeText, hashString } from '../shared/utils.js';
```

## Design Principles

- Pure functions only
- No side effects
- No DOM manipulation (utils can check if DOM available)
- No async operations
- Small and focused (<100 lines each)
