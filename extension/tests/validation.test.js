/**
 * Tests for validation module
 */

import { describe, test, expect } from '@jest/globals';
import {
  validateTranslationRequest,
  validateSetting,
  sanitizeText,
  isValidEndpoint,
  validateEndpoint,
  isSecureEndpoint,
  isLocalEndpoint,
  isValidHexColor
} from '../shared/validation.js';

describe('validateTranslationRequest', () => {
  test('should accept valid inputs', () => {
    expect(() => {
      validateTranslationRequest('Hello', 'en', 'es');
    }).not.toThrow();

    expect(() => {
      validateTranslationRequest('Hello world', 'en', 'es', 'greeting');
    }).not.toThrow();
  });

  test('should reject non-string text', () => {
    expect(() => {
      validateTranslationRequest(123, 'en', 'es');
    }).toThrow('Text must be a string');

    expect(() => {
      validateTranslationRequest(null, 'en', 'es');
    }).toThrow('Text must be a string');

    expect(() => {
      validateTranslationRequest(undefined, 'en', 'es');
    }).toThrow('Text must be a string');
  });

  test('should reject empty text', () => {
    expect(() => {
      validateTranslationRequest('', 'en', 'es');
    }).toThrow('Text cannot be empty');

    expect(() => {
      validateTranslationRequest('   ', 'en', 'es');
    }).toThrow('Text cannot be empty');
  });

  test('should reject text over 5000 characters', () => {
    const longText = 'a'.repeat(5001);
    expect(() => {
      validateTranslationRequest(longText, 'en', 'es');
    }).toThrow('Text too long (max 5000 characters)');
  });

  test('should accept text at exactly 5000 characters', () => {
    const maxText = 'a'.repeat(5000);
    expect(() => {
      validateTranslationRequest(maxText, 'en', 'es');
    }).not.toThrow();
  });

  test('should reject invalid source language', () => {
    expect(() => {
      validateTranslationRequest('Hello', '', 'es');
    }).toThrow('Invalid source language');

    expect(() => {
      validateTranslationRequest('Hello', null, 'es');
    }).toThrow('Invalid source language');

    expect(() => {
      validateTranslationRequest('Hello', 123, 'es');
    }).toThrow('Invalid source language');
  });

  test('should reject invalid target language', () => {
    expect(() => {
      validateTranslationRequest('Hello', 'en', '');
    }).toThrow('Invalid target language');

    expect(() => {
      validateTranslationRequest('Hello', 'en', null);
    }).toThrow('Invalid target language');

    expect(() => {
      validateTranslationRequest('Hello', 'en', 123);
    }).toThrow('Invalid target language');
  });

  test('should accept null context', () => {
    expect(() => {
      validateTranslationRequest('Hello', 'en', 'es', null);
    }).not.toThrow();
  });

  test('should reject non-string context', () => {
    expect(() => {
      validateTranslationRequest('Hello', 'en', 'es', 123);
    }).toThrow('Context must be a string or null');

    expect(() => {
      validateTranslationRequest('Hello', 'en', 'es', {});
    }).toThrow('Context must be a string or null');
  });

  test('should reject context over 2000 characters', () => {
    const longContext = 'a'.repeat(2001);
    expect(() => {
      validateTranslationRequest('Hello', 'en', 'es', longContext);
    }).toThrow('Context too long (max 2000 characters)');
  });

  test('should accept context at exactly 2000 characters', () => {
    const maxContext = 'a'.repeat(2000);
    expect(() => {
      validateTranslationRequest('Hello', 'en', 'es', maxContext);
    }).not.toThrow();
  });
});

