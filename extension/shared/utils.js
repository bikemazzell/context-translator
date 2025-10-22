/**
 * Utility helper functions
 * Pure functions with no side effects
 *
 * @module shared/utils
 */

/**
 * Sanitize text input by removing control characters
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';

  // Remove control characters except newline and tab
  const cleaned = text
    .split('')
    .filter(ch => ch === '\n' || ch === '\t' || ch.charCodeAt(0) >= 32)
    .join('');

  // Normalize whitespace
  return cleaned.trim();
}

/**
 * Generate a simple hash from a string
 * @param {string} str - String to hash
 * @returns {string} Hash string
 */
export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Truncate text to maximum length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Check if dark mode is active
 * @param {string} mode - Mode setting ('auto', 'light', 'dark')
 * @returns {boolean} True if dark mode should be used
 */
export function isDarkMode(mode) {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;

  // Auto-detect
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  return false;
}

/**
 * Debounce a function call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
