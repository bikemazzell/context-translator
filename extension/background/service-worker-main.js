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
 * Listen for keyboard commands
 */
browser.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-translator') {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      try {
        await browser.tabs.sendMessage(tabs[0].id, { action: 'toggle' });
        logger.debug('Toggle command sent to active tab');
      } catch (error) {
        logger.error('Failed to send toggle command:', error);
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
