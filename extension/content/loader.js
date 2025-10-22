/**
 * Content script loader - dynamically imports the main module
 * This is necessary because content_scripts in Firefox MV3 don't support type="module" directly
 */

(async () => {
  try {
    await import(browser.runtime.getURL('content/main.js'));
  } catch (error) {
    console.error('[ContextTranslator] Failed to load content script:', error);
  }
})();
