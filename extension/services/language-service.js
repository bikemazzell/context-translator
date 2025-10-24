/**
 * Language Service
 * Manages language list operations
 */

export class LanguageService {
  /**
   * @param {Object} messenger - Message sender (e.g., browser.runtime)
   */
  constructor(messenger) {
    if (!messenger) {
      throw new Error('Messenger is required');
    }

    this.messenger = messenger;
  }

  /**
   * Get list of available languages
   * @returns {Promise<string[]>} Array of language names
   */
  async getLanguages() {
    try {
      const response = await this.messenger.sendMessage({ type: 'getLanguages' });

      if (response.success && response.data?.languages) {
        return response.data.languages;
      }

      return [];
    } catch {
      return [];
    }
  }

  /**
   * Add new language
   * @param {string} languageName - Language name to add
   * @returns {Promise<Object>} Result object with success flag and languages array
   */
  async addLanguage(languageName) {
    const trimmed = languageName?.trim();

    if (!trimmed) {
      return {
        success: false,
        error: 'Language name is required'
      };
    }

    try {
      const response = await this.messenger.sendMessage({
        type: 'addLanguage',
        data: { language: trimmed }
      });

      if (response.success) {
        return {
          success: true,
          languages: response.data?.languages || []
        };
      }

      return {
        success: false,
        error: response.error
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Remove language
   * @param {string} languageName - Language name to remove
   * @returns {Promise<Object>} Result object with success flag and languages array
   */
  async removeLanguage(languageName) {
    try {
      const response = await this.messenger.sendMessage({
        type: 'removeLanguage',
        data: { language: languageName }
      });

      if (response.success) {
        return {
          success: true,
          languages: response.data?.languages || []
        };
      }

      return {
        success: false,
        error: response.error
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
