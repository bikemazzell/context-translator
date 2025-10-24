/**
 * Message handler - Route messages from content scripts
 * Handles translation requests, cache operations, and health checks
 *
 * @module background/message-handler
 */

import { logger } from '../shared/logger.js';
import { CONFIG } from '../shared/config.js';
import { ValidationError } from '../shared/errors.js';

let cacheManager = null;
let llmClient = null;
let languageManager = null;

const pendingRequests = new Map();

export function configureDependencies(cache, llm, langManager) {
  cacheManager = cache;
  llmClient = llm;
  languageManager = langManager;
}

/**
 * Handle translation request
 * @param {Object} data - Request data
 * @returns {Promise<Object>} Response with translation
 */
async function handleTranslate(data) {
  const { text, source_lang, target_lang, context, use_cache } = data;

  if (!text || !source_lang || !target_lang) {
    throw new ValidationError('Missing required parameters', 'translation_request', { text, source_lang, target_lang });
  }

  if (text.length > CONFIG.translation.maxTextLength) {
    throw new ValidationError(
      `Text too long (max ${CONFIG.translation.maxTextLength} characters)`,
      'text',
      `${text.length} characters`
    );
  }

  try {
    const cacheKey = use_cache !== false
      ? await cacheManager.generateKey(text, source_lang, target_lang, context)
      : null;

    // Check cache first
    if (cacheKey) {
      const cached = await cacheManager.get(cacheKey);

      if (cached) {
        logger.info('Cache hit - returning cached translation:', cached);
        return {
          translation: cached,
          cached: true
        };
      }
    }

    // Check for pending request (request deduplication)
    if (cacheKey && pendingRequests.has(cacheKey)) {
      logger.info('Duplicate request detected - waiting for existing request');
      return await pendingRequests.get(cacheKey);
    }

    // Create new translation request
    const translationPromise = (async () => {
      try {
        logger.info('Cache miss - requesting translation from LLM server');
        const result = await llmClient.translate(text, source_lang, target_lang, context);

        // Store in cache
        if (cacheKey) {
          await cacheManager.set(cacheKey, text, source_lang, target_lang, result.translation, context);
        }

        return {
          translation: result.translation,
          cached: false,
          debugInfo: result.debugInfo
        };
      } finally {
        // Clean up pending request
        if (cacheKey) {
          pendingRequests.delete(cacheKey);
        }
      }
    })();

    // Store pending request
    if (cacheKey) {
      pendingRequests.set(cacheKey, translationPromise);
    }

    return await translationPromise;

  } catch (error) {
    logger.error('Translation error:', error);
    throw error;
  }
}

/**
 * Handle get languages request
 * @returns {Promise<Object>} Response with languages
 */
async function handleGetLanguages() {
  const languages = await languageManager.getLanguages();
  return {
    languages
  };
}

/**
 * Handle add language request
 * @param {Object} data - Request data
 * @returns {Promise<Object>} Response with result
 */
async function handleAddLanguage(data) {
  const { language } = data;

  if (!language) {
    throw new Error('Language name is required');
  }

  const result = await languageManager.addLanguage(language);

  if (!result.success) {
    throw new Error(result.error);
  }

  const languages = await languageManager.getLanguages();
  return { languages };
}

/**
 * Handle remove language request
 * @param {Object} data - Request data
 * @returns {Promise<Object>} Response with result
 */
async function handleRemoveLanguage(data) {
  const { language } = data;

  if (!language) {
    throw new Error('Language name is required');
  }

  const result = await languageManager.removeLanguage(language);

  if (!result.success) {
    throw new Error(result.error);
  }

  const languages = await languageManager.getLanguages();
  return { languages };
}

/**
 * Handle health check request
 * @returns {Promise<Object>} Response with health status
 */
async function handleHealthCheck() {
  try {
    const isHealthy = await llmClient.testConnection();
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      llm_available: isHealthy
    };
  } catch (error) {
    logger.error('Health check error:', error);
    return {
      status: 'unhealthy',
      llm_available: false,
      error: error.message
    };
  }
}

/**
 * Handle cache clear request
 * @returns {Promise<Object>} Response with status
 */
async function handleClearCache() {
  try {
    await cacheManager.clear();
    return {
      status: 'cleared'
    };
  } catch (error) {
    logger.error('Cache clear error:', error);
    throw error;
  }
}

/**
 * Handle cache stats request
 * @returns {Promise<Object>} Response with cache statistics
 */
async function handleCacheStats() {
  try {
    const stats = await cacheManager.getStats();
    return stats;
  } catch (error) {
    logger.error('Cache stats error:', error);
    throw error;
  }
}

/**
 * Validate message sender
 * @param {Object} sender - Message sender info
 * @returns {boolean} True if sender is valid
 */
function validateSender(sender) {
  // Check if sender has required properties
  if (!sender || !sender.id) {
    logger.warn('Message received without sender ID');
    return false;
  }

  // Validate sender is this extension (not from another extension or external source)
  if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.id) {
    if (sender.id !== browser.runtime.id) {
      logger.warn('Message received from different extension:', sender.id);
      return false;
    }
  }

  // Additional validation: check if sender has tab info (content script)
  // or is from the extension itself (popup, options page)
  if (!sender.tab && !sender.url) {
    logger.warn('Message received without tab or URL info');
    return false;
  }

  return true;
}

/**
 * Main message router
 * @param {Object} message - Message from content script
 * @param {Object} sender - Message sender info
 * @param {Function} sendResponse - Response callback
 * @returns {boolean} True if response will be sent asynchronously
 */
export function handleMessage(message, sender, sendResponse) {
  logger.debug('Received message:', message.type, 'from:', sender.id);

  // Validate sender origin
  if (!validateSender(sender)) {
    logger.error('Invalid message sender:', sender);
    sendResponse({ success: false, error: 'Invalid sender' });
    return false;
  }

  // Route message to appropriate handler
  const handlers = {
    translate: handleTranslate,
    getLanguages: handleGetLanguages,
    addLanguage: handleAddLanguage,
    removeLanguage: handleRemoveLanguage,
    checkHealth: handleHealthCheck,
    clearCache: handleClearCache,
    cacheStats: handleCacheStats
  };

  const handler = handlers[message.type];

  if (!handler) {
    sendResponse({
      success: false,
      error: 'Unknown message type: ' + message.type
    });
    return false;
  }

  // Execute handler asynchronously
  handler(message.data || {})
    .then(data => {
      sendResponse({
        success: true,
        data
      });
    })
    .catch(error => {
      sendResponse({
        success: false,
        error: error.message
      });
    });

  // Return true to indicate async response
  return true;
}
