/**
 * Content script main orchestration
 */

import { settingsManager } from '../shared/settings-manager.js';
import { logger } from '../shared/logger.js';
import { showToast } from './ui/toast.js';
import { showTooltip } from './ui/tooltip.js';
import { showInlineTranslation, clearAllInlineTranslations } from './ui/inline-translation.js';
import { attachClickHandler, detachClickHandler } from './handlers/click-handler.js';

let isActive = false;

/**
 * Initialize content script
 */
async function initialize() {
  try {
    await settingsManager.load();
    logger.debug('Settings loaded:', settingsManager.getAll());

    browser.runtime.onMessage.addListener(handleMessage);
    logger.debug('Content script initialized');
  } catch (error) {
    logger.error('Failed to initialize:', error);
  }
}

/**
 * Activate translator
 */
async function activate() {
  if (isActive) return;

  isActive = true;
  logger.debug('Activating translator');

  attachClickHandler(handleTranslationRequest);
  showToast('Translator activated', 'success');
}

/**
 * Deactivate translator
 */
function deactivate() {
  if (!isActive) return;

  isActive = false;
  logger.debug('Deactivating translator');

  detachClickHandler();
  clearAllTranslations();
  showToast('Translator deactivated', 'info');
}

/**
 * Handle translation request from click handler
 * @param {string} text - Text to translate
 * @param {string} context - Context around text (may be empty if extraction failed)
 * @param {Range} wordRange - Range of word
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 */
async function handleTranslationRequest(text, context, wordRange, x, y) {
  try {
    logger.debug('Translation request:', { text, contextReceived: context });

    // Only send context if contextMode is enabled
    const useContext = settingsManager.get('contextMode');
    const contextToSend = useContext ? context : null;

    logger.debug('Context mode:', useContext, 'Context received length:', context?.length || 0, 'Context to send length:', contextToSend?.length || 0);

    const response = await browser.runtime.sendMessage({
      type: 'translate',
      data: {
        text,
        source_lang: settingsManager.get('sourceLang'),
        target_lang: settingsManager.get('targetLang'),
        context: contextToSend,
        use_cache: settingsManager.get('useCache')
      }
    });

    if (response.success) {
      const translation = response.data.translation;

      // Log debug info if available (from non-cached responses)
      if (response.data.debugInfo) {
        logger.info('LLM raw response:', JSON.stringify(response.data.debugInfo.rawResponse, null, 2));
        logger.info('Raw LLM content:', response.data.debugInfo.rawContent);
        logger.info('Cleaned translation:', response.data.debugInfo.cleanedTranslation);
      } else if (response.data.cached) {
        logger.info('Cache hit - translation:', translation);
      }

      const displayMode = settingsManager.get('displayMode');
      const darkMode = settingsManager.get('darkMode');

      // Get custom style settings
      const styleSettings = {
        translationBgColor: settingsManager.get('translationBgColor'),
        translationTextColor: settingsManager.get('translationTextColor'),
        translationBgOpacity: settingsManager.get('translationBgOpacity')
      };

      if (displayMode === 'inline') {
        showInlineTranslation(translation, wordRange, text, darkMode, styleSettings);
      } else {
        showTooltip(translation, x, y, darkMode, styleSettings);
      }

      if (response.data.cached) {
        logger.debug('Translation from cache');
      }
    } else {
      showToast('Translation failed: ' + response.error, 'error');
      logger.error('Translation failed:', response.error);
    }
  } catch (error) {
    showToast('Translation error: ' + error.message, 'error');
    logger.error('Translation error:', error);
  }
}

/**
 * Clear all translations
 */
function clearAllTranslations() {
  clearAllInlineTranslations();
  logger.debug('All translations cleared');
}

/**
 * Handle messages from background/popup
 * @param {object} message - Message object
 * @returns {Promise<Object>|boolean} Response or false if not handled
 */
function handleMessage(message) {
  logger.debug('Received message:', message);

  if (message.action === 'toggle') {
    if (isActive) {
      deactivate();
    } else {
      activate();
    }
    return Promise.resolve({ success: true });
  } else if (message.action === 'activate') {
    activate();
    return Promise.resolve({ success: true });
  } else if (message.action === 'deactivate') {
    deactivate();
    return Promise.resolve({ success: true });
  } else if (message.action === 'getStatus') {
    return Promise.resolve({ isActive });
  } else if (message.action === 'settingChanged') {
    handleSettingChanged(message.key, message.value);
    return Promise.resolve({ success: true });
  } else if (message.action === 'clearTranslations') {
    clearAllTranslations();
    return Promise.resolve({ success: true });
  }

  return false;
}

/**
 * Handle setting change from popup
 * @param {string} key - Setting key
 * @param {*} value - Setting value
 */
async function handleSettingChanged(key, value) {
  logger.debug('Setting changed from popup:', key, value);
  await settingsManager.set(key, value);

  // Update UI if necessary
  if (isActive) {
    if (key === 'displayMode') {
      // Clear existing translations when display mode changes
      clearAllTranslations();
    }
  }
}

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
  logger.debug('Page unloading, cleaning up');
  browser.runtime.onMessage.removeListener(handleMessage);
  detachClickHandler();
  clearAllTranslations();
});

initialize();
