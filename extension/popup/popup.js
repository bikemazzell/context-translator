/**
 * Popup entry point
 * Thin bootstrap that wires up PopupController with DOM bindings
 */

import { PopupController } from '../controllers/popup-controller.js';
import { SettingsService } from '../services/settings-service.js';
import { LanguageService } from '../services/language-service.js';
import { StorageService } from '../services/storage-service.js';
import { UIStateManager } from '../services/ui-state-manager.js';

// Get DOM elements
const elements = {
  // Screens
  mainScreen: document.getElementById('main-screen'),
  settingsScreen: document.getElementById('settings-screen'),

  // Main screen controls
  translatorToggle: document.getElementById('translator-toggle'),
  settingsBtn: document.getElementById('settings-btn'),
  backBtn: document.getElementById('back-btn'),

  // Setting controls
  sourceLang: document.getElementById('setting-source-lang'),
  targetLang: document.getElementById('setting-target-lang'),
  displayMode: document.getElementById('setting-display-mode'),
  darkMode: document.getElementById('setting-dark-mode'),
  enableLogging: document.getElementById('setting-enable-logging'),
  textColor: document.getElementById('setting-text-color'),
  bgColor: document.getElementById('setting-bg-color'),
  bgOpacity: document.getElementById('setting-bg-opacity'),
  llmHost: document.getElementById('setting-llm-host'),
  llmPort: document.getElementById('setting-llm-port'),
  useRateLimit: document.getElementById('setting-use-rate-limit'),
  rateLimit: document.getElementById('setting-rate-limit'),
  useCache: document.getElementById('setting-use-cache'),
  contextMode: document.getElementById('setting-context-mode'),
  contextChars: document.getElementById('setting-context-chars'),
  clearCacheBtn: document.getElementById('clear-cache-btn'),
  clearTranslationsBtn: document.getElementById('clear-translations-btn'),

  // Language management
  addLanguageForm: document.getElementById('add-language-form'),
  newLanguageInput: document.getElementById('new-language-input'),
  saveLanguageBtn: document.getElementById('save-language-btn'),
  cancelLanguageBtn: document.getElementById('cancel-language-btn'),
  languageList: document.getElementById('language-list'),

  // Preview elements
  textColorPreview: document.getElementById('text-color-preview'),
  bgColorPreview: document.getElementById('bg-color-preview'),
  bgOpacityValue: document.getElementById('bg-opacity-value')
};

// Create messenger wrapper
const messenger = {
  sendMessage: (message) => browser.runtime.sendMessage(message),
  queryTabs: (query) => browser.tabs.query(query),
  sendTabMessage: (tabId, message) => browser.tabs.sendMessage(tabId, message)
};

// Create storage service
const storageService = new StorageService(browser.storage);

// Create settings service
const settingsService = new SettingsService(storageService, messenger);

// Create language service
const languageService = new LanguageService(messenger);

// Create UI state manager
const uiStateManager = new UIStateManager();

// Create popup controller
const controller = new PopupController({
  settingsService,
  languageService,
  uiStateManager,
  storageService,
  messenger
});

/**
 * Bind DOM events to controller
 */
