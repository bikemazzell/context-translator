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
 * Create messenger wrapper for browser.runtime
 */
const messenger = {
  sendMessage: (message) => browser.runtime.sendMessage(message)
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
