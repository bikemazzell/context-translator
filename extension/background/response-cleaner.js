/**
 * Clean and validate LLM responses
 * Remove artifacts, explanations, and validate output
 *
 * @module background/response-cleaner
 */

import { logger } from '../shared/logger.js';

/**
 * Clean LLM response text
 * @param {string} text - Raw LLM response
 * @param {string} originalText - Original text being translated
 * @returns {string} Cleaned translation
 * @throws {Error} If response is invalid
 */
export function cleanResponse(text, originalText = '') {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid response: empty or non-string');
  }

  let cleaned = text.trim();

  // Remove common prefixes
  const prefixes = [
    'Translation:',
    'Output:',
    'Result:',
    'Answer:',
    'Here is the translation:',
    'The translation is:',
    'Translated text:'
  ];

  for (const prefix of prefixes) {
    if (cleaned.toLowerCase().startsWith(prefix.toLowerCase())) {
      cleaned = cleaned.substring(prefix.length).trim();
      logger.debug('Removed prefix:', prefix);
    }
  }

  // Remove quotes if they weren't in original
  if (originalText && !originalText.includes('"') && !originalText.includes("'")) {
    cleaned = cleaned.replace(/^["']|["']$/g, '');
  }

  // Remove explanation patterns (lines containing these phrases)
  const explanationPatterns = [
    /this (means|translates to|is)/i,
    /in (english|german|french)/i,
    /explanation:/i,
    /note:/i,
    /literally:/i
  ];

  const lines = cleaned.split('\n');
  const filteredLines = lines.filter(line => {
    const hasExplanation = explanationPatterns.some(pattern => pattern.test(line));
    if (hasExplanation) {
      logger.debug('Filtered explanation line:', line);
    }
    return !hasExplanation;
  });

  cleaned = filteredLines.join('\n').trim();

  // Remove XML-style tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');

  // Final trim
  cleaned = cleaned.trim();

  // Validation
  if (!cleaned) {
    throw new Error('Response is empty after cleaning');
  }

  if (cleaned.length > originalText.length * 5) {
    logger.warn('Response is suspiciously long, may contain explanation');
  }

  return cleaned;
}

/**
 * Extract translation from OpenAI-compatible response
 * @param {Object} response - Full API response
 * @param {string} originalText - Original text being translated
 * @returns {string} Cleaned translation
 * @throws {Error} If response format is invalid
 */
export function extractTranslation(response, originalText = '') {
  if (!response || !response.choices || !Array.isArray(response.choices)) {
    throw new Error('Invalid response format: missing choices array');
  }

  if (response.choices.length === 0) {
    throw new Error('Invalid response format: empty choices array');
  }

  const choice = response.choices[0];

  if (!choice.message || !choice.message.content) {
    throw new Error('Invalid response format: missing message content');
  }

  const content = choice.message.content;
  logger.info('Raw LLM content:', content);

  const cleaned = cleanResponse(content, originalText);
  logger.info('Cleaned translation:', cleaned);

  return {
    translation: cleaned,
    debugInfo: {
      rawResponse: response,
      rawContent: content,
      cleanedTranslation: cleaned
    }
  };
}