function bindEvents() {
  // Screen navigation
  elements.settingsBtn.addEventListener('click', () => {
    controller.navigateToSettings();
    updateScreens();
  });

  elements.backBtn.addEventListener('click', () => {
    controller.navigateToMain();
    updateScreens();
  });

  // Translator toggle
  elements.translatorToggle.addEventListener('change', async () => {
    await controller.toggleTranslator();
  });

  // Setting change handlers
  elements.sourceLang.addEventListener('change', () => {
    controller.saveSetting('sourceLang', elements.sourceLang.value);
  });

  elements.targetLang.addEventListener('change', () => {
    controller.saveSetting('targetLang', elements.targetLang.value);
  });

  elements.displayMode.addEventListener('change', () => {
    controller.saveSetting('displayMode', elements.displayMode.value);
  });

  elements.darkMode.addEventListener('change', async () => {
    const darkMode = elements.darkMode.checked ? 'dark' : 'light';
    await controller.saveSetting('darkMode', darkMode);
    applyDarkModeToPopup();
  });

  elements.enableLogging.addEventListener('change', () => {
    controller.saveSetting('enableLogging', elements.enableLogging.checked);
  });

  elements.textColor.addEventListener('input', () => {
    updateColorPreview(elements.textColorPreview, elements.textColor.value);
    controller.saveSetting('translationTextColor', elements.textColor.value);
  });

  elements.bgColor.addEventListener('input', () => {
    updateColorPreview(elements.bgColorPreview, elements.bgColor.value);
    controller.saveSetting('translationBgColor', elements.bgColor.value);
  });

  elements.bgOpacity.addEventListener('input', () => {
    const percent = parseInt(elements.bgOpacity.value);
    elements.bgOpacityValue.textContent = `${percent}%`;
    controller.saveSetting('translationBgOpacity', percent / 100);
  });

  elements.llmHost.addEventListener('change', () => {
    const value = elements.llmHost.value.trim() || 'localhost';
    controller.saveSetting('llmHost', value);
  });

  elements.llmPort.addEventListener('change', () => {
    const port = parseInt(elements.llmPort.value);
    if (!isNaN(port) && port > 0 && port <= 65535) {
      controller.saveSetting('llmPort', port);
    }
  });

  elements.useRateLimit.addEventListener('change', () => {
    controller.saveSetting('useRateLimit', elements.useRateLimit.checked);
  });

  elements.rateLimit.addEventListener('change', () => {
    const limit = parseInt(elements.rateLimit.value, 10);
    if (!isNaN(limit) && limit >= 1 && limit <= 120) {
      controller.saveSetting('rateLimit', limit);
    }
  });

  elements.useCache.addEventListener('change', () => {
    controller.saveSetting('useCache', elements.useCache.checked);
  });

  elements.contextMode.addEventListener('change', () => {
    controller.saveSetting('contextMode', elements.contextMode.checked);
  });

  elements.contextChars.addEventListener('change', () => {
    const value = parseInt(elements.contextChars.value);
    if (!isNaN(value) && value >= 0) {
      controller.saveSetting('contextWindowChars', value);
    }
  });

  // Color preview click handlers
  elements.textColorPreview.addEventListener('click', () => {
    elements.textColor.click();
  });

  elements.bgColorPreview.addEventListener('click', () => {
    elements.bgColor.click();
  });

  // Cache and translations
  elements.clearCacheBtn.addEventListener('click', async () => {
    const originalText = elements.clearCacheBtn.textContent;
    await controller.clearCache();

    // Update button text based on result
    if (uiStateManager.getButtonText('clearCache')) {
      elements.clearCacheBtn.textContent = uiStateManager.getButtonText('clearCache');
    }
    elements.clearCacheBtn.disabled = uiStateManager.isButtonDisabled('clearCache');

    // Restore after delay if needed
    setTimeout(() => {
      elements.clearCacheBtn.textContent = originalText;
      elements.clearCacheBtn.disabled = false;
    }, 1600);
  });

  elements.clearTranslationsBtn.addEventListener('click', async () => {
    await controller.clearTranslations();
  });

  // Language management
  elements.saveLanguageBtn.addEventListener('click', async () => {
    const languageName = elements.newLanguageInput.value.trim();
    if (!languageName) {return;}

    const result = await controller.addLanguage(languageName);

    if (result.success) {
      elements.newLanguageInput.value = '';
      populateLanguages();
    } else {
      alert('Failed to add language: ' + result.error);
    }
  });

  elements.cancelLanguageBtn.addEventListener('click', () => {
    uiStateManager.hideForm();
    elements.addLanguageForm.classList.add('hidden');
    elements.newLanguageInput.value = '';
  });

  elements.newLanguageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      elements.saveLanguageBtn.click();
    }
  });
}

/**
 * Update screen visibility
 */
function updateScreens() {
  if (uiStateManager.isMainScreen()) {
    elements.mainScreen.classList.remove('hidden');
    elements.settingsScreen.classList.add('hidden');
  } else {
    elements.mainScreen.classList.add('hidden');
    elements.settingsScreen.classList.remove('hidden');
  }
}

/**
 * Populate settings UI
 */
