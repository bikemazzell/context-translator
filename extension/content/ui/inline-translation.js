/**
 * Inline translation display with adjacency merging
 */

import { CONFIG } from '../../shared/config.js';
import { isDarkMode } from '../../shared/utils.js';
import {
  applyCustomStyling,
  flattenTranslation,
  flattenTranslations,
  buildMergedTranslationText,
  haveSameParent,
  isWithinMergeLimit
} from '../../core/inline-translation-utils.js';

const inlineTranslations = [];

function enforceTranslationLimit() {
  if (inlineTranslations.length >= CONFIG.ui.maxActiveTranslations) {
    const oldest = inlineTranslations.shift();
    removeInlineTranslation(oldest);
  }
}

function wrapWordInElement(wordRange) {
  const wrapper = document.createElement('span');
  wrapper.className = 'ct-word-wrapper';

  const contents = wordRange.extractContents();
  wrapper.appendChild(contents);
  wordRange.insertNode(wrapper);

  return wrapper;
}

function createTranslationElement(translation, darkMode, styleSettings) {
  const inline = document.createElement('span');
  inline.className = 'ct-inline-translation';

  if (styleSettings) {
    applyCustomStyling(inline, styleSettings);
  } else if (isDarkMode(darkMode)) {
    inline.classList.add('ct-dark-mode');
  }

  inline.textContent = translation;

  return inline;
}

function attachRemoveHandler(element, inlineData) {
  element.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    removeInlineTranslation(inlineData);
  });
}

function tryMergeWithAdjacent(wrapper, originalText, translation, darkMode, styleSettings) {
  const adjacent = findAdjacentTranslations(wrapper);

  if (adjacent.left.length > 0 || adjacent.right.length > 0) {
    const currentTranslation = {
      wrapper: wrapper,
      element: null,
      text: originalText,
      translation: translation
    };

    return mergeTranslations(currentTranslation, adjacent.left, adjacent.right, darkMode, styleSettings);
  }

  return null;
}

/**
 * Show inline translation
 * @param {string} translation - Translation text
 * @param {Range} wordRange - Range of original word
 * @param {string} originalText - Original word text
 * @param {string} darkMode - Dark mode setting ('auto', 'light', 'dark')
 * @param {Object} styleSettings - Custom style settings (bgColor, textColor, bgOpacity)
 */
export function showInlineTranslation(translation, wordRange, originalText = '', darkMode = 'auto', styleSettings = null) {
  if (!translation || typeof translation !== 'string') {
    console.warn('[ContextTranslator] Invalid translation text provided to inline display');
    return;
  }

  enforceTranslationLimit();

  const encompassedTranslations = findEncompassedTranslations(wordRange);
  encompassedTranslations.forEach(t => removeInlineTranslation(t));

  let wrapper;
  try {
    wrapper = wrapWordInElement(wordRange);
  } catch (e) {
    console.error('[ContextTranslator] Failed to wrap word:', e);
    return;
  }

  const mergedData = tryMergeWithAdjacent(wrapper, originalText, translation, darkMode, styleSettings);
  if (mergedData) {
    return;
  }

  const inline = createTranslationElement(translation, darkMode, styleSettings);

  const inlineData = {
    wrapper,
    element: inline,
    text: originalText,
    translation: translation
  };

  attachRemoveHandler(inline, inlineData);

  wrapper.appendChild(inline);
  inlineTranslations.push(inlineData);
}

/**
 * Remove inline translation
 * @param {object} inlineData - Translation data
 */
