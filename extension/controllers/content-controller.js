/**
 * Content Controller
 * Orchestrates content script functionality with dependency injection
 */

export class ContentController {
  /**
   * @param {Object} deps - Dependencies
   * @param {Object} deps.translationService - Translation service
   * @param {Object} deps.settingsManager - Settings manager
   * @param {Object} deps.logger - Logger
   * @param {Object} deps.ui - UI functions
   * @param {Object} deps.clickHandler - Click handler
   * @param {Object} deps.browser - Browser API
   */
  constructor({ translationService, settingsManager, logger, ui, clickHandler, browser }) {
    if (!translationService) {
      throw new Error('TranslationService is required');
    }
    if (!settingsManager) {
      throw new Error('SettingsManager is required');
    }
    if (!logger) {
      throw new Error('Logger is required');
    }
    if (!ui) {
      throw new Error('UI is required');
    }
    if (!clickHandler) {
      throw new Error('ClickHandler is required');
    }
    if (!browser) {
      throw new Error('Browser is required');
    }

    this.translationService = translationService;
    this.settingsManager = settingsManager;
    this.logger = logger;
    this.ui = ui;
    this.clickHandler = clickHandler;
    this.browser = browser;

    this._isActive = false;
    this._messageHandler = null;
  }

  /**
   * Initialize content script
   */
  async initialize() {
    try {
      await this.settingsManager.load();
      this.logger.debug('Settings loaded:', this.settingsManager.getAll());

      // Create bound message handler
      this._messageHandler = this.handleMessage.bind(this);
      this.browser.runtime.onMessage.addListener(this._messageHandler);

      this.logger.debug('Content script initialized');
    } catch (error) {
      this.logger.error('Failed to initialize:', error);
    }
  }

  /**
   * Check if translator is active
   * @returns {boolean}
   */
  isActive() {
    return this._isActive;
  }

  /**
   * Activate translator
   */
  async activate() {
    if (this._isActive) {return;}

    this._isActive = true;
    this.logger.debug('Activating translator');

    this.clickHandler.attach(this._handleTranslationRequest.bind(this));
    this.ui.showToast('Translator activated', 'success');
  }

  /**
   * Deactivate translator
   */
  async deactivate() {
    if (!this._isActive) {return;}

    this._isActive = false;
    this.logger.debug('Deactivating translator');

    this.clickHandler.detach();
    this.ui.clearAllInlineTranslations();
    this.ui.showToast('Translator deactivated', 'info');
  }

  /**
   * Handle messages from background/popup
   * @param {Object} message - Message object
   * @returns {Promise<Object>|boolean} Response or false if not handled
   */
  handleMessage(message) {
    this.logger.debug('Received message:', message);

    if (message.action === 'toggle') {
      if (this._isActive) {
        this.deactivate();
      } else {
        this.activate();
      }
      return Promise.resolve({ success: true });
    } else if (message.action === 'activate') {
      this.activate();
      return Promise.resolve({ success: true });
    } else if (message.action === 'deactivate') {
      this.deactivate();
      return Promise.resolve({ success: true });
    } else if (message.action === 'getStatus') {
      return Promise.resolve({ isActive: this._isActive });
    } else if (message.action === 'settingChanged') {
      this._handleSettingChanged(message.key, message.value);
      return Promise.resolve({ success: true });
    } else if (message.action === 'clearTranslations') {
      this.ui.clearAllInlineTranslations();
      this.logger.debug('All translations cleared');
      return Promise.resolve({ success: true });
    }

    return false;
  }

  /**
   * Handle setting change from popup
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   */
  async _handleSettingChanged(key, value) {
    this.logger.debug('Setting changed from popup:', key, value);
    await this.settingsManager.set(key, value);

    // Update UI if necessary
    if (this._isActive) {
      if (key === 'displayMode') {
        // Clear existing translations when display mode changes
        this.ui.clearAllInlineTranslations();
        this.logger.debug('All translations cleared');
      }
    }
  }

  /**
   * Handle translation request from click handler
   * @param {string} text - Text to translate
   * @param {string} context - Context around text
   * @param {Range} wordRange - Range of word
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  async _handleTranslationRequest(text, context, wordRange, x, y) {
    try {
      this.logger.debug('Translation request:', { text, contextReceived: context });

      // Translate
      const response = await this.translationService.translate(text, context);

      if (response.success) {
        const translation = this.translationService.extractTranslation(response);

        // Log debug info
        this.translationService.logResponseDebugInfo(response);

        // Get display settings
        const displayMode = this.settingsManager.get('displayMode');
        const darkMode = this.settingsManager.get('darkMode');

        // Get custom style settings
        const styleSettings = {
          translationBgColor: this.settingsManager.get('translationBgColor'),
          translationTextColor: this.settingsManager.get('translationTextColor'),
          translationBgOpacity: this.settingsManager.get('translationBgOpacity')
        };

        // Display translation
        if (displayMode === 'inline') {
          this.ui.showInlineTranslation(translation, wordRange, text, darkMode, styleSettings);
        } else {
          this.ui.showTooltip(translation, x, y, darkMode, styleSettings);
        }

        if (response.data?.cached) {
          this.logger.debug('Translation from cache');
        }
      } else {
        const errorMessage = this.translationService.getErrorMessage(response);
        this.ui.showToast('Translation failed: ' + errorMessage, 'error');
        this.logger.error('Translation failed:', errorMessage);
      }
    } catch (error) {
      this.ui.showToast('Translation error: ' + error.message, 'error');
      this.logger.error('Translation error:', error);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.logger.debug('Cleaning up content controller');
    if (this._messageHandler) {
      this.browser.runtime.onMessage.removeListener(this._messageHandler);
    }
    this.clickHandler.detach();
    this.ui.clearAllInlineTranslations();
  }
}
