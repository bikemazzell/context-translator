// Background script - handles HTTP communication with FastAPI backend

// Production-safe logger (set DEBUG=true for verbose logging)
var DEBUG = false;
var logger = {
  info: function() {
    if (DEBUG) console.log('[CT]', ...arguments);
  },
  warn: function() {
    if (DEBUG) console.warn('[CT]', ...arguments);
  },
  error: function() {
    console.error('[CT]', ...arguments);
  },
  debug: function() {
    if (DEBUG) console.debug('[CT]', ...arguments);
  }
};

// Backend HTTP endpoint
const BACKEND_URL = 'http://localhost:8080';

// Message handler map for routing
const messageHandlers = {
  translate: handleTranslateRequest,
  getLanguages: handleGetLanguagesRequest,
  checkHealth: handleHealthCheckRequest,
  clearCache: handleClearCacheRequest,
};

// Listen for messages from content scripts
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = messageHandlers[message.type];

  if (!handler) {
    sendResponse({
      success: false,
      error: `Unknown message type: ${message.type}`
    });
    return false;
  }

  // Call handler and wrap response
  handler(message.data)
    .then(data => sendResponse({ success: true, data }))
    .catch(error => sendResponse({ success: false, error: error.message }));

  return true; // Indicates async response
});

// HTTP fetch helper
async function fetchBackend(endpoint, options = {}) {
  const url = `${BACKEND_URL}${endpoint}`;
  logger.debug("[Background] Fetching:", url);

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return await response.json();
}

// Send translation request to backend
async function handleTranslateRequest(data) {
  logger.info("[Background] Sending translation request");

  const result = await fetchBackend('/translate', {
    method: 'POST',
    body: JSON.stringify({
      text: data.text,
      source_lang: data.source_lang,
      target_lang: data.target_lang,
      context: data.context || null,
      use_cache: data.use_cache !== false
    })
  });

  logger.info("[Background] Translation received");
  return result;
}

// Get supported languages
async function handleGetLanguagesRequest() {
  logger.info("[Background] Fetching languages");

  const result = await fetchBackend('/languages', {
    method: 'GET'
  });

  return result;
}

// Health check
async function handleHealthCheckRequest() {
  try {
    logger.info("[Background] Health check");

    const result = await fetchBackend('/health', {
      method: 'GET'
    });

    return result;
  } catch (error) {
    logger.error("[Background] Health check failed:", error.message);
    return { status: 'unhealthy', error: error.message };
  }
}

// Clear cache
async function handleClearCacheRequest() {
  logger.info("[Background] Clearing cache");

  const result = await fetchBackend('/cache/clear', {
    method: 'POST',
    body: JSON.stringify({})
  });

  return result;
}

// Listen for keyboard shortcut
browser.commands.onCommand.addListener((command) => {
  if (command === "toggle-translator") {
    // Send toggle message to active tab
    browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      if (tabs.length > 0) {
        browser.tabs.sendMessage(tabs[0].id, { action: 'toggle' });
      }
    });
  }
});

logger.info("[Background] Context Translator background script loaded");
