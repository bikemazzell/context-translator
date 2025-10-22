/**
 * Popup script for Context Translator
 */

// Screen elements
const mainScreen = document.getElementById('main-screen');
const settingsScreen = document.getElementById('settings-screen');
const translatorToggle = document.getElementById('translator-toggle');
const settingsBtn = document.getElementById('settings-btn');
const backBtn = document.getElementById('back-btn');

// Setting controls
const settingSourceLang = document.getElementById('setting-source-lang');
const settingTargetLang = document.getElementById('setting-target-lang');
const settingDisplayMode = document.getElementById('setting-display-mode');
const settingDarkMode = document.getElementById('setting-dark-mode');
const settingEnableLogging = document.getElementById('setting-enable-logging');
const settingTextColor = document.getElementById('setting-text-color');
const settingBgColor = document.getElementById('setting-bg-color');
const settingBgOpacity = document.getElementById('setting-bg-opacity');
const settingLlmHost = document.getElementById('setting-llm-host');
const settingLlmPort = document.getElementById('setting-llm-port');
const settingUseRateLimit = document.getElementById('setting-use-rate-limit');
const settingRateLimit = document.getElementById('setting-rate-limit');
const settingUseCache = document.getElementById('setting-use-cache');
const settingContextMode = document.getElementById('setting-context-mode');
const settingContextChars = document.getElementById('setting-context-chars');
const clearCacheBtn = document.getElementById('clear-cache-btn');
const clearTranslationsBtn = document.getElementById('clear-translations-btn');

// Language management elements
const addLanguageForm = document.getElementById('add-language-form');
const newLanguageInput = document.getElementById('new-language-input');
const saveLanguageBtn = document.getElementById('save-language-btn');
const cancelLanguageBtn = document.getElementById('cancel-language-btn');
const languageList = document.getElementById('language-list');

// Preview elements
const textColorPreview = document.getElementById('text-color-preview');
const bgColorPreview = document.getElementById('bg-color-preview');
const bgOpacityValue = document.getElementById('bg-opacity-value');

let currentSettings = null;
let languages = [];
let pendingDeleteLanguage = null;

/**
 * Apply dark mode to popup based on settings
 */
async function applyDarkMode() {
  try {
    const stored = await browser.storage.local.get('settings');
    if (stored.settings && stored.settings.darkMode) {
      const darkMode = stored.settings.darkMode;
      const isDark = darkMode === 'dark' ||
        (darkMode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

      if (isDark) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    }
  } catch (error) {
    console.error('[ContextTranslator] Failed to apply dark mode:', error);
  }
}

/**
 * Load settings and languages from storage
 */
async function loadSettings() {
  try {
    const stored = await browser.storage.local.get('settings');
    if (stored.settings) {
      currentSettings = stored.settings;
    } else {
      // Use defaults
      currentSettings = {
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
        contextMode: false,
        contextWindowChars: 200
      };
    }

    // Load languages from background
    try {
      const response = await browser.runtime.sendMessage({ type: 'getLanguages' });
      if (response.success) {
        languages = response.data.languages;
        populateLanguages();
      }
    } catch (error) {
      console.error('[ContextTranslator] Failed to load languages:', error);
    }

    populateSettings();
  } catch (error) {
    console.error('[ContextTranslator] Failed to load settings:', error);
  }
}

/**
 * Populate language dropdowns
 */
function populateLanguages() {
  if (languages.length === 0) return;

  settingSourceLang.innerHTML = '';
  settingTargetLang.innerHTML = '';

  languages.forEach(lang => {
    const option1 = document.createElement('option');
    option1.value = lang;
    option1.textContent = lang;
    settingSourceLang.appendChild(option1);

    const option2 = document.createElement('option');
    option2.value = lang;
    option2.textContent = lang;
    settingTargetLang.appendChild(option2);
  });

  renderLanguageList();
}

/**
 * Render language list with add and delete buttons
 */
function renderLanguageList() {
  languageList.innerHTML = '';
  pendingDeleteLanguage = null;

  // Add the "<Add Language>" button as the first item
  const addItem = document.createElement('div');
  addItem.className = 'language-item add-language';
  addItem.textContent = '< Add Language >';
  addItem.addEventListener('click', showAddLanguageForm);
  languageList.appendChild(addItem);

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
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDeleteLanguage(lang, item);
    });

    item.appendChild(langName);
    item.appendChild(deleteBtn);
    languageList.appendChild(item);
  });
}

