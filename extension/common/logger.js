// Logging utility for Context Translator extension
//
// Set DEBUG=true in manifest.json or localStorage to enable debug logging
// Production builds should have DEBUG=false to disable verbose logging

// Use var for global scope in background scripts
var DEBUG = false; // Set via build flag or environment variable

/**
 * Logging utility that respects DEBUG flag
 * Available globally in both background and content scripts
 */
var logger = {
  /**
   * Log informational messages (only in debug mode)
   * @param {...any} args - Arguments to log
   */
  info: function(...args) {
    if (DEBUG) {
      console.log('[CT]', ...args);
    }
  },

  /**
   * Log warning messages (only in debug mode)
   * @param {...any} args - Arguments to log
   */
  warn: function(...args) {
    if (DEBUG) {
      console.warn('[CT]', ...args);
    }
  },

  /**
   * Log error messages (always logged, even in production)
   * @param {...any} args - Arguments to log
   */
  error: function(...args) {
    console.error('[CT]', ...args);
  },

  /**
   * Log debug messages (only in debug mode)
   * @param {...any} args - Arguments to log
   */
  debug: function(...args) {
    if (DEBUG) {
      console.debug('[CT]', ...args);
    }
  }
};

// Explicitly attach to global scope for Firefox background scripts
// Try multiple methods to ensure logger is available
if (typeof self !== 'undefined') {
  self.logger = logger;
}
if (typeof window !== 'undefined') {
  window.logger = logger;
}
// Also assign to 'this' as fallback
this.logger = logger;
