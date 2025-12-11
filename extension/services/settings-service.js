/**
 * Settings Service
 * Manages application settings with storage and notification
 */

export class SettingsService {
  /**
   * @param {Object} storageService - Storage service instance
   * @param {Object} messenger - Messenger for notifying content scripts
   */
  constructor(storageService, messenger) {
    if (!storageService) {
      throw new Error('StorageService is required');
    }
    if (!messenger) {
      throw new Error('Messenger is required');
    }

    this.storageService = storageService;
    this.messenger = messenger;
    this.currentSettings = null;

    // Default settings
    this.defaults = {
      sourceLang: 'German',
      targetLang: 'English',
      darkMode: 'auto',
      displayMode: 'inline',
      enableLogging: true,
      translationTextColor: '#ffffff',
      translationBgColor: '#333333',
      translationBgOpacity: 0.9,
      llmHost: 'localhost',
      llmPort: 1234,
      useRateLimit: false,
      rateLimit: 10,
      useCache: true,
      contextMode: true,
      contextWindowChars: 200
    };
  }

  /**
   * Get default settings
   * @returns {Object} Default settings object
   */
  getDefaults() {
    // Return a copy to prevent mutation
    return { ...this.defaults };
  }

  /**
   * Load settings from storage
   * @returns {Promise<Object>} Loaded settings
   */
  async loadSettings() {
    const stored = await this.storageService.getSettings();

    if (stored) {
      // Merge stored settings with defaults
      this.currentSettings = { ...this.defaults, ...stored };
    } else {
      // Use defaults
      this.currentSettings = this.getDefaults();
    }

    return this.currentSettings;
  }

  /**
   * Save settings to storage
   * @param {Object} settings - Settings object to save
   * @returns {Promise<void>}
   */
  async saveSettings(settings) {
    await this.storageService.setSettings(settings);
    this.currentSettings = settings;
  }

  /**
   * Get specific setting or all settings
   * @param {string} key - Setting key (optional)
   * @returns {any} Setting value or all settings
   */
  getSetting(key) {
    if (!key) {
      return this.currentSettings;
    }
    return this.currentSettings?.[key];
  }

  /**
   * Set specific setting
   * @param {string} key - Setting key
   * @param {any} value - Setting value
   * @returns {Promise<void>}
   */
  async setSetting(key, value) {
    if (!this.currentSettings) {
      this.currentSettings = this.getDefaults();
    }

    this.currentSettings[key] = value;
    await this.storageService.setSettings(this.currentSettings);
  }

  /**
   * Notify content script of setting change
   * @param {string} key - Setting key
   * @param {any} value - Setting value
   * @returns {Promise<void>}
   */
  async notifyContentScript(key, value) {
    try {
      await this.messenger.sendMessage({
        action: 'settingChanged',
        key,
        value
      });
    } catch {
      // Content script might not be loaded, that's ok
    }
  }

  /**
   * Apply dark mode setting and return boolean
   * @param {string} darkMode - Dark mode setting ('dark', 'light', 'auto')
   * @returns {boolean} Whether dark mode should be applied
   */
  applyDarkMode(darkMode) {
    if (darkMode === 'dark') {
      return true;
    }
    if (darkMode === 'light') {
      return false;
    }
    if (darkMode === 'auto') {
      // Check system preference
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      return false;
    }
    return false;
  }
}
