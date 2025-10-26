/**
 * Content script entry point
 * Thin bootstrap that wires up real dependencies
 */

import { ContentController } from '../controllers/content-controller.js';
import { TranslationService } from '../services/translation-service.js';
import { SettingsManager } from '../shared/settings-manager.js';
import { logger } from '../shared/logger.js';
import { showToast } from './ui/toast.js';
import { showTooltip } from './ui/tooltip.js';
import { showInlineTranslation, clearAllInlineTranslations } from './ui/inline-translation.js';
import { attachClickHandler, detachClickHandler } from './handlers/click-handler.js';
import { initializeErrorBoundary } from '../shared/error-boundary.js';

initializeErrorBoundary();

// Instantiate dependencies
const settingsManager = new SettingsManager();

/**
 * Send message to background service worker with retry logic
 * @param {Object} message - Message to send
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<any>} Response from service worker
 */
async function sendMessageWithRetry(message, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await browser.runtime.sendMessage(message);

      // Check if we got a valid response
      if (response !== undefined) {
        if (attempt > 1) {
          logger.debug(`Message sent successfully on attempt ${attempt}`);
        }
        return response;
      }

      // If response is undefined, treat it as an error
      throw new Error('No response from service worker');
    } catch (error) {
      lastError = error;

      // Check if this is a connection error (service worker not ready)
      const isConnectionError =
        error.message?.includes('Could not establish connection') ||
        error.message?.includes('Receiving end does not exist') ||
        error.message?.includes('No response from service worker');

      if (isConnectionError && attempt < maxRetries) {
        logger.debug(`Connection attempt ${attempt} failed, retrying...`);
        // Wait before retry with exponential backoff (100ms, 200ms, 400ms)
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
      } else if (!isConnectionError) {
        // For non-connection errors, fail immediately
        throw error;
      }
    }
  }

  // All retries failed
  throw lastError;
}

/**
 * Create messenger wrapper for browser.runtime
 */
const messenger = {
  sendMessage: (message) => sendMessageWithRetry(message)
};

/**
 * Create UI wrapper
 */
const ui = {
  showToast,
  showTooltip,
  showInlineTranslation,
  clearAllInlineTranslations
};

/**
 * Create click handler wrapper
 * Wraps click handler functions and injects dependencies
 */
const clickHandler = {
  attach: (callback) => attachClickHandler(callback, { settingsManager }),
  detach: detachClickHandler
};

/**
 * Initialize content script
 */
async function initContentScript() {
  // Create translation service
  const translationService = new TranslationService(messenger, settingsManager, logger);

  // Create content controller with all dependencies
  const controller = new ContentController({
    translationService,
    settingsManager,
    logger,
    ui,
    clickHandler,
    browser
  });

  // Initialize controller
  await controller.initialize();

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    logger.debug('Page unloading, cleaning up');
    controller.cleanup();
  });
}

// Start content script
initContentScript();
