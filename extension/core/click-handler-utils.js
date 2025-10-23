/**
 * Utility functions for click handling logic
 */

/**
 * Check if a click target should be ignored
 * @param {HTMLElement} target - The click target element
 * @returns {boolean} True if target should be ignored
 */
export function shouldIgnoreTarget(target) {
  if (!target) {
    return true;
  }

  // Ignore clicks on toolbar
  if (target.closest('#ct-toolbar')) {
    return true;
  }

  // Ignore clicks on inline translations
  if (target.closest('.ct-inline-translation')) {
    return true;
  }

  // Ignore clicks on translation popup
  if (target.closest('#ct-translation-popup')) {
    return true;
  }

  // Ignore clicks on word wrappers (but these need special handling)
  if (target.closest('.ct-word-wrapper')) {
    return true;
  }

  return false;
}

/**
 * Check if a click target is a word wrapper (needs preventDefault)
 * @param {HTMLElement} target - The click target element
 * @returns {boolean} True if target is a word wrapper
 */
export function isWordWrapper(target) {
  if (!target) {
    return false;
  }
  return !!target.closest('.ct-word-wrapper');
}

/**
 * Get selected text from window selection
 * @param {Selection} selection - The window selection object
 * @returns {string|null} The selected text or null if none
 */
export function getSelectedText(selection) {
  if (!selection) {
    return null;
  }

  const text = selection.toString().trim();
  return text.length > 0 ? text : null;
}

/**
 * Extract translation request data from selection
 * @param {Selection} selection - The window selection object
 * @param {Function} extractContextFromRange - Function to extract context from range
 * @param {number} contextWindowSize - Size of context window
 * @returns {Object|null} Translation request data or null
 */
export function extractSelectionData(selection, extractContextFromRange, contextWindowSize) {
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const text = getSelectedText(selection);
  if (!text) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const context = extractContextFromRange(range, contextWindowSize);

  return {
    text,
    context,
    range
  };
}

/**
 * Extract translation request data from point
 * @param {number} clientX - X coordinate
 * @param {number} clientY - Y coordinate
 * @param {Function} extractWordAtPoint - Function to extract word at point
 * @param {Function} extractContext - Function to extract context from node
 * @param {number} contextWindowSize - Size of context window
 * @returns {Object|null} Translation request data or null
 */
export function extractPointData(clientX, clientY, extractWordAtPoint, extractContext, contextWindowSize) {
  const result = extractWordAtPoint(clientX, clientY);

  if (!result || !result.text) {
    return null;
  }

  const context = extractContext(result.node, contextWindowSize);

  return {
    text: result.text,
    context,
    range: result.range
  };
}
