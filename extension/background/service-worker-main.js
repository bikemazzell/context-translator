/**
 * Background Service Worker - Entry point
 * Initializes cache and LLM client, listens for messages
 *
 * @module background/service-worker
 */

import { logger } from '../shared/logger.js';
import { TranslationCache } from '../lib/translation/translation-cache.js';
import { LLMClient } from '../lib/translation/llm-client.js';
import { LanguageManager } from '../shared/language-manager.js';
import { handleMessage, configureDependencies } from './message-handler.js';
import { RateLimiter } from '../shared/rate-limiter.js';
import { initializeErrorBoundary } from '../shared/error-boundary.js';

initializeErrorBoundary();

// Instantiate all dependencies
const languageManager = new LanguageManager();
const cacheManager = new TranslationCache(logger);
const rateLimiter = new RateLimiter(10, 60000);
const llmClient = new LLMClient(logger, rateLimiter);

// Configure message handler with dependencies
configureDependencies(cacheManager, llmClient, languageManager);

/**
 * Initialize background service
 */
async function initialize() {
  logger.info('Context Translator background service initializing...');

  try {
    // Initialize cache
    await cacheManager.init();
    logger.info('Cache initialized');

    // Initialize language manager
    await languageManager.init();
    logger.info('Language manager initialized');

    // Load settings to configure LLM client
    const stored = await browser.storage.local.get('settings');
    if (stored.settings) {
      const { llmEndpoint, llmModel, useRateLimit } = stored.settings;
      if (llmEndpoint) {
        llmClient.configure(llmEndpoint, llmModel, useRateLimit);
      }
    }

    logger.info('Context Translator background service ready');

  } catch (error) {
    logger.error('Initialization error:', error);
  }
}

/**
 * Listen for settings changes
 */
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.settings) {
    const newSettings = changes.settings.newValue;
    if (newSettings && newSettings.llmEndpoint) {
      llmClient.configure(newSettings.llmEndpoint, newSettings.llmModel, newSettings.useRateLimit);
      logger.info('LLM client reconfigured from settings');
    }
  }
});

/**
 * Listen for messages from content scripts
 */
browser.runtime.onMessage.addListener(handleMessage);

/**
 * Send message to content script with retry logic
 * @param {number} tabId - Tab ID
 * @param {Object} message - Message to send
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<any>} Response from content script
 */
async function sendMessageWithRetry(tabId, message, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await browser.tabs.sendMessage(tabId, message);
      logger.debug(`Message sent successfully on attempt ${attempt}`);
      return response;
    } catch (error) {
      lastError = error;
      logger.debug(`Message send attempt ${attempt} failed:`, error.message);

      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff: 50ms, 100ms, 200ms)
        await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, attempt - 1)));
      }
    }
  }

  throw lastError;
}

/**
 * Listen for keyboard commands
 */
browser.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-translator') {
    logger.debug('Toggle command received');

    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      logger.error('No active tab found');
      return;
    }

    const tab = tabs[0];

    // Check if tab URL is valid for content scripts
    if (!tab.url || tab.url.startsWith('about:') || tab.url.startsWith('moz-extension:')) {
      logger.debug('Cannot inject content script into this page:', tab.url);
      return;
    }

    try {
      await sendMessageWithRetry(tab.id, { action: 'toggle' });
      logger.debug('Toggle command sent successfully to tab', tab.id);
    } catch (error) {
      logger.error('Failed to send toggle command after retries:', error.message);

      // If message failed, content script might not be loaded yet
      // This can happen on pages that loaded before extension was enabled
      logger.info('Attempting to reload content script');

      try {
        // Reload the tab to ensure content script is injected
        await browser.tabs.reload(tab.id);
        logger.info('Tab reloaded - content script should be available after reload');
      } catch (reloadError) {
        logger.error('Failed to reload tab:', reloadError);
      }
    }
  }
});

/**
 * Handle extension installation or update
 */
browser.runtime.onInstalled.addListener((details) => {
  logger.info('Extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    // First installation
    logger.info('First installation - welcome!');
  } else if (details.reason === 'update') {
    // Extension updated
    logger.info('Extension updated to version:', browser.runtime.getManifest().version);
  }
});

// Initialize on startup
initialize();

// Clean up on extension suspend (Firefox only)
if (typeof browser !== 'undefined' && browser.runtime.onSuspend) {
  browser.runtime.onSuspend.addListener(() => {
    logger.info('Extension suspending, cleaning up');
    cacheManager.close();
  });
}

logger.info('Background service worker loaded');
