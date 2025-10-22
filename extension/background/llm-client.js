/**
 * LLM Client - Direct HTTP communication with LLM server
 * Supports OpenAI-compatible APIs (LMStudio, llama.cpp, Ollama)
 *
 * @module background/llm-client
 */

import { CONFIG } from '../shared/config.js';
import { logger } from '../shared/logger.js';
import { buildMessages } from './prompt-builder.js';
import { extractTranslation } from './response-cleaner.js';
import { validateTranslationRequest } from '../shared/validation.js';
import { RateLimiter } from '../shared/rate-limiter.js';

class LLMClient {
  constructor() {
    this.endpoint = CONFIG.llm.defaultEndpoint;
    this.model = CONFIG.llm.defaultModel;
    this.timeout = CONFIG.llm.timeout;
    this.maxRetries = CONFIG.llm.maxRetries;
    this.retryDelay = CONFIG.llm.retryDelay;
    this.rateLimiter = new RateLimiter(10, 60000); // 10 requests per minute
    this.useRateLimit = false; // Disabled by default for local LLM instances
  }

  /**
   * Update endpoint and model from settings
   * @param {string} endpoint - LLM API endpoint
   * @param {string} model - Model name
   * @param {boolean} useRateLimit - Whether to enforce rate limiting
   */
  configure(endpoint, model, useRateLimit = false) {
    this.endpoint = endpoint || CONFIG.llm.defaultEndpoint;
    this.model = model || CONFIG.llm.defaultModel;
    this.useRateLimit = useRateLimit;
    logger.info('LLM client configured:', this.endpoint, this.model, 'useRateLimit:', this.useRateLimit);
  }

  /**
   * Translate text using LLM
   * @param {string} text - Text to translate
   * @param {string} sourceLang - Source language
   * @param {string} targetLang - Target language
   * @param {string|null} context - Optional context
   * @returns {Promise<string>} Translated text
   * @throws {Error} If translation fails
   */
  async translate(text, sourceLang, targetLang, context = null) {
    validateTranslationRequest(text, sourceLang, targetLang, context);

    // Only apply rate limiting if enabled
    if (this.useRateLimit) {
      await this.rateLimiter.acquire();
    }

    const messages = buildMessages(text, sourceLang, targetLang, context);

    logger.debug('Built messages for LLM:', JSON.stringify(messages, null, 2));

    const payload = {
      model: this.model,
      messages: messages,
      max_tokens: CONFIG.llm.maxTokens,
      temperature: CONFIG.llm.temperature,
      stream: false
    };

    logger.debug('Sending translation request:', {
      text: text.substring(0, 50) + '...',
      sourceLang,
      targetLang,
      hasContext: !!context,
      contextLength: context?.length || 0,
      contextPreview: context ? context.substring(0, 100) + '...' : 'none'
    });

    let lastError = null;

    // Retry loop
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          logger.info(`Retry attempt ${attempt}/${this.maxRetries}`);
          await this._sleep(this.retryDelay * attempt); // Exponential backoff
        }

        const response = await this._makeRequest(payload);
        const result = extractTranslation(response, text);

        logger.info('Translation successful. Result:', result.translation);
        return result;

      } catch (error) {
        lastError = error;
        logger.warn(`Translation attempt ${attempt + 1} failed:`, error.message);

        // Don't retry on certain errors
        if (this._isNonRetryableError(error)) {
          break;
        }
      }
    }

    // All retries failed
    logger.error('Translation failed after retries:', lastError);
    throw new Error(`Translation failed: ${lastError.message}`);
  }

  /**
   * Make HTTP request to LLM API
   * @private
   * @param {Object} payload - Request payload
   * @returns {Promise<Object>} API response
   */
  async _makeRequest(payload) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      logger.info('LLM raw response:', JSON.stringify(data, null, 2));
      return data;

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out after ' + (this.timeout / 1000) + 's');
      }

      if (error.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to LLM server. Is it running at ' + this.endpoint + '?');
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Check if error should not be retried
   * @private
   * @param {Error} error - Error object
   * @returns {boolean} True if error is non-retryable
   */
  _isNonRetryableError(error) {
    const message = error.message.toLowerCase();

    // Don't retry on validation errors, bad requests
    if (message.includes('400') || message.includes('422')) {
      return true;
    }

    // Don't retry on authentication/authorization errors
    if (message.includes('401') || message.includes('403')) {
      return true;
    }

    // Don't retry on not found
    if (message.includes('404')) {
      return true;
    }

    return false;
  }

  /**
   * Sleep utility for retry delays
   * @private
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test connectivity to LLM server
   * @returns {Promise<boolean>} True if server is reachable
   */
  async testConnection() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok || response.status === 400; // 400 is ok, means server responded

    } catch (error) {
      logger.error('Connection test failed:', error);
      return false;
    }
  }
}

// Create singleton instance
export const llmClient = new LLMClient();
