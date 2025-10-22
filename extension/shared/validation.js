/**
 * Input validation utilities
 */

import { CONFIG } from './config.js';

/**
 * Validate translation request
 * @param {string} text - Text to translate
 * @param {string} sourceLang - Source language
 * @param {string} targetLang - Target language
 * @param {string|null} context - Optional context
 * @throws {Error} If validation fails
 */
export function validateTranslationRequest(text, sourceLang, targetLang, context = null) {
  if (typeof text !== 'string') {
    throw new Error('Text must be a string');
  }

  if (text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  if (text.length > 5000) {
    throw new Error('Text too long (max 5000 characters)');
  }

  if (typeof sourceLang !== 'string' || !sourceLang) {
    throw new Error('Invalid source language');
  }

  if (typeof targetLang !== 'string' || !targetLang) {
    throw new Error('Invalid target language');
  }

  if (context !== null && typeof context !== 'string') {
    throw new Error('Context must be a string or null');
  }

  if (context && context.length > 2000) {
    throw new Error('Context too long (max 2000 characters)');
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
 * Sanitize text for safe display
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeText(text) {
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
 * Validate URL for LLM endpoint
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
export function isValidEndpoint(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate hex color code
 * @param {string} color - Color to validate
 * @returns {boolean} True if valid hex color
 */
export function isValidHexColor(color) {
  if (typeof color !== 'string') return false;
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}
