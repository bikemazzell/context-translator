/**
 * Input validation utilities
 */

import { CONFIG } from './config.js';
import { ValidationError } from './errors.js';

/**
 * Validate translation request
 * @param {string} text - Text to translate
 * @param {string} sourceLang - Source language
 * @param {string} targetLang - Target language
 * @param {string|null} context - Optional context
 * @throws {ValidationError} If validation fails
 */
export function validateTranslationRequest(text, sourceLang, targetLang, context = null) {
  if (typeof text !== 'string') {
    throw new ValidationError('Text must be a string', 'text', typeof text);
  }

  if (text.trim().length === 0) {
    throw new ValidationError('Text cannot be empty', 'text', text);
  }

  if (text.length > CONFIG.llm.maxTextLength) {
    throw new ValidationError(
      `Text too long (max ${CONFIG.llm.maxTextLength} characters)`,
      'text',
      `${text.length} characters`
    );
  }

  if (typeof sourceLang !== 'string' || !sourceLang) {
    throw new ValidationError('Invalid source language', 'sourceLang', sourceLang);
  }

  if (typeof targetLang !== 'string' || !targetLang) {
    throw new ValidationError('Invalid target language', 'targetLang', targetLang);
  }

  if (context !== null && typeof context !== 'string') {
    throw new ValidationError('Context must be a string or null', 'context', typeof context);
  }

  if (context && context.length > CONFIG.llm.maxContextLength) {
    throw new ValidationError(
      `Context too long (max ${CONFIG.llm.maxContextLength} characters)`,
      'context',
      `${context.length} characters`
    );
  }
}

/**
 * Validate setting value
 * @param {string} key - Setting key
 * @param {*} value - Setting value
 * @throws {Error} If validation fails
 */
export function validateSetting(key, value) {
  const schemas = {
    sourceLang: {
      type: 'string',
      validate: (v) => typeof v === 'string' && v.length > 0
    },
    targetLang: {
      type: 'string',
      validate: (v) => typeof v === 'string' && v.length > 0
    },
    llmHost: {
      type: 'string',
      validate: (v) => typeof v === 'string' && v.length > 0
    },
    llmPort: {
      type: 'number',
      validate: (v) => Number.isInteger(v) && v >= 1 && v <= 65535
    },
    displayMode: {
      type: 'string',
      validate: (v) => v === 'inline' || v === 'tooltip'
    },
    darkMode: {
      type: 'string',
      validate: (v) => v === 'light' || v === 'dark' || v === 'auto'
    },
    useCache: {
      type: 'boolean',
      validate: (v) => typeof v === 'boolean'
    },
    translationBgColor: {
      type: 'string',
      validate: (v) => isValidHexColor(v)
    },
    translationTextColor: {
      type: 'string',
      validate: (v) => isValidHexColor(v)
    },
    translationBgOpacity: {
      type: 'number',
      validate: (v) => typeof v === 'number' && v >= 0 && v <= 1
    },
    enableLogging: {
      type: 'boolean',
      validate: (v) => typeof v === 'boolean'
    },
    useRateLimit: {
      type: 'boolean',
      validate: (v) => typeof v === 'boolean'
    },
    rateLimit: {
      type: 'number',
      validate: (v) => Number.isInteger(v) && v >= 1 && v <= 120
    },
    contextMode: {
      type: 'boolean',
      validate: (v) => typeof v === 'boolean'
    },
    contextWindowChars: {
      type: 'number',
      validate: (v) => Number.isInteger(v) && v >= 0 && v <= 1000
    }
  };

  const schema = schemas[key];
  if (!schema) {
    throw new Error(`Unknown setting: ${key}`);
  }

  if (!schema.validate(value)) {
    throw new Error(`Invalid value for ${key}: ${value}`);
  }
}

/**
 * Escape HTML entities for safe display in HTML context
 * Prevents XSS attacks by encoding special characters
 * @param {string} text - Text to escape
 * @returns {string} HTML-safe text
 */
export function escapeHtml(text) {
  if (typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * @deprecated Use escapeHtml instead - name changed to better reflect purpose
 * Kept for backward compatibility
 */
export function sanitizeText(text) {
  return escapeHtml(text);
}

/**
 * Check if endpoint is using secure protocol (HTTPS)
 * @param {string} url - URL to check
 * @returns {boolean}
 */
export function isSecureEndpoint(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Check if endpoint is localhost or local network
 * @param {string} url - URL to check
 * @returns {boolean}
 */
export function isLocalEndpoint(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Check for localhost, 127.0.0.1, or local network
    const localHostnames = ['localhost', '127.0.0.1', '::1', '0.0.0.0'];
    if (localHostnames.includes(hostname)) {return true;}

    // Check for local network (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    if (hostname.startsWith('192.168.')) {return true;}
    if (hostname.startsWith('10.')) {return true;}
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) {return true;}

    return false;
  } catch {
    return false;
  }
}

/**
 * Validate URL for LLM endpoint with security checks
 * @param {string} url - URL to validate
 * @returns {{valid: boolean, warnings: string[]}} Validation result with warnings
 */
export function validateEndpoint(url) {
  const warnings = [];

  try {
    const parsed = new URL(url);

    // Check protocol
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, warnings: ['Invalid protocol. Only HTTP and HTTPS are supported.'] };
    }

    // Warn about HTTP for non-local endpoints
    if (parsed.protocol === 'http:' && !isLocalEndpoint(url)) {
      warnings.push('Warning: Using unencrypted HTTP connection to a remote server. Data will be transmitted in plain text.');
    }

    // Warn about unusual ports
    const port = parsed.port;
    if (port && !['80', '443', '1234', '5000', '8000', '8080', '11434'].includes(port)) {
      warnings.push(`Warning: Using non-standard port ${port}. Verify this is the correct endpoint.`);
    }

    return { valid: true, warnings };
  } catch {
    return { valid: false, warnings: ['Invalid URL format.'] };
  }
}

/**
 * Validate URL for LLM endpoint (backward compatibility)
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
export function isValidEndpoint(url) {
  const result = validateEndpoint(url);
  return result.valid;
}

/**
 * Validate hex color code
 * @param {string} color - Color to validate
 * @returns {boolean} True if valid hex color
 */
export function isValidHexColor(color) {
  if (typeof color !== 'string') {return false;}
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}
