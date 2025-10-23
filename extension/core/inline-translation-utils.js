/**
 * Inline Translation Utilities
 * Pure functions extracted from inline-translation.js for testability
 */

/**
 * Convert hex color to RGB
 * @param {string} hex - Hex color code
 * @returns {Object} RGB values {r, g, b}
 */
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 51, g: 51, b: 51 }; // fallback to #333333
}

/**
 * Apply custom styling to element
 * @param {HTMLElement} element - Element to style
 * @param {Object} styleSettings - Style settings
 * @returns {void}
 */
export function applyCustomStyling(element, styleSettings) {
  if (!element || !styleSettings) return;

  if (styleSettings.translationBgColor) {
    const rgb = hexToRgb(styleSettings.translationBgColor);
    const opacity = styleSettings.translationBgOpacity !== undefined
      ? styleSettings.translationBgOpacity
      : 0.9;
    element.style.setProperty('background', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`, 'important');
  }

  if (styleSettings.translationTextColor) {
    element.style.setProperty('color', styleSettings.translationTextColor, 'important');
  }

  // Remove border for custom styling to make it cleaner
  element.style.setProperty('border', 'none', 'important');
}

/**
 * Check if translations should be merged
 * @param {Array} leftTranslations - Left adjacent translations
 * @param {Array} rightTranslations - Right adjacent translations
 * @returns {boolean} Whether to merge
 */
export function shouldMergeTranslations(leftTranslations, rightTranslations) {
  const hasLeft = leftTranslations && leftTranslations.length > 0;
  const hasRight = rightTranslations && rightTranslations.length > 0;
  return !!(hasLeft || hasRight);
}

/**
 * Build merged translation text
 * @param {Object} centerTranslation - Center translation
 * @param {Array} leftTranslations - Left translations
 * @param {Array} rightTranslations - Right translations
 * @returns {string} Merged text
 */
export function buildMergedText(centerTranslation, leftTranslations, rightTranslations) {
  let mergedOriginal = '';
  let mergedTranslation = '';

  // Add left translations
  if (leftTranslations) {
    leftTranslations.forEach(t => {
      mergedOriginal += t.text + ' ';
      mergedTranslation += t.translation + ' ';
    });
  }

  // Add center
  if (centerTranslation) {
    mergedOriginal += centerTranslation.text;
    mergedTranslation += centerTranslation.translation;
  }

  // Add right translations
  if (rightTranslations) {
    rightTranslations.forEach(t => {
      mergedOriginal += ' ' + t.text;
      mergedTranslation += ' ' + t.translation;
    });
  }

  return {
    original: mergedOriginal.trim(),
    translation: mergedTranslation.trim()
  };
}

/**
 * Validate style settings
 * @param {Object} styleSettings - Style settings to validate
 * @returns {boolean} Whether settings are valid
 */
export function validateStyleSettings(styleSettings) {
  if (!styleSettings || typeof styleSettings !== 'object') {
    return false;
  }

  // Check if has at least one valid style property
  const hasValidBgColor = styleSettings.translationBgColor &&
                          typeof styleSettings.translationBgColor === 'string';
  const hasValidTextColor = styleSettings.translationTextColor &&
                            typeof styleSettings.translationTextColor === 'string';
  const hasValidOpacity = styleSettings.translationBgOpacity !== undefined &&
                          typeof styleSettings.translationBgOpacity === 'number' &&
                          styleSettings.translationBgOpacity >= 0 &&
                          styleSettings.translationBgOpacity <= 1;

  return hasValidBgColor || hasValidTextColor || hasValidOpacity;
}

/**
 * Normalize hex color
 * @param {string} hex - Hex color
 * @returns {string} Normalized hex color with #
 */
export function normalizeHexColor(hex) {
  if (!hex || typeof hex !== 'string') {
    return '#333333';
  }

  // Remove # if present
  const cleaned = hex.replace(/^#/, '');

  // Validate hex format
  if (!/^[a-f0-9]{6}$/i.test(cleaned)) {
    return '#333333';
  }

  return '#' + cleaned.toLowerCase();
}

/**
 * Create RGBA string from hex and opacity
 * @param {string} hex - Hex color
 * @param {number} opacity - Opacity (0-1)
 * @returns {string} RGBA string
 */
export function hexToRgbaString(hex, opacity = 1) {
  const rgb = hexToRgb(hex);
  const clampedOpacity = Math.max(0, Math.min(1, opacity));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampedOpacity})`;
}

/**
 * Flatten a translation object (expand merged translations to their components)
 * @param {Object} translation - Translation object
 * @returns {Array} Array of flattened translation components
 */
export function flattenTranslation(translation) {
  if (!translation) {
    return [];
  }

  if (translation.merged && translation.components) {
    return translation.components;
  }

  return [translation];
}

/**
 * Flatten multiple translations
 * @param {Array} translations - Array of translation objects
 * @returns {Array} Flattened array of translation components
 */
export function flattenTranslations(translations) {
  if (!Array.isArray(translations)) {
    return [];
  }

  return translations.flatMap(flattenTranslation);
}

/**
 * Build merged translation text from translation objects
 * @param {Array} translations - Array of translation objects with .translation property
 * @returns {string} Merged text separated by spaces
 */
export function buildMergedTranslationText(translations) {
  if (!Array.isArray(translations) || translations.length === 0) {
    return '';
  }

  return translations
    .map(t => t.translation || '')
    .filter(text => text.length > 0)
    .join(' ');
}

/**
 * Check if all translations share the same parent element
 * @param {Array} translations - Array of translation objects with .wrapper.parentElement
 * @returns {boolean} True if all have the same parent or array is empty/single item
 */
export function haveSameParent(translations) {
  if (!Array.isArray(translations) || translations.length <= 1) {
    return true;
  }

  const firstParent = translations[0]?.wrapper?.parentElement;
  if (!firstParent) {
    return false;
  }

  return translations.every(t =>
    t.wrapper && t.wrapper.parentElement === firstParent
  );
}

/**
 * Check if translation count is within merge limit
 * @param {number} count - Number of translations
 * @param {number} maxMergeWords - Maximum allowed words to merge
 * @returns {boolean} True if within limit
 */
export function isWithinMergeLimit(count, maxMergeWords) {
  if (typeof count !== 'number' || typeof maxMergeWords !== 'number') {
    return false;
  }

  return count > 0 && count <= maxMergeWords;
}
