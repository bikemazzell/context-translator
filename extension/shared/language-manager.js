/**
 * Language Manager - Manages custom language list
 * Stores languages in browser.storage instead of hardcoding
 *
 * @module shared/language-manager
 */

import { logger } from './logger.js';

// Default languages (used for initial setup only)
const DEFAULT_LANGUAGES = [
  'English', 'German', 'French', 'Spanish', 'Italian',
  'Portuguese', 'Dutch', 'Russian', 'Chinese', 'Japanese',
  'Korean', 'Arabic', 'Turkish', 'Polish', 'Swedish',
  'Norwegian', 'Danish', 'Finnish', 'Czech', 'Hungarian'
];

export class LanguageManager {
  constructor() {
    this.storageKey = 'customLanguages';
  }

  /**
   * Initialize language list from storage or use defaults
   * @returns {Promise<string[]>} List of languages
   */
  async init() {
    try {
      const stored = await browser.storage.local.get(this.storageKey);

      if (stored[this.storageKey] && Array.isArray(stored[this.storageKey])) {
        logger.info('Loaded custom languages from storage:', stored[this.storageKey].length);
        return stored[this.storageKey];
      }

      // First time - initialize with defaults
      logger.info('Initializing with default languages');
      await this.setLanguages(DEFAULT_LANGUAGES);
      return DEFAULT_LANGUAGES;
    } catch (error) {
      logger.error('Failed to initialize languages:', error);
      return DEFAULT_LANGUAGES;
    }
  }

  /**
   * Get current language list
   * @returns {Promise<string[]>} List of languages
   */
  async getLanguages() {
    try {
      const stored = await browser.storage.local.get(this.storageKey);
      return stored[this.storageKey] || DEFAULT_LANGUAGES;
    } catch (error) {
      logger.error('Failed to get languages:', error);
      return DEFAULT_LANGUAGES;
    }
  }

  /**
   * Add a new language
   * @param {string} language - Language name to add
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async addLanguage(language) {
    try {
      const trimmed = language.trim();

      if (!trimmed) {
        return { success: false, error: 'Language name cannot be empty' };
      }

      if (trimmed.length > 50) {
        return { success: false, error: 'Language name too long (max 50 characters)' };
      }

      const languages = await this.getLanguages();

      // Check for duplicates (case-insensitive)
      const exists = languages.some(lang => lang.toLowerCase() === trimmed.toLowerCase());
      if (exists) {
        return { success: false, error: 'Language already exists' };
      }

      languages.push(trimmed);
      languages.sort();

      await this.setLanguages(languages);
      logger.info('Added language:', trimmed);

      return { success: true };
    } catch (error) {
      logger.error('Failed to add language:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove a language
   * @param {string} language - Language name to remove
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async removeLanguage(language) {
    try {
      const languages = await this.getLanguages();

      const index = languages.findIndex(lang => lang === language);
      if (index === -1) {
        return { success: false, error: 'Language not found' };
      }

      // Prevent removing the last language
      if (languages.length === 1) {
        return { success: false, error: 'Cannot remove the last language' };
      }

      languages.splice(index, 1);
      await this.setLanguages(languages);
      logger.info('Removed language:', language);

      return { success: true };
    } catch (error) {
      logger.error('Failed to remove language:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set the complete language list
   * @param {string[]} languages - New language list
   * @returns {Promise<void>}
   */
  async setLanguages(languages) {
    await browser.storage.local.set({ [this.storageKey]: languages });
  }

  /**
   * Reset to default languages
   * @returns {Promise<void>}
   */
  async resetToDefaults() {
    logger.info('Resetting to default languages');
    await this.setLanguages(DEFAULT_LANGUAGES);
  }
}

export const languageManager = new LanguageManager();
