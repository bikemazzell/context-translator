/**
 * Tooltip translation display
 */

import { isDarkMode } from '../../shared/utils.js';

/**
 * Show tooltip at position
 * @param {string} translation - Translation text
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {string} darkMode - Dark mode setting ('auto', 'light', 'dark')
 * @param {Object} styleSettings - Custom style settings (bgColor, textColor, bgOpacity)
 */
export function showTooltip(translation, x, y, darkMode = 'auto', styleSettings = null) {
  removeTooltip();

  const popup = document.createElement('div');
  popup.id = 'ct-translation-popup';

  // Apply custom styling if provided
  if (styleSettings) {
    applyCustomStyling(popup, styleSettings);
  } else if (isDarkMode(darkMode)) {
    popup.classList.add('ct-dark-mode');
  }

  popup.style.left = `${x}px`;
  popup.style.top = `${y + 20}px`;
  popup.textContent = translation;

  document.body.appendChild(popup);

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

/**
 * Remove tooltip
 */
export function removeTooltip() {
  const popup = document.getElementById('ct-translation-popup');
  if (popup && popup.parentElement) {
    popup.parentElement.removeChild(popup);
  }
}

/**
 * Apply custom styling to tooltip element
 * @param {HTMLElement} element - Tooltip element
 * @param {Object} styleSettings - Style settings
 */
function applyCustomStyling(element, styleSettings) {
  if (styleSettings.translationBgColor) {
    const rgb = hexToRgb(styleSettings.translationBgColor);
    const opacity = styleSettings.translationBgOpacity !== undefined ? styleSettings.translationBgOpacity : 0.9;
    element.style.setProperty('background', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`, 'important');
  }
  if (styleSettings.translationTextColor) {
    element.style.setProperty('color', styleSettings.translationTextColor, 'important');
  }
  // Remove border for custom styling to make it cleaner
  element.style.setProperty('border', 'none', 'important');
}

/**
 * Convert hex color to RGB
 * @param {string} hex - Hex color code
 * @returns {Object} RGB values
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 51, g: 51, b: 51 }; // fallback to #333333
}