describe('validateSetting', () => {
  test('should accept valid sourceLang', () => {
    expect(() => {
      validateSetting('sourceLang', 'en');
    }).not.toThrow();
  });

  test('should reject invalid sourceLang', () => {
    expect(() => {
      validateSetting('sourceLang', '');
    }).toThrow('Invalid value for sourceLang');

    expect(() => {
      validateSetting('sourceLang', 123);
    }).toThrow('Invalid value for sourceLang');
  });

  test('should accept valid targetLang', () => {
    expect(() => {
      validateSetting('targetLang', 'es');
    }).not.toThrow();
  });

  test('should reject invalid targetLang', () => {
    expect(() => {
      validateSetting('targetLang', '');
    }).toThrow('Invalid value for targetLang');
  });

  test('should accept valid llmHost', () => {
    expect(() => {
      validateSetting('llmHost', 'localhost');
    }).not.toThrow();

    expect(() => {
      validateSetting('llmHost', '192.168.1.1');
    }).not.toThrow();
  });

  test('should reject invalid llmHost', () => {
    expect(() => {
      validateSetting('llmHost', '');
    }).toThrow('Invalid value for llmHost');
  });

  test('should accept valid llmPort', () => {
    expect(() => {
      validateSetting('llmPort', 1234);
    }).not.toThrow();

    expect(() => {
      validateSetting('llmPort', 1);
    }).not.toThrow();

    expect(() => {
      validateSetting('llmPort', 65535);
    }).not.toThrow();
  });

  test('should reject invalid llmPort', () => {
    expect(() => {
      validateSetting('llmPort', 0);
    }).toThrow('Invalid value for llmPort');

    expect(() => {
      validateSetting('llmPort', 65536);
    }).toThrow('Invalid value for llmPort');

    expect(() => {
      validateSetting('llmPort', -1);
    }).toThrow('Invalid value for llmPort');

    expect(() => {
      validateSetting('llmPort', 1.5);
    }).toThrow('Invalid value for llmPort');

    expect(() => {
      validateSetting('llmPort', '1234');
    }).toThrow('Invalid value for llmPort');
  });

  test('should accept valid displayMode', () => {
    expect(() => {
      validateSetting('displayMode', 'inline');
    }).not.toThrow();

    expect(() => {
      validateSetting('displayMode', 'tooltip');
    }).not.toThrow();
  });

  test('should reject invalid displayMode', () => {
    expect(() => {
      validateSetting('displayMode', 'invalid');
    }).toThrow('Invalid value for displayMode');

    expect(() => {
      validateSetting('displayMode', '');
    }).toThrow('Invalid value for displayMode');
  });

  test('should accept valid darkMode', () => {
    expect(() => {
      validateSetting('darkMode', 'light');
    }).not.toThrow();

    expect(() => {
      validateSetting('darkMode', 'dark');
    }).not.toThrow();

    expect(() => {
      validateSetting('darkMode', 'auto');
    }).not.toThrow();
  });

  test('should reject invalid darkMode', () => {
    expect(() => {
      validateSetting('darkMode', 'invalid');
    }).toThrow('Invalid value for darkMode');
  });

  test('should accept valid useCache', () => {
    expect(() => {
      validateSetting('useCache', true);
    }).not.toThrow();

    expect(() => {
      validateSetting('useCache', false);
    }).not.toThrow();
  });

  test('should reject invalid useCache', () => {
    expect(() => {
      validateSetting('useCache', 'true');
    }).toThrow('Invalid value for useCache');

    expect(() => {
      validateSetting('useCache', 1);
    }).toThrow('Invalid value for useCache');
  });

  test('should reject unknown settings', () => {
    expect(() => {
      validateSetting('unknownSetting', 'value');
    }).toThrow('Unknown setting: unknownSetting');
  });

  test('should accept valid translationBgColor', () => {
    expect(() => {
      validateSetting('translationBgColor', '#333333');
    }).not.toThrow();

    expect(() => {
      validateSetting('translationBgColor', '#FFFFFF');
    }).not.toThrow();

    expect(() => {
      validateSetting('translationBgColor', '#abc123');
    }).not.toThrow();
  });

  test('should reject invalid translationBgColor', () => {
    expect(() => {
      validateSetting('translationBgColor', 'red');
    }).toThrow('Invalid value for translationBgColor');

    expect(() => {
      validateSetting('translationBgColor', '#FFF');
    }).toThrow('Invalid value for translationBgColor');

    expect(() => {
      validateSetting('translationBgColor', 'rgb(255, 0, 0)');
    }).toThrow('Invalid value for translationBgColor');

    expect(() => {
      validateSetting('translationBgColor', '#GGGGGG');
    }).toThrow('Invalid value for translationBgColor');
  });

  test('should accept valid translationTextColor', () => {
    expect(() => {
      validateSetting('translationTextColor', '#ffffff');
    }).not.toThrow();

    expect(() => {
      validateSetting('translationTextColor', '#000000');
    }).not.toThrow();
  });

  test('should reject invalid translationTextColor', () => {
    expect(() => {
      validateSetting('translationTextColor', 'blue');
    }).toThrow('Invalid value for translationTextColor');

    expect(() => {
      validateSetting('translationTextColor', '#12345');
    }).toThrow('Invalid value for translationTextColor');
  });

  test('should accept valid translationBgOpacity', () => {
    expect(() => {
      validateSetting('translationBgOpacity', 0);
    }).not.toThrow();

    expect(() => {
      validateSetting('translationBgOpacity', 0.5);
    }).not.toThrow();

    expect(() => {
      validateSetting('translationBgOpacity', 1);
    }).not.toThrow();

    expect(() => {
      validateSetting('translationBgOpacity', 0.9);
    }).not.toThrow();
  });

  test('should reject invalid translationBgOpacity', () => {
    expect(() => {
      validateSetting('translationBgOpacity', -0.1);
    }).toThrow('Invalid value for translationBgOpacity');

    expect(() => {
      validateSetting('translationBgOpacity', 1.1);
    }).toThrow('Invalid value for translationBgOpacity');

    expect(() => {
      validateSetting('translationBgOpacity', '0.5');
    }).toThrow('Invalid value for translationBgOpacity');

    expect(() => {
      validateSetting('translationBgOpacity', true);
    }).toThrow('Invalid value for translationBgOpacity');
  });

  test('should accept valid enableLogging', () => {
    expect(() => {
      validateSetting('enableLogging', true);
    }).not.toThrow();

    expect(() => {
      validateSetting('enableLogging', false);
    }).not.toThrow();
  });

  test('should reject invalid enableLogging', () => {
    expect(() => {
      validateSetting('enableLogging', 'true');
    }).toThrow('Invalid value for enableLogging');

    expect(() => {
      validateSetting('enableLogging', 1);
    }).toThrow('Invalid value for enableLogging');
  });

  test('should accept valid useRateLimit', () => {
    expect(() => {
      validateSetting('useRateLimit', true);
    }).not.toThrow();

    expect(() => {
      validateSetting('useRateLimit', false);
    }).not.toThrow();
  });

  test('should reject invalid useRateLimit', () => {
    expect(() => {
      validateSetting('useRateLimit', 'true');
    }).toThrow('Invalid value for useRateLimit');

    expect(() => {
      validateSetting('useRateLimit', 0);
    }).toThrow('Invalid value for useRateLimit');
  });

  test('should accept valid rateLimit', () => {
    expect(() => {
      validateSetting('rateLimit', 1);
    }).not.toThrow();

    expect(() => {
      validateSetting('rateLimit', 60);
    }).not.toThrow();

    expect(() => {
      validateSetting('rateLimit', 120);
    }).not.toThrow();
  });

  test('should reject invalid rateLimit', () => {
    expect(() => {
      validateSetting('rateLimit', 0);
    }).toThrow('Invalid value for rateLimit');

    expect(() => {
      validateSetting('rateLimit', 121);
    }).toThrow('Invalid value for rateLimit');

    expect(() => {
      validateSetting('rateLimit', 1.5);
    }).toThrow('Invalid value for rateLimit');

    expect(() => {
      validateSetting('rateLimit', '60');
    }).toThrow('Invalid value for rateLimit');
  });

  test('should accept valid contextMode', () => {
    expect(() => {
      validateSetting('contextMode', true);
    }).not.toThrow();

    expect(() => {
      validateSetting('contextMode', false);
    }).not.toThrow();
  });

  test('should reject invalid contextMode', () => {
    expect(() => {
      validateSetting('contextMode', 'true');
    }).toThrow('Invalid value for contextMode');

    expect(() => {
      validateSetting('contextMode', 1);
    }).toThrow('Invalid value for contextMode');
  });

  test('should accept valid contextWindowChars', () => {
    expect(() => {
      validateSetting('contextWindowChars', 0);
    }).not.toThrow();

    expect(() => {
      validateSetting('contextWindowChars', 200);
    }).not.toThrow();

    expect(() => {
      validateSetting('contextWindowChars', 1000);
    }).not.toThrow();
  });

  test('should reject invalid contextWindowChars', () => {
    expect(() => {
      validateSetting('contextWindowChars', -1);
    }).toThrow('Invalid value for contextWindowChars');

    expect(() => {
      validateSetting('contextWindowChars', 1001);
    }).toThrow('Invalid value for contextWindowChars');

    expect(() => {
      validateSetting('contextWindowChars', 100.5);
    }).toThrow('Invalid value for contextWindowChars');

    expect(() => {
      validateSetting('contextWindowChars', '200');
    }).toThrow('Invalid value for contextWindowChars');
  });
});

