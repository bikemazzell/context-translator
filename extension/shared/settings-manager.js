/**
 * Settings management for Context Translator
 * Handles loading, saving, and accessing user settings
 *
 * @module shared/settings-manager
 */

import { CONFIG } from './config.js';
import { logger } from './logger.js';
import { validateSetting } from './validation.js';

export class SettingsManager {
  constructor() {
    this.settings = { ...CONFIG.defaults };
    this.loaded = false;
  }

  /**
   * Load settings from browser storage
   * @returns {Promise<Object>} Settings object
   */
  async load() {
    try {
      const stored = await browser.storage.local.get('settings');
      if (stored.settings) {
        // Merge stored settings with defaults (preserve new defaults)
        this.settings = { ...CONFIG.defaults, ...stored.settings };
        logger.debug('Settings loaded from storage');
      } else {
        logger.debug('No stored settings, using defaults');
      }
      this.loaded = true;
      return this.settings;
    } catch (error) {
      logger.error('Failed to load settings:', error);
      this.loaded = true; // Still mark as loaded, use defaults
      return this.settings;
    }
  }

  /**
   * Save settings to browser storage
   * @returns {Promise<void>}
   */
  async save() {
    try {
      await browser.storage.local.set({ settings: this.settings });
      logger.debug('Settings saved');
    } catch (error) {
      logger.error('Failed to save settings:', error);
    }
  }

  /**
   * Get a setting value
   * @param {string} key - Setting key
   * @returns {*} Setting value
   */
  get(key) {
    return this.settings[key];
  }

  /**
   * Set a setting value and save
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   * @returns {Promise<void>}
   */
  async set(key, value) {
    validateSetting(key, value);
    this.settings[key] = value;
    await this.save();
    logger.debug(`Setting updated: ${key} =`, value);
  }

  /**
   * Update multiple settings at once
   * @param {Object} updates - Object with key-value pairs
   * @returns {Promise<void>}
   */
  async update(updates) {
    for (const [key, value] of Object.entries(updates)) {
      validateSetting(key, value);
    }
    Object.assign(this.settings, updates);
    await this.save();
    logger.debug('Settings updated:', updates);
  }

  /**
   * Get all settings
   * @returns {Object} All settings
   */
  getAll() {
    return { ...this.settings };
  }

  /**
   * Reset settings to defaults
   * @returns {Promise<void>}
   */
  async reset() {
    this.settings = { ...CONFIG.defaults };
    await this.save();
    logger.info('Settings reset to defaults');
  }
}

// Singleton export removed - use dependency injection
// Instantiate SettingsManager at entry points and pass as dependency
