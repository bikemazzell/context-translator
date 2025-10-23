/**
 * Popup Controller
 * Orchestrates popup functionality with dependency injection
 */

export class PopupController {
  /**
   * @param {Object} deps - Dependencies
   * @param {Object} deps.settingsService - Settings service
   * @param {Object} deps.languageService - Language service
   * @param {Object} deps.uiStateManager - UI state manager
   * @param {Object} deps.storageService - Storage service
   * @param {Object} deps.messenger - Messenger for communication
   */
  constructor({ settingsService, languageService, uiStateManager, storageService, messenger }) {
    if (!settingsService) {
      throw new Error('SettingsService is required');
    }
    if (!languageService) {
      throw new Error('LanguageService is required');
    }
    if (!uiStateManager) {
      throw new Error('UIStateManager is required');
    }
    if (!storageService) {
      throw new Error('StorageService is required');
    }
    if (!messenger) {
      throw new Error('Messenger is required');
    }

    this.settingsService = settingsService;
    this.languageService = languageService;
    this.uiStateManager = uiStateManager;
    this.storageService = storageService;
    this.messenger = messenger;

    this.currentSettings = null;
    this.languages = [];
  }

  /**
   * Initialize popup
   */
  async initialize() {
    try {
      // Load settings
      this.currentSettings = await this.settingsService.loadSettings();

      // Apply dark mode
      const darkMode = this.currentSettings.darkMode;
      this.settingsService.applyDarkMode(darkMode);

      // Load languages
      this.languages = await this.languageService.getLanguages();

      // Check translator status
      await this.checkTranslatorStatus();
    } catch (error) {
      // Handle initialization errors gracefully
    }
  }

  /**
   * Check translator status in active tab
   */
  async checkTranslatorStatus() {
    try {
      const tabs = await this.messenger.queryTabs({ active: true, currentWindow: true });
      if (tabs.length > 0) {
        await this.messenger.sendTabMessage(tabs[0].id, { action: 'getStatus' });
      }
    } catch (error) {
      // Tab might not have content script loaded
    }
  }

  /**
   * Navigate to settings screen
   */
  navigateToSettings() {
    this.uiStateManager.showSettingsScreen();
  }

  /**
   * Navigate to main screen
   */
  navigateToMain() {
    this.uiStateManager.showMainScreen();
  }

  /**
   * Add language
   * @param {string} languageName - Language name to add
   * @returns {Promise<Object>} Result object
   */
  async addLanguage(languageName) {
    try {
      this.uiStateManager.setButtonDisabled('saveLanguage', true);

      const result = await this.languageService.addLanguage(languageName);

      if (result.success) {
        this.languages = result.languages;
        this.uiStateManager.hideForm();
      }

      return result;
    } finally {
      this.uiStateManager.setButtonDisabled('saveLanguage', false);
    }
  }

  /**
   * Remove language
   * @param {string} languageName - Language name to remove
   * @returns {Promise<Object>} Result object
   */
  async removeLanguage(languageName) {
    const result = await this.languageService.removeLanguage(languageName);

    if (result.success) {
      const previousSource = this.settingsService.getSetting('sourceLang');
      const previousTarget = this.settingsService.getSetting('targetLang');

      this.languages = result.languages;

      // Update settings if removed language was selected
      if (!this.languages.includes(previousSource)) {
        await this.settingsService.setSetting('sourceLang', this.languages[0]);
      }

      if (!this.languages.includes(previousTarget)) {
        await this.settingsService.setSetting('targetLang', this.languages[1] || this.languages[0]);
      }
    }

    return result;
  }

  /**
   * Save setting
   * @param {string} key - Setting key
   * @param {any} value - Setting value
   */
  async saveSetting(key, value) {
    await this.settingsService.setSetting(key, value);

    // Update current settings
    if (this.currentSettings) {
      this.currentSettings[key] = value;
    }

    // Apply dark mode if changed
    if (key === 'darkMode') {
      this.settingsService.applyDarkMode(value);
    }

    // Notify content script
    await this.settingsService.notifyContentScript(key, value);
  }

  /**
   * Toggle translator in active tab
   */
  async toggleTranslator() {
    try {
      const tabs = await this.messenger.queryTabs({ active: true, currentWindow: true });
      if (tabs.length > 0) {
        await this.messenger.sendTabMessage(tabs[0].id, { action: 'toggle' });
      }
    } catch (error) {
      // Handle errors gracefully
    }
  }

  /**
   * Clear cache
   * @returns {Promise<Object>} Result object
   */
  async clearCache() {
    try {
      this.uiStateManager.setButtonDisabled('clearCache', true);
      this.uiStateManager.setButtonText('clearCache', 'Clearing...');

      const result = await this.messenger.sendMessage({ type: 'clearCache' });

      if (result.success) {
        this.uiStateManager.setButtonText('clearCache', 'Cleared!');
        setTimeout(() => {
          this.uiStateManager.clearButtonText('clearCache');
          this.uiStateManager.setButtonDisabled('clearCache', false);
        }, 1500);
      } else {
        this.uiStateManager.setButtonText('clearCache', 'Failed');
        setTimeout(() => {
          this.uiStateManager.clearButtonText('clearCache');
          this.uiStateManager.setButtonDisabled('clearCache', false);
        }, 1500);
      }

      return result;
    } catch (error) {
      this.uiStateManager.setButtonText('clearCache', 'Error');
      setTimeout(() => {
        this.uiStateManager.clearButtonText('clearCache');
        this.uiStateManager.setButtonDisabled('clearCache', false);
      }, 1500);

      return { success: false, error: error.message };
    }
  }

  /**
   * Clear translations in active tab
   */
  async clearTranslations() {
    try {
      const tabs = await this.messenger.queryTabs({ active: true, currentWindow: true });
      if (tabs.length > 0) {
        await this.messenger.sendTabMessage(tabs[0].id, { action: 'clearTranslations' });
      }
    } catch (error) {
      // Handle errors gracefully
    }
  }

  /**
   * Get languages
   * @returns {string[]} Languages array
   */
  getLanguages() {
    return this.languages || [];
  }

  /**
   * Get current settings
   * @returns {Object|null} Current settings
   */
  getCurrentSettings() {
    return this.currentSettings;
  }
}
