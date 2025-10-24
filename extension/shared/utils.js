/**
 * Utility helper functions
 * Pure functions with no side effects
 *
 * @module shared/utils
 */

/**
 * Clean text by removing control characters and normalizing whitespace
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
export function cleanWhitespace(text) {
  if (!text || typeof text !== 'string') {return '';}

  // Remove control characters except newline and tab
  const cleaned = text
    .split('')
    .filter(ch => ch === '\n' || ch === '\t' || ch.charCodeAt(0) >= 32)
    .join('');

  // Normalize whitespace
  return cleaned.trim();
}

/**
 * @deprecated Use cleanWhitespace instead
 * Kept for backward compatibility
 */
export function sanitizeText(text) {
  return cleanWhitespace(text);
}

/**
 * Generate a simple hash from a string (DEPRECATED - insecure)
 * @deprecated Use secureHash for security-sensitive operations
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
 * Generate a cryptographically secure hash using SHA-256
 * Falls back to simple hash in Node.js test environment
 * @param {string} str - String to hash
 * @returns {Promise<string>} Hex-encoded hash string
 */
export async function secureHash(str) {
  // Check if Web Crypto API is available (browser environment)
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    try {
      // Convert string to Uint8Array
      const encoder = new TextEncoder();
      const data = encoder.encode(str);

      // Generate SHA-256 hash
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);

      // Convert to hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      return hashHex;
    } catch {
      // Fall back to simple hash if crypto API fails
      console.warn('[ContextTranslator] Crypto API failed, using fallback hash');
      return hashString(str);
    }
  }

  // Fallback for Node.js test environment
  // In production (browser), this code path should never be reached
  return hashString(str);
}

/**
 * Generate session-specific HMAC key
 * Creates a cryptographic key for cache integrity verification
 * @returns {Promise<CryptoKey>} HMAC key
 */
export async function generateHMACKey() {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const key = await crypto.subtle.generateKey(
        {
          name: 'HMAC',
          hash: { name: 'SHA-256' }
        },
        true,
        ['sign', 'verify']
      );
      return key;
    } catch (error) {
      console.error('[ContextTranslator] Failed to generate HMAC key:', error);
      return null;
    }
  }
  return null;
}

/**
 * Generate HMAC signature for cache entry
 * @param {CryptoKey} key - HMAC key
 * @param {string} data - Data to sign
 * @returns {Promise<string>} HMAC signature (hex string)
 */
export async function generateHMAC(key, data) {
  if (!key || typeof crypto === 'undefined' || !crypto.subtle) {
    return null;
  }

  try {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      dataBuffer
    );

    const signatureArray = Array.from(new Uint8Array(signature));
    const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return signatureHex;
  } catch (error) {
    console.error('[ContextTranslator] Failed to generate HMAC:', error);
    return null;
  }
}

/**
 * Verify HMAC signature for cache entry
 * @param {CryptoKey} key - HMAC key
 * @param {string} data - Data to verify
 * @param {string} signature - HMAC signature (hex string)
 * @returns {Promise<boolean>} True if signature is valid
 */
export async function verifyHMAC(key, data, signature) {
  if (!key || !signature || typeof crypto === 'undefined' || !crypto.subtle) {
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const signatureArray = signature.match(/.{1,2}/g).map(byte => parseInt(byte, 16));
    const signatureBuffer = new Uint8Array(signatureArray).buffer;

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      dataBuffer
    );

    return isValid;
  } catch (error) {
    console.error('[ContextTranslator] Failed to verify HMAC:', error);
    return false;
  }
}

/**
 * Truncate text to maximum length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) {return text;}
  return text.substring(0, maxLength) + '...';
}

/**
 * Check if dark mode is active
 * @param {string} mode - Mode setting ('auto', 'light', 'dark')
 * @returns {boolean} True if dark mode should be used
 */
export function isDarkMode(mode) {
  if (mode === 'dark') {return true;}
  if (mode === 'light') {return false;}

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
