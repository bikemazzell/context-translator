/**
 * Content script loader - dynamically imports the main module
 * This is necessary because content_scripts in Firefox MV3 don't support type="module" directly
 */

/**
 * Initialize content script by dynamically importing main module
 * @param {Object} browserAPI - Browser API (for dependency injection in tests)
 * @returns {Promise<void>}
 */
export async function initContentScript(browserAPI = globalThis.browser) {
  try {
    await import(browserAPI.runtime.getURL('content/main.js'));
  } catch (error) {
    console.error('[ContextTranslator] Failed to load content script:', error);
    throw error;
  }
}

// Auto-execute when loaded as content script (not in tests)
// Skip auto-execute in test environment (NODE_ENV=test or jest is defined)
const isTestEnv = typeof jest !== 'undefined' || process.env.NODE_ENV === 'test';
if (typeof browser !== 'undefined' && browser?.runtime && !isTestEnv) {
  initContentScript();
}
