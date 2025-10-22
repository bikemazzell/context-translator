/**
 * Tests for response cleaner module
 */

import { describe, test, expect } from '@jest/globals';
import { cleanResponse, extractTranslation } from '../background/response-cleaner.js';

describe('cleanResponse', () => {
  test('should return trimmed text', () => {
    const result = cleanResponse('  hello  ', '');

    expect(result).toBe('hello');
  });

  test('should throw on empty input', () => {
    expect(() => cleanResponse('', '')).toThrow('Invalid response: empty or non-string');
    expect(() => cleanResponse('   ', '')).toThrow('Response is empty after cleaning');
  });

  test('should throw on non-string input', () => {
    expect(() => cleanResponse(null, '')).toThrow('Invalid response: empty or non-string');
    expect(() => cleanResponse(undefined, '')).toThrow('Invalid response: empty or non-string');
    expect(() => cleanResponse(123, '')).toThrow('Invalid response: empty or non-string');
  });

  test('should remove "Translation:" prefix', () => {
    const result = cleanResponse('Translation: hola', 'hello');

    expect(result).toBe('hola');
    expect(result).not.toContain('Translation:');
  });

  test('should remove "Output:" prefix', () => {
    const result = cleanResponse('Output: hola', 'hello');

    expect(result).toBe('hola');
  });

  test('should remove "Result:" prefix', () => {
    const result = cleanResponse('Result: hola', 'hello');

    expect(result).toBe('hola');
  });

  test('should remove "Here is the translation:" prefix', () => {
    const result = cleanResponse('Here is the translation: hola', 'hello');

    expect(result).toBe('hola');
  });

  test('should handle case-insensitive prefixes', () => {
    const result1 = cleanResponse('TRANSLATION: hola', 'hello');
    const result2 = cleanResponse('translation: hola', 'hello');

    expect(result1).toBe('hola');
    expect(result2).toBe('hola');
  });

  test('should remove surrounding quotes when original has none', () => {
    const result1 = cleanResponse('"hola"', 'hello');
    const result2 = cleanResponse("'hola'", 'hello');

    expect(result1).toBe('hola');
    expect(result2).toBe('hola');
  });

  test('should keep quotes when original has quotes', () => {
    const result = cleanResponse('"hola"', '"hello"');

    expect(result).toBe('"hola"');
  });

  test('should filter out explanation lines', () => {
    const input = 'hola\nThis means hello\nBuenos días';
    const result = cleanResponse(input, 'hello');

    expect(result).not.toContain('This means');
    expect(result).toContain('hola');
    expect(result).toContain('Buenos días');
  });

  test('should filter "in English" explanations', () => {
    const input = 'hola\nIn English, this is hello';
    const result = cleanResponse(input, 'hello');

    expect(result).toBe('hola');
    expect(result).not.toContain('In English');
  });

  test('should filter "Explanation:" lines', () => {
    const input = 'hola\nExplanation: A Spanish greeting';
    const result = cleanResponse(input, 'hello');

    expect(result).toBe('hola');
  });

  test('should filter "Note:" lines', () => {
    const input = 'hola\nNote: Informal greeting';
    const result = cleanResponse(input, 'hello');

    expect(result).toBe('hola');
  });

  test('should filter "Literally:" lines', () => {
    const input = 'hola\nLiterally: hello';
    const result = cleanResponse(input, 'hello');

    expect(result).toBe('hola');
  });

  test('should remove XML-style tags', () => {
    const result = cleanResponse('<translation>hola</translation>', 'hello');

    expect(result).toBe('hola');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  test('should handle multiple tags', () => {
    const result = cleanResponse('<start>hola<end>', 'hello');

    expect(result).toBe('hola');
  });

  test('should handle complex responses', () => {
    const input = 'Translation: "hola"\nThis translates to hello\n<note>informal</note>';
    const result = cleanResponse(input, 'hello');

    // Note: Quotes are only removed from start/end, not middle
    // XML tags are removed but their content remains
    expect(result).toBe('hola"\ninformal');
    expect(result).not.toContain('Translation:');
    expect(result).not.toContain('This translates');
    expect(result).not.toContain('<note>');
    expect(result).not.toContain('</note>');
  });

  test('should preserve multiline translations', () => {
    const input = 'line one\nline two\nline three';
    const result = cleanResponse(input, 'original');

    expect(result).toContain('line one');
    expect(result).toContain('line two');
    expect(result).toContain('line three');
  });

  test('should warn on suspiciously long responses', () => {
    const longResponse = 'a'.repeat(1000);
    const shortOriginal = 'hi';

    // Should not throw, just warn
    const result = cleanResponse(longResponse, shortOriginal);
    expect(result).toBe(longResponse);
  });

  test('should handle responses without original text', () => {
    const result = cleanResponse('hola');

    expect(result).toBe('hola');
  });

  test('should handle empty original text', () => {
    const result = cleanResponse('hola', '');

    expect(result).toBe('hola');
  });
});

describe('extractTranslation', () => {
  test('should extract translation from valid response', () => {
    const response = {
      choices: [
        {
          message: {
            content: 'hola'
          }
        }
      ]
    };

    const result = extractTranslation(response, 'hello');

    expect(result.translation).toBe('hola');
  });

  test('should throw on missing response', () => {
    expect(() => extractTranslation(null, 'hello')).toThrow('Invalid response format: missing choices array');
    expect(() => extractTranslation(undefined, 'hello')).toThrow('Invalid response format: missing choices array');
  });

  test('should throw on missing choices', () => {
    expect(() => extractTranslation({}, 'hello')).toThrow('Invalid response format: missing choices array');
  });

  test('should throw on non-array choices', () => {
    const response = { choices: 'not-array' };

    expect(() => extractTranslation(response, 'hello')).toThrow('Invalid response format: missing choices array');
  });

  test('should throw on empty choices array', () => {
    const response = { choices: [] };

    expect(() => extractTranslation(response, 'hello')).toThrow('Invalid response format: empty choices array');
  });

  test('should throw on missing message', () => {
    const response = {
      choices: [{}]
    };

    expect(() => extractTranslation(response, 'hello')).toThrow('Invalid response format: missing message content');
  });

  test('should throw on missing content', () => {
    const response = {
      choices: [
        { message: {} }
      ]
    };

    expect(() => extractTranslation(response, 'hello')).toThrow('Invalid response format: missing message content');
  });

  test('should clean the extracted content', () => {
    const response = {
      choices: [
        {
          message: {
            content: 'Translation: hola'
          }
        }
      ]
    };

    const result = extractTranslation(response, 'hello');

    expect(result.translation).toBe('hola');
    expect(result).not.toContain('Translation:');
  });

  test('should use first choice', () => {
    const response = {
      choices: [
        { message: { content: 'first' } },
        { message: { content: 'second' } }
      ]
    };

    const result = extractTranslation(response, 'original');

    expect(result.translation).toBe('first');
  });

  test('should pass original text to cleanResponse', () => {
    const response = {
      choices: [
        {
          message: {
            content: '"hola"'
          }
        }
      ]
    };

    // Without quotes in original, quotes should be removed
    const result = extractTranslation(response, 'hello');
    expect(result.translation).toBe('hola');
  });

  test('should handle real OpenAI-style response', () => {
    const response = {
      id: 'chatcmpl-123',
      object: 'chat.completion',
      created: 1677652288,
      model: 'gpt-3.5-turbo',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Translation: hola'
          },
          finish_reason: 'stop'
        }
      ]
    };

    const result = extractTranslation(response, 'hello');

    expect(result.translation).toBe('hola');
  });

  test('should handle responses without original text', () => {
    const response = {
      choices: [
        {
          message: {
            content: 'hola'
          }
        }
      ]
    };

    const result = extractTranslation(response);

    expect(result.translation).toBe('hola');
  });
});
