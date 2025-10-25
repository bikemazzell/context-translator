/**
 * Content script loader - dynamically imports the main module
 * This is necessary because content_scripts in Firefox MV3 don't support type="module" directly
 *
 * Note: Mozilla's linter shows a warning for dynamic import with browser.runtime.getURL(),
 * but this is the recommended pattern for loading ES modules in content scripts.
 * The warning is about potential security risks, but browser.runtime.getURL() is a safe,
 * controlled API that only returns extension URLs.
 */

(async () => {
  try {
    // Use browser.runtime.getURL to get the full extension URL for the module
    // This is required for content scripts to load ES modules
    const moduleUrl = browser.runtime.getURL('content/main.js');

    // Import the main content script module
    await import(/* webpackIgnore: true */ moduleUrl);
  } catch (error) {
    console.error('[ContextTranslator] Failed to load content script:', error);
  }
})();
