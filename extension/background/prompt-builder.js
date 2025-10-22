/**
 * Build prompts for LLM translation requests
 * Generates messages in OpenAI-compatible format
 *
 * @module background/prompt-builder
 */

import { SYSTEM_PROMPT } from '../shared/config.js';
import { sanitizeText } from '../shared/utils.js';

/**
 * Build user prompt for translation
 * @param {string} text - Text to translate
 * @param {string} sourceLang - Source language
 * @param {string} targetLang - Target language
 * @param {string|null} context - Optional context
 * @returns {string} User prompt
 */
export function buildUserPrompt(text, sourceLang, targetLang, context) {
  const cleanText = sanitizeText(text);

  let prompt = `Translate this ${sourceLang} text to ${targetLang}:\n"${cleanText}"`;

  if (context) {
    const cleanContext = sanitizeText(context);
    prompt += `\n\nContext (for disambiguation only, do not translate this):\n"${cleanContext}"`;
  }

  prompt += `\n\nProvide ONLY the ${targetLang} translation of "${cleanText}", nothing else.`;

  return prompt;
}

/**
 * Build complete message array for LLM API
 * @param {string} text - Text to translate
 * @param {string} sourceLang - Source language
 * @param {string} targetLang - Target language
 * @param {string|null} context - Optional context
 * @returns {Array<Object>} Messages array
 */
export function buildMessages(text, sourceLang, targetLang, context) {
  return [
    {
      role: 'system',
      content: SYSTEM_PROMPT
    },
    {
      role: 'user',
      content: buildUserPrompt(text, sourceLang, targetLang, context)
    }
  ];
}
