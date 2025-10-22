/**
 * Message handler - Route messages from content scripts
 * Handles translation requests, cache operations, and health checks
 *
 * @module background/message-handler
 */

import { logger } from '../shared/logger.js';
import { cacheManager } from './cache-manager.js';
import { llmClient } from './llm-client.js';
import { languageManager } from '../shared/language-manager.js';

/**
 * Handle translation request
 * @param {Object} data - Request data
 * @returns {Promise<Object>} Response with translation
 */
async function handleTranslate(data) {
  const { text, source_lang, target_lang, context, use_cache } = data;

  // Validate inputs
  if (!text || !source_lang || !target_lang) {
    throw new Error('Missing required parameters');
  }

  if (text.length > 500) {
    throw new Error('Text too long (max 500 characters)');
  }

  try {
    // Check cache first
    if (use_cache !== false) {
      const cacheKey = cacheManager.generateKey(text, source_lang, target_lang, context);
      const cached = await cacheManager.get(cacheKey);

      if (cached) {
        logger.info('Cache hit - returning cached translation:', cached);
        return {
          translation: cached,
          cached: true
        };
      }
    }

    // Request translation from LLM
    logger.info('Cache miss - requesting translation from LLM server');
    const result = await llmClient.translate(text, source_lang, target_lang, context);

    // Store in cache
    if (use_cache !== false) {
      const cacheKey = cacheManager.generateKey(text, source_lang, target_lang, context);
      await cacheManager.set(cacheKey, text, source_lang, target_lang, result.translation, context);
    }

    return {
      translation: result.translation,
      cached: false,
      debugInfo: result.debugInfo // Include debug info for content script logging
    };

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
 * Main message router
 * @param {Object} message - Message from content script
 * @param {Object} sender - Message sender info
 * @param {Function} sendResponse - Response callback
 * @returns {boolean} True if response will be sent asynchronously
 */
export function handleMessage(message, sender, sendResponse) {
  logger.debug('Received message:', message.type);

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