/**
 * Show add language form
 */
function showAddLanguageForm() {
  addLanguageForm.classList.remove('hidden');
  newLanguageInput.value = '';
  newLanguageInput.focus();
}

/**
 * Hide add language form
 */
function hideAddLanguageForm() {
  addLanguageForm.classList.add('hidden');
  newLanguageInput.value = '';
}

/**
 * Handle add language
 */
async function handleAddLanguage() {
  const languageName = newLanguageInput.value.trim();

  if (!languageName) {
    return;
  }

  try {
    saveLanguageBtn.disabled = true;
    const response = await browser.runtime.sendMessage({
      type: 'addLanguage',
      data: { language: languageName }
    });

    if (response.success) {
      languages = response.data.languages;
      populateLanguages();

      // Restore selected languages in dropdowns
      if (currentSettings) {
        settingSourceLang.value = currentSettings.sourceLang || languages[0];
        settingTargetLang.value = currentSettings.targetLang || languages[1] || languages[0];
      }

      hideAddLanguageForm();
    } else {
      alert('Failed to add language: ' + response.error);
    }
  } catch (error) {
    console.error('[ContextTranslator] Failed to add language:', error);
    alert('Failed to add language: ' + error.message);
  } finally {
    saveLanguageBtn.disabled = false;
  }
}

/**
 * Handle delete language with inline confirmation
 */
async function handleDeleteLanguage(languageName, itemElement) {
  // First click: show confirmation
  if (pendingDeleteLanguage !== languageName) {
    // Reset any previous pending delete
    if (pendingDeleteLanguage) {
      renderLanguageList();
    }

    // Mark this language for deletion
    pendingDeleteLanguage = languageName;
    itemElement.classList.add('confirm-delete');

    const langName = itemElement.querySelector('.language-name');
    langName.textContent = 'CONFIRM';

    return;
  }

  // Second click: actually delete
  try {
    const response = await browser.runtime.sendMessage({
      type: 'removeLanguage',
      data: { language: languageName }
    });

    if (response.success) {
      const previousSource = currentSettings.sourceLang;
      const previousTarget = currentSettings.targetLang;

      languages = response.data.languages;
      populateLanguages();

      // Restore selected languages, or use first available if deleted
      if (languages.includes(previousSource)) {
        settingSourceLang.value = previousSource;
      } else {
        settingSourceLang.value = languages[0];
        saveSetting('sourceLang', languages[0]);
      }

      if (languages.includes(previousTarget)) {
        settingTargetLang.value = previousTarget;
      } else {
        settingTargetLang.value = languages[1] || languages[0];
        saveSetting('targetLang', languages[1] || languages[0]);
      }
    } else {
      alert('Failed to delete language: ' + response.error);
      renderLanguageList();
    }
  } catch (error) {
    console.error('[ContextTranslator] Failed to delete language:', error);
    alert('Failed to delete language: ' + error.message);
    renderLanguageList();
  }
}

/**
 * Populate settings controls with current values
 */
