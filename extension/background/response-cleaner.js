/**
 * Clean and validate LLM responses
 * Remove artifacts, explanations, and validate output
 *
 * @module background/response-cleaner
 */

import { logger } from '../shared/logger.js';
import { TranslationError } from '../shared/errors.js';

/**
 * Clean LLM response text
 * @param {string} text - Raw LLM response
 * @param {string} originalText - Original text being translated
 * @returns {string} Cleaned translation
 * @throws {Error} If response is invalid
 */
export function cleanResponse(text, originalText = '') {
  if (!text || typeof text !== 'string') {
    throw new TranslationError('Invalid LLM response: empty or non-string', {
      responseType: typeof text,
      originalText: originalText.substring(0, 100)
    });
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

  // Remove explanation patterns (lines that start with or only contain meta-commentary)
  const explanationPatterns = [
    /^\s*this (means|translates to)\b/i,
    /^\s*(in|translated (to|into))\s+[a-z]+\s*[,:]/i,  // "In French:" or "Translated to German,"
    /^\s*explanation:/i,
    /^\s*note:/i,
    /^\s*literally:/i,
    /^\s*here'?s? the translation/i,
    /^\s*the translation (is|would be)/i
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

  if (!cleaned) {
    throw new TranslationError('LLM response is empty after cleaning', {
      originalText: originalText.substring(0, 100),
      rawResponse: text.substring(0, 200)
    });
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
    throw new TranslationError('Invalid LLM response format: missing choices array', {
      hasResponse: !!response,
      hasChoices: !!response?.choices,
      isArray: Array.isArray(response?.choices)
    });
  }

  if (response.choices.length === 0) {
    throw new TranslationError('Invalid LLM response format: empty choices array', {
      responseKeys: Object.keys(response)
    });
  }

  const choice = response.choices[0];

  if (!choice.message || !choice.message.content) {
    throw new TranslationError('Invalid LLM response format: missing message content', {
      hasMessage: !!choice.message,
      hasContent: !!choice.message?.content,
      choiceKeys: Object.keys(choice)
    });
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
