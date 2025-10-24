/**
 * Service Worker Entry Point with Polyfill Support
 * Loads webextension-polyfill for Chrome compatibility, then bootstraps main service worker
 */

// For Chrome browsers, load the polyfill to provide 'browser' API
// Firefox has native 'browser' API support and will skip this
(async () => {
  if (typeof globalThis.browser === 'undefined' && typeof globalThis.chrome !== 'undefined') {
    // Since we can't use importScripts in ES modules, we'll load the polyfill
    // by fetching and evaluating it. The polyfill will set globalThis.browser.
    try {
      const polyfillPath = chrome.runtime.getURL('lib/external/browser-polyfill.js');
      const response = await fetch(polyfillPath);
      const polyfillCode = await response.text();

      // Use indirect eval to execute in global scope
      (0, eval)(polyfillCode);

      console.log('[ContextTranslator] WebExtension polyfill loaded for Chrome');
    } catch (error) {
      console.error('[ContextTranslator] Failed to load polyfill:', error);
      // Fallback: use chrome API directly
      globalThis.browser = globalThis.chrome;
      console.warn('[ContextTranslator] Using chrome API as fallback');
    }
  }

  // Now import the main service worker module
  await import('./service-worker-main.js');
})();