export function removeInlineTranslation(inlineData) {
  if (inlineData.merged) {
    removeMergedTranslation(inlineData);
    return;
  }

  if (inlineData.wrapper) {
    const parent = inlineData.wrapper.parentNode;
    if (parent) {
      while (inlineData.wrapper.firstChild) {
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
    inlineData.element.parentElement.removeChild(inlineData.element);
  }

  const index = inlineTranslations.indexOf(inlineData);
  if (index > -1) {
    inlineTranslations.splice(index, 1);
  }
}

/**
 * Find translations encompassed by a range
 * @param {Range} range - Range to check
 * @returns {Array} Array of translation objects within the range
 */
function findEncompassedTranslations(range) {
  const encompassed = [];

  // Get all elements within the range
  const rangeContainer = range.commonAncestorContainer;
  const rangeContainerElement = rangeContainer.nodeType === Node.ELEMENT_NODE
    ? rangeContainer
    : rangeContainer.parentElement;

  if (!rangeContainerElement) return encompassed;

  // Find all translation wrappers in the document
  for (const translation of inlineTranslations) {
    if (!translation.wrapper || !translation.wrapper.parentNode) continue;

    // Check if the translation wrapper is within the range
    try {
      if (range.intersectsNode(translation.wrapper)) {
        // Additional check: ensure it's fully contained, not just intersecting
        const wrapperRange = document.createRange();
        wrapperRange.selectNode(translation.wrapper);

        // Check if wrapper is fully within the new range
        const fullyContained =
          range.compareBoundaryPoints(Range.START_TO_START, wrapperRange) <= 0 &&
          range.compareBoundaryPoints(Range.END_TO_END, wrapperRange) >= 0;

        if (fullyContained) {
          encompassed.push(translation);
        }
      }
    } catch (e) {
      // Range comparison can fail if nodes are not in the same tree
      continue;
    }
  }

  return encompassed;
}

/**
 * Find adjacent translations
 * Only considers translations adjacent if there's no meaningful text between them
 * @param {HTMLElement} newWrapper - New wrapper element
 * @returns {{left: Array, right: Array}}
 */
export function findAdjacentTranslations(newWrapper) {
  const adjacent = {
    left: [],
    right: []
  };

  // Check left side
  let current = newWrapper.previousSibling;
  let hasTextBetween = false;

  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE &&
        current.classList &&
        current.classList.contains('ct-word-wrapper')) {
      // Found a wrapper - only add if no text between
      if (!hasTextBetween) {
        const translation = inlineTranslations.find(t =>
          t.wrapper === current ||
          (t.mergedWrappers && t.mergedWrappers.includes(current))
        );
        if (translation && !adjacent.left.includes(translation)) {
          adjacent.left.unshift(translation);
          current = current.previousSibling;
          hasTextBetween = false; // Reset for next iteration
          continue;
        }
      }
      break;
    } else if (current.nodeType === Node.TEXT_NODE) {
      // Check if text node has meaningful content (not just whitespace)
      if (current.textContent.trim().length > 0) {
        hasTextBetween = true;
        break;
      }
      current = current.previousSibling;
      continue;
    } else if (current.nodeType === Node.ELEMENT_NODE) {
      // Other element node - not adjacent
      break;
    }
    current = current.previousSibling;
  }

  // Check right side
  current = newWrapper.nextSibling;
  hasTextBetween = false;

  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE &&
        current.classList &&
        current.classList.contains('ct-word-wrapper')) {
      // Found a wrapper - only add if no text between
      if (!hasTextBetween) {
        const translation = inlineTranslations.find(t =>
          t.wrapper === current ||
          (t.mergedWrappers && t.mergedWrappers.includes(current))
        );
        if (translation && !adjacent.right.includes(translation)) {
          adjacent.right.push(translation);
          current = current.nextSibling;
          hasTextBetween = false; // Reset for next iteration
          continue;
        }
      }
      break;
    } else if (current.nodeType === Node.TEXT_NODE) {
      // Check if text node has meaningful content (not just whitespace)
      if (current.textContent.trim().length > 0) {
        hasTextBetween = true;
        break;
      }
      current = current.nextSibling;
      continue;
    } else if (current.nodeType === Node.ELEMENT_NODE) {
      // Other element node - not adjacent
      break;
    }
    current = current.nextSibling;
  }

  return adjacent;
}

/**
 * Merge translations
 * @param {object} centerTranslation - Center translation
 * @param {Array} leftTranslations - Left translations
 * @param {Array} rightTranslations - Right translations
 * @param {string} darkMode - Dark mode setting ('auto', 'light', 'dark')
 * @param {Object} styleSettings - Custom style settings
 * @returns {object|null}
 */
export function mergeTranslations(centerTranslation, leftTranslations, rightTranslations, darkMode = 'auto', styleSettings = null) {
  const leftFlat = flattenTranslations(leftTranslations);
  const centerFlat = flattenTranslation(centerTranslation);
  const rightFlat = flattenTranslations(rightTranslations);

  const allTranslations = [...leftFlat, ...centerFlat, ...rightFlat];

  if (!isWithinMergeLimit(allTranslations.length, CONFIG.ui.maxMergeWords)) {
    return null;
  }

  if (!haveSameParent(allTranslations)) {
    return null;
  }

  [centerTranslation, ...leftTranslations, ...rightTranslations].forEach(t => {
    if (t.element && t.element.parentElement) {
      t.element.parentElement.removeChild(t.element);
    }
    const index = inlineTranslations.indexOf(t);
    if (index > -1) {
      inlineTranslations.splice(index, 1);
    }
  });

  const mergedText = buildMergedTranslationText(allTranslations);

  const firstWrapper = allTranslations[0].wrapper;

  const mergedElement = document.createElement('span');
  mergedElement.className = 'ct-inline-translation ct-merged-translation';

  // Apply custom styling if provided
  if (styleSettings) {
    applyCustomStyling(mergedElement, styleSettings);
  } else if (isDarkMode(darkMode)) {
    mergedElement.classList.add('ct-dark-mode');
  }

  mergedElement.textContent = mergedText;

  const mergedData = {
    wrapper: firstWrapper,
    element: mergedElement,
    translation: mergedText,
    merged: true,
    components: allTranslations.map(t => ({
      wrapper: t.wrapper,
      text: t.text,
      translation: t.translation
    })),
    mergedWrappers: allTranslations.map(t => t.wrapper)
  };

  mergedElement.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    removeMergedTranslation(mergedData);
  });

  firstWrapper.appendChild(mergedElement);
  inlineTranslations.push(mergedData);

  return mergedData;
}

/**
 * Remove merged translation
 * @param {object} mergedData - Merged translation data
 */
export function removeMergedTranslation(mergedData) {
  if (mergedData.element && mergedData.element.parentElement) {
    mergedData.element.parentElement.removeChild(mergedData.element);
  }

  if (mergedData.mergedWrappers) {
    mergedData.mergedWrappers.forEach(wrapper => {
      if (wrapper && wrapper.parentNode) {
        const parent = wrapper.parentNode;
        while (wrapper.firstChild) {
          const child = wrapper.firstChild;
          parent.insertBefore(child, wrapper);
        }
        parent.removeChild(wrapper);
      }
    });
  }

  const index = inlineTranslations.indexOf(mergedData);
  if (index > -1) {
    inlineTranslations.splice(index, 1);
  }
}

/**
 * Clear all translations
 */
export function clearAllInlineTranslations() {
  const translations = [...inlineTranslations];
  translations.forEach(t => removeInlineTranslation(t));
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', clearAllInlineTranslations);
  window.addEventListener('pagehide', clearAllInlineTranslations);
}
