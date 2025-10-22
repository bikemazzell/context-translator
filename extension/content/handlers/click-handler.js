/**
 * Click event handler
 */

import { extractWordAtPoint, extractContext, extractContextFromRange } from './text-extraction.js';
import { settingsManager } from '../../shared/settings-manager.js';

let clickHandler = null;
let onTranslateCallback = null;
let isActive = false;

/**
 * Attach click handler
 * @param {Function} onTranslateRequest - Callback for translation requests
 */
export function attachClickHandler(onTranslateRequest) {
  if (clickHandler) {
    detachClickHandler();
  }

  onTranslateCallback = onTranslateRequest;
  isActive = true;

  clickHandler = async (event) => {
    if (!isActive) return;

    const target = event.target;

    if (target.closest('#ct-toolbar')) {
      return;
    }

    if (target.closest('.ct-inline-translation')) {
      return;
    }

    if (target.closest('#ct-translation-popup')) {
      return;
    }

    if (target.closest('.ct-word-wrapper')) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    // Get context window size from user settings
    const contextWindowSize = settingsManager.get('contextWindowChars') || 200;

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText && selectedText.length > 0) {
      const range = selection.getRangeAt(0);
      const context = extractContextFromRange(range, contextWindowSize);

      if (onTranslateCallback) {
        await onTranslateCallback(selectedText, context, range, event.clientX, event.clientY);
      }
      return;
    }

    const result = extractWordAtPoint(event.clientX, event.clientY);
    if (result && result.text) {
      const context = extractContext(result.node, contextWindowSize);

      if (onTranslateCallback) {
        await onTranslateCallback(result.text, context, result.range, event.clientX, event.clientY);
      }
    }
  };

  document.addEventListener('click', clickHandler, true);
}

/**
 * Detach click handler
 */
export function detachClickHandler() {
  if (clickHandler) {
    document.removeEventListener('click', clickHandler, true);
    clickHandler = null;
  }
  isActive = false;
  onTranslateCallback = null;
}
