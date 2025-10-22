/**
 * Logging utility for Context Translator
 * Controls console output based on user settings
 *
 * @module shared/logger
 */

let loggingEnabled = true; // Default to enabled

// Initialize from storage
if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
  browser.storage.local.get('settings').then(stored => {
    if (stored.settings && stored.settings.enableLogging !== undefined) {
      loggingEnabled = stored.settings.enableLogging;
    }
  }).catch(() => {
    // Ignore storage errors during initialization
  });

  // Listen for changes (check onChanged exists first)
  if (browser.storage.onChanged && browser.storage.onChanged.addListener) {
    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.settings) {
        const newSettings = changes.settings.newValue;
        if (newSettings && newSettings.enableLogging !== undefined) {
          loggingEnabled = newSettings.enableLogging;
        }
      }
    });
  }
}

export const logger = {
  /**
   * Info level logging (only when enabled)
   */
  info(...args) {
    if (loggingEnabled) {
      console.log('[ContextTranslator]', ...args);
    }
  },

  /**
   * Warning level logging (only when enabled)
   */
  warn(...args) {
    if (loggingEnabled) {
      console.warn('[ContextTranslator]', ...args);
    }
  },

  /**
   * Error level logging (always logged)
   */
  error(...args) {
    console.error('[ContextTranslator]', ...args);
  },

  /**
   * Debug level logging (only when enabled)
   */
  debug(...args) {
    if (loggingEnabled) {
      console.debug('[ContextTranslator]', ...args);
    }
  },

  /**
   * Set logging state manually
   * @param {boolean} enabled - Whether logging is enabled
   */
  setEnabled(enabled) {
    loggingEnabled = enabled;
  }
};