function populateSettings() {
  if (!currentSettings) return;

  // Languages
  settingSourceLang.value = currentSettings.sourceLang || 'German';
  settingTargetLang.value = currentSettings.targetLang || 'English';

  // Display mode dropdown
  settingDisplayMode.value = currentSettings.displayMode || 'inline';

  // Dark mode toggle (convert 'dark'/'light'/'auto' to boolean)
  settingDarkMode.checked = currentSettings.darkMode === 'dark';

  // Logging toggle
  settingEnableLogging.checked = currentSettings.enableLogging !== false;

  // Color pickers
  settingTextColor.value = currentSettings.translationTextColor || '#ffffff';
  settingBgColor.value = currentSettings.translationBgColor || '#333333';
  updateColorPreview(textColorPreview, currentSettings.translationTextColor || '#ffffff');
  updateColorPreview(bgColorPreview, currentSettings.translationBgColor || '#333333');

  // Background opacity (convert 0-1 to 0-100)
  const opacityPercent = Math.round((currentSettings.translationBgOpacity || 0.9) * 100);
  settingBgOpacity.value = opacityPercent;
  bgOpacityValue.textContent = `${opacityPercent}%`;

  // LLM settings
  settingLlmHost.value = currentSettings.llmHost || 'localhost';
  settingLlmPort.value = currentSettings.llmPort || 1234;

  // Rate limiting settings
  settingUseRateLimit.checked = currentSettings.useRateLimit || false;
  settingRateLimit.value = currentSettings.rateLimit || 10;

  // Cache settings
  settingUseCache.checked = currentSettings.useCache !== false;

  // Context settings
  settingContextMode.checked = currentSettings.contextMode || false;
  settingContextChars.value = currentSettings.contextWindowChars || 200;
}

/**
 * Update color preview square
 */
function updateColorPreview(element, color) {
  element.style.backgroundColor = color;
}

/**
 * Save a setting
 */
async function saveSetting(key, value) {
  try {
    currentSettings[key] = value;
    await browser.storage.local.set({ settings: currentSettings });

    // Apply dark mode changes immediately to popup
    if (key === 'darkMode') {
      await applyDarkMode();
    }

    // Notify content script if it's active
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0) {
        await browser.tabs.sendMessage(tabs[0].id, {
          action: 'settingChanged',
          key: key,
          value: value
        });
      }
    } catch (error) {
      // Content script might not be loaded, that's ok
    }
  } catch (error) {
    console.error('[ContextTranslator] Failed to save setting:', error);
  }
}

/**
 * Check if translator is active
 */
async function checkTranslatorStatus() {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      const response = await browser.tabs.sendMessage(tabs[0].id, { action: 'getStatus' });
      if (response && response.isActive !== undefined) {
        translatorToggle.checked = response.isActive;
      }
    }
  } catch (error) {
    // Content script not loaded or page doesn't support it
    translatorToggle.checked = false;
  }
}

/**
 * Toggle translator (without showing settings screen)
 */
translatorToggle.addEventListener('change', async () => {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      await browser.tabs.sendMessage(tabs[0].id, { action: 'toggle' });
    }
  } catch (error) {
    console.error('[ContextTranslator] Failed to toggle:', error);
    // Revert toggle state
    translatorToggle.checked = !translatorToggle.checked;
  }
});

/**
 * Show settings screen
 */
settingsBtn.addEventListener('click', () => {
  mainScreen.classList.add('hidden');
  settingsScreen.classList.remove('hidden');
});

/**
 * Show main screen
 */
backBtn.addEventListener('click', () => {
  settingsScreen.classList.add('hidden');
  mainScreen.classList.remove('hidden');
});

/**
 * Language management event listeners
 */

// Save language button
saveLanguageBtn.addEventListener('click', handleAddLanguage);

// Cancel language button
cancelLanguageBtn.addEventListener('click', hideAddLanguageForm);

// Allow Enter key to save language
newLanguageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleAddLanguage();
  }
});

/**
 * Settings event listeners
 */

// Source language
settingSourceLang.addEventListener('change', () => {
  saveSetting('sourceLang', settingSourceLang.value);
});

// Target language
settingTargetLang.addEventListener('change', () => {
  saveSetting('targetLang', settingTargetLang.value);
});

// Display mode dropdown
settingDisplayMode.addEventListener('change', () => {
  saveSetting('displayMode', settingDisplayMode.value);
});

// Dark mode toggle
settingDarkMode.addEventListener('change', () => {
  const darkMode = settingDarkMode.checked ? 'dark' : 'light';
  saveSetting('darkMode', darkMode);
});