describe('isValidHexColor', () => {
  test('should accept valid hex colors', () => {
    expect(isValidHexColor('#000000')).toBe(true);
    expect(isValidHexColor('#FFFFFF')).toBe(true);
    expect(isValidHexColor('#abc123')).toBe(true);
    expect(isValidHexColor('#ABC123')).toBe(true);
    expect(isValidHexColor('#ff0000')).toBe(true);
  });

  test('should reject invalid hex colors', () => {
    expect(isValidHexColor('#FFF')).toBe(false); // Too short
    expect(isValidHexColor('#FFFFFFF')).toBe(false); // Too long
    expect(isValidHexColor('FFFFFF')).toBe(false); // No hash
    expect(isValidHexColor('#GGGGGG')).toBe(false); // Invalid characters
    expect(isValidHexColor('red')).toBe(false); // Not hex
    expect(isValidHexColor('rgb(255, 0, 0)')).toBe(false); // RGB format
  });

  test('should reject non-string input', () => {
    expect(isValidHexColor(null)).toBe(false);
    expect(isValidHexColor(undefined)).toBe(false);
    expect(isValidHexColor(123)).toBe(false);
    expect(isValidHexColor(true)).toBe(false);
  });
});

describe('sanitizeText', () => {
  test('should sanitize HTML entities', () => {
    expect(sanitizeText('<script>alert("xss")</script>'))
      .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  test('should sanitize angle brackets', () => {
    expect(sanitizeText('< >')).toBe('&lt; &gt;');
  });

  test('should sanitize quotes', () => {
    expect(sanitizeText('"double" \'single\''))
      .toBe('&quot;double&quot; &#39;single&#39;');
  });

  test('should handle empty string', () => {
    expect(sanitizeText('')).toBe('');
  });

  test('should handle non-string input', () => {
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
    expect(sanitizeText(123)).toBe('');
  });

  test('should preserve normal text', () => {
    expect(sanitizeText('Hello world')).toBe('Hello world');
  });

  test('should handle mixed content', () => {
    expect(sanitizeText('Hello <strong>"world"</strong>!'))
      .toBe('Hello &lt;strong&gt;&quot;world&quot;&lt;/strong&gt;!');
  });
});

describe('isValidEndpoint', () => {
  test('should accept valid HTTP URLs', () => {
    expect(isValidEndpoint('http://localhost:1234')).toBe(true);
    expect(isValidEndpoint('http://127.0.0.1:8080')).toBe(true);
    expect(isValidEndpoint('http://example.com')).toBe(true);
  });

  test('should accept valid HTTPS URLs', () => {
    expect(isValidEndpoint('https://localhost:1234')).toBe(true);
    expect(isValidEndpoint('https://api.example.com')).toBe(true);
  });

  test('should reject invalid protocols', () => {
    expect(isValidEndpoint('ftp://localhost:1234')).toBe(false);
    expect(isValidEndpoint('file:///path/to/file')).toBe(false);
    expect(isValidEndpoint('ws://localhost:1234')).toBe(false);
  });

  test('should reject malformed URLs', () => {
    expect(isValidEndpoint('not a url')).toBe(false);
    expect(isValidEndpoint('')).toBe(false);
    expect(isValidEndpoint('localhost:1234')).toBe(false);
  });

  test('should reject non-string input', () => {
    expect(isValidEndpoint(null)).toBe(false);
    expect(isValidEndpoint(undefined)).toBe(false);
    expect(isValidEndpoint(123)).toBe(false);
  });
});

describe('validateEndpoint', () => {
  test('should validate secure HTTPS endpoints', () => {
    const result = validateEndpoint('https://api.openai.com/v1/chat');
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  test('should validate local HTTP endpoints without warnings', () => {
    const result = validateEndpoint('http://localhost:1234/v1/chat');
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  test('should warn about HTTP on remote endpoints', () => {
    const result = validateEndpoint('http://api.example.com/v1/chat');
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('unencrypted HTTP');
  });

  test('should warn about non-standard ports', () => {
    const result = validateEndpoint('http://localhost:9999/v1/chat');
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('non-standard port 9999');
  });

  test('should not warn about common LLM ports', () => {
    const commonPorts = ['1234', '5000', '8000', '8080', '11434'];

    commonPorts.forEach(port => {
      const result = validateEndpoint(`http://localhost:${port}/v1/chat`);
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  test('should reject invalid protocols', () => {
    const result = validateEndpoint('ftp://localhost:1234');
    expect(result.valid).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Invalid protocol');
  });

  test('should reject malformed URLs', () => {
    const result = validateEndpoint('not a url');
    expect(result.valid).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Invalid URL format');
  });

  test('should combine multiple warnings', () => {
    const result = validateEndpoint('http://api.example.com:9999/v1/chat');
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings[0]).toContain('unencrypted HTTP');
    expect(result.warnings[1]).toContain('non-standard port');
  });
});

describe('isSecureEndpoint', () => {
  test('should identify HTTPS endpoints', () => {
    expect(isSecureEndpoint('https://api.openai.com')).toBe(true);
    expect(isSecureEndpoint('https://localhost')).toBe(true);
  });

  test('should reject HTTP endpoints', () => {
    expect(isSecureEndpoint('http://localhost')).toBe(false);
    expect(isSecureEndpoint('http://api.example.com')).toBe(false);
  });

  test('should reject invalid URLs', () => {
    expect(isSecureEndpoint('not a url')).toBe(false);
    expect(isSecureEndpoint('')).toBe(false);
  });
});

describe('isLocalEndpoint', () => {
  test('should identify localhost', () => {
    expect(isLocalEndpoint('http://localhost:1234')).toBe(true);
    expect(isLocalEndpoint('https://localhost')).toBe(true);
  });

  test('should identify 127.0.0.1', () => {
    expect(isLocalEndpoint('http://127.0.0.1:8080')).toBe(true);
  });

  test('should identify local network addresses', () => {
    expect(isLocalEndpoint('http://192.168.1.1')).toBe(true);
    expect(isLocalEndpoint('http://10.0.0.1')).toBe(true);
    expect(isLocalEndpoint('http://172.16.0.1')).toBe(true);
    expect(isLocalEndpoint('http://172.20.0.1')).toBe(true);
    expect(isLocalEndpoint('http://172.31.255.255')).toBe(true);
  });

  test('should not identify public addresses as local', () => {
    expect(isLocalEndpoint('https://api.openai.com')).toBe(false);
    expect(isLocalEndpoint('http://8.8.8.8')).toBe(false);
    expect(isLocalEndpoint('http://172.15.0.1')).toBe(false);
    expect(isLocalEndpoint('http://172.32.0.1')).toBe(false);
  });

  test('should handle invalid URLs', () => {
    expect(isLocalEndpoint('not a url')).toBe(false);
    expect(isLocalEndpoint('')).toBe(false);
  });
});
