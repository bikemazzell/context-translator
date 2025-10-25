/**
 * Service Worker Entry Point
 * For Firefox: Uses native browser API (no polyfill needed)
 * For Chrome: Falls back to chrome API if browser is undefined
 */

(async () => {
  // Firefox has native 'browser' API support
  // Chrome needs a fallback to use 'chrome' API
  if (typeof globalThis.browser === 'undefined' && typeof globalThis.chrome !== 'undefined') {
    // Simple fallback for Chrome - map chrome API to browser
    globalThis.browser = globalThis.chrome;
    console.log('[ContextTranslator] Using Chrome API (no polyfill)');
  }

  // Import the main service worker module
  await import('./service-worker-main.js');
})();