// Enable logging toggle
settingEnableLogging.addEventListener('change', () => {
  saveSetting('enableLogging', settingEnableLogging.checked);
});

// Text color picker
settingTextColor.addEventListener('input', () => {
  updateColorPreview(textColorPreview, settingTextColor.value);
  saveSetting('translationTextColor', settingTextColor.value);
});

// Background color picker
settingBgColor.addEventListener('input', () => {
  updateColorPreview(bgColorPreview, settingBgColor.value);
  saveSetting('translationBgColor', settingBgColor.value);
});

// Background opacity slider
settingBgOpacity.addEventListener('input', () => {
  const percent = parseInt(settingBgOpacity.value);
  bgOpacityValue.textContent = `${percent}%`;
  const opacity = percent / 100;
  saveSetting('translationBgOpacity', opacity);
});

// LLM host
settingLlmHost.addEventListener('change', () => {
  const value = settingLlmHost.value.trim() || 'localhost';
  saveSetting('llmHost', value);
});

// LLM port
settingLlmPort.addEventListener('change', () => {
  const port = parseInt(settingLlmPort.value);
  if (!isNaN(port) && port > 0 && port <= 65535) {
    saveSetting('llmPort', port);
  }
});

// Use rate limit toggle
settingUseRateLimit.addEventListener('change', () => {
  saveSetting('useRateLimit', settingUseRateLimit.checked);
});

// Rate limit number
settingRateLimit.addEventListener('change', () => {
  const limit = parseInt(settingRateLimit.value, 10);
  if (!isNaN(limit) && limit >= 1 && limit <= 120) {
    saveSetting('rateLimit', limit);
  }
});

// Use cache toggle
settingUseCache.addEventListener('change', () => {
  saveSetting('useCache', settingUseCache.checked);
});

// Clear cache button
clearCacheBtn.addEventListener('click', async () => {
  console.log('[ContextTranslator] Clear cache button clicked');

  // Disable button during operation
  const originalText = clearCacheBtn.textContent;
  clearCacheBtn.disabled = true;
  clearCacheBtn.textContent = 'Clearing...';

  try {
    const response = await browser.runtime.sendMessage({ type: 'clearCache' });
    if (response.success) {
      console.log('[ContextTranslator] Cache cleared successfully');
      clearCacheBtn.textContent = 'Cleared!';
      setTimeout(() => {
        clearCacheBtn.textContent = originalText;
        clearCacheBtn.disabled = false;
      }, 1500);
    } else {
      console.error('[ContextTranslator] Cache clear failed:', response.error);
      clearCacheBtn.textContent = 'Failed';
      setTimeout(() => {
        clearCacheBtn.textContent = originalText;
        clearCacheBtn.disabled = false;
      }, 1500);
    }
  } catch (error) {
    console.error('[ContextTranslator] Failed to clear cache:', error);
    clearCacheBtn.textContent = 'Error';
    setTimeout(() => {
      clearCacheBtn.textContent = originalText;
      clearCacheBtn.disabled = false;
    }, 1500);
  }
});

// Clear translations button
clearTranslationsBtn.addEventListener('click', async () => {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      await browser.tabs.sendMessage(tabs[0].id, { action: 'clearTranslations' });
    }
  } catch (error) {
    console.error('[ContextTranslator] Failed to clear translations:', error);
  }
});

// Context mode toggle
settingContextMode.addEventListener('change', () => {
  saveSetting('contextMode', settingContextMode.checked);
});

// Context window chars
settingContextChars.addEventListener('change', () => {
  const value = parseInt(settingContextChars.value);
  if (!isNaN(value) && value >= 0) {
    saveSetting('contextWindowChars', value);
  }
});

// Color preview click handlers (trigger color picker)
textColorPreview.addEventListener('click', () => {
  settingTextColor.click();
});

bgColorPreview.addEventListener('click', () => {
  settingBgColor.click();
});

/**
 * Initialize popup
 */
async function initialize() {
  await applyDarkMode();
  await loadSettings();
  await checkTranslatorStatus();
}

initialize();