function populateSettings() {
  const settings = controller.getCurrentSettings();
  if (!settings) {return;}

  // Set translator toggle state
  elements.translatorToggle.checked = settings.enabled || false;

  elements.sourceLang.value = settings.sourceLang || 'German';
  elements.targetLang.value = settings.targetLang || 'English';
  elements.displayMode.value = settings.displayMode || 'inline';
  elements.darkMode.checked = settings.darkMode === 'dark';
  elements.enableLogging.checked = settings.enableLogging !== false;
  elements.textColor.value = settings.translationTextColor || '#ffffff';
  elements.bgColor.value = settings.translationBgColor || '#333333';

  updateColorPreview(elements.textColorPreview, settings.translationTextColor || '#ffffff');
  updateColorPreview(elements.bgColorPreview, settings.translationBgColor || '#333333');

  const opacityPercent = Math.round((settings.translationBgOpacity || 0.9) * 100);
  elements.bgOpacity.value = opacityPercent;
  elements.bgOpacityValue.textContent = `${opacityPercent}%`;

  elements.llmHost.value = settings.llmHost || 'localhost';
  elements.llmPort.value = settings.llmPort || 1234;
  elements.useRateLimit.checked = settings.useRateLimit || false;
  elements.rateLimit.value = settings.rateLimit || 10;
  elements.useCache.checked = settings.useCache !== false;
  elements.contextMode.checked = settings.contextMode || false;
  elements.contextChars.value = settings.contextWindowChars || 200;
}

/**
 * Populate language dropdowns
 */
function populateLanguages() {
  const languages = controller.getLanguages();
  const settings = controller.getCurrentSettings();

  if (languages.length === 0) {return;}

  elements.sourceLang.innerHTML = '';
  elements.targetLang.innerHTML = '';

  languages.forEach(lang => {
    const option1 = document.createElement('option');
    option1.value = lang;
    option1.textContent = lang;
    elements.sourceLang.appendChild(option1);

    const option2 = document.createElement('option');
    option2.value = lang;
    option2.textContent = lang;
    elements.targetLang.appendChild(option2);
  });

  if (settings) {
    elements.sourceLang.value = settings.sourceLang || languages[0];
    elements.targetLang.value = settings.targetLang || languages[1] || languages[0];
  }

  renderLanguageList();
}

/**
 * Render language list
 */
function renderLanguageList() {
  const languages = controller.getLanguages();
  elements.languageList.innerHTML = '';

  // Add "Add Language" button
  const addItem = document.createElement('div');
  addItem.className = 'language-item add-language';
  addItem.textContent = '< Add Language >';
  addItem.addEventListener('click', () => {
    uiStateManager.showForm();
    elements.addLanguageForm.classList.remove('hidden');
    elements.newLanguageInput.focus();
  });
  elements.languageList.appendChild(addItem);

  // Add language items with delete buttons
  languages.forEach(lang => {
    const item = document.createElement('div');
    item.className = 'language-item';

    const langName = document.createElement('span');
    langName.className = 'language-name';
    langName.textContent = lang;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn delete';
    deleteBtn.title = `Delete ${lang}`;
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await handleDeleteLanguage(lang, item, langName);
    });

    item.appendChild(langName);
    item.appendChild(deleteBtn);
    elements.languageList.appendChild(item);
  });
}

/**
 * Handle delete language with confirmation
 */
async function handleDeleteLanguage(languageName, itemElement, langNameElement) {
  if (!uiStateManager.isPendingDelete(languageName)) {
    // First click: show confirmation
    if (uiStateManager.getPendingDelete()) {
      renderLanguageList(); // Reset any previous pending
    }

    uiStateManager.setPendingDelete(languageName);
    itemElement.classList.add('confirm-delete');
    langNameElement.textContent = 'CONFIRM';
    return;
  }

  // Second click: actually delete
  const result = await controller.removeLanguage(languageName);

  if (result.success) {
    uiStateManager.clearPendingDelete();
    populateLanguages();
  } else {
    alert('Failed to delete language: ' + result.error);
    renderLanguageList();
  }
}

/**
 * Update color preview
 */
function updateColorPreview(element, color) {
  element.style.backgroundColor = color;
}

/**
 * Apply dark mode to popup
 */
function applyDarkModeToPopup() {
  const settings = controller.getCurrentSettings();
  if (!settings) {return;}

  const isDark = settingsService.applyDarkMode(settings.darkMode);
  if (isDark) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

/**
 * Initialize popup
 */
async function initPopup() {
  await controller.initialize();

  applyDarkModeToPopup();
  populateSettings();
  populateLanguages();

  bindEvents();
}

// Start popup
initPopup();
