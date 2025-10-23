/**
 * Click event handler
 */

import { extractWordAtPoint, extractContext, extractContextFromRange } from './text-extraction.js';
import { settingsManager } from '../../shared/settings-manager.js';
import {
  shouldIgnoreTarget,
  isWordWrapper,
  extractSelectionData,
  extractPointData
} from '../../core/click-handler-utils.js';

let clickHandler = null;
let onTranslateCallback = null;
let isActive = false;
let attachedDocument = null;

/**
 * Attach click handler
 * @param {Function} onTranslateRequest - Callback for translation requests
 * @param {Object} dependencies - Optional dependencies for testing
 */
export function attachClickHandler(onTranslateRequest, dependencies = {}) {
  if (clickHandler) {
    detachClickHandler();
  }

  // Use injected dependencies or defaults
  const {
    settingsManager: settings = settingsManager,
    getSelection = () => window.getSelection(),
    extractWordAtPointFn = extractWordAtPoint,
    extractContextFn = extractContext,
    extractContextFromRangeFn = extractContextFromRange,
    document: doc = document
  } = dependencies;

  onTranslateCallback = onTranslateRequest;
  isActive = true;
  attachedDocument = doc;

  clickHandler = async (event) => {
    if (!isActive) return;

    const target = event.target;

    // Check if target should be ignored
    if (shouldIgnoreTarget(target)) {
      // Word wrappers need special handling
      if (isWordWrapper(target)) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    // Get context window size from user settings
    const contextWindowSize = settings.get('contextWindowChars') || 200;

    // Try to extract from selection first
    const selection = getSelection();
    const selectionData = extractSelectionData(
      selection,
      extractContextFromRangeFn,
      contextWindowSize
    );

    if (selectionData) {
      if (onTranslateCallback) {
        try {
          await onTranslateCallback(
            selectionData.text,
            selectionData.context,
            selectionData.range,
            event.clientX,
            event.clientY
          );
        } catch (error) {
          // Callback errors are handled by the callback itself
          // Don't propagate to prevent unhandled promise rejections
        }
      }
      return;
    }

    // Fall back to extracting word at point
    const pointData = extractPointData(
      event.clientX,
      event.clientY,
      extractWordAtPointFn,
      extractContextFn,
      contextWindowSize
    );

    if (pointData && onTranslateCallback) {
      try {
        await onTranslateCallback(
          pointData.text,
          pointData.context,
          pointData.range,
          event.clientX,
          event.clientY
        );
      } catch (error) {
        // Callback errors are handled by the callback itself
        // Don't propagate to prevent unhandled promise rejections
      }
    }
  };

  doc.addEventListener('click', clickHandler, true);
}

/**
 * Detach click handler
 */
export function detachClickHandler() {
  if (clickHandler && attachedDocument) {
    attachedDocument.removeEventListener('click', clickHandler, true);
    clickHandler = null;
  }
  isActive = false;
  onTranslateCallback = null;
  attachedDocument = null;
}
