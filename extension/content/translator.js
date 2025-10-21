// Context Translator - Firefox Extension Content Script
// Injects translation functionality into web pages

(function() {
  'use strict';

  // Prevent double initialization
  if (window.contextTranslatorExtension) return;
  window.contextTranslatorExtension = true;

  // ============================================
  // CONFIGURATION & STATE
  // ============================================

  let settings = {
    sourceLang: 'German',
    targetLang: 'English',
    contextMode: false,
    contextWindowChars: 200,
    displayMode: 'inline', // 'inline' or 'tooltip'
    darkMode: 'auto', // 'auto', 'light', or 'dark'
    useCache: true,
    serverHost: 'localhost',
    serverPort: '8080',
    enabled: false
  };

  let isActive = false;
  let languages = [];
  let toolbar = null;
  let inlineTranslations = [];

  // ============================================
  // SETTINGS MANAGEMENT
  // ============================================

  async function loadSettings() {
    try {
      const stored = await browser.storage.local.get('settings');
      if (stored.settings) {
        // Merge stored settings with defaults (preserve new defaults)
        settings = { ...settings, ...stored.settings };
      }
    } catch (error) {
      console.error('[ContextTranslator] Failed to load settings:', error);
    }
  }

  async function saveSettings() {
    try {
      await browser.storage.local.set({ settings });
    } catch (error) {
      console.error('[ContextTranslator] Failed to save settings:', error);
    }
  }

  function getDarkMode() {
    if (settings.darkMode === 'dark') return true;
    if (settings.darkMode === 'light') return false;
    // Auto-detect
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // ============================================
  // TOOLBAR UI
  // ============================================

  function createToolbar() {
    if (toolbar) return;

    const isDark = getDarkMode();
    const bgColor = isDark ? '#1e1e1e' : '#ffffff';
    const textColor = isDark ? '#e0e0e0' : '#333333';
    const borderColor = isDark ? '#3a3a3a' : '#ddd';

    toolbar = document.createElement('div');
    toolbar.id = 'ct-toolbar';
    toolbar.style.cssText = `
      position: fixed !important;
      top: 10px !important;
      right: 10px !important;
      z-index: 2147483647 !important;
      background: ${bgColor} !important;
      color: ${textColor} !important;
      border: 2px solid ${borderColor} !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      font-size: 13px !important;
      padding: 12px !important;
      min-width: 280px !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    `;

    const inputStyle = `width: 100%; padding: 4px; margin-top: 2px; background: ${isDark ? '#2a2a2a' : '#fff'}; color: ${textColor}; border: 1px solid ${borderColor}; border-radius: 3px; font-size: 12px;`;
    const labelStyle = `font-size: 11px; color: ${isDark ? '#999' : '#666'}; display: block; margin-bottom: 2px;`;
    const sectionStyle = `margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid ${isDark ? '#333' : '#eee'};`;

    toolbar.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
        <span>Context Translator</span>
        <button id="ct-close" style="background: none; border: none; font-size: 20px; cursor: pointer; color: ${textColor}; padding: 0;">×</button>
      </div>

      <!-- Languages -->
      <div style="${sectionStyle}">
        <div style="margin-bottom: 6px;">
          <label style="${labelStyle}">From:</label>
          <select id="ct-source-lang" style="${inputStyle}"></select>
        </div>
        <div>
          <label style="${labelStyle}">To:</label>
          <select id="ct-target-lang" style="${inputStyle}"></select>
        </div>
      </div>

      <!-- Display Mode -->
      <div style="${sectionStyle}">
        <label style="${labelStyle}">Display:</label>
        <label style="display: inline-flex; align-items: center; cursor: pointer; margin-right: 12px;">
          <input type="radio" name="display-mode" value="inline" id="ct-display-inline" style="margin-right: 4px;">
          <span style="font-size: 12px;">Inline</span>
        </label>
        <label style="display: inline-flex; align-items: center; cursor: pointer;">
          <input type="radio" name="display-mode" value="tooltip" id="ct-display-tooltip" style="margin-right: 4px;">
          <span style="font-size: 12px;">Tooltip</span>
        </label>
      </div>

      <!-- Context -->
      <div style="${sectionStyle}">
        <label style="display: flex; align-items: center; cursor: pointer; margin-bottom: 6px;">
          <input type="checkbox" id="ct-context-mode" style="margin-right: 6px;">
          <span style="font-size: 12px; font-weight: 500;">Context Mode</span>
        </label>
        <label style="${labelStyle}">Context window (chars around word):</label>
        <input type="number" id="ct-context-window" min="50" max="1000" step="50" value="${settings.contextWindowChars}" style="${inputStyle}">
      </div>

      <!-- Cache -->
      <div style="${sectionStyle}">
        <label style="display: flex; align-items: center; cursor: pointer; margin-bottom: 6px;">
          <input type="checkbox" id="ct-use-cache" style="margin-right: 6px;">
          <span style="font-size: 12px; font-weight: 500;">Use Cache</span>
        </label>
        <button id="ct-clear-cache" style="width: 100%; padding: 5px; background: ${isDark ? '#3a3a3a' : '#f0f0f0'}; color: ${textColor}; border: 1px solid ${borderColor}; border-radius: 3px; cursor: pointer; font-size: 11px;">Clear Cache</button>
      </div>

      <!-- Server -->
      <div style="${sectionStyle}">
        <label style="${labelStyle}">Server Host:</label>
        <input type="text" id="ct-server-host" value="${settings.serverHost}" placeholder="localhost" style="${inputStyle}">
        <label style="${labelStyle} margin-top: 6px;">Server Port:</label>
        <input type="text" id="ct-server-port" value="${settings.serverPort}" placeholder="8080" style="${inputStyle}">
      </div>

      <!-- Other Settings -->
      <div style="margin-bottom: 8px;">
        <label style="display: inline-flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="ct-dark-mode" style="margin-right: 6px;">
          <span style="font-size: 12px;">Dark Mode</span>
        </label>
      </div>

      <button id="ct-clear" style="width: 100%; padding: 6px; background: ${isDark ? '#3a3a3a' : '#f0f0f0'}; color: ${textColor}; border: 1px solid ${borderColor}; border-radius: 4px; cursor: pointer; font-size: 12px;">Clear Translations</button>
    `;

    document.body.appendChild(toolbar);

    // Populate language dropdowns
    populateLanguages();

    // Wire up event handlers
    toolbar.querySelector('#ct-close').addEventListener('click', deactivate);

    toolbar.querySelector('#ct-source-lang').addEventListener('change', (e) => {
      settings.sourceLang = e.target.value;
      saveSettings();
    });

    toolbar.querySelector('#ct-target-lang').addEventListener('change', (e) => {
      settings.targetLang = e.target.value;
      saveSettings();
    });

    toolbar.querySelector('#ct-context-mode').addEventListener('change', (e) => {
      settings.contextMode = e.target.checked;
      saveSettings();
    });

    toolbar.querySelector('#ct-context-window').addEventListener('change', (e) => {
      const value = parseInt(e.target.value, 10);
      if (value >= 50 && value <= 1000) {
        settings.contextWindowChars = value;
        saveSettings();
      }
    });

    toolbar.querySelector('#ct-use-cache').addEventListener('change', (e) => {
      settings.useCache = e.target.checked;
      saveSettings();
    });

    toolbar.querySelector('#ct-clear-cache').addEventListener('click', async () => {
      try {
        const response = await sendMessage({ type: 'clearCache' });
        if (response.success) {
          showToast('Cache cleared successfully', 'success');
        } else {
          showToast('Failed to clear cache', 'error');
        }
      } catch (error) {
        console.error('[ContextTranslator] Failed to clear cache:', error);
        showToast('Failed to clear cache', 'error');
      }
    });

    toolbar.querySelector('#ct-server-host').addEventListener('change', (e) => {
      settings.serverHost = e.target.value.trim() || 'localhost';
      saveSettings();
    });

    toolbar.querySelector('#ct-server-port').addEventListener('change', (e) => {
      settings.serverPort = e.target.value.trim() || '8080';
      saveSettings();
    });

    toolbar.querySelector('#ct-dark-mode').addEventListener('change', (e) => {
      settings.darkMode = e.target.checked ? 'dark' : 'light';
      saveSettings();
      refreshUI();
    });

    toolbar.querySelectorAll('input[name="display-mode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          settings.displayMode = e.target.value;
          saveSettings();
          clearAllTranslations();
        }
      });
    });

    toolbar.querySelector('#ct-clear').addEventListener('click', clearAllTranslations);

    // Set current values
    toolbar.querySelector('#ct-context-mode').checked = settings.contextMode;
    toolbar.querySelector('#ct-context-window').value = settings.contextWindowChars;
    toolbar.querySelector('#ct-use-cache').checked = settings.useCache;
    toolbar.querySelector('#ct-server-host').value = settings.serverHost;
    toolbar.querySelector('#ct-server-port').value = settings.serverPort;
    toolbar.querySelector('#ct-dark-mode').checked = getDarkMode();
    toolbar.querySelector(`#ct-display-${settings.displayMode}`).checked = true;
  }

  function populateLanguages() {
    const sourceSelect = toolbar.querySelector('#ct-source-lang');
    const targetSelect = toolbar.querySelector('#ct-target-lang');

    languages.forEach(lang => {
      const option1 = document.createElement('option');
      option1.value = lang;
      option1.textContent = lang;
      if (lang === settings.sourceLang) option1.selected = true;
      sourceSelect.appendChild(option1);

      const option2 = document.createElement('option');
      option2.value = lang;
      option2.textContent = lang;
      if (lang === settings.targetLang) option2.selected = true;
      targetSelect.appendChild(option2);
    });
  }

  function removeToolbar() {
    if (toolbar && toolbar.parentElement) {
      toolbar.parentElement.removeChild(toolbar);
      toolbar = null;
    }
  }

  function refreshUI() {
    // Refresh toolbar and translation colors
    if (toolbar) {
      removeToolbar();
      createToolbar();
    }
  }

  function clearAllTranslations() {
    inlineTranslations.forEach(data => {
      if (data.wrapper) {
        removeInlineTranslation(data);
      } else if (data.element && data.element.parentElement) {
        data.element.parentElement.removeChild(data.element);
      }
    });
    inlineTranslations = [];
    removeTooltip();
  }

  function showToast(message, type = 'info') {
    const isDark = getDarkMode();
    const colors = {
      info: '#2196F3',
      success: '#4CAF50',
      error: '#f44336'
    };

    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed !important;
      top: 80px !important;
      right: 20px !important;
      z-index: 2147483647 !important;
      background: ${colors[type]} !important;
      color: white !important;
      padding: 12px 20px !important;
      border-radius: 4px !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3) !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      font-size: 14px !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      animation: ct-toast-in 0.3s ease-out !important;
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, 3000);
  }

  // ============================================
  // TRANSLATION DISPLAY
  // ============================================

  function showTranslation(translation, x, y, cached, wordRange) {
    if (settings.displayMode === 'inline' && wordRange) {
      showInlineTranslation(translation, cached, wordRange);
    } else {
      showTooltipTranslation(translation, x, y, cached);
    }
  }

  function showInlineTranslation(translation, cached, wordRange) {
    const isDark = getDarkMode();

    const bgColor = isDark ? '#1a2332' : '#e8f4f8';
    const textColor = isDark ? '#64b5f6' : '#01579b';
    const borderColor = isDark ? '#42a5f5' : '#0288d1';

    // Create wrapper around the original word
    const wrapper = document.createElement('span');
    wrapper.className = 'ct-word-wrapper';
    wrapper.style.cssText = `
      position: relative !important;
      display: inline !important;
    `;

    // Wrap the selected range
    try {
      wordRange.surroundContents(wrapper);
    } catch (e) {
      // If wrapping fails (e.g., range spans multiple elements), fall back to absolute positioning
      console.error('[ContextTranslator] Failed to wrap word:', e);
      showInlineTranslationAbsolute(translation, wordRange);
      return;
    }

    // Create translation element
    const inline = document.createElement('span');
    inline.className = 'ct-inline-translation';
    inline.style.cssText = `
      position: absolute !important;
      left: 0 !important;
      bottom: 100% !important;
      margin-bottom: 4px !important;
      background: ${bgColor} !important;
      border: 2px solid ${borderColor} !important;
      border-radius: 4px !important;
      padding: 6px 10px !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      font-size: 14px !important;
      color: ${textColor} !important;
      cursor: pointer !important;
      animation: ct-inline-in 0.2s ease-out !important;
      z-index: 2147483647 !important;
      white-space: nowrap !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
    `;

    const text = document.createElement('span');
    text.textContent = translation;
    text.style.cssText = `font-weight: 600 !important; font-size: 14px !important; color: ${textColor} !important;`;
    inline.appendChild(text);

    const inlineData = { wrapper, element: inline };

    inline.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      removeInlineTranslation(inlineData);
    });

    wrapper.appendChild(inline);
    inlineTranslations.push(inlineData);
  }

  // Fallback for when wrapping fails
  function showInlineTranslationAbsolute(translation, wordRange) {
    const rect = wordRange.getBoundingClientRect();
    const isDark = getDarkMode();

    const bgColor = isDark ? '#1a2332' : '#e8f4f8';
    const textColor = isDark ? '#64b5f6' : '#01579b';
    const borderColor = isDark ? '#42a5f5' : '#0288d1';

    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    const left = rect.left + scrollX;
    const top = rect.top + scrollY - 30;

    const inline = document.createElement('div');
    inline.className = 'ct-inline-translation-absolute';
    inline.style.cssText = `
      position: absolute !important;
      left: ${left}px !important;
      top: ${top}px !important;
      background: ${bgColor} !important;
      border: 2px solid ${borderColor} !important;
      border-radius: 4px !important;
      padding: 6px 10px !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      font-size: 14px !important;
      color: ${textColor} !important;
      cursor: pointer !important;
      animation: ct-inline-in 0.2s ease-out !important;
      z-index: 2147483647 !important;
      white-space: nowrap !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
    `;

    const text = document.createElement('span');
    text.textContent = translation;
    text.style.cssText = `font-weight: 600 !important; font-size: 14px !important; color: ${textColor} !important;`;
    inline.appendChild(text);

    const inlineData = { element: inline, isAbsolute: true };

    inline.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      removeInlineTranslation(inlineData);
    });

    document.body.appendChild(inline);
    inlineTranslations.push(inlineData);
  }

  function removeInlineTranslation(inlineData) {
    if (inlineData.wrapper) {
      // Unwrap the word - move children back to parent
      const parent = inlineData.wrapper.parentNode;
      if (parent) {
        while (inlineData.wrapper.firstChild) {
          // Skip the translation element when unwrapping
          const child = inlineData.wrapper.firstChild;
          if (child === inlineData.element) {
            inlineData.wrapper.removeChild(child);
          } else {
            parent.insertBefore(child, inlineData.wrapper);
          }
        }
        parent.removeChild(inlineData.wrapper);
      }
    } else if (inlineData.element && inlineData.element.parentElement) {
      // Absolute positioned element
      inlineData.element.parentElement.removeChild(inlineData.element);
    }

    const index = inlineTranslations.indexOf(inlineData);
    if (index > -1) {
      inlineTranslations.splice(index, 1);
    }
  }

  function findInlineByPosition(rect) {
    const threshold = 5;
    return inlineTranslations.find(t => {
      if (t.wrapper) {
        // For wrapped translations, check if clicking same wrapper
        const wrapperRect = t.wrapper.getBoundingClientRect();
        return Math.abs(wrapperRect.left - rect.left) < threshold &&
               Math.abs(wrapperRect.top - rect.top) < threshold;
      }
      return false;
    }) || null;
  }

  function showTooltipTranslation(translation, x, y, cached) {
    removeTooltip();

    const isDark = getDarkMode();
    const bgColor = isDark ? '#2a2a2a' : '#fff';
    const textColor = isDark ? '#e0e0e0' : '#333';
    const borderColor = isDark ? '#42a5f5' : '#0288d1';

    const popup = document.createElement('div');
    popup.id = 'ct-translation-popup';
    popup.style.cssText = `
      position: fixed !important;
      left: ${x}px !important;
      top: ${y + 20}px !important;
      z-index: 2147483647 !important;
      background: ${bgColor} !important;
      border: 2px solid ${borderColor} !important;
      border-radius: 6px !important;
      padding: 12px 16px !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3) !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      font-size: 15px !important;
      font-weight: 500 !important;
      max-width: 300px !important;
      word-wrap: break-word !important;
      animation: ct-popup-in 0.2s ease-out !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    `;

    const text = document.createElement('div');
    text.textContent = translation;
    text.style.cssText = `color: ${textColor} !important; font-size: 15px !important; font-weight: 600 !important;`;
    popup.appendChild(text);

    document.body.appendChild(popup);

    // Auto-remove on click outside or scroll
    const removeOnClickOutside = (e) => {
      if (!popup.contains(e.target)) {
        removeTooltip();
        document.removeEventListener('click', removeOnClickOutside);
      }
    };
    const removeOnScroll = () => {
      removeTooltip();
      document.removeEventListener('scroll', removeOnScroll, true);
    };

    setTimeout(() => {
      document.addEventListener('click', removeOnClickOutside);
      document.addEventListener('scroll', removeOnScroll, true);
    }, 100);
  }

  function removeTooltip() {
    const popup = document.getElementById('ct-translation-popup');
    if (popup && popup.parentElement) {
      popup.parentElement.removeChild(popup);
    }
  }

  // ============================================
  // API COMMUNICATION
  // ============================================

  async function sendMessage(message) {
    return new Promise((resolve, reject) => {
      browser.runtime.sendMessage(message, (response) => {
        if (browser.runtime.lastError) {
          reject(new Error(browser.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  async function translate(text, node, x, y, wordRange) {
    if (text.length > 500) {
      return; // Silently ignore
    }

    // Check if inline translation already exists
    if (settings.displayMode === 'inline' && wordRange) {
      const rect = wordRange.getBoundingClientRect();
      const existing = findInlineByPosition(rect);
      if (existing) {
        removeInlineTranslation(existing);
        return;
      }
    }

    // Get context if enabled
    let context = null;
    if (settings.contextMode && node) {
      context = extractContext(node, settings.contextWindowChars);
    }

    try {
      const response = await sendMessage({
        type: 'translate',
        data: {
          text,
          source_lang: settings.sourceLang,
          target_lang: settings.targetLang,
          context,
          use_cache: settings.useCache
        }
      });

      if (response.success) {
        showTranslation(response.data.translation, x, y, response.data.cached, wordRange);
      }
    } catch (error) {
      // Silently fail - don't spam user with errors
      console.error('[ContextTranslator] Translation error:', error);
    }
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  let clickHandler = null;

  function attachClickHandler() {
    clickHandler = async (event) => {
      if (!isActive) return;

      const target = event.target;

      // Handle clicks on toolbar - do nothing
      if (target.closest('#ct-toolbar')) {
        return;
      }

      // Handle clicks on inline translations - remove them
      const inlineElement = target.closest('.ct-inline-translation');
      if (inlineElement) {
        event.preventDefault();
        event.stopPropagation();
        // Find and remove this inline translation
        const inlineData = inlineTranslations.find(t => t.element === inlineElement);
        if (inlineData) {
          removeInlineTranslation(inlineData);
        }
        return;
      }

      // Handle clicks on tooltips - remove them
      if (target.closest('#ct-translation-popup')) {
        event.preventDefault();
        event.stopPropagation();
        removeTooltip();
        return;
      }

      // Handle clicks on wrapped words - prevent translation
      if (target.closest('.ct-word-wrapper')) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      // Check for text selection
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();

      if (selectedText && selectedText.length > 0) {
        const range = selection.getRangeAt(0);
        await translate(selectedText, range.startContainer, event.clientX, event.clientY, range);
        return;
      }

      // Get word at click point
      const result = getTextAtPoint(event.clientX, event.clientY);
      if (result && result.text) {
        await translate(result.text, result.node, event.clientX, event.clientY, result.range);
      }
    };

    document.addEventListener('click', clickHandler, true);
  }

  function detachClickHandler() {
    if (clickHandler) {
      document.removeEventListener('click', clickHandler, true);
      clickHandler = null;
    }
  }

  function getTextAtPoint(x, y) {
    let node = null;
    let offset = 0;

    if (document.caretRangeFromPoint) {
      const range = document.caretRangeFromPoint(x, y);
      if (!range) return null;
      node = range.startContainer;
      offset = range.startOffset;
    } else if (document.caretPositionFromPoint) {
      const position = document.caretPositionFromPoint(x, y);
      if (!position) return null;
      node = position.offsetNode;
      offset = position.offset;
    } else {
      return null;
    }

    if (!node) return null;

    const textContent = node.textContent;
    if (!textContent) return null;

    const wordInfo = extractWordAtOffset(textContent, offset);
    if (!wordInfo) return null;

    const range = document.createRange();
    range.setStart(node, wordInfo.start);
    range.setEnd(node, wordInfo.end);

    return { text: wordInfo.text, node, range };
  }

  function extractWordAtOffset(text, offset) {
    const wordBoundary = /[\s.,!?;:()\[\]{}"'«»„""'']/;

    let start = offset;
    while (start > 0 && !wordBoundary.test(text[start - 1])) {
      start--;
    }

    let end = offset;
    while (end < text.length && !wordBoundary.test(text[end])) {
      end++;
    }

    const word = text.substring(start, end).trim();
    if (!word) return null;

    return { text: word, start, end };
  }

  function extractContext(node, windowSize) {
    const textNode = node.nodeType === Node.TEXT_NODE ? node : findTextNode(node);
    if (!textNode || !textNode.textContent) return '';

    const parent = textNode.parentElement;
    if (!parent) return textNode.textContent.substring(0, windowSize);

    const fullText = parent.textContent || parent.innerText || '';
    const startOffset = Math.max(0, fullText.indexOf(textNode.textContent));
    const contextStart = Math.max(0, startOffset - Math.floor(windowSize / 2));
    const contextEnd = Math.min(fullText.length, startOffset + Math.ceil(windowSize / 2));

    return fullText.substring(contextStart, contextEnd).trim();
  }

  function findTextNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return node;
    if (node.nodeType === Node.ELEMENT_NODE) {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      return walker.nextNode();
    }
    return null;
  }

  // ============================================
  // ACTIVATION / DEACTIVATION
  // ============================================

  function activate() {
    isActive = true;
    settings.enabled = true;
    saveSettings();

    createToolbar();
    attachClickHandler();
  }

  function deactivate() {
    isActive = false;
    settings.enabled = false;
    saveSettings();

    removeToolbar();
    detachClickHandler();
    clearAllTranslations();
  }

  function toggleTranslator() {
    if (isActive) {
      deactivate();
    } else {
      activate();
    }
  }

  // ============================================
  // STYLES
  // ============================================

  function injectStyles() {
    if (document.getElementById('ct-styles')) return;

    const style = document.createElement('style');
    style.id = 'ct-styles';
    style.textContent = `
      @keyframes ct-popup-in {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes ct-inline-in {
        from { opacity: 0; transform: translateX(-10px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes ct-toast-in {
        from { opacity: 0; transform: translateX(100%); }
        to { opacity: 1; transform: translateX(0); }
      }
      .ct-inline-translation:hover {
        opacity: 0.8 !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  async function initialize() {
    await loadSettings();

    // Check backend health
    try {
      const response = await sendMessage({ type: 'checkHealth' });
      if (!response.success) {
        console.error('[ContextTranslator] Backend unhealthy');
      }
    } catch (error) {
      console.error('[ContextTranslator] Backend check failed:', error);
    }

    // Get languages
    try {
      const response = await sendMessage({ type: 'getLanguages' });
      if (response.success) {
        languages = response.data.languages;
      }
    } catch (error) {
      console.error('[ContextTranslator] Failed to load languages:', error);
      languages = ['English', 'German', 'French', 'Spanish', 'Italian'];
    }

    // Inject styles
    injectStyles();

    // Listen for toggle message from popup
    browser.runtime.onMessage.addListener((message) => {
      if (message.action === 'toggle') {
        toggleTranslator();
      }
    });
  }

  // Start initialization
  initialize();

})();
