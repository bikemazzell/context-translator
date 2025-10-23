/**
 * Translation Service
 * Handles translation request building and response processing
 */

export class TranslationService {
  /**
   * @param {Object} messenger - Message sender (e.g., browser.runtime)
   * @param {Object} settingsManager - Settings manager instance
   * @param {Object} logger - Logger instance
   */
  constructor(messenger, settingsManager, logger) {
    if (!messenger) {
      throw new Error('Messenger is required');
    }
    if (!settingsManager) {
      throw new Error('SettingsManager is required');
    }
    if (!logger) {
      throw new Error('Logger is required');
    }

    this.messenger = messenger;
    this.settingsManager = settingsManager;
    this.logger = logger;
  }

  /**
   * Build translation request object
   * @param {string} text - Text to translate
   * @param {string} context - Context around the text
   * @returns {Object} Translation request object
   */
  buildTranslationRequest(text, context) {
    const contextMode = this.settingsManager.get('contextMode');
    const sourceLang = this.settingsManager.get('sourceLang');
    const targetLang = this.settingsManager.get('targetLang');
    const useCache = this.settingsManager.get('useCache');

    // Trim text
    const trimmedText = text?.trim() || text;

    // Determine if we should include context
    const shouldIncludeContext = contextMode && context && context.trim();

    return {
      type: 'translate',
      data: {
        text: trimmedText,
        source_lang: sourceLang,
        target_lang: targetLang,
        context: shouldIncludeContext ? context : null,
        use_cache: useCache
      }
    };
  }

  /**
   * Send translation request
   * @param {string} text - Text to translate
   * @param {string} context - Context around the text
   * @returns {Promise<Object>} Translation response
   */
  async translate(text, context) {
    try {
      const request = this.buildTranslationRequest(text, context);
      const response = await this.messenger.sendMessage(request);

      // Handle null response
      if (!response) {
        return {
          success: false,
          error: 'No response from translation service'
        };
      }

      return response;
    } catch (error) {
      this.logger.error('Translation request failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract translation from response
   * @param {Object} response - Translation response
   * @returns {string|null} Translation text or null
   */
  extractTranslation(response) {
    if (!response || !response.success) {
      return null;
    }

    return response.data?.translation ?? null;
  }

  /**
   * Log debug information from response
   * @param {Object} response - Translation response
   */
  logResponseDebugInfo(response) {
    if (!response || !response.success || !response.data) {
      return;
    }

    const { data } = response;

    // Check if this is a cached response
    if (data.cached) {
      this.logger.info('Cache hit - translation:', data.translation);
      return;
    }

    // Log debug info if available
    if (data.debugInfo) {
      const { rawResponse, rawContent, cleanedTranslation } = data.debugInfo;

      if (rawResponse !== undefined) {
        this.logger.info('LLM raw response:', JSON.stringify(rawResponse));
      }
      if (rawContent !== undefined) {
        this.logger.info('Raw LLM content:', rawContent);
      }
      if (cleanedTranslation !== undefined) {
        this.logger.info('Cleaned translation:', cleanedTranslation);
      }
    }
  }

  /**
   * Get error message from response
   * @param {Object} response - Translation response
   * @returns {string} Error message
   */
  getErrorMessage(response) {
    if (!response || !response.error) {
      return 'Unknown error';
    }

    // Handle Error objects
    if (response.error instanceof Error) {
      return response.error.message;
    }

    return response.error;
  }
}
